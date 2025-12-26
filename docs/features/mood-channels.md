# Mood Channels Feature Specification

> **Curated listening experiences based on mood and activity states**

**Last Modified**: 2025-12-22 19:12 EST
**Status**: GATED (Left Panel only, behind feature flag)
**Feature Flag**: `FEATURE_MOOD_CHANNELS` gates the Left Panel list (`src/lib/app.constants.ts`)

---

## Feature Status (Current)

Mood Channels are currently **gated behind the `FEATURE_MOOD_CHANNELS` feature flag**. The Left Panel Mood Channel list will be enabled when the catalog is broad enough to make channel browsing feel distinct.

**To enable the Left Panel list**:
1. Set `FEATURE_MOOD_CHANNELS = true` in `src/lib/app.constants.ts`
2. The Library tab will render Mood Channels under Collections (`BrowseView.tsx`).

**Code Preserved In**:
- `src/data/moodChannels.ts` — Channel definitions and filtering logic
- `src/hooks/home/use-hub-playback.ts` — Playback integration
- `src/components/panels/left-panel/BrowseView.tsx` — Left panel integration
- `src/components/panels/left-panel/MoodChannelDetailView.tsx` — Left panel channel detail
- `src/components/mood/MoodChannelIcons.tsx` — Mood channel icons (Left Panel)
- `src/components/mood/MoodChannelRail.tsx` — Archived Hub grid (currently unused)

---

## Overview

Mood Channels are curated listening experiences that filter and organize MetaDJ's music catalog based on mood, energy level, and activity context. Rather than browsing by collection or genre, users select a channel that matches their current state—whether they need focus for work, energy for a workout, or creative flow for ideation.

Each channel represents a **sonic journey** designed for a specific context, intelligently selecting and ordering tracks based on BPM, genre, collection affinity, and energy level.

### Design Philosophy

Mood Channels embody MetaDJ's approach to intelligent curation:
- **Context-aware**: Music adapts to what the listener needs right now
- **Algorithmically curated**: Track selection uses weighted scoring across multiple criteria
- **Visually coherent**: Each channel has distinct visual identity within brand guidelines
- **Non-prescriptive**: Channels surface music, but listeners remain in control

## Available Channels

### Deep Reflection

**Purpose**: Stillness with gravity — and a clean entry into **Majestic Ascent**.

| Property | Value |
|----------|-------|
| ID | `deep-focus` |
| Energy Level | 4/10 |
| BPM Range | 100-130 |
| Preferred Genres | Orchestral, Retro Future |
| Preferred Collections | Majestic Ascent |
| Visual Identity | Indigo to purple to violet gradient |
| Icon | Concentric circles (representing concentration) |

**Best For**: Work sessions, studying, reading, coding, administrative tasks.

### Energy Boost

**Purpose**: Forward motion — and a high‑energy entry into **Bridging Reality**.

| Property | Value |
|----------|-------|
| ID | `energy-boost` |
| Energy Level | 9/10 |
| BPM Range | 125-145 |
| Preferred Genres | Techno, EDM |
| Preferred Collections | Bridging Reality |
| Visual Identity | Fuchsia to purple to indigo gradient |
| Icon | Lightning bolt with motion lines |

**Best For**: Workouts, high-intensity tasks, overcoming creative blocks, energizing breaks.

### Creative Inspiration

**Purpose**: Spark the next idea — and open **Metaverse Revelation**.

| Property | Value |
|----------|-------|
| ID | `creative-flow` |
| Energy Level | 6/10 |
| BPM Range | 110-135 |
| Preferred Genres | Retro Future, Melodic Techno |
| Preferred Collections | Metaverse Revelation |
| Visual Identity | Cyan to blue to indigo gradient |
| Icon | Flowing wave with sparkle accent |

**Best For**: Brainstorming, creative projects, design work, writing, ideation sessions.

## User Experience

### Discovery Flow (Left Panel)

1. **Browse**: Users open the Music panel Library tab.
2. **Select Channel**: Users pick a mood channel from the channel list (when `FEATURE_MOOD_CHANNELS` is enabled).
3. **Preview**: The detail view shows matched tracks for that channel.
4. **Start**: Users can play the channel or select individual tracks.

### Visual Presentation

**Channel Cards (Left Panel)**:
- Glassmorphic cards with channel gradients and subtle glow on selection
- Name + description + energy metadata

**Detail View (Left Panel)**:
- Back navigation to browse view
- Channel info card with gradient, icon, description
- Scrollable track list with standard `TrackListItem` components
- Collection-aware hover styles on track items

### Interaction Patterns

| Action | Behavior |
|--------|----------|
| Click channel card | Queues all matching tracks, starts playback from first track |
| Click track in detail view | Plays that specific track, queues remainder |
| Add to queue | Individual tracks can be added to existing queue |
| Empty channel | Card shown disabled (50% opacity, cursor-not-allowed) |

