# Redis Rate Limiting Migration Plan

**Last Modified**: 2026-01-26 00:00 EST
**Status**: Implemented (Hybrid In-Memory + Upstash)
**Priority**: Low-Medium (enable Upstash when scaling beyond single instance)
**Estimated Effort**: 2-4 hours (completed)

---

## Implementation Status (2025-12-19)

MetaDJ Nexus now ships a **hybrid rate limiter** in `src/lib/ai/rate-limiter.ts`:
- **In-memory mode** for single-instance Replit deployments (default when Upstash is unset)
- **Upstash Redis mode** for distributed rate limiting + burst enforcement across instances
- API routes call `checkRateLimitDistributed()` and `checkTranscribeRateLimitDistributed()` to auto-use Upstash when configured
- No separate `redis-rate-limiter.ts` or unified wrapper is required

Keep this document as historical rationale and migration context. For current implementation details, see:
- `../SECURITY.md`
- `docs/architecture/AI-RESILIENCE-PATTERNS.md`

---

## Archived Plan

This section preserves the original migration plan and rationale.

---

## 1. Current State

### Current Implementation

**File**: `/src/lib/ai/rate-limiter.ts`

```typescript
// In-memory rate limiting storage
const rateLimitMap = new Map<string, RateLimitRecord>()

// Configuration
export const MIN_MESSAGE_INTERVAL_MS = 500
export const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
export const MAX_MESSAGES_PER_WINDOW = 20
```

### How It Works

1. **Client Identification**:
   - Primary: Session cookie (`metadjai-session`)
   - Fallback: Browser fingerprint (SHA-256 hash of headers)

2. **Rate Limiting Logic**:
   - Sliding window: 20 messages per 5 minutes
   - Burst prevention: 500ms minimum between messages
   - Periodic cleanup: Every 60 seconds removes expired records

3. **Current Exports**:
   - `checkRateLimit()` - Check if request is allowed
   - `updateRateLimit()` - Increment counter after successful request
   - `getClientIdentifier()` - Get unique client ID
   - `buildRateLimitResponse()` - Format error response

### Documented Limitations

From `/src/lib/ai/rate-limiter.ts` (lines 10-30):

> **Limitations:**
> - Rate limits reset on server restart
> - Not distributed across serverless function instances (Vercel/Replit autoscaling)
> - Each instance maintains its own rate limit state
>
> **Mitigations in place:**
> - Session cookies provide per-device isolation (primary identification)
> - Fingerprint-based fallback uses SHA-256 hashing for collision resistance
> - Burst prevention is skipped for fingerprint-based identification
> - Periodic cleanup prevents memory growth

### When Current Approach Works

- Single-instance deployment (current Replit model)
- Low to moderate traffic
- Session persistence across requests
- No critical abuse prevention requirements

### When Migration is Needed

**Trigger Conditions** (from documentation):

1. Observed rate limit bypasses in production logs
2. Moving to multi-instance deployment (Vercel, AWS Lambda, etc.)
3. AI API costs exceeding acceptable thresholds
4. High-traffic events or viral content

---

## 2. Goal

Migrate to distributed rate limiting that:

1. **Persists across restarts**: Rate limit state survives deployments
2. **Works across instances**: All serverless function instances share state
3. **Edge-compatible**: Works with edge runtimes (Vercel Edge, Cloudflare Workers)
4. **Maintains API parity**: Drop-in replacement for existing functions

---

## 3. Recommended Solution: Upstash Redis

### Why Upstash

| Feature | Upstash | Vercel KV | Redis Cloud |
|---------|---------|-----------|-------------|
| **Edge Compatible** | Yes | Yes | No |
| **Serverless Pricing** | Yes | Yes | No |
| **Free Tier** | 10K commands/day | 30K requests/month | 30MB |
| **Rate Limit Library** | `@upstash/ratelimit` | Manual | Manual |
| **Latency** | ~1-2ms global | ~1-2ms | Variable |
| **Setup Complexity** | Low | Low | Medium |

**Recommendation**: Upstash provides the best combination of:
- Purpose-built `@upstash/ratelimit` library
- Edge runtime support
- Generous free tier for beta/MVP
- Simple REST-based API (no connection pooling needed)

