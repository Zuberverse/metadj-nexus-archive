# MetaDJ Nexus — Quick Test Script

**Purpose**: 10-minute smoke test for rapid validation after deployments or updates
**Applies To**: Public Preview (v0.8.0+)
**Last Modified**: 2025-12-19 21:20 EST

## Overview

This script provides a streamlined testing sequence to verify core functionality is working. Use this after deployments, updates, or bug fixes to quickly catch critical issues before running the full test suite.

**Estimated Time**: 10 minutes
**Pass Criteria**: All checkboxes must be checked
**If Failures**: Run full user testing checklist to identify specific issues

---

## Prerequisites

- [ ] Fresh browser session (incognito/private mode recommended)
- [ ] Browser DevTools console open (monitor for errors)
- [ ] Network connection: Fast 4G or better
- [ ] Audio enabled (not muted)

---

## Test Sequence

### 1. Initial Page Load (1 minute)

**Goal**: Verify page loads correctly without errors

- [ ] Navigate to MetaDJ Nexus URL
- [ ] Page loads within 3 seconds
- [ ] Welcome overlay appears immediately (no flash of content)
- [ ] No console errors (red messages in DevTools)
- [ ] All fonts load correctly (Cinzel headers, Poppins body)
- [ ] Collection artwork images appear
- [ ] Gradient backgrounds render correctly

**Quick Visual Check**:
- Header: Logo left, search center, user guide (ⓘ) right
- Welcome overlay: Title, tagline, 3 feature cards, "Start Exploring" button
- Background: Gradient with glassmorphism effects

**Console Check**: Should be clean, no errors

---

### 2. Welcome & Navigation (30 seconds)

**Goal**: Verify welcome overlay and basic navigation

- [ ] Read welcome overlay content (looks correct)
- [ ] Click "Start Exploring" button
- [ ] Overlay closes smoothly
- [ ] Focus moves to main content
- [ ] Hub hero shows "Enter Cinema" + "Chat with MetaDJai"
- [ ] Player controls visible at bottom

**Quick Check**: Can you see the player + the "Enter Cinema" CTA?

---

### 3. Audio Playback (2 minutes)

**Goal**: Verify core audio functionality

- [ ] Click "Enter Cinema" in the Hub hero
- [ ] Audio starts within 1 second
- [ ] Play button changes to Pause icon
- [ ] Progress bar begins advancing
- [ ] Waveform visualization appears and animates (if visible)
- [ ] Click Pause button
- [ ] Audio stops immediately
- [ ] Click Play again
- [ ] Audio resumes from correct position

**Volume Test**:
- [ ] Drag volume slider to 50%
- [ ] Volume changes audibly
- [ ] Click Mute button
- [ ] Audio silenced
- [ ] Click Unmute
- [ ] Volume restored to 50%

**Track Navigation**:
- [ ] Click Next button
- [ ] Next track loads and plays
- [ ] Click Previous button
- [ ] Previous track loads

**Console Check**: No audio-related errors

---

### 4. Queue Management (2 minutes)

**Goal**: Verify queue functionality

- [ ] Click on a track from Featured collection
- [ ] Click "Add to Queue" button
- [ ] Toast notification appears: "Added to queue"
- [ ] Press Q key (or click Queue button)
- [ ] Queue overlay opens from bottom
- [ ] Both Manual Queue and Auto Queue sections visible
- [ ] Added track appears in Manual Queue
- [ ] Current playing track highlighted

**Queue Operations**:
- [ ] Click "Move Up" on a track
- [ ] Track moves up one position
- [ ] Click "Remove" on a track
- [ ] Track removed from queue
- [ ] Click "Clear All" (if tracks in Manual Queue)
- [ ] Manual Queue cleared
- [ ] Auto Queue still populated

**Close Queue**:
- [ ] Press Q key or click outside
- [ ] Queue overlay closes

**Console Check**: No queue-related errors

---

### 5. Search Functionality (1 minute)

**Goal**: Verify search works

- [ ] Click in search bar (header center)
- [ ] Type "meta" (at least 2 characters)
- [ ] Search dropdown appears within 300ms
- [ ] Results show matching tracks
- [ ] Track artwork thumbnails visible
- [ ] Click on a search result
- [ ] Track starts playing
- [ ] Search dropdown closes

**Clear Search**:
- [ ] Click in search bar again
- [ ] Type "xyz123" (no matches)
- [ ] Empty state message appears
- [ ] Clear search (backspace or X button)
- [ ] Dropdown closes

**Console Check**: No search-related errors

---

### 6. Visual Features (2 minutes)

**Goal**: Verify visual enhancements

**Waveform** (if Control Panel open):
- [ ] Waveform visible below progress bar
- [ ] Waveform animates smoothly (60fps appearance)
- [ ] Waveform synchronized with audio

**Dynamic Background**:
- [ ] Background gradient visible
- [ ] Skip to different track
- [ ] Background color transitions smoothly
- [ ] Colors extracted from new collection artwork

