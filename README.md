# MetaDJ Nexus

[![CI](https://github.com/Zuberverse/metadj-nexus/actions/workflows/ci.yml/badge.svg)](https://github.com/Zuberverse/metadj-nexus/actions/workflows/ci.yml)

> The primary creative hub for MetaDJ — where human vision meets AI-driven execution to uplift and inspire as you pioneer the Metaverse

*Version: 0.9.46*
**Last Modified**: 2026-01-05 22:08 EST
**Platform:** MetaDJ Nexus at **metadjnexus.ai**
**Social:** **@metadjai**

## Public Preview Status

**MetaDJ Nexus is currently in Public Preview.**

- **Everything is completely free** — Full access to all features
- **No account required** — Jump right in, no registration needed
- **Focused iteration** — The preview phase is about polishing the core experience

## Overview

MetaDJ Nexus is the primary creative hub for MetaDJ—a multi-experience platform bringing together **MetaDJai** (AI creative companion chat), **Music**, **Wisdom** (knowledge and guides), and **Cinema** (visual experiences).

The platform demonstrates what a determined creator can build with AI collaboration, offering high-fidelity audio streaming, immersive visual experiences, AI companion chat, and comprehensive content across multiple features. It is a full-stack showcase of AI-driven creation across code, music, visuals, and content, and it doubles as a playground for experimenting with what is possible. Music remains the primary anchor, while MetaDJai, Wisdom, and Cinema are woven through the experience as active features.

### Core Features

| Feature | Description | Docs |
|---------|-------------|------|
| **MetaDJai** | AI creative companion with multi-provider support (GPT/Gemini/Claude/Grok), web search, and Active Control | [AI Integration](docs/features/vercel-ai-sdk-integration.md) |
| **Music** | Hub + Library with collections, queue, playlists, and Recently Played | [Audio Player](docs/features/audio-player-standards.md), [Collections](docs/features/collections-system.md) |
| **Cinema** | Fullscreen visualizers (3D audio-reactive), video scenes, Dream AI overlay | [Cinema System](docs/features/cinema-system.md) |
| **Wisdom** | Knowledge hub with Guides, essays, and State of Mind dispatches | [Wisdom System](docs/features/wisdom-system.md) |
| **Journal** | Local-first space for ideas with speech-to-text dictation | [Journal](docs/features/journal-feature.md) |

**See [Feature Documentation Index](docs/features/README.md) for complete feature specifications.**

### Why It Matters

This isn't just another music platform. MetaDJ Nexus demonstrates what's possible when human creativity partners with AI—AI amplifies, humans conduct meaning. It's proof that one determined creator with vision and the right tools can build something meaningful and maintainable.

### Music Collections Philosophy

MetaDJ pioneers a different approach to music releases. **Music collections are living release arcs**—projects that evolve organically:

- **Thematic coherence without rigidity**: Each collection has a sonic identity and narrative arc, but isn't locked at release
- **Continuous exploration**: Tracks are added as creative direction continues, without artificial "completion" pressure
- **AI-enabled reality**: This model matches how AI-assisted creators actually work—constantly generating, constantly discovering new territories within chosen themes
- **Liberation from perfectionism**: Release work as living projects, not finished artifacts

Why force ongoing creative exploration into fixed product releases when music collections better represent the creative reality?

*Reference: [Music Collections Catalog](../../../1-system/1-context/1-knowledge/5-music/music-context-collections-catalog.md)*

## Technology Stack

**Core**
- Next.js 16.1.1 with Turbopack (5-10x faster dev builds)
- React 19.2.0 (stable - Server Components, Actions API)
- TypeScript 5.9
- Tailwind CSS with OKLCH tokens
- Framer Motion for physics-based animations
- Cloudflare R2 for production media hosting (zero egress fees)

**AI Integration**
- Vercel AI SDK with multi-provider architecture (OpenAI, Google, Anthropic, xAI)
- Default model: GPT-5.2 Chat (`gpt-5.2-chat-latest`)
- Optional providers: Gemini 3 Flash (`gemini-3-flash-preview`), Claude Haiku 4.5 (`claude-haiku-4-5`), Grok 4.1 Fast (`grok-4-1-fast-non-reasoning`)
- Failover priority: GPT → Gemini → Claude → Grok (skips the active provider, toggle with `AI_FAILOVER_ENABLED`)
- Circuit breaker pattern for provider resilience
- Optional response caching for cost optimization
- Model-aware responses: MetaDJai can disclose the active model when asked
- Web search support (OpenAI provider with direct `OPENAI_API_KEY`)

**Audio & Visuals**
- High-fidelity 320 kbps MP3 streaming
- Fullscreen visual console with graceful fallbacks
- Web Audio API for playback control

**Deployment**
- Hosted on Replit using Next.js App Router
- Media routes proxy Cloudflare R2 (Replit App Storage fallback)
- CDN-friendly asset structure

## Architecture

Project structure (key surfaces):

```
metadj-nexus/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (experience)/     # Primary experience route
│   │   │   ├── layout.tsx    # Main experience orchestrator
│   │   │   └── page.tsx      # Route placeholder (layout renders experience)
│   │   ├── api/
│   │   │   ├── audio/[...path]/route.ts  # Audio streaming proxy
│   │   │   ├── video/[...path]/route.ts  # Video streaming proxy
│   │   │   └── metadjai/stream/route.ts  # AI chat streaming
│   ├── components/           # React components organized by concern
│   │   ├── cinema/           # Visual console (Virtualizer)
│   │   ├── metadjai/         # AI chat components
│   │   ├── wisdom/           # Wisdom view components
│   │   ├── modals/           # Modal orchestration
│   │   ├── panels/           # Control panels
│   │   ├── player/           # Audio player components
│   │   ├── playlist/         # Track cards
│   │   ├── search/           # Search functionality
│   │   └── session/          # Session management
│   ├── contexts/             # React contexts (Player, Queue, UI)
│   ├── data/                 # JSON snapshots (collections, tracks)
│   ├── hooks/                # Custom React hooks
│   └── lib/                  # Domain helpers and utilities
│       ├── ai/               # AI prompts and configuration
│       └── music/            # Music repository and filters
├── public/
│   └── images/               # Collection art and UI assets
├── docs/                     # Project documentation
├── scripts/                  # Automation helpers
├── tests/                    # Vitest test suites
└── types/                    # TypeScript type definitions
```

## Installation

### Prerequisites
- Node.js 20.19+ (or 22.12+)
- npm (comes with Node.js)

### Browser Compatibility
| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 90+     | ✅ Fully supported |
| Firefox | 88+     | ✅ Fully supported |
| Safari  | 15+     | ✅ Fully supported |
| Edge    | 90+     | ✅ Fully supported |

**Features requiring modern browsers:**
- Web Audio API (music playback)
- WebGL (Cinema visuals, requires hardware acceleration)
- MediaRecorder API (voice input for MetaDJai)
- getUserMedia (Dream webcam feature)

```bash
# Verify your environment
node -v    # Should output v20.19.0 or higher

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your API keys (at minimum OPENAI_API_KEY)

# Verify the setup
npm run type-check && npm run lint
```

For detailed setup instructions, environment configuration, and troubleshooting, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

```bash
npm run dev         # https://localhost:8100 (Turbopack dev, default)
npm run dev:webpack # https://localhost:8100 (webpack dev, most stable)
npm run dev:http    # http://localhost:8100 (HTTP fallback)
```

### Troubleshooting

- If you hit Turbopack HMR issues (e.g. `No link element found for chunk ...globals...css`), run `npm run dev:webpack`.
- If `npm run dev` or `npm run build` hangs at `Compiling …`, check that Tailwind’s PostCSS `base` is scoped to `src/` (avoids scanning `node_modules.nosync`) in `postcss.config.js`.
- If you see a dev-only hydration warning involving the JSON-LD `structured-data` script, confirm `src/app/layout.tsx` includes `suppressHydrationWarning` on that `<script>`.

## Deployment

**Platform**: Replit (with Neon PostgreSQL planned for database)

**Deploy to Replit**:
```bash
# Import project to Replit
# Use npm run dev:replit for port 5000 (Replit)
# Or npm run dev for HTTPS on port 8100 (local)
```

**Build Validation**: Run `npm run build` to mirror the release pipeline (runs `prebuild` → lint + type-check + tests).

See [docs/operations/BUILD-DEPLOYMENT-GUIDE.md](docs/operations/BUILD-DEPLOYMENT-GUIDE.md) for complete deployment instructions.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `STORAGE_PROVIDER` | Storage backend: `r2` (primary) or `replit` (fallback) |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | R2 bucket name (default: `metadj-nexus-media`) |
| `AI_PROVIDER` | Optional default provider (`openai`, `google`, `anthropic`, `xai`) |
| `OPENAI_API_KEY` | Required if OpenAI is selected, used as fallback, or for web search |
| `PRIMARY_AI_MODEL` | Optional OpenAI model override (defaults to `gpt-5.2-chat-latest`) |
| `GOOGLE_API_KEY` | Required if Gemini is selected or used as fallback |
| `GOOGLE_AI_MODEL` | Optional Gemini model override (defaults to `gemini-3-flash-preview`) |
| `ANTHROPIC_API_KEY` | Required if Claude is selected or used as fallback |
| `ANTHROPIC_AI_MODEL` | Optional Claude model override (defaults to `claude-haiku-4-5`) |
| `XAI_API_KEY` | Required if Grok is selected or used as fallback |
| `XAI_AI_MODEL` | Optional Grok model override (defaults to `grok-4-1-fast-non-reasoning`) |
| `AI_FAILOVER_ENABLED` | Optional (default `true`) - enable provider failover |
| `AI_CACHE_ENABLED` | Optional - in-memory response cache |
| `OPENAI_TRANSCRIBE_MODEL` | Optional speech‑to‑text model for voice input (defaults to `gpt-4o-mini-transcribe-2025-12-15`) |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Analytics domain for Plausible |
| `LOGGING_WEBHOOK_URL` | Optional error logging endpoint |
| `LOGGING_SHARED_SECRET` | Token for authenticated log forwarding |
| `LOGGING_CLIENT_KEY` | Client auth key for `/api/log` (must match `NEXT_PUBLIC_LOGGING_CLIENT_KEY`) |
| `NEXT_PUBLIC_LOGGING_CLIENT_KEY` | Public client auth key for `/api/log` |
| `UPSTASH_REDIS_REST_URL` | Optional - Upstash Redis URL for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional - Upstash Redis token for distributed rate limiting |

All variables documented in `.env.example` and [docs/operations/BUILD-DEPLOYMENT-GUIDE.md](docs/operations/BUILD-DEPLOYMENT-GUIDE.md).

## Testing

### Test Suite

**Comprehensive testing** covering all critical user flows:

```bash
npm run lint        # ESLint with --max-warnings=0
npm run type-check  # TypeScript strict mode validation
npm run test        # Vitest unit/integration tests
npm run test:coverage # Coverage with threshold enforcement
npm run test:e2e     # Playwright smoke tests
```

_First-time E2E setup_: `npx playwright install`

**Unit/Integration Tests**: Run `npm run test` to see current counts (counts change as coverage grows)
- Accessibility tests (WCAG 2.1 AA compliance)
- Component functionality tests
- Music repository operations
- Queue persistence operations
- Playlist repository operations
- Search and filter functionality
- API route validation

**E2E Tests**: Playwright smoke suite in `tests/e2e`

**Coverage Thresholds**: 30% lines, 25% functions, 15% branches, 30% statements (enforced by `npm run test:coverage`)

### CI/CD Pipeline

**GitHub Actions** — Automated quality gates on every pull request:
- Install dependencies (with node_modules caching)
- Run ESLint (--max-warnings=0)
- Run TypeScript type-check (strict mode)
- Run test suite (no coverage in CI during Public Preview)
- Run production build validation
- Security scanning via Snyk (when enabled)

**Zero-Tolerance Quality Gates**:
- 0 TypeScript errors (strict mode)
- 0 ESLint warnings
- 100% test passing rate
- Coverage thresholds met when `npm run test:coverage` is run
- Production build success

## Documentation

### Core Documentation
- [CHANGELOG.md](CHANGELOG.md) – Version history
- [docs/NAMING-CONVENTIONS.md](docs/NAMING-CONVENTIONS.md) – Code naming standards
- [docs/TESTING.md](docs/TESTING.md) – Testing guide (Vitest + Playwright E2E smoke)

### Architecture & Development
- [docs/MEDIA-STORAGE.md](docs/MEDIA-STORAGE.md) – Media storage (Cloudflare R2) reference
- [docs/operations/BUILD-DEPLOYMENT-GUIDE.md](docs/operations/BUILD-DEPLOYMENT-GUIDE.md) – Deployment guide
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md) – Performance benchmarks and optimization
- [docs/INCIDENT-RESPONSE.md](docs/INCIDENT-RESPONSE.md) – Incident response runbook
- [CLAUDE.md](CLAUDE.md) – Claude Code development standards
- [AGENTS.md](AGENTS.md) – Agent coordination

### Feature Documentation
- **[Feature Index](docs/features/README.md)** – Complete feature documentation index
- 30+ detailed feature specifications covering all platform capabilities

## Roadmap

### Current: Public Preview (v0.9.46)
Everything unlocked, free access, no account required.

- ✅ MetaDJai creative companion with GPT-5.2 (Unified Persona)
- ✅ Fullscreen visual console with scene selection
- ✅ Complete music catalog streaming
- ✅ Queue management with persistence
- ✅ User playlists — create, manage, and play curated sets
- ✅ Wisdom knowledge hub (dedicated view)
- ✅ Comprehensive User Guide with quick navigation and MetaDJai integration
- ✅ **Interactive Tour** — Desktop walkthrough of key features using `driver.js` (mobile falls back to the User Guide)
- ✅ Music Collections documentation with detailed feature descriptions
- ✅ **Audio‑reactive visualizers** (Cosmos, Black Hole, Space Travel, Disco Ball (mirror-tile core + **bass shockwaves**), Pixel Portal (shockwaves + spark dust), 8‑Bit Adventure (power-ups + parallax), Synthwave Horizon (sky flyers + **aurora pulse** + **grid bounce**))
- ✅ **Audio-Reactive Post-Processing** — 3D Bloom and Chromatic Aberration respond dynamically to audio peaks.
- ✅ **Premium Waveform UI** — Mirrored reflections, glowing particle "splashes," and smooth trails.
- ✅ **Pulse-Driven UI Elements** — Global "Aura Glow" for panels and "Beat-Shimmer" for playback controls.
- ✅ **Track‑seeded 2D variation** — Pixel Portal / 8‑Bit Adventure / Synthwave Horizon subtly shift layout + motifs per track (no user controls)
- ✅ **Video scene library** with collection associations
- ✅ **Recently Played (Library)** — last 50 plays pinned under Featured
- ✅ **Queue Management** — priority lane, drag-to-reorder, 24-hour persistence
- ✅ **MetaDJai Fullscreen** — Immersive creative mode with persistence
- ✅ **Creative Workflows** — Knowledge base support for deep work and ideation
- ✅ **Hybrid knowledge retrieval** — Keyword search with optional semantic boost (no vector DB)
- ✅ **Adaptive DJ-first flow** — MetaDJai adapts to intent with no mode toggle
- ✅ **Active Control proposals** — Confirm cards for playback and surface navigation
- ✅ **Track production details** (BPM, Key, Release Date)
- ✅ **Wisdom enhancements** — Lazy‑loaded content, read‑time estimates, TOC anchors, next/prev navigation, and per‑article “Summarize / Ask MetaDJai” actions
- ✅ **Source-aware queue** — Playing from collection/mood/playlist builds queue from that source only
- ✅ **Compact track cards** — Space-efficient design with hover-overlay action buttons
- ✅ **Responsive panel breakpoint** — Desktop layout now activates at 1100px (improved from 1440px)
- ✅ **Vibe Builder micro‑sets** — mood‑based guided entry in the Hub
- ✅ **Wisdom continuity** — opens to last‑visited section
- ✅ **Desktop Header Playback Pill** — quick prev/play/next + one‑tap Library/Queue access
- ✅ **MetaDJai avatar** — Profile picture displayed in assistant message bubbles
- ✅ **Web search capability** — MetaDJai searches the web for current events and recent information
- ✅ **Source attribution** — Includes hyperlinked sources when using web search

### Next Release (v1.0.0) — Public Launch
End of Public Preview. Focus on launch polish, stability, and onboarding clarity.

- [ ] **Launch polish** — final copy, UI cleanup, and visual consistency sweep
- [ ] **Stability pass** — performance tuning and regression checks
- [ ] **Onboarding refinements** — guide and tour updates based on feedback

### Catalog Expansion Features (Implemented, Awaiting Larger Catalog)
These features are fully implemented but temporarily disabled until the music catalog grows:
- [x] ~~**Smart Play Next** — Removed feature.~~
- [ ] **Left Panel Mood Channels** — Curated experiences (Deep Reflection, Energy Boost, Creative Inspiration). Hub micro‑sets use this system now; the Left Panel list stays behind `FEATURE_MOOD_CHANNELS` until the catalog expands.

*Enable via feature flags in `src/lib/app.constants.ts` when catalog reaches sufficient size for meaningful results.*

### Future Vision (2025+)

**New Experiences**
- [ ] **Radio** — 24/7 curated MetaDJ Nexus radio feature with music, podcast segments, and occasional commercials
- [ ] **Arcade** — MetaDJ/AI/Metaverse mini‑games (8‑bit first wave, expand over time)
- [ ] **Worlds** — portal/directory to MetaDJ’s worlds, with future embedded world experiences
- [ ] **Productions Library** — on‑demand archive of MetaDJ performances + produced experiences
- [ ] **Podcast Hub** — central directory for MetaDJ podcast episodes (some hosted off‑platform)
- [ ] **Toolkit** — Creative tools hub: internal AI‑driven micro‑tools for niche DJ/creator workflows + curated external tools directory with docs

**Cinema Evolution**
- [ ] **Moments Mode** — on-demand productions with integrated audio + video; Cinema adds a Virtualizer/Moments toggle once content is ready
- [ ] **Storyboard Mode** — user prompts set a theme/narrative; real‑time video plays out and adapts to current music
- [ ] **Dream Recording** — capture Cinema/Dream output in portrait or landscape with a subtle watermark (short‑form clips)

**MetaDJai Evolution**
- [ ] **AI DJ Mode** — MetaDJai curates continuous mixes and radio‑style flow
- [ ] **User Personalization Layer** — opt‑in profile + context sharing (goals, tastes, projects, constraints) so MetaDJai can collaborate with you more deeply; fully transparent and user‑controlled.
- [ ] **Vector Store Retrieval (Scaling)** — optional: move embeddings from in‑memory cache to a persistent vector index (ex: Postgres `pgvector` or a managed vector store) once the knowledge base + user context outgrows single‑process caching; keep keyword-only fallback.
- [ ] **Agentic Multi‑Step Tools** — MetaDJai can chain multiple tools/workflows to accomplish tasks (sets, summaries, research, platform actions), always proposing and requiring confirmation before execution.
- [ ] **Muse Board** — node‑based ideation space co‑created with MetaDJai
- [ ] **Image Generation** — MetaDJai visuals via a Nano‑Banana‑class model
- [ ] **Voice Chat → Video Chat** — real‑time voice conversation, later video presence
- [ ] **3D Avatar Exploration** — embodied MetaDJai avatar for Metaverse sessions

**Wisdom Evolution**
- [ ] **Courses** — structured learning built from Wisdom frameworks and guides

**Commerce**
- [ ] **Marketplace** — merch + offerings

**Ongoing Expansion**
- [ ] More collections/tracks, visualizers/videos, and Wisdom content as the corpus grows

## Contributing

Internal project. Coordinate changes with Z and follow `CLAUDE.md` + `AGENTS.md` for workflow standards.

## License

Proprietary unless explicitly stated otherwise. Contact `licensing@metadj.ai` for usage requests.

## Support
- Issues: open a GitHub issue in `metadj-nexus`
- Email: contact@metadj.ai
- Licensing: licensing@metadj.ai

---

**MetaDJ Nexus** — Where I share my music with fans, explorers, and creators building the future.
