# Error Tracking Setup Guide

**Last Modified**: 2025-12-29 12:28 EST

> **Capture and triage client-side errors automatically with Sentry**

**Status**: Deferred — Current approach uses Replit Logs + existing error boundaries

---

## Current Decision (December 2025)

**Sentry implementation is intentionally deferred.** The decision was made during the v0.9.24 audit based on these factors:

1. **Account Setup Required**: Sentry requires external account creation, API key management, and third-party integration—adding operational overhead for a solo founder workflow.

2. **Current Coverage is Sufficient**:
   - **Replit Logs**: Production errors surface in Replit Deployments logs (Deployments → Logs)
   - **Error Boundaries**: `src/app/error.tsx` and `src/app/global-error.tsx` catch React errors
   - **Toast System**: User-facing error notifications are already implemented
   - **Console Logging**: Development errors are visible during testing

3. **When to Reconsider**:
   - If mysterious production errors occur that Replit Logs don't capture
   - If user reports indicate silent failures
   - If scaling requires proactive error monitoring at volume
   - When ready to invest time in third-party service setup

**The implementation guide below remains valid if Sentry is needed later.**

---

## Overview

This guide walks through setting up error tracking for MetaDJ Nexus using Sentry. Error tracking captures JavaScript errors, unhandled promise rejections, and performance issues automatically, allowing you to fix bugs before users report them.

**Goal**: Automatic error capture, intelligent grouping, and proactive alerting for client and server errors.

## Post-MVP Implementation Plan (Mirrors MetaDJai)

MetaDJ Nexus will follow the hardened error-monitoring rollout already proven inside **MetaDJai**. The archived playbook is not yet ported into this repo, so pull it into `docs/operations/` before execution. The steps stay queued until after the MVP ships but the playbook is locked in:

