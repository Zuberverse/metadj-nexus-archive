"use client"

import { useMemo } from "react"
import clsx from "clsx"
import { useUI } from "@/contexts/UIContext"
import { useCspStyle } from "@/hooks/use-csp-style"
import { useReadingProgress } from "@/hooks/wisdom/use-reading-progress"
import type { RefObject } from "react"

interface ReadingProgressBarProps {
  targetRef: RefObject<HTMLElement | null>
  label?: string
  className?: string
}

export function ReadingProgressBar({
  targetRef,
  label = "Reading progress",
  className = "",
}: ReadingProgressBarProps) {
  const progress = useReadingProgress(targetRef)
  const { headerHeight } = useUI()

  const progressPercent = useMemo(
    () => Math.max(0, Math.min(100, Math.round(progress * 100))),
    [progress],
  )

  const fillStyleId = useCspStyle({ width: `${progressPercent}%` })
  const containerStyleId = useCspStyle({ top: `${Math.max(headerHeight, 64)}px` })

  return (
    <div
      className={clsx("sticky z-40", className)}
      data-csp-style={containerStyleId}
    >
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        className="relative h-1.5 w-full overflow-hidden border-y border-white/10 bg-white/5 backdrop-blur-xl"
      >
        <span className="sr-only">{`${label}: ${progressPercent}%`}</span>
        <div
          className="absolute inset-y-0 left-0 gradient-4"
          data-csp-style={fillStyleId}
        />
      </div>
    </div>
  )
}