### Dependencies

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Package Info**:
- `@upstash/redis`: ~50KB, REST-based Redis client for serverless
- `@upstash/ratelimit`: ~15KB, rate limiting primitives

---

## 4. Implementation Steps

### Phase 1: Set Up Upstash Account

1. **Create Account**: https://console.upstash.com/
2. **Create Database**:
   - Region: Select closest to deployment (us-east-1 for Replit)
   - TLS: Enabled
   - Eviction: No eviction (rate limit data is small)
3. **Get Credentials**:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Phase 2: Create Redis Rate Limiter

**Create**: `/src/lib/ai/redis-rate-limiter.ts`

```typescript
// src/lib/ai/redis-rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';

/**
 * Distributed Rate Limiter using Upstash Redis
 *
 * Provides consistent rate limiting across multiple serverless instances.
 * Falls back to in-memory rate limiting if Redis is not configured.
 *
 * @see https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 */

// Configuration - matches existing in-memory implementation
export const MAX_MESSAGES_PER_WINDOW = 20;
export const RATE_LIMIT_WINDOW_SECONDS = 5 * 60; // 5 minutes
export const MIN_MESSAGE_INTERVAL_MS = 500;

// Session cookie configuration (unchanged from current)
export const SESSION_COOKIE_NAME = 'metadjai-session';
export const SESSION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
export const SESSION_COOKIE_PATH = '/api/metadjai';

// Message/content limits (unchanged from current)
export const MAX_HISTORY = 12;
export const MAX_CONTENT_LENGTH = 8000;
export const MAX_MESSAGES_PER_REQUEST = 50;

/**
 * Client Identifier Result
 */
export interface ClientIdentifier {
  id: string;
  isFingerprint: boolean;
}

/**
 * Rate Limit Check Result
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingMs?: number;
  remaining?: number;
  limit?: number;
}

/**
 * Initialize Redis client
 *
 * Returns null if credentials are not configured, allowing fallback
 */
function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[Rate Limiter] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN not configured. ' +
        'Falling back to in-memory rate limiting. This is not recommended for production.'
      );
    }
    return null;
  }

  return new Redis({ url, token });
}

/**
 * Create rate limiter instance
 *
 * Uses sliding window algorithm for smooth rate limiting.
 * Analytics enabled for monitoring usage patterns.
 */
function createRateLimiter(redis: Redis): Ratelimit {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX_MESSAGES_PER_WINDOW, `${RATE_LIMIT_WINDOW_SECONDS} s`),
    analytics: true,
    prefix: 'metadjai:ratelimit',
  });
}

// Initialize on module load
const redis = createRedisClient();
const rateLimiter = redis ? createRateLimiter(redis) : null;

/**
 * Check if Redis rate limiting is available
 */
export function isRedisEnabled(): boolean {
  return rateLimiter !== null;
}

/**
 * Get client identifier from request
 *
 * Priority:
 * 1. Session cookie (ensures per-device isolation)
 * 2. High-entropy fingerprint from request headers
 *
 * Unchanged from in-memory implementation.
 */
export function getClientIdentifier(request: NextRequest): ClientIdentifier {
  // Priority 1: Check for session cookie
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    return { id: sessionId, isFingerprint: false };
  }

  // Priority 2: Generate high-entropy fingerprint
  const ua = request.headers.get('user-agent') || '';
  const lang = request.headers.get('accept-language') || '';
  const encoding = request.headers.get('accept-encoding') || '';
  const secChUa = request.headers.get('sec-ch-ua') || '';
  const secChUaPlatform = request.headers.get('sec-ch-ua-platform') || '';
  const secChUaMobile = request.headers.get('sec-ch-ua-mobile') || '';
  const accept = request.headers.get('accept') || '';

  const fingerprint = `${ua}|${lang}|${encoding}|${secChUa}|${secChUaPlatform}|${secChUaMobile}|${accept}`;
  const hash = createHash('sha256').update(fingerprint).digest('hex').slice(0, 32);

  return { id: `fp-${hash}`, isFingerprint: true };
}

/**
 * Check if a client is rate limited (Redis implementation)
 *
 * Uses Upstash's sliding window algorithm for consistent rate limiting.
 */
export async function checkRateLimit(
  identifier: string,
  isFingerprint: boolean
): Promise<RateLimitResult> {
  if (!rateLimiter) {
    // Fall back to allowing request if Redis not available
    // In production, consider throwing or using in-memory fallback
    console.warn('[Rate Limiter] Redis not available, allowing request');
    return { allowed: true };
  }

  try {
    const result = await rateLimiter.limit(identifier);

    if (!result.success) {
      // Calculate remaining time until reset
      const remainingMs = Math.max(0, result.reset - Date.now());
      return {
        allowed: false,
        remainingMs,
        remaining: result.remaining,
        limit: result.limit,
      };
    }

    return {
      allowed: true,
      remaining: result.remaining,
      limit: result.limit,
    };
  } catch (error) {
    // Log error but allow request to prevent Redis issues from blocking users
    console.error('[Rate Limiter] Redis error:', error);
    return { allowed: true };
  }
}

/**
 * Update rate limit counter after successful request
 *
 * Note: With Upstash Ratelimit, the counter is automatically updated
 * in checkRateLimit(). This function is kept for API parity
 * but is a no-op for the Redis implementation.
 */
export function updateRateLimit(identifier: string): void {
  // No-op: Upstash Ratelimit automatically increments on limit() call
  // This function exists only for API parity with the in-memory version
}

/**
 * Generate a new session ID
 */
export function generateSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? `session-${crypto.randomUUID()}`
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Build rate limit error response
 */
export function buildRateLimitResponse(remainingMs: number): {
  error: string;
  retryAfter: number;
} {
  const retryAfterSeconds = Math.ceil(remainingMs / 1000);
  return {
    error: 'Rate limit exceeded. Please wait before sending another message.',
    retryAfter: retryAfterSeconds,
  };
}

/**
 * Burst prevention check
 *
 * Prevents rapid-fire requests. Uses a separate Redis key for burst tracking.
 * Skipped for fingerprint-based identification to avoid false positives.
 */
export async function checkBurstLimit(
  identifier: string,
  isFingerprint: boolean
): Promise<RateLimitResult> {
  // Skip burst prevention for fingerprint-based identification
  if (isFingerprint) {
    return { allowed: true };
  }

  if (!redis) {
    return { allowed: true };
  }

  const burstKey = `metadjai:burst:${identifier}`;

  try {
    // Check if key exists (indicates recent request)
    const lastRequest = await redis.get(burstKey);

    if (lastRequest) {
      const elapsed = Date.now() - Number(lastRequest);
      if (elapsed < MIN_MESSAGE_INTERVAL_MS) {
        return {
          allowed: false,
          remainingMs: MIN_MESSAGE_INTERVAL_MS - elapsed,
        };
      }
    }

    // Set/update burst key with expiry
    await redis.set(burstKey, Date.now(), {
      px: MIN_MESSAGE_INTERVAL_MS * 2, // Expire after 2x interval
    });

    return { allowed: true };
  } catch (error) {
    console.error('[Burst Limiter] Redis error:', error);
    return { allowed: true };
  }
}

/**
 * Combined rate limit check (window + burst)
 *
 * Convenience function that checks both rate limits.
 */
export async function checkRateLimits(
  request: NextRequest
): Promise<RateLimitResult & { identifier: ClientIdentifier }> {
  const identifier = getClientIdentifier(request);

  // Check burst limit first (faster rejection for rapid requests)
  const burstResult = await checkBurstLimit(identifier.id, identifier.isFingerprint);
  if (!burstResult.allowed) {
    return { ...burstResult, identifier };
  }

  // Check window rate limit
  const windowResult = await checkRateLimit(identifier.id, identifier.isFingerprint);
  return { ...windowResult, identifier };
}

/**
 * Get rate limit analytics (if enabled)
 *
 * Returns usage statistics for monitoring dashboards.
 */
export async function getRateLimitAnalytics(): Promise<{
  enabled: boolean;
  pending?: number;
} | null> {
  if (!rateLimiter) {
    return { enabled: false };
  }

  // Upstash analytics are available in the dashboard
  // This function can be extended to fetch custom metrics
  return { enabled: true };
}
```

