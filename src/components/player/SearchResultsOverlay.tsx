"use client"

import { useRef } from "react"
import { Book, BookOpen, ListPlus, Play, Search, X } from "lucide-react"
import { useFocusTrap } from "@/hooks"
import { cn } from "@/lib/utils"
import { CollectionArtwork } from "./CollectionArtwork"
import type { JournalSearchEntry, SearchContentResults, WisdomSearchEntry } from "@/lib/search/search-results"
import type { Collection, Track } from "@/types"

interface SearchResultsOverlayProps {
    results: SearchContentResults
    currentTrackId?: string
    onClose: () => void
    onTrackSelect: (track: Track) => void
    onQueueAdd: (track: Track) => void
    onCollectionSelect?: (collection: Collection) => void
    onWisdomSelect?: (entry: WisdomSearchEntry) => void
    onJournalSelect?: (entry: JournalSearchEntry) => void
}

export function SearchResultsOverlay({
    results,
    currentTrackId,
    onClose,
    onTrackSelect,
    onQueueAdd,
    onCollectionSelect,
    onWisdomSelect,
    onJournalSelect,
}: SearchResultsOverlayProps) {
    const { tracks, collections, wisdom, journal, totalCount } = results
    const hasResults = totalCount > 0
    const overlayRef = useRef<HTMLDivElement>(null)

    useFocusTrap(overlayRef, { enabled: true })

    const formatWisdomLabel = (entry: WisdomSearchEntry) => {
        if (entry.section === "guides") {
            return entry.category ? `Guide - ${entry.category}` : "Guide"
        }
        if (entry.section === "thoughts") return "Thought"
        return "Reflection"
    }

    const formatJournalDate = (value: string) => {
        if (!value) return "Saved entry"
        const date = new Date(value)
        if (Number.isNaN(date.valueOf())) return "Saved entry"
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    }

    return (
        <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-results-title"
            aria-describedby="search-results-description"
            tabIndex={-1}
            className="absolute inset-x-5 top-[88px] bottom-5 z-20 rounded-[18px] border border-white/20 bg-[rgba(6,8,28,0.95)] shadow-[0_25px_65px_rgba(5,4,18,0.75)] backdrop-blur-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
            <div className="pointer-events-none absolute inset-0 gradient-media-bloom opacity-50" />
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-b from-white/18 via-transparent to-transparent opacity-60" />

            <div className="relative z-10 flex h-full flex-col">
                {/* Search Results Header */}
                <div className="shrink-0 flex items-center justify-between gap-3 border-b border-white/20 px-4 py-3 sm:px-5 sm:py-4 backdrop-blur-xl bg-white/2">
                    <div>
                        <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/70">Search Results</p>
                        <p id="search-results-title" className="text-heading-solid font-heading text-lg font-semibold">
                            Across Nexus
                        </p>
                        <p id="search-results-description" className="sr-only">
                            Use Tab to move through results and Escape to close.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-white/70">
                            {totalCount} {totalCount === 1 ? "result" : "results"}
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:text-white focus-ring-glow"
                            aria-label="Close search results"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Search Results List */}
                <div className="relative flex-1 overflow-y-auto overscroll-contain touch-pan-y px-3 py-3 sm:px-4 sm:py-4 space-y-3 [-webkit-overflow-scrolling:touch]">
                    {!hasResults && (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center text-white/70">
                                <Search className="h-9 w-9 text-white/40 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-white">No results found</p>
                                <p className="text-xs text-white/60">Try a different keyword.</p>
                            </div>
                        </div>
                    )}

                    {collections.length > 0 && onCollectionSelect && (
                        <div className="space-y-2">
                            <p className="text-[0.65rem] uppercase tracking-[0.32em] text-white/50">Collections</p>
                            {collections.map((collection) => (
                                <button
                                    key={`collection-${collection.id}`}
                                    type="button"
                                    onClick={() => onCollectionSelect?.(collection)}
                                    className="group relative flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-white/25 hover:bg-white/8 focus-ring-glow"
                                >
                                    <div className="h-10 w-10 rounded-md bg-white/10 overflow-hidden relative shrink-0">
                                        {collection.artworkUrl ? (
                                            <CollectionArtwork src={collection.artworkUrl} alt={collection.title} size={40} showLoading={true} />
                                        ) : (
                                            <div className="absolute inset-0 gradient-2-soft" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-heading font-semibold text-heading-solid">{collection.title}</p>
                                        <p className="text-xs text-white/65">{collection.trackCount || 0} tracks</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {tracks.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[0.65rem] uppercase tracking-[0.32em] text-white/50">Tracks</p>
                            {tracks.map((resultTrack) => {
                                const isActive = currentTrackId === resultTrack.id
                                return (
                                    <div
                                        key={resultTrack.id}
                                        className={cn(
                                            "group relative overflow-hidden flex items-center gap-2.5 rounded-xl border px-3 py-2.5 shadow-[0_12px_26px_rgba(6,8,28,0.4)] transition",
                                            isActive
                                                ? "border-purple-400/40 gradient-2-tint"
                                                : "border-white/10 bg-white/2 hover:border-white/20 hover-gradient-2"
                                        )}
                                    >
                                        <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen bg-linear-to-r from-white/10 via-white/6 to-transparent" />

                                        {/* Track artwork */}
                                        <CollectionArtwork
                                            src={resultTrack.artworkUrl}
                                            alt={resultTrack.title}
                                            size={48}
                                            showLoading={true}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => onTrackSelect(resultTrack)}
                                            className="flex-1 min-w-0 text-left focus-ring-glow rounded-lg"
                                        >
                                            <p className={cn(
                                                "truncate text-sm font-heading font-semibold text-heading-solid transition-opacity",
                                                isActive ? "opacity-100" : "opacity-85 group-hover:opacity-100"
                                            )}>
                                                {resultTrack.title}
                                            </p>
                                            <p className="truncate text-xs text-white/65">{resultTrack.artist} · {resultTrack.collection}</p>
                                        </button>

                                        {/* Play button */}
                                        <button
                                            type="button"
                                            onClick={() => onTrackSelect(resultTrack)}
                                            className={cn(
                                                "shrink-0 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border transition focus-ring-glow",
                                                isActive
                                                    ? "bg-white text-black border-white/50 shadow-[0_0_25px_rgba(255,255,255,0.35)]"
                                                    : "border-white/20 text-white/80 hover:border-white/40 hover:text-white"
                                            )}
                                            aria-label={`Play ${resultTrack.title}`}
                                        >
                                            <Play className="h-4 w-4" fill="currentColor" />
                                        </button>

                                        {/* Add to queue button */}
                                        <button
                                            type="button"
                                            onClick={() => onQueueAdd(resultTrack)}
                                            className="shrink-0 inline-flex items-center justify-center gap-1 rounded-full border border-(--border-elevated) bg-white/5 px-3 py-2 text-xs font-heading font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:border-(--border-active) hover:text-white focus-ring-glow min-h-[44px] min-w-[44px]"
                                            aria-label={`Add ${resultTrack.title} to queue`}
                                        >
                                            <ListPlus className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Queue</span>
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {wisdom.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[0.65rem] uppercase tracking-[0.32em] text-white/50">Wisdom</p>
                            {wisdom.map((entry) => (
                                <button
                                    key={`wisdom-${entry.section}-${entry.id}`}
                                    type="button"
                                    onClick={() => onWisdomSelect?.(entry)}
                                    className="group flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-white/25 hover:bg-white/8 focus-ring-glow"
                                >
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-cyan-200 shrink-0">
                                        <BookOpen className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-heading font-semibold text-heading-solid">{entry.title}</p>
                                        <p className="text-[11px] uppercase tracking-wider text-white/55">{formatWisdomLabel(entry)}</p>
                                        <p className="text-xs text-white/60 line-clamp-2">{entry.excerpt}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {journal.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[0.65rem] uppercase tracking-[0.32em] text-white/50">Journal</p>
                            {journal.map((entry) => (
                                <button
                                    key={`journal-${entry.id}`}
                                    type="button"
                                    onClick={() => onJournalSelect?.(entry)}
                                    className="group flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-white/25 hover:bg-white/8 focus-ring-glow"
                                >
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-purple-200 shrink-0">
                                        <Book className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-heading font-semibold text-heading-solid">{entry.title}</p>
                                        <p className="text-[11px] uppercase tracking-wider text-white/55">Updated {formatJournalDate(entry.updatedAt)}</p>
                                        <p className="text-xs text-white/60 line-clamp-2">{entry.excerpt}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
