/**
 * Catalog Tools
 *
 * Allows the AI to search and retrieve the music catalog on-demand.
 * - searchCatalog: Find specific tracks/collections by query
 * - getCatalogSummary: Get full catalog overview (collections, track counts, genres)
 *
 * The AI calls these tools when users ask about collections, recommendations,
 * or music discovery - avoiding the need to send catalog data with every message.
 *
 * @module lib/ai/tools/catalog
 */

import { z } from 'zod'
import { COLLECTION_NARRATIVES } from '@/data/collection-narratives'
import {
  fuzzyMatch,
  MAX_SEARCH_RESULTS,
  sanitizeAndValidateToolResult,
} from '@/lib/ai/tools/utils'
import { trackList, collectionList } from '@/lib/music/data'
import type { Track, Collection } from '@/types'

type CatalogSearchResult =
  | (Track & { kind: 'track' })
  | (Collection & { kind: 'collection' })

// Schema for catalog search parameters
const catalogSearchSchema = z.object({
  query: z
    .string()
    .describe('The search query (title, artist, genre, or description)'),
  type: z
    .enum(['track', 'collection', 'all'])
    .optional()
    .describe('The type of content to search for'),
})

/**
 * Catalog Search Tool
 *
 * Allows the AI to search the local music catalog (tracks and collections).
 */
export const searchCatalog = {
  description:
    'Search the MetaDJ music catalog for tracks and collections. Use this to find specific songs, collections, or genres mentioned by the user.',
  inputSchema: catalogSearchSchema,
  execute: async ({
    query,
    type,
  }: {
    query: string
    type?: 'track' | 'collection' | 'all'
  }) => {
    // SECURITY: Sanitize and limit query length
    const normalizeSearchToken = (value: string) => value.toLowerCase()
    const q = normalizeSearchToken(query).slice(0, 200)
    const searchType = type ?? 'all'
    const results: CatalogSearchResult[] = []

    if (searchType === 'all' || searchType === 'collection') {
      // Use fuzzy matching for typo tolerance (e.g., "calmn" → "calm")
      const matchedCollections = collectionList.filter(
        (c) =>
          fuzzyMatch(q, c.title) ||
          (c.description && fuzzyMatch(q, c.description))
      )
      results.push(
        ...matchedCollections.map((c) => ({ ...c, kind: 'collection' as const }))
      )
    }

    if (searchType === 'all' || searchType === 'track') {
      // Use fuzzy matching for typo tolerance
      const matchedTracks = trackList.filter(
        (t) =>
          fuzzyMatch(q, t.title) ||
          (t.description && fuzzyMatch(q, t.description)) ||
          t.genres.some((g) => fuzzyMatch(q, g))
      )
      results.push(
        ...matchedTracks.map((t) => ({ ...t, kind: 'track' as const }))
      )
    }

    // Prioritize exact matches and limit results
    const sortedResults = results
      .sort((a, b) => {
        const aExact = a.title.toLowerCase() === q
        const bExact = b.title.toLowerCase() === q
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        return 0
      })
      .slice(0, MAX_SEARCH_RESULTS)

    // SECURITY: Validate result size before returning
    return sanitizeAndValidateToolResult(sortedResults, 'searchCatalog')
  },
}

// Schema for catalog summary parameters
const catalogSummarySchema = z.object({
  includeDescriptions: z
    .boolean()
    .optional()
    .describe('Whether to include collection descriptions (default: true)'),
  maxCollections: z
    .number()
    .optional()
    .describe('Maximum number of collections to return (default: 30)'),
})

/**
 * Catalog Summary Tool
 *
 * Returns a comprehensive overview of the music catalog including:
 * - Total collection count
 * - Collection titles, descriptions, track counts
 * - Primary genres per collection
 * - Sample tracks from each collection
 *
 * The AI should call this tool when users ask about:
 * - What collections/music are available
 * - Catalog overview or browsing
 * - Music recommendations based on catalog
 * - Genre or mood-based discovery
 */
export const getCatalogSummary = {
  description:
    'Get a comprehensive overview of the MetaDJ music catalog. Call this when users ask about available collections, want music recommendations, or need to understand what music is available. Returns collection names, descriptions, track counts, and genres.',
  inputSchema: catalogSummarySchema,
  execute: async ({
    includeDescriptions = true,
    maxCollections = 30,
  }: {
    includeDescriptions?: boolean
    maxCollections?: number
  }) => {
    // Cap to prevent oversized responses
    const cappedMax = Math.min(maxCollections, 50)
    const cappedCollections = collectionList.slice(0, cappedMax)

    const collections = cappedCollections.map((collection) => {
      const narrative = COLLECTION_NARRATIVES[collection.id] ?? COLLECTION_NARRATIVES.featured
      const collectionTracks = trackList.filter(
        (track) => track.collection === collection.title
      )

      // Build genre frequency map
      const genreCounter = new Map<string, number>()
      collectionTracks.forEach((track) => {
        track.genres?.slice(0, 2).forEach((genre) => {
          if (!genre) return
          genreCounter.set(genre, (genreCounter.get(genre) ?? 0) + 1)
        })
      })

      // Get top genres
      const primaryGenres = Array.from(genreCounter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre)

      // Truncate description to 300 chars for reasonable response size
      const fullDescription = narrative.paragraphs.join(' ')
      const description = includeDescriptions
        ? fullDescription.length > 300
          ? fullDescription.slice(0, 297) + '...'
          : fullDescription
        : undefined

      return {
        id: collection.id,
        title: collection.title,
        ...(description && { description }),
        trackCount: collectionTracks.length,
        sampleTracks: collectionTracks.slice(0, 3).map((t) => t.title),
        primaryGenres,
      }
    })

    const summary = {
      totalCollections: collectionList.length,
      totalTracks: trackList.length,
      collectionTitles: cappedCollections.map((c) => c.title),
      collections,
    }

    // SECURITY: Validate result size before returning
    return sanitizeAndValidateToolResult(summary, 'getCatalogSummary')
  },
}
