/**
 * Wisdom Continue Reading Tests
 *
 * Tests localStorage-backed persistence for recently viewed wisdom items.
 * Mocks the storage module to isolate continue-reading logic.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// In-memory store that simulates localStorage via the storage module
let store: Record<string, unknown> = {}
const storageListeners: Array<(key: string, newValue: string | null) => void> = []

vi.mock('@/lib/storage', () => ({
  STORAGE_KEYS: {
    WISDOM_CONTINUE_READING: 'wisdom-continue-reading',
  },
  getValue: vi.fn((key: string, fallback: unknown) => {
    return key in store ? store[key] : fallback
  }),
  setValue: vi.fn((key: string, value: unknown) => {
    store[key] = value
    for (const listener of storageListeners) {
      listener(key, JSON.stringify(value))
    }
    return true
  }),
  removeValue: vi.fn((key: string) => {
    if (key in store) {
      delete store[key]
      for (const listener of storageListeners) {
        listener(key, null)
      }
      return true
    }
    return false
  }),
  onStorageChange: vi.fn(
    (cb: (key: string, newValue: string | null) => void) => {
      storageListeners.push(cb)
      return () => {
        const idx = storageListeners.indexOf(cb)
        if (idx >= 0) storageListeners.splice(idx, 1)
      }
    }
  ),
}))

import {
  MAX_CONTINUE_READING_ITEMS,
  getContinueReadingList,
  getContinueReading,
  setContinueReading,
  clearContinueReading,
  onContinueReadingChange,
  onContinueReadingListChange,
  type WisdomContinueReading,
} from '@/lib/wisdom/continue-reading'

function makeItem(id: string, section = 'thoughts' as const): WisdomContinueReading {
  return {
    section,
    id,
    title: `Title ${id}`,
    excerpt: `Excerpt for ${id}`,
    readTimeMinutes: 5,
    lastOpenedAt: new Date().toISOString(),
  }
}

describe('wisdom continue-reading', () => {
  beforeEach(() => {
    store = {}
    storageListeners.length = 0
    vi.clearAllMocks()
  })

  // --- Constants ---

  describe('constants', () => {
    it('limits to 3 continue-reading items', () => {
      expect(MAX_CONTINUE_READING_ITEMS).toBe(3)
    })
  })

  // --- getContinueReadingList ---

  describe('getContinueReadingList', () => {
    it('returns empty array when no data stored', () => {
      expect(getContinueReadingList()).toEqual([])
    })

    it('returns array when array is stored', () => {
      const items = [makeItem('a'), makeItem('b')]
      store['wisdom-continue-reading'] = items
      expect(getContinueReadingList()).toEqual(items)
    })

    it('wraps single object in array', () => {
      const item = makeItem('single')
      store['wisdom-continue-reading'] = item
      const list = getContinueReadingList()
      expect(list).toEqual([item])
    })

    it('returns empty for non-object value', () => {
      store['wisdom-continue-reading'] = 'not-an-object'
      expect(getContinueReadingList()).toEqual([])
    })
  })

  // --- getContinueReading ---

  describe('getContinueReading', () => {
    it('returns null when empty', () => {
      expect(getContinueReading()).toBeNull()
    })

    it('returns first item from list', () => {
      const items = [makeItem('first'), makeItem('second')]
      store['wisdom-continue-reading'] = items
      expect(getContinueReading()?.id).toBe('first')
    })
  })

  // --- setContinueReading ---

  describe('setContinueReading', () => {
    it('stores a new item', () => {
      const item = makeItem('new')
      const result = setContinueReading(item)
      expect(result).toBe(true)
      expect(getContinueReadingList()).toHaveLength(1)
      expect(getContinueReadingList()[0].id).toBe('new')
    })

    it('deduplicates by section and id', () => {
      const item = makeItem('dup', 'thoughts')
      setContinueReading(item)
      setContinueReading({ ...item, title: 'Updated Title' })
      const list = getContinueReadingList()
      expect(list).toHaveLength(1)
      expect(list[0].title).toBe('Updated Title')
    })

    it('puts newest item first', () => {
      setContinueReading(makeItem('old'))
      setContinueReading(makeItem('new'))
      const list = getContinueReadingList()
      expect(list[0].id).toBe('new')
      expect(list[1].id).toBe('old')
    })

    it('caps list at MAX_CONTINUE_READING_ITEMS', () => {
      setContinueReading(makeItem('a'))
      setContinueReading(makeItem('b'))
      setContinueReading(makeItem('c'))
      setContinueReading(makeItem('d'))
      const list = getContinueReadingList()
      expect(list).toHaveLength(MAX_CONTINUE_READING_ITEMS)
      expect(list[0].id).toBe('d')
      expect(list.find((i) => i.id === 'a')).toBeUndefined()
    })

    it('does not remove items from different sections with same id', () => {
      setContinueReading(makeItem('x', 'thoughts'))
      setContinueReading(makeItem('x', 'guides'))
      const list = getContinueReadingList()
      expect(list).toHaveLength(2)
    })
  })

  // --- clearContinueReading ---

  describe('clearContinueReading', () => {
    it('clears all stored items', () => {
      setContinueReading(makeItem('a'))
      const cleared = clearContinueReading()
      expect(cleared).toBe(true)
      expect(getContinueReadingList()).toEqual([])
    })

    it('returns false when nothing to clear', () => {
      const cleared = clearContinueReading()
      expect(cleared).toBe(false)
    })
  })

  // --- onContinueReadingChange ---

  describe('onContinueReadingChange', () => {
    it('returns an unsubscribe function', () => {
      const unsub = onContinueReadingChange(() => {})
      expect(typeof unsub).toBe('function')
      unsub()
    })

    it('notifies on storage change with first item', () => {
      const cb = vi.fn()
      onContinueReadingChange(cb)
      setContinueReading(makeItem('notify-test'))
      expect(cb).toHaveBeenCalled()
    })
  })

  // --- onContinueReadingListChange ---

  describe('onContinueReadingListChange', () => {
    it('returns an unsubscribe function', () => {
      const unsub = onContinueReadingListChange(() => {})
      expect(typeof unsub).toBe('function')
      unsub()
    })

    it('notifies with full list on change', () => {
      const cb = vi.fn()
      onContinueReadingListChange(cb)
      setContinueReading(makeItem('list-test'))
      expect(cb).toHaveBeenCalled()
    })
  })
})
