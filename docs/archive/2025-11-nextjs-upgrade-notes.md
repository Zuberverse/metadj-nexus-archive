# Next.js Upgrade Notes

**Last Modified**: 2026-01-26 00:00 EST

This document tracks configuration changes needed when upgrading Next.js versions.

## Current Version: 16.0.3

### Known Warnings (Non-Critical)

#### Cross-Origin Request Warning (Development Only)

**Warning Message**:
```
⚠ Cross origin request detected from [domain] to /_next/* resource. 
In a future major version of Next.js, you will need to explicitly configure 
"allowedDevOrigins" in next.config to allow this.
```

**Impact**: 
- Development only (does not appear in production)
- Does not affect functionality
- Cosmetic warning only

**Future Fix**: 
When upgrading to the Next.js version that requires this configuration, add to `next.config.js`:

```js
const nextConfig = {
  // ... existing config ...
  
  // Allow Replit development domains and local ports (keep in sync with docs/replit.md)
  allowedDevOrigins: [
    process.env.REPLIT_DEV_DOMAIN,
    'localhost:8100',
    '127.0.0.1:8100',
    'localhost:5000',
    '127.0.0.1:5000',
  ].filter(Boolean),
};
```

**Documentation**: 
https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins

---

## Upgrade Checklist

When upgrading Next.js, verify:

- [ ] All security headers still working (`src/proxy.ts`, plus static asset headers in `next.config.js`)
- [ ] CSP configuration compatible with new version
- [ ] Plausible Analytics script-src still allowed
- [ ] Audio/video streaming routes still functioning
- [ ] Development server binds to 0.0.0.0:5000
- [ ] TypeScript compilation passes (`npm run type-check`)
- [ ] All tests pass (`npm test`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Add `allowedDevOrigins` if warning becomes an error

---

## Version History

### 16.0.3 (Current)
- ✅ App Router + React 19 working
- ✅ `allowedDevOrigins` configured for Replit dev
- ✅ Security headers configured
- ✅ CSP with optional Plausible exception working

---

## Breaking Changes to Watch

### React 19 Compatibility
- Next.js 15 requires React 19
- All hooks and components updated
- Strict mode enabled
- No deprecated APIs in use

### App Router
- Using Next.js App Router (not Pages Router)
- API routes in `src/app/api/`
- Proxy/middleware in `src/proxy.ts` (applies headers + request controls)
- All routes server-side rendered by default

---

## Performance Monitoring

After upgrades, monitor:
- Bundle size (currently ~1.4MB, target <2MB)
- Test suite duration (currently ~11s, target <30s)
- Server startup time (currently ~2s, target <5s)
- Audio streaming latency
- Video streaming performance

---

**Maintainer**: Zuberant / MetaDJ All Access
