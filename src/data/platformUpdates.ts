/**
 * Platform Updates
 *
 * Lightweight, human-curated pulse of what's new in MetaDJ Nexus.
 * This is intentionally small and easy to maintain for solo-founder cadence.
 */

export interface PlatformUpdate {
  id: string
  title: string
  date: string
  summary: string
  type?: "added" | "improved" | "fixed" | "note"
}

export const PLATFORM_UPDATES: PlatformUpdate[] = [
  {
    id: "preview-music-cinema",
    title: "Music + Cinema",
    date: "2026-01-15",
    summary: "Stream original collections with immersive 3D and 2D visualizers synced to the music.",
    type: "added",
  },
  {
    id: "preview-metadjai",
    title: "MetaDJai companion",
    date: "2026-01-15",
    summary: "Your AI creative guide—get recommendations, explore the platform, and discover new flows.",
    type: "added",
  },
]
