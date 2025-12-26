# Architecture Documentation Index

**Last Modified**: 2025-12-22 19:12 EST
Quick reference for all architecture documentation in MetaDJ Nexus.

## System Architecture

| Document | Description |
|----------|-------------|
| [component-architecture.md](./component-architecture.md) | Modular component architecture with composition patterns |
| [data-architecture.md](./data-architecture.md) | Music metadata loading and future Neon transition |
| [routing.md](./routing.md) | Single-route experience and API surface documentation |
| [STORAGE-ARCHITECTURE-DIAGRAM.md](./STORAGE-ARCHITECTURE-DIAGRAM.md) | Visual reference for audio streaming critical path |
| [AI-RESILIENCE-PATTERNS.md](./AI-RESILIENCE-PATTERNS.md) | Circuit breaker, failover, and rate limiting for MetaDJai |

## UI Architecture

| Document | Description |
|----------|-------------|
| [shared-ui-components.md](./shared-ui-components.md) | Reusable component library at `src/components/ui/` |

## Key Concepts

### Component Architecture
- Single responsibility per component
- Composition over inheritance
- `HomePageClient` orchestrates Music, Cinema, Wisdom, and MetaDJai
- Platform shells: Desktop/Mobile via `HomeShellRouter`

### Data Architecture
- Static JSON: `collections.json`, `tracks.json`
- Rich content: `collection-narratives.ts`, `scenes.ts`, `moodChannels.ts`
- Media streaming: Replit App Storage via `/api/audio/` and `/api/video/`

### Routing Architecture
- Single-route experience at `/`
- State-driven views (Hub/Cinema/Wisdom) without route changes
- Dedicated pages: `/guide`, `/terms`

---

**Navigation**: [Back to docs/](../README.md) | [Features](../features/README.md) | [Reference](../reference/)
