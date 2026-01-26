# MetaDJ Nexus Component Architecture

**Last Modified**: 2026-01-26 00:00 EST
**Version**: 0.9.46

## Overview

MetaDJ Nexus follows a modular component architecture with clear separation of concerns. A shared experience layout (`src/app/(experience)/layout.tsx`) mounts `HomePageClient` as the main orchestrator coordinating Music, Cinema, Wisdom, and MetaDJai. Client rendering is delegated through `HomePageClient` → `HomeShellRouter` → platform shells (Desktop/Mobile).

## Architecture Principles

### 1. Single Responsibility
Each component has one clear purpose and manages its own state and side effects within that scope.

### 2. Composition Over Inheritance
Components are composed together through props and context rather than extending base classes.

### 3. Unidirectional Data Flow
State flows down through props, events flow up through callbacks. React contexts provide global state where needed.

### 4. Performance Optimization
Components use dynamic imports, memoization, and React's optimization hooks where appropriate.

### 5. Testability
Components are isolated and testable with clear interfaces and minimal external dependencies.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Experience Layout + HomePageClient                │
│                   (Main Orchestrator)                       │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Contexts:    │  │ Hooks:       │  │ State:       │    │
│  │ - Player     │  │ - Keyboard   │  │ - Local      │    │
│  │ - Queue      │  │ - Preloader  │  │ - Derived    │    │
│  │ - UI         │  │ - Cinema     │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           Component Orchestration                      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│ │
│  │  │Session   │ │Modal     │ │Cinema    │ │Collection││ │
│  │  │Bootstrap │ │Orchestra │ │Overlay   │ │Surface   ││ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘│ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 0. AppErrorBoundary (v0.9.25+)

**Location**: `src/components/error/AppErrorBoundary.tsx`

**Purpose**: Top-level error boundary for the entire application

**Type**: Error Boundary Component

**Responsibilities**:
- Catch React rendering errors anywhere in the component tree
- Display user-friendly error UI with reload option
- Show technical details in development mode only
- Prevent cascading failures from crashing the entire app

**Key Features**:
- Class component using `getDerivedStateFromError`
- Styled to match app visual system (glassmorphism, brand colors)
- Development vs production error detail handling
- Wraps entire provider tree in `layout.tsx`

**Integration Points**:
- Wraps UIProvider/QueueProvider/PlayerProvider chain in layout
- Works alongside React Suspense for loading states
- Provides consistent error recovery experience

---

### 1. SessionBootstrap

**Location**: `src/components/session/SessionBootstrap.tsx`

**Purpose**: Analytics tracking and session initialization

**Type**: Side-Effects Component (No UI)

**Responsibilities**:
- Track session start events on page load
- Track search performed events
- Track zero results events
- Manage analytics state and deduplication

**Props**:
```typescript
interface SessionBootstrapProps {
  searchQuery: string
  searchResults: Track[]
}
```

**Key Features**:
- Ref-based query deduplication
- Error handling that never throws
- useEffect hooks for lifecycle tracking
- No UI rendering (pure side effects)

**Integration Points**:
- Receives search state from page orchestrator
- Fires analytics events to external service
- Independent of other components

---

### 2. ModalOrchestrator

**Location**: `src/components/modals/ModalOrchestrator.tsx`

**Purpose**: Centralized modal management

**Type**: Presentation Component

**Responsibilities**:
- Render User Guide overlay
- Render Track Details modal
- Render Collection Details modal
- Render Keyboard Shortcuts modal
- Manage modal z-index layering
- Handle dynamic imports for performance

**Props**:
```typescript
interface ModalOrchestratorProps {
  // User Guide modal
  isInfoOpen: boolean
  onInfoClose: () => void

  // Track details modal
  isTrackDetailsOpen: boolean
  trackDetailsTrack: Track | null
  onTrackDetailsClose: () => void

  // Collection details modal
  isCollectionDetailsOpen: boolean
  collectionDetails: Collection | null
  collectionTracks: Track[]
  onCollectionDetailsClose: () => void

  // Keyboard shortcuts modal
  isKeyboardShortcutsOpen: boolean
  onKeyboardShortcutsClose: () => void
}
```

**Key Features**:
- Dynamic imports reduce initial bundle size
- Loading states for async modal loading
- Single source of truth for modal visibility
- Consistent z-index layering (z-[90], z-[100], etc.)
- Track, collection, and shortcuts modals share consistent layering to avoid blocking core playback controls

**Integration Points**:
- Receives modal state from page orchestrator
- Calls close callbacks to update page state
- Loads modal components dynamically
- Renders above all other content

---

