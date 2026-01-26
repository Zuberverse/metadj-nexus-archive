"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import { RefreshCcw, Maximize2, Minimize2, History, ChevronDown, Sparkles, SlidersHorizontal } from "lucide-react"
import { announce } from "@/components/accessibility/ScreenReaderAnnouncer"
import { type QuickAction } from "@/components/metadjai/curated-actions"
import { MetaDjAiActionsPopover } from "@/components/metadjai/MetaDjAiActionsPopover"
import { MetaDjAiChatInput } from "@/components/metadjai/MetaDjAiChatInput"
import { MetaDjAiHistoryPopover } from "@/components/metadjai/MetaDjAiHistoryPopover"
import { MetaDjAiMessageList } from "@/components/metadjai/MetaDjAiMessageList"
import { MetaDjAiPersonalizePopover } from "@/components/metadjai/MetaDjAiPersonalizePopover"
import { MetaDjAiWelcomeState, buildWelcomeStarters, buildNoTrackStarters } from "@/components/metadjai/MetaDjAiWelcomeState"
import { usePlayer } from "@/contexts/PlayerContext"
import { useUI } from "@/contexts/UIContext"
import { useCspStyle } from "@/hooks/use-csp-style"
import { useDynamicActions } from "@/hooks/use-dynamic-actions"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { useMobileKeyboard } from "@/hooks/use-mobile-keyboard"
import { usePanelPosition } from "@/hooks/use-panel-position"
import { useSwipeGesture } from "@/hooks/use-swipe-gesture"
import { MODEL_OPTIONS } from "@/lib/ai/model-preferences"
import { trackActivationFirstChat } from "@/lib/analytics"
import type { MetaDjAiChatProps, MetaDjAiProvider } from "@/types/metadjai.types"

interface MetaDjAiChatComponentProps extends MetaDjAiChatProps {
  headerHeight: number
  /** Display mode: "overlay" for centered modal, "panel" for side panel */
  variant?: "overlay" | "panel"
  /** When true, overlay spans full height below header (mobile) instead of centered modal */
  isMobileOverlay?: boolean
}

/**
 * MetaDjAiChat - Chat panel for the MetaDJai companion experience
 *
 * Provides an interactive chat experience with MetaDJai (my AI extension) as the encoded voice of MetaDJ.
 * Features streaming responses, session management, and context-aware conversations that span music and broader creative journeys.
 */
