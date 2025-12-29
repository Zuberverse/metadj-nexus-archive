# Changelog

**Last Modified**: 2025-12-29 17:45 EST

All notable changes to MetaDJ Nexus are documented here.
Format follows Keep a Changelog, with semantic versioning for public releases.

## [Unreleased]

### 2025-12-29

**Accessibility**
- Fixed 15+ color contrast violations across MetaDJai, modals, and navigation (`text-white/40` → `text-muted-accessible` at ~5.2:1 ratio).
- Added screen reader announcements for view changes (Hub/Cinema/Wisdom/Journal navigation).
- Improved mobile bottom nav icon contrast and label size (9px → 10px).
- Verified MetaDJai form inputs use valid implicit label patterns.

**Keyboard Navigation**
- Added `Ctrl/Cmd + K` as alternative search focus shortcut (alongside existing `/`).
- Added `Ctrl/Cmd + J` to toggle MetaDJai chat panel.

**User Feedback**
- Enhanced audio error toasts with track title context (`"Track Name" unavailable — skipping`).
- Added centralized `toasts.audioError()` and `toasts.audioLoadError()` helpers with collapse support.
- Changed queue empty state CTA from "Feed the Queue" to "Add More Tracks".

**UI Consistency**
- Fixed Library/Browse tab label mismatch (now consistently shows "Browse").

**Testing**
- Added 41 tests for playlist repository covering CRUD operations, validation, and limit warnings.

**Code Quality**
- Completed comprehensive software audit (6 dimensions: Frontend/UI, Backend, Code Quality, Documentation, Repository Organization, AI Integration).
- Verified security posture: `.env.local` and `.next/` properly gitignored and never committed to history.
- Analyzed and documented intentional TypeScript suppressions (4 total, all with rationale comments).
- Reviewed large hook architecture (`use-dream.ts`, 1,273 lines) and determined it's a well-documented state machine that shouldn't be refactored.

**MetaDJai Enhancements**
- Added Dream context awareness: MetaDJai now knows when Dream is active and adjusts responses accordingly (`dreamActive` flag + `<dream_mode>` prompt block).
- Added Cinema scene personality: MetaDJai provides scene-specific personality hints when Cinema is active (e.g., "Cosmic vibes — galaxies spiraling" for Cosmos scene).
- Added session duration awareness: MetaDJai can acknowledge long sessions (30+ min) naturally when contextually appropriate.
- Added Dream feature to `getPlatformHelp` tool for user guidance on real-time avatar transformation.

### 2025-12-28

**UI/UX**
- Moved MetaDJai Actions trigger into the prompt bar and replaced the toolbar slot with Personalize.
- Added Style/Profile tabs to keep Personalize content contained within the popover.
- Matched Personalize popover sizing to Actions and constrained it between the toolbar and prompt bar.
- Ensured Actions/Personalize content areas scroll within their bounded popovers.
- Redesigned `CollectionHeader` with artwork thumbnails, track counts, and persistent collection gradients.
- Collection cards now show their gradient identity in both selected and unselected states (glow effect is the only differentiator).
- Constrained collection container widths from `max-w-6xl` to `max-w-3xl` for improved text readability.
- Improved "About this collection" section with card styling, constrained text width (`max-w-2xl`), and better paragraph spacing.
- Added a static nav pill fallback to prevent the header highlight from rendering as a thin bar before hydration.
- Added a default header offset for the hub layout to prevent the initial content snap under the fixed header.
- Standardized non-hero headers/subheaders (AppHeader suffix, left-panel menus, collections/playlists/queue/search panels, modals, guide, terms, error states, empty states) on the MetaDJai-style solid gradient (`text-heading-solid`), keeping hero H1 gradients intact.
- Extended the `text-heading-solid` treatment to collection tabs/headers, track rows (now playing, search results, queue lists), and mobile feature rail labels for full header parity.
- Flipped the `text-heading-solid` gradient order to start with cyan, matching the MetaDJai reference direction.
- Updated the Hub hero CTA label to "Enter Cinema" for clearer intent.
- Prevented the desktop shell from flashing Hub before restoring the persisted view on refresh.

**Accessibility**
- Assigned unique skip-link targets for mobile and desktop shells to avoid duplicate main landmarks.

**Security**
- Enforced Daydream stream ownership checks on status polling.
- Hardened Journal editor sanitization and paste handling while keeping the rich-text surface.
- Removed CSP `style-src 'unsafe-inline'` by migrating inline styles and scroll locks to nonce-backed rules.

