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
  'http://localhost:5000',
  'http://localhost:8100',
  'https://localhost:3000',
  'https://localhost:5000',
  'https://localhost:8100',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:8100',
  'https://127.0.0.1:3000',
  'https://127.0.0.1:5000',
  'https://127.0.0.1:8100',
  'http://0.0.0.0:3000',
  'http://0.0.0.0:5000',
  'http://0.0.0.0:8100',
  'https://0.0.0.0:3000',
  'https://0.0.0.0:5000',
  'https://0.0.0.0:8100',
])

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

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

  // Add Replit development domain if configured
  const replitDevDomain = process.env.REPLIT_DEV_DOMAIN
  if (replitDevDomain) {
    allowedHosts.add(replitDevDomain)
  }

  // Add Replit domains (comma-separated list)
  const replitDomains = process.env.REPLIT_DOMAINS
  if (replitDomains) {
    replitDomains.split(',').forEach(domain => {
      const trimmed = domain.trim()
      if (trimmed) {
        allowedHosts.add(trimmed)
      }
    })
  }

  // Add the current request host (handles edge cases like Replit)
  if (request.nextUrl?.host) {
    allowedHosts.add(request.nextUrl.host)
  }

  return allowedHosts
}

function isInternalRequest(request: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) return false
  const internalHeader = request.headers.get('x-internal-request')
  return internalHeader === secret
}

function isAllowedOrigin(origin: string, request: NextRequest): boolean {
  if (DEV_ORIGINS.has(origin)) {
    return true
  }

  const allowedHosts = getAllowedHosts(request)
  try {
    const originHost = new URL(origin).host
    return allowedHosts.has(originHost)
  } catch {
    return false
  }
}

function isAllowedReferer(referer: string, request: NextRequest): boolean {
  const allowedHosts = getAllowedHosts(request)
  try {
    const refererHost = new URL(referer).host
    return allowedHosts.has(refererHost)
  } catch {
    return false
  }
}

/**
 * Validate that a request originates from an allowed source
 *
 * @param request - The incoming request
 * @returns Object indicating if the origin is allowed
 */
export function validateOrigin(request: NextRequest): { allowed: boolean; origin: string | null } {
  if (isInternalRequest(request)) {
    return { allowed: true, origin: request.headers.get('origin') }
  }

  const origin = request.headers.get('origin')
  const method = request.method?.toUpperCase() ?? 'GET'
  const requiresOrigin = !SAFE_METHODS.has(method)

  // No origin header - could be same-origin or server-to-server
  // Allow only for safe methods; unsafe methods must present origin or referer
  if (!origin) {
    if (!requiresOrigin) {
      return { allowed: true, origin: null }
    }

    const referer = request.headers.get('referer')
    if (!referer) {
      return { allowed: false, origin: null }
    }

    return { allowed: isAllowedReferer(referer, request), origin: null }
  }

  if (origin === 'null') {
    return { allowed: false, origin }
  }

  // Check development origins
  return { allowed: isAllowedOrigin(origin, request), origin }
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
export function withOriginValidation<TContext = unknown>(
  handler: (request: NextRequest, context: TContext) => Promise<Response>
): (request: NextRequest, context: TContext) => Promise<Response> {
  return async (request: NextRequest, context: TContext) => {
    const { allowed, origin } = validateOrigin(request)

    if (!allowed) {
      return buildOriginForbiddenResponse()
    }

    return handler(request, context)
  }
}
