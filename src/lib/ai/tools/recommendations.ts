/**
 * Track Recommendations Tool
 *
 * Suggests tracks based on mood, energy level, or similarity to a reference track.
 *
 * @module lib/ai/tools/recommendations
 */

import { z } from 'zod'
import {
  MAX_RECOMMENDATIONS,
  sanitizeAndValidateToolResult,
} from '@/lib/ai/tools/utils'
import { shuffleTracks } from '@/lib/music'
import { trackList } from '@/lib/music/data'
import type { Track } from '@/types'

// Mood to genre mapping for recommendations
const MOOD_GENRES: Record<string, string[]> = {
  focus: ['ambient', 'downtempo', 'electronic'],
  energy: ['electronic', 'progressive', 'high-energy'],
  relaxation: ['ambient', 'atmospheric', 'chill'],
  epic: ['orchestral', 'cinematic', 'epic'],
  creative: ['electronic', 'progressive', 'experimental'],
  ambient: ['ambient', 'atmospheric', 'drone'],
}

const recommendationsSchema = z.object({
  mood: z
    .enum(['focus', 'energy', 'relaxation', 'epic', 'creative', 'ambient'])
    .optional()
    .describe('Mood to match'),
  energyLevel: z
    .enum(['low', 'medium', 'high'])
    .optional()
    .describe('Desired energy level'),
  similarTo: z
    .string()
    .optional()
    .describe('Track title to find similar tracks'),
  collection: z
    .string()
    .optional()
    .describe('Collection to filter recommendations from'),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of recommendations (default 5)'),
})

/**
 * Track Recommendations Tool
 *
 * Suggests tracks based on mood, energy level, or similarity to a reference track.
 */
export const getRecommendations = {
  description:
    'Get track recommendations based on mood, energy level, or similarity. Use when users want music suggestions or ask "what should I listen to?"',
  inputSchema: recommendationsSchema,
  execute: async ({
    mood,
    energyLevel,
    similarTo,
    collection,
    limit = 5,
  }: {
    mood?: keyof typeof MOOD_GENRES
    energyLevel?: 'low' | 'medium' | 'high'
    similarTo?: string
    collection?: string
    limit?: number
  }) => {
    // SECURITY: Enforce maximum limit
    const effectiveLimit = Math.min(limit, MAX_RECOMMENDATIONS)

    // SECURITY: Sanitize string inputs
    const sanitizedSimilarTo = similarTo?.slice(0, 200)
    const sanitizedCollection = collection?.slice(0, 100)

    let candidates: Track[] = [...trackList]

    // Filter by collection if specified
    if (sanitizedCollection) {
      const collectionLower = sanitizedCollection.toLowerCase()
      candidates = candidates.filter((t) =>
        t.collection?.toLowerCase().includes(collectionLower)
      )
    }

    // Score tracks based on criteria
    const scored = candidates.map((track) => {
      let score = 0

      // Mood matching
      if (mood && MOOD_GENRES[mood]) {
        const moodGenres = MOOD_GENRES[mood]
        const matchingGenres = track.genres.filter((g) =>
          moodGenres.some((mg) => g.toLowerCase().includes(mg.toLowerCase()))
        )
        score += matchingGenres.length * 2
      }

      // Energy level matching (using BPM as proxy)
      if (energyLevel && track.bpm) {
        const bpm = track.bpm
        if (energyLevel === 'low' && bpm < 100) score += 3
        else if (energyLevel === 'medium' && bpm >= 100 && bpm <= 130) score += 3
        else if (energyLevel === 'high' && bpm > 130) score += 3
      }

      // Similarity matching
      if (sanitizedSimilarTo) {
        const refTrack = trackList.find((t) =>
          t.title.toLowerCase().includes(sanitizedSimilarTo.toLowerCase())
        )
        if (refTrack && track.id !== refTrack.id) {
          // Same collection bonus
          if (track.collection === refTrack.collection) score += 2
          // Shared genres bonus
          const sharedGenres = track.genres.filter((g) =>
            refTrack.genres.includes(g)
          )
          score += sharedGenres.length
          // Similar BPM bonus
          if (
            track.bpm &&
            refTrack.bpm &&
            Math.abs(track.bpm - refTrack.bpm) <= 10
          ) {
            score += 1
          }
        }
      }

      return { track, score }
    })

    // Sort by score and return top results
    const recommendations = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, effectiveLimit)
      .map((s) => ({
        id: s.track.id,
        title: s.track.title,
        collection: s.track.collection,
        genres: s.track.genres,
        bpm: s.track.bpm,
        key: s.track.key,
        matchScore: s.score,
      }))

    let result

    // If no matches, return random selection from candidates
    if (recommendations.length === 0) {
      const shuffled = shuffleTracks(candidates).slice(0, effectiveLimit)
      result = {
        recommendations: shuffled.map((t) => ({
          id: t.id,
          title: t.title,
          collection: t.collection,
          genres: t.genres,
          bpm: t.bpm,
          key: t.key,
        })),
        note: 'No exact matches found. Here are some suggestions to explore.',
      }
    } else {
      result = { recommendations }
    }

    // SECURITY: Validate result size before returning
    return sanitizeAndValidateToolResult(result, 'getRecommendations')
  },
}