**AI**
- Added MetaDJai Personalize controls with profile-based guidance + custom notes.
- Expanded MetaDJai message length to 8000 chars and chat/stream request caps to 600 KB.
- Revamped MetaDJai Actions with curated on-demand prompts and custom action builder (local-only).

**UX**
- Restored the rich-text Journal editor and removed the Markdown preview flow.
- Fixed the Journal editor focus outline rendering and removed spellcheck underline artifacts.
- Fixed Journal heading buttons to preserve selection and made headings visually distinct in the editor.
- Hydrated Journal Markdown into styled HTML on load and stripped Markdown markers from list previews.
- Added a confirmation modal before deleting MetaDJai chat history sessions.
- Clarified the MetaDJai model selector button label to read `Model: GPT`.

**Dependencies**
- Restored Turndown and its types for Journal rich-text persistence.
- Added `marked` for Journal Markdown hydration.

**Testing**
- Added Daydream status route ownership tests.
- Added MetaDJai route guardrail tests for provider configuration and validation.

**Documentation**
- Added Journal links to documentation indices and documented the Daydream limiter single-instance trade-off.
- Updated the Journal feature doc to reflect the rich-text editor and sanitized paste flow.
- Fixed ghost QUICKSTART.md reference in CONTRIBUTING.md (pointed to README.md instead).
- Updated test count in BUILD-DEPLOYMENT-GUIDE.md from 540+ to 853 tests.
- Added missing data files to data-architecture.md (hub-journeys.ts, platformUpdates.ts, wisdom-content.json).
- Added Relevant Skills section to CLAUDE.md for parity with AGENTS.md.
- Updated code-to-docs-map.md with collection-narratives.ts, hub-journeys.ts, and platformUpdates.ts entries.
- Removed stale TODO comment in cache.ts (implementation was already complete).
- Standardized timestamp formats across documentation files.
- Added Metaverse Revelation collection (9 tracks) to collections-system.md.
- Fixed Majestic Ascent track count from 20 to 39 in collections-system.md.
- Updated Next.js version references in README and Replit deployment guide.
- Updated MetaDJai API and panel system docs for the new model label and request limits.
- Replaced legacy Canvas feature naming with Cinema across docs; clarified HTML canvas references.
- Documented the `text-heading-solid` header standard and hero-heading exceptions in the UI visual system guide.
- Updated gradient and Wisdom/playlist docs to reflect `text-heading-solid` for non-hero headers.

**Configuration**
- Set `metadjnexus.ai` as the canonical domain across defaults and documentation, with `.com` and `.net` redirect notes.

### 2025-12-27

**Security**
- Wired `src/middleware.ts` to activate CSP/nonce headers and proxy rate limiting.
- Expanded CSP `connect-src` to include Gemini and xAI endpoints.
- Added per-client rate limiting on `/api/log`.

**Accessibility**
- Ensured skip-link targets are focusable across desktop and mobile shells.

**Standards**
- Added `npm run format` (eslint --fix) and aligned project coordination docs.

**Logging**
- Routed middleware and rate limiter warnings/errors through `logger` for consistent handling.
- Normalized forwarded IP parsing for API rate limit keys.

**Documentation**
- Aligned dev server commands in README, Quickstart, and Contributing docs with package scripts.
- Corrected Google provider env var naming in Contributing setup notes.

### 2025-12-26

**AI & UX**
- Simplified MetaDJai model disclosure to use display names without date suffixes.
- Queued MetaDJai action/model selections during streaming and auto-applied after responses complete.

### 2025-12-22

**Branding**
- Updated header logo suffix from "verse" to "Nexus" (AppHeader mobile + desktop).
- Updated Welcome Overlay heading from "MetaDJverse" to "MetaDJ Nexus".
- Updated Hub hero headline from "Explore MetaDJ's Universe" to "Explore MetaDJ's Imagination" — emphasizes human creative origin, aligning with Zuberant's "humans conduct meaning" philosophy.

**Fixes**
- Removed deprecated `middleware.ts` stub that conflicted with Next.js 16's `proxy.ts`.
- Restored MetaDJai provider error copy to the "thinking too hard" messaging.
- Unwrapped Gemini JSON envelopes and ignored thought-only payloads in MetaDJai streaming output.
- Normalized Gemini JSON envelopes across streaming + fallback (ignore empty wrappers, reset accumulators).
- Removed the MetaDJai input focus-outline rectangle while preserving the container glow focus state.
- Stabilized Daydream stream limiter state during dev reloads and expanded WHIP error logging for session mismatches.
- Added Google provider options to suppress thought output and enforce text-only responses.
- Added a Zod v3 shim alias to resolve provider-utils build failures.