### 3. CinemaOverlay

**Location**: `src/components/cinema/CinemaOverlay.tsx`

**Purpose**: Fullscreen visual console

**Type**: Interactive Component

**Responsibilities**:
- Render fullscreen visual surface
- Sync video playback with audio state
- Auto-hide controls after inactivity
- Handle keyboard shortcuts
- Show fallback UI when video unavailable

**Props**:
```typescript
interface CinemaOverlayProps {
  isPlaying: boolean
  currentTrack: Track | null
  onClose: () => void
}
```

**Key Features**:
- Auto-hide timer (5s inactivity)
- Mouse movement detection
- Keyboard navigation (Escape, Space)
- Video synchronization with audio
- Triple-layer video muting
- "No Video Available" fallback

**Integration Points**:
- Receives audio playback state from PlayerContext
- Calls onClose callback to exit fullscreen
- Listens for keyboard events
- Loads video from the media storage API (Cloudflare R2)

---

### 4. CollectionSurface

**Location**: `src/components/collection/CollectionSurface.tsx`

> **Status (v0.8.1+)**: `CollectionSurface` and related collection components were removed in a dead‑code cleanup. Collection browsing now lives in the Left Panel (`src/components/panels/left-panel/BrowseView.tsx`, `CollectionDetailView.tsx`). The description below is kept for historical context.

**Purpose**: Main content browsing interface

**Type**: Container Component

**Responsibilities**:
- Render collection navigation (previous tabs) and descriptions
- Clear global search state when a tab is selected
- Show track listings for featured, collections, or Wisdom
- Handle track play interactions

**Props**:
```typescript
interface CollectionSurfaceProps {
  selectedCollection: string
  onSearchQueryChange: (query: string) => void
  onCollectionChange: (collectionId: string) => void
  onTrackClick: (track: Track) => void
  // ... additional props
}
```

**Note**: As of v0.9.41, "Add to Queue" buttons have been removed from hub track cards. Tracks are added to queue automatically when played.

**Key Features**:
- Responsive tab layout (mobile scroll, desktop grid)
- Collection-specific gradients
- Wisdom vs. Collection routing
- Track card rendering
- Empty state handling
- Collection descriptions

**Integration Points**:
- Receives collection state from UIContext
- Receives queue operations from QueueContext
- Calls callbacks to update page state
- Renders TrackCard components
- Clears SearchBar state via `onSearchQueryChange("")`

---

## Error & Loading Boundaries (v0.9.25+)

### Application Layer Structure
```
<AppErrorBoundary>           ← Catches errors
  <Suspense fallback={...}>  ← Handles loading states
    <UIProvider>
      <QueueProvider>
        <PlayerProvider>
          ...app content
        </PlayerProvider>
      </QueueProvider>
    </UIProvider>
  </Suspense>
</AppErrorBoundary>
```

### Benefits
- **Graceful degradation**: App doesn't crash on individual component errors
- **User recovery**: Users can reload without clearing browser state
- **Loading states**: Suspense fallback shown during provider initialization
- **Development debugging**: Full error details visible in dev mode

---

## Context Architecture

### PlaylistContext

**Dependencies** (documented in v0.9.25):
- **QueueContext** (required): Used for `playPlaylist()` to set queue
- **ToastContext** (required): Used for user feedback

**Note**: PlaylistProvider MUST be rendered inside QueueProvider and ToastProvider.

### PlayerContext
**Provides**: Audio playback state and controls
- currentTrack
- isPlaying
- volume
- play(), pause(), skip(), etc.

### QueueContext
**Provides**: Queue state and operations
- queue array
- currentIndex
- add/remove/reorder helpers
- shuffle, repeat modes
- queue metadata for persistence

**Implementation Notes**
- All queue mutations go through `buildQueue()` / `buildShuffledQueue()` so manual IDs stay deduped and prioritized.
- `filterTracksExcludingManual()` keeps auto-queues in sync with manual picks before writing to context.

### UIContext
**Provides**: UI state and navigation
- searchQuery + searchResults (shared across SearchBar, analytics, Wisdom)
- selectedCollection
- cinemaEnabled / wisdomEnabled
- Modal visibility states
- Toast API and header sizing

## Data Flow

### Downward Flow (Props)
```
page.tsx (orchestrator)
    ↓
Component Props
    ↓
Child Components
```

### Upward Flow (Callbacks)
```
User Interaction
    ↓
Event Handler
    ↓
Callback Prop
    ↓
page.tsx State Update
```

### Lateral Flow (Context)
```
Context Provider (Player, Queue, UI)
    ↓
useContext Hook
    ↓
Any Component
```

