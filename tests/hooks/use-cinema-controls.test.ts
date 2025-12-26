/**
 * Cinema Controls Hook Tests
 *
 * Tests for use-cinema-controls.ts - controls visibility management
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCinemaControls } from '@/hooks/cinema/use-cinema-controls'

// Mock analytics module
vi.mock('@/lib/analytics', () => ({
  getDeviceType: vi.fn(() => 'desktop'),
}))

// Mock constants
vi.mock('@/lib/app.constants', () => ({
  CINEMA_CONTROLS_TIMEOUT_MS: 2500,
}))

describe('useCinemaControls', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('starts with controls visible', () => {
      const { result } = renderHook(() =>
        useCinemaControls({ cinemaEnabled: false, isQueueOpen: false })
      )
      expect(result.current.cinemaControlsVisible).toBe(true)
    })

    it('returns all required functions', () => {
      const { result } = renderHook(() =>
        useCinemaControls({ cinemaEnabled: false, isQueueOpen: false })
      )
      expect(typeof result.current.resetCinemaControlsTimer).toBe('function')
      expect(typeof result.current.hideCinemaControlsImmediately).toBe('function')
      expect(typeof result.current.setCinemaControlsVisible).toBe('function')
    })
  })

  describe('Auto-hide Behavior', () => {
    it('auto-hides controls after timeout when cinema is enabled', async () => {
      const { result } = renderHook(() =>
        useCinemaControls({ cinemaEnabled: true, isQueueOpen: false })
      )

      expect(result.current.cinemaControlsVisible).toBe(true)

      // Fast-forward past the timeout (2500ms for desktop)
      act(() => {
        vi.advanceTimersByTime(2500)
      })

      expect(result.current.cinemaControlsVisible).toBe(false)
    })

    it('does not auto-hide when queue is open', async () => {
      const { result } = renderHook(() =>
        useCinemaControls({ cinemaEnabled: true, isQueueOpen: true })
      )

      expect(result.current.cinemaControlsVisible).toBe(true)

      // Fast-forward past the timeout
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      // Controls should still be visible
      expect(result.current.cinemaControlsVisible).toBe(true)
    })

    it('does not auto-hide when cinema is disabled', async () => {
      const { result } = renderHook(() =>
        useCinemaControls({ cinemaEnabled: false, isQueueOpen: false })
      )

      expect(result.current.cinemaControlsVisible).toBe(true)

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      // Controls should still be visible when cinema is disabled
      expect(result.current.cinemaControlsVisible).toBe(true)
    })
  })

  describe('resetCinemaControlsTimer', () => {
    it('shows controls and restarts timer', async () => {
      const { result } = renderHook(() =>
        useCinemaControls({ cinemaEnabled: true, isQueueOpen: false })
      )

      // Let timer partially elapse
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Reset timer
      act(() => {
        result.current.resetCinemaControlsTimer()
      })

      expect(result.current.cinemaControlsVisible).toBe(true)

      // Advance partial time - controls should still be visible
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(result.current.cinemaControlsVisible).toBe(true)

      // Advance past reset timeout - now should hide
      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(result.current.cinemaControlsVisible).toBe(false)
    })

    it('does not start timer when queue is open', async () => {
      const { result } = renderHook(() =>
        useCinemaControls({ cinemaEnabled: true, isQueueOpen: true })
      )

      act(() => {
        result.current.resetCinemaControlsTimer()
      })

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Controls should remain visible
      expect(result.current.cinemaControlsVisible).toBe(true)
    })
  })

  describe('hideCinemaControlsImmediately', () => {
    it('hides controls immediately without delay', () => {
      const { result } = renderHook(() =>
        useCinemaControls({ cinemaEnabled: true, isQueueOpen: false })
      )

      expect(result.current.cinemaControlsVisible).toBe(true)

      act(() => {
        result.current.hideCinemaControlsImmediately()
      })

      expect(result.current.cinemaControlsVisible).toBe(false)
    })

    it('clears any pending timeout', async () => {
      const { result } = renderHook(() =>
        useCinemaControls({ cinemaEnabled: true, isQueueOpen: false })
      )

      // Hide immediately
      act(() => {
        result.current.hideCinemaControlsImmediately()
      })

      expect(result.current.cinemaControlsVisible).toBe(false)

      // Reset timer to show controls
      act(() => {
        result.current.resetCinemaControlsTimer()
      })

      expect(result.current.cinemaControlsVisible).toBe(true)

      // Verify the timer was properly cleared and restarted
      act(() => {
        vi.advanceTimersByTime(2500)
      })

      expect(result.current.cinemaControlsVisible).toBe(false)
    })
  })

  describe('Cinema Enable/Disable Transitions', () => {
    it('shows controls when cinema becomes enabled', () => {
      const { result, rerender } = renderHook(
        ({ cinemaEnabled }) =>
          useCinemaControls({ cinemaEnabled, isQueueOpen: false }),
        { initialProps: { cinemaEnabled: false } }
      )

      // Hide controls first
      act(() => {
        result.current.setCinemaControlsVisible(false)
      })

      expect(result.current.cinemaControlsVisible).toBe(false)

      // Enable cinema
      rerender({ cinemaEnabled: true })

      expect(result.current.cinemaControlsVisible).toBe(true)
    })

    it('shows controls when cinema becomes disabled', () => {
      const { result, rerender } = renderHook(
        ({ cinemaEnabled }) =>
          useCinemaControls({ cinemaEnabled, isQueueOpen: false }),
        { initialProps: { cinemaEnabled: true } }
      )

      // Let controls auto-hide
      act(() => {
        vi.advanceTimersByTime(2500)
      })

      expect(result.current.cinemaControlsVisible).toBe(false)

      // Disable cinema
      rerender({ cinemaEnabled: false })

      expect(result.current.cinemaControlsVisible).toBe(true)
    })
  })

  describe('Queue Open/Close Transitions', () => {
    it('keeps controls visible when queue opens', () => {
      const { result, rerender } = renderHook(
        ({ isQueueOpen }) =>
          useCinemaControls({ cinemaEnabled: true, isQueueOpen }),
        { initialProps: { isQueueOpen: false } }
      )

      // Partial timer elapsed
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Open queue
      rerender({ isQueueOpen: true })

      // Fast forward well past timeout
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Controls should remain visible
      expect(result.current.cinemaControlsVisible).toBe(true)
    })

    it('restarts auto-hide timer when queue closes', () => {
      const { result, rerender } = renderHook(
        ({ isQueueOpen }) =>
          useCinemaControls({ cinemaEnabled: true, isQueueOpen }),
        { initialProps: { isQueueOpen: true } }
      )

      expect(result.current.cinemaControlsVisible).toBe(true)

      // Close queue
      rerender({ isQueueOpen: false })

      // Controls should still be visible initially
      expect(result.current.cinemaControlsVisible).toBe(true)

      // After timeout, controls should hide
      act(() => {
        vi.advanceTimersByTime(2500)
      })

      expect(result.current.cinemaControlsVisible).toBe(false)
    })
  })

  describe('setCinemaControlsVisible', () => {
    it('allows direct control of visibility', () => {
      const { result } = renderHook(() =>
        useCinemaControls({ cinemaEnabled: false, isQueueOpen: false })
      )

      act(() => {
        result.current.setCinemaControlsVisible(false)
      })

      expect(result.current.cinemaControlsVisible).toBe(false)

      act(() => {
        result.current.setCinemaControlsVisible(true)
      })

      expect(result.current.cinemaControlsVisible).toBe(true)
    })
  })
})
