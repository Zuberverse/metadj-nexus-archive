# Routing & Navigation Contracts — MetaDJ Nexus

**Last Modified**: 2026-01-13 13:34 EST

> MetaDJ Nexus is a single-route experience. Hub/Cinema/Wisdom are state-driven views inside `/` (no route changes for view switching). The URL stays clean while you browse.

## Page Map
- `/` → Single experience surface. Renders Hub/Cinema/Wisdom + panels via `src/app/(experience)/layout.tsx` → `HomePageClient`.
- `/track/[id]` → Share metadata route (no UI) via `src/app/(experience)/track/[id]/page.tsx`.
- `/collection/[id]` → Share metadata route (no UI) via `src/app/(experience)/collection/[id]/page.tsx`.
- `/playlist/[id]` → Share metadata route (no UI) via `src/app/(experience)/playlist/[id]/page.tsx`.
- `/wisdom/[section]/[id]` → Wisdom deep link metadata route (no UI) via `src/app/(experience)/wisdom/[section]/[id]/page.tsx`.
- `/guide` → Renders MetaDJ Nexus Guide.
- `/terms` → Renders Terms & Conditions.
- Errors: `error.tsx` (route-level), `global-error.tsx` (app-level); `not-found.tsx` for 404s.

## API Surface (App Router)

### Media Streaming
- `/api/audio/[...path]` → MP3 proxy with path sanitization, range, cache, CORS.
- `/api/video/[...path]` → MP4/WEBM/MOV proxy with path sanitization, range, cache, CORS.

### MetaDJai (AI Companion)
- `/api/metadjai` → Non-streaming AI endpoint (single response).
- `/api/metadjai/stream` → AI companion streaming endpoint (SSE).
- `/api/metadjai/transcribe` → Speech-to-text transcription for voice input.

### Daydream (AI Visual Generation)
- `/api/daydream/config` → Daydream configuration and feature availability.
- `/api/daydream/streams` → Create new Daydream stream session.
- `/api/daydream/streams/end` → End active stream session.
- `/api/daydream/streams/[streamId]` → Get/manage specific stream.
- `/api/daydream/streams/[streamId]/status` → Poll stream status during warm-up.
- `/api/daydream/streams/[streamId]/parameters` → PATCH prompt/settings updates.
- `/api/daydream/streams/[streamId]/whip` → WebRTC WHIP ingest endpoint.

### System & Dev
- `/api/wisdom` → Wisdom content JSON (lazy‑loaded client data source).
- `/api/health` → env/storage/AI provider checks for deploy verification.
- `/api/log` → Logging hook (expects shared secret).
- `/api/dev/clear-rate-limits` → Dev-only helper (requires DEV_SECRET).

## SEO Notes
- Inline structured data in `src/app/layout.tsx` stays inline for SEO, but now uses the per-request CSP nonce surfaced by `src/proxy.ts`.

## Operational Reminders
- Keep `getMusicSnapshot()` (hub data loader) fast; consider caching if latency rises.
- Keep Hub/Cinema/Wisdom navigation state-driven inside `/`; avoid introducing routes for view switching.
