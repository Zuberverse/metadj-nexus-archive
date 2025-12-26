import { useCallback, useMemo, useState } from "react"
import Image from "next/image"
import clsx from "clsx"
import { GripVertical, X, Clock, Search, Music, ListPlus } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"
import { DEFAULT_ARTWORK_SRC } from "@/lib/app.constants"
import { getTracksByCollection } from "@/lib/music"
import { filterTracks, filterCollections } from "@/lib/music/filters"
import type { Collection, Track } from "@/types"

interface QueueSectionProps {
  tracks: Track[]
  collections?: Collection[]
  onReorder?: (fromIndex: number, toIndex: number) => void
  onRemove?: (trackId: string) => void
  /** Callback to restore removed tracks (for undo functionality) */
  onInsert?: (tracks: Track[], index: number) => void
  allTracks: Track[]
  onSearchSelect?: (track: Track) => void
  onCollectionSelect?: (collection: Collection) => void
  onSearchQueueAdd?: (track: Track) => void
  /** Whether there's a track currently playing */
  hasCurrentTrack?: boolean
  searchQuery?: string
  onSearchChange?: (value: string) => void
}

export function QueueSection({
  tracks,
  collections = [],
  onReorder,
  onRemove,
  onInsert,
  allTracks,
  onSearchSelect,
  onCollectionSelect,
  onSearchQueueAdd,
  hasCurrentTrack = false,
  searchQuery,
  onSearchChange,
}: QueueSectionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [internalQuery, setInternalQuery] = useState("")
  const query = searchQuery ?? internalQuery
  const setQuery = onSearchChange ?? setInternalQuery
  const { showToast } = useToast()

  // Handle queue remove with undo toast
  const handleRemove = useCallback((trackId: string) => {
    const index = tracks.findIndex(t => t.id === trackId)
    if (index === -1 || !onRemove) return

    const removed = tracks[index]

    // Remove the track
    onRemove(trackId)

    // Show undo toast if we have the insert callback
    if (onInsert) {
      showToast({
        message: `"${removed.title}" removed`,
        variant: "info",
        action: {
          label: "Undo",
          onClick: () => onInsert([removed], index)
        }
      })
    }
  }, [tracks, onRemove, onInsert, showToast])

  const { trackResults, collectionResults } = useMemo(() => {
    if (!query.trim()) return { trackResults: [], collectionResults: [] }

    // Use shared filter logic
    return {
      trackResults: filterTracks(allTracks, query, undefined, getTracksByCollection),
      collectionResults: filterCollections(collections, query)
    }
  }, [allTracks, collections, query])

  const isSearching = Boolean(query.trim())
  const hasResults = trackResults.length > 0 || collectionResults.length > 0

  const handleDrop = (targetTrackId: string) => {
    if (draggedIndex === null || !onReorder) return
    const targetIndex = tracks.findIndex((track) => track.id === targetTrackId)
    if (targetIndex === -1) return

    onReorder(draggedIndex, targetIndex)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const getAbsoluteIndex = (trackId: string, fallback: number) => {
    const found = tracks.findIndex((item) => item.id === trackId)
    return found === -1 ? fallback : found
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div className="relative group flex-1 min-w-0 max-w-[calc(100%-5rem)]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60 group-focus-within:text-white/80 transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Queue..."
            aria-label="Search queue"
            className="w-full bg-white/5 border border-white/20 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/60 focus-ring focus:bg-white/10 focus:border-white/30 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-white text-white/60 transition-colors touch-manipulation"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <span className="text-xs text-(--text-muted) whitespace-nowrap shrink-0 pr-1">{tracks.length} tracks</span>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-[200px] scrollbar-hide">
        {/* Search with no matches */}
        {isSearching && !hasResults ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-4 pt-8">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center border border-white/15">
              <Search className="h-5 w-5 text-white/60" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-(--text-subtle)">No matches found</p>
              <p className="text-xs text-white/60">Try different keywords</p>
            </div>
          </div>
        ) : /* True empty state - nothing playing, no queue */
          !hasCurrentTrack && tracks.length === 0 && !isSearching ? (
            <div className="flex flex-col items-center gap-6 text-center px-4 py-8">
              <div className="relative group/empty">
                {/* Glassmorphic Illustration Layer */}
                <div className="absolute -inset-4 bg-purple-500/10 blur-2xl rounded-full opacity-50 group-hover/empty:opacity-70 transition-opacity" />
                <div className="relative w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center border border-white/20 backdrop-blur-xl shadow-2xl rotate-3 group-hover/empty:rotate-0 transition-transform duration-500">
                  <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent opacity-50" />
                  <Clock className="h-10 w-10 text-white/40 group-hover/empty:scale-110 transition-transform duration-500" aria-hidden="true" />
                </div>
                {/* Secondary accent element */}
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/20 backdrop-blur-md flex items-center justify-center -rotate-12 group-hover/empty:rotate-0 transition-transform duration-500 delay-75">
                  <Music className="h-5 w-5 text-cyan-400/50" />
                </div>
              </div>

              <div className="space-y-2 max-w-[240px]">
                <h3 className="text-base font-heading font-bold text-white/90">Your journey starts here</h3>
                <p className="text-xs text-white/50 leading-relaxed">The queue is waiting for your selection. Find a track to begin your experience.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const searchInput = document.querySelector<HTMLInputElement>('input[aria-label="Search queue"]')
                  searchInput?.focus()
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white/15 border border-white/20 transition-all hover:border-white/40 focus-ring-glow interactive-scale"
              >
                <Search className="h-3.5 w-3.5" />
                Discover Music
              </button>
            </div>
          ) : /* Track playing but queue depleted */
            hasCurrentTrack && tracks.length === 0 && !isSearching ? (
              <div className="flex flex-col items-center gap-6 text-center px-4 py-8">
                <div className="relative group/depleted">
                  <div className="absolute -inset-4 bg-cyan-500/10 blur-2xl rounded-full opacity-50 group-hover/depleted:opacity-70 transition-opacity" />
                  <div className="relative w-24 h-24 rounded-full bg-black/40 flex items-center justify-center border border-white/15 backdrop-blur-xl shadow-2xl group-hover/depleted:scale-105 transition-transform duration-500">
                    <div className="absolute inset-0 bg-linear-to-tr from-purple-500/10 via-transparent to-cyan-500/10 opacity-70" />
                    <Music className="h-10 w-10 text-cyan-400/40 group-hover/depleted:text-cyan-400/60 transition-colors duration-500" aria-hidden="true" />
                  </div>
                </div>

                <div className="space-y-2 max-w-[240px]">
                  <h3 className="text-base font-heading font-bold text-white/90">End of the line?</h3>
                  <p className="text-xs text-white/50 leading-relaxed">You&apos;re on the last track. Add more selections to keep the energy flowing.</p>
                </div>

                {onSearchQueueAdd && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-linear-to-r from-purple-500/20 to-cyan-500/20 text-white hover:from-purple-500/30 hover:to-cyan-500/30 border border-white/15 transition-all hover:border-white/30 focus-ring-glow interactive-scale"
                  >
                    <ListPlus className="h-4 w-4" />
                    Feed the Queue
                  </button>
                )}
              </div>
            ) :
              isSearching ? (
                /* Search Results Display */
                <div className="space-y-4">
                  {/* Collection Results */}
                  {collectionResults.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/60 px-2">Collections</h4>
                      {collectionResults.map((collection) => (
                        <button
                          key={collection.id}
                          onClick={() => onCollectionSelect?.(collection)}
                          className="w-full group flex items-center gap-3 rounded-lg px-2 py-2 transition-all border border-white/10 hover:bg-white/5 hover:border-white/20 text-left"
                        >
                          <div className="relative h-10 w-10 overflow-hidden rounded-lg shadow-xs shrink-0 border border-white/20">
                            {/* Placeholder or actual artwork if we had it easily accessible without a getter, 
                           but SearchBar iterates collection props properly. QueueSection should too.
                           Let's assume artworkUrl is on Collection or we use a fallback. 
                           Collection interface has artworkUrl? Yes.
                       */}
                            <Image
                              src={collection.artworkUrl || DEFAULT_ARTWORK_SRC}
                              alt={collection.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/90 truncate font-heading font-semibold group-hover:text-white transition-colors">{collection.title}</p>
                            <p className="text-xs text-(--text-muted) truncate group-hover:text-(--text-secondary) transition-colors">{collection.trackCount} tracks</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Track Results */}
                  {trackResults.length > 0 && (
                    <div className="space-y-2">
                      {collectionResults.length > 0 && <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/60 px-2">Tracks</h4>}
                      {trackResults.map((track) => (
                        <div
                          key={track.id}
                          className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-all border border-white/10 hover:bg-white/5 hover:border-white/20 cursor-pointer"
                          onClick={() => onSearchSelect?.(track)}
                          role={onSearchSelect ? "button" : undefined}
                          tabIndex={onSearchSelect ? 0 : -1}
                          onKeyDown={(e) => {
                            if (!onSearchSelect) return
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              onSearchSelect(track)
                            }
                          }}
                        >
                          <div className="relative h-10 w-10 overflow-hidden rounded-lg shadow-xs shrink-0 border border-white/20">
                            <Image
                              src={track.artworkUrl || DEFAULT_ARTWORK_SRC}
                              alt={track.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/90 truncate font-heading font-semibold group-hover:text-white transition-colors">{track.title}</p>
                            <p className="text-xs text-(--text-muted) truncate group-hover:text-(--text-secondary) transition-colors">{track.collection}</p>
                          </div>

                          {/* Actions for search results */}
                          <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {onSearchQueueAdd && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSearchQueueAdd(track)
                                }}
                                className="rounded-full bg-white/10 px-2.5 py-1 min-h-[32px] text-[10px] font-medium text-white hover:bg-white/20 transition-colors focus-ring"
                                aria-label={`Add ${track.title} to queue`}
                              >
                                Add
                              </button>
                            )}
                            {onSearchSelect && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSearchSelect(track)
                                }}
                                className="rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 min-h-[32px] text-[10px] font-medium hover:bg-cyan-500/30 transition-colors focus-ring"
                                aria-label={`Play ${track.title}`}
                              >
                                Play
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Normal Queue List (Not Searching) */
                tracks.map((track, displayIndex) => {
                  const absoluteIndex = getAbsoluteIndex(track.id, displayIndex)
                  const isDragging = draggedIndex === absoluteIndex
                  const isDragOver = dragOverIndex === absoluteIndex

                  return (
                    <div
                      key={`${track.id}-${absoluteIndex}`}
                      className={clsx(
                        "group flex items-center gap-3 rounded-lg px-2 py-2 transition-all border border-white/10",
                        isDragOver ? "bg-white/10 border-white/30" : "hover:bg-white/5 hover:border-white/20"
                      )}
                      tabIndex={0}
                      draggable={Boolean(onReorder)}
                      onDragStart={() => {
                        if (!onReorder) return
                        setDraggedIndex(absoluteIndex)
                      }}
                      onDragOver={(event) => {
                        if (!onReorder) return
                        event.preventDefault()
                        setDragOverIndex(absoluteIndex)
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null)
                        setDragOverIndex(null)
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        if (!onReorder) return
                        handleDrop(track.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp" && absoluteIndex > 0 && onReorder) {
                          e.preventDefault()
                          onReorder(absoluteIndex, absoluteIndex - 1)
                        } else if (e.key === "ArrowDown" && absoluteIndex < tracks.length - 1 && onReorder) {
                          e.preventDefault()
                          onReorder(absoluteIndex, absoluteIndex + 1)
                        } else if ((e.key === "Delete" || e.key === "Backspace") && onRemove) {
                          e.preventDefault()
                          handleRemove(track.id)
                        } else if ((e.key === "Enter" || e.key === " ") && onSearchSelect) {
                          e.preventDefault()
                          onSearchSelect(track)
                        }
                      }}
                    >
                      <span className="text-[10px] font-mono text-white/60 w-5 text-center group-hover:text-white/80 transition-colors">{absoluteIndex + 1}</span>

                      {onReorder && (
                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-white/40 group-hover:text-white/60 cursor-grab active:cursor-grabbing transition-colors" aria-hidden />
                      )}

                      <div className="relative h-10 w-10 overflow-hidden rounded-lg shadow-xs shrink-0 border border-white/20">
                        <Image
                          src={track.artworkUrl || DEFAULT_ARTWORK_SRC}
                          alt={track.title}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/90 truncate font-heading font-semibold group-hover:text-white transition-colors">{track.title}</p>
                        <p className="text-xs text-(--text-muted) truncate group-hover:text-(--text-secondary) transition-colors">{track.collection}</p>
                      </div>

                      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {onRemove && (
                          <button
                            type="button"
                            onClick={() => handleRemove(track.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/60 hover:text-red-400 transition-colors focus-ring rounded-full"
                            aria-label={`Remove ${track.title} from queue`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
      </div>
    </div>
  )
}
