"use client"

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { HomeShellRouter } from "@/components/home/HomeShellRouter"
import { HubExperience, type WisdomSpotlightData } from "@/components/hub/HubExperience"
import { AudioPlayer } from "@/components/player/AudioPlayer"
import { ErrorBoundary } from "@/components/ui"
import { Journal } from "@/components/wisdom/Journal"
import { WisdomExperience } from "@/components/wisdom/WisdomExperience"
import { usePlayer } from "@/contexts/PlayerContext"
import { useQueue } from "@/contexts/QueueContext"
import { useToast } from "@/contexts/ToastContext"
import { useUI } from "@/contexts/UIContext"
import { useAudioPreloader } from "@/hooks/audio/use-audio-preloader"
import { useCinema } from "@/hooks/cinema/use-cinema"
import {
  useHomeInitializers,
  useHomeQueueLifecycle,
  useQueueControls,
  useViewManagement,
  useViewMounting,
  useMetaDjAiContext,
  useAudioPlayerProps,
  useMetaDjAiChatProps,
  useMetaDjAiPanelControls,
  usePlayerControls,
  useHubPlayback,
} from "@/hooks/home"
import { useMetaDjAi } from "@/hooks/metadjai/use-metadjai"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useRecentlyPlayed } from "@/hooks/use-recently-played"
import { useResponsivePanels } from "@/hooks/use-responsive-panels"
import { useTrackDetails } from "@/hooks/use-track-details"
import { FEATURED_TRACK_IDS, DEFAULT_COLLECTION_ID, FEATURES, RECENTLY_PLAYED_MAX_ITEMS } from "@/lib/app.constants"
import { META_DJAI_PROMPT_EVENT, type MetaDjAiExternalPromptDetail } from "@/lib/metadjai/external-prompts"
import { getTracksByCollection } from "@/lib/music"
import { STORAGE_KEYS } from "@/lib/storage"
import { parseWisdomDeepLinkPath, type WisdomDeepLink, type WisdomSection } from "@/lib/wisdom"
import type { CinemaState, ModalState, NowPlayingProps } from "@/components/home/shells"
import type { Collection, Track, ActiveView, LeftPanelTab } from "@/types"

type FeatureType = typeof FEATURES[keyof typeof FEATURES]

interface HomePageClientProps {
  tracks: Track[]
  collections: Collection[]
  featuredTrackIds?: readonly string[]
  feature?: FeatureType
  wisdomSpotlight?: WisdomSpotlightData
}

