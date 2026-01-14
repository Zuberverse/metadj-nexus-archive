# Replit Deployment Guide — MetaDJ Nexus

## Overview

MetaDJ Nexus is a platform hub connecting human vision with AI-driven execution for the Metaverse, optimized for deployment on Replit. It leverages Replit's managed infrastructure and Cloudflare R2 for media streaming, with a zero-configuration deployment workflow. The project aims to provide a creative and immersive experience without the complexities of server management.

Key capabilities include:
- Managed infrastructure and zero-downtime deployments.
- Media streaming exclusively from Cloudflare R2 (zero egress fees, S3-compatible).
- Automatic HTTPS and SSL certificate management.
- Integration with analytics and monitoring tools.

## User Preferences

- I want iterative development.
- Ask before making major changes.
- Provide detailed explanations for complex concepts.
- I prefer clear and concise communication.

## Recent Changes (January 2026)

### UI/UX Improvements
- **Clickable Logo**: MetaDJ Nexus logo in header is now clickable, navigates to Hub view (both mobile and desktop variants)
- **Logo Accessibility**: Added keyboard-accessible focus styles with purple ring indicators for improved accessibility
- **Collection Details Spacing**: Increased bottom padding in About Collection container to prevent text from touching edges
- **Simplified Header**: Removed admin badge and feedback button from header; both now accessible via Account panel
- **Account Panel Redesign**:
  - Cinzel font (`font-heading`) applied to all headers, buttons, and labels for consistency with Music/MetaDJai panels
  - Background gradient blobs matching other panel styling
  - Consistent button styling with borders (border-white/15), hover effects, and rounded corners
  - View-based navigation: main > email update, password change, or feedback submission
  - Feedback form integrated directly into panel (no longer a popup modal)
  - Feedback types: General Feedback, Feature Request, Creative Idea, Bug Report with severity levels for bugs
  - Required field validation: Submit button disabled until Title and Description are filled
  - **Panel Behavior**: Removed click-away/backdrop-close functionality to match MetaDJai panel behavior. Panel closes via X button or avatar button toggle only.
- **Header Cleanup**: Removed redundant info button (Guide accessible via footer)

### Responsive Navigation
- **Desktop breakpoints**:
  - `<1100px`: Mobile bottom navigation
  - `1100px-1299px`: Dropdown navigation menu (compact view)
  - `1300px+`: Full horizontal navigation tabs
- Prevents tab cutoff on smaller desktop windows

