# Agent Architecture - MetaDJ Nexus

> Coordination for the MetaDJ Nexus platform and future AI radio integration.

**Platform Notice**: This `AGENTS.md` is optimized for OpenAI Codex workflows running through the Codex CLI. Claude Code uses the paired `CLAUDE.md`, and Cursor IDE relies on the `.cursor/rules/` file when available; each platform gets the same standards.

**Last Modified**: 2025-12-29 16:45 EST
*Parent: /3-projects/5-software/AGENTS.md*

## Scope
- Governs work in `3-projects/5-software/metadj-nexus/`.
- MetaDJ Nexus is the primary creative hub for MetaDJ (music, cinema, wisdom, MetaDJai).

## User Context
- Assume the user is Z unless explicitly stated otherwise—apply Z's voice, solo-founder learning-developer framing, and skip identity discovery questions.

## Repository Organization
- Keep root minimal: `README.md`, `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`, configs.
- Use `src/`, `public/`, `docs/`, `scripts/`, `tests/`, `types/` for organization.
- No temp files or duplicates ("old", "backup", "copy").

## Stack Snapshot
- Next.js 16 (Turbopack), React 19, TypeScript, Tailwind.
- Web Audio API for playback.
- Vercel AI SDK (OpenAI default; optional Anthropic).

## Project Context
- Single-route experience at `/` with state-driven views (Hub/Cinema/Wisdom/Journal).
- Stack: Next.js 16 (Turbopack), React 19, TypeScript, Tailwind, Vercel AI SDK.
- Web Audio API for playback; Replit Object Storage for media.

## Visual System Alignment
- Tokens from `src/app/globals.css` + `docs/features/ui-visual-system.md`.
- Typography: Cinzel (headings), Poppins (body).
- Glassmorphism and neon accents are standard.

## Voice and UI Copy
- Balanced artist-direct voice: use "I/me/my" for welcomes and descriptions.
- Keep UI labels neutral ("Queue", "Play", "Shuffle").
- Avoid hype language.

## Security Headers (critical)
- `src/proxy.ts` is the sole source for security headers.
- Keep `camera=(self)` and `microphone=(self)` enabled for Dream and MetaDJai.
- Never set `camera=()` or `microphone=()`.

## Music Data Standards
- Always use "collection" terminology (collection-first releases).
- Canonical source: `1-system/1-context/1-knowledge/5-music/music-context-collections-catalog.md`.
- App data lives in `src/data/collections.json` and `src/data/tracks.json`.
- Each track must have exactly two genre tags.

## AI Integration
- System instructions: `src/lib/ai/meta-dj-ai-prompt.ts`.
- Tools: `src/lib/ai/tools.ts`.
- Knowledge base: `src/data/knowledge/`.
- API key: `OPENAI_API_KEY` (Replit secrets).

## Development Standards
### Code Patterns
- State-driven view switching; keep routing changes limited to `/guide`, `/terms`, `/wisdom/*` deep links.
- Adaptive view mounting (`src/hooks/home/use-view-mounting.ts`) for performance tiers.
- API routes enforce request size limits via `src/lib/validation/request-size.ts`.
- Rate limiting uses Upstash when configured; in-memory fallback for single-instance.

### Quality Standards
- `npm run lint`, `npm run type-check`, `npm run test` before commits.
- No `console.log` in production paths; use `logger`.
- WCAG 2.1 AA: maintain skip-link target focusability and focus traps.

## Workflow & Commands
- Dev server: `npm run dev` (port 8100)
- Lint/test: `npm run lint && npm run type-check && npm run test`
- E2E (smoke): `npm run test:e2e`

### Quick Reference
```bash
npm run dev          # Start HTTPS dev server (port 8100)
npm run dev:webpack  # Webpack dev (most stable)
npm run dev:http     # HTTP fallback
npm run lint         # Check code style (0 warnings)
npm run type-check   # Validate TypeScript
npm run test         # Run unit/integration tests
npm run test:e2e     # Run Playwright smoke tests
npm run build        # Production build (runs prebuild checks)
```

## Automatic Documentation
- Update `CHANGELOG.md` and relevant `docs/` entries for meaningful changes.
- Use `docs/reference/code-to-docs-map.md` to keep coverage aligned.
- Update `AGENTS.md`/`CLAUDE.md` when coordination patterns change.

## Development Patterns
- Data sources: `src/data/collections.json`, `src/data/tracks.json`, `src/data/knowledge/`.
- Security headers + CSP: `src/proxy.ts` (keep `next.config.js` in sync).
- AI tooling: `src/lib/ai/*` (providers, failover, tools, validation).

## Common Tasks
- Add tracks/collections: update data JSON + run `npm run test` (pretest validates tracks).
- Update AI prompt/tools: edit `src/lib/ai/meta-dj-ai-prompt.ts` and `src/lib/ai/tools.ts`.
- Update CSP/permissions: edit `src/proxy.ts` (and keep `next.config.js` aligned).

## Code Review Checklist
- Lint/type-check/tests pass; E2E for UX-facing changes.
- CSP/nonce + security headers confirmed via `src/proxy.ts`.
- Request size limits and rate limiting applied for new endpoints.
- Accessibility: skip link target focusable, focus traps, keyboard shortcuts intact.

## Coordination Patterns
- Small UI or copy changes: coder solo, then writer for docs if needed.
- Feature work: software (architecture) → coder (implementation) → software (review).
- Cross-cutting audits: product + software + coder inputs synthesized into one report (Codex sequential).

## Quality Gates
- `npm run lint` and `npm run type-check` clean.
- `npm run test` + `npm run test:e2e` for user-facing changes.
- `npm run build` before release.
- Update `CHANGELOG.md` and relevant docs for meaningful changes.

## Primary Agents
- software (architecture and patterns)
- coder (implementation and UI)
- creative (visual QA)
- writer (documentation and copy)
- optional: dj, ai, product

## Relevant Skills
- accessibility-validator (WCAG checks)
- agent-router (coordination guidance)
- code-review-automator (quality + security scan)
- secure-code-guardian (security posture)
- performance-optimizer (Core Web Vitals + runtime perf)
- dependency-manager (dependency audit)
- system-documentation-auditor (docs coverage)
- test-generator (coverage gaps)
- timestamp-updater (docs maintenance)

## Handoff
Follow `1-system/3-docs/standards/communication/handoff-standard.md` (scope: `3-projects/5-software/metadj-nexus/`).
