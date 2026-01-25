# MetaDJ Nexus

*Parent: /3-projects/5-software/AGENTS.md*
**Last Modified**: 2026-01-23 22:30 EST

## Scope

Primary creative hub for MetaDJ — music, cinema, wisdom, and MetaDJai. Lives in `3-projects/5-software/metadj-nexus/`.

## Stack

- Next.js 16 (Turbopack), React 19, TypeScript, Tailwind
- Web Audio API for playback; Cloudflare R2 for media
- Vercel AI SDK (OpenAI default; optional Anthropic)

## Architecture

- Single-route experience at `/app` with state-driven views (Hub/Cinema/Wisdom/Journal)
- Routing limited to `/guide`, `/terms`, `/wisdom/*` deep links
- Adaptive view mounting (`src/hooks/home/use-view-mounting.ts`) for performance tiers
- API routes enforce request size limits via `src/lib/validation/request-size.ts`
- Rate limiting: Upstash when configured; in-memory fallback for single-instance

## Visual System

- Tokens: `src/app/globals.css` + `docs/features/ui-visual-system.md`
- Typography: Cinzel (headings), Poppins (body)
- Glassmorphism and neon accents are standard

## Voice and UI Copy

- Balanced artist-direct voice: "I/me/my" for welcomes and descriptions
- Neutral UI labels ("Queue", "Play", "Shuffle")
- No hype language

## Security Headers (CRITICAL)

- `src/proxy.ts` is the sole source for security headers; `middleware.ts` re-exports it
- Keep `camera=(self)` and `microphone=(self)` enabled for Dream and MetaDJai
- **Never** set `camera=()` or `microphone=()`

## Music Data Standards

- Always use "collection" terminology (collection-first releases)
- Canonical source: `1-system/1-context/1-knowledge/5-music/music-context-collections-catalog.md`
- App data: `src/data/collections.json` and `src/data/music.json`
- Each track must have exactly two genre tags

## AI Integration

- System instructions: `src/lib/ai/meta-dj-ai-prompt.ts`
- Tools: `src/lib/ai/tools.ts`
- Knowledge base: `src/data/knowledge/`

## Development Commands

```bash
npm run dev          # HTTPS dev server (port 8100)
npm run dev:webpack  # Webpack dev (most stable)
npm run dev:http     # HTTP fallback
npm run lint         # Code style (0 warnings)
npm run type-check   # TypeScript validation
npm run test         # Unit/integration tests
npm run test:e2e     # Playwright smoke tests
npm run build        # Production build (runs prebuild checks)
```

## Key Patterns

- Data sources: `src/data/collections.json`, `src/data/music.json`, `src/data/knowledge/`
- Security headers + CSP: `src/proxy.ts` (keep `next.config.js` in sync)
- AI tooling: `src/lib/ai/*` (providers, failover, tools, validation)
- No `console.log` in production paths; use `logger`

## Common Tasks

- **Add tracks/collections**: update data JSON + run `npm run test` (pretest validates tracks)
- **Update AI prompt/tools**: edit `src/lib/ai/meta-dj-ai-prompt.ts` and `src/lib/ai/tools.ts`
- **Update CSP/permissions**: edit `src/proxy.ts` (keep `next.config.js` aligned)

## Nexus-Specific Commands

| Command | Purpose |
|---------|---------|
| `/nexus-collection-prep` | Full collection workflow: local org → corpus archive → data files → R2 upload |
| `/nexus-video-prep` | Prepare video content for Cinema feature |
| `/nexus-upload-music` | Upload tracks to Cloudflare R2 with corpus sync |

**Upload Workflow**: CLI upload (`rclone`) → data update → `npm run test` → browser verify (Cloudflare dashboard)

**Requirements**: `rclone` installed and configured with R2 remote (`~/.config/rclone/rclone.conf`)

## Quality Gates

- `npm run lint` and `npm run type-check` clean
- `npm run test` + `npm run test:e2e` for user-facing changes
- `npm run build` before release
- CSP/nonce + security headers confirmed via `src/proxy.ts`
- Request size limits and rate limiting applied for new endpoints
- WCAG 2.1 AA: skip link target focusable, focus traps, keyboard shortcuts

## Code Review Checklist

- Lint/type-check/tests pass; E2E for UX-facing changes
- CSP/nonce + security headers confirmed
- Request size limits and rate limiting for new endpoints
- Accessibility: skip link, focus traps, keyboard shortcuts intact
- Docs updated (`CHANGELOG.md`, relevant `docs/`)
