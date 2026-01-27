"use client"

import { memo, useRef } from "react"
import dynamic from "next/dynamic"
import { X } from "lucide-react"
import { HomePageAnnouncements } from "@/components/home/HomePageAnnouncements"
import { AppHeader } from "@/components/layout/AppHeader"
import { Footer } from "@/components/layout/Footer"
import { MetaDjAiChat } from "@/components/metadjai/MetaDjAiChat"
import { ModalOrchestrator } from "@/components/modals/ModalOrchestrator"
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav"
import { LeftPanel } from "@/components/panels/left-panel/LeftPanel"
import { NowPlayingSection } from "@/components/panels/left-panel/NowPlayingSection"
import { SessionBootstrap } from "@/components/session/SessionBootstrap"
import { ErrorBoundary } from "@/components/ui"
import { DynamicBackground } from "@/components/visuals"
import { Journal } from "@/components/wisdom/Journal"
import { WisdomExperience } from "@/components/wisdom/WisdomExperience"
import { useUI } from "@/contexts/UIContext"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { useSwipeGesture } from "@/hooks/use-swipe-gesture"
import type { WisdomDeepLink } from "@/lib/wisdom"
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

export interface MobileShellProps {
  headerRef: RefObject<HTMLDivElement | null>
  tracks: Track[]
  collections: Collection[]
  recentlyPlayed: Track[]
  currentTrack: Track | null
  shouldPlay: boolean
  headerHeight: number
  searchQuery: string
  searchResults: Track[]
  activeView: ActiveView
  shouldMountView?: (view: ActiveView) => boolean
  viewHydrated?: boolean
  wisdomDeepLink?: WisdomDeepLink | null
  onWisdomDeepLinkConsumed?: () => void
  cinema: CinemaState
  modals: ModalState
  collectionDetails: Collection | null
  collectionTracks: Track[]
  isTrackDetailsOpen: boolean
  trackDetailsTrack: Track | null
  onInfoOpen: () => void
  onFeedbackOpen: () => void
  onInfoClose: () => void
  onTrackDetailsClose: () => void
  onCollectionDetailsClose: () => void
  onKeyboardShortcutsClose: () => void
  onToggleLeftPanel: () => void
  onToggleRightPanel: () => void
  isLeftPanelOpen: boolean
  onSearchQueryChange: (query: string) => void
  onSearchResultsChange: (results: Track[]) => void
  onTrackSelect: (track: Track, tracks?: Track[]) => void
  onCollectionSelect: (collection: Collection) => void
  onTrackQueueAdd: (track: Track) => void
  onViewChange: (view: ActiveView) => void
  onMetaDjAiToggle: () => void
  hubContent: ReactNode
  onOpenGuide: () => void
  metaDjAiChatProps: MetaDjAiChatProps & { headerHeight: number }
  audioPlayerProps: AudioPlayerProps
  queue: Track[]
  isShuffleEnabled: boolean
  repeatMode: RepeatMode
  onQueueReorder?: (fromIndex: number, toIndex: number) => void
  onQueueRemove?: (trackId: string) => void
  onQueueInsert?: (tracks: Track[], index: number) => void
  onShuffleToggle?: () => void
  onRepeatChange?: (mode: RepeatMode) => void
  nowPlayingProps: React.ComponentProps<typeof NowPlayingSection>
}

