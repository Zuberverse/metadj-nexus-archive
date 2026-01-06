# Security Documentation

**Last Modified**: 2026-01-05 22:08 EST

This directory contains security implementation plans and starter code for MetaDJ Nexus security enhancements.

## Contents

### Implementation Plans

| Document | Status | Priority | Description |
|----------|--------|----------|-------------|
| [CSP-NONCE-IMPLEMENTATION-PLAN.md](./CSP-NONCE-IMPLEMENTATION-PLAN.md) | Implemented | Medium | Migrate from `unsafe-inline` to nonce-based CSP (hardening pass) |
| [REDIS-RATE-LIMITING-PLAN.md](./REDIS-RATE-LIMITING-PLAN.md) | Implemented | Low-Medium | Hybrid rate limiting (in-memory + Upstash when configured) |

### Starter Code

The `starter-code/` directory contains ready-to-use implementation templates:

| File | Purpose |
|------|---------|
| `nonce-utils.ts.example` | Utility functions for accessing nonce in Server Components |
| `redis-rate-limiter.ts.example` | Upstash Redis-based rate limiter implementation |

> **Note**: CSP is implemented in `src/proxy.ts` and wired via `src/middleware.ts` (Next.js middleware entrypoint). No separate middleware example needed.

## Implementation Priority

### Recommended Order

1. **CSP Nonce Hardening** (implemented)
   - CSP is defined in `src/proxy.ts` with per-request nonces.
   - `src/app/layout.tsx` applies the nonce to JSON-LD and Plausible scripts.

2. **Redis Rate Limiting** (enable Upstash when triggers are met)
   - Distributed mode is already implemented in `src/lib/ai/rate-limiter.ts`
   - Requires Upstash account + env vars

### Migration Triggers for Redis

Enable Upstash distributed rate limiting when ANY of these occur:
- Rate limit bypasses observed in production logs
- Moving to multi-instance deployment (Vercel, AWS Lambda)
- AI API costs exceeding budget thresholds
- Sustained traffic > 1000 AI chats/day

## Related Documentation

- [Security Overview](../SECURITY.md) - Philosophy and current protections
- [Current CSP Configuration](../../src/proxy.ts) - Active CSP/headers + rate limiting implementation
- [Current Rate Limiter](../../src/lib/ai/rate-limiter.ts) - Hybrid in-memory + Upstash implementation

## CSP Notes

- CSP is generated per-request in `src/proxy.ts` and surfaced to Server Components as `x-nonce`.
- `src/app/layout.tsx` uses the nonce for JSON-LD + Plausible scripts.
- `style-src` is nonce-based with `style-src-attr 'unsafe-inline'` retained for motion-driven inline transforms; prefer `useCspStyle` + `data-csp-style` for layout-critical inline styles.
- Dream playback requires `frame-src 'self' https://lvpr.tv` to embed the Livepeer player iframe.

## Permissions-Policy Configuration

**CRITICAL**: The `Permissions-Policy` header controls browser API access. The header value must stay synchronized between `src/proxy.ts` and `next.config.js`.

| File | Purpose | Authority |
|------|---------|-----------|
| `src/proxy.ts` | CSP + security headers implementation | **Primary** |
| `next.config.js` | Static headers | Secondary (overridden by proxy) |

### Current Policy

```
camera=(self), microphone=(self), geolocation=(), browsing-topics=()
```

| Permission | Value | Reason |
|------------|-------|--------|
| `camera` | `(self)` | **Required for Dream feature** (webcam input) |
| `microphone` | `(self)` | **Required for MetaDJai** (voice input) |
| `geolocation` | `()` | Blocked - not used |
| `browsing-topics` | `()` | Blocked - privacy (FLoC replacement) |

### Common Mistake

**DO NOT** set `camera=()` or `microphone=()` — this blocks the Dream and voice features entirely, causing `NotAllowedError: Permission denied` in the browser console.

### When Modifying

1. Update `src/proxy.ts` (the security header implementation)
2. Keep `next.config.js` in sync for documentation purposes
3. Test Dream webcam and MetaDJai voice features after changes

---

## Quick Reference

### Current Security Posture

| Area | Status | Risk Level |
|------|--------|------------|
| CSP script-src | Nonce-based (dev allows `unsafe-eval`) | LOW |
| Permissions-Policy | camera/mic allowed for self | LOW |
| Rate limiting | Hybrid in-memory + Upstash (auto when configured) | LOW |
| Storage security | Environment-gated | LOW |
| AI prompt injection | Sanitized (see [API.md Tool Output Sanitization](../API.md#tool-output-sanitization)) | LOW |

### Environment Variables

**Current (Required)**:
- `STORAGE_PROVIDER` - `r2` (primary) or `replit` (fallback)
- `R2_ACCOUNT_ID` - Cloudflare R2 account ID (required if `STORAGE_PROVIDER=r2`)
- `R2_ACCESS_KEY_ID` - R2 API token access key (required if `STORAGE_PROVIDER=r2`)
- `R2_SECRET_ACCESS_KEY` - R2 API token secret (required if `STORAGE_PROVIDER=r2`)
- `R2_BUCKET` - R2 bucket name (default: `metadj-nexus-media`)

**Fallback (Only if `STORAGE_PROVIDER=replit`)**:
- `MUSIC_BUCKET_ID` - Replit storage for audio
- `VISUALS_BUCKET_ID` - Replit storage for visuals

**Optional (For Distributed Rate Limiting)**:
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST endpoint
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis authentication token
