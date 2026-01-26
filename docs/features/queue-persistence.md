# Queue Persistence Feature

> **localStorage-based queue state persistence for seamless listening continuity**

**Last Modified**: 2026-01-26 00:00 EST
**Status**: ✅ Implemented

## Overview

The Queue Persistence feature automatically saves and restores your playback queue using browser localStorage, enabling users to resume their listening session exactly where they left off—even after closing the browser or navigating away.

## Source-Aware Queue Building (v0.9.43+)

Playing a track now builds the queue from **only that source's tracks**, not the entire catalog:

| Source | Queue Behavior |
|--------|----------------|
| **Collection** | Queue contains only tracks from that collection |
| **Mood Channel** | Queue contains only tracks matching the mood filter |
| **Playlist** | Queue contains only tracks from that playlist |
| **Search Results** | Queue contains only matching search results |
| **Featured/Hub** | Queue contains full catalog (default behavior) |

### Implementation

The `tracksOverride` parameter flows through the component hierarchy:

```
CollectionDetailView → onTrackPlay(track, collectionTracks)
MoodChannelDetailView → onTrackPlay(track, moodTracks)
PlaylistDetailView → onPlayTrack(track, playlistTracks)
LeftPanel.handleTrackPlay → forwards tracksOverride to parent
use-queue-navigation → uses tracksOverride ?? allTracks
```

This ensures clicking a track in a collection plays through that collection's tracks, not the entire music catalog.

## Core Functionality

### What Gets Persisted

```typescript
{
  version: string           // App version (APP_VERSION)
  timestamp: number          // Unix timestamp in milliseconds
  queue: Track[]            // Complete track queue
  manualTrackIds: string[]  // IDs of manually added tracks
  queueContext: 'collection' | 'search' | 'playlist'
  selectedCollection?: string  // Active collection ID
  searchQuery?: string         // Active search query
}
```

### Storage Configuration

- **Storage Key**: `metadj_queue_state`
- **Expiration**: 24 hours
- **Version Check**: Must match current app version (`APP_VERSION`)
- **Storage Location**: Browser localStorage

## User Experience

### Session Continuity

**Scenario 1: Normal Page Reload**
1. User builds queue with multiple tracks
2. User adds manual tracks to queue
3. User refreshes page
4. ✅ Queue restored with all tracks
5. ✅ Toast notification: "Queue restored from your last session"
6. ✅ First track in queue loaded (paused, ready to play)

**Scenario 2: Browser Close and Reopen**
1. User closes browser tab
2. Returns within 24 hours
3. ✅ Queue restored exactly as left
4. ✅ Collection and search state preserved
5. ✅ Manual track additions maintained

**Scenario 3: Expired Queue (>24 hours)**
1. User returns after 24+ hours
2. ❌ Queue expired and cleared
3. ✅ Analytics event tracked: `queue_expired` (reason: time_expired)
4. ✅ Default featured track loaded

**Scenario 4: Version Mismatch**
1. App updated to new version
2. Old queue state detected
3. ❌ Queue cleared (version mismatch)
4. ✅ Analytics event tracked: `queue_expired` (reason: version_mismatch)
5. ✅ Fresh default queue loaded

**Scenario 5: Manual Queue Clear**
1. Listener clears the queue (manual + auto lanes empty)
2. Reloads or returns later the same day
3. ✅ Queue remains empty—no ghost tracks resurrect
4. ✅ Selected collection/search metadata remains when saved

## Queue Display Pattern

The Queue tab displays a "Now Playing + Up Next" layout that adapts to the current playback state:

### Now Playing Section
When a track is playing:
- **Prominent display** of current track at the top of the queue
- **Larger artwork** (48px) with animated audio visualization bars when actively playing
- **Cyan accent** border and background to distinguish from queue items
- **Track info** including title and collection name
- **Interactive** - clicking focuses/plays the current track

### Up Next Section
Below the Now Playing section:
- **"Up Next" header** with track count (e.g., "3 up next")
- **Numbered list** of upcoming tracks starting from 1
- **Reorderable** via drag-and-drop
- **Removable** with undo toast functionality
- Only shows tracks after `currentIndex` in the queue

### Empty States
- **No current track**: Shows all tracks in queue with total count
- **Queue depleted**: Displays "End of the line?" message with "Add More Tracks" button
- **Empty session**: Shows "Your session starts here" with "Discover Music" button

### Implementation
The `QueueSection` component receives:
- `currentTrack`: The currently playing track
- `currentIndex`: Position in the queue
- `isPlaying`: Whether playback is active
- `tracks`: Full queue array

Upcoming tracks are computed as `tracks.slice(currentIndex + 1)`.

## Implementation Details

### File Structure

```
src/lib/queue-persistence.ts            # Core persistence utilities
src/contexts/QueueContext.tsx           # Hydration + save hooks
src/components/home/HomePageClient.tsx  # Queue orchestration + persistence
```

