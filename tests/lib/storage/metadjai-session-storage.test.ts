/**
 * MetaDJai Session Storage Tests
 *
 * Tests the localStorage-backed session storage for MetaDJai messages
 * and rate limit window tracking.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { metadjAiSessionStorage } from '@/lib/storage/metadjai-session-storage'

describe('metadjAiSessionStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('messages', () => {
    const validMessage = {
      id: 'msg-1',
      role: 'user' as const,
      content: 'Hello MetaDJai',
      createdAt: Date.now(),
      status: 'complete' as const,
    }

    const validAssistantMessage = {
      id: 'msg-2',
      role: 'assistant' as const,
      content: 'Hello! How can I help?',
      createdAt: Date.now(),
      status: 'complete' as const,
    }

    it('returns empty array when no messages stored', () => {
      expect(metadjAiSessionStorage.loadMessages()).toEqual([])
    })

    it('saves and loads messages', () => {
      const messages = [validMessage, validAssistantMessage]
      metadjAiSessionStorage.saveMessages(messages)

      const loaded = metadjAiSessionStorage.loadMessages()
      expect(loaded).toHaveLength(2)
      expect(loaded[0].id).toBe('msg-1')
      expect(loaded[1].id).toBe('msg-2')
    })

    it('clears messages', () => {
      metadjAiSessionStorage.saveMessages([validMessage])
      metadjAiSessionStorage.clearMessages()

      expect(metadjAiSessionStorage.loadMessages()).toEqual([])
    })

    it('limits stored messages to 40', () => {
      const manyMessages = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        role: 'user' as const,
        content: `Message ${i}`,
        createdAt: Date.now() + i,
        status: 'complete' as const,
      }))

      metadjAiSessionStorage.saveMessages(manyMessages)
      const loaded = metadjAiSessionStorage.loadMessages()
      expect(loaded.length).toBeLessThanOrEqual(40)
    })

    it('returns empty array for invalid JSON in storage', () => {
      localStorage.setItem('metadj-nexus.metadjai.messages', 'not-json')
      expect(metadjAiSessionStorage.loadMessages()).toEqual([])
    })

    it('returns empty array for non-array JSON', () => {
      localStorage.setItem('metadj-nexus.metadjai.messages', '{"not": "array"}')
      expect(metadjAiSessionStorage.loadMessages()).toEqual([])
    })

    it('filters out invalid messages', () => {
      const raw = JSON.stringify([
        validMessage,
        { bad: 'data' },
        null,
        validAssistantMessage,
      ])
      localStorage.setItem('metadj-nexus.metadjai.messages', raw)

      const loaded = metadjAiSessionStorage.loadMessages()
      expect(loaded).toHaveLength(2)
    })

    it('filters messages missing required fields', () => {
      const raw = JSON.stringify([
        { id: 'msg-1', role: 'user' }, // missing content, createdAt
        { role: 'user', content: 'hi', createdAt: Date.now() }, // missing id
        { id: 'msg-2', content: 'hi', createdAt: Date.now() }, // missing role
      ])
      localStorage.setItem('metadj-nexus.metadjai.messages', raw)

      const loaded = metadjAiSessionStorage.loadMessages()
      expect(loaded).toHaveLength(0)
    })

    it('rejects messages with invalid role', () => {
      const raw = JSON.stringify([
        { id: 'msg-1', role: 'system', content: 'test', createdAt: Date.now() },
      ])
      localStorage.setItem('metadj-nexus.metadjai.messages', raw)

      const loaded = metadjAiSessionStorage.loadMessages()
      expect(loaded).toHaveLength(0)
    })

    it('preserves optional fields (kind, mode, sources, toolsUsed)', () => {
      const messageWithOptionals = {
        ...validAssistantMessage,
        kind: 'mode-switch' as const,
        mode: 'explorer' as const,
        sources: ['source1'],
        toolsUsed: ['tool1'],
        versions: [{ content: 'v1', createdAt: Date.now() }],
        currentVersionIndex: 0,
      }

      metadjAiSessionStorage.saveMessages([messageWithOptionals])
      const loaded = metadjAiSessionStorage.loadMessages()
      expect(loaded[0].kind).toBe('mode-switch')
      expect(loaded[0].mode).toBe('explorer')
    })

    it('normalizes kind to undefined for unknown values', () => {
      const raw = JSON.stringify([
        { id: 'msg-1', role: 'user', content: 'test', createdAt: Date.now(), kind: 'unknown' },
      ])
      localStorage.setItem('metadj-nexus.metadjai.messages', raw)

      const loaded = metadjAiSessionStorage.loadMessages()
      expect(loaded[0].kind).toBeUndefined()
    })
  })

  describe('rateLimitWindow', () => {
    it('returns null when no rate limit window stored', () => {
      expect(metadjAiSessionStorage.loadRateLimitWindow()).toBeNull()
    })

    it('saves and loads rate limit window', () => {
      const payload = { startedAt: Date.now(), count: 5 }
      metadjAiSessionStorage.saveRateLimitWindow(payload)

      const loaded = metadjAiSessionStorage.loadRateLimitWindow()
      expect(loaded).toEqual(payload)
    })

    it('clears rate limit window with null', () => {
      metadjAiSessionStorage.saveRateLimitWindow({ startedAt: Date.now(), count: 1 })
      metadjAiSessionStorage.saveRateLimitWindow(null)

      expect(metadjAiSessionStorage.loadRateLimitWindow()).toBeNull()
    })

    it('clears rate limit window with clearRateLimitWindow', () => {
      metadjAiSessionStorage.saveRateLimitWindow({ startedAt: Date.now(), count: 1 })
      metadjAiSessionStorage.clearRateLimitWindow()

      expect(metadjAiSessionStorage.loadRateLimitWindow()).toBeNull()
    })

    it('returns null for invalid JSON', () => {
      localStorage.setItem('metadj-nexus.metadjai.rateLimitWindow', 'bad-json')
      expect(metadjAiSessionStorage.loadRateLimitWindow()).toBeNull()
    })

    it('returns null for non-numeric startedAt', () => {
      localStorage.setItem(
        'metadj-nexus.metadjai.rateLimitWindow',
        JSON.stringify({ startedAt: 'not-a-number', count: 1 })
      )
      expect(metadjAiSessionStorage.loadRateLimitWindow()).toBeNull()
    })

    it('returns null for non-numeric count', () => {
      localStorage.setItem(
        'metadj-nexus.metadjai.rateLimitWindow',
        JSON.stringify({ startedAt: Date.now(), count: 'not-a-number' })
      )
      expect(metadjAiSessionStorage.loadRateLimitWindow()).toBeNull()
    })

    it('returns null for Infinity values', () => {
      localStorage.setItem(
        'metadj-nexus.metadjai.rateLimitWindow',
        JSON.stringify({ startedAt: Infinity, count: 1 })
      )
      // JSON.stringify(Infinity) = null, so this will fail parsing
      expect(metadjAiSessionStorage.loadRateLimitWindow()).toBeNull()
    })
  })
})
