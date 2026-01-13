"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import clsx from "clsx"
import {
  Sparkles,
  Home,
  Music,
  Palette,
  BookOpen,
  Book,
  MessageSquare,
  ListMusic,
  Search,
  Keyboard,
  ChevronRight,
  Lightbulb,
  Info,
} from "lucide-react"
import { ToggleButton } from "@/components/ui"
import { useUI } from "@/contexts/UIContext"
import {
  GUIDE_NAV_SECTIONS,
  GUIDE_WELCOME,
  GUIDE_QUICK_START,
  GUIDE_CORE_SURFACES,
  GUIDE_COLLECTIONS,
  GUIDE_METADJAI,
  GUIDE_QUEUE,
  GUIDE_SEARCH,
  GUIDE_SHORTCUTS,
  GUIDE_HELP,
} from "@/lib/content/meta-dj-nexus-guide-copy"
import { dispatchMetaDjAiPrompt } from "@/lib/metadjai/external-prompts"
import { SectionHeader, FeatureItem, ShortcutItem } from "./GuideComponents"
import type React from "react"

// Icon mapping for navigation
export const NAV_ICONS: Record<string, React.ReactNode> = {
  "quick-start": <Sparkles className="h-3.5 w-3.5" />,
  "hub": <Home className="h-3.5 w-3.5" />,
  "music": <Music className="h-3.5 w-3.5" />,
  "cinema": <Palette className="h-3.5 w-3.5" />,
  "wisdom": <BookOpen className="h-3.5 w-3.5" />,
  "journal": <Book className="h-3.5 w-3.5" />,
  "metadjai": <MessageSquare className="h-3.5 w-3.5" />,
  "queue": <ListMusic className="h-3.5 w-3.5" />,
  "search": <Search className="h-3.5 w-3.5" />,
  "shortcuts": <Keyboard className="h-3.5 w-3.5" />,
  "help": <Info className="h-3.5 w-3.5" />,
}

export interface GuideContentProps {
  /** Container ref for scroll tracking (modal uses internal scroll, page uses window) */
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>
  /** Whether this is rendered inside a modal (affects scroll behavior) */
  isModal?: boolean
  /** Custom header content (logo, title, etc.) */
  headerContent?: React.ReactNode
  /** Callback when Ask MetaDJai is clicked */
  onAskMetaDJai?: () => void
  /** Additional content after the help section */
  footerContent?: React.ReactNode
}

/**
 * GuideContent - Shared content sections for the User Guide
 *
 * Used by both:
 * - MetaDJNexusGuide (full page at /guide)
 * - UserGuideOverlay (modal overlay)
 */
