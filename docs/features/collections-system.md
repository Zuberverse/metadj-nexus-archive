# Collections System Documentation

> **Comprehensive collection tracking and metadata management for MetaDJ Nexus**

**Last Modified**: 2025-12-22 19:12 EST
## Overview

The Collections system is the official organizational structure for MetaDJ Nexus, grouping tracks into cohesive units that can represent either full-length collections or curated singles collections. This document serves as the canonical reference for all collection metadata, tracking standards, and update procedures.

> **UI Reference (v0.8.1+)**: Collections are surfaced through the Left Panel browse experience (`BrowseView.tsx` + `CollectionDetailView.tsx`). The prior `CollectionTabs`/`CollectionManager` UI has been removed; sections below describing that dropdown are retained for historical context until refreshed.

## Collection Types

### Full-Length Collections
Official cohesive works released as complete collections with intentional track ordering and thematic unity.

**Characteristics:**
- `type: "collection"` in collection metadata
- Intentional track sequencing
- Unified artistic vision
- Released as complete work

### Singles Collections
Curated groupings of individual tracks that may not have been released together as a cohesive full-length collection.

**Characteristics:**
- `type: "singles"` in collection metadata
- Tracks may span different release periods
- Flexible ordering
- Organized for browsing convenience

## Metadata Standards

### Collection Metadata Fields

```typescript
interface Collection {
  id: string;              // Kebab-case identifier (e.g., "majestic-ascent")
  title: string;           // Display title (e.g., "Majestic Ascent")
  artist: string;          // Always "MetaDJ" for this platform
  type: "collection" | "singles"; // Collection type classification
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

> **Internal Release Structure**
>
> Collections can be issued in numbered parts (e.g., "Majestic Ascent" Part 1, "Bridging Reality" Part 1). The public radio only references the base collection name while internal docs and filename templates retain part indicators.

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
    - **Bridging Reality**: Deep Blue/Indigo glow (`shadow-blue-600/25`)
    - **Metaverse Revelation**: Cyan/Electric Blue glow (`shadow-cyan-500/25`)
    - **Transformer**: Emerald/Teal glow (`shadow-emerald-500/25`)
    - **Featured**: Indigo/Blue glow (`shadow-indigo-500/25`)
  - This applies to the Hub, Left Panel browsing, and Wisdom sections (mapped to collection themes).

**Narrative System**:
- `COLLECTION_NARRATIVES` (`src/data/collection-narratives.ts`) stores `heading`, `subtitle`, and `paragraphs`.
- The Left Panel uses these narratives to power **About Collection** (non‑Featured collections) and for consistent catalog context across the app.

### Asset Strategy
- Streaming assets live in Replit App Storage at `audio-files/<collection>/NN - Track Title - Mastered v0.mp3` (or `Track Title - Mastered v0.mp3` for Metaverse Revelation), accessed in-app via `/api/audio/<collection>/...`; the same MP3 music files stay archived offline.
- Collection artwork syncs with each release's palette: Majestic Ascent leans portal magenta/purple gradients, while Bridging Reality highlights cyan/blue circuitry to mirror tab styling.
```

> **Implementation Note**
>
> The canonical data lives in `src/data/collections.json` and `src/data/tracks.json`.
> These JSON snapshots are loaded through the domain helpers in `src/lib/music/`,
> which exposes repository functions (`getTracksByCollection`, `getMusicService`, etc.)
> used throughout the app. Swap the repository implementation when Neon comes online
> without touching consuming components.

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

## Current Collections

### Majestic Ascent (Collection — Part 1)

**Collection Metadata:**
- **ID**: `majestic-ascent`
- **Title**: Majestic Ascent
- **Artist**: MetaDJ
- **Type**: Collection (public) / Part 1 (internal)
- **Release Date**: 2025-10-04
- **Track Count**: 20
- **Description**: Epic debut collection featuring orchestral, cinematic, and electronic fusion.
- **Artwork**: `/images/majestic-ascent-collection.svg` (cosmic mountain motif with vertical light beams)

**Track Listing:**

