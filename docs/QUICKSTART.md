# Developer Quickstart

> **Get up and running with MetaDJ Nexus in 5 minutes**

**Last Modified**: 2026-01-13 14:29 EST

## Prerequisites

- Node.js 20.19+ (or 22.12+)
- npm
- Git

## Quick Setup

```bash
# Clone and install
git clone https://github.com/Zuberverse/metadj-nexus.git metadj-nexus
cd metadj-nexus
npm install

# Start development server (HTTPS by default)
npm run dev
# Opens at https://localhost:8100
```

> **Note**: The GitHub repo and local folder are both `metadj-nexus`. `npm run dev` uses Turbopack (default). If you hit Turbopack issues, use `npm run dev:webpack`. HTTPS is required for secure context features like Camera/Microphone access. Use `npm run dev:http` if you need HTTP fallback.

## Environment Variables

Create `.env.local` from the example:

```bash
cp .env.example .env.local
```

**Required for full functionality**:

```env
# AI Chat (OpenAI required)
OPENAI_API_KEY=sk-...

# Media Streaming (for production)
MUSIC_BUCKET_ID=your-music-bucket
VISUALS_BUCKET_ID=your-visuals-bucket
```

**Authentication (required in production, optional in dev)**:

```env
AUTH_SECRET=your-auth-secret-min-32-chars-here
ADMIN_PASSWORD=your-admin-password
AUTH_SESSION_DURATION=604800
AUTH_REGISTRATION_ENABLED=true
```

In development, MetaDJ Nexus uses a default local auth secret if `AUTH_SECRET` is unset. Set `ADMIN_PASSWORD` to access `/admin`.

**Optional**:

```env
# Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=metadjnexus.ai

# Logging
LOGGING_WEBHOOK_URL=https://...
LOGGING_SHARED_SECRET=your-secret
```

See [operations/BUILD-DEPLOYMENT-GUIDE.md](./operations/BUILD-DEPLOYMENT-GUIDE.md) for all variables.

---

## Project Structure Overview

```
src/
├── app/            # Next.js App Router pages & API routes
├── components/     # React components by feature
├── contexts/       # React Context providers (6 total)
├── hooks/          # Custom hooks (45+ hooks)
├── lib/            # Domain logic & utilities
├── data/           # JSON data (tracks, collections, knowledge)
└── types/          # TypeScript definitions
```

**Key Directories**:
- `src/app/(experience)/layout.tsx` — Shared Hub/Cinema/Wisdom experience layout
- `src/components/home/HomePageClient.tsx` — Main client orchestrator
- `src/components/` — 60+ components in 28 subdirectories
- `src/hooks/` — See [Hooks Reference](./reference/hooks-reference.md)
- `src/contexts/` — See [Contexts Reference](./reference/contexts-reference.md)

---

## Common Development Tasks

### Run Development Server

```bash
npm run dev          # Port 8100 with HTTPS (Turbopack dev, default)
npm run dev:webpack  # Port 8100 with HTTPS (webpack dev, most stable)
npm run dev:http     # Port 8100 with HTTP (HTTP fallback)
npm run dev:replit   # Port 5000 (Replit deployment)
```

> **`npm run dev`** includes HTTPS by default for full functionality including Camera/Microphone APIs.

### Run Tests

```bash
npm run test         # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage report
```

### Type Check & Lint

```bash
npm run type-check   # TypeScript validation
npm run lint         # ESLint (0 warnings allowed)
```

### Production Build

```bash
npm run build        # Create production build
npm run start        # Run production server
```

### Full Validation (Pre-commit)

```bash
npm run lint && npm run type-check && npm run test && npm run build
```

---

## Key Patterns

### Importing Hooks & Contexts

```typescript
// Hooks (direct import)
import { useAudioPlayback } from '@/hooks/use-audio-playback';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

// Contexts (direct import)
import { usePlayer } from '@/contexts/PlayerContext';
import { useQueue } from '@/contexts/QueueContext';
import { useUI } from '@/contexts/UIContext';
import { useToast } from '@/contexts/ToastContext';
```

### Component Pattern

```typescript
'use client';

	import { usePlayer } from '@/contexts/PlayerContext';
	import { useQueue } from '@/contexts/QueueContext';
	import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

export function MyComponent() {
  const { currentTrack, togglePlay } = usePlayer();
  const { queue, addToQueue } = useQueue();

  useKeyboardShortcuts({
    onPlayPause: togglePlay,
  });

  return (
    <div>
      {currentTrack?.title}
    </div>
  );
}
```

### Adding a New Hook

1. Create `src/hooks/use-my-hook.ts`
2. Import it directly where needed (or add to a domain-specific barrel like `src/hooks/home/index.ts` if one exists)
3. Add to [Hooks Reference](./reference/hooks-reference.md)

### Adding a New Component

1. Create in appropriate `src/components/[feature]/` directory
2. Use existing patterns (see similar components)
3. Add tests in `tests/`

---

## Architecture Quick Reference

### State Management

| State Type | Solution |
|------------|----------|
| UI State | UIContext |
| Playback | PlayerContext |
| Queue | QueueContext |
| Modals | ModalContext |
| Toasts | ToastContext |
| Playlists | PlaylistContext |

### Data Flow

```
JSON Data (src/data/)
    ↓
Repository (src/lib/music/)
    ↓
React Context
    ↓
Components
```

### Provider Order (Critical)

Providers must be nested in this order:
```
ToastProvider → ModalProvider → UIProvider → PlaylistProvider → QueueProvider → PlayerProvider
```

See [Contexts Reference](./reference/contexts-reference.md) for details.

---

## Debugging Tips

### Check Console for Errors

Development mode includes detailed error logging.

### Test MetaDJai

```bash
# Note: -k flag allows self-signed HTTPS certificates
# Use /api/metadjai/stream for streaming responses (recommended)
curl -k -X POST https://localhost:8100/api/metadjai/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Or use /api/metadjai for non-streaming (complete response)
curl -k -X POST https://localhost:8100/api/metadjai \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Clear Rate Limits (Dev Only)

```bash
curl -k -X POST https://localhost:8100/api/dev/clear-rate-limits
```

### Verify Storage Buckets

```bash
curl -k https://localhost:8100/api/health
```

---

## Common Issues

### "Module not found" Errors

```bash
rm -rf node_modules .next
npm install
```

### Port Already in Use

```bash
# Kill process on port 8100
lsof -ti:8100 | xargs kill -9
```

### TypeScript Errors

```bash
npm run type-check
# Fix any errors before committing
```

### Test Failures

```bash
npm run test -- --reporter=verbose
# See detailed failure messages
```

---

## Next Steps

1. **Understand the Architecture**
   - [Component Architecture](./architecture/component-architecture.md)
   - [Data Architecture](./architecture/data-architecture.md)

2. **Explore the API**
   - [API Documentation](./API.md)

3. **Learn the Patterns**
   - [Hooks Reference](./reference/hooks-reference.md)
   - [Contexts Reference](./reference/contexts-reference.md)

4. **Check Feature Specs**
   - [Audio Player Standards](./features/audio-player-standards.md)
   - [Cinema System](./features/cinema-system.md)
   - [MetaDJai Knowledge Base](./features/metadjai-knowledge-base.md)

5. **Review Standards**
   - [Naming Conventions](./NAMING-CONVENTIONS.md)
   - [CLAUDE.md](../CLAUDE.md) — Development standards

---

## Getting Help

- Check [docs/README.md](./README.md) for documentation index
- Review [CHANGELOG.md](../CHANGELOG.md) for recent changes
- See [TESTING.md](./TESTING.md) for test organization
