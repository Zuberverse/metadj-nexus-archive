# Audio Player Standards — MetaDJ Nexus

> **Comprehensive playback behavior and UX patterns for MetaDJ Nexus's audio player**

**Last Modified**: 2026-01-05 17:50 EST

---

## Table of Contents

- [Overview](#overview)
- [Side Panels (desktop)](#side-panels-desktop)
- [2025-11 Controls Revamp](#2025-11-controls-revamp-current-default)
- [Core Player Components](#core-player-components)
  - [Control Layout](#control-layout-slim-pill--overlay)
  - [Player Dimensions](#player-dimensions)
  - [Track Title Display](#track-title-display)
  - [Playback Controls](#playback-controls)
- [Smart Track Back Logic](#smart-track-back-logic-spotify-style)
- [Volume Control System](#volume-control-system)
- [Queue Management System](#queue-management-system)
- [Track List Interaction Pattern](#track-list-interaction-pattern)
- [Track Metadata Standards](#track-metadata-standards)
- [Progress Bar Interaction](#progress-bar-interaction)
- [Audio State Synchronization](#audio-state-synchronization)
- [Accessibility Standards](#accessibility-standards)
- [Performance Considerations](#performance-considerations)
- [Future Enhancements](#future-enhancements)

---

## Overview

The MetaDJ Nexus Action Bar anchors the bottom of the experience—it's the persistent surface that houses the media controls, feature selector, and playback/queue utilities. The Action Bar’s media controls implement professional behaviors modeled after leading streaming platforms like Spotify. This document defines Action Bar standards, interaction patterns, and implementation details. It also covers how the always-on welcome overlay tees up the AI-driven Metaverse experience before listeners reach the player.

## Side Panels (desktop)

- **Defaults**: Left music panel starts open; right MetaDJai panel starts closed. State is in-memory (resets on reload).
- **Edge hover toggles**: Hover anywhere on the edge to reveal a tall gradient pill with an arrow that opens/closes the panel at that cursor position. When panels are closed, the pill anchors to the screen edge; when open, it hugs the panel border. Works for both hub (left) and MetaDJai (right). Old mid-screen bars are removed, and header close buttons were removed.
- **MetaDJai sync**: Hitting the MetaDJai trigger opens the right panel on desktop; closing MetaDJai also collapses the right panel.
- **Layout margins**: `PanelLayout` adjusts center content margins based on open panels (`PANEL_POSITIONING.LEFT_PANEL.WIDTH` / `RIGHT_PANEL.WIDTH`). Cinema view zeroes these margins.
- **Visibility**: Toggles appear only when `shouldUseSidePanels` is true and the welcome overlay is closed; in Cinema view, they respect overlay visibility to avoid obstructing loops.
- **Left panel layout**: Now Playing card now sits in the same padded width wrapper as the search/results container for consistent gutters.

## 2025-11 Controls Revamp (current default)

- **Trigger button shape**: Music-controls button in the Action Bar is a rounded-square pill (14px radius) to distinguish the overlay trigger from the circular feature buttons.
- **Centered transport cluster**: Previous / Play-Pause / Next / Shuffle are centered; info toggle stays far right as a circular button.
- **Info toggle behavior**: Default view shows the Queue (with collection badge, count, clear). Tapping info swaps the entire queue pane for a Track Insight card (artwork, collection pill, genres, duration, About/Creator blocks). Tapping X returns to the queue.
- **Empty state**: The overlay and insight views use premium glassmorphic illustrations and direct CTAs ("Discover Music" when empty, "Feed the Queue" when depleted) to maintain visual quality even during content gaps.
- **Listening History**: The "Recently Played" collection now stores the last **50 tracks** (increased from 10) to support a more comprehensive session history.

### Radiant Panel Surface

MetaDJ Nexus now relies on a shared **Radiant Panel** surface (`.radiant-panel`) for every premium container: the audio player shell, search dropdown, queue overlay, Welcome overlay, and the in-app information guide. The class applies:

- **Semi-opaque onyx glass background** with 28px blur and a white/20 border (increased from white/14 for better visibility).
- **Layered indigo radial washes** plus a top light sweep to echo the shared gradient without heavy outlines
- Consistent box-shadow (0 28px 60px rgba(3,3,8,0.6)) so elevated elements feel grounded whether they sit above or below other content
- Automatic overflow hiding with inherited border-radius so any container (rounded-2xl modal, rounded-xl dropdown, full-width pill) gets the same treatment
- Background gradients, header ribbons, and tab selections now mirror the shared palette (`#5F6CFF → #38D4FF → #A250FF`), so Radio inherits the same neon-on-onyx look while staying scoped to audio surfaces.
- The Action Bar shell itself drops the negative-y shadow so there’s no dark band above the media controls—only subtle ambient glow coming from inside the panel.
- Search dropdowns and the queue overlay both reuse this surface at 96–98% opacity. The dropdown variant suppresses backdrop blur to keep the collection hero copy from bleeding through, ensuring result text is legible even over the featured paragraph block.
- The Action Bar media controls layer `.gradient-media` with a `.gradient-media-bloom` overlay before applying the standard glass content layer, recreating the Tune hero sweep behind the controls.

Whenever a feature calls for the “vibrant glass” look, wrap the container in `.radiant-panel` instead of recreating custom gradient borders. This keeps the search dropdown, queue popup, Welcome overlay, and User Guide overlay visually in sync with the Action Bar while making future tweaks a single CSS edit.

### Audio Formats
- Masters are 320 kbps MP3 files archived offline; the app streams those exact files via `/api/audio/<collection>/...` proxied from Replit App Storage.
- HTMLAudioElement handles `.mp3`; if a future lossless tier returns, point `tracks.json` at the new format (the player needs no changes).
- Ensure App Storage filenames follow the `NN-<slug>-mastered-v0.mp3` pattern to stay aligned with `src/data/tracks.json`.

## Core Player Components

### Control Layout (Slim Pill + Overlay)

The Action Bar is a centered shell that hugs the bottom edge with feature buttons and a distinct rounded-square music-controls trigger. Playback/queue controls live in the overlay.

```
┌────────────────────────────────────────┐
│ Chat | Wisdom | Cinema | Music | ☐ Controls │
└────────────────────────────────────────┘
                      ↓ toggles overlay
┌────────────────────────────────────────┐
│ Queue header (collection badge, count, clear)           │
│ Insight toggle → swaps queue ⇆ Track Insight card        │
│ Track meta left | centered transport | info toggle right │
│ Seeker below                                           │
└────────────────────────────────────────┘
```

**Layout Structure:**
- **Action Bar**: feature buttons plus a rounded-square Controls trigger. No inline media controls.
- **Control Panel overlay**: Floating panel with queue header (badge, track count, clear), inline queue list, centered transport controls, and a circular info toggle that swaps the entire pane to the Track Insight card. No repeat control.

### Player Dimensions
- **Width**: 840-1200px responsive (wider center column to give the progress bar breathing room)
- **Spacing**: Balanced gaps keep shuffle/previous/play/next/repeat perfectly mirrored
- **Progress slider**: Desktop max-width 64rem with padded gutters for breathing room; mobile keeps the full-width bar below the controls
- **Responsive**: Adapts to screen size while maintaining functionality

### Left Panel NowPlayingSection

The `NowPlayingSection` component (`src/components/panels/left-panel/NowPlayingSection.tsx`) renders within the Left Panel and supports two layout modes:

**Desktop Layout** (`compact={false}`):
- Track info row: artwork + title/collection + share/info buttons
- Transport controls: shuffle | prev | play/pause | next | repeat
- Progress scrubber with time display

**Mobile Compact Layout** (`compact={true}`):
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

**Layout:**
- Single row: track info (left, `max-w-[40%]`) + transport controls (centered via absolute positioning)
- Progress bar shows current time and total duration (no dash prefix on duration)
- Secondary controls (shuffle, repeat, share, info) centered below

**Styling Standards:**
| Element | Class | Description |
|---------|-------|-------------|
| Track title | `text-sm font-heading font-bold text-heading-solid` | Cyan → purple → fuchsia gradient, matches all music panel headers |
| Collection | `text-[10px] text-white/60` | Grayish white subtext |
| Artwork | `h-10 w-10 rounded-md` | 6px border radius, matches all track/collection artwork |
| Play button | `w-11 h-11 rounded-full` | White gradient capsule |
| Skip buttons | `h-9 w-9 min-h-[44px] min-w-[44px]` | 44px touch targets |

**Desktop Styling Standards:**
| Element | Class | Description |
|---------|-------|-------------|
| Track title | `text-base font-heading font-bold text-heading-solid` | Larger size, same gradient |
| Collection | `text-xs text-(--text-muted)` | CSS variable for consistent muted text |
| Artwork | `h-14 w-14 rounded-md` | Larger artwork, same border radius |

**See also**: [Panel System](panel-system.md) for complete mobile panel documentation.

### Track Title Display
- **Character Limit**: 40 characters maximum
- **Truncation**: Titles over 40 chars show ellipsis (`...`)
- **Prevents**: Layout breaking with very long titles
- **Optimal**: Covers most standard music title lengths

### Playback Controls

#### Cinema Toggle (Features Lane)
- **Position**: Lives in the bottom features lane (with Music, Wisdom, MetaDJai).
- **Stateful Indicator**: Cyan border + glow when visuals are active; ghost button with hover states when disabled.
- **Behavior**: Opens/closes the MetaDJ visual console fullscreen overlay. Disabling pauses the loop and dismisses the overlay automatically.
- **Accessibility**: `aria-pressed` flips between "Enable visuals" and "Disable visuals" labels.

#### Header Music Pill (New Center Navigation)
- **Primary affordance**: A desktop-specific playback pill in the header that doubles as the music browse trigger.
- **Interaction**: Features a dynamic `ChevronDown` that rotates 180° (`rotate-180`) when the music panel is open/active, signaling the collapse affordance.
- **Visual Feedback**: Improved hover states (`bg-white/10`) and icon-scale effects for better tool discoverability.

#### Play/Pause Button (Center)
- **Position**: True center of the control section to keep the gradient button optically aligned with the page grid.
- **Size**: 14x14 (56px) - larger than skip buttons for prominence.
- **Visual**: Gradient background (purple → blue → cyan).
- **States**:
  - **Loading**: Spinning `Loader2` icon (brand standard). The button is disabled during this state to prevent concurrent play/pause requests during critical buffer phases.
  - **Play**: Triangle icon, naturally centered.
  - **Pause**: Two bars icon, filled.
- **Interaction**: Click to toggle play/pause state.
- **Accessibility**: Dynamic ARIA label reflecting current state ("Loading...", "Play [Track]", "Pause [Track]").
- **Audio-Reactive Behavior**: Implements a **Beat-Shimmer** pulse, scaling slightly (up to 12%) in sync with `overallLevel` peaks during playback.

#### Loading & Buffering States
- **Visual Feedback**: The interface provides immediate feedback when a track is loading or buffering by switching the Play/Pause icon to a spinning `Loader2` (brand standard).
- **Locations**: This animation is synchronized across the top header playback pill, the main music panel overlay, and the mobile now playing dock.
- **Disabling Logic**: Playback controls are intentionally disabled while `isLoading` is true to protect the `safePlay` mutex and ensure browser-level audio unlocking is protected.

#### Skip Previous Button (Left of Play)
- **Position**: Immediately to the right of the cinema toggle and left of the play button.
- **Size**: 10x10 (40px).
- **Visual**: Border with white/20 opacity, icon white/80.
- **Behavior**: Implements Spotify-style smart track back logic (see below).
- **Accessibility**: "Previous track" ARIA label.

#### Skip Next Button (Right of Play)
- **Position**: First control on the right-hand side of the play button.
- **Size**: 10x10 (40px).
- **Visual**: Border with white/20 opacity, icon white/80.
- **Behavior**: Skip to next track in playlist.
- **Conditional**: Only shown when `onNext` callback is provided.
- **Accessibility**: "Next track" ARIA label.

#### Queue Toggle & Views (Right Column)
- **Position**: Queue toggle sits in the right utility cluster of the top lane; feature toggles live in the bottom lane.
- **Stateful Indicator**: Gradient fill + glow when the queue overlay is open; bordered ghost button otherwise.
- **Behavior**: Toggles the queue overlay. The control disables (opacity drops, pointer locked) when the queue is empty to prevent accidental opens, re-enabling automatically once tracks exist.
- **Accessibility**: `aria-pressed` surfaces "Show queue" / "Hide queue" copy; the disabled state conveys "Queue empty".

#### Shuffle Toggle (Right Utility Cluster)
- **Position**: Sits beside Queue (and Repeat) in the right utility cluster of the top lane.
- **Stateful Indicator**: Gradient fill + glow when active; bordered ghost button when off.
- **Behavior**: Randomizes the current queue while pinning the active track at position 1. Shuffle operates on the filtered track list corresponding to the active tab.
- **Accessibility**: `aria-pressed` toggles between "Enable shuffle" and "Disable shuffle" labels.
- **Availability**: Displayed whenever the queue contains tracks.

#### Repeat Toggle (Right Utility Cluster)
- **Position**: Lives with Queue/Shuffle on the right utility cluster.
- **Modes**: Three-state cycle (`Off → Track → Queue → Off`). Track mode repeats the current track indefinitely; Queue mode loops the full queue.
- **Defaults**: Loads in the “Repeat queue” state for every listener. Track repeat is an explicit opt‑in.
- **Persistence**: Once a listener changes repeat, their preference is stored (`metadj-repeat-mode-user-set=true`) and will persist across sessions.
- **Stateful Indicator**: Gradient fill + glow when active; Repeat1 icon signals Track mode.
- **Accessibility**: Labels announce “Repeat off / Repeat track / Repeat queue” and `aria-pressed` stays true for Track/Queue.

## Smart Track Back Logic (Spotify-Style)

The Previous button implements intelligent behavior based on playback position:

### Behavior Rules

1. **If playback time > 3 seconds**: Restart current track from beginning
2. **If playback time ≤ 3 seconds**: Skip to previous track
3. **If only one track exists**: Always restart from beginning

### Implementation

```typescript
const handlePrevious = () => {
  const audio = audioRef.current
  if (!audio) return

  // Spotify-style logic: if more than 3 seconds in, restart current track
  // If less than 3 seconds, go to previous track
  if (currentTime > 3) {
    audio.currentTime = 0
  } else if (onPrevious) {
    onPrevious()
  } else {
    // If only one track, restart from beginning
    audio.currentTime = 0
  }
}
```

### Rationale

This pattern prevents accidental track skips when users simply want to replay a track they're enjoying. The 3-second threshold gives users enough time to recognize if they're past the intro and want to restart vs. go back.

**User Benefits:**
- Natural interaction pattern familiar from Spotify
- Prevents frustration from accidental back-skips
- Works gracefully with single-track playlists

## Volume Control System

### Volume Persistence

Volume settings are persisted across tracks and sessions using localStorage:

- **Default Volume**: 100% (1.0)
- **Storage Key**: `metadj-volume`
- **Storage Format**: Float string (e.g., "0.75" for 75%)
- **Persistence Scope**: Applies to all tracks during and between sessions

### Implementation

```typescript
const [volume, setVolume] = useState(() => {
  // Initialize volume from localStorage or default to 100%
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('metadj-volume')
    return saved ? parseFloat(saved) : 1.0
  }
  return 1.0
})

useEffect(() => {
  const audio = audioRef.current
  if (!audio) return
  audio.volume = volume
  // Persist volume to localStorage
  localStorage.setItem('metadj-volume', volume.toString())
}, [volume])
```

### Volume Slider Specifications

- **Width**: Responsive max-width (260px on small screens → 340px on large layouts) to provide usable drag range on desktop without crowding the pill.
- **Height**: 8px track (`h-2`) so touch targets feel substantial on high-DPI screens.
- **Range**: 0-100%
- **Fill**: Gradient bar (purple → blue → cyan) animates with a 100 ms ease-out width transition for snappy feedback.
- **Thumb Style**: 14px (w-3.5 h-3.5) white glass bead with a subtle border + drop shadow; it rides on top of the fill so it always feels anchored to the bar.
- **Track Style**: White/15 opacity base so the inactive range never distracts from artwork.
- **Native slider overrides**: `.volume-slider` removes default browser thumbs/tracks so only the custom knob is visible on WebKit, Gecko, and EdgeHTML.
- **Hit Area**: Invisible padding still extends ~14 px horizontally and 12 px vertically so the thumb is easy to grab even at 0 %/100 %.

### Mute Behavior

- **Mute Toggle**: Click volume icon to mute/unmute
- **Slider Interaction**: Moving slider above 0 automatically unmutes
- **Visual Indicator**: Icon changes between Volume2 (unmuted) and VolumeX (muted)
- **Mute Persistence**: Mute state is NOT persisted (resets to unmuted on reload)

### Premium Waveform Visualizer

The player features an advanced audio-reactive waveform displaying real-time frequency data:
- **Glossy Reflections**: Subtle mirrored reflections rendered below the primary bars.
- **Dynamic Particles**: High-intensity frequency peaks trigger the emission of glowing particles from the top of the bars.
- **Neon Aesthetic**: Bars use linear gradients (Opaque → Transparent) for a "filled tube" look.
- **Persistence Trails**: The drawing loop uses a slightly transparent clearing fill (`rgba(0,0,0,0.15)`) to create smooth motion trails.

## Queue Management System

### Queue Overlay
- **Invocation**: Opened from the music controls trigger; queue content is shown by default in the overlay. The disabled inline queue toggle from older builds is removed.
- **Presentation**: Radiant panel (shared `.radiant-panel` surface) floating above the player—same black glass, radial washes, and border treatment used by the search dropdown, Welcome overlay, and User Guide.
- **Global Aura Glow**: The panel features a semi-transparent radial blue aura that pulses and scales (`1 + overallLevel * 0.4`) behind the content, creating an immersive "living" container.
- **Structure**: Header (title + reset order + close actions) followed by a scrollable layout (~70vh desktop cap) with two sections:
  - **Priority Cue** — Manual additions that always play before the automated sequence.
  - **Auto Queue** — Collection/search-driven sequence the user can still reorder.
- **Summary Ribbon**: Directly under the header, a single-line badge shows “Priority Queue” and “Auto Queue” counts (two-digit, bold) with one info icon. Tooltips explain the difference so we no longer need full sentences inside the overlay.
- **Auto-Close**: Overlay collapses automatically when queue becomes empty.

### Queue Rows
- **Active Track Highlight**: Gradient background + bold typography for the currently playing track.
- **Index Display**: Two-digit order indicator (01, 02, …) using tabular numerals.
- **Click Action**: Row button executes immediate playback via `onQueueTrackSelect` while preserving queue order.
- **Metadata**: Displays track title and collection; artwork intentionally omitted for a lightweight feel.

### Queue Controls
- **Reorder**: Up/down arrow buttons move tracks within their respective sections; manual items cannot be dragged below the auto queue.
- **Remove**: Subtle `X` control removes track and, if necessary, advances to the next available track without interrupting playback state.
- **Reset Order**: Toolbar action restores canonical ordering without wiping tracks.
  - **Priority Cue**: Manual items retain FIFO order; Reset Order only affects the auto queue.
  - **Collection Context**: Realigns the auto queue to the active collection's sequence (respecting removed tracks).
  - **Search Context**: Reapplies current search result ordering.
- **Shuffle Sync**: Shuffle toggle reorders the auto section in place; overlay immediately reflects the new order while priority items stay pinned.
- **Responsive Behaviour**: Queue rows stack vertically on mobile with enlarged touch targets; desktop keeps controls inline for rapid management.

### Add to Cue Buttons
- **Gradient pill buttons** labeled "Add to Cue" replace the previous icon-only circles in both the track list and search dropdowns.
- **Visual Feedback**: When clicked, the button transforms into a prominent "Added to queue" overlay with a purple-to-cyan gradient background and checkmark icon, providing clear confirmation.
- **Hover/focus states**: Mirror other neon controls (scale bump + outline), and `aria-label` strings remain descriptive for assistive tech.

### Search Dropdown
- Appears when a SearchBar input is focused and a query is entered; on desktop, the search input is surfaced via the header playback pill’s Search dropdown (and also exists in the Music panel Library above Featured).
- Displays case-insensitive matches against track titles (plus collection title matches) with quick-add controls for the queue.
- Shares the queue’s opaque radiant panel so hero copy never competes with results; the list stays readable even over dense Hub/Cinema backdrops.
- Each result row is a rounded card with hover/focus glow. Only the hovered or currently playing track reveals a floating play glyph, keeping the list calm until someone points at a row.

### Visual Console Integration
- **Trigger**: Toggled via the cinema button in the Action Bar controls. The console opens fullscreen immediately; there is no inline/embedded video state.
- **Sync Logic**: Starting playback auto-plays the App Storage loop (`/api/video/metadj-avatar/MetaDJ Performance Loop - MetaDJ Nexus.mp4`). If you also upload VP9 WebM (and/or a mobile WebM) to the same folder, list them before the MP4 in the `<source>` stack so Chromium browsers prefer the VP9 encode while Safari stays on H.264. Pausing freezes the frame. Track changes no longer reset the loop; closing and reopening the console restarts playback from 0:00.
- **Overlay Controls**: The fullscreen overlay renders the same `AudioPlayer` component used at page level (shuffle, queue, artwork, etc.). Movement (mouse, touch, keyboard) reveals the controls, which auto-hide after ~5s of inactivity.
- **Base Player Handling**: While visuals are active the anchored footer player is hidden/disabled to avoid duplicate controls; closing the console restores it instantly.
- **Accessibility**: Body scroll locks while the console is open, `aria-label` announces "MetaDJ visual console", and all buttons maintain the same labels/shortcuts as the base player (`Esc` to exit, `Space` to toggle playback).

## Track List Interaction Pattern

### Hover-to-Play Design

The track list implements a clean, interactive approach with hover-to-play functionality:

**Default State:**
- No play button visible on tracks
- Clean, minimal track card design
- Collection artwork displayed at standard opacity

**Hover State (Non-Playing Track):**
- Black overlay (50% opacity) appears on artwork
- White circular play button (32px) fades in centered on artwork
- Play button scales from 75% to 100% with opacity transition
- Border brightens from white/10 to white/30
- Card background lightens slightly (card/50 → card/60)

**Playing State:**
- Always shows pause button on artwork (even without hover)
- `toolbar-accent` pause button (magenta → indigo sweep) matching the control shell
- Black overlay (40% opacity) provides contrast
- Border changes to purple-500/50 with purple glow shadow
- Card background changes to solid card color

**Entire Card is Clickable:**
- Cursor changes to pointer on hover
- Click anywhere on card to play/pause
- No separate button needed on right side
- Natural, intuitive interaction

### Implementation Details

```typescript
// Play button overlay structure
<div className="relative artwork-container rounded-md overflow-hidden">
  <img src={artwork} className="w-full h-full object-cover" />

  {/* Overlay with conditional background - MUST have rounded-md to match artwork */}
  <div className={`absolute inset-0 rounded-md ${
    isPlaying ? "bg-black/40" : "bg-black/0 group-hover:bg-black/50"
  }`}>

    {/* Play/Pause button with scale/opacity transitions */}
    <div className={isPlaying
      ? "opacity-100 scale-100"
      : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
    }>
      <button className={isPlaying
        ? "toolbar-accent"
        : "bg-white/90"
      }>
        {isPlaying ? <Pause /> : <Play />}
      </button>
    </div>
  </div>
</div>
```

### Visual Specifications

**Play Button (Hover):**
- Size: 32px (w-8 h-8)
- Background: White/90 opacity
- Icon: Black play icon, 16px (w-4 h-4)
- Transform: Scale 0.75 → 1.0 on hover
- Opacity: 0 → 1 on hover
- Transition: all properties 150ms ease

**Pause Button (Playing):**
- Size: 32px (w-8 h-8)
- Background: `toolbar-accent`
- Icon: White pause icon, 16px (w-4 h-4)
- Always visible (opacity: 1, scale: 1)
- No transform on hover

**Overlay Background:**
- Not playing: Transparent → Black/50 on hover
- Playing: Black/40 (always visible)
- Transition: background-color 200ms ease
- **Critical**: Must have `rounded-md` class to match artwork border-radius and prevent black corners from showing

## Track Metadata Standards

### Genre Tags

**Standard**: Exactly 2 tags per track

- Tag 1 → Primary genre / vibe (e.g., "Retro Future", "Hip Hop", "Epic")
- Tag 2 → Always `Techno` (MetaDJ signature anchor)

**Implementation:**
```typescript
export interface Track {
  // ... other fields
  genres?: string[]; // Always length 2
}
```

**Example:**
```typescript
{
  id: "metadj-001",
  title: "Boss Battle",
  genres: ["Retro Future", "Techno"],
  // ...
}
```

**Tag Order Convention:**
1. **Primary Genre**
2. **Techno**

### Visual Display

- **Track List**: Shows both tags on large screens (primary + Techno)
- **Player Pill**: Displays both tags consistently
- **Styling**: Purple-tinted pills with subtle border and glow

## Progress Bar Interaction

### Scrubbing Behavior

- **Click-to-Seek**: Click anywhere on progress bar to jump to that position
- **Visual Feedback**: Hover state (white/5 overlay) on entire progress bar
- **Calculation**: Percentage based on click position relative to bar width

```typescript
const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
  const audio = audioRef.current
  if (!audio || !duration) return

  const rect = e.currentTarget.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  audio.currentTime = percent * duration
}
```

### Progress Display

- **Current Time**: Left side, MM:SS format, tabular numbers
- **Total Duration**: Right side, MM:SS format, tabular numbers
- **Progress Fill**: Gradient (purple → blue → cyan) matching player theme
- **Background**: White/10 opacity

## Audio State Synchronization

### Track Change Behavior

When track changes:
1. **Reset Audio Element**: Call `audio.load()` to properly reset the audio context
2. **Reset Playback Position**: Set `currentTime` to 0
3. **Preserve Volume**: Volume setting carries over from previous track
4. **Auto-Play Handling**: Respect `shouldPlay` prop for automatic playback

```typescript
// Reset when track changes
useEffect(() => {
  const audio = audioRef.current
  if (!audio || !track) return

  // Reset playback state when track changes
  audio.load()
  setCurrentTime(0)
}, [track])
```

### Play State Events

The player listens to native audio events for accurate state tracking:

- **play**: Fired when playback starts → update UI to pause button
- **pause**: Fired when playback pauses → update UI to play button
- **timeupdate**: Fired during playback → update progress bar
- **durationchange**: Fired when duration loads → update total time display
- **ended**: Fired when track finishes → auto-advance to next track (if available)

## Accessibility Standards

### Keyboard Navigation

All controls are keyboard accessible:
- **Tab**: Navigate between controls
- **Enter/Space**: Activate focused control
- **Arrow Keys**: Adjust volume slider (when focused)

### ARIA Labels

Dynamic labels provide context for screen readers:
- Play button: "Play [Track Title]" or "Pause [Track Title]"
- Volume button: "Mute audio" or "Unmute audio"
- Skip buttons: "Previous track" and "Next track"
- Volume slider: "Volume" with current percentage

### Focus Indicators

All interactive elements have visible focus states:
- **Focus Style**: 2px purple-400 outline with 2px offset
- **Hover States**: Scale transforms and opacity changes
- **Active States**: Visual feedback on click/activation

## Performance Considerations

### Audio Loading

- **Preload Strategy**: `preload="auto"` for instant playback on click
- **Format Support**: MP3 primary, with fallback support for other formats
- **Error Handling**: Graceful fallback on load/playback errors

### State Updates

- **Debouncing**: Volume changes are immediately persisted (no debounce needed)
- **RAF Optimization**: Time updates use native timeupdate event (browser optimized)
- **Memory Management**: Event listeners properly cleaned up on unmount

## Future Enhancements

Planned improvements to player functionality:

1. **Waveform Visualization**: Premium audio-reactive bars with reflections and particles (Implemented - v0.9.46)
2. **Playback Speed Control**: Variable speed playback (0.5x - 2x)
3. **Equalizer**: Built-in EQ with presets
4. **Gapless Playback**: Seamless transitions between tracks
5. **Keyboard Shortcuts**: Global shortcuts for common actions
6. **Queue Management**: View and reorder upcoming tracks

---

**Implementation Reference:**
- Primary Component: `/src/components/player/AudioPlayer.tsx`
- Metadata: `/src/data/tracks.json`
- Parent Docs: `/docs/architecture/`

**Audio Hooks Architecture:**
- `use-audio-playback.ts` — Main orchestrating hook for playback lifecycle. Features a **playPromiseRef** mutex to prevent DOM racing and a **NotAllowedError** handler for mobile browser support.
- `use-audio-preloader.ts` — **Predictive Preloading Engine**. Uses an adaptive cache strategy that scales based on network type (4G, 3G, SaveData). Prefetches upcoming queue items (lookahead 3), visible tracks, and featured content.
- `use-audio-source.ts` — Resolves blob URLs with intelligent **cache bypassing** for the first play on mobile to ensure reliable audio unlocking.
- `use-audio-volume.ts` — Volume state management with localStorage persistence and smooth ~80ms warmup ramp.
- `use-audio-analytics.ts` — Real-time event tracking for playback health and user behavior.

The `useAudioPlayback` hook composes these systems to manage:
- Audio element lifecycle and event listeners (`handleWaiting`, `handleCanPlay`)
- Play/pause/seek operations with mutex locking
- Seeking state (prevents auto-resume during slider drag)
- Track transition handling with `isTransitioningRef` protection
- Error recovery with configurable retries and auto-skip resilience
- Volume fade-in on initial playback

These standards ensure consistent, professional playback behavior that meets user expectations while maintaining the premium MetaDJ Nexus experience.
