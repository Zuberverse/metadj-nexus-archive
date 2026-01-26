/**
 * MetaDJai Conversation Migration API Route
 *
 * POST /api/metadjai/conversations/migrate
 * Migrates legacy local chat sessions into server storage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, isE2EAuthBypassEnabled } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { withOriginValidation } from '@/lib/validation/origin-validation'
import { getMaxRequestSize, readJsonBodyWithLimit } from '@/lib/validation/request-size'
import {
  addMessage,
  createConversation,
  getConversationById,
} from '../../../../../../server/storage'
import type { MetaDjAiMessage } from '@/types/metadjai.types'

const MAX_SESSIONS = 20
const MAX_MESSAGES = 200

const isValidStatus = (value: unknown): value is MetaDjAiMessage['status'] =>
  value === 'streaming' || value === 'complete' || value === 'error'

const isValidKind = (value: unknown): value is NonNullable<MetaDjAiMessage['kind']> =>
  value === 'mode-switch' || value === 'model-switch'

const isValidMode = (value: unknown): value is NonNullable<MetaDjAiMessage['mode']> =>
  value === 'adaptive' || value === 'explorer' || value === 'dj'

type MessagePayload = {
  id?: string
  role?: MetaDjAiMessage['role']
  content?: string
  createdAt?: number
  status?: MetaDjAiMessage['status']
  kind?: MetaDjAiMessage['kind']
  mode?: MetaDjAiMessage['mode']
  sources?: MetaDjAiMessage['sources']
  toolsUsed?: MetaDjAiMessage['toolsUsed']
  versions?: MetaDjAiMessage['versions']
  currentVersionIndex?: MetaDjAiMessage['currentVersionIndex']
  proposal?: MetaDjAiMessage['proposal']
}

type SessionPayload = {
  id?: string
  title?: string
  createdAt?: number
  updatedAt?: number
  messages?: MessagePayload[]
}

type MigratePayload = {
  sessions?: SessionPayload[]
}

function buildMetadata(message: MetaDjAiMessage): Record<string, unknown> | null {
  const metadata: Record<string, unknown> = {}
  if (message.status) metadata.status = message.status
  if (message.kind) metadata.kind = message.kind
  if (message.mode) metadata.mode = message.mode
  if (message.sources) metadata.sources = message.sources
  if (message.toolsUsed) metadata.toolsUsed = message.toolsUsed
  if (message.versions) metadata.versions = message.versions
  if (typeof message.currentVersionIndex === 'number') {
    metadata.currentVersionIndex = message.currentVersionIndex
  }
  if (message.proposal) metadata.proposal = message.proposal
  return Object.keys(metadata).length > 0 ? metadata : null
}

export const POST = withOriginValidation(async (request: NextRequest) => {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    if (isE2EAuthBypassEnabled()) {
      return NextResponse.json({ success: true })
    }

    const bodyResult = await readJsonBodyWithLimit<MigratePayload>(
      request,
      getMaxRequestSize(request.nextUrl.pathname)
    )
    if (!bodyResult.ok) return bodyResult.response

    const payload = bodyResult.data ?? {}
    const sessions = Array.isArray(payload.sessions) ? payload.sessions.slice(0, MAX_SESSIONS) : []

    if (sessions.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No sessions provided' },
        { status: 400 }
      )
    }

    for (const sessionPayload of sessions) {
      const title = typeof sessionPayload.title === 'string' ? sessionPayload.title.trim() : undefined
      const createdAt = typeof sessionPayload.createdAt === 'number'
        ? new Date(sessionPayload.createdAt)
        : undefined
      const updatedAt = typeof sessionPayload.updatedAt === 'number'
        ? new Date(sessionPayload.updatedAt)
        : undefined
      const requestedId = typeof sessionPayload.id === 'string' ? sessionPayload.id : undefined

      let conversation
      if (requestedId) {
        const existing = await getConversationById(requestedId)
        if (existing && existing.userId === session.id) {
          conversation = existing
        }
      }

      if (!conversation) {
        conversation = requestedId
          ? await createConversation(session.id, title, { id: requestedId, createdAt, updatedAt })
          : await createConversation(session.id, title, { createdAt, updatedAt })
      }

      const messages = Array.isArray(sessionPayload.messages)
        ? sessionPayload.messages.slice(0, MAX_MESSAGES)
        : []

      for (const message of messages) {
        if (!message || typeof message !== 'object') continue
        const role = message.role === 'user' || message.role === 'assistant' ? message.role : null
        const content = typeof message.content === 'string' ? message.content : null
        if (!role || content === null) continue

        const metaMessage: MetaDjAiMessage = {
          id: typeof message.id === 'string' ? message.id : crypto.randomUUID(),
          role,
          content,
          createdAt: typeof message.createdAt === 'number' ? message.createdAt : Date.now(),
          status: isValidStatus(message.status) ? message.status : undefined,
          kind: isValidKind(message.kind) ? message.kind : undefined,
          mode: isValidMode(message.mode) ? message.mode : undefined,
          sources: message.sources,
          toolsUsed: message.toolsUsed,
          versions: message.versions,
          currentVersionIndex: message.currentVersionIndex,
          proposal: message.proposal,
        }

        await addMessage({
          id: metaMessage.id,
          conversationId: conversation.id,
          role: metaMessage.role,
          content: metaMessage.content,
          metadata: buildMetadata(metaMessage),
          createdAt: typeof message.createdAt === 'number' ? new Date(message.createdAt) : undefined,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[MetaDJai] Migration error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { success: false, message: 'Failed to migrate sessions' },
      { status: 500 }
    )
  }
})
