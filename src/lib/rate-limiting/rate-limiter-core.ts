/**
 * Rate Limiter Core
 *
 * Unified rate limiting infrastructure for MetaDJ Nexus.
 * Provides a factory pattern for creating domain-specific rate limiters
 * with shared Redis connection and common patterns.
 *
 * ## Features
 * - Shared Upstash Redis connection (single pool across all limiters)
 * - In-memory fallback for single-instance deployments
 * - Fail-closed mode for production safety
 * - Automatic cleanup of expired records
 * - Configurable limits per domain
 *
 * ## Usage
 * ```typescript
 * const limiter = createRateLimiter({
 *   prefix: 'my-domain',
 *   maxRequests: 100,
 *   windowMs: 60000, // 1 minute
 * })
 *
 * const result = await limiter.check('client-id')
 * if (!result.allowed) {
 *   return new Response('Rate limited', { status: 429 })
 * }
 * ```
 *
 * @module lib/rate-limiting/rate-limiter-core
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'
import { BoundedMap, DEFAULT_MAX_ENTRIES } from './bounded-map'

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Prefix for Redis keys and logging */
  prefix: string
  /** Maximum requests per window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Optional burst limit (min interval between requests in ms) */
  burstIntervalMs?: number
}

export interface RateLimitResult {
  allowed: boolean
  remainingMs?: number
  remaining?: number
}

export interface RateLimiter {
  /** Check if a request is allowed */
  check: (identifier: string, skipBurst?: boolean) => Promise<RateLimitResult>
  /** Clear rate limit for a specific identifier (for testing) */
  clear: (identifier: string) => void
  /** Clear all rate limits (for testing) */
  clearAll: () => void
  /** Get current mode */
  getMode: () => 'distributed' | 'in-memory'
}

// ============================================================================
// Shared Redis Connection
// ============================================================================

/**
 * Check if Upstash Redis is configured
 */
export const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

/**
 * Fail-closed mode configuration
 *
 * When enabled, rate limit checks will DENY requests when Redis is unavailable
 * rather than falling back to in-memory.
 *
 * Set RATE_LIMIT_FAIL_CLOSED=true to enable.
 */
export const isFailClosedEnabled = process.env.RATE_LIMIT_FAIL_CLOSED === 'true'

// Shared Redis instance (lazy initialized, singleton)
let sharedRedis: Redis | null = null
let sharedRedisInitAttempted = false

/**
 * Get or create the shared Redis connection
 */
function getSharedRedis(): Redis | null {
  if (!isUpstashConfigured) return null

  if (sharedRedisInitAttempted) return sharedRedis

  sharedRedisInitAttempted = true
  try {
    sharedRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    logger.info('[Rate Limiter Core] Shared Upstash Redis connection initialized')
  } catch (error) {
    logger.error('[Rate Limiter Core] Failed to initialize shared Redis', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return sharedRedis
}

// ============================================================================
// In-Memory Rate Limiter
// ============================================================================

interface InMemoryRecord {
  count: number
  resetAt: number
  lastRequestAt: number
}

interface InMemoryLimiter {
  map: BoundedMap<string, InMemoryRecord>
  lastCleanup: number
}

// Global cleanup interval (shared across all in-memory limiters)
const CLEANUP_INTERVAL_MS = 60000
const inMemoryLimiters = new Map<string, InMemoryLimiter>()

function cleanupExpiredRecords(limiter: InMemoryLimiter, windowMs: number): void {
  const now = Date.now()
  if (now - limiter.lastCleanup < CLEANUP_INTERVAL_MS) return

  for (const [key, record] of limiter.map.entries()) {
    if (record.resetAt <= now) {
      limiter.map.delete(key)
    }
  }
  limiter.lastCleanup = now
}

function getOrCreateInMemoryLimiter(prefix: string): InMemoryLimiter {
  let limiter = inMemoryLimiters.get(prefix)
  if (!limiter) {
    limiter = { map: new BoundedMap(DEFAULT_MAX_ENTRIES), lastCleanup: 0 }
    inMemoryLimiters.set(prefix, limiter)
  }
  return limiter
}

function checkInMemory(
  limiter: InMemoryLimiter,
  identifier: string,
  config: RateLimitConfig,
  skipBurst: boolean
): RateLimitResult {
  const now = Date.now()
  cleanupExpiredRecords(limiter, config.windowMs)

  let record = limiter.map.get(identifier)

  // Initialize or reset record if expired
  if (!record || now >= record.resetAt) {
    limiter.map.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
      lastRequestAt: now,
    })
    return { allowed: true, remaining: config.maxRequests - 1 }
  }

  // Check burst prevention
  if (!skipBurst && config.burstIntervalMs && record.lastRequestAt > 0) {
    const timeSinceLast = now - record.lastRequestAt
    if (timeSinceLast < config.burstIntervalMs) {
      return {
        allowed: false,
        remainingMs: config.burstIntervalMs - timeSinceLast,
        remaining: config.maxRequests - record.count,
      }
    }
  }

  // Check window limit
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remainingMs: Math.max(0, record.resetAt - now),
      remaining: 0,
    }
  }

  record.count += 1
  record.lastRequestAt = now
  return { allowed: true, remaining: config.maxRequests - record.count }
}

