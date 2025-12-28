"use client"

import { type FC, useCallback, useEffect, useState } from "react"
import { BookOpen, Layers, Loader2, User, Book } from "lucide-react"
import { STORAGE_KEYS, getString, setString } from "@/lib/storage"
import { getCachedWisdomData, loadWisdomData, type WisdomDeepLink } from "@/lib/wisdom"
import { Guides } from "./Guides"
import { Journal } from "./Journal"
import { Reflections } from "./Reflections"
import { Thoughts } from "./Thoughts"
import type { ThoughtPost, Guide, Reflection } from "@/data/wisdom-content"

type WisdomSection = "thoughts" | "guides" | "reflections" | "journal" | null

const isValidWisdomSection = (value: string) =>
  value === "thoughts" || value === "guides" || value === "reflections"

export interface WisdomExperienceProps {
  thoughts: ThoughtPost[]
  guides: Guide[]
  reflections: Reflection[]
}

interface WisdomExperienceComponentProps {
  /** When false, Wisdom stays dormant (no fetch/render). */
  active?: boolean
  /** Optional preloaded content (useful for tests or future SSR). */
  initialData?: WisdomExperienceProps
  /** Direct-prop data (still supported). */
  thoughts?: ThoughtPost[]
  guides?: Guide[]
  reflections?: Reflection[]
  /** Deep link to a specific wisdom item. */
  deepLink?: WisdomDeepLink | null
  /** Callback when deep link has been consumed. */
  onDeepLinkConsumed?: () => void
}

