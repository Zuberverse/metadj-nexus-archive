"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Info, X } from "lucide-react"
import { SearchBar } from "@/components/search/SearchBar"
import { ShareButton, ToggleButton } from "@/components/ui"
import { ConfirmDialog } from "@/components/ui/Modal"
import { useToast } from "@/contexts/ToastContext"
import { usePanelPosition } from "@/hooks/use-panel-position"
import { useResponsivePanels } from "@/hooks/use-responsive-panels"
import { useSwipeGesture } from "@/hooks/use-swipe-gesture"
import { PANEL_POSITIONING } from "@/lib/app.constants"
import { CollectionArtwork } from "./CollectionArtwork"
import { PlaybackControls } from "./PlaybackControls"
import { ProgressBar } from "./ProgressBar"
import { QueueList } from "./QueueList"
import { SearchResultsOverlay } from "./SearchResultsOverlay"
import { TrackInsight } from "./TrackInsight"
import { VolumeControl } from "./VolumeControl"
import type { Track, RepeatMode } from "@/types"

interface ControlPanelOverlayProps {
  isOpen: boolean
  headerHeight: number
  bottomOffset?: number // Now optional, will use shared constant
  track: Track | null
  queueItems: Track[]
  allTracks: Track[] // For search functionality
  currentCollectionTitle: string
  hasQueue: boolean
  isPlaying: boolean
  isLoading: boolean
  isShuffleEnabled: boolean
  repeatMode?: RepeatMode
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  onBeginSeek?: () => void
  onEndSeek?: () => void
  onPlayPause: () => void
  onNext?: () => void
  onPrevious?: () => void
  onShuffleToggle?: () => void
  onRepeatToggle?: () => void
  onQueueClear?: () => void
  onQueueRemove?: (trackId: string) => void
  onQueueInsert?: (tracks: Track[], index: number) => void
  onQueueReorder?: (fromIndex: number, toIndex: number) => void
  onQueueTrackSelect?: (trackId: string) => void
  onSearchTrackSelect?: (track: Track) => void // Play track from search
  onSearchTrackQueueAdd?: (track: Track) => void // Add track to queue from search

  // Volume controls
  volume?: number
  isMuted?: boolean
  onVolumeChange?: (volume: number) => void
  onMuteToggle?: () => void

  onClose?: () => void
  // Audio error state
  audioError?: string | null
  audioErrorRetries?: number
  audioErrorAt?: number | null
  overallLevel?: number
}

