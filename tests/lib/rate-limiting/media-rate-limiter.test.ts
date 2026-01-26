/**
 * Media Rate Limiter Tests
 *
 * Validates client IP extraction and fallback fingerprinting.
 */

import { describe, it, expect } from 'vitest'
import { getClientIp } from '@/lib/rate-limiting/media-rate-limiter'
import type { NextRequest } from 'next/server'

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const headerMap = new Map(Object.entries(headers))
  return {
    headers: {
      get: (key: string) => headerMap.get(key) ?? null,
    },
  } as unknown as NextRequest
}

describe('getClientIp', () => {
  it('prefers x-vercel-ip when present', () => {
    const request = createMockRequest({
      'x-vercel-ip': '203.0.113.10',
      'x-forwarded-for': '10.0.0.1',
    })
    expect(getClientIp(request)).toBe('203.0.113.10')
  })

  it('uses cf-connecting-ip when present', () => {
    const request = createMockRequest({
      'cf-connecting-ip': '203.0.113.20',
    })
    expect(getClientIp(request)).toBe('203.0.113.20')
  })

  it('uses first x-forwarded-for entry when present', () => {
    const request = createMockRequest({
      'x-forwarded-for': '10.0.0.1, 10.0.0.2',
    })
    expect(getClientIp(request)).toBe('10.0.0.1')
  })

  it('falls back to x-real-ip when no forwarded header', () => {
    const request = createMockRequest({ 'x-real-ip': '198.51.100.4' })
    expect(getClientIp(request)).toBe('198.51.100.4')
  })

  it('returns a deterministic fingerprint when no IP headers present', () => {
    const headers = {
      'user-agent': 'TestUA',
      'accept-language': 'en-US',
      'accept-encoding': 'gzip',
    }
    const request1 = createMockRequest(headers)
    const request2 = createMockRequest(headers)

    const result1 = getClientIp(request1)
    const result2 = getClientIp(request2)

    expect(result1).toMatch(/^[a-f0-9]{64}$/)
    expect(result1).toBe(result2)
  })

  it('returns different fingerprints for different headers', () => {
    const request1 = createMockRequest({ 'user-agent': 'TestUA' })
    const request2 = createMockRequest({ 'user-agent': 'AnotherUA' })

    expect(getClientIp(request1)).not.toBe(getClientIp(request2))
  })
})