export function HomePageClient({
  tracks,
  collections,
  featuredTrackIds = FEATURED_TRACK_IDS,
  feature = FEATURES.HUB,
  wisdomSpotlight,
}: HomePageClientProps) {
  // Context hooks
  const player = usePlayer()
  const queue = useQueue()
  const ui = useUI()
  const { showToast } = useToast()
  const setSelectedCollection = ui.setSelectedCollection
  const setHeaderHeight = ui.setHeaderHeight
  const { panels, toggleLeftPanel, toggleRightPanel, openLeftPanel } = ui
  const setInfoOpen = ui.setInfoOpen
  const setWelcomeOpen = ui.setWelcomeOpen
  const setKeyboardShortcutsOpen = ui.setKeyboardShortcutsOpen
  const setWisdomOpen = ui.setWisdomOpen

  const handleInfoOpen = useCallback(() => setInfoOpen(true), [setInfoOpen])
  const handleInfoClose = useCallback(() => setInfoOpen(false), [setInfoOpen])
  const handleWelcomeClose = useCallback(() => setWelcomeOpen(false), [setWelcomeOpen])
  const handleKeyboardShortcutsClose = useCallback(
    () => setKeyboardShortcutsOpen(false),
    [setKeyboardShortcutsOpen]
  )
  const handleWisdomOpen = useCallback(() => setWisdomOpen(true), [setWisdomOpen])

  const searchResults = ui.searchResults
  const setSearchResults = ui.setSearchResults
  const { shouldUseSidePanels, windowWidth } = useResponsivePanels()
  const activeView = ui.activeView
  const isMetaDjAiOpen = ui.modals.isMetaDjAiOpen
  const { shouldMountView, ensureViewMounted } = useViewMounting({
    activeView,
    reducedMotion: ui.reducedMotion,
  })

  // DJ mode state removed - MetaDjAi is now unified

  // Mobile left panel state (for overlay on mobile)
  const [isMobileLeftPanelOpen, setIsMobileLeftPanelOpen] = useState(false)

  const [wisdomDeepLink, setWisdomDeepLink] = useState<WisdomDeepLink | null>(null)
  const handleWisdomDeepLinkConsumed = useCallback(() => {
    setWisdomDeepLink(null)
  }, [])

  const handleMobileToggleLeftPanel = useCallback(() => {
    setIsMobileLeftPanelOpen((prev) => !prev)
  }, [])
  const handleMusicPanelOpen = useCallback(() => {
    setIsMobileLeftPanelOpen(true)
  }, [])

  // Refs
  const headerRef = useRef<HTMLDivElement | null>(null)


  // Track details modal state
  const { selectedTrack: trackDetailsTrack, isOpen: isTrackDetailsOpen, openDetails, closeDetails } = useTrackDetails()

  // Recently played tracking
  const { recentlyPlayed } = useRecentlyPlayed({
    allTracks: tracks,
    currentTrack: player.currentTrack,
    maxItems: RECENTLY_PLAYED_MAX_ITEMS,
  })

  // Cinema hook
  const {
    cinemaEnabled,
    keepCinemaMounted,
    cinemaControlsVisible,
    cinemaVideoError,
    cinemaVideoReady,
    cinemaVideoRef,
    cinemaDialogRef,
    resetCinemaControlsTimer,
    hideCinemaControlsImmediately,
    handleCinemaToggle: handleCinemaToggleRaw,
    handleVideoError,
    handleVideoLoadedData,
    retryVideo,
    setCinemaEnabled,
    isFullscreen,
    setIsFullscreen,
    posterOnly,
    dream,
  } = useCinema({
    currentTrack: player.currentTrack,
    shouldPlay: player.shouldPlay,
    headerHeight: ui.headerHeight,
    wisdomEnabled: ui.modals.isWisdomOpen,
    setWisdomEnabled: ui.setWisdomOpen,
    isQueueOpen: ui.modals.isQueueOpen,
    isMetaDjAiOpen: ui.modals.isMetaDjAiOpen,
    setMetaDjAiOpen: ui.setMetaDjAiOpen,
  })

  // View state management (extracted to hook)
  const {
    handleWisdomToggle,
    handleCinemaToggle: handleCinemaToggleView,
    handleActiveViewChange: handleActiveViewChangeRaw,
  } = useViewManagement({
    ui,
    cinemaEnabled,
    setCinemaEnabled,
    setIsFullscreen,
    shouldUseSidePanels,
    activeView,
  })

  // State-only view switching (no URL navigation for flicker-free experience)
  const handleActiveViewChange = useCallback((view: ActiveView) => {
    ensureViewMounted(view)
    startTransition(() => {
      handleActiveViewChangeRaw(view)
    })
  }, [ensureViewMounted, handleActiveViewChangeRaw])

  // Hybrid: keep tab switching state-driven, but allow Wisdom-only deep links for sharing.
  useEffect(() => {
    if (typeof window === "undefined") return

    const pathname = window.location.pathname
    if (pathname === "/wisdom" || pathname === "/wisdom/") {
      handleActiveViewChange("wisdom")
      try {
        window.history.replaceState(null, "", "/")
      } catch {
        // ignore history errors
      }
      return
    }

    const deepLink = parseWisdomDeepLinkPath(pathname)
    if (!deepLink) return

    setWisdomDeepLink(deepLink)
    handleActiveViewChange("wisdom")

    try {
      window.history.replaceState(null, "", "/")
    } catch {
      // ignore history errors
    }
  }, [handleActiveViewChange])

  // Prefetch Cinema overlay chunk to reduce first-switch lag.
  useEffect(() => {
    if (typeof window === "undefined") return

    const scheduleIdle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 250)

    const handle = scheduleIdle(() => {
      import("@/components/cinema/CinemaOverlay").catch(() => {
        // ignore prefetch errors
      })
    })

    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(handle)
      } else {
        window.clearTimeout(handle)
      }
    }
  }, [])

  // Cinema toggle with state-only switching
  const handleCinemaToggle = useCallback(() => {
    const closingCinema = cinemaEnabled
    handleCinemaToggleView(handleCinemaToggleRaw)

    if (closingCinema) {
      showToast({
        message: "Exited Cinema — back to Hub",
        variant: "info",
        duration: 2000,
      })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
  }, [handleCinemaToggleView, handleCinemaToggleRaw, cinemaEnabled, showToast])

  // Determine active feature for header display based on surface state (AI chat no longer overrides header)
  const activeFeature = useMemo(() => {
    if (ui.modals.isWisdomOpen) return FEATURES.WISDOM
    if (cinemaEnabled) return FEATURES.CINEMA
    return feature
  }, [ui.modals.isWisdomOpen, cinemaEnabled, feature])

  useHomeInitializers({
    headerRef,
    setHeaderHeight,
    setCinemaEnabled,
    setSelectedCollection,
    onWisdomOpen: handleWisdomOpen,
    onUserGuideOpen: handleInfoOpen,
    onMusicPanelOpen: handleMusicPanelOpen,
    // Default to first collection (Featured is now a separate section)
    defaultCollectionId: collections[0]?.id,
  })

  // Collection tracks computation (needed for queue management)
  // PERFORMANCE OPTIMIZATION: Memoized to prevent recalculating on every render
  // QUEUE CONTEXT LOGIC: This determines which tracks appear in the queue when a track is clicked
  // - If viewing Featured → queue continues with Featured tracks
  // - If viewing Bridging Reality → queue continues with Bridging Reality tracks
  // - If viewing Majestic Ascent → queue continues with Majestic Ascent tracks
  // The selectedCollection state is persisted and restored across sessions
  const collectionTracks = useMemo(() => {
    if (ui.selectedCollection === DEFAULT_COLLECTION_ID) {
      return featuredTrackIds
        .map((id) => tracks.find((track) => track.id === id))
        .filter((track): track is Track => track !== undefined)
    }

    if (ui.selectedCollection) {
      return getTracksByCollection(ui.selectedCollection, tracks)
    }

    return [...tracks]
  }, [ui.selectedCollection, featuredTrackIds, tracks])

  const visibleTracks = ui.searchQuery.trim() ? searchResults : collectionTracks

  const selectedCollectionTitle = useMemo(() => {
    if (!ui.selectedCollection || ui.selectedCollection === DEFAULT_COLLECTION_ID) {
      return "Featured"
    }
    const current = collections.find((collection) => collection.id === ui.selectedCollection)
    return current?.title ?? "All selections"
  }, [ui.selectedCollection, collections])

  // Get actual Track objects for featured tracks (for preloading)
  const featuredTracks = useMemo(() => {
    return featuredTrackIds
      .map((id) => tracks.find((track) => track.id === id))
      .filter((track): track is Track => track !== undefined)
  }, [featuredTrackIds, tracks])

  const {
    handleTrackClick,
    handleSearchResultSelect,
    handleTrackQueueAdd,
    handleQueueTrackSelect,
    handleQueueReorder,
    handleQueueRemove,
    handleQueueClear,
    handleQueueInsert,
    handleNext,
    handlePrevious,
    toggleQueueVisibility,
    handleShuffleToggle,
    handleRepeatToggle,
  } = useQueueControls({
    player,
    queue,
    ui,
    collectionTracks,
    searchResults,
    allTracks: tracks,
  })

  const handleSearchResultQueueAdd = useCallback(
    (track: Track) => {
      handleTrackQueueAdd(track)
    },
    [handleTrackQueueAdd],
  )

  useAudioPreloader(player.currentTrack, queue.queue, visibleTracks, featuredTracks, collections, tracks)

  // Apply previously persisted UI state once queue hydration completes
  useHomeQueueLifecycle({
    queue,
    ui,
    player,
    setSelectedCollection,
  })

  // MetaDJai context (extracted to hook)
  const {
    metaDjAiPageContext,
    metaDjAiCatalogSummary,
    metaDjAiWelcomeDetails,
    metaDjAiSessionContext,
  } = useMetaDjAiContext({
    player,
    queue,
    ui,
    cinemaEnabled,
    selectedCollectionTitle,
    searchResults,
    collections,
    tracks,
  })

  const metaDjAiSession = useMetaDjAi({
    context: metaDjAiSessionContext,
  })

  // MetaDJai panel controls (extracted to hook)
  const {
    handleMetaDjAiToggle,
    handleMetaDjAiOpen,
    handleMetaDjAiClose,
  } = useMetaDjAiPanelControls({
    ui,
    shouldUseSidePanels,
    panels,
    toggleRightPanel,
  })

  // Open MetaDJai when requested from /guide without polluting the URL.
  useEffect(() => {
    if (typeof window === "undefined") return

    let requested = false
    try {
      requested = sessionStorage.getItem("metadj_request_open_metadjai") === "true"
    } catch {
      requested = false
    }

    if (!requested) return

    try {
      sessionStorage.removeItem("metadj_request_open_metadjai")
    } catch {
      // ignore
    }

    // If the user explicitly asked for MetaDJai, don't block them behind Welcome.
    if (ui.modals.isWelcomeOpen) {
      ui.setWelcomeOpen(false)
    }

    handleMetaDjAiOpen()
  }, [handleMetaDjAiOpen, ui.modals.isWelcomeOpen, ui.setWelcomeOpen])

  // Listen for external prompts (e.g., "Summarize with MetaDJai" buttons in Wisdom).
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<MetaDjAiExternalPromptDetail>
      const { prompt, newSession } = customEvent.detail || {}
      if (!prompt) return

      // Ensure chat is visible
      handleMetaDjAiOpen()

      if (newSession) {
        metaDjAiSession.resetConversation()
      }

      metaDjAiSession.sendMessage(prompt)
    }

    window.addEventListener(META_DJAI_PROMPT_EVENT, handler as EventListener)
    return () => window.removeEventListener(META_DJAI_PROMPT_EVENT, handler as EventListener)
  }, [handleMetaDjAiOpen, metaDjAiSession])

  // Player controls (extracted to hook)
  const {
    handleQueueToggle,
    handleVolumeUp,
    handleVolumeDown,
    handleMute,
    togglePlayPause,
    handleFocusSearch,
    handleShowTrackDetails,
    handleCollectionDetailsClose,
  } = usePlayerControls({
    player,
    queue,
    ui,
    showToast,
    toggleQueueVisibility,
    openDetails,
  })

  // Hub playback controls (extracted to hook)
  const {
    activeMoodChannelId,
    setActiveMoodChannelId,
    syncCollectionSelection,
    handleHubTrackPlay,
    handleHubTrackQueueAdd,
    handlePlayMoodChannel,
  } = useHubPlayback({
    tracks,
    collections,
    setSelectedCollection,
    handleTrackClick,
    handleTrackQueueAdd,
    showToast,
    shouldUseSidePanels,
    panels,
    openLeftPanel,
  })

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    onPlayPause: player.currentTrack ? togglePlayPause : undefined,
    onNext: queue.queue.length > 1 ? handleNext : undefined,
    onPrevious: queue.queue.length > 1 ? handlePrevious : undefined,
    onVolumeUp: handleVolumeUp,
    onVolumeDown: handleVolumeDown,
    onMute: handleMute,
    onShowHelp: () => ui.setKeyboardShortcutsOpen(true),
    onShuffle: queue.queue.length > 0 ? handleShuffleToggle : undefined,
    onRepeat: handleRepeatToggle,
    onFocusSearch: handleFocusSearch,
    enabled: true,
  })

  const audioPlayerProps = useAudioPlayerProps({
    currentTrack: player.currentTrack,
    shouldPlay: player.shouldPlay,
    setShouldPlay: player.setShouldPlay,
    volume: player.volume,
    setVolume: player.setVolume,
    isMuted: player.isMuted,
    toggleMute: player.toggleMute,
    queue: queue.queue,
    isShuffleEnabled: queue.isShuffleEnabled,
    repeatMode: queue.repeatMode,
    handleNext,
    handlePrevious,
    handleShuffleToggle,
    handleRepeatToggle,

    handleQueueReorder,
    handleQueueRemove,
    handleQueueClear,
    handleQueueTrackSelect,
    allTracks: tracks,
    handleSearchTrackSelect: handleSearchResultSelect,
    handleSearchTrackQueueAdd: handleSearchResultQueueAdd,
    isMetaDjAiOpen: ui.modals.isMetaDjAiOpen,
    selectedCollectionTitle,
    cinemaEnabled,
    handleMetaDjAiToggle,
  })

  // Memoize MetaDJai chat props to prevent unnecessary re-renders of chat component
  const metaDjAiChatProps = useMetaDjAiChatProps({
    isMetaDjAiOpen: ui.modals.isMetaDjAiOpen,
    handleMetaDjAiClose,
    metaDjAiSession,
    metaDjAiWelcomeDetails,
    headerHeight: ui.headerHeight,
    currentTrack: player.currentTrack,
  })

  const openCinemaFromHub = useCallback(() => {
    handleActiveViewChange("cinema")
  }, [handleActiveViewChange])

  const openWisdomFromHub = useCallback((section?: WisdomSection, slug?: string) => {
    if (section && slug) {
      setWisdomDeepLink({ section, slug })
    }
    handleActiveViewChange("wisdom")
  }, [handleActiveViewChange])

  const openMusicLibraryFromHub = useCallback((tab: LeftPanelTab = "browse") => {
    if (activeView !== "hub") {
      handleActiveViewChange("hub")
    }

    ui.setLeftPanelTab(tab)

    if (shouldUseSidePanels) {
      openLeftPanel()
    } else {
      setIsMobileLeftPanelOpen(true)
    }
  }, [activeView, handleActiveViewChange, shouldUseSidePanels, openLeftPanel, ui])

  const openMusicPanel = useCallback(() => {
    if (shouldUseSidePanels) {
      openLeftPanel()
    } else {
      setIsMobileLeftPanelOpen(true)
    }
  }, [shouldUseSidePanels, openLeftPanel])

  const hubContent = useMemo(
    () => (
      <section
        className={`relative flex-1 ${shouldUseSidePanels ? "pb-2" : "pb-[calc(9rem_+_env(safe-area-inset-bottom))]"}`}
        aria-label="Hub with track listings and controls"
      >
        <div>
          <HubExperience
            tracks={tracks}
            onPlayTrack={handleHubTrackPlay}
            onCinematicPlay={handleTrackClick}
            onOpenCinema={openCinemaFromHub}
            onOpenMusicPanel={openMusicPanel}
            onOpenWisdom={openWisdomFromHub}
            onOpenMetaDjAi={handleMetaDjAiOpen}
            wisdomSpotlight={wisdomSpotlight}
            currentTrack={player.currentTrack}
            isPlaying={player.shouldPlay}
            isMetaDjAiOpen={isMetaDjAiOpen}
          />
        </div>
      </section>
    ),
    [
      shouldUseSidePanels,
      tracks,
      handleHubTrackPlay,
      handleTrackClick,
      openCinemaFromHub,
      openWisdomFromHub,
      handleMetaDjAiOpen,
      openMusicPanel,
      wisdomSpotlight,
      player.currentTrack,
      player.shouldPlay,
      handlePlayMoodChannel,
      handleInfoOpen,
      isMetaDjAiOpen,
    ],
  )

  const cinemaState: CinemaState = useMemo(() => ({
    enabled: cinemaEnabled,
    keepMounted: keepCinemaMounted,
    controlsVisible: cinemaControlsVisible,
    videoError: cinemaVideoError,
    videoReady: cinemaVideoReady,
    videoRef: cinemaVideoRef,
    dialogRef: cinemaDialogRef,
    isFullscreen,
    posterOnly,
    onToggle: handleCinemaToggle,
    onFullscreenToggle: setIsFullscreen,
    onVideoError: handleVideoError,
    onVideoLoadedData: handleVideoLoadedData,
    retryVideo,
    resetControlsTimer: resetCinemaControlsTimer,
    hideControlsImmediately: hideCinemaControlsImmediately,
    dream,
  }), [
    cinemaEnabled,
    keepCinemaMounted,
    cinemaControlsVisible,
    cinemaVideoError,
    cinemaVideoReady,
    cinemaVideoRef,
    cinemaDialogRef,
    isFullscreen,
    handleCinemaToggle,
    setIsFullscreen,
    handleVideoError,
    handleVideoLoadedData,
    retryVideo,
    resetCinemaControlsTimer,
    hideCinemaControlsImmediately,
    posterOnly,
    dream,
  ])

  const modalState: ModalState = useMemo(() => ({
    isWelcomeOpen: ui.modals.isWelcomeOpen,
    isInfoOpen: ui.modals.isInfoOpen,
    isCollectionDetailsOpen: ui.modals.isCollectionDetailsOpen,
    isKeyboardShortcutsOpen: ui.modals.isKeyboardShortcutsOpen,
    isMetaDjAiOpen: ui.modals.isMetaDjAiOpen,
  }), [
    ui.modals.isWelcomeOpen,
    ui.modals.isInfoOpen,
    ui.modals.isCollectionDetailsOpen,
    ui.modals.isKeyboardShortcutsOpen,
    ui.modals.isMetaDjAiOpen,
  ])

  const nowPlayingProps: NowPlayingProps = useMemo(() => ({
    track: player.currentTrack,
    shouldPlay: player.shouldPlay,
    isPlaying: player.isPlaying,
    isLoading: player.isLoading,
    onPlayStateChange: player.setShouldPlay,
    onShouldPlayChange: player.setShouldPlay,
    onPlayPause: () => player.setShouldPlay(!player.shouldPlay),
    onSeekTo: player.seek,
    onNext: queue.queue.length > 1 ? handleNext : undefined,
    onPrevious: queue.queue.length > 1 ? handlePrevious : undefined,
    volume: player.volume,
    onVolumeChange: player.setVolume,
    isMuted: player.isMuted,
    onMuteChange: player.toggleMute,
    repeatMode: queue.repeatMode,
    onRepeatChange: queue.setRepeatMode,
    onShuffleToggle: queue.queue.length > 0 ? handleShuffleToggle : undefined,
    isShuffleEnabled: queue.isShuffleEnabled,
    onShowDetails: player.currentTrack ? handleShowTrackDetails : undefined,
    // Note: onOpenCollection is added via nowPlayingPropsWithCollection (defined after handleCollectionSelect)
  }), [
    player.currentTrack,
    player.shouldPlay,
    player.isPlaying,
    player.isLoading,
    player.setShouldPlay,
    player.seek,
    player.volume,
    player.setVolume,
    player.isMuted,
    player.toggleMute,
    queue.queue.length,
    queue.repeatMode,
    queue.setRepeatMode,
    queue.isShuffleEnabled,
    handleNext,
    handlePrevious,
    handleShuffleToggle,
    handleShowTrackDetails,
  ])


  const renderMiddleContentForView = useCallback((view: ActiveView) => {
    const canMountHub = shouldMountView("hub")
    const canMountWisdom = shouldMountView("wisdom")
    const canMountJournal = shouldMountView("journal")

    // Adaptively mount heavy views to balance seamless switching with low-end performance.
    // Cinema is rendered independently in DesktopShell as an overlay.
    return (
      <>
        {/* Cinema placeholder - actual cinema is rendered as overlay in DesktopShell */}
        <section
          id="cinema-placeholder"
          className={`relative flex-1 ${view !== "cinema" ? "hidden" : ""}`}
          aria-label="Cinema active"
          aria-hidden={view !== "cinema"}
        />
        {/* Hub content */}
        <div
          className={view !== "hub" ? "hidden" : ""}
          aria-hidden={view !== "hub"}
        >
          {canMountHub ? hubContent : null}
        </div>
        {/* Wisdom content */}
        <section
          id="wisdom-content"
          className={`relative flex-1 ${shouldUseSidePanels ? "pb-2" : "pb-[calc(9rem_+_env(safe-area-inset-bottom))]"} ${view !== "wisdom" ? "hidden" : ""}`}
          aria-label="Wisdom content"
          aria-hidden={view !== "wisdom"}
        >
          {canMountWisdom ? (
            <WisdomExperience
              active={view === "wisdom"}
              deepLink={wisdomDeepLink}
              onDeepLinkConsumed={handleWisdomDeepLinkConsumed}
            />
          ) : null}
        </section>
        {/* Journal content */}
        <section
          id="journal-content"
          className={`relative flex-1 ${shouldUseSidePanels ? "pb-2" : "pb-[calc(9rem_+_env(safe-area-inset-bottom))]"} ${view !== "journal" ? "hidden" : ""}`}
          aria-label="Journal content"
          aria-hidden={view !== "journal"}
        >
          {canMountJournal ? <Journal /> : null}
        </section>
      </>
    )
  }, [
    hubContent,
    shouldUseSidePanels,
    wisdomDeepLink,
    handleWisdomDeepLinkConsumed,
    shouldMountView,
  ])

  const handleMobileToggleRightPanel = useCallback(() => {
    if (ui.modals.isMetaDjAiOpen) {
      ui.setMetaDjAiOpen(false)
    } else {
      ui.setMetaDjAiOpen(true)
    }
  }, [ui])

  const handleMobileTrackSelect = useCallback((track: Track, tracks?: Track[]) => {
    syncCollectionSelection(track)
    handleTrackClick(track, tracks)
  }, [syncCollectionSelection, handleTrackClick])

  const handleMobileTrackQueueAdd = useCallback((track: Track) => {
    syncCollectionSelection(track)
    handleTrackQueueAdd(track)
  }, [syncCollectionSelection, handleTrackQueueAdd])

  const handleDesktopToggleRightPanel = useCallback(() => {
    if (panels.right.isOpen) {
      ui.setMetaDjAiOpen(false)
      toggleRightPanel()
    } else {
      ui.setMetaDjAiOpen(true)
      toggleRightPanel()
    }
  }, [panels.right.isOpen, ui, toggleRightPanel])

  const handleCollectionSelect = useCallback((collection: Collection) => {
    // 1. Set the selected collection which updates the LeftPanel/Hub list
    setSelectedCollection(collection.id)

    // 2. Clear search query to show the collection content (optional, but requested behavior is "browse collection")
    // Use setValue directly if available or handleSearchQueryChange
    ui.setSearchQuery("")
    ui.setSearchResults([])

    // 3. Ensure we are in a view where the collection is visible.
    // Usually 'hub' is the main view for browsing.
    if (activeView !== 'hub') {
      handleActiveViewChange('hub')
    }

    // 4. If using side panels (Desktop), ensure Left Panel (Music) is open as it shows the list
    if (shouldUseSidePanels && !panels.left.isOpen) {
      toggleLeftPanel() // Open logic
    } else if (!shouldUseSidePanels) {
      // Mobile: Open left panel overlay
      setIsMobileLeftPanelOpen(true)
    }
  }, [setSelectedCollection, ui, activeView, handleActiveViewChange, shouldUseSidePanels, panels.left.isOpen, toggleLeftPanel])

  // Handler to open the collection that contains the currently playing track
  const handleOpenCurrentCollection = useCallback(() => {
    if (!player.currentTrack) return
    const collection = collections.find(c => c.title === player.currentTrack?.collection)
    if (collection) {
      handleCollectionSelect(collection)
    }
  }, [player.currentTrack, collections, handleCollectionSelect])

  // Enhanced nowPlayingProps with collection opener
  const nowPlayingPropsWithCollection = useMemo(() => ({
    ...nowPlayingProps,
    onOpenCollection: player.currentTrack ? handleOpenCurrentCollection : undefined,
  }), [nowPlayingProps, player.currentTrack, handleOpenCurrentCollection])

  return (
    <>
      <HomeShellRouter
        mobileProps={{
          headerRef,
          tracks,
          collections,
          recentlyPlayed,
          currentTrack: player.currentTrack,
          shouldPlay: player.shouldPlay,
          headerHeight: ui.headerHeight,
          searchQuery: ui.searchQuery,
          searchResults,
          activeView,
          shouldMountView,
          viewHydrated: ui.viewHydrated,
          wisdomDeepLink,
          onWisdomDeepLinkConsumed: handleWisdomDeepLinkConsumed,
          cinema: cinemaState,
          modals: modalState,
          collectionDetails: ui.collectionDetails,
          collectionTracks: tracks,
          isTrackDetailsOpen,
          trackDetailsTrack,
          onInfoOpen: handleInfoOpen,
          onInfoClose: handleInfoClose,
          onWelcomeClose: handleWelcomeClose,
          onTrackDetailsClose: closeDetails,
          onCollectionDetailsClose: handleCollectionDetailsClose,
          onKeyboardShortcutsClose: handleKeyboardShortcutsClose,
          onToggleLeftPanel: handleMobileToggleLeftPanel,
          onToggleRightPanel: handleMobileToggleRightPanel,
          isLeftPanelOpen: isMobileLeftPanelOpen,
          onSearchQueryChange: ui.setSearchQuery,
          onSearchResultsChange: setSearchResults,
          onTrackSelect: handleMobileTrackSelect,
          onCollectionSelect: handleCollectionSelect,
          onTrackQueueAdd: handleMobileTrackQueueAdd,
          onViewChange: handleActiveViewChange,
          onMetaDjAiToggle: handleMetaDjAiToggle,
          hubContent,
          onOpenGuide: handleInfoOpen,
          metaDjAiChatProps,
          audioPlayerProps,
          queue: queue.queue,
          isShuffleEnabled: queue.isShuffleEnabled,
          repeatMode: queue.repeatMode,
          onQueueReorder: handleQueueReorder,
          onQueueRemove: handleQueueRemove,
          onQueueInsert: handleQueueInsert,
          onShuffleToggle: handleShuffleToggle,
          onRepeatChange: queue.setRepeatMode,
          nowPlayingProps: nowPlayingPropsWithCollection,
        }}
        desktopProps={{
          headerRef,
          tracks,
          collections,
          windowWidth,
          recentlyPlayed,
          currentTrack: player.currentTrack,
          shouldPlay: player.shouldPlay,
          headerHeight: ui.headerHeight,
          searchQuery: ui.searchQuery,
          searchResults,
          activeView,
          viewHydrated: ui.viewHydrated,
          cinema: cinemaState,
          panels,
          queue: queue.queue,
          isShuffleEnabled: queue.isShuffleEnabled,
          repeatMode: queue.repeatMode,
          activeMoodChannelId,
          modals: modalState,
          collectionDetails: ui.collectionDetails,
          isTrackDetailsOpen,
          trackDetailsTrack,
          onInfoOpen: handleInfoOpen,
          onInfoClose: handleInfoClose,
          onWelcomeClose: handleWelcomeClose,
          onTrackDetailsClose: closeDetails,
          onCollectionDetailsClose: handleCollectionDetailsClose,
          onKeyboardShortcutsClose: handleKeyboardShortcutsClose,
          onToggleLeftPanel: toggleLeftPanel,
          onToggleRightPanel: handleDesktopToggleRightPanel,
          onSearchQueryChange: ui.setSearchQuery,
          onSearchResultsChange: setSearchResults,
          onSearchSelect: handleSearchResultSelect,
          onCollectionSelect: handleCollectionSelect,
          onSearchQueueAdd: handleSearchResultQueueAdd,
          onTrackPlay: handleTrackClick,
          onQueueReorder: handleQueueReorder,
          onQueueRemove: handleQueueRemove,
          onQueueInsert: handleQueueInsert,
          onShuffleToggle: handleShuffleToggle,
          onRepeatChange: queue.setRepeatMode,
          onMoodChannelChange: setActiveMoodChannelId,
          onViewChange: handleActiveViewChange,
          onMetaDjAiToggle: handleMetaDjAiToggle,
          nowPlayingProps: nowPlayingPropsWithCollection,
          hubContent,
          metaDjAiChatProps,
          renderMiddleContentForView,
          audioPlayerProps,
        }}
      />
      {/* Single AudioPlayer instance to prevent duplicate audio playback */}
      <ErrorBoundary componentName="Audio Player" compact>
        <AudioPlayer {...audioPlayerProps} />
      </ErrorBoundary>
      {/* Hidden intermediate canvas for Dream ingest (512x512 for Daydream - 1:1 square) */}
      <canvas
        ref={dream.intermediateCanvasRef}
        width={512}
        height={512}
        // display: none or visibility: hidden causes captureStream to fail or freeze
        className="fixed top-0 left-0 opacity-0 pointer-events-none"
        style={{ zIndex: -50 }}
      />
    </>
  )
}
