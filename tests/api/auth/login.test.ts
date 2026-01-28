/**
 * Login API Route Tests
 *
 * Tests POST /api/auth/login endpoint logic including:
 * - Successful login flow
 * - Failed login (invalid credentials)
 * - Rate limiting (too many attempts)
 * - Missing fields validation
 * - Admin bootstrap path
 * - Error handling
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks (must be declared before vi.mock calls)
// ---------------------------------------------------------------------------

const authenticateUserMock = vi.hoisted(() => vi.fn());
const createSessionMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
const resolveClientAddressMock = vi.hoisted(() => vi.fn());
const getRecentLoginAttemptsMock = vi.hoisted(() => vi.fn());
const getRecentLoginAttemptsByIpMock = vi.hoisted(() => vi.fn());
const recordLoginAttemptMock = vi.hoisted(() => vi.fn());

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  authenticateUser: authenticateUserMock,
  createSession: createSessionMock,
}));

vi.mock('@/lib/logger', () => ({
  logger: loggerMock,
}));

vi.mock('@/lib/network', () => ({
  resolveClientAddress: resolveClientAddressMock,
}));

// Mock origin validation to pass through (we test origin validation elsewhere)
vi.mock('@/lib/validation/origin-validation', () => ({
  withOriginValidation: (handler: Function) => handler,
  validateOrigin: () => ({ allowed: true, origin: 'http://localhost:8100' }),
}));

// Mock the server storage module - vitest resolves vi.mock paths relative
// to the test file, so we use the correct relative path from tests/api/auth/
vi.mock('../../../server/storage', () => ({
  getRecentLoginAttempts: getRecentLoginAttemptsMock,
  getRecentLoginAttemptsByIp: getRecentLoginAttemptsByIpMock,
  recordLoginAttempt: recordLoginAttemptMock,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildLoginRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost:8100/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:8100',
    },
  });
}

const mockUser = {
  id: 'user_test_123',
  email: 'test@example.com',
  username: 'testuser',
  isAdmin: false,
  emailVerified: true,
  termsVersion: '1.0',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  let POST: (request: NextRequest, context: unknown) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    resolveClientAddressMock.mockReturnValue({ ip: '127.0.0.1', fingerprint: 'test-fp' });
    getRecentLoginAttemptsMock.mockResolvedValue([]);
    getRecentLoginAttemptsByIpMock.mockResolvedValue([]);
    recordLoginAttemptMock.mockResolvedValue(undefined);

    // Dynamic import to pick up mocks
    vi.resetModules();
    const mod = await import('@/app/api/auth/login/route');
    POST = mod.POST;
  });

  it('returns 400 when email is missing', async () => {
    const request = buildLoginRequest({ password: 'secret123' });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toContain('Email and password are required');
  });

  it('returns 400 when password is missing', async () => {
    const request = buildLoginRequest({ email: 'test@example.com' });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toContain('Email and password are required');
  });

  it('returns 400 when both fields are missing', async () => {
    const request = buildLoginRequest({});
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('returns 401 when credentials are invalid', async () => {
    authenticateUserMock.mockResolvedValue(null);

    const request = buildLoginRequest({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Invalid email or password');
    expect(recordLoginAttemptMock).toHaveBeenCalledWith('test@example.com', '127.0.0.1', false);
  });

  it('returns 200 with user data on successful login', async () => {
    authenticateUserMock.mockResolvedValue(mockUser);
    createSessionMock.mockResolvedValue(undefined);

    const request = buildLoginRequest({
      email: 'test@example.com',
      password: 'correctpassword',
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.user).toEqual({
      id: 'user_test_123',
      email: 'test@example.com',
      username: 'testuser',
      isAdmin: false,
      emailVerified: true,
    });
    expect(createSessionMock).toHaveBeenCalledWith(mockUser);
    expect(recordLoginAttemptMock).toHaveBeenCalledWith('test@example.com', '127.0.0.1', true);
  });

  it('returns 429 when email has too many failed attempts', async () => {
    const failedAttempts = Array.from({ length: 5 }, (_, i) => ({
      success: false,
      createdAt: new Date(Date.now() - i * 60000),
    }));
    getRecentLoginAttemptsMock.mockResolvedValue(failedAttempts);

    const request = buildLoginRequest({
      email: 'test@example.com',
      password: 'anypassword',
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.success).toBe(false);
    expect(json.message).toContain('Too many login attempts');
    expect(response.headers.get('Retry-After')).toBeTruthy();
    // Should NOT attempt authentication
    expect(authenticateUserMock).not.toHaveBeenCalled();
  });

  it('returns 429 when IP has too many failed attempts', async () => {
    const ipFailedAttempts = Array.from({ length: 5 }, (_, i) => ({
      success: false,
      createdAt: new Date(Date.now() - i * 60000),
    }));
    getRecentLoginAttemptsByIpMock.mockResolvedValue(ipFailedAttempts);

    const request = buildLoginRequest({
      email: 'new@example.com',
      password: 'anypassword',
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.success).toBe(false);
    expect(authenticateUserMock).not.toHaveBeenCalled();
  });

  it('allows login when attempts are below threshold', async () => {
    const fewAttempts = Array.from({ length: 3 }, (_, i) => ({
      success: false,
      createdAt: new Date(Date.now() - i * 60000),
    }));
    getRecentLoginAttemptsMock.mockResolvedValue(fewAttempts);
    authenticateUserMock.mockResolvedValue(mockUser);
    createSessionMock.mockResolvedValue(undefined);

    const request = buildLoginRequest({
      email: 'test@example.com',
      password: 'correctpassword',
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(authenticateUserMock).toHaveBeenCalled();
  });

  it('returns 500 when an unexpected error occurs', async () => {
    authenticateUserMock.mockRejectedValue(new Error('Database connection failed'));
    getRecentLoginAttemptsMock.mockResolvedValue([]);

    const request = buildLoginRequest({
      email: 'test@example.com',
      password: 'anypassword',
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.message).toBe('An error occurred during login');
    expect(loggerMock.error).toHaveBeenCalled();
  });

  it('handles unknown IP gracefully', async () => {
    resolveClientAddressMock.mockReturnValue({ ip: 'unknown', fingerprint: 'test-fp' });
    authenticateUserMock.mockResolvedValue(mockUser);
    createSessionMock.mockResolvedValue(undefined);

    const request = buildLoginRequest({
      email: 'test@example.com',
      password: 'correctpassword',
    });
    const response = await POST(request, {});
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    // IP-based rate limiting should be skipped, null passed to recordLoginAttempt
    expect(recordLoginAttemptMock).toHaveBeenCalledWith('test@example.com', null, true);
  });

  it('does not skip IP rate limiting when resolved IP is known', async () => {
    resolveClientAddressMock.mockReturnValue({ ip: '192.168.1.1', fingerprint: 'fp-123' });
    authenticateUserMock.mockResolvedValue(mockUser);
    createSessionMock.mockResolvedValue(undefined);

    const request = buildLoginRequest({
      email: 'test@example.com',
      password: 'correctpassword',
    });
    await POST(request, {});

    expect(getRecentLoginAttemptsByIpMock).toHaveBeenCalledWith('192.168.1.1', 15);
    expect(recordLoginAttemptMock).toHaveBeenCalledWith('test@example.com', '192.168.1.1', true);
  });
});
