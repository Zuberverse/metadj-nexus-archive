# In-Development Roadmap

**Last Modified**: 2026-01-13 14:10 EST

> Canonical snapshot of features that are actively in development, staged, or otherwise not live in the current MetaDJ Nexus build.

## Recently Implemented (v0.9.20)

### Cinema System Enhancements
- **Audio-Reactive Visualizers** — Real-time visualizers responding to music (Cosmos, Black Hole, Space Travel, Disco Ball, Pixel Portal, 8-Bit Adventure, Synthwave Horizon, Spectrum Ring, Starlight Drift)
- **Video Scene Library** — Current video scene: MetaDJ Avatar
- **Collection-Cinema Associations** — Each collection has recommended visuals matching its sonic identity
- **Categorized Dropdown UI** — Clear separation between video scenes and audio-reactive visualizers

### Playlist Enhancements
- **Phase II Actions** — Rename, duplicate, artwork selection, and track reordering (drag + arrow keys)
- **Artwork Selection** — Auto cover from first track + choose-from-track cover

### Music Sharing
- **Share Deep Links** — `/track/[id]`, `/collection/[id]`, `/playlist/[id]` routes provide share metadata cards.
- **Playlist Share Metadata** — Playlist links include name + track count query params for richer previews.

### Smart Playback Features
- **Recently Played (Library)** — Last 50 plays pinned under Featured in the Music panel (localStorage)
- **Mood Channels (gated)** — Data + scoring logic ready; UI integration pending (Deep Focus, Energy Boost, Creative Flow)

### MetaDJai Enhancements
- **Conversation Persistence** — Sessions preserved across page reloads via localStorage
- **AI Streaming Responses** — Real-time streaming for responsive conversations
- **ToolLoopAgent + Structured Output** — `/api/metadjai` uses ToolLoopAgent with `Output.object()` reply parsing
- **Local MCP + DevTools** — MCP tools and DevTools middleware enabled for local-only debugging

### Track Details
- **Production Details Card** — BPM, Key, and Release Date display in track details modal

### Wisdom UX Enhancements
- **Reading Progress Bar** — Sticky progress indicator for Thoughts, Guides, and Reflections.
- **Topic Filter Chips** — Quick topic filtering across Wisdom lists.

### Journal Export + Import
- **Export Entries** — JSON export of local entries.
- **Optional Encryption** — AES-GCM with PBKDF2-derived keys (passphrase never stored).
- **Import + Merge** — Imports merge by id; newer `updatedAt` wins.

---

## In Active Development

### Key Features

- **Guides (Wisdom)** — Three guides live ("Encoding Your Identity With AI", "The Digital Jockey Framework", "Music for State Change"). Additional playbooks (release ops, show design) remain staged until editing and QA finish.
- **Wisdom (Remaster)** — Reflections are live ("MetaDJ's Origin", "About MetaDJ"). Longer-form chapters remain staged while remaster passes continue.
- **Advanced Model Access (MetaDJai)** — Explore subscriber-tier access to higher-capability models across providers, with simple UX labels and clear guardrails.
- **Transformer Final Masters** — Transformer is archived as a draft collection; no active release timeline.
- **Additional State of Mind Dispatches** — Six dispatches are live. Future essays stay in draft to keep releases intentional.

### Key UI / UX Enhancements

- **Wisdom Navigation** — Future iterations may add breadcrumb hints once more posts go live.
- **Cinema Visual Packs** — Additional motion packs being tuned for greater variety.
- **User Guide Expansion** — Planned deep dive with quickstart checklists and direct links into Guides and Wisdom sections.

---

## Future Innovation Roadmap

### Future Feature Considerations (New Recommendations)

| Feature | Why It Matters | Effort | Dependencies |
| --- | --- | --- | --- |
| Offline mode (PWA) | Retention and mobility; aligns with audio use | Large | Service worker, caching policy |
| AI DJ curation | Differentiation and personalization | Large | Richer track metadata and AI policy |
| Collaborative queues | Social growth and shared listening | Large | Realtime backend and auth |
| Social sharing (now playing, scenes) | Acquisition loop and brand spread | Medium | Share routes and OG metadata |
| Tiered access and perks | Revenue path and segmentation | Large | Auth, Stripe, entitlement rules |
| Live events integration | Aligns with MetaDJ Live vision | Large | Streaming and event data pipeline |

### Additional Future Ideas

- Voice Commands — Hands-free control via Web Speech API.
- Cinema Creation Studio — User-generated visual packs.
- Performance Analytics — Listening stats and insights dashboard.
- Spatial Audio — 3D audio positioning for immersive listening.
- Cross-Platform Sync — Unified experience across devices.
- API Access — Developer API for third-party integrations.

---

## Backend & Quality

- **Coverage Reporting** — `npm run test:coverage` is available and writes to `./coverage` (uses `@vitest/coverage-v8`).
- **Object Storage Secrets** — MUSIC/VISUALS bucket IDs now require explicit configuration; fallbacks are dev-only.
- **Logging Webhook** — `/api/log` allows Replit preview hosts but still requires `LOGGING_CLIENT_KEY` and HTTPS webhooks before forwarding logs.
- **Stripe Integration** — Implementation ready pending business requirements finalization (see `stripe-integration-spec.md`)
- **Vercel AI SDK 6 (Current)** — ToolLoopAgent + structured outputs are live; MCP tools + DevTools are local-only with explicit env gating.

---

## How to Use This Document

- Treat each bullet as a live contract: if a feature is listed here, it is not yet in production even if code scaffolding exists.
- Update this roadmap whenever staged functionality changes scope, crosses the finish line, or gains a public milestone.
- Cross-reference the relevant spec (e.g., `docs/features/wisdom-system.md`, `README.md`, `CHANGELOG.md`) for implementation details.
