/**
 * Mood Channels Tests
 *
 * Coverage for mood channel filtering, sorting, and readiness gating.
 */

import { describe, it, expect } from 'vitest'
import {
  getTracksForMoodChannel,
  sortTracksByMoodRelevance,
  getMoodChannelReadiness,
  MOOD_CHANNEL_MIN_CATALOG_TRACKS,
  MOOD_CHANNEL_MIN_TRACKS_PER_CHANNEL,
} from '@/data/moodChannels'
import type { MoodChannel } from '@/data/moodChannels'

type MoodTrack = { id: string; bpm?: number; genres?: string[]; collection: string }

const baseChannel: MoodChannel = {
  id: 'focus',
  name: 'Focus',
  description: 'Focus channel',
  gradient: 'from-indigo-900/60 via-purple-900/50 to-violet-900/40',
  glowColor: 'rgba(139, 92, 246, 0.25)',
  bpmRange: { min: 110, max: 130 },
  preferredGenres: ['Retro Future'],
  preferredCollections: ['majestic-ascent'],
  energyLevel: 5,
}

describe('getTracksForMoodChannel', () => {
  it('returns tracks that match BPM, genre, or collection criteria', () => {
    const tracks: MoodTrack[] = [
      { id: 'bpm-match', bpm: 120, genres: ['Ambient'], collection: 'Other' },
      { id: 'genre-match', bpm: 90, genres: ['Retro Future'], collection: 'Other' },
      { id: 'collection-match', bpm: 90, genres: ['Classical'], collection: 'Majestic Ascent' },
      { id: 'no-match', bpm: 80, genres: ['Jazz'], collection: 'Unknown' },
    ]

    expect(getTracksForMoodChannel(baseChannel, tracks)).toEqual([
      'bpm-match',
      'genre-match',
      'collection-match',
    ])
  })

  it('returns empty array when no tracks match', () => {
    const tracks: MoodTrack[] = [
      { id: 'no-match', bpm: 80, genres: ['Jazz'], collection: 'Unknown' },
    ]
    const channel: MoodChannel = {
      ...baseChannel,
      preferredGenres: ['Neo Soul'],
      preferredCollections: ['nope'],
      bpmRange: { min: 200, max: 210 },
    }

    expect(getTracksForMoodChannel(channel, tracks)).toEqual([])
  })
})

describe('sortTracksByMoodRelevance', () => {
  it('ranks preferred collection tracks above others', () => {
    const tracks: MoodTrack[] = [
      { id: 'preferred', bpm: 120, genres: ['Retro Future'], collection: 'Majestic Ascent' },
      { id: 'mid', bpm: 120, genres: ['Retro Future'], collection: 'Other' },
      { id: 'off', bpm: 110, genres: ['Retro Future'], collection: 'Other' },
    ]

    const sorted = sortTracksByMoodRelevance(
      ['off', 'preferred', 'mid'],
      baseChannel,
      tracks,
    )

    expect(sorted).toEqual(['preferred', 'mid', 'off'])
  })
})

describe('getMoodChannelReadiness', () => {
  it('flags when catalog and channel minimums are unmet', () => {
    const tracks: MoodTrack[] = [
      { id: 'match', bpm: 120, genres: ['Retro Future'], collection: 'Majestic Ascent' },
    ]

    const readiness = getMoodChannelReadiness([baseChannel], tracks)

    expect(readiness.totalTracks).toBe(1)
    expect(readiness.minCatalogTracks).toBe(MOOD_CHANNEL_MIN_CATALOG_TRACKS)
    expect(readiness.minTracksPerChannel).toBe(MOOD_CHANNEL_MIN_TRACKS_PER_CHANNEL)
    expect(readiness.meetsCatalogMinimum).toBe(false)
    expect(readiness.channelsBelowMinimum).toEqual(['focus'])
    expect(readiness.isReady).toBe(false)
  })

  it('returns ready when catalog and channel thresholds are met', () => {
    const minPerChannel = MOOD_CHANNEL_MIN_TRACKS_PER_CHANNEL
    const totalTracks = Math.max(
      MOOD_CHANNEL_MIN_CATALOG_TRACKS,
      minPerChannel * 2,
    )
    const fillerCount = totalTracks - minPerChannel * 2
    const alphaChannel: MoodChannel = {
      ...baseChannel,
      id: 'alpha',
      preferredCollections: ['alpha-set'],
      preferredGenres: undefined,
      bpmRange: undefined,
    }
    const betaChannel: MoodChannel = {
      ...baseChannel,
      id: 'beta',
      preferredCollections: ['beta-set'],
      preferredGenres: undefined,
      bpmRange: undefined,
    }

    const tracks: MoodTrack[] = [
      ...Array.from({ length: minPerChannel }, (_, index) => ({
        id: `alpha-${index + 1}`,
        collection: 'Alpha Set',
      })),
      ...Array.from({ length: minPerChannel }, (_, index) => ({
        id: `beta-${index + 1}`,
        collection: 'Beta Set',
      })),
      ...Array.from({ length: fillerCount }, (_, index) => ({
        id: `other-${index + 1}`,
        collection: 'Other Set',
      })),
    ]

    const readiness = getMoodChannelReadiness([alphaChannel, betaChannel], tracks)

    expect(readiness.totalTracks).toBe(totalTracks)
    expect(readiness.meetsCatalogMinimum).toBe(true)
    expect(readiness.channelsBelowMinimum).toEqual([])
    expect(readiness.channelCounts.alpha).toBe(minPerChannel)
    expect(readiness.channelCounts.beta).toBe(minPerChannel)
    expect(readiness.isReady).toBe(true)
  })
})
