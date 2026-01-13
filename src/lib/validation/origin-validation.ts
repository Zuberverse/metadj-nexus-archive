/**
 * Origin Validation Utilities
 *
 * Provides CSRF protection via origin validation for API routes.
 * Used to verify requests originate from trusted sources.
 *
 * @module lib/validation/origin-validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAppBaseUrl, getPreviewBaseUrl } from '@/lib/app-url'

/**
 * Development origins that are always allowed
 */
const DEV_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:8100',
  'https://localhost:3000',
  'https://localhost:8100',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8100',
  'https://127.0.0.1:3000',
  'https://127.0.0.1:8100',
  'http://0.0.0.0:3000',
  'http://0.0.0.0:8100',
  'https://0.0.0.0:3000',
  'https://0.0.0.0:8100',
])

/**
 * Build the set of allowed hosts for origin validation
 */
function getAllowedHosts(request: NextRequest): Set<string> {
  const allowedHosts = new Set<string>()

  // Add production base URL
  const appBaseUrl = getAppBaseUrl()
  try {
    allowedHosts.add(new URL(appBaseUrl).host)
  } catch {
    // Ignore invalid URLs
  }

  // Add preview base URL if configured
  const previewBaseUrl = getPreviewBaseUrl()
  if (previewBaseUrl) {
    try {
      allowedHosts.add(new URL(previewBaseUrl).host)
    } catch {
      // Ignore invalid URLs
    }
  }

  // Add the current request host (handles edge cases like Replit)
  if (request.nextUrl?.host) {
    allowedHosts.add(request.nextUrl.host)
  }

  return allowedHosts
}

/**
 * Validate that a request originates from an allowed source
 *
 * @param request - The incoming request
 * @returns Object indicating if the origin is allowed
 */
export function validateOrigin(request: NextRequest): { allowed: boolean; origin: string | null } {
  const origin = request.headers.get('origin')

  // No origin header - could be same-origin or server-to-server
  // Allow for now but log for monitoring
  if (!origin) {
    return { allowed: true, origin: null }
  }

  // Check development origins
  if (DEV_ORIGINS.has(origin)) {
    return { allowed: true, origin }
  }

  // Check production origins
  const allowedHosts = getAllowedHosts(request)
  try {
    const originHost = new URL(origin).host
    if (allowedHosts.has(originHost)) {
      return { allowed: true, origin }
    }
  } catch {
    // Invalid origin URL
    return { allowed: false, origin }
  }

  return { allowed: false, origin }
}

/**
 * Build a forbidden response for origin validation failures
 */
export function buildOriginForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Forbidden: Invalid request origin' },
    { status: 403 }
  )
}

/**
 * Higher-order function that wraps a route handler with origin validation
 *
 * @param handler - The route handler to wrap
 * @returns Wrapped handler that validates origin before processing
 *
 * @example
 * export const POST = withOriginValidation(async (request) => {
 *   // Handler code here
 * })
 */
export function withOriginValidation(
  handler: (request: NextRequest) => Promise<Response>
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    const { allowed, origin } = validateOrigin(request)

    if (!allowed) {
      return buildOriginForbiddenResponse()
    }

    return handler(request)
  }
}
