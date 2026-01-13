import { collectionList, trackIndex, trackList } from "./data";
import { getMusicRepository } from "./static-repository";
import { normalizeCollectionSlug } from "./utils";
import type { MusicRepository } from "./repository";
import type { Collection, Track } from "@/types";

export type { MusicRepository } from "./repository";
export type { Collection, Track } from "@/types";
export { shuffleTracks } from "./utils";
export { formatDuration } from "@/lib/utils";
export {
  buildMusicDeepLinkPath,
  buildMusicDeepLinkUrl,
  parseMusicDeepLinkPath,
  isMusicDeepLinkKind,
  type MusicDeepLink,
  type MusicDeepLinkKind,
} from "./deeplink";

export const collections: Collection[] = collectionList;
export const tracks: Track[] = trackList;

/**
 * Retrieves a track by its unique identifier.
 *
 * Uses the pre-built track index for O(1) lookups when no source is provided.
 * Falls back to linear search when a custom source array is specified.
 *
 * @param id - The unique track identifier (e.g., "eternal-sunrise-01")
 * @param sourceTracks - Optional custom track array to search; defaults to global track list
 * @returns The matching track, or undefined if not found
 *
 * @example
 * // Fast indexed lookup
 * const track = getTrackById("eternal-sunrise-01");
 *
 * // Search within filtered subset
 * const queuedTrack = getTrackById("track-id", playerQueue);
 */
export function getTrackById(id: string, sourceTracks?: Track[]): Track | undefined {
  if (!sourceTracks) {
    return trackIndex.get(id);
  }

  return sourceTracks.find((track) => track.id === id);
}

/**
 * Retrieves all tracks belonging to a specific collection.
 *
 * Supports flexible matching: accepts collection ID, display name, or slug.
 * Normalizes input for case-insensitive, punctuation-tolerant matching.
 *
 * @param collectionIdOrName - Collection identifier, title, or slug (e.g., "eternal-sunrise", "Eternal Sunrise")
 * @param sourceTracks - Optional custom track array to filter; defaults to global track list
 * @returns Array of tracks in the collection (empty array if none found)
 *
 * @example
 * // Get all tracks from a collection
 * const collectionTracks = getTracksByCollection("eternal-sunrise");
 *
 * // Filter by collection within a subset
 * const filtered = getTracksByCollection("Quantum Dreams", recentlyPlayed);
 */
export function getTracksByCollection(collectionIdOrName: string, sourceTracks?: Track[]): Track[] {
  const list = sourceTracks ?? trackList;
  const normalized = normalizeCollectionSlug(collectionIdOrName);

  return list.filter((track) => {
    const matchesSlug = normalizeCollectionSlug(track.collection) === normalized;
    return track.collection === collectionIdOrName || matchesSlug;
  });
}

/**
 * Retrieves a collection by its identifier, title, or slug.
 *
 * Performs flexible matching with slug normalization for resilient lookups.
 * Checks exact ID match first, then falls back to normalized title/ID comparison.
 *
 * @param id - Collection identifier, title, or slug to search for
 * @param sourceCollections - Optional custom collection array; defaults to global collection list
 * @returns The matching collection, or undefined if not found
 *
 * @example
 * // Exact ID lookup
 * const collection = getCollectionById("eternal-sunrise");
 *
 * // Title-based lookup (normalized)
 * const collection = getCollectionById("Eternal Sunrise");
 */
export function getCollectionById(id: string, sourceCollections?: Collection[]): Collection | undefined {
  const normalized = normalizeCollectionSlug(id);
  const list = sourceCollections ?? collectionList;

  return list.find(
    (collection) =>
      collection.id === id ||
      normalizeCollectionSlug(collection.title) === normalized ||
      normalizeCollectionSlug(collection.id) === normalized,
  );
}

/**
 * Returns the singleton music repository instance.
 *
 * Provides access to the full MusicRepository interface for advanced operations
 * like streaming URLs, metadata enrichment, and batch queries.
 *
 * @returns The global MusicRepository instance
 *
 * @example
 * const musicService = getMusicService();
 * const streamUrl = await musicService.getStreamUrl(trackId);
 */
export function getMusicService(): MusicRepository {
  return getMusicRepository();
}
