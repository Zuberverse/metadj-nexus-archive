# Replit Deployment Guide — MetaDJ Nexus

## Overview

MetaDJ Nexus is a platform connecting human vision with AI-driven execution for the Metaverse, optimized for deployment on Replit. It provides a creative and immersive experience leveraging Replit's managed infrastructure and Cloudflare R2 for media streaming. Key capabilities include zero-downtime deployments, S3-compatible media streaming with zero egress fees, automatic HTTPS, and integration with analytics and monitoring. The project aims to offer an immersive, creative experience in the Metaverse, removing complexities of server management and focusing on user engagement and scalability.

## User Preferences

- I want iterative development.
- Ask before making major changes.
- Provide detailed explanations for complex concepts.
- I prefer clear and concise communication.

## System Architecture

MetaDJ Nexus is built on a modern web stack for performance and scalability on Replit.

**Platform & Frameworks:**
- **Platform**: Replit
- **Runtime**: Node.js 20.19+
- **Framework**: Next.js 16.1.1 (App Router)
- **Frontend**: React 19.2.0
- **Build Tool**: Next.js (Turbopack/webpack)
- **Package Manager**: npm

**UI/UX Decisions:**
- Focuses on immersive audio and video experiences with features like scrubbing, volume control, and full-screen cinema video.
- **Design System**: Uses Cinzel for headings, Poppins for body text, and JetBrains Mono for code.
- **Button Styling**: Transparent backgrounds, hover effects, and standardized sizing.
- **Z-Index Hierarchy**: Clearly defined `z-index` values for proper layering of UI elements.
- **Wisdom Content UI**: Features adaptive title font sizing, reading progress bar, table of contents for multi-section content, and streamlined list views.

**Technical Implementations & Feature Specifications:**
- **Media Streaming**: Supports HTTP 206 Partial Content for efficient audio/video seeking.
- **Caching**: Aggressive caching (`Cache-Control: public, max-age=31536000, immutable`) for versioned media files.
- **Data Storage**: PostgreSQL via Drizzle ORM for user data, preferences, and chat history. Content data (music, collections) is managed via versioned JSON files.
- **Authentication**: Cookie-based sessions with HMAC-signed tokens, PBKDF2 password hashing, and admin access via environment variable. Includes rate limiting, origin validation for CSRF protection, and terms of service versioning with acceptance tracking.
- **Deployment**: Automatic and continuous deployment on Replit with zero-downtime rolling updates.
- **Monitoring**: Integration with Replit's dashboard metrics and internal health endpoints.
- **Backup & Recovery**: Git-versioned code, Cloudflare R2 for media, and versioned JSON data files.
- **Audio Settings & Crossfade**: Audio settings are stored in the database for authenticated users (with localStorage as offline backup) and include a 3-second seamless crossfade feature between tracks using dual audio elements and sine/cosine easing curves.
- **Authentication Policy**: Guest access is not supported. All users must create an account and log in to access the platform experience. The landing page (`/`) and terms page (`/terms`) are the only public routes.
- **AI Integration (MetaDJai)**: Built with Vercel AI SDK, it uses tool-based data retrieval for on-demand information from the catalog, recommendations, wisdom content, and platform help. It includes robust request limits, tool result limits, spam detection, and security measures like input sanitization, output validation, injection protection, and rate limiting.
- **Wisdom Content System**: Provides curated content across Guides, Thoughts, and Reflections with specific content structures and UI design standards. Includes a dedicated search bar on the Wisdom dashboard to search across all wisdom content types.
- **Journal System**: Private journaling with database persistence for authenticated users, markdown support, speech-to-text, and encrypted export/import. Features include auto-save (1.5s debounce after changes), auto-delete of empty entries (if both title and content are cleared), per-entry export buttons (in list view and editing toolbar), and a dedicated search bar to filter entries. The "Back to Journal Log" button exits the editor while auto-save handles persistence.
- **Search Segregation**: Music search bars (left panel browse, header overlay) only show music, collections, and playlists. Wisdom and Journal have their own dedicated search functionality within their respective views.
- **Admin Dashboard**: A virtual admin user (authenticated via `ADMIN_PASSWORD` environment variable) provides access to platform management and analytics, including event tracking data with visualizations and configurable date ranges.
- **Terms of Service System**: Versioned terms (TERMS_VERSION in src/lib/constants/terms.ts) with acceptance tracking in the database. TermsUpdateModal blocks app access until users accept updated terms. Existing users see the modal on next login after terms update.

## External Dependencies

-   **Cloudflare R2**: Exclusive storage for all media assets (audio, video).
-   **Plausible Analytics**: Optional, privacy-first analytics.
-   **PostgreSQL Database**: Replit-managed (Neon-backed) for user data, sessions, preferences, chat history, and analytics.
-   **UptimeRobot**: Recommended for external uptime monitoring.
-   **Sentry**: Recommended for external error tracking.
-   **Logging Webhook**: Optional for server-side logging.