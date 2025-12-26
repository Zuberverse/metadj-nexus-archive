"use client"

/**
 * MetaDJai Hook
 *
 * Main orchestrating hook for MetaDJai chat functionality.
 *
 * Composes:
 * - use-metadjai-messages.ts - Message state and persistence
 * - use-metadjai-rate-limit.ts - Client-side rate limiting
 * - use-metadjai-stream.ts - Vercel AI SDK stream processing
 *
 * Handles:
 * - Sending messages to MetaDJai API
 * - Streaming responses with fallback
 * - Conversation management (reset, stop)
 * - Rate limiting integration
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mapErrorToUserMessage } from '@/lib/ai'
import { MODEL_LABELS } from '@/lib/ai/model-preferences'
import { logger } from '@/lib/logger'
import { getString, setString, STORAGE_KEYS } from '@/lib/storage'
import { useMetaDjAiMessages, createMessageId } from './use-metadjai-messages'
import { useMetaDjAiRateLimit } from './use-metadjai-rate-limit'
import { processVercelAIBuffer, resetToolCallAccumulator, unwrapGeminiStructuredResponse } from './use-metadjai-stream'
import type {
  MetaDjAiApiRequestBody,
  MetaDjAiApiResponseBody,
  MetaDjAiContext,
  MetaDjAiMessage,
  MetaDjAiProposal,
  MetaDjAiProvider,
} from '@/types/metadjai'

interface UseMetaDjAiOptions {
  context?: MetaDjAiContext | null
}

/**
 * Configuration for executing a streaming request
 */
interface StreamRequestConfig {
  payload: MetaDjAiApiRequestBody
  controller: AbortController
  assistantMessageId: string
  appendToAssistant: (chunk: string) => void
  markAssistantStatus: (status: MetaDjAiMessage['status']) => void
  handleToolCall: (toolName: string) => void
  handleToolResult: (toolName: string, result: unknown) => void
  setError: (error: string | null) => void
}

/**
 * Result of executing a streaming request
 */
interface StreamRequestResult {
  success: boolean
  hadStreamError: boolean
}

/**
 * Execute a streaming request to the MetaDJai API
 * This is the shared logic used by both sendMessage and regenerateLastResponse
 */
async function executeStreamRequest(config: StreamRequestConfig): Promise<StreamRequestResult> {
  const {
    payload,
    controller,
    appendToAssistant,
    markAssistantStatus,
    handleToolCall,
    handleToolResult,
    setError,
  } = config

  const handleStreamError = (errorMessage: string) => {
    const userFriendlyError = mapErrorToUserMessage(errorMessage)
    setError(userFriendlyError)
    markAssistantStatus('error')
    logger.error('[MetaDJai] Stream error status received', { errorMessage })
  }

  let hadStreamError = false

  try {
    const response = await fetch('/api/metadjai/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => 'MetaDJai streaming failed')
      logger.error('[MetaDJai] Stream response error', { status: response.status, statusText: response.statusText, errorText })
      throw new Error(errorText)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      buffer = processVercelAIBuffer(buffer, appendToAssistant, markAssistantStatus, (err) => {
        hadStreamError = true
        handleStreamError(err)
      }, false, handleToolCall, handleToolResult)
    }

    if (buffer.trim()) {
      buffer = processVercelAIBuffer(buffer, appendToAssistant, markAssistantStatus, (err) => {
        hadStreamError = true
        handleStreamError(err)
      }, true, handleToolCall, handleToolResult)
    }
    logger.debug('[MetaDJai] Stream complete')

    if (hadStreamError) {
      throw new Error('stream error')
    }

    return { success: true, hadStreamError: false }
  } catch (error) {
    if (controller.signal.aborted) {
      return { success: true, hadStreamError: false }
    }
    throw error
  }
}

/**
 * Execute a fallback non-streaming request
 */
