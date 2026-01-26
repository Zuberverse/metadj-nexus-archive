# Replit Deployment Guide - MetaDJ Nexus

**Last Modified**: 2026-01-26 14:20 EST

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

## Data & Persistence Notes

- **MetaDJai chat history**: Server-side in Postgres for authenticated users. Local storage is migration-only.
- **Journal**: Server-side for authenticated users with local backup for drafts.
- **Music data**: Versioned JSON in repo; media files live in Cloudflare R2.

## Related Docs

- `docs/operations/BUILD-DEPLOYMENT-GUIDE.md`
- `docs/strategy/REPLIT-PLATFORM-STRATEGY.md`
- `docs/operations/UPTIME-MONITORING.md`