### Phase 3: Create Unified Rate Limiter Interface

**Create**: `/src/lib/ai/rate-limiter-unified.ts`

This provides a unified interface that automatically selects Redis or in-memory:

```typescript
// src/lib/ai/rate-limiter-unified.ts
import type { NextRequest } from 'next/server';

/**
 * Unified Rate Limiter
 *
 * Automatically selects Redis or in-memory implementation based on configuration.
 * Provides consistent API regardless of backend.
 */

// Re-export types and constants
export type { ClientIdentifier, RateLimitResult } from './redis-rate-limiter';
export {
  MAX_MESSAGES_PER_WINDOW,
  MIN_MESSAGE_INTERVAL_MS,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_PATH,
  MAX_HISTORY,
  MAX_CONTENT_LENGTH,
  MAX_MESSAGES_PER_REQUEST,
} from './redis-rate-limiter';

// Import both implementations
import * as redisRateLimiter from './redis-rate-limiter';
import * as memoryRateLimiter from './rate-limiter';

/**
 * Check if Redis rate limiting is active
 */
export function isDistributed(): boolean {
  return redisRateLimiter.isRedisEnabled();
}

/**
 * Get client identifier
 */
export function getClientIdentifier(request: NextRequest) {
  return redisRateLimiter.getClientIdentifier(request);
}

/**
 * Check rate limit
 *
 * Uses Redis if available, falls back to in-memory
 */
export async function checkRateLimit(
  identifier: string,
  isFingerprint: boolean
) {
  if (redisRateLimiter.isRedisEnabled()) {
    return redisRateLimiter.checkRateLimit(identifier, isFingerprint);
  }
  return memoryRateLimiter.checkRateLimit(identifier, isFingerprint);
}

/**
 * Update rate limit counter
 */
export function updateRateLimit(identifier: string): void {
  if (redisRateLimiter.isRedisEnabled()) {
    redisRateLimiter.updateRateLimit(identifier);
  } else {
    memoryRateLimiter.updateRateLimit(identifier);
  }
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return redisRateLimiter.generateSessionId();
}

/**
 * Build rate limit error response
 */
export function buildRateLimitResponse(remainingMs: number) {
  return redisRateLimiter.buildRateLimitResponse(remainingMs);
}

/**
 * Sanitize messages (passthrough to existing implementation)
 */
export { sanitizeMessages } from './rate-limiter';
```

