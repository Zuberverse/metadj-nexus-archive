/**
 * Rate Limiter Core Tests
 *
 * Tests the unified rate limiting infrastructure in in-memory mode.
 * Upstash Redis is not configured in test environment, so all tests
 * exercise the in-memory fallback path.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  createRateLimiter,
  buildRateLimitHeaders,
  buildRateLimitError,
  isUpstashConfigured,
  isFailClosedEnabled,
} from '@/lib/rate-limiting/rate-limiter-core'

describe('createRateLimiter (in-memory)', () => {
  it('creates a rate limiter instance', () => {
    const limiter = createRateLimiter({
      prefix: 'test',
      maxRequests: 10,
      windowMs: 60000,
    })

    expect(limiter).toBeDefined()
    expect(typeof limiter.check).toBe('function')
    expect(typeof limiter.clear).toBe('function')
    expect(typeof limiter.clearAll).toBe('function')
    expect(typeof limiter.getMode).toBe('function')
  })

  it('reports in-memory mode when Upstash is not configured', () => {
    const limiter = createRateLimiter({
      prefix: 'test-mode',
      maxRequests: 10,
      windowMs: 60000,
    })

    expect(limiter.getMode()).toBe('in-memory')
  })

  it('allows requests within the limit', async () => {
    const limiter = createRateLimiter({
      prefix: 'test-allow',
      maxRequests: 5,
      windowMs: 60000,
    })

    const result = await limiter.check('client-1')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)

    limiter.clearAll()
  })

  it('tracks remaining requests accurately', async () => {
    const limiter = createRateLimiter({
      prefix: 'test-remaining',
      maxRequests: 3,
      windowMs: 60000,
    })

    const r1 = await limiter.check('client-1')
    expect(r1.remaining).toBe(2)

    const r2 = await limiter.check('client-1')
    expect(r2.remaining).toBe(1)

    const r3 = await limiter.check('client-1')
    expect(r3.remaining).toBe(0)

    limiter.clearAll()
  })

  it('blocks requests when limit is exceeded', async () => {
    const limiter = createRateLimiter({
      prefix: 'test-block',
      maxRequests: 2,
      windowMs: 60000,
    })

    await limiter.check('client-1')
    await limiter.check('client-1')

    const result = await limiter.check('client-1')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.remainingMs).toBeGreaterThan(0)

    limiter.clearAll()
  })

  it('tracks different identifiers separately', async () => {
    const limiter = createRateLimiter({
      prefix: 'test-separate',
      maxRequests: 1,
      windowMs: 60000,
    })

    const r1 = await limiter.check('client-a')
    expect(r1.allowed).toBe(true)

    const r2 = await limiter.check('client-b')
    expect(r2.allowed).toBe(true)

    // client-a is now over limit
    const r3 = await limiter.check('client-a')
    expect(r3.allowed).toBe(false)

    // client-b is also over limit
    const r4 = await limiter.check('client-b')
    expect(r4.allowed).toBe(false)

    limiter.clearAll()
  })

  it('clears a specific identifier', async () => {
    const limiter = createRateLimiter({
      prefix: 'test-clear',
      maxRequests: 1,
      windowMs: 60000,
    })

    await limiter.check('client-1')
    const blocked = await limiter.check('client-1')
    expect(blocked.allowed).toBe(false)

    limiter.clear('client-1')
    const afterClear = await limiter.check('client-1')
    expect(afterClear.allowed).toBe(true)

    limiter.clearAll()
  })

  it('clearAll resets all identifiers', async () => {
    const limiter = createRateLimiter({
      prefix: 'test-clearall',
      maxRequests: 1,
      windowMs: 60000,
    })

    await limiter.check('client-a')
    await limiter.check('client-b')

    limiter.clearAll()

    const rA = await limiter.check('client-a')
    const rB = await limiter.check('client-b')
    expect(rA.allowed).toBe(true)
    expect(rB.allowed).toBe(true)

    limiter.clearAll()
  })

  describe('burst prevention', () => {
    it('blocks rapid requests when burstIntervalMs is set', async () => {
      const limiter = createRateLimiter({
        prefix: 'test-burst',
        maxRequests: 100,
        windowMs: 60000,
        burstIntervalMs: 5000,
      })

      // First request allowed
      const r1 = await limiter.check('client-1')
      expect(r1.allowed).toBe(true)

      // Second request too fast (within 5s interval)
      const r2 = await limiter.check('client-1')
      expect(r2.allowed).toBe(false)
      expect(r2.remainingMs).toBeGreaterThan(0)

      limiter.clearAll()
    })

    it('allows requests when skipBurst is true', async () => {
      const limiter = createRateLimiter({
        prefix: 'test-skipburst',
        maxRequests: 100,
        windowMs: 60000,
        burstIntervalMs: 5000,
      })

      await limiter.check('client-1')

      // skipBurst=true should bypass burst check
      const r2 = await limiter.check('client-1', true)
      expect(r2.allowed).toBe(true)

      limiter.clearAll()
    })
  })
})

describe('isUpstashConfigured', () => {
  it('is a boolean', () => {
    expect(typeof isUpstashConfigured).toBe('boolean')
  })
})

describe('isFailClosedEnabled', () => {
  it('is a boolean', () => {
    expect(typeof isFailClosedEnabled).toBe('boolean')
  })
})

describe('buildRateLimitHeaders', () => {
  it('includes limit header', () => {
    const headers = buildRateLimitHeaders({ allowed: true, remaining: 5 }, 10)
    expect(headers['X-RateLimit-Limit']).toBe('10')
  })

  it('includes remaining header when available', () => {
    const headers = buildRateLimitHeaders({ allowed: true, remaining: 5 }, 10)
    expect(headers['X-RateLimit-Remaining']).toBe('5')
  })

  it('omits remaining header when not provided', () => {
    const headers = buildRateLimitHeaders({ allowed: true }, 10)
    expect(headers['X-RateLimit-Remaining']).toBeUndefined()
  })

  it('includes Retry-After header when rate limited', () => {
    const headers = buildRateLimitHeaders(
      { allowed: false, remainingMs: 5000, remaining: 0 },
      10
    )
    expect(headers['Retry-After']).toBe('5')
  })

  it('omits Retry-After when allowed', () => {
    const headers = buildRateLimitHeaders(
      { allowed: true, remaining: 5 },
      10
    )
    expect(headers['Retry-After']).toBeUndefined()
  })
})

describe('buildRateLimitError', () => {
  it('returns error object with retry info', () => {
    const error = buildRateLimitError(5000)
    expect(error.error).toBe('Rate limit exceeded. Please wait before sending another request.')
    expect(error.retryAfter).toBe(5)
  })

  it('accepts custom message', () => {
    const error = buildRateLimitError(3000, 'Too many requests')
    expect(error.error).toBe('Too many requests')
    expect(error.retryAfter).toBe(3)
  })

  it('rounds up retry-after seconds', () => {
    const error = buildRateLimitError(1500)
    expect(error.retryAfter).toBe(2) // ceil(1500/1000) = 2
  })
})
