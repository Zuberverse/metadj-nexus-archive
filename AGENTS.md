# Agent Architecture - MetaDJ Nexus

> Coordination for the MetaDJ Nexus platform and future AI radio integration.

**Platform Notice**: This `AGENTS.md` is optimized for OpenAI Codex workflows running through the Codex CLI. Claude Code uses the paired `CLAUDE.md`, and Cursor IDE relies on the `.cursor/rules/` file when available; each platform gets the same standards.

**Last Modified**: 2025-12-27 15:36 EST
*Parent: /3-projects/5-software/AGENTS.md*

## Scope
- Governs work in `3-projects/5-software/metadj-nexus/`.
- MetaDJ Nexus is the primary creative hub for MetaDJ (music, cinema, wisdom, MetaDJai).

## User Context
- Assume the user is Z unless explicitly stated otherwise—apply Z's voice, solo-founder learning-developer framing, and skip identity discovery questions.

## Repository hygiene
- Keep root minimal: `README.md`, `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`, configs.
- Use `src/`, `public/`, `docs/`, `scripts/`, `tests/`, `types/` for organization.
- No temp files or duplicates ("old", "backup", "copy").

## Stack snapshot
- Next.js 16 (Turbopack), React 19, TypeScript, Tailwind.
- Web Audio API for playback.
- Vercel AI SDK (OpenAI default; optional Anthropic).

## Voice and UI copy
- Balanced artist-direct voice: use "I/me/my" for welcomes and descriptions.
- Keep UI labels neutral ("Queue", "Play", "Shuffle").
- Avoid hype language.

## Visual system
- Use tokens from `globals.css` and approved gradients.
- Typography: Cinzel for headings, Poppins for body.
- Glassmorphism and neon accents are standard.

## Security headers (critical)
- `src/proxy.ts` is the primary source for security headers.
- Keep `camera=(self)` and `microphone=(self)` enabled for Dream and MetaDJai.
- Never set `camera=()` or `microphone=()`.

## Music data standards
- Always use "collection" terminology (collection-first releases).
- Canonical source: `1-system/1-context/1-knowledge/5-music/music-context-collections-catalog.md`.
- App data lives in `src/data/collections.json` and `src/data/tracks.json`.
- Each track must have exactly two genre tags.

## AI integration
- System prompt: `src/lib/ai/meta-dj-ai-prompt.ts`.
- Tools: `src/lib/ai/tools.ts`.
- Knowledge base: `src/data/knowledge/`.
- API key: `OPENAI_API_KEY` (Replit secrets).

## Primary agents
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
- documentation-gap-finder (docs coverage)
- test-generator (coverage gaps)
- timestamp-updater (docs maintenance)

## Coordination Patterns
- Small UI or copy changes: coder solo, then writer for docs if needed.
- Feature work: software (architecture) → coder (implementation) → software (review).
- Cross-cutting audits: product + software + coder inputs synthesized into one report (Codex sequential).

## Quality Gates
- `npm run lint` and `npm run type-check` clean.
- `npm run test` + `npm run test:e2e` for user-facing changes.
- `npm run build` before release.
- Update `CHANGELOG.md` and relevant docs for meaningful changes.

## Commands
- Dev server: `npm run dev` (port 8100)
- Lint/test: `npm run lint && npm run type-check && npm run test`

## Handoff
Follow `1-system/3-docs/standards/communication/handoff-standard.md` (scope: `3-projects/5-software/metadj-nexus/`).
