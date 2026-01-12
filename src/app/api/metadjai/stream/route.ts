/**
 * MetaDJai Streaming Chat API Route
 *
 * Provides streaming AI chat responses using Vercel AI SDK with multi-provider support:
 * - Primary: OpenAI GPT (default)
 * - Additional: Gemini, Claude, Grok (via selector)
 * - Fallback: Priority order GPT -> Gemini -> Claude -> Grok (skips the active provider)
 *
 * Features:
 * - Streaming responses for real-time chat experience
 * - Automatic provider failover with circuit breaker pattern
 * - Rate limiting (20 messages per 5-minute window)
 * - Burst prevention (500ms minimum between messages)
 * - Session cookie for per-device isolation
 * - Input sanitization and content length limits
 * - Spam detection (duplicate message filtering)
 * - Context-aware system instructions based on playback state
 * - Cost estimation in usage logs
 *
 * @route POST /api/metadjai/stream
 *
 * Request body:
 * {
 *   messages: Array<{role: 'user' | 'assistant', content: string}>,
 *   playbackContext?: {trackTitle, artist, collection}
 * }
 *
 * Response codes:
 * - 200: Streaming response (text/event-stream)
 * - 400: Invalid request body
 * - 429: Rate limit exceeded
 * - 500: Server error
 * - 503: AI providers not configured
 */
