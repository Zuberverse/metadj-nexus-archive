"use client"

/**
 * MetaDJai History Popover
 *
 * Displays chat session history with the ability to switch between
 * sessions, create new ones, archive, unarchive, and delete conversations.
 */

import { type RefObject, useState, useEffect, useCallback } from "react"
import clsx from "clsx"
import { X, Plus, Trash2, AlertTriangle, Archive, ArchiveRestore, Loader2 } from "lucide-react"
import { logger } from "@/lib/logger"
import type { MetaDjAiChatSessionSummary } from "@/types/metadjai.types"

type TabType = "active" | "archived"

interface ArchivedConversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  archivedAt: number
  messageCount: number
}

interface MetaDjAiHistoryPopoverProps {
  popoverRef: RefObject<HTMLDivElement | null>
  deleteDialogRef: RefObject<HTMLDivElement | null>
  isPanel: boolean
  sessions: MetaDjAiChatSessionSummary[]
  activeSessionId: string | null | undefined
  pendingDeleteSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onNewSession?: () => void
  onDeleteSession?: (sessionId: string) => void
  onSetPendingDelete: (sessionId: string | null) => void
  onClose: () => void
  onArchiveSession?: (sessionId: string) => void
  onUnarchiveSession?: (sessionId: string) => void
  onRefreshSessions?: () => void
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export function MetaDjAiHistoryPopover({
  popoverRef,
  deleteDialogRef,
  isPanel,
  sessions,
  activeSessionId,
  pendingDeleteSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onSetPendingDelete,
  onClose,
  onArchiveSession,
  onUnarchiveSession,
  onRefreshSessions,
}: MetaDjAiHistoryPopoverProps) {
  const [activeTab, setActiveTab] = useState<TabType>("active")
  const [archivedConversations, setArchivedConversations] = useState<ArchivedConversation[]>([])
  const [isLoadingArchived, setIsLoadingArchived] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null)
  const [pendingUnarchiveId, setPendingUnarchiveId] = useState<string | null>(null)
  const [pendingHardDeleteId, setPendingHardDeleteId] = useState<string | null>(null)

  const pendingDeleteSession = pendingDeleteSessionId
    ? sessions.find((session) => session.id === pendingDeleteSessionId) ?? null
    : null

  const pendingHardDeleteConversation = pendingHardDeleteId
    ? archivedConversations.find((conv) => conv.id === pendingHardDeleteId) ?? null
    : null

