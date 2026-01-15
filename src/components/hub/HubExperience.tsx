"use client"

import { useMemo } from "react"
import { clsx } from "clsx"
import { Play, MessageSquare, Newspaper, BookOpen, Lightbulb, Compass, Sparkles, Calendar, Globe, ChevronRight } from "lucide-react"
import { BrandGradientIcon } from "@/components/icons/BrandGradientIcon"
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist"
import { Button, Card } from "@/components/ui"
import { useToast } from "@/contexts/ToastContext"
import { HUB_EVENT_ITEMS, HUB_NEWS_ITEMS } from "@/data/hubHighlights"
import { PLATFORM_UPDATES, type PlatformUpdate } from "@/data/platformUpdates"
import { useContinueReading } from "@/hooks/wisdom/use-continue-reading"
import { HUB_HERO_TRACK_ID } from "@/lib/app.constants"
import { GUIDE_WELCOME } from "@/lib/content/meta-dj-nexus-guide-copy"
import { formatReadTime, type WisdomSection } from "@/lib/wisdom"
import type { ActiveView, Track } from "@/types"

export interface WisdomSpotlightData {
  thought?: {
    id: string
    title: string
    excerpt: string
    date: string
  } | null
  guide?: {
    id: string
    title: string
    excerpt: string
    category: string
  } | null
  reflection?: {
    id: string
    title: string
    excerpt: string
  } | null
}

interface HubExperienceProps {
  tracks: Track[]
  onPlayTrack: (track: Track) => void
  onCinematicPlay?: (track: Track) => void
  onOpenCinema: () => void
  onOpenMusicPanel?: () => void
  onOpenWisdom: (section?: WisdomSection, slug?: string) => void
  onOpenMetaDjAi: () => void
  wisdomSpotlight?: WisdomSpotlightData
  platformUpdates?: PlatformUpdate[]
  currentTrack?: Track | null
  isPlaying?: boolean
  isMetaDjAiOpen?: boolean
  activeView?: ActiveView
}

