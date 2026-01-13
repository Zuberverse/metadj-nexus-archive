"use client"

/**
 * PlaylistSelector Component
 *
 * Dropdown/popover for adding tracks to playlists.
 * Features:
 * - Shows all playlists (max 50)
 * - "Create New Playlist" option at top
 * - Track addition confirmation with toast
 * - Analytics: track_added_to_playlist
 * - WCAG: Keyboard navigation, ARIA combobox pattern
 */

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from "react"
import { Plus, Check, Music, ArrowLeft } from "lucide-react"
import { usePlaylist } from "@/contexts/PlaylistContext"
import { useClickAway, useEscapeKey } from "@/hooks"
import { logger } from "@/lib/logger"
import { PlaylistCreator } from "./PlaylistCreator"

interface PlaylistSelectorProps {
  trackId: string
  trackTitle: string
  source?: "track_card" | "collection_header" | "detail_view"
  onClose: () => void
  onBack?: () => void
  className?: string
}

export function PlaylistSelector({
  trackId,
  trackTitle,
  source = "track_card",
  onClose,
  onBack,
  className = "",
}: PlaylistSelectorProps) {
  const { playlists, addTrackToPlaylist } = usePlaylist()
  const [showCreator, setShowCreator] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Check if track is in playlist
  const isTrackInPlaylist = useCallback(
    (playlistId: string) => {
      const playlist = playlists.find((p) => p.id === playlistId)
      return playlist?.trackIds.includes(trackId) ?? false
    },
    [playlists, trackId]
  )

  // Handle adding track to playlist
  const handleAddToPlaylist = useCallback(
    async (playlistId: string) => {
      try {
        await addTrackToPlaylist(playlistId, trackId)

        // Close popover on success
        onClose()
      } catch (err) {
        // Toast will be shown by context
        logger.error("Failed to add track to playlist", { error: String(err) })
      }
    },
    [addTrackToPlaylist, trackId, onClose]
  )

  const handleAddToNewPlaylist = useCallback(
    async (playlistId: string) => {
      try {
        await addTrackToPlaylist(playlistId, trackId)
      } catch (err) {
        logger.error("Failed to add track to new playlist", { error: String(err) })
      }
    },
    [addTrackToPlaylist, trackId]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const totalItems = playlists.length + 1 // +1 for "Create New" option

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % totalItems)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems)
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        if (selectedIndex === 0) {
          // Create new playlist
          setShowCreator(true)
        } else if (selectedIndex > 0) {
          // Add to existing playlist
          const playlistIndex = selectedIndex - 1
          if (playlistIndex < playlists.length) {
            const playlist = playlists[playlistIndex]
            if (!isTrackInPlaylist(playlist.id)) {
              handleAddToPlaylist(playlist.id)
            }
          }
        }
      }
    },
    [playlists, selectedIndex, isTrackInPlaylist, handleAddToPlaylist]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const items = listRef.current.children
      const selectedItem = items[selectedIndex] as HTMLElement | undefined
      selectedItem?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [selectedIndex])

  useClickAway(containerRef, onClose)
  useEscapeKey(onClose)

  // Show creator if requested
  if (showCreator) {
    return (
      <div
        ref={containerRef}
        className={`w-80 ${className}`}
        onKeyDown={handleKeyDown}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        role="dialog"
        aria-label="Create new playlist"
      >
        <PlaylistCreator
          onClose={() => {
            setShowCreator(false)
            onClose()
          }}
          source={source === "detail_view" ? "navigation" : source}
          onCreated={(playlist) => handleAddToNewPlaylist(playlist.id)}
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`w-80 max-h-96 overflow-hidden rounded-xl border border-white/20 bg-(--bg-surface-elevated) shadow-2xl ${className}`}
      onKeyDown={handleKeyDown}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      role="listbox"
      aria-label="Add to playlist"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onBack()
            }}
            className="-ml-2 flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white touch-manipulation"
            aria-label="Back to options"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-sm font-semibold text-heading-solid">
            Add to Playlist
          </h3>
          <p className="mt-0.5 text-xs text-white/60 line-clamp-1">
            {trackTitle}
          </p>
        </div>
      </div>

      {/* Playlist list */}
      <ul
        ref={listRef}
        className="max-h-64 overflow-y-auto py-2"
        role="presentation"
      >
        {/* Create New option */}
        <li>
          <button
            type="button"
            onClick={() => setShowCreator(true)}
            onMouseEnter={() => setSelectedIndex(0)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-ring ${selectedIndex === 0
              ? "bg-white/10"
              : "hover:bg-white/5"
              }`}
            role="option"
            aria-selected={selectedIndex === 0}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 gradient-2-soft">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm font-semibold text-heading-solid">
                Create New Playlist
              </p>
            </div>
          </button>
        </li>

        {/* Existing playlists */}
        {playlists.length === 0 ? (
          <li className="px-4 py-8 text-center">
            <p className="text-sm text-white/60">No playlists yet</p>
          </li>
        ) : (
          playlists.map((playlist, index) => {
            const inPlaylist = isTrackInPlaylist(playlist.id)
            const itemIndex = index + 1

            return (
              <li key={playlist.id}>
                <button
                  type="button"
                  onClick={() => !inPlaylist && handleAddToPlaylist(playlist.id)}
                  onMouseEnter={() => setSelectedIndex(itemIndex)}
                  disabled={inPlaylist}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-ring disabled:cursor-not-allowed ${selectedIndex === itemIndex && !inPlaylist
                    ? "bg-white/10"
                    : inPlaylist
                      ? "opacity-60"
                      : "hover:bg-white/5"
                    }`}
                  role="option"
                  aria-selected={selectedIndex === itemIndex}
                  aria-disabled={inPlaylist}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-black/30">
                    {inPlaylist ? (
                      <Check className="h-5 w-5 text-green-400" />
                    ) : (
                      <Music className="h-5 w-5 text-white/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-semibold text-heading-solid truncate">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-white/60">
                      {playlist.trackIds.length} track{playlist.trackIds.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              </li>
            )
          })
        )}
      </ul>

      {/* Keyboard hint */}
      <div className="border-t border-white/10 px-4 py-2">
        <p className="text-xs text-white/60">
          Use arrow keys to navigate, Enter to select
        </p>
      </div>
    </div>
  )
}