**Security**
- Enforced streamed request-size limits in API handlers when Content-Length is missing.
- Expanded request size caps for MetaDJai chat/stream and transcription payloads.

**AI & Performance**
- Enabled Upstash Redis caching for AI responses when configured.
- Aligned MetaDJai message length validation with sanitization (4000 chars).

**Testing**
- Added Playwright smoke tests and E2E scripts.

**Documentation**
- Added the architecture overview entry to the docs index.
- Updated security scanning guidance for the simplified GitHub checks.
- Clarified the security checklist to note npm audit runs in the security workflow.
- Updated testing counts, deployment checklist, error tracking platform, component paths, and performance notes.

**CI**
- Removed npm audit from CI to avoid duplicate scans and flakiness.
- Pinned GitHub Actions Node version to `20.19.0` and hardened Snyk gating.

### 2025-12-20

**Code Quality & TypeScript**
- Enhanced TypeScript strictness: `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`
- Fixed implicit return issues across 6 useEffect hooks
- Replaced `@ts-ignore` with documented compatibility API handling
- Typed WisdomSection properly (removed `any` types from HubExperience and HomePageClient)

**Backend Improvements**
- Zod-based validation for MetaDJai API with full schema coverage
- Configurable cache TTL via `AI_CACHE_TTL_MS` environment variable (1min-24hr)
- Configurable cache size via `AI_CACHE_MAX_SIZE` environment variable (10-1000 entries)
- Type-safe request validation with `MetaDjAiRequestPayload` inference

**Frontend Components**
- New Skeleton loading components: base, text, track card, collection card, message, wisdom card, player bar
- Skeleton components exported from `@/components/ui` barrel

**Performance**
- Adaptive view mounting for Hub/Wisdom/Journal based on device capability, with idle warm-up on balanced tier and eager mounting on high-end devices

**Fixes**
- Next.js 15+ compatibility: async `headers()` in RootLayout
- ESLint import order compliance in whip route
- AudioPlayer test mock path correction (5 tests fixed)
- Dynamic background now honors reduced-motion preference on initial load and during transitions

**Security**
- CSP now uses per-request nonces (no `unsafe-inline`), with a middleware entrypoint and nonce propagation to layout scripts
- Daydream mutating endpoints now require the active session that created the stream

**SEO/Metadata**
- Wisdom deep-link routes are `noindex` to avoid duplicate indexing while preserving share cards

**Documentation**
- README accuracy: Coverage thresholds and Recently Played counts aligned with current config
- Next config cleanup: Removed unused `optimizePackageImports` entries
- CSP nonce implementation marked complete and documented
- Daydream API docs updated for session ownership rules

---

### 2025-12-19

**Onboarding & Guide Refresh**
- Welcome overlay: Updated tagline, feature cards, and preview notice to reflect Cinema, Journal, and local-first data
- User guide: Added Hub + Journal coverage, refreshed quick start steps, aligned MetaDJai model labels
- Tour flow: Rebuilt steps to highlight Hub, Music tabs, search, Cinema/Wisdom/Journal nav, MetaDJai, and guide
- Recently Played copy: Updated to match 50-track local history limit

**MetaDJai Enhancements**
- **Chat scroll behavior**: Initial load scrolls to bottom; toggle preserves position; retry logic for DOM element finding; consistent position tracking
- **Typing indicator**: Handles provider timing differences (e.g., Gemini); shows when streaming with empty message
- **Model switch**: Dynamic bottom padding reduced; markers only auto-scroll when user is near bottom
- **Fullscreen**: Removed duplicate backdrop (RightPanel provides it); visual consistency improved
- **Adaptive flow**: Removed mode toggle; responses adapt automatically; previous separators hidden; queue visibility improved
- **Provider selector & failover**: Model dropdown (GPT/Gemini/Claude/Grok); per-request provider support; automatic GPT → Gemini → Claude → Grok fallback; provider health checks in `/api/health`
- **Context accuracy**: System instructions include active provider/model; collection context guardrail; continuity cue for model switches
- **Streaming resilience**: Empty-response fallback to non-streaming; regenerate parity; SSE `textDelta` support; failover on model-not-found
- **Active Control expansion**: Queue set proposals (replace/append); playlist creation proposals; Music panel confirmation flow

