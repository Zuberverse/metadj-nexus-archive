/**
 * Archived Conversations List API Route
 *
 * GET /api/metadjai/conversations/archived
 * Returns all archived conversations for the authenticated user
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getArchivedConversations } from '../../../../../../server/storage';

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const conversations = await getArchivedConversations(session.id, limit);

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error('[List Archived Conversations] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch archived conversations' },
      { status: 500 }
    );
  }
}
