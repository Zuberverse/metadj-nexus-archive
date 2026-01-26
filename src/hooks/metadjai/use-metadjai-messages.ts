"use client"

/**
 * MetaDJai Messages Hook
 *
 * Manages message state plus session history using server persistence when authenticated,
 * with localStorage fallback + best-effort migration.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { metadjAiHistoryStorage, type MetaDjAiChatSession } from '@/lib/storage/metadjai-history-storage'
import { metadjAiSessionStorage } from '@/lib/storage/metadjai-session-storage'
import type { MetaDjAiChatSessionSummary, MetaDjAiMessage } from '@/types/metadjai.types'

interface UseMetaDjAiMessagesReturn {
  /** Current messages array */
  messages: MetaDjAiMessage[]
  /** Ref to current messages (avoids stale closures) */
  messagesRef: React.MutableRefObject<MetaDjAiMessage[]>
  /** Whether session storage has been loaded */
  hasHydrated: boolean
  /** All stored chat sessions (most recent first) */
  sessions: MetaDjAiChatSessionSummary[]
  /** Active session id */
  activeSessionId: string
  /** Set messages with automatic ref sync */
  setMessages: React.Dispatch<React.SetStateAction<MetaDjAiMessage[]>>
  /** Update messages with automatic ref sync */
  updateMessages: (updater: (prev: MetaDjAiMessage[]) => MetaDjAiMessage[]) => void
  /** Clear all messages */
  clearMessages: () => void
  /** Start a new empty session (keeps history) */
  startNewSession: (seedMessages?: MetaDjAiMessage[]) => string
  /** Switch to an existing session */
  switchSession: (sessionId: string) => void
  /** Delete a session from history */
  deleteSession: (sessionId: string) => void
  /** Refresh sessions from the server (if available) */
  refreshSessions: () => Promise<void>
  /** Ensure an active session exists and return its id */
  ensureSession: (seedMessages?: MetaDjAiMessage[]) => Promise<string>
  /** Persist new messages to the server */
  persistMessages: (sessionId: string, payload: MetaDjAiMessage[]) => Promise<void>
  /** Update a single message on the server */
  persistMessageUpdate: (sessionId: string, message: MetaDjAiMessage) => Promise<void>
  /** Clear messages for the active session on the server */
  clearSessionMessages: (sessionId: string) => Promise<void>
}

const DEFAULT_TITLE = 'New conversation'
const SESSION_FETCH_LIMIT = 1000

const toLocalSummary = (session: MetaDjAiChatSession): MetaDjAiChatSessionSummary => ({
  id: session.id,
  title: session.title,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  messageCount: session.messages.length,
})

const createConversationId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const isDefaultTitle = (title: string | null | undefined): boolean => {
  if (!title) return true
  const normalized = title.trim().toLowerCase()
  return normalized === 'new chat' || normalized === 'new conversation'
}

const mapMessagePayload = (message: MetaDjAiMessage) => ({
  id: message.id,
  role: message.role,
  content: message.content,
  createdAt: message.createdAt,
  status: message.status,
  kind: message.kind,
  mode: message.mode,
  sources: message.sources,
  toolsUsed: message.toolsUsed,
  versions: message.versions,
  currentVersionIndex: message.currentVersionIndex,
  proposal: message.proposal,
})

async function fetchSessionsFromApi(): Promise<MetaDjAiChatSessionSummary[] | null> {
  try {
    const response = await fetch(`/api/metadjai/conversations?limit=${SESSION_FETCH_LIMIT}`, { cache: 'no-store' })
    if (response.status === 401) return null
    if (!response.ok) return null
    const data = await response.json()
    if (Array.isArray(data.sessions)) return data.sessions as MetaDjAiChatSessionSummary[]
    if (Array.isArray(data.conversations)) return data.conversations as MetaDjAiChatSessionSummary[]
    return []
  } catch {
    return null
  }
}

async function fetchMessagesFromApi(sessionId: string): Promise<MetaDjAiMessage[] | null> {
  try {
    const response = await fetch(`/api/metadjai/conversations/${sessionId}/messages?limit=1000`, { cache: 'no-store' })
    if (!response.ok) return null
    const data = await response.json()
    if (data.success && Array.isArray(data.messages)) {
      return data.messages as MetaDjAiMessage[]
    }
    return null
  } catch {
    return null
  }
}

