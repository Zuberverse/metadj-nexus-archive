"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { GripVertical, X, ListMusic, AlertTriangle } from "lucide-react"
import { announce } from "@/components/accessibility/ScreenReaderAnnouncer"
import { cn } from "@/lib/utils"
import { CollectionArtwork } from "./CollectionArtwork"
import type { Track } from "@/types"

// Touch drag configuration
const LONG_PRESS_DELAY_MS = 200 // Time to hold before drag starts
const DRAG_THRESHOLD_PX = 10 // Minimum movement to start drag

interface QueueListProps {
    queueItems: Track[]
    currentCollectionTitle: string
    onQueueReorder?: (fromIndex: number, toIndex: number) => void
    onQueueTrackSelect?: (trackId: string) => void
    onQueueRemove?: (trackId: string) => void
    onQueueClear?: () => void
    hasQueue: boolean
}

export function QueueList({
    queueItems,
    currentCollectionTitle,
    onQueueReorder,
    onQueueTrackSelect,
    onQueueRemove,
    onQueueClear,
    hasQueue,
}: QueueListProps) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const [showClearConfirm, setShowClearConfirm] = useState(false)

    // Touch drag state
    const [isTouchDragging, setIsTouchDragging] = useState(false)
    const touchStartRef = useRef<{ y: number; index: number; startTime: number } | null>(null)
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

    // Cleanup long press timer on unmount
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current)
            }
        }
    }, [])

    const handleClearQueue = useCallback(() => {
        if (onQueueClear) {
            onQueueClear()
            announce("Queue cleared", { type: 'status', priority: 'polite' })
        }
        setShowClearConfirm(false)
    }, [onQueueClear])

    // HTML5 Drag handlers (for desktop/mouse)
    const handleDragStart = (index: number) => {
        setDraggedIndex(index)
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        setDragOverIndex(index)
    }

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault()
        if (draggedIndex !== null && draggedIndex !== dropIndex && onQueueReorder) {
            onQueueReorder(draggedIndex, dropIndex)
        }
        setDraggedIndex(null)
        setDragOverIndex(null)
    }

    const handleDragEnd = () => {
        setDraggedIndex(null)
        setDragOverIndex(null)
    }

    // Touch drag handlers (for mobile)
    const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
        if (!onQueueReorder) return

        const touch = e.touches[0]
        touchStartRef.current = {
            y: touch.clientY,
            index,
            startTime: Date.now()
        }

        // Start long press timer to activate drag mode
        longPressTimerRef.current = setTimeout(() => {
            if (touchStartRef.current?.index === index) {
                setIsTouchDragging(true)
                setDraggedIndex(index)
                // Haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(50)
                }
            }
        }, LONG_PRESS_DELAY_MS)
    }, [onQueueReorder])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isTouchDragging || draggedIndex === null || !listRef.current) return

        const touch = e.touches[0]
        const listRect = listRef.current.getBoundingClientRect()

        // Find which item we're over
        let newDragOverIndex: number | null = null
        itemRefs.current.forEach((el, idx) => {
            const rect = el.getBoundingClientRect()
            const itemMiddle = rect.top + rect.height / 2
            if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                // Determine if we should place above or below based on middle point
                newDragOverIndex = touch.clientY < itemMiddle ? idx : idx
            }
        })

        if (newDragOverIndex !== null && newDragOverIndex !== dragOverIndex) {
            setDragOverIndex(newDragOverIndex)
        }

        // Prevent scroll during drag
        e.preventDefault()
    }, [isTouchDragging, draggedIndex, dragOverIndex])

    const handleTouchEnd = useCallback(() => {
        // Clear long press timer
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }

        // Complete the reorder if dragging
        if (isTouchDragging && draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            onQueueReorder?.(draggedIndex, dragOverIndex)
            const track = queueItems[draggedIndex]
            if (track) {
                announce(`Moved ${track.title} to position ${dragOverIndex + 1}`, { type: 'status', priority: 'polite' })
            }
        }

        // Reset state
        setIsTouchDragging(false)
        setDraggedIndex(null)
        setDragOverIndex(null)
        touchStartRef.current = null
    }, [isTouchDragging, draggedIndex, dragOverIndex, onQueueReorder, queueItems])

    const handleTouchCancel = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
        setIsTouchDragging(false)
        setDraggedIndex(null)
        setDragOverIndex(null)
        touchStartRef.current = null
    }, [])

    return (
        <div className="relative flex flex-col flex-1 min-h-[260px] min-h-0 max-h-[55vh] overflow-hidden rounded-[18px] border border-white/20 bg-[rgba(8,10,30,0.82)] shadow-[0_14px_32px_rgba(6,8,28,0.55)] gradient-media">
            <div className="pointer-events-none absolute inset-0 gradient-media-bloom opacity-85" />
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-b from-white/14 via-transparent to-transparent opacity-40 mix-blend-screen" />

            {/* Header */}
            <div className="relative shrink-0 flex items-center justify-between gap-3 border-b border-white/20 px-3 py-2 sm:px-4 sm:py-3 backdrop-blur-xl bg-white/2">
                <div className="min-w-0 flex items-center gap-2 sm:gap-3">
                    <p className="text-base sm:text-lg font-heading font-semibold text-heading-solid">Queue</p>
                    <span className="text-xs text-white/60 ml-2 font-normal hidden sm:inline-block">Priority tracks stay on top</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    {currentCollectionTitle && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 gradient-4 px-3 py-1 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(6,8,28,0.45)]">
                            <span className="truncate max-w-[180px] sm:max-w-[220px]">{currentCollectionTitle}</span>
                        </span>
                    )}
                    <span className="inline-flex items-center gap-2 rounded-full border border-(--border-active) bg-white/5 px-3 py-1 text-xs font-semibold text-white">
                        <ListMusic className="h-4 w-4" aria-hidden="true" />
                        <span>
                            {queueItems.length} {queueItems.length === 1 ? "track" : "tracks"}
                        </span>
                    </span>
                    {hasQueue && onQueueClear && (
                        <button
                            type="button"
                            onClick={() => setShowClearConfirm(true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-(--border-elevated) bg-white/5 px-3 py-1.5 text-xs font-heading font-semibold text-white/80 transition hover:border-(--border-active) hover:bg-white/10 focus-ring-glow min-h-[44px]"
                            aria-expanded={showClearConfirm}
                        >
                            <X className="h-4 w-4" />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Clear Queue Confirmation Dialog */}
            {showClearConfirm && (
                <div
                    role="alertdialog"
                    aria-labelledby="clear-queue-title"
                    aria-describedby="clear-queue-description"
                    className="relative shrink-0 border-b border-white/20 bg-red-500/10 backdrop-blur-xl px-3 py-3 sm:px-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 shrink-0">
                            <AlertTriangle className="h-4 w-4 text-red-300" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p id="clear-queue-title" className="text-sm font-semibold text-white">
                                Clear queue?
                            </p>
                            <p id="clear-queue-description" className="text-xs text-white/70">
                                This will remove all {queueItems.length} tracks from your queue.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowClearConfirm(false)}
                                className="inline-flex items-center rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white focus-ring-glow min-h-[44px]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleClearQueue}
                                className="inline-flex items-center rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/30 hover:text-white focus-ring-glow min-h-[44px]"
                                autoFocus
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            <div
                ref={listRef}
                role="list"
                aria-label="Queue tracks. Use arrow keys to reorder items. On touch devices, press and hold to drag."
                className={cn(
                    "relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-2",
                    isTouchDragging ? "touch-none [-webkit-overflow-scrolling:auto]" : "touch-pan-y [-webkit-overflow-scrolling:touch]"
                )}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchCancel}
            >
                {queueItems.length === 0 && (
                    <div className="rounded-xl border border-white/20 bg-white/8 px-3 py-3 text-center text-sm text-white/65 shadow-[0_10px_24px_rgba(6,8,28,0.35)]">
                        No tracks queued yet. Add a track to start a session.
                    </div>
                )}
                {queueItems.map((qTrack, index) => {
                    const isDragging = draggedIndex === index
                    const isDragOver = dragOverIndex === index && draggedIndex !== index
                    return (
                        <div
                            key={qTrack.id}
                            ref={(el) => {
                                if (el) {
                                    itemRefs.current.set(index, el)
                                } else {
                                    itemRefs.current.delete(index)
                                }
                            }}
                            role="listitem"
                            tabIndex={0}
                            draggable={!!onQueueReorder && !isTouchDragging}
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            onTouchStart={(e) => handleTouchStart(e, index)}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowUp' && index > 0 && onQueueReorder) {
                                    e.preventDefault()
                                    onQueueReorder(index, index - 1)
                                    announce(`Moved ${qTrack.title} to position ${index}`, { type: 'status', priority: 'polite' })
                                } else if (e.key === 'ArrowDown' && index < queueItems.length - 1 && onQueueReorder) {
                                    e.preventDefault()
                                    onQueueReorder(index, index + 1)
                                    announce(`Moved ${qTrack.title} to position ${index + 2}`, { type: 'status', priority: 'polite' })
                                } else if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    onQueueTrackSelect?.(qTrack.id)
                                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                                    e.preventDefault()
                                    onQueueRemove?.(qTrack.id)
                                    announce(`Removed ${qTrack.title} from queue`, { type: 'status', priority: 'polite' })
                                }
                            }}
                            aria-label={`${qTrack.title} by ${qTrack.artist}. Position ${index + 1} of ${queueItems.length}. Use arrow keys to reorder, Enter to play, Delete to remove.`}
                            className={cn(
                                "group relative overflow-hidden flex items-center gap-2.5 rounded-xl border px-3 py-2.5 shadow-[0_12px_26px_rgba(6,8,28,0.4)] transition-all duration-150 focus-ring select-none",
                                isDragging
                                    ? "opacity-50 scale-[1.02] z-50 shadow-[0_20px_40px_rgba(6,8,28,0.6)] cursor-grabbing"
                                    : isDragOver
                                        ? "border-purple-400/50 bg-purple-500/15 scale-[0.98]"
                                        : "border-white/10 bg-[rgba(14,16,40,0.88)] hover:border-white/20 hover:bg-white/8 cursor-grab"
                            )}
                        >
                            <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen bg-linear-to-r from-white/10 via-white/6 to-transparent" />

                            {/* Drag handle */}
                            {onQueueReorder && (
                                <div
                                    className="shrink-0 text-white/60 group-hover:text-white/60 transition cursor-grab"
                                    aria-label="Drag to reorder"
                                    role="img"
                                >
                                    <GripVertical className="h-5 w-5" aria-hidden="true" />
                                </div>
                            )}

                            {/* Subtle track number */}
                            <div className="shrink-0 text-xs font-semibold text-white/60 tabular-nums w-5 text-center">
                                {(index + 1).toString().padStart(2, "0")}
                            </div>

                            {/* Track artwork */}
                            <CollectionArtwork
                                src={qTrack.artworkUrl}
                                alt={qTrack.title}
                                size={48}
                                showLoading={true}
                            />

                            <button
                                type="button"
                                onClick={() => onQueueTrackSelect?.(qTrack.id)}
                                className="flex-1 min-w-0 text-left"
                            >
                                <p className="truncate text-sm font-heading font-semibold text-heading-solid opacity-90 group-hover:opacity-100 transition-opacity">{qTrack.title}</p>
                                <p className="truncate text-xs text-white/60">{qTrack.artist} · {qTrack.collection}</p>
                            </button>

                            {onQueueRemove && (
                                <button
                                    type="button"
                                    onClick={() => onQueueRemove(qTrack.id)}
                                    className="shrink-0 inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:text-white focus-ring-glow touch-manipulation"
                                    aria-label={`Remove ${qTrack.title} from queue`}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
