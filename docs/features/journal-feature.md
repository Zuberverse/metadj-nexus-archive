# Journal Feature

**Last Modified**: 2026-01-13 08:56 EST

Added in v0.9.46

The **Journal** is a private, local-first space for users to capture ideas, dreams, and reflections directly within the MetaDJ Nexus platform. It resides as a top-level tab alongside Hub, Cinema, and Wisdom.

## Core Functionality

### 1. Privacy First
- **Local Storage**: All entries are stored in the user's browser `localStorage` under the key `metadj_wisdom_journal_entries`.
- **No Server Sync**: Journal data never leaves the user's device. It is not synced to the cloud or any database.
- **Persistence**: Data persists across sessions and page reloads but will be lost if the user clears their browser data.
- **Cross-device sync (out of scope)**: Journal entries are intentionally local-only for v0; cross-device sync is deferred. See `../architecture/CROSS-DEVICE-SYNC.md`.

### 2. Management (CRUD)
- **Create**: Users can create unlimited new entries.
- **Read**: Entries are displayed in a grid layout with title, excerpt, and last updated date.
- **Update**: Tap any entry to edit its title or content.
- **Delete**: Remove entries with a confirmed "Delete Forever" action to prevent accidental loss.

### 3. Speech-to-Text (STT)
- **Voice Input**: Integrated microphone button in the editor allows users to dictate entries.
- **Transcription**: Uses the [`/api/metadjai/transcribe`](../../api/metadjai/transcribe/route.ts) endpoint with OpenAI GPT-4o transcription (`gpt-4o-mini-transcribe-2025-12-15` by default).
- **Seamless Editing**: Transcribed text appends to the end of the entry for a reliable voice-first flow.
- **Centered Access**: Voice input sits centered just below the writing surface for quick dictation.
- **Limits**: 60‑second client cap; 10MB server cap (OpenAI file upload guidance allows up to 25MB).
- **Best‑practice defaults**: `language=en` is set server‑side; no `prompt` is sent to avoid prompt‑echo in short dictation.

### 4. Session Continuity
- **View restoration**: Refresh returns to the last view (list or open editor).
- **Draft retention**: Unsaved title/body drafts persist per entry or new draft, so users continue where they left off.

### 5. Focused Writing Surface
- **Rich text editor**: Formatting toolbar applies headings, bold/italic/underline, lists, quotes, links, code blocks, and dividers directly in the writing surface.
- **Always styled**: Entries render as formatted content in the editor with no Markdown/preview toggle.
- **Sanitized input**: Paste strips formatting; editor sanitizes HTML before persistence to keep entries safe and predictable.
- **Full-height editor**: Writing surface spans most of the viewport for long-form entries.
- **Fixed container**: Editor stays a consistent height even when empty; content scrolls inside the surface when it exceeds the available space.
- **Clean edges**: Taller surface with no external drop shadow for a tighter glass frame.

### 6. Export & Import (Local Only)
- **Export**: Download a JSON backup of journal entries from the list view.
- **Import**: Merge entries from a JSON export; newer `updatedAt` wins on conflicts.
- **Optional encryption**: AES‑GCM with PBKDF2‑derived keys (passphrase never stored).
- **Local-only**: Export/import stays in browser file I/O—no server transfer.

### 7. Search Integration
- **Unified search**: Journal entries surface inside the global SearchBar results alongside tracks and wisdom.
- **Deep linking**: Selecting a Journal result opens the Wisdom view and focuses the selected entry.
- **Local-only**: Search pulls from `metadj_wisdom_journal_entries` in localStorage.

### 8. Analytics (Metadata Only)
- **Entry lifecycle**: `journal_entry_created`, `journal_entry_updated`, `journal_entry_deleted`.
- **Privacy-first metrics**: length and word count metadata only—no journal content is tracked.

## Technical Implementation

### Components
- **`src/components/wisdom/Journal.tsx`**: The main container handling list view, editor state, and persistence logic.
- **`src/hooks/home/use-view-management.ts`**: Manages the `journal` view state, ensuring correct overlay behavior (closing Wisdom/Cinema/Music when Journal is active).

### Navigation
- **Desktop**: "Journal" tab added to the main `AppHeader` center navigation.
- **Mobile**: "Journal" icon added to the persistent `MobileBottomNav`.

### Formatting Pipeline
- **Markdown -> HTML**: `marked` (GFM + line breaks) hydrates entries to styled HTML.
- **HTML -> Markdown**: `TurndownService` converts edits back to Markdown; underline is preserved via inline `<u>` tags.
- **Sanitization**: All editor HTML is cleaned against the allowlist before storage/render.

### Storage Schema
Array of `JournalEntry` objects:
```typescript
interface JournalEntry {
  id: string         // UUID
  title: string      // Optional title
  content: string    // Markdown content (GFM + inline HTML for underline)
  createdAt: string  // ISO date string
  updatedAt: string  // ISO date string
}
```

**View + Draft Keys**:
- `metadj_wisdom_journal_last_view` — `list` or `editing`
- `metadj_wisdom_journal_last_entry_id` — active entry id (if editing)
- `metadj_wisdom_journal_draft_entry_id` — entry id or `new`
- `metadj_wisdom_journal_draft_title` — unsaved title buffer
- `metadj_wisdom_journal_draft_content` — unsaved body buffer

## Future Enhancements (Planned)
- **Cross-device sync**: Optional cloud sync with explicit user consent.
