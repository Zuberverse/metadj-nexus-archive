/**
 * Accept Terms API Route
 *
 * POST /api/auth/accept-terms
 * Allows authenticated users to accept updated terms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateUserTerms } from '@/lib/auth';
import { TERMS_VERSION } from '@/lib/constants/terms';
import { logger } from '@/lib/logger';
import { resolveClientAddress } from '@/lib/network';
import { buildRateLimitError, buildRateLimitHeaders, createRateLimiter } from '@/lib/rate-limiting/rate-limiter-core';
import { withOriginValidation } from '@/lib/validation/origin-validation';

const ACCEPT_TERMS_RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };
const acceptTermsRateLimiter = createRateLimiter({
  prefix: 'metadj:ratelimit:auth-accept-terms',
  maxRequests: ACCEPT_TERMS_RATE_LIMIT.maxRequests,
  windowMs: ACCEPT_TERMS_RATE_LIMIT.windowMs,
});

export const POST = withOriginValidation(async (request: NextRequest) => {
  try {
    // Apply rate limiting
    const { ip, fingerprint } = resolveClientAddress(request);
    const rateLimitId = ip !== 'unknown'
      ? `accept-terms-ip:${ip}`
      : `accept-terms-fp:${fingerprint}`;
    const rateLimit = await acceptTermsRateLimiter.check(rateLimitId);

    if (!rateLimit.allowed) {
      const error = buildRateLimitError(
        rateLimit.remainingMs ?? ACCEPT_TERMS_RATE_LIMIT.windowMs,
        'Too many requests. Please wait before trying again.'
      );
      return NextResponse.json(
        { success: false, message: error.error, retryAfter: error.retryAfter },
        {
          status: 429,
          headers: buildRateLimitHeaders(rateLimit, ACCEPT_TERMS_RATE_LIMIT.maxRequests),
        }
      );
    }

    // Check if user is authenticated
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update user terms
    const updatedUser = await updateUserTerms(session.id, TERMS_VERSION);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'Failed to update terms' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      termsVersion: TERMS_VERSION,
    });
  } catch (error) {
    logger.error('[Auth] Accept terms error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to accept terms' },
      { status: 500 }
    );
  }
});
