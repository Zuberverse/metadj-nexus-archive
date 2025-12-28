# Playlist Management System — Design Specification

**Last Modified**: 2025-12-27 15:24 EST
**Status**: Implemented (Phase 1 live in Public Preview)
**Version**: 1.1

## Executive Summary

This specification defines a user-created playlist system for MetaDJ Nexus that transforms listening from passive consumption to active curation. The design prioritizes simplicity over complexity—playlists should feel inevitable, not invented. Users shouldn't need training to create their first playlist; the interface should make sophisticated music curation feel natural.

**Core Philosophy**: Build amplifiers, not complications. Every feature earns its complexity by meaningfully enhancing user capability.

## 1. Feature Scope & User Value

### 1.1 Core Capabilities

**Essential Features** (Phase 1):
- Create new playlists with descriptive names
- Add tracks to playlists from anywhere (track cards, queue, collections)
- Remove tracks from playlists
- Play entire playlist (queue all tracks)
- Share playlists (share platform link + playlist name)
- View playlist contents
- Delete playlists

**Enhanced Features** (Phase 2):
- Rename playlists
- Reorder tracks within playlist (drag-and-drop)
- Duplicate playlists
- Playlist artwork (auto-generated from first track or custom)

**Excluded Features** (Scope creep risks):
- Collaborative playlists (future consideration)
- Playlist folders (adds unnecessary hierarchy)
- Auto-generated smart playlists (focus on manual curation first)
- Playlist descriptions (names should be self-documenting)

### 1.2 Transformation Journey

**User Capability Amplification**:

**Curious**: "What's this playlist feature?" (Discovery)
- Sees "Add to Playlist" button on track card
- Recognizes familiar pattern from other music apps
- Single click reveals creation flow

**Trying**: "Let me create my first playlist..." (Experimentation)
- Names playlist in inline creation flow
- Adds first track immediately
- Sees playlist appear in navigation

**Succeeding**: "I created my vibe collection!" (First Win)
- Playlist contains 5-10 curated tracks
- Can play entire playlist with one click
- Shares the playlist name + platform link

**Exploring**: "What else can I organize?" (Capability Expansion)
- Creates workout, focus, evening playlists
- Reorders tracks for perfect flow
- Discovers collection patterns

**Mastering**: "My playlist library is my creative expression" (Expertise)
- Maintains 10+ themed playlists
- Curates for specific moods/activities
- Uses playlists as primary listening mode

**Teaching**: "Check out my curated mix..." (Advocacy)
- Shares playlists with community
- Explains curation choices
- Inspires others to curate

### 1.3 Success Metrics

**Transformation Indicators** (Not vanity metrics):
- Time to first playlist creation (<2 minutes from discovery)
- Playlist creation completion rate (>80% who start finish)
- Active playlist usage (% of sessions playing from playlists)
- Average tracks per playlist (engagement depth)
- Playlists created per active user (feature adoption)

**Avoid Tracking**:
- Total playlist count (vanity metric)
- Page views without engagement
- Feature existence without usage data

## 2. Data Model & Architecture

### 2.1 Playlist Interface

```typescript
/**
 * User-created playlist
 */
export interface Playlist {
  id: string;                    // UUID v4
  name: string;                  // User-defined name (max 60 chars)
  trackIds: string[];            // Ordered array of track IDs
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  artworkUrl?: string;           // Optional custom artwork
  isDefault?: boolean;           // System-generated playlists (Favorites)
}

/**
 * Example:
 * {
 *   id: "550e8400-e29b-41d4-a716-446655440000",
 *   name: "Late Night Focus",
 *   trackIds: ["ma-001", "br-015", "mv-003"],
 *   createdAt: "2025-11-19T14:30:00Z",
 *   updatedAt: "2025-11-19T15:45:00Z",
 *   artworkUrl: "/images/playlists/late-night-focus.jpg"
 * }
 */
```

### 2.2 Storage Strategy

**Phase 1: localStorage (MVP)**
- Store playlists array in localStorage
- Key: `metadj-nexus-playlists`
- Version: `v1` (for future migrations)
- Max playlists per user: 50 (localStorage constraint)
- Max tracks per playlist: 200 (performance boundary)

**Storage Format**:
```typescript
interface PlaylistStorage {
  version: 'v1';
  playlists: Playlist[];
  updatedAt: string;  // Last modification timestamp
}
```

**localStorage Operations**:
```typescript
// Read
const getPlaylists = (): Playlist[] => {
  const data = localStorage.getItem('metadj-nexus-playlists');
  if (!data) return [];

  const storage: PlaylistStorage = JSON.parse(data);
  return storage.playlists;
};

// Write
const savePlaylists = (playlists: Playlist[]): void => {
  const storage: PlaylistStorage = {
    version: 'v1',
    playlists,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem('metadj-nexus-playlists', JSON.stringify(storage));
};
```

**Phase 2: Backend Persistence** (Future)
- Migrate to Neon PostgreSQL for cross-device sync
- Maintain localStorage as offline cache
- Schema designed for easy migration

**Migration Considerations**:
- Version field supports schema evolution
- localStorage data can be imported to backend
- Progressive enhancement approach (works offline first)

