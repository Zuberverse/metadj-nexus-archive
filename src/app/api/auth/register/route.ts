/**
 * Register API Route
 *
 * POST /api/auth/register
 * Creates a new user account and logs them in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerUser, createSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { resolveClientAddress } from '@/lib/network';
import { buildRateLimitError, buildRateLimitHeaders, createRateLimiter } from '@/lib/rate-limiting/rate-limiter-core';
import { withOriginValidation } from '@/lib/validation/origin-validation';
import { getMaxRequestSize, readJsonBodyWithLimit } from '@/lib/validation/request-size';

const REGISTER_RATE_LIMIT = { maxRequests: 5, windowMs: 10 * 60 * 1000 };
const registerRateLimiter = createRateLimiter({
  prefix: 'metadj:ratelimit:auth-register',
  maxRequests: REGISTER_RATE_LIMIT.maxRequests,
  windowMs: REGISTER_RATE_LIMIT.windowMs,
});

const SAFE_REGISTRATION_ERRORS = new Set([
  'Email, username, and password are required',
  'Terms & Conditions must be accepted',
  'Registration is currently disabled',
  'Invalid email format',
  'Username must be at least 3 characters',
  'Username must be 20 characters or less',
  'Username can only contain lowercase letters, numbers, and underscores',
  'Username cannot start with a number',
  'This username is reserved',
  'Password must be at least 8 characters',
  'This email cannot be used for registration',
]);

function resolveRegistrationErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('already exists') || normalized.includes('already taken')) {
    return 'Registration failed. Check your details and try again.';
  }

  if (SAFE_REGISTRATION_ERRORS.has(message)) {
    return message;
  }

  return 'Registration failed';
}

type RegisterPayload = {
  email?: string;
  username?: string;
  password?: string;
  termsAccepted?: boolean;
};

export const POST = withOriginValidation(async (request: NextRequest, _context: unknown) => {
  try {
    const { ip, fingerprint } = resolveClientAddress(request);
    const rateLimitId = ip !== 'unknown'
      ? `auth-register-ip:${ip}`
      : `auth-register-fp:${fingerprint}`;
    const rateLimit = await registerRateLimiter.check(rateLimitId);

    if (!rateLimit.allowed) {
      const error = buildRateLimitError(
        rateLimit.remainingMs ?? REGISTER_RATE_LIMIT.windowMs,
        'Too many registration attempts. Please wait before trying again.'
      );
      return NextResponse.json(
        { success: false, message: error.error, retryAfter: error.retryAfter },
        {
          status: 429,
          headers: buildRateLimitHeaders(rateLimit, REGISTER_RATE_LIMIT.maxRequests),
        }
      );
    }

    const bodyResult = await readJsonBodyWithLimit<RegisterPayload>(
      request,
      getMaxRequestSize(request.nextUrl.pathname)
    );
    if (!bodyResult.ok) return bodyResult.response;

    const { email, username, password, termsAccepted } = bodyResult.data ?? {};

    if (!email || !username || !password) {
      return NextResponse.json(
        { success: false, message: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { success: false, message: 'Terms & Conditions must be accepted' },
        { status: 400 }
      );
    }

    const user = await registerUser({ email, username, password });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Registration failed' },
        { status: 400 }
      );
    }

    await createSession(user);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    const responseMessage = resolveRegistrationErrorMessage(message);
    logger.error('[Auth] Register error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: responseMessage },
      { status: 400 }
    );
  }
});
