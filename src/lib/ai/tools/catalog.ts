/**
 * Catalog Search Tool
 *
 * Allows the AI to search the local music catalog (tracks and collections).
 *
 * @module lib/ai/tools/catalog
 */

import { z } from 'zod'
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