### 2.3 Context Integration

**New Context: PlaylistProvider**

```typescript
/**
 * Playlist state and operations
 */
export interface PlaylistContextValue {
  // State
  playlists: Playlist[];
  selectedPlaylist: Playlist | null;
  isLoading: boolean;

  // Operations
  createPlaylist: (name: string, source?: string) => Promise<Playlist>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;

  // Track operations
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  addTracksToPlaylist: (playlistId: string, trackIds: string[]) => Promise<{ added: number; skipped: number }>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  reorderTracks: (playlistId: string, fromIndex: number, toIndex: number) => Promise<void>;

  // Playback
  playPlaylist: (playlistId: string) => void;

  // Selection
  selectPlaylist: (playlistId: string) => void;
  clearSelection: () => void;
}
```

**Provider Location**: `src/contexts/PlaylistContext.tsx`

### 2.4 MetaDJai Active Control Integration

MetaDJai can propose playlist creation and bulk queue updates through the Active Control workflow:
- Every playlist or queue action renders a confirmation card in chat.
- Users can toggle queue mode (replace/append) and autoplay before confirming.
- On confirm, the Music panel opens so users can see the queue or playlist state immediately.

This keeps AI actions transparent, user-approved, and aligned with the "human conducts meaning" principle.

**Integration with Existing Contexts**:
- **PlayerProvider**: Playlist playback triggers queue update
- **QueueProvider**: Playing playlist loads tracks into queue
- **UIProvider**: Playlist UI state (modals, selections)

### 2.4 Validation & Limits

**Name Validation**:
- Min length: 1 character
- Max length: 60 characters
- Allowed: Letters, numbers, spaces, basic punctuation
- Trim whitespace
- Prevent duplicate names (case-insensitive)

**Playlist Limits**:
- Max playlists: 50 (localStorage constraint)
- Max tracks per playlist: 200 (performance boundary)
- Show warning at 40 playlists: "Approaching playlist limit (40/50)"
- Show warning at 180 tracks: "Approaching track limit (180/200)"

**Error Handling**:
```typescript
// Validation errors
PlaylistNameTooLong: "Playlist name must be 60 characters or less"
PlaylistNameEmpty: "Playlist name cannot be empty"
DuplicatePlaylistName: "You already have a playlist named '{name}'"
PlaylistLimitReached: "Maximum 50 playlists reached. Delete a playlist to create new one."
TrackLimitReached: "Maximum 200 tracks per playlist. Remove tracks to add more."

// Operation errors
PlaylistNotFound: "Playlist not found"
TrackAlreadyInPlaylist: "This track is already in '{playlistName}'"
StorageError: "Unable to save playlist. Please try again."
```

## 3. User Interface & Experience Design

### 3.1 Playlist Creation Flow

**Trigger Points**:
1. **Track Card "Add to Playlist" button** (Primary)
   - Icon: Plus circle (lucide-react `CirclePlus`)
   - Tooltip: "Add to Playlist"
   - Opens playlist selector popover

2. **Navigation "Create Playlist" button** (Secondary)
   - Location: Left panel, inside "Playlists" tab
   - Icon: Music plus icon
   - Label: "Create Playlist"
   - Opens inline creation form

**Creation Flow** (Inline, No Modal):

**Step 1: Name Input**
```
┌─────────────────────────────────────┐
│ Create Playlist                     │
├─────────────────────────────────────┤
│ Name:                               │
│ [____________________________]      │
│                            0/60     │
│                                     │
│ [Cancel]  [Create Playlist]         │
└─────────────────────────────────────┘
```

**Step 2: Confirmation (Toast)**
```
✓ Playlist "Late Night Focus" created
  [View Playlist] [Dismiss]
```

**Design Principles**:
- Inline creation (no modal overlay)
- Auto-focus name input
- Character counter (60 max)
- Enter key submits
- Escape key cancels
- Success toast with quick action

### 3.2 Add to Playlist Interaction

**Track Card Integration**:

```
┌─────────────────────────────────────┐
│ Track Card                          │
│                                     │
│ [▶] [♡] [+] [···]                  │
│      ↑    ↑   ↑                    │
│   Play  Like  Add to Playlist       │
└─────────────────────────────────────┘
```

**Playlist Selector Popover** (Appears on "Add to Playlist" click):

```
┌─────────────────────────────────────┐
│ Add to Playlist                     │
├─────────────────────────────────────┤
│ + Create New Playlist               │
│ ✓ Late Night Focus              12  │
│   Morning Energy                 8  │
│   Workout Mix                   15  │
└─────────────────────────────────────┘
```

**Features**:
- Checkmark (✓) shows track already in playlist
- Track count displayed on right
- "Create New Playlist" at top
- Creating a new playlist here automatically adds the track
- Clicking an existing playlist adds the track
- Playlists that already contain the track are shown disabled
- Removing tracks happens inside the Playlist Detail View
- Instant feedback with toast notification
- Auto-closes after action

**Toast Notifications**:
```
✓ Added "Metaversal Odyssey" to "Late Night Focus"
  [Undo] [Dismiss]

✓ Removed "Metaversal Odyssey" from "Late Night Focus"
  [Undo] [Dismiss]
```

