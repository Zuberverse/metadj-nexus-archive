"use client"

import React, { useEffect, useRef, useState } from "react"
import { Check, Info, ListPlus } from "lucide-react"
import { AddToPlaylistButton } from "@/components/playlist"
import { ShareButton, TrackArtwork } from "@/components/ui"
import { preloadTrackOnHover } from "@/hooks/audio/use-audio-preloader"
import { getCollectionGradient, getCollectionHoverStyles } from "@/lib/collection-theme"
import { formatDuration } from "@/lib/utils"
import type { Track } from "@/types"

interface TrackCardProps {
  track: Track;
  isPlaying?: boolean;
  onClick: () => void;
  onAddToQueue?: (track: Track) => void;
  onShowDetails?: (track: Track) => void;
  positionInList?: number; // Position of track in current view (for analytics)
}

export const TrackCard = React.memo(function TrackCard({
  track,
  isPlaying = false,
  onClick,
  onAddToQueue,
  onShowDetails,
}: TrackCardProps) {
  const [showAdded, setShowAdded] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  const handleArtworkClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    // Always play from artwork click; info is a separate button now
    onClick();
  };

  const handleAddToQueue = (event: React.MouseEvent) => {
    event.stopPropagation()
    if (!onAddToQueue) return

    // Show "Added!" state
    setShowAdded(true)
    onAddToQueue(track)

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Reset after 2 seconds
    timeoutRef.current = setTimeout(() => {
      setShowAdded(false)
      timeoutRef.current = null
    }, 2000)
  };

  const handleMouseEnter = () => {
    preloadTrackOnHover(track);
  };

  const handleFocus = () => {
    preloadTrackOnHover(track);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isPlaying}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      className={`group relative w-full overflow-hidden rounded-xl sm:rounded-2xl border text-left transition-all duration-150 ease-out cursor-pointer touch-manipulation transform-gpu backdrop-blur-xl bg-black/45 hover:-translate-y-0.5 active:scale-[0.99] focus-ring before:pointer-events-none before:absolute before:inset-0 before:rounded-xl sm:before:rounded-2xl before-gradient-2-tint before:opacity-0 before:transition-all before:duration-300 before:content-[''] ${isPlaying
          ? "border-purple-400/70 gradient-2-tint motion-safe:animate-pulse-gentle before:opacity-100 will-change-transform"
          : `border-(--border-standard) ${getCollectionHoverStyles(track.collection)}`
        }`}
    >
      <div className="relative z-10 flex flex-row items-center gap-2 p-3 sm:gap-3 md:p-4">
        {/* Collection Artwork with Info Button */}
        <button
          type="button"
          onClick={handleArtworkClick}
          className="relative h-12 w-12 shrink-0 rounded-md border border-(--border-elevated) bg-(--glass-light) transition-all duration-75 group-hover:border-(--border-active) cursor-pointer focus-ring-glow"
          aria-label={`Play ${track.title}`}
        >
          <TrackArtwork
            artworkUrl={track.artworkUrl}
            title={track.title}
            sizes="48px"
            className="h-full w-full rounded-md"
            showPlayOverlay={!isPlaying}
            overlayClassName="rounded-md bg-black/0 group-hover:bg-black/35"
            playButtonClassName="w-8 h-8 sm:w-9 sm:h-9"
            playIconClassName="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5"
            hoverScale={false}
          />
        </button>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {/* HIGH Issue 1 Fix: Reduced font size on mobile for clean single-line titles */}
            {/* Mobile: text-xs, Small screens: text-sm, Desktop: text-base */}
            <h3 className="text-xs sm:text-sm md:text-base font-heading font-semibold text-heading-solid truncate drop-shadow-[0_3px_10px_rgba(16,12,42,0.35)]">
              {track.title}
            </h3>
            <span
              className={`shrink-0 text-[0.6rem] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-full border border-(--border-elevated) text-(--text-secondary) shadow-[0_0_12px_rgba(80,40,140,0.3)] inline-flex items-center gap-1 ${getCollectionGradient(track.collection)}`}
            >
              {track.collection}
            </span>
          </div>
          {/* WCAG 2.1 AA - CRITICAL FIX #2: Improved color contrast */}
          {/* Changed text-white/70 to text-white/75 for 4.5:1 contrast ratio compliance */}
          <div className="flex items-center gap-2 text-xs text-(--text-muted)">
            <span className="truncate">{track.artist}</span>
            {track.duration && (
              <>
                <span className="text-(--text-subtle)">•</span>
                <span className="tabular-nums shrink-0">{formatDuration(track.duration)}</span>
              </>
            )}
            {track.genres && track.genres.length > 0 && (
              <>
                <span className="text-white/40">•</span>
                <span className="text-(--text-muted) shrink-0">
                  {track.genres[0]}
                  <span className="hidden xs:inline">
                    {track.genres.slice(1, 2).map((genre) => ` · ${genre}`)}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {(onShowDetails || onAddToQueue) && (
          <div className="shrink-0 flex items-center justify-end gap-1.5 sm:gap-2">
            {onShowDetails && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onShowDetails(track);
                }}
                onMouseDown={(event) => event.preventDefault()}
                className="inline-flex items-center justify-center rounded-full border border-(--border-elevated) text-(--text-secondary) transition-all duration-75 hover:bg-(--glass-strong) hover:border-(--border-active) hover:text-white focus-ring-glow touch-manipulation h-11 w-11"
                aria-label={`Show details for ${track.title}`}
              >
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <AddToPlaylistButton trackId={track.id} trackTitle={track.title} />
            <ShareButton track={track} size="xxs" variant="icon" />
            {onAddToQueue && (
              <button
                type="button"
                onClick={handleAddToQueue}
                onMouseDown={(event) => event.preventDefault()}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-medium transition-all duration-200 focus-ring-glow whitespace-nowrap ${showAdded
                    ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-200"
                    : "border-(--border-elevated) bg-(--glass-light) text-(--text-secondary) hover:border-(--border-active) hover:text-white hover:bg-white/10"
                  }`}
                aria-label={showAdded ? "Track added to queue" : `Add ${track.title} to queue`}
                disabled={showAdded}
              >
                {showAdded ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Added</span>
                  </>
                ) : (
                  <>
                    <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Add to Queue</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* UX-1: Prominent visual feedback overlay when adding to queue - BRAND ALIGNED */}
      {showAdded && (
        <div className="absolute inset-0 flex items-center justify-center bg-purple-900/40 rounded-xl sm:rounded-2xl backdrop-blur-xs pointer-events-none z-20 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-2 brand-gradient px-4 py-2 rounded-full text-white font-semibold shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-white/20">
            <Check className="h-5 w-5" aria-hidden="true" />
            Added to queue
          </div>
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  // Return false if props changed (allow re-render)
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.isPlaying === nextProps.isPlaying
    // Note: onClick and onAddToQueue are callback functions
    // Comparing them would always return false
    // We assume parent memoizes these callbacks
  );
});
