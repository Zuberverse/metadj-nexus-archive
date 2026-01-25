# Naming Conventions — MetaDJ Nexus

> **Canonical naming standards for consistent code organization**

**Last Modified**: 2026-01-24 01:00 EST
**Status**: Authoritative Standard

## Overview

This document establishes definitive naming conventions for MetaDJ Nexus. All new code must follow these standards, and existing code should be migrated during refactoring efforts.

## Critical Terminology Change

**"Modules" terminology is retired**. Use context-appropriate alternatives:

| Old Term | New Term | Usage Context |
|----------|----------|---------------|
| `module` | `feature` | Feature areas (Music, Cinema, Wisdom, AI) |
| `modules` | `features` | Collections of feature areas |
| `ModuleNavigation` | `FeatureNavigation` | Navigation between features |
| `MODULES` constant | `FEATURES` | Platform feature definitions |
| `MODULE_ROUTES` | `FEATURE_ROUTES` | Routing configuration |

**Rationale**: "Module" is overloaded (ES modules, npm modules, feature modules) and creates confusion. "Feature" clearly communicates user-facing application areas.

---

## File & Directory Naming

### Component Files

**Pattern**: `PascalCase.tsx` — **This is the standard**

React component files use PascalCase to match the component name they export. This follows React community conventions and enables instant recognition of component files.

```
Examples:
  AudioPlayer.tsx            ✓ Standard
  BrowseView.tsx             ✓ Standard
  CollectionDetailView.tsx   ✓ Standard
  FeatureNavigation.tsx      ✓ Standard
```

**Note**: The codebase consistently uses PascalCase for component files. This is intentional and aligns with React conventions where file names match component names.

### Utility Files

**Pattern**: `kebab-case.ts`

```
Examples:
  format-time.ts             (not: formatTime.ts)
  queue-persistence.ts       (not: queuePersistence.ts)
  app-version.ts             (not: appVersion.ts)
```

### Hook Files

**Pattern**: `use-kebab-case.ts`

```
Examples:
  use-audio-playback.ts      (not: useAudioPlayback.ts)
  use-keyboard-shortcuts.ts  (not: useKeyboardShortcuts.ts)
  use-cinema.ts              (not: useCinema.ts)
```

### Type Files

**Pattern**: `kebab-case.types.ts` or colocated in component files

```
Examples:
  metadjai.types.ts          (not: metadjai.ts for types-only file)
  player.types.ts            (not: playerTypes.ts)
```

### Constants Files

**Pattern**: `kebab-case.constants.ts`

```
Examples:
  app.constants.ts           (not: constants.ts - be specific)
  player.constants.ts        (not: playerConstants.ts)
```

### API Routes

**Pattern**: kebab-case folders with `route.ts`

```
Examples:
  /api/dna-analysis/route.ts      (not: /api/dnaAnalysis/)
  /api/audio/[...path]/route.ts   (not: /api/audio/[...Path]/)
  /api/metadjai/stream/route.ts   (OK - product name)
```

---

## Code Naming

### Components

**Pattern**: PascalCase

```typescript
// Correct
export function AudioPlayer() { ... }
export function TrackListItem() { ... }
export function FeatureNavigation() { ... }

// Incorrect
export function audioPlayer() { ... }
export function track_card() { ... }
```

### Functions

**Pattern**: camelCase (verb + noun)

```typescript
// Correct
function formatPlaylistDuration() { ... }
function calculateProgress() { ... }
function getActiveFeature() { ... }

// Incorrect
function FormatDuration() { ... }
function get_active_feature() { ... }
```

### Variables

**Pattern**: camelCase

```typescript
// Correct
const playlistData = [];
const currentTrackIndex = 0;
const isFeatureActive = true;

// Incorrect
const playlist_data = [];
const CurrentTrackIndex = 0;
```

### Constants

**Pattern**: SCREAMING_SNAKE_CASE

```typescript
// Correct
const MAX_PLAYLIST_SIZE = 100;
const ANIMATION_DURATION_MS = 300;
const FEATURE_ROUTES = { ... };

// Incorrect
const maxPlaylistSize = 100;
const animationDurationMs = 300;
```

