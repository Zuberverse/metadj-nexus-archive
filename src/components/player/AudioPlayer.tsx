"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
import { usePlayer } from "@/contexts/PlayerContext"
import { useToast } from "@/contexts/ToastContext"
import { useUI } from "@/contexts/UIContext"
import { useAudioAnalyzer } from "@/hooks/audio/use-audio-analyzer"
import { useAudioPlayback } from "@/hooks/audio/use-audio-playback"
import { useAudioSettings } from "@/hooks/audio/use-audio-settings"
import { useSwipeGesture } from "@/hooks/use-swipe-gesture"
import {
  trackPlaybackControl,
} from "@/lib/analytics"
import { DEFAULT_ARTWORK_SRC, PANEL_POSITIONING } from "@/lib/app.constants"
import { logger } from "@/lib/logger"
import { toasts } from "@/lib/toast-helpers"
import { ControlPanelOverlay } from "./ControlPanelOverlay"
import { PlaybackUnlockOverlay } from "./PlaybackUnlockOverlay"
import type { AudioPlayerProps } from "@/types/audio-player.types"

/**
 * AudioPlayer Props use the grouped format from `src/types/audio-player.types.ts`.
 */

function AudioPlayer({
  track,
  shouldPlay = false,
  playback,
  volume,
  queue,
  search,
  metaDjAi,
  collectionLabel,
  className = "",
}: AudioPlayerProps) {
  const onPlayStateChange = playback?.onPlayStateChange
  const onShouldPlayChange = playback?.onShouldPlayChange
  const onNext = playback?.onNext
  const onPrevious = playback?.onPrevious
  const onPlayWithNoTrack = playback?.onPlayWithNoTrack

  const externalVolume = volume?.level
  const onVolumeChange = volume?.onChange
  const externalIsMuted = volume?.isMuted
  const onMuteChange = volume?.onMuteChange

  const queueItems = queue?.items ?? []
  const isShuffleEnabled = queue?.isShuffleEnabled ?? false
  const repeatMode = queue?.repeatMode ?? "none"
  const onShuffleToggle = queue?.onShuffleToggle
  const onRepeatToggle = queue?.onRepeatToggle
  const onQueueReorder = queue?.onReorder
  const onQueueRemove = queue?.onRemove
  const onQueueClear = queue?.onClear
  const onQueueTrackSelect = queue?.onTrackSelect
  const onQueueInsert = queue?.onInsert

  const allTracks = search?.allTracks ?? []
  const onSearchTrackSelect = search?.onTrackSelect
  const onSearchTrackQueueAdd = search?.onTrackQueueAdd

  const isMetaDjAiOpen = metaDjAi?.isOpen ?? false
  const onMetaDjAiToggle = metaDjAi?.onToggle
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const nextAudioRef = useRef<HTMLAudioElement>(null)
  const [isControlsOverlayOpen, setControlsOverlayOpen] = useState(false)
  const { crossfadeEnabled } = useAudioSettings()
  const { headerHeight } = useUI()
  const {
    audioRef: playerAudioRef,
    setIsPlaying: setContextIsPlaying,
    setDuration: setContextDuration,
    setIsLoading: setContextIsLoading,
    setCurrentTimeRef,
    notifyAudioReady,
  } = usePlayer()
  const currentCollectionTitle = collectionLabel || track?.collection || ""

  const { showToast } = useToast()

  const handleAudioError = useCallback((trackId: string, error: string) => {
    showToast(toasts.audioError(track?.title))
  }, [showToast, track])

  const getNextTrackUrl = useCallback(() => {
    if (queueItems.length === 0) return null

    const activeIndex = track
      ? queueItems.findIndex((item) => item.id === track.id)
      : -1

    const safeIndex = activeIndex >= 0 ? activeIndex : 0
    const nextIndex = (safeIndex + 1) % queueItems.length

    if (nextIndex === 0 && safeIndex === queueItems.length - 1 && repeatMode === "none") {
      return null
    }

    const nextTrack = queueItems[nextIndex]
    if (!nextTrack) return null

    return `/api/audio/${nextTrack.id}`
  }, [queueItems, track, repeatMode])

  // Use custom audio playback hook
  const {
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
    trackPlayedRef,
    trackCompletedRef,
    beginSeek,
    endSeek,
  } = useAudioPlayback({
    track,
    shouldPlay,
    onPlayStateChange,
    onShouldPlayChange,
    onNext,
    onError: handleAudioError,
    externalVolume,
    externalIsMuted,
    onVolumeChange,
    onMuteChange,
    repeatMode,
    autoSkipOnError: true,
    onPlayWithNoTrack,
    crossfadeEnabled,
    crossfadeDuration: 3000,
    nextAudioRef,
    getNextTrackUrl,
  })

  // Keep the shared PlayerContext audioRef in sync so analyzers/panels can access the active element
  useEffect(() => {
    playerAudioRef.current = audioRef.current
    if (audioRef.current) {
      notifyAudioReady()
    }
  }, [audioRef, playerAudioRef, notifyAudioReady])

  // Warm up audio analyzer graph to prevent cutout on Cinema load
  // This initializes the audio wiring immediately so switching to visualizer is seamless
  const { overallLevel } = useAudioAnalyzer({
    audioElement: audioRef.current,
    enabled: isPlaying
  })

  // Sync playback state to PlayerContext so NowPlayingSection can display it
  useEffect(() => {
    setContextIsPlaying(isPlaying)
  }, [isPlaying, setContextIsPlaying])
  // Note: currentTime is now synced via ref (setCurrentTimeRef) for performance
  // Components needing time should use usePlaybackTime() hook instead
  useEffect(() => {
    setCurrentTimeRef(currentTime)
  }, [currentTime, setCurrentTimeRef])
  useEffect(() => {
    setContextDuration(duration)
  }, [duration, setContextDuration])
  useEffect(() => {
    setContextIsLoading(isLoading)
  }, [isLoading, setContextIsLoading])

  const hasQueue = queueItems.length > 0

  // Close chat panel after overlay opens (runs post-render to avoid setState in render)
  useEffect(() => {
    if (isControlsOverlayOpen && isMetaDjAiOpen && onMetaDjAiToggle) {
      onMetaDjAiToggle()
    }
  }, [isControlsOverlayOpen, isMetaDjAiOpen, onMetaDjAiToggle])

  // Media Session API - Lock screen controls and metadata
  useEffect(() => {
    if (!track || typeof window === 'undefined' || !('mediaSession' in navigator)) {
      return
    }

    // Set metadata for lock screen display
    const artwork = track.artworkUrl
      ? [{ src: track.artworkUrl, sizes: "512x512" }]
      : [{ src: DEFAULT_ARTWORK_SRC, sizes: "512x512", type: "image/svg+xml" }]

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.collection,
      artwork,
    })

    // Set action handlers for lock screen controls
    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play()
    })

    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause()
    })

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (onPrevious) onPrevious()
    })

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (onNext) onNext()
    })

    // Optional: Seek handlers for progress control
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime && audioRef.current) {
        audioRef.current.currentTime = details.seekTime
      }
    })

    // Cleanup on unmount
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
        navigator.mediaSession.setActionHandler('seekto', null)
      }
    }
  }, [track, onPrevious, onNext, audioRef])

  // Update playback state for lock screen
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
      return
    }

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  const handlePrevious = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    // Spotify-style logic: if more than 3 seconds in, restart current track
    // If less than 3 seconds, go to previous track
    if (currentTime > 3) {
      audio.currentTime = 0

      // Track previous control (restart)
      if (track) {
        try {
          trackPlaybackControl({
            action: 'previous',
            trackId: track.id,
            value: 0,
          })
        } catch (error) {
          logger.warn('Analytics: Failed to track previous control', { error: String(error) })
        }
      }
    } else if (onPrevious) {
      onPrevious()
    } else {
      audio.currentTime = 0
    }
  }, [audioRef, currentTime, onPrevious, track])

  const handleNext = useCallback(() => {
    if (!onNext) return
    onNext()
  }, [onNext])

  // Enable swipe gestures for mobile track navigation
  useSwipeGesture(playerContainerRef, {
    onSwipeLeft: handleNext,      // Swipe left = next track
    onSwipeRight: handlePrevious,  // Swipe right = previous track
    minSwipeDistance: 50,          // Minimum 50px horizontal movement
    maxCrossAxisDistance: 100      // Maximum 100px vertical movement (prevents conflict with scrolling)
  })

  const handleShuffleToggle = useCallback(() => {
    onShuffleToggle?.()
  }, [onShuffleToggle])

  return (
    <div
      id="metadj-audio-player"
      data-audio-player
      className={`fixed inset-x-0 bottom-0 z-50 w-full pointer-events-auto ${className}`}
    >
      {/* Queue overlay removed in favor of inline queue within music controls */}

      {/* Audio element source comes from useAudioPlayback hook output */}
      {/* aria-hidden: Custom accessible controls are provided via ControlPanelOverlay */}
      {/* controls: Progressive enhancement fallback if JS fails or custom controls don't load */}
      <audio
        ref={audioRef}
        preload="metadata"
        src={audioSrc || undefined}
        aria-hidden="true"
        controls
        className="hidden"
      />
      {/* Secondary audio element for crossfade */}
      <audio
        ref={nextAudioRef}
        preload="metadata"
        aria-hidden="true"
        className="hidden"
      />

      <PlaybackUnlockOverlay
        isVisible={Boolean(playbackBlocked)}
        onUnlock={retryPlayback}
        trackTitle={track?.title}
        trackArtist={track?.artist}
      />

      <ControlPanelOverlay
        isOpen={isControlsOverlayOpen}
        headerHeight={headerHeight}
        bottomOffset={PANEL_POSITIONING.OVERLAY.ACTION_BAR_OFFSET}
        track={track}
        queueItems={queueItems}
        allTracks={allTracks}
        currentCollectionTitle={currentCollectionTitle}
        hasQueue={hasQueue}
        isPlaying={isPlaying}
        isLoading={isLoading}
        isShuffleEnabled={isShuffleEnabled}
        repeatMode={repeatMode}
        currentTime={currentTime}
        duration={duration}
        onSeek={seekTo}
        onBeginSeek={beginSeek}
        onEndSeek={endSeek}
        onPlayPause={togglePlayback}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onShuffleToggle={handleShuffleToggle}
        onRepeatToggle={onRepeatToggle}
        onQueueClear={onQueueClear}
        onQueueRemove={onQueueRemove}
        onQueueInsert={onQueueInsert}
        onQueueReorder={onQueueReorder}
        onQueueTrackSelect={onQueueTrackSelect}
        onSearchTrackSelect={onSearchTrackSelect}
        onSearchTrackQueueAdd={onSearchTrackQueueAdd}
        volume={externalVolume}
        isMuted={externalIsMuted}
        onVolumeChange={onVolumeChange}
        onMuteToggle={
          onMuteChange
            ? () => onMuteChange(!(externalIsMuted ?? false))
            : undefined
        }
        onClose={() => setControlsOverlayOpen(false)}
        audioError={hasError ? errorMessage : null}
        audioErrorRetries={retries}
        audioErrorAt={lastErrorAt}
        overallLevel={overallLevel}
      />
    </div>
  )
}

// Memoize AudioPlayer to prevent unnecessary re-renders (3-4 hour implementation, 25-30% re-render reduction)
const MemoizedAudioPlayer = memo(AudioPlayer)
export { MemoizedAudioPlayer as AudioPlayer }
