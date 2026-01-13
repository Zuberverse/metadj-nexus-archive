**Last Modified**: 2026-01-12 08:53 EST

# Wisdom System

**Feature**: Wisdom Dashboard and Content System
**Status**: Active (v0.60+)
**Main Component**: `src/components/wisdom/WisdomExperience.tsx`

## Overview

The Wisdom is MetaDJ Nexus's content and knowledge center—a dedicated space for exploring long-form content beyond music playback. It features three content sections: Thoughts (blog essays), Guides (educational how-to content), and Reflections (personal narratives and origin stories from MetaDJ). The Journal lives as a separate top-level tab for private entries with voice recording.

## Current Availability

- **Thoughts**: Personal dispatches on music, AI, creativity, and the MetaDJ journey. Six published essays.
- **Guides**: In-depth educational content on AI identity systems, the Digital Jockey framework, and music for state change. Three published guides.
- **Reflections**: Personal narratives from MetaDJ—origin stories, milestones, and the lived journey behind the platform. Two published reflections.
- **Journal**: Private personal space for session logs and reflections with voice-to-text transcription (separate top-level tab). User-created entries stored locally.

## Architecture

### Component Structure

```
src/components/wisdom/
├── WisdomExperience.tsx      # Main dashboard and section selection
├── Thoughts.tsx              # Blog essays (list + detail view)
├── Guides.tsx                # Educational guides (list + detail view)
├── Reflections.tsx           # Personal narratives (list + detail view)
├── Journal.tsx               # Private journal entries (list + edit view)
├── WisdomBreadcrumb.tsx      # Navigation breadcrumbs
├── WisdomFooter.tsx          # Shared footer component
└── TableOfContents.tsx       # Section navigation for guides/reflections
```

### Data Architecture

**Content Source (Canonical)**: `src/data/wisdom-content.json`
**Delivery**: `GET /api/wisdom` (lazy‑loaded by the client when Wisdom is opened)
**Type Definitions**: `src/data/wisdom-content.ts`

**Performance Optimization**: Full Wisdom content stays in JSON and is fetched only when the Wisdom view is active. The Hub’s Wisdom Spotlight uses a small server-provided snapshot (title/excerpt/meta) so it renders instantly without a client fetch.

### Content Types

- **Thoughts** (`thoughtsPosts`) — Blog essays with date, excerpt, and paragraph content
- **Guides** (`guides`) — Structured guides with category, excerpt, and multi-section content
- **Reflections** (`reflections`) — Personal narrative layer (biography, origin, milestones) with excerpt and multi-section content
- **Topics** (`topics`) — Optional tag array for topic and length filtering

### Data Structures

**ThoughtPost Interface**:
```typescript
interface ThoughtPost {
  id: string;           // Unique identifier
  title: string;        // Post title
  date: string;         // ISO format date
  excerpt: string;      // Short description
  topics?: string[];    // Optional topic tags
  content: string[];    // Array of paragraphs
}
```

**Guide Interface**:
```typescript
interface Guide {
  id: string;           // Unique identifier
  title: string;        // Guide title
  category: string;     // e.g., "AI & Identity"
  excerpt: string;      // Short description
  topics?: string[];    // Optional topic tags
  sections: {
    heading: string;    // Section heading
    paragraphs: string[]; // Section content
  }[];
}
```

**Reflection Interface**:
```typescript
interface Reflection {
  id: string;           // Unique identifier
  title: string;        // Biography title
  excerpt: string;      // Short description
  topics?: string[];    // Optional topic tags
  sections: {
    heading: string;    // Section heading
    paragraphs: string[]; // Section content
  }[];
}
```

**JournalEntry Interface**:
```typescript
interface JournalEntry {
  id: string;           // UUID generated on creation
  title: string;        // Entry title (optional, defaults to "Untitled")
  content: string;      // Markdown content (GFM + inline HTML for underline)
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp (updated on save)
}
```

**Journal Storage**: Journal entries are stored in `localStorage` under `STORAGE_KEYS.WISDOM_JOURNAL_ENTRIES` as a JSON array. Unlike other Wisdom content, Journal is private and user-created—no server-side persistence.

### Utility Functions

**Location**: `src/lib/wisdom/` (barrel export via `src/lib/wisdom/index.ts`)

- `estimateReadTime(paragraphs)` — Calculates read time for array of paragraphs
- `estimateSectionedReadTime(sections)` — Calculates read time for sectioned content
- `formatReadTime(minutes)` — Formats read time for display (e.g., "3 min read")
- `getReadTimeBucket(minutes)` — Buckets read time into short/medium/long
- `stripSignoffParagraphs(paragraphs)` — Removes duplicate “— MetaDJ” signatures from rendered output
- `getContinueReading()` / `setContinueReading()` — Persist the last opened Wisdom item for Hub continuity