import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { createCacheKey, getCachedResponse, setCachedResponse } from '@/lib/ai/cache'
import { isCircuitOpen, isProviderError, recordFailure, recordSuccess } from '@/lib/ai/circuit-breaker'
import { createStopCondition, getAIRequestTimeout, isTimeoutError } from '@/lib/ai/config'
import { isFailoverEnabled } from '@/lib/ai/failover'
import { buildMetaDjAiSystemInstructions } from '@/lib/ai/meta-dj-ai-prompt'
import { MODEL_LABELS } from '@/lib/ai/model-preferences'
import {
  getModel,
  getModelInfo,
  getModelSettingsForProvider,
  getProviderOptions,
  getFallbackModel,
  getFallbackModelInfo,
  getFallbackModelSettings,
  estimateCost,
  formatCost,
  isFailoverAvailable,
} from '@/lib/ai/providers'
import {
  sanitizeMessages,
  getClientIdentifier,
  checkRateLimitDistributed,
  generateSessionId,
  buildRateLimitResponse,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_PATH,
} from '@/lib/ai/rate-limiter'
import { isSpendingAllowed, recordSpending } from '@/lib/ai/spending-alerts'
import { getTools } from '@/lib/ai/tools'
import { validateMetaDjAiRequest } from '@/lib/ai/validation'
import { getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { getRequestId, getRequestIdHeaders } from '@/lib/request-id'
import { getMaxRequestSize, readJsonBodyWithLimit } from '@/lib/validation/request-size'
import type { MetaDjAiApiRequestBody } from '@/types/metadjai.types'

/**
 * Log AI usage metrics for monitoring and cost tracking
 * Also records spending for threshold alerts
 */
async function logAIUsage(metrics: {
  requestId: string
  provider: string
  model: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  toolCalls?: string[]
  durationMs: number
  success: boolean
  error?: string
  clientId?: string
  usedFallback?: boolean
}) {
  // Calculate cost estimate if we have token counts
  const estimatedCostUsd = (metrics.inputTokens !== undefined && metrics.outputTokens !== undefined)
    ? estimateCost(metrics.model, metrics.inputTokens, metrics.outputTokens)
    : undefined

  // Log usage info for development visibility and production monitoring
  logger.info('MetaDJai usage', {
    requestId: metrics.requestId,
    provider: metrics.provider,
    model: metrics.model,
    tokens: {
      input: metrics.inputTokens ?? 'unknown',
      output: metrics.outputTokens ?? 'unknown',
      total: metrics.totalTokens ?? 'unknown',
    },
    cost: estimatedCostUsd !== undefined ? {
      estimatedUsd: estimatedCostUsd,
      formatted: formatCost(estimatedCostUsd),
    } : 'unknown',
    toolCalls: metrics.toolCalls?.length ?? 0,
    durationMs: metrics.durationMs,
    success: metrics.success,
    ...(metrics.usedFallback && { usedFallback: true }),
    ...(metrics.error && { error: metrics.error }),
  })

  // Record spending for threshold tracking and alerts
  // Only record if we have a valid cost estimate and the request was successful
  if (metrics.success && estimatedCostUsd !== undefined && estimatedCostUsd > 0) {
    try {
      await recordSpending({
        costUsd: estimatedCostUsd,
        provider: metrics.provider,
        model: metrics.model,
      })
    } catch (error) {
      // Don't fail the request if spending recording fails
      logger.warn('[AI Spending] Failed to record spending', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

export const runtime = 'nodejs'

/**
 * Processes a streaming chat request to the MetaDJai AI companion.
 *
 * Provides real-time streaming responses using the configured provider (GPT default, Gemini/Claude/Grok optional), with optional failover when enabled.
 * Includes rate limiting (20 messages per 5-minute window), burst prevention (500ms minimum
 * between messages), spam detection, and session management via cookies.
 *
 * @route POST /api/metadjai/stream
 * @param request - The incoming Next.js request containing message history and optional playback context
 * @returns Streaming text response (text/event-stream) for real-time chat experience
 *
 * @example
 * // Request body
 * { messages: [{ role: 'user', content: 'What genre is this?' }], context: { trackTitle: 'Synth Haven' } }
 *
 * @throws {400} Invalid request body, missing messages, too many messages (>50), or duplicate spam messages
 * @throws {429} Rate limit exceeded (includes Retry-After header)
 * @throws {500} Server configuration error
 * @throws {502} AI provider error
 * @throws {503} No AI providers configured
 * @throws {504} AI request timed out after 30 seconds
 */
export async function POST(request: NextRequest) {
  // Extract or generate request ID for tracing
  const requestId = getRequestId(request)

  let env
  try {
    env = getEnv()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Environment configuration error', { requestId, error: message })
    return NextResponse.json(
      { error: 'Service configuration error. Please try again later.' },
      { status: 500 }
    )
  }

  const {
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    GOOGLE_API_KEY,
    XAI_API_KEY,
  } = env

  // OpenAI is configured only via direct API key
  const hasOpenAI = !!OPENAI_API_KEY
  const hasAnthropic = !!ANTHROPIC_API_KEY
  const hasGoogle = !!GOOGLE_API_KEY
  const hasXai = !!XAI_API_KEY

  // Check if at least one provider is configured
  if (!hasOpenAI && !hasAnthropic && !hasGoogle && !hasXai) {
    logger.warn('[MetaDJai] Missing API keys - MetaDJai is not configured.', { requestId })
    return NextResponse.json({ error: 'MetaDJai is not configured.' }, { status: 503 })
  } else {
    logger.info('[MetaDJai] Request received with configured keys', {
      requestId,
      hasOpenAI,
      hasAnthropic,
      hasGoogle,
      hasXai,
    })
  }

  // Check spending limits before processing (when blocking is enabled)
  if (!(await isSpendingAllowed())) {
    logger.warn('AI spending limit exceeded - request blocked', { requestId })
    return NextResponse.json(
      { error: 'AI spending limit exceeded. Please try again later.' },
      { status: 429 }
    )
  }

  // Check rate limiting
  const client = getClientIdentifier(request)
  const needsSessionCookie = !request.cookies.get(SESSION_COOKIE_NAME)

  const rateLimitCheck = await checkRateLimitDistributed(client.id, client.isFingerprint)
  if (!rateLimitCheck.allowed) {
    const errorBody = buildRateLimitResponse(rateLimitCheck.remainingMs || 0)
    const response = NextResponse.json(errorBody, {
      status: 429,
      headers: {
        'Retry-After': errorBody.retryAfter.toString(),
      },
    })

    // Set session cookie if user doesn't have one
    if (needsSessionCookie) {
      const headers = new Headers(response.headers)
      headers.set(
        'Set-Cookie',
        `${SESSION_COOKIE_NAME}=${generateSessionId()}; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Lax; Max-Age=${SESSION_COOKIE_MAX_AGE}; Path=${SESSION_COOKIE_PATH}`
      )

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }

    return response
  }

  let payload: MetaDjAiApiRequestBody
  const bodyResult = await readJsonBodyWithLimit<MetaDjAiApiRequestBody>(
    request,
    getMaxRequestSize(request.nextUrl.pathname)
  )
  if (!bodyResult.ok) {
    return bodyResult.response
  }
  payload = bodyResult.data

  // Validate payload using consolidated validation
  const validation = validateMetaDjAiRequest(payload)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: validation.statusCode })
  }

  const requestedProvider = payload.modelPreference
  const defaultProvider = getModelInfo().provider
  const preferredProvider =
    requestedProvider === 'anthropic' ||
    requestedProvider === 'openai' ||
    requestedProvider === 'google' ||
    requestedProvider === 'xai'
      ? requestedProvider
      : defaultProvider

  if (preferredProvider === 'openai' && !hasOpenAI) {
    logger.warn('[MetaDJai] OpenAI provider selected but key missing', { requestId })
    return NextResponse.json({ error: 'OpenAI provider is not configured for MetaDJai.' }, { status: 503 })
  }
  if (preferredProvider === 'anthropic' && !hasAnthropic) {
    logger.warn('[MetaDJai] Anthropic provider selected but key missing', { requestId })
    return NextResponse.json({ error: 'Anthropic provider is not configured for MetaDJai.' }, { status: 503 })
  }
  if (preferredProvider === 'google' && !hasGoogle) {
    logger.warn('[MetaDJai] Google provider selected but key missing', { requestId })
    return NextResponse.json({ error: 'Google provider is not configured for MetaDJai.' }, { status: 503 })
  }
  if (preferredProvider === 'xai' && !hasXai) {
    logger.warn('[MetaDJai] xAI provider selected but key missing', { requestId })
    return NextResponse.json({ error: 'xAI provider is not configured for MetaDJai.' }, { status: 503 })
  }

  // Rate limiting is consumed on initial check for consistent enforcement across modes.

  // Helper to create streaming response with optional session cookie
  // Use toUIMessageStreamResponse() to emit SSE UI message events (data: {json})
  // expected by the client-side stream parser.
  const createResponse = (streamResult: { toUIMessageStreamResponse: () => Response }) => {
    const response = streamResult.toUIMessageStreamResponse()

    if (needsSessionCookie) {
      const headers = new Headers(response.headers)
      headers.set(
        'Set-Cookie',
        `${SESSION_COOKIE_NAME}=${generateSessionId()}; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Lax; Max-Age=${SESSION_COOKIE_MAX_AGE}; Path=${SESSION_COOKIE_PATH}`
      )

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }

    return response
  }

  const createCachedResponse = (cachedText: string) => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const deltaEvent = JSON.stringify({ type: 'text-delta', delta: cachedText })
        controller.enqueue(encoder.encode(`data: ${deltaEvent}\n\n`))
        controller.enqueue(encoder.encode(`data: {"type":"finish"}\n\n`))
        controller.close()
      },
    })

    const headers = new Headers({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
    })

    if (needsSessionCookie) {
      headers.set(
        'Set-Cookie',
        `${SESSION_COOKIE_NAME}=${generateSessionId()}; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Lax; Max-Age=${SESSION_COOKIE_MAX_AGE}; Path=${SESSION_COOKIE_PATH}`
      )
    }

    return new Response(stream, { status: 200, headers })
  }

  // Prepare sanitized messages for both attempts
  const sanitizedMessages = sanitizeMessages(payload.messages).map((message) => ({
    role: message.role,
    content: message.content,
  }))
  const buildSystemInstructions = (
    provider: 'openai' | 'anthropic' | 'google' | 'xai',
    modelName?: string
  ) =>
    buildMetaDjAiSystemInstructions(payload.context, payload.personalization, provider, {
      webSearchAvailable: provider === 'openai' && hasOpenAI,
      modelInfo: modelName
        ? { label: MODEL_LABELS[provider], model: modelName, provider }
        : undefined,
    })

  const cacheMode = payload.context?.mode ?? 'adaptive'
  const cacheContextSignature = JSON.stringify({
    cacheScope: client.id,
    nowPlayingTitle: payload.context?.nowPlayingTitle,
    nowPlayingArtist: payload.context?.nowPlayingArtist,
    selectedCollectionTitle: payload.context?.selectedCollectionTitle,
    pageView: payload.context?.pageContext?.view,
    pageDetails: payload.context?.pageContext?.details,
    contentSection: payload.context?.contentContext?.section,
    contentId: payload.context?.contentContext?.id,
    cinemaActive: payload.context?.cinemaActive,
    wisdomActive: payload.context?.wisdomActive,
    modelPreference: preferredProvider,
    personalization: payload.personalization
      ? {
          enabled: payload.personalization.enabled,
          profileId: payload.personalization.profileId,
          profileLabel: payload.personalization.profileLabel,
          instructions: payload.personalization.instructions,
        }
      : null,
  })
  const cacheKey = createCacheKey(sanitizedMessages, cacheMode, cacheContextSignature)
  const cachedResponse = await getCachedResponse(cacheKey)
  if (cachedResponse) {
    return createCachedResponse(cachedResponse)
  }

  // AI request timeout configuration
  const controller = new AbortController()
  const timeoutMs = getAIRequestTimeout('stream')
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  // Track request timing
  const requestStartTime = Date.now()

  // Check if we should skip primary and go directly to fallback (circuit open)
  const modelInfo = getModelInfo(preferredProvider)
  const primaryCircuitOpen = isCircuitOpen(modelInfo.provider)
  const failoverEnabled = isFailoverEnabled() && isFailoverAvailable(preferredProvider)

  // Helper function to create streaming result with a specific model
  const createStreamingResult = (
    model: ReturnType<typeof getModel>,
    settings: ReturnType<typeof getModelSettingsForProvider>,
    providerInfo: { provider: 'openai' | 'anthropic' | 'google' | 'xai'; model: string },
    usedFallback: boolean
  ) => {
    const tools = getTools(settings.provider, {
      webSearchAvailable: settings.provider === 'openai' && hasOpenAI,
    })
    const providerOptions = getProviderOptions(settings.provider)

    return streamText({
      model,
      maxOutputTokens: settings.maxOutputTokens,
      temperature: settings.temperature,
      system: buildSystemInstructions(settings.provider, providerInfo.model),
      messages: sanitizedMessages,
      tools,
      providerOptions,
      stopWhen: createStopCondition(),
      abortSignal: controller.signal,
      onFinish: ({ usage, steps, text }) => {
        clearTimeout(timeout)
        const toolCalls = steps
          ?.flatMap(s => s.toolCalls ?? [])
          .map(tc => tc.toolName)
          .filter(Boolean) ?? []
        const usedTools = steps?.some((step) => (step.toolCalls?.length ?? 0) > 0)

        // Record success for circuit breaker
        recordSuccess(providerInfo.provider)

        if (!usedTools && cacheKey) {
          void setCachedResponse(cacheKey, text, providerInfo.model)
        }

        logAIUsage({
          requestId,
          provider: providerInfo.provider,
          model: providerInfo.model,
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
          totalTokens: usage?.totalTokens,
          toolCalls,
          durationMs: Date.now() - requestStartTime,
          success: true,
          clientId: client.id,
          usedFallback,
        })
      },
      onError: ({ error }) => {
        // Handle mid-stream errors
        clearTimeout(timeout)
        const errorMessage = error instanceof Error ? error.message : String(error)

        logger.error('MetaDJai streaming error (mid-stream)', {
          requestId,
          provider: providerInfo.provider,
          model: providerInfo.model,
          error: errorMessage,
          durationMs: Date.now() - requestStartTime,
          usedFallback,
        })

        // Record failure for circuit breaker if it's a provider error
        if (isProviderError(error)) {
          recordFailure(providerInfo.provider, errorMessage)
        }

        // Log failed usage for metrics
        logAIUsage({
          requestId,
          provider: providerInfo.provider,
          model: providerInfo.model,
          durationMs: Date.now() - requestStartTime,
          success: false,
          error: errorMessage,
          clientId: client.id,
          usedFallback,
        })
      },
    })
  }

  // If primary circuit is open and failover is available, skip to fallback
  if (primaryCircuitOpen && failoverEnabled) {
    logger.info('Primary provider circuit open, using fallback directly', {
      requestId,
      primaryProvider: modelInfo.provider,
    })

    const fallbackModel = getFallbackModel(preferredProvider)
    const fallbackModelInfo = getFallbackModelInfo(preferredProvider)
    const fallbackSettings = getFallbackModelSettings(preferredProvider)

    if (fallbackModel && fallbackModelInfo && fallbackSettings) {
      try {
        const result = createStreamingResult(fallbackModel, fallbackSettings, fallbackModelInfo, true)
        return createResponse(result)
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        clearTimeout(timeout)

        if (isProviderError(fallbackError)) {
          recordFailure(fallbackModelInfo.provider, fallbackMessage)
        }

        logger.error('Fallback provider also failed', { requestId, error: fallbackMessage })
        return NextResponse.json({ error: 'AI service temporarily unavailable. Please try again.' }, { status: 502 })
      }
    }
  }

  // Try primary model first
  try {
    const model = getModel(preferredProvider)
    const modelSettings = getModelSettingsForProvider(preferredProvider)

    const result = createStreamingResult(model, modelSettings, modelInfo, false)
    return createResponse(result)
  } catch (primaryError) {
    const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError)
    const isPrimaryTimeout = isTimeoutError(primaryError)
    const isPrimaryProviderError = isProviderError(primaryError)

    // Record failure for circuit breaker if it's a provider error
    if (isPrimaryProviderError) {
      recordFailure(modelInfo.provider, primaryMessage)
    }

    // If it's a timeout, return timeout error (don't failover for timeouts)
    if (isPrimaryTimeout) {
      clearTimeout(timeout)
      logger.error('MetaDJai streaming timed out', { requestId, error: primaryMessage })
      return NextResponse.json({ error: 'AI request timed out. Please try again.' }, { status: 504 })
    }

    // If failover is enabled and this is a provider error, try fallback
    if (failoverEnabled && isPrimaryProviderError) {
      clearTimeout(timeout)
      logger.info('Primary provider failed, attempting failover', {
        requestId,
        primaryProvider: modelInfo.provider,
        error: primaryMessage,
      })

      const fallbackModel = getFallbackModel(preferredProvider)
      const fallbackModelInfo = getFallbackModelInfo(preferredProvider)
      const fallbackSettings = getFallbackModelSettings(preferredProvider)

      if (fallbackModel && fallbackModelInfo && fallbackSettings) {
        // Reset timeout for fallback attempt
        const fallbackController = new AbortController()
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), timeoutMs)

        try {
          const fallbackTools = getTools(fallbackSettings.provider, {
            webSearchAvailable: fallbackSettings.provider === 'openai' && hasOpenAI,
          })
          const fallbackProviderOptions = getProviderOptions(fallbackSettings.provider)

          const result = streamText({
            model: fallbackModel,
            maxOutputTokens: fallbackSettings.maxOutputTokens,
            temperature: fallbackSettings.temperature,
            system: buildSystemInstructions(fallbackSettings.provider, fallbackModelInfo.model),
            messages: sanitizedMessages,
            tools: fallbackTools,
            providerOptions: fallbackProviderOptions,
            stopWhen: createStopCondition(),
            abortSignal: fallbackController.signal,
            onFinish: ({ usage, steps }) => {
              clearTimeout(fallbackTimeout)
              const toolCalls = steps
                ?.flatMap(s => s.toolCalls ?? [])
                .map(tc => tc.toolName)
                .filter(Boolean) ?? []

              recordSuccess(fallbackModelInfo.provider)

              logAIUsage({
                requestId,
                provider: fallbackModelInfo.provider,
                model: fallbackModelInfo.model,
                inputTokens: usage?.inputTokens,
                outputTokens: usage?.outputTokens,
                totalTokens: usage?.totalTokens,
                toolCalls,
                durationMs: Date.now() - requestStartTime,
                success: true,
                clientId: client.id,
                usedFallback: true,
              })
            },
          })

          return createResponse(result)
        } catch (fallbackError) {
          clearTimeout(fallbackTimeout)
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)

          if (isProviderError(fallbackError)) {
            recordFailure(fallbackModelInfo.provider, fallbackMessage)
          }

          logger.error('Fallback provider also failed', {
            requestId,
            primaryError: primaryMessage,
            fallbackError: fallbackMessage,
          })
        }
      }
    }

    clearTimeout(timeout)
    logger.error('MetaDJai streaming failed', { requestId, error: primaryMessage })
    return NextResponse.json({ error: 'AI service temporarily unavailable. Please try again.' }, { status: 502 })
  }
}
