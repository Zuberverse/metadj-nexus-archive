# Replit Deployment Guide - MetaDJ Nexus

**Last Modified**: 2026-02-07 22:27 EST

## Scope

Replit is the only production target for the MVP. Alternative hosting paths live in the archive:
`docs/archive/2026-01-26-deployment-options-roadmap.md`.

## MVP Launch Plan (Replit Only)

1. **Verify repo health (local or CI)**  
   Run: `npm run lint`, `npm run type-check`, `npm test`
2. **Confirm Replit Secrets**  
   Set required secrets in Replit (see Environment Variables below).
3. **Database readiness**  
   Neon Postgres must be reachable via `DATABASE_URL`. Run `npm run db:push` if schema changes are pending.
4. **Deploy via Replit Deployments**  
   Build: `npm run build:replit`  
   Run: `npm run start:replit`
5. **Post-deploy checks**  
   - `https://your-repl.replit.app/api/health`  
   - Login/signup flow  
   - MetaDJai chat (server history persists)  
   - Audio/video streaming (R2)
6. **Monitor**  
   Review Replit deployment logs and resource charts.

## Runtime & Commands

- **Local dev (Replit)**: `npm run dev:replit` (port 5000)
- **Deploy build**: `npm run build:replit`
- **Deploy start**: `npm run start:replit`
- **Source of truth**: `.replit` (deployment targets + build/start commands)

## Environment Variables (Replit Secrets)

Minimum set (details in `docs/operations/BUILD-DEPLOYMENT-GUIDE.md` and `docs/MEDIA-STORAGE.md`):

- `DATABASE_URL` (Neon Postgres via Replit)
- `OPENAI_API_KEY` (or other enabled provider key)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- `LOGGING_CLIENT_KEY` (optional)
- `PLAUSIBLE_DOMAIN` / `PLAUSIBLE_API_HOST` (optional)

**Note**: Do not edit `.env.local` in this repo. Use Replit Secrets for production.

## Authentication Notes

- **Admin Login**: After initial bootstrap, admin credentials are stored in the database. The `ADMIN_PASSWORD` env var is only used for first-time admin creation.
- **Sessions**: HMAC-signed HTTP-only cookies, stored server-side in Postgres
- **Password Hashing**: Argon2id (OWASP-compliant) with automatic migration from legacy PBKDF2
- **Email Verification**: Database infrastructure exists (`email_verification_tokens` table) but email sending is not yet implemented. Users can register without email verification for MVP.

## Data & Persistence Notes

- **MetaDJai chat history**: Server-side in Postgres for authenticated users. localStorage is only used for unauthenticated users or for migration to server.
- **Journal**: Server-side for authenticated users with local backup for drafts.
- **Music data**: Versioned JSON in repo; media files live in Cloudflare R2.

## UI/UX Styling Conventions (Updated 2026-01-27)

### Background & Gradient System
- **Base gradient**: `gradient-1` uses vibrant purple (#7c3aed), blue (#2563eb), and cyan (#06b6d4) colors
- **Page backgrounds**: Full-page fixed background effects with color blooms and aurora effects on Hub, Wisdom, Journal, and Landing pages
- **No bottom fade**: Backgrounds maintain consistent vibrancy throughout (no fade to dark)

### Card & Container Styling Standards
| Use Case | Background | Border |
|----------|------------|--------|
| Content cards | `bg-black/30` | `border-white/15` |
| Wisdom cards | `bg-black/40` | `border-white/15` |
| Browse items | `bg-black/25` | `border-(--border-subtle)` |
| Header sections | `bg-black/20` | `border-white/10` |

### Text Opacity Standards
| Use Case | Class |
|----------|-------|
| Primary text | `text-white/90` or `text-heading-solid` |
| Secondary text | `text-white/80` |
| Muted text | `text-white/75` or `text-muted-accessible` |
| Very muted | `text-white/50` |

### Icon Colors (Vibrant)
- Purple: `#A78BFA`
- Cyan: `#22D3EE`
- Pink: `#E879F9`

### Key Files for Styling
- `src/styles/gradients.css` - Core gradient definitions
- `src/components/hub/HubExperience.tsx` - Hub page background effects
- `src/components/wisdom/WisdomExperience.tsx` - Wisdom page styling
- `src/components/wisdom/Journal.tsx` - Journal page styling
- `src/components/landing/LandingPage.tsx` - Landing page background
- `src/components/icons/BrandGradientIcon.tsx` - Vibrant icon colors

### Avoid These Patterns
- `bg-white/3` - Too faint, use `bg-black/25-40` instead
- `text-white/60` - Too dim, use `text-white/75` minimum
- `border-white/5` - Too invisible, use `border-white/15` minimum

## MetaDJai Personalization

- **Real-time application**: Personalization settings apply immediately to your next message in any chat (new or existing). Each API request includes the current personalization payload.
- **Conversation context**: The AI also considers conversation history when responding. For the most dramatic personality change, start a new chat.
- **Character limits**: Name (100), all other fields (1500)
- **Key files**: `src/components/metadjai/MetaDjAiPersonalizePopover.tsx`, `src/hooks/metadjai/use-metadjai.ts`, `src/lib/ai/personalization.ts`

## Cinema Dream Window Sizes

Dream window sizes (desktop floating window, square aspect ratio):

| Size | Dimensions (clamp) |
|------|-------------------|
| Small | 230px - 31vh - 374px |
| Default | 288px - 46vh - 490px |
| Large | 346px - 64vh - 605px |

Mobile uses full-width responsive sizing.

## Related Docs

- `docs/operations/BUILD-DEPLOYMENT-GUIDE.md`
- `docs/strategy/REPLIT-PLATFORM-STRATEGY.md`
- `docs/operations/UPTIME-MONITORING.md`
