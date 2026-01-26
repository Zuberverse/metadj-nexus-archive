/**
 * useMetaDjAi Hook Tests
 *
 * Tests for the MetaDJai chat functionality including:
 * - Message state management
 * - Rate limit enforcement
 * - Stream processing
 * - Error mapping
 * - Session persistence
 *
 * These tests verify the core AI chat feature works correctly.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useMetaDjAi } from '@/hooks/metadjai/use-metadjai';
import { useMetaDjAiMessages, createMessageId } from '@/hooks/metadjai/use-metadjai-messages';
import { useMetaDjAiRateLimit, RATE_LIMIT_WINDOW_MS, MAX_MESSAGES_PER_WINDOW } from '@/hooks/metadjai/use-metadjai-rate-limit';
import { processVercelAIBuffer, handleVercelAIChunk } from '@/hooks/metadjai/use-metadjai-stream';
import { mapErrorToUserMessage } from '@/lib/ai';
import type { MetaDjAiMessage } from '@/types/metadjai.types';

// Mock auth context for hooks that depend on it
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false }),
}));

// Mock localStorage (used by rate limit)
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock metadjAiSessionStorage
vi.mock('@/lib/storage/metadjai-session-storage', () => ({
  metadjAiSessionStorage: {
    loadMessages: vi.fn(() => []),
    saveMessages: vi.fn(),
    clearMessages: vi.fn(),
    loadRateLimitWindow: vi.fn(() => null),
    saveRateLimitWindow: vi.fn(),
    clearRateLimitWindow: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useMetaDjAiMessages Hook', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  describe('createMessageId', () => {
    it('creates unique message IDs', () => {
      const id1 = createMessageId();
      const id2 = createMessageId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('creates valid UUID-like or timestamp-based IDs', () => {
      const id = createMessageId();

      // Should be either a UUID or timestamp-based ID
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('Message State Management', () => {
    it('initializes with empty messages array', () => {
      const { result } = renderHook(() => useMetaDjAiMessages());

      expect(result.current.messages).toEqual([]);
    });

    it('setMessages updates message array', () => {
      const { result } = renderHook(() => useMetaDjAiMessages());

      const testMessage = {
        id: 'test-1',
        role: 'user' as const,
        content: 'Test message',
        createdAt: Date.now(),
        status: 'complete' as const,
      };

      act(() => {
        result.current.setMessages([testMessage]);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Test message');
    });

    it('updateMessages applies updater function', () => {
      const { result } = renderHook(() => useMetaDjAiMessages());

      const initialMessage = {
        id: 'test-1',
        role: 'user' as const,
        content: 'Initial',
        createdAt: Date.now(),
        status: 'complete' as const,
      };

      act(() => {
        result.current.setMessages([initialMessage]);
      });

      act(() => {
        result.current.updateMessages((prev: MetaDjAiMessage[]) =>
          prev.map((m: MetaDjAiMessage) => (m.id === 'test-1' ? { ...m, content: 'Updated' } : m))
        );
      });

      expect(result.current.messages[0].content).toBe('Updated');
    });

    it('clearMessages empties the message array', () => {
      const { result } = renderHook(() => useMetaDjAiMessages());

      const testMessage = {
        id: 'test-1',
        role: 'user' as const,
        content: 'Test message',
        createdAt: Date.now(),
        status: 'complete' as const,
      };

      act(() => {
        result.current.setMessages([testMessage]);
      });

      expect(result.current.messages).toHaveLength(1);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(0);
    });

    it('messagesRef stays in sync with messages state', () => {
      const { result } = renderHook(() => useMetaDjAiMessages());

      const testMessage = {
        id: 'test-1',
        role: 'user' as const,
        content: 'Test message',
        createdAt: Date.now(),
        status: 'complete' as const,
      };

      act(() => {
        result.current.setMessages([testMessage]);
      });

      expect(result.current.messagesRef.current).toHaveLength(1);
      expect(result.current.messagesRef.current[0].content).toBe('Test message');
    });
  });
});

describe('useMetaDjAiRateLimit Hook', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('initializes with no rate limit', () => {
      const { result } = renderHook(() => useMetaDjAiRateLimit());

      expect(result.current.canSend).toBe(true);
      expect(result.current.rateLimit.isLimited).toBe(false);
      expect(result.current.rateLimit.windowCount).toBe(0);
    });

    it('has correct configuration values', () => {
      expect(RATE_LIMIT_WINDOW_MS).toBe(5 * 60 * 1000); // 5 minutes
      expect(MAX_MESSAGES_PER_WINDOW).toBe(20);
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('recordSend increments window count', () => {
      const { result } = renderHook(() => useMetaDjAiRateLimit());

      act(() => {
        result.current.recordSend();
      });

      expect(result.current.rateLimit.windowCount).toBe(1);
    });

    it('allows sending when under limit', () => {
      const { result } = renderHook(() => useMetaDjAiRateLimit());

      // Send 10 messages (under the 20 limit)
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.recordSend();
        });
      }

      expect(result.current.canSend).toBe(true);
      expect(result.current.rateLimit.windowCount).toBe(10);
    });

    it('blocks sending when limit is reached', () => {
      const { result } = renderHook(() => useMetaDjAiRateLimit());

      // Send max messages
      for (let i = 0; i < MAX_MESSAGES_PER_WINDOW; i++) {
        act(() => {
          result.current.recordSend();
        });
      }

      expect(result.current.canSend).toBe(false);
      expect(result.current.rateLimit.isLimited).toBe(true);
      expect(result.current.rateLimit.windowCount).toBe(MAX_MESSAGES_PER_WINDOW);
    });

    it('provides remaining time when rate limited', () => {
      const { result } = renderHook(() => useMetaDjAiRateLimit());

      // Hit the limit
      for (let i = 0; i < MAX_MESSAGES_PER_WINDOW; i++) {
        act(() => {
          result.current.recordSend();
        });
      }

      expect(result.current.rateLimit.remainingMs).toBeGreaterThan(0);
      expect(result.current.rateLimit.nextAvailableAt).toBeDefined();
    });
  });

  describe('Window Expiration', () => {
    it('calculates remaining time correctly when rate limited', () => {
      const { result } = renderHook(() => useMetaDjAiRateLimit());

      // Hit the limit
      for (let i = 0; i < MAX_MESSAGES_PER_WINDOW; i++) {
        act(() => {
          result.current.recordSend();
        });
      }

      expect(result.current.canSend).toBe(false);
      expect(result.current.rateLimit.remainingMs).toBeLessThanOrEqual(RATE_LIMIT_WINDOW_MS);
      expect(result.current.rateLimit.remainingMs).toBeGreaterThan(0);

      // Verify nextAvailableAt is set correctly
      expect(result.current.rateLimit.nextAvailableAt).toBeDefined();
      expect(result.current.rateLimit.nextAvailableAt).toBeGreaterThan(Date.now());
    });
  });
});

describe('Stream Processing', () => {
  describe('processVercelAIBuffer', () => {
    it('processes text chunks correctly', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();

      const buffer = '0:"Hello"\n0:" World"\n';
      const remaining = processVercelAIBuffer(buffer, onDelta, onStatus);

      expect(onDelta).toHaveBeenCalledWith('Hello');
      expect(onDelta).toHaveBeenCalledWith(' World');
      expect(remaining).toBe('');
    });

    it('handles incomplete chunks correctly', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();

      const buffer = '0:"Hello"\n0:"Incomplete';
      const remaining = processVercelAIBuffer(buffer, onDelta, onStatus);

      expect(onDelta).toHaveBeenCalledTimes(1);
      expect(onDelta).toHaveBeenCalledWith('Hello');
      expect(remaining).toBe('0:"Incomplete');
    });

    it('flushes remaining content when flush is true', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();

      const buffer = '0:"Final chunk"';
      const remaining = processVercelAIBuffer(buffer, onDelta, onStatus, undefined, true);

      expect(onDelta).toHaveBeenCalledWith('Final chunk');
      expect(remaining).toBe('');
    });

    it('handles empty buffer', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();

      const remaining = processVercelAIBuffer('', onDelta, onStatus);

      expect(onDelta).not.toHaveBeenCalled();
      expect(remaining).toBe('');
    });
  });

  describe('handleVercelAIChunk', () => {
    it('processes text delta chunks (0: prefix)', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();

      handleVercelAIChunk('0:"Hello"', onDelta, onStatus);

      expect(onDelta).toHaveBeenCalledWith('Hello');
    });

    it('handles error chunks (e: prefix)', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();
      const onError = vi.fn();

      handleVercelAIChunk('e:"Error message"', onDelta, onStatus, onError);

      expect(onStatus).toHaveBeenCalledWith('error');
    });

    it('ignores tool call chunks (9: prefix)', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();

      handleVercelAIChunk('9:{"tool":"test"}', onDelta, onStatus);

      expect(onDelta).not.toHaveBeenCalled();
      expect(onStatus).not.toHaveBeenCalled();
    });

    it('handles SSE tool-result events', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();
      const onToolResult = vi.fn();

      handleVercelAIChunk(
        'data: {"type":"tool-result","toolName":"proposePlayback","result":{"type":"playback","action":"play"}}',
        onDelta,
        onStatus,
        undefined,
        undefined,
        onToolResult
      );

      expect(onToolResult).toHaveBeenCalledWith('proposePlayback', { type: 'playback', action: 'play' });
    });

    it('handles tool results in data stream (9: prefix)', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();
      const onToolResult = vi.fn();

      handleVercelAIChunk(
        '9:{"toolName":"proposeSurface","result":{"type":"ui","action":"openWisdom"}}',
        onDelta,
        onStatus,
        undefined,
        undefined,
        onToolResult
      );

      expect(onToolResult).toHaveBeenCalledWith('proposeSurface', { type: 'ui', action: 'openWisdom' });
    });

    it('ignores data chunks (d: prefix)', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();

      handleVercelAIChunk('d:{"data":"test"}', onDelta, onStatus);

      expect(onDelta).not.toHaveBeenCalled();
      expect(onStatus).not.toHaveBeenCalled();
    });

    it('handles plain text (no prefix) as content', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();

      handleVercelAIChunk('Plain text content', onDelta, onStatus);

      expect(onDelta).toHaveBeenCalledWith('Plain text content');
    });

    it('handles fallback text-delta format', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();

      handleVercelAIChunk('0:{"type":"text-delta","textDelta":"Fallback format"}', onDelta, onStatus);

      expect(onDelta).toHaveBeenCalledWith('Fallback format');
    });

    it('handles finish events', () => {
      const onDelta = vi.fn();
      const onStatus = vi.fn();

      handleVercelAIChunk('0:{"type":"finish"}', onDelta, onStatus);

      expect(onStatus).toHaveBeenCalledWith('complete');
    });
  });
});

describe('Error Mapping', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('mapErrorToUserMessage', () => {
    it('maps network errors to user-friendly messages', () => {
      const message = mapErrorToUserMessage('Failed to fetch');
      expect(message).toContain("Can't reach MetaDJai");
    });

    it('maps timeout errors', () => {
      const message = mapErrorToUserMessage('Request timed out');
      expect(message).toContain('took too long');
    });

    it('maps rate limit errors', () => {
      const message = mapErrorToUserMessage('Too many requests');
      expect(message).toContain('quick break');
    });

    it('maps OpenAI/provider errors', () => {
      const message = mapErrorToUserMessage('OpenAI API error');
      expect(message).toContain('provider issue');
    });

    it('maps Anthropic/Claude errors', () => {
      // Use error message that doesn't contain "rate limit" to avoid matching rate limit pattern
      const message = mapErrorToUserMessage('Claude API overloaded');
      expect(message).toContain('provider issue');
    });

    it('maps streaming/connection errors', () => {
      const message = mapErrorToUserMessage('Stream interrupted');
      expect(message).toContain('Connection interrupted');
    });

    it('maps authentication errors', () => {
      const message = mapErrorToUserMessage('401 Unauthorized');
      expect(message).toContain('Session expired');
    });

    it('maps server errors (5xx)', () => {
      const message = mapErrorToUserMessage('500 Internal Server Error');
      expect(message).toContain('Server hiccup');
    });

    it('maps validation/bad request errors', () => {
      const message = mapErrorToUserMessage('400 Bad Request');
      expect(message).toContain("didn't quite work");
    });

    it('handles Error objects', () => {
      const error = new Error('Network error');
      const message = mapErrorToUserMessage(error);
      expect(message).toContain("Can't reach MetaDJai");
    });

    it('handles unknown error types', () => {
      const message = mapErrorToUserMessage({ someRandomObject: true });
      expect(message).toContain('unexpected');
    });

    it('provides fallback for unrecognized errors', () => {
      const message = mapErrorToUserMessage('Some completely random error xyz');
      expect(message).toBeDefined();
      expect(typeof message).toBe('string');
    });
  });
});

describe('useMetaDjAi Hook Integration', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockReset();
  });

  describe('Initial State', () => {
    it('initializes with empty messages', () => {
      const { result } = renderHook(() => useMetaDjAi());

      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.error).toBeNull();
    });

	    it('provides all expected functions', () => {
	      const { result } = renderHook(() => useMetaDjAi());
	
	      expect(result.current.sendMessage).toBeDefined();
	      expect(result.current.resetConversation).toBeDefined();
	      expect(result.current.stopStreaming).toBeDefined();
	      expect(result.current.rateLimit).toBeDefined();
	    });
	  });

  describe('sendMessage', () => {
    it('ignores empty messages', async () => {
      const { result } = renderHook(() => useMetaDjAi());

      await act(async () => {
        await result.current.sendMessage('   ');
      });

      expect(result.current.messages).toHaveLength(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('ignores messages while streaming', async () => {
      // Mock a slow stream
      vi.mocked(global.fetch).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  body: {
                    getReader: () => ({
                      read: () =>
                        new Promise((r) =>
                          setTimeout(() => r({ done: true, value: undefined }), 1000)
                        ),
                    }),
                  },
                } as Response),
              100
            )
          )
      );

      const { result } = renderHook(() => useMetaDjAi());

      // Start sending a message (don't await)
      act(() => {
        result.current.sendMessage('First message');
      });

      // Try to send another while first is in progress
      await act(async () => {
        await result.current.sendMessage('Second message');
      });

      // Should only have made one fetch call
      expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetConversation', () => {
    it('clears all messages and resets error state', async () => {
      const { result } = renderHook(() => useMetaDjAi());

      // Manually set some state
      act(() => {
        result.current.resetConversation();
      });

      expect(result.current.messages).toHaveLength(0);
      expect(result.current.error).toBeNull();
      expect(result.current.isStreaming).toBe(false);
    });
  });

  describe('Rate Limit Integration', () => {
    it('provides rate limit state', () => {
      const { result } = renderHook(() => useMetaDjAi());

      expect(result.current.rateLimit).toBeDefined();
      expect(result.current.rateLimit.isLimited).toBe(false);
      expect(result.current.rateLimit.windowCount).toBeDefined();
      expect(result.current.rateLimit.windowMax).toBe(MAX_MESSAGES_PER_WINDOW);
    });
  });

  describe('Context Support', () => {
    it('accepts optional context parameter', () => {
      const context = {
        nowPlayingTitle: 'Test Track',
        nowPlayingArtist: 'Test Artist',
        selectedCollectionTitle: 'Test Collection',
        cinemaActive: false,
        wisdomActive: false,
      };

      const { result } = renderHook(() => useMetaDjAi({ context }));

      expect(result.current.sendMessage).toBeDefined();
    });
  });
});
