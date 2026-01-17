# Cross-Device Sync Plan

**Last Modified**: 2026-01-16 22:18 EST

## Summary

MetaDJ Nexus is local-first with selective cross-device sync for authenticated users. Audio preferences, recently played history, and journal entries sync across devices via PostgreSQL. The sync is automatic with localStorage fallback for offline resilience.

> **Note:** Guest access is not supported. All users must create an account to access the platform.

## Implemented Cross-Device Sync

The following features now sync across devices for logged-in users:

### Audio Preferences (2026-01-15)
- **Storage**: PostgreSQL `user_preferences.audio_preferences` JSONB column
- **API**: `GET/PATCH /api/auth/preferences`
- **Synced Settings**: crossfadeEnabled, muted, volume, autoplay
- **Fallback**: localStorage for API failures and offline resilience

### Recently Played (2026-01-15)
- **Storage**: PostgreSQL `recently_played` table (user_id, track_id, played_at)
- **API**: `GET/POST/DELETE /api/auth/recently-played`
- **Limit**: 50 tracks per user, auto-pruned on insert
- **Fallback**: localStorage for offline resilience

### Journal Entries (2026-01-15)
- **Storage**: PostgreSQL `journal_entries` table
- **API**: `GET/POST/DELETE /api/journal`
- **Fallback**: localStorage entry cache + draft keys for offline resilience

**Key Files:**
- `src/lib/preferences.ts` - Audio preferences CRUD
- `src/app/api/auth/preferences/route.ts` - Preferences API
- `src/app/api/auth/recently-played/route.ts` - Recently played API
- `src/app/api/journal/route.ts` - Journal API
- `src/hooks/use-recently-played.ts` - Hook with DB sync
- `src/hooks/audio/use-audio-settings.ts` - Audio settings hook with DB sync
- `src/components/wisdom/Journal.tsx` - Journal UI with API + local fallback

## Current Local-Only Surfaces

- **Queue persistence**: `metadj_queue_state` (see `../features/queue-persistence.md`).
- **UI session state**: last open views and draft buffers for Wisdom/Journal.

## Goals

- **Local-first**: Sync is optional and never required to use the app.
- **Privacy by design**: No journal content in analytics; journal content is stored as markdown in Postgres today with optional client-side encryption planned.
- **Offline-safe**: Local edits remain usable even when sync is unavailable.
- **Minimal dependency**: Favor a simple backend and avoid heavy client SDKs.

## Future Enhancements

### Phase 1: Manual Export/Import (Implemented)
- Export Journal entries to a JSON file.
- Import JSON to merge entries on another device.
- Optional passphrase encryption for exports.

### Phase 2: Opt-In Encryption Controls (Core)
- Add optional client-side encryption keys for journal content.
- Store encrypted journal payload per user.
- Sync on demand (manual refresh + background at idle).

### Phase 3: Continuous Sync + Conflict Resolution
- Background sync with incremental updates.
- Conflict UI for divergent edits (default to last-write-wins).
- Activity log and last-synced visibility.

## Data Model (Draft)

```typescript
type SyncedJournalEntry = {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  contentHash: string
}

type SyncState = {
  deviceId: string
  lastSyncedAt: string
  lastPulledAt: string
}
```

## Conflict Strategy

- **Default**: Last-write-wins using `updatedAt`.
- **Fallback**: If hash mismatch and timestamps close, keep both versions.
- **UI**: Offer a merge dialog only when both versions are edited after the last sync.

## API/Infrastructure Notes

- Uses the existing auth layer; future encryption can add a dedicated key flow.
- Data store can be a simple relational table keyed by user + entry id.
- Store encrypted blobs if end-to-end encryption is enabled.
- Keep write path idempotent and tolerant of retries.

## UX Requirements

- Clear opt-in toggle with status indicator ("Last synced 3m ago").
- Manual "Sync now" action for user confidence.
- "Export / Import" remains available even with sync enabled.
- One-click "Delete cloud data" option.

## Open Questions

- Should playlists or queue state be included in sync?
- What is the minimum viable identity flow?
- Will we support per-entry encryption keys or a single user key?
