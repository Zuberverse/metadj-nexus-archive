/**
 * Wisdom Data Loader Tests
 *
 * Tests the cached loading mechanism for wisdom content.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  loadWisdomData,
  getCachedWisdomData,
  clearWisdomCache,
} from '@/lib/wisdom/data'

describe('wisdom data loader', () => {
  const mockWisdomResponse = {
    thoughtsPosts: [{ id: '1', title: 'Test Thought' }],
    guides: [{ id: '2', title: 'Test Guide' }],
    reflections: [{ id: '3', title: 'Test Reflection' }],
  }

  beforeEach(() => {
    clearWisdomCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    clearWisdomCache()
  })

  describe('getCachedWisdomData', () => {
    it('returns null when no data is cached', () => {
      expect(getCachedWisdomData()).toBeNull()
    })
  })

  describe('clearWisdomCache', () => {
    it('clears the cache', () => {
      // After clearing, cached data should be null
      clearWisdomCache()
      expect(getCachedWisdomData()).toBeNull()
    })
  })

  describe('loadWisdomData', () => {
    it('fetches wisdom data from API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWisdomResponse),
      })
      vi.stubGlobal('fetch', mockFetch)

      const data = await loadWisdomData()

      expect(mockFetch).toHaveBeenCalledWith('/api/wisdom')
      expect(data).toEqual({
        thoughts: mockWisdomResponse.thoughtsPosts,
        guides: mockWisdomResponse.guides,
        reflections: mockWisdomResponse.reflections,
      })

      vi.unstubAllGlobals()
    })

    it('caches data after first fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWisdomResponse),
      })
      vi.stubGlobal('fetch', mockFetch)

      await loadWisdomData()
      const cached = getCachedWisdomData()

      expect(cached).not.toBeNull()
      expect(cached!.thoughts).toEqual(mockWisdomResponse.thoughtsPosts)

      vi.unstubAllGlobals()
    })

    it('returns cached data on subsequent calls', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWisdomResponse),
      })
      vi.stubGlobal('fetch', mockFetch)

      await loadWisdomData()
      await loadWisdomData()

      // Should only fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1)

      vi.unstubAllGlobals()
    })

    it('throws on non-ok response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })
      vi.stubGlobal('fetch', mockFetch)

      await expect(loadWisdomData()).rejects.toThrow('Failed to load Wisdom content')

      vi.unstubAllGlobals()
    })

    it('clears promise cache on error so retry is possible', async () => {
      let callCount = 0
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({ ok: false })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWisdomResponse),
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      // First call should fail
      await expect(loadWisdomData()).rejects.toThrow()

      // Second call should retry and succeed
      const data = await loadWisdomData()
      expect(data.thoughts).toEqual(mockWisdomResponse.thoughtsPosts)

      vi.unstubAllGlobals()
    })
  })
})
