/**
 * Archived Conversations List API Route
 *
 * GET /api/metadjai/conversations/archived
 * Returns all archived conversations for the authenticated user
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getArchivedConversations } from '../../../../../../server/storage';

type ArchivedConversationSummary = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  messageCount: number | null;
};

function toArchivedSummary(conversation: ArchivedConversationSummary) {
  return {
    id: conversation.id,
    title: conversation.title || 'New conversation',
    createdAt: conversation.createdAt.getTime(),
    updatedAt: conversation.updatedAt.getTime(),
    archivedAt: (conversation.archivedAt ?? conversation.updatedAt).getTime(),
    messageCount: conversation.messageCount ?? 0,
  };
}

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
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 1000;
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, parsedLimit)
      : 1000;

    const conversations = await getArchivedConversations(session.id, limit);
    const summaries = conversations.map((conversation) =>
      toArchivedSummary(conversation as ArchivedConversationSummary)
    );

    return NextResponse.json(
      {
        success: true,
        conversations: summaries,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    logger.error('[List Archived Conversations] Error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch archived conversations' },
      { status: 500 }
    );
  }
}