### Phase 4: Update API Route

**Modify**: `/src/app/api/metadjai/route.ts`

Update imports to use unified rate limiter:

```typescript
// Change import from:
import {
  checkRateLimit,
  updateRateLimit,
  getClientIdentifier,
  // ...
} from '@/lib/ai/rate-limiter';

// To:
import {
  checkRateLimit,
  updateRateLimit,
  getClientIdentifier,
  // ...
} from '@/lib/ai/rate-limiter-unified';
```

---

## 5. Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `/src/lib/ai/redis-rate-limiter.ts` | **Create** | Redis-based rate limiter |
| `/src/lib/ai/rate-limiter-unified.ts` | **Create** | Unified interface |
| `/src/lib/ai/rate-limiter.ts` | **Keep** | In-memory fallback (no changes) |
| `/src/app/api/metadjai/route.ts` | **Modify** | Update import path |
| `/.env.example` | **Modify** | Add Upstash variables |
| `/package.json` | **Modify** | Add dependencies |

---

## 6. Environment Variables

### New Variables Required

```bash
# .env.local (development)
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Production (Replit Secrets / Vercel Environment Variables)
UPSTASH_REDIS_REST_URL=<from Upstash console>
UPSTASH_REDIS_REST_TOKEN=<from Upstash console>
```

### Update `.env.example`

