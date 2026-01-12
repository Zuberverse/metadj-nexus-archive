/**
 * Mood Channels
 *
 * Curated listening experiences based on mood/activity states.
 * Each channel represents a sonic journey designed for a specific context.
 *
 * Brand Color Guidelines (Canonical MetaDJ Visual System):
 * - Foundation tier: `--metadj-purple` / `--metadj-indigo`
 * - Amplification tier: `--metadj-cyan` / `--metadj-blue`
 * - Synthesis accents: `--metadj-magenta`
 * - Growth/positive accents: `--metadj-emerald`
 * - Avoid non‑system hues unless semantically required.
 */

export interface MoodChannel {
  id: string
  name: string
  description: string
  // Icon is now handled by MoodChannelIcons component
  gradient: string // Tailwind gradient classes (brand colors only)
  // Glow color for hover/active states
  glowColor: string
  // Track filtering criteria
  bpmRange?: { min: number; max: number }
  preferredGenres?: string[]
  preferredCollections?: string[]
  // Energy level 1-10 (1 = calm, 10 = high energy)
  energyLevel: number
}

export const MOOD_CHANNEL_MIN_CATALOG_TRACKS = 50
export const MOOD_CHANNEL_MIN_TRACKS_PER_CHANNEL = 10

export interface MoodChannelReadiness {
  totalTracks: number
  minCatalogTracks: number
  minTracksPerChannel: number
  channelCounts: Record<string, number>
  channelsBelowMinimum: string[]
  meetsCatalogMinimum: boolean
  isReady: boolean
}

export const MOOD_CHANNELS: MoodChannel[] = [
  {
    id: "deep-focus",
    name: "Deep Reflection",
    description: "Sink into stillness — and explore Majestic Ascent.",
    gradient: "from-indigo-900/60 via-purple-900/50 to-violet-900/40",
    glowColor: "rgba(139, 92, 246, 0.25)",
    bpmRange: { min: 100, max: 130 },
    preferredGenres: ["Orchestral", "Retro Future"],
    preferredCollections: ["majestic-ascent"],
    energyLevel: 4,
  },
  {
    id: "energy-boost",
    name: "Energy Boost",
    description: "Forward motion — and keep Majestic Ascent moving.",
    gradient: "from-fuchsia-900/60 via-purple-900/50 to-indigo-900/40",
    glowColor: "rgba(192, 132, 252, 0.25)",
    bpmRange: { min: 125, max: 145 },
    preferredGenres: ["Techno", "EDM"],
    preferredCollections: ["majestic-ascent"],
    energyLevel: 9,
  },
  {
    id: "creative-flow",
    name: "Creative Inspiration",
    description: "Spark the next idea — and stay with Majestic Ascent.",
    gradient: "from-cyan-900/60 via-blue-900/50 to-indigo-900/40",
    glowColor: "rgba(6, 182, 212, 0.25)",
    bpmRange: { min: 110, max: 135 },
    preferredGenres: ["Retro Future", "Melodic"],
    preferredCollections: ["majestic-ascent"],
    energyLevel: 6,
  },
]

/**
 * Get mood channel hover styles consistent with brand aesthetic
 */
export function getMoodChannelHoverStyles(channelId: string): string {
  const styles: Record<string, string> = {
    "deep-focus":
      "hover:shadow-[var(--shadow-glow-purple)]",
    "energy-boost":
      "hover:shadow-[var(--shadow-glow-brand)]",
    "creative-flow":
      "hover:shadow-[var(--shadow-glow-cyan)]",
  }
  return styles[channelId] || "hover:shadow-[var(--shadow-glow-purple)]"
}

/**
 * Get tracks matching a mood channel's criteria
 */