### Types & Interfaces

**Pattern**: PascalCase with descriptive names

```typescript
// Correct
interface PlaylistTrack { ... }
interface DnaAnalysisResult { ... }
type FeatureType = 'music' | 'cinema' | 'wisdom';
type RepeatMode = 'none' | 'track' | 'queue';

// Incorrect
interface playlistTrack { ... }
interface IPlaylistTrack { ... }  // No "I" prefix
type playlist_track = { ... };
```

### Enums

**Pattern**: PascalCase name, SCREAMING_SNAKE_CASE values

```typescript
// Correct
enum PlaybackState {
  IDLE = 'idle',
  PLAYING = 'playing',
  PAUSED = 'paused',
  LOADING = 'loading',
}

// Incorrect
enum playbackState {
  idle = 'idle',
  playing = 'playing',
}
```

---

## Boolean Naming

### State & Variables

**Pattern**: `is/has/should/can` prefix

```typescript
// Correct
const isLoading = true;
const hasError = false;
const shouldAutoPlay = true;
const canSeek = true;
const isFeatureActive = false;

// Incorrect
const loading = true;
const error = false;
const autoPlay = true;
```

---

## Documentation Naming & Organization

**Root canonical docs** use UPPERCASE filenames for fast scanning and stable external links:
- `README.md`, `QUICKSTART.md`, `API.md`, `SECURITY.md`, `TESTING.md`, `KEYBOARD-SHORTCUTS.md`

**Category docs** use `kebab-case.md` inside their domain folders:
- `docs/architecture/`, `docs/features/`, `docs/operations/`, `docs/security/`, `docs/testing/`, `docs/reference/`, `docs/daydream/`

**Dated workflow logs** (roadmaps, audits, one‑off status updates) should not live in the repo long‑term. Capture learnings in active docs or `CHANGELOG.md`, then delete the log.

**Archive policy**: `docs/archive/` stays minimal and only holds long‑term reference material that is no longer maintained.

### Props

**Pattern**: Same `is/has/should/can` prefix

```typescript
// Correct
interface PlayerProps {
  isPlaying: boolean;
  hasTrack: boolean;
  shouldShowControls: boolean;
  canSkip: boolean;
}

// Incorrect
interface PlayerProps {
  playing: boolean;
  track: boolean;  // Ambiguous - is this the track object?
}
```

---

## Event Handlers

### Props (passed down)

**Pattern**: `on{Action}`

```typescript
// Correct
interface ButtonProps {
  onClick: () => void;
  onPlaylistCreate: () => void;
  onFeatureToggle: () => void;
}

// Incorrect
interface ButtonProps {
  handleClick: () => void;  // "handle" is for internal functions
  playlistCreate: () => void;
}
```

### Handler Functions (internal)

**Pattern**: `handle{Action}`

```typescript
// Correct
function handleClick() { ... }
function handlePlaylistCreate() { ... }
function handleFeatureToggle() { ... }

// Incorrect
function onClick() { ... }     // Reserved for props
function clickHandler() { ... } // Not verb-first
```

---

## API & Routes

### Endpoints

**Pattern**: kebab-case

```
Correct:
  /api/playlist-generator
  /api/dna-analysis
  /api/track-details

Incorrect:
  /api/playlistGenerator
  /api/DnaAnalysis
  /api/track_details
```

### Query Parameters

**Pattern**: camelCase

```
Correct:
  ?trackId=123
  ?playlistName=favorites
  ?isShuffled=true

Incorrect:
  ?track_id=123
  ?playlist-name=favorites
```

### Response Properties

**Pattern**: camelCase

```typescript
// Correct
{
  trackId: "123",
  playlistName: "My Playlist",
  totalDuration: 3600
}

// Incorrect
{
  track_id: "123",
  "playlist-name": "My Playlist"
}
```

---

## Directory Structure

### Component Directories

**Pattern**: kebab-case directories containing PascalCase component files

