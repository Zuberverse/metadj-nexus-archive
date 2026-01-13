/**
 * Session Management
 *
 * Cookie-based session management using signed tokens.
 * Sessions are stored in encrypted cookies for stateless auth.
 */

import { cookies } from 'next/headers';
import type { Session, SessionUser } from './types';

const SESSION_COOKIE_NAME = 'nexus_session';
const SESSION_DURATION = parseInt(process.env.AUTH_SESSION_DURATION || '604800', 10); // 7 days default

/**
 * Get the auth secret for signing sessions
 */
function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    // In development, use a default secret
    if (process.env.NODE_ENV === 'development') {
      return 'development-secret-key-min-32-chars!!';
    }
    throw new Error('AUTH_SECRET must be at least 32 characters');
  }
  return secret;
}

/**
 * Encode session data to a signed token
 */
async function encodeSession(session: Session): Promise<string> {
  const encoder = new TextEncoder();
  const data = JSON.stringify(session);
  const secret = getAuthSecret();

  // Create HMAC signature
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Base64 encode the data + signature
  const payload = `${Buffer.from(data).toString('base64')}.${signatureHex}`;
  return payload;
}

/**
 * Decode and verify a session token
 */
async function decodeSession(token: string): Promise<Session | null> {
  try {
    const [dataB64, signatureHex] = token.split('.');
    if (!dataB64 || !signatureHex) return null;

    const data = Buffer.from(dataB64, 'base64').toString();
    const encoder = new TextEncoder();
    const secret = getAuthSecret();

    // Verify HMAC signature
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = new Uint8Array(
      signatureHex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(data)
    );

    if (!valid) return null;

    const session: Session = JSON.parse(data);

    // Check expiration
    if (session.expiresAt < Date.now()) return null;

    return session;
  } catch {
    return null;
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(user: SessionUser): Promise<void> {
  const session: Session = {
    userId: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    expiresAt: Date.now() + SESSION_DURATION * 1000,
  };

  const token = await encodeSession(session);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  });
}

/**
 * Get the current session from cookies
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const session = await decodeSession(token);
  if (!session) return null;

  return {
    id: session.userId,
    email: session.email,
    isAdmin: session.isAdmin,
  };
}

/**
 * Clear the session cookie (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if a user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.isAdmin === true;
}
