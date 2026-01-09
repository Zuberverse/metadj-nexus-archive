"use client"

/**
 * MetaDJai Actions Popover
 *
 * Displays context-aware actions, curated actions, and custom actions.
 * Extracted from MetaDjAiChat to reduce component complexity.
 */

import { useCallback, useState, type RefObject } from "react"
import clsx from "clsx"
import { X, Trash2 } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"
import {
  useCustomActions,
  MAX_CUSTOM_ACTIONS,
  MAX_CUSTOM_ACTION_TITLE,
  MAX_CUSTOM_ACTION_DESCRIPTION,
  MAX_CUSTOM_ACTION_PROMPT,
} from "@/hooks/use-custom-actions"
import { CURATED_ACTIONS, type QuickAction } from "./curated-actions"

interface MetaDjAiActionsPopoverProps {
  /** Ref for focus trap */
  popoverRef: RefObject<HTMLDivElement | null>
  /** Whether the popover is in panel mode (vs overlay) */
  isPanel: boolean
  /** Context-aware dynamic actions */
  dynamicActions: QuickAction[]
  /** Whether we're showing track or collection context */
  hasTrack: boolean
  /** Currently pending action (queued during streaming) */
  pendingAction: QuickAction | null
  /** Whether the user is rate limited */
  isRateLimited: boolean
  /** Whether MetaDJai is currently streaming */
  isStreaming: boolean
  /** Callback when an action is selected */
  onQueueAction: (action: QuickAction) => void
  /** Callback to close the popover */
  onClose: () => void
}