**Cinema & Visuals**
- **Canvas → Cinema**: Renamed across UI, docs, and analytics
- Virtualizer opens directly; Moments toggle planned for future content
- Controls auto-hide during Dream countdown (~5s unless interacted)

**Journal**
- Session continuity: View restore (list or open editor) after refresh
- Draft retention: Unsaved title/body persist per entry until saved

**Voice & Transcription**
- Response validation guards against empty payloads with explicit errors
- Robust extraction accepts transcript variants; surfaces "no speech detected" when empty
- Default model: `gpt-4o-mini-transcribe-2025-12-15` (override with `OPENAI_TRANSCRIBE_MODEL`)

**Navigation & Accessibility**
- Mobile header restored across breakpoints
- User Guide entry point: Header info button opens overlay from any view
- Single main landmark anchors skip links across Hub/Wisdom/Journal
- Search overlay: Dialog semantics and focus trapping
- Mobile library overlay: Dialog semantics with focus trapping
- Welcome overlay: Shortened copy; scroll hint replaces jump-to-bottom button
- Footer: User Guide/Terms links share neutral styling

**AI Resilience & Infrastructure**
- Distributed rate limiting: Upstash-backed when configured, in-memory fallback
- AI response caching: Reuses cached output for repeated context signatures
- Dream WHIP warmup retries with exponential backoff; connecting state preserved
- Wisdom section persistence: Hydrates last active section from storage

**Deployment & Testing**
- Replit-first deployment guidance (Vercel/multi-instance as optional future)
- E2E runner removed: Lean Vitest-only baseline (E2E TBD)
- Collection terminology: Replaced "album" across UI/docs; `AlbumArtwork` → `CollectionArtwork`

**Model Defaults**
- Claude: `claude-haiku-4-5`
- Gemini: `gemini-3-flash-preview`
- Chat: `gpt-5.2-chat-latest`

---

### 2025-12-18

**Header & View System**
- View restore: Reload returns to last active surface (Cinema/Wisdom/Journal/Hub)
- Header selector: Tab pill transitions disabled until hydration completes; fixed widths prevent expansion
- Icon balance: Wisdom matches Hub scale; Cinema slightly larger; Journal consistent

**Dream Feature**
- Stream defaults: 512×512 SDTurbo; `slerp` prompt interpolation; ~60s warm-up tolerance
- Startup smoothness: Camera pre-check optimization; startup error grace period; simplified capture retry
- Prompt sync: Live update guardrails; stream readiness sync; warmup resilience; countdown cleanup
- Warmup tolerance: Retryable failures during warm-up don't count toward limit; LoRA omitted by default

**MetaDJai Chat**
- Runway pinning: Consistent for typed messages, starters, and action prompts
- Dynamic runway spacing matches active viewport (panel, fullscreen, mobile)
- Semantic search parity: Query embeddings use same path as cached entries

**Journal Editor**
- Full-height canvas with internal scrolling
- Wider writing column; top breathing room; curved container styling
- Voice control: Centered below canvas; enlarged size; reliable text insertion
- Toolbar alignment with title column

**Visualizer Enhancements**
- Reactive post-processing: 3D bloom and chromatic aberration respond to audio peaks
- Disco Ball: Audio-reactive bass shockwaves; frequency-driven facet popping
- Synthwave Horizon: Aurora ribbons pulse with energy; grid with bass-synced bounce
- Waveform: Mirrored reflections; glowing particle splashes on peaks
- Aura Glow: Global background pulse behind panels; Beat-Shimmer on play/pause
- Pixel Portal: 6-layer vortex; energetic filaments; frequency-driven flares

**UI/UX Audit**
- Play/Pause: Spinning loader during buffering states
- AI Action discoverability: Pulse animation on new track start
- Listening History: Expanded from 10 to 50 tracks
- Queue empty states: Premium glassmorphic illustrations with CTAs
- Reduced motion: Global detection in UIContext; visualizers optimize performance
- Footer: Single line on desktop; removed redundant brand logo
- Header Music Pill: Dynamic chevron rotation; enhanced hover states
- Click-away behavior: Universal `useClickAway` hook across all dropdowns/overlays
- Design system: Standardized "Glass-Neon" aesthetic with semantic utilities
- Card component: Native `radiant` and `radiant-sm` variants

