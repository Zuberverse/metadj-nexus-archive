/**
 * Circuit Breaker Pattern for AI Provider Health
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * when AI providers experience issues. Tracks failures per provider
 * and temporarily disables unhealthy providers.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Provider disabled, requests fail fast
 * - HALF-OPEN: Testing recovery (after recovery time)
 *
 * ## Storage Backends
 *
 * - **In-Memory (Default)**: State resets on server restart
 * - **Redis (Upstash)**: Persistent state across restarts and instances
 *
 * Redis mode is automatically enabled when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN environment variables are set.
 *
 * @module lib/ai/circuit-breaker
 */

import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'

/**
 * Explicit circuit state enum for clearer state machine transitions
 */
type CircuitStateType = 'closed' | 'open' | 'half-open'

/**
 * Circuit state for a single provider
 */
interface CircuitState {
  /** Explicit circuit state for proper state machine tracking */
  state: CircuitStateType
  /** Number of consecutive failures */
  failures: number
  /** Timestamp of last failure */
  lastFailure: number
  /** Whether the circuit is open (blocking requests) - legacy, use state instead */
  isOpen: boolean
  /** Total failures (for metrics) */
  totalFailures: number
  /** Last successful request timestamp */
  lastSuccess: number
  /** Timestamp when circuit entered half-open state */
  halfOpenSince: number
}

/** In-memory circuit states per provider */
const circuits = new Map<string, CircuitState>()

/** Number of consecutive failures before opening circuit */
const FAILURE_THRESHOLD = 3

/** Time in ms before attempting recovery (1 minute) */
const RECOVERY_TIME_MS = 60_000

/** Time in ms before resetting failure count after success (5 minutes) */
const SUCCESS_RESET_TIME_MS = 300_000

/** Redis key prefix for circuit breaker state */
const REDIS_KEY_PREFIX = 'circuit-breaker:'

/** TTL for Redis circuit state (1 hour - auto-cleanup of stale states) */
const REDIS_STATE_TTL_SECONDS = 3600

// ============================================================================
// Redis Persistence Layer
// ============================================================================

/**
 * Check if Upstash Redis is configured
 */
const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

/** Lazy-initialized Redis client */
let redis: Redis | null = null

/**
 * Get Redis client (lazy initialization)
 */
function getRedisClient(): Redis | null {
  if (!isUpstashConfigured) return null

  if (!redis) {
    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
      logger.info('Circuit breaker: Upstash Redis initialized for persistent state')
    } catch (error) {
      logger.error('Circuit breaker: Failed to initialize Redis', { error: String(error) })
      return null
    }
  }

  return redis
}

/**
 * Persist circuit state to Redis (fire-and-forget)
 * Does not block the main execution path
 */
async function persistToRedis(provider: string, state: CircuitState): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    const key = `${REDIS_KEY_PREFIX}${provider}`
    await client.set(key, JSON.stringify(state), { ex: REDIS_STATE_TTL_SECONDS })
  } catch (error) {
    // Log but don't fail - Redis persistence is best-effort
    logger.warn('Circuit breaker: Failed to persist state to Redis', {
      provider,
      error: String(error),
    })
  }
}

/**
 * Load circuit state from Redis
 */
async function loadFromRedis(provider: string): Promise<CircuitState | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    const key = `${REDIS_KEY_PREFIX}${provider}`
    const data = await client.get<string>(key)
    if (!data) return null

    const state = JSON.parse(data) as CircuitState
    // Sync to in-memory cache
    circuits.set(provider, state)
    return state
  } catch (error) {
    logger.warn('Circuit breaker: Failed to load state from Redis', {
      provider,
      error: String(error),
    })
    return null
  }
}

/**
 * Clear circuit state from Redis
 */
async function clearFromRedis(provider: string): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    const key = `${REDIS_KEY_PREFIX}${provider}`
    await client.del(key)
  } catch (error) {
    logger.warn('Circuit breaker: Failed to clear state from Redis', {
      provider,
      error: String(error),
    })
  }
}

/**
 * Clear all circuit states from Redis
 */
async function clearAllFromRedis(): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    const keys = await client.keys(`${REDIS_KEY_PREFIX}*`)
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => client.del(key)))
    }
  } catch (error) {
    logger.warn('Circuit breaker: Failed to clear all states from Redis', {
      error: String(error),
    })
  }
}

/**
 * Get the storage mode currently in use
 */
export function getCircuitBreakerMode(): 'distributed' | 'in-memory' {
  return isUpstashConfigured ? 'distributed' : 'in-memory'
}

/**
 * Initialize circuit breaker state from Redis
 *
 * Call this on server startup to load persisted circuit states.
 * This ensures circuit breaker state survives server restarts.
 *
 * @param providers - List of providers to load (default: all known providers)
 */
