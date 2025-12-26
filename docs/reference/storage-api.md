# Storage Layer API Reference

> Unified persistence layer for MetaDJ Nexus client-side state management.

**Last Modified**: 2025-12-22 19:15 EST
## Overview

The storage layer provides type-safe localStorage management with:
- Centralized storage key management
- JSON serialization/deserialization with type safety
- Error handling for private browsing mode
- Storage availability detection
- Schema versioning for migrations
- Cross-tab synchronization support
- Specialized storage for MetaDJai chat sessions

**Architecture**:
```
src/lib/storage/
├── persistence.ts              # Main persistence API
├── metadjai-history-storage.ts # Chat session history
├── metadjai-session-storage.ts # Active session messages
├── storage.types.ts            # Replit bucket types
└── index.ts                    # Public exports
```

---

## Storage Keys

**Location**: `src/lib/storage/persistence.ts`

All localStorage keys are centralized in `STORAGE_KEYS` to prevent collisions and enable auditing.

### Complete Key Reference

```typescript
export const STORAGE_KEYS = {
  // Player state
  VOLUME: "metadj-volume",
  MUTED: "metadj-muted",

  // Queue state
  QUEUE: "metadj-queue",
  QUEUE_STATE: "metadj_queue_state",
  REPEAT_MODE: "metadj-repeat-mode",
  REPEAT_MODE_USER_SET: "metadj-repeat-mode-user-set",
  SHUFFLE_ENABLED: "metadj-shuffle-enabled",
  RECENTLY_PLAYED: "metadj-recently-played",

  // UI preferences
  SELECTED_COLLECTION: "metadj_selected_collection",
  FEATURED_EXPANDED: "metadj_featured_expanded",
  LEFT_PANEL_TAB: "metadj_left_panel_tab",
  ACTIVE_VIEW: "metadj_active_view",

  // Cinema settings
  CINEMA_SCENE: "metadj_cinema_scene",
  CINEMA_POSTER_ONLY: "metadj_cinema_poster_only",
  DREAM_PRESENTATION: "metadj_dream_presentation",

  // Wisdom
  WISDOM_LAST_SECTION: "metadj_wisdom_last_section",
  WISDOM_JOURNAL_ENTRIES: "metadj_wisdom_journal_entries",
  WISDOM_JOURNAL_LAST_VIEW: "metadj_wisdom_journal_last_view",
  WISDOM_JOURNAL_LAST_ENTRY_ID: "metadj_wisdom_journal_last_entry_id",
  WISDOM_JOURNAL_DRAFT_ENTRY_ID: "metadj_wisdom_journal_draft_entry_id",
  WISDOM_JOURNAL_DRAFT_TITLE: "metadj_wisdom_journal_draft_title",
  WISDOM_JOURNAL_DRAFT_CONTENT: "metadj_wisdom_journal_draft_content",

  // MetaDJai session
  METADJAI_SESSION: "metadj-ai-session",
  METADJAI_PROVIDER: "metadj_ai_provider",

  // Playlists
  PLAYLISTS: "metadj-nexus-playlists",

  // Analytics
  VISITED: "metadj_visited",

  // Welcome overlay
  WELCOME_SHOWN: "metadj-nexus-welcome-shown",
  WELCOME_DISMISSED: "metadj-nexus-welcome-dismissed",

  // MetaDJai nudge
  METADJAI_NUDGE_DISMISSED: "metadj_metadjai_nudge_dismissed",

  // Schema version for migrations
  SCHEMA_VERSION: "metadj_schema_version",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
```

**Schema versioning**: `SCHEMA_VERSION` is reserved for future migrations when storage formats change.

### Key Categories

| Category | Keys | Purpose |
|----------|------|---------|
| Player | `VOLUME`, `MUTED` | Audio playback preferences |
| Queue | `QUEUE`, `QUEUE_STATE`, `REPEAT_MODE`, `SHUFFLE_ENABLED`, `RECENTLY_PLAYED` | Playback queue persistence |
| UI | `SELECTED_COLLECTION`, `FEATURED_EXPANDED`, `LEFT_PANEL_TAB`, `ACTIVE_VIEW` | Panel and view state |
| Cinema | `CINEMA_SCENE`, `CINEMA_POSTER_ONLY`, `DREAM_PRESENTATION` | Visual experience settings |
| Wisdom | `WISDOM_LAST_SECTION`, `WISDOM_JOURNAL_*` | Knowledge hub + journal persistence |
| MetaDJai | `METADJAI_SESSION`, `METADJAI_PROVIDER` | AI chat session reference + model selector preference |
| Playlists | `PLAYLISTS` | User-created playlists |
| Onboarding | `WELCOME_SHOWN`, `WELCOME_DISMISSED`, `VISITED` | First-run experience |
| System | `SCHEMA_VERSION` | Migration tracking |

