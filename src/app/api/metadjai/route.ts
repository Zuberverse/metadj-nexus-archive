import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { isCircuitOpen, isProviderError, recordFailure, recordSuccess } from '@/lib/ai/circuit-breaker';
import { createStopCondition, getAIRequestTimeout, isTimeoutError } from '@/lib/ai/config';
import { isFailoverEnabled } from '@/lib/ai/failover';
import { buildMetaDjAiSystemInstructions } from '@/lib/ai/meta-dj-ai-prompt';
import { MODEL_LABELS } from '@/lib/ai/model-preferences';
import {
  getModel,
  getModelInfo,
  getModelSettingsForProvider,
  getProviderOptions,
  getFallbackModel,
  getFallbackModelInfo,
  getFallbackModelSettings,
  isFailoverAvailable,
} from '@/lib/ai/providers';
import { estimateCost } from '@/lib/ai/providers';
import {
  sanitizeMessages,
  getClientIdentifier,
  checkRateLimitDistributed,
  generateSessionId,
  buildRateLimitResponse,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_PATH,
  RATE_LIMIT_WINDOW_MS,
} from '@/lib/ai/rate-limiter';
import { isSpendingAllowed, recordSpending } from '@/lib/ai/spending-alerts';
import { getTools } from '@/lib/ai/tools';
import { validateMetaDjAiRequest } from '@/lib/ai/validation';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { getRequestId } from '@/lib/request-id';
import { validateOrigin, buildOriginForbiddenResponse } from '@/lib/validation/origin-validation';
import { getMaxRequestSize, readJsonBodyWithLimit } from '@/lib/validation/request-size';
import type {
  MetaDjAiApiRequestBody,
  MetaDjAiApiResponseBody,
} from '@/types/metadjai.types';

export const runtime = 'nodejs';