1. **Create Sentry project + access tokens** — reuse the exact variable set MetaDJai documents (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`). Credentials live solely in Replit Secrets, not in git or `.env` committed files.
2. **Run the `@sentry/wizard` scaffolding** locally, check in the generated `sentry.*.config.ts` files, and wrap `next.config.js` with the Sentry plugin the same way MetaDJai does. No runtime flagging until we flip the DSN in Replit.
3. **Harden security + privacy defaults** — copy the scrubbers/beforeSend hooks from MetaDJai so logs never include request bodies, queue payloads, or fan data. Update `.claude/commands/SECURITY.md` with a short “Sentry enabled” note when this step goes live.
4. **Replit deployment wiring** — inject the Sentry env vars through the Replit Secrets UI alongside the existing Plausible/LOGGING secrets. That keeps bucket IDs and other infra untouched per the current Replit policy.
5. **Verification checklist** — same smoke tests as MetaDJai: trigger a deliberate `Sentry.captureException` call, confirm source maps upload during `npm run build`, and set Slack/email alerts in Sentry before promoting to production.

Tracking the work:
- Add a `tracking issue / docs entry` referencing this plan once the MVP launches.
- Re-use the status template from MetaDJai system documentation in `3-projects/archive/software/2025-11-25-metadj-ai/docs/system/` so the two apps follow identical audit trails.

## Why Error Tracking Matters

**Benefits**:
- **Proactive bug detection**: Discover errors before users complain
- **Context-rich debugging**: Full stack traces, breadcrumbs, user context
- **Error grouping**: Similar errors grouped intelligently
- **Performance monitoring**: Track slow pages and API calls
- **User impact visibility**: Know how many users affected

**Real-world scenarios MetaDJ Nexus will catch**:
- Audio streaming failures
- Video codec incompatibilities
- Queue persistence errors
- Cinema rendering issues
- API rate limiting edge cases
- Mobile browser quirks

---

## Service Selection: Sentry

**Why Sentry?**

✅ **Free tier includes**:
- 5,000 errors per month
- 10,000 performance transactions
- 30-day data retention
- Unlimited projects
- Slack/Discord/email alerts
- Source map support

✅ **Next.js integration**:
- Official `@sentry/nextjs` package
- Automatic error boundaries
- Server + client error capture
- API route monitoring
- Zero configuration after setup

🎯 **Alternatives** (if needed):
- **LogRocket** (session replay focus)
- **Rollbar** (similar features)
- **Bugsnag** (enterprise-grade)

**Decision**: Sentry's Next.js integration and free tier make it ideal for MetaDJ Nexus.

---

## Installation & Setup

### Step 1: Create Sentry Account

```bash
# 1. Visit https://sentry.io/signup/
# 2. Sign up with email or GitHub
# 3. Create new project:
#    - Platform: Next.js
#    - Project name: metadj-nexus (use previous slug if the project has not been renamed yet)
#    - Alert frequency: On every new issue
# 4. Note your DSN (Data Source Name)
```

**Setup time**: 3 minutes

---

### Step 2: Install Sentry Package

```bash
# Install official Next.js integration
npm install @sentry/nextjs

# Run configuration wizard (interactive)
npx @sentry/wizard@latest -i nextjs
```

**Wizard will**:
- Create `sentry.client.config.ts`
- Create `sentry.server.config.ts`
- Create `sentry.edge.config.ts`
- Update `next.config.js` with Sentry plugin
- Add `.sentryclirc` for build configuration
- Prompt for DSN (paste from dashboard)

**Installation time**: 5 minutes

---

### Step 3: Configure Client-Side Tracking

**File**: `sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Sentry DSN from environment variable
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment (development, staging, production)
  environment: process.env.NODE_ENV,

  // Release version for tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '0.90',

  // Sample rate for performance monitoring
  // 0.1 = 10% of transactions (conserve quota)
  tracesSampleRate: 0.1,

  // Sample rate for session replays (Pro feature)
  replaysSessionSampleRate: 0.0, // Disabled on free tier

  // Sample rate for error replays
  replaysOnErrorSampleRate: 0.0, // Disabled on free tier

  // Disable debug logging in production
  debug: false,

  // Ignore known non-critical errors
  ignoreErrors: [
    // Browser extensions
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',

    // Safari-specific
    'Non-Error promise rejection captured',
    'AbortError: The play() request was interrupted',

    // Ad blockers
    'Failed to load Plausible script',

    // Network errors (don't spam Sentry)
    'NetworkError',
    'Failed to fetch',
  ],

  // Add custom context before sending
  beforeSend(event, hint) {
    // Tag with app version
    event.tags = {
      ...event.tags,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION || '0.90',
      user_agent: navigator.userAgent,
    };

    // Add audio player state if available
    const audioElement = document.querySelector('audio');
    if (audioElement) {
      event.contexts = {
        ...event.contexts,
        audio_player: {
          paused: audioElement.paused,
          current_time: audioElement.currentTime,
          duration: audioElement.duration,
          src: audioElement.src,
        },
      };
    }

    return event;
  },

  // Breadcrumbs for debugging context
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === 'ui.click') {
      // Only track button clicks, not every interaction
      const target = hint?.event?.target;
      if (target?.tagName !== 'BUTTON') {
        return null;
      }
    }

    return breadcrumb;
  },
});
```

**Key configuration decisions**:
- Low trace sample rate (10%) to conserve quota
- Ignore browser extension errors
- Add audio player context to errors
- Filter breadcrumbs to reduce noise

---

### Step 4: Configure Server-Side Tracking

**File**: `sentry.server.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION || '0.90',

  // Server-side trace sampling (lower than client)
  tracesSampleRate: 0.05, // 5% of API requests

  debug: false,

  // Ignore expected server errors
  ignoreErrors: [
    // Replit App Storage transient failures
    'ECONNRESET',
    'ETIMEDOUT',

    // Rate limiting (expected behavior)
    'Rate limit exceeded',
  ],

  // Add server context
  beforeSend(event, hint) {
    event.tags = {
      ...event.tags,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION || '0.90',
      node_version: process.version,
    };

    // Add request details if available
    if (hint?.originalException?.request) {
      const req = hint.originalException.request;
      event.contexts = {
        ...event.contexts,
        request: {
          method: req.method,
          url: req.url,
          headers: {
            'user-agent': req.headers['user-agent'],
            'accept': req.headers['accept'],
          },
        },
      };
    }

    return event;
  },
});
```

---

### Step 5: Configure Environment Variables

**File**: `.env.local` (add to `.gitignore`)

```bash
# Sentry DSN (from Sentry dashboard)
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o-your-org.ingest.sentry.io/your-project-id

