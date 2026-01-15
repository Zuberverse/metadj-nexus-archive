"use client"

import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Layers, ChevronRight, Clock, Sparkles } from "lucide-react"
import { ShareButton } from "@/components/ui/ShareButton"
import { useToast } from "@/contexts/ToastContext"
import { useTitleFit } from "@/hooks/wisdom/use-title-fit"
import { trackActivationFirstGuide, trackGuideOpened } from "@/lib/analytics"
import { dispatchMetaDjAiPrompt } from "@/lib/metadjai/external-prompts"
import {
  estimateSectionedReadTime,
  formatReadTime,
  setContinueReading,
  stripSignoffParagraphs,
} from "@/lib/wisdom"
import { ReadingProgressBar } from "./ReadingProgressBar"
import { TableOfContents } from "./TableOfContents"
import { WisdomBreadcrumb, type BreadcrumbItem } from "./WisdomBreadcrumb"
import { WisdomFilters } from "./WisdomFilters"
import { WisdomFooter } from "./WisdomFooter"
import type { Guide } from "@/data/wisdom-content"

interface GuidesProps {
  onBack?: () => void
  guides: Guide[]
  deeplinkId?: string
  onDeeplinkConsumed?: () => void
}

export const Guides: FC<GuidesProps> = ({ onBack, guides, deeplinkId, onDeeplinkConsumed }) => {
  const { showToast } = useToast()
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null)
  const [selectedTopic, setSelectedTopic] = useState("all")
  const articleRef = useRef<HTMLDivElement | null>(null)
  const { ref: titleRef, titleClass } = useTitleFit()

  useEffect(() => {
    if (!deeplinkId) return
    if (selectedGuide) return

    const guide = guides.find((candidate) => candidate.id === deeplinkId)
    if (!guide) {
      showToast({ message: "That Guide link isn't available", variant: "error" })
      onDeeplinkConsumed?.()
      return
    }

    setSelectedGuide(guide)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    onDeeplinkConsumed?.()
  }, [deeplinkId, guides, selectedGuide, showToast, onDeeplinkConsumed])

  useEffect(() => {
    if (!selectedGuide) return
    trackActivationFirstGuide({
      guideId: selectedGuide.id,
      category: selectedGuide.category,
    })
    trackGuideOpened({
      guideId: selectedGuide.id,
      category: selectedGuide.category,
    })
  }, [selectedGuide])

  useEffect(() => {
    if (!selectedGuide) return
    setContinueReading({
      section: "guides",
      id: selectedGuide.id,
      title: selectedGuide.title,
      excerpt: selectedGuide.excerpt,
      readTimeMinutes: estimateSectionedReadTime(selectedGuide.sections),
      lastOpenedAt: new Date().toISOString(),
    })
  }, [selectedGuide])

  const returnToList = useCallback(() => {
    setSelectedGuide(null)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  // Build breadcrumb path based on current state
  const breadcrumbPath = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { label: "Wisdom", onClick: onBack }
    ]

    if (selectedGuide) {
      items.push({ label: "Guides", onClick: returnToList })
      items.push({ label: selectedGuide.title })
    } else {
      items.push({ label: "Guides" })
    }

    return items
  }, [selectedGuide, onBack, returnToList])

  const topics = useMemo(() => {
    const topicSet = new Set<string>()
    guides.forEach((guide) => {
      guide.topics?.forEach((topic) => topicSet.add(topic))
    })
    return Array.from(topicSet).sort((a, b) => a.localeCompare(b))
  }, [guides])

  const filteredGuides = useMemo(() => {
    return guides.filter((guide) => {
      return selectedTopic === "all" || (guide.topics ?? []).includes(selectedTopic)
    })
  }, [guides, selectedTopic])

  // List view - show all guides
  if (!selectedGuide) {
    return (
      <section className="space-y-6">
        {/* Breadcrumb navigation */}
        {onBack && (
          <WisdomBreadcrumb path={breadcrumbPath} className="mb-4" />
        )}

        <header className="text-center">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-3">
            <span className="text-gradient-hero">Knowledge & How-To</span>
          </h2>
          <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto">
            In-depth guides for you—music production, DJing, AI tools, the Metaverse, and creative
            techniques that empower your work.
          </p>
        </header>

        {/* Guides list */}
        <div className="space-y-4">
          <WisdomFilters
            topics={topics}
            selectedTopic={selectedTopic}
            onTopicChange={setSelectedTopic}
          />

          {filteredGuides.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-sm text-white/70">
              <p>No Guides match those filters yet.</p>
              <button
                type="button"
                onClick={() => setSelectedTopic("all")}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-500/20 transition"
              >
                Reset filters
              </button>
            </div>
          ) : filteredGuides.map((guide) => (
            <article
              key={guide.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedGuide(guide)
                document.documentElement.scrollTop = 0
                document.body.scrollTop = 0
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedGuide(guide)
                  document.documentElement.scrollTop = 0
                  document.body.scrollTop = 0
                }
              }}
              className="group relative rounded-2xl border border-white/15 bg-black/45 p-6 backdrop-blur-xl transition-all duration-300 cursor-pointer hover:bg-black/55 hover:border-white/25 focus-ring"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-heading-solid">
                    {guide.title}
                  </h3>
                  <p className="text-sm sm:text-base text-white/70 leading-relaxed line-clamp-2">
                    {guide.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-white/70">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      <span>{guide.sections.length} sections</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatReadTime(estimateSectionedReadTime(guide.sections))}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-white/40 shrink-0 group-hover:text-cyan-400 transition-colors" />
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  // Detail view - show selected guide
  const currentIndex = guides.findIndex((guide) => guide.id === selectedGuide.id)
  const previousGuide = currentIndex > 0 ? guides[currentIndex - 1] : null
  const nextGuide = currentIndex >= 0 && currentIndex < guides.length - 1 ? guides[currentIndex + 1] : null

  const handleSummarizeWithMetaDjAi = () => {
    dispatchMetaDjAiPrompt({
      newSession: true,
      prompt: [
        `Summarize the Wisdom Guide titled "${selectedGuide.title}".`,
        `If you need the full text, call getWisdomContent with section "guides" and id "${selectedGuide.id}".`,
        "",
        "Output format:",
        "1 sentence thesis.",
        "",
        "5 bullets for the main concepts.",
        "",
        "A short 'How to apply this' section with 3 steps.",
        "",
        "End with one question for me.",
      ].join("\n"),
    })
  }

  return (
    <article className="space-y-6">
      {/* Breadcrumb navigation */}
      {onBack && (
        <WisdomBreadcrumb path={breadcrumbPath} className="mb-4" />
      )}

      {/* Article content */}
      <div
        ref={articleRef}
        className="rounded-2xl border border-white/15 bg-black/45 p-6 sm:p-8 backdrop-blur-xl"
      >
        <ReadingProgressBar
          targetRef={articleRef}
          className="mb-3"
        />
        <header className="mb-6 pb-6 border-b border-white/10">
          <h1
            ref={titleRef as React.RefObject<HTMLHeadingElement>}
            className={`${titleClass} font-heading font-bold text-gradient-hero mb-3 leading-tight text-pop`}
          >
            {selectedGuide.title}
          </h1>
          <p className="text-base sm:text-lg text-white/70 leading-relaxed mb-4">
            {selectedGuide.excerpt}
          </p>
          <div className="flex flex-col gap-3 min-[1100px]:flex-row min-[1100px]:items-center min-[1100px]:gap-4 text-sm text-white/70">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                <span>{selectedGuide.sections.length} sections</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{formatReadTime(estimateSectionedReadTime(selectedGuide.sections))}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 min-[1100px]:ml-auto">
              <ShareButton
                wisdom={{ type: "guides", item: selectedGuide }}
                variant="button"
                size="xs"
              />
              <button
                type="button"
                onClick={handleSummarizeWithMetaDjAi}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Summarize
              </button>
            </div>
          </div>
        </header>

        {/* Table of Contents */}
        <TableOfContents sections={selectedGuide.sections} accentClass="text-cyan-400" />

        {/* Guide sections */}
        <div className="space-y-8">
          {selectedGuide.sections.map((section, sectionIndex) => {
            const sectionId = section.heading
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "-")
            return (
              <section key={sectionIndex} id={sectionId} className="space-y-4 scroll-mt-24">
                <h2 className="text-xl sm:text-2xl font-heading font-semibold">
                  <span className="text-heading-solid">{section.heading}</span>
                </h2>
                <div className="space-y-4">
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

        {(previousGuide || nextGuide) && (
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-between">
            {previousGuide ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedGuide(previousGuide)
                  document.documentElement.scrollTop = 0
                  document.body.scrollTop = 0
                }}
                className="text-left rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
              >
                {/* WCAG: text-white/70 for 4.5:1 contrast on navigation labels */}
                <span className="block text-xs text-white/70 mb-1">Previous guide</span>
                {previousGuide.title}
              </button>
            ) : <div />}
            {nextGuide && (
              <button
                type="button"
                onClick={() => {
                  setSelectedGuide(nextGuide)
                  document.documentElement.scrollTop = 0
                  document.body.scrollTop = 0
                }}
                className="text-left rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
              >
                {/* WCAG: text-white/70 for 4.5:1 contrast on navigation labels */}
                <span className="block text-xs text-white/70 mb-1">Next guide</span>
                {nextGuide.title}
              </button>
            )}
          </div>
        )}

        <WisdomFooter />
      </div>
    </article>
  )
}
