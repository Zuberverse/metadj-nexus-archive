/**
 * AI provider configuration tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  estimateCost,
  formatCost,
  getFallbackModelInfo,
  getFallbackModelSettings,
  getModelInfo,
  getModelSettings,
  getModelSettingsForProvider,
  getProviderOptions,
  isFailoverAvailable,
} from '@/lib/ai/providers'
import { clearEnvCache } from '@/lib/env'

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => {
    const client = ((modelId: string) => ({ provider: 'openai', modelId })) as any
    client.embedding = (modelId: string) => ({ provider: 'openai', modelId })
    return client
  }),
  openai: {
    tools: {
      webSearch: vi.fn(() => ({ type: 'web-search' })),
    },
  },
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => (modelId: string) => ({ provider: 'google', modelId })),
  google: (modelId: string) => ({ provider: 'google', modelId }),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: (modelId: string) => ({ provider: 'anthropic', modelId }),
}))

vi.mock('@ai-sdk/xai', () => ({
  createXai: vi.fn(() => (modelId: string) => ({ provider: 'xai', modelId })),
  xai: (modelId: string) => ({ provider: 'xai', modelId }),
}))

const originalEnv = process.env

const resetEnv = () => {
  process.env = { ...originalEnv }
  clearEnvCache()
}

describe('ai/providers', () => {
  beforeEach(() => {
    resetEnv()
  })

  it('defaults to openai when provider is invalid', () => {
    process.env.AI_PROVIDER = 'unknown'
    process.env.OPENAI_API_KEY = 'test'
    clearEnvCache()

    const info = getModelInfo()
    expect(info.provider).toBe('openai')
    expect(info.model).toBe('gpt-5.2-chat-latest')
  })

  it('resolves google provider settings when configured', () => {
    process.env.AI_PROVIDER = 'google'
    process.env.GOOGLE_API_KEY = 'test'
    process.env.GOOGLE_AI_MODEL = 'gemini-2.0-pro'
    clearEnvCache()

    const settings = getModelSettings()
    expect(settings.provider).toBe('google')
    expect(settings.name).toBe('gemini-2.0-pro')

    const overrideSettings = getModelSettingsForProvider('google')
    expect(overrideSettings.provider).toBe('google')
    expect(overrideSettings.name).toBe('gemini-2.0-pro')
  })

  it('returns fallback model info when alternate provider is available', () => {
    process.env.OPENAI_API_KEY = 'openai-key'
    process.env.GOOGLE_API_KEY = 'google-key'
    clearEnvCache()

    const fallback = getFallbackModelInfo('openai')
    expect(fallback?.provider).toBe('google')
    expect(fallback?.available).toBe(true)

    const fallbackSettings = getFallbackModelSettings('openai')
    expect(fallbackSettings?.provider).toBe('google')
  })

  it('returns false for failover when only one provider is configured', () => {
    process.env.OPENAI_API_KEY = 'openai-key'
    clearEnvCache()

    expect(isFailoverAvailable('openai')).toBe(false)
  })

  it('formats cost estimates for display', () => {
    const cost = estimateCost('gpt-4o', 1000, 2000)
    expect(cost).toBeCloseTo(0.0225)

    expect(formatCost(0.00005)).toBe('<$0.0001')
    expect(formatCost(0.005)).toBe('$0.0050')
    expect(formatCost(0.2)).toBe('$0.20')
  })

  it('returns provider options only for google', () => {
    expect(getProviderOptions('openai')).toBeUndefined()
    expect(getProviderOptions('google')).toBeDefined()
  })
})
