"use client"

import dynamic from 'next/dynamic'
import { Loader2 } from "lucide-react"
import { CollectionManager } from "@/components/collection/CollectionManager"
import type { Track, QueueContext } from "@/types"

const WisdomFeature = dynamic(
  () => import('@/components/wisdom/WisdomExperience').then(mod => mod.WisdomExperience),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-purple-400" />
      </div>
    )
  }
)

interface CollectionSurfaceProps {
  // Wisdom state
  isWisdomOpen: boolean

  // Collection state
  selectedCollection: string
  onCollectionChange: (collectionId: string) => void
  tabCollections: Array<{ id: string; title: string }>
  featuredTrackIds: readonly string[]
  onSearchQueryChange: (query: string) => void

  // Track list
  tracks: Track[]

  // Player state
  currentTrack: Track | null
  shouldPlay: boolean

  // Queue state
  queue: Track[]
  onQueueContextChange: (context: QueueContext) => void

  // Handlers
  onTrackClick: (track: Track, tracks?: Track[]) => void
  onTrackQueueAdd: (track: Track) => void
  onShowTrackDetails: (track: Track) => void
  onInfoOpen?: () => void  // Handler for info button
}

/**
 * CollectionSurface - Collection browsing and navigation
 *
 * Handles the main content area switching between:
 * - Wisdom (blog, guides, biography)
 * - Collection browser (tracks, search, filtering)
 *
 * Manages:
 * - Collection tab switching with analytics
 * - Search query state
 * - Queue context updates
 * - Track selection and queueing
 *
 * This component orchestrates the collection browsing experience
 * including analytics tracking for collection views.
 */
export function CollectionSurface({
  isWisdomOpen,
  selectedCollection,
  onCollectionChange,
  tabCollections,
  featuredTrackIds,
  onSearchQueryChange,
  tracks,
  currentTrack,
  shouldPlay,
  queue,
  onQueueContextChange,
  onTrackClick,
  onTrackQueueAdd,
  onShowTrackDetails,
  onInfoOpen,
}: CollectionSurfaceProps) {
  const handleCollectionChange = (collectionId: string) => {
    onSearchQueryChange("") // Clear search when manually switching collections
    onQueueContextChange("collection")
    onCollectionChange(collectionId)
  }

  return (
    <>
      {/* Main Content - Wisdom or Collections */}
      {isWisdomOpen ? (
        <WisdomFeature />
      ) : (
        <CollectionManager
          selectedCollection={selectedCollection}
          onCollectionChange={handleCollectionChange}
          tracks={tracks}
          featuredTrackIds={featuredTrackIds}
          currentTrack={currentTrack}
          shouldPlay={shouldPlay}
          onTrackClick={onTrackClick}
          onTrackQueueAdd={onTrackQueueAdd}
          onShowTrackDetails={onShowTrackDetails}
          collections={tabCollections}
          queue={queue}
          onInfoOpen={onInfoOpen}
        />
      )}
    </>
  )
}
