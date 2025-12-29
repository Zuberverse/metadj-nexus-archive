import { Redis } from "@upstash/redis"
import { logger } from "@/lib/logger"
import {
  getClientIdentifier as getClientIdentifierBase,
  generateSessionId as generateSessionIdBase,
  type ClientIdentifier,
} from "@/lib/rate-limiting/client-identifier"
import type { NextRequest } from "next/server"

/**
 * Daydream Stream Limiter
 *
 * Enforces:
 * 1. Single-stream-per-user - Only one active stream allowed per client
 * 2. Rate limiting - Prevents rapid stream creation attempts
 *
 * Uses in-memory storage by default (suitable for single-instance deployments like Replit).
 * Automatically switches to Upstash Redis when configured for multi-instance deployments.
 *
 * Uses shared client identifier utility for consistent fingerprinting.
 * @see @/lib/rate-limiting/client-identifier
 */

// Configuration
const STREAM_CREATION_COOLDOWN_MS = 30 * 1000 // 30 seconds between rapid stream creations (without proper cleanup)
const STREAM_TTL_MS = 30 * 60 * 1000 // 30 minutes max stream lifetime (auto-expire orphaned streams)
const CLEANUP_INTERVAL_MS = 60 * 1000 // Cleanup every 60 seconds
const SESSION_COOKIE_NAME = "daydream-session"

export const DAYDREAM_SESSION_COOKIE_NAME = SESSION_COOKIE_NAME
export const DAYDREAM_SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

const REDIS_STREAM_KEY_PREFIX = "daydream:stream:"
const REDIS_COOLDOWN_KEY_PREFIX = "daydream:cooldown:"

const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)
const isFailClosedEnabled = process.env.RATE_LIMIT_FAIL_CLOSED === "true"

let upstashRedis: Redis | null = null
let didLogUpstashMisconfig = false
let didLogFailClosedStatus = false

function logFailClosedStatusOnce() {
  if (didLogFailClosedStatus) return
  didLogFailClosedStatus = true

  if (isFailClosedEnabled && process.env.NODE_ENV === "production") {
    logger.warn(
      "[Daydream Stream Limiter] Fail-closed mode ENABLED - requests will be denied if Redis is unavailable."
    )
  }
}

function logUpstashMisconfigOnce() {
  if (didLogUpstashMisconfig) return
  didLogUpstashMisconfig = true

  if (process.env.NODE_ENV !== "production") return
  if (isUpstashConfigured) return

  const isReplitSingleInstance =
    process.env.REPLIT_DEPLOYMENT === "true" || Boolean(process.env.REPL_ID)

  if (isReplitSingleInstance) {
    logger.warn("[Daydream Stream Limiter] Upstash not configured; using in-memory mode.")
    return
  }

  logger.error(
    "[Daydream Stream Limiter] Production deployment without Upstash - stream limits won't be shared across instances."
  )
}

