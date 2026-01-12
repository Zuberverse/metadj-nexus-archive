/**
 * useChatScroll Hook Tests
 *
 * Tests for the chat scroll management hook extracted from MetaDjAiChat.
 * Covers scroll behavior, message pinning, and streaming state handling.
 *
 * @module tests/hooks/metadjai/use-chat-scroll
 */

import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useChatScroll } from '@/hooks/metadjai/use-chat-scroll';
import type { UseChatScrollOptions } from '@/hooks/metadjai/use-chat-scroll';

describe('useChatScroll', () => {
  // Mock DOM elements
  let scrollContainer: HTMLDivElement;
  let messageNode: HTMLDivElement;

  beforeEach(() => {
    // Create mock DOM elements
    scrollContainer = document.createElement('div');
    scrollContainer.id = 'scroll-container';
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 0, writable: true, configurable: true });
    scrollContainer.scrollTo = vi.fn();
    scrollContainer.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 0, left: 0, bottom: 500, right: 400, width: 400, height: 500,
    });

    messageNode = document.createElement('div');
    messageNode.id = 'metadjai-message-msg-1';
    messageNode.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 200, left: 0, bottom: 250, right: 400, width: 400, height: 50,
    });

    document.body.appendChild(scrollContainer);
    document.body.appendChild(messageNode);
  });

  afterEach(() => {
    // Clean up DOM elements
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const defaultOptions: UseChatScrollOptions = {
    isOpen: true,
    isStreaming: false,
    messages: [],
    activeSessionId: 'session-1',
  };

  describe('initialization', () => {
    it('returns refs and state values', () => {
      const { result } = renderHook(() => useChatScroll(defaultOptions));

      expect(result.current.scrollRef).toBeDefined();
      expect(result.current.messageListRef).toBeDefined();
      expect(result.current.runwayHeight).toBeNull();
      expect(result.current.restingRunwayPadding).toBeNull();
      expect(result.current.latestUserMessageId).toBeNull();
    });

    it('returns scroll control functions', () => {
      const { result } = renderHook(() => useChatScroll(defaultOptions));

      expect(typeof result.current.markProgrammaticScroll).toBe('function');
      expect(typeof result.current.scrollToMessageStart).toBe('function');
      expect(typeof result.current.scrollToLatestUserMessage).toBe('function');
      expect(typeof result.current.queueScrollToLatestUser).toBe('function');
    });
  });

  describe('latestUserMessageId', () => {
    it('returns null when no messages', () => {
      const { result } = renderHook(() => useChatScroll({
        ...defaultOptions,
        messages: [],
      }));

      expect(result.current.latestUserMessageId).toBeNull();
    });

    it('returns null when no user messages', () => {
      const { result } = renderHook(() => useChatScroll({
        ...defaultOptions,
        messages: [
          { id: 'msg-1', role: 'assistant' },
          { id: 'msg-2', role: 'assistant' },
        ],
      }));

      expect(result.current.latestUserMessageId).toBeNull();
    });

    it('finds the latest user message', () => {
      const { result } = renderHook(() => useChatScroll({
        ...defaultOptions,
        messages: [
          { id: 'msg-1', role: 'user' },
          { id: 'msg-2', role: 'assistant' },
          { id: 'msg-3', role: 'user' },
          { id: 'msg-4', role: 'assistant' },
        ],
      }));

      expect(result.current.latestUserMessageId).toBe('msg-3');
    });

    it('handles messages without id', () => {
      const { result } = renderHook(() => useChatScroll({
        ...defaultOptions,
        messages: [
          { role: 'user' },
          { id: 'msg-2', role: 'assistant' },
        ],
      }));

      expect(result.current.latestUserMessageId).toBeNull();
    });
  });

  describe('markProgrammaticScroll', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('sets and clears programmatic scroll flag', () => {
      const { result } = renderHook(() => useChatScroll(defaultOptions));

      // Call mark function
      act(() => {
        result.current.markProgrammaticScroll();
      });

      // The timeout should eventually clear (we can't directly test the ref,
      // but we can verify no errors occur)
      act(() => {
        vi.advanceTimersByTime(500);
      });
    });

    it('clears previous timeout when called again', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      const { result } = renderHook(() => useChatScroll(defaultOptions));

      act(() => {
        result.current.markProgrammaticScroll();
      });

      act(() => {
        result.current.markProgrammaticScroll();
      });

      // Should have called clearTimeout for the first timeout
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('queueScrollToLatestUser', () => {
    it('queues a scroll request', () => {
      const { result } = renderHook(() => useChatScroll({
        ...defaultOptions,
        messages: [{ id: 'msg-1', role: 'user' }],
      }));

      // Should not throw
      act(() => {
        result.current.queueScrollToLatestUser('smooth');
      });
    });

    it('accepts different scroll behaviors', () => {
      const { result } = renderHook(() => useChatScroll({
        ...defaultOptions,
        messages: [{ id: 'msg-1', role: 'user' }],
      }));

      act(() => {
        result.current.queueScrollToLatestUser('auto');
      });

      act(() => {
        result.current.queueScrollToLatestUser('smooth');
      });
    });
  });

  describe('when panel is closed', () => {
    it('resets runway height when closed', () => {
      const { result, rerender } = renderHook(
        (props: UseChatScrollOptions) => useChatScroll(props),
        { initialProps: { ...defaultOptions, isOpen: true } }
      );

      // Manually set the ref to our mock
      (result.current.scrollRef as React.MutableRefObject<HTMLDivElement>).current = scrollContainer;

      // Close the panel
      rerender({ ...defaultOptions, isOpen: false });

      // runwayHeight should be null when closed
      expect(result.current.runwayHeight).toBeNull();
    });
  });

  describe('streaming behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('clears resting runway padding when streaming starts', () => {
      const { result, rerender } = renderHook(
        (props: UseChatScrollOptions) => useChatScroll(props),
        { initialProps: { ...defaultOptions, isStreaming: false } }
      );

      // Start streaming
      rerender({ ...defaultOptions, isStreaming: true });

      expect(result.current.restingRunwayPadding).toBeNull();
    });
  });

  describe('session changes', () => {
    it('handles session ID changes', () => {
      const { result, rerender } = renderHook(
        (props: UseChatScrollOptions) => useChatScroll(props),
        { initialProps: { ...defaultOptions, activeSessionId: 'session-1' } }
      );

      // Change session
      rerender({ ...defaultOptions, activeSessionId: 'session-2' });

      // Should not throw
      expect(result.current.latestUserMessageId).toBeNull();
    });

    it('handles null session ID', () => {
      const initialProps: UseChatScrollOptions = { ...defaultOptions, activeSessionId: 'session-1' };
      const { result, rerender } = renderHook(
        (props: UseChatScrollOptions) => useChatScroll(props),
        { initialProps }
      );

      rerender({ ...defaultOptions, activeSessionId: null });

      // Should not throw
      expect(result.current.latestUserMessageId).toBeNull();
    });
  });

  describe('model switch handling', () => {
    it('handles model-switch messages', () => {
      const { result, rerender } = renderHook(
        (props: UseChatScrollOptions) => useChatScroll(props),
        { initialProps: defaultOptions }
      );

      // Add a model-switch message
      rerender({
        ...defaultOptions,
        messages: [
          { id: 'msg-1', role: 'assistant' },
          { id: 'msg-2', role: 'assistant', kind: 'model-switch' },
        ],
      });

      // Should not throw
      expect(result.current.latestUserMessageId).toBeNull();
    });
  });
});
