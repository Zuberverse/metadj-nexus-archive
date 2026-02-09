# Crossfade Feature — MetaDJ Nexus

> **Seamless audio transitions between tracks**

**Last Modified**: 2026-02-07 22:27 EST

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [User Settings](#user-settings)
- [Technical Implementation](#technical-implementation)
- [Storage & Sync](#storage--sync)
- [Edge Cases & Limitations](#edge-cases--limitations)
- [Key Files](#key-files)
- [Future Improvements](#future-improvements)

---

## Overview

Crossfade provides smooth, seamless transitions between tracks by overlapping the end of the current track with the beginning of the next. When enabled, the player fades out the current track while simultaneously fading in the next track, creating a DJ-style mixing experience.

**Key Characteristics:**
- **Duration**: 3-second transition window
- **Trigger Point**: Activates when remaining time reaches 3 seconds
- **Volume Curves**: Sine/cosine easing for natural-sounding transitions
- **Default State**: Disabled (opt-in feature)

---

## How It Works

### Transition Timeline

```
Track A (current):     ████████████████████▓▒░
                                          └── fade out (3s)
Track B (next):                           ░▒▓████████████████████
                                          └── fade in (3s)
Timeline:              ─────────────────────|────────────────────
                                            ^ crossfade starts
                                              (3s before Track A ends)
```

### Transition Phases

1. **Pre-Crossfade**: Normal playback, monitoring remaining time
2. **Crossfade Start**: When `timeRemaining <= 3 seconds`:
   - Secondary audio element begins loading next track
   - Next track starts playing at volume 0
   - Fade animation begins
3. **During Crossfade** (3000ms):
   - Current track volume: `cos(progress * π/2)` → 1.0 to 0.0
   - Next track volume: `sin(progress * π/2)` → 0.0 to 1.0
4. **Crossfade Complete**:
   - Secondary audio becomes primary
   - Previous track element is cleaned up
   - Queue advancement handled by PlayerContext

### Volume Easing Curves

The crossfade uses trigonometric easing for perceptually smooth volume changes:

```typescript
const progress = elapsedMs / CROSSFADE_DURATION_MS;
const fadeOutVolume = Math.cos(progress * Math.PI / 2);  // 1 → 0
const fadeInVolume = Math.sin(progress * Math.PI / 2);   // 0 → 1
```

This creates an equal-power crossfade where the combined perceived loudness remains consistent throughout the transition.

---

## User Settings

### Accessing Settings

The crossfade toggle is located in the **Audio Settings** modal:
1. Click the **cog icon** (⚙️) in the Now Playing section
2. Toggle "Crossfade" on or off
3. Settings save automatically

### Settings Modal Location

- **Mobile**: Now Playing section → Settings cog
- **Desktop**: Left Panel → Now Playing → Settings cog

---

## Technical Implementation

### Dual Audio Element Architecture

Crossfade requires two `<audio>` elements to overlap playback:

```
┌─────────────────────────────────────────────┐
│ Primary Audio Element                       │
│ - Plays current track                       │
│ - Fades out during crossfade                │
│ - Becomes secondary after transition        │
└─────────────────────────────────────────────┘
         ↕ swap on crossfade complete
┌─────────────────────────────────────────────┐
│ Secondary Audio Element                     │
│ - Pre-loads next track                      │
│ - Fades in during crossfade                 │
│ - Becomes primary after transition          │
└─────────────────────────────────────────────┘
```

### Crossfade Hook

The `useAudioPlayback` hook manages crossfade logic:

```typescript
// Crossfade constants
const CROSSFADE_DURATION_MS = 3000;

// Crossfade trigger check (in playback loop)
useEffect(() => {
  if (!crossfadeEnabled || !nextTrack) return;
  
  const timeRemaining = duration - currentTime;
  
  if (timeRemaining <= 3 && timeRemaining > 0 && !isCrossfading) {
    startCrossfade(nextTrack);
  }
}, [currentTime, duration, crossfadeEnabled, nextTrack]);
```

### Crossfade State Machine

```
IDLE ──────────────────→ CROSSFADING ──────→ COMPLETING ──────→ IDLE
      (timeRemaining ≤ 3s)            (fade done)         (cleanup)
```

---

## Storage & Sync

### Cross-Device Sync

For logged-in users, crossfade preference syncs across devices:

| User Type | Storage | Sync Behavior |
|-----------|---------|---------------|
| **Authenticated** | PostgreSQL `user_preferences.audio_preferences` | Syncs across all devices |

> **Note:** Guest access is not supported. All users must be authenticated to access the platform.

### Database Schema

```typescript
// In user_preferences table
audio_preferences: {
  crossfadeEnabled: boolean,  // Default: false
  // Additional fields stored separately in localStorage:
  // - volume (0.0 - 1.0) via "VOLUME" key
  // - muted (boolean) via "MUTED" key
}
```

### API Endpoints

**Get Preferences:**
```http
GET /api/auth/preferences
```

**Update Preferences:**
```http
PATCH /api/auth/preferences
Content-Type: application/json

{
  "category": "audio",
  "updates": {
    "crossfadeEnabled": true
  }
}
```

### Settings Hook

The `useAudioSettings` hook handles persistence:

```typescript
const { crossfadeEnabled, setCrossfadeEnabled } = useAudioSettings();

// Toggle crossfade
const handleToggle = async () => {
  await setCrossfadeEnabled(!crossfadeEnabled);
  // Auto-saves to DB with localStorage as offline backup
};
```

---

## Edge Cases & Limitations

### When Crossfade is Skipped

| Scenario | Behavior |
|----------|----------|
| No next track available | Simple fade-out of current track |
| Repeat track mode | Loops same track without crossfade |
| Manual skip during crossfade | Cancels crossfade, immediate transition |
| Track ends before crossfade completes | Completes with remaining duration |

### Current Limitations

1. **Secondary Audio URL Resolution**: The secondary audio element bypasses the `useAudioSource` hook, using direct URL instead of resolved streaming URL
2. **Volume Sync**: Volume/mute changes during crossfade may not apply to the secondary element
3. **Playback Tracking**: Secondary audio is not tracked in PlayerContext during the overlap period
4. **Gapless Playback**: Not true gapless; there's a minimal overlap rather than sample-accurate transition

### Error Handling

If the next track fails to load during crossfade:
1. Crossfade is cancelled
2. Current track continues playing normally
3. Queue advances when current track ends
4. Error is logged but not surfaced to user

### Transition Race Condition Handling (January 2026 Fix)

The crossfade system includes guards to prevent audio stutter during track transitions:

1. **Ended Event Guard**: When crossfade is active, the `handleEnded` handler skips calling `onNext()` since crossfade already manages the transition. This prevents duplicate track advances.

2. **Crossfade Completion Handler**: When crossfade completes:
   - Secondary audio is paused and its src is cleared
   - `isTransitioningRef` is set to prevent shouldPlay state conflicts
   - `onNext()` is called to advance the queue
   - Main audio element then loads the next track cleanly

3. **Source Loading Guard**: A `lastAppliedSrcRef` tracks the last applied audio source, preventing redundant `pause()`/`load()` calls that could occur when comparing absolute URLs (`audio.src`) to relative URLs (`audioSrc`).

---

## Key Files

### Core Implementation

| File | Purpose |
|------|---------|
| `src/hooks/audio/use-audio-playback.ts` | Crossfade logic with dual audio elements |
| `src/hooks/audio/use-audio-settings.ts` | Settings persistence hook with DB sync |
| `src/components/player/AudioSettingsModal.tsx` | Settings UI with crossfade toggle |

### Settings & Preferences

| File | Purpose |
|------|---------|
| `src/lib/preferences.ts` | Server-side preferences CRUD |
| `src/app/api/auth/preferences/route.ts` | GET/PATCH API for preferences |

### Types

| File | Purpose |
|------|---------|
| `src/types/index.ts` | AudioPreferences type definition |

---

## Future Improvements

### Planned Enhancements

1. **Configurable Duration**: Allow users to choose crossfade length (1-12 seconds)
2. **Proper Secondary URL Resolution**: Use `useAudioSource` for secondary element
3. **Volume Sync**: Apply real-time volume changes to both elements during crossfade
4. **Beat-Matched Crossfade**: Analyze BPM to align transition points
5. **Visual Indicator**: Show crossfade progress in the UI

### Migration Path

Settings that could be added to the `audio_preferences` schema:

```typescript
audio_preferences: {
  crossfadeEnabled: boolean,
  crossfadeDuration: number,  // Future: 1000-12000ms
  crossfadeStyle: 'linear' | 'easeInOut' | 'beatMatched',  // Future
}
```

---

## Related Documentation

- [Audio Player Standards](./audio-player-standards.md) - Complete playback behavior reference
- [Cross-Device Sync](../architecture/CROSS-DEVICE-SYNC.md) - Settings synchronization architecture
