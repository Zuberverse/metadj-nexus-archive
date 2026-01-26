import { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import {
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_MESSAGE_HISTORY,
  MAX_MESSAGES_PER_REQUEST,
} from '@/lib/ai/limits'
import { logger } from '@/lib/logger'
import { BoundedMap, DEFAULT_MAX_ENTRIES } from '@/lib/rate-limiting/bounded-map'
import {
  getClientIdentifier as getClientIdentifierBase,
  generateSessionId as generateSessionIdBase,
  type ClientIdentifier,
} from '@/lib/rate-limiting/client-identifier'
import type { MetaDjAiApiMessage } from '@/types/metadjai.types'

/**
 * Shared Rate Limiting Configuration
 *
 * Centralized constants for MetaDJai rate limiting across all routes.
 *
 * ## Architecture: Hybrid In-Memory + Upstash Redis
 *
 * This rate limiter supports two modes:
 *
 * **1. In-Memory Mode (Default)**
 * Used when Upstash environment variables are not configured.
 * - Rate limits reset on server restart
 * - Not distributed across serverless function instances
 * - Sufficient for single-instance deployments (Replit)
 *
 * **2. Distributed Mode (Upstash Redis)**
 * Automatically enabled when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * - Persistent rate limits across restarts
 * - Distributed across all serverless instances
 * - Required for multi-instance deployments (Vercel, AWS Lambda)
 *
 * ## Setup for Distributed Mode
 *
 * 1. Create account at https://upstash.com
 * 2. Create a Redis database (select region closest to deployment)
 * 3. Add to environment:
 *    - UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *    - UPSTASH_REDIS_REST_TOKEN=xxx
 *
 * The rate limiter will automatically use Upstash when these variables are present.
 *
 * **Dependencies (already installed):** @upstash/ratelimit, @upstash/redis
 * **Cost:** Upstash free tier covers 10K commands/day (sufficient for MVP)
 */

// Message history and content limits
export const MAX_HISTORY = MAX_MESSAGE_HISTORY
export const MAX_CONTENT_LENGTH = MAX_MESSAGE_CONTENT_LENGTH
export { MAX_MESSAGES_PER_REQUEST }

// Rate limiting configuration - Chat
export const MIN_MESSAGE_INTERVAL_MS = 500
export const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
export const MAX_MESSAGES_PER_WINDOW = 20

// Rate limiting configuration - Transcription (lower limits due to higher API costs)
export const TRANSCRIBE_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
export const MAX_TRANSCRIPTIONS_PER_WINDOW = 5

// Session cookie configuration
export const SESSION_COOKIE_NAME = 'metadjai-session'
export const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days
export const SESSION_COOKIE_PATH = '/api/metadjai' // Restrict cookie to MetaDJai routes only

// ============================================================================
// Upstash Redis Rate Limiting (Distributed Mode)
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
 * When enabled (recommended for production with distributed deployments),
 * rate limit checks will DENY requests when Redis is unavailable rather
 * than falling back to in-memory (which doesn't work across instances).
 *
 * Set RATE_LIMIT_FAIL_CLOSED=true to enable.
 */
export const isFailClosedEnabled = process.env.RATE_LIMIT_FAIL_CLOSED === 'true'

// Log fail-closed mode status at startup (once)
let didLogFailClosedStatus = false
function logFailClosedStatusOnce() {
  if (didLogFailClosedStatus) return
  didLogFailClosedStatus = true

  if (isFailClosedEnabled && process.env.NODE_ENV === 'production') {
    logger.warn(
      '[Rate Limiter] Fail-closed mode ENABLED - requests will be DENIED if Redis is unavailable. ' +
      'Ensure Upstash Redis is properly configured for production availability.'
    )
  }
}

let didLogUpstashMisconfig = false

function logUpstashMisconfigOnce() {
  if (didLogUpstashMisconfig) return
  didLogUpstashMisconfig = true

  if (process.env.NODE_ENV !== 'production') return
  if (isUpstashConfigured) return

  const isReplitSingleInstance =
    process.env.REPLIT_DEPLOYMENT === 'true' || Boolean(process.env.REPL_ID)

  if (isReplitSingleInstance) {
    // Replit typically runs single instance - in-memory is acceptable
    logger.warn('Rate limiting in production without Upstash (Replit single-instance mode)')
    return
  }

  // Multi-instance deployments (Vercel, AWS) require distributed rate limiting
  logger.error(
    'CRITICAL: Production deployment without Upstash rate limiting - rate limits will not be enforced consistently across serverless instances. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
  )
}

/**
 * Upstash Redis client - lazy initialized only when configured
 */
let upstashRedis: Redis | null = null
let upstashRatelimit: Ratelimit | null = null
let upstashTranscribeRatelimit: Ratelimit | null = null
let upstashBurstRatelimit: Ratelimit | null = null
let upstashTranscribeBurstRatelimit: Ratelimit | null = null

/**
 * Initialize Upstash rate limiter (called lazily on first use)
 */
function getUpstashRatelimit(): Ratelimit | null {
  logFailClosedStatusOnce()
  if (!isUpstashConfigured) {
    logUpstashMisconfigOnce()
    return null
  }

  if (!upstashRatelimit) {
    try {
      upstashRedis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })

      upstashRatelimit = new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(MAX_MESSAGES_PER_WINDOW, '5 m'),
        analytics: true,
        prefix: 'metadjai',
      })

      logger.info('[Rate Limiter] Upstash Redis initialized (distributed mode)')
    } catch (error) {
      logger.error('[Rate Limiter] Failed to initialize Upstash Redis', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  return upstashRatelimit
}

/**
 * Initialize Upstash burst limiter for chat (called lazily on first use)
 * Enforces minimum message interval across instances.
 */
function getUpstashBurstRatelimit(): Ratelimit | null {
  if (!isUpstashConfigured) {
    logUpstashMisconfigOnce()
    return null
  }

  if (!upstashBurstRatelimit) {
    try {
      if (!upstashRedis) {
        upstashRedis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        })
      }

      const intervalSeconds = Math.max(1, Math.ceil(MIN_MESSAGE_INTERVAL_MS / 1000))
      upstashBurstRatelimit = new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.fixedWindow(1, `${intervalSeconds} s`),
        analytics: true,
        prefix: 'metadjai-burst',
      })
    } catch (error) {
      logger.error('[Rate Limiter] Failed to initialize Upstash burst limiter', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  return upstashBurstRatelimit
}

/**
 * Initialize Upstash rate limiter for transcription (called lazily on first use)
 * Separate from chat with lower limits due to Whisper API costs
 */
function getUpstashTranscribeRatelimit(): Ratelimit | null {
  if (!isUpstashConfigured) {
    logUpstashMisconfigOnce()
    return null
  }

  if (!upstashTranscribeRatelimit) {
    try {
      // Reuse existing Redis connection if available
      if (!upstashRedis) {
        upstashRedis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        })
      }

      upstashTranscribeRatelimit = new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(MAX_TRANSCRIPTIONS_PER_WINDOW, '5 m'),
        analytics: true,
        prefix: 'metadjai-transcribe',
      })

      logger.info('[Rate Limiter] Upstash Redis transcription limiter initialized')
    } catch (error) {
      logger.error('[Rate Limiter] Failed to initialize Upstash transcription limiter', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  return upstashTranscribeRatelimit
}

/**
 * Initialize Upstash burst limiter for transcription (called lazily on first use)
 * Enforces minimum message interval across instances.
 */
function getUpstashTranscribeBurstRatelimit(): Ratelimit | null {
  if (!isUpstashConfigured) {
    logUpstashMisconfigOnce()
    return null
  }

  if (!upstashTranscribeBurstRatelimit) {
    try {
      if (!upstashRedis) {
        upstashRedis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        })
      }

      const intervalSeconds = Math.max(1, Math.ceil(MIN_MESSAGE_INTERVAL_MS / 1000))
      upstashTranscribeBurstRatelimit = new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.fixedWindow(1, `${intervalSeconds} s`),
        analytics: true,
        prefix: 'metadjai-transcribe-burst',
      })
    } catch (error) {
      logger.error('[Rate Limiter] Failed to initialize Upstash transcription burst limiter', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  return upstashTranscribeBurstRatelimit
}

/**
 * Distributed rate limit check using Upstash Redis
 *
 * @param identifier - Client identifier (session or fingerprint)
 * @returns Rate limit result with allowed status and remaining time
 */
export async function checkRateLimitDistributed(
  identifier: string,
  isFingerprint = identifier.startsWith('fp-')
): Promise<RateLimitResult> {
  const ratelimit = getUpstashRatelimit()

  if (!ratelimit) {
    // Fail-closed: deny if Redis unavailable and fail-closed enabled
    if (isFailClosedEnabled) {
      logger.warn('[Rate Limiter] Redis unavailable, denying request (fail-closed mode)')
      return { allowed: false, remainingMs: 30000 } // Retry after 30s
    }
    // Fall back to in-memory if Upstash not available
    return checkRateLimit(identifier, isFingerprint)
  }

  try {
    if (!isFingerprint) {
      const burstLimiter = getUpstashBurstRatelimit()
      if (burstLimiter) {
        const burstResult = await burstLimiter.limit(identifier)
        if (!burstResult.success) {
          const remainingMs = Math.max(0, burstResult.reset - Date.now())
          return { allowed: false, remainingMs }
        }
      }
    }

    const { success, reset } = await ratelimit.limit(identifier)

    if (!success) {
      const remainingMs = Math.max(0, reset - Date.now())
      return { allowed: false, remainingMs }
    }

    return { allowed: true }
  } catch (error) {
    // Fail-closed: deny if Redis errors and fail-closed enabled
    if (isFailClosedEnabled) {
      logger.error('[Rate Limiter] Upstash check failed, denying request (fail-closed mode)', {
        error: error instanceof Error ? error.message : String(error),
      })
      return { allowed: false, remainingMs: 30000 }
    }
    logger.error('[Rate Limiter] Upstash check failed, falling back to in-memory', {
      error: error instanceof Error ? error.message : String(error),
    })
    return checkRateLimit(identifier, isFingerprint)
  }
}

/**
 * Distributed rate limit check for transcription using Upstash Redis
 * Uses separate, lower limits due to Whisper API costs
 *
 * @param identifier - Client identifier (session or fingerprint)
 * @returns Rate limit result with allowed status and remaining time
 */
export async function checkTranscribeRateLimitDistributed(
  identifier: string,
  isFingerprint = identifier.startsWith('fp-')
): Promise<RateLimitResult> {
  const ratelimit = getUpstashTranscribeRatelimit()

  if (!ratelimit) {
    // Fail-closed: deny if Redis unavailable and fail-closed enabled
    if (isFailClosedEnabled) {
      logger.warn('[Rate Limiter] Redis unavailable for transcription, denying request (fail-closed mode)')
      return { allowed: false, remainingMs: 30000 }
    }
    // Fall back to in-memory if Upstash not available
    return checkTranscribeRateLimit(identifier, isFingerprint)
  }

  try {
    if (!isFingerprint) {
      const burstLimiter = getUpstashTranscribeBurstRatelimit()
      if (burstLimiter) {
        const burstResult = await burstLimiter.limit(identifier)
        if (!burstResult.success) {
          const remainingMs = Math.max(0, burstResult.reset - Date.now())
          return { allowed: false, remainingMs }
        }
      }
    }

    const { success, reset } = await ratelimit.limit(identifier)

    if (!success) {
      const remainingMs = Math.max(0, reset - Date.now())
      return { allowed: false, remainingMs }
    }

    return { allowed: true }
  } catch (error) {
    // Fail-closed: deny if Redis errors and fail-closed enabled
    if (isFailClosedEnabled) {
      logger.error(
        '[Rate Limiter] Upstash transcription check failed, denying request (fail-closed mode)',
        { error: error instanceof Error ? error.message : String(error) }
      )
      return { allowed: false, remainingMs: 30000 }
    }
    logger.error('[Rate Limiter] Upstash transcription check failed, falling back to in-memory', {
      error: error instanceof Error ? error.message : String(error),
    })
    return checkTranscribeRateLimit(identifier, isFingerprint)
  }
}

/**
 * Get the rate limiting mode currently in use
 */
export function getRateLimitMode(): 'distributed' | 'in-memory' {
  return isUpstashConfigured ? 'distributed' : 'in-memory'
}

// ============================================================================
// In-Memory Rate Limiting (Default Mode)
// ============================================================================

/**
 * Rate Limit Record
 */
interface RateLimitRecord {
  count: number
  resetAt: number
  lastSentAt: number
}

/**
 * Rate Limit Check Result
 */
export interface RateLimitResult {
  allowed: boolean
  remainingMs?: number
}

function sanitizeMessageContent(content: string): string {
  return content
    .normalize('NFKC')
    .replace(/[\u200b-\u200f\u2028-\u202f\ufeff]/g, '')
    .replace(/^\s*(system|assistant|developer|user|human|ai)\s*:/gmi, '')
    .replace(/^\s*role\s*:\s*(system|assistant|developer|user|human|ai)\s*$/gmi, '')
    .replace(/\b(begin|end)\s+(system|developer|assistant|prompt)\b/gi, '')
    .replace(/<<\s*(system|developer|assistant|user)\s*>>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/```[\s\S]*?```/g, '[code block]')
}

// Re-export ClientIdentifier type
export type { ClientIdentifier }

// In-memory rate limiting storage with bounded growth (LRU eviction)
const rateLimitMap = new BoundedMap<string, RateLimitRecord>(DEFAULT_MAX_ENTRIES)
const transcribeRateLimitMap = new BoundedMap<string, RateLimitRecord>(DEFAULT_MAX_ENTRIES)
const CLEANUP_INTERVAL_MS = RATE_LIMIT_WINDOW_MS
let lastCleanup = 0

function cleanupExpired(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return

  for (const [key, record] of rateLimitMap.entries()) {
    if (record.resetAt <= now) {
      rateLimitMap.delete(key)
    }
  }
  for (const [key, record] of transcribeRateLimitMap.entries()) {
    if (record.resetAt <= now) {
      transcribeRateLimitMap.delete(key)
    }
  }
  lastCleanup = now
}

/**
 * Sanitize chat messages for AI processing
 *
 * - Limits message history to MAX_HISTORY
 * - Truncates content to MAX_CONTENT_LENGTH
 * - Strips HTML tags
 * - Normalizes roles to 'user' or 'assistant'
 */
export function sanitizeMessages(messages: MetaDjAiApiMessage[]): MetaDjAiApiMessage[] {
  return messages
    .slice(-MAX_HISTORY)
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: sanitizeMessageContent(message.content.slice(0, MAX_CONTENT_LENGTH)),
    }))
}

