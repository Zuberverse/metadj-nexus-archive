/**
 * AI failover tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isCircuitOpen,
  isProviderError,
  recordFailure,
  recordSuccess,
} from '@/lib/ai/circuit-breaker'
import { executeWithFailover, isFailoverEnabled } from '@/lib/ai/failover'

vi.mock('@/lib/ai/circuit-breaker', () => ({
  isCircuitOpen: vi.fn(() => false),
  isProviderError: vi.fn(() => true),
  recordFailure: vi.fn(),
  recordSuccess: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('executeWithFailover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns primary result when successful', async () => {
    const result = await executeWithFailover(
      async () => 'primary-ok',
      async () => 'fallback-ok',
      'openai',
      'anthropic'
    )

    expect(result.result).toBe('primary-ok')
    expect(result.provider).toBe('primary')
    expect(result.usedFallback).toBe(false)
    expect(recordSuccess).toHaveBeenCalledWith('openai')
  })

  it('uses fallback when primary fails with provider error', async () => {
    const result = await executeWithFailover(
      async () => {
        throw new Error('provider failed')
      },
      async () => 'fallback-ok',
      'openai',
      'anthropic'
    )

    expect(result.result).toBe('fallback-ok')
    expect(result.provider).toBe('fallback')
    expect(result.usedFallback).toBe(true)
    expect(recordFailure).toHaveBeenCalledWith('openai', 'provider failed')
    expect(recordSuccess).toHaveBeenCalledWith('anthropic')
  })

  it('bypasses primary when circuit is open', async () => {
    ;(isCircuitOpen as unknown as ReturnType<typeof vi.fn>).mockImplementation((provider: string) => provider === 'openai')

    const result = await executeWithFailover(
      async () => 'primary-ok',
      async () => 'fallback-ok',
      'openai',
      'anthropic'
    )

    expect(result.result).toBe('fallback-ok')
    expect(result.usedFallback).toBe(true)
    expect(recordSuccess).toHaveBeenCalledWith('anthropic')
  })

  it('throws when failover is disabled', async () => {
    ;(isProviderError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    await expect(
      executeWithFailover(
        async () => {
          throw new Error('provider failed')
        },
        async () => 'fallback-ok',
        'openai',
        'anthropic',
        { enabled: false }
      )
    ).rejects.toThrow('provider failed')
  })
})

describe('isFailoverEnabled', () => {
  it('defaults to enabled when unset', () => {
    delete process.env.AI_FAILOVER_ENABLED
    expect(isFailoverEnabled()).toBe(true)
  })

  it('disables when env is false', () => {
    process.env.AI_FAILOVER_ENABLED = 'false'
    expect(isFailoverEnabled()).toBe(false)
  })
})
