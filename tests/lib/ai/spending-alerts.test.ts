/**
 * AI Spending Alerts Tests
 *
 * Tests the spending tracking, threshold alerts, and in-memory storage.
 * Redis integration is mocked to avoid external dependencies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  recordSpending,
  getSpendingStatus,
  isSpendingAllowed,
  clearSpendingData,
  getSpendingConfig_,
} from '@/lib/ai/spending-alerts'

// Mock the logger to avoid console output during tests
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Upstash Redis to test in-memory mode
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    incrbyfloat: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
  })),
}))

describe('AI Spending Alerts', () => {
  beforeEach(() => {
    // Clear spending data before each test
    clearSpendingData()
    // Reset environment variables
    delete process.env.AI_SPENDING_HOURLY_LIMIT
    delete process.env.AI_SPENDING_DAILY_LIMIT
    delete process.env.AI_SPENDING_WARNING_THRESHOLD
    delete process.env.AI_SPENDING_BLOCK_ON_LIMIT
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  describe('getSpendingConfig_', () => {
    it('returns default configuration', () => {
      const config = getSpendingConfig_()
      expect(config.hourlyLimit).toBe(1.0)
      expect(config.dailyLimit).toBe(10.0)
      expect(config.warningThreshold).toBe(0.8)
      expect(config.blockOnLimit).toBe(false)
    })

    it('respects environment variable overrides', () => {
      process.env.AI_SPENDING_HOURLY_LIMIT = '5.0'
      process.env.AI_SPENDING_DAILY_LIMIT = '50.0'
      process.env.AI_SPENDING_WARNING_THRESHOLD = '0.9'
      process.env.AI_SPENDING_BLOCK_ON_LIMIT = 'true'

      const config = getSpendingConfig_()
      expect(config.hourlyLimit).toBe(5.0)
      expect(config.dailyLimit).toBe(50.0)
      expect(config.warningThreshold).toBe(0.9)
      expect(config.blockOnLimit).toBe(true)
    })

    it('handles invalid environment variable values gracefully', () => {
      process.env.AI_SPENDING_HOURLY_LIMIT = 'invalid'
      process.env.AI_SPENDING_DAILY_LIMIT = ''

      const config = getSpendingConfig_()
      expect(config.hourlyLimit).toBe(1.0) // Falls back to default
      expect(config.dailyLimit).toBe(10.0) // Falls back to default
    })
  })

  describe('recordSpending', () => {
    it('records spending correctly', async () => {
      await recordSpending({
        costUsd: 0.01,
        provider: 'openai',
        model: 'gpt-5.2-chat-latest',
      })

      const status = await getSpendingStatus()
      expect(status.hourly.spent).toBe(0.01)
      expect(status.daily.spent).toBe(0.01)
    })

    it('accumulates multiple spending records', async () => {
      await recordSpending({ costUsd: 0.01, provider: 'openai', model: 'gpt-5' })
      await recordSpending({ costUsd: 0.02, provider: 'openai', model: 'gpt-5' })
      await recordSpending({ costUsd: 0.03, provider: 'anthropic', model: 'claude' })

      const status = await getSpendingStatus()
      expect(status.hourly.spent).toBeCloseTo(0.06, 6)
      expect(status.daily.spent).toBeCloseTo(0.06, 6)
    })
  })

  describe('getSpendingStatus', () => {
    it('returns correct status for no spending', async () => {
      const status = await getSpendingStatus()
      expect(status.hourly.spent).toBe(0)
      expect(status.hourly.status).toBe('ok')
      expect(status.daily.spent).toBe(0)
      expect(status.daily.status).toBe('ok')
      expect(status.isBlocked).toBe(false)
    })

    it('calculates percentages correctly', async () => {
      // Spend 50% of hourly limit (default $1)
      await recordSpending({ costUsd: 0.5, provider: 'openai', model: 'gpt-5' })

      const status = await getSpendingStatus()
      expect(status.hourly.percentage).toBe(0.5)
      expect(status.hourly.status).toBe('ok')
      // Daily limit is $10, so 0.5/10 = 5%
      expect(status.daily.percentage).toBe(0.05)
    })

    it('triggers warning status at threshold', async () => {
      // Default warning threshold is 80%, hourly limit is $1
      // So spending $0.85 should trigger warning
      await recordSpending({ costUsd: 0.85, provider: 'openai', model: 'gpt-5' })

      const status = await getSpendingStatus()
      expect(status.hourly.status).toBe('warning')
      expect(status.daily.status).toBe('ok') // Still below 80% of $10
    })

    it('triggers exceeded status when over limit', async () => {
      // Spend $1.10, exceeding hourly limit of $1
      await recordSpending({ costUsd: 1.1, provider: 'openai', model: 'gpt-5' })

      const status = await getSpendingStatus()
      expect(status.hourly.status).toBe('exceeded')
      expect(status.hourly.percentage).toBeGreaterThan(1)
    })

    it('includes reset timestamps', async () => {
      const status = await getSpendingStatus()
      const now = Date.now()

      // Hourly reset should be within the next hour
      expect(status.hourly.resetAt).toBeGreaterThan(now)
      expect(status.hourly.resetAt).toBeLessThanOrEqual(now + 60 * 60 * 1000)

      // Daily reset should be within the next 24 hours
      expect(status.daily.resetAt).toBeGreaterThan(now)
      expect(status.daily.resetAt).toBeLessThanOrEqual(now + 24 * 60 * 60 * 1000)
    })
  })

  describe('isSpendingAllowed', () => {
    it('returns true when under limits and blocking disabled', async () => {
      await recordSpending({ costUsd: 0.5, provider: 'openai', model: 'gpt-5' })
      const allowed = await isSpendingAllowed()
      expect(allowed).toBe(true)
    })

    it('returns true when over limit but blocking disabled', async () => {
      await recordSpending({ costUsd: 1.5, provider: 'openai', model: 'gpt-5' })
      const allowed = await isSpendingAllowed()
      expect(allowed).toBe(true) // Blocking is disabled by default
    })

    it('returns false when over limit and blocking enabled', async () => {
      process.env.AI_SPENDING_BLOCK_ON_LIMIT = 'true'
      await recordSpending({ costUsd: 1.5, provider: 'openai', model: 'gpt-5' })
      const allowed = await isSpendingAllowed()
      expect(allowed).toBe(false)
    })
  })

  describe('clearSpendingData', () => {
    it('resets all spending to zero', async () => {
      await recordSpending({ costUsd: 0.5, provider: 'openai', model: 'gpt-5' })

      let status = await getSpendingStatus()
      expect(status.hourly.spent).toBe(0.5)

      clearSpendingData()

      status = await getSpendingStatus()
      expect(status.hourly.spent).toBe(0)
      expect(status.daily.spent).toBe(0)
    })
  })

  describe('daily spending threshold', () => {
    it('tracks daily spending independently', async () => {
      // Custom limits: $0.10 hourly, $1.00 daily
      process.env.AI_SPENDING_HOURLY_LIMIT = '0.10'
      process.env.AI_SPENDING_DAILY_LIMIT = '1.00'

      // Spend $0.15 - exceeds hourly but not daily
      await recordSpending({ costUsd: 0.15, provider: 'openai', model: 'gpt-5' })

      const status = await getSpendingStatus()
      expect(status.hourly.status).toBe('exceeded')
      expect(status.daily.status).toBe('ok')
      expect(status.daily.percentage).toBe(0.15)
    })
  })
})