### Key Functions

#### `saveQueueState()`

Saves current queue state to localStorage.

```typescript
saveQueueState(
  queue: Track[],
  manualTrackIds: string[],
  queueContext: QueueContext,
  selectedCollection?: string,
  searchQuery?: string,
  currentTrackId?: string,
  currentIndex?: number,
  autoQueue?: Track[]
): void
```

**Behavior**:
- Validates localStorage availability
- Serialises queue, manual track IDs, and metadata (even when queue is empty)
- Automatically persists the auto-generated queue (canonical order without manual inserts)
- Handles quota exceeded errors gracefully
- Logs debug information
- Never throws errors

#### `loadQueueState()`

Loads and validates queue state from localStorage.

```typescript
loadQueueState(): PersistedQueueState | null
```

**Returns**: Valid state or `null` (expired/corrupted/missing)

**Validation Steps**:
1. Check localStorage availability
2. Parse JSON (handle corruption)
3. Validate structure (version, timestamp, queue array)
4. Rebuild `autoQueue` if previous payloads are missing it
5. Check version match (current `APP_VERSION`)
6. Check expiration (24 hours)
7. Track analytics event if restored
8. Clear invalid/expired state

#### `clearQueueState()`

Removes persisted state from localStorage.

```typescript
clearQueueState(): void
```

**Use Cases**:
- Manual queue clear
- Expired state cleanup
- Version mismatch cleanup
- Corrupted data cleanup

#### `getQueueStateAge()`

Returns age of persisted state in minutes.

```typescript
getQueueStateAge(): number | null
```

**Returns**: Minutes since save, or `null` if no valid state

## Integration Points

### QueueProvider (src/contexts/QueueContext.tsx)
- **Hydration**: On mount, the provider calls `loadQueueState()`, seeds the queue, manual IDs, queue context, and restores metadata. A ref tracks whether a persisted payload already exists.
- **Persistence**: A follow-up effect observes `queue`, `manualTrackIds`, and metadata. Writes are debounced by 300ms to batch rapid operations (drag-reorder, bulk adds) before calling `saveQueueState()`. Calls `clearQueueState()` when both the queue and metadata are empty.
- **Metadata sync**: `updatePersistenceMetadata()` is invoked from `HomePageClient` (via `use-home-queue-lifecycle.ts`) whenever a user changes the selected collection or search query so the persisted payload mirrors the UI.

### Page Orchestration (`HomePageClient` + hooks)
- Uses the queue context setters (`setQueue`, `setManualTrackIds`, `setAutoQueue`, `setIsShuffleEnabled`, `setRepeatMode`, `setQueueContext`) to rebuild canonical queues, manage the priority lane, and honour shuffle/repeat logic.
- No URL overrides: persistence is purely local-state driven (queue, selected collection, search query) so the URL stays clean while you browse.
- Cinema toggles, hub state, and keyboard shortcuts all read from context values; there is no duplicated queue state in local component hooks.

### Analytics Integration
- `queue-persistence.ts` emits `queue_restored` events when a payload hydrates and `queue_expired` when version/time checks invalidate a payload.
- Queue mutations (`add`, `remove`, `reorder`, `clear`) continue to fire `trackQueueAction` events from within the page-level handlers so analytics stay aligned with the new persistence semantics.

## Error Handling

### Graceful Degradation

The persistence layer handles all error scenarios without throwing exceptions:

**localStorage Unavailable** (Private Browsing):
- Logs warning
- Returns `null` from load
- Silently skips save
- App continues normally

**Quota Exceeded** (Storage Full):
- Logs error
- Skips save silently
- Doesn't impact user experience

**Corrupted Data** (Invalid JSON):
- Logs error
- Clears corrupted state
- Returns `null` from load
- Falls back to default queue

**Version Mismatch**:
- Logs info message
- Clears old state
- Tracks analytics event
- Loads fresh default queue

**Expired State** (>24 hours):
- Logs info message
- Clears expired state
- Tracks analytics event
- Loads fresh default queue

## Testing

### Automated Tests

Location: `tests/hooks/queue-operations.test.ts` and `tests/contexts/contexts.test.tsx`

**Test Coverage**:
- ✅ Save queue state to localStorage
- ✅ Load saved queue state
- ✅ Handle empty queues
- ✅ Handle corrupted data
- ✅ Expire old state (>24 hours)
- ✅ Reject version mismatches
- ✅ Validate state structure
- ✅ Clear persisted state
- ✅ Get state age in minutes
- ✅ Handle large queues (100+ tracks)
- ✅ Preserve all track metadata
- ✅ Handle special characters
- ✅ localStorage unavailable (private browsing)

**Run Tests**:
```bash
npm run test
```

### Manual Testing Scenarios