# Optional: Sentry auth token (for source maps)
SENTRY_AUTH_TOKEN=your-auth-token-here

# Optional: Disable Sentry in development
# SENTRY_DISABLED=true
```

**File**: `.env.example` (commit to repository)

```bash
# Error Tracking (Sentry)
NEXT_PUBLIC_SENTRY_DSN=
# Get your DSN from: https://sentry.io/settings/metadj-nexus/projects/metadj-nexus/keys/ (previous slug may still apply)
```

**Security note**: Never commit real `.env.local` with DSN to git!

---

### Step 6: Integrate with Existing Logger

Update MetaDJ Nexus's existing logger to send errors to Sentry:

**File**: `src/lib/logger.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

export const logger = {
  info: (message: string, context?: object) => {
    console.log(`[INFO] ${message}`, context);

    // Add breadcrumb for debugging context
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.addBreadcrumb({
        message,
        level: 'info',
        data: context,
      });
    }
  },

  warn: (message: string, context?: object) => {
    console.warn(`[WARN] ${message}`, context);

    // Warnings as Sentry breadcrumbs
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.addBreadcrumb({
        message,
        level: 'warning',
        data: context,
      });
    }
  },

  error: (message: string, error?: Error | unknown, context?: object) => {
    console.error(`[ERROR] ${message}`, error, context);

    // Send errors to Sentry
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          tags: { source: 'logger' },
          extra: { message, ...context },
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: { error, ...context },
        });
      }
    }

    // Also send to webhook if configured (existing behavior)
    if (process.env.LOGGING_WEBHOOK_URL) {
      fetch(process.env.LOGGING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          message,
          error: error?.toString(),
          context,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently fail webhook (don't throw in error handler)
      });
    }
  },
};
```

**Benefits**:
- Existing logger calls now send to Sentry automatically
- No code changes needed in components
- Breadcrumbs provide debugging context
- Webhook integration preserved

---

### Step 7: Add Error Boundaries

Catch React errors before they crash the app:

**File**: `src/app/error.tsx` (enhance existing)

```typescript
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
        {/* Existing triangular error icon */}
        <svg className="w-20 h-20 mb-6 mx-auto" /* ... existing SVG ... */>

        <h2 className="text-2xl font-bold text-gradient-primary mb-4">
          Something went wrong
        </h2>

        <p className="text-white/70 mb-6">
          {process.env.NODE_ENV === 'development'
            ? error.message
            : 'An unexpected error occurred. The issue has been automatically reported.'}
        </p>

        <button
          onClick={reset}
          className="px-6 py-3 bg-linear-to-r from-purple-500 via-blue-500 to-cyan-400 rounded-lg font-semibold hover:opacity-90 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
```

**User-facing improvement**:
- Production: Hide technical error details
- Tell users the error was reported
- Maintain MetaDJ aesthetic

---

## Alert Configuration

### Email Alerts

**Sentry Dashboard Configuration**:

```markdown
1. Navigate to Settings > Alerts > New Alert Rule
2. Configure:
   - Conditions: When an event is first seen
   - Actions: Send email to your-email@domain.com
   - Name: "New Error Detected"
3. Save alert rule

Additional alerts:
   - Spike in error rate (>50 errors/hour)
   - Performance regression (p95 response time >3s)
   - High error frequency (same error >100 times/day)
```

### Slack Integration

**Setup steps**:

```markdown
1. Install Sentry app in Slack workspace
2. In Sentry: Settings > Integrations > Slack
3. Authorize Slack workspace
4. Configure notifications:
   - Channel: #metadj-alerts
   - Events: New issues, resolved issues, regressions
   - Frequency: Real-time for new issues
5. Test integration with "Send Test Notification"
```

**Slack message format**:
```
🚨 New Error in metadj-nexus (production)
Error: Failed to load audio file
   at AudioPlayer.loadTrack (AudioPlayer.tsx:45)
