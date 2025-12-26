"use client"

import Image from "next/image"
import { Play, Pause, SkipBack, SkipForward, Loader2 } from "lucide-react"
import { IconButton } from "@/components/ui"
import { usePlaybackTime } from "@/contexts/PlayerContext"
import { DEFAULT_ARTWORK_SRC } from "@/lib/app.constants"
import type { Track } from "@/types"

interface MobileNowPlayingDockProps {
  track: Track
  isPlaying: boolean
  isLoading?: boolean
  currentTime?: number
  duration?: number
  onPlayPause: () => void
  onOpenMusic: () => void
  onNext?: () => void
  onPrevious?: () => void
}

/**
 * MobileNowPlayingDock
 *
 * Lightweight "now playing" pill shown above bottom navigation on mobile/tablet.
 * Gives instant play/pause + skip, and taps into the Music overlay for full controls.
 */
export function MobileNowPlayingDock({
  track,
  isPlaying,
  isLoading = false,
  currentTime = 0,
  duration = 0,
  onPlayPause,
  onOpenMusic,
  onNext,
  onPrevious,
}: MobileNowPlayingDockProps) {
  const playbackTime = usePlaybackTime()
  const effectiveCurrentTime = currentTime || playbackTime.currentTime
  const effectiveDuration = duration || playbackTime.duration
  const progress = effectiveDuration > 0 ? (effectiveCurrentTime / effectiveDuration) * 100 : 0

  return (
    <div
      className="fixed inset-x-0 z-[90] px-3 safe-area-x"
      style={{ bottom: "calc(var(--mobile-nav-height, 72px) + env(safe-area-inset-bottom) + 12px)" }}
      aria-label="Now playing"
    >
      <div
        className={`
          relative flex items-center gap-3 rounded-2xl border bg-black/45 backdrop-blur-2xl px-3 py-2 
          shadow-[0_12px_32px_rgba(6,8,28,0.6)] overflow-hidden transition-all duration-500
          ${isPlaying ? "border-metadj-cyan/30" : "border-white/15"}
        `}
        role="group"
      >
        <button
          type="button"
          onClick={onOpenMusic}
          className="flex items-center gap-3 flex-1 min-w-0 text-left focus-ring-glow rounded-xl"
          aria-label="Open Music controls"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/20 shadow-md">
            <Image
              src={track.artworkUrl || DEFAULT_ARTWORK_SRC}
              alt={track.title}
              fill
              sizes="40px"
              className="object-cover"
              priority
            />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="overflow-hidden">
              <p className={`text-sm font-heading font-bold text-white ${track.title.length > 20 ? "text-marquee" : "truncate"}`}>
                {track.title}
                {track.title.length > 20 && <span className="ml-8">{track.title}</span>}
              </p>
            </div>
            <p className="text-[10px] text-white/50 truncate uppercase tracking-wider">
              {track.collection || track.artist}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0 z-10">
          {onPrevious && (
            <IconButton
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onPrevious()
              }}
              aria-label="Previous track"
              className="min-h-[44px] min-w-[44px] text-white/80 hover:bg-white/10"
              icon={<SkipBack className="h-4 w-4" />}
            />
          )}

          <IconButton
            size="md"
            variant="accent"
            onClick={(e) => {
              e.stopPropagation()
              onPlayPause()
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="text-white shadow-md"
            icon={
              isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" fill="currentColor" />
              ) : (
                <Play className="h-4 w-4" fill="currentColor" />
              )
            }
          />

          {onNext && (
            <IconButton
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onNext()
              }}
              aria-label="Next track"
              className="min-h-[44px] min-w-[44px] text-white/80 hover:bg-white/10"
              icon={<SkipForward className="h-4 w-4" />}
            />
          )}
        </div>

        {/* Compact Progress Bar at the bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-white/10 overflow-hidden">
          <div
            className="h-full brand-gradient transition-all duration-500 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      </div>
    </div>
  )
}
