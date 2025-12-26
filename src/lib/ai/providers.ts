/**
 * AI Provider Configuration
 *
 * Configures AI model providers (OpenAI, Google, Anthropic, xAI) with automatic failover support.
 *
 * Default provider: OpenAI GPT-5.2 Chat
 * Fallback priority: GPT -> Gemini -> Claude -> Grok (skips the active provider)
 * Per-request overrides can swap the primary provider while keeping the mapped fallback.
 *
 * Features:
 * - Provider selection based on configuration
 * - Fallback model getter for failover scenarios
 * - Cost estimation for usage tracking
 *
 * @module lib/ai/providers
 */

import { anthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI, google } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createXai, xai } from '@ai-sdk/xai'
import { getServerEnv } from '@/lib/env'

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'xai'

// Create OpenAI client with standard API key support
// Uses OPENAI_API_KEY when available (required for MetaDJai OpenAI usage)
function getOpenAIClient() {
  const env = getServerEnv()

  // Prefer standard OpenAI API key (user's own key)
  if (env.OPENAI_API_KEY) {
    return createOpenAI({
      apiKey: env.OPENAI_API_KEY,
    })
  }

  // Return default client (will fail at runtime if no key configured)
  return createOpenAI({})
}

function getGoogleClient() {
  const env = getServerEnv()
  if (env.GOOGLE_API_KEY) {
    return createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
  }
  return google
}

function getXaiClient() {
  const env = getServerEnv()
  if (env.XAI_API_KEY) {
    return createXai({ apiKey: env.XAI_API_KEY })
  }
  return xai
}

export type ModelSettings = {
  name: string
  provider: AIProvider
  maxOutputTokens: number
  temperature: number
}

const DEFAULT_MAX_OUTPUT_TOKENS = 2048
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_PRIMARY_MODEL = 'gpt-5.2-chat-latest'
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5'
const DEFAULT_GOOGLE_MODEL = 'gemini-3-flash-preview'
const DEFAULT_XAI_MODEL = 'grok-4-1-fast-non-reasoning'
const PROVIDER_PRIORITY: AIProvider[] = ['openai', 'google', 'anthropic', 'xai']

/**
 * Default cost rates per 1 million tokens (USD)
 *
 * Last verified: December 2025
 * These defaults can be overridden via AI_TOKEN_COSTS environment variable.
 * Source: OpenAI, Google, Anthropic, and xAI pricing pages
 *
 * To override at runtime, set AI_TOKEN_COSTS env var with JSON:
 * AI_TOKEN_COSTS='{"gpt-4o":{"input":2.5,"output":10}}'
 */
