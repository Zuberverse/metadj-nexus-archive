/**
 * AI Spending Alerts Module
 *
 * Tracks AI API costs and alerts when spending approaches or exceeds thresholds.
 * Supports both in-memory tracking (single-instance deployments like Replit)
 * and distributed tracking via Upstash Redis.
 *
 * ## Configuration
 *
 * Environment variables:
 * - AI_SPENDING_HOURLY_LIMIT: Hourly spending limit in USD (default: 1.00)
 * - AI_SPENDING_DAILY_LIMIT: Daily spending limit in USD (default: 10.00)
 * - AI_SPENDING_WARNING_THRESHOLD: Percentage at which to warn (default: 0.8 = 80%)
 * - AI_SPENDING_BLOCK_ON_LIMIT: If 'true', block requests when limit exceeded (default: 'false')
 *
 * ## Alert Levels
 *
 * - INFO: Normal spending tracked
 * - WARN: Approaching limit (>80% by default)
 * - ERROR: Limit exceeded
 *
 * ## Usage
 *
 * ```typescript
 * import { recordSpending, getSpendingStatus, isSpendingAllowed } from '@/lib/ai/spending-alerts'
 *
 * // Record spending after each AI request
 * await recordSpending({ costUsd: 0.002, provider: 'openai', model: 'gpt-5.2-chat-latest' })
 *
 * // Check if more spending is allowed (when blocking enabled)
 * if (await isSpendingAllowed()) {
 *   // Proceed with AI request
 * }
 *
 * // Get current spending status for monitoring
 * const status = await getSpendingStatus()
 * console.log(status.hourly.spent, status.daily.spent)
 * ```
 *
 * @module lib/ai/spending-alerts
 */

import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default spending limits (USD)
 * Can be overridden via environment variables
 */
const DEFAULT_HOURLY_LIMIT = 1.0
const DEFAULT_DAILY_LIMIT = 10.0
const DEFAULT_WARNING_THRESHOLD = 0.8 // 80%

/**
 * Get spending configuration from environment
 */
function getSpendingConfig() {
  const hourlyLimit = parseFloat(process.env.AI_SPENDING_HOURLY_LIMIT || '') || DEFAULT_HOURLY_LIMIT
  const dailyLimit = parseFloat(process.env.AI_SPENDING_DAILY_LIMIT || '') || DEFAULT_DAILY_LIMIT
  const warningThreshold =
    parseFloat(process.env.AI_SPENDING_WARNING_THRESHOLD || '') || DEFAULT_WARNING_THRESHOLD
  const blockOnLimit = process.env.AI_SPENDING_BLOCK_ON_LIMIT === 'true'

  return {
    hourlyLimit,
    dailyLimit,
    warningThreshold,
    blockOnLimit,
  }
}

// ============================================================================
// Types
// ============================================================================

export interface SpendingRecord {
  costUsd: number
  provider: string
  model: string
  timestamp?: number
}

export interface SpendingBucket {
  spent: number
  limit: number
  percentage: number
  status: 'ok' | 'warning' | 'exceeded'
  resetAt: number
}

export interface SpendingStatus {
  hourly: SpendingBucket
  daily: SpendingBucket
  isBlocked: boolean
  lastUpdated: number
}

interface InMemoryBucket {
  spent: number
  resetAt: number
}

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Get the start of the current hour (UTC)
 */
function getHourStart(): number {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  return now.getTime()
}

/**
 * Get the start of the current day (UTC)
 */
function getDayStart(): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

/**
 * Get when the current hour bucket resets
 */
function getHourResetAt(): number {
  return getHourStart() + 60 * 60 * 1000 // Next hour
}

/**
 * Get when the current day bucket resets
 */
function getDayResetAt(): number {
  return getDayStart() + 24 * 60 * 60 * 1000 // Next day
}

// ============================================================================
// In-Memory Storage (Single-Instance Mode)
// ============================================================================

const inMemoryStore = {
  hourly: { spent: 0, resetAt: getHourResetAt() } as InMemoryBucket,
  daily: { spent: 0, resetAt: getDayResetAt() } as InMemoryBucket,
}

/**
 * Reset in-memory buckets if they've expired
 */
function resetExpiredBuckets(): void {
  const now = Date.now()

  if (now >= inMemoryStore.hourly.resetAt) {
    inMemoryStore.hourly = { spent: 0, resetAt: getHourResetAt() }
  }

  if (now >= inMemoryStore.daily.resetAt) {
    inMemoryStore.daily = { spent: 0, resetAt: getDayResetAt() }
  }
}

