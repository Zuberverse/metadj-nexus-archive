"use client"

/**
 * PlaylistCreator Component
 *
 * Inline playlist creation interface (no modal).
 * Features:
 * - Input field with 1-100 character validation
 * - Create button with gradient styling
 * - Toast notifications for success/error
 * - Analytics tracking: playlist_created with source
 * - WCAG: 44px touch targets, keyboard support, ARIA labels
 */

import { useState, useCallback, type KeyboardEvent } from "react"
import { Plus, X } from "lucide-react"
import { usePlaylist } from "@/contexts/PlaylistContext"
import type { Playlist } from "@/types"

interface PlaylistCreatorProps {
  onClose: () => void
  source?: "navigation" | "track_card" | "collection_header"
  onCreated?: (playlist: Playlist) => void | Promise<void>
  className?: string
}

export function PlaylistCreator({
  onClose,
  source = "navigation",
  onCreated,
  className = "",
}: PlaylistCreatorProps) {
  const { createPlaylist } = usePlaylist()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Validate name
  const validateName = useCallback((value: string): string | null => {
    const trimmed = value.trim()

    if (trimmed.length === 0) {
      return "Playlist name cannot be empty"
    }

    if (trimmed.length > 100) {
      return "Playlist name must be 100 characters or less"
    }

    return null
  }, [])

  // Handle name change
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setName(value)

      // Clear error when user starts typing
      if (error) {
        setError(null)
      }
    },
    [error]
  )

  // Handle create
  const handleCreate = useCallback(async () => {
    const trimmed = name.trim()
    const validationError = validateName(trimmed)

    if (validationError) {
      setError(validationError)
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const newPlaylist = await createPlaylist(trimmed, source)
      if (onCreated) {
        await onCreated(newPlaylist)
      }

      // Close on success
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create playlist")
    } finally {
      setIsCreating(false)
    }
  }, [name, validateName, createPlaylist, source, onCreated, onClose])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleCreate()
      } else if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    },
    [handleCreate, onClose]
  )

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-(--border-subtle) bg-(--bg-surface-elevated) p-4 ${className}`}
      role="form"
      aria-label="Create new playlist"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold text-heading-solid">
          Create Playlist
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-ring"
          aria-label="Close playlist creator"
        >
          <X className="h-5 w-5 text-white/80" />
        </button>
      </div>

      {/* Input field */}
      <div className="flex flex-col gap-2">
        <label htmlFor="playlist-name" className="sr-only">
          Playlist name
        </label>
        <div className="relative">
          <input
            id="playlist-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter playlist name"
            maxLength={100}
            autoFocus
            disabled={isCreating}
            className={`w-full rounded-lg border bg-black/30 px-4 py-3 font-sans text-sm text-white placeholder-white/40 transition-colors focus-ring-light disabled:cursor-not-allowed disabled:opacity-50 ${
              error ? "border-red-500" : "border-(--border-standard)"
            }`}
            aria-invalid={!!error}
            aria-describedby={error ? "name-error" : "name-hint"}
          />
          {/* Character count */}
          <div className="absolute right-3 top-3 text-xs text-white/60">
            {name.length}/100
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p id="name-error" className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}

        {/* Hint */}
        {!error && (
          <p id="name-hint" className="text-xs text-white/60">
            Press Enter to create, Escape to cancel
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isCreating}
          className="flex h-11 flex-1 items-center justify-center rounded-lg border border-(--border-standard) bg-white/5 px-4 font-sans text-sm font-semibold text-white/80 transition-all hover:border-(--border-elevated) hover:bg-white/10 focus-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || name.trim().length === 0}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-linear-to-r from-purple-500 via-blue-500 to-cyan-400 px-4 font-heading text-sm font-semibold text-white shadow-[0_0_20px_rgba(95,108,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(95,108,255,0.5)] focus-ring-glow disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {isCreating ? "Creating..." : "Create Playlist"}
        </button>
      </div>
    </div>
  )
}