Affected 3 users in last hour
→ View in Sentry
```

### Discord Integration

**Webhook setup**:

```markdown
1. Create Discord webhook in server settings
2. In Sentry: Settings > Integrations > Webhooks
3. Add webhook:
   - URL: Your Discord webhook URL
   - Events: issue.created, issue.resolved
   - Custom format: Discord-compatible JSON
4. Test webhook delivery
```

---

## Error Grouping & Triage

### How Sentry Groups Errors

**Grouping strategy**:
- Stack trace fingerprint (same error location)
- Error type and message similarity
- Custom fingerprints (you define)

**Example grouped errors**:
```
Group 1: "TypeError: Cannot read property 'play' of null"
  - Occurs in AudioPlayer component
  - 127 events from 45 users
  - First seen: 2025-11-10
  - Last seen: 2 hours ago

Group 2: "NetworkError: Failed to fetch /api/audio"
  - API streaming failure
  - 23 events from 12 users
  - Likely related to Replit App Storage
```

### Triage Workflow

**Priority labels** (Sentry automatically assigns):
- **Critical**: Crashes app, many users affected
- **High**: Breaks core feature (audio playback)
- **Medium**: UI glitch, some users affected
- **Low**: Edge case, rare occurrence

**Triage checklist**:
1. **Assign priority**: Review error frequency and impact
2. **Add tags**: `audio-player`, `cinema`, `mobile`, etc.
3. **Link to GitHub issue**: Create issue from Sentry
4. **Mark resolved**: When fix deployed
5. **Monitor regression**: Sentry alerts if error returns

---

## Performance Monitoring

### Transaction Tracking

**What Sentry tracks**:
- Page load times
- API route response times
- Component render times
- Database queries (if applicable)

**Key metrics**:
```
Page: /
  - p50: 1.2s
  - p95: 2.8s
  - p99: 4.5s

API: /api/audio/[...path]
  - p50: 120ms
  - p95: 450ms
  - p99: 1.2s
```

**Performance alerts**:
- Warn if p95 exceeds 3s
- Critical if p95 exceeds 5s

---

## Source Maps (Production Debugging)

### Upload Source Maps

**Automatic upload** (via Sentry CLI):

```javascript
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // ... existing config
};

module.exports = withSentryConfig(
  nextConfig,
  {
    // Sentry webpack plugin options
    silent: true, // Suppresses logs
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: 'your-org',
    project: 'metadj-nexus',
  },
  {
    // Sentry Next.js plugin options
    widenClientFileUpload: true,
    transpileClientSDK: true,
    hideSourceMaps: true, // Don't expose to users
    disableLogger: true, // Reduce bundle size
  }
);
```

**Benefits**:
- Production errors show original source code
- Stack traces point to TypeScript files, not minified JS
- Easier debugging without sourcemaps exposed to users

---

## Cost & Quota Management

### Free Tier Limits

**Sentry Free Tier**:
- 5,000 errors per month
- 10,000 performance transactions per month
- 30-day data retention
- Unlimited projects and team members

**Quota consumption**:
```
Current usage (estimated for v0.90):
  - Errors: ~200-500/month (well under limit)
  - Transactions: ~2,000-5,000/month (within limit)
  - Retention: All data kept 30 days
```

### Quota Optimization

**Strategies to stay under free tier**:

1. **Sample performance transactions**:
   ```typescript
   tracesSampleRate: 0.1, // 10% sampling
   ```

2. **Ignore noisy errors**:
   ```typescript
   ignoreErrors: ['ResizeObserver loop limit exceeded']
   ```

3. **Filter breadcrumbs**:
   ```typescript
   beforeBreadcrumb(breadcrumb) {
     if (breadcrumb.category === 'console') return null;
     return breadcrumb;
   }
   ```

4. **Set error limits per group**:
   - Sentry settings: "Rate Limits" → 100 events per group per hour

### When to Upgrade

**Signs you need Team plan** ($26/month):
- Consistently hitting 5K error limit
- Need >30 day retention
- Want advanced features (session replay)
- Multiple team members need access

---

## Testing Error Tracking

### Verify Sentry Works

**Test error capture**:

```typescript
// Add temporary test button in development
<button
  onClick={() => {
    throw new Error('Test Sentry error');
  }}
