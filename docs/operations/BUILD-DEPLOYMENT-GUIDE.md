# MetaDJ Nexus - Build & Deployment Guide

**Last Modified**: 2026-01-04 07:33 EST

---

## Quick Start: Replit-First Deployment Path

For the fastest, most reliable deployment on the target platform:

1. Add required secrets in Replit (see Environment Variables below).
2. Click **Deploy** in the Replit UI (Deployments).
3. Verify `/api/health` and `/api/audio/...` after deploy.

See `docs/REPLIT.md` for the full Replit deployment flow.

---

## Known Issue: Local Build Timeout

### Problem

The Next.js production build (`npm run build`) times out in the current Replit environment:

```bash
npm run build
# Times out with exit code -1
```

### Diagnosis

- **Not a code issue**: All type checks pass, ESLint passes, dev server works perfectly
- **Environment-related**: Previous audits showed successful builds with same code
- **Only affects local builds**: Remote build platforms work fine

### Impact

- ✅ **Development**: Zero impact - dev server runs perfectly
- ✅ **Functionality**: App works flawlessly
- ⚠️ **Local builds**: Cannot complete in Replit environment
- ✅ **Deployment builds**: Replit Deployments work fine (Vercel available for future scaling)

---

## Deployment Options

### Option 1: Replit Deployments (Primary) ⭐

**Best for**: Production on the Replit-first target platform

**Steps**:
1. Configure secrets in Replit (OPENAI_API_KEY, optional ANTHROPIC_API_KEY/GOOGLE_API_KEY/XAI_API_KEY, bucket IDs, logging keys)
2. Click **Deploy** in the Replit UI (Deployments)
3. Verify `https://your-repl.replit.app/api/health`

**Notes**:
- Uses Replit’s managed build + zero-downtime rollout
- Keeps storage, secrets, and hosting in one place
- Full walkthrough: `docs/REPLIT.md`

---

### Option 2: Vercel (Roadmap Only)

**Status**: Not currently used. Documented for potential future scaling/multi-region needs.

**Best for**: Future scaling scenario requiring global CDN, edge functions, or multi-instance deployment

```bash
# One-time setup
npm install -g vercel

# Deploy
npx vercel --prod
```

**When to Consider**:
- Global latency requirements
- Enterprise-level uptime SLAs
- Multi-tenant growth requiring edge deployment
- Need for preview deployments per PR

**Pros:**
- ✅ Automatic Next.js optimization
- ✅ Global CDN included
- ✅ Preview deployments for each commit
- ✅ Edge functions support

**Cons:**
- ⚠️ External platform dependency (vs. Replit ecosystem)
- ⚠️ Requires Replit Object Storage CORS configuration
- ⚠️ Adds complexity vs. single-platform approach

**Note**: Currently using Vercel AI SDK for AI streaming, but deployment remains Replit-first.

---

### Option 3: Replit Static Export (Not Recommended)

**Best for**: Simple deployments within Replit ecosystem

**Steps:**

1. Enable static export in `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Add this line
  // ... rest of config
}
```

2. Build locally on a different machine:

```bash
npm run build
```

3. Upload `.next` directory to Replit

4. Configure deployment:

```bash
# In Replit deployment settings
# Build Command: (leave empty)
# Run Command: npx serve .next
```

**Pros:**
- ✅ Stays within Replit ecosystem
- ✅ Simple static hosting

**Cons:**
- ❌ **LOSES ALL API ROUTES** (MetaDJai, streaming, logging)
- ❌ **LOSES SERVER-SIDE FEATURES**
- ❌ Not recommended for this app

---

### Option 4: Docker Deployment (Roadmap Only)

**Best for**: Custom infrastructure, full control

```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

**Note**: Requires `output: 'standalone'` in `next.config.js`

---

## Environment Variables Setup

### Required for Production

```env
# AI Features (Required for MetaDJai)
# Provide at least one provider key; OpenAI is required for web search.
OPENAI_API_KEY=your_openai_key_here
GOOGLE_API_KEY=your_google_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
XAI_API_KEY=your_xai_key_here

# Analytics Authentication (Required)
LOGGING_CLIENT_KEY=min_32_characters_random_string_here
LOGGING_SHARED_SECRET=min_32_characters_different_random_string_here

# Media Storage (Required for audio/video)
MUSIC_BUCKET_ID=your_replit_music_bucket_id
VISUALS_BUCKET_ID=your_replit_visuals_bucket_id
```

### Optional

```env
# Analytics Domain (Optional)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com

# Default provider (Optional, defaults to openai)
AI_PROVIDER=openai # or google/anthropic/xai

# AI Model Override (Optional)
PRIMARY_AI_MODEL=gpt-5.2-chat-latest
GOOGLE_AI_MODEL=gemini-3-flash-preview
ANTHROPIC_AI_MODEL=claude-haiku-4-5
XAI_AI_MODEL=grok-4-1-fast-non-reasoning

# Failover toggle (Optional, defaults to true)
AI_FAILOVER_ENABLED=true

# Optional speech-to-text override (defaults to gpt-4o-mini-transcribe-2025-12-15)
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe-2025-12-15
```

### Generating Secure Keys

```bash
# Generate LOGGING_CLIENT_KEY (32+ chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate LOGGING_SHARED_SECRET (32+ chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Pre-Deployment Checklist

### Code Quality ✅