**Global Header Consistency**
- Centralized `text-pop` utility for layered shadow stack
- "Elegant Shift" gradient pattern for Wisdom headings
- Patterns formalized in `ui-visual-system.md` and `gradient-system.md`

**Fixes**
- Dream capture startup: WHIP ingest starts when intermediate cinema track is live
- Webcam preview: Stream attachment triggers readiness; abort interruptions treated as cleanup
- Hydration mismatch: Removed localStorage reads from initial state
- Dream Prompt: Fixed prompt bar and persona toggle changes during streaming

---

### 2025-12-17

**Fixes**
- Shell double-mount: `HomeShellRouter` prunes to single active shell before first paint
- Lint/build gate: Fixed import ordering in `use-metadjai.ts`
- Test noise: Screen reader announcer suppresses warnings in test environment
- Build noise: Upstash message logs lazily (first runtime check)

**Infrastructure**
- Added `.env.example` covering required and optional configuration
- Node engine: Updated to `>=20.19.0`
- E2E local server uses `npm run dev:http` matching localhost:8100

**2D Visualizers**
- Track-seeded variation: Pixel Portal, 8-Bit Adventure, Synthwave Horizon vary per track
- Auto intensity tuning based on audio energy
- More intentional motion with smoothing and beat-aware triggers

---

### 2025-12-15

**Code Standardization**
- File naming compliance: Components to PascalCase, utilities to kebab-case
- Named exports: Converted 8 default exports to named exports
- Barrel exports: Added `index.ts` to 16 component directories
- Shuffle algorithm: Replaced biased sort with Fisher-Yates `shuffleTracks()`

**New Features**
- **Journal**: Private, local-first creative space with speech-to-text and CRUD management

**Fixes**
- Dream PATCH payload: Removed incorrect `pipeline` wrapper; flat parameter object
- Dream PATCH support detection: Graceful degradation with failure tracking
- Dream prompt sync timing: Waits for countdown before PATCH requests
- Audio warmup: Handles both GET and HEAD methods
- Dream lazy loading: Only initializes when Cinema overlay opens

**Desktop Header Redesign**
- Removed standalone "Music" button; Player Pill relocated to left zone
- Center zone reserved for navigation tabs (Hub/Cinema/Wisdom)
- Mobile: Solid white icons for Hub and MetaDJai

**Dream Updates**
- Aspect ratio: 4:3 (768×576) matching webcam's native capture
- Frame dimensions updated across all breakpoints
- Countdown reduced from 30s to 15s

---

### 2025-12-14

**Mobile UX Overhaul**
- Mobile header simplified: Compact search button opens overlay
- Search overlay now mobile-ready across all screen sizes
- Now Playing Dock: Floating mini-player above bottom navigation
- Smart dock visibility: Auto-hides when Music/MetaDJai overlays open
- Content padding adjusted for dock clearance

**AI Provider & Caching**
- Automatic failover: OpenAI → Anthropic Claude with circuit breaker (3 errors, 1min recovery)
- In-memory LRU cache: 100 entries, 30-minute TTL
- Cost estimation: Per-request logging with token counts
- Knowledge embeddings warmup at server startup

**Security & Accessibility**
- CSP header in middleware with proper directives for all services
- Focus traps for MetaDJai Actions and History popovers
- Screen reader announcements for queue actions
- Prefers-reduced-motion CSS support

**Visualizer Enhancements**
- Eight Bit Adventure: Collectible power-ups, parallax layers, combat particles
- Pixel Paradise: Glitch fragments for high-frequency response
- Synthwave Horizon: Music note sky flyers, increased star density

**Cinematic Hub**
- Aurora dynamic background and Shimmer button effects
- Liquid navigation: Sliding pill background in header
- Tactile card interactions: 3D scale and lift on hover
- Terms page: Glassmorphism and gradients matching app aesthetic
- Daydream UI: Unified styling for Dream/Stop buttons and Prompt Bar

**Panel Transitions**
- Replaced CSS with framer-motion spring animations (stiffness: 350, damping: 30)
- Seamless layout morphing for AI chat fullscreen
- Right panel stays mounted (animated off-screen) for state preservation

