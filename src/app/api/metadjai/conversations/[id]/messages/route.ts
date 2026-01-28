/**
 * Conversation Messages API Route
 *
 * GET /api/metadjai/conversations/{id}/messages - List messages for a conversation
 * POST /api/metadjai/conversations/{id}/messages - Add one or more messages
 * DELETE /api/metadjai/conversations/{id}/messages - Clear all messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, isE2EAuthBypassEnabled } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { withOriginValidation } from '@/lib/validation/origin-validation';
import { getMaxRequestSize, readJsonBodyWithLimit } from '@/lib/validation/request-size';
import {
  addMessage,
  deleteConversationMessages,
  getConversationById,
  getConversationMessages,
} from '../../../../../../../server/storage';
import type { MetaDjAiMessage } from '@/types/metadjai.types';

const isValidStatus = (value: unknown): value is MetaDjAiMessage['status'] =>
  value === 'streaming' || value === 'complete' || value === 'error';

const isValidKind = (value: unknown): value is NonNullable<MetaDjAiMessage['kind']> =>
  value === 'mode-switch' || value === 'model-switch';

const isValidMode = (value: unknown): value is NonNullable<MetaDjAiMessage['mode']> =>
  value === 'adaptive' || value === 'explorer' || value === 'dj';

function normalizeSources(sources: unknown): MetaDjAiMessage['sources'] | undefined {
  if (!Array.isArray(sources)) return undefined;
  const normalized = sources
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title : null;
      const url = typeof record.url === 'string' ? record.url : null;
      if (!title || !url) return null;
      return { title, url };
    })
    .filter((entry): entry is { title: string; url: string } => Boolean(entry));
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeVersions(versions: unknown): MetaDjAiMessage['versions'] | undefined {
  if (!Array.isArray(versions)) return undefined;
  const normalized = versions
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const content = typeof record.content === 'string' ? record.content : null;
      const createdAtValue = typeof record.createdAt === 'number' ? record.createdAt : null;
      if (!content || createdAtValue === null) return null;
      const toolsUsed = Array.isArray(record.toolsUsed)
        ? record.toolsUsed.filter((tool) => typeof tool === 'string')
        : undefined;
      return {
        content,
        createdAt: createdAtValue,
        toolsUsed: toolsUsed && toolsUsed.length > 0 ? toolsUsed : undefined,
      };
    })
    .filter(
      (entry): entry is { content: string; createdAt: number; toolsUsed: string[] | undefined } =>
        Boolean(entry)
    );
  return normalized.length > 0 ? normalized : undefined;
}

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

function mapDbMessageToMeta(message: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  metadata: unknown;
}): MetaDjAiMessage {
  const metadata = message.metadata && typeof message.metadata === 'object'
    ? (message.metadata as Record<string, unknown>)
    : null;

  return {
    id: message.id,
    role: message.role === 'user' ? 'user' : 'assistant',
    content: message.content,
    createdAt: message.createdAt.getTime(),
    status: metadata && isValidStatus(metadata.status) ? metadata.status : 'complete',
    kind: metadata && isValidKind(metadata.kind) ? metadata.kind : undefined,
    mode: metadata && isValidMode(metadata.mode) ? metadata.mode : undefined,
    sources: metadata ? normalizeSources(metadata.sources) : undefined,
    toolsUsed: metadata && Array.isArray(metadata.toolsUsed)
      ? metadata.toolsUsed.filter((tool) => typeof tool === 'string')
      : undefined,
    versions: metadata ? normalizeVersions(metadata.versions) : undefined,
    currentVersionIndex: metadata && typeof metadata.currentVersionIndex === 'number'
      ? metadata.currentVersionIndex
      : undefined,
    proposal: metadata ? metadata.proposal as MetaDjAiMessage['proposal'] : undefined,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 1000;
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, parsedLimit)
      : 1000;

    const messages = await getConversationMessages(id, limit);

    return NextResponse.json(
      {
        success: true,
        messages: messages.map(mapDbMessageToMeta),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    logger.error('[Conversation Messages] List error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

type MessagePayload = {
  id?: string;
  role?: MetaDjAiMessage['role'];
  content?: string;
  createdAt?: number;
  status?: MetaDjAiMessage['status'];
  kind?: MetaDjAiMessage['kind'];
  mode?: MetaDjAiMessage['mode'];
  sources?: MetaDjAiMessage['sources'];
  toolsUsed?: MetaDjAiMessage['toolsUsed'];
  versions?: MetaDjAiMessage['versions'];
  currentVersionIndex?: MetaDjAiMessage['currentVersionIndex'];
  proposal?: MetaDjAiMessage['proposal'];
};

type AddMessagesPayload = {
  message?: MessagePayload;
  messages?: MessagePayload[];
};

export const POST = withOriginValidation(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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

    const bodyResult = await readJsonBodyWithLimit<AddMessagesPayload>(
      request,
      getMaxRequestSize(request.nextUrl.pathname)
    );
    if (!bodyResult.ok) return bodyResult.response;

    const payload = bodyResult.data ?? {};
    const incoming = Array.isArray(payload.messages)
      ? payload.messages
      : payload.message
        ? [payload.message]
        : [];

    if (incoming.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Message payload is required' },
        { status: 400 }
      );
    }

    for (const message of incoming) {
      if (!message || typeof message !== 'object') continue;
      const role = message.role === 'user' || message.role === 'assistant' ? message.role : null;
      const content = typeof message.content === 'string' ? message.content : null;
      if (!role || content === null) {
        continue;
      }

      const createdAt = typeof message.createdAt === 'number' ? new Date(message.createdAt) : undefined;
      const metaMessage: MetaDjAiMessage = {
        id: typeof message.id === 'string' ? message.id : crypto.randomUUID(),
        role,
        content,
        createdAt: message.createdAt ?? Date.now(),
        status: isValidStatus(message.status) ? message.status : undefined,
        kind: isValidKind(message.kind) ? message.kind : undefined,
        mode: isValidMode(message.mode) ? message.mode : undefined,
        sources: message.sources,
        toolsUsed: message.toolsUsed,
        versions: message.versions,
        currentVersionIndex: message.currentVersionIndex,
        proposal: message.proposal,
      };

      await addMessage({
        id: metaMessage.id,
        conversationId: id,
        role,
        content,
        metadata: buildMetadata(metaMessage),
        createdAt,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Conversation Messages] Add error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to add messages' },
      { status: 500 }
    );
  }
});

export const DELETE = withOriginValidation(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (isE2EAuthBypassEnabled()) {
      return NextResponse.json({ success: true, deleted: 0 });
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

    const deletedCount = await deleteConversationMessages(id);

    return NextResponse.json({ success: true, deleted: deletedCount });
  } catch (error) {
    logger.error('[Conversation Messages] Clear error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'Failed to clear messages' },
      { status: 500 }
    );
  }
});