function MobileShell({
  headerRef,
  tracks,
  collections,
  recentlyPlayed,
  currentTrack,
  shouldPlay,
  headerHeight,
  searchQuery,
  searchResults,
  activeView,
  shouldMountView,
  viewHydrated = true,
  wisdomDeepLink,
  onWisdomDeepLinkConsumed,
  cinema,
  modals,
  collectionDetails,
  collectionTracks,
  isTrackDetailsOpen,
  trackDetailsTrack,
  onInfoOpen,
  onFeedbackOpen,
  onInfoClose,
  onTrackDetailsClose,
  onCollectionDetailsClose,
  onKeyboardShortcutsClose,
  onToggleLeftPanel,
  onToggleRightPanel,
  isLeftPanelOpen,
  onSearchQueryChange,
  onSearchResultsChange,
  onTrackSelect,
  onCollectionSelect,
  onTrackQueueAdd,
  onViewChange,
  onMetaDjAiToggle,
  hubContent,
  onOpenGuide,
  metaDjAiChatProps,
  audioPlayerProps,
  queue,
  isShuffleEnabled,
  repeatMode,
  onQueueReorder,
  onQueueRemove,
  onQueueInsert,
  onShuffleToggle,
  onRepeatChange,
  nowPlayingProps,
}: MobileShellProps) {
  // Access UI context for wisdom section tracking
  const { setWisdomSection } = useUI()

  // Ref for mobile left panel swipe-to-close gesture
  const leftPanelOverlayRef = useRef<HTMLDivElement>(null)

  // Enable swipe right to close left panel on mobile
  useSwipeGesture(leftPanelOverlayRef, {
    onSwipeRight: () => {
      if (isLeftPanelOpen) {
        onToggleLeftPanel()
      }
    },
    minSwipeDistance: 60,
    maxCrossAxisDistance: 120,
  })
  useFocusTrap(leftPanelOverlayRef, { enabled: isLeftPanelOpen, autoFocus: true })

  const canMountHub = shouldMountView ? shouldMountView("hub") : true
  const canMountWisdom = shouldMountView ? shouldMountView("wisdom") : true
  const canMountJournal = shouldMountView ? shouldMountView("journal") : true

  const shouldRenderCinemaOverlay = cinema.enabled || cinema.keepMounted
  const fullscreenCinema = shouldRenderCinemaOverlay ? (
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
        isFullscreen
        onFullscreenToggle={cinema.onFullscreenToggle}
        onVideoError={cinema.onVideoError}
        onVideoLoadedData={cinema.onVideoLoadedData}
        retryVideo={cinema.retryVideo}
        resetControlsTimer={cinema.resetControlsTimer}
        hideControlsImmediately={cinema.hideControlsImmediately}
        controlInsetLeft={16}
        controlInsetRight={16}
        dream={cinema.dream}
      />
    </ErrorBoundary>
  ) : null

  return (
    <div className={`flex flex-col min-h-screen overflow-x-hidden w-full max-w-full transition-opacity duration-150 ${viewHydrated ? 'opacity-100' : 'opacity-0'}`}>
      {/* Skip Link for Keyboard Navigation - Mobile Accessibility (WCAG 2.4.1) */}
      <a
        href="#main-content-mobile"
        className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[110] focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg focus:font-medium focus-ring-light"
      >
        Skip to main content
      </a>
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
        isLeftPanelOpen={isLeftPanelOpen}
        showLeftPanelToggle={true}
        onToggleRightPanel={onToggleRightPanel}
        isRightPanelOpen={modals.isMetaDjAiOpen}
        playbackControls={{
          isPlaying: shouldPlay,
          isLoading: nowPlayingProps.isLoading,
          onPlayPause: nowPlayingProps.onPlayPause,
          onNext: nowPlayingProps.onNext,
          onPrevious: nowPlayingProps.onPrevious,
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        searchResults={searchResults}
        onSearchResultsChange={onSearchResultsChange}
        tracks={tracks}
        collections={collections}
        currentTrack={currentTrack}
        onTrackSelect={onTrackSelect}
        onTrackQueueAdd={onTrackQueueAdd}
        onCollectionSelect={onCollectionSelect}
        activeView={activeView}
        onViewChange={onViewChange}
        viewHydrated={viewHydrated}
        skipLinkTargetId="main-content-mobile"
      />

      {/* Mobile Left Panel Overlay */}
      {isLeftPanelOpen && (
        <div
          ref={leftPanelOverlayRef}
          className="fixed inset-0 z-[95] flex flex-col bg-(--bg-surface-base)/98 backdrop-blur-xl touch-manipulation pb-[calc(var(--mobile-nav-height,56px)_+_env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]"
          role="dialog"
          aria-modal="true"
          aria-label="Music library"
        >
          <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[60%] bg-(--metadj-purple)/5 blur-[80px] pointer-events-none" aria-hidden="true" />
          <div className="absolute top-[40%] -right-[20%] w-[80%] h-[60%] bg-(--metadj-blue)/5 blur-[80px] pointer-events-none" aria-hidden="true" />

          {/* Close button for accessibility - visible alternative to swipe gesture */}
          <div className="relative z-10 flex justify-end px-4 pt-3 pb-1">
            <button
              type="button"
              onClick={onToggleLeftPanel}
              aria-label="Close music library"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors focus-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <ErrorBoundary componentName="Left Panel">
              <LeftPanel
                queue={queue}
                allTracks={tracks}
                recentlyPlayed={recentlyPlayed}
                onQueueReorder={onQueueReorder}
                onQueueRemove={onQueueRemove}
                onQueueInsert={onQueueInsert}
                onSearchSelect={onTrackSelect}
                onTrackPlay={onTrackSelect}
                onSearchQueueAdd={onTrackQueueAdd}
                shuffle={isShuffleEnabled}
                repeatMode={repeatMode}
                onShuffleToggle={onShuffleToggle}
                onRepeatChange={onRepeatChange}
                activeView={activeView}
                onViewChange={onViewChange}
                nowPlayingProps={nowPlayingProps}
                collections={collections}
                isMobileOverlay={true}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}
      <HomePageAnnouncements
        currentTrack={currentTrack}
        isPlaying={shouldPlay}
      />
      {/* Adaptive view mounting to balance seamless switching with lower-end performance */}
      <main id="main-content-mobile" tabIndex={-1} className="relative flex flex-col flex-1 min-h-0 pb-[calc(var(--mobile-nav-height,56px)_+_env(safe-area-inset-bottom))]">
        <section
          id="hub-content"
          className={`relative flex-1 ${activeView !== "hub" && activeView !== "cinema" ? "hidden" : ""
            }`}
          aria-label="Hub content"
          aria-hidden={activeView !== "hub" && activeView !== "cinema"}
        >
          {canMountHub ? hubContent : null}
        </section>
        <section
          id="wisdom-content"
          className={`relative flex-1 ${activeView !== "wisdom" ? "hidden" : ""
            }`}
          aria-label="Wisdom content"
          aria-hidden={activeView !== "wisdom"}
        >
          {canMountWisdom ? (
            <WisdomExperience
              active={activeView === "wisdom"}
              deepLink={wisdomDeepLink}
              onDeepLinkConsumed={onWisdomDeepLinkConsumed}
              onSectionChange={setWisdomSection}
            />
          ) : null}
        </section>
        <section
          id="journal-content"
          className={`relative flex-1 ${activeView !== "journal" ? "hidden" : ""
            }`}
          aria-label="Journal content"
          aria-hidden={activeView !== "journal"}
        >
          {canMountJournal ? <Journal /> : null}
        </section>
      </main>

      <MobileBottomNav
        activeView={activeView}
        onViewChange={onViewChange}
        isMusicOpen={isLeftPanelOpen}
        onMusicToggle={onToggleLeftPanel}
        isMetaDjAiOpen={modals.isMetaDjAiOpen}
        onMetaDjAiToggle={onMetaDjAiToggle}
      />
      {activeView === "hub" && <Footer onInfoOpen={onInfoOpen} />}
      {fullscreenCinema}
      <ErrorBoundary componentName="MetaDJai Chat">
        <MetaDjAiChat {...metaDjAiChatProps} isMobileOverlay />
      </ErrorBoundary>
      {/* AudioPlayer is rendered once in HomePageClient to prevent duplicate audio */}
      <ModalOrchestrator
        isInfoOpen={modals.isInfoOpen}
        onInfoClose={onInfoClose}
        isTrackDetailsOpen={isTrackDetailsOpen}
        trackDetailsTrack={trackDetailsTrack}
        onTrackDetailsClose={onTrackDetailsClose}
        isCollectionDetailsOpen={modals.isCollectionDetailsOpen}
        collectionDetails={collectionDetails}
        collectionTracks={collectionTracks}
        onCollectionDetailsClose={onCollectionDetailsClose}
        isKeyboardShortcutsOpen={modals.isKeyboardShortcutsOpen}
        onKeyboardShortcutsClose={onKeyboardShortcutsClose}
      />
    </div>
  )
}

const MemoizedMobileShell = memo(MobileShell)
export { MemoizedMobileShell as MobileShell }
