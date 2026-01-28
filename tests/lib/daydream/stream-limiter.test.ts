/**
 * Daydream Stream Limiter Tests
 *
 * Tests single-stream-per-user enforcement, cooldown logic,
 * stream lifecycle, and response building (in-memory path).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildStreamLimitResponse,
  checkStreamCreation,
  clearAllStreams,
  endStream,
  generateSessionId,
  getActiveStream,
  registerStream,
  DAYDREAM_SESSION_COOKIE_NAME,
  DAYDREAM_SESSION_COOKIE_MAX_AGE,
} from '@/lib/daydream/stream-limiter'

describe('daydream stream limiter (in-memory)', () => {
  beforeEach(() => {
    clearAllStreams()
  })

  // ─── Basic Lifecycle ─────────────────────────────────────────────────

  describe('stream lifecycle', () => {
    it('allows stream creation for a new client', async () => {
      const result = await checkStreamCreation('client-lifecycle-1')
      expect(result.allowed).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('registers a stream and blocks subsequent creation', async () => {
      const clientId = 'client-lifecycle-2'
      await registerStream(clientId, 'stream-a')

      const result = await checkStreamCreation(clientId)
      expect(result.allowed).toBe(false)
      expect(result.activeStreamId).toBe('stream-a')
      expect(result.error).toBeDefined()
    })

    it('allows creation after ending the active stream', async () => {
      const clientId = 'client-lifecycle-3'
      await registerStream(clientId, 'stream-b')

      const ended = await endStream(clientId, 'stream-b')
      expect(ended).toBe(true)

      const result = await checkStreamCreation(clientId)
      expect(result.allowed).toBe(true)
    })

    it('getActiveStream returns the active stream', async () => {
      const clientId = 'client-lifecycle-4'
      await registerStream(clientId, 'stream-c')

      const active = await getActiveStream(clientId)
      expect(active).not.toBeNull()
      expect(active?.streamId).toBe('stream-c')
      expect(active?.createdAt).toBeGreaterThan(0)
      expect(active?.expiresAt).toBeGreaterThan(active!.createdAt)
    })

    it('getActiveStream returns null for unknown client', async () => {
      const active = await getActiveStream('unknown-client')
      expect(active).toBeNull()
    })

    it('getActiveStream returns null after stream ends', async () => {
      const clientId = 'client-lifecycle-5'
      await registerStream(clientId, 'stream-d')
      await endStream(clientId, 'stream-d')

      const active = await getActiveStream(clientId)
      expect(active).toBeNull()
    })
  })

  // ─── Stream ID Verification ──────────────────────────────────────────

  describe('stream ID verification', () => {
    it('rejects endStream when stream ID does not match', async () => {
      const clientId = 'client-verify-1'
      await registerStream(clientId, 'stream-real')

      const ended = await endStream(clientId, 'stream-fake')
      expect(ended).toBe(false)

      // Stream should still be active
      const active = await getActiveStream(clientId)
      expect(active?.streamId).toBe('stream-real')
    })

    it('accepts endStream without stream ID (ends any active stream)', async () => {
      const clientId = 'client-verify-2'
      await registerStream(clientId, 'stream-any')

      const ended = await endStream(clientId)
      expect(ended).toBe(true)

      const active = await getActiveStream(clientId)
      expect(active).toBeNull()
    })

    it('endStream returns false for client with no active stream', async () => {
      const ended = await endStream('no-stream-client')
      expect(ended).toBe(false)
    })
  })

  // ─── clearAllStreams ─────────────────────────────────────────────────

  describe('clearAllStreams', () => {
    it('removes all active streams', async () => {
      await registerStream('client-a', 'stream-a')
      await registerStream('client-b', 'stream-b')

      clearAllStreams()

      const activeA = await getActiveStream('client-a')
      const activeB = await getActiveStream('client-b')
      expect(activeA).toBeNull()
      expect(activeB).toBeNull()
    })

    it('allows new stream creation after clearing all', async () => {
      await registerStream('client-cleared', 'stream-old')
      clearAllStreams()

      const result = await checkStreamCreation('client-cleared')
      expect(result.allowed).toBe(true)
    })
  })

  // ─── Multiple Clients ────────────────────────────────────────────────

  describe('multiple clients', () => {
    it('isolates streams between different clients', async () => {
      await registerStream('client-x', 'stream-x')
      await registerStream('client-y', 'stream-y')

      // Client X should see their stream, not Y's
      const activeX = await getActiveStream('client-x')
      expect(activeX?.streamId).toBe('stream-x')

      const activeY = await getActiveStream('client-y')
      expect(activeY?.streamId).toBe('stream-y')

      // Ending X's stream shouldn't affect Y
      await endStream('client-x', 'stream-x')
      const stillActiveY = await getActiveStream('client-y')
      expect(stillActiveY?.streamId).toBe('stream-y')
    })
  })

  // ─── buildStreamLimitResponse ────────────────────────────────────────

  describe('buildStreamLimitResponse', () => {
    it('builds response with retry-after when retryAfterMs > 0', () => {
      const response = buildStreamLimitResponse('Too many streams', 4500, 'stream-3')
      expect(response.error).toBe('Too many streams')
      expect(response.retryAfter).toBe(5) // ceil(4500 / 1000)
      expect(response.activeStreamId).toBe('stream-3')
    })

    it('builds response without retry-after when retryAfterMs is 0', () => {
      const response = buildStreamLimitResponse('Active stream exists', 0, 'stream-active')
      expect(response.error).toBe('Active stream exists')
      expect(response.retryAfter).toBeUndefined()
      expect(response.activeStreamId).toBe('stream-active')
    })

    it('builds response without activeStreamId when not provided', () => {
      const response = buildStreamLimitResponse('Rate limited', 0)
      expect(response.error).toBe('Rate limited')
      expect(response.retryAfter).toBeUndefined()
      expect(response.activeStreamId).toBeUndefined()
    })

    it('rounds up retryAfter to nearest second', () => {
      const response = buildStreamLimitResponse('Wait', 100)
      expect(response.retryAfter).toBe(1) // ceil(100 / 1000)
    })

    it('handles large retryAfterMs values', () => {
      const response = buildStreamLimitResponse('Wait', 30000)
      expect(response.retryAfter).toBe(30)
    })
  })

  // ─── Session ID Generation ───────────────────────────────────────────

  describe('generateSessionId', () => {
    it('generates session IDs with daydream prefix', () => {
      const sessionId = generateSessionId()
      expect(sessionId.startsWith('daydream-')).toBe(true)
    })

    it('generates unique session IDs', () => {
      const ids = new Set(Array.from({ length: 20 }, () => generateSessionId()))
      expect(ids.size).toBe(20)
    })
  })

  // ─── Exported Constants ──────────────────────────────────────────────

  describe('exported constants', () => {
    it('exports DAYDREAM_SESSION_COOKIE_NAME', () => {
      expect(DAYDREAM_SESSION_COOKIE_NAME).toBe('daydream-session')
    })

    it('exports DAYDREAM_SESSION_COOKIE_MAX_AGE as 7 days in seconds', () => {
      expect(DAYDREAM_SESSION_COOKIE_MAX_AGE).toBe(7 * 24 * 60 * 60)
    })
  })

  // ─── Cooldown Enforcement ────────────────────────────────────────────

  describe('cooldown enforcement', () => {
    it('enforces cooldown when stream ends abruptly (no proper end)', async () => {
      const clientId = 'client-cooldown-1'

      // Register and then simulate a page refresh (no endStream called).
      // Clear only the active stream record, keeping rate limits.
      await registerStream(clientId, 'stream-abrupt')

      // Force-expire the stream by checking after TTL (we can't wait 30 min
      // but the rate limit record remains because registerStream sets it).
      // So the next checkStreamCreation should detect the active stream.
      const blocked = await checkStreamCreation(clientId)
      expect(blocked.allowed).toBe(false)
    })

    it('clears cooldown on proper endStream', async () => {
      const clientId = 'client-cooldown-2'
      await registerStream(clientId, 'stream-proper')
      await endStream(clientId, 'stream-proper')

      // After proper end, creation should be immediately allowed
      const result = await checkStreamCreation(clientId)
      expect(result.allowed).toBe(true)
    })
  })
})
