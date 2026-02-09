# Routing & Navigation Contracts — MetaDJ Nexus

**Last Modified**: 2026-02-07 22:27 EST

> MetaDJ Nexus uses a protected single-route experience at `/app`. Hub/Cinema/Wisdom are state-driven views inside `/app` (no route changes for view switching).

## Page Map

### Public Routes (No Authentication Required)
- `/` → Landing page (auth gateway). Renders `src/app/page.tsx` → `LandingPage`. Redirects to `/app` if already authenticated.
- `/terms` → Terms & Conditions. Public for legal accessibility.

### Protected Routes (Authentication Required)
All routes below require authentication. Unauthenticated users are redirected to `/` (landing page).

- `/app` → Main experience surface. Renders Hub/Cinema/Wisdom + panels via `src/app/app/layout.tsx` → `HomePageClient`.
- `/admin` → Admin dashboard (admin-only, requires elevated privileges).
- `/track/[id]` → Share metadata route (protected) via `src/app/(experience)/track/[id]/page.tsx`.
- `/collection/[id]` → Share metadata route (protected) via `src/app/(experience)/collection/[id]/page.tsx`.
- `/playlist/[id]` → Share metadata route (protected) via `src/app/(experience)/playlist/[id]/page.tsx`.
- `/wisdom/[section]/[id]` → Wisdom deep link metadata route (protected) via `src/app/(experience)/wisdom/[section]/[id]/page.tsx`.
- `/guide` → MetaDJ Nexus Guide (protected).

### Error Pages
- `error.tsx` (route-level), `global-error.tsx` (app-level); `not-found.tsx` for 404s.

### Authentication Policy
Guest access is not supported. All users must create an account and log in to access the platform experience. The landing page serves as the authentication gateway.

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

### Authentication & Feedback
- `/api/auth/login` → Authenticate user and set session cookie.
- `/api/auth/register` → Register new account and set session cookie.
- `/api/auth/logout` → Clear session cookie.
- `/api/auth/session` → Return current session data.
- `/api/auth/account` → Update email/password for current user.
- `/api/feedback` → Submit feedback (optional session) + list feedback (auth required).
- `/api/feedback/[id]` → Fetch/update/delete feedback item (admin for update/delete).

## SEO Notes
- Inline structured data in `src/app/layout.tsx` stays inline for SEO, but now uses the per-request CSP nonce surfaced by `src/proxy.ts`.

## Operational Reminders
- Keep `getMusicSnapshot()` (hub data loader) fast; consider caching if latency rises.
- Keep Hub/Cinema/Wisdom navigation state-driven inside `/app`; avoid introducing routes for view switching.
