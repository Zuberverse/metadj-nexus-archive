# Replit Deployment Guide — MetaDJ Nexus

**Last Updated**: 2026-01-15

## Overview

MetaDJ Nexus is a platform connecting human vision with AI-driven execution for the Metaverse, optimized for deployment on Replit. It provides a creative and immersive experience without complex server management, leveraging Replit's managed infrastructure and Cloudflare R2 for media streaming. Key capabilities include zero-downtime deployments, S3-compatible media streaming with zero egress fees, automatic HTTPS, and integration with analytics and monitoring.

## User Preferences

- I want iterative development.
- Ask before making major changes.
- Provide detailed explanations for complex concepts.
- I prefer clear and concise communication.

## System Architecture

MetaDJ Nexus is built on a modern web stack for performance and scalability on Replit.

**Platform & Frameworks:**
- **Platform**: Replit
- **Runtime**: Node.js 20.19+
- **Framework**: Next.js 16.1.1 (App Router)
- **Frontend**: React 19.2.0
- **Build Tool**: Next.js (Turbopack/webpack)
- **Package Manager**: npm

**UI/UX Decisions:**
- Focuses on immersive audio and video experiences with features like scrubbing, volume control, and full-screen cinema video.
- **Design System**:
    - **Heading Font**: Cinzel (`font-heading`) for buttons, navigation, headings.
    - **Body Font**: Poppins (`font-sans`) for default text.
    - **Code Font**: JetBrains Mono (`font-mono`).
- **Button Styling**: Consistent use of transparent backgrounds, hover effects, and standardized sizing for icon buttons.
- **Z-Index Hierarchy**: Clearly defined `z-index` values to ensure proper layering of UI elements, with critical alerts and main overlays on top.

**Technical Implementations & Feature Specifications:**
- **Media Streaming**: Supports HTTP 206 Partial Content for efficient audio/video seeking and progressive loading.
- **Caching**: Utilizes aggressive caching (`Cache-Control: public, max-age=31536000, immutable`) for media files with versioned filenames.
- **Data Storage**: PostgreSQL via Drizzle ORM for user data, preferences, and chat history. Content data (music, collections) is managed via versioned JSON files.
- **Authentication**: Cookie-based sessions with HMAC-signed tokens. User accounts in PostgreSQL with PBKDF2 password hashing. Admin access via `ADMIN_PASSWORD` environment variable. Includes rate limiting and origin validation for CSRF protection.
- **Deployment**: Automatic and continuous deployment on Replit with zero-downtime rolling updates.
- **Monitoring**: Integration with Replit's dashboard metrics and internal health endpoints. Recommendations for external monitoring with UptimeRobot, Sentry, and Plausible.
- **Backup & Recovery**: Code is Git-versioned; media on Cloudflare R2; JSON data files versioned with code.

## Audio Settings & Crossfade

The player includes an Audio Settings modal accessible via the cog icon in the Now Playing section.

### Preferences Storage

Audio settings are stored in the database for logged-in users (cross-device sync) with localStorage fallback for guests.

**Key Files:**
- `src/components/player/AudioSettingsModal.tsx` - Settings modal with crossfade toggle
- `src/hooks/audio/use-audio-settings.ts` - Settings persistence hook with DB sync
- `src/hooks/audio/use-audio-playback.ts` - Crossfade logic with dual audio elements
- `src/lib/preferences.ts` - Server-side preferences management
- `src/app/api/auth/preferences/route.ts` - GET/PATCH API for preferences

**Storage Behavior:**
| User Type | Primary Storage | Fallback |
|-----------|-----------------|----------|
| Logged In | PostgreSQL (`userPreferences.audioPreferences`) | localStorage on API failure |
| Guest | localStorage | None |

### Crossfade Feature

When enabled, provides a 3-second seamless transition between tracks using dual audio elements.

**Implementation:**
- Uses two `<audio>` elements: primary for current track, secondary for next track preload
- Crossfade triggers when `timeRemaining <= 3 seconds` and next track is available
- Applies sine/cosine easing curves for smooth volume transitions
- Falls back to simple fade-out when no next track (end of queue with repeat off)

**Settings:**
| Setting | DB Field | Default |
|---------|----------|---------|
| Crossfade Enabled | `audioPreferences.crossfadeEnabled` | `false` |
| Duration | Hardcoded | 3000ms |

