# Hub System

> **Platform‑level home surface for MetaDJ Nexus**

**Last Modified**: 2026-01-26 14:05 EST
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
   - Glass-neon hero matching the User Guide overlay aesthetic.
   - Headline: **"Explore MetaDJ's Imagination"** — emphasizes the human creative origin behind the platform, aligning with Zuberant's philosophy that "humans conduct meaning."
   - Subheadline: "Collections-first listening, guided by human vision and AI"
   - Primary CTA: **Enter Cinema** (launches "Cinematic Listening": starts the hero track and opens Cinema).
   - Secondary CTA: **Chat with MetaDJai** (opens MetaDJai chat panel).

2. **Quick Start Checklist** (Mobile)
   - Mobile-only checklist that tracks first-time actions (play a track, open Cinema, open Wisdom, open MetaDJai).
   - Persists progress in localStorage and can be dismissed once the user is oriented.

3. **Wisdom Spotlight** (Conditional)
   - Static teaser cards for Thoughts, Guides, and Reflections with icon + title inline design, displayed as a 3-column grid on larger screens.
   - Cards are clickable to open Wisdom; no separate "Open Wisdom" header button.
   - Designed to make Wisdom feel present on the home surface with minimal chrome.

4. **Platform Pulse**
   - Public Preview reminder (shared copy with the User Guide) + latest platform updates.
   - Enhanced gradient styling (gradient background, badge, bullet points, titles).
   - No header button — updates are self-contained.

5. **News**
   - Curated MetaDJ Nexus notes when available.
   - Empty state displays "Feature in Development" pill with guidance to check Platform Pulse.
   - Data source: `src/data/hubHighlights.ts`

6. **Events**
   - Upcoming MetaDJ Live moments (when scheduled).
   - Empty state displays "Feature in Development" pill with message: "Live events and community moments coming soon."

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
- **Storage**: PostgreSQL via `/api/auth/recently-played` with localStorage fallback

### Data Flow

```
currentTrack changes → useRecentlyPlayed hook → /api/auth/recently-played sync (if authenticated)
                                              → localStorage backup
                                              → Music panel (BrowseView + CollectionDetailView)
```

## Roadmap: Continue Reading

A future enhancement for the Hub Wisdom Spotlight section:

- **Continue Reading** section would display the 3 most recently viewed Wisdom items across all categories
- Uses `useContinueReadingList()` hook (already implemented in `src/hooks/wisdom/use-continue-reading.ts`)
- Items stored in localStorage (`metadj_wisdom_continue_reading`) as JSON array with deduplication by section+id
- Would appear below the Featured cards, with newest views replacing oldest entries
- Tabled to keep the Hub layout compact and avoid scrolling in MVP

## Long‑Term Evolution: AI‑Driven Journeys

Guided journeys are intentionally human‑curated in MVP. Long‑term, we can layer AI‑driven personalization without changing the Hub's core shape:

- **MetaDJai proposes a next journey** based on listening history + time of day.
- **"State check" micro‑prompt** ("what are you building right now?") to steer a set.
- **Adaptive arcs**: Odyssey can branch (music → Cinema → Wisdom → AI) based on user intent.
- **Gentle, non‑prescriptive tone**: AI suggests; listener conducts meaning.

This stays a roadmap layer until enough usage data exists to make personalization real instead of performative.