- [x] Zero TypeScript errors: `npm run type-check`
- [x] Zero ESLint warnings: `npm run lint`
- [x] Tests passing: `npm test` (898 tests passing)
- [x] E2E smoke tests passing: `npm run test:e2e`
- [x] Dev server working: `npm run dev`

### Environment Setup

- [ ] All environment variables configured
- [ ] API keys tested and valid
- [ ] Replit Object Storage buckets created
- [ ] Media files uploaded (57 audio tracks, cinema videos)

### Security

- [ ] Secrets stored securely (not in code)
- [ ] LOGGING_CLIENT_KEY is 32+ characters
- [ ] LOGGING_SHARED_SECRET is different from CLIENT_KEY
- [ ] CSP + security headers configured (`src/proxy.ts` via `src/middleware.ts`, plus static asset headers in `next.config.js`)
- [ ] CORS settings verified for Object Storage

### Testing

- [ ] Test build completes (on deployment platform)
- [ ] Audio streaming works in production
- [ ] MetaDJai chat functions correctly
- [ ] Cinema/Wisdom visualizations load
- [ ] Analytics tracking active

---

## Troubleshooting Build Issues

### Local Build Times Out

**Symptom**: `npm run build` exits with code -1

**Solution**: Use Replit Deployments (recommended)

**Why**: Environment-specific issue, not code problem

---

### TypeScript Errors During Build

**Check**:
```bash
npm run type-check
```

**Fix**: Should show zero errors. If not, run:
```bash
rm -rf node_modules package-lock.json
npm install
npm run type-check
```

---

### Missing Dependencies

**Check**:
```bash
npm install --force
```

**Verify**:
```bash
npm list @anthropic-ai/sdk react-markdown remark-gfm
```

---

### API Routes Not Working in Production

**Symptom**: 404 on `/api/*` routes

**Cause**: Using `output: 'export'` (static export disables API routes)

**Fix**: Remove `output: 'export'` from `next.config.js` and deploy to platform with serverless support (Replit Deployments)

---

### Media Files Not Loading

**Check**:
1. Environment variables set: `MUSIC_BUCKET_ID`, `VISUALS_BUCKET_ID`
2. Replit Object Storage buckets exist
3. Files uploaded to correct paths
4. CORS configured for your domain

**Test**:
```bash
# Check if bucket is accessible
curl https://your-app.replit.app/api/health
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T21:00:00.000Z",
  "environment": "production"
}
```

---

### 2. Audio Streaming Test

1. Visit your deployed URL
2. Click "Original Music" feature card
3. Select any track
4. Verify playback starts without errors
5. Check browser console for errors

---

### 3. MetaDJai Test

1. Click MetaDJai companion button (sparkles icon)
2. Send a test message: "What music do you recommend?"
3. Verify streaming response appears
4. Check for errors in browser console

---

### 4. Analytics Test

1. Perform user actions (play track, browse collection)
2. Check browser console for `[Analytics]` logs
3. Verify `/api/log` endpoint receives events (200 status)

---

### 5. Cinema/Wisdom Test

1. Play a track
2. Toggle Cinema view (film icon)
3. Verify video loads and plays
4. Toggle Wisdom view (sparkles icon)
5. Verify animations appear

---

## Performance Optimization

### Bundle Size Targets

- **First Load JS**: < 200 kB (target)
- **Page Load Time**: < 2s (target)
- **Time to Interactive**: < 3s (target)

### Monitoring

```bash
# Analyze bundle (after successful build)
npm run build
npm run analyze
```

### Cache Headers

Cache-Control is set at the route level where needed:

- Media: `src/app/api/audio/[...path]/route.ts`, `src/app/api/video/[...path]/route.ts` → `public, max-age=31536000, immutable`
- Health: `src/app/api/health/route.ts` → `no-store, no-cache, must-revalidate`
- Wisdom: `src/app/api/wisdom/route.ts` → `public, max-age=3600, stale-while-revalidate=86400`

Static assets under `/_next/` are cached by Next.js/platform defaults; avoid overriding unless you have a specific CDN policy.

---

## Rollback Procedures

### Replit Deployments

1. Navigate to Replit Deployments panel
2. Select previous deployment from history
3. Click "Promote to Production"

### Manual (Git-based)

1. Revert git commit: `git revert HEAD`
2. Push: `git push origin main`
3. Trigger new Replit deployment

---

## Support & Resources

### Documentation
- Security guide: `docs/SECURITY.md`
- Environment setup: `.env.example`
- Replit strategy: `docs/strategy/REPLIT-PLATFORM-STRATEGY.md`

### External Resources
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Replit Deployments Docs](https://docs.replit.com/hosting/deployments)
- [Replit App Storage](https://docs.replit.com/hosting/app-storage)

---

## Summary

**Recommended Path**: Deploy via Replit Deployments (primary platform)

1. Configure secrets in Replit (OPENAI_API_KEY, bucket IDs, logging keys)
2. Click **Deploy** in the Replit Deployments panel
3. Verify `/api/health` endpoint
4. Monitor for 24-48 hours

**Why Replit**:
- ✅ Primary target platform
- ✅ Integrated secrets, storage, and hosting
- ✅ Zero-downtime deployments
- ✅ Managed build infrastructure
- ✅ App Storage integration (audio/video)

**Note**: Vercel AI SDK is used for AI streaming capabilities, but deployment is Replit-first.

---

*For issues or questions, consult `docs/strategy/REPLIT-PLATFORM-STRATEGY.md` or Replit support.*