async function executeFallbackRequest(
  payload: MetaDjAiApiRequestBody,
  controller: AbortController,
  assistantMessageId: string,
  updateMessages: (updater: (prev: MetaDjAiMessage[]) => MetaDjAiMessage[]) => void,
  extractSources: (text: string) => MetaDjAiMessage['sources'],
): Promise<void> {
  const response = await fetch('/api/metadjai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const errorMessage = errorBody?.error ?? 'MetaDJai is unavailable'
    throw new Error(errorMessage)
  }

  const data = (await response.json()) as MetaDjAiApiResponseBody
  const normalizedReply = unwrapGeminiStructuredResponse(data.reply)
  const reply = normalizedReply ?? data.reply

  if (!reply.trim()) {
    throw new Error('MetaDJai returned an empty response')
  }

  const sources = extractSources(reply)
  updateMessages((prev) =>
    prev.map((message) =>
      message.id === assistantMessageId
        ? { ...message, content: reply, status: 'complete', sources }
        : message
    )
  )
}

const SOURCE_LINK_REGEX = /(!)?\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g

function extractSourcesFromMarkdown(text: string): MetaDjAiMessage['sources'] {
  const sources: Array<{ title: string; url: string }> = []
  const seen = new Set<string>()

  for (const match of text.matchAll(SOURCE_LINK_REGEX)) {
    const isImage = Boolean(match[1])
    const title = (match[2] || '').trim()
    const url = (match[3] || '').trim()
    if (isImage || !title || !url) continue
    if (url.includes('example.com')) continue
    if (seen.has(url)) continue
    seen.add(url)
    sources.push({ title, url })
  }

  return sources.length > 0 ? sources : undefined
}

