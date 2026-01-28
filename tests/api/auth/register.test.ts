/**
 * Register API Route Tests
 *
 * Tests POST /api/auth/register endpoint logic including:
 * - Successful registration
 * - Duplicate email/username (thrown as errors from registerUser)
 * - Terms not accepted
 * - Missing required fields
 * - Password too short (thrown from registerUser)
 * - Rate limiting
 * - Error message sanitization
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const registerUserMock = vi.hoisted(() => vi.fn());
const createSessionMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
const resolveClientAddressMock = vi.hoisted(() => vi.fn());
const rateLimiterCheckMock = vi.hoisted(() => vi.fn());

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  registerUser: registerUserMock,
  createSession: createSessionMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: loggerMock,
}));

vi.mock('@/lib/network', () => ({
  resolveClientAddress: resolveClientAddressMock,
}));

vi.mock('@/lib/validation/origin-validation', () => ({
  withOriginValidation: (handler: Function) => handler,
  validateOrigin: () => ({ allowed: true, origin: 'http://localhost:8100' }),
}));

vi.mock('@/lib/rate-limiting/rate-limiter-core', () => ({
  createRateLimiter: () => ({
    check: rateLimiterCheckMock,
    clear: vi.fn(),
    clearAll: vi.fn(),
    getMode: () => 'in-memory' as const,
  }),
  buildRateLimitError: (remainingMs: number, message: string) => ({
    error: message,
    retryAfter: Math.ceil(remainingMs / 1000),
  }),
  buildRateLimitHeaders: () => ({
    'X-RateLimit-Limit': '5',
    'X-RateLimit-Remaining': '0',
    'Retry-After': '600',
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRegisterRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost:8100/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:8100',
    },
  });
}

const validPayload = {
  email: 'newuser@example.com',
  username: 'newuser',
  password: 'securepassword123',
  termsAccepted: true,
};

const mockNewUser = {
  id: 'user_new_123',
  email: 'newuser@example.com',
  username: 'newuser',
  isAdmin: false,
  emailVerified: false,
  termsVersion: '1.0',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
  let POST: (request: NextRequest, context: unknown) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    resolveClientAddressMock.mockReturnValue({ ip: '127.0.0.1', fingerprint: 'test-fp' });
    rateLimiterCheckMock.mockResolvedValue({ allowed: true, remaining: 4 });

    vi.resetModules();
    const mod = await import('@/app/api/auth/register/route');
    POST = mod.POST;
  });

  it('returns 200 with user data on successful registration', async () => {
    registerUserMock.mockResolvedValue(mockNewUser);
    createSessionMock.mockResolvedValue(undefined);

    const request = buildRegisterRequest(validPayload);
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user).toEqual({
      id: 'user_new_123',
      email: 'newuser@example.com',
      username: 'newuser',
      isAdmin: false,
      emailVerified: false,
    });
    expect(createSessionMock).toHaveBeenCalledWith(mockNewUser);
  });

  it('returns 400 when email is missing', async () => {
    const request = buildRegisterRequest({
      username: 'newuser',
      password: 'securepassword123',
      termsAccepted: true,
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toContain('Email, username, and password are required');
  });

  it('returns 400 when username is missing', async () => {
    const request = buildRegisterRequest({
      email: 'newuser@example.com',
      password: 'securepassword123',
      termsAccepted: true,
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toContain('Email, username, and password are required');
  });

  it('returns 400 when password is missing', async () => {
    const request = buildRegisterRequest({
      email: 'newuser@example.com',
      username: 'newuser',
      termsAccepted: true,
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toContain('Email, username, and password are required');
  });

  it('returns 400 when terms are not accepted', async () => {
    const request = buildRegisterRequest({
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'securepassword123',
      termsAccepted: false,
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Terms & Conditions must be accepted');
  });

  it('returns 400 when terms field is omitted', async () => {
    const request = buildRegisterRequest({
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'securepassword123',
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Terms & Conditions must be accepted');
  });

  it('returns 400 and safe message when email already exists', async () => {
    registerUserMock.mockRejectedValue(
      new Error('An account with this email already exists')
    );

    const request = buildRegisterRequest(validPayload);
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    // Should sanitize "already exists" errors to a generic message
    expect(json.message).toBe('Registration failed. Check your details and try again.');
  });

  it('returns 400 and safe message when username is already taken', async () => {
    registerUserMock.mockRejectedValue(
      new Error('This username is already taken')
    );

    const request = buildRegisterRequest(validPayload);
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    // "already taken" is also sanitized
    expect(json.message).toBe('Registration failed. Check your details and try again.');
  });

  it('returns 400 with original message for safe registration errors', async () => {
    registerUserMock.mockRejectedValue(
      new Error('Password must be at least 8 characters')
    );

    const request = buildRegisterRequest(validPayload);
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Password must be at least 8 characters');
  });

  it('returns safe error messages for known validation failures', async () => {
    const safeErrors = [
      'Invalid email format',
      'Username must be at least 3 characters',
      'Username must be 20 characters or less',
      'Username can only contain lowercase letters, numbers, and underscores',
      'Username cannot start with a number',
      'This username is reserved',
      'Registration is currently disabled',
      'This email cannot be used for registration',
    ];

    for (const errorMessage of safeErrors) {
      vi.clearAllMocks();
      rateLimiterCheckMock.mockResolvedValue({ allowed: true, remaining: 4 });
      registerUserMock.mockRejectedValue(new Error(errorMessage));

      const request = buildRegisterRequest(validPayload);
      const response = await POST(request, {});
      const json = await response.json();

      expect(json.message).toBe(errorMessage);
    }
  });

  it('returns generic message for unexpected errors', async () => {
    registerUserMock.mockRejectedValue(new Error('Internal database error'));

    const request = buildRegisterRequest(validPayload);
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    // Unknown error messages should be sanitized to generic
    expect(json.message).toBe('Registration failed');
    expect(loggerMock.error).toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    rateLimiterCheckMock.mockResolvedValue({
      allowed: false,
      remainingMs: 300000,
      remaining: 0,
    });

    const request = buildRegisterRequest(validPayload);
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.success).toBe(false);
    expect(json.message).toContain('Too many registration attempts');
    // Should NOT attempt registration
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it('returns 400 when registerUser returns null', async () => {
    registerUserMock.mockResolvedValue(null);

    const request = buildRegisterRequest(validPayload);
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Registration failed');
    expect(createSessionMock).not.toHaveBeenCalled();
  });
});
