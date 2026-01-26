/**
 * Session API Route
 *
 * GET /api/auth/session
 * Returns the current user's session data.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: session.id,
          email: session.email,
          username: session.username,
          isAdmin: session.isAdmin,
          emailVerified: session.emailVerified,
          termsVersion: session.termsVersion,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    logger.error('[Auth] Session error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { authenticated: false, user: null },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
