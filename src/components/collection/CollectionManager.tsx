"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronUp, Music } from "lucide-react"
import { CollectionHeader } from "@/components/collection/CollectionHeader"
import { TrackCard } from "@/components/playlist/TrackCard"
import { EmptyState } from "@/components/ui"
import { COLLECTION_NARRATIVES } from "@/data/collection-narratives"
import {
  trackCollectionViewed,
  trackCollectionBrowsed,
  trackTrackCardClicked,
  trackTrackInfoIconClicked,
  trackAddToQueueClicked,
} from "@/lib/analytics"
import { logger } from "@/lib/logger"
import { getTracksByCollection } from "@/lib/music"
import type { Track } from "@/lib/music"

interface Collection {
  id: string
  title: string
}

interface CollectionManagerProps {
  selectedCollection: string
  onCollectionChange: (collectionId: string) => void
  tracks: Track[]
  featuredTrackIds: readonly string[]
  currentTrack: Track | null
  shouldPlay: boolean
  onTrackClick: (track: Track) => void
  onTrackQueueAdd: (track: Track) => void
  onShowTrackDetails?: (track: Track) => void
  collections: Collection[]
  queue?: Track[]  // Optional queue for analytics tracking
  onInfoOpen?: () => void  // Handler for info button
}

export function CollectionManager({
  selectedCollection,
  onCollectionChange,
  tracks,
  featuredTrackIds,
  currentTrack,
  shouldPlay,
  onTrackClick,
  onTrackQueueAdd,
  onShowTrackDetails,
  collections,
  queue = [],
  onInfoOpen,
}: CollectionManagerProps) {
  // Track previous collection for analytics
  const previousCollectionRef = useRef<string>(selectedCollection)

  // About this collection state
  const [showCollectionDescription, setShowCollectionDescription] = useState(false)

  // Reset collection description when collection changes
  useEffect(() => {
    setShowCollectionDescription(false)
  }, [selectedCollection])

  // Compute collection tracks with Featured/All interleaving logic
  const collectionTracks = useMemo(() => {
    if (selectedCollection === "featured") {
      return featuredTrackIds
        .map((id) => tracks.find((track) => track.id === id))
        .filter((track): track is Track => track !== undefined)
    }

    if (selectedCollection) {
      return getTracksByCollection(selectedCollection, tracks)
    }

    return [...tracks]
  }, [selectedCollection, featuredTrackIds, tracks])

  // Use collection tracks regardless of search query (search only affects dropdown)
  const visibleTracks = collectionTracks

  // ANALYTICS: Track collection browsed event when collection changes
  useEffect(() => {
    // Only track when the collection actually changes
    if (previousCollectionRef.current === selectedCollection) return
    
    try {
      const collectionTitle = collections.find((c) => c.id === selectedCollection)?.title || selectedCollection
      const previousCollection = previousCollectionRef.current

      trackCollectionViewed({
        collectionId: selectedCollection,
        collectionTitle,
        trackCount: visibleTracks.length,
        ...(previousCollection && { previousCollection }),
      })

      // Update previous collection reference
      previousCollectionRef.current = selectedCollection
    } catch (error) {
      logger.warn('Analytics: Failed to track collection viewed', { error: String(error) })
    }
  }, [selectedCollection]) // Only depend on selectedCollection, not visibleTracks.length

  // ANALYTICS: Track collection browsed when tracks render (user viewing track list)
  useEffect(() => {
    if (visibleTracks.length === 0) return

    try {
      const collectionTitle = collections.find((c) => c.id === selectedCollection)?.title || selectedCollection

      trackCollectionBrowsed({
        collectionId: selectedCollection,
        collectionTitle,
        trackCount: visibleTracks.length,
      })
    } catch (error) {
      logger.warn('Analytics: Failed to track collection browsed', { error: String(error) })
    }
  }, [selectedCollection]) // Only track once per collection change, not on every visibleTracks change

  // ANALYTICS: Wrapper handlers with analytics tracking
  const handleTrackClick = (track: Track, position: number) => {
    try {
      trackTrackCardClicked({
        trackId: track.id,
        trackTitle: track.title,
        collection: track.collection,
        position,
        action: 'play',
      })
    } catch (error) {
      logger.warn('Analytics: Failed to track track card clicked', { error: String(error) })
    }

    onTrackClick(track)
  }

  const handleShowTrackDetails = (track: Track) => {
    if (!onShowTrackDetails) return

    try {
      // Main track list always shows collection context (search is dropdown-only)
      const triggerSource = selectedCollection === 'featured' ? 'featured' : 'collection'

      trackTrackInfoIconClicked({
        trackId: track.id,
        trackTitle: track.title,
        collection: track.collection,
        triggerSource,
      })
    } catch (error) {
      logger.warn('Analytics: Failed to track info icon clicked', { error: String(error) })
    }

    onShowTrackDetails(track)
  }

  const handleAddToQueue = (track: Track) => {
    try {
      trackAddToQueueClicked({
        trackId: track.id,
        trackTitle: track.title,
        collection: track.collection,
        queuePositionAfterAdd: queue.length + 1,
      })
    } catch (error) {
      logger.warn('Analytics: Failed to track add to queue clicked', { error: String(error) })
    }

    onTrackQueueAdd(track)
  }

  return (
    <>
      {/* Collection Tabs */}
      <div className="mx-auto w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl px-4 sm:px-6 xl:px-8 pb-4">
        <CollectionHeader
          selectedCollection={selectedCollection}
          onCollectionChange={onCollectionChange}
          collections={collections}
        />
      </div>

      {/* About this collection */}
      {(() => {
        const description =
          COLLECTION_NARRATIVES[selectedCollection] ?? COLLECTION_NARRATIVES.featured

        if (!description.paragraphs.length) return null

        return (
          <div className="mx-auto mt-4 mb-6 w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl px-4 sm:px-6 xl:px-8">
            <div className="flex justify-center px-2">
              <button
                type="button"
                onClick={() => setShowCollectionDescription((prev) => !prev)}
                className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs sm:text-sm uppercase tracking-[0.28em] text-white/70 transition hover:border-white/35 hover:text-white sm:w-auto"
                aria-expanded={showCollectionDescription}
              >
                {showCollectionDescription ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span>Hide collection details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span>About this collection</span>
                  </>
                )}
              </button>
            </div>
            {showCollectionDescription && (
              <div className="mt-3 space-y-1.5 px-1 text-left text-white/85 sm:px-2">
                {description.paragraphs.map((paragraph, index) => (
                  <p
                    key={`${selectedCollection}-desc-${index}`}
                    className="text-sm sm:text-base leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      <div className="mx-auto w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl px-4 pb-1 sm:px-6 xl:px-8">
        {visibleTracks.length === 0 ? (
          /* Empty State */
          <div role="status" aria-live="polite">
            <EmptyState
              icon={<Music className="h-full w-full" />}
              title="No Tracks Yet"
              description="My originals will appear here once I add them to the library."
              size="lg"
              iconVariant="elevated"
              className="py-20"
            />
          </div>
        ) : (
          <div className="space-y-1">
            {visibleTracks.map((track, index) => (
              <TrackCard
                key={track.id}
                track={track}
                isPlaying={currentTrack?.id === track.id && shouldPlay}
                onClick={() => handleTrackClick(track, index)}
                onAddToQueue={handleAddToQueue}
                onShowDetails={handleShowTrackDetails}
                positionInList={index}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
