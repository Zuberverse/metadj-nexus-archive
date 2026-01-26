# Collections System Documentation

> **Comprehensive collection tracking and metadata management for MetaDJ Nexus**

**Last Modified**: 2026-01-26 13:00 EST
## Overview

The Collections system is the official organizational structure for MetaDJ Nexus music collections. "Music collections" is the formal term; "collections" is the shorthand used in the app. This document serves as the canonical reference for all collection metadata, tracking standards, and update procedures. **MVP policy**: collection-only (singles are retired for now; see Roadmap note below).

> **UI Reference (v0.8.1+)**: Collections are surfaced through the Left Panel browse experience (`BrowseView.tsx` + `CollectionDetailView.tsx`). The prior `CollectionTabs`/`CollectionManager` UI has been removed; legacy reference lives in `docs/archive/2025-12-collection-tabs-system.md`.

## Collection Type

### Collections (MVP Standard)
Official cohesive works released as complete collections with intentional track ordering and thematic unity.

**Characteristics:**
- `type: "collection"` in collection metadata
- Intentional track sequencing
- Unified artistic vision
- Released as complete work

## Metadata Standards

### Collection Metadata Fields

```typescript
interface Collection {
  id: string;              // Kebab-case identifier (e.g., "majestic-ascent")
  title: string;           // Display title (e.g., "Majestic Ascent")
  artist: string;          // Always "MetaDJ" for this platform
  type: "collection"; // Collection type classification (singles retired for MVP)
  releaseDate: string;     // ISO format (YYYY-MM-DD)
  artworkUrl?: string;     // Path to collection artwork
  trackCount: number;      // Total tracks in collection
  description?: string;    // Brief collection description
}
```

### Track Metadata Fields

```typescript
interface Track {
  id: string;              // Unique track identifier (e.g., "metadj-001")
  title: string;           // Track title
  artist: string;          // Always "MetaDJ"
  collection: string;      // Collection title or ID
  duration: number;        // Duration in seconds
  releaseDate: string;     // ISO format (YYYY-MM-DD)
  description?: string;    // Track description (optional)
  audioUrl: string;        // Path to audio file
  artworkUrl?: string;     // Path to track artwork (optional)
  genres?: string[];       // Exactly 2 genre tags
  bpm?: number;           // Beats per minute (optional)
  key?: string;           // Musical key (e.g., "C major", "A minor")
}
```

### UI Presentation

**Library‑first browsing (v0.8.1+)**:
- Collections are surfaced through the Left Panel **Library** tab (`leftPanelTab="browse"`).
- The Library view (`BrowseView.tsx`) includes:
  - A **Featured** card at the top (curated highlights)
  - A vertical **Collections** list (artwork + track count)
  - An optional **Mood Channels** list (feature‑flagged via `FEATURE_MOOD_CHANNELS`)
- Selecting Featured or a collection opens `CollectionDetailView.tsx`:
  - **Play All** + **Shuffle**
  - **About Collection** toggle (non‑Featured) for narrative paragraphs
  - Track list rendered via `TrackListItem.tsx`

- **Themed Hover Effects (v1.60+):**
  - Interactive elements (cards, list items) now use a centralized `getCollectionHoverStyles` utility.
  - Hover states trigger a collection-specific colored glow (border + background tint + shadow) matching the collection's identity:
    - **Majestic Ascent**: Purple/Magenta glow (`shadow-purple-500/25`)
    - **Featured**: Indigo/Blue glow (`shadow-indigo-500/25`)
  - This applies to the Hub, Left Panel browsing, and Wisdom sections (mapped to collection themes).

### Featured Collection

The Featured collection is a special curated view alternating between Majestic Ascent and Metaverse Revelation tracks:

**Configuration** (`src/lib/app.constants.ts`):
- `FEATURED_TRACK_IDS`: Array of 20 track IDs alternating between collections
- `HUB_HERO_TRACK_ID`: First featured track used for Hub's "Enter Cinema" button

**Current Featured Order** (20 tracks):
1. metadj-001 (Majestic Ascent)
2. mr-001 (Metaverse Revelation - I Want to Believe)
3. metadj-002 (Convergence)
4. mr-003 (Metaverse Revelation)
... (alternating pattern continues)

### Collection Details Modal Enhancements

The About Collection modal (`CollectionDetailsModal.tsx`) includes:
- **Scroll Indicator**: Shows "Scroll for more" with bouncing chevron icon and gradient fade when track list exceeds container height
- Indicator auto-hides when user scrolls to bottom
- Uses `scrollContainerRef` with scroll event listener to track scroll position

### BrowseView Card Design (v0.9.47+)

