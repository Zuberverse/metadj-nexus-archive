# Hooks Reference

> **Complete reference for all custom React hooks in MetaDJ Nexus**

**Last Modified**: 2025-12-22 19:12 EST
## Overview

MetaDJ Nexus uses 48 custom React hooks organized by domain. Hooks can be imported directly from their files or via the `@/hooks` barrel export.

```typescript
import { useAudioPlayback } from '@/hooks/use-audio-playback';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useClickAway, useEscapeKey } from '@/hooks';
```

---

## Audio Hooks

Hooks for audio playback, analysis, and management.

### useAudioPlayback

**File**: `src/hooks/use-audio-playback.ts`

Core audio playback management hook. Coordinates with PlayerContext for state.

```typescript
const { play, pause, toggle, seek, setVolume } = useAudioPlayback();
```

### useAudioAnalyzer / useAudioLevels

**File**: `src/hooks/use-audio-analyzer.ts`

Audio frequency analysis for visualizations. Returns spectrum data for Cinema visualizers.

```typescript
const { analyzerNode, frequencyData } = useAudioAnalyzer(audioElement);
const levels = useAudioLevels(analyzerNode);
```

### useAudioPreloader

**File**: `src/hooks/use-audio-preloader.ts`

Preloads audio files for smooth playback transitions. Warmup begins after the listener selects a track (no background song preloading on app boot).

**Exports**:
- `useAudioPreloader` — Main hook
- `getCachedUrl` — Get cached audio URL
- `releaseTrack` — Release cached track
- `preloadTrackOnHover` — Preload on hover interaction

```typescript
const { getCachedUrl, waitForCachedUrl, releaseTrack } = useAudioPreloader(currentTrack, queue);
```

### useAudioSource

**File**: `src/hooks/use-audio-source.ts`

Manages audio source URLs and streaming state.

### useAudioVolume

**File**: `src/hooks/use-audio-volume.ts`

Volume control with persistence. Saves volume preference to localStorage.

```typescript
const { volume, setVolume, isMuted, toggleMute } = useAudioVolume();
```

### useAudioAnalytics

**File**: `src/hooks/use-audio-analytics.ts`

Tracks audio playback events for analytics (play, pause, complete, skip).

---

## Cinema Hooks

Hooks for 3D visualization and Cinema features.

### useCinema

**File**: `src/hooks/cinema/use-cinema.ts`

Main Cinema state management. Controls scene selection and visualizer state.

```typescript
const { currentScene, setScene, cinemaEnabled } = useCinema();
```

### useCinemaControls

**File**: `src/hooks/cinema/use-cinema-controls.ts`

Cinema UI control state (fullscreen, settings panel, etc.).

### useCinemaVideo

**File**: `src/hooks/cinema/use-cinema-video.ts`

Video scene playback management for Cinema video backgrounds.

### useCinemaAnalytics

**File**: `src/hooks/cinema/use-cinema-analytics.ts`

Tracks Cinema interaction events for analytics.

### useDream

**File**: `src/hooks/use-dream.ts`

Daydream AI visual generation integration. Manages stream creation, WHIP ingest, parameter updates, and playback.

```typescript
const {
  status,         // DaydreamStatus (idle/connecting/streaming/error + countdownRemaining, playbackId, etc.)
  isConfigured,   // boolean | null (DAYDREAM_API_KEY configured)
  overlayReady,   // boolean (countdown finished; safe to show playback iframe/video)
  startDream,     // Begin Dream session
  stopDream,      // End Dream + cleanup
  retryDream,     // Stop + restart
  forceSync,      // Force prompt PATCH even if prompt hasn't changed
  patchSupported, // null (unknown) | true (PATCH works) | false (PATCH failed, restart needed)
} = useDream({ getCaptureStream, prompt, enabled });
```

**Options**:
- `getCaptureStream` — Async function returning MediaStream from canvas
- `prompt` — Generation prompt (composed as `{persona} {promptBase}`)
- `enabled` — Whether Dream feature is active (controls config check)

**Default Configuration**:
- Model: `stabilityai/sd-turbo`
- Prompt: `androgynous cartoon magical dj blue sparkle`
- Negative prompt: `blurry, low quality, flat, 2d`
- Resolution: 512×512 (1:1, webcam feed cropped to square)
- Countdown: 15 seconds (status polling continues through a ~60s warm-up grace window)

**Prompt Behavior**:
- Prompt updates sync via PATCH after the countdown finishes and the stream is active (WHIP connected or status poll confirms), with warm-up retries during the grace window
- **Prompt bar disabled** — prompt base stays locked to default; only persona changes update the prompt right now
- **Prompt does NOT persist** — resets to default on app restart for fresh creative start
- Persona (androgynous/female/male) DOES persist to localStorage
- `forceSync()` bypasses equality check to re-send current prompt