**Fixes**
- Dream live parameter updates: Fixed race condition in useEffect hooks
- MetaDJai fullscreen close: RightPanel returns null when closed
- MetaDJai escape key: Closes from both panel and fullscreen modes
- Mode switch duplicates: Checks current state before updating
- Cinema overlay positioning: Full viewport coverage with inset-0
- Panel toggle text reflow: Faster 150ms transition

---

### 2025-12-13

**New Features**
- Music panel Library search: SearchBar above Featured for direct track/collection search
- Editable Dream prompt bar: Auto-expands, Enter submits, persists to localStorage
- 8-Bit Adventure visualizer: 2D audio-reactive pixel runner scene
- Disco Ball visualizer: Futuristic cosmic mirror sphere with glittering facets
- Pixel Portal visualizer: Retro portal drift with bass-triggered shockwaves
- Synthwave Horizon visualizer: Outrun grid + neon sun scene
- Left Panel Tab Persistence: Library/Queue/Playlists state persists with reset to Featured
- Desktop Header Playback Pill: Quick prev/play/next + Library/Queue access
- Wisdom section continuity: Reopens to last-visited section

**Architecture Changes**
- HTTPS dev server default: `npm run dev` uses `--experimental-https`
- View switching: State-based (no route changes) for Hub/Cinema/Wisdom
- Cinema performance: Code-splits, loads on-demand, prefetches during idle
- Cinema toggle: Stays mounted after first open; pauses when hidden

**Operational Tooling**
- Upstash Redis rate limiting for multi-instance deployments
- Incident response runbook with severity levels and templates
- Performance benchmarks with Core Web Vitals targets
- CI caching for faster runs; coverage thresholds enforced
- Snyk security scanning via repository variable

**UI/UX Improvements**
- Cinema fade transition: 250ms opacity on enter/exit
- Hub layout shift fix: Default headerHeight updated; useLayoutEffect for measurement
- Centralized breakpoints via `BREAKPOINTS` constant
- Touch targets: All interactive elements meet 44px minimum
- Focus ring consistency with brand OKLCH tokens
- Footer compaction: Reduced padding and tightened layout

**Removed**
- Guided Journey Builder from Hub
- Previous collections browsing UI, TrackCard, unused controls
- Unused barrels and helpers
- Mobile Now Playing dock pill
- MetaDJai chat export feature

---

### 2025-12-12

**Changes**
- Featured collection artwork: Updated badge SVG
- Hub Wisdom Spotlight: Simplified to icon + title inline
- Toast position: Lowered for better visibility
- Music panel: Removed border from Now Playing cover art
- Platform Pulse: Enhanced with gradient styling
- Cinema activation prompt: Moved to top center
- Queue panel header: Removed "Up Next"; compact search + count line

**Removed**
- Cinema quality dropdown (Balanced/Performance toggle)

**Fixes**
- TypeScript compilation: Multiple hook and type fixes
- Next.js 16 route conflicts: Removed conflicting files
- MetaDJai fullscreen: Draft input and scroll position persist
- Experience tab flicker: Initial fix (fully resolved 2025-12-13)

---

## [0.9.0] - 2025-12-11

**Public Preview milestone.** First external release of MetaDJ Nexus.

### Core Features
- **Unified Hub**: Music, Cinema, Wisdom, and MetaDJai in a single-page creative surface
- **High-fidelity streaming**: 320 kbps MP3 via Replit App Storage with secure proxy routes
- **Music Collections**: Featured + collection tabs, queue persistence, search & filtering
- **Queue system**: Manual ordering, shuffle, repeat-queue, undo toasts, session persistence
- **Search & filtering**: Tracks, artists, genres, collections with `Ctrl/Cmd + /` shortcut

### Experiences
- **Cinema**: Fullscreen visual console with scene selection, synced video, poster mode
- **Daydream**: Live generative visuals with StreamDiffusion ingest + control surface
- **Wisdom**: Thoughts, Guides, Reflections with read-time estimates and navigation
- **MetaDJai**: Streaming AI chat with context-aware tools and dual-provider support

### Platform
- **Responsive navigation**: Desktop side panels, mobile overlays, bottom navigation
- **Onboarding**: Welcome overlay, User Guide, interactive tour (driver.js)
- **Accessibility**: WCAG 2.1 AA patterns, skip-to-content, focus trapping, keyboard shortcuts
- **Operations**: Health endpoint, error logging, Plausible analytics, deployment guides

