'use client'

import Image from "next/image"
import { clsx } from "clsx"
import { ChevronRight } from "lucide-react"
import { getMoodChannelIcon } from "@/components/mood/MoodChannelIcons"
import { SearchBar } from "@/components/search/SearchBar"
import { COLLECTION_NARRATIVES } from "@/data/collection-narratives"
import { MOOD_CHANNELS, getTracksForMoodChannel, getMoodChannelHoverStyles } from "@/data/moodChannels"
import { FEATURE_MOOD_CHANNELS, RECENTLY_PLAYED_COLLECTION_ID } from "@/lib/app.constants"
import { getCollectionHoverStyles } from "@/lib/collection-theme"
import type { Collection, Track } from "@/types"

interface BrowseViewProps {
  collections: Collection[]
  recentlyPlayed: Track[]
  allTracks: Track[]
  onCollectionSelect: (collectionId: string) => void
  onMoodChannelSelect: (channelId: string) => void
  getCollectionArtwork: (collectionId: string) => string
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  onSearchResultsChange: (results: Track[]) => void
  currentTrack: Track | null
  onSearchSelect: (track: Track) => void
  onSearchQueueAdd: (track: Track) => void
}

/**
 * Browse view showing Featured card, Collections grid, and Mood Channels.
 * Main navigation view for exploring music content.
 */
export function BrowseView({
  collections,
  recentlyPlayed,
  allTracks,
  onCollectionSelect,
  onMoodChannelSelect,
  getCollectionArtwork,
  searchQuery,
  onSearchQueryChange,
  onSearchResultsChange,
  currentTrack,
  onSearchSelect,
  onSearchQueueAdd,
}: BrowseViewProps) {
  const recentlyPlayedCount = recentlyPlayed.length

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-1 pb-1.5 scrollbar-hide">
      <div className="shrink-0">
        <SearchBar
          tracks={allTracks}
          collections={collections}
          currentTrack={currentTrack}
          onTrackSelect={onSearchSelect}
          onTrackQueueAdd={onSearchQueueAdd}
          onCollectionSelect={(collection) => {
            onCollectionSelect(collection.id)
            onSearchQueryChange("")
            onSearchResultsChange([])
          }}
          value={searchQuery}
          onValueChange={onSearchQueryChange}
          onResultsChange={onSearchResultsChange}
          className="w-full"
          inputId="metadj-left-panel-search-input"
        />
      </div>

      {/* Featured Card */}
      <button
        type="button"
        className={clsx(
          "group relative shrink-0 overflow-hidden rounded-xl bg-linear-to-br from-purple-800/30 via-violet-900/25 to-indigo-900/20 pl-4 pr-2 py-2 transition-all duration-300 text-left focus-ring-glow",
          getCollectionHoverStyles("featured")
        )}
        onClick={() => onCollectionSelect("featured")}
        aria-label="Open Featured collection"
      >
        <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="flex-1">
            <h3 className="text-sm font-heading font-bold text-heading-solid tracking-wide">
              Featured
            </h3>
            <p className="text-xs text-white/70 truncate group-hover:text-white/85">Curated highlights</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </div>
      </button>

      {/* Recently Played (local history) */}
      <button
        type="button"
        className={clsx(
          "group relative shrink-0 overflow-hidden rounded-xl bg-linear-to-br from-purple-900/25 via-indigo-900/20 to-cyan-900/15 pl-4 pr-2 py-2 transition-all duration-300 text-left focus-ring-glow",
          getCollectionHoverStyles(RECENTLY_PLAYED_COLLECTION_ID)
        )}
        onClick={() => onCollectionSelect(RECENTLY_PLAYED_COLLECTION_ID)}
        aria-label="Open Recently Played"
      >
        <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-heading font-bold text-heading-solid tracking-wide">
              Recently Played
            </h3>
            <p className="text-xs text-white/70 truncate group-hover:text-white/85">
              {recentlyPlayedCount > 0
                ? "Continue your flow"
                : "Your listening flow starts here"}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </div>
      </button>

      {/* Collections Grid */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-heading-solid uppercase tracking-widest px-1">Collections</h3>
        <div className="space-y-2">
          {collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              onClick={() => onCollectionSelect(collection.id)}
              className={clsx(
                "group flex w-full items-center gap-3 rounded-xl border border-(--border-subtle) bg-white/3 px-2 py-2 transition-all duration-200 text-left focus-ring-glow",
                getCollectionHoverStyles(collection.id)
              )}
              aria-label={`Open collection ${collection.title}`}
            >
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-md shrink-0 group-hover:scale-105 transition-transform">
                <Image
                  src={getCollectionArtwork(collection.id)}
                  alt={collection.title}
                  fill
                  sizes="(max-width: 640px) 40px, 48px"
                  className="object-cover"
                  priority
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-heading font-bold text-heading-solid truncate">
                  {collection.title}
                </p>
                <p className="text-xs text-white/70 truncate group-hover:text-white/85">
                  {COLLECTION_NARRATIVES[collection.id]?.subtitle || "Original collection"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Mood Channels - Temporarily disabled (FEATURE_MOOD_CHANNELS) */}
      {FEATURE_MOOD_CHANNELS && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-heading-solid uppercase tracking-widest px-1">Mood Channels</h3>
          <div className="space-y-2">
            {MOOD_CHANNELS.map((channel) => {
              const matchingIds = getTracksForMoodChannel(channel, allTracks)
              const trackCount = matchingIds.length
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => trackCount > 0 && onMoodChannelSelect(channel.id)}
                  disabled={trackCount === 0}
                  className={clsx(
                    "group flex w-full items-center gap-3 rounded-xl border px-2 py-2 transition-all duration-200 text-left focus-ring-glow",
                    trackCount === 0
                      ? "border-(--border-subtle) bg-white/2 opacity-50 cursor-not-allowed"
                      : clsx("border-(--border-standard) bg-white/3", getMoodChannelHoverStyles(channel.id))
                  )}
                  aria-label={`Open mood channel ${channel.name}`}
                >
                  <div className={clsx(
                    "h-12 w-12 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform bg-gradient-to-br",
                    channel.gradient
                  )}>
                    {(() => {
                      const IconComponent = getMoodChannelIcon(channel.id)
                      return IconComponent ? (
                        <IconComponent size={24} className="text-white drop-shadow-lg" />
                      ) : null
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-heading font-bold text-heading-solid truncate opacity-80 group-hover:opacity-100">
                      {channel.name}
                    </p>
                    <p className="text-xs text-white/70 truncate group-hover:text-white/85">
                      {trackCount} tracks - Energy {channel.energyLevel}/10
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-colors" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