## Component Lifecycle

### 1. Page Load
```
1. page.tsx mounts
2. Contexts initialize (Player, Queue, UI)
3. SessionBootstrap tracks session start
4. ModalOrchestrator mounts (no modals open by default)
5. CollectionSurface renders default collection
```

### 2. User Interaction
```
1. User interacts (search, click, keyboard)
2. Event handler fires in component
3. Callback updates page.tsx state
4. State flows down to components
5. Components re-render with new props
```

### 3. Navigation
```
1. User selects collection or searches
2. CollectionSurface receives new props
3. Track listing updates
4. View state updates (state-driven)
5. State persists to localStorage
```

## Performance Optimizations

### Dynamic Imports
```typescript
// ModalOrchestrator uses dynamic imports
const UserGuideOverlay = dynamic(
  () => import('@/components/guide/UserGuideOverlay').then(mod => mod.UserGuideOverlay)
)
const TrackDetailsModal = dynamic(
  () => import('@/components/modals/TrackDetailsModal').then(mod => mod.TrackDetailsModal)
)
```

### Memoization Opportunities
```typescript
// Expensive calculations can be memoized
const filteredTracks = useMemo(() => {
  return filterTracksByCollection(tracks, selectedCollection)
}, [tracks, selectedCollection])

// Components can be memoized
export const CollectionSurface = React.memo(CollectionSurfaceComponent)
```

### Code Splitting
- Modal components load on-demand
- Heavy components can use dynamic imports
- Route-based splitting via Next.js App Router

## Testing Strategy

### Unit Tests
Each component has isolated unit tests:

```typescript
// SessionBootstrap.test.tsx
describe('SessionBootstrap', () => {
  it('tracks session start on mount')
  it('tracks search performed')
  it('tracks zero results')
  it('deduplicates queries')
})

// ModalOrchestrator.test.tsx
describe('ModalOrchestrator', () => {
  it('renders welcome modal when open')
  it('calls onClose callback')
  it('handles null track gracefully')
})

// CinemaOverlay.test.tsx
describe('CinemaOverlay', () => {
  it('syncs video with audio')
  it('auto-hides controls')
  it('handles keyboard shortcuts')
})

// CollectionSurface.test.tsx
describe('CollectionSurface', () => {
  it('renders tabs')
  it('filters tracks by collection')
  it('displays search results')
})
```

### Integration Tests
Page-level tests verify component coordination:

```typescript
describe('HomePage Integration', () => {
  it('loads with first featured track')
  it('searches and displays results')
  it('opens cinema and syncs video')
  it('navigates between collections')
})
```

## Migration History

### Before Refactoring
- Single monolithic `page.tsx` (1,089 lines)
- All logic mixed together
- Difficult to navigate and maintain
- Hard to test in isolation

### After Refactoring (November 2025)
- Orchestrator `page.tsx` (906 lines)
- 4 focused component features
- Clear separation of concerns
- Easier to test and maintain
- 16.8% code reduction in main page

### Refactoring Benefits
✅ **Maintainability** — Components are focused and easy to understand
✅ **Testability** — Components can be tested in isolation
✅ **Navigation** — Developers can quickly find relevant code
✅ **Performance** — Dynamic imports and targeted optimizations
✅ **Scalability** — Easy to add new features without touching existing code

## Future Architecture Considerations

### Potential Extractions
1. **QueueSurface** — Queue management UI (if still in page.tsx)
2. **PlayerControls** — Player control coordination
3. **NavigationOrchestrator** — View state coordination (Hub/Cinema/Wisdom)
4. **StateHydration** — Initial state from storage

### Component Reusability
- **SessionBootstrap** → Reusable in other pages
- **ModalOrchestrator** → Template pattern for modal management
- **CinemaOverlay** → Reusable fullscreen video component
- **CollectionSurface** → Base for other collection views

### Performance Enhancements
- React.memo for expensive components
- useMemo for expensive calculations
- useCallback for stable function references
- Virtualization for long track lists

## Related Documentation

- **Component Organization**: See CLAUDE.md Project Structure section
- **Testing Guide**: `../../tests/README.md`
- **Code Quality**: Follow lint/type-check/test gates in CI (coverage is informational for now)

---

**Architecture Version**: 0.9.46
**Last Updated**: 2026-01-09
**Status**: Production

## Version History

### v0.9.25 (December 2025)
- Added AppErrorBoundary component for top-level error handling
- Added Suspense wrapper for loading states during provider initialization
- Documented PlaylistContext dependencies (QueueContext, ToastContext)
- Standardized error handling patterns across API routes
