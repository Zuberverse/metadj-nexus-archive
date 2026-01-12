"use client"

import { useMemo } from "react"
import { clsx } from "clsx"
import { Play, MessageSquare, Newspaper, BookOpen, Lightbulb, Compass, Sparkles, Calendar, Globe } from "lucide-react"
import { BrandGradientIcon } from "@/components/icons/BrandGradientIcon"
import { Button, Card } from "@/components/ui"
import { useToast } from "@/contexts/ToastContext"
import { PLATFORM_UPDATES, type PlatformUpdate } from "@/data/platformUpdates"
import { HUB_HERO_TRACK_ID } from "@/lib/app.constants"
import { GUIDE_WELCOME } from "@/lib/content/meta-dj-nexus-guide-copy"
import type { WisdomSection } from "@/lib/wisdom"
import type { Track } from "@/types"

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
}: HubExperienceProps) {
  const { showToast } = useToast()
  const cinematicToastKey = "metadj_cinematic_listening_toast_shown"

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
        accent: "from-purple-900/60 via-indigo-900/50 to-blue-900/40",
      },
      guide && {
        id: "guides" as const,
        slug: guide.id,
        type: "Guide",
        icon: Compass,
        title: guide.title,
        excerpt: guide.excerpt,
        meta: guide.category,
        accent: "from-cyan-900/60 via-blue-900/50 to-indigo-900/40",
      },
      reflection && {
        id: "reflections" as const,
        slug: reflection.id,
        type: "Reflection",
        icon: Sparkles,
        title: reflection.title,
        excerpt: reflection.excerpt,
        meta: "Reflection notes",
        accent: "from-indigo-900/60 via-purple-900/50 to-violet-900/40",
      },
    ]

    return cards.filter((card): card is NonNullable<typeof card> & { slug: string } => Boolean(card))
  }, [wisdomSpotlight])

  return (
    <div className="relative pb-2 min-[1100px]:pb-32 pt-0 space-y-6 container mx-auto">
      {/* Hero Section - No container */}
      {/* Hero Section - No container */}
      <section className="relative px-6 lg:px-8 pb-2 pt-4 flex flex-col items-center justify-center gap-6 text-center min-h-[25vh]">
        {/* Dynamic Aurora Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-brand opacity-10 blur-[100px] animate-aurora pointer-events-none mix-blend-screen" />

        <div className="relative z-10 space-y-4">
          <h1 className="font-heading font-black leading-[0.9] text-[clamp(1.5rem,4vw,3.5rem)] tracking-tight max-w-[90vw] mx-auto text-pop">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-violet-400 to-violet-300">Explore</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-cyan-300 to-indigo-300">MetaDJ&apos;s Imagination</span>
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
            className="group w-full xs:w-auto min-w-52 h-14 py-3 text-lg bg-gradient-to-r from-purple-900/50 via-indigo-900/40 to-cyan-900/35 hover:from-purple-800/60 hover:via-indigo-800/50 hover:to-cyan-800/45 border-purple-400/40 hover:border-cyan-400/60 text-white backdrop-blur-md font-heading transition-all duration-300 hover:scale-105 shadow-[0_0_15px_rgba(139,92,246,0.15),0_0_30px_rgba(139,92,246,0.08)] hover:shadow-[0_0_20px_rgba(6,182,212,0.18),0_0_40px_rgba(139,92,246,0.1)]"
            leftIcon={<Play className="h-5 w-5 shrink-0 fill-current text-cyan-300 group-hover:text-cyan-100 transition-colors" />}
          >
            <span className="text-heading-solid font-semibold">Enter Cinema</span>
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={handleChatWithMetaDjAi}
            className="group w-full xs:w-auto min-w-52 h-14 py-3 text-lg bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-fuchsia-900/35 hover:from-indigo-800/60 hover:via-purple-800/50 hover:to-fuchsia-800/45 border-purple-400/40 hover:border-fuchsia-400/60 text-white backdrop-blur-md font-heading transition-all duration-300 hover:scale-105 shadow-[0_0_15px_rgba(139,92,246,0.15),0_0_30px_rgba(217,70,239,0.08)] hover:shadow-[0_0_20px_rgba(217,70,239,0.18),0_0_40px_rgba(139,92,246,0.1)]"
            leftIcon={<MessageSquare className="h-5 w-5 shrink-0 text-fuchsia-300 group-hover:text-fuchsia-100 transition-colors" />}
          >
            <span className="text-heading-solid font-semibold">Chat with MetaDJai</span>
          </Button>
        </div>
      </section>

      <div className="px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
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
                  <div className={clsx("absolute inset-0 bg-linear-to-br opacity-55", card.accent)} />

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
          </section>
        )}

        {/* Content Grid: News, Events, Platform Pulse */}
        <div className="grid gap-3 min-[1100px]:gap-6 lg:grid-cols-3">
          {/* News (Coming Soon) */}
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
              className="lg:h-full p-5 flex flex-col items-center justify-center text-center gap-3 border border-white/5 bg-white/5 opacity-80"
            >
              <div className="rounded-full bg-white/10 p-3">
                {/* Icon - decorative, 3:1 minimum met */}
                <Newspaper className="h-6 w-6 text-white/60" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold text-heading-solid">Curated Updates</h3>
                {/* WCAG: text-white/70 for 4.5:1 contrast on section descriptions */}
                <p className="text-sm text-white/70">Relevant news from the Metaverse & AI world</p>
              </div>
              <span className="mt-2 text-[10px] uppercase tracking-widest text-cyan-300/80 font-semibold border border-cyan-500/30 px-3 py-1 rounded-full">Coming Soon</span>
            </Card>
          </section>

          {/* Events (Coming Soon) */}
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
              className="lg:h-full p-5 flex flex-col items-center justify-center text-center gap-3 border border-white/5 bg-white/5 opacity-80"
            >
              <div className="rounded-full bg-white/10 p-3">
                {/* Icon - decorative, 3:1 minimum met */}
                <Calendar className="h-6 w-6 text-white/60" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold text-heading-solid">Upcoming Events</h3>
                {/* WCAG: text-white/70 for 4.5:1 contrast on section descriptions */}
                <p className="text-sm text-white/70">MetaDJ sets, experiences, and community gatherings</p>
              </div>
              <span className="mt-2 text-[10px] uppercase tracking-widest text-purple-300/80 font-semibold border border-purple-500/30 px-3 py-1 rounded-full">Coming Soon</span>
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
