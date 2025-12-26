# MetaDJ Nexus — User Testing Checklist & Validation Plan

**Applies To**: Public Preview (v0.8.0+)
**Last Modified**: 2025-12-22 19:12 EST
**Status**: Living testing checklist

## Executive Summary

This document provides a complete testing framework for MetaDJ Nexus covering all features implemented through Sprint 1. Testing is organized into 10 comprehensive categories with clear pass/fail criteria, step-by-step scenarios, and measurable benchmarks.

### Testing Scope

**Sprint 1 Features Covered**:
- Welcome overlay & first-time experience
- Audio playback controls & queue management
- Playlist system (create, add, view, play, delete)
- Share functionality (4 methods)
- Search and filtering
- Shuffle and repeat modes
- Visual enhancements (waveform, dynamic backgrounds, collection artwork)
- Keyboard shortcuts
- Toast notifications
- WCAG 2.1 AA accessibility compliance

### Testing Priorities

**P0 (Critical)** - Must pass before launch:
- Audio playback functionality
- WCAG accessibility compliance
- Performance benchmarks (Core Web Vitals)

**P1 (High)** - Should pass before launch:
- Cross-browser compatibility
- Mobile responsiveness
- User experience flows

**P2 (Medium)** - Nice to have:
- Visual polish
- Advanced features
- Edge cases

### Estimated Time

- **Quick smoke test**: 10 minutes
- **Feature testing**: 2-3 hours
- **Full test suite**: 4-6 hours
- **Regression testing**: 1-2 hours

---

## 1. Feature Testing Scenarios

### 1.1 Welcome Overlay (First-Time Experience)

**Priority**: P1

#### Test Scenario 1.1.1: Initial Page Load

**Steps**:
1. Open MetaDJ Nexus in new incognito/private window
2. Observe welcome overlay appearance
3. Read welcome message and feature cards
4. Note visual design and layout

**Expected Behavior**:
- Welcome overlay appears immediately on page load (no flash of underlying content)
- Overlay contains:
  - Combined wordmark: "Welcome to" + MetaDJ logo + "verse"
  - Tagline: "Where music, visuals, and wisdom converge"
  - 3 feature cards (Original Music, Immersive Visuals, Beyond the Sound)
  - "Take Tour" + "Start Exploring" CTAs (plus Public Preview notice + User Guide link)
- Backdrop is semi-transparent with blur effect
- Overlay locks body scroll
- Focus trapped within overlay

**Pass Criteria**:
- ✅ Overlay appears instantly without layout shift
- ✅ All content readable and properly aligned
- ✅ Visual design matches MetaDJ aesthetic
- ✅ Body scroll locked while overlay open

**Notes**:
- Test on multiple viewport sizes
- Verify mobile responsiveness
- Check gradient button hover states

---

#### Test Scenario 1.1.2: Closing Welcome Overlay

**Steps**:
1. Open welcome overlay
2. Try each closing method:
   - Click "Start Exploring" button
   - Click backdrop outside overlay
   - Press Escape key
3. Verify overlay closes
4. Verify focus returns to main content

**Expected Behavior**:
- All three methods close overlay successfully
- Overlay fades out smoothly
- Body scroll restored
- Focus returns to first interactive element
- Main content immediately usable

**Pass Criteria**:
- ✅ All three close methods work
- ✅ Smooth transition animation
- ✅ No visual glitches or jumps
- ✅ Focus management correct

---

#### Test Scenario 1.1.3: Reopening User Guide

**Steps**:
1. Close welcome overlay
2. Click ⓘ User Guide icon in header (top-right)
3. Verify User Guide overlay opens
4. Scroll or use a navigation pill; active section updates
5. Close guide; focus returns to the header

**Expected Behavior**:
- User Guide button visible in header
- Clicking opens the User Guide overlay (not the Welcome Overlay)
- Guide content matches `meta-dj-nexus-guide-copy.ts`
- No localStorage issues

**Pass Criteria**:
- ✅ User Guide icon visible and clickable
- ✅ User Guide overlay opens with full content
- ✅ Navigation pills and scroll tracking work

---

### 1.2 Audio Playback Controls

**Priority**: P0 (Critical)

#### Test Scenario 1.2.1: Play First Track

**Steps**:
1. Close welcome overlay
2. Click "Start Listening" in the Hub hero (or play a Featured track from the Music panel)
3. Verify the player shows an active track and playback controls
4. Verify audio starts playing
5. Observe playback controls update

**Expected Behavior**:
- No track is auto-loaded on first paint (listener chooses when to start)
- "Start Listening" launches the hero track and begins playback
- Play/pause button visible and accessible once a track is selected
- Audio begins within 1-2 seconds
- Play button changes to pause icon
- Progress bar begins advancing
- Waveform visualization activates (if visible)
- Dynamic background updates (if enabled)

**Pass Criteria**:
- ✅ Audio plays within 2 seconds
- ✅ Controls update to reflect playing state
- ✅ No audio glitches or stuttering
- ✅ Visual feedback immediate

**Notes**:
- Test on different network speeds
- Monitor browser console for errors
- Check audio quality (320 kbps MP3)

---

#### Test Scenario 1.2.2: Pause and Resume

**Steps**:
1. Play a track
2. Click pause button
3. Verify audio stops
4. Click play button again
5. Verify audio resumes from same position

**Expected Behavior**:
- Pause button immediately stops audio
- Progress bar freezes at current position
- Waveform pauses
- Play button restores original state
- Audio resumes from exact pause point (within 0.5s)

**Pass Criteria**:
- ✅ Immediate pause response
- ✅ Resume from correct position
- ✅ No audio artifacts on resume

---

#### Test Scenario 1.2.3: Track Navigation (Next/Previous)

**Steps**:
1. Play a track
2. Click next track button
3. Verify next track loads and plays
4. Click previous track button
5. Verify previous track loads and plays
6. Test "smart previous" logic:
   - Play track for >3 seconds, click previous (should restart current track)
   - Play track for <3 seconds, click previous (should go to previous track)

**Expected Behavior**:
- Next button loads next track in queue
- Previous button loads previous track OR restarts current (based on playback time)
- Tracks transition smoothly (<1 second loading)
- Playback continues without manual intervention
- Progress bar resets for new track
- Collection artwork updates
- Track info updates

**Pass Criteria**:
- ✅ Next/previous buttons work correctly
- ✅ Smart previous logic functions as expected
- ✅ Smooth track transitions
- ✅ All UI elements update correctly

---

#### Test Scenario 1.2.4: Progress Bar Scrubbing

**Steps**:
1. Play a track
2. Click anywhere on progress bar
3. Verify playback jumps to that position
4. Drag progress handle to different position
5. Verify accurate seeking

**Expected Behavior**:
- Clicking progress bar immediately seeks to that position
- Dragging handle provides smooth scrubbing
- Time display updates in real-time
- Waveform position indicator updates
- Audio continues playing after seek (unless paused)

**Pass Criteria**:
- ✅ Click-to-seek accurate (within 1 second)
- ✅ Drag scrubbing smooth
- ✅ Time display synchronized
- ✅ No audio glitches during seek

---

#### Test Scenario 1.2.5: Volume Control

**Steps**:
1. Observe default volume (should be 100%)
2. Click volume slider and drag to different level
3. Verify audio volume changes
4. Click mute button
5. Verify audio muted (visual indicator shows)
6. Click unmute button
7. Verify audio restored to previous level
8. Test volume persistence:
   - Change volume to 50%
   - Reload page
   - Verify volume restored to 50%

**Expected Behavior**:
- Volume slider shows gradient fill indicating current level
- Dragging slider smoothly adjusts volume
- Mute button instantly silences audio
- Volume icon updates to reflect muted state
- Unmute restores previous volume level
- Volume setting persists across page reloads (localStorage)

**Pass Criteria**:
- ✅ Volume control smooth and responsive
- ✅ Mute/unmute works correctly
- ✅ Volume persistence functional
- ✅ Visual feedback accurate

---

### 1.3 Queue Management