## Technical Implementation

### Data Structure

```typescript
// src/data/moodChannels.ts

interface MoodChannel {
  id: string                    // Unique identifier (kebab-case)
  name: string                  // Display name
  description: string           // Brief description of the mood/use case
  gradient: string              // Tailwind gradient classes
  glowColor: string             // RGBA for hover/active glow effects
  bpmRange?: {                  // Optional BPM filtering
    min: number
    max: number
  }
  preferredGenres?: string[]    // Genre tags to prioritize
  preferredCollections?: string[] // Collection slugs to prioritize
  energyLevel: number           // 1-10 scale (1=calm, 10=high energy)
}
```

### Track Filtering Logic

The `getTracksForMoodChannel()` function uses a weighted scoring system:

```typescript
// Scoring weights:
// - BPM in range: +3 points
// - BPM within tolerance (+-10): +1 point
// - Each genre match: +2 points
// - Collection match: +4 points

// Tracks with score > 0 are included
```

**Tolerance**: BPM matching includes a 10 BPM tolerance outside the defined range to avoid edge cases where great tracks are excluded by 1-2 BPM.

### Track Sorting Logic

The `sortTracksByMoodRelevance()` function orders matched tracks:

1. **BPM proximity**: Tracks closer to the midpoint of the channel's BPM range rank higher
2. **Collection boost**: Tracks from preferred collections receive +5 score
3. **Result**: Higher-scoring tracks appear first in the channel's queue

### Component Architecture

```
src/
├── data/
│   └── moodChannels.ts          # Channel definitions, filtering/sorting logic
├── components/
│   ├── mood/
│   │   ├── MoodChannelIcons.tsx           # Custom SVG icons per channel
│   │   └── MoodChannelRail.tsx            # Archived Hub grid (currently unused)
│   └── panels/
│       └── left-panel/
│           ├── BrowseView.tsx             # Gated Mood Channel list (FEATURE_MOOD_CHANNELS)
│           └── MoodChannelDetailView.tsx  # Full track list view
```

### Integration Points

**Left Panel** (`LeftPanel.tsx`, `BrowseView.tsx`):
- Tracks selected mood channel state
- Renders the Mood Channel list only when `FEATURE_MOOD_CHANNELS` is enabled
- Renders `MoodChannelDetailView` when a channel is selected

**Playback Hook** (`use-hub-playback.ts`):
- Manages mood channel playback state
- Queues filtered/sorted tracks when a channel is activated

### Brand Color Guidelines

Mood Channels follow the canonical MetaDJ Visual System tokens (OKLCH + CSS vars). Prefer purple/indigo/cyan family gradients; avoid introducing arbitrary hues unless semantically required.

### Hover Styles

Each channel has a dedicated hover glow effect via `getMoodChannelHoverStyles()`:

```typescript
const styles: Record<string, string> = {
  "deep-focus": "hover:shadow-[var(--shadow-glow-purple)]",
  "energy-boost": "hover:shadow-[var(--shadow-glow-brand)]",
  "creative-flow": "hover:shadow-[var(--shadow-glow-cyan)]",
}
```

## Future Enhancements

### Planned Channels

Potential future mood channels to expand the system:

| Channel | Energy | Use Case |
|---------|--------|----------|
| Wind Down | 2/10 | Evening relaxation, pre-sleep |
| Morning Rise | 5/10 | Gentle energy to start the day |
| Social Vibes | 7/10 | Background for gatherings |
| Midnight Drive | 6/10 | Late-night contemplation |

### Feature Roadmap

**Near-term**:
- [ ] Persist last-used mood channel
- [ ] Add "Now Playing" indicator to active channel card
- [ ] Keyboard shortcut to cycle through channels

**Medium-term**:
- [ ] User-created custom mood channels
- [ ] Time-of-day automatic channel suggestions
- [ ] Integration with MetaDJai for conversational channel selection

**Long-term**:
- [ ] Machine learning for personalized track scoring
- [ ] Cross-session learning of user preferences per channel
- [ ] Collaborative filtering based on similar users

### Expansion Considerations

When adding new channels:
1. Ensure visual identity stays within brand palette
2. Create custom SVG icon that represents the mood
3. Define clear BPM range and energy level
4. Map to existing collections and genres
5. Write compelling, action-oriented description
6. Update this documentation

## Related Documentation

- [Collections System](./collections-system.md) — How tracks are organized into collections
- [Audio Player Standards](./audio-player-standards.md) — Playback implementation details
- [UI Visual System](./ui-visual-system.md) — Design tokens and visual standards
- [Panel System](./panel-system.md) — Left Panel architecture

---

*Mood Channels transform passive browsing into intentional listening, meeting users where they are and delivering the right sonic experience for their current context.*
