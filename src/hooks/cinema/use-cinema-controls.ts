/**
 * Cinema Controls Hook
 *
 * Extracted from use-cinema to manage controls visibility:
 * - Auto-hide timer with device-specific timeouts
 * - Manual show/hide controls
 * - Queue-aware visibility management
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { CINEMA_CONTROLS_TIMEOUT_MS } from '@/lib/app.constants'

interface UseCinemaControlsOptions {
  /** Whether cinema is currently enabled */
  cinemaEnabled: boolean
  /** Whether queue panel is open (controls stay visible when open) */
  isQueueOpen: boolean
  /** Keep controls visible and pause auto-hide (temporary override state) */
  suspendAutoHide?: boolean
}

interface UseCinemaControlsReturn {
  /** Whether controls are currently visible */
  cinemaControlsVisible: boolean
  /** Reset and restart the auto-hide timer */
  resetCinemaControlsTimer: () => void
  /** Hide controls immediately without delay */
  hideCinemaControlsImmediately: () => void
  /** Set controls visibility directly */
  setCinemaControlsVisible: React.Dispatch<React.SetStateAction<boolean>>
}

/**
 * Hook for managing cinema controls visibility
 *
 * Features:
 * - Auto-hide after timeout (longer on mobile/tablet)
 * - Keeps controls visible when queue is open
 * - Resets timer on user interaction
 */
export function useCinemaControls({
  cinemaEnabled,
  isQueueOpen,
  suspendAutoHide = false,
}: UseCinemaControlsOptions): UseCinemaControlsReturn {
  const [cinemaControlsVisible, setCinemaControlsVisible] = useState(true)
  const cinemaControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Calculate device-appropriate timeout (5s for all devices)
  const getTimeout = useCallback(() => {
    return CINEMA_CONTROLS_TIMEOUT_MS
  }, [])

  // Reset and restart the auto-hide timer
  const resetCinemaControlsTimer = useCallback(() => {
    setCinemaControlsVisible(true)

    if (cinemaControlsTimeoutRef.current) {
      clearTimeout(cinemaControlsTimeoutRef.current)
      cinemaControlsTimeoutRef.current = null
    }

    // Don't set auto-hide timer if queue is open
    if (isQueueOpen || suspendAutoHide) {
      return
    }

    cinemaControlsTimeoutRef.current = setTimeout(() => {
      setCinemaControlsVisible(false)
    }, getTimeout())
  }, [isQueueOpen, suspendAutoHide, getTimeout])

  // Hide controls immediately
  const hideCinemaControlsImmediately = useCallback(() => {
    if (cinemaControlsTimeoutRef.current) {
      clearTimeout(cinemaControlsTimeoutRef.current)
      cinemaControlsTimeoutRef.current = null
    }
    setCinemaControlsVisible(false)
  }, [])

  // Handle cinema enable/disable
  useEffect(() => {
    if (cinemaEnabled) {
      // Show controls and start timer when cinema opens
      setCinemaControlsVisible(true)
      if (cinemaControlsTimeoutRef.current) {
        clearTimeout(cinemaControlsTimeoutRef.current)
        cinemaControlsTimeoutRef.current = null
      }

      if (!isQueueOpen && !suspendAutoHide) {
        cinemaControlsTimeoutRef.current = setTimeout(() => {
          setCinemaControlsVisible(false)
        }, getTimeout())
      }
    } else {
      // Clear timer and show controls when cinema closes
      if (cinemaControlsTimeoutRef.current) {
        clearTimeout(cinemaControlsTimeoutRef.current)
        cinemaControlsTimeoutRef.current = null
      }
      setCinemaControlsVisible(true)
    }

    return () => {
      if (cinemaControlsTimeoutRef.current) {
        clearTimeout(cinemaControlsTimeoutRef.current)
        cinemaControlsTimeoutRef.current = null
      }
    }
  }, [cinemaEnabled, isQueueOpen, suspendAutoHide, getTimeout])

  // Suspend/resume auto-hide when requested (e.g., Dream startup countdown)
  useEffect(() => {
    if (!cinemaEnabled) return

    if (suspendAutoHide) {
      if (cinemaControlsTimeoutRef.current) {
        clearTimeout(cinemaControlsTimeoutRef.current)
        cinemaControlsTimeoutRef.current = null
      }
      setCinemaControlsVisible(true)
      return
    }

    if (!isQueueOpen) {
      resetCinemaControlsTimer()
    }
  }, [cinemaEnabled, suspendAutoHide, isQueueOpen, resetCinemaControlsTimer])

  // Handle queue open/close
  useEffect(() => {
    if (!cinemaEnabled) return

    if (isQueueOpen) {
      // Queue opened - clear auto-hide timer and keep controls visible
      if (cinemaControlsTimeoutRef.current) {
        clearTimeout(cinemaControlsTimeoutRef.current)
        cinemaControlsTimeoutRef.current = null
      }
      setCinemaControlsVisible(true)
    } else {
      // Queue closed - restart auto-hide timer
      resetCinemaControlsTimer()
    }
  }, [isQueueOpen, cinemaEnabled, resetCinemaControlsTimer])

  return {
    cinemaControlsVisible,
    resetCinemaControlsTimer,
    hideCinemaControlsImmediately,
    setCinemaControlsVisible,
  }
}
