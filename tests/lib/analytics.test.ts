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
  trackTrackSkipped,
  trackTrackCompleted,
  trackPlaybackControl,
  trackRepeatModeChanged,
  trackShuffleToggled,
  trackResumeQueue,
  trackSearchPerformed,
  trackSearchZeroResults,
  trackSearchEmpty,
  trackSearchPlayFromHere,
  trackCinemaOpened,
  trackCinemaClosed,
  trackCinemaToggled,
  trackDreamToggled,
  trackSceneChanged,
  trackGuideOpened,
  trackJournalEntryCreated,
  trackJournalEntryUpdated,
  trackJournalEntryDeleted,
  trackTrackInfoOpened,
  trackTrackInfoClosed,
  trackTrackShared,
  trackTrackInfoIconClicked,
  trackAddToQueueClicked,
  trackCollectionViewed,
  trackCollectionBrowsed,
  trackTrackCardClicked,
  trackSessionStarted,
  trackQueueAction,
  trackQueueRestored,
  trackQueueExpired,
  trackError,
  trackActivationFirstPlay,
  trackActivationFirstChat,
  trackActivationFirstGuide,
  trackActivationFirstPlaylist,
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

const fetchMock = vi.fn()

vi.mock('@/lib/storage/persistence', () => ({
  isStorageAvailable: vi.fn(() => true),
  STORAGE_KEYS: {
    VISITED: 'visited',
    ACTIVATION_FIRST_PLAY: 'metadj_activation_first_play',
    ACTIVATION_FIRST_CHAT: 'metadj_activation_first_chat',
    ACTIVATION_FIRST_GUIDE: 'metadj_activation_first_guide',
    ACTIVATION_FIRST_PLAYLIST: 'metadj_activation_first_playlist',
  },
  getRawValue: storageMocks.getRawValue,
  setRawValue: storageMocks.setRawValue,
}))

const originalEnv = process.env

