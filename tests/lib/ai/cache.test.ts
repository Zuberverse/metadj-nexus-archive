/**
 * AI Cache Tests
 *
 * Tests in-memory caching layer: key generation, get/set, TTL, eviction,
 * metrics, invalidation, and configuration.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  createCacheKey,
  getCachedResponse,
  setCachedResponse,
  getCacheTtl,
  getMaxCacheSize,
  isCacheEnabled,
  getCacheHitRate,
  getCacheMetrics,
  resetCacheMetrics,
  getCacheStats,
  clearCache,
  invalidatePattern,
} from '@/lib/ai/cache'

const originalEnv = { ...process.env }

describe('ai cache (in-memory)', () => {
  beforeEach(() => {
    clearCache()
    resetCacheMetrics()
    process.env = { ...originalEnv }
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    // Enable caching for tests
    process.env.AI_CACHE_ENABLED = 'true'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // --- Configuration ---

  describe('configuration', () => {
    it('returns default TTL of 30 minutes', () => {
      delete process.env.AI_CACHE_TTL_MS
      expect(getCacheTtl()).toBe(30 * 60 * 1000)
    })

    it('respects custom TTL from env', () => {
      process.env.AI_CACHE_TTL_MS = '120000'
      expect(getCacheTtl()).toBe(120000)
    })

    it('ignores invalid TTL values', () => {
      process.env.AI_CACHE_TTL_MS = 'abc'
      expect(getCacheTtl()).toBe(30 * 60 * 1000)
    })

    it('ignores too-small TTL', () => {
      process.env.AI_CACHE_TTL_MS = '1000' // Below 60000 min
      expect(getCacheTtl()).toBe(30 * 60 * 1000)
    })

    it('returns default max size of 100', () => {
      delete process.env.AI_CACHE_MAX_SIZE
      expect(getMaxCacheSize()).toBe(100)
    })

    it('respects custom max size from env', () => {
      process.env.AI_CACHE_MAX_SIZE = '50'
      expect(getMaxCacheSize()).toBe(50)
    })

    it('ignores invalid max size values', () => {
      process.env.AI_CACHE_MAX_SIZE = 'abc'
      expect(getMaxCacheSize()).toBe(100)
    })

    it('ignores too-small max size', () => {
      process.env.AI_CACHE_MAX_SIZE = '5' // Below 10 min
      expect(getMaxCacheSize()).toBe(100)
    })
  })

  // --- isCacheEnabled ---

  describe('isCacheEnabled', () => {
    it('returns true when explicitly enabled', () => {
      process.env.AI_CACHE_ENABLED = 'true'
      expect(isCacheEnabled()).toBe(true)
    })

    it('returns false when explicitly disabled', () => {
      process.env.AI_CACHE_ENABLED = 'false'
      expect(isCacheEnabled()).toBe(false)
    })

    it('returns false when disabled with 0', () => {
      process.env.AI_CACHE_ENABLED = '0'
      expect(isCacheEnabled()).toBe(false)
    })

    it('returns true when enabled with 1', () => {
      process.env.AI_CACHE_ENABLED = '1'
      expect(isCacheEnabled()).toBe(true)
    })
  })

  // --- Cache Key Generation ---

  describe('createCacheKey', () => {
    it('generates a non-empty key for valid messages', () => {
      const messages = [
        { role: 'user', content: 'Tell me about electronic music production' },
      ]
      const key = createCacheKey(messages, 'adaptive')
      expect(key).toBeTruthy()
      expect(key).toContain('ai:adaptive:')
    })

    it('returns empty for very short messages', () => {
      const messages = [{ role: 'user', content: 'hi' }]
      const key = createCacheKey(messages, 'adaptive')
      expect(key).toBe('')
    })

    it('produces deterministic keys', () => {
      const messages = [
        { role: 'user', content: 'What is the meaning of life in music?' },
      ]
      const key1 = createCacheKey(messages, 'adaptive')
      const key2 = createCacheKey(messages, 'adaptive')
      expect(key1).toBe(key2)
    })

    it('produces different keys for different modes', () => {
      const messages = [
        { role: 'user', content: 'Tell me about electronic music production' },
      ]
      const key1 = createCacheKey(messages, 'adaptive')
      const key2 = createCacheKey(messages, 'explorer')
      expect(key1).not.toBe(key2)
    })

    it('includes context signature when provided', () => {
      const messages = [
        { role: 'user', content: 'Tell me about electronic music production' },
      ]
      const key1 = createCacheKey(messages, 'adaptive', '')
      const key2 = createCacheKey(messages, 'adaptive', 'context-123')
      expect(key1).not.toBe(key2)
    })

    it('returns empty for empty messages array', () => {
      expect(createCacheKey([], 'adaptive')).toBe('')
    })
  })

  // --- Get/Set Cached Response ---

  describe('getCachedResponse and setCachedResponse', () => {
    it('returns null for cache miss', async () => {
      const result = await getCachedResponse('nonexistent-key')
      expect(result).toBeNull()
    })

    it('returns null for empty key', async () => {
      const result = await getCachedResponse('')
      expect(result).toBeNull()
    })

    it('stores and retrieves a response', async () => {
      await setCachedResponse('test-key', 'a'.repeat(60), 'gpt-5')
      const result = await getCachedResponse('test-key')
      expect(result).toBe('a'.repeat(60))
    })

    it('does not cache short responses', async () => {
      await setCachedResponse('short-key', 'tiny', 'gpt-5')
      const result = await getCachedResponse('short-key')
      expect(result).toBeNull()
    })

    it('increments hits on cache hit', async () => {
      await setCachedResponse('hit-key', 'x'.repeat(60), 'gpt-5')
      await getCachedResponse('hit-key')
      await getCachedResponse('hit-key')
      const metrics = getCacheMetrics()
      expect(metrics.hits).toBeGreaterThanOrEqual(2)
    })
  })

  // --- Metrics ---

  describe('metrics', () => {
    it('starts with zero hit rate', () => {
      expect(getCacheHitRate()).toBe(0)
    })

    it('tracks hits and misses', async () => {
      await getCachedResponse('miss-1')
      await getCachedResponse('miss-2')
      const metrics = getCacheMetrics()
      expect(metrics.misses).toBeGreaterThanOrEqual(2)
    })

    it('tracks writes', async () => {
      await setCachedResponse('write-key', 'y'.repeat(60), 'gpt-5')
      const metrics = getCacheMetrics()
      expect(metrics.writes).toBeGreaterThanOrEqual(1)
    })

    it('calculates hit rate correctly', async () => {
      await setCachedResponse('rate-key', 'z'.repeat(60), 'gpt-5')
      await getCachedResponse('rate-key') // hit
      await getCachedResponse('nonexistent') // miss
      const rate = getCacheHitRate()
      expect(rate).toBeCloseTo(0.5, 1)
    })

    it('resets metrics', () => {
      resetCacheMetrics()
      const metrics = getCacheMetrics()
      expect(metrics.hits).toBe(0)
      expect(metrics.misses).toBe(0)
      expect(metrics.writes).toBe(0)
    })
  })

  // --- Cache Stats ---

  describe('getCacheStats', () => {
    it('returns comprehensive stats', async () => {
      await setCachedResponse('stats-key', 'content'.repeat(20), 'gpt-5')
      const stats = getCacheStats()
      expect(stats.enabled).toBe(true)
      expect(stats.size).toBeGreaterThanOrEqual(1)
      expect(stats.maxSize).toBe(100)
      expect(stats.ttlMs).toBeGreaterThan(0)
      expect(stats.metrics).toHaveProperty('hits')
      expect(stats.metrics).toHaveProperty('misses')
      expect(Array.isArray(stats.entries)).toBe(true)
    })
  })

  // --- Clear and Invalidate ---

  describe('clearCache', () => {
    it('removes all entries', async () => {
      await setCachedResponse('clear-1', 'a'.repeat(60), 'gpt-5')
      await setCachedResponse('clear-2', 'b'.repeat(60), 'gpt-5')
      clearCache()
      const stats = getCacheStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('invalidatePattern', () => {
    it('removes matching entries', async () => {
      await setCachedResponse('ai:adaptive:abc', 'c'.repeat(60), 'gpt-5')
      await setCachedResponse('ai:adaptive:def', 'd'.repeat(60), 'gpt-5')
      await setCachedResponse('ai:explorer:ghi', 'e'.repeat(60), 'gpt-5')
      const removed = invalidatePattern('adaptive')
      expect(removed).toBe(2)
    })

    it('returns 0 when no matches', () => {
      const removed = invalidatePattern('nonexistent')
      expect(removed).toBe(0)
    })
  })
})
