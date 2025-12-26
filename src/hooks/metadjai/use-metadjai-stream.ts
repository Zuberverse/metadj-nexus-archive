"use client"

/**
 * MetaDJai Stream Processing
 *
 * Extracted from use-metadjai to handle Vercel AI SDK streaming:
 * - Stream buffer processing
 * - Chunk parsing (text, error, tool calls)
 * - Multiple stream format support (SSE UI Message Stream, Data Stream, Plain Text)
 */

import { logger } from '@/lib/logger'
import type { MetaDjAiMessage } from '@/types/metadjai'

export type StreamHandler = (chunk: string) => void
export type StatusHandler = (status: MetaDjAiMessage['status']) => void
export type ErrorHandler = (error: string) => void
export type ToolCallHandler = (toolName: string) => void
export type ToolResultHandler = (toolName: string, result: unknown) => void

/**
 * Process Vercel AI SDK stream buffer
 *
 * Supports multiple formats:
 * - SSE UI Message Stream (AI SDK 5.x): "data: {json}" lines
 * - Data Stream Protocol (AI SDK 4.x): "0:{json}", "e:{json}", etc.
 * - Plain text streams
 *
 * @param buffer - Accumulated stream buffer
 * @param onDelta - Handler for text content chunks
 * @param onStatus - Handler for status changes
 * @param onError - Optional handler for errors
 * @param flush - Whether to process remaining buffer content
 * @param onToolCall - Optional handler for tool calls (shows which tool is being used)
 * @returns Remaining unprocessed buffer content
 */
export function processVercelAIBuffer(
  buffer: string,
  onDelta: StreamHandler,
  onStatus: StatusHandler,
  onError?: ErrorHandler,
  flush = false,
  onToolCall?: ToolCallHandler,
  onToolResult?: ToolResultHandler
): string {
  let workingBuffer = buffer
  let newlineIndex = workingBuffer.indexOf('\n')

  // Process complete lines
  while (newlineIndex !== -1) {
    const line = workingBuffer.slice(0, newlineIndex).trim()
    workingBuffer = workingBuffer.slice(newlineIndex + 1)
    if (line) {
      handleVercelAIChunk(line, onDelta, onStatus, onError, onToolCall, onToolResult)
    }
    newlineIndex = workingBuffer.indexOf('\n')
  }

  // Process remaining content if flushing
  if (flush && workingBuffer.trim()) {
    handleVercelAIChunk(workingBuffer.trim(), onDelta, onStatus, onError, onToolCall, onToolResult)
    workingBuffer = ''
  }

  return workingBuffer
}

/**
 * Known MetaDJai tool names for filtering structured output
 *
 * Some providers (notably Gemini) may output tool calls or responses as JSON:
 * {"action": "toolName", ...args} or {"action": "none", "response": "..."}.
 * We detect and unwrap these to prevent raw JSON appearing in chat.
 */
const KNOWN_TOOL_NAMES = new Set([
  'searchCatalog',
  'getPlatformHelp',
  'getWisdomContent',
  'getRecommendations',
  'getZuberantContext',
  'proposePlayback',
  'proposeQueueSet',
  'proposePlaylist',
  'proposeSurface',
  'web_search',
])

/**
 * Track structured JSON accumulation state (Gemini compatibility)
 * When we detect the start of a JSON payload, we track it until complete.
 */
let structuredJsonBuffer = ''
let isAccumulatingStructuredJson = false

type GeminiStructuredPayload = {
  action?: string
  toolName?: string
  name?: string
  response?: string
  thought?: string
  empty?: boolean
}

const GEMINI_RESPONSE_KEYS = [
  'response',
  'final',
  'answer',
  'output',
  'text',
  'content',
  'message',
] as const

const GEMINI_THOUGHT_KEYS = [
  'thought',
  'analysis',
  'reasoning',
] as const

function getGeminiStringValue(
  parsed: Record<string, unknown>,
  keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = parsed[key]
    if (typeof value === 'string') return value
  }
  return undefined
}

function parseGeminiStructuredPayload(text: string): GeminiStructuredPayload | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return null
    if (Object.keys(parsed).length === 0) return { empty: true }

    const actionValue = typeof parsed.action === 'string' ? parsed.action.trim() : ''
    const action = actionValue.length > 0 ? actionValue : undefined
    const toolValue = typeof parsed.toolName === 'string' ? parsed.toolName.trim() : ''
    const toolName = toolValue.length > 0 ? toolValue : undefined
    const nameValue = typeof parsed.name === 'string' ? parsed.name.trim() : ''
    const name = nameValue.length > 0 ? nameValue : undefined
    const response = getGeminiStringValue(parsed, GEMINI_RESPONSE_KEYS)
    const thought = getGeminiStringValue(parsed, GEMINI_THOUGHT_KEYS)

    if (!action && !toolName && !name && !response && !thought) return null

    return { action, toolName, name, response, thought }
  } catch {
    return null
  }
}

