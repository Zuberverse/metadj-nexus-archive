# CSP Nonce Implementation Plan

**Last Modified**: 2026-01-05 22:08 EST
**Status**: Partially implemented (nonce CSP live; inline style hardening deferred)
**Priority**: Medium
**Estimated Effort**: In progress

**Implementation Summary**:
- Active — CSP nonce generation lives in `src/proxy.ts` (Next.js 16 proxy convention).
- `script-src` now uses per-request nonces + `'strict-dynamic'`; dev-only `unsafe-eval` remains.
- `style-src` is nonce-based with `style-src-attr 'unsafe-inline'` retained for motion-driven inline transforms; runtime layout styles use `useCspStyle` + `data-csp-style`.
- `src/app/layout.tsx` applies the nonce to JSON-LD and Plausible scripts via the `x-nonce` header.

Sections below include historical notes; the "Current CSP Configuration" block reflects the live policy, while the hardening steps keep `style-src-attr 'none'` as a future target.

---

## Executive Summary

This document outlines the plan to migrate MetaDJ Nexus away from `unsafe-inline` CSP directives to a nonce-based Content Security Policy. The nonce policy is live; inline style attribute hardening remains deferred due to motion-based transforms.

---

## 1. Current State

### Current CSP Configuration

**File**: `/src/proxy.ts` (CSP directives)

```javascript
const csp = [
  "default-src 'self'",
  `script-src ${Array.from(scriptSrc).join(' ')}`,
  `style-src 'self' 'nonce-${nonce}'`,
  "style-src-attr 'unsafe-inline'",
  `style-src-elem 'self' 'nonce-${nonce}'`,
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  `connect-src ${Array.from(connectSrc).join(' ')}`,
  "object-src 'none'",
  "frame-src 'self' https://lvpr.tv",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
];
```

### Why `unsafe-inline` Was Required (Historical)

1. **JSON-LD Structured Data** (`/src/app/layout.tsx`):
   ```tsx
   <script
     id="structured-data"
     type="application/ld+json"
     dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
     nonce={nonce}
   />
   ```

2. **Next.js Hydration Scripts**: Next.js injects inline scripts for:
   - Client-side hydration
   - Route prefetching
   - Error overlay (development only)

3. **Inline Style Attributes**: Runtime style attributes and JS-driven mutations required inline allowances.

**Status**: Partially resolved — runtime layout styles use `useCspStyle`, but `style-src-attr` remains `unsafe-inline` to support motion transforms.

### Current Risk Assessment

- **Risk Level**: LOW (nonce-based CSP in place)
- **Attack Vector**: XSS mitigated by per-request nonces; residual risk is compromised allowed origins
- **Mitigations In Place**:
  - Strict `default-src 'self'`
  - Nonce-based `script-src` + `style-src` with `style-src-attr 'unsafe-inline'` (motion transforms)
  - `object-src 'none'` (blocks plugins)
  - `frame-src 'self' https://lvpr.tv` (Livepeer-only iframe)
  - `frame-ancestors 'none'` (prevents clickjacking)
  - Server-controlled content only

---

## 2. Goal

Replace `'unsafe-inline'` in `script-src` with nonce-based CSP:

**From**:
```
script-src 'self' 'unsafe-inline' https://plausible.io
```

**To**:
```
script-src 'self' 'nonce-{random-value}' https://plausible.io
```

### Benefits

1. **Eliminates XSS Risk**: Only scripts with the matching nonce execute
2. **Per-Document Security**: Fresh nonce on each full document request, reused for RSC/Flight requests to prevent hydration mismatches
3. **Modern Security Standard**: Recommended by OWASP and browser vendors
4. **Maintains Functionality**: All existing features continue working

---

## 3. Implementation Steps

### Phase 1: Add Nonce Generation (Proxy/Middleware)

**Update**: `src/proxy.ts`

The middleware generates a cryptographic nonce for full document requests, reuses it for RSC/Flight requests via an HttpOnly cookie, and sets CSP headers.