**Known Limitations (Future Improvements):**
- Secondary audio bypasses useAudioSource URL resolution
- Volume/mute changes during crossfade not synced to secondary element
- Secondary audio not tracked in PlayerContext during overlap

### Future Settings Migration

Other localStorage settings that could be migrated to database for cross-device sync:

| Setting | Current Storage | Suggested DB Field |
|---------|-----------------|-------------------|
| Volume | `VOLUME` localStorage | `audioPreferences.volume` |
| Muted | `MUTED` localStorage | `audioPreferences.muted` |
| Repeat Mode | `REPEAT_MODE` localStorage | `playerPreferences.repeatMode` |
| Shuffle | `SHUFFLE_ENABLED` localStorage | `playerPreferences.shuffleEnabled` |
| Cinema Scene | `CINEMA_SCENE` localStorage | `videoPreferences.scene` |
| Poster Only | `CINEMA_POSTER_ONLY` localStorage | `videoPreferences.posterOnly` |
| AI Provider | `METADJAI_PROVIDER` localStorage | `metadjaiPreferences.provider` |
| AI Personalization | `METADJAI_PERSONALIZATION` localStorage | `metadjaiPreferences.personalization` |

## AI Integration (MetaDJai)

MetaDJai is the AI-powered creative companion built with the **Vercel AI SDK**. It follows best practices for tool-based data retrieval and multi-provider support.

### Architecture

```
User Message → API Route → Provider Selection → AI Model → Tool Execution → Response Stream
                              ↓
                    OpenAI / Anthropic / Google / xAI
```

**Key Files:**
- `src/lib/ai/limits.ts` - Centralized configuration for all limits
- `src/lib/ai/validation.ts` - Request validation with Zod schemas
- `src/lib/ai/tools/*.ts` - Individual tool implementations
- `src/lib/ai/tools/provider.ts` - Tool registration and provider config
- `src/lib/ai/meta-dj-ai-prompt.ts` - System prompt construction

### Tool-Based Data Retrieval

Following Vercel AI SDK best practices, the AI retrieves data **on-demand** via tools rather than receiving large payloads with every message:

| Tool | Purpose | When Called |
|------|---------|-------------|
| `getCatalogSummary` | Full catalog overview | User asks about collections, recommendations, or music discovery |
| `searchCatalog` | Find specific tracks/collections | User searches for specific music |
| `getRecommendations` | Mood/energy-based suggestions | User asks "what should I listen to?" |
| `getWisdomContent` | Retrieve Thoughts/Guides/Reflections | User asks about Wisdom content |
| `getZuberantContext` | Knowledge base search | User asks about MetaDJ, Zuberant, or platform philosophy |
| `getPlatformHelp` | Platform feature help | User asks how to use features |
| `proposePlayback/Queue/Playlist` | Active control proposals | User requests playback actions |

### Request Limits

All limits are centralized in `src/lib/ai/limits.ts` with documented rationale:

| Limit | Value | Rationale |
|-------|-------|-----------|
| `MAX_MESSAGES_PER_REQUEST` | 50 | Ample conversation context |
| `MAX_MESSAGE_CONTENT_LENGTH` | 16,000 chars (~4k tokens) | Long questions, code snippets, pasted content |
| `MAX_MESSAGE_HISTORY` | 12 | Client-side: 6 turns of context |
| `MAX_PERSONALIZATION_LENGTH` | 500 chars | Custom AI behavior preferences |
| `MAX_COLLECTION_DESCRIPTION_LENGTH` | 1,000 chars | Rich narrative descriptions |
| `MAX_CATALOG_COLLECTIONS` | 30 | Balanced catalog overview |

### Tool Result Limits

Configured in `src/lib/ai/tools/utils.ts`:

| Limit | Value | Rationale |
|-------|-------|-----------|
| `MAX_TOOL_RESULT_SIZE` | 24,000 chars (~6k tokens) | Comprehensive responses without runaway costs |
| `MAX_SEARCH_RESULTS` | 10 | Variety without overwhelm |
| `MAX_RECOMMENDATIONS` | 10 | Digestible suggestion lists |
| `MAX_ACTIVE_CONTROL_TRACKS` | 50 | Substantial playlists |

### Spam Detection