export const WisdomExperience: FC<WisdomExperienceComponentProps> = ({
  active = true,
  initialData,
  thoughts,
  guides,
  reflections,
  deepLink,
  onDeepLinkConsumed,
}) => {
  const [data, setData] = useState<WisdomExperienceProps | null>(() => {
    if (initialData) return initialData
    if (thoughts && guides && reflections) {
      return { thoughts, guides, reflections }
    }
    const cached = getCachedWisdomData()
    if (cached) return cached
    return null
  })
  const [isLoading, setIsLoading] = useState(!data)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<WisdomSection>(() => {
    const stored = getString(STORAGE_KEYS.WISDOM_LAST_SECTION, "")
    return isValidWisdomSection(stored) ? stored : null
  })

  // Deep links should override the last-saved section (once, on load).
  useEffect(() => {
    if (!deepLink) return
    setActiveSection(deepLink.section)
  }, [deepLink])

  const handleDeepLinkConsumed = useCallback(() => {
    onDeepLinkConsumed?.()
  }, [onDeepLinkConsumed])

  useEffect(() => {
    if (activeSection) {
      setString(STORAGE_KEYS.WISDOM_LAST_SECTION, activeSection)
      return
    }
    setString(STORAGE_KEYS.WISDOM_LAST_SECTION, "")
  }, [activeSection])

  // Lazy-load wisdom content only when Wisdom is active.
  useEffect(() => {
    if (!active) return
    if (data) return

    let cancelled = false
    setIsLoading(true)
    loadWisdomData()
      .then((loaded) => {
        if (cancelled) return
        setData(loaded)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load Wisdom content")
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [active, data])



  if (!active && !data) return null

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <section className="relative mx-auto flex max-w-3xl flex-col gap-4 px-4 sm:px-6 lg:px-8 pt-8 pb-24 min-[1100px]:pb-8 text-center">
        <h2 className="text-xl font-heading font-semibold text-gradient-hero">Couldn&apos;t load Wisdom</h2>
        <p className="text-sm text-white/70">{error}</p>
        <div>
          <button
            type="button"
            onClick={() => {
              setError(null)
              setData(null)
            }}
            className="rounded-full bg-white/5 px-5 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            Retry
          </button>
        </div>
      </section>
    )
  }

  if (!data) return null

  // Dashboard view - show all three content cards
  if (!activeSection) {
    return (
      <section className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-6 lg:px-8 pt-6 pb-24 min-[1100px]:pb-6">
        {/* Header */}
        <header className="text-center space-y-3">
          <h1 className="font-heading font-black leading-[0.9] text-[clamp(1.5rem,4vw,3.5rem)] tracking-tight max-w-[90vw] mx-auto text-pop">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-violet-400 to-violet-300">Explore</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-cyan-300 to-indigo-300">MetaDJ&apos;s Reality</span>
          </h1>
          <p className="text-lg sm:text-xl text-indigo-100/90 font-light max-w-2xl mx-auto">
            {data.thoughts.length} Thoughts · {data.guides.length} Guides · {data.reflections.length} Reflections
          </p>
        </header>

        {/* Content cards */}
        <div className="grid gap-6 min-[1100px]:grid-cols-3 mt-8 max-w-6xl mx-auto">
          {/* Thoughts card */}
          <button
            onClick={() => setActiveSection("thoughts")}
            className="group relative rounded-3xl border border-white/10 bg-white/3 p-6 text-left shadow-[var(--shadow-glow-purple)] backdrop-blur-sm transition-all duration-300 hover:border-(--border-active) hover:bg-white/5 hover:shadow-[var(--shadow-glow-purple)] focus-ring-glow"
          >
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-linear-to-br from-purple-500 via-blue-500 to-cyan-400 p-3">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-1 text-xl font-heading font-bold text-gradient-hero">
              Thoughts
            </h3>
            <p className="text-xs text-white/60 mb-2">{data.thoughts.length} essays</p>
            <p className="text-sm text-white/70 leading-relaxed">
              Personal dispatches on music, AI, creativity, and the evolving MetaDJ work.
            </p>
          </button>

          {/* Guides card */}
          <button
            onClick={() => setActiveSection("guides")}
            className="group relative rounded-3xl border border-white/10 bg-white/3 p-6 text-left shadow-[var(--shadow-glow-cyan)] backdrop-blur-sm transition-all duration-300 hover:border-(--border-active) hover:bg-white/5 hover:shadow-[var(--shadow-glow-cyan)] focus-ring-glow"
          >
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-linear-to-br from-cyan-400 via-blue-500 to-purple-500 p-3">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-1 text-xl font-heading font-bold text-gradient-hero">
              Guides
            </h3>
            <p className="text-xs text-white/60 mb-2">{data.guides.length} guides</p>
            <p className="text-sm text-white/70 leading-relaxed">
              In-depth guides on music production, DJing, AI tools, the Metaverse, and creative
              techniques that empower your work.
            </p>
          </button>

          {/* Reflections card */}
          <button
            onClick={() => setActiveSection("reflections")}
            className="group relative rounded-3xl border border-white/10 bg-white/3 p-6 text-left shadow-[var(--shadow-glow-emerald)] backdrop-blur-sm transition-all duration-300 hover:border-(--border-active) hover:bg-white/5 hover:shadow-[var(--shadow-glow-emerald)] focus-ring-glow"
          >
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-linear-to-br from-blue-600 via-teal-500 to-emerald-400 p-3">
              <User className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-1 text-xl font-heading font-bold text-gradient-hero">
              Reflections
            </h3>
            <p className="text-xs text-white/60 mb-2">{data.reflections.length} entries</p>
            <p className="text-sm text-white/70 leading-relaxed">
              Deep dives into the evolution—stories, experiences, and the path from music curator to Digital Jockey.
            </p>
          </button>
        </div>
      </section >
    )
  }

  // Section views
  return (
    <section className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 pb-24 min-[1100px]:pb-6">
      {activeSection === "thoughts" && (
        <Thoughts
          onBack={() => setActiveSection(null)}
          thoughts={data.thoughts}
          deeplinkId={deepLink?.section === "thoughts" ? deepLink.slug : undefined}
          onDeeplinkConsumed={handleDeepLinkConsumed}
        />
      )}
      {activeSection === "guides" && (
        <Guides
          onBack={() => setActiveSection(null)}
          guides={data.guides}
          deeplinkId={deepLink?.section === "guides" ? deepLink.slug : undefined}
          onDeeplinkConsumed={handleDeepLinkConsumed}
        />
      )}
      {activeSection === "reflections" && (
        <Reflections
          onBack={() => setActiveSection(null)}
          reflectionsData={data.reflections}
          deeplinkId={deepLink?.section === "reflections" ? deepLink.slug : undefined}
          onDeeplinkConsumed={handleDeepLinkConsumed}
        />
      )}
    </section>
  )
}
