import { NextRequest, NextResponse } from "next/server"
import wisdomData from "@/data/wisdom-content.json"
import {
  checkWisdomRateLimit,
  WISDOM_MAX_REQUESTS_PER_WINDOW,
  WISDOM_RATE_LIMIT_WINDOW_MS,
} from "@/lib/rate-limiting/wisdom-rate-limiter"

export const revalidate = 3600

// ============================================================================
// Route Handler
// ============================================================================

/**
 * Returns wisdom content data with appropriate caching headers and rate limiting.
 *
 * Rate Limiting:
 * - 60 requests per minute per client
 * - Returns 429 Too Many Requests when exceeded
 *
 * Caching Strategy:
 * - max-age=3600: Content cached for 1 hour
 * - stale-while-revalidate=86400: Serve stale content for up to 24 hours while revalidating
 *
 * This reduces server load for static wisdom content while ensuring freshness
 * and protecting against potential abuse.
 *
 * @route GET /api/wisdom
 * @returns Wisdom content JSON
 * @throws {429} Rate limit exceeded
 */
/**
 * Standard CORS headers for wisdom endpoint
 * Allows cross-origin requests from any origin (public static content)
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
}

/**
 * Handle CORS preflight requests
 * Required for browsers making cross-origin requests
 *
 * @route OPTIONS /api/wisdom
 * @returns 204 No Content with CORS headers
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export async function GET(request: NextRequest) {
  // Rate limiting check
  const rateLimit = await checkWisdomRateLimit(request)
  if (!rateLimit.allowed) {
    const retryAfterSeconds = rateLimit.remainingMs
      ? Math.ceil(rateLimit.remainingMs / 1000)
      : Math.ceil(WISDOM_RATE_LIMIT_WINDOW_MS / 1000)

    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(WISDOM_MAX_REQUESTS_PER_WINDOW),
          'X-RateLimit-Reset': String(retryAfterSeconds),
        },
      }
    )
  }

  return NextResponse.json(wisdomData, {
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Type': 'application/json',
    },
  })
}
