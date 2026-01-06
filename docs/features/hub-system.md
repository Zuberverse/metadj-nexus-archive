# Hub System

> **Platform‑level home surface for MetaDJ Nexus**

**Last Modified**: 2026-01-05 20:30 EST
**Status**: Active (Hero + Wisdom Spotlight + Platform Pulse).

## Overview

The Hub is the front door for MetaDJ Nexus. It's not a redundant music browser — the detailed music catalog lives in the Left Panel. The Hub's job is to:

- **Guide entry** into the four core experiences (Music, Cinema, Wisdom, MetaDJai).
- **Frame the platform** as a living creative space (Public Preview status, recent updates).
- **Keep momentum**: one click should start a real journey, not a menu hunt.

Current implementation lives in:

- `src/components/hub/HubExperience.tsx`

## Current Hub Layout

Order matters; it matches the intended "discover → engage → deepen" rhythm.

1. **Hero**
   - Glass‑neon hero matching Welcome Overlay aesthetic.
   - Headline: **"Explore MetaDJ's Imagination"** — emphasizes the human creative origin behind the platform, aligning with Zuberant's philosophy that "humans conduct meaning."
   - Subheadline: "Where human vision meets AI-driven creation"
   - Primary CTA: **Enter Cinema** (launches "Cinematic Listening": starts the hero track and opens Cinema).
   - Secondary CTA: **Chat with MetaDJai** (opens MetaDJai chat panel).

2. **Wisdom Spotlight** (Conditional)
   - Teaser cards for Thoughts, Guides, Reflections with icon + title inline design.
   - Cards are clickable to open Wisdom; no separate "Open Wisdom" header button.
   - Designed to make Wisdom feel present on the home surface with minimal chrome.

3. **Platform Pulse**
   - Public Preview reminder (shared copy with the User Guide) + latest platform updates.
   - Enhanced gradient styling (gradient background, badge, bullet points, titles).
   - No header button — updates are self-contained.

## Hero Track / Odyssey Anchor

The hero journey uses a single anchor track:

- `HUB_HERO_TRACK_ID` in `src/lib/app.constants.ts`
  - currently pinned to **Majestic Ascent** (`metadj-001`), the title track from the Majestic Ascent collection.
  - chosen because it's an uplifting opener that pairs well with the "enter cinema / start exploring" intent.
  - can be rotated seasonally without editing Hub components.

## Wisdom Spotlight

Spotlight cards are derived from already‑loaded wisdom data:

- `wisdomSpotlight` is assembled in `HomePageClient` from:
  - `wisdomData.thoughts[0]`
  - `wisdomData.guides[0]`
  - `wisdomData.reflections[0]`

Spotlight cards currently open the Wisdom dashboard (state-driven view inside `/`).

## Platform Pulse

Updates are a small curated array:

- Data: `src/data/platformUpdates.ts`
- Surface: `HubExperience` renders top 3 entries.

This keeps the platform "alive" without introducing a CMS dependency.

## Recently Played (Music Panel)

Recently Played moved out of the Hub and into the Music panel Library as a pinned collection under Featured. It keeps the Hub focused on “entry + guidance” while still giving you instant session continuity.

### Implementation

- **Hook**: `src/hooks/use-recently-played.ts`
- **Library entry**: `src/components/panels/left-panel/BrowseView.tsx` (pinned under Featured)
- **Detail view**: `src/components/panels/left-panel/LeftPanel.tsx` + `CollectionDetailView`
- **ID**: `RECENTLY_PLAYED_COLLECTION_ID` (`recently-played`)
- **Max items**: 50 (`RECENTLY_PLAYED_MAX_ITEMS`)
- **Storage**: `STORAGE_KEYS.RECENTLY_PLAYED` (localStorage)

### Data Flow

```
currentTrack changes → useRecentlyPlayed hook → localStorage update
                                              → Music panel (BrowseView + CollectionDetailView)
```

## Long‑Term Evolution: AI‑Driven Journeys

Guided journeys are intentionally human‑curated in MVP. Long‑term, we can layer AI‑driven personalization without changing the Hub's core shape:

- **MetaDJai proposes a next journey** based on listening history + time of day.
- **"State check" micro‑prompt** ("what are you building right now?") to steer a set.
- **Adaptive arcs**: Odyssey can branch (music → Cinema → Wisdom → AI) based on user intent.
- **Gentle, non‑prescriptive tone**: AI suggests; listener conducts meaning.

This stays a roadmap layer until enough usage data exists to make personalization real instead of performative.
