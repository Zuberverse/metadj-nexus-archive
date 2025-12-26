"use client"

/**
 * Recently Played Section
 *
 * Grid display of recently played tracks matching Featured Tracks layout.
 * Features:
 * - Grid layout matching Featured Tracks (up to 6 items)
 * - Quick play action
 * - Collection-aware styling
 * - Responsive grid sizing
 */

import { clsx } from "clsx"
import { History } from "lucide-react"
import { BrandGradientIcon } from "@/components/icons/BrandGradientIcon"
import { Card, EmptyState, TrackArtwork } from "@/components/ui"
import { getCollectionHoverStyles } from "@/lib/collection-theme"
import type { Track } from "@/types"

interface RecentlyPlayedRailProps {
  // Recently played tracks (most recent first)
  tracks: Track[]
  // Current playing track (for highlighting)
  currentTrack?: Track | null
  // Play a track
  onPlayTrack: (track: Track) => void
  // Optional: Maximum tracks to show (default 8 for 4x2 grid on desktop)
  maxTracks?: number
  // Optional className
  className?: string
}

export function RecentlyPlayedRail({
  tracks,
  currentTrack,
  onPlayTrack,
  maxTracks = 8,
  className = "",
}: RecentlyPlayedRailProps) {
  const displayTracks = tracks.slice(0, maxTracks)
  const isEmpty = displayTracks.length === 0

  return (
    <section className={clsx("relative", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
          <BrandGradientIcon icon={History} className="h-5 w-5" strokeWidth={2.5} />
          <span className="text-gradient-hero">Recently Played</span>
        </h2>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-900/25 via-indigo-900/20 to-cyan-900/15 backdrop-blur-xl">
          <EmptyState
            icon={<History className="h-full w-full" />}
            title="Your listening history will appear here"
            description="Start exploring to build your journey"
            size="md"
            iconVariant="subtle"
          />
        </div>
      )}

      {/* Grid Layout - 4 columns on desktop, responsive down to 2 columns on mobile */}
      {/* Max 2 rows (8 items), min-width ensures cards don't get too small */}
      {!isEmpty && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {displayTracks.map((track) => {
            const isPlaying = currentTrack?.id === track.id

            return (
              <Card
                key={track.id}
                onClick={() => onPlayTrack(track)}
                asButton
                variant="interactive"
                className={clsx(
                  "group relative flex items-center gap-3 p-2.5 pr-3 rounded-2xl bg-black/20 backdrop-blur-xl border-(--border-standard) shadow-lg transition-all duration-300 min-w-0",
                  isPlaying && "ring-2 ring-purple-500/50 bg-purple-500/10",
                  getCollectionHoverStyles(track.collection),
                )}
              >
                {/* Artwork with Play Overlay - smaller on mobile for compact fit */}
                <TrackArtwork
                  artworkUrl={track.artworkUrl}
                  title={track.title}
                  sizes="(max-width: 640px) 48px, (max-width: 1024px) 56px, 64px"
                  className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-lg shadow-md border border-(--border-subtle)"
                  imageClassName="transition duration-500 group-hover:scale-110"
                  showPlayingIndicator={true}
                  isPlaying={isPlaying}
                  playingIndicatorSize="lg"
                  playingIndicatorColor="purple"
                  playButtonClassName="p-2"
                  playIconClassName="h-4 w-4"
                />

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-heading font-bold text-gradient-hero truncate">
                    {track.title}
                  </p>
                  {/* WCAG: text-white/70 for 4.5:1 contrast on collection names */}
                  <p className="text-[10px] text-white/70 truncate uppercase tracking-wider">
                    {track.collection}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