function resolveGeminiToolName(payload: GeminiStructuredPayload): string | undefined {
  if (payload.action && payload.action !== 'none') return payload.action
  return payload.toolName || payload.name
}

function handleGeminiStructuredPayload(
  payload: GeminiStructuredPayload,
  onDelta: StreamHandler,
  onToolCall?: ToolCallHandler
): boolean {
  if (payload.empty) return true

  const response = payload.response
  const hasResponse = typeof response === 'string' && response.trim().length > 0

  if (payload.action === 'none' && !hasResponse && !payload.thought) {
    return true
  }

  if (payload.action === 'none' && hasResponse) {
    onDelta(response!)
    return true
  }

  const resolvedTool = resolveGeminiToolName(payload)
  if (resolvedTool && KNOWN_TOOL_NAMES.has(resolvedTool)) {
    onToolCall?.(resolvedTool)
    return true
  }

  if (hasResponse && (!resolvedTool || !KNOWN_TOOL_NAMES.has(resolvedTool))) {
    onDelta(response!)
    return true
  }

  if (payload.response && !hasResponse) {
    return true
  }

  if (payload.thought && !hasResponse) {
    return true
  }

  return false
}

function handleGeminiStructuredPayloadChunk(
  text: string,
  onDelta: StreamHandler,
  onToolCall?: ToolCallHandler
): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  if (isAccumulatingStructuredJson) {
    structuredJsonBuffer += text
    const buffered = structuredJsonBuffer.trim()
    if (buffered.startsWith('{') && buffered.endsWith('}')) {
      const parsed = parseGeminiStructuredPayload(buffered)
      if (parsed && handleGeminiStructuredPayload(parsed, onDelta, onToolCall)) {
        structuredJsonBuffer = ''
        isAccumulatingStructuredJson = false
        return true
      }

      // Not a structured payload; emit as plain text to avoid losing content.
      onDelta(structuredJsonBuffer)
      structuredJsonBuffer = ''
      isAccumulatingStructuredJson = false
      return true
    }
    return true
  }

  if (trimmed.startsWith('{')) {
    if (trimmed.endsWith('}')) {
      const parsed = parseGeminiStructuredPayload(trimmed)
      if (parsed) {
        return handleGeminiStructuredPayload(parsed, onDelta, onToolCall)
      }
      return false
    }

    isAccumulatingStructuredJson = true
    structuredJsonBuffer = text
    return true
  }

  return false
}

/**
 * Reset tool call accumulation state
 * Call this when a message is complete to prevent state leakage
 */
export function resetToolCallAccumulator(): void {
  structuredJsonBuffer = ''
  isAccumulatingStructuredJson = false
}

/**
 * Unwrap Gemini-style JSON envelopes for non-streaming responses.
 *
 * Returns null if the payload doesn't look like a structured envelope.
 */
export function unwrapGeminiStructuredResponse(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null
  }
  const parsed = parseGeminiStructuredPayload(trimmed)
  if (!parsed) return null
  if (parsed.response && parsed.response.trim().length > 0) {
    return parsed.response
  }
  return ''
}

/**
 * Handle individual Vercel AI SDK stream chunk
 *
 * Supports:
 * - SSE format: "data: {json}" (AI SDK 5.x toUIMessageStreamResponse)
 * - Data stream format: "0:{json}", "e:{json}", etc. (AI SDK 4.x)
 * - Plain text streams
 * - Unwraps Gemini JSON envelopes for tool calls and action/response payloads
 *
 * @param line - Single line from the stream
 * @param onDelta - Handler for text content
 * @param onStatus - Handler for status changes
 * @param onError - Optional handler for errors
 * @param onToolCall - Optional handler for tool calls
 */
