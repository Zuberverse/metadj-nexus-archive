/**
 * Admin Users API Route
 *
 * GET /api/admin/users - List all users with pagination
 * Query params: ?page=1&limit=20&search=email
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers } from '../../../../../server/storage';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search')?.toLowerCase().trim() || '';

    const allUsers = await getAllUsers();

    let filteredUsers = allUsers;
    if (search) {
      filteredUsers = allUsers.filter((user) =>
        user.email.toLowerCase().includes(search)
      );
    }

    const total = filteredUsers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedUsers = filteredUsers
      .slice(startIndex, endIndex)
      .map((user) => ({
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

    return NextResponse.json({
      success: true,
      users: paginatedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[Admin Users] List error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
