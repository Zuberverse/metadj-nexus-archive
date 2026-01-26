/**
 * Conversation API Route
 *
 * PATCH /api/metadjai/conversations/{id}
 * Updates conversation metadata (title/summary)
 *
 * DELETE /api/metadjai/conversations/{id}
 * Soft deletes an active conversation or permanently deletes an archived conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withOriginValidation } from '@/lib/validation/origin-validation';
import { getMaxRequestSize, readJsonBodyWithLimit } from '@/lib/validation/request-size';
import {
  deleteConversation,
  getConversationById,
  hardDeleteArchivedConversation,
  updateConversation,
} from '../../../../../../server/storage';

type UpdatePayload = {
  title?: string;
  summary?: string;
};

export const PATCH = withOriginValidation(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const existing = await getConversationById(id);
    if (!existing || existing.userId !== session.id || existing.deletedAt) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    const bodyResult = await readJsonBodyWithLimit<UpdatePayload>(
      request,
      getMaxRequestSize(request.nextUrl.pathname),
      { allowEmpty: true }
    );
    if (!bodyResult.ok) return bodyResult.response;

    const body = bodyResult.data ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : undefined;
    const summary = typeof body.summary === 'string' ? body.summary.trim() : undefined;

    const updatePayload: {
      title?: string;
      summary?: string;
    } = {};

    if (title !== undefined) {
      updatePayload.title = title;
    }
    if (summary !== undefined) {
      updatePayload.summary = summary;
    }

    const updated = await updateConversation(id, updatePayload);

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Failed to update conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: updated.id,
        title: updated.title || 'New conversation',
        createdAt: updated.createdAt.getTime(),
        updatedAt: updated.updatedAt.getTime(),
        messageCount: updated.messageCount ?? 0,
      },
    });
  } catch (error) {
    logger.error('[Update Conversation] Error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to update conversation' },
      { status: 500 }
    );
  }
});

export const DELETE = withOriginValidation(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const conversation = await getConversationById(id);
    if (!conversation || conversation.userId !== session.id || conversation.deletedAt) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.isArchived) {
      const deleted = await hardDeleteArchivedConversation(id, session.id);

      if (!deleted) {
        return NextResponse.json(
          { success: false, message: 'Conversation not found, not archived, or not owned by user' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, mode: 'hard' });
    }

    const deleted = await deleteConversation(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, mode: 'soft' });
  } catch (error) {
    logger.error('[Delete Archived Conversation] Error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
});
