"use client"

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import { Settings, Play, Pause, SkipForward, SkipBack, Search, User, Menu, X, MonitorPlay, Sparkles, LayoutPanelLeft, Music, ChevronLeft, MessageCircle, ChevronDown, ChevronUp, Home, ListMusic, Book, Loader2 } from "lucide-react"
import { BrandGradientIcon } from "@/components/icons/BrandGradientIcon"
import { SearchBar } from "@/components/search/SearchBar"
import { SearchResultItem } from "@/components/search/SearchResultItem"
import { useAuth } from "@/contexts/AuthContext"
import { useModal } from "@/contexts/ModalContext"
import { useUI } from "@/contexts/UIContext"
import { useClickAway, useEscapeKey, useFocusTrap } from "@/hooks"
import { useCspStyle } from "@/hooks/use-csp-style"
import type { Track, Collection } from "@/lib/music"
import type { SearchContentResults } from "@/lib/search/search-results"
import type { ActiveView, LeftPanelTab } from "@/types"
import type { RefObject } from "react"

interface AppHeaderProps {
  headerRef: RefObject<HTMLDivElement | null>
  onInfoOpen: () => void
  onFeedbackOpen: () => void

  // Panel Toggles
  onToggleLeftPanel: () => void
  isLeftPanelOpen: boolean
  onToggleRightPanel: () => void
  isRightPanelOpen: boolean
  showLeftPanelToggle?: boolean

  // View Navigation
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
  viewHydrated?: boolean
  skipLinkTargetId?: string

  // Search Props
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  searchResults: Track[]
  onSearchResultsChange: (results: Track[]) => void
  tracks: Track[]
  collections: Collection[]
  currentTrack: Track | null
  playbackControls?: {
    isPlaying: boolean
    isLoading?: boolean
    onPlayPause?: () => void
    onNext?: () => void
    onPrevious?: () => void
  }
  onTrackSelect: (track: Track) => void
  onTrackQueueAdd: (track: Track) => void
  onCollectionSelect: (collection: Collection) => void
}