async function createConversationOnApi(payload: {
  id: string
  title?: string
  createdAt?: number
  updatedAt?: number
}): Promise<MetaDjAiChatSessionSummary | null> {
  try {
    const response = await fetch('/api/metadjai/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) return null
    const data = await response.json()
    if (data.success && data.conversation) {
      return data.conversation as MetaDjAiChatSessionSummary
    }
    return null
  } catch {
    return null
  }
}

async function appendMessagesOnApi(sessionId: string, messages: MetaDjAiMessage[]): Promise<boolean> {
  try {
    const response = await fetch(`/api/metadjai/conversations/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.map(mapMessagePayload) }),
    })
    return response.ok
  } catch {
    return false
  }
}

async function updateMessageOnApi(sessionId: string, message: MetaDjAiMessage): Promise<boolean> {
  try {
    const response = await fetch(`/api/metadjai/conversations/${sessionId}/messages/${message.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: mapMessagePayload(message) }),
    })
    return response.ok
  } catch {
    return false
  }
}

async function clearMessagesOnApi(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/metadjai/conversations/${sessionId}/messages`, {
      method: 'DELETE',
    })
    return response.ok
  } catch {
    return false
  }
}

async function updateConversationTitle(sessionId: string, title: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/metadjai/conversations/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    return response.ok
  } catch {
    return false
  }
}

export function useMetaDjAiMessages(): UseMetaDjAiMessagesReturn {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [messages, setMessages] = useState<MetaDjAiMessage[]>([])
  const [hasHydrated, setHasHydrated] = useState(false)
  const [sessions, setSessions] = useState<MetaDjAiChatSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [storageMode, setStorageMode] = useState<'server' | 'local'>('local')
  const messagesRef = useRef<MetaDjAiMessage[]>([])
  const sessionsRef = useRef<MetaDjAiChatSessionSummary[]>([])
  const localSessionsRef = useRef<MetaDjAiChatSession[]>([])
  const pendingCreateRef = useRef<Map<string, Promise<void>>>(new Map())

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  const persistActiveSessionId = useCallback((id: string) => {
    if (!id) return
    metadjAiHistoryStorage.saveActiveSessionId(id)
  }, [])

  const resolveActiveSessionId = useCallback((list: MetaDjAiChatSessionSummary[]) => {
    const storedActiveId = metadjAiHistoryStorage.loadActiveSessionId()
    if (storedActiveId && list.some((session) => session.id === storedActiveId)) {
      return storedActiveId
    }
    return list[0]?.id ?? ''
  }, [])

  const loadLocalSessions = useCallback(() => {
    const storedSessions = metadjAiHistoryStorage.loadSessions()
    const storedActiveId = metadjAiHistoryStorage.loadActiveSessionId()

    if (storedSessions.length === 0) {
      const previousMessages = metadjAiSessionStorage.loadMessages()
      const seed = previousMessages.length > 0 ? previousMessages : []
      const initialSession = metadjAiHistoryStorage.createSession(seed)
      const nextSessions = [initialSession]
      localSessionsRef.current = nextSessions
      setSessions(nextSessions.map(toLocalSummary))
      setActiveSessionId(initialSession.id)
      persistActiveSessionId(initialSession.id)
      metadjAiHistoryStorage.saveSessions(nextSessions)
      setMessages(initialSession.messages)
      messagesRef.current = initialSession.messages
      setHasHydrated(true)
      return
    }

    const resolvedActiveId =
      storedActiveId && storedSessions.some((s) => s.id === storedActiveId)
        ? storedActiveId
        : storedSessions[0].id

    localSessionsRef.current = storedSessions
    setSessions(storedSessions.map(toLocalSummary))
    setActiveSessionId(resolvedActiveId)
    persistActiveSessionId(resolvedActiveId)

    const activeSession = storedSessions.find((s) => s.id === resolvedActiveId)
    const activeMessages = activeSession?.messages ?? []
    setMessages(activeMessages)
    messagesRef.current = activeMessages
    setHasHydrated(true)
  }, [persistActiveSessionId])

  const refreshSessions = useCallback(async () => {
    if (!isAuthenticated) {
      loadLocalSessions()
      return
    }

    const apiSessions = await fetchSessionsFromApi()
    if (!apiSessions) {
      loadLocalSessions()
      return
    }
    setSessions(apiSessions)
    sessionsRef.current = apiSessions
    const resolvedActiveId = resolveActiveSessionId(apiSessions)
    setActiveSessionId(resolvedActiveId)
    persistActiveSessionId(resolvedActiveId)
    if (resolvedActiveId) {
      const loadedMessages = await fetchMessagesFromApi(resolvedActiveId)
      if (loadedMessages) {
        setMessages(loadedMessages)
        messagesRef.current = loadedMessages
      }
    }
  }, [isAuthenticated, loadLocalSessions, persistActiveSessionId, resolveActiveSessionId])

  const migrateLocalHistory = useCallback(async () => {
    const storedSessions = metadjAiHistoryStorage.loadSessions()
    const previousMessages = metadjAiSessionStorage.loadMessages()

    const sessionsToMigrate: MetaDjAiChatSession[] = storedSessions.length
      ? storedSessions
      : previousMessages.length
        ? [metadjAiHistoryStorage.createSession(previousMessages)]
        : []

    if (sessionsToMigrate.length === 0) return false

    try {
      const response = await fetch('/api/metadjai/conversations/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessions: sessionsToMigrate.map((session) => ({
            id: session.id,
            title: session.title || DEFAULT_TITLE,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messages: session.messages.map(mapMessagePayload),
          })),
        }),
      })
      if (!response.ok) {
        return false
      }
    } catch {
      return false
    }

    metadjAiHistoryStorage.clearSessions()
    metadjAiHistoryStorage.clearActiveSessionId()
    metadjAiSessionStorage.clearMessages()

    return true
  }, [])

  useEffect(() => {
    if (authLoading) return

    let isCancelled = false

    const loadSessions = async () => {
      if (isAuthenticated) {
        const apiSessions = await fetchSessionsFromApi()
        if (!isCancelled && apiSessions) {
          setStorageMode('server')
          setSessions(apiSessions)
          sessionsRef.current = apiSessions
          const resolvedActiveId = resolveActiveSessionId(apiSessions)
          setActiveSessionId(resolvedActiveId)
          persistActiveSessionId(resolvedActiveId)
          if (resolvedActiveId) {
            const loadedMessages = await fetchMessagesFromApi(resolvedActiveId)
            if (loadedMessages && !isCancelled) {
              setMessages(loadedMessages)
              messagesRef.current = loadedMessages
            }
          } else {
            setMessages([])
            messagesRef.current = []
          }
          setHasHydrated(true)

          const migrated = await migrateLocalHistory()
          if (migrated && !isCancelled) {
            await refreshSessions()
            const refreshedActiveId = resolveActiveSessionId(sessionsRef.current)
            if (refreshedActiveId) {
              const refreshedMessages = await fetchMessagesFromApi(refreshedActiveId)
              if (refreshedMessages && !isCancelled) {
                setMessages(refreshedMessages)
                messagesRef.current = refreshedMessages
              }
            }
          }
          return
        }
      }

      if (isCancelled) return
      setStorageMode('local')
      loadLocalSessions()
    }

    loadSessions()

    return () => {
      isCancelled = true
    }
  }, [
    authLoading,
    isAuthenticated,
    loadLocalSessions,
    migrateLocalHistory,
    persistActiveSessionId,
    refreshSessions,
    resolveActiveSessionId,
  ])

  // Persist active session messages on changes (local mode only)
  useEffect(() => {
    if (!hasHydrated) return
    if (storageMode !== 'local') return
    if (!activeSessionId) return

    const now = Date.now()
    const nextLocalSessions = localSessionsRef.current.map((session) => {
      if (session.id !== activeSessionId) return session
      const nextMessages = messages.slice(-80)
      return {
        ...session,
        messages: nextMessages,
        updatedAt: now,
        title: isDefaultTitle(session.title) ? metadjAiHistoryStorage.deriveTitle(nextMessages) : session.title,
      }
    })

    localSessionsRef.current = nextLocalSessions
    metadjAiHistoryStorage.saveSessions(nextLocalSessions)
    setSessions(nextLocalSessions.map(toLocalSummary))
  }, [activeSessionId, hasHydrated, messages, storageMode])

  useEffect(() => {
    if (!hasHydrated || !activeSessionId) return
    persistActiveSessionId(activeSessionId)
  }, [hasHydrated, activeSessionId, persistActiveSessionId])

  const updateMessages = useCallback(
    (updater: (prev: MetaDjAiMessage[]) => MetaDjAiMessage[]) => {
      setMessages((prev) => {
        const next = updater(prev)
        messagesRef.current = next
        return next
      })
    },
    []
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    messagesRef.current = []
  }, [])

  const startNewSession = useCallback((seedMessages: MetaDjAiMessage[] = []) => {
    const now = Date.now()
    const id = createConversationId()
    const title = metadjAiHistoryStorage.deriveTitle(seedMessages)
    const summary: MetaDjAiChatSessionSummary = {
      id,
      title: title || DEFAULT_TITLE,
      createdAt: now,
      updatedAt: now,
      messageCount: seedMessages.length,
    }

    setSessions((prev) => [summary, ...prev])
    setActiveSessionId(id)
    setMessages(seedMessages)
    messagesRef.current = seedMessages
    persistActiveSessionId(id)

    if (storageMode === 'local') {
      const localSession: MetaDjAiChatSession = {
        id,
        title: summary.title,
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
        messages: seedMessages,
      }
      const nextLocalSessions = [localSession, ...localSessionsRef.current]
      localSessionsRef.current = nextLocalSessions
      metadjAiHistoryStorage.saveSessions(nextLocalSessions)
      setSessions(nextLocalSessions.map(toLocalSummary))
      return id
    }

    const creationPromise = createConversationOnApi({
      id,
      title: summary.title,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    }).then((created) => {
      if (created) {
        setSessions((prev) => {
          const exists = prev.some((session) => session.id === created.id)
          if (exists) {
            return prev.map((session) => (session.id === created.id ? created : session))
          }
          return [created, ...prev]
        })
      }
    }).finally(() => {
      pendingCreateRef.current.delete(id)
    })

    pendingCreateRef.current.set(id, creationPromise)

    return id
  }, [persistActiveSessionId, storageMode])

  const ensureSession = useCallback(async (seedMessages: MetaDjAiMessage[] = []) => {
    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = startNewSession(seedMessages)
    }

    if (storageMode !== 'server') {
      return sessionId
    }

    const pending = pendingCreateRef.current.get(sessionId)
    if (pending) {
      await pending
    } else {
      const promise = createConversationOnApi({ id: sessionId }).then(() => {}).finally(() => {
        pendingCreateRef.current.delete(sessionId)
      })
      pendingCreateRef.current.set(sessionId, promise)
      await promise
    }

    return sessionId
  }, [activeSessionId, startNewSession, storageMode])

  const switchSession = useCallback((sessionId: string) => {
    if (storageMode === 'local') {
      const target = localSessionsRef.current.find((s) => s.id === sessionId)
      if (!target) return
      setActiveSessionId(sessionId)
      setMessages(target.messages)
      messagesRef.current = target.messages
      persistActiveSessionId(sessionId)
      return
    }

    const target = sessionsRef.current.find((s) => s.id === sessionId)
    if (!target) return
    setActiveSessionId(sessionId)
    persistActiveSessionId(sessionId)
    fetchMessagesFromApi(sessionId).then((loaded) => {
      if (!loaded) return
      setMessages(loaded)
      messagesRef.current = loaded
    })
  }, [persistActiveSessionId, storageMode])

  const deleteSession = useCallback((sessionId: string) => {
    if (storageMode === 'local') {
      const nextLocalSessions = localSessionsRef.current.filter((s) => s.id !== sessionId)
      if (nextLocalSessions.length === 0) {
        const fresh = metadjAiHistoryStorage.createSession()
        localSessionsRef.current = [fresh]
        metadjAiHistoryStorage.saveSessions([fresh])
        metadjAiHistoryStorage.saveActiveSessionId(fresh.id)
        setSessions([toLocalSummary(fresh)])
        setActiveSessionId(fresh.id)
        setMessages([])
        messagesRef.current = []
        return
      }

      localSessionsRef.current = nextLocalSessions
      metadjAiHistoryStorage.saveSessions(nextLocalSessions)
      setSessions(nextLocalSessions.map(toLocalSummary))

      if (activeSessionId === sessionId) {
        const fallback = nextLocalSessions[0]
        setActiveSessionId(fallback.id)
        setMessages(fallback.messages)
        messagesRef.current = fallback.messages
        metadjAiHistoryStorage.saveActiveSessionId(fallback.id)
      }

      return
    }

    fetch(`/api/metadjai/conversations/${sessionId}`, { method: 'DELETE' })
      .then(() => {
        setSessions((prev) => prev.filter((session) => session.id !== sessionId))
        if (activeSessionId === sessionId) {
          const next = sessionsRef.current.filter((session) => session.id !== sessionId)
          const fallbackId = next[0]?.id ?? ''
          setActiveSessionId(fallbackId)
          persistActiveSessionId(fallbackId)
          if (fallbackId) {
            fetchMessagesFromApi(fallbackId).then((loaded) => {
              if (!loaded) return
              setMessages(loaded)
              messagesRef.current = loaded
            })
          } else {
            setMessages([])
            messagesRef.current = []
          }
        }
      })
      .catch((error) => {
        logger.error('[MetaDJai] Failed to delete session', { error: String(error) })
      })
  }, [activeSessionId, persistActiveSessionId, storageMode])

  const persistMessages = useCallback(async (sessionId: string, payload: MetaDjAiMessage[]) => {
    if (storageMode !== 'server' || !isAuthenticated) return
    if (payload.length === 0) return

    await ensureSession()
    const ok = await appendMessagesOnApi(sessionId, payload)
    if (!ok) {
      logger.warn('[MetaDJai] Failed to persist messages')
      return
    }

    const now = Date.now()
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              updatedAt: now,
              messageCount: session.messageCount + payload.length,
            }
          : session
      )
    )

    const firstUserMessage = payload.find((message) => message.role === 'user')
    if (firstUserMessage) {
      const session = sessionsRef.current.find((item) => item.id === sessionId)
      if (session && isDefaultTitle(session.title)) {
        const derived = metadjAiHistoryStorage.deriveTitle([firstUserMessage])
        if (derived && derived !== session.title) {
          const updated = await updateConversationTitle(sessionId, derived)
          if (updated) {
            setSessions((prev) =>
              prev.map((item) => (item.id === sessionId ? { ...item, title: derived } : item))
            )
          }
        }
      }
    }
  }, [ensureSession, isAuthenticated, storageMode])

  const persistMessageUpdate = useCallback(async (sessionId: string, message: MetaDjAiMessage) => {
    if (storageMode !== 'server' || !isAuthenticated) return
    await ensureSession()
    const ok = await updateMessageOnApi(sessionId, message)
    if (!ok) {
      logger.warn('[MetaDJai] Failed to update message')
    }
  }, [ensureSession, isAuthenticated, storageMode])

  const clearSessionMessages = useCallback(async (sessionId: string) => {
    if (storageMode !== 'server' || !isAuthenticated) return
    const ok = await clearMessagesOnApi(sessionId)
    if (!ok) {
      logger.warn('[MetaDJai] Failed to clear messages')
      return
    }
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, messageCount: 0, updatedAt: Date.now() }
          : session
      )
    )
  }, [isAuthenticated, storageMode])

  return {
    messages,
    messagesRef,
    hasHydrated,
    sessions,
    activeSessionId,
    setMessages,
    updateMessages,
    clearMessages,
    startNewSession,
    switchSession,
    deleteSession,
    refreshSessions,
    ensureSession,
    persistMessages,
    persistMessageUpdate,
    clearSessionMessages,
  }
}

/**
 * Generate unique message ID using crypto.randomUUID or fallback
 */
export function createMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
