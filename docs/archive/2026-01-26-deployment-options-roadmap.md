# Deployment Options (Roadmap Archive)

**Last Modified**: 2026-01-26 13:00 EST

Archived from `docs/operations/BUILD-DEPLOYMENT-GUIDE.md`. These options are **not** part of the MVP deployment plan and are kept only for future reference.

---

## Option: Vercel (Roadmap Only)

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
- Automatic Next.js optimization
- Global CDN included
- Preview deployments for each commit
- Edge functions support

**Cons:**
- External platform dependency (vs. Replit ecosystem)
- Requires Cloudflare R2 CORS configuration
- Adds complexity vs. single-platform approach

**Note**: MetaDJai uses Vercel AI SDK for streaming, but hosting remains Replit-first.

---

## Option: Replit Static Export (Not Recommended)

**Best for**: Simple deployments within Replit ecosystem

**Steps:**

1. Enable static export in `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
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
- Stays within Replit ecosystem
- Simple static hosting

**Cons:**
- Loses all API routes (MetaDJai, streaming, logging)
- Loses server-side features
- Not recommended for this app

---

## Option: Docker Deployment (Roadmap Only)

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

**Note**: Requires `output: 'standalone'` in `next.config.js`.
