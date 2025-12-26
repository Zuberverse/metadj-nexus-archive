"use client"

/**
 * AddToPlaylistButton Component
 *
 * Small button for track cards that opens PlaylistSelector.
 * Features:
 * - 44px minimum touch target
 * - Visual feedback on hover/active
 * - Opens PlaylistSelector popover
 * - WCAG compliant with clear label
 */

import { useState, useRef } from "react"
import { ListPlus } from "lucide-react"
import { useClickAway, useEscapeKey } from "@/hooks"
import { PlaylistSelector } from "./PlaylistSelector"

interface AddToPlaylistButtonProps {
  trackId: string
  trackTitle: string
  source?: "track_card" | "collection_header" | "detail_view"
  className?: string
}

export function AddToPlaylistButton({
  trackId,
  trackTitle,
  source = "track_card",
  className = "",
}: AddToPlaylistButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useClickAway([buttonRef, popoverRef], () => setIsOpen(false), { enabled: isOpen })
  useEscapeKey(
    () => {
      setIsOpen(false)
      buttonRef.current?.focus()
    },
    { enabled: isOpen }
  )

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen((prev) => !prev)
  }

  const handleClose = () => {
    setIsOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-(--border-standard) bg-white/5 transition-all hover:border-(--border-elevated) hover:bg-white/10 hover:scale-110 focus-ring-glow"
        aria-label={`Add ${trackTitle} to playlist`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <ListPlus className="h-5 w-5 text-white" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 z-50 mt-2"
        >
          <PlaylistSelector
            trackId={trackId}
            trackTitle={trackTitle}
            source={source}
            onClose={handleClose}
          />
        </div>
      )}
    </div>
  )
}
