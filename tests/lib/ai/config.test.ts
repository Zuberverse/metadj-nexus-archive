/**
 * AI Configuration Tests
 *
 * Tests for AI request timeout and error detection utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getAIRequestTimeout,
  MAX_TOOL_STEPS,
  DEFAULT_TEMPERATURE,
  createStopCondition,
  isTimeoutError,
} from '@/lib/ai/config'

describe('getAIRequestTimeout', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    // Clear any existing timeout env vars
    delete process.env.AI_TIMEOUT_STREAM
    delete process.env.AI_TIMEOUT_CHAT
    delete process.env.AI_REQUEST_TIMEOUT_MS
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns default timeout without route', () => {
    const timeout = getAIRequestTimeout()
    expect(timeout).toBe(30000)
  })

  it('returns route-specific default for stream', () => {
    const timeout = getAIRequestTimeout('stream')
    expect(timeout).toBe(90000) // 90s - Streaming with tool calls can take longer
  })

  it('returns route-specific default for chat', () => {
    const timeout = getAIRequestTimeout('chat')
    expect(timeout).toBe(30000)
  })

  it('returns route-specific default for transcribe', () => {
    const timeout = getAIRequestTimeout('transcribe')
    expect(timeout).toBe(45000)
  })

  it('returns route-specific default for tools', () => {
    const timeout = getAIRequestTimeout('tools')
    expect(timeout).toBe(90000)
  })

  it('uses global env var when set', () => {
    process.env.AI_REQUEST_TIMEOUT_MS = '120000'
    const timeout = getAIRequestTimeout()
    expect(timeout).toBe(120000)
  })

  it('uses route-specific env var when set', () => {
    process.env.AI_TIMEOUT_STREAM = '180000'
    const timeout = getAIRequestTimeout('stream')
    expect(timeout).toBe(180000)
  })

  it('prioritizes route-specific env over global env', () => {
    process.env.AI_REQUEST_TIMEOUT_MS = '60000'
    process.env.AI_TIMEOUT_STREAM = '120000'
    const timeout = getAIRequestTimeout('stream')
    expect(timeout).toBe(120000)
  })

  it('ignores invalid env values', () => {
    process.env.AI_REQUEST_TIMEOUT_MS = 'invalid'
    const timeout = getAIRequestTimeout()
    expect(timeout).toBe(30000)
  })

  it('ignores negative env values', () => {
    process.env.AI_REQUEST_TIMEOUT_MS = '-1000'
    const timeout = getAIRequestTimeout()
    expect(timeout).toBe(30000)
  })

  it('returns default for unknown route', () => {
    const timeout = getAIRequestTimeout('unknown')
    expect(timeout).toBe(30000)
  })
})

describe('constants', () => {
  it('exports MAX_TOOL_STEPS', () => {
    expect(MAX_TOOL_STEPS).toBe(3)
  })

  it('exports DEFAULT_TEMPERATURE', () => {
    expect(DEFAULT_TEMPERATURE).toBe(0.7)
  })
})

describe('createStopCondition', () => {
  it('returns an array of conditions', () => {
    const conditions = createStopCondition()
    expect(Array.isArray(conditions)).toBe(true)
    expect(conditions).toHaveLength(2)
  })

  it('first condition is a function', () => {
    const [customCondition] = createStopCondition()
    expect(typeof customCondition).toBe('function')
  })

  it('custom condition returns false for empty steps', () => {
    const [customCondition] = createStopCondition()
    const result = (customCondition as Function)({ steps: [] })
    expect(result).toBe(false)
  })

  it('custom condition returns true for non-tool-call finish', () => {
    const [customCondition] = createStopCondition()
    const result = (customCondition as Function)({
      steps: [{ finishReason: 'stop' }],
    })
    expect(result).toBe(true)
  })

  it('custom condition returns false after first tool-call', () => {
    const [customCondition] = createStopCondition()
    const result = (customCondition as Function)({
      steps: [{ finishReason: 'tool-calls' }],
    })
    expect(result).toBe(false)
  })

  it('custom condition returns true after two tool-call steps', () => {
    const [customCondition] = createStopCondition()
    const result = (customCondition as Function)({
      steps: [{ finishReason: 'tool-calls' }, { finishReason: 'tool-calls' }],
    })
    expect(result).toBe(true)
  })
})

describe('isTimeoutError', () => {
  it('returns true for AbortError', () => {
    const error = new Error('Aborted')
    error.name = 'AbortError'
    expect(isTimeoutError(error)).toBe(true)
  })

  it('returns true for timeout message', () => {
    const error = new Error('Request timeout exceeded')
    expect(isTimeoutError(error)).toBe(true)
  })

  it('returns true for aborted message', () => {
    const error = new Error('Operation was aborted')
    expect(isTimeoutError(error)).toBe(true)
  })

  it('returns true for abort message', () => {
    const error = new Error('Signal abort')
    expect(isTimeoutError(error)).toBe(true)
  })

  it('returns false for other errors', () => {
    const error = new Error('Network failure')
    expect(isTimeoutError(error)).toBe(false)
  })

  it('handles non-Error objects', () => {
    expect(isTimeoutError('timeout error')).toBe(true)
    expect(isTimeoutError('some other error')).toBe(false)
  })

  it('handles null and undefined', () => {
    expect(isTimeoutError(null)).toBe(false)
    expect(isTimeoutError(undefined)).toBe(false)
  })
})
