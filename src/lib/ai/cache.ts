/**
 * Semantic Response Caching for AI
 *
 * Provides an in-memory caching layer for AI responses.
 * Can be optionally extended with Upstash KV for distributed caching.
 *
 * Features:
 * - In-memory cache with LRU eviction
 * - Configurable TTL per entry
 * - Cache key generation from messages and context hint
 * - Optional Upstash KV integration
 *
 * Note: This is infrastructure preparation. Enable via AI_CACHE_ENABLED env var.
 *
 * @module lib/ai/cache
 */

import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'

/**
 * Cache entry structure
 */
interface CacheEntry {
  /** Cached response content */
  response: string
  /** Timestamp when entry was created */
  timestamp: number
  /** Time-to-live in milliseconds */
  ttl: number
  /** Model used to generate this response */
  model: string
  /** Number of times this entry was hit */
  hits: number
}

/**
 * Message structure for cache key generation
 */
interface CacheMessage {
  role?: string
  content?: string
}

/** In-memory cache storage */
const memoryCache = new Map<string, CacheEntry>()

/**
 * Aggregate cache metrics for monitoring hit rate
 * These counters persist for the lifetime of the process.
 */
interface CacheMetrics {
  /** Total cache hits (memory + upstash) */
  hits: number
  /** Total cache misses */
  misses: number
  /** Total cache writes */
  writes: number
  /** Total evictions performed */
  evictions: number
  /** Timestamp when metrics were last reset */
  resetAt: number
}

const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  writes: 0,
  evictions: 0,
  resetAt: Date.now(),
}

let upstashRedis: Redis | null = null
let didLogUpstashError = false

/** Default maximum entries in memory cache */
const DEFAULT_MAX_CACHE_SIZE = 100

/** Default TTL: 30 minutes */
const DEFAULT_TTL_MS = 30 * 60 * 1000

/** Minimum message length for caching (skip very short messages) */
const MIN_CACHE_MESSAGE_LENGTH = 10

/**
 * Get the configured cache TTL from environment
 *
 * Configurable via AI_CACHE_TTL_MS environment variable.
 * Defaults to 30 minutes (1,800,000ms).
 *
 * @returns TTL in milliseconds
 */
export function getCacheTtl(): number {
  const env = process.env.AI_CACHE_TTL_MS
  if (env) {
    const parsed = parseInt(env, 10)
    // Validate: minimum 1 minute, maximum 24 hours
    if (!isNaN(parsed) && parsed >= 60000 && parsed <= 86400000) {
      return parsed
    }
  }
  return DEFAULT_TTL_MS
}

/**
 * Get the configured maximum cache size from environment
 *
 * Configurable via AI_CACHE_MAX_SIZE environment variable.
 * Defaults to 100 entries.
 *
 * @returns Maximum number of cache entries
 */
export function getMaxCacheSize(): number {
  const env = process.env.AI_CACHE_MAX_SIZE
  if (env) {
    const parsed = parseInt(env, 10)
    // Validate: minimum 10, maximum 1000
    if (!isNaN(parsed) && parsed >= 10 && parsed <= 1000) {
      return parsed
    }
  }
  return DEFAULT_MAX_CACHE_SIZE
}

/**
 * Check if caching is enabled via environment
 *
 * Caching is enabled by default in production for performance benefits.
 * Can be explicitly disabled with AI_CACHE_ENABLED=false.
 *
 * @returns true if caching should be used
 */
export function isCacheEnabled(): boolean {
  const env = process.env.AI_CACHE_ENABLED
  // Explicitly disabled
  if (env === 'false' || env === '0') return false
  // Explicitly enabled
  if (env === 'true' || env === '1') return true
  // Default: enabled in production, disabled otherwise
  return process.env.NODE_ENV === 'production'
}

function getUpstashRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  if (upstashRedis) {
    return upstashRedis
  }

  try {
    upstashRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    return upstashRedis
  } catch (error) {
    if (!didLogUpstashError) {
      logger.error('Upstash cache init failed', { error: String(error) })
      didLogUpstashError = true
    }
    return null
  }
}

