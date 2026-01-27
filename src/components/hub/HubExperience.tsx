"use client"

import { useMemo } from "react"
import { clsx } from "clsx"
import { Play, MessageSquare, Newspaper, BookOpen, Lightbulb, Compass, Sparkles, Calendar, Globe, ChevronRight } from "lucide-react"
import { BrandGradientIcon } from "@/components/icons/BrandGradientIcon"
import { Button, Card } from "@/components/ui"
import { useToast } from "@/contexts/ToastContext"
import { HUB_EVENT_ITEMS, HUB_NEWS_ITEMS } from "@/data/hubHighlights"
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
  currentTrack,
  isPlaying = false,
  isMetaDjAiOpen = false,
  activeView,
}: HubExperienceProps) {
  const { showToast } = useToast()

  const heroTrack = useMemo(
    () => tracks.find((track) => track.id === HUB_HERO_TRACK_ID),
    [tracks],
  )

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

  return (
    <div className="relative pb-2 min-[1100px]:pb-2 pt-0 space-y-2 min-[1100px]:space-y-3 container mx-auto flex flex-col h-full">
      {/* Hero Section - No container */}
      {/* Hero Section - No container */}
      <section className="relative px-6 lg:px-8 pb-1 pt-5 flex flex-col items-center justify-center gap-4 text-center min-[1100px]:min-h-0 min-[1100px]:flex-shrink-0">
        {/* Dynamic Aurora Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] brand-gradient opacity-20 blur-[100px] pointer-events-none mix-blend-screen" />

        <div className="relative z-10 space-y-2">
          <h1 className="font-heading font-black leading-[0.9] text-[clamp(1.5rem,3.5vw,2.75rem)] tracking-tight max-w-[90vw] mx-auto text-pop text-gradient-hero">
            Explore MetaDJ&apos;s Imagination
          </h1>
          <p className="text-base sm:text-lg text-indigo-100/90 font-light max-w-2xl mx-auto">
            Collections-first listening, guided by human vision and AI
          </p>
        </div>

        <div className="relative z-10 flex flex-col xs:flex-row items-center gap-3 w-full xs:w-auto pt-2">
          <Button
            id="tour-start-cinematic"
            size="lg"
            variant="secondary"
            onClick={handleStartCinematicListening}
            className="group w-full xs:w-auto min-w-48 h-12 py-2 text-base brand-gradient border border-purple-400/40 text-white backdrop-blur-md font-heading transition-all duration-300 hover:scale-105 hover:brightness-110 shadow-[0_0_15px_rgba(139,92,246,0.15),0_0_30px_rgba(139,92,246,0.08)] hover:shadow-[0_0_20px_rgba(6,182,212,0.18),0_0_40px_rgba(139,92,246,0.1)]"
            leftIcon={<Play className="h-4 w-4 shrink-0 fill-current text-cyan-300 group-hover:text-cyan-100 transition-colors" />}
          >
            <span className="text-heading-solid font-semibold">Enter Cinema</span>
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={handleChatWithMetaDjAi}
            className="group w-full xs:w-auto min-w-48 h-12 py-2 text-base gradient-4 border border-purple-400/40 text-white backdrop-blur-md font-heading transition-all duration-300 hover:scale-105 hover:brightness-110 shadow-[0_0_15px_rgba(139,92,246,0.15),0_0_30px_rgba(217,70,239,0.08)] hover:shadow-[0_0_20px_rgba(217,70,239,0.18),0_0_40px_rgba(139,92,246,0.1)]"
            leftIcon={<MessageSquare className="h-4 w-4 shrink-0 text-fuchsia-300 group-hover:text-fuchsia-100 transition-colors" />}
          >
            <span className="text-heading-solid font-semibold">Chat with MetaDJai</span>
          </Button>
        </div>
      </section>

      <div className="px-3 sm:px-6 lg:px-8 pb-2 space-y-3 min-[1100px]:flex-1 min-[1100px]:flex min-[1100px]:flex-col min-[1100px]:overflow-hidden">
                {/* Wisdom Spotlight */}
        {wisdomCards.length > 0 && (
          <section aria-labelledby="wisdom-spotlight-heading" className="min-[1100px]:flex-shrink-0">
            <div className="mb-2 px-1">
              <h2
                id="wisdom-spotlight-heading"
                className="text-lg font-heading font-semibold flex items-center gap-2"
              >
                <BrandGradientIcon icon={BookOpen} className="h-4 w-4" strokeWidth={2.5} />
                <span className="text-heading-solid">Wisdom Spotlight</span>
              </h2>
            </div>

            <div className="grid gap-2 min-[1100px]:grid-cols-3">
                {wisdomCards.map((card) => (
                  <Card
                    key={card.id}
                    onClick={() => onOpenWisdom(card.id, card.slug)}
                    asButton
                    variant="glass"
                    className={clsx(
                      "group relative text-left p-4 rounded-2xl shadow-lg transition-all duration-500",
                      "hover:scale-[1.02] hover:-translate-y-1 hover:shadow-glow-purple",
                      "border border-white/5 hover:border-white/20"
                    )}
                  >
                    <div className={clsx("absolute inset-0 opacity-55", card.accent)} />

                    <div className="relative z-10 flex flex-col gap-1 min-h-[90px]">
                      <h3 className="text-base font-heading font-bold text-heading-solid line-clamp-2">
                        {card.title}
                      </h3>
                      <p className="text-sm text-white/80 leading-relaxed line-clamp-3">
                        {card.excerpt}
                      </p>
                      <div className="mt-auto pt-1 flex items-center justify-between">
                        <p className="text-[10px] text-muted-accessible uppercase tracking-wider flex items-center gap-1">
                          <card.icon className="h-2.5 w-2.5" />
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
          </section>
        )}

        {/* Content Grid: News, Events, Platform Pulse */}
        <div className="grid gap-2 min-[1100px]:gap-3 lg:grid-cols-3 min-[1100px]:flex-1 min-[1100px]:min-h-0 pb-2">
          {/* News */}
          <section aria-labelledby="news-heading" className="min-[1100px]:flex min-[1100px]:flex-col min-[1100px]:min-h-0">
            <div className="mb-2 px-1">
              <h2
                id="news-heading"
                className="text-lg font-heading font-semibold flex items-center gap-2"
              >
                <BrandGradientIcon icon={Newspaper} className="h-4 w-4" strokeWidth={2.5} />
                <span className="text-heading-solid">News</span>
              </h2>
            </div>
            <Card
              variant="info"
              className="relative lg:flex-1 p-3 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="absolute inset-0 opacity-40 gradient-4-soft rounded-2xl" />
              <div className="relative z-10 flex flex-col gap-2">
                {newsItems.length > 0 ? (
                  <ul className="space-y-1.5">
                    {newsItems.slice(0, 3).map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-xs text-white/70">
                        <span className="mt-1 h-1 w-1 rounded-full bg-white/40 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-heading font-semibold text-heading-solid leading-tight text-xs">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-white/60 leading-relaxed line-clamp-2">
                            {item.summary}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 border border-white/20 px-2.5 py-0.5 text-[10px] font-heading font-semibold text-white/80">
                      Feature in Development
                    </span>
                    <p className="text-sm text-white/80 leading-relaxed">
                      News updates stay quiet while the core experience is refined.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </section>

          {/* Events */}
          <section aria-labelledby="events-heading" className="min-[1100px]:flex min-[1100px]:flex-col min-[1100px]:min-h-0">
            <div className="mb-2 px-1">
              <h2
                id="events-heading"
                className="text-lg font-heading font-semibold flex items-center gap-2"
              >
                <BrandGradientIcon icon={Calendar} className="h-4 w-4" strokeWidth={2.5} />
                <span className="text-heading-solid">Events</span>
              </h2>
            </div>
            <Card
              variant="info"
              className="relative lg:flex-1 p-3 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="absolute inset-0 opacity-40 gradient-4-soft rounded-2xl" />
              <div className="relative z-10 flex flex-col gap-2">
                {eventItems.length > 0 ? (
                  <ul className="space-y-1.5">
                    {eventItems.slice(0, 3).map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-xs text-white/70">
                        <span className="mt-1 h-1 w-1 rounded-full bg-white/40 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-heading font-semibold text-heading-solid leading-tight text-xs">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-white/60 leading-relaxed line-clamp-2">
                            {item.summary}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 border border-white/20 px-2.5 py-0.5 text-[10px] font-heading font-semibold text-white/80">
                      Feature in Development
                    </span>
                    <p className="text-sm text-white/80 leading-relaxed">
                      Live events and community moments coming soon.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </section>

          {/* Platform Pulse */}
          <section aria-labelledby="platform-pulse-heading" className="min-[1100px]:flex min-[1100px]:flex-col min-[1100px]:min-h-0">
            <div className="mb-2 px-1">
              <h2
                id="platform-pulse-heading"
                className="text-lg font-heading font-semibold flex items-center gap-2"
              >
                <BrandGradientIcon icon={Globe} className="h-4 w-4" strokeWidth={2.5} />
                <span className="text-heading-solid">Platform Pulse</span>
              </h2>
            </div>

            <Card
              variant="info"
              className="relative lg:flex-1 p-3 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="absolute inset-0 opacity-40 gradient-4-soft rounded-2xl" />
              <div className="relative z-10 flex flex-col gap-1">
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 border border-white/20 px-2.5 py-0.5 text-[10px] font-heading font-semibold text-white/80">
                  Public Preview
                </span>
                <p className="text-sm text-white/80 leading-relaxed">
                  {GUIDE_WELCOME.previewNotice}
                </p>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}
