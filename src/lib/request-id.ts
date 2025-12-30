/**
 * Request ID Tracing
 *
 * Provides correlation IDs for request tracing across AI operations.
 * Each request gets a unique ID that flows through all logs and responses.
 *
 * Features:
 * - Generate unique request IDs (crypto-random)
 * - Extract request ID from headers (X-Request-ID)
 * - Attach request ID to responses
 *
 * @module lib/request-id
 */

import { randomBytes } from 'crypto'
import { NextRequest } from 'next/server'

/** Header name for request ID (standard convention) */
export const REQUEST_ID_HEADER = 'X-Request-ID'

/** Response header for request ID */
export const RESPONSE_REQUEST_ID_HEADER = 'X-Request-ID'

/**
 * Generate a unique request ID
 *
 * Uses crypto.randomBytes for uniqueness and performance.
 * Format: 16 hex characters (8 bytes = 64 bits of entropy)
 *
 * @returns Unique request ID string
 */
export function generateRequestId(): string {
  return randomBytes(8).toString('hex')
}

/**
 * Extract request ID from incoming request or generate a new one
 *
 * Prefers the incoming X-Request-ID header if present (for distributed tracing).
 * Falls back to generating a new ID if not present.
 *
 * @param request - Next.js request object
 * @returns Request ID string
 */
export function getRequestId(request: NextRequest): string {
  const existingId = request.headers.get(REQUEST_ID_HEADER)

  if (existingId && existingId.length > 0 && existingId.length <= 64) {
    // Validate and sanitize the incoming ID (alphanumeric + dashes only)
    const sanitized = existingId.replace(/[^a-zA-Z0-9-]/g, '')
    if (sanitized.length > 0) {
      return sanitized
    }
  }

  return generateRequestId()
}

/**
 * Get response headers with request ID
 *
 * Creates a Headers object with the request ID set for tracing.
 * Can be merged with other headers.
 *
 * @param requestId - Request ID to include
 * @param additionalHeaders - Optional additional headers to merge
 * @returns Headers object
 */
export function getRequestIdHeaders(
  requestId: string,
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  return {
    [RESPONSE_REQUEST_ID_HEADER]: requestId,
    ...additionalHeaders,
  }
}

/**
 * Create a log context object with request ID
 *
 * Use this to ensure all log statements include the request ID.
 *
 * @param requestId - Request ID
 * @param additionalContext - Additional context to merge
 * @returns Context object for logging
 */
export function createLogContext(
  requestId: string,
  additionalContext?: Record<string, unknown>
): Record<string, unknown> {
  return {
    requestId,
    ...additionalContext,
  }
}