export function MetaDjAiActionsPopover({
  popoverRef,
  isPanel,
  dynamicActions,
  hasTrack,
  pendingAction,
  isRateLimited,
  isStreaming,
  onQueueAction,
  onClose,
}: MetaDjAiActionsPopoverProps) {
  const { showToast } = useToast()
  const { customActions, addAction, removeAction, isAtLimit: customLimitReached } = useCustomActions()

  // Custom action form state
  const [customTitle, setCustomTitle] = useState("")
  const [customDescription, setCustomDescription] = useState("")
  const [customPrompt, setCustomPrompt] = useState("")

  const isCustomSaveDisabled = customLimitReached || !customTitle.trim() || !customPrompt.trim()

  const resetCustomForm = useCallback(() => {
    setCustomTitle("")
    setCustomDescription("")
    setCustomPrompt("")
  }, [])

  const handleSaveCustomAction = useCallback(() => {
    const title = customTitle.trim()
    const prompt = customPrompt.trim()

    if (!title || !prompt) {
      showToast({ message: "Add a title and prompt to save an action.", variant: "warning" })
      return
    }

    if (customLimitReached) {
      showToast({ message: `Action limit reached (${MAX_CUSTOM_ACTIONS}). Remove one to add more.`, variant: "warning" })
      return
    }

    const success = addAction(title, customDescription.trim(), prompt)
    if (success) {
      resetCustomForm()
      showToast({ message: `Saved "${title}".`, variant: "success", collapseKey: "metadjai-custom-action-saved" })
    }
  }, [addAction, customDescription, customLimitReached, customPrompt, customTitle, resetCustomForm, showToast])

  const handleRemoveCustomAction = useCallback((id: string) => {
    removeAction(id)
    showToast({ message: "Custom action removed.", variant: "info", collapseKey: "metadjai-custom-action-removed" })
  }, [removeAction, showToast])

  const handleSelectAction = useCallback((action: QuickAction) => {
    onQueueAction(action)
    onClose()
  }, [onQueueAction, onClose])

  return (
    <div
      ref={popoverRef}
      className={clsx(
        "absolute top-14 bottom-16 z-100 rounded-3xl border border-white/20 bg-(--bg-surface-elevated)/95 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.5)] backdrop-blur-xl flex flex-col overflow-hidden min-h-0",
        isPanel ? "left-2 right-2" : "left-1/2 -translate-x-1/2 max-w-2xl w-[calc(100%-1rem)]"
      )}
    >
      <div className="mb-2 flex justify-end shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-accessible transition hover:text-white hover:bg-white/10 focus-ring-glow"
          aria-label="Close actions"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 overflow-y-auto flex-1 min-h-0 pr-1 scrollbar-hide">
        {/* Context Suggestions */}
        <div className="col-span-full mb-3">
          <p className="text-center text-sm font-heading font-semibold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">
            {hasTrack ? "Now Playing" : "Collection Context"}
          </p>
        </div>

        {dynamicActions.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={isRateLimited}
            onClick={() => handleSelectAction(action)}
            className={clsx(
              "group flex flex-col gap-1.5 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 px-4 py-3 text-left transition-all duration-300",
              "hover:border-cyan-400/50 hover:bg-cyan-900/20 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] focus-ring-glow",
              isRateLimited && "cursor-not-allowed opacity-50",
              pendingAction?.id === action.id && "border-cyan-400/60 bg-cyan-900/20",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-heading font-bold text-cyan-100 group-hover:text-cyan-50 transition-colors">{action.title}</p>
              {pendingAction?.id === action.id && (
                <span className="text-[10px] text-cyan-200/80">Queued</span>
              )}
            </div>
            <p className="text-xs text-cyan-200/60 leading-snug group-hover:text-cyan-100/80 transition-colors">{action.description}</p>
          </button>
        ))}

        {/* Curated On-Demand */}
        <div className="col-span-full mb-3 mt-5">
          <p className="text-center text-sm font-heading font-semibold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-200">
            On Demand
          </p>
        </div>

        {CURATED_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={isRateLimited}
            onClick={() => handleSelectAction(action)}
            className={clsx(
              "group flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/2 px-4 py-3 text-left transition-all duration-300",
              "hover:border-purple-500/40 hover:bg-purple-500/10 hover:shadow-[0_0_25px_rgba(168,85,247,0.1)] focus-ring-glow",
              isRateLimited && "cursor-not-allowed opacity-50",
              pendingAction?.id === action.id && "border-purple-400/60 bg-purple-500/15",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-heading font-bold text-white/90 group-hover:text-purple-200 transition-colors">{action.title}</p>
              {pendingAction?.id === action.id && (
                <span className="text-[10px] text-purple-200/80">Queued</span>
              )}
            </div>
            <p className="text-xs text-white/70 leading-snug group-hover:text-white/85 transition-colors">{action.description}</p>
          </button>
        ))}

        {/* Custom Actions */}
        <div className="col-span-full mt-5 flex items-center justify-between">
          <p className="text-sm font-heading font-semibold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-fuchsia-200">
            Custom Actions
          </p>
          <span className="text-[10px] text-muted-accessible">{customActions.length}/{MAX_CUSTOM_ACTIONS} saved</span>
        </div>

        <div className="col-span-full rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Title
              <input
                type="text"
                value={customTitle}
                onChange={(event) => setCustomTitle(event.target.value)}
                maxLength={MAX_CUSTOM_ACTION_TITLE}
                placeholder="Give it a name"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-muted-accessible focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
              />
            </label>
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Description
              <input
                type="text"
                value={customDescription}
                onChange={(event) => setCustomDescription(event.target.value)}
                maxLength={MAX_CUSTOM_ACTION_DESCRIPTION}
                placeholder="Short summary"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-muted-accessible focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
              />
            </label>
          </div>
          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Prompt
            <textarea
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              maxLength={MAX_CUSTOM_ACTION_PROMPT}
              rows={3}
              placeholder="Write the prompt you want to reuse."
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-muted-accessible focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-accessible">
            <span>{customPrompt.length}/{MAX_CUSTOM_ACTION_PROMPT}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetCustomForm}
                className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 transition hover:border-white/20 hover:text-white"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSaveCustomAction}
                disabled={isCustomSaveDisabled}
                className={clsx(
                  "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] transition",
                  isCustomSaveDisabled
                    ? "border-white/10 text-white/30"
                    : "border-fuchsia-400/40 text-fuchsia-100 hover:border-fuchsia-300/70 hover:text-white"
                )}
              >
                Save
              </button>
            </div>
          </div>
          {customLimitReached && (
            <p className="mt-2 text-[11px] text-amber-200/70">
              Remove a saved action to add a new one.
            </p>
          )}
          <p className="mt-2 text-[10px] text-muted-accessible">
            Saved locally on this device.
          </p>
        </div>

        {customActions.length === 0 && (
          <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-xs text-white/60">
            No custom actions yet.
          </div>
        )}

        {customActions.map((action) => (
          <div key={action.id} className="relative">
            <button
              type="button"
              disabled={isRateLimited}
              onClick={() => handleSelectAction(action)}
              className={clsx(
                "group flex w-full flex-col gap-1.5 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-950/10 px-4 py-3 text-left transition-all duration-300",
                "hover:border-fuchsia-400/50 hover:bg-fuchsia-900/20 hover:shadow-[0_0_25px_rgba(217,70,239,0.18)] focus-ring-glow",
                isRateLimited && "cursor-not-allowed opacity-50",
                pendingAction?.id === action.id && "border-fuchsia-400/60 bg-fuchsia-900/20",
              )}
            >
              <div className="flex items-center justify-between pr-8">
                <p className="text-sm font-heading font-bold text-fuchsia-100 group-hover:text-fuchsia-50 transition-colors">{action.title}</p>
                {pendingAction?.id === action.id && (
                  <span className="text-[10px] text-fuchsia-200/80">Queued</span>
                )}
              </div>
              <p className="text-xs text-fuchsia-200/60 leading-snug group-hover:text-fuchsia-100/80 transition-colors">{action.description}</p>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                handleRemoveCustomAction(action.id)
              }}
              className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-accessible transition hover:bg-red-500/10 hover:text-red-200 focus-ring-glow"
              aria-label={`Delete ${action.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {(isRateLimited || isStreaming || pendingAction) && (
        <p className="mt-2 text-center text-[11px] text-white/60">
          {isRateLimited
            ? "Rate limit active."
            : pendingAction
              ? `${pendingAction.title} queued — runs after this response finishes.`
              : "Selections apply after this response finishes."}
        </p>
      )}
    </div>
  )
}