export function getTracksForMoodChannel(
  channel: MoodChannel,
  allTracks: { id: string; bpm?: number; genres?: string[]; collection: string }[]
): string[] {
  const matchingTrackIds: string[] = []

  for (const track of allTracks) {
    let score = 0

    // BPM matching (highest weight)
    if (channel.bpmRange && track.bpm) {
      if (track.bpm >= channel.bpmRange.min && track.bpm <= channel.bpmRange.max) {
        score += 3
      } else {
        // Allow slight tolerance
        const tolerance = 10
        if (
          track.bpm >= channel.bpmRange.min - tolerance &&
          track.bpm <= channel.bpmRange.max + tolerance
        ) {
          score += 1
        }
      }
    }

    // Genre matching
    if (channel.preferredGenres && track.genres) {
      const genreMatches = track.genres.filter((g) =>
        channel.preferredGenres?.some((pg) => g.toLowerCase().includes(pg.toLowerCase()))
      ).length
      score += genreMatches * 2
    }

    // Collection matching (strong signal)
    if (channel.preferredCollections) {
      const trackCollectionSlug = track.collection.toLowerCase().replace(/\s+/g, "-")
      if (channel.preferredCollections.includes(trackCollectionSlug)) {
        score += 4
      }
    }

    // Include tracks with positive scores
    if (score > 0) {
      matchingTrackIds.push(track.id)
    }
  }

  return matchingTrackIds
}

/**
 * Sort tracks by relevance to a mood channel
 */
export function sortTracksByMoodRelevance(
  trackIds: string[],
  channel: MoodChannel,
  allTracks: { id: string; bpm?: number; genres?: string[]; collection: string }[]
): string[] {
  const trackMap = new Map(allTracks.map((t) => [t.id, t]))

  return [...trackIds].sort((a, b) => {
    const trackA = trackMap.get(a)
    const trackB = trackMap.get(b)

    if (!trackA || !trackB) return 0

    let scoreA = 0
    let scoreB = 0

    // Score based on BPM proximity to energy level
    if (trackA.bpm && channel.bpmRange) {
      const midBpm = (channel.bpmRange.min + channel.bpmRange.max) / 2
      scoreA -= Math.abs(trackA.bpm - midBpm) / 10
    }
    if (trackB.bpm && channel.bpmRange) {
      const midBpm = (channel.bpmRange.min + channel.bpmRange.max) / 2
      scoreB -= Math.abs(trackB.bpm - midBpm) / 10
    }

    // Preferred collection boost
    if (channel.preferredCollections) {
      const slugA = trackA.collection.toLowerCase().replace(/\s+/g, "-")
      const slugB = trackB.collection.toLowerCase().replace(/\s+/g, "-")
      if (channel.preferredCollections.includes(slugA)) scoreA += 5
      if (channel.preferredCollections.includes(slugB)) scoreB += 5
    }

    return scoreB - scoreA
  })
}

export function getMoodChannelReadiness(
  channels: MoodChannel[],
  allTracks: { id: string; bpm?: number; genres?: string[]; collection: string }[]
): MoodChannelReadiness {
  const channelCounts: Record<string, number> = {}

  for (const channel of channels) {
    channelCounts[channel.id] = getTracksForMoodChannel(channel, allTracks).length
  }

  const totalTracks = allTracks.length
  const channelsBelowMinimum = Object.entries(channelCounts)
    .filter(([, count]) => count < MOOD_CHANNEL_MIN_TRACKS_PER_CHANNEL)
    .map(([id]) => id)
  const meetsCatalogMinimum = totalTracks >= MOOD_CHANNEL_MIN_CATALOG_TRACKS
  const isReady = meetsCatalogMinimum && channelsBelowMinimum.length === 0

  return {
    totalTracks,
    minCatalogTracks: MOOD_CHANNEL_MIN_CATALOG_TRACKS,
    minTracksPerChannel: MOOD_CHANNEL_MIN_TRACKS_PER_CHANNEL,
    channelCounts,
    channelsBelowMinimum,
    meetsCatalogMinimum,
    isReady,
  }
}
