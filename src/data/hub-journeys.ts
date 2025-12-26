/**
 * Hub Journeys
 *
 * Human-curated entry arcs for the Guided Journey Builder.
 * Kept as a simple static module (no DB) so it's easy to rotate seasonally.
 */

export type HubJourneyAction = "odyssey" | "music" | "wisdom" | "ai"

export interface HubJourney {
  id: HubJourneyAction
  title: string
  description: string
  accent: string
  enabled?: boolean
}

export const HUB_JOURNEYS: HubJourney[] = [
  {
    id: "odyssey",
    title: "Metaversal Odyssey",
    description: "Start the flagship arc: music first, Cinema as the portal.",
    accent: "from-purple-900/60 via-indigo-900/50 to-blue-900/40",
    enabled: true,
  },
  {
    id: "music",
    title: "Browse the Library",
    description: "Open the music panel and explore living collections.",
    accent: "from-indigo-900/60 via-purple-900/50 to-violet-900/40",
    enabled: true,
  },
  {
    id: "wisdom",
    title: "Wisdom Dive",
    description: "Step into Thoughts, Guides, and Reflections.",
    accent: "from-cyan-900/60 via-blue-900/50 to-indigo-900/40",
    enabled: true,
  },
  {
    id: "ai",
    title: "Chat with MetaDJai",
    description: "Ask for a set, a framework, or a creative push.",
    accent: "from-fuchsia-900/60 via-purple-900/50 to-indigo-900/40",
    enabled: true,
  },
]