/**
 * Get client identifier from request
 *
 * Uses shared client identifier utility for consistent fingerprinting.
 * @see @/lib/rate-limiting/client-identifier
 */
export function getClientIdentifier(request: NextRequest): ClientIdentifier {
  return getClientIdentifierBase(request, SESSION_COOKIE_NAME)
}

/**
 * Check if a client is rate limited
 *
 * Checks both:
 * - Burst prevention (minimum time between messages)
 * - Window rate limiting (max messages per time window)
 *
 * Note: Successful checks consume quota to keep in-memory behavior
 * consistent with distributed (Upstash) rate limiting.
 */
export function checkRateLimit(
  identifier: string,
  isFingerprint: boolean
): RateLimitResult {
  const now = Date.now()
  cleanupExpired(now)
  let record = rateLimitMap.get(identifier)

  // Initialize or reset record if expired
  if (!record || now >= record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
      lastSentAt: 0,
    })
    record = rateLimitMap.get(identifier)!
  }

  // Check burst prevention (skip for fingerprint-based to avoid false collisions)
  if (!isFingerprint && record.lastSentAt > 0 && now - record.lastSentAt < MIN_MESSAGE_INTERVAL_MS) {
    return { allowed: false, remainingMs: MIN_MESSAGE_INTERVAL_MS - (now - record.lastSentAt) }
  }

  // Check rate limit window
  if (record.count >= MAX_MESSAGES_PER_WINDOW) {
    const remainingMs = Math.max(0, record.resetAt - now)
    return { allowed: false, remainingMs }
  }

  record.count += 1
  record.lastSentAt = now
  return { allowed: true }
}

