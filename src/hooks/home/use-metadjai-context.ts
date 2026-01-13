import { useMemo, useState, useEffect } from "react"
import { COLLECTION_NARRATIVES } from "@/data/collection-narratives"
import { DEFAULT_SCENE_ID } from "@/data/scenes"
import { STORAGE_KEYS, getString } from "@/lib/storage/persistence"
import type { usePlayer } from "@/contexts/PlayerContext"
import type { useQueue } from "@/contexts/QueueContext"
import type { useUI } from "@/contexts/UIContext"
import type { Collection, Track } from "@/types"

interface UseMetaDjAiContextProps {
  player: ReturnType<typeof usePlayer>
  queue: ReturnType<typeof useQueue>
  ui: ReturnType<typeof useUI>
  cinemaEnabled: boolean
  /** Dream is active when streaming webcam-to-avatar transformation */
  dreamActive: boolean
  selectedCollectionTitle: string
  searchResults: Track[]
  collections: Collection[]
  tracks: Track[]
}

/**
 * Custom hook for building MetaDJai session context
 *
 * Generates rich context for AI conversations including:
 * - Current playback state
 * - Active view/surface information
 * - Catalog summary with collection details
 * - Page-specific context (search, queue, etc.)
 */
export function useMetaDjAiContext({
  player,
  queue,
  ui,
  cinemaEnabled,
  dreamActive,
  selectedCollectionTitle,
  searchResults,
  collections,
  tracks,
}: UseMetaDjAiContextProps) {
  const hasUserSelectedCollection = ui.selectedCollectionSource === "user"

  /**
   * Cinema scene state - read from localStorage when Cinema is active.
   * CinemaOverlay persists the selected scene; we sync here for AI context.
   */
  const [cinemaScene, setCinemaScene] = useState<string>(DEFAULT_SCENE_ID)

  useEffect(() => {
    if (!cinemaEnabled) return
    const stored = getString(STORAGE_KEYS.CINEMA_SCENE, DEFAULT_SCENE_ID)
    setCinemaScene(stored)
  }, [cinemaEnabled])
  const shouldMentionCollection = Boolean(player.currentTrack) || hasUserSelectedCollection

  /**
   * Page context - describes what the user is currently viewing
   */
  const metaDjAiPageContext = useMemo(() => {
    const trimmedQuery = ui.searchQuery.trim()

    if (ui.modals.isWisdomOpen) {
      return {
        view: "wisdom" as const,
        details: "Exploring Wisdom dispatches and knowledge layers.",
      }
    }

    if (cinemaEnabled) {
      return {
        view: "cinema" as const,
        details: player.currentTrack
          ? `Cinema visuals active for ${player.currentTrack.title} by ${player.currentTrack.artist}.`
          : "Cinema visuals active with no track playing.",
      }
    }

    if (ui.modals.isQueueOpen) {
      return {
        view: "queue" as const,
        details: `Managing queue with ${queue.queue.length} track${queue.queue.length === 1 ? "" : "s"}.`,
      }
    }

    if (trimmedQuery.length > 0) {
      return {
        view: "search" as const,
        details: `Searching for "${trimmedQuery}" (${searchResults.length} result${searchResults.length === 1 ? "" : "s"}).`,
      }
    }

    if (ui.activeView === "journal") {
      return {
        view: "journal" as const,
        details: "Writing or reviewing Journal entries.",
      }
    }

    return {
      view: "collections" as const,
      details: shouldMentionCollection
        ? `Browsing ${selectedCollectionTitle}.`
        : "Browsing the collection library.",
    }
  }, [
    cinemaEnabled,
    player.currentTrack,
    queue.queue.length,
    searchResults.length,
    selectedCollectionTitle,
    shouldMentionCollection,
    ui.activeView,
    ui.modals.isWisdomOpen,
    ui.modals.isQueueOpen,
    ui.searchQuery,
  ])

  /**
   * Content context - specific Wisdom section currently visible.
   * Tracks which Wisdom section the user is viewing for contextual AI responses.
   */
  const metaDjAiContentContext = useMemo(() => {
    // Only build content context when Wisdom is open and a section is selected
    if (!ui.modals.isWisdomOpen || !ui.wisdomSection) {
      return undefined
    }

    const sectionLabels: Record<string, string> = {
      thoughts: "Reading MetaDJ's thoughts and perspectives",
      guides: "Exploring in-depth guides and tutorials",
      reflections: "Viewing personal reflections and journey stories",
    }

    return {
      view: "wisdom" as const,
      section: ui.wisdomSection as "thoughts" | "guides" | "reflections",
      details: sectionLabels[ui.wisdomSection] ?? "Exploring Wisdom content",
    }
  }, [ui.modals.isWisdomOpen, ui.wisdomSection])

  /**
   * Catalog summary - comprehensive overview of available music
   */
  const metaDjAiCatalogSummary = useMemo(() => {
    return {
      totalCollections: collections.length,
      collectionTitles: collections.map((collection) => collection.title),
      collections: collections.map((collection) => {
        const narrative = COLLECTION_NARRATIVES[collection.id] ?? COLLECTION_NARRATIVES.featured
        const collectionTrackList = tracks.filter((track) => track.collection === collection.title)
        const genreCounter = new Map<string, number>()

        collectionTrackList.forEach((track) => {
          track.genres?.slice(0, 2).forEach((genre) => {
            if (!genre) return
            genreCounter.set(genre, (genreCounter.get(genre) ?? 0) + 1)
          })
        })

        const primaryGenres = Array.from(genreCounter.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([genre]) => genre)

        return {
          id: collection.id,
          title: collection.title,
          description: narrative.paragraphs.join(" "),
          trackCount: collectionTrackList.length,
          sampleTracks: collectionTrackList.slice(0, 3).map((track) => track.title),
          primaryGenres,
        }
      }),
    }
  }, [collections, tracks])

  /**
   * Welcome details - info shown in MetaDJai welcome state
   */
  const metaDjAiWelcomeDetails = useMemo(
    () => ({
      nowPlayingTitle: player.currentTrack?.title ?? undefined,
      nowPlayingArtist: player.currentTrack?.artist ?? undefined,
      collectionTitle: shouldMentionCollection ? selectedCollectionTitle : undefined,
      pageDetails: metaDjAiPageContext.details,
    }),
    [
      player.currentTrack?.title,
      player.currentTrack?.artist,
      selectedCollectionTitle,
      shouldMentionCollection,
      metaDjAiPageContext.details,
    ],
  )

  /**
   * Full session context for the MetaDJai hook
   */
  const metaDjAiSessionContext = useMemo(
    () => ({
      nowPlayingTitle: player.currentTrack?.title ?? undefined,
      nowPlayingArtist: player.currentTrack?.artist ?? undefined,
      selectedCollectionTitle: shouldMentionCollection ? selectedCollectionTitle : undefined,
      cinemaActive: cinemaEnabled,
      cinemaScene: cinemaEnabled ? cinemaScene : undefined,
      wisdomActive: ui.modals.isWisdomOpen,
      dreamActive,
      pageContext: metaDjAiPageContext,
      contentContext: metaDjAiContentContext,
      catalogSummary: metaDjAiCatalogSummary,
    }),
    [
      player.currentTrack?.title,
      player.currentTrack?.artist,
      selectedCollectionTitle,
      shouldMentionCollection,
      cinemaEnabled,
      cinemaScene,
      ui.modals.isWisdomOpen,
      dreamActive,
      metaDjAiPageContext,
      metaDjAiContentContext,
      metaDjAiCatalogSummary,
    ]
  )

  return {
    metaDjAiPageContext,
    metaDjAiCatalogSummary,
    metaDjAiWelcomeDetails,
    metaDjAiSessionContext,
  }
}
