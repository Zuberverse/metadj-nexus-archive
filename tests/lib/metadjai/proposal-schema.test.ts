/**
 * MetaDJai Proposal Schema Tests
 *
 * Tests Zod validation and parsing for MetaDJai tool proposals.
 */

import { describe, expect, it } from 'vitest'
import { parseProposal } from '@/lib/metadjai/proposal-schema'

describe('parseProposal', () => {
  describe('playback proposals', () => {
    it('parses valid playback proposal', () => {
      const result = parseProposal({
        type: 'playback',
        action: 'play',
        trackId: 'track-1',
        trackTitle: 'Test Track',
        trackArtist: 'Test Artist',
        context: 'User requested a track',
      })

      expect(result).toMatchObject({
        type: 'playback',
        action: 'play',
        trackId: 'track-1',
        approvalRequired: true,
      })
    })

    it('defaults approvalRequired to true', () => {
      const result = parseProposal({
        type: 'playback',
        action: 'next',
      })

      expect(result?.approvalRequired).toBe(true)
    })

    it('returns null when approvalRequired is false', () => {
      const result = parseProposal({
        type: 'playback',
        action: 'pause',
        approvalRequired: false,
      })

      expect(result).toBeNull()
    })

    it('supports all playback actions', () => {
      const actions = ['play', 'pause', 'next', 'prev', 'queue'] as const
      for (const action of actions) {
        const result = parseProposal({ type: 'playback', action })
        expect(result).not.toBeNull()
        expect(result?.action).toBe(action)
      }
    })

    it('rejects invalid playback action', () => {
      const result = parseProposal({
        type: 'playback',
        action: 'invalid-action',
      })

      expect(result).toBeNull()
    })
  })

  describe('ui proposals', () => {
    it('parses valid UI proposal', () => {
      const result = parseProposal({
        type: 'ui',
        action: 'openWisdom',
        context: 'Navigating to wisdom',
      })

      expect(result).toMatchObject({
        type: 'ui',
        action: 'openWisdom',
        approvalRequired: true,
      })
    })

    it('supports all UI actions', () => {
      const actions = ['openWisdom', 'openQueue', 'focusSearch', 'openMusicPanel'] as const
      for (const action of actions) {
        const result = parseProposal({ type: 'ui', action })
        expect(result).not.toBeNull()
      }
    })

    it('accepts optional tab parameter', () => {
      const result = parseProposal({
        type: 'ui',
        action: 'openMusicPanel',
        tab: 'queue',
      })

      expect(result).toMatchObject({
        type: 'ui',
        action: 'openMusicPanel',
      })
    })
  })

  describe('queue-set proposals', () => {
    it('parses valid queue-set proposal', () => {
      const result = parseProposal({
        type: 'queue-set',
        action: 'set',
        trackIds: ['t1', 't2', 't3'],
        trackTitles: ['Track 1', 'Track 2', 'Track 3'],
        mode: 'replace',
        autoplay: true,
        context: 'Setting up a curated queue',
      })

      expect(result).toMatchObject({
        type: 'queue-set',
        action: 'set',
        trackIds: ['t1', 't2', 't3'],
        approvalRequired: true,
      })
    })

    it('accepts append mode', () => {
      const result = parseProposal({
        type: 'queue-set',
        action: 'set',
        trackIds: ['t1'],
        mode: 'append',
      })

      expect(result).not.toBeNull()
    })
  })

  describe('playlist proposals', () => {
    it('parses valid playlist creation proposal', () => {
      const result = parseProposal({
        type: 'playlist',
        action: 'create',
        name: 'My Playlist',
        trackIds: ['t1', 't2'],
        trackTitles: ['Track 1', 'Track 2'],
        queueMode: 'replace',
        autoplay: true,
        context: 'Creating a themed playlist',
      })

      expect(result).toMatchObject({
        type: 'playlist',
        action: 'create',
        name: 'My Playlist',
        approvalRequired: true,
      })
    })

    it('requires name for playlist', () => {
      const result = parseProposal({
        type: 'playlist',
        action: 'create',
      })

      expect(result).toBeNull()
    })

    it('accepts all queueMode values', () => {
      for (const queueMode of ['replace', 'append', 'none']) {
        const result = parseProposal({
          type: 'playlist',
          action: 'create',
          name: 'Test',
          queueMode,
        })
        expect(result).not.toBeNull()
      }
    })
  })

  describe('invalid inputs', () => {
    it('returns null for null input', () => {
      expect(parseProposal(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(parseProposal(undefined)).toBeNull()
    })

    it('returns null for empty object', () => {
      expect(parseProposal({})).toBeNull()
    })

    it('returns null for unknown type', () => {
      expect(parseProposal({ type: 'unknown', action: 'test' })).toBeNull()
    })

    it('returns null for string input', () => {
      expect(parseProposal('not an object')).toBeNull()
    })

    it('returns null for number input', () => {
      expect(parseProposal(42)).toBeNull()
    })
  })
})
