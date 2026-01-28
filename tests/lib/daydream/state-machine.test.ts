/**
 * Daydream State Machine Tests
 *
 * Tests the state machine transitions, validation, and context creation
 * for the Daydream AI video streaming feature.
 */

import { describe, expect, it, vi } from 'vitest'
import {
  STATE_TRANSITIONS,
  getNextState,
  isValidTransition,
  createInitialContext,
  logTransition,
  type DreamState,
  type DreamEvent,
} from '@/lib/daydream/state-machine'

describe('STATE_TRANSITIONS', () => {
  it('defines valid events for idle state', () => {
    expect(STATE_TRANSITIONS.idle).toEqual(['START'])
  })

  it('defines valid events for countdown state', () => {
    expect(STATE_TRANSITIONS.countdown).toEqual(['COUNTDOWN_END', 'ERROR', 'STOP'])
  })

  it('defines valid events for connecting state', () => {
    expect(STATE_TRANSITIONS.connecting).toEqual(['WHIP_CONNECTED', 'STREAM_ACTIVE', 'ERROR', 'STOP'])
  })

  it('defines valid events for streaming state', () => {
    expect(STATE_TRANSITIONS.streaming).toEqual(['ERROR', 'STOP'])
  })

  it('defines valid events for error state', () => {
    expect(STATE_TRANSITIONS.error).toEqual(['RETRY', 'STOP'])
  })
})

describe('getNextState', () => {
  describe('from idle', () => {
    it('transitions to countdown on START', () => {
      expect(getNextState('idle', { type: 'START' })).toBe('countdown')
    })

    it('returns null for invalid events', () => {
      expect(getNextState('idle', { type: 'STOP' })).toBeNull()
      expect(getNextState('idle', { type: 'ERROR', message: 'fail' })).toBeNull()
      expect(getNextState('idle', { type: 'COUNTDOWN_END' })).toBeNull()
    })
  })

  describe('from countdown', () => {
    it('transitions to connecting on COUNTDOWN_END', () => {
      expect(getNextState('countdown', { type: 'COUNTDOWN_END' })).toBe('connecting')
    })

    it('transitions to error on ERROR', () => {
      expect(getNextState('countdown', { type: 'ERROR', message: 'network failure' })).toBe('error')
    })

    it('transitions to idle on STOP', () => {
      expect(getNextState('countdown', { type: 'STOP' })).toBe('idle')
    })

    it('returns null for invalid events', () => {
      expect(getNextState('countdown', { type: 'START' })).toBeNull()
      expect(getNextState('countdown', { type: 'WHIP_CONNECTED' })).toBeNull()
    })
  })

  describe('from connecting', () => {
    it('transitions to streaming on WHIP_CONNECTED', () => {
      expect(getNextState('connecting', { type: 'WHIP_CONNECTED' })).toBe('streaming')
    })

    it('transitions to streaming on STREAM_ACTIVE', () => {
      expect(getNextState('connecting', { type: 'STREAM_ACTIVE' })).toBe('streaming')
    })

    it('transitions to error on ERROR', () => {
      expect(getNextState('connecting', { type: 'ERROR', message: 'connection failed' })).toBe('error')
    })

    it('transitions to idle on STOP', () => {
      expect(getNextState('connecting', { type: 'STOP' })).toBe('idle')
    })

    it('returns null for invalid events', () => {
      expect(getNextState('connecting', { type: 'START' })).toBeNull()
      expect(getNextState('connecting', { type: 'RETRY' })).toBeNull()
    })
  })

  describe('from streaming', () => {
    it('transitions to error on ERROR', () => {
      expect(getNextState('streaming', { type: 'ERROR', message: 'stream lost' })).toBe('error')
    })

    it('transitions to idle on STOP', () => {
      expect(getNextState('streaming', { type: 'STOP' })).toBe('idle')
    })

    it('returns null for invalid events', () => {
      expect(getNextState('streaming', { type: 'START' })).toBeNull()
      expect(getNextState('streaming', { type: 'COUNTDOWN_END' })).toBeNull()
      expect(getNextState('streaming', { type: 'WHIP_CONNECTED' })).toBeNull()
    })
  })

  describe('from error', () => {
    it('transitions to countdown on RETRY', () => {
      expect(getNextState('error', { type: 'RETRY' })).toBe('countdown')
    })

    it('transitions to idle on STOP', () => {
      expect(getNextState('error', { type: 'STOP' })).toBe('idle')
    })

    it('returns null for invalid events', () => {
      expect(getNextState('error', { type: 'START' })).toBeNull()
      expect(getNextState('error', { type: 'WHIP_CONNECTED' })).toBeNull()
    })
  })
})

describe('isValidTransition', () => {
  it('validates idle -> countdown', () => {
    expect(isValidTransition('idle', 'countdown')).toBe(true)
  })

  it('validates countdown -> connecting', () => {
    expect(isValidTransition('countdown', 'connecting')).toBe(true)
  })

  it('validates connecting -> streaming', () => {
    expect(isValidTransition('connecting', 'streaming')).toBe(true)
  })

  it('validates streaming -> idle (stop)', () => {
    expect(isValidTransition('streaming', 'idle')).toBe(true)
  })

  it('validates streaming -> error', () => {
    expect(isValidTransition('streaming', 'error')).toBe(true)
  })

  it('validates error -> countdown (retry)', () => {
    expect(isValidTransition('error', 'countdown')).toBe(true)
  })

  it('validates error -> idle (stop)', () => {
    expect(isValidTransition('error', 'idle')).toBe(true)
  })

  it('rejects idle -> streaming (skips steps)', () => {
    expect(isValidTransition('idle', 'streaming')).toBe(false)
  })

  it('rejects idle -> error', () => {
    expect(isValidTransition('idle', 'error')).toBe(false)
  })

  it('rejects streaming -> connecting (backward)', () => {
    expect(isValidTransition('streaming', 'connecting')).toBe(false)
  })
})

describe('createInitialContext', () => {
  it('returns context with idle state', () => {
    const ctx = createInitialContext()
    expect(ctx).toEqual({ state: 'idle' })
  })

  it('does not include optional fields', () => {
    const ctx = createInitialContext()
    expect(ctx.streamId).toBeUndefined()
    expect(ctx.playbackId).toBeUndefined()
    expect(ctx.whipUrl).toBeUndefined()
    expect(ctx.playbackUrl).toBeUndefined()
    expect(ctx.message).toBeUndefined()
    expect(ctx.countdownRemaining).toBeUndefined()
    expect(ctx.lastTransition).toBeUndefined()
  })
})

describe('logTransition', () => {
  it('logs a valid transition', () => {
    const mockLogger = { debug: vi.fn() }
    logTransition('idle', 'countdown', 'START', mockLogger)

    expect(mockLogger.debug).toHaveBeenCalledOnce()
    expect(mockLogger.debug).toHaveBeenCalledWith(
      '[Dream State Machine] idle -> countdown',
      expect.objectContaining({
        event: 'START',
        valid: true,
        timestamp: expect.any(Number),
      })
    )
  })

  it('logs an invalid transition with valid: false', () => {
    const mockLogger = { debug: vi.fn() }
    logTransition('idle', 'streaming', 'WHIP_CONNECTED', mockLogger)

    expect(mockLogger.debug).toHaveBeenCalledOnce()
    expect(mockLogger.debug).toHaveBeenCalledWith(
      '[Dream State Machine] idle -> streaming',
      expect.objectContaining({
        event: 'WHIP_CONNECTED',
        valid: false,
      })
    )
  })
})
