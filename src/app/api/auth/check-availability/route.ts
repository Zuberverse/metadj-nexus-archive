/**
 * Check Availability API Route
 *
 * POST /api/auth/check-availability
 * Checks if a username or email is available for registration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkUsernameAvailability, checkEmailAvailability } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { resolveClientAddress } from '@/lib/network';
import { buildRateLimitError, buildRateLimitHeaders, createRateLimiter } from '@/lib/rate-limiting/rate-limiter-core';
import { withOriginValidation } from '@/lib/validation/origin-validation';
import { getMaxRequestSize, readJsonBodyWithLimit } from '@/lib/validation/request-size';

const AVAILABILITY_RATE_LIMIT = { maxRequests: 30, windowMs: 10 * 60 * 1000 };
const availabilityRateLimiter = createRateLimiter({
  prefix: 'metadj:ratelimit:auth-availability',
  maxRequests: AVAILABILITY_RATE_LIMIT.maxRequests,
  windowMs: AVAILABILITY_RATE_LIMIT.windowMs,
});

type AvailabilityPayload = {
  type?: 'username' | 'email';
  value?: string;
  excludeUserId?: string;
};

export const POST = withOriginValidation(async (request: NextRequest, _context: unknown) => {
  try {
    const { ip, fingerprint } = resolveClientAddress(request);
    const rateLimitId = ip !== 'unknown'
      ? `auth-availability-ip:${ip}`
      : `auth-availability-fp:${fingerprint}`;
    const rateLimit = await availabilityRateLimiter.check(rateLimitId);

    if (!rateLimit.allowed) {
      const error = buildRateLimitError(
        rateLimit.remainingMs ?? AVAILABILITY_RATE_LIMIT.windowMs,
        'Too many availability checks. Please wait before trying again.'
      );
      return NextResponse.json(
        { success: false, message: error.error, retryAfter: error.retryAfter },
        {
          status: 429,
          headers: buildRateLimitHeaders(rateLimit, AVAILABILITY_RATE_LIMIT.maxRequests),
        }
      );
    }

    const bodyResult = await readJsonBodyWithLimit<AvailabilityPayload>(
      request,
      getMaxRequestSize(request.nextUrl.pathname)
    );
    if (!bodyResult.ok) return bodyResult.response;

    const { type, value, excludeUserId } = bodyResult.data ?? {};

    if (!type || !value) {
      return NextResponse.json(
        { success: false, message: 'Type and value are required' },
        { status: 400 }
      );
    }

    if (type === 'username') {
      const result = await checkUsernameAvailability(value, excludeUserId);
      return NextResponse.json({
        success: true,
        available: result.available,
      });
    }

    if (type === 'email') {
      const result = await checkEmailAvailability(value, excludeUserId);
      return NextResponse.json({
        success: true,
        available: result.available,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid type. Must be "username" or "email"' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('[Auth] Check availability error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
});
