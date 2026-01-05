# Code → Docs Map (MetaDJ Nexus)

**Last Modified**: 2026-01-04 15:55 EST

This is a code-first index: start from a file/folder in `src/`, then jump to the doc(s) that explain it.

## App Router (`src/app/`)

- `src/app/(experience)/layout.tsx`, `src/app/(experience)/page.tsx` → `../architecture/routing.md`, `../features/hub-system.md`, `../features/cinema-system.md`, `../features/wisdom-system.md`, `../features/panel-system.md`
- `src/app/layout.tsx` (providers, SEO, analytics script loading) → `./contexts-reference.md`, `../security/README.md`, `../API.md`
- `src/app/guide/page.tsx` → `../features/user-guide-system.md`
- `src/app/terms/page.tsx` → `../security/README.md`
- `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx` → `../operations/ERROR-TRACKING.md`, `../security/README.md`
- `src/app/robots.ts`, `src/app/sitemap.ts` → `../architecture/routing.md`

## Middleware & Security

- `src/middleware.ts`, `src/proxy.ts` (CSP, security headers, rate limiting) → `../SECURITY.md`, `../security/README.md`, `../operations/BUILD-DEPLOYMENT-GUIDE.md`

## API Routes (`src/app/api/`)

**Canonical API doc**: `../API.md`

| Route | Code | Primary docs |
| --- | --- | --- |
| `/api/audio/[...path]` | `src/app/api/audio/[...path]/route.ts` | `../API.md`, `../MEDIA-STORAGE.md`, `../architecture/STORAGE-ARCHITECTURE-DIAGRAM.md` |
| `/api/video/[...path]` | `src/app/api/video/[...path]/route.ts` | `../API.md`, `../MEDIA-STORAGE.md`, `../architecture/STORAGE-ARCHITECTURE-DIAGRAM.md` |
| `/api/metadjai` | `src/app/api/metadjai/route.ts` | `../API.md`, `../features/vercel-ai-sdk-integration.md`, `../features/metadjai-knowledge-base.md` |
| `/api/metadjai/stream` | `src/app/api/metadjai/stream/route.ts` | `../API.md`, `../features/vercel-ai-sdk-integration.md` |
| `/api/metadjai/transcribe` | `src/app/api/metadjai/transcribe/route.ts` | `../API.md`, `../features/vercel-ai-sdk-integration.md` |
| `/api/wisdom` | `src/app/api/wisdom/route.ts` | `../API.md`, `../features/wisdom-system.md` |
| `/api/health` | `src/app/api/health/route.ts` | `../API.md`, `../operations/UPTIME-MONITORING.md` |
| `/api/health/ai` | `src/app/api/health/ai/route.ts` | `../API.md`, `../operations/UPTIME-MONITORING.md`, `../features/vercel-ai-sdk-integration.md` |
| `/api/log` | `src/app/api/log/route.ts` | `../API.md`, `../operations/ERROR-TRACKING.md` |
| `/api/dev/clear-rate-limits` | `src/app/api/dev/clear-rate-limits/route.ts` | `../API.md`, `../features/vercel-ai-sdk-integration.md` |
| `/api/daydream/config` | `src/app/api/daydream/config/route.ts` | `../API.md`, `../daydream/README.md` |
| `/api/daydream/streams/*` | `src/app/api/daydream/streams/**/route.ts` | `../API.md`, `../daydream/README.md` |

## State & Orchestration

- Context providers (`src/contexts/*`) → `./contexts-reference.md`
- Global hooks (`src/hooks/*`) → `./hooks-reference.md`
- Home orchestration hooks (`src/hooks/home/*`) → `./hooks-reference.md`, `../architecture/routing.md`
  - Queue orchestration entry point → `src/hooks/home/use-queue-controls.ts` + `../features/queue-persistence.md`
- Session bootstrap (`src/components/session/SessionBootstrap.tsx`) → `../features/analytics-implementation.md`, `../operations/ANALYTICS-SETUP.md`, `../API.md`

## Feature Areas

- Hub (Home) → `../features/hub-system.md`
- Music (Library, queue, playlists, search) → `../features/hub-system.md`, `../features/collections-system.md`, `../features/playlist-system.md`, `../features/queue-persistence.md`
- Cinema → `../features/cinema-system.md`, `../features/modal-patterns.md`
- Daydream (Dream overlay) → `../daydream/README.md`, `../API.md`
- Wisdom → `../features/wisdom-system.md`, `../features/user-guide-system.md`
- MetaDJai → `../features/vercel-ai-sdk-integration.md`, `../features/metadjai-knowledge-base.md`, `../API.md`
- Analytics → `../features/analytics-implementation.md`, `../operations/ANALYTICS-SETUP.md`, `../operations/ANALYTICS-MONITORING-GUIDE.md`

## Domain Libraries (`src/lib/`)

