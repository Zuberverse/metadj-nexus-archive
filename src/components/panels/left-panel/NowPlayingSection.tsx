"use client"

/**
 * NowPlayingSection Component
 *
 * Displays currently playing track with playback controls in the left panel.
 * 
 * This is a PURE UI COMPONENT - it does not manage audio playback.
 * All playback state (isPlaying, currentTime, duration, isLoading) comes from props.
 * All actions (play/pause, seek) are handled via callbacks.
 *
 * PERFORMANCE OPTIMIZATION:
 * - Wrapped with React.memo to prevent unnecessary re-renders
 * - Uses useCallback for event handlers
 * - Uses useMemo for computed values
 */

import { memo, useCallback, useMemo, useState, useRef, useEffect } from "react"
import Image from "next/image"
import clsx from "clsx"
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Info, Settings } from "lucide-react"
import { AudioSettingsModal } from "@/components/player/AudioSettingsModal"
import { ShareButton } from "@/components/ui"
import { usePlaybackTime } from "@/contexts/PlayerContext"
import { useAudioSettings } from "@/hooks/audio/use-audio-settings"
import { useCspStyle } from "@/hooks/use-csp-style"
import { DEFAULT_ARTWORK_SRC } from "@/lib/app.constants"
import { formatDuration } from "@/lib/utils"
import type { Track, RepeatMode } from "@/types"

interface NowPlayingSectionProps {
  track: Track | null
  shouldPlay: boolean
  isPlaying?: boolean
  currentTime?: number
  duration?: number
  isLoading?: boolean
  onPlayStateChange?: (playing: boolean) => void
  onShouldPlayChange?: (shouldPlay: boolean) => void
  onPlayPause?: () => void
  onSeekTo?: (time: number) => void
  onNext?: () => void
  onPrevious?: () => void
  onSeek?: (time: number) => void
  /** Called when user starts dragging the scrubber (to pause audio) */
  onSeekStart?: () => void
  /** Called when user releases the scrubber (to resume audio) */
  onSeekEnd?: () => void
  repeatMode?: RepeatMode
  onShuffleToggle?: () => void
  onRepeatChange?: (mode: RepeatMode) => void
  isShuffleEnabled?: boolean
  onShowDetails?: () => void
  /** Called when user clicks the track/collection info to open collection panel */
  onOpenCollection?: () => void
  /** Compact layout for mobile - reduces vertical footprint */
  compact?: boolean
}