/**
 * Create a deterministic cache key from messages and context hint
 *
 * Uses the last user message + mode string to create a unique key.
 * This enables cache hits for semantically identical requests.
 *
 * @param messages - Array of chat messages
 * @param mode - AI context hint (e.g., 'adaptive')
 * @returns Cache key string
 */
export function createCacheKey(messages: unknown[], mode: string, contextSignature = ''): string {
  const lastUserMsg = findLastUserMessage(messages)

  // Don't cache very short messages (likely greetings or simple queries)
  if (lastUserMsg.length < MIN_CACHE_MESSAGE_LENGTH) {
    return ''
  }

  // Normalize the message for better cache hits
  const normalizedMsg = lastUserMsg
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

  const signature = contextSignature ? `${normalizedMsg}|${contextSignature}` : normalizedMsg
  return `ai:${mode}:${hashString(signature)}`
}

/**
 * Get a cached response if available and not expired
 *
 * @param key - Cache key
 * @returns Cached response or null if not found/expired
 */
export async function getCachedResponse(key: string): Promise<string | null> {
  if (!key || !isCacheEnabled()) {
    return null
  }

  // Check memory cache first
  const entry = memoryCache.get(key)
  if (entry) {
    const now = Date.now()
    if (now < entry.timestamp + entry.ttl) {
      entry.hits++
      cacheMetrics.hits++
      logger.info('Cache hit', {
        key: key.slice(0, 50),
        hits: entry.hits,
        age: Math.round((now - entry.timestamp) / 1000),
        hitRate: getCacheHitRate().toFixed(2),
      })
      return entry.response
    }
    // Expired - remove it
    memoryCache.delete(key)
  }

  // Check Upstash KV if configured
  const upstash = getUpstashRedis()
  if (upstash) {
    try {
      const cached = await upstash.get<string>(key)
      if (typeof cached === 'string' && cached.length > 0) {
        cacheMetrics.hits++
        logger.info('Cache hit (upstash)', {
          key: key.slice(0, 50),
          hitRate: getCacheHitRate().toFixed(2),
        })
        return cached
      }
    } catch (error) {
      logger.warn('Upstash cache read failed', { error: String(error) })
    }
  }

  // Cache miss
  cacheMetrics.misses++
  return null
}

/**
 * Store a response in the cache
 *
 * @param key - Cache key
 * @param response - Response to cache
 * @param model - Model that generated this response
 * @param ttl - Time-to-live in milliseconds (default: from AI_CACHE_TTL_MS env or 30 minutes)
 */
export async function setCachedResponse(
  key: string,
  response: string,
  model: string,
  ttl?: number
): Promise<void> {
  const effectiveTtl = ttl ?? getCacheTtl()
  if (!key || !isCacheEnabled()) {
    return
  }

  // Don't cache very short responses
  if (response.length < 50) {
    return
  }

  // Evict oldest entries if at capacity
  if (memoryCache.size >= getMaxCacheSize()) {
    evictOldest()
  }

  const entry: CacheEntry = {
    response,
    timestamp: Date.now(),
    ttl: effectiveTtl,
    model,
    hits: 0,
  }

  memoryCache.set(key, entry)
  cacheMetrics.writes++

  logger.info('Response cached', {
    key: key.slice(0, 50),
    responseLength: response.length,
    ttlMinutes: Math.round(effectiveTtl / 60000),
    model,
    totalWrites: cacheMetrics.writes,
  })

  const upstash = getUpstashRedis()
  if (upstash) {
    try {
      await upstash.set(key, response, { ex: Math.ceil(effectiveTtl / 1000) })
    } catch (error) {
      logger.warn('Upstash cache write failed', { error: String(error) })
    }
  }
}

/**
 * Evict the oldest cache entries to make room for new ones
 *
 * Uses a simple LRU-like strategy based on timestamp.
 */
