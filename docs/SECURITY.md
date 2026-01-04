# Security Overview — MetaDJ Nexus

**Last Modified**: 2026-01-04 01:08 EST
> Pragmatic security approach for a music showcasing MVP

*Last Reviewed: 2025-10-13*
*Status: ✅ Beta MVP Ready*

---

## Philosophy

**Legal copyright protection > Technical download prevention**

MetaDJ Nexus is a public music player showcasing MetaDJ originals. The security approach balances user experience with appropriate protection for a beta MVP.

---

## What's Protected ✅

| Protection | Implementation | Purpose |
|------------|----------------|---------|
| **Copyright** | Footer notice with legal terms | Establishes ownership, enables DMCA |
| **XSS Prevention** | Content Security Policy | Prevents cross-site scripting attacks |
| **Clickjacking** | X-Frame-Options: DENY | Prevents iframe embedding |
| **MIME Sniffing** | X-Content-Type-Options | Prevents content type confusion |
| **HTTPS Enforcement** | Strict-Transport-Security | Forces secure connections |
| **Referrer Policy** | strict-origin-when-cross-origin | Controls referrer information |
| **Client Error Telemetry** | `/api/log` proxy + `LOGGING_WEBHOOK_URL` + `LOGGING_SHARED_SECRET` + `LOGGING_CLIENT_KEY` | Captures browser errors without exposing webhook URLs; contexts are sanitized/redacted server‑side before forwarding; client key is embedded in the UI, shared secret stays server‑side |
| **AI Rate Limiting** | In‑app session/fingerprint limiter for `/api/metadjai*` (20 / 5m, 500ms min interval) + Replit platform throttling. Optional: **Upstash Redis** for distributed rate limiting + burst enforcement across instances (`src/lib/ai/rate-limiter.ts`) | Prevents abuse and cost spikes for MetaDJai (chat + transcription) |
| **AI Spending Alerts** | Hourly ($1) and daily ($10) spending thresholds with automatic alerts (`src/lib/ai/spending-alerts.ts`). Supports Upstash Redis for distributed tracking. Optional blocking via `AI_SPENDING_BLOCK_ON_LIMIT=true`. | Cost visibility and runaway spending prevention |
| **Daydream Stream Limits** | Single active stream + cooldown with optional Upstash Redis backing (`src/lib/daydream/stream-limiter.ts`) | Prevents stream abuse and resource spikes |
| **Wisdom Rate Limiting** | 60 req/min per client with optional Upstash Redis backing (`src/lib/rate-limiting/wisdom-rate-limiter.ts`) | Mitigates scraping/abuse of static content |
| **Scoped Media Access** | `/api/audio` is MP3-only + path traversal protection; `/api/video` is MP4/WebM/MOV-only + path traversal protection | Prevents accidental exposure of non-media objects |
| **Cookie Path Isolation** | Session cookies scoped to `/api/metadjai` | Prevents cookie leakage to unrelated routes |
| **Body Size Limits** | 1MB limit on server actions | Prevents DoS via large payloads |
| **Generic Error Messages** | Internal details logged server-side only | Prevents information disclosure |

**Implementation**: `src/proxy.ts` (security headers + rate limiting, wired via `src/middleware.ts`) + `next.config.js` (static headers for assets)

---

## MetaDJai AI Surface Security

**Prompt injection resistance**
- Playback/context fields interpolated into prompts are sanitized (`src/lib/ai/meta-dj-ai-prompt.ts`).
- Raw user input is never concatenated into system instruction sections.

**Rate limiting + session isolation**
- All MetaDJai endpoints (`/api/metadjai`, `/api/metadjai/stream`, `/api/metadjai/transcribe`) share a session‑cookie + fingerprint rate limiter (`src/lib/ai/rate-limiter.ts`).
- Session cookie is scoped to `/api/metadjai` to prevent leakage to unrelated routes.

**Tool safety**
- All tool results are sanitized for injection patterns and size‑capped (~8k chars) (`src/lib/ai/tools.ts`).
- **Active Control** tools (`proposePlayback`, `proposeQueueSet`, `proposePlaylist`, `proposeSurface`) only return proposals; the UI requires explicit user confirmation before executing any playback or navigation action.
- Tool outputs (including web search) are treated as information; any instruction‑like or suspicious content is ignored to prevent prompt‑injection attacks.

**Knowledge retrieval**
- Knowledge search uses hybrid keyword + optional semantic similarity in memory (OpenAI embeddings) with automatic fallback to keyword‑only if embeddings aren’t available. No external vector store is required.

