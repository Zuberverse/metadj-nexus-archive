/**
 * Origin Validation Tests
 *
 * Tests CSRF origin validation: dev origins, production hosts,
 * forwarded referer fallback, internal requests, safe methods,
 * and the withOriginValidation wrapper.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock app-url to avoid env dependency
vi.mock('@/lib/app-url', () => ({
  getAppBaseUrl: () => 'https://metadjnexus.ai',
  getPreviewBaseUrl: () => undefined,
}))

import {
  validateOrigin,
  buildOriginForbiddenResponse,
  withOriginValidation,
} from '@/lib/validation/origin-validation'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Request Factory
// ─────────────────────────────────────────────────────────────────────────────

function createMockNextRequest(opts: {
  method?: string
  origin?: string | null
  referer?: string | null
  host?: string
  internalSecret?: string | null
}): any {
  const headers = new Map<string, string>()
  if (opts.origin !== undefined && opts.origin !== null) {
    headers.set('origin', opts.origin)
  }
  if (opts.referer !== undefined && opts.referer !== null) {
    headers.set('referer', opts.referer)
  }
  if (opts.internalSecret !== undefined && opts.internalSecret !== null) {
    headers.set('x-internal-request', opts.internalSecret)
  }

  return {
    method: opts.method || 'GET',
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) ?? null,
    },
    nextUrl: {
      host: opts.host || 'metadjnexus.ai',
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// validateOrigin
// ─────────────────────────────────────────────────────────────────────────────

describe('validateOrigin', () => {
  beforeEach(() => {
    delete process.env.INTERNAL_API_SECRET
    delete process.env.REPLIT_DEV_DOMAIN
    delete process.env.REPLIT_DOMAINS
  })

  describe('safe methods (GET, HEAD, OPTIONS)', () => {
    it('allows GET without origin header', () => {
      const req = createMockNextRequest({ method: 'GET' })
      expect(validateOrigin(req).allowed).toBe(true)
    })

    it('allows HEAD without origin header', () => {
      const req = createMockNextRequest({ method: 'HEAD' })
      expect(validateOrigin(req).allowed).toBe(true)
    })

    it('allows OPTIONS without origin header', () => {
      const req = createMockNextRequest({ method: 'OPTIONS' })
      expect(validateOrigin(req).allowed).toBe(true)
    })
  })

  describe('dev origins', () => {
    it('allows localhost:3000', () => {
      const req = createMockNextRequest({ method: 'POST', origin: 'http://localhost:3000' })
      expect(validateOrigin(req).allowed).toBe(true)
    })

    it('allows localhost:8100', () => {
      const req = createMockNextRequest({ method: 'POST', origin: 'https://localhost:8100' })
      expect(validateOrigin(req).allowed).toBe(true)
    })

    it('allows 127.0.0.1:5000', () => {
      const req = createMockNextRequest({ method: 'POST', origin: 'http://127.0.0.1:5000' })
      expect(validateOrigin(req).allowed).toBe(true)
    })

    it('allows 0.0.0.0:3000', () => {
      const req = createMockNextRequest({ method: 'POST', origin: 'http://0.0.0.0:3000' })
      expect(validateOrigin(req).allowed).toBe(true)
    })
  })

  describe('production origin', () => {
    it('allows production domain', () => {
      const req = createMockNextRequest({
        method: 'POST',
        origin: 'https://metadjnexus.ai',
        host: 'metadjnexus.ai',
      })
      expect(validateOrigin(req).allowed).toBe(true)
    })

    it('rejects unknown origin', () => {
      const req = createMockNextRequest({
        method: 'POST',
        origin: 'https://evil.example.com',
      })
      expect(validateOrigin(req).allowed).toBe(false)
    })

    it('rejects "null" origin string', () => {
      const req = createMockNextRequest({
        method: 'POST',
        origin: 'null',
      })
      expect(validateOrigin(req).allowed).toBe(false)
    })
  })

  describe('unsafe methods without origin', () => {
    it('rejects POST without origin or referer', () => {
      const req = createMockNextRequest({ method: 'POST' })
      expect(validateOrigin(req).allowed).toBe(false)
    })

    it('allows POST with valid referer when no origin', () => {
      const req = createMockNextRequest({
        method: 'POST',
        referer: 'https://metadjnexus.ai/app',
        host: 'metadjnexus.ai',
      })
      expect(validateOrigin(req).allowed).toBe(true)
    })

    it('rejects POST with invalid referer when no origin', () => {
      const req = createMockNextRequest({
        method: 'POST',
        referer: 'https://evil.example.com/page',
      })
      expect(validateOrigin(req).allowed).toBe(false)
    })
  })

  describe('internal requests', () => {
    it('allows internal request with matching secret', () => {
      process.env.INTERNAL_API_SECRET = 'my-secret-123'
      const req = createMockNextRequest({
        method: 'POST',
        internalSecret: 'my-secret-123',
      })
      expect(validateOrigin(req).allowed).toBe(true)
    })

    it('rejects internal request with wrong secret', () => {
      process.env.INTERNAL_API_SECRET = 'my-secret-123'
      const req = createMockNextRequest({
        method: 'POST',
        internalSecret: 'wrong-secret',
      })
      // Falls through to normal validation - no origin, no referer, unsafe method
      expect(validateOrigin(req).allowed).toBe(false)
    })
  })

  describe('Replit domains', () => {
    it('allows Replit dev domain', () => {
      process.env.REPLIT_DEV_DOMAIN = 'my-repl.replit.dev'
      const req = createMockNextRequest({
        method: 'POST',
        origin: 'https://my-repl.replit.dev',
      })
      expect(validateOrigin(req).allowed).toBe(true)
    })

    it('allows Replit domains list', () => {
      process.env.REPLIT_DOMAINS = 'repl1.replit.dev, repl2.replit.dev'
      const req = createMockNextRequest({
        method: 'POST',
        origin: 'https://repl1.replit.dev',
      })
      expect(validateOrigin(req).allowed).toBe(true)
    })
  })

  describe('return value', () => {
    it('includes origin in return value', () => {
      const req = createMockNextRequest({
        method: 'POST',
        origin: 'http://localhost:3000',
      })
      const result = validateOrigin(req)
      expect(result.origin).toBe('http://localhost:3000')
    })

    it('returns null origin when no origin header', () => {
      const req = createMockNextRequest({ method: 'GET' })
      const result = validateOrigin(req)
      expect(result.origin).toBeNull()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// buildOriginForbiddenResponse
// ─────────────────────────────────────────────────────────────────────────────

describe('buildOriginForbiddenResponse', () => {
  it('returns a 403 response', () => {
    const response = buildOriginForbiddenResponse()
    expect(response.status).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// withOriginValidation
// ─────────────────────────────────────────────────────────────────────────────

describe('withOriginValidation', () => {
  it('calls handler when origin is valid', async () => {
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const wrapped = withOriginValidation(handler)
    const req = createMockNextRequest({
      method: 'POST',
      origin: 'http://localhost:3000',
    })
    const response = await wrapped(req, {})
    expect(handler).toHaveBeenCalledWith(req, {})
    expect(response.status).toBe(200)
  })

  it('returns 403 when origin is invalid', async () => {
    const handler = vi.fn()
    const wrapped = withOriginValidation(handler)
    const req = createMockNextRequest({
      method: 'POST',
      origin: 'https://evil.example.com',
    })
    const response = await wrapped(req, {})
    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })
})
