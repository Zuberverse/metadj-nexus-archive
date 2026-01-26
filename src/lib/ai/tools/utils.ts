/**
 * AI Tool Utilities
 *
 * Shared utilities for AI tool validation, sanitization, and error handling.
 *
 * SECURITY CONSIDERATIONS:
 * - Tool results are returned to the AI model for processing
 * - Large results can consume excessive tokens and increase costs
 * - All tool results should be size-limited to prevent abuse
 * - Tool outputs are sanitized to prevent indirect prompt injection
 *
 * DESIGN PRINCIPLES:
 * - Generous limits for normal usage, strict limits for edge cases
 * - Graceful degradation with truncation rather than hard failures
 * - Clear metadata when results are modified
 *
 * @module lib/ai/tools/utils
 */

import { logger } from "@/lib/logger"

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum size (in characters) for serialized tool results
 *
 * Rationale: 24,000 chars (~6,000 tokens) allows for:
 * - Full catalog summary with 30 collections
 * - Knowledge base search results with rich content
 * - Recommendation lists with metadata
 *
 * This is generous enough for comprehensive responses while preventing
 * runaway token consumption from malformed data.
 */
export const MAX_TOOL_RESULT_SIZE = 24000

/**
 * Maximum number of search results returned
 *
 * Rationale: 10 results provides enough variety for discovery while
 * keeping response size manageable. Users can refine search queries
 * for more specific results.
 */
export const MAX_SEARCH_RESULTS = 10

/**
 * Maximum number of recommendations returned
 *
 * Rationale: 10 recommendations balances variety with digestibility.
 * More would overwhelm users; fewer might miss relevant suggestions.
 */
export const MAX_RECOMMENDATIONS = 10

/**
 * Maximum number of tracks for active control operations (queue, playlist)
 *
 * Rationale: 50 tracks is enough for substantial playlists while
 * preventing abuse. Larger operations should be done incrementally.
 */
export const MAX_ACTIVE_CONTROL_TRACKS = 50

/**
 * Default limit for active control operations
 *
 * Rationale: 20 tracks is a sensible default for queue operations -
 * enough for an hour+ of listening without overwhelming the queue.
 */
export const DEFAULT_ACTIVE_CONTROL_LIMIT = 20

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tool result with optional metadata about processing
 */
export interface ToolResultMeta {
  _meta?: {
    truncated: boolean
    originalSize?: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INJECTION PROTECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Patterns that may indicate prompt injection attempts in tool outputs
 * These are sanitized to prevent indirect prompt injection attacks
 */
const INJECTION_PATTERNS = [
  // System instruction override attempts
  /(?:^|\n)\s*system\s*:\s*/gi,
  /\b(ignore|forget)\s+(all\s+)?(previous\s+)?(instructions?|prompts?|rules?)/gi,
  /\byou\s+(are|must|should)\s+now\b/gi,
  /(?:^|\n)\s*new\s+instructions?\s*:/gi,
  /\bdeveloper\s+message\b/gi,
  /\b(system|developer|assistant)\s+prompt\b/gi,
  /\b(begin|end)\s+(system|developer|assistant|prompt)\b/gi,
  /<<+\s*(system|developer|assistant)\s*>>+/gi,
  // Role manipulation
  /\b(act|behave|respond)\s+as\s+(if\s+you\s+are|a)\b/gi,
  /(?:^|\n)\s*role\s*:\s*/gi,
  /(?:^|\n)\s*assistant\s*:\s*/gi,
  // Prompt delimiter injection
  /```+\s*(system|assistant|user)/gi,
  /<\/?(?:system|assistant|user)>/gi,
  // Command injection patterns
  /(?:^|\n)\s*execute\s*:\s*/gi,
  /\brun\s+command\b/gi,
]

function normalizeToolText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u200b-\u200f\u2028-\u202f\ufeff]/g, "")
}

/**
 * Sanitize a string value to prevent indirect prompt injection
 *
 * @param value - String to sanitize
 * @returns Sanitized string with injection patterns neutralized
 */
function sanitizeInjectionPatterns(value: string): string {
  let sanitized = normalizeToolText(value)
  sanitized = sanitized.replace(/<[^>]*>/g, "")
  sanitized = sanitized.replace(/```[\s\S]*?```/g, "[filtered code block]")
  sanitized = sanitized.replace(/`{1,3}/g, "")

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      // Replace with bracketed version to neutralize without losing context
      const prefix = match.startsWith("\n") ? "\n" : ""
      const cleaned = match
        .replace(/[^\w\s]/g, "")
        .trim()
        .replace(/\s+/g, " ")
      return `${prefix}[filtered: ${cleaned}]`
    })
  }

  return sanitized
}

