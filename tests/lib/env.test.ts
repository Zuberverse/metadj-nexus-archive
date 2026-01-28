/**
 * Environment Variable Validation Tests
 *
 * Tests Zod-based env validation, caching, and cross-validation rules.
 * Manipulates process.env directly to test various configurations.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getEnv, clearEnvCache, getServerEnv, getClientEnv } from '@/lib/env'

// Minimal valid environment for non-production mode
const MINIMAL_ENV = {
  NODE_ENV: 'test',
  AUTH_SECRET: 'a'.repeat(32),
  NEXT_PUBLIC_APP_URL: 'https://example.com',
}

const originalEnv = { ...process.env }

describe('env validation', () => {
  beforeEach(() => {
    clearEnvCache()
    // Reset to minimal valid env
    process.env = { ...MINIMAL_ENV }
  })

  afterEach(() => {
    process.env = originalEnv
    clearEnvCache()
  })

  // ─── Basic Validation ─────────────────────────────────────────────────

  describe('getEnv', () => {
    it('validates and returns env for minimal valid config', () => {
      const env = getEnv()
      expect(env.NODE_ENV).toBe('test')
      expect(env.AUTH_SECRET).toBe('a'.repeat(32))
    })

    it('caches result across multiple calls', () => {
      const env1 = getEnv()
      const env2 = getEnv()
      expect(env1).toBe(env2) // Same reference
    })

    it('throws for missing AUTH_SECRET', () => {
      delete process.env.AUTH_SECRET
      expect(() => getEnv()).toThrow('Environment validation failed')
    })

    it('throws for AUTH_SECRET shorter than 32 chars', () => {
      process.env.AUTH_SECRET = 'short'
      expect(() => getEnv()).toThrow('Environment validation failed')
    })

    it('defaults NODE_ENV to development when missing', () => {
      delete process.env.NODE_ENV
      const env = getEnv()
      expect(env.NODE_ENV).toBe('development')
    })

    it('defaults PORT to 8100', () => {
      const env = getEnv()
      expect(env.PORT).toBe('8100')
    })

    it('accepts valid PORT override', () => {
      process.env.PORT = '3000'
      const env = getEnv()
      expect(env.PORT).toBe('3000')
    })

    it('rejects non-numeric PORT', () => {
      process.env.PORT = 'abc'
      expect(() => getEnv()).toThrow('Environment validation failed')
    })
  })

  // ─── clearEnvCache ────────────────────────────────────────────────────

  describe('clearEnvCache', () => {
    it('forces re-validation on next getEnv call', () => {
      const env1 = getEnv()
      clearEnvCache()

      // Modify env and get again
      process.env.PORT = '9999'
      const env2 = getEnv()
      expect(env2.PORT).toBe('9999')
      expect(env1).not.toBe(env2) // Different references
    })
  })

  // ─── getServerEnv ────────────────────────────────────────────────────

  describe('getServerEnv', () => {
    it('returns server-side environment variables', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key'
      const serverEnv = getServerEnv()
      expect(serverEnv.NODE_ENV).toBe('test')
      expect(serverEnv.AUTH_SECRET).toBe('a'.repeat(32))
      expect(serverEnv.OPENAI_API_KEY).toBe('sk-test-key')
    })

    it('does not include client-only variables', () => {
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = 'example.com'
      const serverEnv = getServerEnv()
      expect(serverEnv).not.toHaveProperty('NEXT_PUBLIC_APP_URL')
      expect(serverEnv).not.toHaveProperty('NEXT_PUBLIC_PLAUSIBLE_DOMAIN')
    })
  })

  // ─── getClientEnv ────────────────────────────────────────────────────

  describe('getClientEnv', () => {
    it('returns client-safe environment variables', () => {
      const clientEnv = getClientEnv()
      expect(clientEnv.NEXT_PUBLIC_APP_URL).toBe('https://example.com')
    })

    it('does not include server-only variables', () => {
      process.env.OPENAI_API_KEY = 'sk-secret'
      const clientEnv = getClientEnv()
      expect(clientEnv).not.toHaveProperty('AUTH_SECRET')
      expect(clientEnv).not.toHaveProperty('OPENAI_API_KEY')
    })
  })

  // ─── Cross-Validation Rules ──────────────────────────────────────────

  describe('cross-validation rules', () => {
    it('requires LOGGING_SHARED_SECRET when LOGGING_WEBHOOK_URL is set', () => {
      process.env.LOGGING_WEBHOOK_URL = 'https://log.example.com'
      // Missing LOGGING_SHARED_SECRET
      expect(() => getEnv()).toThrow('Environment validation failed')
    })

    it('passes when both LOGGING_WEBHOOK_URL and LOGGING_SHARED_SECRET are set', () => {
      process.env.LOGGING_WEBHOOK_URL = 'https://log.example.com'
      process.env.LOGGING_SHARED_SECRET = 'b'.repeat(32)
      expect(() => getEnv()).not.toThrow()
    })

    it('requires all R2 credentials when any is set', () => {
      process.env.R2_ACCOUNT_ID = 'account-123'
      // Missing R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY
      expect(() => getEnv()).toThrow('Environment validation failed')
    })

    it('passes when all R2 credentials are set together', () => {
      process.env.R2_ACCOUNT_ID = 'account-123'
      process.env.R2_ACCESS_KEY_ID = 'key-123'
      process.env.R2_SECRET_ACCESS_KEY = 'secret-123'
      expect(() => getEnv()).not.toThrow()
    })

    it('requires matching LOGGING_CLIENT_KEY pairs', () => {
      process.env.LOGGING_CLIENT_KEY = 'c'.repeat(32)
      // Missing NEXT_PUBLIC_LOGGING_CLIENT_KEY (one without the other)
      expect(() => getEnv()).toThrow('Environment validation failed')
    })

    it('passes when both LOGGING_CLIENT_KEY values match', () => {
      const key = 'd'.repeat(32)
      process.env.LOGGING_CLIENT_KEY = key
      process.env.NEXT_PUBLIC_LOGGING_CLIENT_KEY = key
      expect(() => getEnv()).not.toThrow()
    })

    it('fails when LOGGING_CLIENT_KEY values do not match', () => {
      process.env.LOGGING_CLIENT_KEY = 'e'.repeat(32)
      process.env.NEXT_PUBLIC_LOGGING_CLIENT_KEY = 'f'.repeat(32)
      expect(() => getEnv()).toThrow('Environment validation failed')
    })
  })

  // ─── Optional Fields ─────────────────────────────────────────────────

  describe('optional fields', () => {
    it('accepts optional AI keys', () => {
      process.env.ANTHROPIC_API_KEY = 'anthropic-key'
      process.env.OPENAI_API_KEY = 'openai-key'
      process.env.GOOGLE_API_KEY = 'google-key'
      process.env.XAI_API_KEY = 'xai-key'
      const env = getEnv()
      expect(env.ANTHROPIC_API_KEY).toBe('anthropic-key')
      expect(env.OPENAI_API_KEY).toBe('openai-key')
      expect(env.GOOGLE_API_KEY).toBe('google-key')
      expect(env.XAI_API_KEY).toBe('xai-key')
    })

    it('accepts optional Daydream keys', () => {
      process.env.DAYDREAM_API_KEY = 'daydream-key'
      process.env.DAYDREAM_API_GATEWAY = 'https://daydream.example.com'
      const env = getEnv()
      expect(env.DAYDREAM_API_KEY).toBe('daydream-key')
      expect(env.DAYDREAM_API_GATEWAY).toBe('https://daydream.example.com')
    })

    it('accepts optional Upstash keys', () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token-123'
      const env = getEnv()
      expect(env.UPSTASH_REDIS_REST_URL).toBe('https://redis.example.com')
      expect(env.UPSTASH_REDIS_REST_TOKEN).toBe('token-123')
    })

    it('trims whitespace from env values', () => {
      process.env.AUTH_SECRET = '  ' + 'a'.repeat(32) + '  '
      const env = getEnv()
      expect(env.AUTH_SECRET).toBe('a'.repeat(32))
    })

    it('treats empty strings as undefined', () => {
      process.env.OPENAI_API_KEY = ''
      const env = getEnv()
      expect(env.OPENAI_API_KEY).toBeUndefined()
    })
  })
})
