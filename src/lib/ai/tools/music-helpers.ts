/**
 * Music Data Helpers
 *
 * Shared utilities for finding tracks and collections by title/name
 * and resolving track lists for playback proposals.
 *
 * @module lib/ai/tools/music-helpers
 */

import {
  DEFAULT_ACTIVE_CONTROL_LIMIT,
  MAX_ACTIVE_CONTROL_TRACKS,
  normalizeCatalogText,
} from '@/lib/ai/tools/utils'
import { trackList, collectionList, trackIndex } from '@/lib/music/data'
import type { Track, Collection } from '@/types'

/**
 * Find a track by title using normalized text matching.
 * Tries exact match first, then partial match.
 */
export function findTrackByTitle(title: string): Track | undefined {
  const normalized = normalizeCatalogText(title)
  if (!normalized) return undefined

  const exactMatch = trackList.find(
    (track) => normalizeCatalogText(track.title) === normalized
  )
  if (exactMatch) return exactMatch

  return trackList.find((track) =>
    normalizeCatalogText(track.title).includes(normalized)
  )
}

/**
 * Find a collection by name using normalized text matching.
 * Tries exact match first, then partial match.
 */
export function findCollectionByName(name: string): Collection | undefined {
  const normalized = normalizeCatalogText(name)
  if (!normalized) return undefined

  const exactMatch = collectionList.find(
    (collection) => normalizeCatalogText(collection.title) === normalized
  )
  if (exactMatch) return exactMatch

  return collectionList.find((collection) =>
    normalizeCatalogText(collection.title).includes(normalized)
  )
}

/**
 * Resolve track IDs and titles for playback proposals.
 * Supports resolution by ID, title, or collection name.
 */
export function resolveTracksForProposal(input: {
  trackIds?: string[]
  trackTitles?: string[]
  collection?: string
  limit?: number
}): { trackIds: string[]; trackTitles: string[]; collectionTitle?: string } {
  const max = Math.min(
    input.limit ?? DEFAULT_ACTIVE_CONTROL_LIMIT,
    MAX_ACTIVE_CONTROL_TRACKS
  )
  const trackIds: string[] = []
  const trackTitles: string[] = []
  const seen = new Set<string>()
  let collectionTitle: string | undefined

  const addTrack = (track?: Track) => {
    if (!track || trackIds.length >= max || seen.has(track.id)) return
    seen.add(track.id)
    trackIds.push(track.id)
    trackTitles.push(track.title)
  }

  if (input.trackIds?.length) {
    for (const id of input.trackIds) {
      addTrack(trackIndex.get(id))
      if (trackIds.length >= max) break
    }
  }

  if (input.trackTitles?.length) {
    for (const title of input.trackTitles) {
      addTrack(findTrackByTitle(title))
      if (trackIds.length >= max) break
    }
  }

  if (input.collection && trackIds.length < max) {
    const matchedCollection = findCollectionByName(input.collection)
    if (matchedCollection) {
      collectionTitle = matchedCollection.title
      for (const track of trackList) {
        if (track.collection !== matchedCollection.title) continue
        addTrack(track)
        if (trackIds.length >= max) break
      }
    }
  }

  return { trackIds, trackTitles, collectionTitle }
}
