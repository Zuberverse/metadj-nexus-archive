# Replit Deployment Guide — MetaDJ Nexus

## Overview

MetaDJ Nexus is a platform hub connecting human vision with AI-driven execution for the Metaverse, optimized for deployment on Replit. It leverages Replit's managed infrastructure, Cloudflare R2 for media streaming (with Replit App Storage as a fallback), and a zero-configuration deployment workflow. The project aims to provide a creative and immersive experience without the complexities of server management.

Key capabilities include:
- Managed infrastructure and zero-downtime deployments.
- Primary media streaming from Cloudflare R2 with Replit App Storage fallback.
- Automatic HTTPS and SSL certificate management.
- Integration with analytics and monitoring tools.

## User Preferences

- I want iterative development.
- Ask before making major changes.
- Provide detailed explanations for complex concepts.
- I prefer clear and concise communication.

## System Architecture

MetaDJ Nexus is built on a modern web stack designed for performance and scalability on Replit.

**Platform & Frameworks:**
- **Platform**: Replit
- **Runtime**: Node.js 20.19+ (or 22.12+)
- **Framework**: Next.js 16.1.1 (App Router, webpack default, Turbopack optional)
- **Frontend**: React 19.2.0 (stable)
- **Build Tool**: Next.js (Turbopack/webpack)
- **Package Manager**: npm

**UI/UX Decisions:**
- The application focuses on delivering immersive audio and video experiences.
- Media playback includes features like scrubbing, volume control, and full-screen cinema video.
- Analytics are integrated to monitor user engagement.

**Technical Implementations & Feature Specifications:**
- **Media Streaming**: Supports HTTP 206 Partial Content for audio and video seeking and progressive loading.
- **Caching Strategy**: Utilizes `Cache-Control: public, max-age=31536000, immutable` for media files, enabling long-lived caching. Filenames are versioned to bust cache.
- **Data Storage**: PostgreSQL database via Drizzle ORM for user data, preferences, and chat history. Content data uses JSON files (`src/data/music.json`, `src/data/collections.json`) versioned in Git.
- **Database ORM**: Drizzle ORM with Neon serverless PostgreSQL driver.
- **Authentication**: Cookie-based sessions with HMAC-signed tokens. User accounts stored in PostgreSQL with bcrypt password hashing. Admin user via ADMIN_PASSWORD environment variable.
- **API Security**: Includes rate limiting, input validation, and non-disclosure of sensitive information in error messages.
- **Deployment**: Automatic deployment on Replit with zero-downtime rolling updates. Supports manual and continuous deployment from Git.
- **Monitoring**: Integration with Replit's dashboard metrics for CPU, memory, network, and request rates. External monitoring with UptimeRobot, Sentry, and Plausible is recommended.
- **Backup & Recovery**: Code is backed up via Git. Media files in App Storage require periodic manual download. JSON data files are versioned with code.

## External Dependencies

The project relies on the following external services and integrations:

-   **Cloudflare R2**: Primary storage provider for media assets (audio and video files).
    -   **Required Environment Variables**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
-   **Replit App Storage**: Fallback storage solution for media assets.
    -   Uses two buckets: `music` for audio and `visuals` for video.
    -   **Required Environment Variables (if used as fallback)**: `MUSIC_BUCKET_ID`, `VISUALS_BUCKET_ID`.
-   **Plausible Analytics**: Optional, privacy-first analytics platform for tracking user engagement.
    -   **Required Environment Variable**: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.
    -   **Optional Environment Variable**: `NEXT_PUBLIC_PLAUSIBLE_API_HOST` (for self-hosted instances).
-   **UptimeRobot**: Recommended external service for uptime monitoring.
-   **Sentry**: Recommended external service for error tracking.
-   **PostgreSQL Database**: Replit-managed PostgreSQL database (Neon-backed) for user accounts, sessions, preferences, and chat history.
    -   **Required Environment Variable**: `DATABASE_URL` (auto-configured by Replit).
    -   **Database Management**: Use `npm run db:push` to sync schema changes, `npm run db:studio` to inspect data.
-   **Logging Webhook (Optional)**: For server-side logging.
    -   **Optional Environment Variables**: `LOGGING_WEBHOOK_URL`, `LOGGING_SHARED_SECRET`.