"use client"

import React from "react"
import { ChevronRight } from "lucide-react"
import { normalizeCollectionSlug } from "@/lib/music/utils"
import type { Track } from "@/types"

interface BreadcrumbProps {
  collection: string | null
  currentTrack: Track | null
  onNavigateHome: () => void
  onNavigateCollection: () => void
}

export function Breadcrumb({
  collection,
  currentTrack,
  onNavigateHome,
  onNavigateCollection,
}: BreadcrumbProps) {
  // Don't show breadcrumb if no collection selected
  if (!collection) return null

  // Determine collection display name
  const getCollectionName = (id: string): string => {
    const normalized = normalizeCollectionSlug(id)
    switch (normalized) {
      case "featured":
        return "Featured"
      case "majestic-ascent":
        return "Majestic Ascent"
      case "bridging-reality":
        return "Bridging Reality"
      case "transformer":
        return "Transformer"
      case "metaverse-revelation":
        return "Metaverse Revelation"
      default:
        return id
    }
  }

  const collectionName = getCollectionName(collection)

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className="mb-4 px-4 sm:px-6 xl:px-8"
    >
      <ol className="flex items-center gap-2 text-sm overflow-x-auto scrollbar-hide">
        {/* Home Link */}
        <li>
          <button
            onClick={onNavigateHome}
            className="text-white/70 hover:text-white transition-colors duration-150 focus-ring rounded-lg px-1"
            aria-label="Navigate to home"
          >
            Home
          </button>
        </li>

        {/* Separator */}
        <li aria-hidden="true">
          <ChevronRight className="h-4 w-4 text-white/40" />
        </li>

        {/* Collection Link */}
        <li>
          {currentTrack ? (
            <button
              onClick={onNavigateCollection}
              className="text-white/70 hover:text-white transition-colors duration-150 focus-ring rounded-lg px-1 truncate max-w-[200px]"
              aria-label={`Navigate to ${collectionName}`}
            >
              {collectionName}
            </button>
          ) : (
            <span className="text-gradient-primary font-medium truncate max-w-[200px] block">
              {collectionName}
            </span>
          )}
        </li>

        {/* Current Track (if playing) */}
        {currentTrack && (
          <>
            <li aria-hidden="true" className="hidden sm:block">
              <ChevronRight className="h-4 w-4 text-white/40" />
            </li>
            <li
              className="text-gradient-primary font-medium truncate max-w-[300px] hidden sm:block"
              aria-current="page"
            >
              {currentTrack.title}
            </li>
          </>
        )}

        {/* Mobile: Show only current item */}
        {currentTrack && (
          <li
            className="sm:hidden text-gradient-primary font-medium truncate flex-1"
            aria-current="page"
          >
            {currentTrack.title}
          </li>
        )}
      </ol>
    </nav>
  )
}
