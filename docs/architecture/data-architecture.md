# Data Architecture

> How MetaDJ Nexus loads music metadata today and how we will transition to Neon in the future.

**Last Modified**: 2025-12-27 15:24 EST
## Current Snapshot

- `src/data/collections.json` — canonical collection records (name, release date, internal part notes).
- `src/data/tracks.json` — track metadata (IDs, durations, audio paths, genres, BPM, key).
- `src/data/collection-narratives.ts` — rich collection descriptions and stories.
- `src/data/scenes.ts` — Cinema visual scene configurations.
- `src/data/moodChannels.ts` — mood-based playlist definitions.
- `src/data/wisdom-content.ts` — Wisdom hub knowledge content.
- `Replit App Storage (audio-files bucket)` — 320 kbps MP3 derivatives for streaming (`/api/audio/<collection>/<file>`).
- `Replit App Storage (visuals bucket)` — Video files for Cinema (`/api/video/<collection>/<file>`).
- `src/lib/music/` — domain layer exposing repository helpers, filters, queue building, and slug utilities.

## Repository Flow

### Integrity Snapshot (2025-12-11)
- Validation gates: Zod schemas at load (`src/lib/validation/schemas.ts`) + `scripts/validate-tracks.js` (pretest).
- Constraints enforced: unique track IDs, valid collection references, 2 genres per track, no `"Cinematic"`, `/api/audio/` URLs, `collection.type` in `collection|singles`, ISO dates, positive durations/counts.
- Current data: 68 tracks, 3 collections, all validations passing.


```
src/data/*.json → src/lib/music/data.ts → src/lib/music/index.ts
                                  ↘ filters/utils/tests
```

- `getMusicRepository()` currently returns a static repository backed by JSON.
- `preloadMusic()` allows future server components or API routes to hydrate early.
- Slug normalisation lives in `src/lib/music/utils.ts` so Next.js, tests, and future databases share one implementation.

---

## Music Repository API

The Music Repository provides a unified interface for querying collections and tracks. The current implementation uses static JSON data, with plans to migrate to Neon PostgreSQL.

### MusicRepository Interface

**Location**: `src/lib/music/repository.ts`

```typescript
interface MusicRepository {
  listCollections(): Promise<Collection[]>;
  listTracks(): Promise<Track[]>;
  findTrackById(id: string): Promise<Track | undefined>;
  listTracksByCollection(collectionIdOrName: string): Promise<Track[]>;
  findCollectionById(id: string): Promise<Collection | undefined>;
}
```

### Core Methods

#### `listCollections(): Promise<Collection[]>`
Returns all enabled collections. Collections with `enabled: false` are filtered out at load time.

```typescript
const repo = getMusicRepository();
const collections = await repo.listCollections();
// Returns: Collection[] (only enabled collections)
```

#### `listTracks(): Promise<Track[]>`
Returns all tracks from enabled collections only.

```typescript
const tracks = await repo.listTracks();
// Returns: Track[] (filtered to enabled collections)
```

#### `findTrackById(id: string): Promise<Track | undefined>`
Finds a single track by its unique ID. Uses an indexed Map for O(1) lookup.

```typescript
const track = await repo.findTrackById('metadj-001');
// Returns: Track | undefined
```

#### `listTracksByCollection(collectionIdOrName: string): Promise<Track[]>`
Returns all tracks belonging to a collection. Supports lookup by:
- Collection ID (e.g., `'metaverse-revelation'`)
- Collection title (e.g., `'Metaverse Revelation'`)
- Slug-normalized input (handles typos via alias mapping)

```typescript
const tracks = await repo.listTracksByCollection('Metaverse Revelation');
// Returns: Track[]
```

#### `findCollectionById(id: string): Promise<Collection | undefined>`
Finds a collection by ID, title, or normalized slug.

```typescript
const collection = await repo.findCollectionById('boss-rush');
// Returns: Collection | undefined
```

### Static Repository Implementation

**Location**: `src/lib/music/static-repository.ts`

The `StaticMusicRepository` class implements `MusicRepository` using in-memory data loaded from JSON files at build time.

```typescript
import { getMusicRepository, preloadMusic } from '@/lib/music/static-repository';

// Get singleton repository instance
const repo = getMusicRepository();

// Preload for server components (caches collections + tracks)
const { collections, tracks } = await preloadMusic();
```

### Server-Side Caching

**Location**: `src/lib/music/server.ts`

React's `cache()` function wraps music data loading for request-level deduplication:

```typescript
import { getMusicSnapshot } from '@/lib/music/server';

// Server component usage
const { collections, tracks } = await getMusicSnapshot();
```

### Convenience Functions (Client-Side)

**Location**: `src/lib/music/index.ts`

Direct exports for simpler client-side usage:

```typescript
import {
  collections,        // Collection[] (pre-filtered)
  tracks,             // Track[] (pre-filtered)
  getTrackById,       // (id: string, sourceTracks?: Track[]) => Track | undefined
  getTracksByCollection,  // (collectionIdOrName: string, sourceTracks?: Track[]) => Track[]
  getCollectionById,  // (id: string, sourceCollections?: Collection[]) => Collection | undefined
  getMusicService,    // () => MusicRepository
  shuffleTracks,      // (tracks: Track[], anchorId?: string) => Track[]
  formatDuration,     // (seconds: number) => string
} from '@/lib/music';
```

---

## Slug Utilities

**Location**: `src/lib/music/utils.ts`

### `toCollectionSlug(input: string): string`
Converts a string to a URL-safe slug.