## Navigation System

### Feature Toggle Group

Wisdom is part of the unified surface system:

1. **Music** — Library/Queue/Playlists (left panel on desktop, full-screen overlay on mobile)
2. **Cinema** — Fullscreen visuals layered over the experience
3. **Wisdom** — Knowledge hub view inside the experience
4. **MetaDJai** — AI companion chat (right panel on desktop, overlay on mobile)

### Breadcrumb Navigation

All content views include breadcrumb navigation:
- **Thoughts**: Wisdom → Thoughts → [Post Title]
- **Guides**: Wisdom → Guides → [Guide Title]
- **Reflections**: Wisdom → Reflections

### Section Continuity

Wisdom remembers where a user last was:
- The active section (`thoughts` / `guides` / `reflections`) is persisted in `localStorage` under `metadj_wisdom_last_section`.
- The most recently opened item is stored under `metadj_wisdom_continue_reading` for Hub "Continue reading."
- `WisdomExperience` initializes from that key, so returning visitors drop back into the last section without in-app URL changes.
- In-app item selection (which specific post/guide/reflection is open) is internal component state, not route-driven navigation.
- Journal entries are also persisted in `localStorage` under `STORAGE_KEYS.WISDOM_JOURNAL_ENTRIES`.
- Journal view/draft persistence is managed separately via dedicated journal storage keys (see `docs/features/journal-feature.md`).

### Filters

Wisdom list views support lightweight discovery filters:
- **Topic filter chips** use the optional `topics` array on each item (plus an “All topics” chip).
- **Length filter** uses the `getReadTimeBucket` utility (short/medium/long) derived from read time estimates.
- Filters apply only to list views; detail views remain accessible from deep links and state.

### Reading Progress

Detail views include a sticky reading progress bar that tracks scroll position across Thoughts, Guides, and Reflections.

## Sharing

- Wisdom browsing stays state-driven (no in-app route pushes), so tab switching is instant and session state is preserved.
- Each item detail view includes a **Share** button (native share on mobile, clipboard fallback) that generates a deep link:
  - `/wisdom/thoughts/{id}`
  - `/wisdom/guides/{id}`
  - `/wisdom/reflections/{id}`
- Deep links resolve via Next.js routes for reliable external sharing + metadata, then the experience consumes the link on load and returns the URL to `/` to keep in-app navigation URLless.
- Deep link pages are `noindex` to avoid SEO duplicates while preserving share metadata.

**Key Files**:
- Deep link parser + builders: `src/lib/wisdom/deeplink.ts`
- Deep link routes (for external entry + metadata): `src/app/(experience)/wisdom/[section]/[id]/page.tsx`
- Deep link consumption + view switch: `src/components/home/HomePageClient.tsx`
- Deep link selection: `src/components/wisdom/WisdomExperience.tsx` + section components

### State Management

- Wisdom lives inside `/` as a state-driven view for day-to-day browsing.
- `/wisdom/*` routes exist only for shareable deep links (and `/wisdom` as a convenience entry point).
- `activeView === "wisdom"` controls visibility; `WisdomExperience` is activated via the `active` prop from the home shells to delay fetching until Wisdom is actually opened.
- Valid sections are `thoughts`, `guides`, `reflections`, and `journal`; unknown values are ignored.
- Opening Wisdom automatically closes Cinema and MetaDJai.
- Journal is private—no deep linking or sharing. Content stays in localStorage only (exports are local files).

## Content Sections

### Thoughts

**Purpose**: Living blog archive of MetaDJ's thoughts on music production, DJing, AI-accelerated creativity, the Metaverse, and beyond

**Visual Design**:
- Card: Glass morphism with `bg-black/45` and `backdrop-blur-xl`
- Icon: BookOpen icon in purple gradient
- Badge: `border-purple-400/30 bg-purple-500/10`

**Current Content** (6 essays):
1. Welcome to MetaDJ Nexus
2. Curation in the AI Era
3. Building With AI, Not For AI
4. Music as Emotional Architecture
5. The Solo Creator Advantage
6. Compose, Orchestrate, Conduct

**Features**:
- List view with date, excerpt, and read time
- Detail view with full content
- Read time estimation displayed in both views
- Reading progress bar pinned below the header
- Header actions: **Share** copies the deep link; **Summarize** starts a fresh MetaDJai chat with a structured summary prompt for the content

### Guides

**Purpose**: In-depth guides on AI identity systems, creative frameworks, and practical applications

