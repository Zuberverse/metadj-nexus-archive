/**
 * Cinema Analytics Hook
 *
 * Extracted from use-cinema to manage analytics tracking:
 * - Cinema open/close events
 * - View duration tracking
 * - Completion detection
 */

import { useEffect, useRef } from 'react'
import {
  trackCinemaOpened,
  trackCinemaClosed,
  trackCinemaToggled,
} from '@/lib/analytics'
import { COMPLETION_THRESHOLD_SECONDS } from '@/lib/app.constants'
import { msToSeconds } from '@/lib/utils'
import type { Track } from '@/types'

interface UseCinemaAnalyticsOptions {
  /** Whether cinema is enabled */
  cinemaEnabled: boolean
  /** Current playing track */
  currentTrack: Track | null
}

interface UseCinemaAnalyticsReturn {
  /** Ref tracking when cinema was opened (for duration calculation) */
  cinemaOpenAtRef: React.MutableRefObject<number | null>
}

/**
 * Hook for tracking cinema analytics
 *
 * Tracks:
 * - Cinema open events (with track context and source)
 * - Cinema close events (with duration and completion status)
 * - Cinema toggle state changes
 */
export function useCinemaAnalytics({
  cinemaEnabled,
  currentTrack,
}: UseCinemaAnalyticsOptions): UseCinemaAnalyticsReturn {
  const cinemaOpenAtRef = useRef<number | null>(null)

  useEffect(() => {
    const now = Date.now()

    if (cinemaEnabled) {
      // Track cinema opened
      cinemaOpenAtRef.current = now
      try {
        trackCinemaOpened({
          trackId: currentTrack?.id,
          fromSource: 'player',
        })
        trackCinemaToggled(true)
      } catch {
        // Never throw from analytics
      }
      return
    }

    // Cinema closed - track duration and completion
    const started = cinemaOpenAtRef.current
    if (started) {
      const seconds = Math.max(0, msToSeconds(now - started))
      const completed = currentTrack?.duration
        ? seconds >= Math.max(0, currentTrack.duration - COMPLETION_THRESHOLD_SECONDS)
        : false

      try {
        trackCinemaClosed({
          trackId: currentTrack?.id,
          durationSeconds: seconds,
          completed,
        })
        trackCinemaToggled(false)
      } catch {
        // Never throw from analytics
      }
      cinemaOpenAtRef.current = null
    }
  }, [cinemaEnabled, currentTrack])

  return {
    cinemaOpenAtRef,
  }
}