| # | ID | Title | Duration | BPM | Key | Genres |
|---|---|---|---|---|---|---|
| 1 | metadj-001 | Majestic Ascent | 5:05 (305s) | 120 | C major | Retro Future, Techno |
| 2 | metadj-002 | Convergence | 7:16 (436s) | — | — | Retro Future, Techno |
| 3 | metadj-003 | Future's Grace | 3:04 (184s) | — | — | Retro Future, Techno |
| 4 | metadj-004 | Synthetic Emergence | 4:02 (242s) | — | — | Retro Future, Techno |
| 5 | metadj-022 | Infinite Spark | 5:24 (324s) | — | — | Retro Future, Techno |
| 6 | metadj-023 | Boss Battle | 5:56 (356s) | 140 | D minor | Retro Future, Techno |
| 7 | metadj-024 | Adrenaline | 4:06 (246s) | — | — | Retro Future, Techno |
| 8 | metadj-025 | Artificial Turbulence | 3:25 (205s) | — | — | Retro Future, Techno |
| 9 | metadj-026 | Quantum Cathedral | 5:23 (323s) | — | — | Retro Future, Techno |
| 10 | metadj-027 | Cybernetic Evolution | 5:38 (338s) | — | — | Retro Future, Techno |
| 11 | metadj-028 | Vortex | 4:15 (255s) | — | — | Retro Future, Techno |
| 12 | metadj-029 | Side Scroller | 3:32 (212s) | — | — | Retro Future, Techno |
| 13 | metadj-030 | Sonic Storm | 3:00 (180s) | — | — | Retro Future, Techno |
| 14 | metadj-031 | Level Up | 3:51 (231s) | — | — | Retro Future, Techno |
| 15 | metadj-032 | Digital Phantom | 3:07 (187s) | — | — | Retro Future, Techno |
| 16 | metadj-033 | Euphoric Vision | 3:00 (180s) | — | — | Retro Future, Techno |
| 17 | metadj-034 | Electric Horizon | 3:24 (204s) | — | — | Retro Future, Techno |
| 18 | metadj-035 | Portal to Infinity | 4:16 (256s) | — | — | Retro Future, Techno |
| 19 | metadj-036 | Virtual Awakening | 4:54 (294s) | — | — | Retro Future, Techno |
| 20 | metadj-037 | Day Dreaming | 3:02 (182s) | — | — | Retro Future, Techno |
| 21 | metadj-038 | Strollin Through Paradise | 5:10 (310s) | — | — | Retro Future, Techno |
| 22 | metadj-039 | The Minotaur's Dance | 2:11 (131s) | — | — | Retro Future, Techno |
| 23 | metadj-005 | Transformer | 3:00 (180s) | — | — | Retro Future, Techno |
| 24 | metadj-006 | Metamorphosis | 3:00 (180s) | — | — | Retro Future, Techno |
| 25 | metadj-007 | Adventurous Exciting Spooky Futuristic Tuba Synth Techno | 3:00 (180s) | — | — | Retro Future, Techno |
| 26 | metadj-008 | Heartbeat | 3:00 (180s) | — | — | Retro Future, Techno |
| 27 | metadj-009 | After Hours | 3:00 (180s) | — | — | Retro Future, Techno |
| 28 | metadj-010 | Electric Night Fever | 3:00 (180s) | — | — | Retro Future, Techno |
| 29 | metadj-011 | Burnout | 3:00 (180s) | — | — | Retro Future, Techno |
| 30 | metadj-012 | Insanity | 3:00 (180s) | — | — | Retro Future, Techno |
| 31 | metadj-013 | System Crash | 3:00 (180s) | — | — | Retro Future, Techno |
| 32 | metadj-014 | Lucid | 3:00 (180s) | — | — | Retro Future, Techno |
| 33 | metadj-015 | Glitched | 3:00 (180s) | — | — | Retro Future, Techno |
| 34 | metadj-016 | Ripple | 3:00 (180s) | — | — | Retro Future, Techno |
| 35 | metadj-017 | Techtonic | 3:00 (180s) | — | — | Retro Future, Techno |
| 36 | metadj-018 | Epic Harpsichord Electro Insanity | 3:00 (180s) | — | — | Retro Future, Techno |
| 37 | metadj-019 | Insane | 3:00 (180s) | — | — | Retro Future, Techno |
| 38 | metadj-020 | Electric Blue | 3:00 (180s) | — | — | Retro Future, Techno |
| 39 | metadj-021 | Epic Violin Electro Insanity | 3:00 (180s) | — | — | Retro Future, Techno |

> **Note**: Track order updated 2025-12-08. Infinite Spark through Digital Phantom moved forward (positions 5-15), followed by Euphoric Vision through The Minotaur's Dance (positions 16-22), with Transformer through Epic Violin moved to end (positions 23-39).