---

## Persistence API

### Storage Availability

#### `isStorageAvailable(): boolean`
Checks if localStorage is available. Caches result for performance.

```typescript
import { isStorageAvailable } from '@/lib/storage';

if (isStorageAvailable()) {
  // Safe to use storage
}
```

**Handles**:
- Server-side rendering (returns `false`)
- Private browsing mode
- Quota exceeded errors

### Raw Value Operations

#### `getRawValue(key: StorageKey): string | null`
Get a raw string value from storage.

```typescript
const raw = getRawValue(STORAGE_KEYS.VOLUME);
```

#### `setRawValue(key: StorageKey, value: string): boolean`
Set a raw string value. Returns `true` if successful.

```typescript
const success = setRawValue(STORAGE_KEYS.VOLUME, '0.8');
```

#### `removeValue(key: StorageKey): boolean`
Remove a value from storage.

```typescript
removeValue(STORAGE_KEYS.QUEUE);
```

### Type-Safe JSON Operations

#### `getValue<T>(key: StorageKey, fallback: T): T`
Get a JSON-parsed value with type safety.

```typescript
// Number value
const volume = getValue(STORAGE_KEYS.VOLUME, 1.0);

// Array value
const queue = getValue<Track[]>(STORAGE_KEYS.QUEUE, []);

// Object value
const state = getValue<QueueState>(STORAGE_KEYS.QUEUE_STATE, defaultState);
```

**Behavior**:
- Returns `fallback` if key not found
- Returns `fallback` if JSON parse fails
- Returns raw string if `fallback` is string type and parse fails

#### `setValue<T>(key: StorageKey, value: T): boolean`
Set a value with JSON serialization.

```typescript
setValue(STORAGE_KEYS.VOLUME, 0.8);
setValue(STORAGE_KEYS.QUEUE, tracks);
```

### Primitive Convenience Methods

#### String Operations
```typescript
import { getString, setString } from '@/lib/storage';

const collection = getString(STORAGE_KEYS.SELECTED_COLLECTION, 'all');
setString(STORAGE_KEYS.SELECTED_COLLECTION, 'metaverse-revelation');
```

#### Number Operations
```typescript
import { getNumber, setNumber } from '@/lib/storage';

const volume = getNumber(STORAGE_KEYS.VOLUME, 1.0);
setNumber(STORAGE_KEYS.VOLUME, 0.75);
```

**Note**: Uses `parseFloat` and validates with `Number.isFinite()`.

#### Boolean Operations
```typescript
import { getBoolean, setBoolean } from '@/lib/storage';

const muted = getBoolean(STORAGE_KEYS.MUTED, false);
setBoolean(STORAGE_KEYS.MUTED, true);
```

**Note**: Stores as `"true"` / `"false"` strings.

---

## Schema Migration

### Current Schema Version

```typescript
const CURRENT_SCHEMA_VERSION = 1;
```

### `runMigrations(): void`
Check and run storage migrations. Call early in app initialization.

```typescript
import { runMigrations } from '@/lib/storage';

// In app bootstrap
runMigrations();
```

**Behavior**:
- Reads current schema version from storage
- Skips if already up to date
- Logs migration progress
- Updates schema version on completion

**Future Migration Example**:
```typescript
// Example migration from v1 to v2
if (storedVersion < 2) {
  // Migrate data structure
  const oldQueue = getValue('metadj-queue', []);
  const newQueue = oldQueue.map(transformTrack);
  setValue('metadj-queue', newQueue);
}
```

---

## Bulk Operations

### `clearAllStorage(): boolean`
Clear all MetaDJ storage keys. Useful for "reset to defaults".

```typescript
import { clearAllStorage } from '@/lib/storage';

function handleReset() {
  if (clearAllStorage()) {
    window.location.reload();
  }
}
```

### `exportStorageData(): Record<string, unknown>`
Export all stored data as JSON. Useful for debugging or data portability.

```typescript
import { exportStorageData } from '@/lib/storage';

const data = exportStorageData();
console.log(JSON.stringify(data, null, 2));
```