const DEFAULT_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI models (December 2025 pricing)
  'gpt-5.2-chat-latest': { input: 1.75, output: 14.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  // Anthropic models (December 2025 pricing)
  'claude-4-5-haiku-20251001': { input: 0.80, output: 4.00 }, // previous id
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-opus-4-20250514': { input: 15.00, output: 75.00 },
  // Google models (December 2025 pricing)
  'gemini-3-flash-preview': { input: 0.10, output: 0.40 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.0-pro': { input: 1.25, output: 5.00 },
  // xAI models (December 2025 pricing)
  'grok-4-1-fast-non-reasoning': { input: 2.00, output: 10.00 },
  'grok-3': { input: 3.00, output: 15.00 },
  // Default fallback rates for unknown models
  'default': { input: 1.00, output: 3.00 },
}

/**
 * Load token costs with environment variable overrides
 * Allows runtime configuration without code changes
 */
function loadTokenCosts(): Record<string, { input: number; output: number }> {
  const costs = { ...DEFAULT_COSTS }

  const overrideEnv = process.env.AI_TOKEN_COSTS
  if (overrideEnv) {
    try {
      const overrides = JSON.parse(overrideEnv) as Record<string, { input: number; output: number }>
      Object.assign(costs, overrides)
    } catch {
      console.warn('[AI Providers] Invalid AI_TOKEN_COSTS JSON, using defaults')
    }
  }

  return costs
}

/**
 * Cost rates per 1 million tokens (USD)
 * Merged defaults with any runtime overrides from AI_TOKEN_COSTS env var
 */
export const COST_PER_MILLION_TOKENS = loadTokenCosts()

// Get validated environment variables
function getEnvConfig() {
  const env = getServerEnv()
  const anthropicModel = process.env.ANTHROPIC_AI_MODEL || DEFAULT_ANTHROPIC_MODEL
  const googleModel = process.env.GOOGLE_AI_MODEL || DEFAULT_GOOGLE_MODEL
  const xaiModel = process.env.XAI_AI_MODEL || DEFAULT_XAI_MODEL

  const hasOpenAI = !!env.OPENAI_API_KEY
  const hasGoogle = !!env.GOOGLE_API_KEY

  return {
    // GPT-5.2 is the latest OpenAI model
    PRIMARY_MODEL: process.env.PRIMARY_AI_MODEL || DEFAULT_PRIMARY_MODEL,
    ANTHROPIC_MODEL: anthropicModel,
    GOOGLE_MODEL: googleModel,
    XAI_MODEL: xaiModel,
    AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
    OPENAI_API_KEY: hasOpenAI ? 'configured' : undefined,
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY ? 'configured' : undefined,
    GOOGLE_API_KEY: hasGoogle ? 'configured' : undefined,
    XAI_API_KEY: env.XAI_API_KEY ? 'configured' : undefined,
    HAS_OPENAI: hasOpenAI,
    HAS_ANTHROPIC: !!env.ANTHROPIC_API_KEY,
    HAS_GOOGLE: hasGoogle,
    HAS_XAI: !!env.XAI_API_KEY,
  }
}

function resolveProvider(providerOverride?: AIProvider): AIProvider {
  if (providerOverride) return providerOverride
  const { AI_PROVIDER } = getEnvConfig()
  return AI_PROVIDER === 'anthropic' || AI_PROVIDER === 'google' || AI_PROVIDER === 'xai'
    ? AI_PROVIDER
    : 'openai'
}

function getProviderAvailability(): Record<AIProvider, boolean> {
  const { HAS_OPENAI, HAS_ANTHROPIC, HAS_GOOGLE, HAS_XAI } = getEnvConfig()
  return {
    openai: HAS_OPENAI,
    google: HAS_GOOGLE,
    anthropic: HAS_ANTHROPIC,
    xai: HAS_XAI,
  }
}

function resolveFallbackProvider(providerOverride?: AIProvider): AIProvider | null {
  const provider = resolveProvider(providerOverride)
  const availability = getProviderAvailability()

  for (const candidate of PROVIDER_PRIORITY) {
    if (candidate === provider) continue
    if (availability[candidate]) return candidate
  }

  return null
}

/**
 * Get the selected AI model for the active provider
 *
 * @returns Configured model for current provider
 */
export function getPrimaryModel(providerOverride?: AIProvider) {
  const { PRIMARY_MODEL, ANTHROPIC_MODEL, GOOGLE_MODEL, XAI_MODEL } = getEnvConfig()
  const provider = resolveProvider(providerOverride)
  if (provider === 'anthropic') {
    return anthropic(ANTHROPIC_MODEL)
  }
  if (provider === 'google') {
    const googleClient = getGoogleClient()
    return googleClient(GOOGLE_MODEL)
  }
  if (provider === 'xai') {
    const xaiClient = getXaiClient()
    return xaiClient(XAI_MODEL)
  }
  const openaiClient = getOpenAIClient()
  return openaiClient(PRIMARY_MODEL)
}

/**
 * Alias for getPrimaryModel()
 */
export function getModel(providerOverride?: AIProvider) {
  return getPrimaryModel(providerOverride)
}

/**
 * Get model configuration details
 *
 * @returns Object with model information
 */
export function getModelInfo(providerOverride?: AIProvider) {
  const {
    PRIMARY_MODEL,
    ANTHROPIC_MODEL,
    GOOGLE_MODEL,
    XAI_MODEL,
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    GOOGLE_API_KEY,
    XAI_API_KEY,
  } = getEnvConfig()
  const provider = resolveProvider(providerOverride)
  const model =
    provider === 'openai'
      ? PRIMARY_MODEL
      : provider === 'anthropic'
        ? ANTHROPIC_MODEL
        : provider === 'google'
          ? GOOGLE_MODEL
          : XAI_MODEL
  return {
    provider,
    model,
    hasOpenAI: !!OPENAI_API_KEY,
    hasAnthropic: !!ANTHROPIC_API_KEY,
    hasGoogle: !!GOOGLE_API_KEY,
    hasXai: !!XAI_API_KEY,
  }
}

/**
 * Model configuration constants
 */
export function getModelSettings(): ModelSettings {
  const { PRIMARY_MODEL, ANTHROPIC_MODEL, GOOGLE_MODEL, XAI_MODEL } = getEnvConfig()
  const provider = resolveProvider()
  const name =
    provider === 'openai'
      ? PRIMARY_MODEL
      : provider === 'anthropic'
        ? ANTHROPIC_MODEL
        : provider === 'google'
          ? GOOGLE_MODEL
          : XAI_MODEL

  return {
    name,
    provider,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
  }
}

export function getModelSettingsForProvider(providerOverride: AIProvider): ModelSettings {
  const { PRIMARY_MODEL, ANTHROPIC_MODEL, GOOGLE_MODEL, XAI_MODEL } = getEnvConfig()
  const provider = resolveProvider(providerOverride)
  const name =
    provider === 'openai'
      ? PRIMARY_MODEL
      : provider === 'anthropic'
        ? ANTHROPIC_MODEL
        : provider === 'google'
          ? GOOGLE_MODEL
          : XAI_MODEL

  return {
    name,
    provider,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
  }
}

const GOOGLE_TEXT_ONLY_OPTIONS = {
  google: {
    responseModalities: ['TEXT'] as string[],
    thinkingConfig: {
      includeThoughts: false,
    },
  },
}

export function getProviderOptions(provider: AIProvider) {
  if (provider !== 'google') return undefined
  return GOOGLE_TEXT_ONLY_OPTIONS
}

/**
 * Get the fallback AI model for failover scenarios
 *
 * Returns the fallback provider for the primary selection.
 * Priority order (excluding the selected provider): GPT -> Gemini -> Claude -> Grok
 *
 * @returns Configured fallback model or null if fallback provider unavailable
 */
export function getFallbackModel(providerOverride?: AIProvider) {
  const { PRIMARY_MODEL, ANTHROPIC_MODEL, GOOGLE_MODEL, XAI_MODEL } = getEnvConfig()
  const fallbackProvider = resolveFallbackProvider(providerOverride)
  if (!fallbackProvider) return null

  if (fallbackProvider === 'anthropic') {
    return anthropic(ANTHROPIC_MODEL)
  }
  if (fallbackProvider === 'google') {
    const googleClient = getGoogleClient()
    return googleClient(GOOGLE_MODEL)
  }
  if (fallbackProvider === 'xai') {
    const xaiClient = getXaiClient()
    return xaiClient(XAI_MODEL)
  }

  const openaiClient = getOpenAIClient()
  return openaiClient(PRIMARY_MODEL)
}

/**
 * Get fallback model information
 *
 * @returns Object with fallback provider info or null if unavailable
 */
export function getFallbackModelInfo(providerOverride?: AIProvider): {
  provider: AIProvider
  model: string
  available: boolean
} | null {
  const { PRIMARY_MODEL, ANTHROPIC_MODEL, GOOGLE_MODEL, XAI_MODEL } = getEnvConfig()
  const availability = getProviderAvailability()
  const fallbackProvider = resolveFallbackProvider(providerOverride)
  if (!fallbackProvider) return null

  if (fallbackProvider === 'anthropic') {
    return {
      provider: 'anthropic',
      model: ANTHROPIC_MODEL,
      available: availability.anthropic,
    }
  }
  if (fallbackProvider === 'google') {
    return {
      provider: 'google',
      model: GOOGLE_MODEL,
      available: availability.google,
    }
  }
  if (fallbackProvider === 'xai') {
    return {
      provider: 'xai',
      model: XAI_MODEL,
      available: availability.xai,
    }
  }
  return {
    provider: 'openai',
    model: PRIMARY_MODEL,
    available: availability.openai,
  }
}

/**
 * Get fallback model settings
 *
 * @returns ModelSettings for the fallback provider or null if unavailable
 */
export function getFallbackModelSettings(providerOverride?: AIProvider): ModelSettings | null {
  const fallbackInfo = getFallbackModelInfo(providerOverride)
  if (!fallbackInfo || !fallbackInfo.available) return null

  return {
    name: fallbackInfo.model,
    provider: fallbackInfo.provider,
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
  }
}

/**
 * Estimate cost for a given number of tokens
 *
 * @param model - Model identifier (e.g., 'gpt-5.2-chat-latest')
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Estimated cost in USD
 */
export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = COST_PER_MILLION_TOKENS[model] || COST_PER_MILLION_TOKENS['default']
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000
}

/**
 * Format cost for display
 *
 * @param cost - Cost in USD
 * @returns Formatted cost string (e.g., "$0.0012")
 */
export function formatCost(cost: number): string {
  if (cost < 0.0001) {
    return '<$0.0001'
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`
  }
  return `$${cost.toFixed(2)}`
}

/**
 * Check if failover is possible (an alternate provider is configured)
 *
 * @returns true if a fallback provider is available for the active selection
 */
export function isFailoverAvailable(providerOverride?: AIProvider): boolean {
  return resolveFallbackProvider(providerOverride) !== null
}