```
src/components/
  player/                 ✓ kebab-case directory
    AudioPlayer.tsx       ✓ PascalCase component file
    PlaybackControls.tsx  ✓ PascalCase component file
    VolumeControl.tsx     ✓ PascalCase component file
    index.ts              ✓ barrel export

  cinema/                 ✓ kebab-case directory
    CinemaOverlay.tsx     ✓ PascalCase component file
    VisualizerCinema.tsx  ✓ PascalCase component file
    visualizers/          ✓ kebab-case subdirectory
      Cosmos.tsx          ✓ PascalCase component file
    index.ts              ✓ barrel export
```

**Rationale**: Directory names use kebab-case for URL/filesystem support, while component files use PascalCase to match their exported component names (React convention).

### Feature Directories

**Pattern**: kebab-case feature names

```
src/app/
  app/            # protected experience shell (state-driven Hub/Cinema/Wisdom/Journal)
  admin/          # admin dashboard (protected)
  (experience)/   # share metadata routes (track/collection/playlist/wisdom)
  guide/
  terms/
  api/
```

---

## Import/Export Patterns

### Named Exports (Preferred)

```typescript
// EmptyState.tsx
export function EmptyState() { ... }
export interface EmptyStateProps { ... }

// Usage
import { EmptyState } from './EmptyState';
```

### Default Exports (Use Sparingly)

Only for page components required by Next.js:

```typescript
// app/page.tsx
export default function HomePage() { ... }
```

### Barrel Exports

```typescript
// components/player/index.ts
export { AudioPlayer } from './AudioPlayer';
export { PlaybackControls } from './PlaybackControls';
export { VolumeControl } from './VolumeControl';
export type { AudioPlayerProps } from './AudioPlayer';
```

---

## Context Naming

### Context Files

**Pattern**: `{Domain}Context.tsx`

```typescript
// Correct
PlayerContext.tsx
QueueContext.tsx
UIContext.tsx

// Keep existing PascalCase for context files (exception to file naming)
```

### Hook Exports

**Pattern**: `use{Domain}`

```typescript
// Correct
export const usePlayer = () => useContext(PlayerContext);
export const useQueue = () => useContext(QueueContext);
export const useUI = () => useContext(UIContext);
```

---

## CSS & Tailwind

### CSS Custom Properties

**Pattern**: kebab-case with semantic grouping

```css
/* Correct */
--color-primary: oklch(0.646 0.222 264.376);
--spacing-panel: 1rem;
--animation-duration: 300ms;

/* Incorrect */
--colorPrimary: ...;
--panelSpacing: ...;
```

### Tailwind Custom Classes

**Pattern**: kebab-case semantic names

```css
/* Correct */
.text-gradient-primary { ... }
.glass-card { ... }
.neon-glow { ... }

/* Incorrect */
.textGradientPrimary { ... }
.GlassCard { ... }
```

---

## Documentation Files

### Markdown Files

**Pattern**: SCREAMING-CASE or kebab-case

```
README.md                    (standard)
CHANGELOG.md                 (standard)
NAMING-CONVENTIONS.md        (standards doc)
feature-specification.md     (feature doc)
```

---

## ESLint Enforcement

### Current ESLint Configuration

The following rules are **actively enforced** via `eslint.config.mjs`:

```javascript
// Currently active rules
{
  rules: {
    // Basic camelCase enforcement for variables
    'camelcase': ['warn', {
      properties: 'never',
      ignoreDestructuring: false,
      ignoreImports: true,
      ignoreGlobals: true,
    }],

    // Import ordering (see Import Organization section)
    'import/order': ['warn', { /* ... */ }],
  },
}
```

### Limitation: @typescript-eslint/naming-convention

> **⚠️ Known Limitation**: The `@typescript-eslint/naming-convention` rule requires explicit TypeScript ESLint plugin setup that conflicts with Next.js flat config. This rule is **NOT currently enforced** via ESLint.

The comprehensive naming-convention rules shown below represent **ideal enforcement** but are currently enforced through **code review only**:

```javascript
// IDEAL RULES (not currently active due to Next.js flat config conflict)
// Enforce these conventions through code review
{
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      // Variables: camelCase
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        leadingUnderscore: 'allow',
      },
      // Functions: camelCase
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase'],
      },
      // Types/Interfaces: PascalCase
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      // Enum members: UPPER_CASE
      {
        selector: 'enumMember',
        format: ['UPPER_CASE'],
      },
      // Boolean variables: specific prefixes
      {
        selector: 'variable',
        types: ['boolean'],
        format: ['PascalCase'],
        prefix: ['is', 'has', 'should', 'can', 'will', 'did'],
      },
    ],
  },
}
```

### Enforcement Summary

| Convention | ESLint Enforced | Code Review |
|------------|-----------------|-------------|
| camelCase for variables | ✓ (warn) | ✓ |
| Import ordering | ✓ (warn) | ✓ |
| PascalCase for components | ✗ | ✓ |
| PascalCase for types | ✗ | ✓ |
| Boolean prefixes (is/has/should) | ✗ | ✓ |
| SCREAMING_SNAKE_CASE for constants | ✗ | ✓ |
| File naming conventions | ✗ | ✓ |

**Recommendation**: Until Next.js flat config supports `@typescript-eslint/naming-convention`, rely on:
1. This documentation as the source of truth
2. Code review to catch naming violations
3. The `camelcase` rule for basic variable naming

---

## Migration Notes

When refactoring existing code:

1. **Phase 1**: Rename files (most disruptive, do first)
2. **Phase 2**: Update imports across codebase
3. **Phase 3**: Rename code-level identifiers
4. **Phase 4**: Update documentation references

**Testing**: Run full test suite after each phase to catch broken references.

---

## Exceptions

### Product Names

Product names maintain their official casing:
- `MetaDJai` (not: meta-dj-ai)
- `MetaDJ Nexus` (not: MetaDJ All Access in UI)

### Third-Party Conventions

Follow library conventions for callbacks/interfaces they define:
- React: `onClick`, `onChange` (not: `onClickHandler`)
- Next.js: `page.tsx`, `layout.tsx` (framework requirement)

### Context Files

Context files use PascalCase to match React conventions:
- `PlayerContext.tsx` (not: player-context.tsx)
- `UIContext.tsx` (not: ui-context.tsx)

---

## Media Storage Naming

Media files in Cloudflare R2 storage follow a **hybrid convention** distinct from code naming:

| Element | Convention | Example |
|---------|------------|---------|
| **Directories** | Lowercase kebab-case | `music/majestic-ascent/` |
| **Audio files** | Title Case with spaces | `01 - Majestic Ascent (v0) - Mastered.mp3` |
| **Video files** | Title Case with spaces | `MetaDJ Performance Loop - MetaDJ Nexus.mp4` |

**Rationale:**
- **Directories** use kebab-case for URL-safe API paths without encoding
- **Filenames** use Title Case with spaces for human readability in storage browsers

Spaces in filenames are automatically URL-encoded by browsers (`%20`). No manual encoding needed in `music.json`.

> **Full specification:** See [`docs/MEDIA-STORAGE.md`](MEDIA-STORAGE.md) for complete naming rules, examples, and CLI usage.

---

## Summary Checklist

**Before committing code, verify:**

- [ ] **Component files** use PascalCase (e.g., `AudioPlayer.tsx`)
- [ ] **Utility/hook files** use kebab-case (e.g., `use-audio-playback.ts`)
- [ ] **Context files** use PascalCase (e.g., `PlayerContext.tsx`)
- [ ] **Directory names** use kebab-case (e.g., `src/components/player/`)
- [ ] Components use PascalCase
- [ ] Functions/variables use camelCase
- [ ] Constants use SCREAMING_SNAKE_CASE
- [ ] Booleans have `is/has/should/can` prefix
- [ ] Event handlers follow `on{Action}`/`handle{Action}` pattern
- [ ] No "module/modules" terminology (use "feature/features")
- [ ] Types/interfaces use PascalCase without "I" prefix
- [ ] API endpoints use kebab-case
- [ ] ESLint passes with naming rules enabled
