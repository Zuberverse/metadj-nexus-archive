import collectionsJson from "@/data/collections.json";
import tracksJson from "@/data/tracks.json";
import { validateTracks, validateCollections } from "@/lib/validation/schemas";
import type { Collection, Track } from "@/types";

// Validate data at load time to catch issues early
// This will throw descriptive errors if data doesn't match schema
const allTracks = validateTracks(tracksJson) as Track[];
const allCollections = validateCollections(collectionsJson) as Collection[];

// Filter to only enabled collections (enabled defaults to true when unset)
export const collectionList = allCollections.filter((c) => c.enabled !== false);

// Get set of enabled collection titles for filtering tracks
const enabledCollectionTitles = new Set(collectionList.map((c) => c.title));

// Only include tracks from enabled collections
export const trackList = allTracks.filter((t) => enabledCollectionTitles.has(t.collection));

export const trackIndex = new Map(trackList.map((track) => [track.id, track]));
