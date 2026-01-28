import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { TERMS_VERSION } from '@/lib/constants/terms';

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));

describe('auth session', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    cookieStore.get.mockReset();
    cookieStore.set.mockReset();
    cookieStore.delete.mockReset();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns stub session when E2E bypass is enabled', async () => {
    process.env.E2E_AUTH_BYPASS = 'true';
    vi.stubEnv('NODE_ENV', 'test');

    const { getSession, isE2EAuthBypassEnabled } = await import('@/lib/auth/session');
    const session = await getSession();

    expect(isE2EAuthBypassEnabled()).toBe(true);
    expect(session).toEqual({
      id: 'e2e-user',
      email: 'e2e@local.test',
      username: 'e2e',
      isAdmin: false,
      emailVerified: true,
      termsVersion: TERMS_VERSION,
    });
  });

  it('returns admin stub session when E2E bypass + E2E_ADMIN are enabled', async () => {
    process.env.E2E_AUTH_BYPASS = 'true';
    process.env.E2E_ADMIN = 'true';
    vi.stubEnv('NODE_ENV', 'test');

    const { getSession } = await import('@/lib/auth/session');
    const session = await getSession();

    expect(session).toEqual({
      id: 'e2e-admin',
      email: 'admin@local.test',
      username: 'admin',
      isAdmin: true,
      emailVerified: true,
      termsVersion: TERMS_VERSION,
    });
  });

  it('returns null when no session cookie is present', async () => {
    process.env.E2E_AUTH_BYPASS = 'false';
    vi.stubEnv('NODE_ENV', 'test');
    cookieStore.get.mockReturnValue(undefined);

    const { getSession, isE2EAuthBypassEnabled } = await import('@/lib/auth/session');
    const session = await getSession();

    expect(isE2EAuthBypassEnabled()).toBe(false);
    expect(cookieStore.get).toHaveBeenCalledWith('nexus_session');
    expect(session).toBeNull();
  });
});