### 3.3 Playlist View Interface

**Navigation Integration** (Left Panel):

```
┌─────────────────────────────────────┐
│ [Library] [Playlists] [Queue]       │
│                                     │
│ PLAYLISTS                           │
│ ♡ Favorites              24         │
│ ♪ Late Night Focus       12         │
│ ♪ Morning Energy          8         │
│ ♪ Workout Mix            15         │
│                                     │
│ + Create Playlist                   │
└─────────────────────────────────────┘
```

**Playlist Detail View** (Main content area):

```
┌─────────────────────────────────────────────────────┐
│ ← Playlists                                         │
│                                                     │
│ Late Night Focus                    12 tracks      │
│ 48 min total                                        │
│                                                     │
│ [▶ Play All]  [Share]  [···]                       │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 1  Metaversal Odyssey              MetaDJ    4:32  │
│ 2  Ascent to Majesty               MetaDJ    3:58  │
│ 3  Bridging Worlds                 MetaDJ    4:15  │
│    ...                                              │
└─────────────────────────────────────────────────────┘
```

**Playlist Header Actions** (··· menu):
- Delete Playlist

**Track Row Actions** (hover state):
```
┌─────────────────────────────────────────────────────┐
│ 1  [▶] Metaversal Odyssey    MetaDJ  4:32   [×]     │
│         ↑                                   ↑       │
│       Play                               Remove      │
└─────────────────────────────────────────────────────┘
```

### 3.4 Playlist Reordering (Phase 2)

**Drag-and-Drop Pattern**:

```
┌─────────────────────────────────────────────────────┐
│ Playlist: Late Night Focus                          │
├─────────────────────────────────────────────────────┤
│ 1  [≡] Metaversal Odyssey              ← Dragging   │
│ ┌─────────────────────────────────────┐             │
│ │ Drop here to move to position 2     │             │
│ └─────────────────────────────────────┘             │
│ 2  [≡] Ascent to Majesty                            │
│ 3  [≡] Bridging Worlds                              │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Drag handle (≡) on left of track row
- Visual feedback during drag (semi-transparent)
- Drop zone indicator
- Keyboard alternative: Arrow keys + Cmd/Ctrl
- Auto-save on drop (no "Save" button needed)
- Undo support via toast action

### 3.5 Empty States

**No Playlists Created**:
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              🎵                                     │
│                                                     │
│         Create Your First Playlist                  │
│                                                     │
│    Organize my tracks into collections that        │
│    match your moods, activities, and moments.      │
│                                                     │
│         [+ Create Playlist]                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Empty Playlist**:
```
┌─────────────────────────────────────────────────────┐
│ Late Night Focus                     0 tracks       │
│                                                     │
│              ♪                                      │
│                                                     │
│         This playlist is empty                      │
│                                                     │
│    Browse collections and click "Add to Playlist"   │
│    to start building your mix.                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3.6 Confirmation Dialogs

**Delete Playlist**:
```
┌─────────────────────────────────────┐
│ Delete Playlist?                    │
├─────────────────────────────────────┤
│                                     │
│ "Late Night Focus" will be          │
│ permanently deleted. This cannot    │
│ be undone.                          │
│                                     │
│ 12 tracks will be removed from      │
│ this playlist (tracks remain in     │
│ your collection).                   │
│                                     │
│ [Cancel]  [Delete Playlist]         │
└─────────────────────────────────────┘
```

**Design Principles**:
- Clear consequence explanation
- Destructive action styling (red button)
- Escape key cancels
- Focus on "Cancel" by default (safe choice)
- Click outside cancels

**Delete Track from Playlist**:
```
Toast: ✓ Removed "Metaversal Odyssey" from "Late Night Focus"
       [Undo] [Dismiss]
```

**Design Principle**: Use undo pattern instead of confirmation for reversible actions.

## 4. Integration Points & System Behavior

### 4.1 Navigation Integration

**Left Panel Structure**:

```typescript
// src/components/panels/left-panel/PlaylistSection.tsx

<section className="space-y-2">
  {/* Section Header */}
  <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider px-4">
    Playlists
  </h3>

  {/* Favorites (System Playlist) */}
  <PlaylistNavItem
    playlist={favoritesPlaylist}
    isActive={selectedPlaylist?.id === 'favorites'}
    icon={Heart}
  />

  {/* User Playlists */}
  {playlists.map((playlist) => (
    <PlaylistNavItem
      key={playlist.id}
      playlist={playlist}
      isActive={selectedPlaylist?.id === playlist.id}
      icon={Music}
    />
  ))}

  {/* Create Button */}
  <button onClick={handleCreatePlaylist} className="...">
    <CirclePlus /> Create Playlist
  </button>
</section>
```

**Position**: Tab between "Library" and "Queue"

**Active State**: Gradient fill (matches active collection style)

**Hover State**: Background color transition, scale animation

### 4.2 Queue System Integration

**Playing a Playlist**:

```typescript
const playPlaylist = (playlistId: string) => {
  const playlist = playlists.find(p => p.id === playlistId);
  if (!playlist) return;

  // Get track objects from IDs
  const tracks = playlist.trackIds
    .map(id => trackRepository.findById(id))
    .filter(Boolean) as Track[];

  // Update queue with playlist tracks
  queue.setQueue(tracks);
  queue.setQueueContext('playlist');
  queue.updatePersistenceMetadata({
    playlistId,
    currentIndex: 0,
  });

  // Start playback
  player.setCurrentIndex(0);
  player.setCurrentTrack(tracks[0]);
  player.play();

  // Analytics
  trackEvent('playlist_played', {
    playlistId,
    trackCount: tracks.length,
  });
};
```

**Queue Behavior**:
- Playlist tracks replace current queue
- Queue context set to 'playlist'
- First track starts playing immediately
- Shuffle respects playlist order initially
- Repeat modes work normally

**Queue Indicator**:
```
Queue • Playing from "Late Night Focus"
[12 tracks]
```

### 4.3 Collection View Integration

**Collection Header**:
```
┌─────────────────────────────────────────────────────┐
│ Majestic Ascent                     [+ Add to Playlist] │
│ Collection • 39 tracks • 1h 24m                     │
└─────────────────────────────────────────────────────┘
```

**"Add to Playlist" Button**:
- Adds ALL collection tracks to selected playlist
- Opens playlist selector popover
- Shows track count preview: "Add 39 tracks to..."
- Confirmation toast: "Added 39 tracks to 'Workout Mix'"

### 4.4 Share Functionality

**Share URL Format**:
```
https://metadj.ai/playlist/{playlistId}
```

**Share Modal**:
```
┌─────────────────────────────────────┐
│ Share Playlist                      │
├─────────────────────────────────────┤
│                                     │
│ Late Night Focus                    │
│ 12 tracks • 48 min                  │
│                                     │
│ Share Link:                         │
│ [https://metadj.ai...] [📋]   │
│                                     │
│ [Copy Link]  [Close]                │
└─────────────────────────────────────┘
```

**Public Preview Note**: Current share behavior uses the base URL (no playlist deep link yet). The `/playlist/{playlistId}` route is the target format once deep links ship.

**Copy Behavior**:
- Click copy button
- Toast: "✓ Link copied to clipboard"
- Modal stays open for additional shares

**Shared Playlist View** (Recipient Experience):
```
┌─────────────────────────────────────────────────────┐
│ Late Night Focus                                    │
│ Curated by MetaDJ • 12 tracks • 48 min             │
│                                                     │
│ [▶ Play All]  [+ Save to My Playlists]             │
│                                                     │
│ Track Listing...                                    │
└─────────────────────────────────────────────────────┘
```

**Share Privacy**:
- Public links (no authentication required)
- Recipients can play but not edit
- "Save to My Playlists" duplicates to their account
- Creator maintains ownership

## 5. File Structure & Implementation Roadmap

### 5.1 New Files

```
src/
├── contexts/
│   └── PlaylistContext.tsx              # Playlist state and operations
│
├── components/
│   └── playlist/
│       ├── PlaylistCreator.tsx          # Inline creation form
│       ├── PlaylistSelector.tsx         # Add to playlist popover
│       ├── PlaylistDetailView.tsx       # Full playlist view
│       ├── PlaylistNavItem.tsx          # Left panel playlist item
│       ├── PlaylistHeader.tsx           # Playlist detail header
│       ├── PlaylistTrackList.tsx        # Track list with drag-drop
│       ├── PlaylistTrackRow.tsx         # Individual track row
│       ├── PlaylistShareModal.tsx       # Share dialog
│       └── EmptyPlaylist.tsx            # Empty state component
│
├── lib/
│   └── playlists/
│       ├── repository.ts                # Playlist CRUD operations
│       ├── storage.ts                   # localStorage abstraction
│       ├── validation.ts                # Name/limit validation
│       └── types.ts                     # Playlist-specific types
│
└── app/
    └── playlist/
        └── [id]/
            └── page.tsx                 # Shared playlist view route
```

### 5.2 Modified Files

```
src/types/index.ts                       # Add Playlist interface
src/contexts/UIContext.tsx               # Add playlist UI state
src/components/panels/left-panel/LeftPanel.tsx  # Add playlist section
src/components/ui/TrackListItem.tsx      # Inline track actions surface
src/components/ui/TrackOptionsMenu.tsx   # Add to Playlist / Queue menu
src/lib/analytics.ts                     # Add playlist event tracking
```

### 5.3 Implementation Phases

**Phase 1: Foundation** (Days 1-3)
- [ ] Create PlaylistContext with state management
- [ ] Implement localStorage repository layer
- [ ] Build PlaylistCreator inline form
- [ ] Add PlaylistNavItem to left panel
- [ ] Create basic PlaylistDetailView
- [ ] Implement validation and error handling

**Phase 2: Core Interactions** (Days 4-6)
- [ ] Add "Add to Playlist" buttons to track cards
- [ ] Build PlaylistSelector popover
- [ ] Implement add/remove track operations
- [ ] Create playlist playback integration
- [ ] Add toast notifications for all actions
- [ ] Implement delete playlist with confirmation

