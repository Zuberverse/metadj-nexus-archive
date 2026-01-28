/**
 * AI Provider Failover Tests
 *
 * Tests automatic failover, circuit breaker integration, and provider selection.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isCircuitOpen,
  isProviderError,
  recordFailure,
  recordSuccess,
} from '@/lib/ai/circuit-breaker'
import {
  executeWithFailover,
  isFailoverEnabled,
  selectHealthyProvider,
} from '@/lib/ai/failover'

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
    vi.resetAllMocks()
    // Restore defaults after reset clears implementations
    ;(isCircuitOpen as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)
    ;(isProviderError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)
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
    ;(isCircuitOpen as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (provider: string) => provider === 'openai'
    )

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

  it('throws original error when it is not a provider error', async () => {
    ;(isProviderError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)

    await expect(
      executeWithFailover(
        async () => {
          throw new Error('validation error')
        },
        async () => 'fallback-ok',
        'openai',
        'anthropic'
      )
    ).rejects.toThrow('validation error')
  })

  it('throws when both providers have open circuits', async () => {
    // Make primary pass circuit check but fail execution
    let checkCount = 0
    ;(isCircuitOpen as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => {
      checkCount++
      // First check (primary) passes; second check (fallback) is open
      return checkCount > 1
    })
    ;(isProviderError as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)

    await expect(
      executeWithFailover(
        async () => {
          throw new Error('provider error')
        },
        async () => 'fallback-ok',
        'openai',
        'anthropic'
      )
    ).rejects.toThrow('All AI providers are currently unavailable')
  })

  it('includes durationMs in result', async () => {
    const result = await executeWithFailover(
      async () => 'fast-result',
      async () => 'fallback',
    )

    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(typeof result.durationMs).toBe('number')
  })
})

describe('isFailoverEnabled', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('defaults to enabled when unset', () => {
    delete process.env.AI_FAILOVER_ENABLED
    expect(isFailoverEnabled()).toBe(true)
  })

  it('disables when env is "false"', () => {
    process.env.AI_FAILOVER_ENABLED = 'false'
    expect(isFailoverEnabled()).toBe(false)
  })

  it('disables when env is "0"', () => {
    process.env.AI_FAILOVER_ENABLED = '0'
    expect(isFailoverEnabled()).toBe(false)
  })

  it('remains enabled for other values', () => {
    process.env.AI_FAILOVER_ENABLED = 'true'
    expect(isFailoverEnabled()).toBe(true)
  })
})

import { afterAll } from 'vitest'

describe('selectHealthyProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isCircuitOpen as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)
  })

  it('returns preferred provider when healthy', () => {
    expect(selectHealthyProvider('openai')).toBe('openai')
    expect(selectHealthyProvider('anthropic')).toBe('anthropic')
    expect(selectHealthyProvider('google')).toBe('google')
    expect(selectHealthyProvider('xai')).toBe('xai')
  })

  it('defaults to openai when no preference given', () => {
    expect(selectHealthyProvider()).toBe('openai')
  })

  it('returns fallback when preferred circuit is open', () => {
    ;(isCircuitOpen as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (provider: string) => provider === 'openai'
    )
    const result = selectHealthyProvider('openai')
    expect(result).not.toBe('openai')
    expect(result).toBeTruthy()
  })

  it('returns null when all providers have open circuits', () => {
    ;(isCircuitOpen as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)
    expect(selectHealthyProvider()).toBeNull()
  })

  it('follows priority order: google before anthropic before xai', () => {
    ;(isCircuitOpen as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (provider: string) => provider === 'openai'
    )
    // When openai is down, should pick google (next in priority)
    expect(selectHealthyProvider('openai')).toBe('google')
  })
})
