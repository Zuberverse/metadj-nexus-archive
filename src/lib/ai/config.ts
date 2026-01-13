/**
 * MetaDJai Shared Configuration
 *
 * Centralized constants for MetaDJai AI routes.
 * Single source of truth for timeout, limits, and other shared values.
 *
 * @module lib/ai/config
 */

import { stepCountIs } from 'ai'

/** Default AI request timeout in milliseconds (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30000

/**
 * Route-specific timeout defaults (in milliseconds)
 * Streaming and tool-calling routes get longer timeouts by default
 */
const ROUTE_TIMEOUT_DEFAULTS: Record<string, number> = {
  stream: 90000,      // 90s - Streaming with tool calls can take longer
  chat: 30000,        // 30s - Standard chat completions
  transcribe: 45000,  // 45s - Audio transcription varies by length
  tools: 90000,       // 90s - Multi-step tool calling needs more time
}

/**
 * Get configured timeout for AI requests
 *
 * Configuration priority:
 * 1. Route-specific env: AI_TIMEOUT_{ROUTE} (e.g., AI_TIMEOUT_STREAM=60000)
 * 2. Global env: AI_REQUEST_TIMEOUT_MS
 * 3. Route-specific default from ROUTE_TIMEOUT_DEFAULTS
 * 4. Global default (30s)
 *
 * @param route - Optional route identifier for route-specific timeout
 * @returns Timeout in milliseconds
 */
export function getAIRequestTimeout(route?: string): number {
  // 1. Check route-specific env var
  if (route) {
    const routeEnv = process.env[`AI_TIMEOUT_${route.toUpperCase()}`]
    if (routeEnv) {
      const parsed = parseInt(routeEnv, 10)
      if (!isNaN(parsed) && parsed > 0) {
        return parsed
      }
    }
  }

  // 2. Check global env var
  const globalEnv = process.env.AI_REQUEST_TIMEOUT_MS
  if (globalEnv) {
    const parsed = parseInt(globalEnv, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }

  // 3. Use route-specific default
  if (route && route in ROUTE_TIMEOUT_DEFAULTS) {
    return ROUTE_TIMEOUT_DEFAULTS[route]
  }

  // 4. Fall back to global default
  return DEFAULT_TIMEOUT_MS
}

/** Maximum number of tool-calling steps before forcing stop */
export const MAX_TOOL_STEPS = 3

/** Temperature for AI model responses (0.7 for balanced consistency/creativity) */
export const DEFAULT_TEMPERATURE = 0.7

/**
 * Stop condition for multi-step tool calling
 *
 * Combines custom logic with step count limit for safety:
 * - Custom logic: Allows one step for tool calling and one for response
 * - Step count: Hard limit at MAX_TOOL_STEPS for safety ceiling
 *
 * Used by both streaming and non-streaming routes.
 */
export function createStopCondition() {
  // Custom condition that allows tool call + response pattern
  const customCondition = ({ steps }: { steps: Array<{ finishReason?: string }> }) => {
    if (steps.length === 0) return false
    const last = steps[steps.length - 1]
    if (last?.finishReason === 'tool-calls') {
      return steps.length >= 2
    }
    return true
  }

  // Return array of conditions - either one can stop the generation
  // This provides a safety ceiling while allowing normal tool patterns
  return [customCondition, stepCountIs(MAX_TOOL_STEPS)]
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') {
    return true
  }
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('timeout') || message.includes('aborted') || message.includes('abort')
}
