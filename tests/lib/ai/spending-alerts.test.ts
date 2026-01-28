/**
 * AI Spending Alerts Tests
 *
 * Tests the in-memory spending tracking, bucket resets, alert thresholds,
 * and configuration parsing.
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
  recordSpending,
  getSpendingStatus,
  isSpendingAllowed,
  getSpendingConfig_,
  clearSpendingData,
} from '@/lib/ai/spending-alerts'

const originalEnv = { ...process.env }

describe('spending-alerts (in-memory)', () => {
  beforeEach(() => {
    clearSpendingData()
    process.env = { ...originalEnv }
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // --- Configuration ---

  describe('configuration', () => {
    it('returns default limits', () => {
      delete process.env.AI_SPENDING_HOURLY_LIMIT
      delete process.env.AI_SPENDING_DAILY_LIMIT
      const config = getSpendingConfig_()
      expect(config.hourlyLimit).toBe(1.0)
      expect(config.dailyLimit).toBe(10.0)
      expect(config.warningThreshold).toBe(0.8)
      expect(config.blockOnLimit).toBe(false)
    })

    it('respects custom env limits', () => {
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
  })

  // --- Recording Spending ---

  describe('recordSpending', () => {
    it('records spending and updates status', async () => {
      await recordSpending({ costUsd: 0.05, provider: 'openai', model: 'gpt-5' })
      const status = await getSpendingStatus()
      expect(status.hourly.spent).toBeGreaterThanOrEqual(0.05)
      expect(status.daily.spent).toBeGreaterThanOrEqual(0.05)
    })

    it('accumulates spending over multiple calls', async () => {
      await recordSpending({ costUsd: 0.01, provider: 'openai', model: 'gpt-5' })
      await recordSpending({ costUsd: 0.02, provider: 'openai', model: 'gpt-5' })
      await recordSpending({ costUsd: 0.03, provider: 'anthropic', model: 'claude' })
      const status = await getSpendingStatus()
      expect(status.hourly.spent).toBeCloseTo(0.06, 4)
    })
  })

  // --- Spending Status ---

  describe('getSpendingStatus', () => {
    it('returns ok status when under threshold', async () => {
      await recordSpending({ costUsd: 0.01, provider: 'openai', model: 'gpt-5' })
      const status = await getSpendingStatus()
      expect(status.hourly.status).toBe('ok')
      expect(status.daily.status).toBe('ok')
      expect(status.isBlocked).toBe(false)
    })

    it('returns warning status when approaching limit', async () => {
      await recordSpending({ costUsd: 0.85, provider: 'openai', model: 'gpt-5' })
      const status = await getSpendingStatus()
      expect(status.hourly.status).toBe('warning')
    })

    it('returns exceeded status when over limit', async () => {
      await recordSpending({ costUsd: 1.1, provider: 'openai', model: 'gpt-5' })
      const status = await getSpendingStatus()
      expect(status.hourly.status).toBe('exceeded')
      expect(status.hourly.percentage).toBeGreaterThan(1)
    })

    it('reports correct percentage', async () => {
      await recordSpending({ costUsd: 0.5, provider: 'openai', model: 'gpt-5' })
      const status = await getSpendingStatus()
      expect(status.hourly.percentage).toBeCloseTo(0.5, 2)
    })

    it('includes resetAt timestamps', async () => {
      const status = await getSpendingStatus()
      expect(status.hourly.resetAt).toBeGreaterThan(Date.now())
      expect(status.daily.resetAt).toBeGreaterThan(Date.now())
    })

    it('includes lastUpdated timestamp', async () => {
      const before = Date.now()
      const status = await getSpendingStatus()
      expect(status.lastUpdated).toBeGreaterThanOrEqual(before)
    })
  })

  // --- Blocking ---

  describe('isSpendingAllowed', () => {
    it('allows spending when not blocked', async () => {
      const allowed = await isSpendingAllowed()
      expect(allowed).toBe(true)
    })

    it('allows spending when limit exceeded but blocking disabled', async () => {
      delete process.env.AI_SPENDING_BLOCK_ON_LIMIT
      await recordSpending({ costUsd: 1.5, provider: 'openai', model: 'gpt-5' })
      const allowed = await isSpendingAllowed()
      expect(allowed).toBe(true)
    })

    it('blocks spending when limit exceeded and blocking enabled', async () => {
      process.env.AI_SPENDING_BLOCK_ON_LIMIT = 'true'
      await recordSpending({ costUsd: 1.5, provider: 'openai', model: 'gpt-5' })
      const allowed = await isSpendingAllowed()
      expect(allowed).toBe(false)
    })
  })

  // --- Clear Data ---

  describe('clearSpendingData', () => {
    it('resets spending to zero', async () => {
      await recordSpending({ costUsd: 0.5, provider: 'openai', model: 'gpt-5' })
      clearSpendingData()
      const status = await getSpendingStatus()
      expect(status.hourly.spent).toBe(0)
      expect(status.daily.spent).toBe(0)
    })
  })
})