```typescript
// src/proxy.ts (Next 16+)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to generate cryptographic nonces for CSP
 *
 * This creates a unique nonce per request that allows specific inline scripts
 * to execute while blocking arbitrary script injection.
 *
 * @see https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
 */
export default function proxy(request: NextRequest) {
  // Generate a cryptographic nonce using Web Crypto API
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Build CSP header with nonce
  const cspHeader = buildCSPHeader(nonce, process.env.NODE_ENV === 'development');

  // Clone request headers and add nonce for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Create response with CSP header
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set security headers
  response.headers.set('Content-Security-Policy', cspHeader);

  // Additional security headers (can remove from next.config.js once migrated)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

/**
 * Build CSP header string with nonce
 */
function buildCSPHeader(nonce: string, isDev: boolean): string {
  const plausibleHost = process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST || 'https://plausible.io';

  // Parse Plausible origin safely
  let plausibleOrigin = '';
  try {
    plausibleOrigin = new URL(plausibleHost).origin;
  } catch {
    // Skip if invalid URL
  }

  // Build script-src directive
  const scriptSrcParts = ["'self'", `'nonce-${nonce}'`];
  if (plausibleOrigin) {
    scriptSrcParts.push(plausibleOrigin);
  }
  // Development needs unsafe-eval for HMR and error overlays
  if (isDev) {
    scriptSrcParts.push("'unsafe-eval'");
  }
  // strict-dynamic allows scripts loaded by nonced scripts to execute
  scriptSrcParts.push("'strict-dynamic'");

  // Build connect-src directive
  const connectSrcParts = ["'self'"];
  if (plausibleOrigin) {
    connectSrcParts.push(plausibleOrigin);
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrcParts.join(' ')}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'none'",
    `style-src-elem 'self' 'nonce-${nonce}'`,
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    `connect-src ${connectSrcParts.join(' ')}`,
    "frame-src 'self' https://lvpr.tv",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  return directives.join('; ');
}

/**
 * Configure which paths the middleware runs on
 *
 * Exclude static files and API routes that don't need CSP nonces
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (they don't serve HTML)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|audio|video|images).*)',
  ],
};
```

### Phase 2: Create Nonce Context Provider

**Create**: `/src/lib/nonce.ts`

```typescript
// src/lib/nonce.ts
import { headers } from 'next/headers';
import { cache } from 'react';

/**
 * Get the CSP nonce from request headers
 *
 * This is cached per request to ensure all components get the same nonce.
 * Must be called from a Server Component or Server Action.
 *
 * @returns The nonce string or empty string if not available
 */
export const getNonce = cache(async (): Promise<string> => {
  const headersList = await headers();
  return headersList.get('x-nonce') ?? '';
});

/**
 * Synchronous nonce getter for use in layout.tsx
 *
 * Note: This requires the experimental headers() to be called first
 * in a parent component to populate the cache.
 */
export function getNonceSync(headersList: Headers): string {
  return headersList.get('x-nonce') ?? '';
}
```

### Phase 3: Update Layout to Use Nonce

**Modify**: `/src/app/layout.tsx`

