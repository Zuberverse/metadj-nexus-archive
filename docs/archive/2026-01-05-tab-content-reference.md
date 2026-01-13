# Tab Content Reference

> **Complete track listings and ordering for all navigation tabs**

**Last Modified**: 2026-01-13 14:10 EST
*Version: 0.71*

## Overview

This document is the canonical source for collection ordering, featured selections, and search behaviour inside MetaDJ Nexus. Track metadata originates from `src/data/tracks.json`; update that file first, then refresh the ordering rules here.

> **Note**: The gradient tab rail has been archived. The active UI now uses the Music panel Library (Left Panel) for browsing Featured and collections, but the ordering and metadata in this reference still power the cards and lists.

## Search Functionality

**Track + Collection Search** — Search results are shown in a dropdown (not a full-screen overlay) and work from any tab:
- **Surfaces**: Desktop header playback pill (Search dropdown), Music panel Library (SearchBar above Featured), and mobile header (inline SearchBar).
- **Minimum Query Length**: 1+ characters (clearing the query exits search mode)
- **Scope**:
  - **Tracks**: Title only (case-insensitive)
  - **Collections**: Title only (case-insensitive)
  - Does not search artist names, genre tags, or descriptions
- **Relevance Scoring**: Results are sorted by relevance:
  1. Exact matches (Title)
  2. Prefix matches (Starts with...)
  3. Word boundary matches (e.g. "Battle" in "Boss Battle")
  4. General containment
- Real-time filtering with result count and keyboard navigation
- Dropdown stays usable above the Cinema/Visual Console so crate digging continues while visuals run
- “Add to Queue” actions use the same queue controls as track listings

## Tab 1: Featured (Default)

**Purpose**: Curated landing experience showcasing the best of MetaDJ  
**Track Count**: 20 (typical)  
**Ordering**: Hand-picked curation in fixed order; count can flex per campaign

| # | Title (ID) | Collection | Notes |
|---|------------|------------|-------|
| 1 | Metaversal Odyssey (br-005) | Bridging Reality | Anthemic bridge between eras |
| 2 | Side Scroller (metadj-012) | Majestic Ascent | Neon arcade energy |
| 3 | Transformer (tf-002) | Transformer | Shape-shifting techno grit |
| 4 | Boss Battle (metadj-006) | Majestic Ascent | Cinematic climax |
| 5 | Are You Ready (br-016) | Bridging Reality | Call-to-action pulse |
| 6 | Metamorphosis (tf-003) | Transformer | Evolution-in-progress groove |
| 7 | Be Who You Want To Be (br-009) | Bridging Reality | Identity liberation |
| 8 | I Met a DJ (br-011) | Bridging Reality | Serendipitous spark |
| 9 | New Universe (br-012) | Bridging Reality | Hopeful expansion |
| 10 | Sonic Storm (tf-005) | Transformer | Storm-chasing intensity |
| 11 | Unlock Your Inner Creator (br-018) | Bridging Reality | Creative activation |
| 12 | Infinite Spark (metadj-005) | Majestic Ascent | Momentum ignition |
| 13 | Digital Phantom (metadj-014) | Majestic Ascent | Ghost-in-the-machine mystery |
| 14 | Cybernetic Evolution (metadj-010) | Majestic Ascent | Chrome-plated progress |
| 15 | Electric Horizon (metadj-015) | Majestic Ascent | Wide-screen glow |
| 16 | Day Dreaming (metadj-018) | Majestic Ascent | Floating reset |
| 17 | Rise of the New Dawn (br-001) | Bridging Reality | Opening salvo |
| 18 | We Unite the Nation with the Metaverse (br-020) | Bridging Reality | Movement anthem |
| 19 | Ripple (tf-001) | Transformer | Liquid prelude to the build |
| 20 | Techntonic (tf-004) | Transformer | Earth-shaking drop science |

**Collection Badges**: ✅ Shown  
**Shuffle Behaviour**: Keeps curated order when shuffle is off; shuffle randomises but pins the currently playing track  
**Narrative Block**: Highlights the MetaDJ sonic mission and why each selection appears

> **Rotation Guide**: FEATURED_TRACK_IDS is curated manually—aim for ~20 tracks per campaign, but the array can shrink or expand when storytelling requires it.

## Tab 2: Majestic Ascent

**Purpose**: Full Majestic Ascent collection in release order  
**Track Count**: 20  
**Ordering**: Sequential collection order

| # | Title | ID | Duration |
|---|-------|----|----------|
| 1 | Majestic Ascent | metadj-001 | 5:05 |
| 2 | Convergence | metadj-002 | 7:16 |
| 3 | Future's Grace | metadj-003 | 3:04 |
| 4 | Synthetic Emergence | metadj-004 | 4:02 |
| 5 | Infinite Spark | metadj-005 | 5:24 |
| 6 | Boss Battle | metadj-006 | 5:56 |
| 7 | Adrenaline | metadj-007 | 4:06 |
| 8 | Artificial Turbulence | metadj-008 | 3:25 |
| 9 | Quantum Cathedral | metadj-009 | 5:23 |
| 10 | Cybernetic Evolution | metadj-010 | 5:38 |
| 11 | Vortex | metadj-011 | 4:15 |
| 12 | Side Scroller | metadj-012 | 3:32 |
| 13 | Level Up | metadj-013 | 3:51 |
| 14 | Digital Phantom | metadj-014 | 3:07 |
| 15 | Electric Horizon | metadj-015 | 3:24 |
| 16 | Portal to Infinity | metadj-016 | 4:16 |
| 17 | Virtual Awakening | metadj-017 | 4:54 |
| 18 | Day Dreaming | metadj-018 | 3:02 |
| 19 | Strollin Through Paradise | metadj-019 | 5:10 |
| 20 | The Minotaur's Dance | metadj-020 | 2:11 |