**Returns**: Object with key names (from `STORAGE_KEYS`) as properties.

---

## Cross-Tab Synchronization

### `onStorageChange(callback): () => void`
Subscribe to storage changes from other tabs.

```typescript
import { onStorageChange, STORAGE_KEYS } from '@/lib/storage';

const unsubscribe = onStorageChange((key, newValue) => {
  if (key === STORAGE_KEYS.VOLUME) {
    setVolume(parseFloat(newValue ?? '1'));
  }
});

// Cleanup
return () => unsubscribe();
```

**Behavior**:
- Only fires for changes from other tabs (not same-tab writes)
- Automatically manages `window.storage` event listener
- Filters to only MetaDJ storage keys

---

## MetaDJai Chat History Storage

**Location**: `src/lib/storage/metadjai-history-storage.ts`

Manages persistent chat session history across browser sessions.

### Storage Keys

```typescript
const STORAGE_KEYS = {
  sessions: "metadj-nexus.metadjai.sessions",
  activeSessionId: "metadj-nexus.metadjai.activeSessionId",
} as const;
```

### Limits

```typescript
const MAX_SESSIONS = 20;              // Maximum stored sessions
const MAX_MESSAGES_PER_SESSION = 80;  // Messages per session
```

### Types

```typescript
interface MetaDjAiChatSession {
  id: string;
  title: string;
  createdAt: number;    // Unix timestamp
  updatedAt: number;    // Unix timestamp
  messages: MetaDjAiMessage[];
}
```

### API

#### `metadjAiHistoryStorage.loadSessions(): MetaDjAiChatSession[]`
Load all saved chat sessions, sorted by most recent first.

```typescript
const sessions = metadjAiHistoryStorage.loadSessions();
```

**Behavior**:
- Validates each session structure
- Filters invalid sessions
- Sorts by `updatedAt` descending
- Limits to `MAX_SESSIONS`

#### `metadjAiHistoryStorage.saveSessions(sessions: MetaDjAiChatSession[]): void`
Save chat sessions to storage.

```typescript
metadjAiHistoryStorage.saveSessions(sessions);
```

**Behavior**:
- Limits to `MAX_SESSIONS`
- Truncates messages to `MAX_MESSAGES_PER_SESSION` per session
- Silently fails on storage errors (non-blocking)

#### `metadjAiHistoryStorage.loadActiveSessionId(): string | null`
Get the ID of the currently active session.

#### `metadjAiHistoryStorage.saveActiveSessionId(id: string): void`
Save the active session ID.

#### `metadjAiHistoryStorage.createSession(seedMessages?): MetaDjAiChatSession`
Create a new session with optional seed messages.

```typescript
const session = metadjAiHistoryStorage.createSession([
  { role: 'user', content: 'Hello!', ... }
]);
```

**Title derivation**: Uses first user message content (truncated to 60 chars).

#### `metadjAiHistoryStorage.deriveTitle(messages): string`
Extract title from messages (first user message, truncated).

---

## MetaDJai Session Storage

**Location**: `src/lib/storage/metadjai-session-storage.ts`

Manages the active chat session's messages and rate limiting state.

### Storage Keys

```typescript
const STORAGE_KEYS = {
  messages: 'metadj-nexus.metadjai.messages',
  rateLimitWindow: 'metadj-nexus.metadjai.rateLimitWindow',
} as const;
```

### Limits

```typescript
const MAX_STORED_MESSAGES = 40;  // Messages in active session
```

### Rate Limit State

```typescript
interface RateLimitWindowPayload {
  startedAt: number;  // Window start timestamp
  count: number;      // Requests in current window
}
```

### API

#### Message Operations

```typescript
// Load messages with validation
const messages = metadjAiSessionStorage.loadMessages();

// Save messages (auto-truncates to MAX_STORED_MESSAGES)
metadjAiSessionStorage.saveMessages(messages);

// Clear all messages
metadjAiSessionStorage.clearMessages();
```

**Message validation** normalizes:
- Required fields: `id`, `role`, `content`, `createdAt`
- Optional fields: `status`, `kind` (model-switch separators + compatibility mode switch), `mode` (compatibility), `sources`, `toolsUsed`, `versions`, `currentVersionIndex`, `proposal`
- Validates `role` is `'user'` | `'assistant'`
- Validates `createdAt` is finite number

#### Rate Limit Operations

