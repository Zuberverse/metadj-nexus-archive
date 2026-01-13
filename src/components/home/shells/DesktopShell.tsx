"use client"

import { memo, useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { HomePageAnnouncements } from "@/components/home/HomePageAnnouncements"
import { AppHeader } from "@/components/layout/AppHeader"
import { Footer } from "@/components/layout/Footer"
import { ModalOrchestrator } from "@/components/modals/ModalOrchestrator"
import { LeftPanel } from "@/components/panels/left-panel/LeftPanel"
import { PanelLayout } from "@/components/panels/PanelLayout"
import { RightPanel } from "@/components/panels/right-panel/RightPanel"
import { SessionBootstrap } from "@/components/session/SessionBootstrap"
import { ErrorBoundary } from "@/components/ui"
import { DynamicBackground } from "@/components/visuals"
import { PANEL_POSITIONING } from "@/lib/app.constants"
import type { JournalSearchEntry, WisdomSearchEntry } from "@/lib/search/search-results"
import type { ActiveView, Track, Collection, RepeatMode, CinemaState, ModalState } from "@/types"
import type { AudioPlayerProps } from "@/types/audio-player.types"
import type { MetaDjAiChatProps } from "@/types/metadjai.types"
import type { RefObject, ReactNode } from "react"

const CinemaOverlay = dynamic(
  () => import("@/components/cinema/CinemaOverlay").then((mod) => mod.CinemaOverlay),
  {
    ssr: false,
    // Loading placeholder matches actual CinemaOverlay container to prevent visual "snap"
    loading: () => (
      <div
        className="fixed inset-0 z-40 bg-black overflow-hidden"
        role="status"
        aria-label="Loading cinema experience"
      />
    ),
  },
)

// CinemaState and ModalState imported from @/types/shell.types

export interface NowPlayingProps {
  track: Track | null
  shouldPlay: boolean
  isPlaying?: boolean
  currentTime?: number
  duration?: number
  isLoading?: boolean
  onPlayStateChange: (playing: boolean) => void
  onShouldPlayChange: (shouldPlay: boolean) => void
  onPlayPause?: () => void
  onSeekTo?: (time: number) => void
  onNext?: () => void
  onPrevious?: () => void
  volume: number
  onVolumeChange: (volume: number) => void
  isMuted: boolean
  onMuteChange: () => void
  repeatMode: RepeatMode
  onRepeatChange: (mode: RepeatMode) => void
  onShuffleToggle?: () => void
  isShuffleEnabled: boolean
  onShowDetails?: () => void
  onOpenCollection?: () => void
}

export interface DesktopShellProps {
  headerRef: RefObject<HTMLDivElement | null>
  tracks: Track[]
  collections: Collection[]
  windowWidth: number
  recentlyPlayed: Track[]
  currentTrack: Track | null
  shouldPlay: boolean
  headerHeight: number
  searchQuery: string
  searchResults: Track[]
  activeView: ActiveView
  viewHydrated?: boolean
  cinema: CinemaState
  panels: { left: { isOpen: boolean }; right: { isOpen: boolean } }
  queue: Track[]
  isShuffleEnabled: boolean
  repeatMode: RepeatMode
  activeMoodChannelId: string | null
  modals: ModalState
  collectionDetails: Collection | null
  isTrackDetailsOpen: boolean
  trackDetailsTrack: Track | null
  onInfoOpen: () => void
  onFeedbackOpen: () => void
  onInfoClose: () => void
  onWelcomeClose: () => void
  onTrackDetailsClose: () => void
  onCollectionDetailsClose: () => void
  onKeyboardShortcutsClose: () => void
  onToggleLeftPanel: () => void
  onToggleRightPanel: () => void
  onSearchQueryChange: (query: string) => void
  onSearchResultsChange: (results: Track[]) => void
  onSearchWisdomSelect: (entry: WisdomSearchEntry) => void
  onSearchJournalSelect: (entry: JournalSearchEntry) => void
  onSearchSelect: (track: Track) => void
  onCollectionSelect: (collection: Collection) => void
  onSearchQueueAdd: (track: Track) => void
  onTrackPlay: (track: Track, tracks?: Track[]) => void
  onQueueReorder?: (fromIndex: number, toIndex: number) => void
  onQueueRemove?: (trackId: string) => void
  onQueueInsert: (tracks: Track[], index: number) => void
  onShuffleToggle?: () => void
  onRepeatChange: (mode: RepeatMode) => void
  onMoodChannelChange: (id: string | null) => void
  onViewChange: (view: ActiveView) => void
  onMetaDjAiToggle: () => void
  nowPlayingProps: NowPlayingProps
  hubContent: ReactNode
  metaDjAiChatProps: MetaDjAiChatProps & { headerHeight: number }
  renderMiddleContentForView: (view: ActiveView) => ReactNode
  audioPlayerProps: AudioPlayerProps
}

function DesktopShell({
  headerRef,
  tracks,
  collections,
  windowWidth,
  recentlyPlayed,
  currentTrack,
  shouldPlay,
  headerHeight,
  searchQuery,
  searchResults,
  activeView,
  viewHydrated = true,
  cinema,
  panels,
  queue,
  isShuffleEnabled,
  repeatMode,
  activeMoodChannelId,
  modals,
  collectionDetails,
  isTrackDetailsOpen,
  trackDetailsTrack,
  onInfoOpen,
  onFeedbackOpen,
  onInfoClose,
  onWelcomeClose,
  onTrackDetailsClose,
  onCollectionDetailsClose,
  onKeyboardShortcutsClose,
  onToggleLeftPanel,
  onToggleRightPanel,
  onSearchQueryChange,
  onSearchResultsChange,
  onSearchWisdomSelect,
  onSearchJournalSelect,
  onSearchSelect,
  onCollectionSelect,
  onSearchQueueAdd,
  onTrackPlay,
  onQueueReorder,
  onQueueRemove,
  onQueueInsert,
  onShuffleToggle,
  onRepeatChange,
  onMoodChannelChange,
  onViewChange,
  onMetaDjAiToggle,
  nowPlayingProps,
  hubContent,
  metaDjAiChatProps,
  renderMiddleContentForView,
  audioPlayerProps,
}: DesktopShellProps) {
  // Minimum content width between panels
  const MIN_CONTENT_WIDTH = 520

  // Can we reserve space for both panels? (both panels + minimum content)
  const canReserveBothPanels =
    windowWidth >= PANEL_POSITIONING.LEFT_PANEL.WIDTH + PANEL_POSITIONING.RIGHT_PANEL.WIDTH + MIN_CONTENT_WIDTH

  // Can we reserve space for left panel alone? (left panel + minimum content)
  const canReserveLeftSpace =
    windowWidth >= PANEL_POSITIONING.LEFT_PANEL.WIDTH + MIN_CONTENT_WIDTH

  // Can we reserve space for right panel? Only if we can fit both OR if left isn't reserving
  const canReserveRightSpace = canReserveBothPanels || (!panels.left.isOpen && windowWidth >= PANEL_POSITIONING.RIGHT_PANEL.WIDTH + MIN_CONTENT_WIDTH)

  const desktopLeftPanel = (
    <LeftPanel
      queue={queue}
      allTracks={tracks}
      recentlyPlayed={recentlyPlayed}
      collections={collections}
      onQueueReorder={queue.length > 1 ? onQueueReorder : undefined}
      onQueueRemove={queue.length > 0 ? onQueueRemove : undefined}
      onQueueInsert={onQueueInsert}
      onSearchSelect={onSearchSelect}
      onTrackPlay={onTrackPlay}
      onSearchQueueAdd={onSearchQueueAdd}
      onSearchWisdomSelect={onSearchWisdomSelect}
      onSearchJournalSelect={onSearchJournalSelect}
      shuffle={isShuffleEnabled}
      repeatMode={repeatMode}
      onShuffleToggle={queue.length > 0 ? onShuffleToggle : undefined}
      onRepeatChange={onRepeatChange}
      activeView={activeView}
      onViewChange={onViewChange}
      externalMoodChannelId={activeMoodChannelId}
      onMoodChannelChange={onMoodChannelChange}
      nowPlayingProps={nowPlayingProps}
    />
  )

  // Persistent AI Fullscreen State
  const [isAiFullscreen, setIsAiFullscreen] = useState(false)

  // Load persisted state on mount
  useEffect(() => {
    try {
      const persisted = localStorage.getItem("metadj_ai_fullscreen")
      if (persisted === "true") {
        setIsAiFullscreen(true)
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [])

  // Toggle handler with persistence
  const handleAiFullscreenToggle = useCallback(() => {
    setIsAiFullscreen(prev => {
      const newValue = !prev
      try {
        localStorage.setItem("metadj_ai_fullscreen", String(newValue))
      } catch (e) {
        // Ignore storage errors
      }
      return newValue
    })
  }, [])

  // Pass fullscreen props to MetaDjAiChat
  const enhancedMetaDjAiChatProps = {
    ...metaDjAiChatProps,
    isFullscreen: isAiFullscreen,
    onToggleFullscreen: handleAiFullscreenToggle
  }

  const desktopRightPanel = (
    <RightPanel {...enhancedMetaDjAiChatProps} />
  )

  const shouldRenderCinemaOverlay = cinema.enabled || cinema.keepMounted
  const cinemaOverlay = shouldRenderCinemaOverlay ? (
    <ErrorBoundary componentName="Cinema">
      <CinemaOverlay
        enabled={cinema.enabled}
        controlsVisible={cinema.controlsVisible}
        videoError={cinema.videoError}
        videoReady={cinema.videoReady}
        posterOnly={cinema.posterOnly}
        videoRef={cinema.videoRef}
        dialogRef={cinema.dialogRef}
        currentTrack={currentTrack}
        shouldPlay={shouldPlay}
        headerHeight={headerHeight}
        isFullscreen={cinema.isFullscreen}
        onFullscreenToggle={cinema.onFullscreenToggle}
        onVideoError={cinema.onVideoError}
        onVideoLoadedData={cinema.onVideoLoadedData}
        retryVideo={cinema.retryVideo}
        resetControlsTimer={cinema.resetControlsTimer}
        hideControlsImmediately={cinema.hideControlsImmediately}
        controlInsetLeft={panels.left.isOpen ? PANEL_POSITIONING.LEFT_PANEL.WIDTH + 16 : 16}
        controlInsetRight={panels.right.isOpen ? PANEL_POSITIONING.RIGHT_PANEL.WIDTH + 16 : 16}
        dream={cinema.dream}
      />
    </ErrorBoundary>
  ) : null

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden w-full max-w-full transition-opacity duration-150 ${viewHydrated ? "opacity-100" : "opacity-0"}`}
    >
      <DynamicBackground
        artworkUrl={currentTrack?.artworkUrl}
        enabled
        opacity={0.3}
        transitionDuration={1500}
      />
      <SessionBootstrap searchQuery={searchQuery} searchResults={searchResults} />
      <AppHeader
        headerRef={headerRef}
        onInfoOpen={onInfoOpen}
        onFeedbackOpen={onFeedbackOpen}
        onToggleLeftPanel={onToggleLeftPanel}
        isLeftPanelOpen={panels.left.isOpen}
        onToggleRightPanel={onToggleRightPanel}
        isRightPanelOpen={panels.right.isOpen}
        playbackControls={{
          isPlaying: Boolean(currentTrack && shouldPlay),
          isLoading: nowPlayingProps.isLoading,
          onPlayPause: nowPlayingProps.onPlayPause,
          onNext: currentTrack ? nowPlayingProps.onNext : undefined,
          onPrevious: currentTrack ? nowPlayingProps.onPrevious : undefined,
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        searchResults={searchResults}
        onSearchResultsChange={onSearchResultsChange}
        onWisdomSelect={onSearchWisdomSelect}
        onJournalSelect={onSearchJournalSelect}
        tracks={tracks}
        collections={collections}
        currentTrack={currentTrack}
        onTrackSelect={onSearchSelect}
        onTrackQueueAdd={onSearchQueueAdd}
        onCollectionSelect={onCollectionSelect}
        activeView={activeView}
        onViewChange={onViewChange}
        viewHydrated={viewHydrated}
        skipLinkTargetId="main-content-desktop"
      />
      <HomePageAnnouncements
        currentTrack={currentTrack}
        isPlaying={shouldPlay}
      />

      <PanelLayout
        leftPanel={desktopLeftPanel}
        rightPanel={desktopRightPanel}
        reserveLeftSpace={canReserveLeftSpace}
        reserveRightSpace={!isAiFullscreen && canReserveRightSpace}
        mainContentId="main-content-desktop"
        renderMiddleContent={(view) => (
          <>
            {renderMiddleContentForView(view)}
            {view === "hub" && <Footer onInfoOpen={onInfoOpen} />}
          </>
        )}
      />

      {cinemaOverlay}

      {/* AudioPlayer is rendered once in HomePageClient to prevent duplicate audio */}
      <ModalOrchestrator
        isWelcomeOpen={modals.isWelcomeOpen}
        onWelcomeClose={onWelcomeClose}
        isInfoOpen={modals.isInfoOpen}
        onInfoClose={onInfoClose}
        isTrackDetailsOpen={isTrackDetailsOpen}
        trackDetailsTrack={trackDetailsTrack}
        onTrackDetailsClose={onTrackDetailsClose}
        isCollectionDetailsOpen={modals.isCollectionDetailsOpen}
        collectionDetails={collectionDetails}
        collectionTracks={tracks}
        onCollectionDetailsClose={onCollectionDetailsClose}
        isKeyboardShortcutsOpen={modals.isKeyboardShortcutsOpen}
        onKeyboardShortcutsClose={onKeyboardShortcutsClose}
      />
    </div>
  )
}

const MemoizedDesktopShell = memo(DesktopShell)
export { MemoizedDesktopShell as DesktopShell }
