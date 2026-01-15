"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PlaylistList, PlaylistDetailView } from "@/components/playlist"
import { useUI } from "@/contexts/UIContext"
import { COLLECTION_NARRATIVES } from "@/data/collection-narratives"
import { MOOD_CHANNELS, getTracksForMoodChannel, sortTracksByMoodRelevance } from "@/data/moodChannels"
import { useCspStyle } from "@/hooks/use-csp-style"
import { PANEL_POSITIONING, FEATURED_TRACK_IDS, RECENTLY_PLAYED_COLLECTION_ID, RECENTLY_PLAYED_MAX_ITEMS, DEFAULT_ARTWORK_SRC } from "@/lib/app.constants"
import { BrowseView } from "./BrowseView"
import { CollectionDetailView } from "./CollectionDetailView"
import { MoodChannelDetailView } from "./MoodChannelDetailView"
import { NowPlayingSection } from "./NowPlayingSection"
import { QueueSection } from "./QueueSection"
import type { JournalSearchEntry, WisdomSearchEntry } from "@/lib/search/search-results"
import type { Collection, Track, ActiveView, RepeatMode, LeftPanelTab } from "@/types"

interface LeftPanelProps {
  queue: Track[]
  allTracks: Track[]
  recentlyPlayed?: Track[]
  onQueueReorder?: (fromIndex: number, toIndex: number) => void
  onQueueRemove?: (trackId: string) => void
  onQueueInsert?: (tracks: Track[], index: number) => void
  onSearchSelect?: (track: Track) => void
  onTrackPlay?: (track: Track, tracks?: Track[]) => void
  onSearchQueueAdd?: (track: Track) => void
  onSearchWisdomSelect?: (entry: WisdomSearchEntry) => void
  onSearchJournalSelect?: (entry: JournalSearchEntry) => void
  shuffle: boolean
  repeatMode: RepeatMode
  onShuffleToggle?: () => void
  onRepeatChange?: (mode: RepeatMode) => void
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
  nowPlayingProps: React.ComponentProps<typeof NowPlayingSection>
  collections?: Collection[]
  /** External control of mood channel selection */
  externalMoodChannelId?: string | null
  onMoodChannelChange?: (channelId: string | null) => void
  /** Force panel to render regardless of UI context panel state (for mobile overlay) */
  isMobileOverlay?: boolean
}

/**
 * Left panel component containing browse, playlists, queue, and now playing sections.
 * Manages navigation between collections, mood channels, and playback queue.
 */