function evictOldest(): void {
  const entries = [...memoryCache.entries()]
    .sort((a, b) => a[1].timestamp - b[1].timestamp)

  // Remove oldest 20% of entries
  const toRemove = Math.max(1, Math.floor(entries.length * 0.2))

  for (let i = 0; i < toRemove; i++) {
    const [key] = entries[i]
    memoryCache.delete(key)
  }
  cacheMetrics.evictions += toRemove

  logger.info('Cache eviction', {
    removed: toRemove,
    remaining: memoryCache.size,
    totalEvictions: cacheMetrics.evictions,
  })
}

/**
 * Find the last user message in a messages array
 *
 * @param messages - Array of chat messages
 * @returns Content of the last user message
 */
function findLastUserMessage(messages: unknown[]): string {
  if (!Array.isArray(messages)) {
    return ''
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i] as CacheMessage
    if (msg?.role === 'user' && typeof msg.content === 'string') {
      return msg.content
    }
  }
  return ''
}

/**
 * Create a simple hash from a string
 *
 * Uses djb2 algorithm for fast, reasonably distributed hashing.
 *
 * @param str - String to hash
 * @returns Hash as base36 string
 */
function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) + hash) ^ char
  }
  // Convert to unsigned and then to base36
  return (hash >>> 0).toString(36)
}

/**
 * Calculate the current cache hit rate
 *
 * Hit rate = hits / (hits + misses)
 * Returns 0 if no requests have been made.
 *
 * @returns Hit rate as a decimal (0.0 to 1.0)
 */
export function getCacheHitRate(): number {
  const total = cacheMetrics.hits + cacheMetrics.misses
  if (total === 0) return 0
  return cacheMetrics.hits / total
}

/**
 * Get detailed cache metrics for monitoring dashboards
 *
 * @returns Object with all cache metrics
 */
export function getCacheMetrics(): CacheMetrics & { hitRate: number; uptimeMs: number } {
  return {
    ...cacheMetrics,
    hitRate: getCacheHitRate(),
    uptimeMs: Date.now() - cacheMetrics.resetAt,
  }
}

/**
 * Reset cache metrics (useful for testing or periodic resets)
 */
export function resetCacheMetrics(): void {
  cacheMetrics.hits = 0
  cacheMetrics.misses = 0
  cacheMetrics.writes = 0
  cacheMetrics.evictions = 0
  cacheMetrics.resetAt = Date.now()
  logger.info('Cache metrics reset')
}

/**
 * Get cache statistics for monitoring
 *
 * @returns Object with cache statistics
 */
export function getCacheStats(): {
  enabled: boolean
  size: number
  maxSize: number
  ttlMs: number
  hitRate: number
  metrics: {
    hits: number
    misses: number
    writes: number
    evictions: number
    uptimeMs: number
  }
  entries: Array<{
    key: string
    age: number
    hits: number
    model: string
  }>
} {
  const now = Date.now()

  return {
    enabled: isCacheEnabled(),
    size: memoryCache.size,
    maxSize: getMaxCacheSize(),
    ttlMs: getCacheTtl(),
    hitRate: getCacheHitRate(),
    metrics: {
      hits: cacheMetrics.hits,
      misses: cacheMetrics.misses,
      writes: cacheMetrics.writes,
      evictions: cacheMetrics.evictions,
      uptimeMs: now - cacheMetrics.resetAt,
    },
    entries: [...memoryCache.entries()]
      .map(([key, entry]) => ({
        key: key.slice(0, 30) + '...',
        age: Math.round((now - entry.timestamp) / 1000),
        hits: entry.hits,
        model: entry.model,
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10), // Top 10 by hits
  }
}

/**
 * Clear all cached responses
 *
 * Use for testing or manual cache invalidation.
 */
export function clearCache(): void {
  const previousSize = memoryCache.size
  memoryCache.clear()
  logger.info('Cache cleared', { previousSize })
}

/**
 * Invalidate cache entries matching a pattern
 *
 * Useful for invalidating caches when underlying data changes.
 *
 * @param pattern - String pattern to match against cache keys
 * @returns Number of entries invalidated
 */
export function invalidatePattern(pattern: string): number {
  let count = 0
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key)
      count++
    }
  }

  if (count > 0) {
    logger.info('Cache invalidation', { pattern, count })
  }

  return count
}
