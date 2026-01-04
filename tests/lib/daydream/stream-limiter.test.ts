/**
 * Daydream stream limiter tests
 */

import { describe, expect, it } from 'vitest'
import {
  buildStreamLimitResponse,
  checkStreamCreation,
  clearAllStreams,
  endStream,
  generateSessionId,
  getActiveStream,
  registerStream,
} from '@/lib/daydream/stream-limiter'

describe('daydream stream limiter (in-memory)', () => {
  it('allows stream creation, registers, and clears on end', async () => {
    const clientId = 'client-1'

    clearAllStreams()
    const initial = await checkStreamCreation(clientId)
    expect(initial.allowed).toBe(true)

    await registerStream(clientId, 'stream-1')

    const blocked = await checkStreamCreation(clientId)
    expect(blocked.allowed).toBe(false)
    expect(blocked.activeStreamId).toBe('stream-1')

    const active = await getActiveStream(clientId)
    expect(active?.streamId).toBe('stream-1')

    const ended = await endStream(clientId, 'stream-1')
    expect(ended).toBe(true)

    const afterEnd = await checkStreamCreation(clientId)
    expect(afterEnd.allowed).toBe(true)
  })

  it('rejects endStream when stream id does not match', async () => {
    const clientId = 'client-2'

    clearAllStreams()
    await registerStream(clientId, 'stream-2')

    const ended = await endStream(clientId, 'stream-mismatch')
    expect(ended).toBe(false)
  })

  it('builds stream limit response with retry-after', () => {
    const response = buildStreamLimitResponse('Too many streams', 4500, 'stream-3')
    expect(response.error).toBe('Too many streams')
    expect(response.retryAfter).toBe(5)
    expect(response.activeStreamId).toBe('stream-3')
  })

  it('generates session ids with daydream prefix', () => {
    const sessionId = generateSessionId()
    expect(sessionId.startsWith('daydream-')).toBe(true)
  })
})
