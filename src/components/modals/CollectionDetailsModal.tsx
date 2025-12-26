"use client"

import Image from "next/image"
import { X, Music2 } from "lucide-react"
import { Modal, ShareButton } from "@/components/ui"
import { DEFAULT_ARTWORK_SRC, FEATURED_TRACK_IDS } from "@/lib/app.constants"
import { formatDuration } from "@/lib/utils"
import type { Collection, Track } from "@/types"

interface CollectionDetailsModalProps {
  collection: Collection
  tracks: Track[]
  onClose: () => void
}

export function CollectionDetailsModal({ collection, tracks, onClose }: CollectionDetailsModalProps) {
  const collectionTracks =
    collection.id === "featured"
      ? FEATURED_TRACK_IDS.map((id) => tracks.find((t) => t.id === id)).filter((t): t is Track => Boolean(t))
      : tracks.filter((track) => track.collection === collection.title)

  const heroTrack = collectionTracks[0]

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      showCloseButton={false}
      overlayClassName="bg-(--bg-overlay)/90 backdrop-blur-2xl"
      className="border border-(--border-elevated) bg-(--bg-modal) shadow-[0_28px_70px_rgba(5,6,18,0.7)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_20%,rgba(88,101,242,0.25),transparent),radial-gradient(120%_120%_at_80%_10%,rgba(56,212,255,0.18),transparent)] opacity-70" />
      <div className="relative p-6 sm:p-8 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/15 bg-white/5">
                <Image
                  src={collection.artworkUrl ?? DEFAULT_ARTWORK_SRC}
                  alt={collection.title}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-gradient-hero leading-tight text-pop">
                  {collection.title}
                </h2>
                <p className="text-sm text-(--text-muted)">
                  {collection.trackCount ?? collectionTracks.length} tracks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton collection={collection} size="xxs" variant="icon" />
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:border-white/30 hover:text-white focus-ring"
                aria-label="Close collection details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {collection.description && (
            <p className="text-sm text-white/85 leading-relaxed">{collection.description}</p>
          )}

          {heroTrack && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10">
                <Image
                  src={heroTrack.artworkUrl || DEFAULT_ARTWORK_SRC}
                  alt={heroTrack.title}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-white font-heading text-base truncate">{heroTrack.title}</p>
                <p className="text-xs text-(--text-muted) truncate">{heroTrack.artist}</p>
              </div>
              <div className="ml-auto text-xs text-(--text-muted) uppercase tracking-[0.32em]">
                Spotlight
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {collectionTracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-3 py-2"
              >
                <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-white/10">
                  <Image
                    src={track.artworkUrl || DEFAULT_ARTWORK_SRC}
                    alt={track.title}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-heading truncate">{track.title}</p>
                  <p className="text-xs text-(--text-muted) truncate">{track.artist}</p>
                </div>
                {track.duration && (
                  <span className="text-xs text-(--text-muted) tabular-nums">
                    {formatDuration(track.duration)}
                  </span>
                )}
              </div>
            ))}
            {collectionTracks.length === 0 && (
              <div className="flex flex-col items-center gap-3 text-center py-10">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/15">
                  <Music2 className="h-5 w-5 text-white/40" aria-hidden="true" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-(--text-muted)">No Tracks Yet</p>
                  <p className="text-xs text-white/50">This collection is being curated</p>
                </div>
              </div>
            )}
          </div>
      </div>
    </Modal>
  )
}