/**
 * Sanitize a user-provided input query to prevent indirect prompt injection
 *
 * Use this for search queries and other user-provided input that will be
 * processed or returned to the AI model.
 *
 * @param query - User-provided query string
 * @param maxLength - Maximum length of the query (default 200)
 * @returns Sanitized query string
 */
export function sanitizeInputQuery(query: string, maxLength = 200): string {
  // First truncate to prevent excessive length
  const truncated = query.slice(0, maxLength).trim()
  // Then apply injection pattern filtering
  return sanitizeInjectionPatterns(truncated)
}

/**
 * Recursively sanitize all string values in an object to prevent injection
 *
 * @param obj - Object to sanitize
 * @returns Sanitized copy of the object
 */
function sanitizeToolOutput<T>(obj: T): T {
  if (typeof obj === "string") {
    return sanitizeInjectionPatterns(obj) as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeToolOutput(item)) as T
  }

  if (typeof obj === "object" && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeToolOutput((obj as Record<string, unknown>)[key])
    }
    return result as T
  }

  return obj
}

// ─────────────────────────────────────────────────────────────────────────────
// SIZE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate and potentially truncate tool results to prevent oversized responses
 *
 * @param result - The tool result to validate
 * @param toolName - Name of the tool for logging
 * @returns Validated result, potentially truncated with _meta.truncated flag
 */
function validateToolResultSize<T>(result: T, toolName: string): T & ToolResultMeta {
  const serialized = JSON.stringify(result)
  const size = serialized.length

  if (size > MAX_TOOL_RESULT_SIZE) {
    logger.warn(`Tool result exceeds size limit`, {
      tool: toolName,
      size,
      limit: MAX_TOOL_RESULT_SIZE,
    })

    // For arrays, truncate to fit and add metadata
    if (Array.isArray(result)) {
      let truncated = [...result]
      while (JSON.stringify(truncated).length > MAX_TOOL_RESULT_SIZE && truncated.length > 1) {
        truncated = truncated.slice(0, Math.floor(truncated.length * 0.8))
      }
      // Return as object with array and meta for arrays
      return {
        items: truncated,
        _meta: { truncated: true, originalSize: size },
      } as unknown as T & ToolResultMeta
    }

    // For objects with arrays, try to find and truncate the main array
    if (typeof result === "object" && result !== null) {
      const obj = { ...result } as Record<string, unknown>
      let wasTruncated = false
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) {
          let arr = [...(obj[key] as unknown[])]
          const originalLength = arr.length
          while (JSON.stringify(obj).length > MAX_TOOL_RESULT_SIZE && arr.length > 1) {
            arr = arr.slice(0, Math.floor(arr.length * 0.8))
            obj[key] = arr
          }
          if (arr.length < originalLength) {
            wasTruncated = true
          }
        }
      }
      if (wasTruncated) {
        obj._meta = { truncated: true, originalSize: size }
      }
      return obj as T & ToolResultMeta
    }
  }

  return result as T & ToolResultMeta
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate, sanitize, and size-limit tool results
 *
 * Combines injection protection with size validation.
 * Use this as the final step before returning tool results.
 *
 * @param result - The tool result to process
 * @param toolName - Name of the tool for logging
 * @returns Sanitized and validated result
 */
export function sanitizeAndValidateToolResult<T>(result: T, toolName: string): T {
  // First sanitize for injection protection
  const sanitized = sanitizeToolOutput(result)

  // Then validate size
  return validateToolResultSize(sanitized, toolName)
}

