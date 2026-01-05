# MetaDJ Nexus Documentation

> **Complete reference for developing, deploying, and understanding MetaDJ Nexus**

**Last Modified**: 2026-01-03 23:23 EST
**Version**: 0.9.46

## Quick Start

**New to MetaDJ Nexus?** Start here:
1. [QUICKSTART.md](QUICKSTART.md) - **Developer quickstart guide** (5-minute setup)
2. [README.md](../README.md) - Project overview and features
3. [MEDIA-STORAGE.md](MEDIA-STORAGE.md) - Cloudflare R2 media storage and streaming
4. [NAMING-CONVENTIONS.md](NAMING-CONVENTIONS.md) - Code naming standards
5. [../CLAUDE.md](../CLAUDE.md) - Development standards and guidelines

## Core Documentation

### Essential References

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](../README.md) | Project overview, features, tech stack | Everyone |
| [QUICKSTART.md](QUICKSTART.md) | Developer quickstart guide | Developers |
| [CHANGELOG.md](../CHANGELOG.md) | Version history and release notes | Everyone |
| [NAMING-CONVENTIONS.md](NAMING-CONVENTIONS.md) | Code naming standards and terminology | Developers |
| [../CLAUDE.md](../CLAUDE.md) | Claude Code development standards | Developers |
| [../AGENTS.md](../AGENTS.md) | Agent architecture and coordination | Developers |
| [operations/BUILD-DEPLOYMENT-GUIDE.md](operations/BUILD-DEPLOYMENT-GUIDE.md) | Deployment procedures | Developers |
| [KEYBOARD-SHORTCUTS.md](KEYBOARD-SHORTCUTS.md) | Global keyboard shortcuts reference | Everyone |
| [SECURITY.md](SECURITY.md) | Security philosophy and approach | Everyone |
| [TESTING.md](TESTING.md) | Testing guide (Vitest + Playwright E2E multi-browser) | Developers |
| [PERFORMANCE.md](PERFORMANCE.md) | Performance benchmarks and optimization | Developers |
| [INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md) | Incident response runbook | Developers |
| [API.md](API.md) | API endpoint documentation | Developers |

### API Reference

| Document | Purpose | Key Topics |
|----------|---------|-----------|
| [reference/hooks-reference.md](reference/hooks-reference.md) | Custom React hooks catalog | 45+ hooks by domain |
| [reference/contexts-reference.md](reference/contexts-reference.md) | React Context providers | 7 contexts, nesting order |
| [reference/DESIGN-TOKENS.md](reference/DESIGN-TOKENS.md) | Design token system | Radius, shadows, tracking, durations |
| [reference/code-to-docs-map.md](reference/code-to-docs-map.md) | Code to docs coverage map | Where to document changes |
| [reference/storage-api.md](reference/storage-api.md) | Storage API reference | localStorage keys, persistence patterns |
| [reference/components-ui-reference.md](reference/components-ui-reference.md) | UI components reference | Shared UI components, patterns |
| [reference/components-collection-playlist-reference.md](reference/components-collection-playlist-reference.md) | Collection/playlist components | Browse, queue, track list components |

### Technical Documentation

| Document | Purpose | Key Topics |
|----------|---------|-----------|
| [MEDIA-STORAGE.md](MEDIA-STORAGE.md) | Media storage configuration | Cloudflare R2, API routes, streaming |
| [architecture/README.md](architecture/README.md) | Architecture documentation index | Component, data, routing architecture |
| [architecture/data-architecture.md](architecture/data-architecture.md) | Data structure and organization | Track metadata, collections system |
| [features/vercel-ai-sdk-integration.md](features/vercel-ai-sdk-integration.md) | AI integration architecture | Vercel AI SDK, multi-provider setup, native web search |
| [daydream/README.md](daydream/README.md) | Daydream StreamDiffusion references | API, env vars, ingest behaviors, MetaDJ Nexus Dream plans (square 512×512 ingest @ ~30fps) |
| [operations/ANALYTICS-SETUP.md](operations/ANALYTICS-SETUP.md) | Analytics configuration | Plausible Analytics setup |
| [operations/ANALYTICS-MONITORING-GUIDE.md](operations/ANALYTICS-MONITORING-GUIDE.md) | Analytics monitoring | Event tracking, metrics |
| [strategy/README.md](strategy/README.md) | Platform strategy documentation | Hub content strategy, Replit platform strategy |
| [standards/README.md](standards/README.md) | Project-specific standards | User guide update standards |

### Feature Specifications

See [features/README.md](features/README.md) for the complete feature documentation index.