export function ControlPanelOverlay({
  isOpen,
  headerHeight,
  bottomOffset, // Kept for backward compatibility but ignored
  track,
  queueItems,
  allTracks,
  currentCollectionTitle,
  hasQueue,
  isPlaying,
  isLoading,
  isShuffleEnabled,
  repeatMode = 'none',
  currentTime,
  duration,
  onSeek,
  onBeginSeek,
  onEndSeek,
  onPlayPause,
  onNext,
  onPrevious,
  onShuffleToggle,
  onRepeatToggle,
  onQueueClear,
  onQueueRemove,
  onQueueInsert,
  onQueueReorder,
  onQueueTrackSelect,
  onSearchTrackSelect,
  onSearchTrackQueueAdd,
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,

  onClose,
  audioError,
  audioErrorRetries,
  audioErrorAt,
  overallLevel = 0,
}: ControlPanelOverlayProps) {
  const [showTrackInfo, setShowTrackInfo] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const { shouldUseSidePanels } = useResponsivePanels()
  const position = usePanelPosition(headerHeight, { clampToHeader: !shouldUseSidePanels })
  const overlayRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Use dedicated seek handlers from useAudioPlayback to properly gate auto-resume
  const handleSeekStart = useCallback(() => {
    onBeginSeek?.()
  }, [onBeginSeek])

  const handleSeekEnd = useCallback(() => {
    onEndSeek?.()
  }, [onEndSeek])

  // Convert percentage (0-1) from ProgressBar to seconds for seekTo
  const handleSeek = useCallback((percent: number) => {
    const timeInSeconds = percent * duration
    onSeek(timeInSeconds)
  }, [duration, onSeek])

  // Handle queue clear request (shows confirmation)
  const requestQueueClear = useCallback(() => {
    if (!onQueueClear || queueItems.length === 0) return
    setShowClearConfirm(true)
  }, [onQueueClear, queueItems.length])

  // Execute queue clear after confirmation
  const handleQueueClearConfirm = useCallback(() => {
    if (!onQueueClear) return

    // Capture current queue state before clearing
    const clearedTracks = [...queueItems]

    // Clear the queue
    onQueueClear()
    setShowClearConfirm(false)

    // Show undo toast if we have the insert callback
    if (onQueueInsert) {
      showToast({
        message: `Cleared ${clearedTracks.length} ${clearedTracks.length === 1 ? 'track' : 'tracks'}`,
        variant: "info",
        action: {
          label: "Undo",
          onClick: () => onQueueInsert(clearedTracks, 0)
        }
      })
    }
  }, [queueItems, onQueueClear, onQueueInsert, showToast])

  // Mobile swipe-to-dismiss gesture
  useSwipeGesture(overlayRef, {
    onSwipeDown: onClose,
    minSwipeDistance: 80,
    maxCrossAxisDistance: 150,
  })

  // Close with Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showClearConfirm) {
          setShowClearConfirm(false)
        } else {
          onClose?.()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, showClearConfirm])

  if (!isOpen) return null

  return (
    <>
      <div
        ref={overlayRef}
        className={`pointer-events-auto fixed left-1/2 -translate-x-1/2 ${position.widthClass} px-4 sm:px-6 xl:px-8`}
        style={{
          ...position.containerStyles,
          zIndex: PANEL_POSITIONING.OVERLAY.Z_INDEX,
        }}
      >
        <div className="relative mx-auto w-full">
          <div className="radiant-panel relative w-full max-h-full min-h-[360px] overflow-hidden rounded-[22px] border border-white/20 gradient-media">
            {/* Global Aura Glow */}
            <div
              className="absolute inset-x-0 top-0 h-64 -translate-y-1/2 opacity-30 blur-[100px] pointer-events-none transition-transform duration-100"
              style={{
                background: 'radial-gradient(circle, #6076ff 0%, transparent 70%)',
                transform: `scale(${1 + overallLevel * 0.4}) translateX(-50%)`,
                left: '50%'
              }}
            />
            {/* Note: .radiant-panel handles the before/after pseudo-elements via CSS */}

            <div className="relative z-10 flex h-full min-h-0 flex-col gap-4 p-4 sm:p-5 pt-1.5 sm:pt-5 backdrop-blur-3xl bg-[rgba(11,15,38,0.85)] safe-area-x pb-[max(1rem,env(safe-area-inset-bottom))] max-w-3xl mx-auto w-full">
              {/* Pull-down indicator for mobile affordance */}
              <div className="sm:hidden pull-indicator" aria-hidden="true" />
              {track ? (
                <>
                  {/* Search Bar */}
                  <div className="shrink-0 control-panel-search">
                    <SearchBar
                      inputId="metadj-control-panel-search-input"
                      tracks={allTracks}
                      currentTrack={track}
                      onTrackSelect={(selectedTrack) => {
                        onSearchTrackSelect?.(selectedTrack)
                        setSearchQuery("")
                      }}
                      onTrackQueueAdd={(selectedTrack) => {
                        onSearchTrackQueueAdd?.(selectedTrack)
                      }}
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                      onResultsChange={setSearchResults}
                      className="w-full"
                    />
                  </div>

                  {/* Custom Search Results Overlay - Covers Queue */}
                  {searchQuery && (
                    <SearchResultsOverlay
                      results={searchResults}
                      currentTrackId={track.id}
                      onClose={() => setSearchQuery("")}
                      onTrackSelect={(selectedTrack) => {
                        onSearchTrackSelect?.(selectedTrack)
                        setSearchQuery("")
                      }}
                      onQueueAdd={(selectedTrack) => {
                        onSearchTrackQueueAdd?.(selectedTrack)
                      }}
                    />
                  )}

                  {!showTrackInfo ? (
                    <QueueList
                      queueItems={queueItems}
                      currentCollectionTitle={currentCollectionTitle}
                      onQueueReorder={onQueueReorder}
                      onQueueTrackSelect={onQueueTrackSelect}
                      onQueueRemove={onQueueRemove}
                      onQueueClear={requestQueueClear}
                      hasQueue={hasQueue}
                    />
                  ) : (
                    <TrackInsight track={track} />
                  )}

                  <div className="mt-2.5 sm:mt-3 rounded-[18px] border border-white/20 bg-[rgba(6,8,28,0.9)] px-4 py-3 sm:px-5 sm:py-4 shadow-[0_14px_32px_rgba(6,8,28,0.55)]">
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {audioError && (
                        <div className="rounded-xl border border-(--border-subtle) bg-(--glass-strong) px-4 py-3 text-sm text-(--text-secondary)">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-white">Audio stream unavailable</span>
                            {audioErrorAt && (
                              <span className="text-xs text-(--text-muted)">
                                {new Date(audioErrorAt).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-(--text-subtle)">
                            Playback will auto-skip. Tap play again or try a different track if it persists.
                          </p>
                          {typeof audioErrorRetries === "number" && audioErrorRetries > 0 && (
                            <p className="mt-1 text-xs text-(--text-muted)">
                              Retries: {audioErrorRetries}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 md:max-w-[40%]">
                          <CollectionArtwork
                            src={track.artworkUrl}
                            alt={track.title}
                            size="small"
                            showLoading={true}
                          />
                          <div className="min-w-0">
                            <p className="text-[0.65rem] uppercase tracking-[0.24em] text-white/70">Now playing</p>
                            <p className="truncate text-base sm:text-lg font-heading font-semibold text-white">{track.title}</p>
                            <p className="truncate text-xs sm:text-sm text-white/70">{currentCollectionTitle || track.artist}</p>
                          </div>
                        </div>
                        <div className="flex flex-1 items-center justify-center gap-3 sm:gap-4">
                          <PlaybackControls
                            track={track}
                            isPlaying={isPlaying}
                            isLoading={isLoading}
                            isShuffleEnabled={isShuffleEnabled}
                            repeatMode={repeatMode}
                            onPlay={onPlayPause}
                            onPause={onPlayPause}
                            onNext={onNext}
                            onPrevious={onPrevious}
                            onShuffleToggle={onShuffleToggle}
                            onRepeatToggle={onRepeatToggle}
                            hasQueue={hasQueue}
                            overallLevel={overallLevel}
                          />
                        </div>
                        <div className="flex items-center justify-center gap-2">

                          <ShareButton track={track} size="md" variant="icon" />
                          <ToggleButton
                            isActive={showTrackInfo}
                            onClick={() => setShowTrackInfo((prev) => !prev)}
                            activeVariant="accent"
                            inactiveVariant="secondary"
                            className={`min-h-[44px] min-w-[44px] rounded-full border transition focus-ring-glow touch-manipulation ${!showTrackInfo && "border-white/20 text-white/80 hover:bg-white/10 hover:border-white/40"
                              }`}
                            aria-label={showTrackInfo ? "Hide track insight" : "Show track insight"}
                            leftIcon={showTrackInfo ? <X className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                            size="icon-md"
                          />
                        </div>
                      </div>
                      <ProgressBar
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={handleSeek}
                        onSeekStart={handleSeekStart}
                        onSeekEnd={handleSeekEnd}
                        className="mt-1 sm:mt-2"
                      />

                      {typeof volume === "number" && typeof isMuted === "boolean" && onVolumeChange && onMuteToggle && (
                        <div className="mt-2 flex justify-center md:justify-end">
                          <VolumeControl
                            volume={volume}
                            isMuted={isMuted}
                            onVolumeChange={onVolumeChange}
                            onMuteToggle={onMuteToggle}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center px-4">
                  <p className="text-sm sm:text-base font-semibold text-white/90">Select a track to start a session</p>
                  <p className="text-xs sm:text-sm text-white/70">Queue management and playback controls will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleQueueClearConfirm}
        title="Clear Queue"
        message="Are you sure you want to clear the queue? This will remove all tracks and cannot be fully undone if you navigate away."
        confirmText="Clear Queue"
        variant="destructive"
      />
    </>
  )
}