**Phase 3: Enhanced Features** (Days 7-9)
- [ ] Add rename playlist functionality
- [ ] Build drag-and-drop reordering
- [ ] Implement undo/redo for operations
- [ ] Add collection-level "Add to Playlist"
- [ ] Create empty state components
- [ ] Implement keyboard shortcuts

**Phase 4: Sharing & Polish** (Days 10-12)
- [ ] Build share modal and link generation
- [ ] Create shared playlist view route
- [ ] Implement "Save to My Playlists" feature
- [ ] Add analytics event tracking
- [ ] Conduct accessibility audit
- [ ] Performance optimization

**Phase 5: Testing & Launch** (Days 13-14)
- [ ] Unit tests for playlist operations
- [ ] Integration tests for workflows
- [ ] E2E tests for critical paths
- [ ] User testing with 5-10 beta users
- [ ] Documentation and changelog
- [ ] Feature flag rollout

## 6. Analytics Event Catalog

### 6.1 Event Definitions

**Playlist Creation**:
```typescript
trackEvent('playlist_created', {
  playlistId: string,
  nameLength: number,
  source: 'navigation' | 'track_card' | 'collection_header',
});
```

**Track Addition**:
```typescript
trackEvent('track_added_to_playlist', {
  playlistId: string,
  trackId: string,
  trackCount: number,  // Total tracks after addition
  source: 'track_card' | 'collection_header' | 'detail_view',
});
```

**Track Removal**:
```typescript
trackEvent('track_removed_from_playlist', {
  playlistId: string,
  trackId: string,
  trackCount: number,  // Total tracks after removal
});
```

**Playlist Playback**:
```typescript
trackEvent('playlist_played', {
  playlistId: string,
  trackCount: number,
  source: 'navigation' | 'detail_view' | 'shared_link',
});
```

**Playlist Deletion**:
```typescript
trackEvent('playlist_deleted', {
  playlistId: string,
  trackCount: number,
  ageInDays: number,  // Playlist age at deletion
});
```

**Playlist Sharing**:
```typescript
trackEvent('playlist_shared', {
  playlistId: string,
  trackCount: number,
  method: 'link_copy' | 'share_button',
});
```

**Playlist Reordering**:
```typescript
trackEvent('playlist_tracks_reordered', {
  playlistId: string,
  trackCount: number,
});
```

**Playlist Renamed**:
```typescript
trackEvent('playlist_renamed', {
  playlistId: string,
  nameLength: number,
});
```

### 6.2 Goal Configuration (Plausible)

**Key Goals**:
- `playlist_created` — Track adoption
- `playlist_played` — Feature engagement
- `playlist_shared` — Organic advocacy
- `track_added_to_playlist` — Active curation

**Custom Properties**:
- `source` — Entry point tracking
- `trackCount` — Engagement depth
- `ageInDays` — Retention indicator

## 7. Accessibility Requirements

### 7.1 Keyboard Navigation

**Playlist Creation**:
- `Tab` — Navigate form fields
- `Enter` — Submit creation
- `Escape` — Cancel creation

**Playlist Selector Popover**:
- `Tab` / `Shift+Tab` — Navigate playlists
- `Enter` / `Space` — Toggle track in playlist
- `Escape` — Close popover
- Arrow keys — Navigate list

**Playlist Detail View**:
- `Tab` — Navigate tracks and actions
- `Enter` / `Space` — Activate buttons
- `Cmd/Ctrl + A` — Select all tracks (future)
- `Delete` / `Backspace` — Remove selected track

**Drag-and-Drop Alternative**:
- `Cmd/Ctrl + ↑` — Move track up
- `Cmd/Ctrl + ↓` — Move track down
- `Shift + ↑/↓` — Select multiple tracks (future)

### 7.2 ARIA Labels & Semantics

**Playlist Nav Item**:
```html
<button
  role="button"
  aria-label="Late Night Focus playlist, 12 tracks"
  aria-current={isActive ? 'page' : undefined}
>
  <Music aria-hidden="true" />
  <span>Late Night Focus</span>
  <span aria-label="track count">12</span>
</button>
```

**Add to Playlist Button**:
```html
<button
  aria-label="Add Metaversal Odyssey to playlist"
  aria-haspopup="menu"
  aria-expanded={isOpen}
>
  <CirclePlus aria-hidden="true" />
</button>
```

**Playlist Track Row**:
```html
<div role="listitem" aria-label="Track 1 of 12">
  <button aria-label="Play Metaversal Odyssey">
    <Play aria-hidden="true" />
  </button>
  <span>Metaversal Odyssey</span>
  <button aria-label="Remove Metaversal Odyssey from playlist">
    <X aria-hidden="true" />
  </button>
</div>
```

**Drag Handle**:
```html
<button
  aria-label="Drag to reorder Metaversal Odyssey"
  draggable="true"
  role="button"
>
  <GripVertical aria-hidden="true" />
</button>
```

### 7.3 Screen Reader Announcements

**Creation Success**:
```
"Playlist 'Late Night Focus' created. Contains 0 tracks."
```

