import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Chat scroll management hook
 *
 * Handles all scroll-related state and behaviors for the MetaDJai chat panel.
 * Extracts ~300 lines of scroll logic from MetaDjAiChat.tsx into a reusable hook.
 *
 * ## Features
 *
 * - Programmatic scroll tracking (prevents user scroll detection during auto-scroll)
 * - Initial scroll behavior (scroll to bottom on first open)
 * - User message pinning (scroll to latest user message on send)
 * - Streaming stability (preserve position during and after streaming)
 * - Model switch handling (reveal divider when switching models)
 * - Session switch handling (scroll to latest on session change)
 * - Runway height calculation (for dynamic padding)
 *
 * @module hooks/use-chat-scroll
 */

interface UseChatScrollOptions {
  /** Whether the chat panel is open */
  isOpen: boolean
  /** Whether AI is currently streaming a response */
  isStreaming: boolean
  /** Array of chat messages */
  messages: Array<{ id: string; role?: string; kind?: string }>
  /** ID of the latest user message */
  latestUserMessageId: string | null
  /** Current active session ID */
  activeSessionId?: string | null
}

interface ChatScrollState {
  /** Ref to attach to the scroll container */
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Ref to attach to the message list wrapper (for height calculations) */
  messageListRef: React.RefObject<HTMLDivElement | null>
  /** Current runway height (container visible height) */
  runwayHeight: number | null
  /** Resting runway padding (padding to maintain scroll position after streaming) */
  restingRunwayPadding: number | null
  /** Pending model switch scroll flag (for external coordination) */
  pendingModelSwitchScrollRef: React.MutableRefObject<boolean>
  /** Scroll to a specific message by ID */
  scrollToMessageStart: (messageId: string, behavior?: ScrollBehavior) => void
  /** Scroll to the latest user message */
  scrollToLatestUserMessage: (behavior?: ScrollBehavior) => void
  /** Mark the next scroll as programmatic (won't trigger user scroll detection) */
  markProgrammaticScroll: () => void
  /** Queue a scroll to latest user message (will execute on next render) */
  queueScrollToLatestUser: (behavior?: ScrollBehavior) => void
}

/**
 * Chat scroll management hook
 *
 * Encapsulates all scroll-related logic for the MetaDJai chat panel.
 *
 * @example
 * ```tsx
 * const {
 *   scrollRef,
 *   messageListRef,
 *   runwayHeight,
 *   restingRunwayPadding,
 *   scrollToLatestUserMessage,
 *   queueScrollToLatestUser,
 * } = useChatScroll({
 *   isOpen,
 *   isStreaming,
 *   messages,
 *   latestUserMessageId,
 *   activeSessionId,
 * })
 * ```
 */