export function useMetaDjAi(options: UseMetaDjAiOptions = {}) {
  const { context } = options
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelPreference, setModelPreference] = useState<MetaDjAiProvider>('openai')
  const requestControllerRef = useRef<AbortController | null>(null)
  const streamingMessageIdRef = useRef<string | null>(null)
  const previousModelPreferenceRef = useRef<MetaDjAiProvider | null>(null)

  // Compose sub-hooks
  const {
    messages,
    messagesRef,
    setMessages,
    updateMessages,
    clearMessages,
    sessions,
    activeSessionId,
    startNewSession,
    switchSession,
    deleteSession,
  } = useMetaDjAiMessages()
  const { rateLimit, canSend, recordSend } = useMetaDjAiRateLimit()
  const mergedContext: MetaDjAiContext | null = useMemo(
    () => (context ? { ...context, mode: 'adaptive' } : { mode: 'adaptive' }),
    [context]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort()
    }
  }, [])

  // Load persisted model preference on mount
  useEffect(() => {
    try {
      const stored = getString(STORAGE_KEYS.METADJAI_PROVIDER, '')
      if (stored === 'openai' || stored === 'anthropic' || stored === 'google' || stored === 'xai') {
        setModelPreference(stored)
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  // Persist model preference changes
  useEffect(() => {
    try {
      setString(STORAGE_KEYS.METADJAI_PROVIDER, modelPreference)
    } catch {
      // ignore storage errors
    }
  }, [modelPreference])

  const changeModelPreference = useCallback((nextProvider: MetaDjAiProvider) => {
    setModelPreference(nextProvider)
  }, [])

  const appendModelSwitchMessage = useCallback(
    (nextProvider: MetaDjAiProvider) => {
      const hasConversation = messagesRef.current.some((message) => {
        if (message.kind === 'mode-switch' || message.kind === 'model-switch') return false
        return message.content.trim().length > 0
      })

      if (!hasConversation) return

      const label = MODEL_LABELS[nextProvider] ?? 'GPT'
      const message: MetaDjAiMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: `Model: ${label}`,
        createdAt: Date.now(),
        status: 'complete',
        kind: 'model-switch',
      }
      updateMessages((prev) => [...prev, message])
    },
    [messagesRef, updateMessages]
  )

  useEffect(() => {
    if (previousModelPreferenceRef.current === null) {
      previousModelPreferenceRef.current = modelPreference
      return
    }
    if (previousModelPreferenceRef.current !== modelPreference) {
      appendModelSwitchMessage(modelPreference)
      previousModelPreferenceRef.current = modelPreference
    }
  }, [appendModelSwitchMessage, modelPreference])

  const sendMessage = useCallback(
    async (input: string) => {
      const trimmed = input.trim()
      if (!trimmed || isStreaming) {
        return
      }

      // Check rate limit
      if (!canSend) {
        return
      }

      // Record the send (increment rate limit counter)
      recordSend()

      // Create user message
      const userMessage: MetaDjAiMessage = {
        id: createMessageId(),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
        status: 'complete',
      }

      // Create assistant placeholder
      const assistantMessageId = createMessageId()
      const assistantPlaceholder: MetaDjAiMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'streaming',
      }

      // Add messages to state
      const draftMessages = [...messagesRef.current, userMessage, assistantPlaceholder]
      setMessages(draftMessages)
      setError(null)
      setIsStreaming(true)

      // Setup abort controller
      const controller = new AbortController()
      requestControllerRef.current = controller
      streamingMessageIdRef.current = assistantMessageId

      // Sanitize history (remove empty assistant messages)
      const sanitizedHistory = draftMessages.filter((message) => {
        if (message.kind === 'mode-switch' || message.kind === 'model-switch') return false
        if (message.role === 'assistant') {
          return message.content.trim().length > 0
        }
        return true
      })

      // Build API payload
      const payload: MetaDjAiApiRequestBody = {
        messages: sanitizedHistory.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        context: mergedContext,
        modelPreference,
      }

      // Track tools used during streaming
      const toolsUsedSet = new Set<string>()

      // Helper to append text to assistant message
      const appendToAssistant = (chunk: string) => {
        updateMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: message.content + chunk }
              : message
          )
        )
      }

      // Helper to update assistant message status
      const markAssistantStatus = (status: MetaDjAiMessage['status']) => {
        updateMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? { ...message, status, toolsUsed: toolsUsedSet.size > 0 ? Array.from(toolsUsedSet) : undefined }
              : message
          )
        )
      }

      // Helper to track tool calls
      const handleToolCall = (toolName: string) => {
        toolsUsedSet.add(toolName)
        // Update message immediately to show tool indicator
        updateMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? { ...message, toolsUsed: Array.from(toolsUsedSet) }
              : message
          )
        )
      }

      // Helper to handle tool results that should surface as proposals
      const handleToolResult = (toolName: string, result: unknown) => {
        if (!result || typeof result !== 'object') return
        const proposal = result as Record<string, unknown>

        const isPlayback = proposal.type === 'playback' && typeof proposal.action === 'string'
        const isUi = proposal.type === 'ui' && typeof proposal.action === 'string'
        const isQueueSet =
          proposal.type === 'queue-set' &&
          proposal.action === 'set' &&
          Array.isArray(proposal.trackIds)
        const isPlaylist =
          proposal.type === 'playlist' &&
          proposal.action === 'create' &&
          typeof proposal.name === 'string'

        // Validate proposal structure before assigning
        if (isPlayback || isUi || isQueueSet || isPlaylist) {
          updateMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, proposal: proposal as unknown as MetaDjAiProposal }
                : message
            )
          )
        }
      }

      try {
        // Use shared streaming logic
        await executeStreamRequest({
          payload,
          controller,
          assistantMessageId,
          appendToAssistant,
          markAssistantStatus,
          handleToolCall,
          handleToolResult,
          setError,
        })

        const currentMessage = messagesRef.current.find((m) => m.id === assistantMessageId)
        const currentContent = currentMessage?.content ?? ''
        const normalizedContent = unwrapGeminiStructuredResponse(currentContent)
        const finalContent = normalizedContent ?? currentContent
        const hasProposal = Boolean(currentMessage?.proposal)

        if (normalizedContent !== null && normalizedContent !== currentContent) {
          updateMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: finalContent }
                : message
            )
          )
        }

        if (!finalContent.trim() && !hasProposal) {
          throw new Error('MetaDJai returned an empty response')
        }

        // Extract sources from model output for export/history
        const sources = extractSourcesFromMarkdown(finalContent)
        if (sources) {
          updateMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId ? { ...message, sources } : message
            )
          )
        }

        // If web search was used without citations, append a gentle reminder
        if (toolsUsedSet.has('web_search')) {
          const hasMarkdownLinks = /\[.+?\]\(https?:\/\/.+?\)/.test(finalContent)
          if (!hasMarkdownLinks && !finalContent.includes('Web search was used')) {
            updateMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      content:
                        `${message.content}\n\n---\n*Note: Web search was used—please cite sources with markdown links such as [Source](https://example.com).*`,
                    }
                  : message
              )
            )
          }
        }
        markAssistantStatus('complete')
      } catch (streamError) {
        if (controller.signal.aborted) {
          markAssistantStatus('complete')
          return
        }

        logger.warn('MetaDJai streaming error, falling back to non-streaming request', {
          error: String(streamError),
        })

        try {
          // Use shared fallback logic
          await executeFallbackRequest(
            payload,
            controller,
            assistantMessageId,
            updateMessages,
            extractSourcesFromMarkdown
          )
          setError(null)
        } catch (fallbackErr) {
          const userFriendlyError = mapErrorToUserMessage(fallbackErr)
          setError(userFriendlyError)
          markAssistantStatus('error')
        }
      } finally {
        resetToolCallAccumulator()
        setIsStreaming(false)
        streamingMessageIdRef.current = null
        requestControllerRef.current = null
      }
    },
    [mergedContext, modelPreference, isStreaming, canSend, recordSend, messagesRef, setMessages, updateMessages]
  )

  const resetConversation = useCallback(() => {
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
    streamingMessageIdRef.current = null
    clearMessages()
    resetToolCallAccumulator()
    setError(null)
    setIsStreaming(false)
  }, [clearMessages])

  const stopStreaming = useCallback(() => {
    if (requestControllerRef.current) {
      requestControllerRef.current.abort()
    }
  }, [])

  /**
   * Regenerate the last assistant response
   *
   * Stores the current response as a version and generates a new one.
   * Previous versions can be accessed via the version toggle.
   */
  const regenerateLastResponse = useCallback(async () => {
    if (isStreaming) return

    const currentMessages = messagesRef.current
    if (currentMessages.length < 2) return

    // Find the last assistant message
    let lastAssistantIndex = -1
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (
        currentMessages[i]?.role === 'assistant' &&
        currentMessages[i]?.kind !== 'mode-switch' &&
        currentMessages[i]?.kind !== 'model-switch'
      ) {
        lastAssistantIndex = i
        break
      }
    }

    if (lastAssistantIndex === -1) return

    const lastAssistantMessage = currentMessages[lastAssistantIndex]
    if (!lastAssistantMessage || !lastAssistantMessage.content.trim()) return

    // Find the last user message
    let lastUserMessageIndex = -1
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i]?.role === 'user') {
        lastUserMessageIndex = i
        break
      }
    }

    if (lastUserMessageIndex === -1) return

    const lastUserMessage = currentMessages[lastUserMessageIndex]
    if (!lastUserMessage) return

    // Store current response as a version
    const currentVersion = {
      content: lastAssistantMessage.content,
      createdAt: lastAssistantMessage.createdAt,
      toolsUsed: lastAssistantMessage.toolsUsed,
    }
    const existingVersions = lastAssistantMessage.versions || []
    const updatedVersions = [currentVersion, ...existingVersions]

    // Update the assistant message to show it's regenerating
    const updatedMessages = currentMessages.map((msg, idx) => {
      if (idx === lastAssistantIndex) {
        return {
          ...msg,
          content: '',
          status: 'streaming' as const,
          versions: updatedVersions,
          currentVersionIndex: 0,
          toolsUsed: undefined,
          sources: undefined,
        }
      }
      return msg
    })
    setMessages(updatedMessages)
    setError(null)
    setIsStreaming(true)

    // Setup abort controller
    const controller = new AbortController()
    requestControllerRef.current = controller
    streamingMessageIdRef.current = lastAssistantMessage.id

    // Sanitize history (remove empty assistant + non-chat meta messages)
    const sanitizedHistory = updatedMessages.filter((message) => {
      if (message.kind === 'mode-switch' || message.kind === 'model-switch') return false
      if (message.role === 'assistant') {
        return message.content.trim().length > 0
      }
      return true
    })

    // Build API payload
    const payload: MetaDjAiApiRequestBody = {
      messages: sanitizedHistory.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      context: mergedContext,
      modelPreference,
    }

    // Track tools used during streaming
    const toolsUsedSet = new Set<string>()

    // Helper to append text to assistant message
    const appendToAssistant = (chunk: string) => {
      updateMessages((prev) =>
        prev.map((message) =>
          message.id === lastAssistantMessage.id
            ? { ...message, content: message.content + chunk }
            : message
        )
      )
    }

    // Helper to update assistant message status
    const markAssistantStatus = (status: MetaDjAiMessage['status']) => {
      updateMessages((prev) =>
        prev.map((message) =>
          message.id === lastAssistantMessage.id
            ? { ...message, status, toolsUsed: toolsUsedSet.size > 0 ? Array.from(toolsUsedSet) : undefined }
            : message
        )
      )
    }

    // Helper to track tool calls
    const handleToolCall = (toolName: string) => {
      toolsUsedSet.add(toolName)
      updateMessages((prev) =>
        prev.map((message) =>
          message.id === lastAssistantMessage.id
            ? { ...message, toolsUsed: Array.from(toolsUsedSet) }
            : message
        )
      )
    }

    // Helper to handle tool results that should surface as proposals
    const handleToolResult = (toolName: string, result: unknown) => {
      if (!result || typeof result !== 'object') return
      const proposal = result as Record<string, unknown>

      const isPlayback = proposal.type === 'playback' && typeof proposal.action === 'string'
      const isUi = proposal.type === 'ui' && typeof proposal.action === 'string'
      const isQueueSet =
        proposal.type === 'queue-set' &&
        proposal.action === 'set' &&
        Array.isArray(proposal.trackIds)
      const isPlaylist =
        proposal.type === 'playlist' &&
        proposal.action === 'create' &&
        typeof proposal.name === 'string'

      // Validate proposal structure before assigning
      if (isPlayback || isUi || isQueueSet || isPlaylist) {
        updateMessages((prev) =>
          prev.map((message) =>
            message.id === lastAssistantMessage.id
              ? { ...message, proposal: proposal as unknown as MetaDjAiProposal }
              : message
          )
        )
      }
    }

    try {
      // Use shared streaming logic
      await executeStreamRequest({
        payload,
        controller,
        assistantMessageId: lastAssistantMessage.id,
        appendToAssistant,
        markAssistantStatus,
        handleToolCall,
        handleToolResult,
        setError,
      })

      const currentMessage = messagesRef.current.find((m) => m.id === lastAssistantMessage.id)
      const currentContent = currentMessage?.content ?? ''
      const normalizedContent = unwrapGeminiStructuredResponse(currentContent)
      const finalContent = normalizedContent ?? currentContent
      const hasProposal = Boolean(currentMessage?.proposal)

      if (normalizedContent !== null && normalizedContent !== currentContent) {
        updateMessages((prev) =>
          prev.map((message) =>
            message.id === lastAssistantMessage.id
              ? { ...message, content: finalContent }
              : message
          )
        )
      }

      if (!finalContent.trim() && !hasProposal) {
        throw new Error('MetaDJai returned an empty response')
      }

      // If web search was used without citations, append a gentle reminder
      if (toolsUsedSet.has('web_search')) {
        const hasMarkdownLinks = /\[.+?\]\(https?:\/\/.+?\)/.test(finalContent)
        if (!hasMarkdownLinks && !finalContent.includes('Web search was used')) {
          updateMessages((prev) =>
            prev.map((message) =>
              message.id === lastAssistantMessage.id
                ? {
                    ...message,
                    content:
                      `${message.content}\n\n---\n*Note: Web search was used—please cite sources with markdown links such as [Source](https://example.com).*`,
                  }
                : message
            )
          )
        }
      }
      markAssistantStatus('complete')
    } catch (streamError) {
      if (controller.signal.aborted) {
        markAssistantStatus('complete')
        return
      }

      logger.warn('MetaDJai streaming error during regenerate, falling back to non-streaming request', {
        error: String(streamError),
      })

      try {
        await executeFallbackRequest(
          payload,
          controller,
          lastAssistantMessage.id,
          updateMessages,
          extractSourcesFromMarkdown
        )
        setError(null)
      } catch (fallbackErr) {
        const userFriendlyError = mapErrorToUserMessage(fallbackErr)
        setError(userFriendlyError)
        markAssistantStatus('error')
      }
    } finally {
      resetToolCallAccumulator()
      setIsStreaming(false)
      streamingMessageIdRef.current = null
      requestControllerRef.current = null
    }
  }, [mergedContext, modelPreference, isStreaming, messagesRef, setMessages, updateMessages])

  /**
   * Switch to a different version of a message
   */
  const switchMessageVersion = useCallback((messageId: string, versionIndex: number) => {
    updateMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId) return message

        const versions = message.versions || []
        const totalVersions = versions.length + 1 // +1 for current

        if (versionIndex < 0 || versionIndex >= totalVersions) return message

        if (versionIndex === 0) {
          // Show current (newest) version - already in content
          return { ...message, currentVersionIndex: 0 }
        } else {
          // Show older version from versions array
          const version = versions[versionIndex - 1]
          if (!version) return message

          // Swap current content with version content
          const currentAsVersion = {
            content: message.content,
            createdAt: message.createdAt,
            toolsUsed: message.toolsUsed,
          }

          const newVersions = [...versions]
          newVersions[versionIndex - 1] = currentAsVersion

          return {
            ...message,
            content: version.content,
            createdAt: version.createdAt,
            toolsUsed: version.toolsUsed,
            versions: newVersions,
            currentVersionIndex: versionIndex,
          }
        }
      })
    )
  }, [updateMessages])

  /**
   * Retry the last failed message
   *
   * Clears the error state and re-attempts the last user message.
   * Only available when the last assistant message has 'error' status.
   */
  const retryLastMessage = useCallback(async () => {
    if (isStreaming) return

    const currentMessages = messagesRef.current
    if (currentMessages.length === 0) return

    // Find last real assistant message (skip mode switch separators)
    let lastAssistantIndex = -1
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const msg = currentMessages[i]
      if (msg?.role === 'assistant' && msg.kind !== 'mode-switch' && msg.kind !== 'model-switch') {
        lastAssistantIndex = i
        break
      }
    }

    const lastMessage = lastAssistantIndex >= 0 ? currentMessages[lastAssistantIndex] : null
    if (!lastMessage || lastMessage.status !== 'error') return

    // Find the last user message
    let lastUserMessageIndex = -1
    for (let i = lastAssistantIndex - 1; i >= 0; i--) {
      if (currentMessages[i]?.role === 'user') {
        lastUserMessageIndex = i
        break
      }
    }

    if (lastUserMessageIndex === -1) return

    const lastUserMessage = currentMessages[lastUserMessageIndex]
    if (!lastUserMessage) return

    // Remove everything from the last user message onward (failed assistant + any separators after)
    const messagesBeforeLastUser = currentMessages.slice(0, lastUserMessageIndex)
    setMessages(messagesBeforeLastUser)

    // Clear the error
    setError(null)

    // Re-send the user's message
    await sendMessage(lastUserMessage.content)
  }, [isStreaming, messagesRef, setMessages, sendMessage])

  /**
   * Check if retry is available (last message failed)
   */
  const canRetry = useCallback(() => {
    const currentMessages = messagesRef.current
    if (currentMessages.length === 0) return false
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      const msg = currentMessages[i]
      if (msg?.role !== 'assistant' || msg.kind === 'mode-switch' || msg.kind === 'model-switch') continue
      return msg.status === 'error'
    }
    return false
  }, [messagesRef])

  return {
    messages,
    isLoading: isStreaming,
    isStreaming,
    error,
    sendMessage,
    resetConversation,
    startNewSession,
    stopStreaming,
    regenerateLastResponse,
    retryLastMessage,
    switchMessageVersion,
    canRetry: canRetry(),
    rateLimit,
    modelPreference,
    changeModelPreference,
    sessions,
    activeSessionId,
    switchSession,
    deleteSession,
  }
}
