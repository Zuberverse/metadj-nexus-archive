/**
 * Check Availability API Route
 *
 * POST /api/auth/check-availability
 * Checks if a username or email is available for registration.
 */

import { NextResponse } from 'next/server';
import { checkUsernameAvailability, checkEmailAvailability } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, value, excludeUserId } = body;

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
        error: result.error,
      });
    }

    if (type === 'email') {
      const result = await checkEmailAvailability(value, excludeUserId);
      return NextResponse.json({
        success: true,
        available: result.available,
        error: result.error,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid type. Must be "username" or "email"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Auth] Check availability error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
