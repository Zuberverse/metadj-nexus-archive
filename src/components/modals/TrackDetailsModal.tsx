"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { Modal, ShareButton } from "@/components/ui"
import { COLLECTION_NARRATIVES } from "@/data/collection-narratives"
import {
  trackTrackInfoOpened,
  trackTrackInfoClosed,
} from "@/lib/analytics"
import { DEFAULT_ARTWORK_SRC } from "@/lib/app.constants"
import { getCollectionGradient } from "@/lib/collection-theme"
import { normalizeCollectionSlug } from "@/lib/collection-utils"
import { logger } from "@/lib/logger"
import { formatDuration } from "@/lib/utils"
import type { Track } from "@/types"

interface TrackDetailsModalProps {
  track: Track
  onClose: () => void
  trigger?: 'artwork' | 'info_button' | 'keyboard'
  source?: 'featured' | 'collection' | 'search'
}

export function TrackDetailsModal({
  track,
  onClose,
  trigger = 'info_button',
  source = 'collection'
}: TrackDetailsModalProps) {
  const [openedAt] = useState(() => Date.now())

  // Track modal opened event on mount
  useEffect(() => {
    try {
      trackTrackInfoOpened({
        trackId: track.id,
        trackTitle: track.title,
        collection: track.collection,
        source,
        trigger,
      })
    } catch (error) {
      // Analytics failures should not affect user experience
    }
  }, [track.id, track.title, track.collection, source, trigger])

  // Track modal closed event on unmount
  useEffect(() => {
    return () => {
      try {
        const timeSpentMs = Date.now() - openedAt
        trackTrackInfoClosed({
          trackId: track.id,
          trackTitle: track.title,
          collection: track.collection,
          timeSpentMs,
        })
      } catch (error) {
        logger.warn('[Analytics] Failed to track modal closed', { error: String(error) })
      }
    }
  }, [track.id, track.title, track.collection, openedAt])

  const collectionGradient = getCollectionGradient(track.collection)
  const collectionSlug = normalizeCollectionSlug(track.collection)
  const collectionContext =
    COLLECTION_NARRATIVES[collectionSlug]?.paragraphs?.[0] ??
    "A MetaDJ original I crafted to amplify your experience through the fusion of technology and artistic expression."
  const sourceLabel =
    source === "featured"
      ? "Featured spotlight"
      : source === "search"
        ? "search results"
        : "collection browser"
  const triggerLabel =
    trigger === "artwork"
      ? "artwork tap"
      : trigger === "keyboard"
        ? "keyboard shortcut"
        : "info button"
  
  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      showCloseButton={false}
      overlayClassName="bg-(--bg-overlay)/60 backdrop-blur-xl"
      className="radiant-panel w-full border border-white/12 bg-(--bg-modal) shadow-[0_35px_80px_rgba(3,5,20,0.75)] rounded-[20px] sm:rounded-[24px] min-[1100px]:rounded-[28px] max-h-[calc(100vh-8rem)]"
      aria-labelledby="track-details-title"
    >
      {/* Top-right controls */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-4 z-20 flex items-center gap-2">
        <ShareButton
          track={track}
          variant="button"
          size="xxs"
        />
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:bg-white/10 hover:text-white focus-ring-glow"
          aria-label="Close track details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative z-10 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-5 max-h-[calc(100vh-12rem)]">
          {/* Header with thumbnail artwork */}
          <div className="flex items-start gap-3 pr-24 sm:pr-32">
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-md border border-white/20 bg-black/40 shadow-[0_12px_28px_rgba(6,4,24,0.55)]">
              <Image
                src={track.artworkUrl || DEFAULT_ARTWORK_SRC}
                alt={track.title}
                fill
                sizes="(max-width: 640px) 56px, 64px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 pointer-events-none bg-linear-to-tr from-black/20 via-transparent to-white/10 opacity-40" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.6rem] uppercase tracking-[0.45em] text-muted-accessible">
                Track insight
              </p>
              <h2
                id="track-details-title"
                className="text-xl sm:text-2xl font-heading font-semibold text-heading-solid truncate"
              >
                {track.title}
              </h2>
              <p className="text-sm sm:text-base text-white/70 truncate">{track.artist}</p>
            </div>
          </div>

          {/* Metadata and content */}
          <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full border border-white/20 ${collectionGradient} px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-[0_8px_24px_rgba(12,10,45,0.55)]`}
                >
                  {track.collection}
                </span>

                {track.genres?.slice(0, 2).map((genre) => (
                  <span
                    key={genre}
                    className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-white/80"
                  >
                    {genre}
                  </span>
                ))}

                {track.duration && (
                  <span className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                    Duration&nbsp;{formatDuration(track.duration)}
                  </span>
                )}
              </div>

              {/* Production Details Card */}
              {(track.bpm || track.key) && (
                <div className="rounded-3xl overflow-hidden border border-white/10 gradient-2-soft px-4 py-3">
                  <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-accessible mb-2">
                    Production details
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {track.bpm && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 border border-purple-400/30">
                          <span className="text-xs font-bold text-purple-300">♪</span>
                        </span>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-accessible">BPM</p>
                          <p className="text-sm font-semibold text-white">{track.bpm}</p>
                        </div>
                      </div>
                    )}
                    {track.key && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/30">
                          <span className="text-xs font-bold text-cyan-300">♯</span>
                        </span>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-accessible">Key</p>
                          <p className="text-sm font-semibold text-white">{track.key}</p>
                        </div>
                      </div>
                    )}
                    {track.releaseDate && (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/30">
                          <span className="text-xs font-bold text-amber-300">◉</span>
                        </span>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-accessible">Released</p>
                          <p className="text-sm font-semibold text-white">
                            {new Date(track.releaseDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 px-4 py-4 space-y-2">
                  <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-accessible">
                    About this track
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {track.description ?? "I’ll add full notes for this record soon—right now it’s here so you can feel it before the story is published."}
                  </p>
                </div>
                <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 px-4 py-4 space-y-2">
                  <p className="text-[0.6rem] uppercase tracking-[0.35em] text-muted-accessible">
                    Creator log
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {collectionContext}
                  </p>
                </div>
              </div>

            <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 px-4 py-3 space-y-2 text-sm text-white/80">
              <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/70">
                Session signal
              </p>
              <p>
                Surfaced from the {sourceLabel} via {triggerLabel}. Keep playback controls, queue, and MetaDJai open—this insight layer stays light so you can keep creating.
              </p>
            </div>
          </div>
      </div>
    </Modal>
  )
}