// ============================================================================
// Upstash Rate Limiter Cache
// ============================================================================

const upstashLimiters = new Map<string, { main: Ratelimit; burst?: Ratelimit }>()

function getOrCreateUpstashLimiter(
  config: RateLimitConfig
): { main: Ratelimit; burst?: Ratelimit } | null {
  const redis = getSharedRedis()
  if (!redis) return null

  const cacheKey = `${config.prefix}-${config.maxRequests}-${config.windowMs}`
  let cached = upstashLimiters.get(cacheKey)

  if (!cached) {
    try {
      // Convert milliseconds to Upstash Duration format
      // Duration type accepts: "Xs", "Xm", "Xh", "Xd" where X is a number
      const windowSeconds = Math.ceil(config.windowMs / 1000)
      const windowDuration = windowSeconds >= 60
        ? (`${Math.ceil(windowSeconds / 60)} m` as `${number} m`)
        : (`${windowSeconds} s` as `${number} s`)

      const main = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.maxRequests, windowDuration),
        analytics: true,
        prefix: config.prefix,
      })

      let burst: Ratelimit | undefined
      if (config.burstIntervalMs && config.burstIntervalMs >= 1000) {
        const burstSeconds = Math.ceil(config.burstIntervalMs / 1000)
        const burstDuration = `${burstSeconds} s` as `${number} s`
        burst = new Ratelimit({
          redis,
          limiter: Ratelimit.fixedWindow(1, burstDuration),
          analytics: true,
          prefix: `${config.prefix}-burst`,
        })
      }

      cached = { main, burst }
      upstashLimiters.set(cacheKey, cached)

      logger.info(`[Rate Limiter Core] Upstash limiter created for ${config.prefix}`)
    } catch (error) {
      logger.error(`[Rate Limiter Core] Failed to create Upstash limiter for ${config.prefix}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  return cached
}

async function checkUpstash(
  limiters: { main: Ratelimit; burst?: Ratelimit },
  identifier: string,
  skipBurst: boolean
): Promise<RateLimitResult> {
  // Check burst limit first
  if (!skipBurst && limiters.burst) {
    const burstResult = await limiters.burst.limit(identifier)
    if (!burstResult.success) {
      const remainingMs = Math.max(0, burstResult.reset - Date.now())
      return { allowed: false, remainingMs }
    }
  }

  // Check main limit
  const { success, reset, remaining } = await limiters.main.limit(identifier)

  if (!success) {
    const remainingMs = Math.max(0, reset - Date.now())
    return { allowed: false, remainingMs, remaining: 0 }
  }

  return { allowed: true, remaining }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a domain-specific rate limiter
 *
 * @param config - Rate limiter configuration
 * @returns Rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const inMemoryLimiter = getOrCreateInMemoryLimiter(config.prefix)

  return {
    async check(identifier: string, skipBurst = false): Promise<RateLimitResult> {
      const upstashLimiters = getOrCreateUpstashLimiter(config)

      // Try Upstash first
      if (upstashLimiters) {
        try {
          return await checkUpstash(upstashLimiters, identifier, skipBurst)
        } catch (error) {
          // Fail-closed mode: deny on error
          if (isFailClosedEnabled) {
            logger.error(`[Rate Limiter Core] ${config.prefix} check failed, denying (fail-closed)`, {
              error: error instanceof Error ? error.message : String(error),
            })
            return { allowed: false, remainingMs: 30000 }
          }

          // Fall back to in-memory
          logger.error(`[Rate Limiter Core] ${config.prefix} Upstash failed, using in-memory`, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      } else if (isFailClosedEnabled && isUpstashConfigured) {
        // Upstash configured but unavailable with fail-closed enabled
        logger.warn(`[Rate Limiter Core] ${config.prefix} Redis unavailable, denying (fail-closed)`)
        return { allowed: false, remainingMs: 30000 }
      }

      // In-memory fallback
      return checkInMemory(inMemoryLimiter, identifier, config, skipBurst)
    },

    clear(identifier: string): void {
      inMemoryLimiter.map.delete(identifier)
    },

    clearAll(): void {
      inMemoryLimiter.map.clear()
    },

    getMode(): 'distributed' | 'in-memory' {
      return isUpstashConfigured ? 'distributed' : 'in-memory'
    },
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build standard rate limit headers
 */
export function buildRateLimitHeaders(
  result: RateLimitResult,
  limit: number
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': limit.toString(),
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
 * Build standard rate limit error response
 */
export function buildRateLimitError(
  remainingMs: number,
  message = 'Rate limit exceeded. Please wait before sending another request.'
): { error: string; retryAfter: number } {
  return {
    error: message,
    retryAfter: Math.ceil(remainingMs / 1000),
  }
}
