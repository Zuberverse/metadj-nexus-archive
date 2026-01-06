# Panel System

> **Desktop side panel architecture for MetaDJ Nexus**

**Last Modified**: 2026-01-05 21:37 EST
## Overview

The Panel System provides a two-panel desktop layout with responsive behavior. The **Left Panel** hosts navigation, queue, and playback controls, while the **Right Panel** hosts the MetaDJai chat experience.

## Architecture

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PanelLayout.tsx` | `src/components/panels/` | Orchestrates panel positioning and middle content |
| `LeftPanel.tsx` | `src/components/panels/left-panel/` | Main left panel container |
| `RightPanel.tsx` | `src/components/panels/right-panel/` | MetaDJai chat panel |
| `NowPlayingSection.tsx` | `src/components/panels/left-panel/` | Current track display with controls |
| `QueueSection.tsx` | `src/components/panels/left-panel/` | Queue management interface |
| `BrowseView.tsx` | `src/components/panels/left-panel/` | Collection and mood channel browsing |
| `MoodChannelDetailView.tsx` | `src/components/panels/left-panel/` | Mood channel detail with track list |
| `CollectionDetailView.tsx` | `src/components/panels/left-panel/` | Collection detail with track list |
| `TrackListItem.tsx` | `src/components/ui/` | Shared track list item component |

### State Management

Panel state is managed via `UIContext`:

```typescript
// From UIContext.tsx
panels: {
  left: { isOpen: boolean },
  right: { isOpen: boolean }
}
toggleLeftPanel: () => void
toggleRightPanel: () => void
leftPanelTab: "browse" | "queue" | "playlists"
setLeftPanelTab: (tab) => void
```

### Positioning Constants

Defined in `src/lib/app.constants.ts`:

```typescript
export const PANEL_POSITIONING = {
  LEFT_PANEL: {
    WIDTH: 460,  // pixels
  },
  RIGHT_PANEL: {
    WIDTH: 460,  // pixels
  },
}
```

## Left Panel Features

### Tabs

The Left Panel has three main tabs:

1. **Library** (`leftPanelTab="browse"`) — Featured, Collections, optional Mood Channels
2. **Playlists** (`leftPanelTab="playlists"`) — User playlists
3. **Queue** (`leftPanelTab="queue"`) — Queue list with filter/search, reorder, and remove

**Tab persistence**:
- The active tab is persisted in `localStorage` under `metadj_left_panel_tab`.
- Hub entry points (Quick Journeys, header playback pill, keyboard flows) open the panel and set the correct tab.

**Continuity + Density (current behavior)**:
- When the desktop left panel is closed, it slides off‑screen but stays mounted so tab/selection state is preserved during the session.
- Mobile overlay uses reduced chrome (lighter borders, tighter padding) so browsing space is prioritized.
- Touch affordances are always visible on small screens (no hover‑only actions).

### Sections

- **Panel Header** — Centered “Music” label, then the three tab pills (Library / Playlists / Queue).
- **Library** — SearchBar + Featured card + collections list (`BrowseView.tsx`), then `CollectionDetailView.tsx` (Play All, Shuffle, About Collection).
- **Queue** — Queue list with filter/search (inline with track count), reorder, and remove with undo toast (`QueueSection.tsx`).
- **Playlists** — Playlist list + playlist detail view (`PlaylistList`, `PlaylistDetailView`).
- **Now Playing** — Sticky bottom section with playback controls (`NowPlayingSection.tsx`).

### Props Interface

```typescript
interface LeftPanelProps {
  queue: Track[]
  allTracks: Track[]
  onQueueReorder?: (fromIndex: number, toIndex: number) => void
  onQueueRemove?: (trackId: string) => void
  onQueueInsert?: (tracks: Track[], index: number) => void
  onSearchSelect?: (track: Track) => void
  onTrackPlay?: (track: Track) => void
  onSearchQueueAdd?: (track: Track) => void
  shuffle: boolean
  repeatMode: RepeatMode
  onShuffleToggle?: () => void
  onRepeatChange?: (mode: RepeatMode) => void
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
  nowPlayingProps: NowPlayingSectionProps
  collections?: Collection[]
  externalMoodChannelId?: string | null
  onMoodChannelChange?: (channelId: string | null) => void
}
```

## Right Panel Features

### MetaDJai Integration

The Right Panel is a dedicated container for the MetaDJai chat experience:

- Fixed width (460px) in side panel mode
- Full height below header
- Message runway: new user messages (typed, starters, actions) pin to the top on send; session switches reset to the latest user message so responses stream below without auto-follow. Runway spacing matches the active chat viewport (panel, fullscreen, mobile) while streaming, then collapses to a minimal buffer after completion so short replies keep their spacing without snapping to the bottom.
- History popover lists chat sessions; deleting a session always opens a confirmation modal before removal.
- Glassmorphism styling with backdrop blur
- Background gradient blobs for visual depth
- Passes through all MetaDjAiChat props

### Fullscreen Mode

The Right Panel supports a fullscreen mode for immersive chat experiences on desktop:

**Behavior**:
- Toggle via fullscreen button in chat toolbar (Maximize2/Minimize2 icons)
- Fullscreen state persists in `localStorage` under `metadj_ai_fullscreen`
- In fullscreen mode, the panel expands to fill the viewport below the header
- Background overlay with blur effect for visual separation

**Keyboard Shortcuts**:
- **Side Panel Mode**: ESC exits fullscreen (if active) but does NOT close the panel
- **Overlay Mode** (mobile): ESC closes MetaDJai entirely
- This allows users to exit fullscreen back to panel mode without accidentally closing the chat

**Click-Outside-to-Close**:
- In fullscreen panel mode, a backdrop overlay is rendered behind the chat container
- Clicking on the backdrop (outside the chat area) closes the MetaDJai panel
- The backdrop has blur effect (`bg-black/60 backdrop-blur-sm`) for visual separation
- Click detection uses `e.target === e.currentTarget` to ensure only direct backdrop clicks trigger close

**Implementation Notes** (`RightPanel.tsx`):
- Returns `null` when closed to prevent blank panel flash
- Fullscreen mode uses fixed positioning with container max-width
- Framer Motion `layoutId` enables smooth transitions between modes

```typescript
// RightPanel visibility logic
if (!isOpen) {
  return null // Prevents blank panel when closing from fullscreen
}