**Visual Design**:
- Card: Glass morphism with cyan accent
- Icon: BookOpen icon
- Badge: `border-cyan-400/30 bg-cyan-500/10`

**Current Content** (3 guides):
1. **Encoding Your Identity With AI** — Practical guide to building AI systems that reflect personal identity (5 sections)
2. **The Digital Jockey Framework** — Evolution from DJ to multi-sensory experience orchestrator (4 sections)
3. **Music for State Change** — Using music to intentionally shift mental and emotional state (4 sections)

**Features**:
- List view with category, section count, and read time
- Detail view with table of contents
- Reading progress bar pinned below the header
- Smooth scroll navigation to sections
- Read time estimation
- Header actions: **Share** copies the deep link; **Summarize** starts a fresh MetaDJai chat with a context-aware summary prompt

### Reflections

**Purpose**: Personal narrative layer—biography, origin stories, and meaning‑making moments behind MetaDJ and Zuberant

**Visual Design**:
- Icon: User icon
- Badge: `border-teal-400/30 bg-teal-500/10`
- Accent: Teal color scheme

**Current Content** (2 reflections):
1. **MetaDJ’s Origin** — Origin story of MetaDJ (4 sections)
2. **About MetaDJ** — Biography and journey (5 sections)

**Features**:
- List view with excerpt + read time
- Detail view with table of contents and smooth scroll navigation
- Reading progress bar pinned below the header
- Read time estimation
- Footer signs as "— MetaDJ" (sign-offs in body are stripped from render)
- Header actions: **Share** copies the deep link; **Summarize** starts a fresh MetaDJai chat with a context-aware summary prompt

### Journal

**Purpose**: Private personal space for session logs, reflections, and notes—a lightweight journaling feature integrated into Wisdom

**Visual Design**:
- Icon: Book icon (empty state), Plus icon (new entry)
- Badge: `border-purple-400/30 bg-purple-500/10`
- Accent: Purple/cyan gradient scheme
- Cards: Grid layout (3 columns on desktop) with glassmorphism

**Features**:
- **Entry Management**: Full CRUD operations (create, read, update, delete)
- **Voice Input**: Speech-to-text transcription via `/api/metadjai/transcribe`
  - 60-second maximum recording duration with auto-stop
  - Visual recording indicator with pulsing animation
  - Transcription appends to existing content
  - Voice controls sit centered below the writing surface
- **Always-styled editor**: Markdown is hydrated to formatted HTML on load (no preview toggle)
- **Writing Surface**: Full-height editor with fixed container, internal scrolling, and clean edge styling
- **Delete Confirmation**: Modal confirmation before permanent deletion
- **Local Persistence**: Entries stored in `localStorage` (no server sync)
- **Export/Import**: Optional local JSON export/import with passphrase encryption
- **Empty State**: Friendly prompt with "Start Writing" CTA when no entries exist

**Voice Recording Flow**:
1. User taps "Tap to Speak" button in edit view
2. Browser requests microphone permission
3. Recording starts with visual indicator ("Recording (Tap to Stop)")
4. User taps again to stop, or auto-stops at 60 seconds
5. Audio is sent to `/api/metadjai/transcribe` for processing
6. Transcribed text is appended to the entry content
7. Toast notification confirms success/failure

**Entry Structure**:
- **Title**: Optional, defaults to "Untitled" if left empty
- **Content**: Markdown (GFM) stored locally; rendered as styled HTML in the editor
- **Timestamps**: Created and updated dates displayed in list view
- **Cards**: Show title, markdown-stripped content preview (6 lines), and last updated date

**Privacy Model**:
- Journal is entirely private—no sharing, no deep links
- Data stays in browser `localStorage`
- No server-side persistence or backup
- Clearing browser data deletes all entries

## Shared Components

### WisdomBreadcrumb

Provides consistent navigation across all content views:
```typescript
interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}
```

### WisdomFooter

Shared footer with consistent sign-off:
```typescript
interface WisdomFooterProps {
  signedBy?: "MetaDJ";  // Defaults to "MetaDJ"
}
```

**Usage**:
- Thoughts/Guides: `<WisdomFooter />` (signs as MetaDJ)
- Reflections: `<WisdomFooter signedBy={reflection.signedBy ?? "MetaDJ"} />` (signs by reflection author)

### TableOfContents

Section navigation for multi-section content:
```typescript
interface TableOfContentsProps {
  sections: { heading: string }[];
  accentClass?: string;  // e.g., "text-cyan-400"
}
```

## Design System Integration

### Visual Consistency