**Priority**: P1

#### Test Scenario 1.3.1: View Queue

**Steps**:
1. Play a track from Featured or collection
2. Click Queue button in Control Panel
3. Verify Queue overlay opens
4. Observe queue structure (Manual Queue + Auto Queue)
5. Verify current track highlighted

**Expected Behavior**:
- Queue overlay opens from bottom with slide-up animation
- Two sections visible: Manual Queue (user-added) and Auto Queue (collection tracks)
- Current playing track highlighted with gradient border
- Track artwork, title, artist, collection, duration visible
- Queue controls (move up/down, remove) visible on each track
- Clear All button visible for Manual Queue

**Pass Criteria**:
- ✅ Queue opens smoothly
- ✅ Current track clearly indicated
- ✅ All track info visible and readable
- ✅ Controls accessible

---

#### Test Scenario 1.3.2: Add Tracks to Queue

**Steps**:
1. Browse track list (Featured, Collection, or Search results)
2. Add a track via Search results (queue icon) or the track options menu (•••) → "Add to Queue"
3. Verify toast notification appears
4. Open Queue overlay
5. Verify track added to Manual Queue section

**Expected Behavior**:
- "Add to Queue" action available via Search results and the track options menu
- Clicking shows toast: "Added to queue" with track title
- Track immediately appears at end of Manual Queue
- If Manual Queue was empty, it now has one track
- Track plays after current queue completes

**Pass Criteria**:
- ✅ Toast notification appears
- ✅ Track added to correct section
- ✅ Queue order correct
- ✅ No duplicates (unless intended)

---

#### Test Scenario 1.3.3: Reorder Queue

**Steps**:
1. Add 3+ tracks to Manual Queue
2. Open Queue overlay
3. Click "Move Up" on second track
4. Verify track moves up one position
5. Click "Move Down" on first track
6. Verify track moves down one position
7. Test boundary conditions:
   - Try moving top track up (should disable/do nothing)
   - Try moving bottom track down (should disable/do nothing)

**Expected Behavior**:
- Move Up swaps track with track above
- Move Down swaps track with track below
- Buttons disabled when at boundary
- Reordering smooth with animation
- Current playing track remains playable during reorder

**Pass Criteria**:
- ✅ Reordering works correctly
- ✅ Boundary conditions handled
- ✅ Visual feedback immediate
- ✅ No playback interruption

---

#### Test Scenario 1.3.4: Remove Tracks from Queue

**Steps**:
1. Add several tracks to Manual Queue
2. Open Queue overlay
3. Click "Remove" on a track
4. Verify track removed from queue
5. Test removing current playing track:
   - Queue should skip to next track
   - Playback should continue

**Expected Behavior**:
- Remove button deletes track from queue
- Queue updates immediately
- If current track removed, next track starts playing
- If last track in queue removed, playback stops gracefully
- Toast notification confirms removal

**Pass Criteria**:
- ✅ Tracks removed correctly
- ✅ Current track removal handled gracefully
- ✅ Queue remains playable

---

#### Test Scenario 1.3.5: Clear All Queue

**Steps**:
1. Add multiple tracks to Manual Queue
2. Click "Clear All" button
3. Verify confirmation (if implemented)
4. Verify all Manual Queue tracks removed
5. Verify Auto Queue unaffected

**Expected Behavior**:
- "Clear All" button only affects Manual Queue
- All user-added tracks removed
- Auto Queue (collection tracks) remains
- Current playing track continues (if from Auto Queue)
- Toast notification confirms clear action

**Pass Criteria**:
- ✅ Manual Queue cleared completely
- ✅ Auto Queue preserved
- ✅ Playback state appropriate

---

### 1.4 Playlist System

**Priority**: P1

#### Test Scenario 1.4.1: Create Playlist

**Steps**:
1. Navigate to Playlists section (if separate view)
2. Click "Create Playlist" button
3. Enter playlist name
4. Optionally add description
5. Save playlist
6. Verify playlist appears in playlist list

**Expected Behavior**:
- Create Playlist button/modal accessible
- Name field required, description optional
- Save creates playlist with timestamp
- Playlist appears in user's playlist library
- Empty playlist ready to receive tracks

**Pass Criteria**:
- ✅ Playlist creation successful
- ✅ Metadata saved correctly
- ✅ Playlist appears in list

**Notes**:
- Test special characters in name
- Test very long names/descriptions
- Verify uniqueness constraints (if any)

---

#### Test Scenario 1.4.2: Add Tracks to Playlist

**Steps**:
1. Create or select a playlist
2. Browse music catalog
3. Click "Add to Playlist" on a track
4. Select target playlist from dropdown
5. Verify track added
6. Repeat with multiple tracks

**Expected Behavior**:
- "Add to Playlist" button visible on track cards
- Dropdown shows all user playlists
- Track added to selected playlist immediately
- Toast confirms addition
- No duplicate prevention (user can add same track multiple times if desired)

**Pass Criteria**:
- ✅ Tracks added to correct playlist
- ✅ Multiple additions work
- ✅ Toast notifications functional

---

#### Test Scenario 1.4.3: View Playlist Details

**Steps**:
1. Select a playlist from playlist library
2. View playlist detail page
3. Verify track list displayed
4. Verify metadata (name, description, track count, duration)
5. Verify playback controls available

**Expected Behavior**:
- Playlist detail view shows:
  - Playlist name
  - Track count and total duration
  - All tracks in order
  - Play All and Share actions
- Track list displays artwork, title, artist, duration
- Current playing track highlighted (if playing from this playlist)

**Pass Criteria**:
- ✅ All metadata accurate
- ✅ Track list complete and ordered
- ✅ Visual design consistent

---

#### Test Scenario 1.4.4: Play Playlist

**Steps**:
1. Open playlist detail view
2. Click "Play All" button
3. Verify first track starts playing
4. Verify entire playlist queued
5. Test "Play from track":
   - Click play on specific track in playlist
   - Verify playlist plays from that track forward

**Expected Behavior**:
- Play All loads all playlist tracks to queue
- Playback starts with first track
- Queue shows all remaining playlist tracks
- Clicking individual track starts from that position

**Pass Criteria**:
- ✅ Full playlist playback works
- ✅ Play from specific track works
- ✅ Queue management correct

---

#### Test Scenario 1.4.5: Delete Playlist

**Steps**:
1. Select a playlist
2. Click "Delete Playlist" button
3. Confirm deletion (if confirmation modal)
4. Verify playlist removed from library
5. Verify no orphaned data

**Expected Behavior**:
- Delete button accessible
- Confirmation modal prevents accidental deletion
- Playlist removed immediately after confirmation
- If playlist was playing, playback stops gracefully
- Toast confirms deletion

**Pass Criteria**:
- ✅ Playlist deleted successfully
- ✅ Confirmation prevents accidents
- ✅ No data corruption

---

### 1.5 Share Functionality

**Priority**: P1

#### Test Scenario 1.5.1: Copy Link

**Steps**:
1. Select a track or collection
2. Click Share button
3. Click "Copy Link" option
4. Verify clipboard contains correct URL
5. Paste URL in new browser tab
6. Verify it loads MetaDJ Nexus

**Expected Behavior**:
- Share menu opens with 4 options
- Copy Link button has contextual ARIA label
- Click copies URL to clipboard
- Toast confirms "Link copied"
- URL format: `/` (no deep-link params)
- Pasting URL loads the platform home

**Pass Criteria**:
- ✅ Link copied to clipboard
- ✅ URL stays clean
- ✅ Paste opens platform
- ✅ Toast notification appears

---

#### Test Scenario 1.5.2: Share on X (Twitter)

**Steps**:
1. Select a track or collection
2. Click Share button
3. Click "Share on X" option
4. Verify X share window opens (new tab/popup)
5. Verify pre-filled text includes track/collection title and URL

**Expected Behavior**:
- Share on X opens Twitter intent URL
- New window/tab with X compose UI
- Text pre-filled with format:
  - "Check out [Track Title] by MetaDJ on MetaDJ Nexus [URL]"