/**
 * Processes a non-streaming chat request to the MetaDJai AI companion.
 *
 * Generates a complete AI response using the configured provider (GPT default, Gemini/Claude/Grok optional)
 * with automatic failover support. Includes rate limiting, session management via cookies,
 * input sanitization, circuit breaker integration, and a configurable timeout with
 * abort signal support.
 *
 * Features:
 * - Automatic provider failover with circuit breaker pattern
 * - Rate limiting (20 messages per 5-minute window)
 * - Session cookie for per-device isolation
 * - Input sanitization and content length limits
 *
 * @route POST /api/metadjai
 * @param request - The incoming Next.js request containing message history and optional context
 * @returns JSON response with AI reply, model info, token usage, and tool usage
 *
 * @example
 * // Request body
 * { messages: [{ role: 'user', content: 'Tell me about this track' }], context: { trackTitle: 'Neon Dreams' } }
 *
 * @throws {400} Invalid request body or missing/empty messages array
 * @throws {429} Rate limit exceeded (includes Retry-After header)
 * @throws {500} Environment configuration error
 * @throws {502} AI service temporarily unavailable
 * @throws {503} No AI providers configured
 * @throws {504} AI request timed out
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  // Validate origin for CSRF protection
  const { allowed: originAllowed } = validateOrigin(request);
  if (!originAllowed) {
    logger.warn('Request blocked: invalid origin', { requestId });
    return buildOriginForbiddenResponse();
  }

  let env;
  try {
    env = getEnv();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Environment configuration error', { requestId, error: message });
    // Return generic error message to client; details are logged server-side
    return NextResponse.json(
      { error: 'Service configuration error. Please try again later.' },
      { status: 500 },
    );
  }

  const {
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    GOOGLE_API_KEY,
    XAI_API_KEY,
  } = env;
  const hasOpenAI = !!OPENAI_API_KEY;
  const hasAnthropic = !!ANTHROPIC_API_KEY;
  const hasGoogle = !!GOOGLE_API_KEY;
  const hasXai = !!XAI_API_KEY;

  if (!hasOpenAI && !hasAnthropic && !hasGoogle && !hasXai) {
    return NextResponse.json(
      { error: 'MetaDJai is not configured.' },
      { status: 503 },
    );
  }

  // Check spending limits before processing (when blocking is enabled)
  if (!(await isSpendingAllowed())) {
    logger.warn('AI spending limit exceeded - request blocked', { requestId });
    return NextResponse.json(
      { error: 'AI spending limit exceeded. Please try again later.' },
      { status: 429 },
    );
  }

  const client = getClientIdentifier(request);
  const needsSessionCookie = !request.cookies.get(SESSION_COOKIE_NAME);
  const rateLimitCheck = await checkRateLimitDistributed(client.id, client.isFingerprint);
  if (!rateLimitCheck.allowed) {
    const errorBody = buildRateLimitResponse(rateLimitCheck.remainingMs || 0);
    const response = NextResponse.json(errorBody, {
      status: 429,
      headers: { 'Retry-After': errorBody.retryAfter.toString() },
    });

    if (needsSessionCookie) {
      response.cookies.set(SESSION_COOKIE_NAME, generateSessionId(), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_COOKIE_MAX_AGE,
        path: SESSION_COOKIE_PATH,
      });
    }

    return response;
  }

  let payload: MetaDjAiApiRequestBody;

  const bodyResult = await readJsonBodyWithLimit<MetaDjAiApiRequestBody>(
    request,
    getMaxRequestSize(request.nextUrl.pathname)
  );
  if (!bodyResult.ok) {
    return bodyResult.response;
  }
  payload = bodyResult.data;

  // Validate payload using consolidated validation
  const validation = validateMetaDjAiRequest(payload);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: validation.statusCode });
  }

  const requestedProvider = payload.modelPreference;
  const defaultProvider = getModelInfo().provider;
  const preferredProvider =
    requestedProvider === 'anthropic' ||
    requestedProvider === 'openai' ||
    requestedProvider === 'google' ||
    requestedProvider === 'xai'
      ? requestedProvider
      : defaultProvider;

  if (preferredProvider === 'openai' && !hasOpenAI) {
    return NextResponse.json(
      { error: 'OpenAI provider is not configured for MetaDJai.' },
      { status: 503 },
    );
  }
  if (preferredProvider === 'anthropic' && !hasAnthropic) {
    return NextResponse.json(
      { error: 'Anthropic provider is not configured for MetaDJai.' },
      { status: 503 },
    );
  }
  if (preferredProvider === 'google' && !hasGoogle) {
    return NextResponse.json(
      { error: 'Google provider is not configured for MetaDJai.' },
      { status: 503 },
    );
  }
  if (preferredProvider === 'xai' && !hasXai) {
    return NextResponse.json(
      { error: 'xAI provider is not configured for MetaDJai.' },
      { status: 503 },
    );
  }

  const messages = sanitizeMessages(payload.messages);

  const responseCookies: Array<{ name: string; value: string }> = [];
  if (needsSessionCookie) {
    responseCookies.push({ name: SESSION_COOKIE_NAME, value: generateSessionId() });
  }

  // AI request timeout configuration
  const controller = new AbortController();
  const timeoutMs = getAIRequestTimeout('chat');
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const isWebSearchAvailable = (provider: 'openai' | 'anthropic' | 'google' | 'xai') =>
    provider === 'openai' && hasOpenAI;

  const buildSystemInstructions = (provider: 'openai' | 'anthropic' | 'google' | 'xai', modelName?: string) =>
    buildMetaDjAiSystemInstructions(payload.context, payload.personalization, provider, {
      webSearchAvailable: isWebSearchAvailable(provider),
      modelInfo: modelName ? { label: MODEL_LABELS[provider], model: modelName, provider } : undefined,
    });
  const formattedMessages = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const extractToolResults = (toolResults: unknown) => {
    if (!Array.isArray(toolResults)) return undefined;

    const extracted = toolResults
      .map((toolResult) => {
        if (!toolResult || typeof toolResult !== 'object') return null;
        const record = toolResult as Record<string, unknown>;
        const tool =
          typeof record.toolName === 'string'
            ? record.toolName
            : typeof record.name === 'string'
              ? record.name
              : typeof record.tool === 'object' && record.tool && 'name' in record.tool
                ? (record.tool as { name?: unknown }).name
                : undefined;
        const name = typeof tool === 'string' ? tool : undefined;
        if (!name) return null;

        const resultValue =
          'result' in record
            ? (record as { result?: unknown }).result
            : 'output' in record
              ? (record as { output?: unknown }).output
              : 'data' in record
                ? (record as { data?: unknown }).data
                : undefined;

        return { name, result: resultValue };
      })
      .filter((entry): entry is { name: string; result: unknown } => Boolean(entry));

    return extracted.length > 0 ? extracted : undefined;
  };

  // Helper to build success response and record spending
  const buildSuccessResponse = async (
    result: {
      text: string;
      toolCalls?: Array<{ toolCallId: string; toolName: string }>;
      toolResults?: unknown;
      usage?: { inputTokens?: number; outputTokens?: number };
    },
    modelName: string,
    providerName: string
  ) => {
    const toolUsage = result.toolCalls?.map((call) => ({
      id: call.toolCallId,
      name: call.toolName,
    })) ?? [];
    const toolResults = extractToolResults(result.toolResults);

    const trackedReply = validateWebSearchCitations(result.text, toolUsage);

    const body: MetaDjAiApiResponseBody = {
      reply: trackedReply,
      model: modelName,
      usage: {
        promptTokens: result.usage?.inputTokens,
        completionTokens: result.usage?.outputTokens,
      },
      toolUsage,
      toolResults,
    };

    // Record spending for threshold tracking and alerts
    if (result.usage?.inputTokens !== undefined && result.usage?.outputTokens !== undefined) {
      const costUsd = estimateCost(modelName, result.usage.inputTokens, result.usage.outputTokens);
      if (costUsd > 0) {
        try {
          await recordSpending({ costUsd, provider: providerName, model: modelName });
        } catch (error) {
          logger.warn('[AI Spending] Failed to record spending', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const res = NextResponse.json(body, { status: 200 });
    if (responseCookies.length > 0) {
      responseCookies.forEach(({ name, value }) => {
        res.cookies.set(name, value, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: SESSION_COOKIE_MAX_AGE,
          path: SESSION_COOKIE_PATH,
        });
      });
    }
    return res;
  };

  // Check if we should skip primary and go directly to fallback (circuit open)
  const modelInfo = getModelInfo(preferredProvider);
  const primaryCircuitOpen = isCircuitOpen(modelInfo.provider);
  const failoverEnabled = isFailoverEnabled() && isFailoverAvailable(preferredProvider);

  // If primary circuit is open and failover is available, skip to fallback
  if (primaryCircuitOpen && failoverEnabled) {
    logger.info('Primary provider circuit open, using fallback directly', {
      primaryProvider: modelInfo.provider,
    });

    const fallbackModel = getFallbackModel(preferredProvider);
    const fallbackModelInfo = getFallbackModelInfo(preferredProvider);
    const fallbackSettings = getFallbackModelSettings(preferredProvider);

    if (fallbackModel && fallbackModelInfo && fallbackSettings) {
      try {
        const providerOptions = getProviderOptions(fallbackSettings.provider);
        const result = await generateText({
          model: fallbackModel,
          maxOutputTokens: fallbackSettings.maxOutputTokens,
          temperature: fallbackSettings.temperature,
          system: buildSystemInstructions(fallbackSettings.provider, fallbackSettings.name),
          messages: formattedMessages,
          tools: getTools(fallbackSettings.provider, {
            webSearchAvailable: isWebSearchAvailable(fallbackSettings.provider),
          }),
          providerOptions,
          stopWhen: createStopCondition(),
          abortSignal: controller.signal,
        });

        clearTimeout(timeout);
        recordSuccess(fallbackModelInfo.provider);
        return await buildSuccessResponse(result, fallbackSettings.name, fallbackModelInfo.provider);
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        clearTimeout(timeout);

        if (isProviderError(fallbackError)) {
          recordFailure(fallbackModelInfo.provider, fallbackMessage);
        }

        logger.error('Fallback provider also failed', { requestId, error: fallbackMessage });
        return NextResponse.json(
          { error: 'AI service temporarily unavailable. Please try again.' },
          { status: 502 },
        );
      }
    }
  }

  // Try primary model first
  try {
    const model = getModel(preferredProvider);
    const modelSettings = getModelSettingsForProvider(preferredProvider);
    const providerOptions = getProviderOptions(modelSettings.provider);

    const result = await generateText({
      model,
      maxOutputTokens: modelSettings.maxOutputTokens,
      temperature: modelSettings.temperature,
      system: buildSystemInstructions(modelSettings.provider, modelSettings.name),
      messages: formattedMessages,
      tools: getTools(modelSettings.provider, {
        webSearchAvailable: isWebSearchAvailable(modelSettings.provider),
      }),
      providerOptions,
      stopWhen: createStopCondition(),
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);
    recordSuccess(modelInfo.provider);
    return await buildSuccessResponse(result, modelSettings.name, modelInfo.provider);
  } catch (primaryError) {
    const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
    const isPrimaryTimeout = isTimeoutError(primaryError);
    const isPrimaryProviderError = isProviderError(primaryError);

    // Record failure for circuit breaker if it's a provider error
    if (isPrimaryProviderError) {
      recordFailure(modelInfo.provider, primaryMessage);
    }

    // If it's a timeout, return timeout error (don't failover for timeouts)
    if (isPrimaryTimeout) {
      clearTimeout(timeout);
      logger.error('MetaDJai request timed out', { requestId, error: primaryMessage });
      return NextResponse.json(
        { error: 'AI request timed out. Please try again.' },
        { status: 504 },
      );
    }

    // If failover is enabled and this is a provider error, try fallback
    if (failoverEnabled && isPrimaryProviderError) {
      logger.info('Primary provider failed, attempting failover', {
        primaryProvider: modelInfo.provider,
        error: primaryMessage,
      });

      const fallbackModel = getFallbackModel(preferredProvider);
      const fallbackModelInfo = getFallbackModelInfo(preferredProvider);
      const fallbackSettings = getFallbackModelSettings(preferredProvider);

      if (fallbackModel && fallbackModelInfo && fallbackSettings) {
        // Reset timeout for fallback attempt
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(() => fallbackController.abort(), timeoutMs);

        try {
          const fallbackProviderOptions = getProviderOptions(fallbackSettings.provider);
          const result = await generateText({
            model: fallbackModel,
            maxOutputTokens: fallbackSettings.maxOutputTokens,
            temperature: fallbackSettings.temperature,
            system: buildSystemInstructions(fallbackSettings.provider, fallbackSettings.name),
            messages: formattedMessages,
            tools: getTools(fallbackSettings.provider, {
              webSearchAvailable: isWebSearchAvailable(fallbackSettings.provider),
            }),
            providerOptions: fallbackProviderOptions,
            stopWhen: createStopCondition(),
            abortSignal: fallbackController.signal,
          });

          clearTimeout(timeout);
          clearTimeout(fallbackTimeout);
          recordSuccess(fallbackModelInfo.provider);
          return await buildSuccessResponse(result, fallbackSettings.name, fallbackModelInfo.provider);
        } catch (fallbackError) {
          clearTimeout(fallbackTimeout);
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);

          if (isProviderError(fallbackError)) {
            recordFailure(fallbackModelInfo.provider, fallbackMessage);
          }

          logger.error('Fallback provider also failed', {
            requestId,
            primaryError: primaryMessage,
            fallbackError: fallbackMessage,
          });
        }
      }
    }

    clearTimeout(timeout);
    logger.error('MetaDJai request failed', { requestId, error: primaryMessage });
    return NextResponse.json(
      { error: 'AI service temporarily unavailable. Please try again.' },
      { status: 502 },
    );
  }
}

function validateWebSearchCitations(text: string, toolUsage: Array<{ name: string }>): string {
  const usedSearch = toolUsage.some((tool) => tool.name === 'web_search');
  if (!usedSearch) {
    return text;
  }

  const hasMarkdownLinks = /\[.+?\]\(https?:\/\/.+?\)/.test(text);
  if (hasMarkdownLinks) {
    return text;
  }

  return `${text}\n\n---\n*Note: Web search was used—please cite sources with markdown links such as [Source](https://example.com).*`;
}
