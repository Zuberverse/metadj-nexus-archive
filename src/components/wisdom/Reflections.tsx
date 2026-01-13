"use client"

import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { User, Layers, ChevronRight, Clock, Share2, Sparkles } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"
import { dispatchMetaDjAiPrompt } from "@/lib/metadjai/external-prompts"
import {
  buildWisdomDeepLinkUrl,
  estimateSectionedReadTime,
  formatReadTime,
  getReadTimeBucket,
  setContinueReading,
  stripSignoffParagraphs,
} from "@/lib/wisdom"
import { ReadingProgressBar } from "./ReadingProgressBar"
import { TableOfContents } from "./TableOfContents"
import { WisdomBreadcrumb, type BreadcrumbItem } from "./WisdomBreadcrumb"
import { WisdomFilters, type ReadTimeFilter } from "./WisdomFilters"
import { WisdomFooter } from "./WisdomFooter"
import type { Reflection } from "@/data/wisdom-content"

interface ReflectionsProps {
  onBack: () => void
  reflectionsData: Reflection[]
  deeplinkId?: string
  onDeeplinkConsumed?: () => void
}

export const Reflections: FC<ReflectionsProps> = ({ onBack, reflectionsData, deeplinkId, onDeeplinkConsumed }) => {
  const { showToast } = useToast()
  const [selectedReflection, setSelectedReflection] = useState<Reflection | null>(null)
  const [selectedTopic, setSelectedTopic] = useState("all")
  const [selectedLength, setSelectedLength] = useState<ReadTimeFilter>("all")
  const articleRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!deeplinkId) return
    if (selectedReflection) return

    const reflection = reflectionsData.find((candidate) => candidate.id === deeplinkId)
    if (!reflection) {
      showToast({ message: "That Reflection link isn't available", variant: "error" })
      onDeeplinkConsumed?.()
      return
    }

    setSelectedReflection(reflection)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    onDeeplinkConsumed?.()
  }, [deeplinkId, reflectionsData, selectedReflection, showToast, onDeeplinkConsumed])

  const returnToList = useCallback(() => {
    setSelectedReflection(null)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  // Build breadcrumb path based on current state
  const breadcrumbPath = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { label: "Wisdom", onClick: onBack }
    ]

    if (selectedReflection) {
      items.push({ label: "Reflections", onClick: returnToList })
      items.push({ label: selectedReflection.title })
    } else {
      items.push({ label: "Reflections" })
    }

    return items
  }, [selectedReflection, onBack, returnToList])

  useEffect(() => {
    if (!selectedReflection) return
    setContinueReading({
      section: "reflections",
      id: selectedReflection.id,
      title: selectedReflection.title,
      excerpt: selectedReflection.excerpt,
      readTimeMinutes: estimateSectionedReadTime(selectedReflection.sections),
      lastOpenedAt: new Date().toISOString(),
    })
  }, [selectedReflection])

  const topics = useMemo(() => {
    const topicSet = new Set<string>()
    reflectionsData.forEach((reflection) => {
      reflection.topics?.forEach((topic) => topicSet.add(topic))
    })
    return Array.from(topicSet).sort((a, b) => a.localeCompare(b))
  }, [reflectionsData])

  const filteredReflections = useMemo(() => {
    return reflectionsData.filter((reflection) => {
      const matchesTopic =
        selectedTopic === "all" || (reflection.topics ?? []).includes(selectedTopic)
      const readTimeBucket = getReadTimeBucket(estimateSectionedReadTime(reflection.sections))
      const matchesLength = selectedLength === "all" || readTimeBucket === selectedLength
      return matchesTopic && matchesLength
    })
  }, [reflectionsData, selectedTopic, selectedLength])

  const resetFilters = useCallback(() => {
    setSelectedTopic("all")
    setSelectedLength("all")
  }, [])

  // List view - show all reflections
  if (!selectedReflection) {
    return (
      <section className="space-y-6">
        {/* Breadcrumb navigation */}
        <WisdomBreadcrumb path={breadcrumbPath} className="mb-4" />

        <header className="text-center">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-violet-400 to-cyan-300">Personal Stories & Insights</span>
          </h2>
          <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto">
            Explore MetaDJ&apos;s reality—personal narratives, origin stories, and the path that
            shaped this creative vision.
          </p>
        </header>

        {/* Reflections list */}
        <div className="space-y-4">
          <WisdomFilters
            topics={topics}
            selectedTopic={selectedTopic}
            selectedLength={selectedLength}
            onTopicChange={setSelectedTopic}
            onLengthChange={setSelectedLength}
            onReset={resetFilters}
          />

          {filteredReflections.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-sm text-white/70">
              <p>No Reflections match those filters yet.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-500/20 transition"
              >
                Reset filters
              </button>
            </div>
          ) : filteredReflections.map((reflection) => (
            <article
              key={reflection.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedReflection(reflection)
                document.documentElement.scrollTop = 0
                document.body.scrollTop = 0
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedReflection(reflection)
                  document.documentElement.scrollTop = 0
                  document.body.scrollTop = 0
                }
              }}
              className="group relative rounded-2xl border border-white/15 bg-black/45 p-6 backdrop-blur-xl transition-all duration-300 cursor-pointer hover:bg-black/55 hover:border-white/25 focus-ring"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-heading-solid">
                    {reflection.title}
                  </h3>
                  <p className="text-sm sm:text-base text-white/70 leading-relaxed line-clamp-2">
                    {reflection.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-white/70">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      <span>{reflection.sections.length} sections</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatReadTime(estimateSectionedReadTime(reflection.sections))}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-white/40 shrink-0 group-hover:text-teal-400 transition-colors" />
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  // Detail view - show selected reflection
  const currentIndex = reflectionsData.findIndex((reflection) => reflection.id === selectedReflection.id)
  const previousReflection = currentIndex > 0 ? reflectionsData[currentIndex - 1] : null
  const nextReflection =
    currentIndex >= 0 && currentIndex < reflectionsData.length - 1
      ? reflectionsData[currentIndex + 1]
      : null

  const handleSummarizeWithMetaDjAi = () => {
    dispatchMetaDjAiPrompt({
      newSession: true,
      prompt: [
        `Summarize the Wisdom Reflection titled "${selectedReflection.title}".`,
        `If you need the full text, call getWisdomContent with section "reflections" and id "${selectedReflection.id}".`,
        "",
        "Output format:",
        "1 sentence thesis.",
        "",
        "5 bullets for the main story beats / insights.",
        "",
        "2 takeaways for how this shapes the MetaDJ Nexus philosophy.",
        "",
        "End with one question for me.",
      ].join("\n"),
    })
  }

  const handleShare = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const url = buildWisdomDeepLinkUrl("reflections", selectedReflection.id, origin)
    const title = `${selectedReflection.title} — MetaDJ Wisdom`
    const text = `Wisdom Reflection: ${selectedReflection.title}`

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // Fall back to clipboard (user may have canceled).
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      showToast({ message: "Link copied", variant: "success", duration: 2000 })
    } catch {
      showToast({ message: "Unable to copy link", variant: "error" })
    }
  }

  return (
    <article className="space-y-6">
      {/* Breadcrumb navigation */}
      <WisdomBreadcrumb path={breadcrumbPath} className="mb-4" />

      {/* Article content */}
      <div
        ref={articleRef}
        className="rounded-2xl border border-white/15 bg-black/45 p-6 sm:p-8 backdrop-blur-xl"
      >
        <ReadingProgressBar
          targetRef={articleRef}
          className="-mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-6"
        />
        <header className="mb-8 pb-6 border-b border-white/10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-gradient-hero mb-4 leading-tight text-pop">
            {selectedReflection.title}
          </h1>
          <p className="text-base sm:text-lg text-white/70 leading-relaxed mb-4">
            {selectedReflection.excerpt}
          </p>
          <div className="flex flex-col gap-3 min-[1100px]:flex-row min-[1100px]:items-center min-[1100px]:gap-4 text-sm text-white/70">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                <span>{selectedReflection.sections.length} sections</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{formatReadTime(estimateSectionedReadTime(selectedReflection.sections))}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 min-[1100px]:ml-auto">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
              <button
                type="button"
                onClick={handleSummarizeWithMetaDjAi}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-100 hover:bg-teal-500/20 hover:border-teal-400/50 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Summarize
              </button>
            </div>
          </div>
        </header>

        {/* Table of Contents */}
        <TableOfContents sections={selectedReflection.sections} accentClass="text-teal-400" />

        {/* Reflection sections */}
        <div className="space-y-8">
          {selectedReflection.sections.map((section, sectionIndex) => {
            const sectionId = section.heading
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "-")
            return (
              <section key={sectionIndex} id={sectionId} className="space-y-4 scroll-mt-24">
                <h2
                  className="text-xl sm:text-2xl font-heading font-semibold border-l-4 border-teal-400 pl-4"
                >
                  <span className="text-heading-solid">{section.heading}</span>
                </h2>
                <div className="space-y-4 pl-6">
                  {stripSignoffParagraphs(section.paragraphs).map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      className="text-base sm:text-lg text-white/80 leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        {(previousReflection || nextReflection) && (
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-between">
            {previousReflection ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedReflection(previousReflection)
                  document.documentElement.scrollTop = 0
                  document.body.scrollTop = 0
                }}
                className="text-left rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
              >
                {/* WCAG: text-white/70 for 4.5:1 contrast on navigation labels */}
                <span className="block text-xs text-white/70 mb-1">Previous reflection</span>
                {previousReflection.title}
              </button>
            ) : <div />}
            {nextReflection && (
              <button
                type="button"
                onClick={() => {
                  setSelectedReflection(nextReflection)
                  document.documentElement.scrollTop = 0
                  document.body.scrollTop = 0
                }}
                className="text-left rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
              >
                {/* WCAG: text-white/70 for 4.5:1 contrast on navigation labels */}
                <span className="block text-xs text-white/70 mb-1">Next reflection</span>
                {nextReflection.title}
              </button>
            )}
          </div>
        )}

        <WisdomFooter signedBy={selectedReflection.signedBy ?? "MetaDJ"} />
      </div>
    </article>
  )
}