- User can edit before posting
- ARIA label includes context

**Pass Criteria**:
- ✅ X window opens
- ✅ Text pre-filled correctly
- ✅ URL included and functional

---

#### Test Scenario 1.5.3: Share on Facebook

**Steps**:
1. Select a track or collection
2. Click Share button
3. Click "Share on Facebook" option
4. Verify Facebook share dialog opens
5. Verify URL and metadata correct

**Expected Behavior**:
- Facebook share dialog opens in new window
- URL parameter includes correct link
- If Open Graph tags implemented, preview shows artwork/title
- User can add comment before sharing

**Pass Criteria**:
- ✅ Facebook dialog opens
- ✅ URL correct
- ✅ Metadata displayed (if OG tags present)

---

#### Test Scenario 1.5.4: Share via Email

**Steps**:
1. Select a track or collection
2. Click Share button
3. Click "Share via Email" option
4. Verify mailto link opens default email client
5. Verify subject and body pre-filled

**Expected Behavior**:
- Default email client opens
- Subject: "Check out [Track/Collection Title] on MetaDJ Nexus"
- Body: Includes title, artist, and URL
- User can edit before sending

**Pass Criteria**:
- ✅ Email client opens
- ✅ Subject and body pre-filled
- ✅ URL included and readable

---

### 1.6 Search and Filtering

**Priority**: P1

#### Test Scenario 1.6.1: Basic Search

**Steps**:
1. Click in search bar (centered in header)
2. Type search query (minimum 2 characters)
3. Observe live results dropdown
4. Verify results match query
5. Test different query types:
   - Track title partial match
   - Track title exact match
   - Artist name
   - Collection name
   - Genre

**Expected Behavior**:
- Search activates after 2+ characters
- Results appear in dropdown below search bar
- Dropdown shows:
  - Track artwork thumbnail
  - Track title (matching text highlighted)
  - Artist name
  - Collection name
  - "Add to Queue" button per result
- Results sorted by relevance (exact matches first)
- Empty state if no matches

**Pass Criteria**:
- ✅ Search responsive (<300ms)
- ✅ Results accurate and relevant
- ✅ Highlighting visible
- ✅ Empty state clear

---

#### Test Scenario 1.6.2: Search Result Interaction

**Steps**:
1. Perform search with multiple results
2. Click on a search result track
3. Verify track starts playing
4. Verify queue context updates
5. Test "Add to Queue" from search results
6. Verify track added to queue

**Expected Behavior**:
- Clicking result track plays it immediately
- Queue switches to containing collection
- Search dropdown closes after selection
- "Add to Queue" adds without playing
- Toast confirms queue addition

**Pass Criteria**:
- ✅ Track playback from search works
- ✅ Queue context correct
- ✅ Add to Queue functional

---

#### Test Scenario 1.6.3: Search Edge Cases

