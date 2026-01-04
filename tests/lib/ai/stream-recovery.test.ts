/**
 * Stream recovery utility tests
 */

import { describe, expect, it, vi } from 'vitest'
import {
  classifyStreamError,
  isRecoverableStreamError,
  getStreamErrorMessage,
  withStreamRecovery,
  createRecoverableStreamResponse,
} from '@/lib/ai/stream-recovery'

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('classifyStreamError', () => {
  it('detects parse errors', () => {
    expect(classifyStreamError(new Error('Unexpected token'))).toBe('parse_error')
  })

  it('detects connection errors', () => {
    expect(classifyStreamError(new Error('socket hang up'))).toBe('connection_error')
  })

  it('detects timeout errors', () => {
    const error = new Error('timeout')
    error.name = 'AbortError'
    expect(classifyStreamError(error)).toBe('timeout_error')
  })

  it('detects provider errors', () => {
    expect(classifyStreamError(new Error('429 rate limit'))).toBe('provider_error')
  })
})

describe('isRecoverableStreamError', () => {
  it('returns true for recoverable error types', () => {
    expect(isRecoverableStreamError('connection_error')).toBe(true)
    expect(isRecoverableStreamError('timeout_error')).toBe(true)
    expect(isRecoverableStreamError('incomplete_error')).toBe(true)
  })

  it('returns false for non-recoverable errors', () => {
    expect(isRecoverableStreamError('parse_error')).toBe(false)
  })
})

describe('getStreamErrorMessage', () => {
  it('returns friendly messages', () => {
    expect(getStreamErrorMessage('timeout_error')).toContain('too long')
    expect(getStreamErrorMessage('provider_error')).toContain('temporarily busy')
  })
})

describe('withStreamRecovery', () => {
  it('retries recoverable errors and succeeds', async () => {
    vi.useFakeTimers()
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('ok')

    const promise = withStreamRecovery(operation, { maxRetries: 2, retryDelayMs: 10 })
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe('ok')

    vi.useRealTimers()
  })

  it('throws on unrecoverable error', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('invalid json'))

    await expect(
      withStreamRecovery(operation, {
        maxRetries: 1,
        onRecoveryFailed: vi.fn(),
      })
    ).rejects.toThrow('invalid json')
  })
})

describe('createRecoverableStreamResponse', () => {
  it('wraps streaming responses when possible', () => {
    if (typeof TransformStream === 'undefined') return

    const streamResult = {
      toDataStreamResponse: () => new Response('ok', { status: 200 }),
    }

    const response = createRecoverableStreamResponse(streamResult)
    expect(response.status).toBe(200)
  })

  it('returns fallback response when stream creation fails', () => {
    const streamResult = {
      toDataStreamResponse: () => {
        throw new Error('boom')
      },
    }

    const response = createRecoverableStreamResponse(streamResult, 'fallback message')
    expect(response.status).toBe(500)
  })
})
