'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronDown, ChevronUp, Play, Shuffle, Music2 } from "lucide-react"
import { ShareButton } from "@/components/ui"
import { TrackListItem } from "@/components/ui"
import { usePlayer } from "@/contexts/PlayerContext"
import { shuffleTracks } from "@/lib/music"
import type { Track, Collection } from "@/types"

interface CollectionDetailViewProps {
  collection: Collection
  collectionTitle: string
  tracks: Track[]
  description: string
  isFeatured: boolean
  showShare?: boolean
  onBack: () => void
  onTrackPlay: (track: Track, tracks?: Track[]) => void
  onQueueAdd?: (track: Track) => void
  scrollToTrackId?: string | null
  onScrollComplete?: () => void
}

export function CollectionDetailView({
  collection,
  collectionTitle,
  tracks,
  description,
  isFeatured,
  showShare = true,
  onBack,
  onTrackPlay,
  onQueueAdd,
  scrollToTrackId,
  onScrollComplete,
}: CollectionDetailViewProps) {
  const player = usePlayer()
  const [showAbout, setShowAbout] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const trackRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())

  const setTrackRef = useCallback((trackId: string, element: HTMLDivElement | null) => {
    if (element) {
      trackRefsMap.current.set(trackId, element)
    } else {
      trackRefsMap.current.delete(trackId)
    }
  }, [])

  useEffect(() => {
    if (!scrollToTrackId || !scrollContainerRef.current) return

    const scrollToTarget = () => {
      const trackElement = trackRefsMap.current.get(scrollToTrackId)
      if (!trackElement || !scrollContainerRef.current) return

      const trackIndex = tracks.findIndex((t) => t.id === scrollToTrackId)
      const container = scrollContainerRef.current

      // Scroll the track to the top of the visible area
      if (trackIndex <= 1) {
        container.scrollTo({ top: 0, behavior: 'instant' })
      } else {
        // Use scrollIntoView for reliable positioning at the top
        trackElement.scrollIntoView({ block: 'start', behavior: 'instant' })
      }

      onScrollComplete?.()
    }

    const timeoutId = setTimeout(scrollToTarget, 200)
    return () => clearTimeout(timeoutId)
  }, [scrollToTrackId, tracks, onScrollComplete])

  const handlePlayAll = useCallback(() => {
    if (tracks.length === 0) return
    onTrackPlay(tracks[0], tracks)
  }, [tracks, onTrackPlay])

  const handleShufflePlay = useCallback(() => {
    if (tracks.length === 0) return
    const shuffled = shuffleTracks(tracks)
    onTrackPlay(shuffled[0], shuffled)
  }, [tracks, onTrackPlay])

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium text-white/70 hover:text-white transition flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/5"
        >
          <ChevronLeft className="h-3 w-3" /> Back
        </button>
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <h3 className="text-base sm:text-lg font-heading font-bold text-heading-solid text-center truncate">
            {collectionTitle}
          </h3>
        </div>
        <div className="w-[60px] flex justify-end">
          {showShare && (
            <ShareButton
              collection={collection}
              size="sm"
              variant="icon"
            />
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y space-y-2 pr-1 scrollbar-hide [-webkit-overflow-scrolling:touch]"
      >
        {(tracks.length > 0 || !isFeatured) && (
          <div className="flex flex-wrap items-center gap-2 overflow-visible">
            {!isFeatured && (
              <button
                type="button"
                onClick={() => setShowAbout((prev) => !prev)}
                className="flex flex-1 min-w-0 items-center justify-between rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-heading font-medium text-white/70 transition hover:bg-white/10 hover:text-white hover:border-white/30"
                aria-expanded={showAbout}
                aria-controls="collection-about"
              >
                <span className="truncate">About Collection</span>
                {showAbout ? (
                  <ChevronUp className="h-3 w-3 text-white/70" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-white/70" />
                )}
              </button>
            )}
            {tracks.length > 0 && (
              <div className={`flex items-center gap-4 overflow-visible ${isFeatured ? 'w-full justify-center' : ''}`}>
                <button
                  type="button"
                  onClick={handlePlayAll}
                  className="inline-flex items-center gap-1.5 rounded-full gradient-4-soft px-4 py-2 text-xs font-heading font-semibold text-white drop-shadow-[0_0_18px_rgba(95,108,255,0.45)] transition hover:drop-shadow-[0_0_24px_rgba(95,108,255,0.65)] hover:brightness-110"
                  aria-label="Start playing from the beginning of collection"
                >
                  <Play className="h-3.5 w-3.5" fill="currentColor" />
                  Start
                </button>
                <button
                  type="button"
                  onClick={handleShufflePlay}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-heading font-semibold text-white/90 transition hover:bg-white/10 hover:border-white/30"
                  aria-label="Shuffle play this collection"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Shuffle
                </button>
              </div>
            )}
          </div>
        )}
        {!isFeatured && showAbout && (
          <div
            id="collection-about"
            className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-xs text-white/70 leading-relaxed max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            {description}
          </div>
        )}
        {tracks.map((track) => {
          const isPlaying = player.currentTrack?.id === track.id && player.shouldPlay
          const isCurrent = player.currentTrack?.id === track.id
          return (
            <div
              key={track.id}
              ref={(el) => setTrackRef(track.id, el)}
            >
              <TrackListItem
                track={track}
                isCurrent={isCurrent}
                isPlaying={isPlaying}
                onPlay={() => onTrackPlay(track, tracks)}
                onQueueAdd={onQueueAdd ? () => onQueueAdd(track) : undefined}
                showShare
                useCollectionHover
              />
            </div>
          )
        })}
        {tracks.length === 0 && (
          <div className="flex flex-col items-center gap-3 text-center px-4 py-12">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center border border-white/15">
              <Music2 className="h-6 w-6 text-white/40" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-(--text-muted)">No Tracks Yet</p>
              <p className="text-xs text-muted-accessible">This collection is being curated</p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-white/10 text-(--text-muted) hover:bg-white/15 hover:text-(--text-secondary) border border-white/15 transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Browse Other Collections
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