export function handleVercelAIChunk(
  line: string,
  onDelta: StreamHandler,
  onStatus: StatusHandler,
  onError?: ErrorHandler,
  onToolCall?: ToolCallHandler,
  onToolResult?: ToolResultHandler
): void {
  try {
    // ============================================
    // SSE UI Message Stream format (AI SDK 5.x)
    // Format: "data: {json}" or "data: [DONE]"
    // ============================================
    if (line.startsWith('data:')) {
      const jsonString = line.slice(5).trim() // Remove "data:" prefix

      // Handle stream completion marker
      if (jsonString === '[DONE]') {
        onStatus('complete')
        return
      }

      // Parse JSON event
      const data = JSON.parse(jsonString)

      // Handle text delta events
      if (data.type === 'text-delta') {
        if (typeof data.delta === 'string') {
          if (handleGeminiStructuredPayloadChunk(data.delta, onDelta, onToolCall)) {
            return
          }
          onDelta(data.delta)
          return
        }
        if (typeof data.textDelta === 'string') {
          if (handleGeminiStructuredPayloadChunk(data.textDelta, onDelta, onToolCall)) {
            return
          }
          onDelta(data.textDelta)
          return
        }
      }

      // Handle finish events
      if (data.type === 'finish') {
        onStatus('complete')
        return
      }

      // Handle error events
      if (data.type === 'error') {
        onStatus('error')
        if (onError && data.error) {
          onError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
        }
        return
      }

      // Handle tool call events (AI SDK 5.x SSE format)
      if (data.type === 'tool-call' && onToolCall && data.toolName) {
        onToolCall(data.toolName)
        return
      }

      // Handle tool result events (AI SDK 5.x SSE format)
      if ((data.type === 'tool-result' || data.type === 'tool_result') && onToolResult) {
        const toolName = data.toolName || data.name || data.tool?.name
        const result = data.result ?? data.toolResult ?? data.output ?? data.data
        if (toolName) {
          onToolResult(toolName, result)
        }
        return
      }

      // Ignore other event types (start, start-step, finish-step, text-start, text-end)
      return
    }

    // ============================================
    // Data Stream Protocol format (AI SDK 4.x)
    // Format: "0:{json}", "e:{json}", "9:{json}", "d:{json}"
    // ============================================

    // Handle error chunks (e:{json})
    if (line.startsWith('e:')) {
      const jsonString = line.slice(2)
      const data = JSON.parse(jsonString)
      logger.warn('MetaDJai stream error chunk', { data })
      onStatus('error')
      if (onError && typeof data === 'string') {
        onError(data)
      }
      return
    }

    // Handle tool call chunks (9:{json})
    if (line.startsWith('9:')) {
      try {
        const jsonString = line.slice(2)
        const data = JSON.parse(jsonString)
        if (data.toolName) {
          onToolCall?.(data.toolName)
          if (onToolResult && data.result !== undefined) {
            onToolResult(data.toolName, data.result)
          }
        }
      } catch {
        // Ignore parse errors for tool calls/results
      }
      return
    }

    // Handle data chunks (d:{json}) - logged but not processed
    if (line.startsWith('d:')) {
      return
    }

    // Vercel AI SDK prefixes text data with "0:"
    if (line.startsWith('0:')) {
      const jsonString = line.slice(2) // Remove "0:" prefix
      const data = JSON.parse(jsonString)

      // Standard string delta (Vercel AI SDK Data Stream Protocol)
      if (typeof data === 'string') {
        onDelta(data)
        return
      }

      // Tool result in data stream (compatibility/adapter)
      if ((data.type === 'tool-result' || data.type === 'tool_result') && onToolResult) {
        const toolName = data.toolName || data.name
        const result = data.result ?? data.toolResult ?? data.output
        if (toolName) {
          onToolResult(toolName, result)
        }
        return
      }

      // AI SDK v5 data stream format (compatibility adapter)
      if (data.type === 'response.output_text.delta' && typeof data.delta === 'string') {
        onDelta(data.delta)
      }

      // Handle completion events
      if (data.type === 'response.output_text.done' || data.type === 'response.completed') {
        onStatus('complete')
      }

      // Handle errors
      if (data.type === 'response.error') {
        onStatus('error')
        if (onError && data.error) {
          onError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
        }
      }

      // Backward compatibility with older format
      if (data.type === 'text-delta' && typeof data.textDelta === 'string') {
        onDelta(data.textDelta)
      }

      if (data.type === 'finish') {
        onStatus('complete')
      }
      return
    }

    // ============================================
    // Plain text stream (no prefix)
    // This handles toTextStreamResponse() output
    // ============================================
    // Skip empty lines (SSE uses blank lines as separators)
    if (line.length > 0) {
      if (handleGeminiStructuredPayloadChunk(line, onDelta, onToolCall)) {
        return
      }
      onDelta(line)
    }
  } catch (error) {
    // If JSON parsing fails but we have content, treat it as plain text
    if (line.startsWith('0:') || line.startsWith('data:')) {
      logger.warn('Failed to parse MetaDJai stream chunk', {
        line,
        error: String(error),
      })
    } else if (line.length > 0) {
      if (handleGeminiStructuredPayloadChunk(line, onDelta, onToolCall)) {
        return
      }
      // Plain text that failed to parse as JSON - just pass it through
      onDelta(line)
    }
  }
}

/**
 * Create a stream reader that processes chunks as they arrive
 *
 * @param reader - ReadableStreamDefaultReader from fetch response
 * @param onDelta - Handler for text content
 * @param onStatus - Handler for status changes
 * @param onError - Optional handler for errors
 */
export async function readStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: StreamHandler,
  onStatus: StatusHandler,
  onError?: ErrorHandler
): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    buffer = processVercelAIBuffer(buffer, onDelta, onStatus, onError)
  }

  // Process any remaining buffer content
  if (buffer.trim()) {
    processVercelAIBuffer(buffer, onDelta, onStatus, onError, true)
  }
}