### Z-Index & Overlay Fixes
- Fixed dropdown menus being cut off within header by removing `overflow-hidden`
- Hub dropdown z-index increased to `z-[110]` (above header's `z-100`)
- CinemaSceneSelector dropdown z-index increased to `z-50`
- All overlay/popup menus now render on top layer correctly
- **Search Dropdown Portal**: Search results dropdown now renders via React portal to document.body, fixing clipping issues caused by LeftPanel's CSS transform context

### Search Improvements
- **Custom Placeholder**: SearchBar component now accepts customizable placeholder prop
- **Browse Tab**: Search placeholder in Browse tab shows "Search Music..." for clearer context

### Layout Fixes
- **Hub Scrolling Fix**: Fixed unnecessary scrolling on large desktop Hub view by restructuring flex layout
  - DesktopShell outer container now uses `flex flex-col` layout
  - PanelLayout main element changed from `min-h-screen` to `flex-1` to properly fill available space without forcing extra height
- **Dropdown Button Spacing**: Standardized padding for dropdown buttons with chevron icons to `px-4 py-2` across all navigation dropdowns (UserGuideOverlay, AdminDashboard) to match AppHeader pattern

### Authentication Forms
- Added loading states: "Signing in..." / "Creating account..." with spinner during submission

### Admin Navigation
- **Admin Access**: Admin dashboard accessible via Account panel "Open Admin Dashboard" button (admins only)
- **Keyboard Shortcut**: Ctrl/Cmd+Shift+A to toggle between /admin and /app views

### Account Access
- **User Account Button**: User icon button in desktop header (visible at 1100px+) for quick access to account settings panel

### Footer Updates
- All footer text now uses Cinzel font (`font-heading`) for consistent typography
- Removed @axe-core/react debug tool (was causing debug box to appear at bottom of page)

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

**Design System & Typography:**
- **Heading Font**: Cinzel (`font-heading`) - Used for buttons, navigation labels, headings, and emphasis
- **Body Font**: System default sans-serif
- **Z-Index Hierarchy**:
  - `z-100`: Header, main overlays (WelcomeOverlay, MetaDJai popovers)
  - `z-[110]`: Header dropdowns (must appear above header)
  - `z-[130]`: Search overlay
  - `z-[200]`: Critical alerts (OfflineIndicator)
  - `z-50`: Component-level dropdowns (CinemaSceneSelector, TrackOptionsMenu)
- **Button Styling Conventions**:
  - Text-only buttons use Cinzel font (`font-heading font-semibold`)
  - Pill-shaped buttons: `rounded-full` with appropriate padding
  - Interactive states: hover with `hover:bg-white/10` or gradient highlights

**Technical Implementations & Feature Specifications:**
- **Media Streaming**: Supports HTTP 206 Partial Content for audio and video seeking and progressive loading.
- **Caching Strategy**: Utilizes `Cache-Control: public, max-age=31536000, immutable` for media files, enabling long-lived caching. Filenames are versioned to bust cache.
- **Data Storage**: PostgreSQL database via Drizzle ORM for user data, preferences, and chat history. Content data uses JSON files (`src/data/music.json`, `src/data/collections.json`) versioned in Git.
- **Database ORM**: Drizzle ORM with Neon serverless PostgreSQL driver.
- **Authentication**: Cookie-based sessions with HMAC-signed tokens. User accounts stored in PostgreSQL with bcrypt password hashing. Admin user via ADMIN_PASSWORD environment variable. Registration requires email, username, and password with real-time availability checking.
- **API Security**: Includes rate limiting, input validation, and non-disclosure of sensitive information in error messages.
- **Deployment**: Automatic deployment on Replit with zero-downtime rolling updates. Supports manual and continuous deployment from Git.
- **Monitoring**: Integration with Replit's dashboard metrics for CPU, memory, network, and request rates. External monitoring with UptimeRobot, Sentry, and Plausible is recommended.
- **Backup & Recovery**: Code is backed up via Git. Media files in App Storage require periodic manual download. JSON data files are versioned with code.

## External Dependencies

The project relies on the following external services and integrations:

-   **Cloudflare R2**: Exclusive storage provider for media assets (audio and video files). No fallback storage.
    -   Bucket: `metadj-nexus-media` with `music/` and `visuals/` prefixes.
    -   **Required Environment Variables**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
-   **Plausible Analytics**: Optional, privacy-first analytics platform for tracking user engagement.
    -   **Required Environment Variable**: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`.
    -   **Optional Environment Variable**: `NEXT_PUBLIC_PLAUSIBLE_API_HOST` (for self-hosted instances).
-   **UptimeRobot**: Recommended external service for uptime monitoring.
-   **Sentry**: Recommended external service for error tracking.
-   **PostgreSQL Database**: Replit-managed PostgreSQL database (Neon-backed) for user accounts, sessions, preferences, chat history, and analytics.
    -   **Required Environment Variable**: `DATABASE_URL` (auto-configured by Replit).
    -   **Database Management**: Use `npm run db:push` to sync schema changes, `npm run db:studio` to inspect data.
    -   **Database Schema** (10 tables): `users`, `sessions`, `user_preferences`, `conversations`, `messages`, `feedback`, `login_attempts`, `password_resets`, `analytics_events`, `email_verification_tokens`.
    -   **Admin Dashboard**: Available at `/admin` with 4 tabs: Overview (stats), Feedback (management), Users (SQL-paginated list), Analytics (event tracking). Requires `ADMIN_PASSWORD` secret.
    -   **Conversation Archive**: MetaDJai conversations support archive/unarchive/permanent delete with `isArchived` and `archivedAt` columns on conversations table.
    -   **Username System**: Users can register with a unique username (3-20 chars, lowercase alphanumeric + underscores, cannot start with number). Reserved names blocked (admin, root, system, metadj, etc.). Username availability checked via `/api/auth/check-availability` endpoint. Users can update username in account settings.
-   **Logging Webhook (Optional)**: For server-side logging.
    -   **Optional Environment Variables**: `LOGGING_WEBHOOK_URL`, `LOGGING_SHARED_SECRET`.