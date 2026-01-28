/**
 * Circuit Breaker Tests
 *
 * Tests the in-memory circuit breaker state machine: closed -> open -> half-open -> closed.
 * Covers failure recording, success recovery, provider health, and error classification.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
  getCircuitState,
  getProviderHealth,
  resetAllCircuits,
  isProviderError,
  getCircuitBreakerMode,
} from '@/lib/ai/circuit-breaker'

describe('circuit-breaker (in-memory)', () => {
  beforeEach(() => {
    resetAllCircuits()
  })

  // --- Initial State ---

  describe('initial state', () => {
    it('reports circuit as closed for unknown provider', () => {
      expect(isCircuitOpen('openai')).toBe(false)
    })

    it('returns undefined state for unknown provider', () => {
      expect(getCircuitState('openai')).toBeUndefined()
    })

    it('reports in-memory mode when Upstash not configured', () => {
      expect(getCircuitBreakerMode()).toBe('in-memory')
    })
  })

  // --- Recording Failures ---

  describe('recordFailure', () => {
    it('creates circuit state on first failure', () => {
      recordFailure('openai', 'timeout')
      const state = getCircuitState('openai')
      expect(state).toBeDefined()
      expect(state?.failures).toBe(1)
      expect(state?.state).toBe('closed')
    })

    it('increments failure count', () => {
      recordFailure('openai', 'timeout')
      recordFailure('openai', 'timeout')
      const state = getCircuitState('openai')
      expect(state?.failures).toBe(2)
    })

    it('opens circuit after 3 consecutive failures', () => {
      recordFailure('openai', 'error 1')
      recordFailure('openai', 'error 2')
      recordFailure('openai', 'error 3')
      expect(isCircuitOpen('openai')).toBe(true)
      expect(getCircuitState('openai')?.state).toBe('open')
    })

    it('tracks totalFailures across resets', () => {
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      recordSuccess('openai')
      recordFailure('openai', 'err')
      const state = getCircuitState('openai')
      expect(state?.failures).toBe(1)
      expect(state?.totalFailures).toBe(4)
    })
  })

  // --- Recording Success ---

  describe('recordSuccess', () => {
    it('resets circuit to closed state', () => {
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      recordSuccess('openai')
      expect(isCircuitOpen('openai')).toBe(false)
      expect(getCircuitState('openai')?.state).toBe('closed')
      expect(getCircuitState('openai')?.failures).toBe(0)
    })

    it('preserves totalFailures after success', () => {
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      recordSuccess('openai')
      expect(getCircuitState('openai')?.totalFailures).toBe(3)
    })

    it('records lastSuccess timestamp', () => {
      const before = Date.now()
      recordSuccess('anthropic')
      const state = getCircuitState('anthropic')
      expect(state?.lastSuccess).toBeGreaterThanOrEqual(before)
    })
  })

  // --- Half-Open Recovery ---

  describe('half-open recovery', () => {
    it('transitions from open to half-open after recovery time', () => {
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      expect(isCircuitOpen('openai')).toBe(true)

      const state = getCircuitState('openai')!
      state.lastFailure = Date.now() - 61_000
      expect(isCircuitOpen('openai')).toBe(false)
      expect(getCircuitState('openai')?.state).toBe('half-open')
    })

    it('re-opens circuit on failure during half-open', () => {
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')

      const state = getCircuitState('openai')!
      state.lastFailure = Date.now() - 61_000
      isCircuitOpen('openai')

      recordFailure('openai', 'recovery failed')
      expect(getCircuitState('openai')?.state).toBe('open')
    })

    it('closes circuit on success during half-open', () => {
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')

      const state = getCircuitState('openai')!
      state.lastFailure = Date.now() - 61_000
      isCircuitOpen('openai')
      expect(getCircuitState('openai')?.state).toBe('half-open')

      recordSuccess('openai')
      expect(getCircuitState('openai')?.state).toBe('closed')
    })
  })

  // --- Provider Health ---

  describe('getProviderHealth', () => {
    it('reports all providers healthy by default', () => {
      const health = getProviderHealth()
      expect(health.openai.healthy).toBe(true)
      expect(health.anthropic.healthy).toBe(true)
      expect(health.google.healthy).toBe(true)
      expect(health.xai.healthy).toBe(true)
    })

    it('reports unhealthy provider after circuit opens', () => {
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      recordFailure('openai', 'err')
      const health = getProviderHealth()
      expect(health.openai.healthy).toBe(false)
      expect(health.openai.state).toBe('open')
      expect(health.openai.failures).toBe(3)
      expect(health.anthropic.healthy).toBe(true)
    })

    it('includes lastFailure and lastSuccess timestamps', () => {
      recordFailure('openai', 'err')
      recordSuccess('anthropic')
      const health = getProviderHealth()
      expect(health.openai.lastFailure).toBeGreaterThan(0)
      expect(health.anthropic.lastSuccess).toBeGreaterThan(0)
    })
  })

  // --- Reset ---

  describe('resetAllCircuits', () => {
    it('clears all circuit states', () => {
      recordFailure('openai', 'err')
      recordFailure('anthropic', 'err')
      resetAllCircuits()
      expect(getCircuitState('openai')).toBeUndefined()
      expect(getCircuitState('anthropic')).toBeUndefined()
    })
  })

  // --- isProviderError ---

  describe('isProviderError', () => {
    it('returns true for network errors', () => {
      expect(isProviderError(new Error('network error'))).toBe(true)
    })

    it('returns true for timeout errors', () => {
      expect(isProviderError(new Error('Request timeout'))).toBe(true)
    })

    it('returns true for 503 errors', () => {
      expect(isProviderError(new Error('503 Service Unavailable'))).toBe(true)
    })

    it('returns true for 502 errors', () => {
      expect(isProviderError(new Error('502 Bad Gateway'))).toBe(true)
    })

    it('returns true for 429 rate limit', () => {
      expect(isProviderError(new Error('429 Too Many Requests'))).toBe(true)
    })

    it('returns true for rate limit text', () => {
      expect(isProviderError(new Error('Rate limit exceeded'))).toBe(true)
    })

    it('returns true for ECONNREFUSED', () => {
      expect(isProviderError(new Error('ECONNREFUSED'))).toBe(true)
    })

    it('returns true for ETIMEDOUT', () => {
      expect(isProviderError(new Error('ETIMEDOUT'))).toBe(true)
    })

    it('returns true for ENOTFOUND', () => {
      expect(isProviderError(new Error('ENOTFOUND'))).toBe(true)
    })

    it('returns true for socket hang up', () => {
      expect(isProviderError(new Error('socket hang up'))).toBe(true)
    })

    it('returns true for overloaded/capacity', () => {
      expect(isProviderError(new Error('Server overloaded'))).toBe(true)
      expect(isProviderError(new Error('At capacity'))).toBe(true)
    })

    it('returns true for model not found errors', () => {
      expect(isProviderError(new Error('model not found'))).toBe(true)
      expect(isProviderError(new Error('unknown model gpt-99'))).toBe(true)
    })

    it('returns true for abort errors', () => {
      expect(isProviderError(new Error('The operation was aborted'))).toBe(true)
    })

    it('returns false for validation errors', () => {
      expect(isProviderError(new Error('Invalid input'))).toBe(false)
    })

    it('returns false for generic application errors', () => {
      expect(isProviderError(new Error('Something went wrong'))).toBe(false)
    })

    it('handles non-Error objects', () => {
      expect(isProviderError('network failure')).toBe(true)
      expect(isProviderError('some error')).toBe(false)
    })
  })
})