export function useChatScroll({
  isOpen,
  isStreaming,
  messages,
  latestUserMessageId,
  activeSessionId,
}: UseChatScrollOptions): ChatScrollState {
  // ============================================================================
  // Refs
  // ============================================================================

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messageListRef = useRef<HTMLDivElement | null>(null)

  // Programmatic scroll tracking
  const programmaticScrollRef = useRef(false)
  const programmaticScrollTimeoutRef = useRef<number | null>(null)

  // User interaction tracking
  const userScrolledDuringStreamRef = useRef(false)
  const lastUserInputRef = useRef(0)

  // Scroll position tracking
  const lastStreamingScrollTopRef = useRef<number | null>(null)

  // State tracking
  const wasStreamingRef = useRef(false)
  const wasOpenRef = useRef(false)
  const hasInitializedScrollRef = useRef(false) // Persists across toggles
  const previousMessageCountRef = useRef(0)
  const pendingModelSwitchScrollRef = useRef(false)
  const previousSessionIdRef = useRef<string | null>(null)
  const previousUserMessageIdRef = useRef<string | null>(null)

  // Pending scroll queue
  const pendingScrollToLatestUserRef = useRef(false)
  const pendingScrollBehaviorRef = useRef<ScrollBehavior>('smooth')

  // ============================================================================
  // State
  // ============================================================================

  const [runwayHeight, setRunwayHeight] = useState<number | null>(null)
  const [restingRunwayPadding, setRestingRunwayPadding] = useState<number | null>(null)

  // ============================================================================
  // Callbacks
  // ============================================================================

  /**
   * Mark the next scroll as programmatic
   * Prevents user scroll detection for ~450ms after programmatic scrolls
   */
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

  /**
   * Scroll to a specific message by ID
   */
  const scrollToMessageStart = useCallback(
    (messageId: string, behavior: ScrollBehavior = 'smooth') => {
      const container = scrollRef.current
      const messageNode =
        typeof document !== 'undefined'
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
    },
    [markProgrammaticScroll]
  )

  /**
   * Scroll to the latest user message
   * Includes retry logic for DOM rendering delays
   */
  const scrollToLatestUserMessage = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
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
          typeof document !== 'undefined'
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
    },
    [latestUserMessageId, markProgrammaticScroll, scrollToMessageStart]
  )

  /**
   * Queue a scroll to latest user message (will execute on next render cycle)
   */
  const queueScrollToLatestUser = useCallback((behavior: ScrollBehavior = 'smooth') => {
    pendingScrollToLatestUserRef.current = true
    pendingScrollBehaviorRef.current = behavior
  }, [])

  // ============================================================================
  // Effects
  // ============================================================================

  // Cleanup programmatic scroll timeout on unmount
  useEffect(() => {
    return () => {
      if (programmaticScrollTimeoutRef.current !== null) {
        window.clearTimeout(programmaticScrollTimeoutRef.current)
        programmaticScrollTimeoutRef.current = null
      }
    }
  }, [])

  // Initial scroll behavior when panel opens
  // - Initial page load: scroll to bottom
  // - Subsequent toggles: preserve position
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true

    const container = scrollRef.current
    if (!container) return

    // Only auto-scroll on initial page load
    if (hasInitializedScrollRef.current) return
    hasInitializedScrollRef.current = true

    const frameId = requestAnimationFrame(() => {
      markProgrammaticScroll()
      const scrollTop = container.scrollHeight
      container.scrollTo({ top: scrollTop, behavior: 'auto' })
      lastStreamingScrollTopRef.current = scrollTop
    })

    return () => cancelAnimationFrame(frameId)
  }, [isOpen, markProgrammaticScroll])

  // Track runway height for dynamic padding calculations
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

    if (typeof ResizeObserver === 'undefined') {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', updateRunwayHeight)
        return () => window.removeEventListener('resize', updateRunwayHeight)
      }
      return
    }

    const observer = new ResizeObserver(updateRunwayHeight)
    observer.observe(container)
    return () => observer.disconnect()
  }, [isOpen])

  // Handle session switches - scroll to latest on session change
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
    pendingScrollBehaviorRef.current = 'auto'
  }, [activeSessionId, isOpen])

  // Handle new user messages - queue scroll to latest
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
      pendingScrollBehaviorRef.current = 'smooth'
    }
  }, [isOpen, latestUserMessageId])

  // Execute pending scroll to latest user message
  useEffect(() => {
    if (!isOpen) return
    if (!pendingScrollToLatestUserRef.current) return

    pendingScrollToLatestUserRef.current = false
    const behavior = pendingScrollBehaviorRef.current

    const frameId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToLatestUserMessage(behavior)
      })
    })
    return () => cancelAnimationFrame(frameId)
  }, [isOpen, latestUserMessageId, scrollToLatestUserMessage])

  // Track user scroll input during streaming
  useEffect(() => {
    if (!isOpen) return

    const container = scrollRef.current
    if (!container) return

    const recordInput = () => {
      lastUserInputRef.current = Date.now()
    }

    const recordKey = (event: KeyboardEvent) => {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'PageDown' ||
        event.key === 'PageUp' ||
        event.key === 'Home' ||
        event.key === 'End' ||
        event.key === ' '
      ) {
        recordInput()
      }
    }

    container.addEventListener('wheel', recordInput, { passive: true })
    container.addEventListener('touchstart', recordInput, { passive: true })
    container.addEventListener('touchmove', recordInput, { passive: true })
    window.addEventListener('keydown', recordKey)

    const handleScroll = () => {
      if (!isStreaming) return
      if (programmaticScrollRef.current) return
      const now = Date.now()
      if (now - lastUserInputRef.current > 400) return
      userScrolledDuringStreamRef.current = true
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      container.removeEventListener('wheel', recordInput)
      container.removeEventListener('touchstart', recordInput)
      container.removeEventListener('touchmove', recordInput)
      window.removeEventListener('keydown', recordKey)
    }
  }, [isOpen, isStreaming])

  // Preserve scroll position when streaming ends
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

  // Handle model switch scroll behavior
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
    if (lastMessage?.kind !== 'model-switch') return

    const container = scrollRef.current
    if (!container) return
    const messageNode =
      typeof document !== 'undefined'
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
      messageNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })

    return () => cancelAnimationFrame(frameId)
  }, [isOpen, messages])

  return {
    scrollRef,
    messageListRef,
    runwayHeight,
    restingRunwayPadding,
    pendingModelSwitchScrollRef,
    scrollToMessageStart,
    scrollToLatestUserMessage,
    markProgrammaticScroll,
    queueScrollToLatestUser,
  }
}
