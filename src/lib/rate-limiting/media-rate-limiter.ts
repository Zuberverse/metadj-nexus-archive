/**
 * Media Rate Limiter
 *
 * IP-based rate limiting for audio and video streaming routes.
 * Uses higher thresholds than AI routes since media is cacheable.
 *
 * ## Architecture
 * - In-memory by default (single instance)
 * - Upstash Redis when configured (distributed/serverless)
 * - Falls back gracefully on Redis errors
 *
 * @module lib/rate-limiting/media-rate-limiter
 */

import { createHash } from 'crypto'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'
import type { NextRequest } from 'next/server'

// ============================================================================
// Configuration
// ============================================================================

/**
 * Maximum media requests per IP per minute
 * Higher than AI routes since media is cacheable and less costly
 */
export const MEDIA_RATE_LIMIT_PER_MINUTE = 100

/**
 * Rate limit window in milliseconds
 */
export const MEDIA_RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute

// ============================================================================
// Types
// ============================================================================

export interface MediaRateLimitResult {
  allowed: boolean
  remainingMs?: number
  remaining?: number
}

// ============================================================================
// In-Memory Rate Limiting
// ============================================================================

interface RateLimitRecord {
  count: number
  resetAt: number
}

const mediaRateLimitMap = new Map<string, RateLimitRecord>()
let lastCleanup = 0
const CLEANUP_INTERVAL_MS = MEDIA_RATE_LIMIT_WINDOW_MS

function cleanupExpired(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return

  for (const [key, record] of mediaRateLimitMap.entries()) {
    if (record.resetAt <= now) {
      mediaRateLimitMap.delete(key)
    }
  }
  lastCleanup = now
}

/**
 * In-memory rate limit check
 */
function checkMediaRateLimitInMemory(ip: string): MediaRateLimitResult {
  const now = Date.now()
  cleanupExpired(now)

  let record = mediaRateLimitMap.get(ip)

  // Initialize or reset record if expired
  if (!record || now >= record.resetAt) {
    mediaRateLimitMap.set(ip, {
      count: 0,
      resetAt: now + MEDIA_RATE_LIMIT_WINDOW_MS,
    })
    record = mediaRateLimitMap.get(ip)!
  }

  // Check rate limit
  if (record.count >= MEDIA_RATE_LIMIT_PER_MINUTE) {
    const remainingMs = Math.max(0, record.resetAt - now)
    return { allowed: false, remainingMs, remaining: 0 }
  }

  record.count += 1
  return { allowed: true, remaining: MEDIA_RATE_LIMIT_PER_MINUTE - record.count }
}

// ============================================================================
// Upstash Redis Rate Limiting
// ============================================================================

const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

/**
 * Fail-closed mode configuration
 *
 * When enabled, rate limit checks will DENY requests when Redis is unavailable
 * rather than falling back to in-memory (which doesn't work across instances).
 *
 * Set RATE_LIMIT_FAIL_CLOSED=true to enable.
 */
const isFailClosedEnabled = process.env.RATE_LIMIT_FAIL_CLOSED === 'true'

let upstashMediaRatelimit: Ratelimit | null = null

function getUpstashMediaRatelimit(): Ratelimit | null {
  if (!isUpstashConfigured) return null

  if (!upstashMediaRatelimit) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })

      upstashMediaRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(MEDIA_RATE_LIMIT_PER_MINUTE, '1 m'),
        analytics: true,
        prefix: 'media',
      })

      logger.info('[Media Rate Limiter] Upstash Redis initialized')
    } catch (error) {
      logger.error('[Media Rate Limiter] Failed to initialize Upstash', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  return upstashMediaRatelimit
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Extract client IP from request
 *
 * Prioritizes x-forwarded-for (behind proxy/CDN), falls back to x-real-ip
 */
function buildHeaderFingerprint(request: NextRequest): string {
  const ua = request.headers.get('user-agent') ?? 'unknown'
  const lang = request.headers.get('accept-language') ?? 'unknown'
  const encoding = request.headers.get('accept-encoding') ?? 'unknown'
  const hash = createHash('sha256')
    .update(`${ua}|${lang}|${encoding}`)
    .digest('hex')
    .slice(0, 16)
  return `anon-${hash}`
}

export function getClientIp(request: NextRequest): string {
  const vercelIp = request.headers.get('x-vercel-ip')
  if (vercelIp) return vercelIp

  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs - take the first (original client)
    const firstIp = forwarded.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  // Fallback for development/testing
  return buildHeaderFingerprint(request)
}

/**
 * Check media rate limit for a request
 *
 * Uses Upstash Redis if configured, falls back to in-memory.
 *
 * @param request - NextRequest object
 * @returns Rate limit result with allowed status
 */
export async function checkMediaRateLimit(
  request: NextRequest
): Promise<MediaRateLimitResult> {
  const ip = getClientIp(request)
  const ratelimit = getUpstashMediaRatelimit()

  if (!ratelimit) {
    // Fail-closed: deny if Redis unavailable and fail-closed enabled
    if (isFailClosedEnabled) {
      logger.warn('[Media Rate Limiter] Redis unavailable, denying request (fail-closed mode)')
      return { allowed: false, remainingMs: 30000, remaining: 0 }
    }
    return checkMediaRateLimitInMemory(ip)
  }

  try {
    const { success, reset, remaining } = await ratelimit.limit(ip)

    if (!success) {
      const remainingMs = Math.max(0, reset - Date.now())
      return { allowed: false, remainingMs, remaining: 0 }
    }

    return { allowed: true, remaining }
  } catch (error) {
    // Fail-closed: deny if Redis errors and fail-closed enabled
    if (isFailClosedEnabled) {
      logger.error('[Media Rate Limiter] Upstash check failed, denying request (fail-closed mode)', {
        error: error instanceof Error ? error.message : String(error),
      })
      return { allowed: false, remainingMs: 30000, remaining: 0 }
    }
    logger.error('[Media Rate Limiter] Upstash check failed, falling back to in-memory', {
      error: error instanceof Error ? error.message : String(error),
    })
    return checkMediaRateLimitInMemory(ip)
  }
}

/**
 * Build rate limit headers for response
 *
 * @param result - Rate limit check result
 * @returns Headers object with rate limit info
 */
export function buildRateLimitHeaders(
  result: MediaRateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': MEDIA_RATE_LIMIT_PER_MINUTE.toString(),
  }

  if (result.remaining !== undefined) {
    headers['X-RateLimit-Remaining'] = result.remaining.toString()
  }

  if (!result.allowed && result.remainingMs !== undefined) {
    headers['Retry-After'] = Math.ceil(result.remainingMs / 1000).toString()
  }

  return headers
}

/**
 * Build rate limit error response
 */
export function buildMediaRateLimitResponse(
  remainingMs: number
): { error: string; retryAfter: number } {
  const retryAfterSeconds = Math.ceil(remainingMs / 1000)
  return {
    error: 'Too many requests. Please wait before requesting more media.',
    retryAfter: retryAfterSeconds,
  }
}

/**
 * Clear all media rate limit records (for testing)
 */
export function clearAllMediaRateLimits(): void {
  mediaRateLimitMap.clear()
}

/**
 * Get current rate limiting mode
 */
export function getMediaRateLimitMode(): 'distributed' | 'in-memory' {
  return isUpstashConfigured ? 'distributed' : 'in-memory'
}