**Cinema**:
- [ ] Press C key (or click Cinema button)
- [ ] Fullscreen cinema opens
- [ ] Video loads and plays
- [ ] Video synchronized with audio playback
- [ ] Press Escape
- [ ] Cinema closes, returns to main view
- [ ] Audio continues playing

**Console Check**: No visual/rendering errors

---

### 7. Keyboard Shortcuts (1 minute)

**Goal**: Verify keyboard controls

**Focus on page** (click outside search bar):
- [ ] Press Space
- [ ] Playback toggles (play/pause)
- [ ] Press Arrow Right
- [ ] Next track loads
- [ ] Press Arrow Left
- [ ] Previous track loads (or restarts)
- [ ] Press Arrow Up
- [ ] Volume increases 10%
- [ ] Press Arrow Down
- [ ] Volume decreases 10%
- [ ] Press M
- [ ] Audio mutes
- [ ] Press M again
- [ ] Audio unmutes

**Console Check**: No keyboard event errors

---

### 8. Share Functionality (30 seconds)

**Goal**: Verify share menu works

- [ ] Click Share button on a track
- [ ] Share menu opens with 4 options
- [ ] Click "Copy Link"
- [ ] Toast appears: "Link copied"
- [ ] Paste clipboard in new tab (verify URL format)
- [ ] Close share menu

**Console Check**: No share-related errors

---

### 9. Accessibility Quick Check (1 minute)

**Goal**: Verify basic accessibility

- [ ] Press Tab key repeatedly
- [ ] Focus moves through interactive elements
- [ ] Focus indicator visible on all elements
- [ ] Focus order logical (header → search → collections → tracks → player)
- [ ] No keyboard traps (can Tab through entire page)

**ARIA Quick Test** (if screen reader available):
- [ ] Enable VoiceOver/NVDA
- [ ] Navigate to Play button
- [ ] Button label announced (e.g., "Play" or "Pause")
- [ ] Navigate to Share button
- [ ] Contextual label announced (includes track name)

---

### 10. Final Checks (30 seconds)

**Goal**: Verify no critical issues

- [ ] Return to DevTools Console
- [ ] **No red errors** (warnings OK)
- [ ] Check Network tab
- [ ] All audio files loaded successfully (200 status)
- [ ] Check Performance
- [ ] No significant frame drops or lag

**Memory Check** (optional but recommended):
- [ ] Open DevTools Memory tab
- [ ] Take heap snapshot
- [ ] Play 3-4 tracks
- [ ] Take another snapshot
- [ ] Memory increase < 50MB (acceptable)

---

## Results Summary

**Test Date**: [YYYY-MM-DD]
**Tester**: [Name]
**Browser**: [Chrome 120 / Safari 17 / etc.]
**Device**: [Desktop / iPhone 14 / etc.]

**Overall Result**: ✅ PASS | ❌ FAIL

**Checklist Summary**:
- Total Checks: 80+
- Passed: ___ / 80
- Failed: ___ / 80

**Critical Issues Found** (if any):
1. [Issue description]
2. [Issue description]

**Console Errors** (if any):
```
[Paste console errors]
```

**Performance Notes**:
- Page load time: [X.Xs]
- Audio start time: [X.Xs]
- FPS (visual check): [Smooth / Some drops / Laggy]

---

## Pass/Fail Criteria

**✅ PASS Requirements**:
- All checklist items completed successfully
- Zero console errors (warnings acceptable)
- Audio playback smooth and responsive
- UI interactions work as expected
- No critical visual bugs

**❌ FAIL Triggers** (run full test suite if any occur):
- Console errors present
- Audio playback fails or glitches
- UI controls non-functional
- Critical visual bugs (broken layout, missing content)
- Keyboard shortcuts not working
- Accessibility violations (focus traps, missing labels)

---

## Next Steps

### If Test PASSES ✅
- Document pass in test log
- Proceed with deployment/release
- Schedule periodic smoke tests (weekly recommended)

### If Test FAILS ❌
1. Document all failures in bug report
2. Run full [User Testing Checklist](./user-testing-checklist.md) to identify specific issues
3. Prioritize failures (P0 = blocking, P1 = high, P2 = medium)
4. Fix P0 issues before deployment
5. Re-run smoke test after fixes
6. If repeated failures, investigate root cause

---

## Tips for Effective Testing

**Preparation**:
- Use incognito/private mode for clean state
- Clear browser cache if testing after update
- Test on primary target browser first (Chrome)
- Keep DevTools console visible throughout test

**During Testing**:
- Don't rush—accuracy over speed
- Note any "weird" behavior even if test passes
- If something feels off, investigate deeper
- Take screenshots of failures for bug reports

**After Testing**:
- Document results immediately
- Share results with team
- Update test script if new features added
- Track trends (are certain tests failing repeatedly?)

---

## Automation Potential

**Future Enhancement**: This script could be automated using:
- **Browser automation runner** (Playwright) for E2E testing
- **Jest** + **Testing Library** for component tests
- **Lighthouse CI** for performance regression

**Current Status**: Manual testing recommended for Sprint 1

---

**Script Version**: 1.0
**Last Updated**: 2025-12-22
**Maintained by**: MetaDJ Nexus QA Team