```bash
# Rate Limiting (Optional - enables distributed rate limiting)
# Get credentials from https://console.upstash.com/
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## 7. Cost Estimation

### Upstash Free Tier

- **Commands**: 10,000/day
- **Data**: 256MB
- **Connections**: Unlimited (REST-based)

### Estimated Usage (MetaDJ Nexus)

| Scenario | Commands/Day | Within Free Tier? |
|----------|--------------|-------------------|
| 100 AI chats/day | ~300 | Yes |
| 500 AI chats/day | ~1,500 | Yes |
| 2,000 AI chats/day | ~6,000 | Yes |
| 5,000 AI chats/day | ~15,000 | No (need paid) |

### Paid Tier (if needed)

- **Pay-as-you-go**: $0.2 per 100K commands
- **Estimated cost at 5K chats/day**: ~$0.03/day (~$1/month)

---

## 8. Testing Strategy

### Local Testing

1. **Without Redis** (fallback mode):
   ```bash
   # Don't set UPSTASH vars
   npm run dev
   # Verify in-memory rate limiting works
   ```

2. **With Redis** (distributed mode):
   ```bash
   # Set UPSTASH vars in .env.local
   npm run dev
   # Verify Redis rate limiting works
   ```

### Integration Tests

```typescript
// tests/api/rate-limiting.test.ts
describe('Rate Limiting', () => {
  describe('Redis Mode', () => {
    it('should rate limit after MAX_MESSAGES_PER_WINDOW requests', async () => {
      // Make MAX_MESSAGES_PER_WINDOW requests
      for (let i = 0; i < 20; i++) {
        const response = await fetch('/api/metadjai', {
          method: 'POST',
          body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
        });
        expect(response.status).toBe(200);
      }

      // Next request should be rate limited
      const limitedResponse = await fetch('/api/metadjai', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] }),
      });
      expect(limitedResponse.status).toBe(429);
    });
  });

  describe('Fallback Mode', () => {
    beforeEach(() => {
      // Temporarily disable Redis
      delete process.env.UPSTASH_REDIS_REST_URL;
    });

    it('should fall back to in-memory rate limiting', async () => {
      // Similar test as above
    });
  });
});
```

### Production Validation

1. **Monitor Upstash Dashboard**:
   - Commands per second
   - Latency percentiles
   - Error rates

2. **Application Logs**:
   - Watch for `[Rate Limiter]` warnings
   - Check for Redis connection errors

3. **User Experience**:
   - Verify rate limit messages appear correctly
   - Check retry-after headers are accurate

---

## 9. Rollback Plan

### Immediate Rollback (< 2 minutes)

1. **Remove environment variables**:
   ```bash
   # In Replit/Vercel, delete:
   UPSTASH_REDIS_REST_URL
   UPSTASH_REDIS_REST_TOKEN
   ```

2. **Redeploy** - App automatically falls back to in-memory

### Full Rollback

1. **Revert import changes**:
   ```typescript
   // In /src/app/api/metadjai/route.ts
   // Change back to:
   import { ... } from '@/lib/ai/rate-limiter';
   ```

2. **Optionally remove new files**:
   - `/src/lib/ai/redis-rate-limiter.ts`
   - `/src/lib/ai/rate-limiter-unified.ts`

### Signs Rollback is Needed

- Redis connection timeouts
- Rate limiting not working (abuse detected)
- Significant latency increase (>50ms added)
- Upstash billing concerns

---

## 10. Migration Triggers

Implement when ANY of these conditions occur:

| Trigger | Detection Method |
|---------|------------------|
| Rate limit bypasses | Production logs show users exceeding limits |
| Multi-instance deployment | Moving to Vercel/AWS with autoscaling |
| AI cost spikes | Monthly AI API bill exceeds budget |
| Traffic surge | Sustained >1000 AI chats/day |
| Security concern | Identified abuse patterns |

---

## 11. References

### Official Documentation

- [Upstash Ratelimit](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [Upstash Redis REST](https://upstash.com/docs/redis/overall/rest)
- [Next.js Rate Limiting Guide](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#rate-limiting)

### Related Files

- Current implementation: `/src/lib/ai/rate-limiter.ts`
- API route: `/src/app/api/metadjai/route.ts`
- Security overview: `../SECURITY.md`

---

## 12. Success Criteria

- [ ] Redis rate limiter created and tested
- [ ] Unified interface maintains API parity
- [ ] In-memory fallback works when Redis unavailable
- [ ] Environment variables documented
- [ ] Cost estimation validated
- [ ] All existing tests pass
- [ ] No increased latency (< 10ms overhead)

---

## 13. Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Upstash setup | 15 minutes |
| Redis rate limiter | 1 hour |
| Unified interface | 30 minutes |
| API route update | 15 minutes |
| Testing | 1-2 hours |
| Documentation | 30 minutes |
| **Total** | **2-4 hours** |

---

**Document Status**: Ready for implementation when triggers are met
**Next Action**: Monitor for migration triggers, implement when needed
