import type { MetaDjAiMessage } from "@/types/metadjai.types"

export interface MetaDjAiChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: MetaDjAiMessage[]
}

const STORAGE_KEYS = {
  sessions: "metadj-nexus.metadjai.sessions",
  activeSessionId: "metadj-nexus.metadjai.activeSessionId",
} as const

const MAX_MESSAGES_PER_SESSION = 80

const getStorage = () => {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const createSessionId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const deriveTitle = (messages: MetaDjAiMessage[]): string => {
  const firstUser = messages.find((m) => m.role === "user" && m.content.trim().length > 0)
  if (!firstUser) return "New chat"
  const trimmed = firstUser.content.trim()
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed
}

function normalizeSession(candidate: unknown): MetaDjAiChatSession | null {
  if (!candidate || typeof candidate !== "object") return null
  const obj = candidate as Record<string, unknown>
  if (typeof obj.id !== "string" || typeof obj.title !== "string") return null
  const createdAt = Number(obj.createdAt)
  const updatedAt = Number(obj.updatedAt)
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) return null
  if (!Array.isArray(obj.messages)) return null
  return {
    id: obj.id,
    title: obj.title,
    createdAt,
    updatedAt,
    messages: obj.messages as MetaDjAiMessage[],
  }
}

export const metadjAiHistoryStorage = {
  loadSessions(): MetaDjAiChatSession[] {
    const storage = getStorage()
    if (!storage) return []

    const raw = storage.getItem(STORAGE_KEYS.sessions)
    if (!raw) return []

    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .map(normalizeSession)
        .filter((s): s is MetaDjAiChatSession => Boolean(s))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    } catch {
      return []
    }
  },

  saveSessions(sessions: MetaDjAiChatSession[]): void {
    const storage = getStorage()
    if (!storage) return

    try {
      const payload = sessions.map((s) => ({
        ...s,
        messages: s.messages.slice(-MAX_MESSAGES_PER_SESSION),
      }))
      storage.setItem(STORAGE_KEYS.sessions, JSON.stringify(payload))
    } catch {
      // ignore
    }
  },

  loadActiveSessionId(): string | null {
    const storage = getStorage()
    if (!storage) return null
    try {
      return storage.getItem(STORAGE_KEYS.activeSessionId)
    } catch {
      return null
    }
  },

  saveActiveSessionId(id: string): void {
    const storage = getStorage()
    if (!storage) return
    try {
      storage.setItem(STORAGE_KEYS.activeSessionId, id)
    } catch {
      // ignore
    }
  },

  clearSessions(): void {
    const storage = getStorage()
    if (!storage) return
    try {
      storage.removeItem(STORAGE_KEYS.sessions)
    } catch {
      // ignore
    }
  },

  clearActiveSessionId(): void {
    const storage = getStorage()
    if (!storage) return
    try {
      storage.removeItem(STORAGE_KEYS.activeSessionId)
    } catch {
      // ignore
    }
  },

  clearAll(): void {
    this.clearSessions()
    this.clearActiveSessionId()
  },

  createSession(seedMessages: MetaDjAiMessage[] = []): MetaDjAiChatSession {
    const now = Date.now()
    return {
      id: createSessionId(),
      title: deriveTitle(seedMessages),
      createdAt: now,
      updatedAt: now,
      messages: seedMessages.slice(-MAX_MESSAGES_PER_SESSION),
    }
  },

  deriveTitle,
}
