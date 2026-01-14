/**
 * Admin User Stats API Route
 *
 * GET /api/admin/users/stats - Get user statistics
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers, getUserCount } from '../../../../../../server/storage';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (!session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const [total, allUsers] = await Promise.all([
      getUserCount(),
      getAllUsers(),
    ]);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const active = allUsers.filter((user) => user.status === 'active').length;
    const newThisWeek = allUsers.filter(
      (user) => new Date(user.createdAt) >= oneWeekAgo
    ).length;
    const adminCount = allUsers.filter((user) => user.isAdmin).length;

    return NextResponse.json({
      success: true,
      stats: {
        total,
        active,
        newThisWeek,
        adminCount,
      },
    });
  } catch (error) {
    console.error('[Admin User Stats] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user statistics' },
      { status: 500 }
    );
  }
}
