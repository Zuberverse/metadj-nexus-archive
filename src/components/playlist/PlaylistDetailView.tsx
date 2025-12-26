"use client"

/**
 * PlaylistDetailView Component
 *
 * Full playlist detail view (replaces collection view when viewing a playlist).
 * Features:
 * - Track list with remove buttons
 * - Play all button
 * - Delete playlist with confirmation
 * - WCAG: Keyboard alternatives for all actions
 * - Note: Drag-and-drop reordering deferred to Phase 2
 */

import { useState, useCallback, useMemo } from "react"
import { Play, MoreVertical, ArrowLeft, Trash2, Music, X } from "lucide-react"
import { ShareButton } from "@/components/ui/ShareButton"
import { TrackListItem } from "@/components/ui/TrackListItem"
import { usePlayer } from "@/contexts/PlayerContext"
import { usePlaylist } from "@/contexts/PlaylistContext"
import { logger } from "@/lib/logger"
import { tracks as allTracks } from "@/lib/music"
import { formatDuration } from "@/lib/utils"
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
  const { playlists, removeTrackFromPlaylist, deletePlaylist, playPlaylist } = usePlaylist()
  const { currentTrack, shouldPlay } = usePlayer()
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Find playlist
  const playlist = useMemo(
    () => playlists.find((p) => p.id === playlistId),
    [playlists, playlistId]
  )

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
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-gradient-hero leading-tight text-pop">
              {playlist.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span>{playlist.trackIds.length} track{playlist.trackIds.length !== 1 ? "s" : ""}</span>
              {totalDuration > 0 && (
                <>
                  <span>•</span>
                  <span>{formatDuration(totalDuration)}</span>
                </>
              )}
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
              <div className="absolute top-full right-0 z-50 mt-2 min-w-[200px] rounded-lg border border-(--border-standard) bg-black/90 backdrop-blur-xl shadow-xl">
                <div className="py-1">
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
              className="flex h-11 items-center gap-2 rounded-lg bg-linear-to-r from-purple-500 via-blue-500 to-cyan-400 px-6 font-heading text-sm font-semibold text-white shadow-[0_0_20px_rgba(95,108,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(95,108,255,0.5)] focus-ring-glow"
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
          <p className="font-heading text-sm font-semibold text-white/60 mb-1">
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

            return (
              <TrackListItem
                key={track.id}
                track={track}
                trackNumber={index + 1}
                isCurrent={isCurrent}
                isPlaying={isPlaying}
                onPlay={() => onPlayTrack(track, playlistTracks)}
                showDuration
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
            )
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs">
          <div className="mx-4 max-w-md rounded-xl border border-(--border-standard) bg-black/90 p-6">
            <h3 className="font-heading text-lg font-semibold text-gradient-hero mb-2">
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
