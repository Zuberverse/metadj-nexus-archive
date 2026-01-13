/**
 * Register API Route
 *
 * POST /api/auth/register
 * Creates a new user account and logs them in.
 */

import { NextResponse } from 'next/server';
import { registerUser, createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await registerUser({ email, password });

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
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    console.error('[Auth] Register error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 400 }
    );
  }
}
