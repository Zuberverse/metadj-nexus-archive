/**
 * Account API Route
 *
 * PATCH /api/auth/account
 * Updates user email or password.
 */

import { NextResponse } from 'next/server';
import { getSession, createSession, updateUserEmail, updateUserUsername, updateUserPassword } from '@/lib/auth';

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, email, username, currentPassword, newPassword } = body;

    if (action === 'updateEmail') {
      if (!email) {
        return NextResponse.json(
          { success: false, message: 'Email is required' },
          { status: 400 }
        );
      }

      const updatedUser = await updateUserEmail(session.id, email);
      if (updatedUser) {
        await createSession(updatedUser);
      }

      return NextResponse.json({
        success: true,
        user: updatedUser,
      });
    }

    if (action === 'updateUsername') {
      if (!username) {
        return NextResponse.json(
          { success: false, message: 'Username is required' },
          { status: 400 }
        );
      }

      const updatedUser = await updateUserUsername(session.id, username);
      if (updatedUser) {
        await createSession(updatedUser);
      }

      return NextResponse.json({
        success: true,
        user: updatedUser,
      });
    }

    if (action === 'updatePassword') {
      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { success: false, message: 'Current and new password are required' },
          { status: 400 }
        );
      }

      await updateUserPassword(session.id, currentPassword, newPassword);

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
    console.error('[Auth] Account update error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 400 }
    );
  }
}