/**
 * Wraps a tool execute function with error handling and observability
 *
 * Provides graceful degradation when tool execution fails:
 * - Logs tool invocations for observability and debugging
 * - Catches and logs errors
 * - Returns user-friendly error messages to the AI
 * - Prevents tool failures from crashing the entire request
 *
 * @param toolName - Name of the tool for logging and error messages
 * @param handler - The async tool handler function
 * @returns Wrapped handler that catches errors
 */
export function safeToolExecute<TInput, TOutput>(
  toolName: string,
  handler: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<TOutput | { error: string; toolName: string }> {
  return async (input: TInput) => {
    const startTime = Date.now()
    const inputSummary = JSON.stringify(input).slice(0, 200)

    // Log tool invocation for observability
    logger.info(`Tool invoked: ${toolName}`, {
      tool: toolName,
      inputSummary,
    })

    try {
      const result = await handler(input)
      const durationMs = Date.now() - startTime

      // Log successful completion
      logger.info(`Tool completed: ${toolName}`, {
        tool: toolName,
        durationMs,
        success: true,
      })

      return result
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      logger.error(`Tool execution failed: ${toolName}`, {
        tool: toolName,
        error: errorMessage,
        input: JSON.stringify(input).slice(0, 500), // Truncate for logging
        durationMs,
        success: false,
      })

      return {
        error: `The ${toolName} tool encountered an issue and couldn't complete. Please try again or rephrase your request.`,
        toolName,
      }
    }
  }
}

/**
 * Wraps all tools in an object with error handling
 *
 * Creates a copy of each tool with the execute function wrapped in error handling.
 * Type information is intentionally relaxed to allow the SDK to infer types from
 * the inputSchema at runtime rather than requiring strict type alignment.
 *
 * @param tools - Object containing tool definitions with execute functions
 * @returns Tools object with wrapped execute functions
 */
export function wrapToolsWithErrorHandling<T extends Record<string, unknown>>(tools: T): T {
  const wrapped: Record<string, unknown> = {}

  for (const [name, tool] of Object.entries(tools)) {
    if (
      tool &&
      typeof tool === "object" &&
      "execute" in tool &&
      typeof (tool as { execute: unknown }).execute === "function"
    ) {
      const typedTool = tool as { execute: (input: unknown) => Promise<unknown> }
      wrapped[name] = {
        ...tool,
        execute: safeToolExecute(name, typedTool.execute),
      }
    } else {
      wrapped[name] = tool
    }
  }

  return wrapped as T
}

// ─────────────────────────────────────────────────────────────────────────────
// STRING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize text for catalog searching
 * Strips accents, lowercases, removes extra whitespace
 */
export function normalizeCatalogText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching in search
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // If one string is empty, return the length of the other
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  // Build the matrix
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[a.length][b.length]
}

/**
 * Calculate string similarity as a percentage (0-1)
 */
export function stringSimilarity(a: string, b: string): number {
  const normalA = normalizeCatalogText(a)
  const normalB = normalizeCatalogText(b)
  const maxLength = Math.max(normalA.length, normalB.length)
  if (maxLength === 0) return 1
  return 1 - levenshteinDistance(normalA, normalB) / maxLength
}

/**
 * Check if query fuzzy matches target above threshold
 */
export function fuzzyMatch(query: string, target: string, threshold = 0.7): boolean {
  const normalQuery = normalizeCatalogText(query)
  const normalTarget = normalizeCatalogText(target)

  // Exact substring match
  if (normalTarget.includes(normalQuery)) return true

  // Word-level matching
  const queryWords = normalQuery.split(" ").filter(Boolean)
  const targetWords = normalTarget.split(" ").filter(Boolean)

  // All query words should appear in target (partial match)
  const allWordsMatch = queryWords.every((qw) =>
    targetWords.some((tw) => tw.includes(qw) || stringSimilarity(qw, tw) >= threshold)
  )
  if (allWordsMatch) return true

  // Overall similarity
  return stringSimilarity(normalQuery, normalTarget) >= threshold
}
