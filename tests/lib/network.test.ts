/**
 * Network Utilities Tests
 *
 * Tests client identification helpers: IP extraction from headers,
 * IPv4/IPv6 validation, forwarded header parsing, and fingerprint generation.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock NextRequest
function createMockRequest(headers: Record<string, string> = {}): {
  headers: { get: (name: string) => string | null }
} {
  const headerMap = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  )
  return {
    headers: {
      get: (name: string) => headerMap.get(name.toLowerCase()) ?? null,
    },
  }
}

// We need to use dynamic imports because the module reads env at load time
// and we need to test the exported functions
describe('network utilities', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('getTrustedClientIp', () => {
    it('extracts IP from x-vercel-ip header', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ 'x-vercel-ip': '1.2.3.4' })
      expect(getTrustedClientIp(req as any)).toBe('1.2.3.4')
    })

    it('extracts IP from cf-connecting-ip header', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ 'cf-connecting-ip': '5.6.7.8' })
      expect(getTrustedClientIp(req as any)).toBe('5.6.7.8')
    })

    it('extracts IP from x-real-ip header', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ 'x-real-ip': '10.0.0.1' })
      expect(getTrustedClientIp(req as any)).toBe('10.0.0.1')
    })

    it('extracts first IP from x-forwarded-for header', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' })
      expect(getTrustedClientIp(req as any)).toBe('192.168.1.1')
    })

    it('extracts IP from forwarded header', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ forwarded: 'for=198.51.100.17;proto=http' })
      expect(getTrustedClientIp(req as any)).toBe('198.51.100.17')
    })

    it('handles quoted forwarded header', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ forwarded: 'for="198.51.100.17"' })
      expect(getTrustedClientIp(req as any)).toBe('198.51.100.17')
    })

    it('returns null when no trusted headers present', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({})
      expect(getTrustedClientIp(req as any)).toBeNull()
    })

    it('returns null for invalid IP values', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ 'x-vercel-ip': 'not-an-ip' })
      expect(getTrustedClientIp(req as any)).toBeNull()
    })

    it('handles IPv6 addresses', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ 'x-vercel-ip': '2001:db8::1' })
      expect(getTrustedClientIp(req as any)).toBe('2001:db8::1')
    })

    it('strips port from IPv4:port format', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ 'x-real-ip': '192.168.1.1:8080' })
      expect(getTrustedClientIp(req as any)).toBe('192.168.1.1')
    })

    it('strips brackets and port from [IPv6]:port format', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ 'x-real-ip': '[2001:db8::1]:8080' })
      expect(getTrustedClientIp(req as any)).toBe('2001:db8::1')
    })

    it('strips zone id from IPv6 addresses', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ 'x-vercel-ip': 'fe80::1%eth0' })
      // After stripping zone and validating, should get fe80::1
      expect(getTrustedClientIp(req as any)).toBe('fe80::1')
    })

    it('prioritizes headers by order', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({
        'x-vercel-ip': '1.1.1.1',
        'cf-connecting-ip': '2.2.2.2',
        'x-real-ip': '3.3.3.3',
      })
      expect(getTrustedClientIp(req as any)).toBe('1.1.1.1')
    })

    it('falls through to next header if current is invalid', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({
        'x-vercel-ip': 'invalid',
        'cf-connecting-ip': '2.2.2.2',
      })
      expect(getTrustedClientIp(req as any)).toBe('2.2.2.2')
    })

    it('handles forwarded header with no "for" directive', async () => {
      const { getTrustedClientIp } = await import('@/lib/network')
      const req = createMockRequest({ forwarded: 'proto=https;host=example.com' })
      // Should not extract IP from forwarded header without "for" directive
      expect(getTrustedClientIp(req as any)).toBeNull()
    })
  })

  describe('resolveClientAddress', () => {
    it('returns IP and fingerprint for known IP', async () => {
      const { resolveClientAddress } = await import('@/lib/network')
      const req = createMockRequest({
        'x-vercel-ip': '1.2.3.4',
        'user-agent': 'TestAgent',
        'accept-language': 'en-US',
        'accept-encoding': 'gzip',
      })
      const result = resolveClientAddress(req as any)
      expect(result.ip).toBe('1.2.3.4')
      expect(result.fingerprint).toBeTruthy()
      expect(typeof result.fingerprint).toBe('string')
      // SHA-256 hash is 64 hex chars
      expect(result.fingerprint).toMatch(/^[0-9a-f]{64}$/)
    })

    it('returns "unknown" IP when no trusted header found', async () => {
      const { resolveClientAddress } = await import('@/lib/network')
      const req = createMockRequest({})
      const result = resolveClientAddress(req as any)
      expect(result.ip).toBe('unknown')
      expect(result.fingerprint).toBeTruthy()
    })

    it('produces deterministic fingerprints', async () => {
      const { resolveClientAddress } = await import('@/lib/network')
      const req1 = createMockRequest({
        'x-vercel-ip': '1.2.3.4',
        'user-agent': 'TestAgent',
        'accept-language': 'en-US',
        'accept-encoding': 'gzip',
      })
      const req2 = createMockRequest({
        'x-vercel-ip': '1.2.3.4',
        'user-agent': 'TestAgent',
        'accept-language': 'en-US',
        'accept-encoding': 'gzip',
      })
      expect(resolveClientAddress(req1 as any).fingerprint).toBe(
        resolveClientAddress(req2 as any).fingerprint
      )
    })

    it('produces different fingerprints for different user agents', async () => {
      const { resolveClientAddress } = await import('@/lib/network')
      const req1 = createMockRequest({
        'x-vercel-ip': '1.2.3.4',
        'user-agent': 'Agent1',
      })
      const req2 = createMockRequest({
        'x-vercel-ip': '1.2.3.4',
        'user-agent': 'Agent2',
      })
      expect(resolveClientAddress(req1 as any).fingerprint).not.toBe(
        resolveClientAddress(req2 as any).fingerprint
      )
    })

    it('handles missing optional headers with defaults', async () => {
      const { resolveClientAddress } = await import('@/lib/network')
      const req = createMockRequest({ 'x-vercel-ip': '1.2.3.4' })
      const result = resolveClientAddress(req as any)
      expect(result.ip).toBe('1.2.3.4')
      expect(result.fingerprint).toMatch(/^[0-9a-f]{64}$/)
    })
  })
})
