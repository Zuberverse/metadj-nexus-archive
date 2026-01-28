# MetaDJ Nexus — Authentication & Feedback System

> Comprehensive documentation for the auth system, feedback collection, and admin dashboard.

**Last Modified**: 2026-01-27 16:59 EST

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Route Structure](#route-structure)
4. [Authentication Flow](#authentication-flow)
5. [Environment Variables](#environment-variables)
6. [API Endpoints](#api-endpoints)
7. [Components](#components)
8. [Database Layer](#database-layer)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The MetaDJ Nexus authentication system provides:

- **User authentication** via email/password registration and login
- **Admin access** via database-backed admin user (username: "admin" + aliases)
- **Session management** using signed, HTTP-only cookies
- **Feedback collection** for bugs, features, ideas, and general feedback
- **Admin dashboard** for managing feedback and viewing analytics
- **Username alias system** for admin users (permanent "admin" username with additional aliases)

### Current Implementation (PostgreSQL via Neon + Drizzle)

Auth, feedback, and admin data run on Neon PostgreSQL with Drizzle ORM.
- `server/db.ts` handles the Neon connection (`DATABASE_URL`)
- `shared/schema.ts` defines the tables
- `server/storage.ts` provides typed CRUD operations

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Route Structure                           │
├─────────────────────────────────────────────────────────────────┤
│  /           → Landing page (public) or redirect to /app        │
│  /app        → Main application (authenticated users)           │
│  /admin      → Admin dashboard (admin only)                     │
│  /api/auth/* → Authentication API endpoints                     │
│  /api/feedback/* → Feedback API endpoints                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Data Storage                              │
├─────────────────────────────────────────────────────────────────┤
│  server/db.ts       → Neon PostgreSQL connection (DATABASE_URL) │
│  shared/schema.ts   → Drizzle schema (users, feedback, etc.)    │
│  server/storage.ts  → Typed CRUD for auth + admin + feedback    │
│  src/lib/feedback/storage.ts → Feedback storage wrapper (DB)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        Components                                │
├─────────────────────────────────────────────────────────────────┤
│  LandingPage     → Login/signup UI with platform overview       │
│  AccountPanel    → User settings (email/password update)        │
│  FeedbackModal   → Feedback submission form                     │
│  AdminDashboard  → Feedback management and analytics            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Route Structure

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page with login/signup; redirects to `/app` if authenticated |
| `/app` | Authenticated | Main application experience |
| `/admin` | Admin only | Administration dashboard |
| `/guide` | Public | Platform guide |
| `/terms` | Public | Terms of service |

### Route Protection

- **`/app/*`**: Requires valid session; redirects to `/` if not authenticated
- **`/admin/*`**: Requires admin session; redirects to `/app` if not admin

---

## Authentication Flow

### Registration

```
1. User submits email + username + password on landing page
2. POST /api/auth/register
3. Server validates email format and password strength
4. Server hashes password with Argon2id (OWASP-compliant)
5. Server creates user record in the database via `server/storage.ts`
6. Server creates session cookie
7. Client redirects to /app
```

### Login

```
1. User submits email (or admin username/alias) + password
2. POST /api/auth/login
3. Server checks for admin username ("admin") or admin alias
   - If "admin": checks if admin exists in database FIRST
     - If admin exists: verifies password against stored database hash
     - If no admin exists: bootstraps using ADMIN_PASSWORD env var (first-time only)
   - If admin alias: finds admin user and verifies password
   - If regular user: finds user in the database via `server/storage.ts`
4. Server verifies password (auto-migrates legacy PBKDF2 hashes to Argon2id)
5. Server creates session cookie
6. Client redirects to /app
```

> **Note**: After admin account is created in the database, the `ADMIN_PASSWORD` environment variable is no longer used for authentication. Login always uses the stored database hash.

### Session Management

Sessions are stored in HTTP-only cookies with:
- **HMAC-SHA256 signature** for integrity
- **Expiration timestamp** for automatic invalidation
- **User ID, email, username, and admin flag** for authorization

```typescript
interface Session {
  userId: string;
  email: string;
  username: string;
  isAdmin: boolean;
  emailVerified: boolean;
  expiresAt: number; // Unix timestamp
}
```

### Logout

```
1. User clicks logout
2. POST /api/auth/logout
3. Server clears session cookie
4. Client redirects to /
```

---

## Environment Variables

Add these to your `.env.local` file:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
AUTH_SECRET=your-auth-secret-min-32-chars-here  # Session signing (min 32 chars; required in all envs)

# Bootstrap Only (first-time admin creation)
ADMIN_PASSWORD=your-admin-password-here         # Only used to create initial admin account

# Optional
AUTH_SESSION_DURATION=604800                     # Session duration in seconds (default: 7 days)
AUTH_REGISTRATION_ENABLED=true                   # Enable/disable user registration

# Local Development (no database required)
E2E_AUTH_BYPASS=false                            # Bypass auth entirely (non-production only)
E2E_ADMIN=false                                  # Make bypass session an admin user
```

> **Note**: `ADMIN_PASSWORD` is only used for first-time admin account creation (bootstrap). After the admin account exists in the database, authentication always uses the stored password hash. You can remove or change this env var after bootstrap without affecting admin login.

`DATABASE_URL` is required for auth/admin/feedback endpoints and MetaDJai conversations.

### Generating AUTH_SECRET

```bash
# macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Authenticate user |
| `/api/auth/register` | POST | Create new user account |
| `/api/auth/logout` | POST | Clear session |
| `/api/auth/session` | GET | Get current session data |
| `/api/auth/account` | PATCH | Update email, username, or password |
| `/api/auth/check-availability` | POST | Check username/email availability |

#### POST /api/auth/login

```json
// Request
{
  "email": "user@example.com",  // or "admin"
  "password": "password123"
}

// Response (success)
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "zuberant",
    "isAdmin": false,
    "emailVerified": false
  }
}

// Response (error)
{
  "success": false,
  "message": "Invalid email or password"
}
```

#### POST /api/auth/register

```json
// Request
{
  "email": "user@example.com",
  "username": "zuberant",
  "password": "password123",  // min 8 characters
  "termsAccepted": true
}

// Response (success)
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "zuberant",
    "isAdmin": false,
    "emailVerified": false
  }
}
```

**Rate Limit**: 429 with `Retry-After` header when too many registration attempts are made.

#### PATCH /api/auth/account

```json
// Update email
{
  "action": "updateEmail",
  "email": "new@example.com"
}

// Update password
{
  "action": "updatePassword",
  "currentPassword": "old123",
  "newPassword": "new123456"
}

// Update username
{
  "action": "updateUsername",
  "username": "newname"
}
```

#### POST /api/auth/check-availability

Checks whether a username or email is available.

```json
// Request
{
  "type": "username", // or "email"
  "value": "zuberant",
  "excludeUserId": "user_123"
}

// Response
{
  "success": true,
  "available": true
}
```

**Rate Limit**: 429 with `Retry-After` header when too many checks are made.

### Feedback

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/api/feedback` | GET | Auth | List feedback (admin: all, user: own; supports `page`, `limit`, `type`, `status`) |
| `/api/feedback` | POST | Auth | Submit feedback |
| `/api/feedback/[id]` | GET | Auth | Get feedback item |
| `/api/feedback/[id]` | PATCH | Admin | Update feedback status |
| `/api/feedback/[id]` | DELETE | Admin | Delete feedback |

#### POST /api/feedback

```json
// Request
{
  "type": "bug",           // bug | feature | idea | feedback
  "title": "Login issue",
  "description": "Cannot login with email...",
  "severity": "high"       // low | medium | high | critical (bugs only)
}

// Response
{
  "success": true,
  "feedback": {
    "id": "fb_123",
    "type": "bug",
    "title": "Login issue",
    "description": "...",
    "severity": "high",
    "status": "new",
    "createdAt": "2026-01-13T..."
  }
}
```

---

### Admin

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/api/admin/users` | GET | Admin | Paginated user list (`page`, `limit`, `search`) |
| `/api/admin/users/stats` | GET | Admin | User stats (total, active, newThisWeek, adminCount) |
| `/api/admin/feedback/stats` | GET | Admin | Feedback stats (total, byType, byStatus) |
| `/api/admin/analytics` | GET | Admin | Analytics summary (`days`, max 365) |

---

## Components

### LandingPage

Location: `src/components/landing/LandingPage.tsx`

Features:
- Hero section with platform branding
- Feature highlights grid
- Login/signup form toggle
- Gradient backgrounds and glassmorphism

### AccountPanel

Location: `src/components/account/AccountPanel.tsx`

Features:
- Slide-out panel design
- Email update form
- Password update form
- Username update form (for regular users: replaces username; for admin: adds alias)
- Feedback submission section
- Admin dashboard link (for admins)
- Logout button

**Admin-Specific UI:**
- Button shows "Add Username Alias" instead of "Update Username"
- Form shows "Primary Username" (locked) and "New Alias" field
- Success message confirms alias was added
- Explanation text about permanent "admin" username

### FeedbackModal

Location: `src/components/feedback/FeedbackModal.tsx`

Features:
- Feedback type selection (bug, feature, idea, feedback)
- Severity selection for bugs
- Title and description fields
- Character count
- Success/error messages

### AdminDashboard

Location: `src/components/admin/AdminDashboard.tsx`

Features:
- Overview tab with stats
- Feedback list with pagination
- Feedback detail view
- Status update controls
- Delete functionality
- Analytics range selector (7/30/90/180/365 days)

---

## Database Layer

Auth, feedback, and admin data are stored in Neon PostgreSQL using Drizzle ORM.

### Core Files
- `server/db.ts` — Neon connection + pooling (reads `DATABASE_URL`)
- `shared/schema.ts` — Drizzle schema (users, sessions, preferences, analytics, conversations, feedback)
- `server/storage.ts` — Typed CRUD operations for auth/admin/analytics/conversations/feedback
- `src/lib/auth/users.ts` — User authentication logic (login, registration, username updates)
- `drizzle.config.ts` — Drizzle Kit configuration

### Users Table Schema

Key fields in the `users` table:

| Field | Type | Description |
|-------|------|-------------|
| `id` | varchar(64) | Primary key |
| `email` | varchar(255) | User email (unique) |
| `username` | varchar(30) | Primary username (unique) |
| `usernameAliases` | jsonb | Array of additional usernames (admin only) |
| `passwordHash` | varchar(255) | Argon2id hashed password (auto-migrates legacy PBKDF2) |
| `isAdmin` | boolean | Admin flag (default: false) |
| `termsVersion` | varchar(20) | Accepted terms version |
| `termsAcceptedAt` | timestamp | When terms were accepted |

### Admin Alias Storage Functions

Located in `server/storage.ts`:

| Function | Description |
|----------|-------------|
| `findAdminUser()` | Find first user with `isAdmin=true` |
| `getAdminUsernameAliases()` | Get all aliases from admin's `usernameAliases` array |
| `addUsernameAlias(userId, alias)` | Add an alias to admin's array |
| `isAdminUsernameAlias(username)` | Check if username is "admin" or an active alias |
| `findAdminByAlias(alias)` | Find admin user by any of their aliases |

### Setup

1. **Set `DATABASE_URL`** (Neon or compatible Postgres).
2. **Apply schema**:
   ```bash
   npm run db:push
   ```
3. **Optional tooling**:
   - `npm run db:generate` (generate migrations)
   - `npm run db:studio` (DB browser)

---

## Security Considerations

### Current Implementation

- **Argon2id password hashing** (OWASP-compliant; auto-migrates legacy PBKDF2 hashes on login)
- **HMAC-SHA256 session signatures**
- **HTTP-only cookies** prevent XSS session theft
- **SameSite=Lax** prevents CSRF on same-site requests

### Production Recommendations

1. **Use HTTPS** in production (enforced via `secure: true` cookie flag)
2. **Rate limit** login attempts (Upstash Redis already configured)
3. **Add CSRF tokens** for sensitive operations
4. **Implement password policies**:
   - Minimum length (already 8 chars)
   - Complexity requirements
   - Breach detection (e.g., HaveIBeenPwned API)
5. **Add 2FA** for admin accounts
6. **Audit logging** for security-sensitive actions

### Email Verification — Planned (schema ready, routes pending)

**Status:** Email verification is **not enforced**. Users can register and use the platform immediately. The `emailVerified` field defaults to `false` but does not block access. The database schema and storage layer are fully prepared; only API routes and the email transport remain.

**Infrastructure Ready:**
- `email_verification_tokens` table with token hash, expiration, user linking, IP audit trail
- Unique index on `tokenHash` for O(1) lookups
- `users.emailVerified` boolean field tracks verification status
- Storage functions in `server/storage.ts`: `createEmailVerificationToken()`, `findEmailVerificationToken()`, `findEmailVerificationByToken()`, `consumeEmailVerificationToken()`, `deleteVerificationTokensForUser()`

**Recommended Email Transport: Resend**

When ready to implement, use **Resend** for its simplicity and free tier (3,000 emails/month).

**Setup Steps:**
1. Create a Resend account at https://resend.com
2. Verify your domain (or use Resend's test domain for development)
3. Add `RESEND_API_KEY` to environment secrets
4. Install the package: `npm install resend`

**Implementation Outline:**

```typescript
// src/lib/email/resend.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: 'MetaDJ Nexus <noreply@yourdomain.com>',
    to: email,
    subject: 'Verify your email',
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
  });
}
```

**Remaining Work:**
1. On registration: Generate token, hash with SHA-256, store hash via `createEmailVerificationToken()`, email the raw token
2. Add `/api/auth/verify-email` route: hash incoming token, call `findEmailVerificationByToken()`, then `consumeEmailVerificationToken()` + `updateUserEmailVerified()`
3. Add UI prompts for unverified users (non-blocking banner)
4. Add resend verification email endpoint

**Files to Create/Modify:**
| File | Action | Purpose |
|------|--------|---------|
| `src/lib/email/resend.ts` | Create | Email sending service |
| `src/app/api/auth/verify-email/route.ts` | Create | Token verification endpoint |
| `src/app/api/auth/register/route.ts` | Modify | Add email sending after registration |
| `src/app/api/auth/resend-verification/route.ts` | Create | Resend verification email |
| `src/components/account/AccountPanel.tsx` | Modify | Add unverified email banner |

**Cost:** Resend free tier includes 3,000 emails/month, sufficient for MVP growth.

### Password Reset — Planned (schema ready, routes pending)

**Status:** Password reset is **not yet implemented**. Authenticated users can change their password via the Account Panel (requires current password). The forgot-password flow for unauthenticated users requires API routes and email transport.

**Infrastructure Ready:**
- `password_resets` table with token hash, expiration, single-use enforcement, IP audit trail
- Unique index on `tokenHash` for O(1) lookups; cascade on user deletion
- Storage functions in `server/storage.ts`: `createPasswordResetToken()`, `findPasswordResetByToken()`, `markPasswordResetUsed()`, `deletePasswordResetsForUser()`

**Planned Flow:**

```
1. User submits email on forgot-password form
2. POST /api/auth/forgot-password
3. Server looks up user by email (always returns success to prevent enumeration)
4. If user exists: generate random token, SHA-256 hash it, store hash via createPasswordResetToken()
5. Email the raw token as a reset link
6. User clicks link → GET /reset-password?token=xxx (client-side page)
7. User submits new password + token
8. POST /api/auth/reset-password
9. Server hashes incoming token, calls findPasswordResetByToken()
10. If valid: update password via updateUserPassword(), mark token used, delete other tokens
11. Redirect to login
```

**Security Considerations:**
- Tokens expire after 1 hour (configurable)
- Single-use: marked via `usedAt` timestamp
- IP address captured for audit trail
- Response always returns success to prevent email enumeration
- Rate-limited to prevent abuse (Upstash or in-memory)
- All existing sessions should be invalidated after password reset

**Remaining Work:**
1. Create forgot-password and reset-password API routes
2. Create reset-password client page
3. Add "Forgot password?" link to login form
4. Share the Resend email transport with email verification

**Files to Create/Modify:**
| File | Action | Purpose |
|------|--------|---------|
| `src/lib/email/resend.ts` | Create (shared with email verification) | Email sending service |
| `src/app/api/auth/forgot-password/route.ts` | Create | Accept email, generate + email token |
| `src/app/api/auth/reset-password/route.ts` | Create | Validate token, update password |
| `src/app/reset-password/page.tsx` | Create | Reset password form UI |
| `src/components/landing/LandingPage.tsx` | Modify | Add "Forgot password?" link |

### Admin Account Security

The admin account is a **database-backed user** with special handling:

**Bootstrap Process:**
1. First login with username `admin` + `ADMIN_PASSWORD` creates the admin user in the database
2. Admin user is created with `isAdmin: true`, email `admin@metadj.local`, username `admin`
3. Password is hashed and stored in the database (not the env var)
4. Subsequent logins verify against the stored password hash

**Admin Capabilities:**
- Full platform access plus admin dashboard
- Can edit email, password, and username via Account Panel
- Username updates add **aliases** instead of replacing (see below)
- Database `isAdmin` flag can be used to manually promote other users

**Username Alias System:**
The admin username "admin" is permanent and cannot be changed. When admin updates their username:

| Action | Result |
|--------|--------|
| Update username to "djmaster" | Adds "djmaster" as an alias |
| Login with "admin" | Works (primary username) |
| Login with "djmaster" | Works (alias) |
| Remove alias from DB | Alias becomes available for regular users |

**Database Fields:**
- `username`: Primary username (always "admin" for admin user)
- `usernameAliases`: JSON array of additional usernames (e.g., `["djmaster", "creator"]`)

**Reserved Username Logic:**
- "admin" is always reserved
- All active admin aliases are reserved
- Regular users cannot register or change to reserved usernames
- If an alias is manually removed from `usernameAliases` array, it becomes available

**Manual Alias Removal:**
To remove an alias, edit the admin user record in the database:
```sql
UPDATE users SET username_aliases = '["remaining_alias"]' WHERE username = 'admin';
```

### Terms of Service Acceptance Flow

The platform tracks which version of Terms of Service each user has accepted:

**Database Fields:**
- `termsVersion`: The version string the user accepted (e.g., "2026-01-15")
- `termsAcceptedAt`: Timestamp when they accepted

**Flow:**
1. New users accept terms during registration (stored with current `TERMS_VERSION`)
2. On login, session includes `termsVersion`
3. AuthContext compares user's version to current `TERMS_VERSION`
4. If mismatch → `TermsUpdateModal` renders as blocking overlay
5. User clicks "Accept" → calls `/api/auth/accept-terms`
6. API updates DB → session refreshes → modal closes

**Key Files:**
| File | Purpose |
|------|---------|
| `src/lib/constants/terms.ts` | `TERMS_VERSION` constant |
| `src/components/modals/TermsUpdateModal.tsx` | Blocking modal UI |
| `src/app/api/auth/accept-terms/route.ts` | Accept terms endpoint |
| `server/storage.ts` | `updateUserTerms()` function |
| `src/contexts/AuthContext.tsx` | Modal rendering logic |

**Updating Terms:**
1. Update content in `src/app/terms/page.tsx`
2. Update `TERMS_VERSION` in `src/lib/constants/terms.ts`
3. All users will see the modal on next login

---

## Troubleshooting

### Common Issues

**"Invalid email or password" on login**
- Verify email is correct (case-insensitive)
- For admin first login (bootstrap): ensure `ADMIN_PASSWORD` is set in `.env.local`
- For admin subsequent logins: use actual email or username alias (not just "admin" if password was changed)
- For admin alias login: verify the alias exists in the admin's `usernameAliases` array
- Ensure `DATABASE_URL` is set and reachable

**"DATABASE_URL environment variable is not set"**
- Set `DATABASE_URL` in `.env.local` or hosting secrets
- Run `npm run db:push` after provisioning the database

**Session not persisting**
- Verify `AUTH_SECRET` is set and at least 32 characters
- Check cookie settings in browser dev tools
- Ensure HTTPS in production

**Feedback not saving**
- Verify `DATABASE_URL` and database connectivity
- Confirm `feedback` table exists (run `npm run db:push`)
- Check server logs for errors

**Admin dashboard returns 403**
- Verify logged in as admin user
- Check session cookie contains `isAdmin: true`
- Clear cookies and re-login as admin

### Local Development Testing (No Database)

You can test the full app locally **without a database** using the E2E auth bypass. This is ideal for UI development, MetaDJai settings testing, and localStorage-based features.

**Setup:**

Add to your `.env.local`:

```bash
NODE_ENV=development
AUTH_SECRET=LocalDevSecretKeyAtLeast32Characters!
E2E_AUTH_BYPASS=true
E2E_ADMIN=true
```

| Variable | Purpose |
|----------|---------|
| `E2E_AUTH_BYPASS=true` | Bypasses all auth — no login required, no database needed |
| `E2E_ADMIN=true` | Makes the bypass session an admin user (access to `/admin`, admin UI) |
| `E2E_ADMIN=false` (or omitted) | Regular user session (no admin access) |

**What works without a database:**
- Full app UI (Hub, Cinema, Wisdom, Journal)
- MetaDJai chat interface and personalization settings (localStorage)
- Audio playback and queue management (localStorage)
- Admin dashboard UI (with `E2E_ADMIN=true`)
- All localStorage-persisted features (volume, cinema scene, journal entries)
- Preferences API (returns in-memory defaults)

**What requires a database:**
- User registration and login (bypassed entirely)
- Feedback submission and management
- Persistent server-side preferences
- MetaDJai conversation history (server-stored)
- Admin user management

**How it works:**

When `E2E_AUTH_BYPASS=true` and `NODE_ENV !== 'production'`, the `getSession()` function returns a mock session instead of reading cookies:

- With `E2E_ADMIN=true`: Returns admin session (`id: 'e2e-admin'`, `username: 'admin'`, `isAdmin: true`)
- Without `E2E_ADMIN`: Returns regular user session (`id: 'e2e-user'`, `username: 'e2e'`, `isAdmin: false`)

API routes that depend on database storage (preferences, conversations, journal) detect the bypass via `isE2EAuthBypassEnabled()` and return in-memory defaults instead of querying Postgres.

**Quick start:**

```bash
# 1. Copy env template
cp .env.example .env.local

# 2. Set bypass variables in .env.local
#    E2E_AUTH_BYPASS=true
#    E2E_ADMIN=true
#    AUTH_SECRET=LocalDevSecretKeyAtLeast32Characters!

# 3. Run dev server
npm run dev

# 4. Open https://localhost:8100 — you're logged in as admin
```

> **Safety**: E2E bypass is blocked in production (`NODE_ENV=production`). It cannot be accidentally enabled on deployed instances.

### Debug Mode

Add to `.env.local` for detailed logging:

```bash
DEBUG_AUTH=true
```

Then check server console for auth-related logs prefixed with `[Auth]`.

---

## File Reference

```
src/
├── app/
│   ├── page.tsx                    # Root page (landing/redirect)
│   ├── app/
│   │   ├── layout.tsx              # Protected app layout
│   │   └── page.tsx                # App entry point
│   ├── admin/
│   │   ├── layout.tsx              # Admin-protected layout
│   │   └── page.tsx                # Admin dashboard
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts      # Login endpoint
│       │   ├── register/route.ts   # Registration endpoint
│       │   ├── logout/route.ts     # Logout endpoint
│       │   ├── session/route.ts    # Session check endpoint
│       │   └── account/route.ts    # Account update endpoint
│       └── feedback/
│           ├── route.ts            # List/create feedback
│           └── [id]/route.ts       # Get/update/delete feedback
├── components/
│   ├── landing/
│   │   └── LandingPage.tsx         # Public landing page
│   ├── account/
│   │   └── AccountPanel.tsx        # Account settings panel
│   ├── feedback/
│   │   └── FeedbackModal.tsx       # Feedback submission modal
│   └── admin/
│       └── AdminDashboard.tsx      # Admin dashboard
├── contexts/
│   └── AuthContext.tsx             # Client-side auth state
├── lib/
│   ├── auth/
│   │   ├── types.ts                # Auth type definitions
│   │   ├── session.ts              # Session management
│   │   ├── users.ts                # User storage operations
│   │   ├── password.ts             # Password hashing
│   │   └── index.ts                # Auth module exports
│   └── feedback/
│       ├── types.ts                # Feedback type definitions
│       ├── storage.ts              # Feedback storage operations (DB)
│       └── index.ts                # Feedback module exports
server/
├── db.ts                           # Neon connection (DATABASE_URL)
└── storage.ts                      # Drizzle CRUD operations
shared/
└── schema.ts                       # Drizzle schema (users, feedback, etc.)
```

---

## Next Steps

1. **Integrate components into app**:
   - Add AccountPanel toggle to app header
   - Add FeedbackModal trigger button

2. **Test the flow**:
   - Register a new user
   - Login/logout
   - Submit feedback
   - Login as admin and review feedback

3. **Production preparation**:
   - Set strong `AUTH_SECRET`
   - Set secure `ADMIN_PASSWORD`
   - Confirm `DATABASE_URL` is set and schema is applied (`npm run db:push`)
   - Enable rate limiting
   - Add monitoring/alerts