#### Test 1: Basic Persistence
1. Load MetaDJ Nexus
2. Play some tracks, add to queue
3. Refresh page
4. ✅ Verify queue restored
5. ✅ Verify toast notification shown

#### Test 2: Collection State
1. Switch to "Majestic Ascent" collection
2. Build custom queue
3. Refresh page
4. ✅ Verify collection still selected
5. ✅ Verify queue matches collection context

#### Test 3: Search State
1. Search for "techno"
2. Build queue from results
3. Refresh page
4. ✅ Verify search query restored
5. ✅ Verify search results shown
6. ✅ Verify queue matches search results

#### Test 4: Manual Track Additions
1. Add 3 tracks manually to queue
2. Note their position
3. Refresh page
4. ✅ Verify manual tracks at top of queue
5. ✅ Verify manualTrackIds preserved

#### Test 5: Expiration (24 hours)
1. Save queue state
2. Manually edit localStorage timestamp to 25 hours ago
3. Refresh page
4. ✅ Verify queue NOT restored
5. ✅ Verify default featured track loaded

#### Test 6: Version Mismatch
1. Save queue state
2. Manually edit localStorage version to "0.90"
3. Refresh page
4. ✅ Verify queue NOT restored
5. ✅ Verify default featured track loaded

#### Test 7: Private Browsing
1. Open MetaDJ Nexus in private/incognito mode
2. Build queue
3. Refresh page
4. ✅ Verify app works normally
5. ✅ Verify queue NOT restored (expected behavior)
6. ✅ Verify no errors in console

#### Test 8: Large Queue
1. Add 50+ tracks to queue
2. Refresh page
3. ✅ Verify all tracks restored
4. ✅ Verify no performance issues

## Browser Compatibility

### localStorage Support

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Mobile browsers: Full support
- ⚠️ Private/Incognito mode: Gracefully degrades

### Storage Limits

- Typical: 5-10 MB per origin
- Queue data: ~100-500 KB for typical queues
- Large queue (100 tracks): ~1 MB with full metadata

## Performance Considerations

### Save Performance

- **Serialization**: ~1-5ms for typical queue
- **localStorage.setItem**: ~1-10ms
- **Total**: <20ms (imperceptible to user)
- **Debounce**: 300ms delay batches rapid operations (drag-reorder, bulk adds)
- **Frequency**: Triggered by queue state changes, debounced to prevent excessive writes

### Load Performance

- **localStorage.getItem**: <1ms
- **JSON.parse**: ~1-5ms
- **Validation**: <1ms
- **Total**: <10ms (before first paint)

### Memory Impact

- **In-memory state**: ~100-500 KB
- **localStorage**: Same size on disk
- **No memory leaks**: State cleared on unmount

## Privacy & Security

### Privacy Considerations

- **Local Storage Only**: Data never leaves the device
- **No Server Sync**: Queue state never sent to servers
- **No PII**: Only track IDs and metadata (already public)
- **User Control**: Can be cleared via browser settings

### Data Retention

- **Automatic Expiration**: 24 hours
- **Version Cleanup**: Cleared on app updates
- **Manual Clear**: User can clear browser storage
- **No Backup**: Lost if localStorage cleared

## Troubleshooting

### Queue Not Restoring

**Check**:
1. Open browser DevTools > Application > Local Storage
2. Look for key: `metadj_queue_state`
3. Verify JSON structure
4. Check `version` field (should be "0.50")
5. Check `timestamp` (within 24 hours?)

**Common Issues**:
- Private browsing mode (expected behavior)
- localStorage disabled in browser settings
- Queue expired (>24 hours old)
- Version mismatch (app was updated)

### Corrupted State

If state becomes corrupted:
1. Open DevTools Console
2. Run: `localStorage.removeItem('metadj_queue_state')`
3. Refresh page
4. Queue will reset to default

### Storage Quota Errors

If seeing quota errors in console:
1. Check total localStorage usage
2. Clear other site data if needed
3. MetaDJ Nexus should handle gracefully

## Future Enhancements

### Potential Improvements (Not Yet Implemented)

**Cloud Sync** (Future):
- Sync queue across devices
- Requires user authentication
- Privacy considerations

**Position Memory** (Future):
- Remember playback position within tracks
- Resume from exact second

**History Tracking** (Future):
- Store queue history
- "Recently played" queues

**Smart Expiration** (Future):
- Longer expiration for active users
- Immediate clear for inactive users

## Related Documentation

- **Analytics Integration**: `3-projects/5-software/metadj-nexus/docs/features/analytics-implementation.md`
- **Queue Management**: `queue-persistence.md`
- **localStorage Best Practices**: MDN Web Docs

## Support

For issues or questions:
- Check browser console for error messages
- Verify localStorage availability
- Test in non-private browsing mode
- Clear localStorage and retry

---

**Implementation Date**: 2025-10-29
**Implemented By**: Claude Code (Coder Agent)
**Status**: Production Ready
