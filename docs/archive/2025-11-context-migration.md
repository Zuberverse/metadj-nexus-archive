# Context API Migration Guide

**Last Modified**: 2026-01-13 14:15 EST

**Created**: 2025-11-01
**Purpose**: Replace prop drilling with Context API architecture

## Files Created

### 1. Type Definitions (`src/types/index.ts`)
Consolidated all domain type definitions into a single source of truth:
- **Core Types**: `Track`, `Collection`, `RepeatMode`, `QueueContext`
- **Context Interfaces**: `PlayerContextValue`, `QueueContextValue`, `UIContextValue`
- **Helper Types**: `ModalStates`, `ToastMessage`, `CollectionType`
> Repository-specific contracts now live in `src/lib/music/repository.ts`, keeping shared shapes in `src/types`.

### 2. Player Context (`src/contexts/PlayerContext.tsx`)
Manages audio playback state and controls:
- **State**: `currentTrack`, `currentIndex`, `shouldPlay`, `isLoading`
- **Volume**: `volume`, `isMuted` (persisted to localStorage)
- **Controls**: `play()`, `pause()`, `next()`, `previous()`, `seek()`
- **Hook**: `usePlayer()`

### 3. Queue Context (`src/contexts/QueueContext.tsx`)
Manages playback queue and modes:
- **State**: `queue`, `autoQueue`, `manualTrackIds`, `queueContext`
- **Modes**: `isShuffleEnabled`, `repeatMode` (persisted to localStorage)
- **Setters**: `setQueue()`, `setManualTrackIds()`, `setAutoQueue()`, `setIsShuffleEnabled()`, `setRepeatMode()`, `setQueueContext()`
- **Persistence**: `updatePersistenceMetadata()` for localStorage sync
- **Integration**: Uses existing `queuePersistence.ts` for localStorage
- **Hook**: `useQueue()`

### 4. UI Context (`src/contexts/UIContext.tsx`)
Manages UI state and modals:
- **Modals**: `isWelcomeOpen`, `isQueueOpen`, `isWisdomOpen`, etc.
- **Toast**: `toastMessage`, `showToast()`
- **Search**: `searchQuery`, `searchResults`
- **Collection**: `selectedCollection`
- **Layout**: `headerHeight`
- **Hook**: `useUI()`

## Integration Steps

### Step 1: Wrap App with Providers

Update `src/app/layout.tsx`:

```tsx
import { PlayerProvider } from '@/contexts/PlayerContext';
import { QueueProvider } from '@/contexts/QueueContext';
import { UIProvider } from '@/contexts/UIContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UIProvider>
          <QueueProvider>
            <PlayerProvider>
              {children}
            </PlayerProvider>
          </QueueProvider>
        </UIProvider>
      </body>
    </html>
  );
}
```

**Provider Order** (outer → inner):
1. **UIProvider** - Outermost (no dependencies)
2. **QueueProvider** - Middle (may need UI context for toasts)
3. **PlayerProvider** - Innermost (may need queue for next/prev)

### Step 2: Update `src/app/page.tsx`

Replace useState hooks with context hooks:

```tsx
import { usePlayer } from '@/contexts/PlayerContext';
import { useQueue } from '@/contexts/QueueContext';
import { useUI } from '@/contexts/UIContext';

export default function HomePage() {
  // Replace individual useState hooks with context hooks
  const player = usePlayer();
  const queue = useQueue();
  const ui = useUI();

  // Access state via context objects:
  // player.currentTrack, player.play(), player.volume
  // queue.queue, queue.setQueue(), queue.isShuffleEnabled, queue.updatePersistenceMetadata()
  // ui.modals.isQueueOpen, ui.showToast(), ui.searchQuery
}
```

### Step 3: Update `src/components/player/AudioPlayer.tsx`

Replace props with context hooks:

```tsx
import { usePlayer } from '@/contexts/PlayerContext';
import { useQueue } from '@/contexts/QueueContext';
import { useUI } from '@/contexts/UIContext';

interface AudioPlayerProps {
  // Remove all prop interfaces - now using context
  className?: string;
}

export default function AudioPlayer({ className = '' }: AudioPlayerProps) {
  const player = usePlayer();
  const queue = useQueue();
  const ui = useUI();

  // Access everything via context:
  // player.currentTrack, player.shouldPlay, player.volume
  // queue.queue, queue.repeatMode, queue.setIsShuffleEnabled()
  // ui.modals.isQueueOpen, ui.setQueueOpen()
}
```

### Step 4: Update Other Components

Any component needing state can now import and use the hooks:

```tsx
// Track list component
import { usePlayer } from '@/contexts/PlayerContext';
import { useQueue } from '@/contexts/QueueContext';

function TrackList() {
  const { currentTrack, play } = usePlayer();
  const queue = useQueue();

  // No prop drilling needed!
}
```

## Benefits

✅ **Eliminates prop drilling** - 20+ props reduced to 3 context hooks
✅ **Cleaner components** - No prop interfaces with 20+ fields
✅ **Better performance** - Components only re-render on relevant state changes
✅ **Type safety** - Full TypeScript support with proper interfaces
✅ **Easier testing** - Mock context providers instead of props
✅ **Maintainability** - State management centralized in contexts

## Preserved Patterns

✅ **localStorage persistence** - Volume and repeat mode still persisted
✅ **Queue persistence** - Still using existing `queuePersistence.ts`
✅ **Analytics integration** - All integration points preserved
✅ **Constants** - Using existing `constants.ts` for defaults

## Migration Checklist

- [ ] Create type definitions (`src/types/index.ts`) ✅
- [ ] Create PlayerContext (`src/contexts/PlayerContext.tsx`) ✅
- [ ] Create QueueContext (`src/contexts/QueueContext.tsx`) ✅
- [ ] Create UIContext (`src/contexts/UIContext.tsx`) ✅
- [ ] Wrap app with providers in `layout.tsx`
- [ ] Refactor `page.tsx` to use context hooks
- [ ] Refactor `AudioPlayer.tsx` to use context hooks
- [ ] Update other components as needed
- [ ] Test all playback functionality
- [ ] Test all queue operations
- [ ] Test localStorage persistence
- [ ] Test analytics integration
- [ ] Remove old prop interfaces
- [ ] Update component tests

## Critical Notes

⚠️ **DO NOT TOUCH** Replit Object Storage:
- `src/lib/replitStorage.ts` - Leave unchanged
- `/api/audio/` routes - Leave unchanged
- `/api/video/` routes - Leave unchanged

⚠️ **Context Provider Order Matters**:
- UIProvider → QueueProvider → PlayerProvider (outer to inner)
- Ensures proper dependency access

⚠️ **Error Boundaries**:
- Context hooks throw if used outside providers
- Always wrap with proper provider hierarchy

## Next Steps

1. **Test integration** - Verify all functionality works with contexts
2. **Cleanup** - Remove old prop interfaces and unused imports
3. **Documentation** - Update component documentation
4. **Performance** - Add React.memo where beneficial
5. **DevTools** - Consider React Context DevTools for debugging

---

**Status**: Architecture complete, ready for integration
**Impact**: Reduces `page.tsx` from 1,086 lines with 12+ useState hooks to clean context hook usage
**AudioPlayer**: Props reduced from 20+ to just `className` prop