**Track Added**:
```
"Added 'Metaversal Odyssey' to 'Late Night Focus'. Playlist now contains 12 tracks."
```

**Track Removed**:
```
"Removed 'Metaversal Odyssey' from 'Late Night Focus'. Playlist now contains 11 tracks."
```

**Playlist Playing**:
```
"Now playing 'Late Night Focus'. 12 tracks in queue."
```

**Implementation**:
```typescript
const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => announcement.remove(), 1000);
};
```

### 7.4 Touch Target Sizes

**Minimum Touch Targets**: 44px × 44px (WCAG 2.1 Level AAA)

**Component Sizing**:
- Playlist nav items: 48px height
- Track row action buttons: 44px × 44px
- Add to playlist button: 44px × 44px
- Drag handles: 48px × 48px (larger for easier grab)

**Mobile Considerations**:
- Increase spacing between interactive elements
- Larger hit areas for small icons
- Swipe gestures for remove (alternative to button)

## 8. Visual Design Standards

### 8.1 Color System (OKLCH)

**Playlist Accent Colors**:
```css
/* System Playlist (Favorites) */
--playlist-favorites: oklch(0.7 0.2 350);  /* Heart red */

/* User Playlists */
--playlist-primary: var(--purple-neon);    /* Consistent with brand */
--playlist-active: linear-gradient(135deg,
  var(--purple-neon),
  var(--blue-accent),
  var(--cyan-accent)
);
```

**State Colors**:
```css
/* Default state */
.playlist-item {
  background: rgb(0 0 0 / 0.2);
  border: 1px solid rgb(255 255 255 / 0.1);
}

/* Hover state */
.playlist-item:hover {
  background: rgb(0 0 0 / 0.3);
  border-color: rgb(255 255 255 / 0.2);
  transform: scale(1.02);
}

/* Active state */
.playlist-item[aria-current="page"] {
  background: linear-gradient(135deg,
    rgb(230 196 255 / 0.1),
    rgb(199 146 255 / 0.1),
    rgb(143 112 255 / 0.1)
  );
  border-color: var(--purple-neon);
}
```

### 8.2 Typography

**Playlist Names**:
- Font: Cinzel (heading font)
- Weight: 600 (semibold)
- Size: Desktop 1.25rem (20px), Mobile 1.125rem (18px)
- Line height: 1.4

**Track Count Badges**:
- Font: Poppins (body font)
- Weight: 500 (medium)
- Size: 0.875rem (14px)
- Color: `text-white/60`

**Empty State Headers**:
- Font: Cinzel
- Weight: 600
- Size: 1.5rem (24px)
- Gradient: `.text-gradient-hero`

### 8.3 Component Patterns

**Playlist Nav Item**:
```tsx
<button className={cn(
  "w-full flex items-center gap-3 px-4 py-3 rounded-lg",
  "transition-all duration-200",
  "hover:bg-black/30 hover:scale-102",
  isActive && "bg-gradient-primary/10 border border-purple-neon/50"
)}>
  <Music className="w-5 h-5 shrink-0" />
  <span className="flex-1 truncate font-heading font-semibold">
    {playlist.name}
  </span>
  <span className="text-sm text-white/60">
    {playlist.trackIds.length}
  </span>
</button>
```

**Add to Playlist Button** (Track Card):
```tsx
<button
  className={cn(
    "p-2 rounded-full transition-all",
    "hover:bg-white/10 hover:scale-110",
    "focus-visible:ring-2 focus-visible:ring-purple-neon"
  )}
  aria-label="Add to playlist"
>
  <CirclePlus className="w-5 h-5" />
</button>
```

**Playlist Selector Popover**:
```tsx
<div className={cn(
  "w-80 max-h-96 overflow-y-auto",
  "bg-black/90 backdrop-blur-xl",
  "border border-white/20 rounded-xl",
  "shadow-2xl shadow-purple-neon/20"
)}>
  {/* Playlist items */}
</div>
```

### 8.4 Glass Morphism & Effects

**Playlist Detail Card**:
```tsx
<div className={cn(
  "glass-card",  // Global glass morphism class
  "bg-black/40 backdrop-blur-md",
  "border border-white/10",
  "shadow-xl shadow-purple-neon/5"
)}>
  {/* Content */}
</div>
```

**Neon Glow on Active Playlist**:
```css
.playlist-active {
  box-shadow:
    0 0 20px rgb(230 196 255 / 0.3),
    0 0 40px rgb(199 146 255 / 0.2),
    0 4px 12px rgb(0 0 0 / 0.3);
}
```

## 9. Performance Considerations

### 9.1 Optimization Strategies

**Lazy Loading**:
- Playlist detail views load on demand
- Track artwork lazy loads with intersection observer
- Virtualized scrolling for playlists >50 tracks

**Memoization**:
```typescript
// Memoize playlist track resolution
const playlistTracks = useMemo(() => {
  return playlist.trackIds
    .map(id => trackRepository.findById(id))
    .filter(Boolean);
}, [playlist.trackIds]);

// Memoize sorted playlists
const sortedPlaylists = useMemo(() => {
  return [...playlists].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}, [playlists]);
```

