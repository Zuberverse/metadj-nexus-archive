/**
 * Wisdom rate limiter tests
 */

import { describe, expect, it } from 'vitest'
import {
  checkWisdomRateLimit,
  getWisdomClientId,
  WISDOM_MAX_REQUESTS_PER_WINDOW,
} from '@/lib/rate-limiting/wisdom-rate-limiter'
import type { NextRequest } from 'next/server'

const makeRequest = (headers: Record<string, string>): NextRequest => {
  return {
    headers: new Headers(headers),
  } as unknown as NextRequest
}

describe('getWisdomClientId', () => {
  it('uses forwarded ip when available', () => {
    const request = makeRequest({ 'x-forwarded-for': '1.2.3.4' })
    expect(getWisdomClientId(request)).toBe('wisdom-1.2.3.4')
  })

  it('uses real ip when forwarded ip is missing', () => {
    const request = makeRequest({ 'x-real-ip': '8.8.8.8' })
    expect(getWisdomClientId(request)).toBe('wisdom-8.8.8.8')
  })

  it('falls back to user-agent fingerprint', () => {
    const request = makeRequest({
      'user-agent': 'TestAgent',
      'accept-language': 'en-US',
    })
    expect(getWisdomClientId(request)).toMatch(/^wisdom-[a-f0-9]{16}$/)
  })
})

describe('checkWisdomRateLimit (in-memory)', () => {
  it('allows requests within the window and blocks after limit', async () => {
    const request = makeRequest({ 'x-forwarded-for': '9.9.9.9' })

    for (let i = 0; i < WISDOM_MAX_REQUESTS_PER_WINDOW; i += 1) {
      const result = await checkWisdomRateLimit(request)
      expect(result.allowed).toBe(true)
    }

    const blocked = await checkWisdomRateLimit(request)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remainingMs).toBeGreaterThan(0)
  })
})
