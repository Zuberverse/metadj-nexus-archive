/**
 * Persistence Layer Tests
 *
 * Tests the unified localStorage persistence layer including typed getters/setters,
 * migrations, bulk operations, and cross-tab storage event listening.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  STORAGE_KEYS,
  isStorageAvailable,
  getRawValue,
  setRawValue,
  removeValue,
  getValue,
  setValue,
  getString,
  setString,
  getNumber,
  setNumber,
  getBoolean,
  setBoolean,
  runMigrations,
  clearAllStorage,
  clearSessionStorage,
  exportStorageData,
  onStorageChange,
} from '@/lib/storage/persistence'

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('STORAGE_KEYS', () => {
    it('exports VOLUME key', () => {
      expect(STORAGE_KEYS.VOLUME).toBe('metadj-volume')
    })

    it('exports SCHEMA_VERSION key', () => {
      expect(STORAGE_KEYS.SCHEMA_VERSION).toBe('metadj_schema_version')
    })

    it('exports QUEUE key', () => {
      expect(STORAGE_KEYS.QUEUE).toBe('metadj-queue')
    })
  })

  describe('isStorageAvailable', () => {
    it('returns true in jsdom environment', () => {
      expect(isStorageAvailable()).toBe(true)
    })
  })

  describe('getRawValue / setRawValue', () => {
    it('returns null for missing key', () => {
      expect(getRawValue(STORAGE_KEYS.VOLUME)).toBeNull()
    })

    it('sets and gets a raw string value', () => {
      setRawValue(STORAGE_KEYS.VOLUME, '0.5')
      expect(getRawValue(STORAGE_KEYS.VOLUME)).toBe('0.5')
    })

    it('setRawValue returns true on success', () => {
      expect(setRawValue(STORAGE_KEYS.VOLUME, '1')).toBe(true)
    })
  })

  describe('removeValue', () => {
    it('removes a stored value', () => {
      setRawValue(STORAGE_KEYS.VOLUME, '0.8')
      expect(removeValue(STORAGE_KEYS.VOLUME)).toBe(true)
      expect(getRawValue(STORAGE_KEYS.VOLUME)).toBeNull()
    })
  })

  describe('getValue / setValue', () => {
    it('returns fallback when key not found', () => {
      expect(getValue(STORAGE_KEYS.QUEUE, [])).toEqual([])
    })

    it('returns fallback for non-parseable JSON', () => {
      setRawValue(STORAGE_KEYS.VOLUME, 'not-json')
      expect(getValue(STORAGE_KEYS.VOLUME, 1.0)).toBe(1.0)
    })

    it('returns raw string when fallback is string type and parse fails', () => {
      setRawValue(STORAGE_KEYS.ACTIVE_VIEW, 'hub')
      expect(getValue(STORAGE_KEYS.ACTIVE_VIEW, 'default')).toBe('hub')
    })

    it('saves and loads JSON values', () => {
      const data = { test: true, count: 42 }
      setValue(STORAGE_KEYS.QUEUE, data)
      expect(getValue(STORAGE_KEYS.QUEUE, {})).toEqual(data)
    })

    it('saves and loads array values', () => {
      const arr = [1, 2, 3]
      setValue(STORAGE_KEYS.QUEUE, arr)
      expect(getValue(STORAGE_KEYS.QUEUE, [])).toEqual(arr)
    })

    it('setValue returns true on success', () => {
      expect(setValue(STORAGE_KEYS.VOLUME, 0.5)).toBe(true)
    })
  })

  describe('getString / setString', () => {
    it('returns fallback when key not found', () => {
      expect(getString(STORAGE_KEYS.ACTIVE_VIEW, 'hub')).toBe('hub')
    })

    it('sets and gets string value', () => {
      setString(STORAGE_KEYS.ACTIVE_VIEW, 'cinema')
      expect(getString(STORAGE_KEYS.ACTIVE_VIEW, 'hub')).toBe('cinema')
    })
  })

  describe('getNumber / setNumber', () => {
    it('returns fallback when key not found', () => {
      expect(getNumber(STORAGE_KEYS.VOLUME, 1.0)).toBe(1.0)
    })

    it('sets and gets number value', () => {
      setNumber(STORAGE_KEYS.VOLUME, 0.75)
      expect(getNumber(STORAGE_KEYS.VOLUME, 1.0)).toBe(0.75)
    })

    it('returns fallback for non-numeric value', () => {
      setRawValue(STORAGE_KEYS.VOLUME, 'not-a-number')
      expect(getNumber(STORAGE_KEYS.VOLUME, 1.0)).toBe(1.0)
    })

    it('returns fallback for Infinity', () => {
      setRawValue(STORAGE_KEYS.VOLUME, 'Infinity')
      expect(getNumber(STORAGE_KEYS.VOLUME, 1.0)).toBe(1.0)
    })

    it('returns fallback for NaN', () => {
      setRawValue(STORAGE_KEYS.VOLUME, 'NaN')
      expect(getNumber(STORAGE_KEYS.VOLUME, 1.0)).toBe(1.0)
    })
  })

  describe('getBoolean / setBoolean', () => {
    it('returns fallback when key not found', () => {
      expect(getBoolean(STORAGE_KEYS.MUTED, false)).toBe(false)
    })

    it('sets and gets boolean true', () => {
      setBoolean(STORAGE_KEYS.MUTED, true)
      expect(getBoolean(STORAGE_KEYS.MUTED, false)).toBe(true)
    })

    it('sets and gets boolean false', () => {
      setBoolean(STORAGE_KEYS.MUTED, false)
      expect(getBoolean(STORAGE_KEYS.MUTED, true)).toBe(false)
    })

    it('treats "true" string as true', () => {
      setRawValue(STORAGE_KEYS.MUTED, 'true')
      expect(getBoolean(STORAGE_KEYS.MUTED, false)).toBe(true)
    })

    it('treats non-"true" string as false', () => {
      setRawValue(STORAGE_KEYS.MUTED, 'yes')
      expect(getBoolean(STORAGE_KEYS.MUTED, true)).toBe(false)
    })
  })

  describe('runMigrations', () => {
    it('sets schema version to current version', () => {
      runMigrations()
      expect(getNumber(STORAGE_KEYS.SCHEMA_VERSION, 0)).toBeGreaterThanOrEqual(3)
    })

    it('does nothing when schema version is current', () => {
      // First run sets to current version
      runMigrations()
      const version = getNumber(STORAGE_KEYS.SCHEMA_VERSION, 0)

      // Second run should be a no-op
      runMigrations()
      expect(getNumber(STORAGE_KEYS.SCHEMA_VERSION, 0)).toBe(version)
    })

    it('cleans up legacy welcome keys on migration to v3', () => {
      localStorage.setItem('metadj-nexus-welcome-shown', 'true')
      localStorage.setItem('metadj-nexus-welcome-dismissed', 'true')
      sessionStorage.setItem('metadj_welcome_shown_session', 'true')

      runMigrations()

      expect(localStorage.getItem('metadj-nexus-welcome-shown')).toBeNull()
      expect(localStorage.getItem('metadj-nexus-welcome-dismissed')).toBeNull()
      expect(sessionStorage.getItem('metadj_welcome_shown_session')).toBeNull()
    })
  })

  describe('clearAllStorage', () => {
    it('removes all MetaDJ storage keys', () => {
      setRawValue(STORAGE_KEYS.VOLUME, '0.5')
      setRawValue(STORAGE_KEYS.MUTED, 'false')
      setRawValue(STORAGE_KEYS.ACTIVE_VIEW, 'hub')

      expect(clearAllStorage()).toBe(true)
      expect(getRawValue(STORAGE_KEYS.VOLUME)).toBeNull()
      expect(getRawValue(STORAGE_KEYS.MUTED)).toBeNull()
      expect(getRawValue(STORAGE_KEYS.ACTIVE_VIEW)).toBeNull()
    })
  })

  describe('clearSessionStorage', () => {
    it('clears session-specific keys', () => {
      setRawValue(STORAGE_KEYS.QUEUE, '[]')
      setRawValue(STORAGE_KEYS.RECENTLY_PLAYED, '[]')
      setRawValue(STORAGE_KEYS.METADJAI_SESSION, 'session-1')

      expect(clearSessionStorage()).toBe(true)

      expect(getRawValue(STORAGE_KEYS.QUEUE)).toBeNull()
      expect(getRawValue(STORAGE_KEYS.RECENTLY_PLAYED)).toBeNull()
      expect(getRawValue(STORAGE_KEYS.METADJAI_SESSION)).toBeNull()
    })

    it('preserves device preferences', () => {
      setRawValue(STORAGE_KEYS.VOLUME, '0.5')
      setRawValue(STORAGE_KEYS.CINEMA_SCENE, 'cosmos')

      clearSessionStorage()

      // Volume and cinema scene are device preferences, should be preserved
      expect(getRawValue(STORAGE_KEYS.VOLUME)).toBe('0.5')
      expect(getRawValue(STORAGE_KEYS.CINEMA_SCENE)).toBe('cosmos')
    })
  })

  describe('exportStorageData', () => {
    it('exports stored data as object', () => {
      setValue(STORAGE_KEYS.VOLUME, 0.5)
      setRawValue(STORAGE_KEYS.MUTED, 'true')

      const data = exportStorageData()
      expect(data.VOLUME).toBe(0.5)
      expect(data.MUTED).toBe(true) // JSON.parse('true') = boolean true
    })

    it('returns empty object when nothing stored', () => {
      const data = exportStorageData()
      expect(Object.keys(data).length).toBe(0)
    })

    it('handles JSON values correctly', () => {
      setValue(STORAGE_KEYS.QUEUE, [1, 2, 3])
      const data = exportStorageData()
      expect(data.QUEUE).toEqual([1, 2, 3])
    })

    it('handles non-JSON raw strings', () => {
      setRawValue(STORAGE_KEYS.ACTIVE_VIEW, 'hub')
      const data = exportStorageData()
      expect(data.ACTIVE_VIEW).toBe('hub')
    })
  })

  describe('onStorageChange', () => {
    it('returns an unsubscribe function', () => {
      const unsubscribe = onStorageChange(() => {})
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })

    it('calls back when storage event fires for MetaDJ key', () => {
      const callback = vi.fn()
      const unsubscribe = onStorageChange(callback)

      // Simulate a storage event
      const event = new StorageEvent('storage', {
        key: STORAGE_KEYS.VOLUME,
        newValue: '0.8',
      })
      window.dispatchEvent(event)

      expect(callback).toHaveBeenCalledWith(STORAGE_KEYS.VOLUME, '0.8')
      unsubscribe()
    })

    it('does not call back for non-MetaDJ keys', () => {
      const callback = vi.fn()
      const unsubscribe = onStorageChange(callback)

      const event = new StorageEvent('storage', {
        key: 'some-other-key',
        newValue: 'value',
      })
      window.dispatchEvent(event)

      expect(callback).not.toHaveBeenCalled()
      unsubscribe()
    })

    it('removes listener on unsubscribe', () => {
      const callback = vi.fn()
      const unsubscribe = onStorageChange(callback)
      unsubscribe()

      const event = new StorageEvent('storage', {
        key: STORAGE_KEYS.VOLUME,
        newValue: '0.5',
      })
      window.dispatchEvent(event)

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