export async function initializeFromRedis(
  providers: string[] = ['openai', 'anthropic', 'google', 'xai']
): Promise<void> {
  if (!isUpstashConfigured) {
    logger.info('Circuit breaker: Using in-memory storage (Upstash not configured)')
    return
  }

  logger.info('Circuit breaker: Loading state from Redis', { providers })

  const results = await Promise.allSettled(providers.map(loadFromRedis))

  let loadedCount = 0
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled' && result.value) {
      loadedCount++
      const state = result.value
      if (state.state === 'open') {
        logger.warn(`Circuit breaker: Provider ${providers[i]} loaded in OPEN state`, {
          provider: providers[i],
          failures: state.failures,
          lastFailure: new Date(state.lastFailure).toISOString(),
        })
      }
    }
  }

  logger.info('Circuit breaker: Initialization complete', {
    mode: 'distributed',
    loadedCount,
    totalProviders: providers.length,
  })
}

/**
 * Check if the circuit is open for a provider (async version)
 *
 * This version loads state from Redis if not found in memory.
 * Prefer this for initial checks after server restart.
 *
 * @param provider - Provider identifier
 * @returns true if circuit is open (provider unhealthy), false otherwise
 */
export async function isCircuitOpenAsync(provider: string): Promise<boolean> {
  // Check in-memory cache first
  let circuitState = circuits.get(provider)

  // If not in memory, try to load from Redis
  if (!circuitState && isUpstashConfigured) {
    circuitState = await loadFromRedis(provider) ?? undefined
  }

  if (!circuitState) return false

  const now = Date.now()

  // Explicit state machine handling
  switch (circuitState.state) {
    case 'closed':
      return false

    case 'half-open':
      return false

    case 'open':
      // Check if recovery time has passed - transition to half-open
      if (now - circuitState.lastFailure > RECOVERY_TIME_MS) {
        circuitState.state = 'half-open'
        circuitState.halfOpenSince = now
        circuits.set(provider, circuitState)
        persistToRedis(provider, circuitState).catch(() => {})
        logger.info(`Circuit half-open for ${provider}, allowing test request`, {
          provider,
          timeSinceFailure: now - circuitState.lastFailure,
        })
        return false
      }
      return true

    default:
      return circuitState.isOpen
  }
}

/**
 * Check if the circuit is open for a provider
 *
 * When open, callers should skip this provider and try fallback.
 * After recovery time, circuit enters "half-open" state allowing
 * a single test request.
 *
 * @param provider - Provider identifier ('openai' | 'anthropic' | 'google' | 'xai')
 * @returns true if circuit is open (provider unhealthy), false otherwise
 */
export function isCircuitOpen(provider: string): boolean {
  const circuitState = circuits.get(provider)
  if (!circuitState) return false

  const now = Date.now()

  // Explicit state machine handling
  switch (circuitState.state) {
    case 'closed':
      return false

    case 'half-open':
      // In half-open, allow requests through for testing
      return false

    case 'open':
      // Check if recovery time has passed - transition to half-open
      if (now - circuitState.lastFailure > RECOVERY_TIME_MS) {
        circuitState.state = 'half-open'
        circuitState.halfOpenSince = now
        logger.info(`Circuit half-open for ${provider}, allowing test request`, {
          provider,
          timeSinceFailure: now - circuitState.lastFailure,
        })
        return false
      }
      return true

    default:
      return circuitState.isOpen // Fallback for unknown state
  }
}

/**
 * Record a failure for a provider
 *
 * Increments failure count and potentially opens the circuit.
 * Call this when a provider request fails with a recoverable error.
 *
 * @param provider - Provider identifier ('openai' | 'anthropic' | 'google' | 'xai')
 * @param error - Optional error message for logging
 */
export function recordFailure(provider: string, error?: string): void {
  const now = Date.now()
  const existing = circuits.get(provider)

  const circuitState: CircuitState = existing ?? {
    state: 'closed',
    failures: 0,
    lastFailure: 0,
    isOpen: false,
    totalFailures: 0,
    lastSuccess: 0,
    halfOpenSince: 0,
  }

  circuitState.failures++
  circuitState.totalFailures++
  circuitState.lastFailure = now

  // State machine transitions on failure
  if (circuitState.state === 'half-open') {
    // Failed during recovery test - re-open the circuit
    circuitState.state = 'open'
    circuitState.isOpen = true
    circuitState.halfOpenSince = 0
    logger.warn(`Circuit re-opened for ${provider} after failed recovery test`, {
      provider,
      failures: circuitState.failures,
      totalFailures: circuitState.totalFailures,
      error,
    })
  } else if (circuitState.failures >= FAILURE_THRESHOLD) {
    // Threshold reached - open the circuit
    circuitState.state = 'open'
    circuitState.isOpen = true
    logger.warn(`Circuit opened for ${provider} after ${circuitState.failures} failures`, {
      provider,
      failures: circuitState.failures,
      totalFailures: circuitState.totalFailures,
      error,
    })
  } else {
    logger.info(`Recorded failure for ${provider}`, {
      provider,
      failures: circuitState.failures,
      threshold: FAILURE_THRESHOLD,
      currentState: circuitState.state,
      error,
    })
  }

  circuits.set(provider, circuitState)

  // Persist to Redis (fire-and-forget, non-blocking)
  persistToRedis(provider, circuitState).catch(() => {
    // Error already logged in persistToRedis
  })
}