export function AppHeader({
  headerRef,
  onInfoOpen,
  onFeedbackOpen,
  onToggleLeftPanel,
  isLeftPanelOpen,
  onToggleRightPanel,
  isRightPanelOpen,
  showLeftPanelToggle = true,
  activeView,
  onViewChange,
  viewHydrated = true,
  skipLinkTargetId = "main-content",
  searchQuery,
  onSearchQueryChange,
  searchResults,
  onSearchResultsChange,
  tracks,
  collections,
  currentTrack,
  playbackControls,
  onTrackSelect,
  onTrackQueueAdd,
  onCollectionSelect,
}: AppHeaderProps) {
  const { leftPanelTab, setLeftPanelTab } = useUI()
  const { isAdmin, user } = useAuth()
  const { setAccountOpen } = useModal()
  const router = useRouter()

  const features: Array<{ id: ActiveView; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
    { id: "hub", label: "Hub", icon: Home, description: "Browse collections and featured tracks" },
    { id: "cinema", label: "Cinema", icon: MonitorPlay, description: "Visual experience with collection artwork and ambient visuals" },
    { id: "wisdom", label: "Wisdom", icon: Sparkles, description: "Curated knowledge, insights, and creative philosophy" },
    { id: "journal", label: "Journal", icon: Book, description: "Your private space for ideas and reflections" },
  ]

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [searchContentResults, setSearchContentResults] = useState<SearchContentResults | null>(null)
  const [searchOverlayHoveredIndex, setSearchOverlayHoveredIndex] = useState<number | null>(null)
  const searchOverlayRefs = useRef<Array<HTMLButtonElement | null>>([])
  const searchInputId = "header-search-input"

  // Navigation pill state - animate between tabs only after view hydration
  // Use a fixed width to avoid hydration wobble when fonts load.
  const NAV_BUTTON_WIDTH = 130
  const iconSizes: Record<ActiveView, string> = {
    hub: "h-4 w-4",
    cinema: "h-[19px] w-[19px]",
    wisdom: "h-[18px] w-[18px]",
    journal: "h-4 w-4",
  }
  const [pillTransitionsEnabled, setPillTransitionsEnabled] = useState(false)
  const [pillStyle, setPillStyle] = useState({ left: 4, width: NAV_BUTTON_WIDTH }) // Hub button offset + fixed width
  const navRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const pillStyleId = useCspStyle({
    left: `${pillStyle.left}px`,
    width: `${pillStyle.width}px`,
  })

  // Use layoutEffect to calculate exact position before browser paints
  useLayoutEffect(() => {
    const activeEl = navRefs.current.get(activeView)
    if (activeEl && activeEl.offsetWidth > 0) {
      setPillStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      })
    }
  }, [activeView])

  // Enable animations only after view hydration + first paint
  useEffect(() => {
    if (!viewHydrated || pillTransitionsEnabled) return
    let raf1: number | null = null
    let raf2: number | null = null

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setPillTransitionsEnabled(true)
      })
    })

    return () => {
      if (raf1 !== null) cancelAnimationFrame(raf1)
      if (raf2 !== null) cancelAnimationFrame(raf2)
    }
  }, [pillTransitionsEnabled, viewHydrated])

  // Admin keyboard shortcut: Ctrl/Cmd+Shift+A to toggle admin dashboard
  useEffect(() => {
    if (!isAdmin) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey
      if (isModifier && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        const isOnAdmin = window.location.pathname.startsWith('/admin')
        router.push(isOnAdmin ? '/app' : '/admin')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAdmin, router])

  const activeFeature = features.find((f) => f.id === activeView) || features[0]
  const ActiveIcon = activeFeature.icon

  const handleDropdownToggle = useCallback(() => {
    setIsDropdownOpen((prev) => !prev)
  }, [])

  const handleViewSelect = useCallback((view: ActiveView) => {
    onViewChange(view)
    setIsDropdownOpen(false)
  }, [onViewChange])

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false)
  }, [])

  useClickAway(dropdownRef, () => setIsDropdownOpen(false), { enabled: isDropdownOpen })
  useEscapeKey(() => setIsDropdownOpen(false), { enabled: isDropdownOpen })

  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false)
  const [searchOverlayTop, setSearchOverlayTop] = useState(72)
  const searchOverlayRef = useRef<HTMLDivElement>(null)
  const searchOverlayStyleId = useCspStyle({
    top: `${searchOverlayTop}px`,
  })

  const openSearchOverlay = useCallback(() => {
    setIsSearchOverlayOpen(true)
  }, [])

  const closeSearchOverlay = useCallback(() => {
    setIsSearchOverlayOpen(false)
    onSearchQueryChange("")
  }, [onSearchQueryChange])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchContentResults(null)
    }
  }, [searchQuery])

  const toggleLeftPanelTab = useCallback((tab: LeftPanelTab) => {
    if (isLeftPanelOpen) {
      // Music pill should collapse the panel from any tab.
      if (tab === "browse" || leftPanelTab === tab) {
        onToggleLeftPanel()
        return
      }
    }
    setLeftPanelTab(tab)
    if (!isLeftPanelOpen) {
      onToggleLeftPanel()
    }
  }, [isLeftPanelOpen, leftPanelTab, onToggleLeftPanel, setLeftPanelTab])

  useEffect(() => {
    const handleOpenSearch = () => {
      openSearchOverlay()
    }
    window.addEventListener("metadj:openSearch", handleOpenSearch)
    return () => window.removeEventListener("metadj:openSearch", handleOpenSearch)
  }, [openSearchOverlay])

  useEffect(() => {
    if (!isSearchOverlayOpen) return

    const updateOverlayTop = () => {
      const bottom = headerRef.current?.getBoundingClientRect().bottom
      setSearchOverlayTop((bottom ?? 60) + 12)
    }
    updateOverlayTop()
    window.addEventListener("resize", updateOverlayTop)

    const focusTimer = window.setTimeout(() => {
      const searchInput = document.getElementById("metadj-search-input") as HTMLInputElement | null
      searchInput?.focus()
    }, 0)

    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener("resize", updateOverlayTop)
    }
  }, [headerRef, isSearchOverlayOpen])

  useClickAway(searchOverlayRef, closeSearchOverlay, { enabled: isSearchOverlayOpen })
  useEscapeKey(closeSearchOverlay, { enabled: isSearchOverlayOpen })
  useFocusTrap(searchOverlayRef, { enabled: isSearchOverlayOpen, autoFocus: false })

  const resolvedSearchContentResults: SearchContentResults = searchContentResults ?? {
    tracks: searchResults,
    collections: [],
    wisdom: [],
    journal: [],
    totalCount: searchResults.length,
  }

  const handleOverlayTrackSelect = useCallback((track: Track) => {
    onTrackSelect(track)
    closeSearchOverlay()
  }, [onTrackSelect, closeSearchOverlay])

  const handleOverlayCollectionSelect = useCallback((collection: Collection) => {
    onCollectionSelect(collection)
    closeSearchOverlay()
  }, [onCollectionSelect, closeSearchOverlay])

  const handleOverlayResultKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    type: 'track' | 'collection',
    item: Track | Collection
  ) => {
    const refs = searchOverlayRefs.current

    if (event.key === "ArrowDown") {
      event.preventDefault()
      const next = refs[index + 1] ?? refs[0]
      next?.focus()
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      if (index === 0) {
        document.getElementById(searchInputId)?.focus()
      } else {
        refs[index - 1]?.focus()
      }
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      if (type === "track") {
        handleOverlayTrackSelect(item as Track)
      } else if (type === "collection") {
        handleOverlayCollectionSelect(item as Collection)
      }
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      closeSearchOverlay()
    }
  }, [
    handleOverlayTrackSelect,
    handleOverlayCollectionSelect,
    closeSearchOverlay,
    searchInputId
  ])

  useEffect(() => {
    if (!isSearchOverlayOpen) {
      setSearchOverlayHoveredIndex(null)
    }
    searchOverlayRefs.current = []
  }, [isSearchOverlayOpen, searchQuery])

  return (
    <>
      <header
        ref={headerRef as React.RefObject<HTMLElement>}
        className="hidden min-[1100px]:block fixed top-0 left-0 right-0 z-100 backdrop-blur-3xl transition-all duration-300"
      >
        {/* Skip Link for Keyboard Navigation - Accessibility */}
        <a
          href={`#${skipLinkTargetId}`}
          className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[110] focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg focus:font-medium focus-ring-light"
        >
          Skip to main content
        </a>

        {/* Darker Background to match Side Panels */}
        <div className="absolute inset-0 bg-(--bg-surface-base)/90 pointer-events-none" />

        {/* Subtle Background Blobs - Matching LeftPanel style */}
        <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[60%] bg-purple-600/5 blur-[80px] pointer-events-none" />
        <div className="absolute top-[40%] -right-[20%] w-[80%] h-[60%] bg-blue-600/5 blur-[80px] pointer-events-none" />

        {/* Bottom Border - Floating Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="relative w-full px-4 sm:px-6 py-3">
          <div className="relative flex flex-nowrap items-center justify-between gap-x-1 min-h-[44px] min-[1100px]:h-12">

            {/* LEFT ZONE: Logo + Player Pill */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Mobile/Tablet Logo - Wordmark + "Nexus" suffix (visible below 1100px) */}
              <button
                type="button"
                onClick={() => onViewChange("hub")}
                className="flex min-[1100px]:hidden items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                aria-label="Go to Hub"
              >
                <div className="relative h-6 w-16">
                  <Image
                    src="/images/metadj-logo-wordmark.png"
                    alt="MetaDJ"
                    fill
                    priority
                    sizes="64px"
                    className="object-contain object-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]"
                  />
                </div>
                <span className="font-heading font-bold text-sm tracking-wide text-gradient-primary">
                  Nexus
                </span>
              </button>

              {/* Desktop Logo - Full wordmark + "Nexus" suffix (visible at 1100px+) */}
              <button
                type="button"
                onClick={() => onViewChange("hub")}
                className="hidden min-[1100px]:flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                aria-label="Go to Hub"
              >
                <div className="relative h-8 w-24">
                  <Image
                    src="/images/metadj-logo-wordmark.png"
                    alt="MetaDJ"
                    fill
                    priority
                    sizes="96px"
                    className="object-contain object-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]"
                  />
                </div>
                <span className="font-heading font-bold text-lg tracking-wide text-gradient-primary">
                  Nexus
                </span>
              </button>

              {/* Desktop: Playback pill - Balanced Size (visible at 1100px+) */}
              <div className="hidden min-[1100px]:flex items-center gap-2 rounded-full border border-white/15 bg-black/25 backdrop-blur-xl px-2 py-1 shadow-[0_10px_28px_rgba(0,0,0,0.55)] w-auto min-w-[400px] max-w-[480px] shrink-0">
                <button
                  id="tour-toggle-music"
                  type="button"
                  onClick={() => toggleLeftPanelTab("browse")}
                  className={clsx(
                    "group/music flex items-center gap-2 w-[200px] min-w-[200px] max-w-[200px] overflow-hidden rounded-full px-2.5 py-1.5 border transition-all duration-300 focus-ring-glow touch-manipulation",
                    isLeftPanelOpen && leftPanelTab === "browse"
                      ? "border-purple-500/50 gradient-4-soft shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                      : "border-white/25 bg-white/5 hover:border-purple-400/40 hover-gradient-2"
                  )}
                  aria-label={currentTrack ? "Open Music Library" : "Open Music Library (Choose a Track)"}
                >
                  <BrandGradientIcon icon={Music} className="h-4 w-4 shrink-0 group-hover/music:scale-110 transition-transform duration-300" strokeWidth={2.5} />
                  <span className="truncate flex-1 text-sm font-heading font-semibold text-white/90 group-hover/music:text-white transition-colors">
                    {currentTrack ? currentTrack.title : "Play Music"}
                  </span>
                  <ChevronDown className={clsx("h-3.5 w-3.5 shrink-0 text-white/50 group-hover/music:text-white transition-all duration-300", isLeftPanelOpen && leftPanelTab === "browse" && "rotate-180")} strokeWidth={3} />
                </button>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={playbackControls?.onPrevious}
                    disabled={!playbackControls?.onPrevious}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition focus-ring-glow touch-manipulation disabled:opacity-40 disabled:hover:bg-white/5"
                    aria-label="Previous track"
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={playbackControls?.onPlayPause}
                    disabled={!playbackControls?.onPlayPause || playbackControls?.isLoading}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition focus-ring-glow touch-manipulation disabled:opacity-40 disabled:hover:bg-white/10"
                    aria-label={playbackControls?.isLoading ? "Loading" : playbackControls?.isPlaying ? "Pause" : "Play"}
                  >
                    {playbackControls?.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : playbackControls?.isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={playbackControls?.onNext}
                    disabled={!playbackControls?.onNext}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition focus-ring-glow touch-manipulation disabled:opacity-40 disabled:hover:bg-white/5"
                    aria-label="Next track"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleLeftPanelTab("queue")}
                    disabled={!currentTrack}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition focus-ring-glow touch-manipulation disabled:opacity-40 disabled:hover:bg-white/5"
                    aria-label={isLeftPanelOpen && leftPanelTab === "queue" ? "Close Queue" : "Open Queue"}
                  >
                    <ListMusic className="h-4 w-4" />
                  </button>
                  <button
                    id="tour-search-toggle"
                    type="button"
                    onClick={isSearchOverlayOpen ? closeSearchOverlay : openSearchOverlay}
                    className={clsx(
                      "inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition focus-ring-glow touch-manipulation",
                      (isSearchOverlayOpen || Boolean(searchQuery.trim())) && "bg-white/10 text-white"
                    )}
                    aria-label="Search music"
                    aria-pressed={isSearchOverlayOpen}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* CENTER ZONE: View Toggles + Playback / Search */}
            <div className="order-3 w-full max-w-2xl mx-auto flex items-center gap-3 justify-center min-[1100px]:static min-[1100px]:order-none min-[1100px]:transform-none min-[1100px]:w-auto min-[1100px]:gap-4 min-[1100px]:mr-auto min-[1100px]:ml-1">
              {/* Compact View Dropdown (1100px-1300px) - Prevents cutoff on smaller desktop windows */}
              <div
                className="hidden min-[1100px]:block min-[1300px]:hidden relative"
                ref={dropdownRef}
                onBlur={(e) => {
                  if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
                    closeDropdown()
                  }
                }}
              >
                <button
                  type="button"
                  onClick={handleDropdownToggle}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md text-white transition-all duration-300 hover:bg-white/10",
                    isDropdownOpen
                      ? "border-purple-500/50 gradient-4-soft shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                      : "border-white/20 bg-black/25"
                  )}
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                  aria-label={`Current view: ${activeFeature.label}. Click to change view.`}
                >
                  <ActiveIcon className="h-4 w-4 text-cyan-300" />
                  <span className="text-sm font-heading font-bold uppercase tracking-wide">{activeFeature.label}</span>
                  <ChevronDown className={clsx("h-3.5 w-3.5 text-white/70 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
                </button>

                {isDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 w-48 rounded-2xl border border-white/15 bg-(--bg-surface-base)/95 backdrop-blur-xl shadow-xl shadow-black/50 overflow-hidden z-[110]"
                    role="listbox"
                    aria-label="Select view"
                  >
                    {features.map((feature) => {
                      const Icon = feature.icon
                      const isActive = activeView === feature.id
                      return (
                        <button
                          key={feature.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleViewSelect(feature.id)}
                          className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200",
                            isActive
                              ? "bg-white/15 text-white"
                              : "text-white/70 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <Icon className={clsx("h-4 w-4 shrink-0", isActive ? "text-cyan-300" : "text-white/60")} />
                          <span className="text-sm font-heading font-semibold">{feature.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Desktop View Toggles (Integrated into Header) - visible at 1300px+ */}
              <div className="hidden min-[1300px]:flex items-center bg-black/20 rounded-full px-1 py-1 border border-(--border-subtle) backdrop-blur-md relative group/nav">
                {/* Pill Background - visible immediately with sensible defaults */}
                <div
                  className={clsx(
                    "absolute left-1 top-1 bottom-1 w-[130px] rounded-full bg-white/15 border border-(--border-elevated) shadow-[0_0_20px_rgba(124,58,237,0.25)] backdrop-blur-md pointer-events-none",
                    pillTransitionsEnabled && "transition-all duration-300 ease-out"
                  )}
                  data-csp-style={pillStyleId}
                />

                {features.map((feature) => {
                  const Icon = feature.icon
                  const isActive = activeView === feature.id
                  return (
                    <button
                      key={feature.id}
                      ref={(el) => {
                        if (el) navRefs.current.set(feature.id, el)
                        else navRefs.current.delete(feature.id)
                      }}
                      id={`tour-nav-${feature.id}`}
                      type="button"
                      onClick={() => onViewChange(feature.id)}
                      title={feature.description}
                      className={clsx(
                        "relative z-10 flex w-[130px] items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-heading font-bold uppercase tracking-wide",
                        isActive
                          ? "text-white"
                          : "text-white/70 hover:text-white"
                      )}
                      aria-pressed={isActive}
                      aria-label={`${feature.label}: ${feature.description}`}
                    >
                      <Icon
                        className={clsx(
                          "shrink-0 transition-colors duration-300",
                          iconSizes[feature.id],
                          isActive ? "text-cyan-300" : "text-white/70"
                        )}
                      />
                      <span className="whitespace-nowrap transition-colors duration-300">{feature.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Mobile: Full Music Pill (visible below 1100px when bottom nav is active) */}
              {/* Use absolute positioning to ensure true center regardless of logo width */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex min-[1100px]:hidden justify-center">
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/25 backdrop-blur-xl px-2.5 py-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.55)] w-[320px] sm:w-[360px]">
                  <button
                    type="button"
                    onClick={() => toggleLeftPanelTab("browse")}
                    className={clsx(
                      "group/music-mobile flex items-center gap-2 flex-1 min-w-0 overflow-hidden rounded-full px-2 py-1 border transition-all duration-300 active:scale-95 focus-ring-glow touch-manipulation",
                      isLeftPanelOpen && leftPanelTab === "browse"
                        ? "border-purple-500/50 gradient-4-soft shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                        : "border-white/25 bg-white/5 hover:border-purple-400/40 hover-gradient-2"
                    )}
                    aria-label={currentTrack ? "Open Music Library" : "Open Music Library (choose a track)"}
                  >
                    <BrandGradientIcon icon={Music} className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                    <span className="truncate flex-1 text-sm font-heading font-semibold text-white/90">
                      {currentTrack ? currentTrack.title : "Play Music"}
                    </span>
                    <ChevronDown className={clsx("h-5 w-5 shrink-0 text-white/60 transition-transform duration-300", isLeftPanelOpen && leftPanelTab === "browse" && "rotate-180")} strokeWidth={3} />
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={playbackControls?.onPrevious}
                      disabled={!playbackControls?.onPrevious}
                      className="inline-flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition focus-ring-glow touch-manipulation disabled:opacity-40 disabled:hover:bg-white/5"
                      aria-label="Previous track"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={playbackControls?.onPlayPause}
                      disabled={!playbackControls?.onPlayPause || playbackControls?.isLoading}
                      className="inline-flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition focus-ring-glow touch-manipulation disabled:opacity-40 disabled:hover:bg-white/10"
                      aria-label={playbackControls?.isLoading ? "Loading" : playbackControls?.isPlaying ? "Pause" : "Play"}
                    >
                      {playbackControls?.isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : playbackControls?.isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 ml-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={playbackControls?.onNext}
                      disabled={!playbackControls?.onNext}
                      className="inline-flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition focus-ring-glow touch-manipulation disabled:opacity-40 disabled:hover:bg-white/5"
                      aria-label="Next track"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleLeftPanelTab("queue")}
                      disabled={!currentTrack}
                      className="inline-flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition focus-ring-glow touch-manipulation disabled:opacity-40 disabled:hover:bg-white/5"
                      aria-label={isLeftPanelOpen && leftPanelTab === "queue" ? "Close Queue" : "Open Queue"}
                    >
                      <ListMusic className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={isSearchOverlayOpen ? closeSearchOverlay : openSearchOverlay}
                      className={clsx(
                        "inline-flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition focus-ring-glow touch-manipulation",
                        (isSearchOverlayOpen || Boolean(searchQuery.trim())) && "bg-white/10 text-white"
                      )}
                      aria-label="Search music"
                      aria-pressed={isSearchOverlayOpen}
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT ZONE: Account, MetaDJai Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              {user && (
                <button
                  type="button"
                  onClick={() => setAccountOpen(true)}
                  className="hidden min-[1100px]:inline-flex items-center justify-center h-9 w-9 rounded-full border border-(--border-subtle) bg-black/20 backdrop-blur-md text-white/80 hover:text-white hover:border-purple-400/40 hover:bg-white/10 transition-all duration-300 focus-ring-glow touch-manipulation"
                  aria-label="Account Settings"
                  title="Account Settings"
                >
                  <User className="h-4 w-4" />
                </button>
              )}
              {/* MetaDJai Pill Button - Hidden below 1100px (bottom nav handles it) */}
              <button
                id="tour-toggle-ai"
                type="button"
                onClick={onToggleRightPanel}
                className={clsx(
                  "hidden min-[1100px]:flex items-center gap-2 px-5 py-2 rounded-full text-sm font-heading font-bold uppercase tracking-wide border transition-all duration-300 focus-ring-glow touch-manipulation",
                  isRightPanelOpen
                    ? "border-cyan-500/50 gradient-4-soft text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                    : "border-white/25 bg-white/5 backdrop-blur-md text-white/90 hover:border-purple-400/40 hover-gradient-2 hover:text-white"
                )}
                aria-label={isRightPanelOpen ? "Close MetaDJai" : "Open MetaDJai"}
                aria-pressed={isRightPanelOpen}
              >
                <BrandGradientIcon icon={MessageCircle} className={clsx("h-4 w-4 transition-colors duration-300", isRightPanelOpen ? "text-cyan-300" : "")} strokeWidth={2.5} />
                <span className="transition-colors duration-300">MetaDJai</span>
                <ChevronDown
                  className={clsx(
                    "h-4 w-4 shrink-0 text-white/50 transition-all duration-300",
                    isRightPanelOpen && "rotate-180 text-white/80"
                  )}
                  strokeWidth={3}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      {isSearchOverlayOpen && (
        <div
          ref={searchOverlayRef}
          className="fixed left-1/2 -translate-x-1/2 z-[130] w-full max-w-3xl px-4"
          data-csp-style={searchOverlayStyleId}
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-overlay-title"
          aria-describedby="search-overlay-description"
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-(--bg-surface-base)/95 shadow-[0_22px_60px_rgba(18,15,45,0.65)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 bg-black/20">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80">
                  <Search className="h-4 w-4" />
                </span>
                <div className="leading-tight">
                  <p id="search-overlay-title" className="text-[0.65rem] uppercase tracking-[0.32em] text-(--text-muted)">Search</p>
                  <p id="search-overlay-description" className="text-sm font-heading font-semibold text-white">Music, collections, playlists</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSearchOverlay}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition focus-ring-glow"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <SearchBar
                tracks={tracks}
                collections={activeView === 'hub' ? undefined : collections}
                currentTrack={currentTrack}
                onTrackSelect={(track) => {
                  onTrackSelect(track)
                  closeSearchOverlay()
                }}
                onTrackQueueAdd={onTrackQueueAdd}
                onCollectionSelect={(collection) => {
                  onCollectionSelect(collection)
                  closeSearchOverlay()
                }}
                value={searchQuery}
                onValueChange={onSearchQueryChange}
                onResultsChange={onSearchResultsChange}
                onContentResultsChange={setSearchContentResults}
                className="w-full"
                hideIcon={false}
                disableDropdown={true}
                inputId={searchInputId}
                placeholder="Search music, collections, playlists..."
              />
            </div>

            {/* Inline Search Results - Music only (collections, tracks) */}
            {searchQuery.trim().length >= 1 && (
              <div className="border-t border-white/10 max-h-[60vh] overflow-y-auto">
                {(() => {
                  const { collections: collectionResults, tracks: trackResults } = resolvedSearchContentResults
                  const visibleCollections = collectionResults.slice(0, 3)
                  const visibleTracks = trackResults.slice(0, 8)
                  const collectionOffset = 0
                  const trackOffset = collectionOffset + visibleCollections.length
                  const musicTotalCount = collectionResults.length + trackResults.length

                  if (musicTotalCount === 0) {
                    return (
                      <div className="text-center py-8">
                        <Search className="h-8 w-8 text-white/30 mx-auto mb-2" />
                        <p className="text-sm text-(--text-muted)">No results found</p>
                        <p className="text-xs text-muted-accessible mt-1">Try different keywords</p>
                      </div>
                    )
                  }

                  return (
                    <div className="divide-y divide-white/5">
                      {visibleCollections.length > 0 && (
                        <div className="px-4 py-3">
                          <p className="text-xs uppercase tracking-wider text-(--text-muted) mb-2">Collections</p>
                          <div className="space-y-1">
                            {visibleCollections.map((collection, index) => {
                              const actualIndex = collectionOffset + index
                              return (
                              <button
                                key={collection.id}
                                type="button"
                                onClick={() => handleOverlayCollectionSelect(collection)}
                                onKeyDown={(event) => handleOverlayResultKeyDown(event, actualIndex, "collection", collection)}
                                onMouseEnter={() => setSearchOverlayHoveredIndex(actualIndex)}
                                onMouseLeave={() => setSearchOverlayHoveredIndex((current) => (current === actualIndex ? null : current))}
                                onFocus={() => setSearchOverlayHoveredIndex(actualIndex)}
                                onBlur={() => setSearchOverlayHoveredIndex((current) => (current === actualIndex ? null : current))}
                                ref={(element) => {
                                  searchOverlayRefs.current[actualIndex] = element
                                }}
                                className={clsx(
                                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left focus-ring-glow",
                                  searchOverlayHoveredIndex === actualIndex ? "bg-white/10" : "hover:bg-white/5"
                                )}
                              >
                                <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0">
                                  <Image
                                    src={`/images/${collection.id}-collection.svg`}
                                    alt={collection.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{collection.title}</p>
                                  <p className="text-xs text-(--text-muted)">{collection.trackCount} tracks</p>
                                </div>
                              </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {visibleTracks.length > 0 && (
                        <div className="px-4 py-3">
                          <p className="text-xs uppercase tracking-wider text-(--text-muted) mb-2">Tracks</p>
                          <div className="space-y-1" role="listbox" aria-label="Track results">
                            {visibleTracks.map((track, index) => {
                              const actualIndex = trackOffset + index
                              return (
                              <SearchResultItem
                                key={track.id}
                                track={track}
                                index={actualIndex}
                                isActive={track.id === currentTrack?.id}
                                isHovered={searchOverlayHoveredIndex === actualIndex}
                                onSelect={() => handleOverlayTrackSelect(track)}
                                onQueueAdd={() => onTrackQueueAdd(track)}
                                onKeyDown={(event) => handleOverlayResultKeyDown(event, actualIndex, "track", track)}
                                onMouseEnter={() => setSearchOverlayHoveredIndex(actualIndex)}
                                onMouseLeave={() => setSearchOverlayHoveredIndex((current) => (current === actualIndex ? null : current))}
                                onFocus={() => setSearchOverlayHoveredIndex(actualIndex)}
                                onBlur={() => setSearchOverlayHoveredIndex((current) => (current === actualIndex ? null : current))}
                                buttonRef={(element) => {
                                  searchOverlayRefs.current[actualIndex] = element
                                }}
                              />
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
