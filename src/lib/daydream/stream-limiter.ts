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
 * Uses in-memory storage (suitable for single-instance deployments like Replit).
 * For multi-instance deployments, migrate to Upstash Redis.
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
export function checkStreamCreation(clientId: string): {
  allowed: boolean
  error?: string
  retryAfterMs?: number
  activeStreamId?: string
} {
  const now = Date.now()
  cleanupExpired(now)

  // Check for existing active stream
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
export function registerStream(clientId: string, streamId: string): void {
  const now = Date.now()

  // Register active stream
  activeStreams.set(clientId, {
    streamId,
    createdAt: now,
    expiresAt: now + STREAM_TTL_MS,
  })

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
export function endStream(clientId: string, streamId?: string): boolean {
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
export function getActiveStream(clientId: string): ActiveStream | null {
  const now = Date.now()
  cleanupExpired(now)

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
 * Clear all stream records (for testing)
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