export function LeftPanel({
  queue,
  allTracks,
  recentlyPlayed = [],
  onQueueReorder,
  onQueueRemove,
  onQueueInsert,
  onSearchSelect,
  onTrackPlay,
  onSearchQueueAdd,
  onSearchWisdomSelect,
  onSearchJournalSelect,
  nowPlayingProps,
  collections = [],
  externalMoodChannelId,
  onMoodChannelChange,
  isMobileOverlay = false,
}: LeftPanelProps) {
  const { panels, headerHeight, leftPanelTab, setLeftPanelTab, searchQuery, setSearchQuery, setSearchResults } = useUI()
  const activeTab: LeftPanelTab = leftPanelTab
  const setActiveTab = setLeftPanelTab
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [activeMoodChannelId, setActiveMoodChannelId] = useState<string | null>(null)
  const [queueQuery, setQueueQuery] = useState("")
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [scrollToTrackId, setScrollToTrackId] = useState<string | null>(null)
  // Ref for the panel content container (used for search dropdown alignment)
  const panelContentRef = useRef<HTMLDivElement>(null)

  // Sync with external mood channel ID when it changes
  useEffect(() => {
    if (externalMoodChannelId !== undefined && externalMoodChannelId !== activeMoodChannelId) {
      setActiveMoodChannelId(externalMoodChannelId)
      if (externalMoodChannelId) {
        setActiveTab("browse")
        setActiveCollectionId(null)
      }
    }
  }, [externalMoodChannelId, activeMoodChannelId])

  // Listen for scroll-to-track events from hub playback
  useEffect(() => {
    const handleScrollToTrack = (event: CustomEvent<{ trackId: string; collectionTitle: string }>) => {
      const { trackId, collectionTitle } = event.detail
      if (!trackId || !collectionTitle) return

      // Find the collection for this track
      const collection = collections.find((c) => c.title === collectionTitle)
      if (collection) {
        setActiveTab("browse")
        setActiveMoodChannelId(null)
        setActiveCollectionId(collection.id)
        setScrollToTrackId(trackId)
      }
    }

    window.addEventListener("metadj:scrollToTrack", handleScrollToTrack as EventListener)
    return () => {
      window.removeEventListener("metadj:scrollToTrack", handleScrollToTrack as EventListener)
    }
  }, [collections])

  // Listen for playlist open requests (MetaDJai, toasts, etc.)
  useEffect(() => {
    const handleOpenPlaylist = (event: CustomEvent<{ playlistId?: string }>) => {
      setActiveTab("playlists")
      setSelectedPlaylistId(event.detail?.playlistId ?? null)
    }

    window.addEventListener("metadj:openPlaylist", handleOpenPlaylist as EventListener)
    return () => {
      window.removeEventListener("metadj:openPlaylist", handleOpenPlaylist as EventListener)
    }
  }, [setActiveTab])

  useEffect(() => {
    const handleOpenCollection = (event: CustomEvent<{ collectionId?: string }>) => {
      const collectionId = event.detail?.collectionId
      if (!collectionId) return
      setActiveTab("browse")
      setActiveMoodChannelId(null)
      setActiveCollectionId(collectionId)
    }

    window.addEventListener("metadj:openCollection", handleOpenCollection as EventListener)
    return () => {
      window.removeEventListener("metadj:openCollection", handleOpenCollection as EventListener)
    }
  }, [setActiveTab])

  // Notify parent when mood channel changes
  const handleMoodChannelChange = useCallback((channelId: string | null) => {
    setActiveMoodChannelId(channelId)
    onMoodChannelChange?.(channelId)
  }, [onMoodChannelChange])

  // Featured tracks computation
  const featuredTracks = useMemo(
    () =>
      FEATURED_TRACK_IDS.map((id) => allTracks.find((t) => t.id === id)).filter(
        (t): t is Track => Boolean(t),
      ),
    [allTracks],
  )

  // Collection tracks for selected collection
  const collectionTracks = useMemo(() => {
    if (!activeCollectionId) return []
    if (activeCollectionId === "featured") {
      return featuredTracks
    }
    if (activeCollectionId === RECENTLY_PLAYED_COLLECTION_ID) {
      return recentlyPlayed
    }
    const collection = collections.find((c) => c.id === activeCollectionId)
    if (!collection) return []
    return allTracks.filter((track) => track.collection === collection.title)
  }, [activeCollectionId, allTracks, collections, featuredTracks, recentlyPlayed])

  // Active collection title
  const activeCollectionTitle = useMemo(() => {
    if (activeCollectionId === "featured") return "Featured"
    if (activeCollectionId === RECENTLY_PLAYED_COLLECTION_ID) return "Recently Played"
    return collections.find((c) => c.id === activeCollectionId)?.title ?? ""
  }, [activeCollectionId, collections])

  // Get collection artwork
  const getCollectionArtwork = useCallback(
    (collectionId: string) => {
      if (collectionId === "featured") {
        return ""
      }
      if (collectionId === RECENTLY_PLAYED_COLLECTION_ID) {
        return ""
      }
      return collections.find((c) => c.id === collectionId)?.artworkUrl || DEFAULT_ARTWORK_SRC
    },
    [collections],
  )

  // Get collection description
  const getCollectionDescription = useCallback(
    (collectionId: string) => {
      if (collectionId === "featured") {
        return "Curated highlights across MetaDJ originals."
      }
      if (collectionId === RECENTLY_PLAYED_COLLECTION_ID) {
        return `Your last ${RECENTLY_PLAYED_MAX_ITEMS} plays—captured locally on this device. Replay anything to bring it back to the top.`
      }
      return COLLECTION_NARRATIVES[collectionId]?.paragraphs?.join(" ") ?? "An original MetaDJ collection."
    },
    [],
  )

  // Featured collection object for ShareButton
  const featuredCollection: Collection = useMemo(() => ({
    id: "featured",
    title: "Featured",
    artist: "MetaDJ",
    type: "collection",
    releaseDate: "2025-01-01",
    trackCount: featuredTracks.length,
    artworkUrl: getCollectionArtwork("featured"),
    description: "Curated highlights across MetaDJ originals.",
  }), [featuredTracks.length, getCollectionArtwork])

  const recentlyPlayedCollection: Collection = useMemo(() => ({
    id: RECENTLY_PLAYED_COLLECTION_ID,
    title: "Recently Played",
    artist: "MetaDJ",
    type: "collection",
    releaseDate: "2025-01-01",
    trackCount: recentlyPlayed.length,
    artworkUrl: getCollectionArtwork(RECENTLY_PLAYED_COLLECTION_ID),
    description: getCollectionDescription(RECENTLY_PLAYED_COLLECTION_ID),
  }), [getCollectionArtwork, getCollectionDescription, recentlyPlayed.length])

  // Active collection object
  const activeCollection = useMemo(() => {
    if (activeCollectionId === "featured") return featuredCollection
    if (activeCollectionId === RECENTLY_PLAYED_COLLECTION_ID) return recentlyPlayedCollection
    return collections.find((c) => c.id === activeCollectionId) || null
  }, [activeCollectionId, collections, featuredCollection, recentlyPlayedCollection])

  // Mood channel data
  const activeMoodChannel = useMemo(() => {
    if (!activeMoodChannelId) return null
    return MOOD_CHANNELS.find((c) => c.id === activeMoodChannelId) || null
  }, [activeMoodChannelId])

  const moodChannelTracks = useMemo(() => {
    if (!activeMoodChannel) return []
    const matchingIds = getTracksForMoodChannel(activeMoodChannel, allTracks)
    const sortedIds = sortTracksByMoodRelevance(matchingIds, activeMoodChannel, allTracks)
    return sortedIds
      .map((id) => allTracks.find((t) => t.id === id))
      .filter((t): t is Track => Boolean(t))
  }, [activeMoodChannel, allTracks])

  // Playlist handlers
  const handlePlaylistSelect = useCallback((playlistId: string) => {
    setSelectedPlaylistId(playlistId)
  }, [])

  const handlePlaylistBack = useCallback(() => {
    setSelectedPlaylistId(null)
  }, [])

  // Track play handler
  const handleTrackPlay = useCallback((track: Track, tracks?: Track[]) => {
    (onTrackPlay ?? onSearchSelect)?.(track, tracks)
  }, [onTrackPlay, onSearchSelect])

  const isOpen = isMobileOverlay || panels.left.isOpen
  const panelStyleId = useCspStyle(
    isMobileOverlay
      ? {}
      : {
        width: `${PANEL_POSITIONING.LEFT_PANEL.WIDTH}px`,
        top: `${headerHeight}px`,
        height: `calc(100vh - ${headerHeight}px)`,
      }
  )

  return (
    <div
      role="complementary"
      aria-label="Control Panel"
      className={
        isMobileOverlay
          ? "relative h-full w-full"
          : `fixed left-0 bottom-0 z-90 transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"}`
      }
      data-csp-style={isMobileOverlay ? undefined : panelStyleId}
    >
      <div className={`relative h-full flex flex-col ${isMobileOverlay ? '' : 'border-r border-white/10'} bg-(--bg-surface-base)/90 backdrop-blur-3xl overflow-hidden`}>
        {/* Background Blobs */}
        <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[60%] bg-purple-600/5 blur-[80px] pointer-events-none" />
        <div className="absolute top-[40%] -right-[20%] w-[80%] h-[60%] bg-blue-600/5 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-linear-to-t from-[var(--bg-surface-base)] to-transparent pointer-events-none" />

        <div className="flex-1 overflow-hidden flex flex-col relative z-10 min-h-0">
          <div className={`${isMobileOverlay ? "px-2 py-1.5" : "px-3 py-2.5 md:px-4 md:py-3"} flex-1 min-h-0 flex flex-col`}>
            <div className={`relative flex-1 min-h-0 overflow-hidden shadow-inner shadow-black/50 ${isMobileOverlay ? "rounded-2xl bg-black/10" : "rounded-3xl border border-white/15 bg-black/20"}`}>
              <div className="relative h-full flex flex-col overflow-hidden">
                {/* Tab Navigation - WCAG 2.1 AA compliant tablist pattern */}
                <div
                  id="tour-music-tabs"
                  role="tablist"
                  aria-label="Panel navigation"
                  aria-orientation="horizontal"
                  className={`flex gap-2 bg-black/20 backdrop-blur-md p-1.5`}
                >
                  {(["browse", "playlists", "queue"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      id={`tab-${tab}`}
                      aria-selected={activeTab === tab}
                      aria-controls={`tabpanel-${tab}`}
                      tabIndex={activeTab === tab ? 0 : -1}
                      onClick={() => setActiveTab(tab)}
                      onKeyDown={(e) => {
                        const tabs = ["browse", "playlists", "queue"] as const
                        const currentIndex = tabs.indexOf(tab)
                        if (e.key === "ArrowRight") {
                          e.preventDefault()
                          const nextTab = tabs[(currentIndex + 1) % tabs.length]
                          setActiveTab(nextTab)
                          document.getElementById(`tab-${nextTab}`)?.focus()
                        } else if (e.key === "ArrowLeft") {
                          e.preventDefault()
                          const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length]
                          setActiveTab(prevTab)
                          document.getElementById(`tab-${prevTab}`)?.focus()
                        } else if (e.key === "Home") {
                          e.preventDefault()
                          setActiveTab("browse")
                          document.getElementById("tab-browse")?.focus()
                        } else if (e.key === "End") {
                          e.preventDefault()
                          setActiveTab("queue")
                          document.getElementById("tab-queue")?.focus()
                        }
                      }}
                      className={`flex-1 rounded-lg sm:rounded-xl py-1.5 sm:py-2 text-xs sm:text-sm font-heading font-semibold transition-all duration-300 border focus-ring ${activeTab === tab
                        ? "border-white/20 bg-linear-to-br from-white/10 to-white/5 text-white shadow-[0_0_20px_rgba(120,100,255,0.15)]"
                        : "border-white/8 text-white/70 hover:bg-white/5 hover:text-white/90"
                        }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Tab Content - tabpanel with proper ARIA attributes */}
                <div
                  role="tabpanel"
                  id={`tabpanel-${activeTab}`}
                  aria-labelledby={`tab-${activeTab}`}
                  className="flex-1 min-h-0 flex flex-col"
                >
                  {activeTab === "queue" ? (
                    <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-2.5">
                      <QueueSection
                        tracks={queue}
                        allTracks={allTracks}
                        collections={collections}
                        onReorder={onQueueReorder}
                        onRemove={onQueueRemove}
                        onInsert={onQueueInsert}
                        onSearchSelect={onSearchSelect}
                        onCollectionSelect={(collection) => {
                          setActiveTab("browse")
                          setActiveMoodChannelId(null)
                          setActiveCollectionId(collection.id)
                          setQueueQuery("") // Clear query after navigation
                        }}
                        onSearchQueueAdd={onSearchQueueAdd}
                        hasCurrentTrack={Boolean(nowPlayingProps.track)}
                        searchQuery={queueQuery}
                        onSearchChange={setQueueQuery}
                      />
                    </div>
                  ) : activeTab === "playlists" ? (
                    <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-2.5 overflow-y-auto scrollbar-on-hover">
                      {selectedPlaylistId ? (
                        <PlaylistDetailView
                          playlistId={selectedPlaylistId}
                          onBack={handlePlaylistBack}
                          onPlayTrack={handleTrackPlay}
                        />
                      ) : (
                        <PlaylistList
                          onPlaylistSelect={handlePlaylistSelect}
                          selectedPlaylistId={selectedPlaylistId}
                        />
                      )}
                    </div>
                  ) : (
                    <div ref={panelContentRef} className="flex-1 min-h-0 flex flex-col p-2 sm:p-2.5">
                      {/* Mood Channel Detail View */}
                      {activeMoodChannelId && activeMoodChannel ? (
                        <MoodChannelDetailView
                          channel={activeMoodChannel}
                          tracks={moodChannelTracks}
                          onBack={() => handleMoodChannelChange(null)}
                          onTrackPlay={handleTrackPlay}
                          onQueueAdd={onSearchQueueAdd}
                        />
                      ) : activeCollectionId && activeCollection ? (
                        <CollectionDetailView
                          collection={activeCollection}
                          collectionTitle={activeCollectionTitle}
                          tracks={collectionTracks}
                          description={getCollectionDescription(activeCollectionId)}
                          isFeatured={activeCollectionId === "featured"}
                          showShare={activeCollectionId !== RECENTLY_PLAYED_COLLECTION_ID}
                          onBack={() => setActiveCollectionId(null)}
                          onTrackPlay={handleTrackPlay}
                          onQueueAdd={onSearchQueueAdd}
                          scrollToTrackId={scrollToTrackId}
                          onScrollComplete={() => setScrollToTrackId(null)}
                        />
                      ) : (
                        <BrowseView
                          collections={collections}
                          recentlyPlayed={recentlyPlayed}
                          allTracks={allTracks}
                          onCollectionSelect={setActiveCollectionId}
                          getCollectionArtwork={getCollectionArtwork}
                          searchQuery={searchQuery}
                          onSearchQueryChange={setSearchQuery}
                          onSearchResultsChange={setSearchResults}
                          currentTrack={nowPlayingProps.track}
                          onSearchSelect={onSearchSelect ?? ((track) => handleTrackPlay(track))}
                          onSearchQueueAdd={onSearchQueueAdd ?? (() => { })}
                          onWisdomSelect={onSearchWisdomSelect}
                          onJournalSelect={onSearchJournalSelect}
                          searchContainerRef={panelContentRef}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Now Playing Section - compact on mobile overlay */}
        <div className={isMobileOverlay ? "px-2 py-1.5 relative z-10" : "px-3 py-2 md:px-4 md:py-3 relative z-10"}>
          <NowPlayingSection {...nowPlayingProps} compact={isMobileOverlay} />
        </div>
      </div>
    </div>
  )
}
