"use client"

/**
 * PlaylistDetailView Component
 *
 * Full playlist detail view (replaces collection view when viewing a playlist).
 * Features:
 * - Track list with remove buttons and drag reordering
 * - Play all button
 * - Rename, duplicate, and artwork selection
 * - Delete playlist with confirmation
 * - WCAG: Keyboard alternatives for all actions
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { Play, MoreVertical, ArrowLeft, Trash2, Music, X, GripVertical, Copy, PencilLine, Image as ImageIcon } from "lucide-react"
import { ShareButton } from "@/components/ui/ShareButton"
import { TrackArtwork } from "@/components/ui/TrackArtwork"
import { TrackListItem } from "@/components/ui/TrackListItem"
import { usePlayer } from "@/contexts/PlayerContext"
import { usePlaylist } from "@/contexts/PlaylistContext"
import { logger } from "@/lib/logger"
import { tracks as allTracks } from "@/lib/music"
import { resolvePlaylistArtwork } from "@/lib/playlists"
import { cn, formatDuration } from "@/lib/utils"
import type { Track } from "@/types"

interface PlaylistDetailViewProps {
  playlistId: string
  onBack: () => void
  onPlayTrack: (track: Track, tracks?: Track[]) => void
  onPlayAll?: (playlistId: string) => void
  className?: string
}

export function PlaylistDetailView({
  playlistId,
  onBack,
  onPlayTrack,
  onPlayAll,
  className = "",
}: PlaylistDetailViewProps) {
  const {
    playlists,
    removeTrackFromPlaylist,
    deletePlaylist,
    playPlaylist,
    updatePlaylist,
    duplicatePlaylist,
    reorderTracks,
  } = usePlaylist()
  const { currentTrack, shouldPlay } = usePlayer()
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [renameError, setRenameError] = useState<string | null>(null)
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const [showArtworkPicker, setShowArtworkPicker] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Find playlist
  const playlist = useMemo(
    () => playlists.find((p) => p.id === playlistId),
    [playlists, playlistId]
  )

  useEffect(() => {
    if (!playlist || !isRenaming) return
    setRenameValue(playlist.name)
    setRenameError(null)
    requestAnimationFrame(() => renameInputRef.current?.focus())
  }, [playlist, isRenaming])

  const playlistArtwork = useMemo(() => {
    if (!playlist) return null
    return resolvePlaylistArtwork(playlist)
  }, [playlist])

  const hasCustomArtwork = Boolean(playlist?.artworkUrl)

  // Get playlist tracks
  const playlistTracks = useMemo(() => {
    if (!playlist) return []
    return playlist.trackIds
      .map((id) => allTracks.find((t) => t.id === id))
      .filter((t): t is Track => Boolean(t))
  }, [playlist])

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return playlistTracks.reduce((sum, track) => sum + track.duration, 0)
  }, [playlistTracks])

  const handleRemoveTrack = useCallback(
    async (trackId: string) => {
      if (!playlist) return
      try {
        await removeTrackFromPlaylist(playlist.id, trackId)
      } catch (err) {
        logger.error("Failed to remove track from playlist", { error: String(err) })
      }
    },
    [playlist, removeTrackFromPlaylist]
  )

  const handleDelete = useCallback(async () => {
    if (!playlist) return
    try {
      await deletePlaylist(playlist.id)
      onBack() // Navigate back after deletion
    } catch (err) {
      logger.error("Failed to delete playlist", { error: String(err) })
    }
  }, [playlist, deletePlaylist, onBack])

  const handlePlayAll = useCallback(() => {
    if (!playlist) return
    if (onPlayAll) {
      onPlayAll(playlist.id)
    } else {
      playPlaylist(playlist.id)
    }
  }, [playlist, onPlayAll, playPlaylist])

  const handleRenameSave = useCallback(async () => {
    if (!playlist) return
    const trimmed = renameValue.trim()
    if (!trimmed) {
      setRenameError("Playlist name cannot be empty")
      return
    }

    try {
      await updatePlaylist(playlist.id, { name: trimmed })
      setIsRenaming(false)
      setRenameError(null)
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Failed to rename playlist")
      logger.error("Failed to rename playlist", { error: String(err) })
    }
  }, [playlist, renameValue, updatePlaylist])

  const handleRenameCancel = useCallback(() => {
    setIsRenaming(false)
    setRenameError(null)
  }, [])

  const handleDuplicate = useCallback(async () => {
    if (!playlist) return
    try {
      await duplicatePlaylist(playlist.id, "detail_view")
    } catch (err) {
      logger.error("Failed to duplicate playlist", { error: String(err) })
    }
  }, [playlist, duplicatePlaylist])

  const handleSetArtwork = useCallback(
    async (artworkUrl: string | null) => {
      if (!playlist) return
      try {
        await updatePlaylist(playlist.id, { artworkUrl })
        setShowArtworkPicker(false)
      } catch (err) {
        logger.error("Failed to update playlist artwork", { error: String(err) })
      }
    },
    [playlist, updatePlaylist]
  )

  const handleReorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!playlist) return
      try {
        await reorderTracks(playlist.id, fromIndex, toIndex)
      } catch (err) {
        logger.error("Failed to reorder playlist tracks", { error: String(err) })
      }
    },
    [playlist, reorderTracks]
  )

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (draggedIndex === null) return
      if (draggedIndex !== targetIndex) {
        handleReorder(draggedIndex, targetIndex)
      }
      setDraggedIndex(null)
      setDragOverIndex(null)
    },
    [draggedIndex, handleReorder]
  )

  if (!playlist) {
    return (
      <div className={`flex flex-col items-center justify-center px-4 py-16 ${className}`}>
        <p className="text-white/60">Playlist not found</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 text-sm text-purple-neon hover:underline"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-white/80 transition-colors hover:text-white focus-ring rounded-lg px-2 py-1 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Playlists
        </button>

        {/* Playlist info */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <TrackArtwork
                artworkUrl={playlistArtwork}
                title={playlist.name}
                sizes="80px"
                className="h-20 w-20 rounded-2xl border border-(--border-standard) bg-black/40"
                imageClassName="rounded-2xl"
                hoverScale={false}
                showPlayOverlay={false}
              />
              <button
                type="button"
                onClick={() => setShowArtworkPicker(true)}
                className="text-[11px] uppercase tracking-[0.2em] text-white/60 hover:text-white focus-ring rounded-full px-2 py-1"
              >
                Edit Artwork
              </button>
            </div>

            <div className="flex-1 min-w-0">
              {isRenaming ? (
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(event) => {
                        setRenameValue(event.target.value)
                        if (renameError) setRenameError(null)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          handleRenameSave()
                        } else if (event.key === "Escape") {
                          event.preventDefault()
                          handleRenameCancel()
                        }
                      }}
                      maxLength={100}
                      className={`w-full rounded-lg border bg-black/30 px-4 py-3 font-heading text-lg text-white placeholder-white/40 transition-colors focus-ring-light ${
                        renameError ? "border-red-500" : "border-(--border-standard)"
                      }`}
                      placeholder="Playlist name"
                      aria-invalid={!!renameError}
                    />
                    <div className="absolute right-3 top-3 text-xs text-white/60">
                      {renameValue.length}/100
                    </div>
                  </div>
                  {renameError && (
                    <p className="text-xs text-red-400" role="alert">
                      {renameError}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRenameCancel}
                      className="flex-1 rounded-lg border border-(--border-standard) bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 focus-ring"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRenameSave}
                      className="flex-1 rounded-lg gradient-4 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(95,108,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(95,108,255,0.5)] focus-ring-glow"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-heading-solid leading-tight">
                  {playlist.name}
                </h1>
              )}

              <div className="flex items-center gap-2 text-sm text-white/60 mt-2">
                <span>{playlist.trackIds.length} track{playlist.trackIds.length !== 1 ? "s" : ""}</span>
                {totalDuration > 0 && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(totalDuration)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Menu button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-(--border-standard) bg-white/5 transition-all hover:border-(--border-elevated) hover:bg-white/10 focus-ring"
              aria-label="Playlist options"
              aria-haspopup="menu"
              aria-expanded={showMenu}
            >
              <MoreVertical className="h-5 w-5 text-white/80" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute top-full right-0 z-50 mt-2 min-w-[220px] rounded-lg border border-(--border-standard) bg-black/90 backdrop-blur-xl shadow-xl">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      setIsRenaming(true)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/5"
                  >
                    <PencilLine className="h-4 w-4" />
                    Rename Playlist
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      handleDuplicate()
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/5"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate Playlist
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      setShowArtworkPicker(true)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/5"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Edit Artwork
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      setConfirmDelete(true)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-400 transition-colors hover:bg-white/5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Playlist
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {playlistTracks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePlayAll}
              className="flex h-11 items-center gap-2 rounded-lg gradient-4 px-6 font-heading text-sm font-semibold text-white shadow-[0_0_20px_rgba(95,108,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(95,108,255,0.5)] focus-ring-glow"
            >
              <Play className="h-4 w-4" />
              Start
            </button>
            <ShareButton
              playlist={playlist}
              variant="button"
              size="sm"
              className="h-11 px-5 text-sm"
            />
          </div>
        )}
      </div>

      {/* Track list */}
      {playlistTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 rounded-xl border border-(--border-subtle) bg-black/20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-(--border-standard) bg-white/5 mb-4">
            <Music className="h-8 w-8 text-white/60" />
          </div>
          <p className="font-heading text-sm font-semibold text-heading-solid mb-1">
            This playlist is empty
          </p>
          <p className="text-xs text-white/60 text-center max-w-xs">
            Browse collections and click &quot;Add to Playlist&quot; to start building your mix
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {playlistTracks.map((track, index) => {
            const isPlaying = currentTrack?.id === track.id && shouldPlay
            const isCurrent = currentTrack?.id === track.id
            const isDragging = draggedIndex === index
            const isDragOver = dragOverIndex === index && draggedIndex !== index

            return (
              <div
                key={track.id}
                className="relative"
                draggable={playlistTracks.length > 1}
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOverIndex(index)
                }}
                onDragEnd={() => {
                  setDraggedIndex(null)
                  setDragOverIndex(null)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  handleDrop(index)
                }}
              >
                <TrackListItem
                  track={track}
                  trackNumber={index + 1}
                  isCurrent={isCurrent}
                  isPlaying={isPlaying}
                  onPlay={() => onPlayTrack(track, playlistTracks)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp" && index > 0) {
                      event.preventDefault()
                      handleReorder(index, index - 1)
                    } else if (event.key === "ArrowDown" && index < playlistTracks.length - 1) {
                      event.preventDefault()
                      handleReorder(index, index + 1)
                    } else if ((event.key === "Delete" || event.key === "Backspace")) {
                      event.preventDefault()
                      handleRemoveTrack(track.id)
                    }
                  }}
                  showDuration
                  leadingElement={
                    <GripVertical
                      className="h-3.5 w-3.5 text-muted-accessible group-hover:text-white/80 transition-colors"
                      aria-hidden
                    />
                  }
                  className={cn(
                    isDragOver ? "border-white/30 bg-white/10" : "",
                    isDragging ? "opacity-60" : ""
                  )}
                  actions={
                    <button
                      type="button"
                      onClick={() => handleRemoveTrack(track.id)}
                      className="flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/40 opacity-0 transition-opacity hover:text-red-400 hover:bg-white/10 group-hover:opacity-100 focus-visible:opacity-100 focus-ring touch-manipulation"
                      aria-label={`Remove ${track.title} from playlist`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  }
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Artwork picker modal */}
      {showArtworkPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs">
          <div className="mx-4 w-full max-w-2xl rounded-2xl border border-(--border-standard) bg-black/90 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading text-lg font-semibold text-heading-solid">
                  Playlist Artwork
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  Choose a cover from your playlist or reset to auto (first track).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowArtworkPicker(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-(--border-standard) bg-white/5 text-white/70 transition-colors hover:bg-white/10 focus-ring"
                aria-label="Close artwork picker"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetArtwork(null)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors focus-ring ${
                  !hasCustomArtwork
                    ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-200"
                    : "border-(--border-standard) bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                Use First Track
              </button>
              {hasCustomArtwork && (
                <span className="text-xs text-white/50">
                  Custom artwork active
                </span>
              )}
            </div>

            {playlistTracks.length === 0 ? (
              <div className="mt-6 rounded-xl border border-(--border-subtle) bg-black/30 px-4 py-6 text-sm text-white/60">
                Add tracks to your playlist to choose a cover.
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {playlistTracks.map((track) => {
                  const artworkUrl = track.artworkUrl ?? null
                  const isSelected = playlist?.artworkUrl === artworkUrl && Boolean(artworkUrl)

                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => artworkUrl && handleSetArtwork(artworkUrl)}
                      disabled={!artworkUrl}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-ring ${
                        isSelected
                          ? "border-cyan-400/60 bg-cyan-500/15"
                          : "border-(--border-standard) bg-white/5 hover:bg-white/10"
                      } ${!artworkUrl ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <TrackArtwork
                        artworkUrl={artworkUrl}
                        title={track.title}
                        sizes="48px"
                        className="h-12 w-12 rounded-lg"
                        imageClassName="rounded-lg"
                        hoverScale={false}
                        showPlayOverlay={false}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-heading-solid truncate">
                          {track.title}
                        </p>
                        <p className="text-xs text-white/60 truncate">
                          {track.collection}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs">
          <div className="mx-4 max-w-md rounded-xl border border-(--border-standard) bg-black/90 p-6">
            <h3 className="font-heading text-lg font-semibold text-heading-solid mb-2">
              Delete Playlist?
            </h3>
            <p className="text-sm text-white/80 mb-1">
              &quot;{playlist.name}&quot; will be permanently deleted. This cannot be undone.
            </p>
            <p className="text-sm text-white/60 mb-6">
              {playlist.trackIds.length} track{playlist.trackIds.length !== 1 ? "s" : ""} will be removed from this playlist (tracks remain in your collection).
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg border border-(--border-standard) bg-white/5 px-4 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-red-500 px-4 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-red-600 focus-ring"
              >
                Delete Playlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