**PATCH Support Detection**:
- After 5 consecutive PATCH failures, `patchSupported` becomes `false`
- UI shows "Live updates unavailable" when PATCH fails
- Warm-up errors (404/409/429/5xx/network) inside the grace window are retried and **do NOT count** toward the 5-failure limit
- 404s without explicit "not ready" messaging are treated as warmup during the grace window after stream creation
- Only actual failures after warmup (non-retryable responses, stream gone, or persistent network errors) count as failures

**ControlNet Settings** (SD21 models):
| ControlNet | Scale | Purpose |
|------------|-------|---------|
| OpenPose | 0.75 | Pose/body structure |
| HED (soft edge) | 0.2 | Edge detection |
| Canny | 0.2 | Hard edges |
| Depth | 0.75 | Depth perception |
| Color | 0.2 | Color reference |

---

## MetaDJai Hooks

Hooks for AI chat functionality.

### useMetaDjAi

**File**: `src/hooks/use-metadjai.ts`

Main MetaDJai chat hook. Manages conversation state and message streaming.

```typescript
const {
  messages,
  sendMessage,
  resetConversation,
  startNewSession,
  sessions,
  activeSessionId,
  switchSession,
  deleteSession,
  regenerateLastResponse,
  retryLastMessage,
  modelPreference,
  changeModelPreference,
  isLoading,
  error,
  rateLimit,
} = useMetaDjAi({ context: metaDjAiSessionContext });
```

MetaDJai adapts to user intent automatically (creative companion by default, music-first when asked). There is no user-facing mode toggle.

`modelPreference` defaults to `"openai"` and can be switched to `"google"`, `"anthropic"`, or `"xai"` via `changeModelPreference()`; the UI labels are GPT, Gemini, Claude, and Grok. The preference persists locally (`metadj_ai_provider`), and model changes insert a `kind: "model-switch"` separator in chat history.

`startNewSession()` creates a new empty chat session and makes it active. `sessions`, `activeSessionId`, `switchSession()`, and `deleteSession()` support multi‑chat history persisted to localStorage and surfaced in the chat toolbar.

### useMetaDjAiMessages

**File**: `src/hooks/use-metadjai-messages.ts`

Message state management and persistence. As of v0.8.1, messages are grouped into chat sessions with localStorage history.

**Exports**:
- `useMetaDjAiMessages` — Message state hook
- `createMessageId` — Generate unique message IDs

### useMetaDjAiStream

**File**: `src/hooks/use-metadjai-stream.ts`

Handles Vercel AI SDK streaming responses.

**Exports**:
- `processVercelAIBuffer` — Process streaming buffer (text, errors, tool calls/results)
- `handleVercelAIChunk` — Handle individual chunks (SSE + data stream formats)

### useMetaDjAiRateLimit

**File**: `src/hooks/use-metadjai-rate-limit.ts`

Client-side rate limiting for MetaDJai requests.

**Exports**:
- `useMetaDjAiRateLimit` — Rate limit state hook
- `RATE_LIMIT_WINDOW_MS` — Rate limit window (5 minutes)
- `MAX_MESSAGES_PER_WINDOW` — Max messages per window (20)

---

## UI/UX Hooks

General-purpose UI and interaction hooks.

### useKeyboardShortcuts

**File**: `src/hooks/use-keyboard-shortcuts.ts`

WCAG 2.1.4 compliant keyboard shortcuts with modifier keys.

```typescript
useKeyboardShortcuts({
  onPlayPause: togglePlayback,
  onNextTrack: playNext,
  onPrevTrack: playPrevious,
  onVolumeUp: increaseVolume,
  onVolumeDown: decreaseVolume,
  onMute: toggleMute,
});
```

### useFocusTrap

**File**: `src/hooks/use-focus-trap.ts`

Traps focus within a container (for modals and overlays).

```typescript
const focusTrapRef = useFocusTrap(isOpen);
return <div ref={focusTrapRef}>{/* Modal content */}</div>;
```

### useEscapeKey

**File**: `src/hooks/use-escape-key.ts`

Listen for Escape key to close overlays. Blurs active element to prevent focus ring highlights on triggers.

```typescript
useEscapeKey(() => closeModal(), { enabled: isOpen });
```

### useClickAway

**File**: `src/hooks/use-click-away.ts`

Detects clicks or touches outside one or more referenced elements. Essential for dismissing dropdowns and popovers.

```typescript
const ref = useRef<HTMLDivElement>(null);
useClickAway(ref, () => setIsOpen(false), { enabled: isOpen });
```

**Features**:
- Supports single `RefObject` or an array of `RefObject`s (for complex overlays/portals).
- Handles both `mousedown` and `touchstart` for mobile compatibility.
- Configurable event list and enabled state.

### useBodyScrollLock

**File**: `src/hooks/use-body-scroll-lock.ts`

Prevents body scroll when modals/overlays are open.

```typescript
useBodyScrollLock(isModalOpen);
```

### useDebounce

**File**: `src/hooks/use-debounce.ts`

Debounces a value for performance optimization.

```typescript
const debouncedQuery = useDebounce(query, 300);
```

### useSearch

**File**: `src/hooks/use-search.ts`

Consolidated search logic for track searching with debouncing and filtering. Extracted from SearchBar for reusability.