```typescript
toCollectionSlug('Metaverse Revelation')
// Returns: 'metaverse-revelation'
```

### `normalizeCollectionSlug(input: string): string`
Normalizes slugs with alias support for known variations.

```typescript
// Handles known typos
normalizeCollectionSlug('metaverse-revalation')
// Returns: 'metaverse-revelation'
```

### `shuffleTracks(tracks: Track[], anchorId?: string): Track[]`
Fisher-Yates shuffle with optional anchor track positioned first.

```typescript
const shuffled = shuffleTracks(tracks, 'metadj-005');
// Track 'metadj-005' appears first, rest shuffled
```

### `reorderTracksFromAnchor(tracks: Track[], anchorId: string): Track[]`
Circular reorder starting from anchor track.

```typescript
// [1, 2, 3, 4, 5] with anchor 3 becomes [3, 4, 5, 1, 2]
const reordered = reorderTracksFromAnchor(tracks, 'metadj-003');
```

---

## Filter Utilities

**Location**: `src/lib/music/filters.ts`

Provides search and filter functionality with performance-optimized caching.

### `filterCollections(collections: Collection[], searchQuery: string): Collection[]`
Filters collections by search query with Unicode normalization.

```typescript
const results = filterCollections(collections, 'meta');
// Returns collections matching "meta" in title
```

### `filterTracks(allTracks, searchQuery, selectedCollectionId, getTracksByCollection)`
Multi-mode track filtering:
1. If `searchQuery` provided: Full-text search with relevance scoring
2. If `selectedCollectionId` provided: Filter by collection
3. Otherwise: Return all tracks

```typescript
const filtered = filterTracks(
  tracks,
  'neon',
  undefined,
  getTracksByCollection
);
```

### Relevance Scoring

Tracks are sorted by relevance score (0-100):
| Match Type | Score |
|------------|-------|
| Exact match | 100 |
| Prefix match | 80 |
| Word boundary match | 60 |
| Contains match | 50 |

### Caching

Normalized titles are cached to avoid repeated Unicode normalization:
- `normalizedTrackTitleCache: Map<string, string>`
- `normalizedCollectionTitleCache: Map<string, string>`

### `resolveCollectionFromTracks(filteredTracks, collections): string | null`
Determines the collection ID from filtered track results.

### `computeSelectedCollection(currentSelectedId, filteredTracks, collections)`
Updates collection selection based on current filter state.

---

## Queue Builder

**Location**: `src/lib/music/queueBuilder.ts`

Pure functions for building and managing playback queues. Extracted for testability and memoization.

### Types

```typescript
interface QueueBuildOptions {
  anchorTrackId?: string;    // Track to anchor queue around
  autoplay?: boolean;        // Whether playback should start automatically
  preserveCurrent?: boolean; // Preserve current track if in new queue
}

interface QueueBuildResult {
  combinedQueue: Track[];    // Complete queue (manual + auto)
  manualTrackIds: string[];  // Deduplicated manual track IDs
  autoQueue: Track[];        // Filtered base tracks
  targetIndex: number;       // Index of current track
  shouldPlay: boolean;       // Whether to start playback
}
```

### `buildQueue(baseTracks, manualIds, currentTrack, options?): QueueBuildResult`
Main queue construction algorithm:

1. **Sanitize manual IDs**: Deduplicate and validate against track list
2. **Filter base tracks**: Exclude manual tracks from auto queue
3. **Combine queues**: Manual tracks first, then auto tracks
4. **Determine target**: Find anchor track or preserve current
5. **Calculate play state**: Based on track changes and autoplay option

```typescript
const result = buildQueue(
  featuredTracks,
  ['track-1', 'track-2'],
  currentTrack,
  { anchorTrackId: 'track-1', autoplay: true }
);
```

### `filterTracksExcludingManual(tracks, manualTrackIds): Track[]`
Pure function suitable for `useMemo` optimization.

### `buildShuffledQueue(tracks, anchorTrackId?, manualTrackIds?): Track[]`
Creates a shuffled queue with optional anchor and manual track exclusion.

---

## Preparing for Neon

1. Build a `neon-repository.ts` that implements the `MusicRepository` interface.
2. Read Neon credentials from environment variables (documented in `.env.example`).
3. Update `getMusicRepository()` to select the Neon implementation when credentials exist; fall back to the static one for local/offline work.
4. Mirror JSON schema in Neon tables (`collections`, `tracks`). Keep field names identical to avoid UI changes.
5. Extend Vitest coverage with integration tests once the database driver is in place.

## Audio Handling

- Masters live outside the repo first (e.g., `~/Downloads/01 - Track - Mastered V0.mp3`).
- App Storage copies use slugged filenames in `audio-files/<collection>/` for deterministic URLs that map to `/api/audio/<collection>/<file>`.
- Use `ffprobe` to capture duration in seconds and store that value in `src/data/tracks.json`.
- MP3 is the delivery default; upload the finished music files directly to App Storage for deterministic streaming.

## Naming Conventions

- Maintain sequential IDs (`metadj-001`, `br-001`, `zb-001`, etc.) to preserve ordering within collections.
- Update `trackCount` in `collections.json` and append new track IDs when expanding collections.

## Checklist When Adding Music

- [ ] Rename files following `NN - Title - Mastered V0.mp3`.
- [ ] Upload the MP3s to App Storage (`audio-files/<collection>/NN-track-name.mp3`).
- [ ] Update `tracks.json` and `collections.json`.
- [ ] Run `npm run lint` and `npm run type-check` to validate the repository helpers compile cleanly.
- [ ] Update docs (README + feature specs) with any new context.