if (isFullscreen) {
  // Render fullscreen overlay
}

// Render side panel mode
```

### MetaDJai Adaptation

MetaDJai now adapts automatically to user intent. The right panel no longer exposes a mode toggle—creative companion support is the default, and music-first help kicks in whenever the user asks about music, playback, or queues.

### Model Selector

The MetaDJai toolbar includes a **Model** dropdown (GPT, Gemini, Claude, Grok). The button label reads `Model: GPT` (or equivalent) for quick clarity. GPT is the default; the selected model applies to new messages only and persists per device.

When the model changes, the chat inserts a full‑width separator (e.g., `Model: GPT`) so users can track which replies came from which model. Labels avoid official model names to keep the experience non‑technical.

Model switches retain the existing chat history; new messages still receive the full prior context. Model disclosure uses display names only (no date/version suffix).

### Action + Model Queueing

Quick Actions and model selections remain available while a response is streaming. Selections are queued and auto-applied after the current response completes, so streaming output is never interrupted. If both a model switch and an action are queued, the model switch applies first, then the action runs.

### Chat Scroll & Runway Behavior

**Initial Load vs Mid-Experience Toggle**:
- On page refresh/revisit: Chat scrolls to the bottom so users see the most recent messages
- On panel toggle mid-experience: Scroll position is preserved (no auto-scroll)
- This separation uses two refs: `wasOpenRef` (resets on close) and `hasInitializedScrollRef` (persists across toggles)

**User Message Pinning**:
- New user messages pin to the top of the chat viewport so the assistant response streams below without auto-follow
- Retry logic (up to 3 RAF frames) ensures the message element is found in the DOM before scrolling
- `lastStreamingScrollTopRef` tracks the pinned position for post-streaming restoration

**Streaming Completion**:
- When streaming ends, runway padding collapses to a minimal buffer without snapping the view to the bottom
- User scroll during streaming is respected and prevents position restoration
- Scroll anchoring is disabled; only recent user input counts as manual scroll during streaming

**Model Switch Indicators**:
- Model switch separators auto-reveal if they land outside the viewport
- Dynamic bottom padding: reduced from 24px to 8px when model-switch indicator is the last item (prevents extra scroll space)

**Typing Indicator Resilience**:
- Typing dots (animated placeholder) show when message is empty AND either the message or conversation is streaming
- Handles provider timing differences (e.g., Gemini) where status may change before content fully arrives

### Styling

```css
/* Right Panel Styling */
- Border: border-l border-white/20 (side panel)
- Border: rounded-2xl border-white/20 (fullscreen)
- Background: bg-[#0c0a1f]/90 backdrop-blur-3xl
- Gradient blobs: cyan and purple at 5% opacity
```

## PanelLayout Orchestration

The `PanelLayout` component manages the relationship between panels and middle content:

```typescript
// Width calculation
const isCinemaView = activeView === "cinema"
const middleMarginLeft = isCinemaView ? 0 : panels.left.isOpen ? LEFT_PANEL_WIDTH : 0
const middleMarginRight = isCinemaView ? 0 : panels.right.isOpen ? RIGHT_PANEL_WIDTH : 0
const middleWidth = isCinemaView ? "100%" : `calc(100vw - ${margins}px)`
```

### Cinema View Behavior

When Cinema view is active:
- Panels remain accessible but don't affect middle content margins
- Middle content fills 100% width
- Cinema has priority visual real estate

## Responsive Behavior

### Desktop (≥1100px)
- Side panels visible and toggleable
- Header controls toggle panels
- Middle content resizes between panels
- **Note**: Panel breakpoint lowered from 1440px to 1100px in v0.9.44 for better medium-screen support

**Desktop Header Playback Pill**:
- Desktop header includes a compact playback pill (track title + prev/play/next + queue + search).
- Includes one‑tap open to **Library** (`leftPanelTab="browse"`) and **Queue**, reducing hidden‑UI anxiety when panels are closed.
- **Interactivity Reinforcement**: Features a persistent subtle outline (`ring-1 ring-white/10`) and enhanced hover ring (`ring-white/20`) to clarify its role as an interactive toggle area, inclusive of the caret.
- Naming intentionally avoids “Now Playing” so the Left Panel’s sticky **Now Playing** section remains the canonical playback surface.

### Mobile (<1100px)

**Header**: Hidden on mobile (`hidden min-[1100px]:block`). All navigation and controls handled via MobileBottomNav.

**Bottom Navigation** (`MobileBottomNav.tsx`):
```
┌─────────────────────────────────────────────────────────────┐
│  Hub   Cinema  Wisdom  Journal  Music   MetaDJai           │
│  [🏠]   [🎬]    [✨]    [📓]    [🎵]     [💬]              │
└─────────────────────────────────────────────────────────────┘
```
- Fixed 6-button bar at bottom of viewport
- Active button shows brand gradient background (no pulsing animation)
- Button sizing: `min-w-12 min-h-11 px-2.5 py-1.5 rounded-xl`
- Music and MetaDJai open overlay panels; views are mutually exclusive

**Music Panel Overlay** (Left Panel as fullscreen overlay):
- Opens when "Music" is tapped in bottom nav
- Swipe-right-to-close gesture supported
- Contains: Browse/Playlists/Queue tabs + NowPlayingSection

**NowPlayingSection Compact Layout** (`compact={true}`):
```
┌──────────────────────────────────────────────────┐
│ [Art] Title        ◀︎   ▶︎ PLAY   ▶︎              │
│       Collection                                 │
├──────────────────────────────────────────────────┤
│ 0:00 ═══════════════════════════════════ 3:00    │
├──────────────────────────────────────────────────┤
│           🔀    🔁    📤    ℹ️                    │
└──────────────────────────────────────────────────┘
```
- Single row for track info (left) + transport controls (centered via absolute positioning)
- Track info constrained to `max-w-[40%]` to prevent overlap with controls
- Progress bar shows current time and total duration (no dash prefix on duration)
- Secondary controls (shuffle, repeat, share, info) centered below

**Styling Standards:**
| Element | Class | Notes |
|---------|-------|-------|
| Track title | `text-heading-solid` | Cyan → purple → fuchsia gradient |
| Collection | `text-white/60` | Grayish white subtext |
| Artwork | `rounded-md` | Matches collections list |
| Section headers | `text-heading-solid` | Cyan → purple → fuchsia gradient |

**No Floating Now Playing Dock**:
- `MobileNowPlayingDock` removed from mobile experience
- Users must tap "Music" in bottom nav to access playback controls
- Cleaner mobile UX without persistent floating elements

**Panel Behavior**:
- Panels act as fullscreen overlays/drawers (not side panels)
- Full-screen behavior with safe area padding for notch/home indicator
- Focus trap enabled when panel is open
- Compressed spacing via responsive Tailwind classes:
  - LeftPanel: `px-3` on mobile vs `px-4` on desktop
  - HubExperience: `p-5` vs `p-8`, `space-y-6` vs `space-y-8`
- See `use-responsive-panels.ts` hook

### Breakpoint Configuration

Defined in `src/lib/app.constants.ts`:

```typescript
export const PANEL_BREAKPOINT = 1100; // pixels - desktop panels visible above this width
```

### Mobile Keyboard Optimization (MetaDJai Chat)

The MetaDJai chat panel adapts to virtual keyboard presence on mobile using the `visualViewport` API:

**Implementation** (`src/components/metadjai/MetaDjAiChat.tsx`):
- Tracks keyboard height via `window.visualViewport` resize events
- Uses dynamic `bottom` positioning on the container:
  - When keyboard is **closed**: `bottom: 72px` (clears the bottom navigation bar)
  - When keyboard is **open**: `bottom: keyboardHeight` (positions directly above keyboard)
- Container uses `fixed left-0 right-0` with `top: headerHeight` and dynamic `bottom`

**Auto-zoom Prevention**:
- Chat input uses `text-base` (16px font) to prevent iOS auto-zoom on input focus
- Mobile browsers auto-zoom when input font-size < 16px

**Touch Behavior**:
- Container has `touch-manipulation` class to prevent pinch-zoom while allowing scrolling
- Same approach used for Cinema overlay and Music panel

```typescript
// Keyboard height tracking
const [keyboardHeight, setKeyboardHeight] = useState(0);

useEffect(() => {
  const viewport = window.visualViewport;
  if (!viewport) return;

  const updateKeyboardState = () => {
    const calculatedHeight = Math.max(0, 
      window.innerHeight - viewport.height - viewport.offsetTop
    );
    setKeyboardHeight(calculatedHeight);
  };

  viewport.addEventListener('resize', updateKeyboardState);
  viewport.addEventListener('scroll', updateKeyboardState);
  return () => {
    viewport.removeEventListener('resize', updateKeyboardState);
    viewport.removeEventListener('scroll', updateKeyboardState);
  };
}, []);

// Container positioning
style={{
  top: headerHeight,
  bottom: keyboardHeight > 0 ? keyboardHeight : 72,
  zIndex: 95,
}}
```

## Related Hooks

| Hook | Purpose |
|------|---------|
| `use-responsive-panels.ts` | Detects panel mode (desktop vs mobile) |
| `use-panel-position.ts` | Panel positioning calculations |

## Integration Points

### Header Integration

`AppHeader` provides toggle buttons for both panels:
- Left Panel toggle (hamburger icon area)
- Right Panel toggle (MetaDJai icon)

### View Management

Panel visibility coordinates with view state:
- Hub view: Both panels available
- Wisdom view: Both panels available
- Cinema view: Panels available but don't affect layout margins

## Accessibility

- `role="complementary"` for Right Panel
- `aria-label` descriptions on panel containers
- Keyboard navigation support within panels
- Focus management on panel open/close

## Future Enhancements

- [ ] Collapsible sections within Left Panel
- [ ] Panel resize handles
- [ ] Panel presets/layouts
- [ ] Playlist creation and management (Playlists tab)

---

**Related Documentation**:
- [Queue Persistence](queue-persistence.md) — Queue state management
- [Audio Player Standards](audio-player-standards.md) — Playback controls
- [Vercel AI SDK Integration](vercel-ai-sdk-integration.md) — MetaDJai implementation
