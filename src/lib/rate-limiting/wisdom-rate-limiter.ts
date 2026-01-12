/**
 * Wisdom Rate Limiter
 *
 * Rate limiting for the public wisdom content endpoint.
 *
 * ## Architecture
 * - In-memory by default (single instance)
 * - Upstash Redis when configured (distributed/serverless)
 * - Falls back gracefully on Redis errors unless fail-closed is enabled
 *
 * @module lib/rate-limiting/wisdom-rate-limiter
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { logger } from "@/lib/logger"
import { BoundedMap, DEFAULT_MAX_ENTRIES } from "./bounded-map"
import type { NextRequest } from "next/server"

// ============================================================================
// Configuration
// ============================================================================

/**
 * Rate limit window in milliseconds
 */
export const WISDOM_RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute

/**
 * Maximum wisdom requests per client per window
 */
export const WISDOM_MAX_REQUESTS_PER_WINDOW = 60

// ============================================================================
// Types
// ============================================================================

export interface WisdomRateLimitResult {
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

// Bounded map with LRU eviction for memory protection
const rateLimitMap = new BoundedMap<string, RateLimitRecord>(DEFAULT_MAX_ENTRIES)
let lastCleanup = 0
const CLEANUP_INTERVAL_MS = WISDOM_RATE_LIMIT_WINDOW_MS

function cleanupExpired(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return

  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetAt <= now) {
      rateLimitMap.delete(key)
    }
  }
  lastCleanup = now
}

function checkWisdomRateLimitInMemory(clientId: string): WisdomRateLimitResult {
  const now = Date.now()
  cleanupExpired(now)

  let record = rateLimitMap.get(clientId)

  if (!record || now >= record.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + WISDOM_RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: WISDOM_MAX_REQUESTS_PER_WINDOW - 1 }
  }

  if (record.count >= WISDOM_MAX_REQUESTS_PER_WINDOW) {
    const remainingMs = Math.max(0, record.resetAt - now)
    return { allowed: false, remainingMs, remaining: 0 }
  }

  record.count += 1
  return { allowed: true, remaining: WISDOM_MAX_REQUESTS_PER_WINDOW - record.count }
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
 */
const isFailClosedEnabled = process.env.RATE_LIMIT_FAIL_CLOSED === "true"

let upstashWisdomRatelimit: Ratelimit | null = null

function getUpstashWisdomRatelimit(): Ratelimit | null {
  if (!isUpstashConfigured) return null

  if (!upstashWisdomRatelimit) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })

      upstashWisdomRatelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(WISDOM_MAX_REQUESTS_PER_WINDOW, "1 m"),
        analytics: true,
        prefix: "wisdom",
      })

      logger.info("[Wisdom Rate Limiter] Upstash Redis initialized")
    } catch (error) {
      logger.error("[Wisdom Rate Limiter] Failed to initialize Upstash", {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  return upstashWisdomRatelimit
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get client identifier from request headers
 * Uses IP-based identification for anonymous static content requests
 */
export function getWisdomClientId(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return `wisdom-${forwarded.split(",")[0].trim()}`
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return `wisdom-${realIp}`
  }

  const ua = request.headers.get("user-agent") || "unknown"
  const lang = request.headers.get("accept-language") || "unknown"
  return `wisdom-anon-${Buffer.from(`${ua}|${lang}`).toString("base64").slice(0, 16)}`
}

/**
 * Check wisdom rate limit for a request
 *
 * Uses Upstash Redis if configured, falls back to in-memory.
 */
export async function checkWisdomRateLimit(
  request: NextRequest
): Promise<WisdomRateLimitResult> {
  const clientId = getWisdomClientId(request)
  const ratelimit = getUpstashWisdomRatelimit()

  if (!ratelimit) {
    if (isFailClosedEnabled) {
      logger.warn("[Wisdom Rate Limiter] Redis unavailable, denying request (fail-closed mode)")
      return { allowed: false, remainingMs: 30000, remaining: 0 }
    }
    return checkWisdomRateLimitInMemory(clientId)
  }

  try {
    const { success, reset, remaining } = await ratelimit.limit(clientId)

    if (!success) {
      const remainingMs = Math.max(0, reset - Date.now())
      return { allowed: false, remainingMs, remaining: 0 }
    }

    return { allowed: true, remaining }
  } catch (error) {
    if (isFailClosedEnabled) {
      logger.error("[Wisdom Rate Limiter] Upstash check failed, denying request (fail-closed mode)", {
        error: error instanceof Error ? error.message : String(error),
      })
      return { allowed: false, remainingMs: 30000, remaining: 0 }
    }

    logger.error("[Wisdom Rate Limiter] Upstash check failed, falling back to in-memory", {
      error: error instanceof Error ? error.message : String(error),
    })
    return checkWisdomRateLimitInMemory(clientId)
  }
}
