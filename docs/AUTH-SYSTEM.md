# MetaDJ Nexus — Authentication & Feedback System

> Comprehensive documentation for the auth system, feedback collection, and admin dashboard.

**Last Modified**: 2026-01-13 14:04 EST

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Route Structure](#route-structure)
4. [Authentication Flow](#authentication-flow)
5. [Environment Variables](#environment-variables)
6. [API Endpoints](#api-endpoints)
7. [Components](#components)
8. [Database Migration Guide](#database-migration-guide)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The MetaDJ Nexus authentication system provides:

- **User authentication** via email/password registration and login
- **Admin access** via special admin account (username: "admin")
- **Session management** using signed, encrypted cookies
- **Feedback collection** for bugs, features, ideas, and general feedback
- **Admin dashboard** for managing feedback and viewing analytics

### Current Implementation (JSON-Based)

The current implementation uses JSON files for storage, suitable for:
- Development environments
- Single-instance deployments (like Replit)
- Quick prototyping

For production multi-instance deployments, migrate to a database (see [Database Migration Guide](#database-migration-guide)).

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
│  data/users.json    → User accounts (email, password hash)      │
│  data/feedback.json → Feedback items                            │
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
1. User submits email + password on landing page
2. POST /api/auth/register
3. Server validates email format and password strength
4. Server hashes password with PBKDF2
5. Server creates user record in data/users.json
6. Server creates session cookie
7. Client redirects to /app
```

### Login

```
1. User submits email/username + password
2. POST /api/auth/login
3. Server checks for admin username ("admin")
   - If admin: validates against ADMIN_PASSWORD env var
   - If user: finds user in data/users.json
4. Server verifies password
5. Server creates session cookie
6. Client redirects to /app
```

### Session Management

Sessions are stored in HTTP-only cookies with:
- **HMAC-SHA256 signature** for integrity
- **Expiration timestamp** for automatic invalidation
- **User ID, email, and admin flag** for authorization

```typescript
interface Session {
  userId: string;
  email: string;
  isAdmin: boolean;
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
AUTH_SECRET=your-auth-secret-min-32-chars-here  # Session encryption (min 32 chars)
ADMIN_PASSWORD=nexusadmin0357                    # Admin account password

# Optional
AUTH_SESSION_DURATION=604800                     # Session duration in seconds (default: 7 days)
AUTH_REGISTRATION_ENABLED=true                   # Enable/disable user registration
```

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
| `/api/auth/account` | PATCH | Update email or password |

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
    "isAdmin": false
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
  "password": "password123"  // min 8 characters
}

// Response (success)
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "isAdmin": false
  }
}
```

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
```

### Feedback

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/api/feedback` | GET | Auth | List feedback (admin: all, user: own) |
| `/api/feedback` | POST | Public | Submit feedback |
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
- Admin dashboard link (for admins)
- Logout button

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
- Feedback list with filtering
- Feedback detail view
- Status update controls
- Delete functionality

---

## Database Migration Guide

For production deployments, migrate from JSON files to a database.

### Recommended: Supabase

1. **Create Supabase project** at https://supabase.com

2. **Create tables**:

```sql
-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback table
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'idea', 'feedback')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in-progress', 'resolved', 'closed')),
  user_id UUID REFERENCES users(id),
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
```

3. **Add environment variables**:

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # For server-side operations
```

4. **Install Supabase client**:

```bash
npm install @supabase/supabase-js
```

5. **Update storage files**:
   - Replace `src/lib/auth/users.ts` with Supabase queries
   - Replace `src/lib/feedback/storage.ts` with Supabase queries

### Alternative: PostgreSQL with Prisma

1. **Install dependencies**:

```bash
npm install prisma @prisma/client
npx prisma init
```

2. **Define schema** in `prisma/schema.prisma`:

```prisma
model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String
  isAdmin      Boolean    @default(false)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  feedback     Feedback[]
}

model Feedback {
  id          String   @id @default(cuid())
  type        String
  title       String
  description String
  severity    String?
  status      String   @default("new")
  userId      String?
  userEmail   String?
  user        User?    @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

3. **Run migrations**:

```bash
npx prisma migrate dev
```

### Session Storage Upgrade

For production, consider:
- **Redis sessions** via Upstash (already configured for rate limiting)
- **Database sessions** for complete audit trails
- **JWT tokens** for stateless auth (requires refresh token handling)

---

## Security Considerations

### Current Implementation

- **PBKDF2 password hashing** with 100,000 iterations
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

### Admin Account Security

The admin account uses environment variable credentials:
- Password stored in `ADMIN_PASSWORD` env var
- Cannot be changed via UI (security feature)
- Rotate regularly in production

---

## Troubleshooting

### Common Issues

**"Invalid email or password" on login**
- Verify email is correct (case-insensitive)
- For admin: ensure `ADMIN_PASSWORD` is set in `.env.local`
- Check `data/users.json` exists and is readable

**Session not persisting**
- Verify `AUTH_SECRET` is set and at least 32 characters
- Check cookie settings in browser dev tools
- Ensure HTTPS in production

**Feedback not saving**
- Check `data/` directory exists and is writable
- Verify JSON file permissions
- Check server logs for errors

**Admin dashboard returns 403**
- Verify logged in as admin user
- Check session cookie contains `isAdmin: true`
- Clear cookies and re-login as admin

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
│       ├── storage.ts              # Feedback storage operations
│       └── index.ts                # Feedback module exports
└── data/
    ├── users.json                  # User data (created automatically)
    └── feedback.json               # Feedback data (created automatically)
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
   - Migrate to database storage
   - Enable rate limiting
   - Add monitoring/alerts
