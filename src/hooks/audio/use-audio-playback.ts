/**
 * Custom hook for managing audio playback lifecycle
 *
 * Handles:
 * - Audio element lifecycle && event listeners
 * - Play/pause/seek operations
 * - Loading states && buffering
 * - Time updates && duration tracking
 * - Volume && mute state (via useAudioVolume)
 * - Analytics tracking (via useAudioAnalytics)
 * - Source resolution (via useAudioSource)
 *
 * This is the main orchestrating hook that composes:
 * - use-audio-analytics.ts - Analytics tracking
 * - use-audio-volume.ts - Volume state management
 * - use-audio-source.ts - Source URL resolution
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'
import { useAudioAnalytics } from './use-audio-analytics'
import { useAudioSource } from './use-audio-source'
import { useAudioVolume } from './use-audio-volume'
import type { Track, RepeatMode } from '@/types'

interface UseAudioPlaybackOptions {
  track: Track | null
  shouldPlay?: boolean
  onPlayStateChange?: (playing: boolean) => void
  onShouldPlayChange?: (shouldPlay: boolean) => void
  onNext?: () => void
  onError?: (trackId: string, error: string) => void
  externalVolume?: number
  externalIsMuted?: boolean
  onVolumeChange?: (volume: number) => void
  onMuteChange?: (muted: boolean) => void
  repeatMode?: RepeatMode
  autoSkipOnError?: boolean
  /** Called when play is pressed but no track is loaded - load default track */
  onPlayWithNoTrack?: () => void
  /** Enable crossfade between tracks */
  crossfadeEnabled?: boolean
  /** Crossfade duration in milliseconds (default: 3000) */
  crossfadeDuration?: number
  /** Secondary audio element ref for crossfade */
  nextAudioRef?: React.RefObject<HTMLAudioElement | null>
  /** Callback to get next track's audio URL for true crossfade */
  getNextTrackUrl?: () => string | null
}