```typescript
// Load rate limit window
const window = metadjAiSessionStorage.loadRateLimitWindow();

// Save rate limit window
metadjAiSessionStorage.saveRateLimitWindow({
  startedAt: Date.now(),
  count: 1
});

// Clear rate limit (pass null to remove)
metadjAiSessionStorage.saveRateLimitWindow(null);
metadjAiSessionStorage.clearRateLimitWindow();
```

---

## Replit Bucket Types

**Location**: `src/lib/storage/storage.types.ts`

Types for Replit App Storage integration (server-side media storage).

```typescript
interface StorageBucketFile {
  getMetadata(): Promise<[Record<string, unknown>]>;
  createReadStream(options?: { start?: number; end?: number }): NodeJS.ReadableStream;
}

interface StorageBucket {
  file(path: string): StorageBucketFile;
}
```

**Usage**: These types are used by the audio/video streaming API routes, not client-side storage.

---

## Error Handling Patterns

### Graceful Degradation

All storage operations handle errors gracefully:

```typescript
// From persistence.ts
export function getValue<T>(key: StorageKey, fallback: T): T {
  const raw = getRawValue(key);
  if (raw === null) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    // If parse fails, check if fallback is string type
    if (typeof fallback === "string") {
      return raw as unknown as T;
    }
    logger.warn(`Failed to parse storage value for ${key}, using fallback`);
    return fallback;
  }
}
```

### Silent Failures for Non-Critical Operations

MetaDJai storage uses silent failure to prevent chat interruption:

```typescript
// From metadjai-session-storage.ts
saveMessages(messages: MetaDjAiMessage[]): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const payload = messages.slice(-MAX_STORED_MESSAGES);
    storage.setItem(STORAGE_KEYS.messages, JSON.stringify(payload));
  } catch {
    // Ignore storage failures to avoid breaking the chat experience
  }
}
```

### Private Browsing Detection

```typescript
function isStorageAvailable(): boolean {
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, "test");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    logger.warn("localStorage unavailable (private browsing or quota exceeded)");
    return false;
  }
}
```

---

## Usage Examples

### Persisting Player State

```typescript
import { getValue, setValue, STORAGE_KEYS } from '@/lib/storage';

function usePersistedVolume() {
  const [volume, setVolume] = useState(() =>
    getValue(STORAGE_KEYS.VOLUME, 1.0)
  );

  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    setValue(STORAGE_KEYS.VOLUME, newVolume);
  }, []);

  return [volume, updateVolume] as const;
}
```

### Loading Chat History

```typescript
import { metadjAiHistoryStorage } from '@/lib/storage';

function useChatHistory() {
  const [sessions, setSessions] = useState<MetaDjAiChatSession[]>([]);

  useEffect(() => {
    const loaded = metadjAiHistoryStorage.loadSessions();
    setSessions(loaded);
  }, []);

  const createSession = useCallback(() => {
    const newSession = metadjAiHistoryStorage.createSession();
    const updated = [newSession, ...sessions].slice(0, 20);
    setSessions(updated);
    metadjAiHistoryStorage.saveSessions(updated);
    return newSession;
  }, [sessions]);

  return { sessions, createSession };
}
```

### Cross-Tab Volume Sync

```typescript
import { onStorageChange, STORAGE_KEYS, getNumber } from '@/lib/storage';

useEffect(() => {
  const unsubscribe = onStorageChange((key, newValue) => {
    if (key === STORAGE_KEYS.VOLUME && newValue) {
      const parsed = parseFloat(newValue);
      if (Number.isFinite(parsed)) {
        setVolume(parsed);
      }
    }
  });

  return unsubscribe;
}, []);
```

---

## Module Exports

**Location**: `src/lib/storage/index.ts`

```typescript
// Main persistence API
export {
  STORAGE_KEYS,
  type StorageKey,
  isStorageAvailable,
  getValue,
  setValue,
  getString,
  setString,
  getNumber,
  setNumber,
  getBoolean,
  setBoolean,
  removeValue,
  getRawValue,
  setRawValue,
  runMigrations,
  clearAllStorage,
  exportStorageData,
  onStorageChange,
} from "./persistence";

// MetaDJ AI session storage
export { metadjAiSessionStorage } from "./metadjai-session-storage";

// Storage types (Replit bucket types)
export type { StorageBucket, StorageBucketFile } from "./storage.types";
```

**Note**: `metadjAiHistoryStorage` is imported directly from its module when needed for chat history management.