**Steps**:
1. Test single-character input (should not search)
2. Test special characters (@, #, %, etc.)
3. Test very long query (50+ characters)
4. Test rapid typing (debounce behavior)
5. Test clearing search (X button or backspace to empty)

**Expected Behavior**:
- Single character shows no results
- Special characters handled gracefully
- Long queries processed without error
- Rapid typing debounced (not searching every keystroke)
- Clearing search closes dropdown, shows all tracks

**Pass Criteria**:
- ✅ Edge cases handled gracefully
- ✅ No crashes or errors
- ✅ Debouncing functional

---

### 1.7 Shuffle and Repeat Modes

**Priority**: P1

#### Test Scenario 1.7.1: Enable Shuffle

**Steps**:
1. Play a collection or playlist
2. Click Shuffle button
3. Verify shuffle icon changes state (filled/gradient)
4. Skip to next track
5. Verify track order randomized
6. Verify no immediate repeats

**Expected Behavior**:
- Shuffle button toggles on/off
- Active state shows gradient fill
- Queue randomizes (but current track continues)
- Next track is random from remaining queue
- Tracks don't repeat until all played
- Toast notification confirms shuffle state

**Pass Criteria**:
- ✅ Shuffle toggle works
- ✅ Random order verified
- ✅ No immediate duplicates
- ✅ Visual state clear

---

#### Test Scenario 1.7.2: Repeat Modes

**Steps**:
1. Click Repeat button (cycles through modes)
2. Test Repeat Off:
   - Play through queue
   - Verify playback stops at end
3. Test Repeat Track:
   - Play a track
   - Verify track repeats infinitely
4. Test Repeat Queue:
   - Play through queue
   - Verify queue restarts from beginning

**Expected Behavior**:
- Repeat button cycles: Off → Track → Queue → Off
- Icon updates for each mode
- Repeat Off: Playback stops after last track
- Repeat Track: Current track loops
- Repeat Queue: Queue loops indefinitely
- Toast confirms mode changes

**Pass Criteria**:
- ✅ All three modes functional
- ✅ Icon states clear
- ✅ Behavior matches mode

---

#### Test Scenario 1.7.3: Shuffle + Repeat Combination

**Steps**:
1. Enable Shuffle
2. Enable Repeat Queue
3. Play through entire queue
4. Verify queue reshuffles and repeats

**Expected Behavior**:
- Shuffle and Repeat work together
- Each loop reshuffles queue
- All tracks eventually play
- No track repeats within same loop (unless Repeat Track enabled)

**Pass Criteria**:
- ✅ Combined modes work correctly
- ✅ Reshuffle on loop
- ✅ No unexpected behavior

---

### 1.8 Visual Enhancements

**Priority**: P2

#### Test Scenario 1.8.1: Waveform Visualization

**Steps**:
1. Open Control Panel
2. Play a track
3. Verify waveform appears below progress bar
4. Observe waveform animation synchronized with audio
5. Pause track, verify waveform pauses
6. Seek to different position, verify waveform updates

**Expected Behavior**:
- Waveform renders as canvas element
- Height: 64px
- Animation at 60fps (smooth)
- Waveform bars move in sync with music
- Pausing freezes animation
- Seeking updates waveform position

**Pass Criteria**:
- ✅ Waveform visible and animated
- ✅ Smooth 60fps rendering
- ✅ Synchronized with audio
- ✅ No performance degradation

**Performance Check**:
- Monitor FPS in DevTools
- Check CPU usage
- Verify no dropped frames

---

#### Test Scenario 1.8.2: Dynamic Background

**Steps**:
1. Play a track with collection artwork
2. Observe background gradient
3. Verify gradient colors extracted from artwork
4. Skip to next track with different artwork
5. Observe background transition
6. Test with track missing artwork

**Expected Behavior**:
- Background gradient extracted from collection artwork colors
- Gradient opacity: 30% (subtle)
- Smooth transition between tracks (1500ms)
- Fallback to default gradient if no artwork
- No layout shift during color extraction

**Pass Criteria**:
- ✅ Color extraction works
- ✅ Smooth transitions
- ✅ Fallback functional
- ✅ No visual glitches

---

#### Test Scenario 1.8.3: Collection Artwork Loading

**Steps**:
1. Navigate to track list
2. Observe artwork loading states
3. Test slow network (throttle to Slow 3G in DevTools)
4. Verify loading skeleton appears
5. Verify progressive loading
6. Test missing artwork URL

**Expected Behavior**:
- CollectionArtwork component shows skeleton while loading
- Progressive fade-in when loaded
- Fallback to placeholder if URL fails
- Size presets applied correctly (small=48px, medium=72px)
- No cumulative layout shift

**Pass Criteria**:
- ✅ Loading states visible
- ✅ Progressive loading smooth
- ✅ Fallback works
- ✅ CLS < 0.1

---

### 1.9 Keyboard Shortcuts

**Priority**: P1

#### Test Scenario 1.9.1: Playback Shortcuts

**Steps**:
1. Focus on page (not in input field)
2. Test each shortcut:
   - **Space**: Play/Pause
   - **Arrow Right**: Next track
   - **Arrow Left**: Previous track / Restart
   - **Arrow Up**: Volume +10%
   - **Arrow Down**: Volume -10%
   - **M**: Mute/Unmute
   - **Q**: Toggle Queue
   - **C**: Toggle Cinema
   - **Escape**: Close overlays/modals

**Expected Behavior**:
- All shortcuts work when not focused in text input
- Space toggles play/pause immediately
- Arrow keys navigate tracks and control volume
- M instantly mutes/unmutes
- Q opens/closes Queue overlay
- C opens/closes Cinema
- Escape closes topmost overlay

**Pass Criteria**:
- ✅ All shortcuts functional
- ✅ No conflicts with browser shortcuts
- ✅ Input fields don't trigger shortcuts
- ✅ Clear visual feedback

---

#### Test Scenario 1.9.2: Input Field Detection

**Steps**:
1. Click in search bar
2. Type characters (including Space)
3. Verify shortcuts disabled while typing
4. Click outside search bar
5. Verify shortcuts re-enabled

**Expected Behavior**:
- Shortcuts disabled when any input/textarea focused
- Space bar types space character in search
- Arrow keys move cursor in input
- Clicking outside restores shortcuts

**Pass Criteria**:
- ✅ Input fields block shortcuts
- ✅ Normal typing functional
- ✅ Shortcuts restore after blur

---

### 1.10 Toast Notifications

**Priority**: P2

#### Test Scenario 1.10.1: Toast Appearance

**Steps**:
1. Trigger various actions that show toasts:
   - Add track to queue
   - Copy share link
   - Enable shuffle
   - Change repeat mode
   - Clear queue
2. Observe toast notifications
3. Verify toast content and styling

**Expected Behavior**:
- Toast appears in top-right (desktop) or top-center (mobile)
- Contains icon + message
- Auto-dismisses after 3-5 seconds
- Stacks if multiple toasts
- Smooth slide-in animation
- ARIA live region for screen readers

**Pass Criteria**:
- ✅ Toasts appear for all actions
- ✅ Content clear and concise
- ✅ Auto-dismiss functional
- ✅ Accessible to screen readers

---

## 2. Accessibility Validation Protocol

**WCAG 2.1 Level AA Compliance**

### 2.1 Keyboard Navigation

**Priority**: P0 (Critical)

#### Test 2.1.1: Tab Order

**Steps**:
1. Load page
2. Press Tab repeatedly
3. Verify focus order logical and complete
4. Ensure all interactive elements reachable
5. Check focus visible on all elements

**Expected Behavior**:
- Tab order follows visual layout
- Focus indicator clearly visible (outline/glow)
- No keyboard traps
- Skip links available (if implemented)
- Focus order: Header → Search → Collections → Track List → Player Controls → Queue

**Pass Criteria**:
- ✅ Logical tab order (WCAG 2.4.3)
- ✅ Focus visible (WCAG 2.4.7)
- ✅ No keyboard traps (WCAG 2.1.2)

**Tools**: Manual testing + axe DevTools

---

#### Test 2.1.2: Keyboard Shortcuts

**Steps**:
1. Test all documented shortcuts (see Section 1.9)
2. Verify shortcuts listed in accessible location
3. Test shortcut conflicts with browser/screen reader

**Expected Behavior**:
- All shortcuts functional
- Shortcuts documented in User Guide
- No conflicts with essential browser shortcuts
- Shortcuts can be accessed via keyboard alone

**Pass Criteria**:
- ✅ All shortcuts work (WCAG 2.1.4)
- ✅ Documentation accessible
- ✅ No critical conflicts

---

#### Test 2.1.3: Modal/Overlay Keyboard Navigation

**Steps**:
1. Open Queue overlay via keyboard (Q key)
2. Verify focus trapped within overlay
3. Navigate all controls with Tab
4. Close with Escape
5. Verify focus returns to trigger element

**Expected Behavior**:
- Focus trapped within modal when open
- Tab cycles through modal controls only
- Escape closes modal
- Focus returns to element that opened modal
- Background content inert while modal open

**Pass Criteria**:
- ✅ Focus management correct (WCAG 2.4.3)
- ✅ Escape closes modal
- ✅ Focus restoration works

---

### 2.2 Screen Reader Testing

**Priority**: P0 (Critical)

**Tools**: NVDA (Windows), VoiceOver (Mac/iOS), JAWS (Windows)

#### Test 2.2.1: ARIA Labels

**Steps**:
1. Enable screen reader
2. Navigate through all interactive elements
3. Verify each element has descriptive label
4. Check contextual labels on Share buttons
5. Verify button states announced (pressed, expanded)

**Expected Behavior**:
- All buttons have meaningful labels
- Share buttons include track/collection context
- Player controls announce states (playing/paused)
- Progress bar announces current time
- Links describe destination

**Pass Criteria**:
- ✅ All elements labeled (WCAG 4.1.2)
- ✅ Context included where needed
- ✅ States announced correctly

**Key Elements to Test**:
- Play/Pause button
- Next/Previous buttons
- Volume slider
- Progress bar
- Share buttons (contextual labels)
- Queue buttons
- Search input

---

#### Test 2.2.2: Live Regions

**Steps**:
1. Enable screen reader
2. Perform actions that show toasts
3. Verify toasts announced automatically
4. Test queue updates announced
5. Test track changes announced

**Expected Behavior**:
- Toast messages announced via ARIA live region
- Track changes announced ("Now playing: [Title]")
- Queue updates announced ("Added to queue")
- Announcements don't interrupt user

**Pass Criteria**:
- ✅ Live regions functional (WCAG 4.1.3)
- ✅ Announcements timely
- ✅ Not overly verbose

---

#### Test 2.2.3: Semantic Structure

**Steps**:
1. Navigate page with screen reader
2. Use heading navigation (H key)
3. Use landmark navigation (D key)
4. Verify logical document structure

**Expected Behavior**:
- Headings in logical hierarchy (h1 → h2 → h3)
- Landmarks used correctly (header, main, nav, footer)
- Lists marked up as lists
- Forms properly associated with labels

**Pass Criteria**:
- ✅ Semantic HTML used (WCAG 1.3.1)
- ✅ Heading hierarchy logical
- ✅ Landmarks present

---

### 2.3 Visual Accessibility

**Priority**: P0 (Critical)

#### Test 2.3.1: Color Contrast

**Steps**:
1. Use Contrast Checker tool on all text
2. Test all color combinations:
   - Body text on background
   - Button text on button background
   - Link text on background
   - Disabled state text
3. Verify all meet WCAG AA (4.5:1 normal text, 3:1 large text)

**Expected Behavior**:
- Normal text (< 18pt): Contrast ≥ 4.5:1
- Large text (≥ 18pt): Contrast ≥ 3:1
- UI components: Contrast ≥ 3:1
- Gradient text remains readable

**Pass Criteria**:
- ✅ All text meets contrast requirements (WCAG 1.4.3)
- ✅ Interactive elements meet 3:1 minimum

**Tools**: Chrome DevTools Contrast Checker, WebAIM Contrast Checker

**Common Areas to Test**:
- White text on gradient backgrounds
- Purple/cyan text on dark backgrounds
- Disabled button states
- Placeholder text in search

---

#### Test 2.3.2: Focus Visible States

**Steps**:
1. Navigate page with keyboard
2. Verify focus indicator on every interactive element
3. Measure focus indicator contrast
4. Test custom focus styles

**Expected Behavior**:
- Focus indicator visible on all elements
- Minimum 3:1 contrast for focus indicator
- Focus indicator not removed by CSS
- Custom focus styles enhance (not reduce) visibility

**Pass Criteria**:
- ✅ Focus always visible (WCAG 2.4.7)
- ✅ Contrast sufficient (WCAG 1.4.11)

---

#### Test 2.3.3: Touch Target Sizes

**Steps**:
1. Test on touch device (mobile/tablet)
2. Measure interactive element sizes
3. Verify minimum 44×44px touch targets
4. Test spacing between adjacent targets

**Expected Behavior**:
- All buttons ≥ 44×44px
- Links in text ≥ 44px tall with padding
- Spacing between targets ≥ 8px
- Sliders have large touch handles

**Pass Criteria**:
- ✅ All targets meet 44px minimum (WCAG 2.5.5)
- ✅ Adequate spacing between targets

**Tools**: Mobile device testing, Chrome DevTools device mode

---

### 2.4 Pointer Interactions

**Priority**: P1

#### Test 2.4.1: Pointer Cancellation

**Steps**:
1. Test on touch device
2. Tap and hold button
3. Drag finger away from button before releasing
4. Verify action NOT triggered
5. Test on all interactive elements:
   - Queue management buttons (Move Up/Down, Remove)
   - Share menu buttons (Copy, X, Facebook, Email)
   - Player controls

**Expected Behavior**:
- Action triggered on `pointerup` (not `pointerdown`)
- Dragging away cancels action
- No accidental activations
- Applies to all clickable elements

**Pass Criteria**:
- ✅ Pointer cancellation works (WCAG 2.5.2)
- ✅ No accidental activations

**Files Updated**:
- `src/components/panels/left-panel/QueueSection.tsx`
- `src/components/ui/ShareButton.tsx`

---

### 2.5 Motion and Animation

**Priority**: P2

#### Test 2.5.1: Reduced Motion Support

**Steps**:
1. Enable "Reduce Motion" in OS settings
2. Reload page
3. Verify animations disabled or simplified
4. Test all animated elements:
   - Welcome overlay fade
   - Toast notifications
   - Cinema transitions
   - Gradient animations

**Expected Behavior**:
- `prefers-reduced-motion: reduce` media query respected
- Essential animations simplified (instant transitions)
- Non-essential animations disabled
- No parallax or excessive movement

**Pass Criteria**:
- ✅ Reduced motion respected (WCAG 2.3.3)
- ✅ Page remains usable
- ✅ No accessibility barriers

---

## 3. Cross-Browser/Device Testing Matrix

**Priority**: P1

### 3.1 Browser Compatibility

| Browser | Version | Desktop | Mobile | Status | Notes |
|---------|---------|---------|--------|--------|-------|
| **Chrome** | Latest | ✅ | ✅ | Required | Primary browser |
| **Firefox** | Latest | ✅ | ✅ | Required | Test audio API |
| **Safari** | Latest | ✅ | ✅ | Required | iOS critical |
| **Edge** | Latest | ✅ | N/A | Required | Chromium-based |
| **Chrome Android** | Latest | N/A | ✅ | Required | Mobile primary |
| **Safari iOS** | Latest | N/A | ✅ | Required | iPhone/iPad |

### 3.2 Device Testing

| Device Type | Viewport | Orientation | Priority | Test Focus |
|-------------|----------|-------------|----------|------------|
| **iPhone SE** | 375×667 | Portrait | P0 | Smallest mobile |
| **iPhone 12/13/14** | 390×844 | Portrait | P0 | Common mobile |
| **iPhone Pro Max** | 430×932 | Portrait | P1 | Large mobile |
| **iPad** | 768×1024 | Portrait | P1 | Tablet portrait |
| **iPad** | 1024×768 | Landscape | P1 | Tablet landscape |
| **Desktop** | 1440×900 | N/A | P0 | Common desktop |
| **Large Desktop** | 1920×1080 | N/A | P2 | High-res display |

### 3.3 Browser-Specific Tests

#### Chrome (Desktop & Mobile)

**Test Focus**:
- Audio playback performance
- Waveform rendering (60fps)
- Dynamic background color extraction
- Service worker (if implemented)

**Known Issues to Check**:
- Media session API integration
- Audio context resume after user gesture
- Cinema performance in background tabs

---

#### Firefox (Desktop & Mobile)

**Test Focus**:
- Web Audio API compatibility
- CSS gradient rendering
- Backdrop filter support
- Font rendering

**Known Issues to Check**:
- Audio autoplay policies
- Different gradient syntax handling
- Potential backdrop-blur-sm performance

---

#### Safari (Desktop & iOS)

**Test Focus**:
- Audio codec support (MP3)
- Touch interactions
- iOS media controls
- Viewport height (100vh issues)

**Known Issues to Check**:
- Audio playback restrictions (requires user gesture)
- Video inline playback (Cinema feature)
- Viewport units on iOS (use dvh if needed)
- Touch target sizes

**Critical for iOS**:
- Test on real device and simulator
- Verify Media Session API
- Check background audio playback
- Test fullscreen Cinema video

---

#### Edge (Desktop)

**Test Focus**:
- Chromium compatibility
- Font rendering on Windows
- Gradient rendering

**Known Issues to Check**:
- Should match Chrome behavior
- Potential Windows-specific rendering differences

---

### 3.4 Responsive Design Breakpoints

| Breakpoint | Width | Layout Changes | Priority |
|------------|-------|----------------|----------|
| **Mobile** | < 640px | Single column, stacked controls | P0 |
| **Tablet** | 640-1024px | Hybrid layout, collapsible panels | P1 |
| **Desktop** | > 1024px | Full layout, side panels visible | P0 |

#### Test Scenarios per Breakpoint

**Mobile (< 640px)**:
- [ ] Header logo, search, user guide visible
- [ ] Music panel tabs (Library/Playlists/Queue) fit and remain tappable
- [ ] Track cards stack vertically
- [ ] Player controls accessible (bottom)
- [ ] Queue opens as full overlay
- [ ] Cinema fullscreen on tap

**Tablet (640-1024px)**:
- [ ] Layout scales appropriately
- [ ] Side panels collapsible
- [ ] Track grid 2-column
- [ ] Controls comfortable size
- [ ] Touch targets adequate

**Desktop (> 1024px)**:
- [ ] Full layout with side panels
- [ ] Track grid 3-4 columns
- [ ] Hover states functional
- [ ] Keyboard navigation optimal
- [ ] All features accessible

---

## 4. Performance Benchmarks

**Priority**: P0 (Critical)

### 4.1 Core Web Vitals

**Measurement Tool**: Chrome DevTools Lighthouse, WebPageTest

| Metric | Target | Measurement | Priority |
|--------|--------|-------------|----------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Time to render main content | P0 |
| **FID** (First Input Delay) | < 100ms | Time to interactive response | P0 |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability score | P0 |
| **FCP** (First Contentful Paint) | < 1.8s | Time to any content | P1 |
| **TTI** (Time to Interactive) | < 3.9s | Full interactivity | P1 |

#### Test Scenario 4.1.1: Lighthouse Audit

**Steps**:
1. Open Chrome DevTools
2. Navigate to Lighthouse tab
3. Run audit (Performance + Accessibility)
4. Verify scores:
   - Performance: ≥ 90
   - Accessibility: ≥ 90
   - Best Practices: ≥ 90

**Expected Results**:
- LCP < 2.5s (collection artwork or hero content)
- FID < 100ms (first click responsive)
- CLS < 0.1 (no layout shifts during load)

**Pass Criteria**:
- ✅ All Core Web Vitals in "Good" range
- ✅ Performance score ≥ 90
- ✅ Accessibility score ≥ 90

---

### 4.2 Audio Performance

**Priority**: P0 (Critical)

| Metric | Target | Test Method |
|--------|--------|-------------|
| **Playback Start Latency** | < 1s | Time from click to audio |
| **Buffer Loading** | < 2s | Time to sufficient buffer |
| **No Audio Glitches** | 0 | Playback without stuttering |
| **Seek Responsiveness** | < 500ms | Time to respond to seek |

#### Test Scenario 4.2.1: Playback Latency

**Steps**:
1. Click play on a track
2. Measure time until audio starts
3. Test on different network speeds:
   - Fast 3G
   - Slow 3G
   - Offline (cached)

**Expected Behavior**:
- Audio starts < 1 second on good connection
- Audio starts < 3 seconds on Slow 3G
- Cached audio starts < 500ms

**Pass Criteria**:
- ✅ Meets latency targets
- ✅ No playback errors
- ✅ Progressive loading functional

---

#### Test Scenario 4.2.2: Audio Stability

**Steps**:
1. Play track for full duration
2. Monitor for glitches, stuttering, dropouts
3. Test during high CPU usage (open DevTools, run performance profile)
4. Test during network fluctuation (throttle network randomly)

**Expected Behavior**:
- No audio glitches under normal CPU load
- Graceful degradation under high load
- Buffering handles network fluctuations
- No audio-visual desync

**Pass Criteria**:
- ✅ Zero glitches on normal system
- ✅ Smooth playback maintained

---

### 4.3 Visual Performance

**Priority**: P1

| Metric | Target | Test Method |
|--------|--------|-------------|
| **Waveform Rendering** | 60 fps | Chrome DevTools Performance |
| **Color Extraction** | < 200ms | Time to extract artwork colors |
| **Cinema Video** | 30-60 fps | Video playback smoothness |
| **Animation Frame Rate** | 60 fps | All UI animations |

#### Test Scenario 4.3.1: Waveform Performance

**Steps**:
1. Open Control Panel with waveform visible
2. Play track
3. Open Chrome DevTools Performance tab
4. Record for 10 seconds
5. Analyze frame rate

**Expected Behavior**:
- Waveform renders at 60fps
- No dropped frames during playback
- CPU usage < 20% for waveform alone
- Smooth animation synchronized with audio

**Pass Criteria**:
- ✅ 60fps maintained
- ✅ No frame drops
- ✅ Acceptable CPU usage

**Tools**: Chrome DevTools Performance panel, FPS meter

---

#### Test Scenario 4.3.2: Dynamic Background Performance

**Steps**:
1. Play track with collection artwork
2. Measure color extraction time
3. Skip to next track
4. Observe transition smoothness
5. Monitor CPU/memory usage

**Expected Behavior**:
- Color extraction < 200ms
- Transition duration: 1500ms (smooth)
- No layout shift during transition
- Memory usage stable (no leaks)

**Pass Criteria**:
- ✅ Fast color extraction
- ✅ Smooth transitions
- ✅ No memory leaks

---

#### Test Scenario 4.3.3: Cinema Video Performance

**Steps**:
1. Open Cinema fullscreen
2. Play video
3. Monitor frame rate
4. Check video-audio sync
5. Test on different device tiers

**Expected Behavior**:
- Video plays at 30-60fps (based on source)
- No dropped frames on modern devices
- Audio-video sync maintained (< 100ms drift)
- Graceful degradation on low-end devices

**Pass Criteria**:
- ✅ Smooth video playback
- ✅ Sync maintained
- ✅ Acceptable on target devices

---

### 4.4 Memory & CPU Usage

**Priority**: P2

#### Test Scenario 4.4.1: Extended Playback

**Steps**:
1. Start playing queue
2. Let play for 30+ minutes
3. Monitor memory usage in DevTools
4. Check for memory leaks
5. Verify no performance degradation

**Expected Behavior**:
- Memory usage stable (< 100MB increase over 30 min)
- CPU usage < 15% average
- No memory leaks detected
- Waveform/visuals remain smooth

**Pass Criteria**:
- ✅ Memory stable
- ✅ No leaks detected
- ✅ Performance maintained

**Tools**: Chrome DevTools Memory profiler, Task Manager

---

#### Test Scenario 4.4.2: Mobile Battery Impact

**Steps**:
1. Test on mobile device
2. Play queue for 1 hour
3. Monitor battery drain
4. Compare with/without visuals enabled

**Expected Behavior**:
- Battery drain ≤ 15% per hour (audio only)
- Battery drain ≤ 25% per hour (with visuals)
- Device doesn't overheat
- Acceptable for extended listening

**Pass Criteria**:
- ✅ Battery drain acceptable
- ✅ No thermal issues

**Note**: Test on real device, not simulator

---

## 5. User Experience Evaluation

**Priority**: P1

### 5.1 First-Time User Experience

#### Test Scenario 5.1.1: Welcome Flow

**Steps**:
1. Open site as first-time visitor
2. Read welcome overlay
3. Close overlay ("Start Exploring" button)
4. Start listening ("Start Listening" or play a track)
5. Measure time to first audio playback

**Expected Behavior**:
- Welcome appears immediately (< 500ms)
- Content clearly explains platform
- Easy to close and start exploring
- Clear path to start listening (no forced autoplay)
- First play within 30 seconds of arrival

**Pass Criteria**:
- ✅ Welcome clear and inviting
- ✅ Easy to dismiss
- ✅ Quick path to first listen

**UX Questions**:
- Is welcome messaging compelling?
- Do feature cards clarify value?
- Is it easy to start listening?

---

#### Test Scenario 5.1.2: Feature Discoverability

**Steps**:
1. As new user, explore interface
2. Attempt to find key features without instructions:
   - Play a track
   - Add to queue
   - Open Cinema
   - Search for track
   - View collection
3. Note any confusion or difficulty

**Expected Behavior**:
- Primary actions obvious (large play buttons)
- Secondary actions discoverable (clear icons/labels)
- Cinema and Queue buttons visible
- Search prominent in header
- Collections clearly organized

**Pass Criteria**:
- ✅ Play functionality obvious
- ✅ Queue discoverable
- ✅ Search accessible
- ✅ Cinema feature findable

---

### 5.2 Core User Flows

#### Test Scenario 5.2.1: Time to First Listen

**Steps**:
1. Open site (new or returning user)
2. Click "Start Listening" (or play a track from Featured)
3. Measure total time from page load to audio start

**Target Time**: < 10 seconds for new users, < 3 seconds for returning

**Expected Behavior**:
- No track auto-loaded; "Start Listening" provides the fastest path to audio
- Play button becomes available immediately after selecting a track
- Audio starts quickly after click
- No barriers or distractions

**Pass Criteria**:
- ✅ Meets time targets
- ✅ No friction points

---

#### Test Scenario 5.2.2: Queue Management Ease

**Steps**:
1. Add 5 tracks to queue from different sources
2. Reorder queue
3. Remove 2 tracks
4. Clear queue
5. Measure time and ease of each action

**Expected Behavior**:
- "Add to Queue" buttons clearly labeled
- Queue overlay easy to open (Q key or button)
- Reorder intuitive (Move Up/Down)
- Remove action confirmable
- Clear All has safety confirmation

**Pass Criteria**:
- ✅ All actions intuitive
- ✅ No confusion or errors
- ✅ Feedback immediate

---

#### Test Scenario 5.2.3: Playlist Creation Flow

**Steps**:
1. Create new playlist
2. Add 3 tracks to playlist
3. View playlist
4. Play playlist
5. Note any friction or confusion

**Expected Behavior**:
- Playlist creation obvious
- Adding tracks straightforward
- Playlist displays clearly
- Playing playlist immediate

**Pass Criteria**:
- ✅ Flow intuitive
- ✅ No unnecessary steps
- ✅ Clear feedback

---

#### Test Scenario 5.2.4: Share Feature Visibility

**Steps**:
1. Locate share buttons on tracks
2. Open share menu
3. Test each share method
4. Evaluate ease of sharing

**Expected Behavior**:
- Share button visible on all tracks
- Share menu clear and organized
- All 4 methods functional
- Feedback confirms action (toast)

**Pass Criteria**:
- ✅ Share feature discoverable
- ✅ All methods work
- ✅ Clear feedback

---

#### Test Scenario 5.2.5: Search Effectiveness

**Steps**:
1. Search for track by partial title
2. Search for track by artist
3. Search for track by collection
4. Evaluate result quality and speed

**Expected Behavior**:
- Results appear quickly (< 300ms)
- Relevance sorting accurate
- Highlighting helps find match
- Easy to select result

**Pass Criteria**:
- ✅ Fast and accurate results
- ✅ Good relevance ranking
- ✅ Easy to use

---

### 5.3 Aesthetic & Brand Alignment

**Priority**: P2

#### Evaluation Criteria

**Visual Consistency**:
- [ ] Design matches MetaDJ brand aesthetic
- [ ] Glassmorphism implemented correctly
- [ ] Gradient usage consistent
- [ ] Typography hierarchy clear
- [ ] Color palette cohesive

**Premium Feel**:
- [ ] Interface feels polished
- [ ] Animations smooth and purposeful
- [ ] Details refined (spacing, alignment)
- [ ] No visual bugs or glitches

**Brand Voice**:
- [ ] Copy tone matches MetaDJ personality
- [ ] Artist-direct voice clear
- [ ] No generic platform language
- [ ] Authentic and personal

---

### 5.4 Emotional Response

**Priority**: P2

#### Qualitative Assessment

**Questions to Answer**:
1. Does the interface feel **premium**?
2. Is the experience **delightful**?
3. Are interactions **satisfying** (audio feedback, animations)?
4. Does it match **MetaDJ's creative vision**?
5. Would users **recommend** to friends?

**Testing Method**:
- User interviews (5-10 participants)
- First impressions (5-minute exploration)
- Task completion observation
- Post-session survey

**Success Indicators**:
- Positive emotional reactions
- Engagement with visual features (Cinema)
- Time spent exploring
- Willingness to return

---

## 6. Regression Testing Checklist

**Use After Updates/Deployments**

**Priority**: P0

### 6.1 Core Functionality Validation

Quick regression test to ensure existing features still work:

- [ ] **Audio Playback**: Play/pause works
- [ ] **Track Navigation**: Next/previous functional
- [ ] **Volume Control**: Slider and mute work
- [ ] **Progress Bar**: Scrubbing functional
- [ ] **Queue Operations**: Add/remove/reorder work
- [ ] **Search**: Results appear correctly
- [ ] **Collections**: Switching collections works
- [ ] **Keyboard Shortcuts**: All shortcuts functional
- [ ] **Share Features**: All 4 methods work
- [ ] **Analytics**: Tracking events fire
- [ ] **LocalStorage**: Preferences persist
- [ ] **No Console Errors**: Clean console on load and during use

### 6.2 Visual Regression

- [ ] **Layout Integrity**: No broken layouts
- [ ] **Responsive Design**: Breakpoints work
- [ ] **Gradient Rendering**: All gradients display
- [ ] **Font Loading**: All fonts load correctly
- [ ] **Collection Artwork**: Images display
- [ ] **Icons**: All icons render
- [ ] **Animations**: Smooth and correct

### 6.3 Accessibility Regression

- [ ] **Keyboard Navigation**: Tab order correct
- [ ] **Screen Reader**: ARIA labels present
- [ ] **Focus States**: Visible focus indicators
- [ ] **Color Contrast**: Meets WCAG AA
- [ ] **Touch Targets**: 44px minimum maintained

### 6.4 Performance Regression

- [ ] **Page Load**: < 3 seconds
- [ ] **Audio Start**: < 1 second
- [ ] **Waveform**: 60fps rendering
- [ ] **No Memory Leaks**: Stable memory usage

---

## 7. Known Issues & Limitations

**Current Status (v0.8.0+)**

### 7.1 Test Suite Status

**Total Tests**: 448
**Passing**: 448 (100%)
**Failing**: 0 (0%)

**Test Suite Notes**:
As of v0.9.26, all tests are passing after the code standardization effort. The test suite has been updated to reflect:
- Component renames (kebab-case → PascalCase)
- Directory restructuring (LeftPanel/ → left-panel/)
- New shared UI components (Button, Card, Modal, TrackListItem)
- Updated import paths via barrel exports

---

### 7.2 Browser-Specific Issues

**Safari (iOS)**:
- Audio playback requires initial user gesture (expected behavior)
- 100vh viewport units may cause issues (consider dvh)
- Backdrop-filter may have performance impact

**Firefox**:
- Gradient rendering slightly different from Chrome
- Minor font rendering variations

**Edge**:
- Should behave identically to Chrome (Chromium-based)
- Report any differences as bugs

---

### 7.3 Performance Limitations

**Known Constraints**:
- Waveform visualization CPU-intensive on low-end devices
- Dynamic background color extraction adds ~100-200ms per track
- Cinema fullscreen video requires modern device for 60fps

**Mitigation**:
- User preference toggles planned for visual features
- Graceful degradation on low-end hardware
- Progressive enhancement approach

---

### 7.4 Feature Limitations

**Not Yet Implemented**:
- Playlist sharing (roadmap)
- Collaborative playlists (future)
- Offline playback (future)
- Advanced EQ controls (future)
- User accounts/authentication (Phase 2)

**Deferred Features**:
- User preference toggles for visuals (optional)
- Advanced analytics dashboard (post-launch)
- Social features (future phase)

---

### 7.5 Technical Debt

**Documented Items**:
1. Test suite brittleness needs comprehensive fix
2. Some TypeScript `any` types should be refined
3. Component organization could be further modularized
4. Analytics implementation incomplete (tracking code ready, event wiring in progress)

**Not Blocking Launch**:
- These items tracked for post-launch refinement
- No user-facing impact
- Plan for quarterly tech debt reduction sprints

---

## 8. Testing Tools & Resources

### 8.1 Accessibility Tools

**Required**:
- [axe DevTools](https://www.deque.com/axe/devtools/) - Chrome extension for automated accessibility testing
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome DevTools

**Screen Readers**:
- **NVDA** (Windows) - Free, open-source
- **VoiceOver** (Mac/iOS) - Built into macOS/iOS
- **JAWS** (Windows) - Industry standard (paid)

**Color Contrast**:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Who Can Use](https://www.whocanuse.com/) - Shows contrast impact across vision types
- Chrome DevTools Contrast Ratio tool (built-in)

---

### 8.2 Performance Tools

**Core Web Vitals**:
- [Chrome DevTools Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/) - Real-world performance testing
- [Google PageSpeed Insights](https://pagespeed.web.dev/)

**Monitoring**:
- Chrome DevTools Performance panel
- Chrome DevTools Memory profiler
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)

**Network Testing**:
- Chrome DevTools Network throttling
- [Charles Proxy](https://www.charlesproxy.com/) - Network debugging
- Fast/Slow 3G simulation (DevTools)

---

### 8.3 Cross-Browser Testing

**Manual Testing**:
- Real devices (iOS, Android) - preferred
- Chrome DevTools Device Mode - for responsive testing
- Safari Developer Tools (Mac required for iOS testing)

**Automated/Cloud Testing** (optional):
- [BrowserStack](https://www.browserstack.com/) - Paid, comprehensive
- [LambdaTest](https://www.lambdatest.com/) - Paid, good free tier
- [Sauce Labs](https://saucelabs.com/) - Paid, enterprise-focused

**Recommendation**: Manual testing on physical devices for iOS, simulators acceptable for Android initial testing

---

### 8.4 Responsive Testing

**Built-in Tools**:
- Chrome DevTools Device Mode - Free, excellent
- Firefox Responsive Design Mode - Free
- Safari Responsive Design Mode - Free (Mac)

**Physical Devices**:
- iPhone (SE, 12/13/14, Pro Max) - Cover size range
- iPad (portrait + landscape) - Tablet testing
- Android phone - Cross-platform verification

**Viewport Testing**:
- Test 320px, 375px, 390px, 430px (mobile)
- Test 768px, 1024px (tablet)
- Test 1440px, 1920px (desktop)

---

### 8.5 Screen Reader Resources

**Tutorials**:
- [WebAIM Screen Reader Guide](https://webaim.org/articles/screenreader_testing/)
- [VoiceOver Getting Started](https://www.apple.com/voiceover/info/guide/)
- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)

**Testing Checklists**:
- [WebAIM WCAG Checklist](https://webaim.org/standards/wcag/checklist)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

---

## 9. Test Result Templates

### 9.1 Feature Test Result Template

**Feature**: [Feature Name]
**Tester**: [Name]
**Date**: [YYYY-MM-DD]
**Browser/Device**: [Chrome 120 / iPhone 14]
**Status**: ✅ Pass | ⚠️ Partial Pass | ❌ Fail

**Test Scenarios**:

| Scenario | Expected | Actual | Status | Notes |
|----------|----------|--------|--------|-------|
| [Scenario 1.1] | [Expected behavior] | [Actual behavior] | ✅/❌ | [Details] |
| [Scenario 1.2] | [Expected behavior] | [Actual behavior] | ✅/❌ | [Details] |

**Issues Found**:
1. [Issue description] - Priority: [P0/P1/P2]
2. [Issue description] - Priority: [P0/P1/P2]

**Overall Assessment**: [Summary]

---

### 9.2 Accessibility Test Result Template

**Accessibility Standard**: WCAG 2.1 Level AA
**Tester**: [Name]
**Date**: [YYYY-MM-DD]
**Tools Used**: [axe DevTools, NVDA, etc.]
**Status**: ✅ Pass | ⚠️ Partial Pass | ❌ Fail

**WCAG Success Criteria Tested**:

| Criteria | Level | Description | Status | Notes |
|----------|-------|-------------|--------|-------|
| 1.3.1 | A | Info and Relationships | ✅/❌ | [Details] |
| 2.4.3 | A | Focus Order | ✅/❌ | [Details] |
| 2.4.7 | AA | Focus Visible | ✅/❌ | [Details] |
| 2.5.2 | A | Pointer Cancellation | ✅/❌ | [Details] |

**Screen Reader Testing**:
- [ ] NVDA (Windows)
- [ ] VoiceOver (Mac)
- [ ] VoiceOver (iOS)

**Issues Found**:
1. [WCAG criterion violated] - [Description] - Priority: [P0/P1/P2]

**Overall Assessment**: [Summary]

---

### 9.3 Performance Test Result Template

**Test Type**: Performance Benchmark
**Tester**: [Name]
**Date**: [YYYY-MM-DD]
**Device**: [Desktop / Mobile]
**Network**: [Fast 4G / Slow 3G / Offline]
**Status**: ✅ Pass | ⚠️ Partial Pass | ❌ Fail

**Core Web Vitals**:

| Metric | Target | Actual | Status | Notes |
|--------|--------|--------|--------|-------|
| LCP | < 2.5s | [X.Xs] | ✅/❌ | [Details] |
| FID | < 100ms | [Xms] | ✅/❌ | [Details] |
| CLS | < 0.1 | [X.XX] | ✅/❌ | [Details] |

**Audio Performance**:

| Metric | Target | Actual | Status | Notes |
|--------|--------|--------|--------|-------|
| Playback Start | < 1s | [X.Xs] | ✅/❌ | [Details] |
| Buffer Load | < 2s | [X.Xs] | ✅/❌ | [Details] |

**Visual Performance**:

| Metric | Target | Actual | Status | Notes |
|--------|--------|--------|--------|-------|
| Waveform FPS | 60fps | [XXfps] | ✅/❌ | [Details] |
| Color Extraction | < 200ms | [Xms] | ✅/❌ | [Details] |

**Issues Found**:
1. [Performance issue] - Priority: [P0/P1/P2]

**Overall Assessment**: [Summary]

---

## 10. Bug Report Template

**Bug ID**: [AUTO] or [Manual #]
**Title**: [Concise bug description]
**Reporter**: [Name]
**Date Reported**: [YYYY-MM-DD]
**Priority**: [P0 - Critical | P1 - High | P2 - Medium | P3 - Low]
**Status**: [New | In Progress | Fixed | Won't Fix]

**Environment**:
- Browser: [Chrome 120]
- OS: [macOS 14.1]
- Device: [Desktop / iPhone 14]
- Screen Size: [1440×900]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Screenshots/Video**:
[Attach if applicable]

**Console Errors**:
```
[Paste console errors if any]
```

**Reproducibility**: [Always | Sometimes | Once]

**Workaround**: [If known]

**Related Issues**: [Link to related bugs]

**Notes**: [Additional context]

---

## Appendix A: Quick Test Script (10-Minute Smoke Test)

**Purpose**: Rapid validation that core functionality works after deployment or update

**Estimated Time**: 10 minutes

### Quick Test Steps

1. **Page Load** (1 min)
   - [ ] Page loads without errors
   - [ ] Welcome overlay appears (new session)
   - [ ] All images/fonts load
   - [ ] Console clean (no errors)

2. **Audio Playback** (2 min)
   - [ ] Click play on default track
   - [ ] Audio starts within 1 second
   - [ ] Pause/resume works
   - [ ] Next/previous track works
   - [ ] Volume control works

3. **Queue Management** (2 min)
   - [ ] Add track to queue
   - [ ] Open queue overlay (Q key)
   - [ ] Reorder track
   - [ ] Remove track
   - [ ] Clear queue

4. **Search** (1 min)
   - [ ] Type in search bar
   - [ ] Results appear
   - [ ] Click result plays track

5. **Visual Features** (2 min)
   - [ ] Waveform visible and animated
   - [ ] Dynamic background updates
   - [ ] Open Cinema (C key)
   - [ ] Video plays

6. **Accessibility** (2 min)
   - [ ] Tab through controls
   - [ ] Keyboard shortcuts work (Space, arrows, M)
   - [ ] Focus visible on all elements

**Pass Criteria**: All checkboxes checked = ✅ Pass smoke test

**If Failures**: Run full test suite to identify issues

---

## Appendix B: Testing Sequence Recommendation

**For Comprehensive Testing** (4-6 hours)

### Phase 1: Foundation (30 min)
1. Quick smoke test (10 min)
2. Cross-browser setup verification (20 min)

### Phase 2: Core Functionality (90 min)
1. Audio playback controls (30 min)
2. Queue management (30 min)
3. Search and filtering (30 min)

### Phase 3: Advanced Features (60 min)
1. Playlist system (30 min)
2. Share functionality (15 min)
3. Shuffle and repeat (15 min)

### Phase 4: Accessibility (60 min)
1. Keyboard navigation (20 min)
2. Screen reader testing (30 min)
3. Visual accessibility (10 min)

### Phase 5: Performance (30 min)
1. Lighthouse audit (10 min)
2. Audio performance (10 min)
3. Visual performance (10 min)

### Phase 6: Cross-Device (30 min)
1. Mobile testing (iOS/Android) (20 min)
2. Tablet testing (10 min)

### Phase 7: UX Evaluation (30 min)
1. First-time user flow (10 min)
2. Core user flows (15 min)
3. Aesthetic assessment (5 min)

---

## Summary

This comprehensive testing framework covers:

✅ **10 Feature Categories** with step-by-step scenarios
✅ **WCAG 2.1 AA Compliance** with detailed accessibility protocols
✅ **Cross-Browser Matrix** covering Chrome, Firefox, Safari, Edge
✅ **Performance Benchmarks** with measurable Core Web Vitals targets
✅ **UX Evaluation** criteria for qualitative assessment
✅ **Regression Checklist** for post-update validation
✅ **Known Issues** documentation with remediation plans
✅ **Testing Tools** recommendations for each area
✅ **Result Templates** for standardized reporting
✅ **Quick Test Script** for rapid smoke testing

**Estimated Testing Time**:
- Quick smoke test: **10 minutes**
- Full feature testing: **4-6 hours**
- Accessibility audit: **2-3 hours**
- Performance benchmarking: **1-2 hours**
- Total comprehensive testing: **8-12 hours**

**Recommended Testing Priority**:
1. **P0 (Critical)**: Audio playback, WCAG compliance, Core Web Vitals
2. **P1 (High)**: Cross-browser compatibility, mobile responsiveness, UX flows
3. **P2 (Medium)**: Visual polish, advanced features, edge cases

**Next Steps**:
1. Execute quick smoke test (10 min)
2. Run P0 critical tests (2-3 hours)
3. Document results using templates
4. Address any P0 failures before launch
5. Plan P1/P2 testing in iterative sprints

---

**Document Version**: 1.1
**Last Updated**: 2025-12-04
**Maintained by**: MetaDJ Nexus QA Team
