/**
 * AI Validation Tests
 *
 * Tests Zod validation schemas for MetaDJai API requests including:
 * - Valid message payloads
 * - Empty message validation
 * - Message count limits (>50)
 * - Content length limits (>16000 chars)
 * - Spam detection (duplicate messages)
 * - Provider preference validation
 * - Personalization schema validation
 * - Strict validation (throws on failure)
 */

import { describe, expect, it } from 'vitest';
import {
  validateMetaDjAiRequest,
  validateMetaDjAiRequestStrict,
  metaDjAiRequestSchema,
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_MESSAGES_PER_REQUEST,
} from '@/lib/ai/validation';
import {
  SPAM_THRESHOLD_IDENTICAL_MESSAGES,
  SPAM_CHECK_WINDOW,
} from '@/lib/ai/limits';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    messages: [{ role: 'user', content: 'Hello MetaDJ' }],
    ...overrides,
  };
}

function buildMessages(count: number, content = 'Test message') {
  return Array.from({ length: count }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `${content} ${i}`,
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateMetaDjAiRequest', () => {
  describe('valid payloads', () => {
    it('accepts a minimal valid payload', () => {
      const result = validateMetaDjAiRequest(buildPayload());

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.messages).toHaveLength(1);
    });

    it('accepts payload with user and assistant messages', () => {
      const result = validateMetaDjAiRequest(
        buildPayload({
          messages: [
            { role: 'user', content: 'What music do you have?' },
            { role: 'assistant', content: 'I have many collections!' },
            { role: 'user', content: 'Tell me more.' },
          ],
        })
      );

      expect(result.valid).toBe(true);
      expect(result.data!.messages).toHaveLength(3);
    });

    it('accepts payload with optional context', () => {
      const result = validateMetaDjAiRequest(
        buildPayload({
          context: {
            nowPlayingTitle: 'Majestic Ascent',
            nowPlayingArtist: 'MetaDJ',
            mode: 'explorer',
          },
        })
      );

      expect(result.valid).toBe(true);
      expect(result.data!.context).toBeDefined();
    });

    it('accepts payload with model preference', () => {
      const result = validateMetaDjAiRequest(
        buildPayload({ modelPreference: 'anthropic' })
      );

      expect(result.valid).toBe(true);
      expect(result.data!.modelPreference).toBe('anthropic');
    });

    it('accepts payload with personalization', () => {
      const result = validateMetaDjAiRequest(
        buildPayload({
          personalization: {
            enabled: true,
            profileId: 'creative',
            profileLabel: 'Creative Mode',
            instructions: 'Be more creative and expressive',
          },
        })
      );

      expect(result.valid).toBe(true);
      expect(result.data!.personalization).toBeDefined();
    });

    it('accepts null context', () => {
      const result = validateMetaDjAiRequest(
        buildPayload({ context: null })
      );

      expect(result.valid).toBe(true);
    });

    it('accepts exactly MAX_MESSAGES_PER_REQUEST messages', () => {
      const messages = buildMessages(MAX_MESSAGES_PER_REQUEST);
      const result = validateMetaDjAiRequest(buildPayload({ messages }));

      expect(result.valid).toBe(true);
      expect(result.data!.messages).toHaveLength(MAX_MESSAGES_PER_REQUEST);
    });

    it('accepts content at exactly MAX_MESSAGE_CONTENT_LENGTH', () => {
      const content = 'x'.repeat(MAX_MESSAGE_CONTENT_LENGTH);
      const result = validateMetaDjAiRequest(
        buildPayload({
          messages: [{ role: 'user', content }],
        })
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('empty/missing messages', () => {
    it('rejects payload with no messages array', () => {
      const result = validateMetaDjAiRequest({});

      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toBeDefined();
    });

    it('rejects payload with empty messages array', () => {
      const result = validateMetaDjAiRequest(buildPayload({ messages: [] }));

      expect(result.valid).toBe(false);
      expect(result.error).toContain('At least one message is required');
    });

    it('rejects message with empty content', () => {
      const result = validateMetaDjAiRequest(
        buildPayload({
          messages: [{ role: 'user', content: '' }],
        })
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Message content cannot be empty');
    });
  });

  describe('message count limits', () => {
    it('rejects more than MAX_MESSAGES_PER_REQUEST messages', () => {
      const messages = buildMessages(MAX_MESSAGES_PER_REQUEST + 1);
      const result = validateMetaDjAiRequest(buildPayload({ messages }));

      expect(result.valid).toBe(false);
      expect(result.error).toContain(`Too many messages. Limit is ${MAX_MESSAGES_PER_REQUEST}`);
    });

    it('rejects significantly over-limit messages', () => {
      const messages = buildMessages(100);
      const result = validateMetaDjAiRequest(buildPayload({ messages }));

      expect(result.valid).toBe(false);
    });
  });

  describe('content length limits', () => {
    it('rejects message content exceeding MAX_MESSAGE_CONTENT_LENGTH', () => {
      const longContent = 'a'.repeat(MAX_MESSAGE_CONTENT_LENGTH + 1);
      const result = validateMetaDjAiRequest(
        buildPayload({
          messages: [{ role: 'user', content: longContent }],
        })
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${MAX_MESSAGE_CONTENT_LENGTH} characters`);
    });

    it('rejects when any message in array exceeds limit', () => {
      const result = validateMetaDjAiRequest(
        buildPayload({
          messages: [
            { role: 'user', content: 'Short message' },
            { role: 'assistant', content: 'Also short' },
            { role: 'user', content: 'x'.repeat(MAX_MESSAGE_CONTENT_LENGTH + 1) },
          ],
        })
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('spam detection', () => {
    it('allows a few duplicate messages', () => {
      // SPAM_THRESHOLD_IDENTICAL_MESSAGES - 1 should still pass
      const duplicateCount = SPAM_THRESHOLD_IDENTICAL_MESSAGES - 1;
      const messages = Array.from({ length: duplicateCount }, () => ({
        role: 'user' as const,
        content: 'Same message',
      }));

      const result = validateMetaDjAiRequest(buildPayload({ messages }));

      expect(result.valid).toBe(true);
    });

    it('detects spam when identical messages reach threshold', () => {
      // Create enough identical user messages to trigger spam detection
      const messages = Array.from({ length: SPAM_THRESHOLD_IDENTICAL_MESSAGES }, () => ({
        role: 'user' as const,
        content: 'Same message repeated',
      }));

      const result = validateMetaDjAiRequest(buildPayload({ messages }));

      expect(result.valid).toBe(false);
      expect(result.error).toContain('duplicate messages');
    });

    it('detects spam with mixed user and assistant messages', () => {
      const messages: { role: 'user' | 'assistant'; content: string }[] = [];

      // Interleave spam messages with assistant responses
      for (let i = 0; i < SPAM_THRESHOLD_IDENTICAL_MESSAGES; i++) {
        messages.push({ role: 'user', content: 'Spam message' });
        if (i < SPAM_THRESHOLD_IDENTICAL_MESSAGES - 1) {
          messages.push({ role: 'assistant', content: `Response ${i}` });
        }
      }

      const result = validateMetaDjAiRequest(buildPayload({ messages }));

      expect(result.valid).toBe(false);
      expect(result.error).toContain('duplicate messages');
    });

    it('does not flag different messages as spam', () => {
      const messages = Array.from({ length: SPAM_CHECK_WINDOW }, (_, i) => ({
        role: 'user' as const,
        content: `Unique message ${i}`,
      }));

      const result = validateMetaDjAiRequest(buildPayload({ messages }));

      expect(result.valid).toBe(true);
    });

    it('trims whitespace when checking for duplicates', () => {
      const messages = Array.from({ length: SPAM_THRESHOLD_IDENTICAL_MESSAGES }, () => ({
        role: 'user' as const,
        content: '  spam with spaces  ',
      }));

      const result = validateMetaDjAiRequest(buildPayload({ messages }));

      expect(result.valid).toBe(false);
      expect(result.error).toContain('duplicate messages');
    });
  });

  describe('role validation', () => {
    it('rejects messages with invalid role', () => {
      const result = validateMetaDjAiRequest(
        buildPayload({
          messages: [{ role: 'system', content: 'Injected system message' }],
        })
      );

      expect(result.valid).toBe(false);
    });

    it('rejects messages with missing role', () => {
      const result = validateMetaDjAiRequest(
        buildPayload({
          messages: [{ content: 'No role provided' }],
        })
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('provider preference validation', () => {
    it('accepts valid providers', () => {
      for (const provider of ['openai', 'anthropic', 'google', 'xai']) {
        const result = validateMetaDjAiRequest(
          buildPayload({ modelPreference: provider })
        );
        expect(result.valid).toBe(true);
      }
    });

    it('rejects invalid provider', () => {
      const result = validateMetaDjAiRequest(
        buildPayload({ modelPreference: 'invalid-provider' })
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('page context validation', () => {
    it('accepts valid page contexts', () => {
      for (const view of ['collections', 'wisdom', 'cinema', 'journal', 'search', 'queue']) {
        const result = validateMetaDjAiRequest(
          buildPayload({
            context: { pageContext: { view } },
          })
        );
        expect(result.valid).toBe(true);
      }
    });

    it('rejects invalid page context view', () => {
      const result = validateMetaDjAiRequest(
        buildPayload({
          context: { pageContext: { view: 'nonexistent-view' } },
        })
      );

      expect(result.valid).toBe(false);
    });
  });
});

describe('validateMetaDjAiRequestStrict', () => {
  it('returns data for valid payloads', () => {
    const data = validateMetaDjAiRequestStrict(buildPayload());

    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].role).toBe('user');
  });

  it('throws Error with statusCode for invalid payloads', () => {
    expect(() => validateMetaDjAiRequestStrict({})).toThrow();

    try {
      validateMetaDjAiRequestStrict({});
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error & { statusCode: number }).statusCode).toBe(400);
    }
  });

  it('throws for spam payloads', () => {
    const messages = Array.from({ length: SPAM_THRESHOLD_IDENTICAL_MESSAGES }, () => ({
      role: 'user' as const,
      content: 'Spam!',
    }));

    expect(() => validateMetaDjAiRequestStrict({ messages })).toThrow(
      'Please avoid sending duplicate messages'
    );
  });
});

describe('metaDjAiRequestSchema (raw Zod schema)', () => {
  it('parses a valid payload', () => {
    const result = metaDjAiRequestSchema.safeParse(buildPayload());

    expect(result.success).toBe(true);
  });

  it('fails on invalid input', () => {
    const result = metaDjAiRequestSchema.safeParse({ messages: 'not-an-array' });

    expect(result.success).toBe(false);
  });
});
