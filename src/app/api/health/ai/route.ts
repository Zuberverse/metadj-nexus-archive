/**
 * AI Health Endpoint
 *
 * Internal endpoint for monitoring AI spending, rate limiting, and overall
 * AI subsystem health. Complements /api/health/providers for circuit breakers.
 *
 * Exposes:
 * - AI spending status (hourly/daily thresholds)
 * - Rate limiter mode
 * - Token budget warnings
 *
 * @route GET /api/health/ai
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCacheStats } from '@/lib/ai/cache'
import { SYSTEM_PROMPT_TOKEN_BUDGET } from '@/lib/ai/meta-dj-ai-prompt'
import { getRateLimitMode } from '@/lib/ai/rate-limiter'
import { getSpendingStatus } from '@/lib/ai/spending-alerts'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // Always execute, never cache

/**
 * Simple authorization check for internal endpoints
 */
function isAuthorized(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'test') {
    return true
  }

  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) {
    return false
  }

  const internalHeader = request.headers.get('x-internal-request')
  return internalHeader === secret
}

interface AIHealthResponse {
  timestamp: string
  status: 'healthy' | 'warning' | 'critical'
  spending: {
    hourly: {
      spent: number
      limit: number
      percentage: number
      status: 'ok' | 'warning' | 'exceeded'
      resetsAt: string
    }
    daily: {
      spent: number
      limit: number
      percentage: number
      status: 'ok' | 'warning' | 'exceeded'
      resetsAt: string
    }
    isBlocked: boolean
  }
  rateLimiter: {
    mode: 'distributed' | 'in-memory'
  }
  tokenBudget: {
    targetMaxTokens: number
    warningThreshold: number
    criticalThreshold: number
    charsPerToken: number
  }
  cache: {
    enabled: boolean
    size: number
    maxSize: number
    hitRate: number
    metrics: {
      hits: number
      misses: number
      writes: number
      evictions: number
      uptimeMs: number
    }
  }
}

export async function GET(request: NextRequest) {
  // Authorization check
  if (!isAuthorized(request)) {
    logger.warn('Unauthorized access attempt to /api/health/ai', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    })
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const timestamp = new Date().toISOString()

  // Get spending status
  const spendingStatus = await getSpendingStatus()

  // Get rate limiter mode
  const rateLimitMode = getRateLimitMode()

  // Get cache statistics
  const cacheStats = getCacheStats()

  // Determine overall health status
  let overallStatus: AIHealthResponse['status'] = 'healthy'
  if (spendingStatus.isBlocked) {
    overallStatus = 'critical'
  } else if (
    spendingStatus.hourly.status === 'exceeded' ||
    spendingStatus.daily.status === 'exceeded'
  ) {
    overallStatus = 'critical'
  } else if (
    spendingStatus.hourly.status === 'warning' ||
    spendingStatus.daily.status === 'warning'
  ) {
    overallStatus = 'warning'
  }

  const response: AIHealthResponse = {
    timestamp,
    status: overallStatus,
    spending: {
      hourly: {
        spent: spendingStatus.hourly.spent,
        limit: spendingStatus.hourly.limit,
        percentage: spendingStatus.hourly.percentage,
        status: spendingStatus.hourly.status,
        resetsAt: new Date(spendingStatus.hourly.resetAt).toISOString(),
      },
      daily: {
        spent: spendingStatus.daily.spent,
        limit: spendingStatus.daily.limit,
        percentage: spendingStatus.daily.percentage,
        status: spendingStatus.daily.status,
        resetsAt: new Date(spendingStatus.daily.resetAt).toISOString(),
      },
      isBlocked: spendingStatus.isBlocked,
    },
    rateLimiter: {
      mode: rateLimitMode,
    },
    tokenBudget: {
      targetMaxTokens: SYSTEM_PROMPT_TOKEN_BUDGET.TARGET_MAX_TOKENS,
      warningThreshold: SYSTEM_PROMPT_TOKEN_BUDGET.WARNING_THRESHOLD,
      criticalThreshold: SYSTEM_PROMPT_TOKEN_BUDGET.CRITICAL_THRESHOLD,
      charsPerToken: SYSTEM_PROMPT_TOKEN_BUDGET.CHARS_PER_TOKEN,
    },
    cache: {
      enabled: cacheStats.enabled,
      size: cacheStats.size,
      maxSize: cacheStats.maxSize,
      hitRate: cacheStats.hitRate,
      metrics: cacheStats.metrics,
    },
  }

  // Log access with key metrics
  logger.info('AI health endpoint accessed', {
    status: overallStatus,
    hourlySpend: `$${spendingStatus.hourly.spent.toFixed(4)}`,
    dailySpend: `$${spendingStatus.daily.spent.toFixed(4)}`,
    rateLimitMode,
    cacheHitRate: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
    cacheSize: cacheStats.size,
  })

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  })
}