function NowPlayingSectionComponent({
  track,
  shouldPlay,
  isPlaying: externalIsPlaying,
  currentTime: externalCurrentTime,
  duration: externalDuration,
  isLoading: externalIsLoading = false,
  onShouldPlayChange,
  onPlayPause,
  onSeekTo,
  onNext,
  onPrevious,
  onSeek,
  onSeekStart,
  onSeekEnd,
  repeatMode = "none",
  onShuffleToggle,
  onRepeatChange,
  isShuffleEnabled,
  onShowDetails,
  onOpenCollection,
  compact = false,
}: NowPlayingSectionProps) {
  const playbackTime = usePlaybackTime()
  const isPlaying = externalIsPlaying ?? shouldPlay
  const currentTime = externalCurrentTime ?? playbackTime.currentTime
  const duration = externalDuration ?? playbackTime.duration
  const isLoading = externalIsLoading

  const [showAudioSettings, setShowAudioSettings] = useState(false)
  const { crossfadeEnabled, setCrossfadeEnabled } = useAudioSettings()

  // Scrubber state for drag handling
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubPosition, setScrubPosition] = useState(0)
  const scrubberRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const scrubPositionRef = useRef(0)
  const wasPlayingBeforeScrubRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const pendingClientXRef = useRef<number | null>(null)

  const safeDuration = Number.isFinite(duration) ? duration : 0

  // Use scrub position during drag, otherwise use actual current time
  const displayProgress = isScrubbing
    ? (scrubPosition / safeDuration) * 100
    : (safeDuration > 0 ? (currentTime / safeDuration) * 100 : 0)

  const displayTime = useMemo(() => {
    const time = isScrubbing ? scrubPosition : currentTime
    return formatDuration(Math.floor(time))
  }, [currentTime, scrubPosition, isScrubbing])
  
  // Show remaining time with minus sign (respects scrubbing position)
  const displayRemainingTime = useMemo(() => {
    const time = isScrubbing ? scrubPosition : currentTime
    const remaining = Math.max(0, Math.floor(safeDuration - time))
    return `-${formatDuration(remaining)}`
  }, [currentTime, scrubPosition, isScrubbing, safeDuration])

  const progressPercent = Math.max(0, Math.min(100, displayProgress))
  const progressStyleId = useCspStyle({ width: `${progressPercent}%` })
  const thumbStyleId = useCspStyle({ left: `${progressPercent}%` })

  // Calculate position from mouse/touch coordinates
  const calculatePosition = useCallback((clientX: number): number => {
    if (!scrubberRef.current || safeDuration === 0) return 0
    const rect = scrubberRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    return percent * safeDuration
  }, [safeDuration])

  // Update scrub position (state + ref)
  const updateScrubPosition = useCallback((pos: number) => {
    scrubPositionRef.current = pos
    setScrubPosition(pos)
  }, [])

  const flushPendingScrub = useCallback(() => {
    rafRef.current = null
    if (pendingClientXRef.current === null) return
    const next = calculatePosition(pendingClientXRef.current)
    pendingClientXRef.current = null
    updateScrubPosition(next)
  }, [calculatePosition, updateScrubPosition])

  const scheduleScrubUpdate = useCallback((clientX: number) => {
    pendingClientXRef.current = clientX
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(flushPendingScrub)
  }, [flushPendingScrub])

  const commitScrub = useCallback(() => {
    const next = Number.isFinite(scrubPositionRef.current) ? scrubPositionRef.current : 0
    onSeekTo?.(next)
    onSeek?.(next)
    onSeekEnd?.()

    // Fallback resume behavior when no explicit seek callbacks are wired
    if (!onSeekEnd && !onSeekStart && wasPlayingBeforeScrubRef.current && onShouldPlayChange) {
      setTimeout(() => {
        if (!isDraggingRef.current) {
          onShouldPlayChange(true)
        }
      }, 50)
    }
    wasPlayingBeforeScrubRef.current = false
  }, [onSeekTo, onSeek, onSeekEnd, onSeekStart, onShouldPlayChange])

  const handleScrubberPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (safeDuration === 0) return
    event.preventDefault()
    event.stopPropagation()

    scrubberRef.current?.setPointerCapture(event.pointerId)
    isDraggingRef.current = true
    setIsScrubbing(true)

    // Pause audio while scrubbing (unless parent handles seek pause)
    wasPlayingBeforeScrubRef.current = shouldPlay || isPlaying
    onSeekStart?.()
    if (!onSeekStart && wasPlayingBeforeScrubRef.current && onShouldPlayChange) {
      onShouldPlayChange(false)
    }

    updateScrubPosition(calculatePosition(event.clientX))
  }, [safeDuration, calculatePosition, updateScrubPosition, onSeekStart, onShouldPlayChange, shouldPlay, isPlaying])

  const handleScrubberPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    event.preventDefault()
    updateScrubPosition(calculatePosition(event.clientX))
  }, [calculatePosition, updateScrubPosition])

  const handleScrubberPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    event.preventDefault()
    scrubberRef.current?.releasePointerCapture(event.pointerId)
    isDraggingRef.current = false
    setIsScrubbing(false)
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      flushPendingScrub()
    }
    commitScrub()
  }, [commitScrub, flushPendingScrub])

  useEffect(() => () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  // Fallback handleSeek for keyboard/other programmatic seeking
  const handleSeek = useCallback(
    (value: number) => {
      const next = Number.isFinite(value) ? value : 0
      onSeekTo?.(next)
      onSeek?.(next)
    },
    [onSeekTo, onSeek],
  )

  const handleRepeatToggle = useCallback(() => {
    if (!onRepeatChange) return
    const nextMode: RepeatMode =
      repeatMode === "none"
        ? "track"
        : repeatMode === "track"
          ? "queue"
          : "none"
    onRepeatChange(nextMode)
  }, [onRepeatChange, repeatMode])

  const handlePlayPause = useCallback(() => {
    if (onPlayPause) {
      onPlayPause()
    } else if (onShouldPlayChange) {
      onShouldPlayChange(!shouldPlay)
    }
  }, [onPlayPause, onShouldPlayChange, shouldPlay])

  const handlePrevious = useCallback(() => {
    if (currentTime > 3 && onSeekTo) {
      onSeekTo(0)
      onSeek?.(0)
      return
    }
    onPrevious?.()
  }, [currentTime, onPrevious, onSeek, onSeekTo])

  const handleNext = useCallback(() => {
    onNext?.()
  }, [onNext])

  // Compact layout for mobile - significantly reduced vertical footprint
  if (compact) {
    return (
      <div className="w-full">
        <div className="relative w-full rounded-xl border border-white/10 bg-black/20 p-2 overflow-hidden">
          {/* Subtle Background */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(124,58,237,0.1),rgba(59,130,246,0.1))] opacity-60" />

          {track ? (
            <div className="relative z-10">
              {/* Single row: Track info left, controls centered */}
              <div className="relative flex items-center min-h-[56px]">
                {/* Track info - left aligned */}
                <button
                  type="button"
                  onClick={onOpenCollection}
                  disabled={!onOpenCollection}
                  className="flex items-center gap-2 min-w-0 max-w-[50%] hover:bg-white/5 rounded-lg p-1 -ml-1 transition focus-ring-glow touch-manipulation"
                  aria-label={onOpenCollection ? `Open ${track.collection} collection` : undefined}
                >
                  <div className="relative h-10 w-10 rounded-md overflow-hidden shadow-md shrink-0 bg-white/5">
                    <Image
                      src={track.artworkUrl || DEFAULT_ARTWORK_SRC}
                      alt={track.title}
                      fill
                      sizes="40px"
                      className="object-cover"
                      priority
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-heading font-bold text-heading-solid truncate leading-tight">{track.title}</h3>
                    <p className="text-[10px] text-white/60 truncate leading-tight">{track.collection}</p>
                  </div>
                </button>

                {/* Transport controls - shifted right to give more room to track title */}
                <div className="absolute left-[58%] top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="h-9 w-9 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white focus-ring-glow transition touch-manipulation"
                    aria-label="Previous track"
                  >
                    <SkipBack className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="w-11 h-11 rounded-full bg-linear-to-br from-white to-gray-300 flex items-center justify-center text-black shadow-[0_0_12px_rgba(255,255,255,0.25)] hover:scale-105 transition-all focus-ring-glow touch-manipulation"
                    aria-label={isPlaying ? "Pause" : "Play"}
                    aria-pressed={isPlaying}
                  >
                    {isPlaying ? <Pause className="h-4 w-4 fill-current" aria-hidden="true" /> : <Play className="h-4 w-4 fill-current ml-0.5" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="h-9 w-9 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white focus-ring-glow transition touch-manipulation"
                    aria-label="Next track"
                  >
                    <SkipForward className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Scrubber with integrated time */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-accessible w-8 text-right tabular-nums">{displayTime}</span>
                <div
                  ref={scrubberRef}
                  className="group/scrubber relative flex-1 h-6 cursor-pointer touch-none flex items-center focus-ring"
                  onPointerDown={handleScrubberPointerDown}
                  onPointerMove={handleScrubberPointerMove}
                  onPointerUp={handleScrubberPointerUp}
                  onPointerCancel={handleScrubberPointerUp}
                  role="slider"
                  aria-label="Seek position"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(displayProgress)}
                  aria-valuetext={`${displayTime}, ${displayRemainingTime} remaining`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (safeDuration === 0) return
                    let newTime = currentTime
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault()
                      newTime = Math.max(0, currentTime - safeDuration * 0.05)
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault()
                      newTime = Math.min(safeDuration, currentTime + safeDuration * 0.05)
                    } else {
                      return
                    }
                    handleSeek(newTime)
                  }}
                >
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full gradient-4 ${isScrubbing ? '' : 'transition-[width] duration-75 ease-linear'}`}
                      data-csp-style={progressStyleId}
                    />
                  </div>
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.5)] ${isScrubbing ? 'scale-125' : 'scale-100 opacity-0 group-hover/scrubber:opacity-100 transition-all duration-150'}`}
                    data-csp-style={thumbStyleId}
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-accessible w-10 text-right tabular-nums">{displayRemainingTime}</span>
              </div>

              {/* Secondary controls row - slightly larger icons with more spacing */}
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onShuffleToggle}
                  className={clsx(
                    "h-9 w-9 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center transition focus-ring-glow touch-manipulation",
                    isShuffleEnabled ? "text-cyan-400" : "text-muted-accessible hover:text-white/80"
                  )}
                  aria-label="Toggle shuffle"
                  aria-pressed={isShuffleEnabled}
                >
                  <Shuffle className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleRepeatToggle}
                  className={clsx(
                    "h-9 w-9 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center transition focus-ring-glow touch-manipulation",
                    repeatMode !== "none" ? "text-cyan-400" : "text-muted-accessible hover:text-white/80"
                  )}
                  aria-label={`Repeat: ${repeatMode === "none" ? "off" : repeatMode}`}
                >
                  {repeatMode === "track" ? <Repeat1 className="h-5 w-5" aria-hidden="true" /> : <Repeat className="h-5 w-5" aria-hidden="true" />}
                </button>
                <ShareButton track={track} size="sm" variant="icon" className="text-muted-accessible hover:text-white/80" />
                {onShowDetails && (
                  <button
                    type="button"
                    onClick={onShowDetails}
                    className="h-9 w-9 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-muted-accessible hover:text-white/80 transition focus-ring-glow touch-manipulation"
                    aria-label="Track info"
                  >
                    <Info className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAudioSettings(true)}
                  className="h-9 w-9 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-muted-accessible hover:text-white/80 transition focus-ring-glow touch-manipulation"
                  aria-label="Audio settings"
                >
                  <Settings className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex items-center gap-3 py-2">
              <div className="w-11 h-11 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                <Play className="h-5 w-5 opacity-40" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-heading font-bold text-heading-solid">Choose a track</p>
                <p className="text-[11px] text-muted-accessible">Browse or search</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAudioSettings(true)}
                className="h-9 w-9 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition focus-ring-glow touch-manipulation"
                aria-label="Audio settings"
              >
                <Settings className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        <AudioSettingsModal
          isOpen={showAudioSettings}
          onClose={() => setShowAudioSettings(false)}
          crossfadeEnabled={crossfadeEnabled}
          onCrossfadeChange={setCrossfadeEnabled}
        />
      </div>
    )
  }

  // Full layout for desktop
  return (
    <div className="w-full">
      <div className="relative w-full rounded-2xl sm:rounded-3xl border border-white/15 bg-black/15 p-2 sm:p-2.5 md:p-3 min-h-[112px] sm:min-h-[130px] md:min-h-[150px] overflow-hidden group">
        {/* Cinematic Background */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(124,58,237,0.15),rgba(59,130,246,0.15))] opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        <div className="pointer-events-none absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.1),transparent_50%)]" />

        {track ? (
          <>
            <div className="relative z-10 mb-2 sm:mb-2.5 md:mb-3 flex items-start gap-2.5 sm:gap-3">
              <div className="relative h-14 w-14 rounded-md overflow-hidden shadow-lg shrink-0 bg-white/5">
                <Image
                  src={track.artworkUrl || DEFAULT_ARTWORK_SRC}
                  alt={track.title}
                  fill
                  sizes="56px"
                  className="object-cover transition-opacity duration-300"
                  priority
                />
              </div>
              <button
                type="button"
                onClick={onOpenCollection}
                disabled={!onOpenCollection}
                className="min-w-0 flex-1 pt-0.5 text-left group/info transition-all rounded-lg -mx-1 px-1 hover:bg-white/5 focus-ring-glow disabled:cursor-default disabled:hover:bg-transparent"
                aria-label={onOpenCollection ? `Open ${track.collection} collection` : undefined}
              >
                <h3 className="text-base font-heading font-bold text-heading-solid truncate tracking-wide group-hover/info:text-cyan-200 transition-colors">{track.title}</h3>
                <p className="text-xs text-(--text-muted) truncate font-medium group-hover/info:text-white/70 transition-colors">{track.collection}</p>
              </button>
              <div className="flex items-center gap-1 -mr-1">
                <ShareButton track={track} size="sm" variant="icon" />
                {onShowDetails && (
                  <button
                    type="button"
                    onClick={onShowDetails}
                    className="inline-flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/60 transition hover:text-white hover:bg-white/10 focus-ring-glow touch-manipulation"
                    aria-label="Track info"
                  >
                    <Info className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAudioSettings(true)}
                  className="inline-flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/60 transition hover:text-white hover:bg-white/10 focus-ring-glow touch-manipulation"
                  aria-label="Audio settings"
                >
                  <Settings className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="relative z-10">
              {/* Controls Row */}
              <div className="flex items-center justify-between mb-2 sm:mb-2.5 md:mb-3">
                <button
                  type="button"
                  onClick={onShuffleToggle}
                  className={clsx(
                    "focus-ring-glow transition p-2 min-h-[44px] min-w-[44px] rounded-full hover:bg-white/5 touch-manipulation flex items-center justify-center",
                    isShuffleEnabled ? "text-cyan-400" : "text-white/60 hover:text-white"
                  )}
                  aria-label="Toggle shuffle"
                  aria-pressed={isShuffleEnabled}
                >
                  <Shuffle className="h-5 w-5" aria-hidden="true" />
                </button>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="text-white/70 hover:text-white focus-ring-glow transition transform hover:scale-110"
                    aria-label="Previous track"
                  >
                    <SkipBack className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="w-12 h-12 rounded-full bg-linear-to-br from-white to-gray-300 flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-105 transition-all focus-ring-glow"
                    aria-label={isPlaying ? "Pause" : "Play"}
                    aria-pressed={isPlaying}
                  >
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" aria-hidden="true" /> : <Play className="h-5 w-5 fill-current ml-0.5" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="text-white/70 hover:text-white focus-ring-glow transition transform hover:scale-110"
                    aria-label="Next track"
                  >
                    <SkipForward className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRepeatToggle}
                  className={clsx(
                    "focus-ring-glow transition relative p-2 min-h-[44px] min-w-[44px] rounded-full hover:bg-white/5 touch-manipulation flex items-center justify-center",
                    repeatMode !== "none" ? "text-cyan-400" : "text-white/60 hover:text-white"
                  )}
                  aria-label={`Repeat: ${repeatMode === "none" ? "off" : repeatMode}`}
                >
                  {repeatMode === "track" ? (
                    <Repeat1 className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Repeat className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Scrubber - Custom implementation that only seeks on release */}
              <div
                ref={scrubberRef}
                className="group/scrubber relative h-5 w-full cursor-pointer touch-none flex items-center py-3 focus-ring"
                onPointerDown={handleScrubberPointerDown}
                onPointerMove={handleScrubberPointerMove}
                onPointerUp={handleScrubberPointerUp}
                onPointerCancel={handleScrubberPointerUp}
                role="slider"
                aria-label="Seek position"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(displayProgress)}
                aria-valuetext={`${displayTime}, ${displayRemainingTime} remaining`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (safeDuration === 0) return
                  let newTime = currentTime
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    newTime = Math.max(0, currentTime - safeDuration * 0.05)
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    newTime = Math.min(safeDuration, currentTime + safeDuration * 0.05)
                  } else {
                    return
                  }
                  handleSeek(newTime)
                }}
              >
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full gradient-4 ${isScrubbing ? '' : 'transition-[width] duration-75 ease-linear'
                      }`}
                    data-csp-style={progressStyleId}
                  />
                </div>
                {/* White circle thumb */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)] ${isScrubbing ? 'scale-125' : 'scale-100 opacity-0 group-hover/scrubber:opacity-100 transition-all duration-150'
                    }`}
                  data-csp-style={thumbStyleId}
                />
              </div>

              <div className="flex justify-between text-[10px] font-medium text-white/60 mt-1 font-mono tracking-wider">
                <span>{displayTime}</span>
                <span>{displayRemainingTime}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="relative flex flex-col items-center justify-center h-full min-h-[112px] text-white gap-3">
            {/* Settings icon - top right, matching loaded state */}
            <button
              type="button"
              onClick={() => setShowAudioSettings(true)}
              className="absolute top-0 right-0 inline-flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/60 transition hover:text-white hover:bg-white/10 focus-ring-glow touch-manipulation"
              aria-label="Audio settings"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="w-14 h-14 rounded-full border border-white/10 bg-white/5 flex items-center justify-center shadow-inner">
              <Play className="h-6 w-6 opacity-40" aria-hidden="true" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-heading font-bold tracking-wide text-heading-solid opacity-80">Choose a track to start listening</p>
              <p className="text-[11px] text-muted-accessible">Browse collections or search the catalog.</p>
            </div>
          </div>
        )}

        <AudioSettingsModal
          isOpen={showAudioSettings}
          onClose={() => setShowAudioSettings(false)}
          crossfadeEnabled={crossfadeEnabled}
          onCrossfadeChange={setCrossfadeEnabled}
        />
      </div>
    </div>
  )
}

// Export memoized version to prevent unnecessary re-renders
export const NowPlayingSection = memo(NowPlayingSectionComponent)