export function useAudioPlayback({
  track,
  shouldPlay = false,
  onPlayStateChange,
  onShouldPlayChange,
  onNext,
  onError,
  externalVolume,
  externalIsMuted,
  onVolumeChange,
  onMuteChange,
  repeatMode = 'none',
  autoSkipOnError = true,
  onPlayWithNoTrack,
  crossfadeEnabled = false,
  crossfadeDuration = 3000,
  nextAudioRef,
  getNextTrackUrl,
}: UseAudioPlaybackOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [playbackBlocked, setPlaybackBlocked] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retries, setRetries] = useState(0)
  const [lastErrorAt, setLastErrorAt] = useState<number | null>(null)

  // Core refs for playback control - single source of truth
  const playbackBlockedRef = useRef(false)
  const shouldPlayRef = useRef(shouldPlay)
  const trackIdRef = useRef<string | null>(null)
  
  // Transition flag - prevents onShouldPlayChange(false) during track changes
  const isTransitioningRef = useRef(false)
  
  // Seeking flag - prevents auto-resume during slider drag
  const isSeekingRef = useRef(false)
  const wasPlayingBeforeSeekRef = useRef(false)
  
  // Play attempt mutex - prevents concurrent play() calls
  const playPromiseRef = useRef<Promise<void> | null>(null)
  
  // Auto-skip delay ref to prevent infinite loops
  const autoSkipTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Crossfade refs
  const crossfadeIntervalRef = useRef<number | null>(null)
  const isCrossfadingRef = useRef(false)
  const crossfadeStartVolumeRef = useRef<number>(1)

  // Compose sub-hooks
  const analytics = useAudioAnalytics({ track, currentTime, duration })
  const { audioSrc, audioUnlockedRef, markAudioUnlocked } = useAudioSource({
    track,
    onTrackChange: (_newTrackId: string) => {
      analytics.resetTrackingRefs()
      setPlaybackBlocked(false)
      playbackBlockedRef.current = false
      setHasError(false)
      setErrorMessage(null)
      if (autoSkipTimeoutRef.current) {
        clearTimeout(autoSkipTimeoutRef.current)
        autoSkipTimeoutRef.current = null
      }
    },
  })
  const volumeState = useAudioVolume({
    externalVolume,
    externalIsMuted,
    onVolumeChange,
    onMuteChange,
    audioRef,
  })

  // Keep refs in sync with state
  useEffect(() => {
    playbackBlockedRef.current = playbackBlocked
  }, [playbackBlocked])

  useEffect(() => {
    shouldPlayRef.current = shouldPlay
  }, [shouldPlay])

  const clearCrossfade = useCallback(() => {
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current)
      crossfadeIntervalRef.current = null
    }
    isCrossfadingRef.current = false
  }, [])

  const startCrossfade = useCallback(() => {
    if (!crossfadeEnabled || !audioRef.current) {
      return false
    }

    const currentAudio = audioRef.current
    const nextAudio = nextAudioRef?.current
    const fadeDuration = crossfadeDuration ?? 3000
    const steps = 30
    const stepDuration = fadeDuration / steps

    clearCrossfade()
    isCrossfadingRef.current = true
    const startVolume = externalVolume ?? currentAudio.volume
    crossfadeStartVolumeRef.current = startVolume

    const nextUrl = getNextTrackUrl?.()
    const hasNextTrack = nextAudio && nextUrl

    // Helper to complete crossfade and advance queue
    const completeCrossfade = () => {
      clearCrossfade()
      currentAudio.pause()
      currentAudio.volume = startVolume
      
      // Pause secondary audio before advancing queue to prevent dual playback
      if (nextAudio) {
        nextAudio.pause()
        nextAudio.src = ''
      }
      
      // Advance queue after crossfade completes
      if (onNext) {
        isTransitioningRef.current = true
        onNext()
      }
    }

    if (hasNextTrack) {
      nextAudio.src = nextUrl
      nextAudio.volume = 0
      nextAudio.load()

      const handleCanPlay = () => {
        if (!isCrossfadingRef.current) return

        nextAudio.play().catch(() => {})

        let step = 0
        crossfadeIntervalRef.current = window.setInterval(() => {
          step++
          const progress = step / steps

          const fadeOut = Math.cos(progress * Math.PI / 2)
          const fadeIn = Math.sin(progress * Math.PI / 2)

          currentAudio.volume = startVolume * fadeOut
          nextAudio.volume = startVolume * fadeIn

          if (step >= steps) {
            completeCrossfade()
          }
        }, stepDuration)
      }

      nextAudio.addEventListener('canplay', handleCanPlay, { once: true })

      setTimeout(() => {
        if (isCrossfadingRef.current && nextAudio.readyState < 3) {
          let step = 0
          crossfadeIntervalRef.current = window.setInterval(() => {
            step++
            const progress = step / steps
            const newVolume = Math.max(0, startVolume * (1 - progress))
            currentAudio.volume = newVolume

            if (step >= steps) {
              completeCrossfade()
            }
          }, stepDuration)
        }
      }, 500)
    } else {
      let step = 0
      crossfadeIntervalRef.current = window.setInterval(() => {
        step++
        const progress = step / steps
        const newVolume = Math.max(0, startVolume * (1 - progress))
        currentAudio.volume = newVolume

        if (step >= steps) {
          completeCrossfade()
        }
      }, stepDuration)
    }

    return true
  }, [crossfadeEnabled, crossfadeDuration, clearCrossfade, nextAudioRef, getNextTrackUrl, externalVolume, onNext])

  /**
   * Single unified play function - ALL play attempts go through here
   * Uses a mutex pattern to prevent concurrent play() calls
   */
  const safePlay = useCallback((source: string) => {
    const audio = audioRef.current
    if (!audio) return

    // Already playing - nothing to do
    if (!audio.paused) {
      return
    }

    // Blocked by browser - don't attempt
    if (playbackBlockedRef.current) {
      return
    }
    
    // User is seeking - don't auto-resume
    if (isSeekingRef.current) {
      return
    }

    // If a play attempt is already in progress, don't start another
    if (playPromiseRef.current !== null) {
      return
    }

    // Check if audio is ready enough to play
    // readyState: 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA
    if (audio.readyState < 2) {
      // Not ready yet - will be called again from loadeddata/canplay events
      return
    }

    // Ensure volume is set to external volume before playing
    // (volume-sync effect handles ongoing changes, but we need it set for initial play)
    if (externalVolume !== undefined) {
      audio.volume = externalVolume
    }

    const playPromise = audio.play()
    playPromiseRef.current = playPromise

    playPromise
      .then(() => {
        playPromiseRef.current = null
        setPlaybackBlocked(false)
        playbackBlockedRef.current = false
        markAudioUnlocked()
      })
      .catch((err) => {
        playPromiseRef.current = null
        const errorName = err instanceof Error ? err.name : String(err)

        if (errorName === 'NotAllowedError') {
          setIsLoading(false)
          setPlaybackBlocked(true)
          playbackBlockedRef.current = true
          logger.warn(`Playback requires user interaction (${source})`, { error: String(err) })
        } else if (errorName === 'AbortError') {
          // Media was changed/aborted - this is expected during track changes
          logger.warn(`Playback aborted (${source})`, { error: String(err) })
        } else {
          setIsLoading(false)
          logger.warn(`Play attempt failed (${source})`, { error: String(err) })
        }
      })
  }, [markAudioUnlocked, externalVolume])

  // Setup audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

            const handlePlay = () => {
              // Transition complete once playback starts.
              isTransitioningRef.current = false
              setIsPlaying(true)
              setIsLoading(false)
              onPlayStateChange?.(true)
      onShouldPlayChange?.(true)
      analytics.onTrackPlay()
    }

    const handlePause = () => {
      setIsPlaying(false)
      onPlayStateChange?.(false)
      // Only update shouldPlay if we're not in a track transition
      if (isTransitioningRef.current) {
        // We're in a track transition - clear the flag and don't update shouldPlay
        isTransitioningRef.current = false
      } else {
        onShouldPlayChange?.(false)
      }
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleDurationChange = () => setDuration(audio.duration)

            const handleEnded = () => {
              setIsPlaying(false)
              onPlayStateChange?.(false)
              analytics.onTrackComplete()

        // Repeat current track indefinitely when enabled
        if (repeatMode === "track") {
          isTransitioningRef.current = true
          audio.currentTime = 0
          if (shouldPlayRef.current) {
            safePlay('ended-repeat-track')
          }
          return
        }

        // If crossfade is active, skip onNext - crossfade already handles the transition
        // This prevents the glitch where ended event triggers a duplicate track change
        if (isCrossfadingRef.current) {
          return
        }

              if (onNext) {
                isTransitioningRef.current = true
                onNext()
              } else {
                onShouldPlayChange?.(false)
              }
            }

    const handleWaiting = () => setIsLoading(true)

    const handleCanPlay = () => {
      setIsLoading(false)
      // If we should be playing but we're paused, try to play
      if (shouldPlayRef.current && audio.paused) {
        safePlay('canplay')
      }
    }

    const handleLoadedData = () => {
      setIsLoading(false)
      // If we should be playing but we're paused, try to play
      if (shouldPlayRef.current && audio.paused) {
        safePlay('loadeddata')
      }
    }

    const handleLoadStart = () => setIsLoading(true)

    const handleStalled = () => {
      logger.warn('Audio playback stalled', {
        trackId: track?.id || 'Unknown',
        trackTitle: track?.title || 'Unknown',
        url: audio?.src || audioSrc || 'No URL',
        networkState: audio?.networkState ?? -1,
        readyState: audio?.readyState ?? -1,
        currentTime: audio?.currentTime ?? -1,
      })
      setIsLoading(true)
    }

    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement
      const error = target.error || audio?.error

      const getErrorCodeText = (code: number | undefined): string => {
        const codes: Record<number, string> = {
          1: 'MEDIA_ERR_ABORTED',
          2: 'MEDIA_ERR_NETWORK',
          3: 'MEDIA_ERR_DECODE',
          4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
        }
        return codes[code ?? -1] || 'UNKNOWN_ERROR'
      }

      const errorCodeText = getErrorCodeText(error?.code)
      const errorMsg = error?.message || errorCodeText || 'Audio unavailable'

      const errorContext = {
        code: error?.code ?? -1,
        codeText: errorCodeText,
        message: error?.message || 'No error details available',
        url: audio?.src || audioSrc || 'No URL',
        networkState: audio?.networkState ?? -1,
        readyState: audio?.readyState ?? -1,
        trackId: track?.id || 'Unknown',
        trackTitle: track?.title || 'Unknown',
        hasErrorObject: error !== null,
      }

      const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
      const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
      const usesRemoteBucket = Boolean((audio?.src || audioSrc)?.includes('/api/audio/'))
      const isLocalStorageFallback = usesRemoteBucket && (isLocalHost || process.env.NODE_ENV !== 'production')

      if (isLocalStorageFallback) {
        logger.warn('Audio stream unavailable in local environment', errorContext)
      } else {
        logger.audioError('Failed to load audio', errorContext)
      }

      setIsLoading(false)
      setIsPlaying(false)
      setHasError(true)
      setErrorMessage(errorMsg)
      setRetries((prev) => prev + 1)
      setLastErrorAt(Date.now())
      onPlayStateChange?.(false)
      
      if (track?.id) {
        onError?.(track.id, errorMsg)
      }

      if (autoSkipOnError && onNext && shouldPlayRef.current) {
        if (autoSkipTimeoutRef.current) {
          clearTimeout(autoSkipTimeoutRef.current)
        }
        autoSkipTimeoutRef.current = setTimeout(() => {
          autoSkipTimeoutRef.current = null
          logger.info('Auto-skipping to next track after error', { 
            trackId: track?.id,
            trackTitle: track?.title 
          })
          onNext()
        }, 2000)
      }
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('loadeddata', handleLoadedData)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('stalled', handleStalled)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('loadeddata', handleLoadedData)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('stalled', handleStalled)
      audio.removeEventListener('error', handleError)
      if (autoSkipTimeoutRef.current) {
        clearTimeout(autoSkipTimeoutRef.current)
        autoSkipTimeoutRef.current = null
      }
    }
  }, [onNext, onPlayStateChange, onShouldPlayChange, onError, track, audioSrc, repeatMode, analytics, safePlay, autoSkipOnError])

  // Reset crossfade flag when track changes
  useEffect(() => {
    isCrossfadingRef.current = false
  }, [track?.id])

  // Crossfade: Start crossfade when approaching track end
  useEffect(() => {
    if (!crossfadeEnabled || !duration || duration <= 4 || repeatMode === 'track') return

    const audio = audioRef.current
    if (!audio || !isPlaying) return

    const fadeOutDurationSec = crossfadeDuration / 1000
    const timeRemaining = duration - currentTime

    if (
      timeRemaining <= fadeOutDurationSec &&
      timeRemaining > 0.1 &&
      shouldPlayRef.current &&
      !isCrossfadingRef.current
    ) {
      startCrossfade()
    }
  }, [currentTime, duration, crossfadeEnabled, crossfadeDuration, repeatMode, isPlaying, startCrossfade])

  // Cleanup crossfade on unmount
  useEffect(() => {
    return () => {
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current)
        crossfadeIntervalRef.current = null
      }
    }
  }, [])

  // Load audio source - this is the ONLY place where src is set
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Track change detection
    const isNewTrack = track?.id !== trackIdRef.current
    if (isNewTrack) {
      trackIdRef.current = track?.id ?? null
      
      // Cancel any pending play promise on track change
      playPromiseRef.current = null
      
      // Clear any running crossfade on track change
      clearCrossfade()
    }

    if (!audioSrc) {
      // No source - pause if playing
      if (!audio.paused) {
        audio.pause()
      }
      return
    }

    // Only update source if it's different
    if (audio.src !== audioSrc) {
      // Check if track has already ended - skip pause to avoid glitch
      // When audio.ended is true, pausing can cause a brief restart artifact
      const hasEnded = audio.ended
      const wasPlaying = !audio.paused && !hasEnded
      
      // Set transition flag BEFORE pausing to prevent onShouldPlayChange(false)
      // Only needed if audio is currently playing (pause event will fire)
      // Skip if already ended to prevent glitch
      if (wasPlaying) {
        isTransitioningRef.current = true
        audio.pause()
        // Note: isTransitioningRef will be cleared by handlePause when the pause event fires
      }
      
      // Cancel any pending play promise
      playPromiseRef.current = null
      
      // Set new source
      audio.src = audioSrc
      audio.load()
      
      // Reset time
      setCurrentTime(0)
      
      // Set loading state if we should play
      if (shouldPlayRef.current) {
        setIsLoading(true)
      } else {
        setIsPlaying(false)
      }
    }
  }, [audioSrc, track?.id, clearCrossfade])

  // Handle shouldPlay prop changes - this drives play/pause intent
  useEffect(() => {
    shouldPlayRef.current = shouldPlay
    const audio = audioRef.current
    if (!audio || !track) return

    if (shouldPlay) {
      // If audio is paused and we should play, try to play
      if (audio.paused) {
        safePlay('shouldPlay')
      }
    } else {
      // Stop playback
      if (!audio.paused) {
        audio.pause()
      }
    }
  }, [shouldPlay, track, safePlay])

  // Playback controls
  const togglePlayback = useCallback(() => {
    const audio = audioRef.current
    
    // If no track is loaded, trigger fallback to load default track
    if (!track) {
      onPlayWithNoTrack?.()
      return
    }
    
    if (!audio) return

    if (audio.paused) {
      setHasError(false)
      setErrorMessage(null)
      onShouldPlayChange?.(true)
      
      if (audio.readyState === 0 && audio.error) {
        audio.load()
        setIsLoading(true)
      }
      
      safePlay('togglePlayback')
      analytics.onPlaybackControl('play')
    } else {
      onShouldPlayChange?.(false)
      audio.pause()
      analytics.onPlaybackControl('pause')
    }
  }, [track, onShouldPlayChange, analytics, safePlay, onPlayWithNoTrack])

  // Seek function
  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current
    if (audio && isFinite(time) && time >= 0) {
      const targetTime = Math.min(time, audio.duration || Infinity)
      audio.currentTime = targetTime
      setCurrentTime(targetTime)
      analytics.onPlaybackControl('seek', targetTime)
    }
  }, [analytics])

  // Retry playback after user interaction
  const retryPlayback = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !track) return

    setPlaybackBlocked(false)
    playbackBlockedRef.current = false
    setHasError(false)
    setErrorMessage(null)
    
    if (audio.readyState === 0 || audio.error) {
      audio.load()
      setIsLoading(true)
    }
    
    if (audio.paused && shouldPlayRef.current) {
      safePlay('retryPlayback')
    }
  }, [track, safePlay])

  // Update volume/mute from external props
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (externalVolume !== undefined && audio.volume !== externalVolume) {
      audio.volume = externalVolume
    }
    if (externalIsMuted !== undefined && audio.muted !== externalIsMuted) {
      audio.muted = externalIsMuted
    }
  }, [externalVolume, externalIsMuted])

  // Seek controls - pause during drag, resume on release
  const beginSeek = useCallback(() => {
    const audio = audioRef.current
    isSeekingRef.current = true
    wasPlayingBeforeSeekRef.current = audio ? !audio.paused : false
    
    // Pause audio during seek
    if (audio && !audio.paused) {
      audio.pause()
    }
  }, [])

  const endSeek = useCallback(() => {
    isSeekingRef.current = false
    const audio = audioRef.current
    
    // Resume if was playing before seek
    if (wasPlayingBeforeSeekRef.current && audio) {
      setTimeout(() => {
        if (!isSeekingRef.current) {
          safePlay('endSeek')
        }
      }, 50)
    }
    wasPlayingBeforeSeekRef.current = false
  }, [safePlay])

  return {
    audioRef,
    audioSrc,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    playbackBlocked,
    hasError,
    errorMessage,
    retries,
    lastErrorAt,
    togglePlayback,
    retryPlayback,
    seekTo,
    beginSeek,
    endSeek,
    ...volumeState,
    trackPlayedRef: analytics.trackPlayedRef,
    trackCompletedRef: analytics.trackCompletedRef,
  }
}