**Collection Badges**: ✅ Shown  
**Narrative Block**: Majestic portal manifesto

## Tab 3: Bridging Reality

**Purpose**: Full Bridging Reality collection in release order  
**Track Count**: 20  
**Ordering**: Sequential collection order

| # | Title | ID | Duration |
|---|-------|----|----------|
| 1 | The Evolution of AI | br-001 | 3:22 |
| 2 | Rise of the New Dawn | br-002 | 3:14 |
| 3 | Protocol of Joy | br-003 | 3:37 |
| 4 | I Am Artificial | br-004 | 3:35 |
| 5 | Metaversal Odyssey | br-005 | 4:27 |
| 6 | Metaverse Movement | br-006 | 3:30 |
| 7 | Rave in the Matrix | br-007 | 2:54 |
| 8 | Metaverse Is Here | br-008 | 2:33 |
| 9 | Be Who You Want To Be | br-009 | 2:29 |
| 10 | Wake Up in the Metaverse | br-010 | 2:44 |
| 11 | New Universe | br-011 | 2:25 |
| 12 | Pinch to Zoom | br-012 | 2:33 |
| 13 | Future Superstars | br-013 | 2:00 |
| 14 | Are You Ready | br-014 | 3:49 |
| 15 | Amplify | br-015 | 3:03 |
| 16 | Unlock Your Inner Creator | br-016 | 3:24 |
| 17 | Magic of the Metaverse | br-017 | 4:46 |
| 18 | We Unite the Nation with the Metaverse | br-018 | 3:25 |
| 19 | Metaverse Nation | br-019 | 2:12 |
| 20 | Next Frontier | br-020 | 2:58 |

**Collection Badges**: ✅ Shown  
**Narrative Block**: Metaverse manifesto emphasising unity and empowerment

## Tab 4: Metaverse Revelation

**Purpose**: Full Metaverse Revelation collection in release order  
**Track Count**: 11  
**Ordering**: Sequential release order

| # | Title | ID | Duration |
|---|-------|----|----------|
| 1 | Beyond the Stars | zv-001 | 5:28 |
| 2 | Cosmic Rendezvous | zv-002 | 3:00 |
| 3 | Dreaming of a World | zv-003 | 2:30 |
| 4 | Embrace the Moment | zv-004 | 3:35 |
| 5 | In the Metaverse | zv-005 | 3:16 |
| 6 | Metaverse Revelation | zv-006 | 3:09 |
| 7 | Metaverse Revelation | zv-007 | 4:01 |
| 8 | Techno Dreams | zv-008 | 3:25 |
| 9 | Vibe Coder | zv-009 | 3:15 |
| 10 | We Are the Creators | zv-010 | 3:03 |
| 11 | Welcome to Metaverse Revelation | zv-011 | 4:10 |

**Collection Badges**: ✅ Shown  
**Narrative Block**: Creative empowerment through AI-accelerated storytelling

## Tab 5: Transformer

**Purpose**: Preview the in-progress Transformer collection  
**Track Count**: 5 (placeholder metadata)  
**Ordering**: Sequential placeholder order

| # | Title | ID | Duration |
|---|-------|----|----------|
| 1 | Track 1 | tf-001 | 3:00 |
| 2 | Track 2 | tf-002 | 3:00 |
| 3 | Track 3 | tf-003 | 3:00 |
| 4 | Track 4 | tf-004 | 3:00 |
| 5 | Track 5 | tf-005 | 3:00 |

**Collection Badges**: ✅ Shown  
**Narrative Block**: Sets expectation that polished music uploads will replace placeholders once the files finish processing

## Implementation Notes

### Featured Tab Logic
```typescript
const featuredTracks = featuredTrackIds
  .map((id) => tracks.find((track) => track.id === id))
  .filter((track): track is Track => Boolean(track));
```

### Collection Filtering
```typescript
import { filterTracks } from "@/lib/music/filters";

const filteredTracks = filterTracks(allTracks, searchQuery, selectedCollectionId, getTracksByCollection);
```

`filterTracks` matches track titles by prefix and falls back to collection ordering when no search query is active.

## Badge Display Rules

All navigation tabs display collection badges for consistent visual identity.

| Tab | Tab Gradient | Badge Gradient | Purpose |
|-----|--------------|----------------|---------|
| Featured | #5F6CFF → #38D4FF → #A250FF | Matches source collection | Curated spotlight |
| Majestic Ascent | #A250FF → #C079FF → #FF8FD1 | Same as tab | Majestic portal identity |
| Bridging Reality | #1D4ED8 → #2E3FA5 → #1A2C6A | Same as tab | Futuristic Metaverse tone |
| Metaverse Revelation | #0C9CCF → #0B6AA0 → #0A3B61 | Same as tab | Creative empowerment |
| Transformer | #11CFA7 → #0F9E78 → #0A5B46 | Same as tab | Transformation energy |

## Maintenance Checklist

1. Update `tracks.json` and `collections.json` first (IDs, order, counts).  
2. Refresh featured ordering and track tables here.  
3. Re-run analytics docs if tab structure changes (collection events reference IDs).  
4. Increment the “Last Modified” timestamp and version when the tab system materially changes.

## Related Documentation

- [collections-system.md](../features/collections-system.md) — Collection metadata standards  
- [audio-player-standards.md](../features/audio-player-standards.md) — Player implementation  
- [../architecture/data-architecture.md](../architecture/data-architecture.md) — Data layer architecture  
- [../../README.md](../../README.md) — Project overview