export function MetaDjAiChat({
  isOpen,
  onClose,
  messages,
  isStreaming,
  error,
  onSend,
  onRefresh,
  onRegenerate,
  onSwitchVersion,
  onRetry,
  canRetry = false,
  onStop,
  rateLimit,
  welcomeDetails,
  modelPreference = "openai",
  onModelPreferenceChange,
  personalization,
  onPersonalizationToggle,
  onPersonalizationUpdate,
  headerHeight,
  hasTrack = false,
  variant = "overlay",
  isMobileOverlay = false,
  isFullscreen = false,
  onToggleFullscreen,
  onNewSession,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRefreshSessions,
}: MetaDjAiChatComponentProps) {
  const isPanel = variant === "panel"
  const isFullscreenMobile = isMobileOverlay && variant === "overlay"
  const [inputValue, setInputValue] = useState("")
  const [confirmReset, setConfirmReset] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [isPersonalizeOpen, setIsPersonalizeOpen] = useState(false)
  const [isModelOpen, setIsModelOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null)
  const [pendingModel, setPendingModel] = useState<MetaDjAiProvider | null>(null)
  const [showPulse, setShowPulse] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null)
  const [runwayHeight, setRunwayHeight] = useState<number | null>(null)
  const [restingRunwayPadding, setRestingRunwayPadding] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const programmaticScrollRef = useRef(false)
  const programmaticScrollTimeoutRef = useRef<number | null>(null)
  const userScrolledDuringStreamRef = useRef(false)
  const lastUserInputRef = useRef(0)
  const lastStreamingScrollTopRef = useRef<number | null>(null)
  const wasStreamingRef = useRef(false)
  const wasOpenRef = useRef(false)
  const hasInitializedScrollRef = useRef(false) // Persists across toggles, only false on page load
  const previousMessageCountRef = useRef(0)
  const pendingModelSwitchScrollRef = useRef(false)
  const prevTrackIdRef = useRef<string | null>(null)
  const hasMountedForPulseRef = useRef(false)
  const pendingScrollToLatestUserRef = useRef(false)
  const pendingScrollBehaviorRef = useRef<ScrollBehavior>("smooth")
  const previousSessionIdRef = useRef<string | null>(null)
  const previousUserMessageIdRef = useRef<string | null>(null)
  const pendingModelRequestedRef = useRef(false)
  const actionsButtonRef = useRef<HTMLButtonElement | null>(null)
  const actionsPopoverRef = useRef<HTMLDivElement | null>(null)
  const personalizeButtonRef = useRef<HTMLButtonElement | null>(null)
  const personalizePopoverRef = useRef<HTMLDivElement | null>(null)
  const modelButtonRef = useRef<HTMLButtonElement | null>(null)
  const modelPopoverRef = useRef<HTMLDivElement | null>(null)
  const historyButtonRef = useRef<HTMLButtonElement | null>(null)
  const historyPopoverRef = useRef<HTMLDivElement | null>(null)
  const deleteDialogRef = useRef<HTMLDivElement | null>(null)
  const overlayContainerRef = useRef<HTMLDivElement | null>(null)
  const { currentTrack } = usePlayer()
  const { selectedCollection } = useUI()
  const hasTrackPlaying = Boolean(currentTrack)
  const position = usePanelPosition(headerHeight)
  const collectionLabel = welcomeDetails?.collectionTitle ?? "Featured"
  const dynamicActions = useDynamicActions({ currentTrack, collectionLabel })

  // Focus traps for popovers (WCAG 2.4.3 compliant)
  useFocusTrap(actionsPopoverRef, { enabled: isActionsOpen, restoreFocus: true })
  useFocusTrap(personalizePopoverRef, { enabled: isPersonalizeOpen, restoreFocus: true })
  useFocusTrap(modelPopoverRef, { enabled: isModelOpen, restoreFocus: true })
  useFocusTrap(historyPopoverRef, { enabled: isHistoryOpen && !pendingDeleteSessionId, restoreFocus: true })

  // Mobile swipe-to-dismiss gesture for overlay variant (disabled for fullscreen mobile)
  useSwipeGesture(overlayContainerRef, {
    onSwipeDown: (!isPanel && !isFullscreenMobile) ? onClose : undefined,
    minSwipeDistance: 80,
    maxCrossAxisDistance: 150,
  })

  // Mobile keyboard handling (extracted hook)
  const { keyboardHeight } = useMobileKeyboard({
    enabled: isFullscreenMobile && isOpen,
  })

  const starterSuggestions = useMemo(
    () => buildWelcomeStarters(welcomeDetails),
    [welcomeDetails]
  )
  const noTrackSuggestions = useMemo(
    () => buildNoTrackStarters(currentTrack?.title, currentTrack?.artist, selectedCollection),
    [currentTrack?.artist, currentTrack?.title, selectedCollection],
  )

  const latestUserMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "user") {
        return messages[index]?.id
      }
    }
    return null
  }, [messages])

  const activeModelLabel = useMemo(() => {
    const match = MODEL_OPTIONS.find((option) => option.value === modelPreference)
    return match?.label ?? "GPT"
  }, [modelPreference])

  const pendingModelLabel = useMemo(() => {
    if (!pendingModel) return null
    const match = MODEL_OPTIONS.find((option) => option.value === pendingModel)
    return match?.label ?? "Model"
  }, [pendingModel])

  const handleCopyMessage = useCallback((content: string) => {
    if (typeof navigator === "undefined" || typeof navigator.clipboard === "undefined") return
    navigator.clipboard.writeText(content).catch(() => { })
  }, [])

  const handleArchiveSession = useCallback((_sessionId: string) => {
    // No-op: popover already refreshes after archive
  }, [])

  const handleUnarchiveSession = useCallback((_sessionId: string) => {
    // No-op: popover already refreshes after unarchive
  }, [])

  const handleRefreshSessions = useCallback(() => {
    onRefreshSessions?.()
  }, [onRefreshSessions])

  useEffect(() => {
    if (!isOpen) {
      setConfirmReset(false)
      setIsActionsOpen(false)
      setIsPersonalizeOpen(false)
      setIsHistoryOpen(false)
      setIsModelOpen(false)
      setPendingAction(null)
      setPendingModel(null)
      setPendingDeleteSessionId(null)
      pendingModelRequestedRef.current = false
      pendingModelSwitchScrollRef.current = false
      return
    }

    // Trigger pulse when track changes (skip initial mount)
    if (currentTrack && currentTrack.id !== prevTrackIdRef.current) {
      const isInitialMount = !hasMountedForPulseRef.current
      prevTrackIdRef.current = currentTrack.id
      hasMountedForPulseRef.current = true

      // Skip pulse on initial mount - only pulse on actual track changes
      if (isInitialMount) {
        return undefined
      }

      // Pulse for 6 seconds (3 cycles of 2s)
      setShowPulse(true)
      const timeoutId = setTimeout(() => {
        setShowPulse(false)
      }, 6000)

      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [isOpen, currentTrack, hasTrackPlaying])

  // Close Actions popover on outside click
  useEffect(() => {
    if (!isActionsOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (actionsPopoverRef.current?.contains(target) || actionsButtonRef.current?.contains(target)) {
        return
      }
      setIsActionsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isActionsOpen])

  // Close Personalize popover on outside click
  useEffect(() => {
    if (!isPersonalizeOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (personalizePopoverRef.current?.contains(target) || personalizeButtonRef.current?.contains(target)) {
        return
      }
      setIsPersonalizeOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isPersonalizeOpen])

  // Close Model popover on outside click
  useEffect(() => {
    if (!isModelOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (modelPopoverRef.current?.contains(target) || modelButtonRef.current?.contains(target)) {
        return
      }
      setIsModelOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isModelOpen])

  // Close History popover on outside click
  useEffect(() => {
    if (!isHistoryOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        historyPopoverRef.current?.contains(target)
        || historyButtonRef.current?.contains(target)
        || deleteDialogRef.current?.contains(target)
      ) {
        return
      }
      if (pendingDeleteSessionId) {
        setPendingDeleteSessionId(null)
        return
      }
      setIsHistoryOpen(false)
      setPendingDeleteSessionId(null)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isHistoryOpen, pendingDeleteSessionId])

  const markProgrammaticScroll = useCallback(() => {
    programmaticScrollRef.current = true
    if (programmaticScrollTimeoutRef.current !== null) {
      window.clearTimeout(programmaticScrollTimeoutRef.current)
    }
    programmaticScrollTimeoutRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false
      programmaticScrollTimeoutRef.current = null
    }, 450)
  }, [])

  useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current !== null) {
        window.clearTimeout(programmaticScrollTimeoutRef.current)
        programmaticScrollTimeoutRef.current = null
      }
    }
  }, [])

  const scrollToMessageStart = useCallback((messageId: string, behavior: ScrollBehavior = "smooth") => {
    const container = scrollRef.current
    const messageNode =
      typeof document !== "undefined"
        ? document.getElementById(`metadjai-message-${messageId}`)
        : null

    if (!container || !messageNode) return

    const messageRect = messageNode.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const paddingTop = 8
    const scrollOffset = container.scrollTop + (messageRect.top - containerRect.top) - paddingTop
    lastStreamingScrollTopRef.current = Math.max(0, scrollOffset)

    markProgrammaticScroll()
    container.scrollTo({ top: Math.max(0, scrollOffset), behavior })
  }, [markProgrammaticScroll])

  // Helper function to scroll latest user message to top of viewport
  const scrollToLatestUserMessage = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollRef.current
    if (!container) return

    if (!latestUserMessageId) {
      markProgrammaticScroll()
      container.scrollTo({ top: 0, behavior })
      lastStreamingScrollTopRef.current = 0
      return
    }

    // Retry logic: try up to 3 times to find the element in DOM
    const attemptScroll = (retryCount: number) => {
      const targetNode =
        typeof document !== "undefined"
          ? document.getElementById(`metadjai-message-${latestUserMessageId}`)
          : null

      if (!targetNode) {
        if (retryCount < 3) {
          requestAnimationFrame(() => attemptScroll(retryCount + 1))
          return
        }
        // Final fallback: scroll to bottom if message element still not in DOM
        markProgrammaticScroll()
        const scrollTop = container.scrollHeight
        container.scrollTo({ top: scrollTop, behavior })
        lastStreamingScrollTopRef.current = scrollTop
        return
      }

      scrollToMessageStart(latestUserMessageId, behavior)
    }

    attemptScroll(0)
  }, [latestUserMessageId, markProgrammaticScroll, scrollToMessageStart])

  // Scroll behavior when panel opens:
  // - Initial page load/refresh: scroll to BOTTOM of chat (see latest messages)
  // - Mid-experience toggle: preserve scroll position (no auto-scroll)
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true

    const container = scrollRef.current
    if (!container) return

    // Only auto-scroll on initial page load, not on subsequent toggles
    if (hasInitializedScrollRef.current) return
    hasInitializedScrollRef.current = true

    const frameId = requestAnimationFrame(() => {
      // Scroll to bottom on initial load so user sees the most recent messages
      markProgrammaticScroll()
      const scrollTop = container.scrollHeight
      container.scrollTo({ top: scrollTop, behavior: "auto" })
      // Track this position so post-streaming logic has correct reference
      lastStreamingScrollTopRef.current = scrollTop
    })

    return () => cancelAnimationFrame(frameId)
  }, [isOpen, markProgrammaticScroll])

  useEffect(() => {
    if (!isOpen) {
      setRunwayHeight(null)
      return
    }

    const container = scrollRef.current
    if (!container) return

    const updateRunwayHeight = () => {
      setRunwayHeight(container.clientHeight)
    }

    updateRunwayHeight()

    if (typeof ResizeObserver === "undefined") {
      if (typeof window !== "undefined") {
        window.addEventListener("resize", updateRunwayHeight)
        return () => window.removeEventListener("resize", updateRunwayHeight)
      }
      return
    }

    const observer = new ResizeObserver(updateRunwayHeight)
    observer.observe(container)
    return () => observer.disconnect()
  }, [isOpen])

  useEffect(() => {
    if (!activeSessionId) return

    if (previousSessionIdRef.current === null) {
      previousSessionIdRef.current = activeSessionId
      return
    }

    if (!isOpen) {
      previousSessionIdRef.current = activeSessionId
      return
    }

    if (previousSessionIdRef.current === activeSessionId) return

    previousSessionIdRef.current = activeSessionId
    pendingScrollToLatestUserRef.current = true
    pendingScrollBehaviorRef.current = "auto"
  }, [activeSessionId, isOpen])

  useEffect(() => {
    if (!isOpen) {
      previousUserMessageIdRef.current = latestUserMessageId
      return
    }

    if (!latestUserMessageId) {
      previousUserMessageIdRef.current = null
      return
    }

    if (previousUserMessageIdRef.current === null) {
      previousUserMessageIdRef.current = latestUserMessageId
      return
    }

    if (previousUserMessageIdRef.current === latestUserMessageId) return

    previousUserMessageIdRef.current = latestUserMessageId

    if (!pendingScrollToLatestUserRef.current) {
      pendingScrollToLatestUserRef.current = true
      pendingScrollBehaviorRef.current = "smooth"
    }
  }, [isOpen, latestUserMessageId])

  // When a user sends a message, pin it to the top so they can read it (and the start
  // of the assistant response) without auto-following the stream.
  useEffect(() => {
    if (!isOpen) return
    if (!pendingScrollToLatestUserRef.current) return

    pendingScrollToLatestUserRef.current = false
    const behavior = pendingScrollBehaviorRef.current

    // Use double requestAnimationFrame to ensure DOM is fully rendered
    const frameId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToLatestUserMessage(behavior)
      })
    })
    return () => cancelAnimationFrame(frameId)
  }, [isOpen, latestUserMessageId, scrollToLatestUserMessage])

  useEffect(() => {
    if (!isOpen) return

    const container = scrollRef.current
    if (!container) return

    const recordInput = () => {
      lastUserInputRef.current = Date.now()
    }

    const recordKey = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "PageDown" ||
        event.key === "PageUp" ||
        event.key === "Home" ||
        event.key === "End" ||
        event.key === " "
      ) {
        recordInput()
      }
    }

    container.addEventListener("wheel", recordInput, { passive: true })
    container.addEventListener("touchstart", recordInput, { passive: true })
    container.addEventListener("touchmove", recordInput, { passive: true })
    window.addEventListener("keydown", recordKey)

    const handleScroll = () => {
      if (!isStreaming) return
      if (programmaticScrollRef.current) return
      const now = Date.now()
      if (now - lastUserInputRef.current > 400) return
      userScrolledDuringStreamRef.current = true
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      container.removeEventListener("scroll", handleScroll)
      container.removeEventListener("wheel", recordInput)
      container.removeEventListener("touchstart", recordInput)
      container.removeEventListener("touchmove", recordInput)
      window.removeEventListener("keydown", recordKey)
    }
  }, [isOpen, isStreaming])

  // Preserve the pinned user message position when streaming ends without snapping to bottom.
  useLayoutEffect(() => {
    if (!isOpen) {
      wasStreamingRef.current = false
      lastStreamingScrollTopRef.current = null
      setRestingRunwayPadding(null)
      userScrolledDuringStreamRef.current = false
      lastUserInputRef.current = 0
      return
    }

    const container = scrollRef.current
    if (!container) return

    if (isStreaming) {
      wasStreamingRef.current = true
      setRestingRunwayPadding(null)
      userScrolledDuringStreamRef.current = false
      return
    }

    if (!wasStreamingRef.current) return
    wasStreamingRef.current = false

    if (userScrolledDuringStreamRef.current) {
      userScrolledDuringStreamRef.current = false
      setRestingRunwayPadding(null)
      return
    }

    const list = messageListRef.current
    if (!list) return

    const desiredScrollTop = lastStreamingScrollTopRef.current ?? container.scrollTop
    const contentHeight = list.scrollHeight
    const requiredPadding = Math.max(0, desiredScrollTop + container.clientHeight - contentHeight)

    if (requiredPadding <= 1) {
      setRestingRunwayPadding(null)
      return
    }

    setRestingRunwayPadding(requiredPadding)

    const frameId = requestAnimationFrame(() => {
      container.scrollTop = desiredScrollTop
    })

    return () => cancelAnimationFrame(frameId)
  }, [isOpen, isStreaming])

  // Keep scroll stable on model switches; reveal the divider if it lands outside the viewport.
  useEffect(() => {
    if (!isOpen) {
      previousMessageCountRef.current = messages.length
      pendingModelSwitchScrollRef.current = false
      return
    }

    const currentCount = messages.length
    const previousCount = previousMessageCountRef.current
    previousMessageCountRef.current = currentCount

    if (!currentCount || currentCount === previousCount) return

    const lastMessage = messages[currentCount - 1]
    if (lastMessage?.kind !== "model-switch") return

    const container = scrollRef.current
    if (!container) return
    const messageNode =
      typeof document !== "undefined"
        ? document.getElementById(`metadjai-message-${lastMessage.id}`)
        : null
    if (!messageNode) return

    const containerRect = container.getBoundingClientRect()
    const messageRect = messageNode.getBoundingClientRect()
    const padding = 12
    const isAboveView = messageRect.top < containerRect.top + padding
    const isBelowView = messageRect.bottom > containerRect.bottom - padding
    const shouldReveal = isAboveView || isBelowView

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    const isNearBottom = distanceFromBottom <= 32

    const forceScroll = pendingModelSwitchScrollRef.current
    pendingModelSwitchScrollRef.current = false

    if (!forceScroll && !isNearBottom && !shouldReveal) return

    const frameId = requestAnimationFrame(() => {
      messageNode.scrollIntoView({ behavior: "smooth", block: "nearest" })
    })
    return () => cancelAnimationFrame(frameId)
  }, [isOpen, messages])

  const dispatchQueuedAction = useCallback((message: string, behavior: ScrollBehavior = "smooth") => {
    const nextMessage = message.trim()
    if (!nextMessage) {
      return
    }

    pendingScrollToLatestUserRef.current = true
    pendingScrollBehaviorRef.current = behavior
    try {
      void Promise.resolve(onSend(nextMessage)).catch(() => { })
    } catch {
      // ignore
    }
  }, [onSend])

  const sendMessage = useCallback((message: string, behavior: ScrollBehavior = "smooth") => {
    const nextMessage = message.trim()
    if (!nextMessage || rateLimit.isLimited || isStreaming) {
      return
    }

    trackActivationFirstChat()
    setInputValue("")
    pendingScrollToLatestUserRef.current = true
    pendingScrollBehaviorRef.current = behavior
    try {
      void Promise.resolve(onSend(nextMessage)).catch(() => { })
    } catch {
      // ignore
    }
  }, [isStreaming, onSend, rateLimit.isLimited])

  const queueAction = useCallback((action: QuickAction) => {
    if (rateLimit.isLimited) {
      announce("Rate limit active — action not queued.", { type: "log", priority: "polite" })
      return
    }

    if (isStreaming) {
      setPendingAction(action)
      announce(`${action.title} queued — it will run after this response.`, { type: "log", priority: "polite" })
      return
    }

    sendMessage(action.prompt)
  }, [isStreaming, rateLimit.isLimited, sendMessage])

  const queueModelChange = useCallback((nextModel: MetaDjAiProvider) => {
    if (!onModelPreferenceChange) return

    if (nextModel === modelPreference) {
      if (pendingModel) {
        setPendingModel(null)
        pendingModelRequestedRef.current = false
        announce(`Keeping ${activeModelLabel}.`, { type: "log", priority: "polite" })
      }
      return
    }

    if (isStreaming) {
      pendingModelRequestedRef.current = false
      setPendingModel(nextModel)
      const label = MODEL_OPTIONS.find((option) => option.value === nextModel)?.label ?? "Model"
      announce(`Model switch to ${label} queued — it will apply after this response.`, { type: "log", priority: "polite" })
      return
    }

    pendingModelSwitchScrollRef.current = true
    onModelPreferenceChange(nextModel)
  }, [activeModelLabel, isStreaming, modelPreference, onModelPreferenceChange, pendingModel])

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault()
    sendMessage(inputValue)
  }

  const handleStarterSelect = useCallback(
    (prompt: string) => {
      sendMessage(prompt)
    },
    [sendMessage],
  )

  const welcomeStarters = useMemo(() => buildWelcomeStarters(welcomeDetails), [welcomeDetails])

  // Announce new assistant messages to screen readers
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant' && lastMessage.status === 'complete' && lastMessage.content) {
      // Announce the first 100 characters of the message
      const preview = lastMessage.content.substring(0, 100)
      const announcement = preview.length < lastMessage.content.length
        ? `MetaDJai: ${preview}...`
        : `MetaDJai: ${preview}`
      announce(announcement, { type: 'log', priority: 'polite' })
    }
  }, [messages])

  // Announce errors to screen readers
  useEffect(() => {
    if (error) {
      announce(`Error: ${error}`, { type: 'alert', priority: 'assertive' })
    }
  }, [error])

  useEffect(() => {
    if (!pendingModel) {
      pendingModelRequestedRef.current = false
      return
    }

    if (!onModelPreferenceChange) {
      setPendingModel(null)
      pendingModelRequestedRef.current = false
      return
    }

    if (isStreaming) return

    if (pendingModel === modelPreference) {
      setPendingModel(null)
      pendingModelRequestedRef.current = false
      return
    }

    if (!pendingModelRequestedRef.current) {
      pendingModelRequestedRef.current = true
      pendingModelSwitchScrollRef.current = true
      onModelPreferenceChange(pendingModel)
    }
  }, [isStreaming, modelPreference, onModelPreferenceChange, pendingModel])

  useEffect(() => {
    if (!pendingAction) return
    if (isStreaming) return
    if (pendingModel && pendingModel !== modelPreference) return

    if (rateLimit.isLimited) {
      announce("Queued action cleared — rate limit active.", { type: "log", priority: "polite" })
      setPendingAction(null)
      return
    }

    dispatchQueuedAction(pendingAction.prompt)
    setPendingAction(null)
  }, [dispatchQueuedAction, isStreaming, modelPreference, pendingAction, pendingModel, rateLimit.isLimited])

  useEffect(() => {
    if (!isOpen && isStreaming) {
      onStop()
    }
  }, [isOpen, isStreaming, onStop])

  // Handle backdrop click to close (for fullscreen panel mode)
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the backdrop, not on children
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  // Close on Escape - only for overlay mode, not panel mode
  // In panel mode with fullscreen, ESC exits fullscreen only
  useEffect(() => {
    if (!isOpen) return
    // Panel mode: ESC should not close the panel
    if (isPanel) {
      // But if in fullscreen within panel, ESC exits fullscreen
      if (!isFullscreen || !onToggleFullscreen) return
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault()
          // Blur active element to prevent focus ring on trigger button
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
          onToggleFullscreen()
        }
      }
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
    // Overlay mode: ESC closes
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        // Blur active element to prevent focus ring on trigger button
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isPanel, isFullscreen, onToggleFullscreen, onClose])

  const overlayStyleId = useCspStyle(
    isPanel
      ? {}
      : isFullscreenMobile
        ? {
          top: `${headerHeight}px`,
          bottom:
            keyboardHeight > 0
              ? `${keyboardHeight}px`
              : "calc(var(--mobile-nav-height, 56px) + env(safe-area-inset-bottom))",
          zIndex: 95,
        }
        : {
          top: `${position.top}px`,
          bottom: `${position.bottom}px`,
          maxHeight: position.height,
          zIndex: position.zIndex,
        }
  )


  const isRateLimited = rateLimit.isLimited
  const isSubmitReady = Boolean(inputValue.trim()) && !isRateLimited && !isStreaming

  const isWelcomeState = messages.length === 0
  const pendingDeleteSession = pendingDeleteSessionId && sessions
    ? sessions.find((session) => session.id === pendingDeleteSessionId) ?? null
    : null

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Note: Backdrop for fullscreen panel mode is provided by RightPanel.tsx */}
      <div
        ref={!isPanel ? overlayContainerRef : undefined}
        className={clsx(
          "transition-all duration-150 ease-out",
          isPanel
            ? clsx("relative w-full h-full px-2 pt-0 pb-2", isFullscreen && "z-50")
            : isFullscreenMobile
              ? "fixed left-0 right-0 flex flex-col touch-manipulation"
              : [
                "fixed left-1/2 -translate-x-1/2",
                position.widthClass,
                "px-4 sm:px-6 xl:px-8"
              ]
        )}
        data-csp-style={overlayStyleId}
        aria-label="Chat Panel"
      >
        <div className={clsx(
          "relative flex h-full w-full flex-col overflow-hidden",
          isPanel
            ? "bg-transparent px-0 py-0"  // RightPanel.tsx provides container styling
            : isFullscreenMobile
              ? "bg-(--bg-surface-base)/98 backdrop-blur-xl px-3 py-2"
              : "bg-(--bg-modal) backdrop-blur-3xl rounded-[22px] border border-white/15 shadow-2xl px-0.5 py-1 sm:px-1.5 sm:py-1.5"
        )}>
          {/* Ambient glow effects for mobile fullscreen */}
          {isFullscreenMobile && (
            <>
              <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[60%] bg-purple-600/5 blur-[80px] pointer-events-none" />
              <div className="absolute top-[40%] -right-[20%] w-[80%] h-[60%] bg-blue-600/5 blur-[80px] pointer-events-none" />
            </>
          )}
          {/* Toolbar - Personalize + Model + Controls */}
          <div className={clsx(
            "flex items-center justify-between rounded-2xl bg-black/20 px-1.5 py-1 md:px-3 md:py-1.5 mb-2 border border-white/20 backdrop-blur-xl shadow-xs mx-auto w-full relative z-30",
            isPanel ? "max-w-full" : "max-w-2xl"
          )}>
            {/* Left: Personalize + Model dropdown */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                type="button"
                ref={personalizeButtonRef}
                onClick={() => {
                  setIsHistoryOpen(false)
                  setIsModelOpen(false)
                  setIsActionsOpen(false)
                  setPendingDeleteSessionId(null)
                  setIsPersonalizeOpen((open) => !open)
                }}
                className={clsx(
                  "inline-flex h-8 items-center gap-2 rounded-full border px-3 sm:px-4 text-[11px] font-heading font-bold uppercase tracking-widest transition-all duration-300 focus-ring-glow touch-manipulation",
                  personalization.enabled
                    ? "toolbar-accent text-white border-primary/45 shadow-[0_20px_42px_rgba(12,10,32,0.55)]"
                    : "border-white/15 bg-white/5 text-white/70 hover:border-cyan-400/40 hover:bg-white/10 hover:text-cyan-100"
                )}
                aria-expanded={isPersonalizeOpen}
                aria-haspopup="true"
                aria-label={personalization.enabled ? "Personalize on" : "Personalize off"}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Personalize</span>
                {personalization.enabled && (
                  <span className="hidden sm:inline-flex rounded-full bg-cyan-400/20 px-1.5 py-0.5 text-[9px] text-cyan-100">
                    On
                  </span>
                )}
              </button>
              {onModelPreferenceChange && (
                <div className="relative">
                  <button
                    type="button"
                    ref={modelButtonRef}
                    onClick={() => {
                      setIsActionsOpen(false)
                      setIsPersonalizeOpen(false)
                      setIsHistoryOpen(false)
                      setPendingDeleteSessionId(null)
                      setIsModelOpen((open) => !open)
                    }}
                    className={clsx(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 text-[11px] font-heading font-bold uppercase tracking-wider text-white/70 transition-all duration-300 focus-ring-glow touch-manipulation whitespace-nowrap",
                      isModelOpen && "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
                    )}
                    aria-label="Model selection"
                    aria-haspopup="listbox"
                    aria-expanded={isModelOpen}
                  >
                    <span className="hidden sm:inline">{`Model: ${activeModelLabel}`}</span>
                    <span className="sm:hidden">{activeModelLabel}</span>
                    <ChevronDown className={clsx("h-3 w-3 shrink-0 transition-transform", isModelOpen && "rotate-180")} />
                  </button>
                  {isModelOpen && (
                    <div
                      ref={modelPopoverRef}
                      role="listbox"
                      aria-label="Model options"
                      className="absolute left-0 top-10 z-100 min-w-[160px] rounded-2xl border border-white/15 bg-(--bg-surface-elevated)/95 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                    >
                      <div className="px-2 pb-2 text-sm font-heading font-semibold uppercase tracking-[0.2em] text-heading-solid">
                        Model
                      </div>
                      <div className="flex flex-col gap-1">
                        {MODEL_OPTIONS.map((option) => {
                          const isActive = option.value === modelPreference
                          const isQueued = pendingModel === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="option"
                              aria-selected={isActive}
                              onClick={() => {
                                queueModelChange(option.value)
                                setIsModelOpen(false)
                              }}
                              className={clsx(
                                "flex items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider transition",
                                isActive
                                  ? "bg-cyan-500/15 text-cyan-100"
                                  : "text-white/70 hover:bg-white/10 hover:text-white",
                                isQueued && "ring-1 ring-cyan-400/30"
                              )}
                            >
                              <span>{option.label}</span>
                              {isActive && <span className="text-[10px] text-cyan-200/80">Active</span>}
                              {!isActive && isQueued && <span className="text-[10px] text-cyan-200/80">Queued</span>}
                            </button>
                          )
                        })}
                      </div>
                      {(pendingModelLabel || isStreaming) && (
                        <p className="mt-2 px-2 text-[10px] text-white/60">
                          {pendingModelLabel
                            ? `Queued: ${pendingModelLabel} (applies after this response).`
                            : "Changes apply after this response finishes."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Icons (Fullscreen, History, Reset) - Fullscreen LEFT of History */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {onToggleFullscreen && !isFullscreenMobile && (
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-accessible transition hover:bg-white/10 hover:text-white focus-ring-glow touch-manipulation"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              )}
              {sessions && onSelectSession && (
                <button
                  type="button"
                  ref={historyButtonRef}
                  onClick={() => {
                    setIsActionsOpen(false)
                    setIsModelOpen(false)
                    setIsPersonalizeOpen(false)
                    setPendingDeleteSessionId(null)
                    setIsHistoryOpen((open) => !open)
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-all duration-300 hover:bg-purple-500/10 hover:text-purple-200 focus-ring-glow touch-manipulation"
                  aria-expanded={isHistoryOpen}
                  aria-haspopup="true"
                  title="Chat history"
                  aria-label="Chat history"
                >
                  <History className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmReset((current) => !current)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-accessible transition hover:bg-white/10 hover:text-white focus-ring-glow touch-manipulation"
                aria-expanded={confirmReset}
                aria-label="Reset chat"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
              {/* Close button hidden on mobile fullscreen since action bar handles it */}
            </div>
          </div>

          {/* Context ribbon removed - was showing collection/track info on mobile but felt unnecessary */}

          {/* Actions popover - extracted to separate component */}
          {isActionsOpen && (
            <MetaDjAiActionsPopover
              popoverRef={actionsPopoverRef}
              isPanel={isPanel}
              dynamicActions={dynamicActions}
              hasTrack={!!currentTrack}
              pendingAction={pendingAction}
              isRateLimited={isRateLimited}
              isStreaming={isStreaming}
              onQueueAction={queueAction}
              onClose={() => setIsActionsOpen(false)}
            />
          )}

          {/* Personalize popover - extracted to separate component */}
          {isPersonalizeOpen && (
            <MetaDjAiPersonalizePopover
              popoverRef={personalizePopoverRef}
              isPanel={isPanel}
              personalization={personalization}
              onPersonalizationToggle={onPersonalizationToggle}
              onPersonalizationUpdate={onPersonalizationUpdate}
              onClose={() => setIsPersonalizeOpen(false)}
            />
          )}

          {/* History popover - extracted to separate component */}
          {isHistoryOpen && sessions && onSelectSession && (
            <MetaDjAiHistoryPopover
              popoverRef={historyPopoverRef}
              deleteDialogRef={deleteDialogRef}
              isPanel={isPanel}
              sessions={sessions}
              activeSessionId={activeSessionId}
              pendingDeleteSessionId={pendingDeleteSessionId}
              onSelectSession={onSelectSession}
              onNewSession={onNewSession}
              onDeleteSession={onDeleteSession}
              onSetPendingDelete={setPendingDeleteSessionId}
              onClose={() => setIsHistoryOpen(false)}
              onArchiveSession={handleArchiveSession}
              onUnarchiveSession={handleUnarchiveSession}
              onRefreshSessions={handleRefreshSessions}
            />
          )}

          {confirmReset && (
            <div className="rounded-2xl border border-white/20 bg-black/40 px-4 py-4 text-sm text-white/70 mb-4 text-center backdrop-blur-md">
              <p className="text-xs mb-3">
                Start fresh? Current chat will be cleared.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRefresh()
                    setConfirmReset(false)
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-red-500/20 border border-red-500/30 px-4 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/30 hover:border-red-500/50 hover:text-white focus-ring-glow shadow-lg shadow-red-900/10"
                >
                  Reset Chat
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden mb-2 relative z-10">
            <div
              ref={scrollRef}
              className={clsx(
                "flex h-full flex-col overscroll-contain touch-pan-y scrollbar-on-hover [-webkit-overflow-scrolling:touch] [overflow-anchor:none]",
                isWelcomeState ? "overflow-hidden justify-center" : "overflow-y-auto",
                isPanel ? "px-0 pr-1" : "px-1 pr-2"
              )}
            >
              {!isWelcomeState && (
                <MetaDjAiMessageList
                  listRef={messageListRef}
                  messages={messages}
                  latestUserMessageId={latestUserMessageId}
                  runwayHeight={runwayHeight}
                  restingRunwayPadding={restingRunwayPadding}
                  onCopy={handleCopyMessage}
                  onRegenerate={onRegenerate}
                  onSwitchVersion={onSwitchVersion}
                  isConversationStreaming={isStreaming}
                />
              )}
              {isWelcomeState && (
                <div className={isPanel ? "px-0" : "px-2 sm:px-4"}>
                  <MetaDjAiWelcomeState
                    starters={starterSuggestions}
                    onSelectStarter={handleStarterSelect}
                    isDisabled={isRateLimited || isStreaming}
                    cooldownLabel={isRateLimited && rateLimit?.remainingCooldown ? `${rateLimit.remainingCooldown}s` : null}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <MetaDjAiChatInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSubmit}
              isStreaming={isStreaming}
              isRateLimited={isRateLimited}
              onStop={onStop}
              errorMessage={error}
              onRetry={onRetry}
              canRetry={canRetry}
              leadingAccessory={(
                <button
                  type="button"
                  ref={actionsButtonRef}
                  onClick={() => {
                    setIsHistoryOpen(false)
                    setIsModelOpen(false)
                    setIsPersonalizeOpen(false)
                    setPendingDeleteSessionId(null)
                    setIsActionsOpen((open) => !open)
                    setShowPulse(false)
                  }}
                  className={clsx(
                    "inline-flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border transition-[background-color,color,transform,opacity] duration-300 focus-ring-glow touch-manipulation -ml-0.5",
                    isActionsOpen
                      ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100 shadow-[0_0_18px_rgba(6,182,212,0.25)]"
                      : "border-white/15 bg-white/5 text-white/60 hover:border-cyan-400/40 hover:bg-white/10 hover:text-cyan-100",
                    showPulse && "animate-ai-pulse border-cyan-400/60 text-cyan-100"
                  )}
                  aria-expanded={isActionsOpen}
                  aria-haspopup="true"
                  aria-label="Actions"
                  title="Actions"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              )}
              footerRight={(() => {
                const remaining = rateLimit.windowMax - rateLimit.windowCount
                const percentRemaining = (remaining / rateLimit.windowMax) * 100
                const isAt10Percent = percentRemaining <= 10 && !rateLimit.isLimited
                const isAt25Percent = percentRemaining <= 25 && percentRemaining > 10 && !rateLimit.isLimited

                return (
                  <div className="flex items-center gap-1.5">
                    {/* Proactive warning indicator */}
                    {(isAt10Percent || isAt25Percent) && (
                      <span
                        className={clsx(
                          "text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-sm",
                          isAt10Percent
                            ? "bg-red-500/20 text-red-300"
                            : "bg-amber-500/20 text-amber-300"
                        )}
                        role="status"
                        aria-live="polite"
                      >
                        {isAt10Percent ? "Low" : remaining <= 5 ? `${remaining} left` : ""}
                      </span>
                    )}
                    <span
                      className={clsx(
                        "text-[10px] font-mono whitespace-nowrap",
                        rateLimit.isLimited
                          ? "text-red-300/90"
                          : isAt10Percent
                            ? "text-red-300/70"
                            : isAt25Percent
                              ? "text-amber-300/70"
                              : "text-muted-accessible"
                      )}
                      title={
                        rateLimit.isLimited
                          ? `Rate limit reached. Resets in ${Math.ceil(rateLimit.remainingMs / 1000)}s`
                          : isAt10Percent
                            ? `Almost at limit! Only ${remaining} message${remaining === 1 ? '' : 's'} remaining`
                            : isAt25Percent
                              ? `Running low: ${remaining} messages remaining`
                              : `${rateLimit.windowCount}/${rateLimit.windowMax} messages used (5 min)`
                      }
                      aria-label={
                        rateLimit.isLimited
                          ? `Rate limited: ${rateLimit.windowCount} of ${rateLimit.windowMax} messages used. Resets in ${Math.ceil(rateLimit.remainingMs / 1000)} seconds`
                          : isAt10Percent
                            ? `Almost at limit! ${remaining} of ${rateLimit.windowMax} messages remaining`
                            : isAt25Percent
                              ? `Running low: ${remaining} of ${rateLimit.windowMax} messages remaining`
                              : `${rateLimit.windowCount} of ${rateLimit.windowMax} messages used in the current 5-minute window`
                      }
                    >
                      Message Limit {rateLimit.windowCount}/{rateLimit.windowMax}
                    </span>
                  </div>
                )
              })()}
            />
          </div>
        </div>
      </div>
    </>
  )
}
