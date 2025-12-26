"use client"

import Image from "next/image"
import { Play } from "lucide-react"
import { DEFAULT_ARTWORK_SRC } from "@/lib/app.constants"
import { cn } from "@/lib/utils"
import { PlayingIndicator } from "./PlayingIndicator"

export interface TrackArtworkProps {
  artworkUrl?: string | null
  title: string
  className?: string
  imageClassName?: string
  sizes?: string
  priority?: boolean
  hoverScale?: boolean
  showPlayOverlay?: boolean
  playOverlayVisible?: boolean
  playButtonClassName?: string
  playIconClassName?: string
  overlayClassName?: string
  isPlaying?: boolean
  showPlayingIndicator?: boolean
  playingIndicatorSize?: "sm" | "md" | "lg"
  playingIndicatorColor?: "white" | "purple" | "cyan"
  playingOverlayClassName?: string
}

export function TrackArtwork({
  artworkUrl,
  title,
  className,
  imageClassName,
  sizes = "40px",
  priority = false,
  hoverScale = true,
  showPlayOverlay = true,
  playOverlayVisible = false,
  playButtonClassName,
  playIconClassName,
  overlayClassName,
  isPlaying = false,
  showPlayingIndicator = false,
  playingIndicatorSize = "md",
  playingIndicatorColor = "white",
  playingOverlayClassName,
}: TrackArtworkProps) {
  const resolvedArtwork = artworkUrl || DEFAULT_ARTWORK_SRC
  const shouldShowPlayingOverlay = showPlayingIndicator && isPlaying
  const shouldShowPlayOverlay = showPlayOverlay && !shouldShowPlayingOverlay

  return (
    <div
      className={cn(
        "relative overflow-hidden shrink-0",
        hoverScale && "transition-transform duration-300 group-hover:scale-105",
        className
      )}
    >
      <Image
        src={resolvedArtwork}
        alt={title}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", imageClassName)}
      />

      <div
        className={cn(
          "absolute inset-0 transition duration-300",
          playOverlayVisible ? "bg-black/55" : "bg-black/0 group-hover:bg-black/30",
          overlayClassName
        )}
      />

      {shouldShowPlayingOverlay ? (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/60",
            playingOverlayClassName
          )}
        >
          <PlayingIndicator
            isPlaying={isPlaying}
            size={playingIndicatorSize}
            color={playingIndicatorColor}
          />
        </div>
      ) : null}

      {shouldShowPlayOverlay ? (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-200",
            playOverlayVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-full bg-white/90 shadow-lg shadow-purple-500/30",
              playOverlayVisible
                ? "scale-100"
                : "scale-90 group-hover:scale-100 transition-transform duration-200",
              playButtonClassName
            )}
          >
            <Play className={cn("text-black fill-current", playIconClassName)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