/**
 * Clear all rate limit records (useful for development/testing)
 */
export function clearAllRateLimits(): void {
  rateLimitMap.clear()
}

/**
 * Clear rate limit for a specific identifier
 */
export function clearRateLimit(identifier: string): boolean {
  return rateLimitMap.delete(identifier)
}

/**
 * Check if a client is rate limited for transcription
 * Uses separate, lower limits due to Whisper API costs
 */
export function checkTranscribeRateLimit(
  identifier: string,
  isFingerprint: boolean
): RateLimitResult {
  const now = Date.now()
  cleanupExpired(now)
  let record = transcribeRateLimitMap.get(identifier)

  // Initialize or reset record if expired
  if (!record || now >= record.resetAt) {
    transcribeRateLimitMap.set(identifier, {
      count: 0,
      resetAt: now + TRANSCRIBE_RATE_LIMIT_WINDOW_MS,
      lastSentAt: 0,
    })
    record = transcribeRateLimitMap.get(identifier)!
  }

  // Check burst prevention (skip for fingerprint-based to avoid false collisions)
  if (!isFingerprint && record.lastSentAt > 0 && now - record.lastSentAt < MIN_MESSAGE_INTERVAL_MS) {
    return { allowed: false, remainingMs: MIN_MESSAGE_INTERVAL_MS - (now - record.lastSentAt) }
  }

  // Check rate limit window (lower limit for transcription)
  if (record.count >= MAX_TRANSCRIPTIONS_PER_WINDOW) {
    const remainingMs = Math.max(0, record.resetAt - now)
    return { allowed: false, remainingMs }
  }

  record.count += 1
  record.lastSentAt = now
  return { allowed: true }
}

