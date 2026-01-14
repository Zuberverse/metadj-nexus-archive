/**
 * Session API Route
 *
 * GET /api/auth/session
 * Returns the current user's session data.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.id,
        email: session.email,
        username: session.username,
        isAdmin: session.isAdmin,
        emailVerified: session.emailVerified,
      },
    });
  } catch (error) {
    console.error('[Auth] Session error:', error);
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
}