| Document | Feature | Description |
|----------|---------|-------------|
| [features/audio-player-standards.md](features/audio-player-standards.md) | Audio Player | Playback controls, keyboard shortcuts, states |
| [features/cinema-system.md](features/cinema-system.md) | Cinema System | Visual experiences, visualizers, video scenes |
| [features/hub-system.md](features/hub-system.md) | Hub System | Platform home surface (Hero, Wisdom Spotlight, Platform Pulse) |
| [features/panel-system.md](features/panel-system.md) | Panel System | Desktop side panels, layout orchestration |
| [features/collections-system.md](features/collections-system.md) | Collections | Collections/singles organization, tabs, filtering |
| [features/ui-visual-system.md](features/ui-visual-system.md) | Design System | OKLCH colors, gradients, typography, effects |
| [features/wisdom-system.md](features/wisdom-system.md) | Wisdom System | Content dashboard, blog integration |
| [features/queue-persistence.md](features/queue-persistence.md) | Queue Persistence | Queue state management, localStorage |
| [features/vercel-ai-sdk-integration.md](features/vercel-ai-sdk-integration.md) | MetaDJai | AI chat integration |
| [features/metadjai-knowledge-base.md](features/metadjai-knowledge-base.md) | Knowledge Base | MetaDJai knowledge system |
| [features/analytics-implementation.md](features/analytics-implementation.md) | Analytics | Event tracking implementation |
| [features/user-guide-system.md](features/user-guide-system.md) | User Guide | Onboarding overlay and guide page |
| [features/welcome-overlay-system.md](features/welcome-overlay-system.md) | Welcome Overlay | First-time visitor onboarding modal |

### Collection Details

| Document | Collection | Tracks |
|----------|-----------|--------|
| [features/collections-system.md](features/collections-system.md) | Majestic Ascent | 10 tracks |

> **Note**: See [features/collections-system.md](features/collections-system.md) for complete collection metadata and update procedures.

## Documentation Structure

```
metadj-nexus/
├── README.md
├── CHANGELOG.md                     # Version history (authoritative)
├── CLAUDE.md                        # Claude Code development standards
├── AGENTS.md                        # Agent architecture overview
├── docs/
│   ├── README.md                    # This file
│   ├── API.md                       # API endpoint documentation
│   ├── NAMING-CONVENTIONS.md        # Code naming standards
│   ├── QUICKSTART.md                # Developer quickstart
│   ├── KEYBOARD-SHORTCUTS.md        # Global keyboard shortcuts
│   ├── SECURITY.md                  # Security overview
│   ├── TESTING.md                   # Testing guide (Vitest + Playwright E2E multi-browser)
│   ├── PERFORMANCE.md               # Performance benchmarks
│   ├── INCIDENT-RESPONSE.md         # Incident response runbook
│   ├── MEDIA-STORAGE.md             # Cloudflare R2 media storage
│   ├── operations/                  # Operations & deployment docs
│   │   ├── BUILD-DEPLOYMENT-GUIDE.md
│   │   ├── ANALYTICS-SETUP.md
│   │   ├── ANALYTICS-MONITORING-GUIDE.md
│   │   ├── ERROR-TRACKING.md
│   │   └── UPTIME-MONITORING.md
│   ├── architecture/                # System architecture docs
│   │   ├── README.md                # Architecture index
│   │   ├── component-architecture.md
│   │   ├── data-architecture.md
│   │   ├── routing.md
│   │   └── STORAGE-ARCHITECTURE-DIAGRAM.md
│   ├── features/                    # Feature specifications
│   │   ├── README.md                # Feature index
│   │   ├── audio-player-standards.md
│   │   ├── cinema-system.md
│   │   ├── panel-system.md
│   │   ├── collections-system.md
│   │   ├── ui-visual-system.md
│   │   ├── wisdom-system.md
│   │   └── [collection docs]
│   ├── reference/                   # API reference docs
│   ├── daydream/                    # Daydream StreamDiffusion docs
│   ├── security/                    # Security implementation docs
│   ├── standards/                   # Project-specific standards
│   ├── strategy/                    # Platform strategy docs
│   ├── testing/                     # Test documentation
│   └── archive/                     # Minimal long-term reference archive
├── scripts/                         # Automation helpers
├── tests/                           # Vitest test suite
└── src/                             # Application source
```

## Key Topics Index

### Terminology & Standards
- **Naming Conventions**: [NAMING-CONVENTIONS.md](NAMING-CONVENTIONS.md)
- **Important**: "Features" replaces "Modules" - see naming conventions for details

