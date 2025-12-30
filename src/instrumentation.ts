/**
 * Next.js Instrumentation
 *
 * This file is automatically loaded by Next.js during server startup.
 * Used for one-time initialization tasks like pre-warming caches and
 * loading persisted state.
 *
 * Startup tasks:
 * 1. Initialize circuit breaker state from Redis (if configured)
 * 2. Pre-warm knowledge embeddings to avoid cold-start latency
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const startTime = Date.now()

    // 1. Initialize circuit breaker state from Redis (if configured)
    // This ensures circuit breaker state survives server restarts
    const { initializeFromRedis, getCircuitBreakerMode } = await import('@/lib/ai/circuit-breaker')
    await initializeFromRedis()

    // 2. Pre-warm knowledge embeddings to avoid cold-start latency on first user query
    const { warmupKnowledgeEmbeddings } = await import('@/lib/ai/tools')
    await warmupKnowledgeEmbeddings()

    // Log startup completion
    const { logger } = await import('@/lib/logger')
    logger.info('Server warmup complete', {
      durationMs: Date.now() - startTime,
      circuitBreakerMode: getCircuitBreakerMode(),
    })
  }
}
