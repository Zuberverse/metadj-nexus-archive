/**
 * AI Provider Health Endpoint
 *
 * Internal endpoint for monitoring AI provider health, circuit breaker state,
 * and cache performance. This is NOT a public endpoint - it should be protected
 * in production by authentication or internal network access only.
 *
 * Exposes:
 * - Circuit breaker state for all AI providers
 * - Cache hit rate and metrics
 * - Provider configuration status
 *
 * @route GET /api/health/providers
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCacheStats, isCacheEnabled } from '@/lib/ai/cache'
import { getProviderHealth, getCircuitBreakerMode } from '@/lib/ai/circuit-breaker'
import { logger } from '@/lib/logger'
import { resolveClientAddress } from '@/lib/network'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // Always execute, never cache

/**
 * Simple authorization check for internal endpoints
 * In production, this should be replaced with proper authentication
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

interface ProviderHealthResponse {
  timestamp: string
  circuitBreaker: {
    mode: 'distributed' | 'in-memory'
    providers: Record<string, {
      healthy: boolean
      state: string
      failures: number
      totalFailures: number
      lastFailure: string | null
      lastSuccess: string | null
    }>
  }
  cache: {
    enabled: boolean
    size: number
    maxSize: number
    hitRate: number
    hitRatePercent: string
    metrics: {
      hits: number
      misses: number
      writes: number
      evictions: number
      uptimeMinutes: number
    }
  }
  configuration: {
    providers: string[]
    primaryProvider: string | null
  }
}

export async function GET(request: NextRequest) {
  // Authorization check
  if (!isAuthorized(request)) {
    logger.warn('Unauthorized access attempt to /api/health/providers', {
      ip: resolveClientAddress(request).ip,
    })
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const timestamp = new Date().toISOString()

  // Get circuit breaker health for all providers
  const providerHealth = getProviderHealth()
  const circuitBreakerMode = getCircuitBreakerMode()

  // Get cache statistics
  const cacheStats = getCacheStats()

  // Determine configured providers
  const configuredProviders: string[] = []
  let primaryProvider: string | null = null

  if (process.env.OPENAI_API_KEY) {
    configuredProviders.push('openai')
    if (!primaryProvider) primaryProvider = 'openai'
  }
  if (process.env.ANTHROPIC_API_KEY) {
    configuredProviders.push('anthropic')
    if (!primaryProvider) primaryProvider = 'anthropic'
  }
  if (process.env.GOOGLE_API_KEY) {
    configuredProviders.push('google')
    if (!primaryProvider) primaryProvider = 'google'
  }
  if (process.env.XAI_API_KEY) {
    configuredProviders.push('xai')
    if (!primaryProvider) primaryProvider = 'xai'
  }

  // Format response
  const formattedProviderHealth: ProviderHealthResponse['circuitBreaker']['providers'] = {}
  for (const [provider, health] of Object.entries(providerHealth)) {
    formattedProviderHealth[provider] = {
      healthy: health.healthy,
      state: health.state,
      failures: health.failures,
      totalFailures: health.totalFailures,
      lastFailure: health.lastFailure ? new Date(health.lastFailure).toISOString() : null,
      lastSuccess: health.lastSuccess ? new Date(health.lastSuccess).toISOString() : null,
    }
  }

  const response: ProviderHealthResponse = {
    timestamp,
    circuitBreaker: {
      mode: circuitBreakerMode,
      providers: formattedProviderHealth,
    },
    cache: {
      enabled: cacheStats.enabled,
      size: cacheStats.size,
      maxSize: cacheStats.maxSize,
      hitRate: cacheStats.hitRate,
      hitRatePercent: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
      metrics: {
        hits: cacheStats.metrics.hits,
        misses: cacheStats.metrics.misses,
        writes: cacheStats.metrics.writes,
        evictions: cacheStats.metrics.evictions,
        uptimeMinutes: Math.round(cacheStats.metrics.uptimeMs / 60000),
      },
    },
    configuration: {
      providers: configuredProviders,
      primaryProvider,
    },
  }

  // Log access for audit trail
  logger.info('Provider health endpoint accessed', {
    circuitBreakerMode,
    unhealthyProviders: Object.entries(providerHealth)
      .filter(([, h]) => !h.healthy)
      .map(([p]) => p),
    cacheHitRate: response.cache.hitRatePercent,
  })

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  })
}
