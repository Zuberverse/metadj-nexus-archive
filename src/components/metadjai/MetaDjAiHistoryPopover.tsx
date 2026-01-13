"use client"

/**
 * MetaDJai History Popover
 *
 * Displays chat session history with the ability to switch between
 * sessions, create new ones, and delete old conversations.
 */

import { type RefObject } from "react"
import clsx from "clsx"
import { X, Plus, Trash2, AlertTriangle } from "lucide-react"
import type { MetaDjAiChatSessionSummary } from "@/types/metadjai.types"

interface MetaDjAiHistoryPopoverProps {
  /** Ref for focus trap */
  popoverRef: RefObject<HTMLDivElement | null>
  /** Ref for delete confirmation dialog */
  deleteDialogRef: RefObject<HTMLDivElement | null>
  /** Whether the popover is in panel mode (vs overlay) */
  isPanel: boolean
  /** Available chat sessions */
  sessions: MetaDjAiChatSessionSummary[]
  /** Currently active session ID */
  activeSessionId: string | null | undefined
  /** Session pending deletion (for confirmation) */
  pendingDeleteSessionId: string | null
  /** Callback to select a session */
  onSelectSession: (sessionId: string) => void
  /** Callback to create a new session */
  onNewSession?: () => void
  /** Callback to delete a session */
  onDeleteSession?: (sessionId: string) => void
  /** Set the pending delete session ID */
  onSetPendingDelete: (sessionId: string | null) => void
  /** Callback to close the popover */
  onClose: () => void
}

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
}: MetaDjAiHistoryPopoverProps) {
  const pendingDeleteSession = pendingDeleteSessionId
    ? sessions.find((session) => session.id === pendingDeleteSessionId) ?? null
    : null

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
            {onNewSession && (
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
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-accessible transition hover:text-white hover:bg-white/10 focus-ring-glow"
              aria-label="Close history"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <ul className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 scrollbar-hide">
          {sessions.length === 0 && (
            <li className="text-center text-xs text-white/70 py-6">No saved chats yet.</li>
          )}
          {sessions.map((session) => {
            const isActive = activeSessionId === session.id
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
                  {/* WCAG: text-white/70 for 4.5:1 contrast on metadata */}
                  <p className="text-[11px] text-white/70 truncate">
                    {updatedLabel} · {session.messageCount} msg{session.messageCount === 1 ? "" : "s"}
                  </p>
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
              </li>
            )
          })}
        </ul>
      </div>

      {/* Delete Confirmation Dialog */}
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
    </>
  )
}