**Debouncing**:
```typescript
// Debounce playlist name input
const debouncedSave = useMemo(
  () => debounce((name: string) => {
    validatePlaylistName(name);
  }, 300),
  []
);
```

### 9.2 localStorage Optimization

**Batch Updates**:
```typescript
// Bad: Multiple writes
playlists.forEach(p => savePlaylist(p));

// Good: Single write
savePlaylists(playlists);
```

**Compression** (Future):
- Consider LZ-string compression for large playlist data
- Only if approaching localStorage quota (5MB)

**Quota Monitoring**:
```typescript
const checkStorageQuota = () => {
  const storage = JSON.stringify(getPlaylists());
  const sizeInBytes = new Blob([storage]).size;
  const quotaPercentage = (sizeInBytes / (5 * 1024 * 1024)) * 100;

  if (quotaPercentage > 80) {
    showToast('Storage nearly full. Consider cleaning up old playlists.', 'warning');
  }
};
```

### 9.3 Render Optimization

**React.memo for List Items**:
```typescript
export const PlaylistNavItem = memo(({ playlist, isActive, onClick }) => {
  // Component implementation
}, (prev, next) => {
  return prev.playlist.id === next.playlist.id &&
         prev.isActive === next.isActive &&
         prev.playlist.trackIds.length === next.playlist.trackIds.length;
});
```

**Virtual Scrolling** (For large playlists):
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={playlist.trackIds.length}
  itemSize={64}
  width="100%"
>
  {({ index, style }) => (
    <PlaylistTrackRow
      style={style}
      track={tracks[index]}
      index={index}
    />
  )}
