/**
 * Cinema Video Hook
 *
 * Extracted from use-cinema to manage video playback:
 * - Video sync with audio playback state
 * - Error handling with retry logic
 * - Track change handling
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { VIDEO_RETRY_DELAY_MS, MAX_VIDEO_RETRY_ATTEMPTS } from '@/lib/app.constants'
import { logger } from '@/lib/logger'
import type { Track } from '@/types'
import type React from 'react'

interface UseCinemaVideoOptions {
  /** Current playing track */
  currentTrack: Track | null
  /** Whether audio should be playing */
  shouldPlay: boolean
  /** Whether cinema is enabled */
  cinemaEnabled: boolean
  /** Whether to show poster only (no video playback) */
  posterOnly: boolean
}

interface UseCinemaVideoReturn {
  /** Ref to the video element */
  cinemaVideoRef: React.MutableRefObject<HTMLVideoElement | null>
  /** Whether video has errored */
  cinemaVideoError: boolean
  /** Whether video is ready to play */
  cinemaVideoReady: boolean
  /** Current retry count */
  cinemaRetryCount: number
  /** Handle video error event */
  handleVideoError: (event: React.SyntheticEvent<HTMLVideoElement, Event>) => void
  /** Handle video loaded event */
  handleVideoLoadedData: () => void
  /** Retry loading video */
  retryVideo: () => void
  /** Reset video state */
  resetVideoState: () => void
}

/**
 * Hook for managing cinema video playback
 *
 * Video Behavior Matrix:
 * - Cinema closed + audio paused → video paused
 * - Cinema closed + audio playing → video paused (cinema not visible)
 * - Open cinema while audio paused → video paused at 0
 * - Open cinema while audio playing → video playing from 0
 * - Cinema open + pause audio → video pauses at current position
 * - Cinema open + resume audio → video plays from paused position
 * - Cinema open + close cinema → video pauses and resets to 0
 * - Cinema open + change track (while playing) → video continues (continuous loop)
 * - Cinema open + change track (while paused) → video stays paused
 */
export function useCinemaVideo({
  currentTrack,
  shouldPlay,
  cinemaEnabled,
  posterOnly,
}: UseCinemaVideoOptions): UseCinemaVideoReturn {
  const cinemaVideoRef = useRef<HTMLVideoElement | null>(null)
  const previousTrackIdRef = useRef<string | null>(null)
  const [cinemaVideoError, setCinemaVideoError] = useState(false)
  const [cinemaVideoReady, setCinemaVideoReady] = useState(false)
  const [cinemaRetryCount, setCinemaRetryCount] = useState(0)

  // Sync video playback with audio state
  useEffect(() => {
    const video = cinemaVideoRef.current
    if (!video) return

    // Ensure video is always muted to prevent double audio
    video.muted = true
    video.volume = 0

    if (!cinemaEnabled || !currentTrack || posterOnly) {
      video.pause()
      return
    }

    if (shouldPlay) {
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay can fail silently; ignore to keep audio primary
        })
      }
    } else {
      video.pause()
    }
  }, [shouldPlay, currentTrack, cinemaEnabled, posterOnly])

  // Handle track changes (continuous loop - don't reset video time)
  useEffect(() => {
    const video = cinemaVideoRef.current
    const trackId = currentTrack?.id ?? null

    if (!video) return

    // Ensure video is always muted
    video.muted = true
    video.volume = 0

    if (trackId !== previousTrackIdRef.current) {
      previousTrackIdRef.current = trackId

      // Don't reset video time when track changes - cinema is continuous loop
      if (!trackId) {
        video.pause()
      } else if (cinemaEnabled && shouldPlay) {
        const playPromise = video.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {})
        }
      }
    }
  }, [currentTrack, cinemaEnabled, shouldPlay])

  // Handle cinema open/close lifecycle and playback state
  useEffect(() => {
    const video = cinemaVideoRef.current
    if (!video) return

    if (!cinemaEnabled) {
      video.pause()
      video.currentTime = 0 // Reset when cinema closes
      return
    }

    video.muted = true
    video.volume = 0
    if (shouldPlay) {
      const primeVideo = async () => {
        try {
          await video.play()
        } catch {
          // Autoplay may be blocked
        }
      }
      void primeVideo()
    } else {
      video.pause()
    }
  }, [cinemaEnabled, shouldPlay])

  // Handle video error with retry logic
  const handleVideoError = useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      if (cinemaRetryCount < MAX_VIDEO_RETRY_ATTEMPTS) {
        logger.warn('Cinema video failed to load, retrying...', {
          attempt: cinemaRetryCount + 1,
          error: event.type,
          videoSrc: cinemaVideoRef.current?.currentSrc,
        })
        setCinemaRetryCount((prev) => prev + 1)

        setTimeout(() => {
          if (cinemaVideoRef.current) {
            cinemaVideoRef.current.load()
          }
        }, VIDEO_RETRY_DELAY_MS)
      } else {
        logger.warn('Cinema video failed to load after retries', {
          error: event.type,
          videoSrc: cinemaVideoRef.current?.currentSrc,
        })
        setCinemaVideoError(true)
        setCinemaVideoReady(false)
      }
      event.preventDefault()
    },
    [cinemaRetryCount]
  )

  // Handle successful video load
  const handleVideoLoadedData = useCallback(() => {
    setCinemaVideoError(false)
    setCinemaVideoReady(true)
    setCinemaRetryCount(0)
  }, [])

  // Retry loading video
  const retryVideo = useCallback(() => {
    setCinemaVideoError(false)
    setCinemaVideoReady(false)
    setCinemaRetryCount(0)
    if (cinemaVideoRef.current) {
      cinemaVideoRef.current.load()
    }
  }, [])

  // Reset video state (for external use)
  const resetVideoState = useCallback(() => {
    setCinemaVideoError(false)
    setCinemaVideoReady(false)
    setCinemaRetryCount(0)
    if (cinemaVideoRef.current) {
      cinemaVideoRef.current.pause()
      cinemaVideoRef.current.currentTime = 0
    }
  }, [])

  return {
    cinemaVideoRef,
    cinemaVideoError,
    cinemaVideoReady,
    cinemaRetryCount,
    handleVideoError,
    handleVideoLoadedData,
    retryVideo,
    resetVideoState,
  }
}