The Left Panel BrowseView cards prioritize quick scanning while preserving collection identity.

**Layout:**
- Compact vertical list in BrowseView with consistent card height.
- Artwork thumbnails (40-48px) paired with title + subtitle.
- Featured + Recently Played cards use a richer gradient surface for prominence.

**Card Design:**
- Collection-specific glow via `getCollectionHoverStyles`.
- Border uses `--border-standard` with a soft overlay on hover.
- Artwork scales slightly on hover; chevron nudges right for affordance.

**Implementation Files:**
- `src/components/panels/left-panel/BrowseView.tsx` — Featured, Recently Played, and collections list.
- `src/lib/collection-theme.ts` — Gradient definitions (`getCollectionHoverStyles`).

### About Collection Section (v0.9.47+)

The expandable "About this collection" section was improved:

- **Text container** constrained to `max-w-2xl` for comfortable reading width
- **Card styling**: `rounded-2xl` border, `bg-black/20` background, `backdrop-blur-sm`
- **Paragraph spacing**: `space-y-3` for better visual rhythm
- **Text color**: `text-white/80` for reduced eye strain

**Narrative System**:
- `COLLECTION_NARRATIVES` (`src/data/collection-narratives.ts`) stores `heading`, `subtitle`, and `paragraphs`.
- The Left Panel uses these narratives to power **About Collection** (non‑Featured collections) and for consistent catalog context across the app.

### Asset Strategy

- Streaming assets live in **Cloudflare R2** at `music/<collection>/NN - Track Title (v0) - Mastered.mp3`, accessed in-app via `/api/audio/<collection>/...`.
- Master MP3 files stay archived offline for backup.
- Collection artwork syncs with each release's palette: Majestic Ascent leans portal magenta/purple gradients.

> **Storage Reference**: See `docs/MEDIA-STORAGE.md` for complete R2 configuration, directory structure, and upload procedures.

> **Implementation Note**
>
> The canonical data lives in `src/data/collections.json` and `src/data/music.json`.
> These JSON snapshots are loaded through the domain helpers in `src/lib/music/`,
> which exposes repository functions (`getTracksByCollection`, `getMusicService`, etc.)
> used throughout the app.

### Genre Tags Standard

**Exactly 2 tags per track** - no more, no less. This ensures focused categorization and consistent metadata structure.

**Tag Selection Guidelines**:
- **Primary genre**: Main musical style (e.g., "Rock", "Techno", "Ambient", "Electronic")
- **Secondary characteristic**: Distinctive quality or sub-genre (e.g., "Retro Future", "Epic", "Ethereal", "Futuristic")

**"Cinematic" Avoidance**:
- ❌ Do NOT use "Cinematic" as a tag/label
- ✅ "Cinematic" is OK in descriptions, copy, and narrative text

Current tag vocabulary (examples):
- Primary genres: Rock, Techno, Ambient, Electronic, EDM, House, Trance, Hip Hop, Dance, Glitch, Synth, Tech House, Psychedelic
- Characteristics: Retro Future, Epic, Ethereal, Cosmic, Uplifting, Futuristic, Inspiring, Anthem, Intro, Creative, Metaverse

## Roadmap Note: Singles

Singles collections are paused for MVP scope and clarity. If/when we reintroduce them, they will return as a curated format (not individual one-off releases) with explicit filtering rules.

## Current Collections

### Majestic Ascent (Collection)

**Collection Metadata:**
- **ID**: `majestic-ascent`
- **Title**: Majestic Ascent
- **Artist**: MetaDJ
- **Type**: Collection
- **Release Date**: 2025-10-04
- **Track Count**: 10
- **Description**: Portal narration + orchestral/electronic fusion powered by AI-driven creation. Epic debut collection featuring orchestral, cinematic, and electronic elements.
- **Artwork**: `/images/majestic-ascent-collection.svg` (cosmic mountain motif with vertical light beams)

**Track Listing:**

| # | ID | Title | Duration | BPM | Key | Genres |
|---|---|---|---|---|---|---|
| 1 | metadj-001 | Majestic Ascent | 5:05 (305s) | 120 | C major | Retro Future, Techno |
| 2 | metadj-002 | Convergence | 7:16 (436s) | — | — | Retro Future, Techno |
| 3 | metadj-003 | Future's Grace | 3:04 (184s) | — | — | Retro Future, Techno |
| 4 | metadj-004 | Synthetic Emergence | 4:02 (242s) | — | — | Retro Future, Techno |
| 5 | metadj-005 | Electric Horizon | 3:24 (204s) | — | — | Retro Future, Techno |
| 6 | metadj-006 | Portal to Infinity | 4:16 (256s) | — | — | Retro Future, Techno |
| 7 | metadj-007 | Virtual Awakening | 4:54 (294s) | — | — | Retro Future, Techno |
| 8 | metadj-008 | Day Dreaming | 3:02 (182s) | — | — | Retro Future, Techno |
| 9 | metadj-009 | Strollin Through Paradise | 5:10 (310s) | — | — | Retro Future, Techno |
| 10 | metadj-010 | The Minotaur's Dance | 2:11 (131s) | — | — | Retro Future, Techno |

