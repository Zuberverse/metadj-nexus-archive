"use client"

import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Calendar, BookOpen, ChevronRight, Clock, Search, Sparkles, X } from "lucide-react"
import { ShareButton } from "@/components/ui/ShareButton"
import { useToast } from "@/contexts/ToastContext"
import { useTitleFit } from "@/hooks/wisdom/use-title-fit"
import { dispatchMetaDjAiPrompt } from "@/lib/metadjai/external-prompts"
import {
  estimateReadTime,
  formatReadTime,
  setContinueReading,
  stripSignoffParagraphs,
} from "@/lib/wisdom"
import { ReadingProgressBar } from "./ReadingProgressBar"
import { WisdomBreadcrumb, type BreadcrumbItem } from "./WisdomBreadcrumb"
import { WisdomFilters } from "./WisdomFilters"
import { WisdomFooter } from "./WisdomFooter"
import type { ThoughtPost } from "@/data/wisdom-content"

interface ThoughtsProps {
  onBack?: () => void
  thoughts: ThoughtPost[]
  deeplinkId?: string
  onDeeplinkConsumed?: () => void
}

export const Thoughts: FC<ThoughtsProps> = ({ onBack, thoughts, deeplinkId, onDeeplinkConsumed }) => {
  const { showToast } = useToast()
  const [selectedPost, setSelectedPost] = useState<ThoughtPost | null>(null)
  const [selectedTopic, setSelectedTopic] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const articleRef = useRef<HTMLDivElement | null>(null)
  const { ref: titleRef, titleClass } = useTitleFit({ watch: selectedPost?.title })

  useEffect(() => {
    if (!deeplinkId) return
    if (selectedPost) return

    const post = thoughts.find((candidate) => candidate.id === deeplinkId)
    if (!post) {
      showToast({ message: "That Thought link isn't available", variant: "error" })
      onDeeplinkConsumed?.()
      return
    }

    setSelectedPost(post)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    onDeeplinkConsumed?.()
  }, [deeplinkId, thoughts, selectedPost, showToast, onDeeplinkConsumed])

  const sortedThoughts = useMemo(() => {
    return [...thoughts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [thoughts])

  const topics = useMemo(() => {
    const topicSet = new Set<string>()
    thoughts.forEach((post) => {
      post.topics?.forEach((topic) => topicSet.add(topic))
    })
    return Array.from(topicSet).sort((a, b) => a.localeCompare(b))
  }, [thoughts])

  const filteredThoughts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return sortedThoughts.filter((post) => {
      const matchesTopic = selectedTopic === "all" || (post.topics ?? []).includes(selectedTopic)
      if (!matchesTopic) return false
      if (!query) return true
      return (
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        (post.topics ?? []).some(t => t.toLowerCase().includes(query))
      )
    })
  }, [sortedThoughts, selectedTopic, searchQuery])

  const returnToList = useCallback(() => {
    setSelectedPost(null)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  useEffect(() => {
    if (!selectedPost) return
    setContinueReading({
      section: "thoughts",
      id: selectedPost.id,
      title: selectedPost.title,
      excerpt: selectedPost.excerpt,
      readTimeMinutes: estimateReadTime(selectedPost.content),
      lastOpenedAt: new Date().toISOString(),
    })
  }, [selectedPost])

  // Build breadcrumb path based on current state
  const breadcrumbPath = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { label: "Wisdom", onClick: onBack }
    ]

    if (selectedPost) {
      items.push({ label: "Thoughts", onClick: returnToList })
      items.push({ label: selectedPost.title })
    } else {
      items.push({ label: "Thoughts" })
    }

    return items
  }, [selectedPost, onBack, returnToList])

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // List view - show all blog posts
  if (!selectedPost) {
    return (
      <section className="space-y-6">
        {/* Breadcrumb navigation */}
        {onBack && (
          <WisdomBreadcrumb path={breadcrumbPath} className="mb-4" />
        )}

        <header className="text-center">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-3">
            <span className="text-gradient-hero">Ideas & Inspiration</span>
          </h2>
          <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto">
            Personal dispatches on music, AI, creativity, and the evolving MetaDJ work.
            One essay at a time, intentionally surfaced.
          </p>
        </header>

        {/* Blog post list */}
        <div className="space-y-4">
          {/* Search bar */}
          <div className="max-w-md w-full">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 group-focus-within:text-white/70 transition-colors" />
              <input
                type="text"
                placeholder="Search thoughts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-white/8 transition-all"
                aria-label="Search thoughts"
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
            {searchQuery && (
              <p className="mt-2 text-xs text-white/60">
                {filteredThoughts.length} {filteredThoughts.length === 1 ? "thought" : "thoughts"} found
              </p>
            )}
          </div>

          <WisdomFilters
            topics={topics}
            selectedTopic={selectedTopic}
            onTopicChange={setSelectedTopic}
          />

          {filteredThoughts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center text-sm text-white/70">
              <p>{searchQuery ? "No thoughts match your search." : "No Thoughts match those filters yet."}</p>
              <button
                type="button"
                onClick={() => { setSelectedTopic("all"); setSearchQuery(""); }}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-500/20 transition"
              >
                Reset filters
              </button>
            </div>
          ) : filteredThoughts.map((post) => (
            <article
              key={post.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedPost(post)
                document.documentElement.scrollTop = 0
                document.body.scrollTop = 0
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedPost(post)
                  document.documentElement.scrollTop = 0
                  document.body.scrollTop = 0
                }
              }}
              className="group relative rounded-2xl border border-(--border-standard) bg-black/45 p-6 backdrop-blur-xl transition-all duration-300 cursor-pointer hover:bg-black/55 hover:border-(--border-elevated) focus-ring"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl sm:text-2xl font-heading font-bold text-heading-solid">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs sm:text-sm text-white/70">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatReadTime(estimateReadTime(post.content))}</span>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-white/70 leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/40 shrink-0 group-hover:text-cyan-400 transition-colors" />
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  // Detail view - show selected blog post
  const visibleParagraphs = stripSignoffParagraphs(selectedPost.content)
  const currentIndex = sortedThoughts.findIndex((post) => post.id === selectedPost.id)
  const newerPost = currentIndex > 0 ? sortedThoughts[currentIndex - 1] : null
  const olderPost = currentIndex >= 0 && currentIndex < sortedThoughts.length - 1 ? sortedThoughts[currentIndex + 1] : null

  const handleSummarizeWithMetaDjAi = () => {
    dispatchMetaDjAiPrompt({
      newSession: true,
      prompt: [
        `Summarize the Wisdom Thought titled "${selectedPost.title}".`,
        `If you need the full text, call getWisdomContent with section "thoughts" and id "${selectedPost.id}".`,
        "",
        "Output format:",
        "1 sentence thesis.",
        "",
        "5 crisp bullets for the core ideas (no fluff).",
        "",
        "2 practical takeaways for a solo creator using AI as amplifier.",
        "",
        "End with one question that helps me apply this.",
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
        className="rounded-2xl border border-(--border-standard) bg-black/45 p-6 sm:p-8 backdrop-blur-xl"
      >
        <ReadingProgressBar
          targetRef={articleRef}
          className="mb-3"
        />
        <header className="mb-6 pb-6 border-b border-(--border-subtle)">
          <h1
            ref={titleRef as React.RefObject<HTMLHeadingElement>}
            className={`${titleClass} font-heading font-bold text-gradient-hero mb-3 leading-tight text-pop`}
          >
            {selectedPost.title}
          </h1>
          <div className="flex flex-col gap-3 min-[1100px]:flex-row min-[1100px]:items-center min-[1100px]:gap-4 text-sm text-white/70">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <time dateTime={selectedPost.date}>{formatDate(selectedPost.date)}</time>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{formatReadTime(estimateReadTime(selectedPost.content))}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 min-[1100px]:ml-auto">
              <ShareButton
                wisdom={{ type: "thoughts", item: selectedPost }}
                variant="button"
                size="xs"
              />
              <button
                type="button"
                onClick={handleSummarizeWithMetaDjAi}
                className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-100 hover:bg-purple-500/20 hover:border-purple-400/50 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Summarize
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          {visibleParagraphs.map((paragraph, index) => (
            <p
              key={index}
              className="text-base sm:text-lg text-white/80 leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
        </div>

        {(newerPost || olderPost) && (
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-between">
            {olderPost ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedPost(olderPost)
                  document.documentElement.scrollTop = 0
                  document.body.scrollTop = 0
                }}
                className="text-left rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
              >
                {/* WCAG: text-white/70 for 4.5:1 contrast on navigation labels */}
                <span className="block text-xs text-white/70 mb-1">Older</span>
                {olderPost.title}
              </button>
            ) : <div />}
            {newerPost && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPost(newerPost)
                  document.documentElement.scrollTop = 0
                  document.body.scrollTop = 0
                }}
                className="text-left rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
              >
                {/* WCAG: text-white/70 for 4.5:1 contrast on navigation labels */}
                <span className="block text-xs text-white/70 mb-1">Newer</span>
                {newerPost.title}
              </button>
            )}
          </div>
        )}

        <WisdomFooter />
      </div>
    </article>
  )
}