describe('analytics', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_ANALYTICS_DB_ENABLED = 'false'
    storageMocks.getRawValue.mockReset()
    storageMocks.setRawValue.mockReset()
    window.plausible = vi.fn()
    fetchMock.mockResolvedValue({ ok: true })
    global.fetch = fetchMock as typeof fetch
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

  it('sends events to the analytics endpoint when enabled', () => {
    process.env.NEXT_PUBLIC_ANALYTICS_DB_ENABLED = 'true'

    trackEvent('track_played', { track_id: 'track-1' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/event',
      expect.objectContaining({
        method: 'POST',
      })
    )
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

  describe('playback event helpers', () => {
    it('tracks track skipped', () => {
      trackTrackSkipped({
        trackId: 't1',
        trackTitle: 'Track',
        playedSeconds: 30,
        totalDuration: 120,
        percentagePlayed: 25,
      })
      expect(window.plausible).toHaveBeenCalledWith('track_skipped', expect.any(Object))
    })

    it('tracks track completed', () => {
      trackTrackCompleted({
        trackId: 't1',
        trackTitle: 'Track',
        duration: 120,
        listenedToEnd: true,
      })
      expect(window.plausible).toHaveBeenCalledWith('track_completed', expect.any(Object))
    })

    it('tracks playback control', () => {
      trackPlaybackControl({ action: 'play', trackId: 't1' })
      expect(window.plausible).toHaveBeenCalledWith('playback_control', expect.any(Object))
    })

    it('tracks repeat mode changed', () => {
      trackRepeatModeChanged('track')
      expect(window.plausible).toHaveBeenCalledWith('repeat_mode_changed', { props: { mode: 'track' } })
    })

    it('tracks shuffle toggled', () => {
      trackShuffleToggled(true)
      expect(window.plausible).toHaveBeenCalledWith('shuffle_toggled', { props: { enabled: true } })
    })

    it('tracks resume queue', () => {
      trackResumeQueue()
      expect(window.plausible).toHaveBeenCalledWith('resume_queue', { props: undefined })
    })
  })

  describe('search event helpers', () => {
    it('tracks search performed', () => {
      trackSearchPerformed({ query: 'test', resultsCount: 5, hasResults: true })
      expect(window.plausible).toHaveBeenCalledWith('search_performed', expect.any(Object))
    })

    it('tracks search zero results', () => {
      trackSearchZeroResults({ query: 'nothing' })
      expect(window.plausible).toHaveBeenCalledWith('search_zero_results', expect.any(Object))
    })

    it('tracks search empty', () => {
      trackSearchEmpty(3)
      expect(window.plausible).toHaveBeenCalledWith('search_empty', { props: { query_length: 3 } })
    })

    it('tracks search play from here', () => {
      trackSearchPlayFromHere('t1', 5)
      expect(window.plausible).toHaveBeenCalledWith('search_play_from_here', expect.any(Object))
    })
  })

  describe('cinema event helpers', () => {
    it('tracks cinema opened', () => {
      trackCinemaOpened({ trackId: 't1', fromSource: 'player' })
      expect(window.plausible).toHaveBeenCalledWith('cinema_opened', expect.any(Object))
    })

    it('tracks cinema closed', () => {
      trackCinemaClosed({ trackId: 't1', durationSeconds: 60, completed: false })
      expect(window.plausible).toHaveBeenCalledWith('cinema_closed', expect.any(Object))
    })

    it('tracks cinema toggled', () => {
      trackCinemaToggled(true)
      expect(window.plausible).toHaveBeenCalledWith('cinema_toggle', { props: { enabled: true } })
    })

    it('tracks dream toggled', () => {
      trackDreamToggled(false)
      expect(window.plausible).toHaveBeenCalledWith('dream_toggle', { props: { enabled: false } })
    })

    it('tracks scene changed', () => {
      trackSceneChanged('cosmos')
      expect(window.plausible).toHaveBeenCalledWith('cinema_scene_changed', { props: { scene_id: 'cosmos' } })
    })
  })

  describe('wisdom & journal event helpers', () => {
    it('tracks guide opened', () => {
      trackGuideOpened({ guideId: 'g1', category: 'wisdom' })
      expect(window.plausible).toHaveBeenCalledWith('guide_opened', expect.any(Object))
    })

    it('tracks journal entry created', () => {
      trackJournalEntryCreated({ titleLength: 10, contentLength: 100, wordCount: 20, hasTitle: true })
      expect(window.plausible).toHaveBeenCalledWith('journal_entry_created', expect.any(Object))
    })

    it('tracks journal entry updated', () => {
      trackJournalEntryUpdated({ titleLength: 10, contentLength: 100, wordCount: 20, hasTitle: true })
      expect(window.plausible).toHaveBeenCalledWith('journal_entry_updated', expect.any(Object))
    })

    it('tracks journal entry deleted', () => {
      trackJournalEntryDeleted({ titleLength: 10, contentLength: 100, wordCount: 20, hasTitle: true, entryAgeDays: 5 })
      expect(window.plausible).toHaveBeenCalledWith('journal_entry_deleted', expect.any(Object))
    })
  })

  describe('track info event helpers', () => {
    it('tracks track info opened', () => {
      trackTrackInfoOpened({ trackId: 't1', trackTitle: 'Track', collection: 'Col', source: 'featured' })
      expect(window.plausible).toHaveBeenCalledWith('track_info_opened', expect.any(Object))
    })

    it('tracks track info closed', () => {
      trackTrackInfoClosed({ trackId: 't1', trackTitle: 'Track', collection: 'Col', timeSpentMs: 5000 })
      expect(window.plausible).toHaveBeenCalledWith('track_info_closed', expect.any(Object))
    })

    it('tracks track shared', () => {
      trackTrackShared({ trackId: 't1', trackTitle: 'Track', collection: 'Col', shareMethod: 'clipboard' })
      expect(window.plausible).toHaveBeenCalledWith('track_shared', expect.any(Object))
    })

    it('tracks track info icon clicked', () => {
      trackTrackInfoIconClicked({ trackId: 't1', trackTitle: 'Track', collection: 'Col', triggerSource: 'collection' })
      expect(window.plausible).toHaveBeenCalledWith('track_info_icon_clicked', expect.any(Object))
    })

    it('tracks add to queue clicked', () => {
      trackAddToQueueClicked({ trackId: 't1', trackTitle: 'Track', collection: 'Col', queuePositionAfterAdd: 3 })
      expect(window.plausible).toHaveBeenCalledWith('add_to_queue_clicked', expect.any(Object))
    })
  })

  describe('collection event helpers', () => {
    it('tracks collection viewed', () => {
      trackCollectionViewed({ collectionId: 'c1', collectionTitle: 'Col', trackCount: 10 })
      expect(window.plausible).toHaveBeenCalledWith('collection_viewed', expect.any(Object))
    })

    it('tracks collection browsed', () => {
      trackCollectionBrowsed({ collectionId: 'c1', collectionTitle: 'Col', scrollDepth: 50 })
      expect(window.plausible).toHaveBeenCalledWith('collection_browsed', expect.any(Object))
    })

    it('tracks track card clicked', () => {
      trackTrackCardClicked({ trackId: 't1', trackTitle: 'Track', collection: 'Col', position: 0, action: 'play' })
      expect(window.plausible).toHaveBeenCalledWith('track_card_clicked', expect.any(Object))
    })
  })

  describe('engagement event helpers', () => {
    it('tracks session started', () => {
      trackSessionStarted({ isReturningVisitor: true, deviceType: 'desktop' })
      expect(window.plausible).toHaveBeenCalledWith('session_started', expect.any(Object))
    })

    it('tracks queue action', () => {
      trackQueueAction({ action: 'add', trackId: 't1', queueSize: 5 })
      expect(window.plausible).toHaveBeenCalledWith('queue_action', expect.any(Object))
    })

    it('tracks queue restored', () => {
      trackQueueRestored({ queueSize: 3, ageMinutes: 10, context: 'collection' })
      expect(window.plausible).toHaveBeenCalledWith('queue_restored', expect.any(Object))
    })

    it('tracks queue expired', () => {
      trackQueueExpired({ reason: 'time_expired' })
      expect(window.plausible).toHaveBeenCalledWith('queue_expired', expect.any(Object))
    })
  })

  describe('error event helpers', () => {
    it('tracks error with truncation', () => {
      trackError({ message: 'A'.repeat(200), digest: 'abc', source: 'player' })
      expect(window.plausible).toHaveBeenCalledWith('error_occurred', expect.any(Object))
    })
  })

  describe('activation event helpers', () => {
    it('tracks first play activation', () => {
      storageMocks.getRawValue.mockReturnValue(null)
      trackActivationFirstPlay({ trackId: 't1', collection: 'col1' })
      expect(window.plausible).toHaveBeenCalledWith('activation_first_play', expect.any(Object))
    })

    it('tracks first chat activation', () => {
      storageMocks.getRawValue.mockReturnValue(null)
      trackActivationFirstChat()
      expect(window.plausible).toHaveBeenCalledWith('activation_first_chat', expect.any(Object))
    })

    it('tracks first guide activation', () => {
      storageMocks.getRawValue.mockReturnValue(null)
      trackActivationFirstGuide({ guideId: 'g1', category: 'wisdom' })
      expect(window.plausible).toHaveBeenCalledWith('activation_first_guide', expect.any(Object))
    })

    it('tracks first playlist activation', () => {
      storageMocks.getRawValue.mockReturnValue(null)
      trackActivationFirstPlaylist({ source: 'navigation' })
      expect(window.plausible).toHaveBeenCalledWith('activation_first_playlist', expect.any(Object))
    })
  })

  describe('device type detection', () => {
    it('detects tablet from user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
        configurable: true,
      })
      expect(getDeviceType()).toBe('tablet')
    })

    it('defaults to desktop', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true,
      })
      expect(getDeviceType()).toBe('desktop')
    })
  })
})