- Music repository + filters (`src/lib/music/*`) → `../architecture/data-architecture.md`, `../features/collections-system.md`
- Media streaming primitives (`src/lib/media/streaming.ts`) → `../MEDIA-STORAGE.md`, `../architecture/STORAGE-ARCHITECTURE-DIAGRAM.md`
- Storage provider abstraction (`src/lib/media-storage.ts`) → `../MEDIA-STORAGE.md`, `../architecture/STORAGE-ARCHITECTURE-DIAGRAM.md`
- Analytics helpers (`src/lib/analytics.ts`) → `../features/analytics-implementation.md`
- Validation schemas (`src/lib/validation/*`) + `scripts/validate-tracks.js` → `../architecture/data-architecture.md`, `./barrel-export-patterns.md`
- Playlist repository (`src/lib/playlists/*`) → `../features/playlist-system.md`, `./barrel-export-patterns.md`
- Tour config (`src/lib/tour/*`) → `../features/user-guide-system.md`
- MetaDJai tools/rate limiting (`src/lib/ai/*`, `src/lib/metadjai/*`) → `../features/vercel-ai-sdk-integration.md`, `../API.md`
- AI spending alerts (`src/lib/ai/spending-alerts.ts`) → `../features/vercel-ai-sdk-integration.md`, `../operations/UPTIME-MONITORING.md`
- Daydream utilities (`src/lib/daydream/*`) → `../daydream/README.md`, `./barrel-export-patterns.md`
- Daydream state machine (`src/lib/daydream/state-machine.ts`) → `../daydream/README.md`

## Barrel Exports

Centralized module exports for clean imports. See `./barrel-export-patterns.md` for complete guide.

| Barrel | Location | Contents |
| --- | --- | --- |
| UI Components | `src/components/ui/index.ts` | Button, Card, Modal, Toast, EmptyState, ErrorBoundary, etc. |
| Cinema | `src/components/cinema/index.ts` | Cinema controls, overlays, all visualizers |
| Visualizers | `src/components/cinema/visualizers/index.ts` | BlackHole, Cosmos, DiscoBall, EightBitAdventure, PixelParadise, SpaceTravel, SynthwaveHorizon |
| Validation | `src/lib/validation/index.ts` | Zod schemas, types (Track, Collection), validation functions |
| Playlists | `src/lib/playlists/index.ts` | CRUD operations, validation, limit warnings |
| Contexts | `src/contexts/index.ts` | All React context providers |
| Daydream | `src/lib/daydream/index.ts` | AI video generation utilities |

## Data & Content (`src/data/`)

- Tracks + collections (`src/data/tracks.json`, `src/data/collections.json`) → `../architecture/data-architecture.md`, `../MEDIA-STORAGE.md`
- Collection narratives (`src/data/collection-narratives.ts`) → `../architecture/data-architecture.md`, `../features/collections-system.md`
- Wisdom content (`src/data/wisdom-content.json`, `src/data/wisdom-content.ts`) → `../features/wisdom-system.md`
- Cinema scenes (`src/data/scenes.ts`) → `../features/cinema-system.md`
- Mood channels (`src/data/moodChannels.ts`) → `../features/mood-channels.md`
- Hub journeys (`src/data/hub-journeys.ts`) → `../features/hub-system.md`
- Platform updates (`src/data/platformUpdates.ts`) → `../features/hub-system.md`
- Knowledge base JSON (`src/data/knowledge/*.json`) → `../features/metadjai-knowledge-base.md`

## UI Components (`src/components/`)

- Panels + layout (`src/components/panels/*`, `src/components/layout/*`) → `../features/panel-system.md`, `../features/modal-patterns.md`
- Player + controls (`src/components/player/*`) → `../features/audio-player-standards.md`
- Cinema (`src/components/cinema/*`) → `../features/cinema-system.md`
- Visual atmosphere (`src/components/visuals/*`) → `../features/motion-system.md`
- Cinema visualizers (`src/components/cinema/visualizers/*`) → `../features/cinema-system.md`, `./barrel-export-patterns.md`
- Wisdom (`src/components/wisdom/*`) → `../features/wisdom-system.md`
- MetaDJai (`src/components/metadjai/*`) → `../features/vercel-ai-sdk-integration.md`
- Shared UI system (`src/components/ui/*`) → `../features/ui-visual-system.md`, `../features/gradient-system.md`, `./barrel-export-patterns.md`
- ErrorBoundary (`src/components/ui/ErrorBoundary.tsx`) → `./error-boundary-patterns.md`, `../features/ui-visual-system.md`
- EmptyState (`src/components/ui/EmptyState.tsx`) → `../features/ui-visual-system.md`, `./components-ui-reference.md`
- Skeleton loading (`src/components/ui/Skeleton.tsx`) → `./components-ui-reference.md`, `../features/motion-system.md`
- Modal error boundaries (`src/components/modals/TrackDetailsModalErrorBoundary.tsx`) → `./error-boundary-patterns.md`
- App error boundary (`src/components/error/AppErrorBoundary.tsx`) → `./error-boundary-patterns.md`
- Accessibility helpers (`src/components/accessibility/*`) → `../ACCESSIBILITY-VALIDATION.md`, `../features/keyboard-navigation.md`

## Testing & Ops

- Tests (`tests/*`) → `../TESTING.md`, `../testing/README.md`
- Deployment + monitoring → `../operations/BUILD-DEPLOYMENT-GUIDE.md`, `../operations/UPTIME-MONITORING.md`
- Security posture → `../SECURITY.md`, `../security/README.md`, `../security/SECURITY-SCANNING.md`

## Maintenance Rule

If you add a new API route, context, or major feature surface, update:
- `../README.md` (project overview when user-facing)
- `../API.md` (when it changes the API surface)
- This file (code-to-docs map)
