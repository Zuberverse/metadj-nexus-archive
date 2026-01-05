/**
 * Skeleton Loading Components
 *
 * Provides shimmer-effect placeholder components for loading states.
 * Use these instead of spinners for a more polished perceived performance.
 *
 * @module components/ui/Skeleton
 */

import { clsx } from "clsx"

interface SkeletonProps {
  /** Additional CSS classes */
  className?: string
  /** Whether to animate the shimmer effect (default: true) */
  animate?: boolean
}

/**
 * Base Skeleton component
 *
 * Renders a shimmer-effect placeholder. Use className to control size and shape.
 *
 * @example Basic rectangle
 * <Skeleton className="h-4 w-32" />
 *
 * @example Circle (for avatars)
 * <Skeleton className="h-10 w-10 rounded-full" />
 *
 * @example Card placeholder
 * <Skeleton className="h-48 w-full rounded-2xl" />
 */
export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "bg-white/10 rounded",
        animate && "animate-pulse",
        className
      )}
      aria-hidden="true"
    />
  )
}

/**
 * Text line skeleton
 *
 * For placeholder text lines. Defaults to single line width.
 */
export function SkeletonText({
  lines = 1,
  className,
  animate = true,
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={clsx("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-2/3" : "w-full"
          )}
          animate={animate}
        />
      ))}
    </div>
  )
}

/**
 * Track card skeleton
 *
 * Matches the layout of a track list item with artwork, title, and duration.
 */
export function SkeletonTrackCard({
  className,
  animate = true,
}: SkeletonProps) {
  return (
    <div className={clsx("flex items-center gap-3 p-3", className)}>
      {/* Artwork */}
      <Skeleton className="h-12 w-12 rounded-md shrink-0" animate={animate} />
      {/* Text content */}
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4" animate={animate} />
        <Skeleton className="h-3 w-1/2" animate={animate} />
      </div>
      {/* Duration */}
      <Skeleton className="h-4 w-10" animate={animate} />
    </div>
  )
}

/**
 * Collection card skeleton
 *
 * Matches the layout of a collection card with artwork and title.
 */
export function SkeletonCollectionCard({
  className,
  animate = true,
}: SkeletonProps) {
  return (
    <div className={clsx("space-y-3", className)}>
      {/* Artwork */}
      <Skeleton
        className="aspect-square w-full rounded-2xl"
        animate={animate}
      />
      {/* Title */}
      <Skeleton className="h-5 w-3/4" animate={animate} />
      {/* Subtitle */}
      <Skeleton className="h-4 w-1/2" animate={animate} />
    </div>
  )
}

/**
 * Message bubble skeleton
 *
 * For chat/AI message loading states.
 */
export function SkeletonMessage({
  className,
  animate = true,
  isUser = false,
}: SkeletonProps & { isUser?: boolean }) {
  return (
    <div
      className={clsx(
        "flex gap-3",
        isUser && "flex-row-reverse",
        className
      )}
    >
      {/* Avatar */}
      <Skeleton className="h-8 w-8 rounded-full shrink-0" animate={animate} />
      {/* Message bubble */}
      <div
        className={clsx(
          "space-y-2 p-4 rounded-2xl max-w-[80%]",
          isUser ? "bg-purple-900/30" : "bg-white/5"
        )}
      >
        <Skeleton className="h-4 w-48" animate={animate} />
        <Skeleton className="h-4 w-32" animate={animate} />
      </div>
    </div>
  )
}

/**
 * Wisdom card skeleton
 *
 * Matches the Hub page wisdom spotlight cards.
 */
export function SkeletonWisdomCard({
  className,
  animate = true,
}: SkeletonProps) {
  return (
    <div
      className={clsx(
        "p-6 rounded-3xl border border-white/5 bg-white/5 space-y-3",
        className
      )}
    >
      {/* Icon + badge */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" animate={animate} />
        <Skeleton className="h-4 w-16 rounded-full" animate={animate} />
      </div>
      {/* Title */}
      <Skeleton className="h-5 w-3/4" animate={animate} />
      {/* Excerpt */}
      <SkeletonText lines={2} animate={animate} />
      {/* Meta */}
      <Skeleton className="h-3 w-24" animate={animate} />
    </div>
  )
}

/**
 * Player bar skeleton
 *
 * For the audio player loading state.
 */
export function SkeletonPlayerBar({
  className,
  animate = true,
}: SkeletonProps) {
  return (
    <div className={clsx("flex items-center gap-4 p-4", className)}>
      {/* Artwork */}
      <Skeleton className="h-14 w-14 rounded-md shrink-0" animate={animate} />
      {/* Track info */}
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-1/3" animate={animate} />
        <Skeleton className="h-3 w-1/4" animate={animate} />
      </div>
      {/* Controls */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-full" animate={animate} />
        <Skeleton className="h-10 w-10 rounded-full" animate={animate} />
        <Skeleton className="h-10 w-10 rounded-full" animate={animate} />
      </div>
    </div>
  )
}
