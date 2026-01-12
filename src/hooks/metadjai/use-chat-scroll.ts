"use client"

/**
 * Chat Scroll Management Hook
 *
 * Manages complex scroll behavior for MetaDJai chat panel:
 * - Initial scroll to bottom on page load
 * - Scroll to latest user message on send
 * - Preserve scroll position during streaming
 * - Model switch scroll handling
 *
 * Extracted from MetaDjAiChat.tsx for better separation of concerns.
 *
 * @module hooks/metadjai/use-chat-scroll
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

export interface UseChatScrollOptions {
  /** Whether the chat is open */
  isOpen: boolean
  /** Whether currently streaming a response */
  isStreaming: boolean
  /** All chat messages */
  messages: Array<{ id?: string; role?: string; kind?: string }>
  /** Active session ID */
  activeSessionId?: string | null
}

export interface UseChatScrollReturn {
  /** Ref to attach to scroll container */
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Ref to attach to message list wrapper */
  messageListRef: React.RefObject<HTMLDivElement | null>
  /** Computed runway height for welcome state */
  runwayHeight: number | null
  /** Padding to maintain scroll position after streaming */
  restingRunwayPadding: number | null
  /** Latest user message ID */
  latestUserMessageId: string | null
  /** Mark a scroll action as programmatic (not user-initiated) */
  markProgrammaticScroll: () => void
  /** Scroll to the start of a specific message */
  scrollToMessageStart: (messageId: string, behavior?: ScrollBehavior) => void
  /** Scroll to the latest user message */
  scrollToLatestUserMessage: (behavior?: ScrollBehavior) => void
  /** Queue a scroll to latest user message */
  queueScrollToLatestUser: (behavior?: ScrollBehavior) => void
}

/**
 * Hook for managing chat scroll behavior.
 *
 * Handles the complex scroll UX requirements:
 * - Initial page load: scroll to bottom to see latest messages
 * - Mid-experience toggle: preserve scroll position
 * - User sends message: pin their message at top of viewport
 * - Streaming: don't auto-follow unless user is at bottom
 * - Model switch: scroll divider into view if needed
 */
export function useChatScroll({
  isOpen,
  isStreaming,
  messages,
  activeSessionId,
}: UseChatScrollOptions): UseChatScrollReturn {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messageListRef = useRef<HTMLDivElement | null>(null)
  const programmaticScrollRef = useRef(false)
  const programmaticScrollTimeoutRef = useRef<number | null>(null)
  const userScrolledDuringStreamRef = useRef(false)
  const lastUserInputRef = useRef(0)
  const lastStreamingScrollTopRef = useRef<number | null>(null)
  const wasStreamingRef = useRef(false)
  const wasOpenRef = useRef(false)
  const hasInitializedScrollRef = useRef(false)
  const previousMessageCountRef = useRef(0)
  const pendingModelSwitchScrollRef = useRef(false)
  const previousSessionIdRef = useRef<string | null>(null)
  const previousUserMessageIdRef = useRef<string | null>(null)
  const pendingScrollToLatestUserRef = useRef(false)
  const pendingScrollBehaviorRef = useRef<ScrollBehavior>("smooth")

  const [runwayHeight, setRunwayHeight] = useState<number | null>(null)
  const [restingRunwayPadding, setRestingRunwayPadding] = useState<number | null>(null)

  // Find latest user message ID
  const latestUserMessageId = (() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "user") {
        return messages[index]?.id ?? null
      }
    }
    return null
  })()

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

  // Cleanup timeout on unmount
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
        // Final fallback: scroll to bottom
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

  const queueScrollToLatestUser = useCallback((behavior: ScrollBehavior = "smooth") => {
    pendingScrollToLatestUserRef.current = true
    pendingScrollBehaviorRef.current = behavior
  }, [])

  // Scroll behavior when panel opens
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true

    const container = scrollRef.current
    if (!container) return

    if (hasInitializedScrollRef.current) return
    hasInitializedScrollRef.current = true

    const frameId = requestAnimationFrame(() => {
      markProgrammaticScroll()
      const scrollTop = container.scrollHeight
      container.scrollTo({ top: scrollTop, behavior: "auto" })
      lastStreamingScrollTopRef.current = scrollTop
    })

    return () => cancelAnimationFrame(frameId)
  }, [isOpen, markProgrammaticScroll])

  // Track runway height for welcome state
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

  // Handle session changes
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

  // Handle new user messages
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

  // Execute pending scroll
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

  // Track user scroll during streaming
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

  // Preserve scroll position after streaming
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

  // Handle model switch scroll
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

  return {
    scrollRef,
    messageListRef,
    runwayHeight,
    restingRunwayPadding,
    latestUserMessageId,
    markProgrammaticScroll,
    scrollToMessageStart,
    scrollToLatestUserMessage,
    queueScrollToLatestUser,
  }
}
