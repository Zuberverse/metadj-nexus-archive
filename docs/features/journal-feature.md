# Journal Feature

**Last Modified**: 2026-01-16 22:18 EST

Added in v0.9.46

The **Journal** is a private space for users to capture ideas, dreams, and reflections directly within the MetaDJ Nexus platform. It resides as a top-level tab alongside Hub, Cinema, and Wisdom.

## Core Functionality

### 1. Data Storage & Persistence
- **Database Storage**: For authenticated users, journal entries are stored in the PostgreSQL database (`journal_entries` table) for cross-device persistence.
- **API Integration**: CRUD operations via `/api/journal` endpoint with authentication.
- **Local Backup**: localStorage is maintained as a draft backup during editing and as fallback for offline scenarios.
- **Admin Handling**: Admin accounts follow the same database + localStorage backup flow as standard users.

### 2. Auto-Save & Management
- **Auto-Save**: Entries are automatically saved 1.5 seconds after any title or content change. No manual save required.
- **Back Navigation**: The "Back to Journal Log" button exits the editor; auto-save handles persistence.
- **Auto-Delete Empty Entries**: If a user clears both title AND content from an existing entry, the entry is automatically deleted.
- **Create**: Users can create unlimited new entries.
- **Read**: Entries are displayed in a grid layout with title, excerpt, and last updated date.
- **Update**: Tap any entry to edit its title or content (auto-saved).
- **Delete**: Remove entries with a confirmed "Delete Forever" action to prevent accidental loss.

### 3. Speech-to-Text (STT)
- **Voice Input**: Integrated microphone button in the editor allows users to dictate entries.
- **Transcription**: Uses the [`/api/metadjai/transcribe`](../../src/app/api/metadjai/transcribe/route.ts) endpoint with OpenAI GPT-4o transcription (`gpt-4o-mini-transcribe-2025-12-15` by default).
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

### 6. Export & Import
- **Per-Entry Export**: Export button available on each entry card in list view and in the editing toolbar for exporting individual entries.
- **Import**: Merge entries from a JSON export via the Import button in the header; newer `updatedAt` wins on conflicts.
- **Optional encryption**: AES‑GCM with PBKDF2‑derived keys (passphrase never stored).
- **Local file I/O**: Export/import uses browser file download/upload—no server transfer of export files.

### 7. Search Integration
- **Dedicated Journal Search**: Journal has its own search bar within the Journal list view (search segregation).
- **Title & Content Search**: Filters entries by matching title or content text.
- **Music search excluded**: Journal entries do not appear in music search bars (left panel browse, header overlay).

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

**Database Table**: `journal_entries`
```typescript
{
  id: string         // UUID (primary key)
  userId: string     // Foreign key to users table
  title: string      // Entry title
  content: string    // Markdown content (GFM + inline HTML for underline)
  createdAt: Date    // Creation timestamp
  updatedAt: Date    // Last update timestamp
}
```

**API Endpoints**: `/api/journal`
- `GET` - List all entries for authenticated user
- `POST` - Create or update an entry (upsert)
- `DELETE` - Delete entry by id

**Client Type** (JournalEntry):
```typescript
interface JournalEntry {
  id: string         // UUID
  title: string      // Optional title
  content: string    // Markdown content
  createdAt: string  // ISO date string
  updatedAt: string  // ISO date string
}
```

**View + Draft Keys** (localStorage backup):
- `metadj_wisdom_journal_last_view` — `list` or `editing`
- `metadj_wisdom_journal_last_entry_id` — active entry id (if editing)
- `metadj_wisdom_journal_draft_entry_id` — entry id or `new`
- `metadj_wisdom_journal_draft_title` — unsaved title buffer
- `metadj_wisdom_journal_draft_content` — unsaved body buffer

## Future Enhancements (Planned)
- **Offline support**: Full offline editing with sync when connection restored.