**Colors** (OKLCH):
```css
/* Section accents */
Thoughts: purple-400/500
Guides: cyan-400/500
Reflections: teal-400/500
Journal: purple-400/500 with cyan accents (gradient CTA buttons)

/* Text gradients */
Hero H1: .text-gradient-hero (high-luminosity purple → cyan → fuchsia)
Section headers + card titles: .text-heading-solid

/* Backgrounds */
Cards: bg-black/45 backdrop-blur-xl
Hover: bg-black/55
Borders: border-white/15
```

**Typography**:
```css
/* Font families */
Headings: font-heading (Cinzel)
Body: font-sans (Poppins)

/* Sizes */
Dashboard titles: text-xl sm:text-2xl
Article titles: text-3xl sm:text-4xl md:text-5xl
Body text: text-base sm:text-lg
```

### Metadata Display

**List Views**:
- Date (Thoughts only) with Calendar icon
- Section count with Layers icon
- Read time with Clock icon

**Detail Views**:
- Full metadata in header
- Table of contents for sectioned content
- Smooth scroll to sections via anchor IDs

## Implementation Guidelines

### Adding New Content

**Thoughts**: Add to `thoughtsPosts` array in `wisdom-content.json`:
```json
{
  "id": "unique-slug",
  "title": "Post Title",
  "date": "2025-12-09",
  "excerpt": "Short description",
  "content": ["Paragraph one", "Paragraph two"]
}
```

**Guides**: Add to `guides` array:
```json
{
  "id": "unique-slug",
  "title": "Guide Title",
  "category": "Category Name",
  "excerpt": "Short description",
  "sections": [
    { "heading": "Section One", "paragraphs": ["Para 1", "Para 2"] }
  ]
}
```

**Reflections**: Add to `reflections` array:
```json
{
  "id": "unique-slug",
  "title": "Title",
  "excerpt": "Short description",
  "sections": [
    { "heading": "Section One", "paragraphs": ["Para 1", "Para 2"] }
  ]
}
```

### Voice and Tone

**Thoughts**:
- First-person artist voice ("I created", "my process")
- Conversational and authentic
- Signed "— MetaDJ"

**Guides**:
- Educational clarity style
- Mix of first and second person
- Practical and actionable
- Signed "— MetaDJ"

**Reflections**:
- First-person narrative
- Personal and authentic
- Signed by author, currently "— MetaDJ" (sign-offs in body are stripped from render)

### Length & Structure Standards

These standards keep Wisdom coherent over time. They’re guidelines, not handcuffs—break them when the work needs it, but do it intentionally.

**Thoughts**
- **Scope**: Authentic dispatches—quick insights, real‑time philosophy, creative notes, lived experience.
- **Length**: Anywhere from a single line to a few paragraphs to a mini‑essay. Aim for “true + clear,” not “long.”
- **Tone**: Informal, first‑person, conversational. It should feel like MetaDJ thinking out loud.
- **Structure**: No required sections. Paragraph list is fine.

**Guides**
- **Scope**: Educational frameworks and practical how‑to that a reader can apply.
- **Length**: Typically 3–6 sections, each with ~3–8 paragraphs. Long enough to feel self‑contained.
- **Tone**: Clear, grounded, mix of first/second person. Include concrete steps, examples, and “why this matters.”
- **Structure**: Section headings must be unique and slug‑friendly (stable TOC anchors).

**Reflections**
- **Scope**: Personal narratives and meaning‑making—origin stories, milestones, failures, lessons, turning points.
- **Length**: Typically 3–6 sections, each with ~3–6 paragraphs. More depth than Thoughts.
- **Tone**: First‑person, intimate but still readable. Let the story carry the insight.
- **Structure**: Section headings should be clear and distinct; TOC relies on them.

## Future Enhancements

- [ ] **MetaDJai Journal Prompts** — Optional AI-generated prompts to inspire journal entries based on listening history or mood
- [ ] **Journal Export** — Export journal entries to markdown or text file
- [ ] **Entry Search** — Search across journal entries by keyword

## File References

**Components**:
- Main: `src/components/wisdom/WisdomExperience.tsx`
- Content: `src/components/wisdom/Thoughts.tsx`, `Guides.tsx`, `Reflections.tsx`, `Journal.tsx`
- Shared: `src/components/wisdom/WisdomBreadcrumb.tsx`, `WisdomFooter.tsx`, `TableOfContents.tsx`

**Data**:
- Content: `src/data/wisdom-content.json`
- Types: `src/data/wisdom-content.ts`

**Utilities**:
- Wisdom library: `src/lib/wisdom/` (read time, deep links, data utilities)

**Documentation**: This file (`docs/features/wisdom-system.md`)

---

**Version**: 3.0 (Journal feature documented)
**Status**: Complete and Active