Configurable thresholds prevent abuse while allowing legitimate retries:

| Setting | Value | Behavior |
|---------|-------|----------|
| `SPAM_THRESHOLD_IDENTICAL_MESSAGES` | 5 | Triggers on 5+ identical messages |
| `SPAM_CHECK_WINDOW` | 8 | Checks last 8 user messages |

This allows users to retry a message up to 4 times (network issues, accidental double-clicks, re-asking after unexpected responses) without triggering spam detection. Combined with rate limiting, this provides sufficient abuse protection.

### Security

- **Input Sanitization**: All user inputs truncated to reasonable lengths
- **Output Validation**: Tool results validated via `sanitizeAndValidateToolResult()`
- **Injection Protection**: Patterns filtered to prevent prompt injection attacks
- **Rate Limiting**: Per-user request limits via circuit breaker

## Wisdom Content System

The Wisdom section provides curated content across three categories: Guides (structured how-to content), Thoughts (essays and ideas), and Reflections (personal stories).

### Content Structure

| Category | Purpose | Content Type |
|----------|---------|--------------|
| **Guides** | Knowledge & How-To | Multi-section structured guides with table of contents |
| **Thoughts** | Ideas & Inspiration | Single-content essays with date-based sorting |
| **Reflections** | Personal Stories & Insights | Multi-section personal narratives |

### UI Design Standards

**List View:**
- Topic-based filtering only (no length filters)
- Clean card layout without category labels above titles
- Metadata shows section count and read time
- Consistent gradient styling across all categories

**Detail View:**
- Adaptive title font sizing via `useTitleFit` hook
- Reading progress bar (sticky, minimal design without borders)
- Table of contents for multi-section content
- Share and Summarize with MetaDJai buttons
- Previous/Next navigation

### Adaptive Title Sizing

The `useTitleFit` hook (`src/hooks/wisdom/use-title-fit.ts`) dynamically adjusts title font sizes:

| State | Mobile | Tablet | Desktop |
|-------|--------|--------|---------|
| **Default** | text-2xl | text-3xl | text-4xl |
| **Shrink** (when wrapping) | text-xl | text-2xl | text-3xl |

The hook:
- Monitors title element height vs line-height to detect wrapping
- Re-measures when title content changes (via `watch` parameter)
- Waits for fonts to load before measuring
- Uses ResizeObserver for responsive updates

**Key Files:**
- `src/hooks/wisdom/use-title-fit.ts` - Adaptive font sizing hook
- `src/components/wisdom/Guides.tsx` - Guides list and detail views
- `src/components/wisdom/Thoughts.tsx` - Thoughts list and detail views
- `src/components/wisdom/Reflections.tsx` - Reflections list and detail views
- `src/components/wisdom/WisdomFilters.tsx` - Topic filter pills
- `src/data/wisdom-content.json` - All Wisdom content data

### Recent UI Changes (2026-01-15)

- Removed category labels from list view cards (e.g., "AI & IDENTITY", "CREATIVE FRAMEWORKS")
- Removed "TOPICS" label above filter pills
- Removed length filter dropdown and reset button
- Removed horizontal border lines from reading progress bar
- Removed cyan/teal vertical bars from section headings
- Removed content indentation from paragraphs
- Standardized all section headers to use `text-gradient-hero`
- Reduced spacing above titles in detail views
- Added adaptive font sizing for detail view titles

## External Dependencies

-   **Cloudflare R2**: Exclusive storage for all media assets (audio, video).
    -   **Required Environment Variables**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
-   **Plausible Analytics**: Optional, privacy-first analytics.
    -   **Required Environment Variable**: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.
-   **PostgreSQL Database**: Replit-managed (Neon-backed) for user data, sessions, preferences, chat history, and analytics.
    -   **Required Environment Variable**: `DATABASE_URL`.
    -   **Auth Secrets**: `AUTH_SECRET` or `SESSION_SECRET` (for session signing), `INTERNAL_API_SECRET`.
-   **UptimeRobot**: Recommended for external uptime monitoring.
-   **Sentry**: Recommended for external error tracking.
-   **Logging Webhook**: Optional for server-side logging.
    -   **Optional Environment Variables**: `LOGGING_WEBHOOK_URL`, `LOGGING_SHARED_SECRET`.
