/**
 * Analytics utility tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calculatePercentagePlayed,
  getDeviceType,
  isReturningVisitor,
  trackBatch,
  trackEvent,
  trackPageView,
  trackTrackPlayed,
} from '@/lib/analytics'

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

const storageMocks = vi.hoisted(() => ({
  getRawValue: vi.fn(),
  setRawValue: vi.fn(),
}))

vi.mock('@/lib/storage/persistence', () => ({
  isStorageAvailable: vi.fn(() => true),
  STORAGE_KEYS: { VISITED: 'visited' },
  getRawValue: storageMocks.getRawValue,
  setRawValue: storageMocks.setRawValue,
}))

const originalEnv = process.env

describe('analytics', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    storageMocks.getRawValue.mockReset()
    storageMocks.setRawValue.mockReset()
    window.plausible = vi.fn()
  })

  it('tracks events when plausible is available', () => {
    trackEvent('track_played', { track_id: 'track-1' })
    expect(window.plausible).toHaveBeenCalledWith('track_played', {
      props: { track_id: 'track-1' },
    })
  })

  it('tracks page views with optional url', () => {
    trackPageView('/test')
    expect(window.plausible).toHaveBeenCalledWith('pageview', {
      props: { url: '/test' },
    })
  })

  it('tracks playback helpers through trackEvent', () => {
    trackTrackPlayed({
      trackId: 'track-2',
      trackTitle: 'Test Track',
      collection: 'Test Collection',
      source: 'collection',
      position: 1,
    })

    expect(window.plausible).toHaveBeenCalledWith('track_played', expect.any(Object))
  })

  it('tracks batched events', () => {
    trackBatch([
      { name: 'event_one' },
      { name: 'event_two', props: { value: 2 } },
    ])

    expect(window.plausible).toHaveBeenCalledTimes(2)
  })

  it('detects device type from user agent', () => {
    const originalUA = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      configurable: true,
    })

    expect(getDeviceType()).toBe('mobile')

    Object.defineProperty(navigator, 'userAgent', {
      value: originalUA,
      configurable: true,
    })
  })

  it('tracks returning visitor flag', () => {
    storageMocks.getRawValue.mockReturnValueOnce(null)
    expect(isReturningVisitor()).toBe(false)
    expect(storageMocks.setRawValue).toHaveBeenCalledWith('visited', 'true')

    storageMocks.getRawValue.mockReturnValueOnce('true')
    expect(isReturningVisitor()).toBe(true)
  })

  it('calculates percentage played safely', () => {
    expect(calculatePercentagePlayed(0, 0)).toBe(0)
    expect(calculatePercentagePlayed(30, 120)).toBe(25)
  })
})