/**
 * Record spending in memory
 */
function recordSpendingInMemory(costUsd: number): void {
  resetExpiredBuckets()
  inMemoryStore.hourly.spent += costUsd
  inMemoryStore.daily.spent += costUsd
}

/**
 * Get spending status from memory
 */
function getSpendingStatusInMemory(): { hourlySpent: number; dailySpent: number } {
  resetExpiredBuckets()
  return {
    hourlySpent: inMemoryStore.hourly.spent,
    dailySpent: inMemoryStore.daily.spent,
  }
}

// ============================================================================
// Upstash Redis Storage (Distributed Mode)
// ============================================================================

/**
 * Check if Upstash Redis is configured
 */
function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

let redisClient: Redis | null = null

/**
 * Get or create Redis client
 */
function getRedisClient(): Redis | null {
  if (!isUpstashConfigured()) return null

  if (!redisClient) {
    try {
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    } catch (error) {
      logger.error('[AI Spending] Failed to initialize Redis client', {
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  return redisClient
}

/**
 * Get Redis key for hourly bucket
 */
function getHourlyKey(): string {
  const hourStart = getHourStart()
  return `ai:spending:hourly:${hourStart}`
}

/**
 * Get Redis key for daily bucket
 */
function getDailyKey(): string {
  const dayStart = getDayStart()
  return `ai:spending:daily:${dayStart}`
}

/**
 * Record spending in Redis with automatic TTL
 */
async function recordSpendingRedis(costUsd: number): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  const hourlyKey = getHourlyKey()
  const dailyKey = getDailyKey()

  try {
    // Use INCRBYFLOAT for atomic increment, with TTL for automatic cleanup
    await Promise.all([
      redis.incrbyfloat(hourlyKey, costUsd).then(() =>
        redis.expire(hourlyKey, 3600 + 60) // 1 hour + 1 minute buffer
      ),
      redis.incrbyfloat(dailyKey, costUsd).then(() =>
        redis.expire(dailyKey, 86400 + 60) // 24 hours + 1 minute buffer
      ),
    ])
  } catch (error) {
    logger.warn('[AI Spending] Redis increment failed, falling back to in-memory', {
      error: error instanceof Error ? error.message : String(error),
    })
    // Fall back to in-memory
    recordSpendingInMemory(costUsd)
  }
}

/**
 * Get spending status from Redis
 */
async function getSpendingStatusRedis(): Promise<{ hourlySpent: number; dailySpent: number } | null> {
  const redis = getRedisClient()
  if (!redis) return null

  const hourlyKey = getHourlyKey()
  const dailyKey = getDailyKey()

  try {
    const [hourlySpent, dailySpent] = await Promise.all([
      redis.get<number>(hourlyKey),
      redis.get<number>(dailyKey),
    ])

    return {
      hourlySpent: hourlySpent ?? 0,
      dailySpent: dailySpent ?? 0,
    }
  } catch (error) {
    logger.warn('[AI Spending] Redis get failed, falling back to in-memory', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Record AI spending and trigger alerts if thresholds are crossed
 *
 * @param record - Spending record with cost, provider, and model info
 */
export async function recordSpending(record: SpendingRecord): Promise<void> {
  const { costUsd, provider, model } = record
  const config = getSpendingConfig()

  // Record to appropriate storage
  if (isUpstashConfigured()) {
    await recordSpendingRedis(costUsd)
  } else {
    recordSpendingInMemory(costUsd)
  }

  // Get current totals for alert checking
  const status = await getSpendingStatus()

  // Log spending for monitoring
  logger.info('[AI Spending] Cost recorded', {
    costUsd: costUsd.toFixed(6),
    provider,
    model,
    hourlyTotal: status.hourly.spent.toFixed(4),
    dailyTotal: status.daily.spent.toFixed(4),
    hourlyPct: (status.hourly.percentage * 100).toFixed(1) + '%',
    dailyPct: (status.daily.percentage * 100).toFixed(1) + '%',
  })

  // Check for alerts
  checkAndLogAlerts(status, config)
}

/**
 * Check spending status and log appropriate alerts
 */
function checkAndLogAlerts(
  status: SpendingStatus,
  config: ReturnType<typeof getSpendingConfig>
): void {
  const { warningThreshold } = config

  // Hourly alerts
  if (status.hourly.status === 'exceeded') {
    logger.error('[AI Spending] HOURLY LIMIT EXCEEDED', {
      spent: status.hourly.spent.toFixed(4),
      limit: status.hourly.limit.toFixed(2),
      percentage: (status.hourly.percentage * 100).toFixed(1) + '%',
      resetAt: new Date(status.hourly.resetAt).toISOString(),
      blocked: status.isBlocked,
    })
  } else if (status.hourly.status === 'warning') {
    logger.warn('[AI Spending] Approaching hourly limit', {
      spent: status.hourly.spent.toFixed(4),
      limit: status.hourly.limit.toFixed(2),
      percentage: (status.hourly.percentage * 100).toFixed(1) + '%',
      threshold: (warningThreshold * 100).toFixed(0) + '%',
      resetAt: new Date(status.hourly.resetAt).toISOString(),
    })
  }

  // Daily alerts
  if (status.daily.status === 'exceeded') {
    logger.error('[AI Spending] DAILY LIMIT EXCEEDED', {
      spent: status.daily.spent.toFixed(4),
      limit: status.daily.limit.toFixed(2),
      percentage: (status.daily.percentage * 100).toFixed(1) + '%',
      resetAt: new Date(status.daily.resetAt).toISOString(),
      blocked: status.isBlocked,
    })
  } else if (status.daily.status === 'warning') {
    logger.warn('[AI Spending] Approaching daily limit', {
      spent: status.daily.spent.toFixed(4),
      limit: status.daily.limit.toFixed(2),
      percentage: (status.daily.percentage * 100).toFixed(1) + '%',
      threshold: (warningThreshold * 100).toFixed(0) + '%',
      resetAt: new Date(status.daily.resetAt).toISOString(),
    })
  }
}

/**
 * Get current spending status
 *
 * @returns Current spending status with hourly and daily buckets
 */
export async function getSpendingStatus(): Promise<SpendingStatus> {
  const config = getSpendingConfig()
  const { hourlyLimit, dailyLimit, warningThreshold, blockOnLimit } = config

  // Get spending totals from appropriate storage
  let hourlySpent = 0
  let dailySpent = 0

  if (isUpstashConfigured()) {
    const redisStatus = await getSpendingStatusRedis()
    if (redisStatus) {
      hourlySpent = redisStatus.hourlySpent
      dailySpent = redisStatus.dailySpent
    } else {
      // Fallback to in-memory if Redis fails
      const memoryStatus = getSpendingStatusInMemory()
      hourlySpent = memoryStatus.hourlySpent
      dailySpent = memoryStatus.dailySpent
    }
  } else {
    const memoryStatus = getSpendingStatusInMemory()
    hourlySpent = memoryStatus.hourlySpent
    dailySpent = memoryStatus.dailySpent
  }

  // Calculate percentages and statuses
  const hourlyPercentage = hourlySpent / hourlyLimit
  const dailyPercentage = dailySpent / dailyLimit

  const getStatus = (percentage: number): 'ok' | 'warning' | 'exceeded' => {
    if (percentage >= 1) return 'exceeded'
    if (percentage >= warningThreshold) return 'warning'
    return 'ok'
  }

  const hourlyStatus = getStatus(hourlyPercentage)
  const dailyStatus = getStatus(dailyPercentage)

  // Check if blocked (when blocking is enabled and any limit exceeded)
  const isBlocked = blockOnLimit && (hourlyStatus === 'exceeded' || dailyStatus === 'exceeded')

  return {
    hourly: {
      spent: hourlySpent,
      limit: hourlyLimit,
      percentage: hourlyPercentage,
      status: hourlyStatus,
      resetAt: getHourResetAt(),
    },
    daily: {
      spent: dailySpent,
      limit: dailyLimit,
      percentage: dailyPercentage,
      status: dailyStatus,
      resetAt: getDayResetAt(),
    },
    isBlocked,
    lastUpdated: Date.now(),
  }
}

/**
 * Check if spending is allowed (not blocked by limits)
 *
 * Use this before making AI requests when AI_SPENDING_BLOCK_ON_LIMIT is enabled.
 *
 * @returns true if spending is allowed, false if blocked
 */
export async function isSpendingAllowed(): Promise<boolean> {
  const status = await getSpendingStatus()
  return !status.isBlocked
}

/**
 * Get spending configuration (for health checks/monitoring)
 */
export function getSpendingConfig_(): ReturnType<typeof getSpendingConfig> {
  return getSpendingConfig()
}

/**
 * Clear in-memory spending data (for testing)
 */
export function clearSpendingData(): void {
  inMemoryStore.hourly = { spent: 0, resetAt: getHourResetAt() }
  inMemoryStore.daily = { spent: 0, resetAt: getDayResetAt() }
}