**Voice transcription**
- `/api/metadjai/transcribe` is rate‑limited, enforces a 10MB file cap, and forwards audio to OpenAI GPT‑4o transcriptions (default `gpt-4o-mini-transcribe-2025-12-15`, override via `OPENAI_TRANSCRIBE_MODEL`).
- File type handling is permissive (best‑effort extension mapping). Unsupported formats fail at the OpenAI layer and are surfaced back to the client.

## What's NOT Protected (Accepted for MVP) ⚠️

| Aspect | Status | Rationale |
|--------|--------|-----------|
| **Audio Files** | Publicly accessible | Standard for streaming platforms (Soundcloud, Bandcamp) |
| **Authentication** | None | Public music player by design |
| **Download Prevention** | None | Technical prevention doesn't work; legal protection sufficient |
| **DRM** | None | Overkill for indie music showcasing |
| **CSRF Tokens** | Not implemented | No state-changing routes in MVP; avoids handing out meaningless cookies |

---

## Security Headers

**Active Headers** (simplified approach):
```javascript
// src/proxy.ts (primary, wired via src/middleware.ts) + next.config.js (static for assets)
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: nonce-based in src/proxy.ts (dev allows unsafe-eval)
Strict-Transport-Security: max-age=31536000
```

**Notes**:
- `script-src` uses per-request nonces; inline scripts must include the nonce.
- Dev mode still allows `unsafe-eval` for HMR/overlays.
- `style-src` uses per-request nonces with `style-src-attr 'none'`; runtime styling must use `useCspStyle` + `data-csp-style` (no inline `style` attributes).

**Removed** (unnecessary complexity):
- Cross-Origin-Resource-Policy (breaks CDN caching)
- Content-Disposition headers (fake download "prevention")
- X-Robots-Tag on audio (counter-productive for marketing)
- Excessive CSP rules that break Next.js dev mode

---

## Feedback Intake

The experimental bug-report overlay and API route were removed in v0.71. All listener feedback now flows through direct channels (email/social) until we introduce a more durable system. This keeps the attack surface lean and avoids unbounded filesystem writes.

---

## Copyright Protection

### Legal Notice

**Footer displays**:
```
© 2024 MetaDJ. All rights reserved.

All recordings and compositions are protected by copyright.
Unauthorized reproduction, distribution, or public performance prohibited.

For licensing: licensing@metadj.ai
```

### What This Provides

✅ **Establishes ownership** - Legally binding copyright claim
✅ **Deters casual misuse** - Most people respect copyright notices
✅ **Enables DMCA takedowns** - Foundation for removing unauthorized copies
✅ **Professional appearance** - Shows you take your work seriously

### What It Doesn't Do

❌ **Prevent determined users** - Nothing technical can prevent this
❌ **Replace registration** - Consider formal copyright registration long-term
❌ **Require lawyer review** - Standard industry language

---

## Risk Assessment

### Low Risk (Acceptable)