**Exports**:
- `useSearch` — Main search hook
- `UseSearchOptions` — Configuration interface
- `UseSearchResult` — Return value interface

```typescript
const { searchResults, debouncedQuery, isSearching, resultCount } = useSearch({
  tracks: allTracks,
  query: searchQuery,
  debounceMs: 300,
  collectionId: activeCollection?.id
});
```

**Features**:
- Debounces queries to prevent excessive filtering
- Memoizes results for performance
- Requires 2+ characters to start searching (UX optimization)
- Optional collection filtering

### useOnlineStatus

**File**: `src/hooks/use-online-status.ts`

Tracks online/offline status for offline-aware features.

```typescript
const isOnline = useOnlineStatus();
```

### usePanelPosition

**File**: `src/hooks/use-panel-position.ts`

Manages side panel positioning and state.

### useRecentlyPlayed

**File**: `src/hooks/use-recently-played.ts`

Tracks recently played tracks with localStorage persistence.

```typescript
const { recentTracks, addToRecent, clearRecent } = useRecentlyPlayed();
```

### useResponsivePanels

**File**: `src/hooks/use-responsive-panels.ts`

Responsive panel behavior based on viewport size.

### useSwipeGesture

**File**: `src/hooks/use-swipe-gesture.ts`

Touch swipe gesture detection for mobile interactions.

```typescript
const { onTouchStart, onTouchEnd } = useSwipeGesture({
  onSwipeLeft: () => nextTrack(),
  onSwipeRight: () => prevTrack(),
});
```

### useTrackDetails

**File**: `src/hooks/use-track-details.ts`

Fetches and manages track detail information.

### useDream

**File**: `src/hooks/use-dream.ts`

Daydream/StreamDiffusion integration for real-time AI visuals.

---

## Home Page Hooks

Specialized hooks for the main page orchestration. Located in `src/hooks/home/`.

### useHomeInitializers

**File**: `src/hooks/home/use-home-initializers.ts`

Initializes home page state on mount.

### useHomeQueueLifecycle

**File**: `src/hooks/home/use-home-queue-lifecycle.ts`

Manages queue persistence and lifecycle on home page.

### useQueueControls

**File**: `src/hooks/home/use-queue-controls.ts`

Main queue orchestration hook. Primary export for queue management.

```typescript
const {
  queue,
  currentTrack,
  addToQueue,
  removeFromQueue,
  clearQueue,
  reorderQueue,
} = useQueueControls(options);
```

### Queue Sub-Hooks

For granular queue operations:

#### useQueueCore

**File**: `src/hooks/home/use-queue-core.ts`

Core queue state and operations.

#### useQueueSync

**File**: `src/hooks/home/use-queue-sync.ts`

Queue synchronization with localStorage persistence.

#### useQueueMutations

**File**: `src/hooks/home/use-queue-mutations.ts`

Queue add/remove/reorder operations.

#### useQueueNavigation

**File**: `src/hooks/home/use-queue-navigation.ts`

Queue navigation (next/previous track).

### useViewManagement

**File**: `src/hooks/home/use-view-management.ts`

Manages view state (Hub, Music, Wisdom, Cinema).

### useViewMounting

**File**: `src/hooks/home/use-view-mounting.ts`

Adaptive view mounting based on device capability and data-saver signals. Keeps Hub always mounted, warms Wisdom/Journal on capable devices, and defers heavy surfaces on low-end hardware.

### usePlayerControls

**File**: `src/hooks/home/use-player-controls.ts`

Audio player control props for the home page.

### useAudioPlayerProps

**File**: `src/hooks/home/use-audio-player-props.ts`

Builds props for AudioPlayer component.

### useHubPlayback

**File**: `src/hooks/home/use-hub-playback.ts`

Hub-specific playback management.

### useMetaDjAiContext

**File**: `src/hooks/home/use-metadjai-context.ts`

MetaDJai context for home page integration.

### useMetaDjAiChatProps

**File**: `src/hooks/home/use-metadjai-chat-props.ts`

Builds props for MetaDJai chat component.

### useMetaDjAiPanelControls

**File**: `src/hooks/home/use-metadjai-panel-controls.ts`

MetaDJai panel open/close controls.

---

## Import Patterns

### Barrel Import (recommended for shared utilities)

```typescript
import { useClickAway, useEscapeKey, useDebounce } from '@/hooks';
```

### Direct Import (explicit paths)

```typescript
import { useAudioPlayback } from '@/hooks/use-audio-playback';
import { useQueueControls } from '@/hooks/home/use-queue-controls';
```

---

## Related Documentation

- [Contexts Reference](./contexts-reference.md) — React Context providers
- [Component Architecture](../architecture/component-architecture.md) — Component organization
- [Keyboard Navigation](../features/keyboard-navigation.md) — useKeyboardShortcuts usage
- [Queue Persistence](../features/queue-persistence.md) — Queue hook details
- [Vercel AI SDK Integration](../features/vercel-ai-sdk-integration.md) — MetaDJai hooks
