/**
 * Dynamic Actions Hook
 *
 * Generates context-aware quick actions based on the current playback state.
 * When a track is playing, actions focus on that track.
 * When no track is playing, actions focus on the current collection.
 */

import { useMemo } from "react"
import type { QuickAction } from "@/components/metadjai/curated-actions"

interface Track {
  id: string
  title: string
  artist?: string
}

interface UseDynamicActionsOptions {
  /** Currently playing track, if any */
  currentTrack: Track | null
  /** Label for the current collection context */
  collectionLabel: string
}

/**
 * Returns an array of context-aware quick actions.
 *
 * - When a track is playing: actions related to the track (vibe check, similar, visual prompts, artist info)
 * - When no track is playing: actions related to the collection (moodboard, soundtrack arc, pick track, aesthetic)
 */
export function useDynamicActions({
  currentTrack,
  collectionLabel,
}: UseDynamicActionsOptions): QuickAction[] {
  return useMemo(() => {
    if (currentTrack) {
      // Active Playback Context
      const trackTitle = currentTrack.title
      const artistName = currentTrack.artist || "the artist"
      const contextId = `track-${currentTrack.id}`

      return [
        {
          id: `dynamic-vibe-check-${contextId}`,
          title: "Vibe check",
          description: "Describe the vibe of this track.",
          prompt: `Describe the aesthetic and emotional vibe of "${trackTitle}" by ${artistName} in 3 vivid bullet points.`,
        },
        {
          id: `dynamic-play-similar-${contextId}`,
          title: "Play similar",
          description: "Queue up tracks like this.",
          prompt: `Find and queue up 3 tracks similar to "${trackTitle}" by ${artistName}.`,
        },
        {
          id: `dynamic-visual-prompt-${contextId}`,
          title: "Visual prompt",
          description: "Ideas for Daydream visuals.",
          prompt: `Suggest a creative visual prompt I could use in Daydream that matches the energy of "${trackTitle}".`,
        },
        {
          id: `dynamic-about-artist-${contextId}`,
          title: "About artist",
          description: "Trivia and background info.",
          prompt: `Tell me a fascinating fact or brief background about ${artistName}.`,
        },
      ]
    }

    // Collection Context
    const coll = collectionLabel || "this collection"
    const contextId = `collection-${coll}`

    return [
      {
        id: `dynamic-moodboard-${contextId}`,
        title: "Moodboard",
        description: "Words and visuals for this collection.",
        prompt: `Give me 8–10 moodboard words inspired by ${coll}, each on its own line. End with an OPTIONAL note offering a track + cinema pairing.`,
      },
      {
        id: `dynamic-soundtrack-arc-${contextId}`,
        title: "Soundtrack arc",
        description: "Build a mini-set from here.",
        prompt: `Pick 3 tracks from ${coll} to create a narrative arc. Explain the progression in one sentence.`,
      },
      {
        id: `dynamic-pick-track-${contextId}`,
        title: "Pick a track",
        description: "Suggest one song to start.",
        prompt: `Pick one random track from ${coll} that you think is underrated or standout, and tell me why I should play it.`,
      },
      {
        id: `dynamic-aesthetic-${contextId}`,
        title: "Aesthetic",
        description: "Analyze the collection's style.",
        prompt: `Analyze the overall aesthetic theme of ${coll} in one crisp paragraph.`,
      },
    ]
  }, [currentTrack, collectionLabel])
}
