import { NextRequest, NextResponse } from 'next/server'
import { clearAllRateLimits, getRateLimitMode } from '@/lib/ai/rate-limiter'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * Development-only endpoint to clear all rate limits
 *
 * Security: This endpoint is protected by multiple layers:
 * 1. Production block (deny-list approach - blocks if ANY env indicates production)
 * 2. Development check (NODE_ENV must be 'development')
 * 3. REQUIRED secret token (DEV_SECRET header must match DEV_SECRET env var)
 * 4. Optional support for DEV_API_TOKEN (X-Dev-Token header)
 *
 * Usage: POST /api/dev/clear-rate-limits
 * Headers:
 *   - X-Dev-Secret: <DEV_SECRET value> (REQUIRED in development)
 *   - X-Dev-Token: <DEV_API_TOKEN value> (optional additional check)
 *
 * Note: This only clears in-memory rate limits. Distributed (Upstash) rate limits
 * cannot be cleared from this endpoint for security reasons.
 */
export async function POST(request: NextRequest) {
  // Layer 1: Explicit production block (deny-list approach - more secure)
  // Block if ANY environment variable indicates production
  const isVercelProduction = process.env.VERCEL_ENV === 'production'
  const isReplitProduction = process.env.REPLIT_ENV === 'production'
  const isNodeProduction = process.env.NODE_ENV === 'production'

  if (isVercelProduction || isReplitProduction || isNodeProduction) {
    // In production, return 404 to not reveal endpoint existence
    return NextResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    )
  }

  // Layer 2: Require explicit development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not Found' },
      { status: 404 }
    )
  }

  // Layer 3: REQUIRED secret validation (DEV_SECRET)
  // This secret MUST be set and provided to use this endpoint
  const devSecret = process.env.DEV_SECRET
  if (!devSecret) {
    logger.warn('[Dev Endpoint] DEV_SECRET not configured - endpoint disabled')
    return NextResponse.json(
      { error: 'Endpoint not configured' },
      { status: 503 }
    )
  }

  const providedSecret = request.headers.get('X-Dev-Secret')
  if (!providedSecret || providedSecret !== devSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Layer 4: Optional token validation (additional protection)
  // If DEV_API_TOKEN is set, also require it in the request header
  const devToken = process.env.DEV_API_TOKEN
  if (devToken) {
    const providedToken = request.headers.get('X-Dev-Token')
    if (providedToken !== devToken) {
      return NextResponse.json(
        { error: 'Invalid or missing dev token' },
        { status: 401 }
      )
    }
  }

  // Check rate limit mode
  const mode = getRateLimitMode()

  // Clear in-memory rate limits
  clearAllRateLimits()

  return NextResponse.json({
    success: true,
    message: 'In-memory rate limits cleared',
    rateLimitMode: mode,
    note: mode === 'distributed'
      ? 'Distributed (Upstash) rate limits were NOT cleared. Use Upstash dashboard to manage.'
      : 'All rate limits cleared (in-memory mode)',
  })
}