```tsx
// Add import at top
import { headers } from 'next/headers';

// Inside RootLayout function, get nonce:
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';

  // ... existing code ...

  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <head>
        {/* Resource hints for performance optimization */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${cinzel.variable} ${poppins.variable} font-sans antialiased min-h-screen overflow-x-hidden bg-[#06060e]`}>
        {/* JSON-LD Structured Data for Music Schema */}
        <Script
          id="structured-data"
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          strategy="beforeInteractive"
        />

        {plausibleDomain && (
          <Script
            defer
            nonce={nonce}
            data-domain={plausibleDomain}
            src={`${plausibleHost}/js/script.js`}
            strategy="afterInteractive"
          />
        )}

        {/* ... rest of layout ... */}
      </body>
    </html>
  );
}
```

### Phase 4: Remove CSP from next.config.js

**Modify**: `/next.config.js`

Remove or comment out the CSP header from the `headers()` function since middleware now handles it:

```javascript
async headers() {
  // CSP is now handled by middleware.ts for nonce support
  // Only keep non-CSP security headers here if not handled in middleware
  return [
    {
      source: '/:path*',
      headers: [
        // Remove Content-Security-Policy - handled by middleware
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
        {
          key: 'Permissions-Policy',
          // IMPORTANT: camera=(self) and microphone=(self) required for Dream and voice features
          // See docs/security/README.md for details
          value: 'camera=(self), microphone=(self), geolocation=(), interest-cohort=()',
        },
        {
          key: 'X-Deployment-Platform',
          value: 'Replit',
        },
      ],
    },
    // Keep audio/video headers...
  ];
}
```

---

## 4. Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `/src/proxy.ts` | **Modify** | Add nonce generation + CSP enforcement (Next.js 16 proxy convention) |
| `/src/lib/nonce.ts` | **Create** | Nonce utility functions |
| `/src/app/layout.tsx` | **Modify** | Add nonce prop to Script components, make async |
| `/next.config.js` | **Modify** | Remove CSP from headers (middleware handles it) |

---

## 5. Testing Strategy

### Pre-Implementation Testing

1. **Document current behavior**:
   ```bash
   # Capture current CSP headers
   curl -I https://your-app-url.com | grep -i content-security
   ```

2. **Test existing functionality** - ensure all features work before changes

### Post-Implementation Testing

1. **Verify nonce generation**:
   ```bash
   # Check that nonce is present in headers
   curl -I https://your-app-url.com | grep -i x-nonce

   # Check CSP contains nonce
   curl -I https://your-app-url.com | grep -i content-security
   ```

2. **Browser Console Check**:
   - Open DevTools > Console
   - Look for CSP violation errors
   - All scripts should execute without errors

3. **Functional Testing**:
   - [ ] JSON-LD structured data renders (check View Source)
   - [ ] Plausible analytics script loads (check Network tab)
   - [ ] All pages load without CSP errors
   - [ ] Music player functions correctly
   - [ ] MetaDJai chat works
   - [ ] All navigation works

4. **Security Validation**:
   - Use [CSP Evaluator](https://csp-evaluator.withgoogle.com/) to analyze the new policy
   - Verify `unsafe-inline` is removed from `script-src` and `style-src`
   - Confirm `style-src-attr 'none'` is present
   - Confirm nonce is cryptographically random

5. **Development Mode**:
   - Hot Module Replacement (HMR) works
   - Error overlay displays correctly
   - No blocked scripts in console

### Automated Tests

Add to existing test suite:

```typescript
// tests/security/csp.test.ts
describe('Content Security Policy', () => {
  it('should include nonce in CSP header', async () => {
    const response = await fetch('/');
    const csp = response.headers.get('content-security-policy');
    expect(csp).toMatch(/nonce-[A-Za-z0-9+/=]+/);
  });

  it('should not include unsafe-inline in script-src', async () => {
    const response = await fetch('/');
    const csp = response.headers.get('content-security-policy');
    expect(csp).not.toContain("script-src 'unsafe-inline'");
  });
});
```

---

## 6. Rollback Plan

If issues arise after deployment:

### Immediate Rollback (< 5 minutes)

1. **Revert proxy middleware**:
   ```bash
   # Revert proxy middleware changes (preferred)
   git checkout main -- src/proxy.ts
   ```

2. **Restore next.config.js**:
   - Uncomment CSP headers in `headers()` function
   - Redeploy

### Full Rollback

1. **Git revert**:
   ```bash
   git revert HEAD  # If single commit
   # OR
   git checkout main -- src/proxy.ts next.config.js src/app/layout.tsx
   ```

2. **Redeploy**

### Signs Rollback is Needed

- Console errors: `Refused to execute inline script`
- Blank pages or broken functionality
- Analytics not tracking
- JSON-LD not rendering

---

## 7. Environment Variables

No new environment variables required. Existing variables used:

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Plausible analytics domain | Optional |
| `NEXT_PUBLIC_PLAUSIBLE_API_HOST` | Plausible API host | Optional (default: https://plausible.io) |
| `NODE_ENV` | Environment detection | Auto-set |

---

## 8. References

### Official Documentation

- [Next.js CSP Guide](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [MDN CSP Nonces](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe_inline_script)

### Security Resources

- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [CSP Evaluator Tool](https://csp-evaluator.withgoogle.com/)
- [Google CSP Guide](https://developers.google.com/web/fundamentals/security/csp)

### Related Files

- Current CSP: `/next.config.js`
- Security Overview: `/docs/SECURITY.md`
- Security Improvements: `/docs/SECURITY-IMPROVEMENTS-2025-12-04.md`

---

## 9. Success Criteria

- [ ] `unsafe-inline` removed from `script-src` and `style-src` directives
- [ ] Nonce present in CSP header on every response
- [ ] All pages load without CSP violation errors
- [ ] JSON-LD structured data renders correctly
- [ ] Plausible analytics continues tracking
- [ ] Development mode (HMR, error overlay) functions
- [ ] CSP Evaluator shows no critical warnings
- [ ] All existing tests pass

---

## 10. Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Middleware creation | 1-2 hours |
| Phase 2: Nonce utilities | 30 minutes |
| Phase 3: Layout updates | 30 minutes |
| Phase 4: Config cleanup | 30 minutes |
| Testing & validation | 1-2 hours |
| Documentation updates | 30 minutes |
| **Total** | **4-6 hours** |

---

## 11. Notes

### Limitations

1. **Inline style attributes are blocked**: `style-src-attr 'none'` disallows inline `style` usage. Runtime styles must use `useCspStyle` + `data-csp-style` or CSS classes.

2. **Development mode still needs `unsafe-eval`**: React Fast Refresh and Next.js error overlays require eval. This is only active in development.

### Future Improvements

1. **Hash-based approach for static scripts**: For known static inline scripts, hashes could replace nonces (more caching friendly)

2. **Report-URI/report-to**: Add CSP violation reporting to catch issues in production

---

**Document Status**: Implemented (reference only)
**Next Action**: Maintain nonce headers + avoid inline styles (use `useCspStyle` or classes).