/**
 * Record a successful request for a provider
 *
 * Resets the circuit to closed state and clears failure count.
 * Call this after a successful provider request.
 *
 * @param provider - Provider identifier ('openai' | 'anthropic' | 'google' | 'xai')
 */
export function recordSuccess(provider: string): void {
  const existing = circuits.get(provider)

  // Log recovery if coming from open or half-open state
  if (existing?.state === 'open' || existing?.state === 'half-open') {
    logger.info(`Circuit closed for ${provider} after successful recovery`, {
      provider,
      previousState: existing.state,
      previousFailures: existing.failures,
      recoveryTimeMs: existing.halfOpenSince ? Date.now() - existing.halfOpenSince : 0,
    })
  }

  // Reset the circuit on success - explicit state machine transition to closed
  const newState: CircuitState = {
    state: 'closed',
    failures: 0,
    lastFailure: existing?.lastFailure ?? 0,
    isOpen: false,
    totalFailures: existing?.totalFailures ?? 0,
    lastSuccess: Date.now(),
    halfOpenSince: 0,
  }
  circuits.set(provider, newState)

  // Persist to Redis (fire-and-forget, non-blocking)
  persistToRedis(provider, newState).catch(() => {
    // Error already logged in persistToRedis
  })
}

/**
 * Get the current circuit state for a provider
 *
 * Useful for monitoring and debugging.
 *
 * @param provider - Provider identifier ('openai' | 'anthropic' | 'google' | 'xai')
 * @returns Circuit state or undefined if no state exists
 */
export function getCircuitState(provider: string): CircuitState | undefined {
  return circuits.get(provider)
}

/**
 * Get health status for all providers
 *
 * Returns a summary of circuit states for monitoring dashboards.
 *
 * @returns Object with provider health status
 */
export function getProviderHealth(): Record<string, {
  healthy: boolean
  state: CircuitStateType
  failures: number
  totalFailures: number
  lastFailure: number | null
  lastSuccess: number | null
}> {
  const providers = ['openai', 'anthropic', 'google', 'xai']
  const health: Record<string, {
    healthy: boolean
    state: CircuitStateType
    failures: number
    totalFailures: number
    lastFailure: number | null
    lastSuccess: number | null
  }> = {}

  for (const provider of providers) {
    const circuitState = circuits.get(provider)
    health[provider] = {
      healthy: circuitState?.state === 'closed' || !circuitState,
      state: circuitState?.state ?? 'closed',
      failures: circuitState?.failures ?? 0,
      totalFailures: circuitState?.totalFailures ?? 0,
      lastFailure: circuitState?.lastFailure || null,
      lastSuccess: circuitState?.lastSuccess || null,
    }
  }

  return health
}

/**
 * Reset all circuit states
 *
 * Clears both in-memory and Redis storage.
 * Use for testing or manual recovery.
 */
export function resetAllCircuits(): void {
  circuits.clear()

  // Clear Redis storage (fire-and-forget, non-blocking)
  clearAllFromRedis().catch(() => {
    // Error already logged in clearAllFromRedis
  })

  logger.info('All circuit breakers reset', {
    mode: getCircuitBreakerMode(),
  })
}

/**
 * Check if an error is a provider error that should trigger circuit breaker
 *
 * Returns true for errors that indicate provider issues:
 * - Network errors (timeouts, connection refused)
 * - Rate limits (429)
 * - Service unavailable (502, 503)
 *
 * Returns false for errors that are request-specific:
 * - Invalid API key (401)
 * - Bad request (400)
 * - Content policy violations
 *
 * @param error - The error to check
 * @returns true if this is a provider-level error
 */
export function isProviderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const lowerMessage = message.toLowerCase()

  // Provider-level errors that should trigger circuit breaker
  const providerErrorPatterns = [
    /network/i,
    /timeout/i,
    /abort/i,
    /503/,
    /502/,
    /404/,
    /429/,
    /rate.?limit/i,
    /service.?unavailable/i,
    /connection.?refused/i,
    /econnrefused/i,
    /enotfound/i,
    /etimedout/i,
    /socket.?hang.?up/i,
    /overloaded/i,
    /capacity/i,
    /model.+(not found|unknown|invalid|unsupported)/i,
    /(not found|unknown|invalid) model/i,
  ]

  return providerErrorPatterns.some(pattern => pattern.test(lowerMessage))
}