>
  Test Error Tracking
</button>
```

**Check Sentry dashboard**:
1. Click test button
2. Wait 10-30 seconds
3. Navigate to Sentry dashboard
4. Verify error appears with stack trace

**Checklist**:
- [ ] Error appears in Sentry dashboard
- [ ] Stack trace shows correct file/line
- [ ] Tags include app_version
- [ ] Environment correct (development)
- [ ] Email/Slack alert sent (if configured)

---

## Production Checklist

### Before Launch

- [ ] Sentry account created
- [ ] `@sentry/nextjs` installed
- [ ] Client config complete (`sentry.client.config.ts`)
- [ ] Server config complete (`sentry.server.config.ts`)
- [ ] Environment variables set (`.env.local`)
- [ ] Logger integration implemented
- [ ] Error boundaries enhanced
- [ ] Source maps configured
- [ ] Alert rules created (email/Slack)
- [ ] Test error sent successfully
- [ ] Quota limits understood

### After Launch

- [ ] Monitor error dashboard daily (first week)
- [ ] Triage new errors within 24 hours
- [ ] Link high-priority errors to GitHub issues
- [ ] Review quota usage weekly
- [ ] Adjust ignored errors based on real data
- [ ] Update alert thresholds as needed

---

## Common Errors to Watch

### Audio Playback Errors

```typescript
// Expected errors MetaDJ Nexus will capture
Error: "Failed to load audio file"
  Context: Replit App Storage connectivity
  Priority: High
  Fix: Retry logic, better error handling

Error: "AbortError: The play() request was interrupted"
  Context: Safari autoplay restrictions
  Priority: Medium
  Fix: User interaction before playback

Error: "DOMException: The element has no supported sources"
  Context: Codec support gap
  Priority: High
  Fix: Multiple source formats (MP3 + WebM)
```

### Cinema Video Errors

```typescript
Error: "Failed to load video"
  Context: H.264 codec missing in Firefox
  Priority: Medium
  Fix: WebM fallback already implemented

Error: "SecurityError: Failed to execute 'texImage2D'"
  Context: CORS issue with video element
  Priority: Low
  Fix: Verify CORS headers on /api/video
```

---

## Troubleshooting

### Issue: No errors appearing in Sentry

**Solutions**:
```markdown
1. Check DSN is correct in .env.local
2. Verify Sentry.init() called in config files
3. Check browser console for Sentry SDK errors
4. Confirm errors not in ignoreErrors list
5. Test with deliberate throw new Error()
```

### Issue: Too many errors consuming quota

**Solutions**:
```markdown
1. Add noisy errors to ignoreErrors
2. Reduce tracesSampleRate (e.g., 0.05)
3. Set per-issue rate limits in Sentry dashboard
4. Filter out browser extension errors
5. Review and archive resolved issues
```

### Issue: Stack traces show minified code

**Solutions**:
```markdown
1. Verify source maps uploaded (check Sentry releases)
2. Add SENTRY_AUTH_TOKEN to .env.local
3. Run build with: npm run build (not dev mode)
4. Check Sentry webpack plugin configured in next.config.js
```

---

## Next Steps

After implementing error tracking:

1. **Document deployment workflow** → See `3-projects/5-software/resources/workflows/DEPLOYMENT-WORKFLOW.md`
2. **Add security scanning** → See `3-projects/5-software/metadj-nexus/docs/security/SECURITY-SCANNING.md`
3. **Create incident response playbook**
4. **Set up post-mortem template**

---

## Support Resources

**Sentry Documentation**:
- Next.js integration: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Error configuration: https://docs.sentry.io/platforms/javascript/configuration/
- Performance monitoring: https://docs.sentry.io/product/performance/

**MetaDJ Nexus Context**:
- Existing logger: `src/lib/logger.ts`
- Error boundaries: `src/app/error.tsx`, `src/app/global-error.tsx`
- API routes: `/api/audio`, `/api/video`, `/api/health`

---

Remember: Error tracking turns unknown bugs into actionable fixes. The hour spent setting up Sentry will save days of debugging mysterious production issues and improve user experience by catching errors proactively.