</FixedSizeList>
```

## 10. Testing Strategy

### 10.1 Unit Tests

**Playlist Repository**:
```typescript
describe('PlaylistRepository', () => {
  describe('createPlaylist', () => {
    it('creates playlist with unique ID', () => {
      const playlist = repository.create({ name: 'Test Playlist' });
      expect(playlist.id).toBeDefined();
      expect(playlist.name).toBe('Test Playlist');
    });

    it('throws error for duplicate names', () => {
      repository.create({ name: 'Test' });
      expect(() => repository.create({ name: 'Test' }))
        .toThrow('DuplicatePlaylistName');
    });

    it('throws error when limit reached', () => {
      // Create 50 playlists
      for (let i = 0; i < 50; i++) {
        repository.create({ name: `Playlist ${i}` });
      }

      expect(() => repository.create({ name: 'Playlist 51' }))
        .toThrow('PlaylistLimitReached');
    });
  });

  describe('addTrack', () => {
    it('adds track to playlist', () => {
      const playlist = repository.create({ name: 'Test' });
      repository.addTrack(playlist.id, 'track-1');

      const updated = repository.findById(playlist.id);
      expect(updated.trackIds).toContain('track-1');
    });

    it('prevents duplicate tracks', () => {
      const playlist = repository.create({ name: 'Test' });
      repository.addTrack(playlist.id, 'track-1');

      expect(() => repository.addTrack(playlist.id, 'track-1'))
        .toThrow('TrackAlreadyInPlaylist');
    });
  });
});
```

**Playlist Validation**:
```typescript
describe('validatePlaylistName', () => {
  it('accepts valid names', () => {
    expect(validatePlaylistName('Late Night Focus')).toBe(true);
    expect(validatePlaylistName('Workout Mix 2025')).toBe(true);
  });

  it('rejects empty names', () => {
    expect(() => validatePlaylistName('')).toThrow('PlaylistNameEmpty');
  });

  it('rejects names exceeding 60 characters', () => {
    const longName = 'A'.repeat(61);
    expect(() => validatePlaylistName(longName)).toThrow('PlaylistNameTooLong');
  });

  it('trims whitespace', () => {
    const name = validatePlaylistName('  Test  ');
    expect(name).toBe('Test');
  });
});
```

### 10.2 Integration Tests

**Playlist Creation Flow**:
```typescript
describe('Playlist Creation', () => {
  it('creates playlist and adds to navigation', async () => {
    render(<App />);

    // Click create playlist
    const createButton = screen.getByText('Create Playlist');
    fireEvent.click(createButton);

    // Enter name
    const nameInput = screen.getByLabelText('Playlist name');
    fireEvent.change(nameInput, { target: { value: 'Test Playlist' } });

    // Submit
    const submitButton = screen.getByText('Create');
    fireEvent.click(submitButton);

    // Verify toast
    await waitFor(() => {
      expect(screen.getByText(/Playlist "Test Playlist" created/)).toBeInTheDocument();
    });

    // Verify navigation
    expect(screen.getByText('Test Playlist')).toBeInTheDocument();
  });
});
```

**Add Track to Playlist**:
```typescript
describe('Add Track to Playlist', () => {
  it('adds track and shows confirmation', async () => {
    render(<App />);

    // Find track card
    const trackCard = screen.getByTestId('track-card-ma-001');

    // Click add to playlist
    const addButton = within(trackCard).getByLabelText('Add to playlist');
    fireEvent.click(addButton);

    // Select playlist from popover
    const playlist = screen.getByText('Test Playlist');
    fireEvent.click(playlist);

    // Verify toast
    await waitFor(() => {
      expect(screen.getByText(/Added "Metaversal Odyssey" to "Test Playlist"/))
        .toBeInTheDocument();
    });
  });
});
```

### 10.3 E2E Tests

**Critical User Journey**:
```typescript
describe('Playlist User Journey', () => {
  it('creates playlist, adds tracks, and plays', async () => {
    // 1. Create playlist
    await page.click('text=Create Playlist');
    await page.fill('input[name="name"]', 'My Workout Mix');
    await page.click('text=Create');
    await expect(page.locator('text=Playlist "My Workout Mix" created')).toBeVisible();

    // 2. Add tracks
    for (let i = 0; i < 5; i++) {
      await page.click(`[data-testid="track-card-${i}"] [aria-label="Add to playlist"]`);
      await page.click('text=My Workout Mix');
      await expect(page.locator('text=Added')).toBeVisible();
    }

    // 3. Navigate to playlist
    await page.click('text=My Workout Mix');
    await expect(page.locator('text=5 tracks')).toBeVisible();

    // 4. Play playlist
    await page.click('text=Play All');
    await expect(page.locator('[data-playing="true"]')).toBeVisible();

    // 5. Verify queue
    await page.click('text=Queue');
    await expect(page.locator('text=Playing from "My Workout Mix"')).toBeVisible();
  });
});
```

### 10.4 Accessibility Tests

**Automated Testing**:
```typescript
describe('Playlist Accessibility', () => {
  it('passes axe accessibility audit', async () => {
    const { container } = render(<PlaylistDetailView playlist={mockPlaylist} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('supports keyboard navigation', async () => {
    render(<PlaylistDetailView playlist={mockPlaylist} />);

    // Tab to first track
    userEvent.tab();
    expect(screen.getByTestId('track-0')).toHaveFocus();

    // Arrow down to next track
    userEvent.keyboard('{ArrowDown}');
    expect(screen.getByTestId('track-1')).toHaveFocus();

    // Enter to play
    userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(mockPlayer.play).toHaveBeenCalled();
    });
  });
});
```

## 11. Future Enhancements

### 11.1 Phase 3 Features (Post-MVP)

**Collaborative Playlists**:
- Share with edit permissions
- Real-time updates (WebSocket)
- Activity feed (who added what)
- Conflict resolution

**Smart Playlists**:
- Auto-generated based on criteria
- "Liked tracks from this month"
- "High-energy tracks >140 BPM"
- "Tracks you haven't heard in 30 days"

**Playlist Analytics**:
- Most played playlists
- Skip rate by playlist
- Listening time distribution
- Track popularity within playlists

**Advanced Organization**:
- Playlist folders
- Tags and categories
- Color coding
- Custom artwork upload

### 11.2 Backend Migration Plan

**Phase 1: Database Schema**:
```sql
CREATE TABLE playlists (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(60) NOT NULL,
  artwork_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE playlist_tracks (
  id UUID PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  track_id VARCHAR(50) NOT NULL,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);
```

**Phase 2: API Endpoints**:
```typescript
// GET /api/playlists — List user playlists
// POST /api/playlists — Create playlist
// GET /api/playlists/:id — Get playlist detail
// PATCH /api/playlists/:id — Update playlist
// DELETE /api/playlists/:id — Delete playlist
// POST /api/playlists/:id/tracks — Add track
// DELETE /api/playlists/:id/tracks/:trackId — Remove track
// PATCH /api/playlists/:id/tracks — Reorder tracks
```

**Phase 3: Migration Utility**:
```typescript
const migrateLocalPlaylistsToBackend = async () => {
  const localPlaylists = getPlaylistsFromLocalStorage();

  for (const playlist of localPlaylists) {
    await api.createPlaylist({
      name: playlist.name,
      trackIds: playlist.trackIds,
      createdAt: playlist.createdAt,
    });
  }

  // Archive local data
  localStorage.setItem('metadj-playlists-migrated', 'true');
};
```

### 11.3 Cross-Device Sync

**Conflict Resolution Strategy**:
- Last-write-wins for playlist metadata (name, artwork)
- Merge track lists (union of track IDs)
- Preserve order from most recent update
- Display conflict indicator in UI

**Offline Support**:
- Queue local changes when offline
- Sync on reconnection
- Show sync status indicator
- Handle edge cases gracefully

---

## Conclusion

This playlist system design transforms MetaDJ Nexus from a passive listening experience into an active music curation platform. By prioritizing simplicity, the feature feels inevitable rather than invented. Users shouldn't need training—creating their first playlist should be intuitive, addictive, and empowering.

**Next Steps**:
1. Review specification with stakeholders
2. Create visual mockups (Figma/Sketch)
3. Begin Phase 1 implementation
4. Conduct user testing at each phase
5. Iterate based on feedback

**Success Criteria**:
- 80%+ users create at least one playlist within first session
- Average 3+ playlists per active user within first month
- 50%+ of listening time from playlists within 3 months
- Organic playlist sharing drives 20%+ new user acquisition

Technology amplifies; humans orchestrate. This playlist system amplifies users' ability to curate and share their musical journey.
