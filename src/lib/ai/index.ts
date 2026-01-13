/**
 * AI Domain - Barrel Export
 *
 * Consolidated exports for AI/MetaDJai configuration, providers,
 * rate limiting, caching, and utilities.
 */

// Configuration
export {
  getAIRequestTimeout,
  createStopCondition,
  isTimeoutError,
} from "./config"

// Circuit breaker
export {
  isCircuitOpen,
  isCircuitOpenAsync,
  isProviderError,
  recordFailure,
  recordSuccess,
  getCircuitBreakerMode,
  initializeFromRedis,
  getProviderHealth,
  resetAllCircuits,
} from "./circuit-breaker"

// Failover
export { isFailoverEnabled } from "./failover"

// Providers (model configuration)
export {
  getPrimaryModel,
  getModel,
  getModelInfo,
  getModelSettings,
  getFallbackModel,
  isFailoverAvailable,
  type ModelSettings,
} from "./providers"

// Rate limiting
export {
  checkRateLimit,
  getRateLimitMode,
  clearAllRateLimits,
  getClientIdentifier,
  type RateLimitResult,
} from "./rate-limiter"

// System instructions & token budget
export {
  buildMetaDjAiSystemInstructions,
  estimateTokenCount,
  checkTokenBudget,
  SYSTEM_PROMPT_TOKEN_BUDGET,
  type TokenBudgetStatus,
} from "./meta-dj-ai-prompt"

// Tools
export { getTools } from "./tools"

// Validation
export { validateMetaDjAiRequest } from "./validation"

// Cache
export {
  getCachedResponse,
  setCachedResponse,
  clearCache,
  getCacheStats,
} from "./cache"

// Error mapping
export {
  mapErrorToUserMessage,
  withErrorMapping,
  type ErrorMapping,
} from "./errors"

// Stream recovery
export {
  classifyStreamError,
  isRecoverableStreamError,
  getStreamErrorMessage,
  withStreamRecovery,
  createRecoverableStreamResponse,
  type StreamErrorType,
  type StreamRecoveryOptions,
} from "./stream-recovery"