export function HubExperience({
  tracks,
  onPlayTrack,
  onCinematicPlay,
  onOpenCinema,
  onOpenMusicPanel,
  onOpenWisdom,
  onOpenMetaDjAi,
  wisdomSpotlight,
  platformUpdates,
  currentTrack,
  isPlaying = false,
  isMetaDjAiOpen = false,
  activeView,
}: HubExperienceProps) {
  const { showToast } = useToast()
  const cinematicToastKey = "metadj_cinematic_listening_toast_shown"
  const { value: continueReading } = useContinueReading()

  const heroTrack = useMemo(
    () => tracks.find((track) => track.id === HUB_HERO_TRACK_ID),
    [tracks],
  )

  const maybeShowCinematicListeningToast = () => {
    try {
      if (typeof window === "undefined") return
      if (sessionStorage.getItem(cinematicToastKey)) return
      sessionStorage.setItem(cinematicToastKey, "true")
    } catch {
      // ignore storage errors
    }

    showToast({
      message: "Cinematic Listening — visuals live, controls ready.",
      variant: "info",
      duration: 2500,
    })
  }

  const handleStartCinematicListening = () => {
    if (!heroTrack) return

    const isHeroSelected = currentTrack?.id === heroTrack.id
    // Only play when it won't toggle playback OFF.
    // Use onCinematicPlay to bypass Music panel auto-open
    if (!isHeroSelected || !isPlaying) {
      const playHandler = onCinematicPlay || onPlayTrack
      playHandler(heroTrack)
    }

    // Open Cinema directly without opening Music panel
    onOpenCinema()
    maybeShowCinematicListeningToast()
  }

  const handleChatWithMetaDjAi = () => {
    if (isMetaDjAiOpen) {
      showToast({
        message: "MetaDJai chat is already open",
        variant: "info"
      })
      return
    }
    onOpenMetaDjAi()
  }

  const updates = platformUpdates ?? PLATFORM_UPDATES
  const newsItems = HUB_NEWS_ITEMS
  const eventItems = HUB_EVENT_ITEMS

  const wisdomCards = useMemo(() => {
    const thought = wisdomSpotlight?.thought
    const guide = wisdomSpotlight?.guide
    const reflection = wisdomSpotlight?.reflection

    const cards = [
      thought && {
        id: "thoughts" as const,
        slug: thought.id,
        type: "Thought",
        icon: Lightbulb,
        title: thought.title,
        excerpt: thought.excerpt,
        meta: thought.date,
        accent: "gradient-4-soft",
      },
      guide && {
        id: "guides" as const,
        slug: guide.id,
        type: "Guide",
        icon: Compass,
        title: guide.title,
        excerpt: guide.excerpt,
        meta: guide.category,
        accent: "gradient-4-soft",
      },
      reflection && {
        id: "reflections" as const,
        slug: reflection.id,
        type: "Reflection",
        icon: Sparkles,
        title: reflection.title,
        excerpt: reflection.excerpt,
        meta: "Reflection notes",
        accent: "gradient-4-soft",
      },
    ]

    return cards.filter((card): card is NonNullable<typeof card> & { slug: string } => Boolean(card))
  }, [wisdomSpotlight])

  const continueReadingMeta = useMemo(() => {
    if (!continueReading) return null
    const sectionLabel =
      continueReading.section === "thoughts"
        ? "Thought"
        : continueReading.section === "guides"
          ? "Guide"
          : "Reflection"
    return `${sectionLabel} · ${formatReadTime(continueReading.readTimeMinutes)}`
  }, [continueReading])

  return (
    <div className="relative pb-2 min-[1100px]:pb-6 pt-0 space-y-6 container mx-auto">
      {/* Hero Section - No container */}
      {/* Hero Section - No container */}
      <section className="relative px-6 lg:px-8 pb-2 pt-4 flex flex-col items-center justify-center gap-6 text-center min-h-[25vh]">
        {/* Dynamic Aurora Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] brand-gradient opacity-10 blur-[100px] animate-aurora pointer-events-none mix-blend-screen" />

        <div className="relative z-10 space-y-4">
          <h1 className="font-heading font-black leading-[0.9] text-[clamp(1.5rem,4vw,3.5rem)] tracking-tight max-w-[90vw] mx-auto text-pop text-gradient-hero">
            Explore MetaDJ&apos;s Imagination
          </h1>
          <p className="text-lg sm:text-xl text-indigo-100/90 font-light max-w-2xl mx-auto">
            Where human vision meets AI-driven creation
          </p>
        </div>

        <div className="relative z-10 flex flex-col xs:flex-row items-center gap-4 w-full xs:w-auto pt-4">
          <Button
            id="tour-start-cinematic"
            size="lg"
            variant="secondary"
            onClick={handleStartCinematicListening}
            className="group w-full xs:w-auto min-w-52 h-14 py-3 text-lg brand-gradient border border-purple-400/40 text-white backdrop-blur-md font-heading transition-all duration-300 hover:scale-105 hover:brightness-110 shadow-[0_0_15px_rgba(139,92,246,0.15),0_0_30px_rgba(139,92,246,0.08)] hover:shadow-[0_0_20px_rgba(6,182,212,0.18),0_0_40px_rgba(139,92,246,0.1)]"
            leftIcon={<Play className="h-5 w-5 shrink-0 fill-current text-cyan-300 group-hover:text-cyan-100 transition-colors" />}
          >
            <span className="text-heading-solid font-semibold">Enter Cinema</span>
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={handleChatWithMetaDjAi}
            className="group w-full xs:w-auto min-w-52 h-14 py-3 text-lg gradient-4 border border-purple-400/40 text-white backdrop-blur-md font-heading transition-all duration-300 hover:scale-105 hover:brightness-110 shadow-[0_0_15px_rgba(139,92,246,0.15),0_0_30px_rgba(217,70,239,0.08)] hover:shadow-[0_0_20px_rgba(217,70,239,0.18),0_0_40px_rgba(139,92,246,0.1)]"
            leftIcon={<MessageSquare className="h-5 w-5 shrink-0 text-fuchsia-300 group-hover:text-fuchsia-100 transition-colors" />}
          >
            <span className="text-heading-solid font-semibold">Chat with MetaDJai</span>
          </Button>
        </div>
      </section>

      <div className="px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        <OnboardingChecklist
          className="min-[1100px]:hidden"
          heroTrack={heroTrack}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          activeView={activeView}
          isMetaDjAiOpen={isMetaDjAiOpen}
          onPlayTrack={onPlayTrack}
          onOpenCinema={onOpenCinema}
          onOpenWisdom={() => onOpenWisdom()}
          onOpenMetaDjAi={onOpenMetaDjAi}
          onOpenMusicPanel={onOpenMusicPanel}
        />
        {/* Wisdom Spotlight */}
        {wisdomCards.length > 0 && (
          <section aria-labelledby="wisdom-spotlight-heading">
            <div className="mb-4 px-1">
              <h2
                id="wisdom-spotlight-heading"
                className="text-xl font-heading font-semibold flex items-center gap-2"
              >
                <BrandGradientIcon icon={BookOpen} className="h-5 w-5" strokeWidth={2.5} />
                <span className="text-heading-solid">Wisdom Spotlight</span>
              </h2>
            </div>

            <div className="grid gap-3">
              {continueReading && (
                <Card
                  onClick={() => onOpenWisdom(continueReading.section, continueReading.id)}
                  asButton
                  variant="glass"
                  className={clsx(
                    "group relative overflow-hidden text-left p-6 rounded-3xl shadow-lg transition-all duration-500",
                    "hover:scale-[1.01] hover:-translate-y-1 hover:shadow-glow-purple",
                    "border border-white/5 hover:border-white/20"
                  )}
                >
                  <div className="absolute inset-0 gradient-4-soft opacity-60" />

                  <div className="relative z-10 flex flex-col gap-2 min-h-[110px]">
                    <p className="text-[10px] uppercase tracking-wider text-cyan-100/80">
                      Continue reading
                    </p>
                    <h3 className="text-base font-heading font-bold text-heading-solid line-clamp-2">
                      {continueReading.title}
                    </h3>
                    <p className="text-sm text-white/80 leading-relaxed line-clamp-2">
                      {continueReading.excerpt}
                    </p>
                    <div className="mt-auto pt-2 flex items-center justify-between text-[10px] text-muted-accessible uppercase tracking-wider">
                      <span>{continueReadingMeta}</span>
                      <ChevronRight className="h-3 w-3 text-white/60 group-hover:text-cyan-300 transition-colors" />
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid gap-3 min-[1100px]:grid-cols-3">
                {wisdomCards.map((card) => (
                  <Card
                    key={card.id}
                    onClick={() => onOpenWisdom(card.id, card.slug)}
                    asButton
                    variant="glass"
                    className={clsx(
                      "group relative text-left p-6 rounded-3xl shadow-lg transition-all duration-500",
                      "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-glow-purple",
                      "border border-white/5 hover:border-white/20"
                    )}
                  >
                    <div className={clsx("absolute inset-0 opacity-55", card.accent)} />

                    <div className="relative z-10 flex flex-col gap-1.5 min-h-[110px]">
                      <h3 className="text-base font-heading font-bold text-heading-solid line-clamp-2">
                        {card.title}
                      </h3>
                      <p className="text-sm text-white/80 leading-relaxed line-clamp-3">
                        {card.excerpt}
                      </p>
                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <p className="text-[10px] text-muted-accessible uppercase tracking-wider flex items-center gap-1.5">
                          <card.icon className="h-3 w-3" />
                          {card.type}
                        </p>
                        <p className="text-[10px] text-muted-accessible uppercase tracking-wider">
                          {card.meta}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Content Grid: News, Events, Platform Pulse */}
        <div className="grid gap-3 min-[1100px]:gap-6 lg:grid-cols-3">
          {/* News */}
          <section aria-labelledby="news-heading">
            <div className="mb-3 px-1">
              <h2
                id="news-heading"
                className="text-xl font-heading font-semibold flex items-center gap-2"
              >
                <BrandGradientIcon icon={Newspaper} className="h-5 w-5" strokeWidth={2.5} />
                <span className="text-heading-solid">News</span>
              </h2>
            </div>
            <Card
              variant="glass"
              className="lg:h-full p-4 flex flex-col gap-3 border border-white/5 bg-white/5 opacity-80"
            >
              {newsItems.length > 0 ? (
                <ul className="space-y-2">
                  {newsItems.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm text-white/70">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/40 shrink-0" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-heading font-semibold text-heading-solid leading-tight text-sm">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-white/60 leading-relaxed line-clamp-2">
                          {item.summary}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/80">
                    Preview Focus
                  </span>
                  <p className="text-xs text-white/70 leading-relaxed">
                    News updates stay quiet while the core experience is refined.
                  </p>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Check Platform Pulse for the latest platform notes.
                  </p>
                </div>
              )}
            </Card>
          </section>

          {/* Events */}
          <section aria-labelledby="events-heading">
            <div className="mb-3 px-1">
              <h2
                id="events-heading"
                className="text-xl font-heading font-semibold flex items-center gap-2"
              >
                <BrandGradientIcon icon={Calendar} className="h-5 w-5" strokeWidth={2.5} />
                <span className="text-heading-solid">Events</span>
              </h2>
            </div>
            <Card
              variant="glass"
              className="lg:h-full p-4 flex flex-col gap-3 border border-white/5 bg-white/5 opacity-80"
            >
              {eventItems.length > 0 ? (
                <ul className="space-y-2">
                  {eventItems.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm text-white/70">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/40 shrink-0" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-heading font-semibold text-heading-solid leading-tight text-sm">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-white/60 leading-relaxed line-clamp-2">
                          {item.summary}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/80">
                    No events listed
                  </span>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Upcoming MetaDJ Live moments will appear here when scheduled.
                  </p>
                </div>
              )}
            </Card>
          </section>

          {/* Platform Pulse */}
          <section aria-labelledby="platform-pulse-heading">
            <div className="mb-3 px-1">
              <h2
                id="platform-pulse-heading"
                className="text-xl font-heading font-semibold flex items-center gap-2"
              >
                <BrandGradientIcon icon={Globe} className="h-5 w-5" strokeWidth={2.5} />
                <span className="text-heading-solid">Platform Pulse</span>
              </h2>
            </div>

            <Card
              variant="glass"
              className="lg:h-full p-4 flex flex-col gap-2 border border-white/5 bg-white/5 opacity-80"
            >
              <div className="flex flex-col gap-1.5">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/80">
                  Public Preview
                </span>
                <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
                  {GUIDE_WELCOME.previewNotice}
                </p>
              </div>

              {updates.length > 0 && (
                <ul className="space-y-1.5">
                  {updates.slice(0, 2).map((update) => (
                    <li key={update.id} className="text-sm text-white/70 flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/40 shrink-0" />
                      <div className="flex flex-col gap-0">
                        <span className="font-heading font-semibold text-heading-solid leading-tight text-sm">{update.title}</span>
                        <span className="text-[11px] text-white/60 line-clamp-1 leading-relaxed">{update.summary}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}
