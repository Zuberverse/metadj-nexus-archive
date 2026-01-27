"use client"

import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { BookOpen, Layers, Loader2, User, Search, X } from "lucide-react"
import { STORAGE_KEYS, getString, setString } from "@/lib/storage"
import { getCachedWisdomData, loadWisdomData, type WisdomDeepLink } from "@/lib/wisdom"
import { Guides } from "./Guides"
import { Journal } from "./Journal"
import { Reflections } from "./Reflections"
import { Thoughts } from "./Thoughts"
import type { ThoughtPost, Guide, Reflection } from "@/data/wisdom-content"
import type { WisdomSection } from "@/types"

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
  /** Callback when active section changes (for MetaDJai context). */
  onSectionChange?: (section: WisdomSection | null) => void
}

export const WisdomExperience: FC<WisdomExperienceComponentProps> = ({
  active = true,
  initialData,
  thoughts,
  guides,
  reflections,
  deepLink,
  onDeepLinkConsumed,
  onSectionChange,
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
  const [searchQuery, setSearchQuery] = useState("")

  const filteredResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query || !data) return null

    const matchedThoughts = data.thoughts.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.excerpt.toLowerCase().includes(query) ||
        t.topics?.some((topic) => topic.toLowerCase().includes(query))
    )
    const matchedGuides = data.guides.filter(
      (g) =>
        g.title.toLowerCase().includes(query) ||
        g.excerpt.toLowerCase().includes(query) ||
        g.category.toLowerCase().includes(query) ||
        g.topics?.some((topic) => topic.toLowerCase().includes(query))
    )
    const matchedReflections = data.reflections.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.excerpt.toLowerCase().includes(query) ||
        r.topics?.some((topic) => topic.toLowerCase().includes(query))
    )

    return {
      thoughts: matchedThoughts,
      guides: matchedGuides,
      reflections: matchedReflections,
      total: matchedThoughts.length + matchedGuides.length + matchedReflections.length,
    }
  }, [searchQuery, data])

  // Deep links should override the last-saved section (once, on load).
  useEffect(() => {
    if (!deepLink) return
    setActiveSection(deepLink.section)
  }, [deepLink])

  const handleDeepLinkConsumed = useCallback(() => {
    onDeepLinkConsumed?.()
  }, [onDeepLinkConsumed])

  const handleSearchResultClick = useCallback(
    (section: "thoughts" | "guides" | "reflections", id: string) => {
      setSearchQuery("")
      setActiveSection(section)
    },
    []
  )

  useEffect(() => {
    if (activeSection) {
      setString(STORAGE_KEYS.WISDOM_LAST_SECTION, activeSection)
    } else {
      setString(STORAGE_KEYS.WISDOM_LAST_SECTION, "")
    }
    // Report section changes for MetaDJai content context
    onSectionChange?.(activeSection)
  }, [activeSection, onSectionChange])

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
        <h2 className="text-xl font-heading font-semibold text-heading-solid">Couldn&apos;t load Wisdom</h2>
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
    const isSearching = searchQuery.trim().length > 0

    return (
      <section className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-6 lg:px-8 pt-6 pb-24 min-[1100px]:pb-6">
        {/* Full-page background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute inset-0 gradient-1" />
          {/* Central aurora for vibrancy */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[200%] h-[150%] brand-gradient opacity-30 blur-[120px] mix-blend-screen" />
          {/* Distributed color blooms - richer saturation */}
          <div className="absolute top-[5%] left-[8%] w-[600px] h-[600px] bg-purple-500/22 rounded-full blur-[100px]" />
          <div className="absolute top-[6%] right-[6%] w-[550px] h-[550px] bg-blue-500/20 rounded-full blur-[90px]" />
          <div className="absolute top-[28%] left-[22%] w-[500px] h-[500px] bg-cyan-500/16 rounded-full blur-[100px]" />
          <div className="absolute top-[32%] right-[12%] w-[450px] h-[450px] bg-violet-500/18 rounded-full blur-[110px]" />
          <div className="absolute top-[52%] left-[12%] w-[400px] h-[400px] bg-indigo-500/14 rounded-full blur-[90px]" />
          <div className="absolute top-[60%] right-[20%] w-[350px] h-[350px] bg-purple-600/12 rounded-full blur-[100px]" />
        </div>

        {/* Header */}
        <header className="relative z-10 text-center space-y-3">
          <h1 className="font-heading font-black leading-[0.9] text-[clamp(1.5rem,4vw,3.5rem)] tracking-tight max-w-[90vw] mx-auto text-pop">
            <span className="text-heading-solid">Wisdom</span>
          </h1>
          <p className="text-lg sm:text-xl text-indigo-100/90 font-light max-w-2xl mx-auto">
            {data.thoughts.length} Thoughts · {data.guides.length} Guides · {data.reflections.length} Reflections
          </p>
        </header>

        {/* Search bar */}
        <div className="relative z-10 max-w-md mx-auto w-full">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 group-focus-within:text-white/70 transition-colors" />
            <input
              type="text"
              placeholder="Search wisdom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-white/8 transition-all"
              aria-label="Search wisdom content"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-white/60" />
              </button>
            )}
          </div>
        </div>

        {/* Search results or content cards */}
        {isSearching && filteredResults ? (
          <div className="relative z-10 mt-4 space-y-6">
            {filteredResults.total === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60 text-sm">No results found for &quot;{searchQuery}&quot;</p>
              </div>
            ) : (
              <>
                {/* Thoughts results */}
                {filteredResults.thoughts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5" />
                      Thoughts ({filteredResults.thoughts.length})
                    </h3>
                    <div className="space-y-2">
                      {filteredResults.thoughts.map((thought) => (
                        <button
                          key={thought.id}
                          onClick={() => handleSearchResultClick("thoughts", thought.id)}
                          className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 hover:border-purple-500/30 transition-all group"
                        >
                          <h4 className="font-heading font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {thought.title}
                          </h4>
                          <p className="text-sm text-white/60 mt-1 line-clamp-2">{thought.excerpt}</p>
                          {thought.topics && thought.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {thought.topics.slice(0, 3).map((topic) => (
                                <span
                                  key={topic}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guides results */}
                {filteredResults.guides.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5" />
                      Guides ({filteredResults.guides.length})
                    </h3>
                    <div className="space-y-2">
                      {filteredResults.guides.map((guide) => (
                        <button
                          key={guide.id}
                          onClick={() => handleSearchResultClick("guides", guide.id)}
                          className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 hover:border-cyan-500/30 transition-all group"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                              {guide.category}
                            </span>
                          </div>
                          <h4 className="font-heading font-semibold text-white group-hover:text-cyan-300 transition-colors">
                            {guide.title}
                          </h4>
                          <p className="text-sm text-white/60 mt-1 line-clamp-2">{guide.excerpt}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reflections results */}
                {filteredResults.reflections.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Reflections ({filteredResults.reflections.length})
                    </h3>
                    <div className="space-y-2">
                      {filteredResults.reflections.map((reflection) => (
                        <button
                          key={reflection.id}
                          onClick={() => handleSearchResultClick("reflections", reflection.id)}
                          className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/3 hover:bg-white/6 hover:border-emerald-500/30 transition-all group"
                        >
                          <h4 className="font-heading font-semibold text-white group-hover:text-emerald-300 transition-colors">
                            {reflection.title}
                          </h4>
                          <p className="text-sm text-white/60 mt-1 line-clamp-2">{reflection.excerpt}</p>
                          {reflection.topics && reflection.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {reflection.topics.slice(0, 3).map((topic) => (
                                <span
                                  key={topic}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Content cards */
          <div className="relative z-10 grid gap-6 min-[1100px]:grid-cols-3 mt-8 max-w-6xl mx-auto">
            {/* Thoughts card */}
            <button
              onClick={() => setActiveSection("thoughts")}
              className="group relative rounded-3xl border border-white/15 bg-black/40 p-6 text-left shadow-[var(--shadow-glow-purple)] backdrop-blur-sm transition-all duration-300 hover:border-(--border-active) hover:bg-black/50 hover:shadow-[var(--shadow-glow-purple)] focus-ring-glow"
            >
              <div className="mb-4 inline-flex items-center justify-center rounded-full gradient-4 p-3">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-1 text-xl font-heading font-bold text-heading-solid">
                Thoughts
              </h3>
              <p className="text-xs text-white/80 mb-2">{data.thoughts.length} essays</p>
              <p className="text-sm text-white/90 leading-relaxed">
                Personal dispatches on music, AI, creativity, and the evolving MetaDJ work.
              </p>
            </button>

            {/* Guides card */}
            <button
              onClick={() => setActiveSection("guides")}
              className="group relative rounded-3xl border border-white/15 bg-black/40 p-6 text-left shadow-[var(--shadow-glow-cyan)] backdrop-blur-sm transition-all duration-300 hover:border-(--border-active) hover:bg-black/50 hover:shadow-[var(--shadow-glow-cyan)] focus-ring-glow"
            >
              <div className="mb-4 inline-flex items-center justify-center rounded-full gradient-4 p-3">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-1 text-xl font-heading font-bold text-heading-solid">
                Guides
              </h3>
              <p className="text-xs text-white/80 mb-2">{data.guides.length} guides</p>
              <p className="text-sm text-white/90 leading-relaxed">
                In-depth guides on music production, DJing, AI tools, the Metaverse, and creative
                techniques that empower your work.
              </p>
            </button>

            {/* Reflections card */}
            <button
              onClick={() => setActiveSection("reflections")}
              className="group relative rounded-3xl border border-white/15 bg-black/40 p-6 text-left shadow-[var(--shadow-glow-emerald)] backdrop-blur-sm transition-all duration-300 hover:border-(--border-active) hover:bg-black/50 hover:shadow-[var(--shadow-glow-emerald)] focus-ring-glow"
            >
              <div className="mb-4 inline-flex items-center justify-center rounded-full gradient-4 p-3">
                <User className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-1 text-xl font-heading font-bold text-heading-solid">
                Reflections
              </h3>
              <p className="text-xs text-white/80 mb-2">{data.reflections.length} entries</p>
              <p className="text-sm text-white/90 leading-relaxed">
                Deep dives into the evolution—stories, experiences, and the path from music curator to Digital Jockey.
              </p>
            </button>
          </div>
        )}
      </section>
    )
  }

  // Section views
  return (
    <section className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-6 pb-24 min-[1100px]:pb-6">
      {/* Dynamic Aurora Background - matching Hub design */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] brand-gradient opacity-20 blur-[100px] pointer-events-none mix-blend-screen" />

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