  const fetchArchivedConversations = useCallback(async () => {
    setIsLoadingArchived(true)
    setArchiveError(null)
    try {
      const response = await fetch("/api/metadjai/conversations/archived")
      if (!response.ok) {
        throw new Error("Failed to fetch archived conversations")
      }
      const data = await response.json()
      if (data.success && data.conversations) {
        setArchivedConversations(data.conversations)
      }
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : "Failed to load archived conversations")
    } finally {
      setIsLoadingArchived(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "archived") {
      fetchArchivedConversations()
    }
  }, [activeTab, fetchArchivedConversations])

  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId)
    onClose()
    onSetPendingDelete(null)
  }

  const handleNewSession = () => {
    if (onNewSession) {
      onNewSession()
      onClose()
      onSetPendingDelete(null)
    }
  }

  const handleConfirmDelete = () => {
    if (pendingDeleteSessionId && onDeleteSession) {
      onDeleteSession(pendingDeleteSessionId)
      onSetPendingDelete(null)
    }
  }

  const handleArchiveSession = async (sessionId: string) => {
    setPendingArchiveId(sessionId)
    try {
      const response = await fetch(`/api/metadjai/conversations/${sessionId}/archive`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Failed to archive conversation")
      }
      onArchiveSession?.(sessionId)
      onRefreshSessions?.()
    } catch (error) {
      logger.error("[MetaDJai] Archive error", { error: toErrorMessage(error) })
    } finally {
      setPendingArchiveId(null)
    }
  }

  const handleUnarchiveSession = async (sessionId: string) => {
    setPendingUnarchiveId(sessionId)
    try {
      const response = await fetch(`/api/metadjai/conversations/${sessionId}/unarchive`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Failed to unarchive conversation")
      }
      onUnarchiveSession?.(sessionId)
      setArchivedConversations((prev) => prev.filter((conv) => conv.id !== sessionId))
      onRefreshSessions?.()
    } catch (error) {
      logger.error("[MetaDJai] Unarchive error", { error: toErrorMessage(error) })
    } finally {
      setPendingUnarchiveId(null)
    }
  }

  const handleConfirmHardDelete = async () => {
    if (!pendingHardDeleteId) return

    try {
      const response = await fetch(`/api/metadjai/conversations/${pendingHardDeleteId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to delete conversation")
      }
      setArchivedConversations((prev) => prev.filter((conv) => conv.id !== pendingHardDeleteId))
    } catch (error) {
      logger.error("[MetaDJai] Hard delete error", { error: toErrorMessage(error) })
    } finally {
      setPendingHardDeleteId(null)
    }
  }

  return (
    <>
      <div
        ref={popoverRef}
        className={clsx(
          "absolute top-14 z-100 rounded-3xl border border-white/20 bg-(--bg-surface-elevated)/95 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.5)] backdrop-blur-xl",
          isPanel ? "left-2 right-2" : "left-1/2 -translate-x-1/2 max-w-2xl w-[calc(100%-1rem)]"
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-heading font-semibold uppercase tracking-[0.2em] text-heading-solid">
            History
          </p>
          <div className="flex items-center gap-2">
            {onNewSession && activeTab === "active" && (
              <button
                type="button"
                onClick={handleNewSession}
                className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2.5 py-1 text-[10px] font-heading font-medium uppercase tracking-[0.1em] text-white/60 hover:bg-white/10 hover:text-white transition"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose()
                onSetPendingDelete(null)
                setPendingHardDeleteId(null)
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-accessible transition hover:text-white hover:bg-white/10 focus-ring-glow"
              aria-label="Close history"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-3 flex gap-1 rounded-xl bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={clsx(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              activeTab === "active"
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archived")}
            className={clsx(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5",
              activeTab === "archived"
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Archive className="h-3 w-3" />
            Archived
          </button>
        </div>

        {activeTab === "active" && (
          <ul className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 scrollbar-on-hover">
            {sessions.length === 0 && (
              <li className="text-center text-xs text-white/70 py-6">No saved chats yet.</li>
            )}
            {sessions.map((session) => {
              const isActive = activeSessionId === session.id
              const isArchiving = pendingArchiveId === session.id
              const updatedLabel = new Date(session.updatedAt).toLocaleString()
              return (
                <li
                  key={session.id}
                  className={clsx(
                    "flex items-start gap-2 rounded-2xl border px-3 py-2 transition-all",
                    isActive
                      ? "border-purple-400/40 bg-purple-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectSession(session.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-semibold text-white truncate">{session.title}</p>
                    <p className="text-[11px] text-white/70 truncate">
                      {updatedLabel} · {session.messageCount} msg{session.messageCount === 1 ? "" : "s"}
                    </p>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleArchiveSession(session.id)}
                      disabled={isArchiving}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-accessible hover:text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"
                      aria-label="Archive chat"
                    >
                      {isArchiving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {onDeleteSession && (
                      <button
                        type="button"
                        onClick={() => onSetPendingDelete(session.id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-accessible hover:text-red-200 hover:bg-red-500/10"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {activeTab === "archived" && (
          <div className="max-h-[55vh] overflow-y-auto pr-1 scrollbar-on-hover">
            {isLoadingArchived && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-white/50" />
              </div>
            )}

            {archiveError && (
              <div className="text-center text-xs text-red-400 py-6">
                {archiveError}
              </div>
            )}

            {!isLoadingArchived && !archiveError && archivedConversations.length === 0 && (
              <div className="text-center text-xs text-white/70 py-6">No archived chats.</div>
            )}

            {!isLoadingArchived && !archiveError && archivedConversations.length > 0 && (
              <ul className="space-y-2">
                {archivedConversations.map((conversation) => {
                  const isUnarchiving = pendingUnarchiveId === conversation.id
                  const archivedLabel = new Date(conversation.archivedAt).toLocaleString()
                  return (
                    <li
                      key={conversation.id}
                      className="flex items-start gap-2 rounded-2xl border border-white/15 bg-black/30 px-3 py-2 transition-all opacity-80 hover:opacity-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/80 truncate">{conversation.title}</p>
                        <p className="text-[11px] text-white/50 truncate">
                          Archived {archivedLabel} · {conversation.messageCount} msg{conversation.messageCount === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUnarchiveSession(conversation.id)}
                          disabled={isUnarchiving}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-accessible hover:text-green-200 hover:bg-green-500/10 disabled:opacity-50"
                          aria-label="Unarchive chat"
                        >
                          {isUnarchiving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setPendingHardDeleteId(conversation.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-accessible hover:text-red-200 hover:bg-red-500/10"
                          aria-label="Delete permanently"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {pendingDeleteSessionId && onDeleteSession && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-(--bg-surface-elevated) border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-full bg-red-400/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-heading-solid">Delete Chat?</h3>
            </div>

            <p className="text-white/70">
              Are you sure you want to delete {pendingDeleteSession?.title ? `"${pendingDeleteSession.title}"` : "this chat"}? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => onSetPendingDelete(null)}
                className="px-4 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-lg shadow-red-500/20"
              >
                Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingHardDeleteId && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-(--bg-surface-elevated) border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-full bg-red-400/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-heading-solid">Delete Permanently?</h3>
            </div>

            <p className="text-white/70">
              Are you sure you want to permanently delete {pendingHardDeleteConversation?.title ? `"${pendingHardDeleteConversation.title}"` : "this archived chat"}? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingHardDeleteId(null)}
                className="px-4 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHardDelete}
                className="px-5 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-lg shadow-red-500/20"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