export function GuideContent({
  scrollContainerRef,
  isModal = false,
  headerContent,
  onAskMetaDJai,
  footerContent,
}: GuideContentProps) {
  const { panels, toggleRightPanel, setMetaDjAiOpen, setInfoOpen } = useUI()
  const [activeSection, setActiveSection] = useState<string>("quick-start")
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const GUIDE_SUMMARY_FORMAT = [
    "Output format:",
    "1 sentence thesis.",
    "",
    "5 bullets for the main concepts.",
    "",
    "A short 'Try this next' section with 3 steps.",
    "",
    "End with one question for me.",
  ].join("\n")

  const buildSummarizePrompt = useCallback((sectionId: string) => {
    switch (sectionId) {
      case "quick-start": {
        return [
          "Summarize the Quick Start section of the MetaDJ Nexus User Guide.",
          "",
          "Current steps:",
          ...GUIDE_QUICK_START.map((step) => {
            const tip = step.tip ? ` Tip: ${step.tip}` : ""
            return `${step.number}. ${step.title}: ${step.description}${tip}`
          }),
          "",
          GUIDE_SUMMARY_FORMAT,
        ].join("\n")
      }
      case "hub": {
        const hubSurface = GUIDE_CORE_SURFACES.find((s) => s.key === "hub")
        return [
          "Summarize the Hub section of the MetaDJ Nexus User Guide.",
          "",
          hubSurface?.description ? `Description: ${hubSurface.description}` : "",
          "",
          "Key features:",
          ...(hubSurface?.features ?? []).map((feature) => `- ${feature}`),
          "",
          GUIDE_SUMMARY_FORMAT,
        ]
          .filter(Boolean)
          .join("\n")
      }
      case "music": {
        const musicSurface = GUIDE_CORE_SURFACES.find((s) => s.key === "music")
        return [
          "Summarize the Music Experience section of the MetaDJ Nexus User Guide.",
          "",
          musicSurface?.description ? `Description: ${musicSurface.description}` : "",
          "",
          "Key features:",
          ...(musicSurface?.features ?? []).map((feature) => `- ${feature}`),
          "",
          "Music collections:",
          ...GUIDE_COLLECTIONS.map(
            (collection) => `- ${collection.name}: ${collection.description} (${collection.vibe})`
          ),
          "",
          GUIDE_SUMMARY_FORMAT,
        ]
          .filter(Boolean)
          .join("\n")
      }
      case "cinema": {
        const cinemaSurface = GUIDE_CORE_SURFACES.find((s) => s.key === "cinema")
        return [
          "Summarize the Cinema section of the MetaDJ Nexus User Guide.",
          "",
          cinemaSurface?.description ? `Description: ${cinemaSurface.description}` : "",
          "",
          "Key features:",
          ...(cinemaSurface?.features ?? []).map((feature) => `- ${feature}`),
          "",
          GUIDE_SUMMARY_FORMAT,
        ]
          .filter(Boolean)
          .join("\n")
      }
      case "wisdom": {
        const wisdomSurface = GUIDE_CORE_SURFACES.find((s) => s.key === "wisdom")
        return [
          "Summarize the Wisdom Hub section of the MetaDJ Nexus User Guide.",
          "",
          wisdomSurface?.description ? `Description: ${wisdomSurface.description}` : "",
          "",
          "Key features:",
          ...(wisdomSurface?.features ?? []).map((feature) => `- ${feature}`),
          "",
          GUIDE_SUMMARY_FORMAT,
        ]
          .filter(Boolean)
          .join("\n")
      }
      case "journal": {
        const journalSurface = GUIDE_CORE_SURFACES.find((s) => s.key === "journal")
        return [
          "Summarize the Journal section of the MetaDJ Nexus User Guide.",
          "",
          journalSurface?.description ? `Description: ${journalSurface.description}` : "",
          "",
          "Key features:",
          ...(journalSurface?.features ?? []).map((feature) => `- ${feature}`),
          "",
          GUIDE_SUMMARY_FORMAT,
        ]
          .filter(Boolean)
          .join("\n")
      }
      case "metadjai": {
        return [
          "Summarize the MetaDJai section of the MetaDJ Nexus User Guide.",
          "",
          GUIDE_METADJAI.description ? `Description: ${GUIDE_METADJAI.description}` : "",
          "",
          "Key features:",
          ...GUIDE_METADJAI.features.map((feature) => `- ${feature.title}: ${feature.description}`),
          "",
          "Pro tips:",
          ...GUIDE_METADJAI.tips.map((tip) => `- ${tip}`),
          "",
          GUIDE_SUMMARY_FORMAT,
        ]
          .filter(Boolean)
          .join("\n")
      }
      case "queue": {
        return [
          "Summarize the Queue & Playback section of the MetaDJ Nexus User Guide.",
          "",
          GUIDE_QUEUE.description ? `Description: ${GUIDE_QUEUE.description}` : "",
          "",
          "Key features:",
          ...GUIDE_QUEUE.features.map((feature) => `- ${feature.title}: ${feature.description}`),
          "",
          "Queue controls:",
          ...GUIDE_QUEUE.controls.map((control) => `- ${control.action}: ${control.description}`),
          "",
          GUIDE_QUEUE.playlists
            ? [
              `${GUIDE_QUEUE.playlists.title}: ${GUIDE_QUEUE.playlists.description}`,
              ...GUIDE_QUEUE.playlists.features.map((feature: string) => `- ${feature}`),
              "",
            ].join("\n")
            : "",
          GUIDE_SUMMARY_FORMAT,
        ]
          .filter(Boolean)
          .join("\n")
      }
      case "search": {
        return [
          "Summarize the Search & Discovery section of the MetaDJ Nexus User Guide.",
          "",
          GUIDE_SEARCH.description ? `Description: ${GUIDE_SEARCH.description}` : "",
          "",
          "Key features:",
          ...GUIDE_SEARCH.features.map((feature) => `- ${feature}`),
          "",
          "Search tips:",
          ...GUIDE_SEARCH.tips.map((tip) => `- ${tip}`),
          "",
          GUIDE_SUMMARY_FORMAT,
        ]
          .filter(Boolean)
          .join("\n")
      }
      case "shortcuts": {
        const playback = GUIDE_SHORTCUTS.filter((s) => s.category === "playback")
        const navigation = GUIDE_SHORTCUTS.filter((s) => s.category === "navigation")
        const queueShortcuts = GUIDE_SHORTCUTS.filter((s) => s.category === "queue")

        return [
          "Summarize the Keyboard Shortcuts section of the MetaDJ Nexus User Guide.",
          "",
          "Playback shortcuts:",
          ...playback.map((s) => `- ${s.key}: ${s.label}`),
          "",
          "Navigation shortcuts:",
          ...navigation.map((s) => `- ${s.key}: ${s.label}`),
          "",
          "Queue shortcuts:",
          ...queueShortcuts.map((s) => `- ${s.key}: ${s.label}`),
          "",
          GUIDE_SUMMARY_FORMAT,
        ]
          .filter(Boolean)
          .join("\n")
      }
      default:
        return ""
    }
  }, [GUIDE_SUMMARY_FORMAT])

  const handleSummarizeSection = useCallback((sectionId: string) => {
    const prompt = buildSummarizePrompt(sectionId)
    if (!prompt) return

    // Dispatch the prompt - MetaDJai panel will open on top of User Guide (z-105 > z-100)
    // The event listener in HomePageClient will open the panel and send the message
    dispatchMetaDjAiPrompt({ newSession: true, prompt })
  }, [buildSummarizePrompt])

  const summarizeAction = useCallback((sectionId: string, label: string) => (
    <button
      type="button"
      onClick={() => handleSummarizeSection(sectionId)}
      className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition"
      aria-label={`Summarize ${label} with MetaDJai`}
    >
      <Sparkles className="h-3.5 w-3.5" />
      Summarize
    </button>
  ), [handleSummarizeSection])

  // Handle scroll to section
  const scrollToSection = useCallback((sectionId: string) => {
    const section = sectionRefs.current[sectionId]
    if (!section) return

    const offset = isModal ? 80 : 120
    const prefersReducedMotion = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth"

    if (isModal && scrollContainerRef?.current) {
      const top = section.offsetTop - offset
      scrollContainerRef.current.scrollTo({ top, behavior })
    } else {
      const top = section.offsetTop - offset
      window.scrollTo({ top, behavior })
    }
    setActiveSection(sectionId)
  }, [isModal, scrollContainerRef])

  // Track active section on scroll
  useEffect(() => {
    const container = isModal ? scrollContainerRef?.current : null
    let ticking = false
    let lastActiveSection = activeSection

    const handleScroll = () => {
      if (ticking) return
      ticking = true

      requestAnimationFrame(() => {
        const scrollPosition = isModal
          ? (container?.scrollTop ?? 0) + 100
          : window.scrollY + 150

        for (const section of GUIDE_NAV_SECTIONS) {
          const element = sectionRefs.current[section.id]
          if (element) {
            const { offsetTop, offsetHeight } = element
            if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
              if (lastActiveSection !== section.id) {
                lastActiveSection = section.id
                setActiveSection(section.id)
              }
              break
            }
          }
        }
        ticking = false
      })
    }

    const target = isModal ? container : window
    target?.addEventListener("scroll", handleScroll, { passive: true })
    return () => target?.removeEventListener("scroll", handleScroll)
  }, [activeSection, isModal, scrollContainerRef])

  // Default MetaDJai handler
  const handleAskMetaDJai = useCallback(() => {
    if (onAskMetaDJai) {
      onAskMetaDJai()
    } else {
      setInfoOpen(false)
      setTimeout(() => {
        if (!panels.right.isOpen) {
          toggleRightPanel()
        }
        setMetaDjAiOpen(true)
      }, 150)
    }
  }, [onAskMetaDJai, panels.right.isOpen, toggleRightPanel, setMetaDjAiOpen, setInfoOpen])

  return (
    <>
      {/* Navigation Pills */}
      <GuideNavigation
        activeSection={activeSection}
        onSectionClick={scrollToSection}
        onAskMetaDJai={handleAskMetaDJai}
        isModal={isModal}
      />

      {/* Main Content */}
      <div className="space-y-12">
        {/* Hero Section */}
        <header className="text-center space-y-4">
          {headerContent || (
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-gradient-hero">
              User Guide
            </h1>
          )}
          <p className="text-lg md:text-xl text-white/70 font-heading max-w-2xl mx-auto">
            {GUIDE_WELCOME.tagline}
          </p>
          <p className="text-white/60 text-sm md:text-base max-w-3xl mx-auto leading-relaxed">
            {GUIDE_WELCOME.intro}
          </p>
          {GUIDE_WELCOME.previewNotice && (
            <div className="mx-auto max-w-3xl rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-left">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
                  Public Preview
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-white/70 leading-relaxed">
                {GUIDE_WELCOME.previewNotice}
              </p>
            </div>
          )}
        </header>

        {/* Quick Start Section */}
        <section
          id="quick-start"
          ref={(el) => { sectionRefs.current["quick-start"] = el }}
          className={isModal ? "scroll-mt-24" : "scroll-mt-32"}
        >
          <SectionHeader
            title="Quick Start"
            icon={<Sparkles className="h-5 w-5" />}
            action={summarizeAction("quick-start", "Quick Start")}
          />
          <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
            {GUIDE_QUICK_START.map((step) => (
              <div
                key={step.number}
                className="glass-radiant p-4 sm:p-5 rounded-2xl"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full gradient-4 flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                      {step.number}
                    </span>
                    <h3 className="font-heading font-semibold text-sm sm:text-base text-heading-solid">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-white/70 text-xs sm:text-sm leading-relaxed mt-2">
                    {step.description}
                  </p>
                  {step.tip && (
                    <div className="flex items-start gap-2 pt-1.5 mt-1.5 border-t border-white/10">
                      <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[0.65rem] sm:text-xs text-cyan-300/80">{step.tip}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Hub Section */}
        <section
          id="hub"
          ref={(el) => { sectionRefs.current["hub"] = el }}
          className={isModal ? "scroll-mt-24" : "scroll-mt-32"}
        >
          <SectionHeader
            title="Hub"
            icon={<Home className="h-5 w-5" />}
            action={summarizeAction("hub", "Hub")}
          />
          {GUIDE_CORE_SURFACES.filter(s => s.key === "hub").map((surface) => (
            <div key={surface.key} className="space-y-6">
              <p className="text-white/70 leading-relaxed">
                {surface.description}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {surface.features.map((feature) => (
                  <FeatureItem key={feature} text={feature} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Music Section */}
        <section
          id="music"
          ref={(el) => { sectionRefs.current["music"] = el }}
          className={isModal ? "scroll-mt-24" : "scroll-mt-32"}
        >
          <SectionHeader
            title="Music Experience"
            icon={<Music className="h-5 w-5" />}
            action={summarizeAction("music", "Music Experience")}
          />
          {GUIDE_CORE_SURFACES.filter(s => s.key === "music").map((surface) => (
            <div key={surface.key} className="space-y-6">
              <p className="text-white/70 leading-relaxed">
                {surface.description}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {surface.features.map((feature) => (
                  <FeatureItem key={feature} text={feature} />
                ))}
              </div>
            </div>
          ))}

          {/* Music Collections */}
          <div className="mt-8 space-y-4">
            <h3 className="text-xl font-heading font-semibold flex items-center gap-2">
              <span className="text-heading-solid">Music Collections</span>
            </h3>
            <p className="text-white/60 text-sm">
              MetaDJ releases music in collections—cohesive release arcs that keep evolving. Collections grow organically as creative exploration continues.
            </p>
            <div className="grid gap-3">
              {GUIDE_COLLECTIONS.map((collection) => (
                <div
                  key={collection.name}
                  className="glass-card rounded-xl p-4 hover:border-white/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h4 className="font-heading font-semibold text-heading-solid">
                      {collection.name}
                    </h4>
                    <span className="text-xs text-purple-300/80 font-mono">
                      {collection.vibe}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm mt-2">
                    {collection.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cinema Section */}
        <section
          id="cinema"
          ref={(el) => { sectionRefs.current["cinema"] = el }}
          className={isModal ? "scroll-mt-24" : "scroll-mt-32"}
        >
          <SectionHeader
            title="Cinema (Visual Experience)"
            icon={<Palette className="h-5 w-5" />}
            action={summarizeAction("cinema", "Cinema")}
          />
          {GUIDE_CORE_SURFACES.filter(s => s.key === "cinema").map((surface) => (
            <div key={surface.key} className="space-y-6">
              <p className="text-white/70 leading-relaxed">
                {surface.description}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {surface.features.map((feature) => (
                  <FeatureItem key={feature} text={feature} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Wisdom Section */}
        <section
          id="wisdom"
          ref={(el) => { sectionRefs.current["wisdom"] = el }}
          className={isModal ? "scroll-mt-24" : "scroll-mt-32"}
        >
          <SectionHeader
            title="Wisdom Hub"
            icon={<BookOpen className="h-5 w-5" />}
            action={summarizeAction("wisdom", "Wisdom Hub")}
          />
          {GUIDE_CORE_SURFACES.filter(s => s.key === "wisdom").map((surface) => (
            <div key={surface.key} className="space-y-6">
              <p className="text-white/70 leading-relaxed">
                {surface.description}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {surface.features.map((feature) => (
                  <FeatureItem key={feature} text={feature} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Journal Section */}
        <section
          id="journal"
          ref={(el) => { sectionRefs.current["journal"] = el }}
          className={isModal ? "scroll-mt-24" : "scroll-mt-32"}
        >
          <SectionHeader
            title="Journal"
            icon={<Book className="h-5 w-5" />}
            action={summarizeAction("journal", "Journal")}
          />
          {GUIDE_CORE_SURFACES.filter(s => s.key === "journal").map((surface) => (
            <div key={surface.key} className="space-y-6">
              <p className="text-white/70 leading-relaxed">
                {surface.description}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {surface.features.map((feature) => (
                  <FeatureItem key={feature} text={feature} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* MetaDJai Section */}
        <section
          id="metadjai"
          ref={(el) => { sectionRefs.current["metadjai"] = el }}
          className={isModal ? "scroll-mt-24" : "scroll-mt-32"}
        >
          <SectionHeader
            title="MetaDJai"
            icon={<MessageSquare className="h-5 w-5" />}
            action={summarizeAction("metadjai", "MetaDJai")}
          />
          <div className="space-y-6">
            <p className="text-white/70 leading-relaxed">
              {GUIDE_METADJAI.description}
            </p>

            {/* How to Open */}
            <div className="glass-card rounded-xl p-4 border-purple-500/30 bg-purple-500/10">
              <p className="text-sm text-purple-200">
                <strong>How to open:</strong> {GUIDE_METADJAI.howToOpen}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {GUIDE_METADJAI.features.map((feature) => (
                <div
                  key={feature.title}
                  className="glass-radiant-sm p-3 sm:p-4 rounded-xl"
                >
                  <h4 className="font-heading font-semibold text-sm sm:text-base text-heading-solid">
                    {feature.title}
                  </h4>
                  <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                Pro Tips
              </h4>
              <div className="grid gap-2">
                {GUIDE_METADJAI.tips.map((tip) => (
                  <div key={tip} className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-white/70">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rate Limit & Disclaimer */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <p className="text-xs text-muted-accessible">
                <strong className="text-white/80">Usage limit:</strong> {GUIDE_METADJAI.rateLimit}
              </p>
              <p className="text-xs text-muted-accessible italic">
                {GUIDE_METADJAI.disclaimer}
              </p>
            </div>
          </div>
        </section>

        {/* Queue Section */}
        <section
          id="queue"
          ref={(el) => { sectionRefs.current["queue"] = el }}
          className={isModal ? "scroll-mt-24" : "scroll-mt-32"}
        >
          <SectionHeader
            title="Queue & Playback"
            icon={<ListMusic className="h-5 w-5" />}
            action={summarizeAction("queue", "Queue & Playback")}
          />
          <div className="space-y-6">
            <p className="text-white/70 leading-relaxed">
              {GUIDE_QUEUE.description}
            </p>

            {/* Features Grid */}
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {GUIDE_QUEUE.features.map((feature) => (
                <div
                  key={feature.title}
                  className="glass-radiant-sm p-3 sm:p-4 rounded-xl"
                >
                  <h4 className="font-heading font-semibold text-sm sm:text-base text-heading-solid">
                    {feature.title}
                  </h4>
                  <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Controls Reference */}
            <div className="glass-card rounded-xl p-4">
              <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">
                Queue Controls
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {GUIDE_QUEUE.controls.map((control) => (
                  <div key={control.action} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-white">{control.action}:</span>
                      <span className="text-sm text-white/60 ml-1">{control.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Playlists */}
            {GUIDE_QUEUE.playlists && (
              <div className="glass-card rounded-xl p-4 border-indigo-500/30 bg-indigo-500/10">
                <h4 className="text-sm font-semibold text-indigo-200 uppercase tracking-wider mb-2">
                  {GUIDE_QUEUE.playlists.title}
                </h4>
                <p className="text-sm text-white/70 mb-3">
                  {GUIDE_QUEUE.playlists.description}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {GUIDE_QUEUE.playlists.features.map((feature: string) => (
                    <FeatureItem key={feature} text={feature} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Search Section */}
        <section
          id="search"
          ref={(el) => { sectionRefs.current["search"] = el }}
          className={isModal ? "scroll-mt-24" : "scroll-mt-32"}
        >
          <SectionHeader
            title="Search & Discovery"
            icon={<Search className="h-5 w-5" />}
            action={summarizeAction("search", "Search & Discovery")}
          />
          <div className="space-y-6">
            <p className="text-white/70 leading-relaxed">
              {GUIDE_SEARCH.description}
            </p>

            {/* Features */}
            <div className="grid gap-3 sm:grid-cols-2">
              {GUIDE_SEARCH.features.map((feature) => (
                <FeatureItem key={feature} text={feature} />
              ))}
            </div>

            {/* Search Tips */}
            <div className="glass-card rounded-xl p-4 border-cyan-500/30 bg-cyan-500/10">
              <h4 className="text-sm font-semibold text-cyan-200 uppercase tracking-wider mb-3">
                Search Tips
              </h4>
              <div className="space-y-2">
                {GUIDE_SEARCH.tips.map((tip) => (
                  <div key={tip} className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-white/70">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Shortcuts Section */}
        <section
          id="shortcuts"
          ref={(el) => { sectionRefs.current["shortcuts"] = el }}
          className={isModal ? "scroll-mt-24" : "scroll-mt-32"}
        >
          <SectionHeader
            title="Keyboard Shortcuts"
            icon={<Keyboard className="h-5 w-5" />}
            action={summarizeAction("shortcuts", "Keyboard Shortcuts")}
          />
          <div className="space-y-6">
            <p className="text-white/60 text-sm">
              Press <kbd className="px-2 py-0.5 rounded bg-white/10 text-white/80 font-mono text-xs">?</kbd> anywhere to see this reference.
            </p>

            {/* Grouped by category */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Playback */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-purple-300 uppercase tracking-wider">
                  Playback
                </h4>
                <div className="space-y-2">
                  {GUIDE_SHORTCUTS.filter(s => s.category === "playback").map((shortcut) => (
                    <ShortcutItem key={shortcut.key} shortcut={shortcut} />
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                  Navigation
                </h4>
                <div className="space-y-2">
                  {GUIDE_SHORTCUTS.filter(s => s.category === "navigation").map((shortcut) => (
                    <ShortcutItem key={shortcut.key} shortcut={shortcut} />
                  ))}
                </div>
              </div>

              {/* Panels */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-emerald-300 uppercase tracking-wider">
                  Queue
                </h4>
                <div className="space-y-2">
                  {GUIDE_SHORTCUTS.filter(s => s.category === "queue").map((shortcut) => (
                    <ShortcutItem key={shortcut.key} shortcut={shortcut} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Help Section */}
        <section
          id="help"
          ref={(el) => { sectionRefs.current["help"] = el }}
          className={isModal ? "scroll-mt-24 pb-8" : "scroll-mt-32 pb-8"}
        >
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Info className="h-5 w-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-heading font-semibold text-heading-solid">
                {GUIDE_HELP.title}
              </h2>
            </div>
            <p className="text-white/60">
              {GUIDE_HELP.description}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {GUIDE_HELP.options.map((option) => (
                <div key={option.title} className="glass-card rounded-xl p-4">
                  <h4 className="font-heading font-semibold text-heading-solid text-sm mb-1">
                    {option.title}
                  </h4>
                  <p className="text-white/60 text-xs leading-relaxed">
                    {option.description}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA to MetaDJai */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-muted-accessible text-sm">
                {GUIDE_WELCOME.askAiPrompt}
              </p>
              <button
                type="button"
                onClick={handleAskMetaDJai}
                className="inline-flex items-center gap-2 rounded-full gradient-2-tint border border-purple-500/30 px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:brightness-110 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] focus-ring-glow"
              >
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span>Ask MetaDJai</span>
              </button>
            </div>
          </div>
        </section>

        {footerContent}
      </div>
    </>
  )
}

/**
 * GuideNavigation - Navigation pills for the guide
 */
interface GuideNavigationProps {
  activeSection: string
  onSectionClick: (sectionId: string) => void
  onAskMetaDJai: () => void
  isModal?: boolean
}

export function GuideNavigation({
  activeSection,
  onSectionClick,
  onAskMetaDJai,
  isModal = false,
}: GuideNavigationProps) {
  if (isModal) {
    // Modal navigation is handled by the overlay wrapper
    return null
  }

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 mb-8">
      {GUIDE_NAV_SECTIONS.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSectionClick(section.id)}
          className={clsx(
            "flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
            activeSection === section.id
              ? "bg-purple-500/20 text-purple-200 border border-purple-500/40"
              : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
          )}
        >
          {NAV_ICONS[section.id]}
          <span>{section.title}</span>
        </button>
      ))}
    </div>
  )
}

// Re-export NAV_SECTIONS for external use
export { GUIDE_NAV_SECTIONS }