### Quality
- **Visual system**: Consistent glass-neon UI with OKLCH tokens and cinematic gradients
- **Performance**: Memoized orchestration, audio preloader with LRU, list virtualization
- **Security**: Nonce-based CSP, path sanitization, strict headers, rate limiting
- **Code organization**: Naming standards, grouped props, minimized `any`, clean archives

---

## [0.8.0] - 2025-12-01

**Feature Complete milestone.** All core experiences implemented and integrated.

- **MetaDJai integration**: Vercel AI SDK with streaming, dual-provider support (OpenAI + Claude), knowledge base with semantic search
- **Cinema system**: Video scenes, 3D visualizers (Space Travel, Black Hole, Cosmos), audio-reactive post-processing
- **Daydream pipeline**: StreamDiffusion integration, WHIP ingest, persona controls, live prompt updates
- **Wisdom feature**: Thoughts, Guides, Reflections with read-time estimates and deep-linking
- **Queue enhancements**: Drag reorder, shuffle, repeat modes, undo toasts, cross-session persistence

---

## [0.7.0] - 2025-11-15

**Visual System milestone.** Cohesive glass-neon aesthetic established.

- **OKLCH color system**: Purple-cyan-magenta brand palette with semantic tokens
- **Glassmorphism**: Backdrop blur, radiant panels, cinematic gradients
- **Typography**: Cinzel headings, Poppins body, gradient text utilities
- **Motion system**: Framer Motion integration, spring animations, reduced-motion support
- **Component library**: Card, Button, Modal primitives with consistent styling

---

## [0.6.0] - 2025-11-01

**Music Experience milestone.** Core audio platform solidified.

- **Collections system**: Music Collections philosophy, Featured curation, collection detail views
- **Audio streaming**: 320 kbps MP3 via Replit App Storage, secure proxy routes, preloader with LRU cache
- **Queue management**: Add/remove, manual ordering, persist across sessions
- **Search**: Track, artist, genre, collection search with keyboard shortcut
- **Mobile audio**: SafePlay mutex for iOS/Safari compatibility

---

## [0.5.0] - 2025-10-15

**Responsive Layout milestone.** Multi-device experience foundation.

- **Panel system**: Collapsible side panels (Music left, MetaDJai right)
- **Mobile navigation**: Bottom navigation bar, overlay panels, touch-optimized controls
- **Breakpoint system**: Centralized constants, consistent responsive behavior
- **Touch targets**: WCAG 2.1 AA compliant sizing (44px minimum)

---

## [0.4.0] - 2025-10-01

**Accessibility milestone.** WCAG 2.1 AA compliance foundation.

- **Keyboard navigation**: Full app traversal, focus management, skip links
- **Screen readers**: ARIA labels, live regions, semantic HTML
- **Focus indicators**: Consistent ring styling with brand colors
- **Reduced motion**: System preference detection, animation toggles

---

## [0.3.0] - 2025-09-15

**Architecture milestone.** Next.js App Router migration complete.

- **App Router**: Migrated from Pages Router, Server Components where applicable
- **TypeScript strict**: Full strict mode, no `any` leakage, comprehensive types
- **ESLint discipline**: Consistent rules, import ordering, accessibility linting
- **Testing foundation**: Vitest setup, component testing patterns, CI integration

---

## [0.2.0] - 2025-09-01

**Infrastructure milestone.** Development tooling and deployment pipeline.

- **Replit integration**: App Storage for media, environment management, deployment config
- **CI/CD**: GitHub Actions for lint, type-check, test, build validation
- **Development server**: HTTPS support, hot reload, Turbopack integration
- **Documentation**: README, CLAUDE.md, AGENTS.md, initial feature specs

---

## [0.1.0] - 2025-08-15

**Project Genesis.** Initial repository and concept validation.

- **Repository setup**: Next.js 14 scaffold, TypeScript, Tailwind CSS
- **Brand foundation**: MetaDJ identity, visual direction, voice guidelines
- **Proof of concept**: Basic audio playback, initial UI explorations
- **Planning docs**: Vision statement, feature roadmap, technical approach

---

[Unreleased]: https://github.com/Zuberverse/metadj-nexus/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/Zuberverse/metadj-nexus/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/Zuberverse/metadj-nexus/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/Zuberverse/metadj-nexus/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/Zuberverse/metadj-nexus/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/Zuberverse/metadj-nexus/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Zuberverse/metadj-nexus/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Zuberverse/metadj-nexus/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Zuberverse/metadj-nexus/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Zuberverse/metadj-nexus/releases/tag/v0.1.0