**Audio File Access**
- Risk: Users can access MP3 files directly
- Mitigation: Copyright notice, legal terms
- Impact: Minimal (99% of users stream, 1% who download weren't customers anyway)

**Platform Rate Throttling**
- Risk: Replit-managed throttling is coarse and shared; sudden spikes could still pass through
- Mitigation: Monitor storage + bandwidth logs; add app-level limiter only if traffic or abuse patterns demand it
- Impact: Acceptable for current beta scope; keeps maintenance overhead low while leveraging host safeguards

### No Risk (By Design)

**Public Player**
- No authentication needed
- No user data collected
- No payment processing
- No backend infrastructure to secure

---

## Dependency Security

**Production Dependencies**: 27 total
- `@ai-sdk/anthropic` - Anthropic AI provider (MetaDJai optional)
- `@ai-sdk/google` - Google AI provider (MetaDJai optional)
- `@ai-sdk/openai` - OpenAI provider (MetaDJai default)
- `@ai-sdk/xai` - xAI provider (MetaDJai optional)
- `@react-three/drei` - Three.js helpers
- `@react-three/fiber` - React renderer for Three.js
- `@react-three/postprocessing` - Three.js post-processing
- `@replit/object-storage` - Replit media storage
- `@upstash/ratelimit` - Rate limiting (optional)
- `@upstash/redis` - Redis client for rate limiting (optional)
- `ai` - Vercel AI SDK
- `clsx` - Class name utility
- `driver.js` - Guided tours
- `framer-motion` - Animation
- `lucide-react` - Icons
- `next` - Framework
- `openai` - OpenAI SDK (transcriptions)
- `react` - UI library
- `react-dom` - React DOM
- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown
- `server-only` - Server component isolation
- `tailwind-merge` - Tailwind class merging
- `tailwindcss-animate` - Animations
- `three` - Three.js core
- `turndown` - HTML to Markdown
- `zod` - Schema validation

**Status**: ✅ Zero known vulnerabilities (verified 2025-12-28)

**Monitoring**:
```bash
# Regular checks
npm audit --omit=dev

# Snyk scanning (if enabled via SNYK_ENABLED repository variable)
# Runs automatically in CI via .github/workflows/security.yml
```

**Automated Scanning**:
- **Snyk**: Security scanning in CI (enable via `SNYK_ENABLED=true` repository variable and `SNYK_TOKEN` secret)

---

## Post-Launch Monitoring

### If You See Growth

**When to Add Protection**:
- **10K+ monthly users**: Consider Cloudflare CDN for DDoS protection
- **Bandwidth abuse**: Add basic rate limiting
- **Actual piracy issues**: Implement signed URLs

**When NOT to Add**:
- Downloads from fans (free marketing)
- Occasional high traffic (that's success!)
- Feature requests for download buttons (consider enabling officially)

### Recommended Tools (Optional)

**Only if traffic grows**:
- **CDN**: Cloudflare (free tier) - DDoS protection + caching
- **Analytics**: Plausible or Simple Analytics - Privacy-friendly tracking
- **Error Tracking**: Sentry (free tier) - Catch bugs in production

---

## Comparison: Security Levels

### Current (Beta MVP) ✅

**Protection**: Basic XSS + Copyright notice
**Complexity**: Minimal
**User Experience**: Excellent
**Cost**: $0
**Appropriate For**: Beta launch, < 10K users

### Enterprise (Overkill) ❌

**Protection**: DRM, signed URLs, rate limiting, monitoring
**Complexity**: High
**User Experience**: Degraded (buffering, failures)
**Cost**: $500-2000/month
**Appropriate For**: Netflix, Spotify (millions of users)

---

## Security Checklist

**Pre-Launch** ✅
- [x] Security headers configured
- [x] Copyright notice in footer
- [x] No secrets in repository
- [x] Dependencies audited
- [x] HTTPS enforced (via hosting)
- [x] No authentication needed

**Post-Launch** (Monitor)
- [ ] Check bandwidth usage monthly
- [ ] Review analytics for unusual patterns
- [ ] Respond to any DMCA notices (unlikely)
- [ ] Update dependencies quarterly

---

## Threat Model

### Realistic Threats

**Casual Downloading** 🟡
- Likelihood: Low (5% of users)
- Impact: Minimal (free marketing)
- Response: Copyright notice sufficient

**Content Scraping** 🟡
- Likelihood: Low
- Impact: Minimal (music already public)
- Response: Monitor, DMCA if needed

**Bandwidth Abuse** 🟢
- Likelihood: Very Low (beta traffic)
- Impact: Low (CDN caching helps)
- Response: Add rate limiting if occurs

### Unrealistic Threats

**Data Breach** - No user data to breach
**Account Takeover** - No accounts
**SQL Injection** - No database
**Payment Fraud** - No payments

---

## FAQ

**Q: Can people download my music?**
A: Yes, if they try. Copyright notice provides legal protection. 99% won't bother.

**Q: Should I add DRM?**
A: No. It's expensive, degrades UX, and doesn't actually work. Legal protection is better.

**Q: What if someone pirates my tracks?**
A: File a DMCA takedown. Your copyright notice makes this straightforward.

**Q: Do I need a lawyer?**
A: Not for MVP. The copyright language is industry standard. Consider formal copyright registration long-term.

**Q: Is this secure enough?**
A: Yes, for a public music player. You're not storing passwords or processing payments. The security matches the use case.

---

## Updates

- **2025-12-14**: Added comprehensive CSP in proxy.ts, health endpoint information disclosure fix, dev endpoint authentication, AI provider circuit breaker for resilience
- **2025-12-03**: Added cookie path isolation, body size limits, generic error responses
- **2025-10-04**: Simplified to pragmatic MVP approach
- **2025-10-03**: Removed security theater (fake protection)
- **2025-10-02**: Initial security documentation

---

**Remember**: The goal is sharing your music, not building Fort Knox. Simple, effective protection beats complex, ineffective barriers.

For questions: contact@metadj.ai
