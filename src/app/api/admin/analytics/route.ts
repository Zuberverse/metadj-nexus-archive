/**
 * Admin Analytics API Route
 *
 * GET /api/admin/analytics - Get analytics summary
 * Query params: ?days=30
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAnalyticsSummary } from '../../../../../server/storage';

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
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30', 10)));

    const summary = await getAnalyticsSummary(days);

    return NextResponse.json({
      success: true,
      summary: {
        totalEvents: summary.totalEvents,
        uniqueUsers: summary.uniqueUsers,
        eventCounts: summary.eventCounts,
        recentEvents: summary.recentEvents,
      },
    });
  } catch (error) {
    console.error('[Admin Analytics] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch analytics summary' },
      { status: 500 }
    );
  }
}
