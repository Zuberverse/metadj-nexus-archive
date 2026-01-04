/**
 * Client Identifier Tests
 *
 * Validates session cookie priority and fingerprint fallback.
 */

import { describe, it, expect } from 'vitest'
import {
  getClientIdentifier,
  generateSessionId,
  isFingerprint,
} from '@/lib/rate-limiting/client-identifier'
import type { NextRequest } from 'next/server'

function createMockRequest(
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {}
): NextRequest {
  const headerMap = new Map(Object.entries(headers))
  const cookieMap = new Map(Object.entries(cookies))

  return {
    headers: {
      get: (key: string) => headerMap.get(key) ?? null,
    },
    cookies: {
      get: (key: string) => {
        const value = cookieMap.get(key)
        return value ? { value } : undefined
      },
    },
  } as unknown as NextRequest
}

describe('getClientIdentifier', () => {
  it('uses session cookie when available', () => {
    const request = createMockRequest({}, { 'metadjai-session': 'session-123' })
    const result = getClientIdentifier(request, 'metadjai-session')

    expect(result).toEqual({ id: 'session-123', isFingerprint: false })
  })

  it('falls back to fingerprint when no cookie', () => {
    const request = createMockRequest({
      'user-agent': 'TestUA',
      'accept-language': 'en-US',
      'accept-encoding': 'gzip',
    })
    const result = getClientIdentifier(request, 'metadjai-session')

    expect(result.isFingerprint).toBe(true)
    expect(result.id).toMatch(/^fp-[a-f0-9]{32}$/)
  })

  it('generates consistent fingerprint for same headers', () => {
    const headers = {
      'user-agent': 'TestUA',
      'accept-language': 'en-US',
      'accept-encoding': 'gzip',
    }
    const request1 = createMockRequest(headers)
    const request2 = createMockRequest(headers)

    expect(getClientIdentifier(request1, 'metadjai-session').id).toBe(
      getClientIdentifier(request2, 'metadjai-session').id
    )
  })

  it('generates different fingerprints for different headers', () => {
    const request1 = createMockRequest({ 'user-agent': 'TestUA' })
    const request2 = createMockRequest({ 'user-agent': 'AnotherUA' })

    expect(getClientIdentifier(request1, 'metadjai-session').id).not.toBe(
      getClientIdentifier(request2, 'metadjai-session').id
    )
  })
})

describe('generateSessionId', () => {
  it('includes provided prefix', () => {
    const id = generateSessionId('session')
    expect(id.startsWith('session-')).toBe(true)
  })
})

describe('isFingerprint', () => {
  it('detects fingerprint identifiers', () => {
    expect(isFingerprint('fp-123')).toBe(true)
    expect(isFingerprint('session-123')).toBe(false)
  })
})