/**
 * Generate a new session ID
 *
 * Uses shared session ID generator for consistency.
 * @see @/lib/rate-limiting/client-identifier
 */
export function generateSessionId(): string {
  return generateSessionIdBase('session')
}

/**
 * Build rate limit error response
 */
export function buildRateLimitResponse(remainingMs: number): {
  error: string
  retryAfter: number
} {
  const retryAfterSeconds = Math.ceil(remainingMs / 1000)
  return {
    error: 'Rate limit exceeded. Please wait before sending another message.',
    retryAfter: retryAfterSeconds,
  }
}

// Cleanup old rate limit entries periodically (every 60 seconds)
// Use globalThis to persist interval reference across hot reloads
// This prevents duplicate intervals in development mode
const RATE_LIMIT_CLEANUP_KEY = '__rateLimitCleanupInterval__'

declare global {
  var __rateLimitCleanupInterval__: ReturnType<typeof setInterval> | undefined
}

function startCleanupInterval(): void {
  // Clear existing interval to prevent duplicates on hot reload
  if (globalThis[RATE_LIMIT_CLEANUP_KEY]) {
    clearInterval(globalThis[RATE_LIMIT_CLEANUP_KEY])
  }

  globalThis[RATE_LIMIT_CLEANUP_KEY] = setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitMap.entries()) {
      if (now >= record.resetAt) {
        rateLimitMap.delete(key)
      }
    }
    for (const [key, record] of transcribeRateLimitMap.entries()) {
      if (now >= record.resetAt) {
        transcribeRateLimitMap.delete(key)
      }
    }
  }, 60000)
}

// Start the cleanup interval
startCleanupInterval()
