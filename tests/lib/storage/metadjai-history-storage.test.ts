/**
 * MetaDJai History Storage Tests
 *
 * Tests the localStorage-backed chat session history storage.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { metadjAiHistoryStorage, type MetaDjAiChatSession } from '@/lib/storage/metadjai-history-storage'

const makeMessage = (overrides: Partial<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: number }> = {}) => ({
  id: overrides.id ?? `msg-${Math.random().toString(36).slice(2)}`,
  role: overrides.role ?? 'user' as const,
  content: overrides.content ?? 'Test message',
  createdAt: overrides.createdAt ?? Date.now(),
  status: 'complete' as const,
})

describe('metadjAiHistoryStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('sessions', () => {
    it('returns empty array when no sessions stored', () => {
      expect(metadjAiHistoryStorage.loadSessions()).toEqual([])
    })

    it('saves and loads sessions', () => {
      const session: MetaDjAiChatSession = {
        id: 'session-1',
        title: 'Test Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [makeMessage()],
      }

      metadjAiHistoryStorage.saveSessions([session])
      const loaded = metadjAiHistoryStorage.loadSessions()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe('session-1')
      expect(loaded[0].title).toBe('Test Chat')
    })

    it('sorts sessions by updatedAt descending', () => {
      const now = Date.now()
      const sessions: MetaDjAiChatSession[] = [
        { id: 'old', title: 'Old', createdAt: now - 1000, updatedAt: now - 1000, messages: [] },
        { id: 'new', title: 'New', createdAt: now, updatedAt: now, messages: [] },
      ]

      metadjAiHistoryStorage.saveSessions(sessions)
      const loaded = metadjAiHistoryStorage.loadSessions()
      expect(loaded[0].id).toBe('new')
      expect(loaded[1].id).toBe('old')
    })

    it('filters invalid sessions', () => {
      const raw = JSON.stringify([
        { id: 'valid', title: 'Test', createdAt: Date.now(), updatedAt: Date.now(), messages: [] },
        { bad: 'data' },
        null,
        { id: 123, title: 'Bad ID', createdAt: Date.now(), updatedAt: Date.now(), messages: [] },
      ])
      localStorage.setItem('metadj-nexus.metadjai.sessions', raw)

      const loaded = metadjAiHistoryStorage.loadSessions()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe('valid')
    })

    it('returns empty for invalid JSON', () => {
      localStorage.setItem('metadj-nexus.metadjai.sessions', 'not-json')
      expect(metadjAiHistoryStorage.loadSessions()).toEqual([])
    })

    it('returns empty for non-array JSON', () => {
      localStorage.setItem('metadj-nexus.metadjai.sessions', '{"obj": true}')
      expect(metadjAiHistoryStorage.loadSessions()).toEqual([])
    })

    it('truncates messages per session to 80', () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => makeMessage({ id: `m-${i}` }))
      const session: MetaDjAiChatSession = {
        id: 'session-1',
        title: 'Big Session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: manyMessages,
      }

      metadjAiHistoryStorage.saveSessions([session])
      const raw = JSON.parse(localStorage.getItem('metadj-nexus.metadjai.sessions') || '[]')
      expect(raw[0].messages.length).toBeLessThanOrEqual(80)
    })

    it('clears sessions', () => {
      const session: MetaDjAiChatSession = {
        id: 'session-1',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      }
      metadjAiHistoryStorage.saveSessions([session])
      metadjAiHistoryStorage.clearSessions()

      expect(metadjAiHistoryStorage.loadSessions()).toEqual([])
    })
  })

  describe('activeSessionId', () => {
    it('returns null when no active session', () => {
      expect(metadjAiHistoryStorage.loadActiveSessionId()).toBeNull()
    })

    it('saves and loads active session ID', () => {
      metadjAiHistoryStorage.saveActiveSessionId('session-42')
      expect(metadjAiHistoryStorage.loadActiveSessionId()).toBe('session-42')
    })

    it('clears active session ID', () => {
      metadjAiHistoryStorage.saveActiveSessionId('session-42')
      metadjAiHistoryStorage.clearActiveSessionId()
      expect(metadjAiHistoryStorage.loadActiveSessionId()).toBeNull()
    })
  })

  describe('clearAll', () => {
    it('clears both sessions and active session ID', () => {
      metadjAiHistoryStorage.saveSessions([{
        id: 'session-1',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      }])
      metadjAiHistoryStorage.saveActiveSessionId('session-1')

      metadjAiHistoryStorage.clearAll()

      expect(metadjAiHistoryStorage.loadSessions()).toEqual([])
      expect(metadjAiHistoryStorage.loadActiveSessionId()).toBeNull()
    })
  })

  describe('createSession', () => {
    it('creates a session with a generated ID', () => {
      const session = metadjAiHistoryStorage.createSession()
      expect(session.id).toBeTruthy()
      expect(typeof session.id).toBe('string')
    })

    it('creates session with default title for empty messages', () => {
      const session = metadjAiHistoryStorage.createSession()
      expect(session.title).toBe('New chat')
    })

    it('derives title from first user message', () => {
      const messages = [makeMessage({ content: 'What is MetaDJ?' })]
      const session = metadjAiHistoryStorage.createSession(messages)
      expect(session.title).toBe('What is MetaDJ?')
    })

    it('truncates long titles to 60 chars', () => {
      const longContent = 'A'.repeat(100)
      const messages = [makeMessage({ content: longContent })]
      const session = metadjAiHistoryStorage.createSession(messages)
      expect(session.title.length).toBeLessThanOrEqual(60)
    })

    it('sets createdAt and updatedAt', () => {
      const before = Date.now()
      const session = metadjAiHistoryStorage.createSession()
      const after = Date.now()

      expect(session.createdAt).toBeGreaterThanOrEqual(before)
      expect(session.createdAt).toBeLessThanOrEqual(after)
      expect(session.updatedAt).toBe(session.createdAt)
    })

    it('includes seed messages', () => {
      const messages = [makeMessage(), makeMessage({ role: 'assistant', content: 'Response' })]
      const session = metadjAiHistoryStorage.createSession(messages)
      expect(session.messages).toHaveLength(2)
    })
  })

  describe('deriveTitle', () => {
    it('returns "New chat" for empty messages', () => {
      expect(metadjAiHistoryStorage.deriveTitle([])).toBe('New chat')
    })

    it('uses first user message content', () => {
      const messages = [
        makeMessage({ role: 'assistant', content: 'Hello!' }),
        makeMessage({ role: 'user', content: 'Tell me about music' }),
      ]
      expect(metadjAiHistoryStorage.deriveTitle(messages)).toBe('Tell me about music')
    })

    it('skips empty user messages', () => {
      const messages = [
        makeMessage({ role: 'user', content: '   ' }),
        makeMessage({ role: 'user', content: 'Real question' }),
      ]
      expect(metadjAiHistoryStorage.deriveTitle(messages)).toBe('Real question')
    })
  })
})
