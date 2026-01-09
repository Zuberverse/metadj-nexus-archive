/**
 * Cinema Video Utilities
 *
 * Utilities for building video source lists and determining content types.
 *
 * @module lib/cinema/video-utils
 */

import type { Scene } from "@/data/scenes"

/**
 * Video source configuration for HTML5 video element
 */
export type VideoSource = {
  src: string
  type?: string
  media?: string
}

/**
 * Get MIME type for a video path based on file extension
 */
export function getVideoContentType(path?: string): string | undefined {
  if (!path) return undefined
  if (path.endsWith(".webm")) return "video/webm"
  if (path.endsWith(".mp4")) return "video/mp4"
  if (path.endsWith(".mov")) return "video/quicktime"
  return undefined
}

/**
 * Build video source list for a scene
 *
 * Returns sources in priority order:
 * 1. Mobile-specific (with media query)
 * 2. WebM (best compression)
 * 3. Primary MP4
 * 4. Fallback MP4
 */
export function buildVideoSources(scene: Scene): VideoSource[] {
  const sources: VideoSource[] = []
  const seen = new Set<string>()

  const addSource = (src?: string, options?: Omit<VideoSource, "src">) => {
    if (!src || seen.has(src)) return
    sources.push({ src, type: getVideoContentType(src), ...options })
    seen.add(src)
  }

  addSource(scene.videoMobilePath, { media: "(max-width: 767px)" })
  addSource(scene.videoWebmPath)
  addSource(scene.videoPath)
  addSource(scene.videoFallbackPath)

  return sources
}

/**
 * Check if a scene has any video sources
 */
export function hasVideoSource(scene: Scene): boolean {
  return Boolean(
    scene.videoPath ||
    scene.videoWebmPath ||
    scene.videoMobilePath ||
    scene.videoFallbackPath
  )
}