**Notes:**
- Mastered MP3s stay in the offline archive; streaming copies live in App Storage at `audio-files/majestic-ascent/NN - Track Title - Mastered v0.mp3`.
- Public UI omits "Part 1"; part indicators remain internal for file naming and cataloging.
- BPM and key data being gradually added as analysis is completed.

### Bridging Reality (Collection — Part 1)

**Collection Metadata:**
- **ID**: `bridging-reality`
- **Title**: Bridging Reality
- **Artist**: MetaDJ
- **Type**: Collection (public) / Part 1 (internal)
- **Release Date**: 2025-10-04
- **Track Count**: 20
- **Description**: High-energy Metaverse anthems that bridge physical club energy with cinematic, future-forward storytelling.
- **Artwork**: `/images/bridging-reality-collection.svg` (digital bridge connecting dual worlds)

**Track Listing:**

| # | ID | Title | Duration |
|---|----|-------|----------|
| 1 | br-001 | The Evolution of AI | 3:22 |
| 2 | br-002 | Rise of the New Dawn | 3:14 |
| 3 | br-003 | Protocol of Joy | 3:37 |
| 4 | br-004 | I Am Artificial | 3:35 |
| 5 | br-005 | Metaversal Odyssey | 4:27 |
| 6 | br-006 | Metaverse Movement | 3:30 |
| 7 | br-007 | Rave in the Matrix | 2:54 |
| 8 | br-008 | Metaverse Is Here | 2:33 |
| 9 | br-009 | Be Who You Want To Be | 2:29 |
| 10 | br-010 | In the Metaverse | 2:44 |
| 11 | br-011 | New Universe | 2:25 |
| 12 | br-012 | Pinch to Zoom | 2:33 |
| 13 | br-013 | Future Superstars | 2:00 |
| 14 | br-014 | Are You Ready | 3:49 |
| 15 | br-015 | Amplify | 3:03 |
| 16 | br-016 | Unlock Your Inner Creator | 3:24 |
| 17 | br-017 | Magic of the Metaverse | 4:46 |
| 18 | br-018 | We Unite the Nation with the Metaverse | 3:25 |
| 19 | br-019 | Metaverse Nation | 2:12 |
| 20 | br-020 | Next Frontier | 2:58 |

**Notes:**
- MP3 files live in `~/MusicArchive/Bridging Reality Pt1/`; streaming copies live in App Storage at `audio-files/bridging-reality/NN - Track Title - Mastered v0.mp3`.
- Public metadata omits "Part 1"; keep the catalog consistent when future parts release (`br-021+`).
- Genres in `src/data/tracks.json` use the 2-tag convention: primary vibe first, "Techno" second.

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

1. **Upload Audio Files** to App Storage
   ```bash
   # Using Replit CLI helper or SDK script
  replit storage upload audio-files/<collection>/track-name.mp3 ./music-library/<collection>/track-name.mp3
   ```

2. **Extract Metadata**:
   ```bash
  # Get duration (run against the local MP3)
  ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ./music-library/<collection>/track-name.mp3

   # Get BPM (if tagged)
  ffprobe -v error -show_entries format_tags=BPM -of default=noprint_wrappers=1:nokey=1 ./music-library/<collection>/track-name.mp3
   ```

3. **Add Track Entry** to `src/data/tracks.json`:
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

1. **Update in `src/data/tracks.json`**
2. **Update Documentation** in this file
3. **Commit**: `fix: Update metadata for [Track Name]`

### Removing Tracks

1. **Remove from `src/data/tracks.json`**
2. **Update Collection** `trackCount`
3. **Update Documentation** (remove from table, adjust numbering)
4. **Archive Audio File** (remove from App Storage bucket, keep the local music file archived)
5. **Commit**: `refactor: Remove [Track Name] from [Collection Name]`

## Validation Checklist

Before finalizing collection updates:

- [ ] All track IDs are unique
- [ ] All track durations are accurate (in seconds)
- [ ] Genre tags use 2-tag convention (Primary, Techno)
- [ ] Audio files exist at specified paths
- [ ] Collection `trackCount` matches actual track count
- [ ] Track order matches intended sequence
- [ ] Documentation updated with all changes
- [ ] Git commit follows naming convention

## Data Sources

### Primary Source of Truth
`src/data/*.json` - Canonical track and collection metadata snapshots

### Documentation
`3-projects/5-software/metadj-nexus/docs/features/collections-system.md` - This file, comprehensive tracking

### Audio Files
`App Storage (audio-files bucket)` - MP3 files for all tracks

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
