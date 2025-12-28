# Contexts Reference

> **React Context providers for MetaDJ Nexus state management**

**Last Modified**: 2025-12-27 15:24 EST
## Overview

MetaDJ Nexus uses 7 React Context providers for global state. Contexts can be imported directly from their files or via the `@/contexts` barrel export.

```ts
import { useModal } from '@/contexts/ModalContext';
import { useUI } from '@/contexts/UIContext';
import { useTour } from '@/contexts/TourContext';
import { useToast } from '@/contexts/ToastContext';
import { useQueue } from '@/contexts/QueueContext';
import { usePlayer, usePlaybackTime } from '@/contexts/PlayerContext';
import { usePlaylist } from '@/contexts/PlaylistContext';
```

```ts
import { useQueue, usePlayer } from '@/contexts';
```

### What Lives In Context vs Hooks

- Contexts hold **global state + primitives** (open/close, setters, refs).
- Cross-context orchestration lives in **home hooks** (`src/hooks/home/*`), especially queue navigation (`src/hooks/home/use-queue-controls.ts`).

---

## Provider Nesting Order

Providers are nested in this order in `src/app/layout.tsx` (omitting non-provider wrappers like `AppErrorBoundary`):

```tsx
<ModalProvider>
  <UIProvider>
    <TourProvider>
      <ToastProvider>
        <QueueProvider>
          <PlayerProvider>
            <PlaylistProvider>
              {children}
            </PlaylistProvider>
          </PlayerProvider>
        </QueueProvider>
      </ToastProvider>
    </TourProvider>
  </UIProvider>
</ModalProvider>
```

**Why this order matters**
- `UIProvider` depends on `ModalProvider` (UI re-exports modal state/setters for centralized access).
- `TourProvider` depends on `UIProvider` (tour steps open panels and modals).
- `PlayerProvider` depends on `ToastProvider` (volume/mute feedback toasts).
- `PlaylistProvider` depends on `ToastProvider` + `QueueProvider` (`playPlaylist()` and playlist CRUD toasts).

---

## ModalContext

**File**: `src/contexts/ModalContext.tsx`

Owns modal/overlay booleans and setters:
- Welcome overlay, User Guide, Track Details, Collection Details, Queue, Wisdom, Keyboard Shortcuts, MetaDJai.

**Exports**
```ts
import { ModalProvider, useModal } from '@/contexts/ModalContext';
```

**Persistence**
- Welcome auto-open gating uses `STORAGE_KEYS.WELCOME_SHOWN` + `metadj_welcome_shown_session` (alternate key: `STORAGE_KEYS.WELCOME_DISMISSED`).

---

## UIContext

**File**: `src/contexts/UIContext.tsx`

Owns “experience shell” state:
- Search query/results
- Selected collection + collection details
- Featured expanded state
- Header height (for overlay positioning)
- Panel open/close state (left/right)
- Left panel tab (`browse` / `queue` / `playlists`)
- Active view (`hub` / `cinema` / `wisdom`)

**Exports**
```ts
import { UIProvider, useUI } from '@/contexts/UIContext';
```

**Notes**
- UIContext **re-exports ModalContext** (`modals`, `setWelcomeOpen`, etc.) so older callers can remain stable.
- Panels announce open/close changes via `ScreenReaderAnnouncer` for accessibility.

---

## TourContext

**File**: `src/contexts/TourContext.tsx`

Owns the interactive desktop tour (Driver.js).

**Exports**
```ts
import { TourProvider, useTour } from '@/contexts/TourContext';
```

**Dependencies**
- Requires `UIProvider` (opens the left panel / MetaDJai panel during tour steps; falls back to the User Guide on mobile).

---

## ToastContext

**File**: `src/contexts/ToastContext.tsx`

Owns the global toast queue:
- `showToast()`, `dismissToast()`, `toasts[]` (capped to the newest 3).

**Exports**
```ts
import { ToastProvider, useToast } from '@/contexts/ToastContext';
```

---

## QueueContext

**File**: `src/contexts/QueueContext.tsx`

Owns queue state + persistence primitives:
- `queue`, `autoQueue`, `manualTrackIds`, `queueContext`
- `persistenceMetadata` (selected collection, search query, current track/index, last playing)
- `repeatMode`, `isShuffleEnabled`
- Raw setters (`setQueue`, `setQueueContext`, `setAutoQueue`, etc.)

**Exports**
```ts
import { QueueProvider, useQueue } from '@/contexts/QueueContext';
```

**Where are the queue actions?**
- High-level actions (add/remove/reorder/next/previous) are orchestrated in `src/hooks/home/use-queue-*.ts`.

---

## PlayerContext

**File**: `src/contexts/PlayerContext.tsx`

Owns playback state and the shared `audioRef`.

### Performance Split

PlayerContext is intentionally split to avoid re-render storms:

| Context | Updates | Typical usage |
| --- | --- | --- |
| `usePlayer()` | Track/state changes | Most UI |
| `usePlaybackTime()` | 4–5x/sec during playback | Progress/time displays only |
| `useCurrentTimeRef()` | Ref updates without re-renders | Analytics/timing logic |

**Exports**
```ts
import { PlayerProvider, usePlayer, usePlaybackTime, useCurrentTimeRef } from '@/contexts/PlayerContext';
```

**Important**
- `next()` / `previous()` are intentional no-ops in PlayerContext. Queue-aware navigation is implemented in `src/hooks/home/use-queue-controls.ts`.

---

## PlaylistContext

**File**: `src/contexts/PlaylistContext.tsx`

Owns user-created playlists (localStorage-backed):
- Create/rename/delete playlists
- Add/remove/reorder tracks within playlists
- “Play playlist” integration via QueueContext

**Exports**
```ts
import { PlaylistProvider, usePlaylist } from '@/contexts/PlaylistContext';
```

**Dependencies**
- Requires `useQueue()` + `useToast()`.

---

## Related Documentation

- `3-projects/5-software/metadj-nexus/docs/reference/hooks-reference.md`
- `3-projects/5-software/metadj-nexus/docs/features/queue-persistence.md`
- `3-projects/5-software/metadj-nexus/docs/architecture/routing.md`
- `3-projects/5-software/metadj-nexus/docs/features/user-guide-system.md`
