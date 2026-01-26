/**
 * Conversation Message Update API Route
 *
 * PATCH /api/metadjai/conversations/{id}/messages/{messageId} - Update a message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isE2EAuthBypassEnabled } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withOriginValidation } from '@/lib/validation/origin-validation';
import { getMaxRequestSize, readJsonBodyWithLimit } from '@/lib/validation/request-size';
import {
  getConversationById,
  getMessageById,
  updateMessage,
} from '../../../../../../../../server/storage';
import type { MetaDjAiMessage } from '@/types/metadjai.types';

const isValidStatus = (value: unknown): value is MetaDjAiMessage['status'] =>
  value === 'streaming' || value === 'complete' || value === 'error';

const isValidKind = (value: unknown): value is NonNullable<MetaDjAiMessage['kind']> =>
  value === 'mode-switch' || value === 'model-switch';

const isValidMode = (value: unknown): value is NonNullable<MetaDjAiMessage['mode']> =>
  value === 'adaptive' || value === 'explorer' || value === 'dj';

function buildMetadata(message: MetaDjAiMessage): Record<string, unknown> | null {
  const metadata: Record<string, unknown> = {};
  if (message.status) metadata.status = message.status;
  if (message.kind) metadata.kind = message.kind;
  if (message.mode) metadata.mode = message.mode;
  if (message.sources) metadata.sources = message.sources;
  if (message.toolsUsed) metadata.toolsUsed = message.toolsUsed;
  if (message.versions) metadata.versions = message.versions;
  if (typeof message.currentVersionIndex === 'number') {
    metadata.currentVersionIndex = message.currentVersionIndex;
  }
  if (message.proposal) metadata.proposal = message.proposal;
  return Object.keys(metadata).length > 0 ? metadata : null;
}

type UpdatePayload = {
  message?: MetaDjAiMessage;
  content?: string;
  status?: MetaDjAiMessage['status'];
  kind?: MetaDjAiMessage['kind'];
  mode?: MetaDjAiMessage['mode'];
  sources?: MetaDjAiMessage['sources'];
  toolsUsed?: MetaDjAiMessage['toolsUsed'];
  versions?: MetaDjAiMessage['versions'];
  currentVersionIndex?: MetaDjAiMessage['currentVersionIndex'];
  proposal?: MetaDjAiMessage['proposal'];
};

export const PATCH = withOriginValidation(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) => {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (isE2EAuthBypassEnabled()) {
      return NextResponse.json({ success: true });
    }

    const { id, messageId } = await params;
    if (!id || !messageId) {
      return NextResponse.json(
        { success: false, message: 'Conversation ID and message ID are required' },
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

    const existingMessage = await getMessageById(messageId);
    if (!existingMessage || existingMessage.conversationId !== id) {
      return NextResponse.json(
        { success: false, message: 'Message not found' },
        { status: 404 }
      );
    }

    const bodyResult = await readJsonBodyWithLimit<UpdatePayload>(
      request,
      getMaxRequestSize(request.nextUrl.pathname)
    );
    if (!bodyResult.ok) return bodyResult.response;

    const payload = bodyResult.data ?? {};

    let content: string | undefined;
    let metadata: Record<string, unknown> | null | undefined;

    if (payload.message) {
      const message = payload.message;
      content = message.content;
      metadata = buildMetadata({
        ...message,
        status: isValidStatus(message.status) ? message.status : undefined,
        kind: isValidKind(message.kind) ? message.kind : undefined,
        mode: isValidMode(message.mode) ? message.mode : undefined,
      });
    } else {
      if (typeof payload.content === 'string') {
        content = payload.content;
      }
      const metaMessage: MetaDjAiMessage = {
        id: messageId,
        role: existingMessage.role === 'user' ? 'user' : 'assistant',
        content: content ?? existingMessage.content,
        createdAt: existingMessage.createdAt.getTime(),
        status: isValidStatus(payload.status) ? payload.status : undefined,
        kind: isValidKind(payload.kind) ? payload.kind : undefined,
        mode: isValidMode(payload.mode) ? payload.mode : undefined,
        sources: payload.sources,
        toolsUsed: payload.toolsUsed,
        versions: payload.versions,
        currentVersionIndex: payload.currentVersionIndex,
        proposal: payload.proposal,
      };
      metadata = buildMetadata(metaMessage);
    }

    const updated = await updateMessage(messageId, {
      content: content ?? existingMessage.content,
      metadata,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Message update failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Conversation Message] Update error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to update message' },
      { status: 500 }
    );
  }
});