function getUpstashRedis(): Redis | null {
  logFailClosedStatusOnce()
  if (!isUpstashConfigured) {
    logUpstashMisconfigOnce()
    return null
  }

  if (upstashRedis) return upstashRedis

  try {
    upstashRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    logger.info("[Daydream Stream Limiter] Upstash Redis initialized")
    return upstashRedis
  } catch (error) {
    logger.error("[Daydream Stream Limiter] Failed to initialize Upstash Redis", {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Active stream record
 */
interface ActiveStream {
  streamId: string
  createdAt: number
  expiresAt: number
}

/**
 * Rate limit record for stream creation
 */
interface StreamRateLimit {
  lastCreatedAt: number
  count: number
  resetAt: number
}

const globalStore = globalThis as typeof globalThis & {
  __daydreamActiveStreams?: Map<string, ActiveStream>
  __daydreamStreamRateLimits?: Map<string, StreamRateLimit>
  __daydreamLastCleanup?: number
  __daydreamCleanupInterval?: ReturnType<typeof setInterval>
}

// In-memory storage (hoisted to global for dev HMR resilience)
const activeStreams = globalStore.__daydreamActiveStreams ?? new Map<string, ActiveStream>()
globalStore.__daydreamActiveStreams = activeStreams

const streamRateLimits = globalStore.__daydreamStreamRateLimits ?? new Map<string, StreamRateLimit>()
globalStore.__daydreamStreamRateLimits = streamRateLimits

let lastCleanup = globalStore.__daydreamLastCleanup ?? 0

async function getRedisActiveStream(clientId: string): Promise<ActiveStream | null> {
  const redis = getUpstashRedis()
  if (!redis) return null

  const key = `${REDIS_STREAM_KEY_PREFIX}${clientId}`
  const stored = await redis.get<string>(key)
  if (!stored) return null

  try {
    return JSON.parse(stored) as ActiveStream
  } catch (error) {
    logger.warn("[Daydream Stream Limiter] Failed to parse Redis stream record", {
      error: error instanceof Error ? error.message : String(error),
    })
    await redis.del(key)
    return null
  }
}

async function setRedisActiveStream(clientId: string, stream: ActiveStream): Promise<void> {
  const redis = getUpstashRedis()
  if (!redis) return

  const key = `${REDIS_STREAM_KEY_PREFIX}${clientId}`
  await redis.set(key, JSON.stringify(stream), {
    ex: Math.ceil(STREAM_TTL_MS / 1000),
  })
}

async function clearRedisStream(clientId: string): Promise<void> {
  const redis = getUpstashRedis()
  if (!redis) return

  await redis.del(`${REDIS_STREAM_KEY_PREFIX}${clientId}`)
}

async function getRedisCooldownRemainingMs(clientId: string): Promise<number | null> {
  const redis = getUpstashRedis()
  if (!redis) return null

  const ttlSeconds = await redis.ttl(`${REDIS_COOLDOWN_KEY_PREFIX}${clientId}`)
  if (ttlSeconds <= 0) return null
  return ttlSeconds * 1000
}

async function setRedisCooldown(clientId: string): Promise<void> {
  const redis = getUpstashRedis()
  if (!redis) return

  await redis.set(`${REDIS_COOLDOWN_KEY_PREFIX}${clientId}`, "1", {
    ex: Math.ceil(STREAM_CREATION_COOLDOWN_MS / 1000),
  })
}

async function clearRedisCooldown(clientId: string): Promise<void> {
  const redis = getUpstashRedis()
  if (!redis) return

  await redis.del(`${REDIS_COOLDOWN_KEY_PREFIX}${clientId}`)
}

/**
 * Cleanup expired streams and rate limits
 */
function cleanupExpired(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return

  for (const [key, stream] of activeStreams.entries()) {
    if (stream.expiresAt <= now) {
      activeStreams.delete(key)
    }
  }

  for (const [key, limit] of streamRateLimits.entries()) {
    if (limit.resetAt <= now) {
      streamRateLimits.delete(key)
    }
  }

  lastCleanup = now
  globalStore.__daydreamLastCleanup = lastCleanup
}

/**
 * Get client identifier from request
 * Uses shared client identifier utility for consistent fingerprinting.
 */
export function getClientIdentifier(request: NextRequest): ClientIdentifier {
  return getClientIdentifierBase(request, SESSION_COOKIE_NAME)
}

/**
 * Generate a new session ID
 * Uses shared session ID generator for consistency.
 */
export function generateSessionId(): string {
  return generateSessionIdBase("daydream")
}

/**
 * Check if user can create a new stream
 * Returns error message if blocked, null if allowed
 */
export async function checkStreamCreation(clientId: string): Promise<{
  allowed: boolean
  error?: string
  retryAfterMs?: number
  activeStreamId?: string
}> {
  const now = Date.now()
  cleanupExpired(now)

  const redis = getUpstashRedis()
  if (redis) {
    try {
      const existingStream = await getRedisActiveStream(clientId)
      if (existingStream) {
        if (existingStream.expiresAt > now) {
          return {
            allowed: false,
            error: "You already have an active stream. Please end it before creating a new one.",
            activeStreamId: existingStream.streamId,
            retryAfterMs: 0,
          }
        }
        await clearRedisStream(clientId)
      }

      const remainingMs = await getRedisCooldownRemainingMs(clientId)
      if (remainingMs && remainingMs > 0) {
        return {
          allowed: false,
          error: "Please wait before creating another stream.",
          retryAfterMs: remainingMs,
        }
      }

      return { allowed: true }
    } catch (error) {
      if (isFailClosedEnabled) {
        logger.warn("[Daydream Stream Limiter] Redis unavailable, denying request (fail-closed mode)", {
          error: error instanceof Error ? error.message : String(error),
        })
        return {
          allowed: false,
          error: "Please wait before creating another stream.",
          retryAfterMs: STREAM_CREATION_COOLDOWN_MS,
        }
      }

      logger.error("[Daydream Stream Limiter] Redis check failed, falling back to in-memory", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Check for existing active stream (in-memory fallback)
  const existingStream = activeStreams.get(clientId)
  if (existingStream && existingStream.expiresAt > now) {
    return {
      allowed: false,
      error: "You already have an active stream. Please end it before creating a new one.",
      activeStreamId: existingStream.streamId,
      retryAfterMs: 0,
    }
  }

  // Check rate limit (cooldown between stream creations)
  const rateLimit = streamRateLimits.get(clientId)
  if (rateLimit && now - rateLimit.lastCreatedAt < STREAM_CREATION_COOLDOWN_MS) {
    const remainingMs = STREAM_CREATION_COOLDOWN_MS - (now - rateLimit.lastCreatedAt)
    return {
      allowed: false,
      error: "Please wait before creating another stream.",
      retryAfterMs: remainingMs,
    }
  }

  return { allowed: true }
}

/**
 * Register a new active stream for a user
 */
export async function registerStream(clientId: string, streamId: string): Promise<void> {
  const now = Date.now()

  const streamRecord: ActiveStream = {
    streamId,
    createdAt: now,
    expiresAt: now + STREAM_TTL_MS,
  }

  const redis = getUpstashRedis()
  if (redis) {
    try {
      await Promise.all([
        setRedisActiveStream(clientId, streamRecord),
        setRedisCooldown(clientId),
      ])
      return
    } catch (error) {
      logger.error("[Daydream Stream Limiter] Failed to persist stream to Redis, falling back to in-memory", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Register active stream (in-memory fallback)
  activeStreams.set(clientId, streamRecord)

  // Update rate limit
  const existingLimit = streamRateLimits.get(clientId)
  streamRateLimits.set(clientId, {
    lastCreatedAt: now,
    count: (existingLimit?.count || 0) + 1,
    resetAt: now + STREAM_CREATION_COOLDOWN_MS,
  })
}

/**
 * End an active stream for a user
 * Also clears rate limit so user can immediately create a new stream
 */
export async function endStream(clientId: string, streamId?: string): Promise<boolean> {
  const redis = getUpstashRedis()
  if (redis) {
    try {
      const stream = await getRedisActiveStream(clientId)
      if (!stream) return false

      // If streamId provided, verify it matches
      if (streamId && stream.streamId !== streamId) return false

      await Promise.all([
        clearRedisStream(clientId),
        clearRedisCooldown(clientId),
      ])
      return true
    } catch (error) {
      if (isFailClosedEnabled) {
        logger.warn("[Daydream Stream Limiter] Redis unavailable, denying stream end (fail-closed mode)", {
          error: error instanceof Error ? error.message : String(error),
        })
        return false
      }

      logger.error("[Daydream Stream Limiter] Redis end failed, falling back to in-memory", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const stream = activeStreams.get(clientId)
  if (!stream) return false

  // If streamId provided, verify it matches
  if (streamId && stream.streamId !== streamId) return false

  activeStreams.delete(clientId)
  // Clear rate limit on proper stream end - allows immediate restart
  // Rate limit only blocks rapid creation without proper cleanup (e.g., page refreshes)
  streamRateLimits.delete(clientId)
  return true
}

/**
 * Get active stream for a user
 */
export async function getActiveStream(clientId: string): Promise<ActiveStream | null> {
  const now = Date.now()
  cleanupExpired(now)

  const redis = getUpstashRedis()
  if (redis) {
    try {
      const stream = await getRedisActiveStream(clientId)
      if (!stream) return null
      if (stream.expiresAt <= now) {
        await clearRedisStream(clientId)
        return null
      }
      return stream
    } catch (error) {
      if (isFailClosedEnabled) {
        logger.warn("[Daydream Stream Limiter] Redis unavailable, denying active stream lookup (fail-closed mode)", {
          error: error instanceof Error ? error.message : String(error),
        })
        return null
      }

      logger.error("[Daydream Stream Limiter] Redis lookup failed, falling back to in-memory", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const stream = activeStreams.get(clientId)
  if (!stream || stream.expiresAt <= now) {
    return null
  }

  return stream
}

/**
 * Build error response for stream limit
 */
export function buildStreamLimitResponse(
  error: string,
  retryAfterMs: number,
  activeStreamId?: string,
): { error: string; retryAfter?: number; activeStreamId?: string } {
  if (retryAfterMs > 0) {
    return {
      error,
      retryAfter: Math.ceil(retryAfterMs / 1000),
      activeStreamId,
    }
  }
  return activeStreamId ? { error, activeStreamId } : { error }
}

/**
 * Clear all stream records (for testing, in-memory only)
 */
export function clearAllStreams(): void {
  activeStreams.clear()
  streamRateLimits.clear()
}

// Periodic cleanup
if (!globalStore.__daydreamCleanupInterval) {
  globalStore.__daydreamCleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, stream] of activeStreams.entries()) {
      if (stream.expiresAt <= now) {
        activeStreams.delete(key)
      }
    }
    for (const [key, limit] of streamRateLimits.entries()) {
      if (limit.resetAt <= now) {
        streamRateLimits.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
}