### Media & Streaming
- **Media Storage**: [MEDIA-STORAGE.md](MEDIA-STORAGE.md)
- **Naming Conventions**: [MEDIA-STORAGE.md](MEDIA-STORAGE.md#naming-conventions)
- **API Routes**: [API.md](API.md)

### Features
- **Feature Index**: [features/README.md](features/README.md)
- **Audio Player**: [features/audio-player-standards.md](features/audio-player-standards.md)
- **Cinema System**: [features/cinema-system.md](features/cinema-system.md)
- **Panel System**: [features/panel-system.md](features/panel-system.md)
- **Collections System**: [features/collections-system.md](features/collections-system.md)
- **Design System**: [features/ui-visual-system.md](features/ui-visual-system.md)
- **Queue Management**: [features/queue-persistence.md](features/queue-persistence.md)
- **Wisdom Dashboard**: [features/wisdom-system.md](features/wisdom-system.md)
- **Keyboard Shortcuts**: [KEYBOARD-SHORTCUTS.md](KEYBOARD-SHORTCUTS.md)

### Development
- **Code Standards**: [NAMING-CONVENTIONS.md](NAMING-CONVENTIONS.md)
- **Claude Development**: [../CLAUDE.md](../CLAUDE.md)
- **Agent System**: [../AGENTS.md](../AGENTS.md)
- **Code to Docs Map**: [reference/code-to-docs-map.md](reference/code-to-docs-map.md)
- **Architecture Index**: [architecture/README.md](architecture/README.md)
- **Data Architecture**: [architecture/data-architecture.md](architecture/data-architecture.md)
- **AI Integration**: [features/vercel-ai-sdk-integration.md](features/vercel-ai-sdk-integration.md)
- **AI Knowledge Base**: [features/metadjai-knowledge-base.md](features/metadjai-knowledge-base.md)
- **Version History**: [../CHANGELOG.md](../CHANGELOG.md)
- **Test Coverage**: [../README.md#quality--testing](../README.md#quality--testing)

### Deployment & Operations
- **Deployment Guide**: [operations/BUILD-DEPLOYMENT-GUIDE.md](operations/BUILD-DEPLOYMENT-GUIDE.md)
- **Security**: [SECURITY.md](SECURITY.md)
- **Error Tracking**: [operations/ERROR-TRACKING.md](operations/ERROR-TRACKING.md)
- **Uptime Monitoring**: [operations/UPTIME-MONITORING.md](operations/UPTIME-MONITORING.md)

### Analytics
- **Setup**: [operations/ANALYTICS-SETUP.md](operations/ANALYTICS-SETUP.md)
- **Implementation**: [features/analytics-implementation.md](features/analytics-implementation.md)
- **Monitoring**: [operations/ANALYTICS-MONITORING-GUIDE.md](operations/ANALYTICS-MONITORING-GUIDE.md)

## Finding What You Need

### I want to...

**Understand naming conventions**
> [NAMING-CONVENTIONS.md](NAMING-CONVENTIONS.md)

**Add new music tracks**
> [MEDIA-STORAGE.md](MEDIA-STORAGE.md) and [features/collections-system.md](features/collections-system.md)

**Update Cinema visuals**
> [features/cinema-system.md](features/cinema-system.md)

**Understand panel layout**
> [features/panel-system.md](features/panel-system.md)

**Deploy to production**
> [operations/BUILD-DEPLOYMENT-GUIDE.md](operations/BUILD-DEPLOYMENT-GUIDE.md)

**Work with Claude Code**
> [../CLAUDE.md](../CLAUDE.md)

**Configure AI providers**
> [features/vercel-ai-sdk-integration.md](features/vercel-ai-sdk-integration.md)

**Extend MetaDJai knowledge base**
> [features/metadjai-knowledge-base.md](features/metadjai-knowledge-base.md)

**Understand the design system**
> [features/ui-visual-system.md](features/ui-visual-system.md)

**Add new collection**
> [features/collections-system.md](features/collections-system.md)

**Debug streaming issues**
> [MEDIA-STORAGE.md](MEDIA-STORAGE.md)

**Set up analytics**
> [operations/ANALYTICS-SETUP.md](operations/ANALYTICS-SETUP.md)

**Run tests**
> [../README.md#quality--testing](../README.md#quality--testing)

## Maintenance

### Keeping Documentation Current

When making changes to the codebase:

1. **Update relevant documentation** immediately
2. **Update "Last Modified" dates** in modified files
3. **Update CHANGELOG.md** for version releases
4. **Follow naming conventions** - use "feature" not "module"

### Documentation Standards

- Use Markdown format for all documentation
- Include "Last Modified" date at top of file
- Use clear headers and table of contents
- Provide code examples where applicable
- Keep technical accuracy as top priority
- Follow terminology in [NAMING-CONVENTIONS.md](NAMING-CONVENTIONS.md)
- Use SCREAMING-KEBAB-CASE for root doc filenames (e.g., `MEDIA-STORAGE.md`)

## Support

For questions or issues:
- Check relevant documentation section first
- Review [../CHANGELOG.md](../CHANGELOG.md) for recent changes
- Consult [MEDIA-STORAGE.md](MEDIA-STORAGE.md) for storage issues
- See project [../README.md](../README.md) for contact info

---

**Note**: This documentation reflects v0.9.46 Public Preview. Check [../CHANGELOG.md](../CHANGELOG.md) for the latest changes.