**Total Duration**: ~42 minutes

**Notes:**
- Mastered MP3s are archived offline; streaming copies live in Cloudflare R2 at `music/majestic-ascent/NN - Track Title (v0) - Mastered.mp3`.
- BPM and key data being gradually added as analysis is completed.

## Update Procedures

### Adding a New Collection

1. **Create Collection Entry** in `src/data/collections.json`:
   ```json
   {
     "id": "collection-id",
     "title": "Collection Title",
     "artist": "MetaDJ",
     "type": "collection",
     "releaseDate": "YYYY-MM-DD",
     "artworkUrl": "/images/artwork.svg",
     "trackCount": 0,
     "description": "Collection description"
   }
   ```

2. **Update Documentation** in this file:
   - Add collection section with full metadata
   - Create track listing table
   - Document any special notes

3. **Commit Changes** with message: `feat: Add [Collection Name] collection`

### Adding Tracks to Collection

1. **Upload Audio Files** to R2 Storage
   ```bash
   # Using rclone
   rclone copy ./local-track.mp3 r2:metadj-nexus-media/music/collection-name/
   ```

2. **Extract Metadata**:
   ```bash
   # Get duration (run against the local MP3)
   ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ./track-name.mp3

   # Get BPM (if tagged)
   ffprobe -v error -show_entries format_tags=BPM -of default=noprint_wrappers=1:nokey=1 ./track-name.mp3
   ```

3. **Add Track Entry** to `src/data/music.json`:
   ```json
   {
     "id": "metadj-XXX",
     "title": "Track Title",
     "artist": "MetaDJ",
     "collection": "Collection Name",
     "duration": 180,
     "releaseDate": "YYYY-MM-DD",
     "audioUrl": "/api/audio/<collection>/track-name.mp3",
     "artworkUrl": "/images/placeholder-artwork.svg",
     "genres": ["Primary Tag", "Techno"],
     "bpm": 120,
     "key": "C major"
   }
   ```

4. **Update Collection** `trackCount` field

5. **Update Documentation** in this file:
   - Add row to track listing table
   - Update total duration
   - Note any special characteristics

6. **Commit Changes**: `feat: Add [Track Name] to [Collection Name]`

### Modifying Track Metadata

1. **Update in `src/data/music.json`**
2. **Update Documentation** in this file
3. **Commit**: `fix: Update metadata for [Track Name]`

### Removing Tracks

1. **Remove from `src/data/music.json`**
2. **Update Collection** `trackCount`
3. **Update Documentation** (remove from table, adjust numbering)
4. **Delete from R2 Storage** (keep the local music file archived)
5. **Commit**: `refactor: Remove [Track Name] from [Collection Name]`

## Validation Checklist

Before finalizing collection updates:

- [ ] All track IDs are unique
- [ ] All track durations are accurate (in seconds)
- [ ] Genre tags use 2-tag convention (Primary, Techno)
- [ ] Audio files exist in R2 at specified paths
- [ ] Collection `trackCount` matches actual track count
- [ ] Track order matches intended sequence
- [ ] Documentation updated with all changes
- [ ] Git commit follows naming convention

## Data Sources

### Primary Source of Truth
`src/data/*.json` - Canonical track and collection metadata snapshots

### Documentation
`docs/features/collections-system.md` - This file, comprehensive tracking

### Audio Files
`Cloudflare R2 (metadj-nexus-media bucket)` - MP3 files for all tracks

### Storage Reference
`docs/MEDIA-STORAGE.md` - R2 configuration and directory structure

### Artwork
`public/images/` - Collection and track artwork

## Future Enhancements

### Planned Metadata Additions
- Waveform data for visualization
- ISRC codes for tracks
- Contributor credits
- Lyrics/composition notes
- Remix/version tracking

### Collection Features
- Multi-artist collections
- Collaborative releases
- Live set recordings
- Seasonal compilations

## Maintenance Schedule

- **Weekly**: Verify all audio files are accessible
- **Monthly**: Audit metadata accuracy
- **Per Release**: Update documentation immediately
- **Quarterly**: Review and refine genre taxonomy

---

*This document is the authoritative reference for all collection metadata. Keep it updated with every change to maintain accuracy.*
