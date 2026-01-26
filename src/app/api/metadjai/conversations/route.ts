/**
 * Conversations API Route
 *
 * GET /api/metadjai/conversations - List active conversations
 * POST /api/metadjai/conversations - Create a new conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isE2EAuthBypassEnabled } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withOriginValidation } from '@/lib/validation/origin-validation';
import { getMaxRequestSize, readJsonBodyWithLimit } from '@/lib/validation/request-size';
import {
  createConversation,
  getConversationById,
  getUserConversations,
} from '../../../../../server/storage';
import type { MetaDjAiChatSessionSummary } from '@/types/metadjai.types';

function toSessionSummary(conversation: {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number | null;
}): MetaDjAiChatSessionSummary {
  return {
    id: conversation.id,
    title: conversation.title || 'New conversation',
    createdAt: conversation.createdAt.getTime(),
    updatedAt: conversation.updatedAt.getTime(),
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

    if (isE2EAuthBypassEnabled()) {
      return NextResponse.json({ success: true, sessions: [] });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 1000;
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, parsedLimit)
      : 1000;

    const conversations = await getUserConversations(session.id, limit);
    const sessions = conversations
      .filter((conversation) => !conversation.isArchived)
      .map(toSessionSummary);

    return NextResponse.json(
      { success: true, sessions },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    logger.error('[Conversations] List error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

type CreateConversationPayload = {
  id?: string;
  title?: string;
  createdAt?: number;
  updatedAt?: number;
};

export const POST = withOriginValidation(async (request: NextRequest) => {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (isE2EAuthBypassEnabled()) {
      const now = Date.now();
      return NextResponse.json({
        success: true,
        conversation: {
          id: crypto.randomUUID(),
          title: 'New conversation',
          createdAt: now,
          updatedAt: now,
          messageCount: 0,
        },
      });
    }

    const bodyResult = await readJsonBodyWithLimit<CreateConversationPayload>(
      request,
      getMaxRequestSize(request.nextUrl.pathname),
      { allowEmpty: true }
    );
    if (!bodyResult.ok) return bodyResult.response;

    const payload = bodyResult.data ?? {};
    const id = typeof payload.id === 'string' ? payload.id : undefined;
    const title = typeof payload.title === 'string' ? payload.title.trim() : undefined;
    const createdAtValue = typeof payload.createdAt === 'number' ? payload.createdAt : undefined;
    const updatedAtValue = typeof payload.updatedAt === 'number' ? payload.updatedAt : undefined;

    if (id) {
      const existing = await getConversationById(id);
      if (existing) {
        if (existing.userId !== session.id) {
          return NextResponse.json(
            { success: false, message: 'Conversation not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, conversation: toSessionSummary(existing) });
      }
    }

    const createdAt = createdAtValue ? new Date(createdAtValue) : undefined;
    const updatedAt = updatedAtValue ? new Date(updatedAtValue) : undefined;

    const conversation = await createConversation(session.id, title, {
      id,
      createdAt,
      updatedAt,
    });

    return NextResponse.json({
      success: true,
      conversation: toSessionSummary(conversation),
    });
  } catch (error) {
    logger.error('[Conversations] Create error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to create conversation' },
      { status: 500 }
    );
  }
});
