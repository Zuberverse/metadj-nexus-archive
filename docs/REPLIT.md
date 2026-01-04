# Replit Deployment Guide — MetaDJ Nexus

**Last Modified**: 2026-01-04 15:03 EST

## Overview


MetaDJ Nexus is the platform hub for the ecosystem I'm building—where human vision meets AI-driven execution to uplift and inspire as you pioneer the Metaverse. This deployment guide shows how to bring that vision to life on Replit, leveraging managed infrastructure to focus on creativity and experience rather than server configuration.

MetaDJ Nexus is optimized for deployment on **Replit**, leveraging Replit's managed infrastructure for hosting, App Storage for media streaming, and zero-configuration deployment workflow.

**Key Benefits of Replit Deployment:**
- **Managed Infrastructure** — No server configuration required
- **App Storage Integration** — Seamless media streaming from `music` and `visuals` buckets
- **Zero-Downtime Deployments** — Automatic rolling updates
- **Built-in HTTPS** — SSL certificates managed automatically
- **Free Tier Available** — Perfect for MVP and early launches

## Deployment Architecture

```yaml
Platform: Replit
Runtime: Node.js 20.19+ (or 22.12+)
Framework: Next.js 16.1.1 (App Router; webpack dev default, Turbopack optional)
Frontend: React 19.2.0 (stable)
Build Tool: Vite 7.x
Package Manager: npm
Media Storage: Replit App Storage (2 buckets: music, visuals)
Database: None (JSON data files)
Authentication: Not required (public streaming)
```

## Bucket Configuration

### Replit App Storage Buckets

MetaDJ Nexus requires **two App Storage buckets**:

#### 1. `music` Bucket
- **Purpose**: Audio tracks (320 kbps MP3 files)
- **Bucket ID**: `replit-objstore-f682fa8b-5108-41aa-8e9f-6015fa3766ec`
- **Environment Variable**: `MUSIC_BUCKET_ID` (alternate `AUDIO_BUCKET_ID` supported)
- **Default in Code**: Development-only fallbacks live in `src/lib/replit-storage.ts`
- **Structure**:
  ```
  music/
  ├── Majestic Ascent/
  ├── Bridging Reality/
  ├── metaverse-revelation/
  └── transformer/
  ```

#### 2. `visuals` Bucket
- **Purpose**: Cinema video files (H.264 MP4 + VP9 WebM)
- **Bucket ID**: `replit-objstore-b107c12b-a7be-47ed-96ff-3decd5e445a3`
- **Environment Variable**: `VISUALS_BUCKET_ID`
- **Default in Code**: Development-only fallbacks live in `src/lib/replit-storage.ts`
- **Structure**:
  ```
  visuals/
  └── metadj-avatar/
      ├── MetaDJ Performance Loop - MetaDJ Nexus.mp4
      ├── MetaDJ Performance Loop - MetaDJ Nexus.webm (optional)
      └── MetaDJ Performance Loop - MetaDJ Nexus - Mobile.webm (optional)
  ```
  - **Legacy fallback**: `/api/video/MetaDJ v7.0 Performance Loop 2 (v0)_prob4.mp4` remains supported until the canonical file is uploaded.

### Bucket Setup Verification

**Check bucket names in Replit UI:**
1. Open **Tools → App Storage**
2. Verify you see two buckets:
   - `music` (audio tracks)
   - `visuals` (cinema videos)
3. Confirm bucket IDs match your workspace and `src/lib/replit-storage.ts`

**Environment Variables (Required in production):**

Set these in Replit Secrets for production (or to override dev fallbacks):

```bash
# .env or Replit Secrets
MUSIC_BUCKET_ID=replit-objstore-YOUR-MUSIC-BUCKET-ID
# Optional alternate key:
# AUDIO_BUCKET_ID=replit-objstore-YOUR-MUSIC-BUCKET-ID
VISUALS_BUCKET_ID=replit-objstore-YOUR-VISUALS-BUCKET-ID
```

> **Note**: In production (`NODE_ENV=production`), bucket IDs must be set. Fallback bucket IDs are only used in development, unless you explicitly set `ALLOW_OBJECT_STORAGE_FALLBACK=true` (not recommended for launch).

## Environment Variables

### Required Variables

**Set in Replit Secrets (Tools → Secrets):**

```bash
# Development Server Port (default: 8100)
PORT=8100

# Node Environment
NODE_ENV=production

# Analytics (Optional but Recommended)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=metadjnexus.ai
```

### Optional Variables

```bash
# Bucket Overrides (only if pointing to custom buckets)
MUSIC_BUCKET_ID=replit-objstore-YOUR-MUSIC-BUCKET-ID
# Optional alternate key
# AUDIO_BUCKET_ID=replit-objstore-YOUR-MUSIC-BUCKET-ID
VISUALS_BUCKET_ID=replit-objstore-YOUR-VISUALS-BUCKET-ID

# Self-hosted Plausible (if not using plausible.io)
NEXT_PUBLIC_PLAUSIBLE_API_HOST=https://analytics.yourdomain.com

# Server-side logging webhook (optional)
LOGGING_WEBHOOK_URL=https://your-logging-endpoint.com/webhook
LOGGING_SHARED_SECRET=your-32-character-secret-key

# Application version override (defaults to package.json version)
NEXT_PUBLIC_APP_VERSION=0.90
```

## Deployment Process

### Initial Setup

1. **Import Repository to Replit**
   - Fork/clone MetaDJ Nexus to your Replit account
   - Replit will auto-detect Next.js and configure build commands

2. **Verify App Storage Buckets**
   ```bash
   # In Replit Shell
   replit storage list

   # Should show:
   # - music
   # - visuals
   ```

3. **Upload Media Files**
   - See `3-projects/5-software/metadj-nexus/docs/APP-STORAGE-SETUP.md` for detailed upload instructions
   - Upload audio to `music/<collection>/` folders
   - Upload cinema videos to `visuals/` folder

4. **Set Environment Variables**
   - Go to Tools → Secrets
   - Add `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (for analytics)
   - Add any other optional variables as needed

5. **Install Dependencies**
   ```bash
   npm install
   ```

6. **Run Development Server**
   ```bash
   npm run dev
   ```
   - Verify app loads at `https://your-repl.replit.app`
   - Test audio playback from all collections
   - Test cinema video playback

### Production Deployment

**Replit manages deployment automatically:**

1. **Click "Deploy" Button** (top-right in Replit UI)

2. **Replit Automatically:**
   - Pulls latest code from main branch (if using Git integration)
   - Runs `npm install`
   - Runs `npm run build`
   - Deploys with zero-downtime rolling update
   - Provides deployment URL

3. **Deployment Takes ~2-3 Minutes**
   - Watch deployment logs in Replit console
   - Verify "Deployment successful" message

4. **Verify Deployment**
   - Visit deployment URL
   - Check `/api/health` endpoint
   - Test audio streaming
   - Test cinema video
   - Verify analytics firing (if configured)

### Continuous Deployment

**Option 1: Manual Deployment (Current)**
- Make changes locally or in Replit IDE
- Commit to Git
- Click "Deploy" button when ready
- Replit deploys from latest commit

**Option 2: Auto-Deploy from Git (Recommended for Production)**
- Connect Replit to GitHub repository
- Enable "Deploy on push" in Replit settings
- Every push to main branch triggers deployment
- CI checks run first (linting, tests, build)

## Testing Deployment

### Health Check Endpoint

```bash
# Verify app is running
curl https://your-repl.replit.app/api/health

# Expected Response:
{
  "status": "healthy",
  "version": "0.90",
  "timestamp": "2025-11-10T18:35:00Z",
  "checks": {
    "server": "ok",
    "storage": "ok"
  }
}
```

### Media Streaming Tests

**Audio Streaming:**
```bash
# Test audio API route
curl -I "https://your-repl.replit.app/api/audio/Majestic%20Ascent/01%20-%20Majestic%20Ascent%20(v0)%20-%20Mastered.mp3"

# Expected:
# HTTP/2 200 OK (or 206 Partial Content for range requests)
# Content-Type: audio/mpeg
# Accept-Ranges: bytes
# Cache-Control: public, max-age=31536000, immutable
```

**Video Streaming:**
```bash
# Test video API route
curl -I "https://your-repl.replit.app/api/video/MetaDJ%20Performance%20Loop%20(v1).mp4"

# Expected:
# HTTP/2 200 OK (or 206 Partial Content)
# Content-Type: video/mp4
# Accept-Ranges: bytes
# Cache-Control: public, max-age=31536000, immutable
```

### Browser Testing

1. **Audio Playback**:
   - Visit deployed URL
   - Click on any track
   - Verify audio loads and plays
   - Test scrubbing (seek forward/backward)
   - Test volume controls

2. **Cinema Video**:
   - Click cinema button in player
   - Verify video loads in fullscreen
   - Check video syncs with audio
   - Test auto-hide controls (should hide after ~5s)
   - Press Escape to exit

3. **Analytics** (if configured):
   - Open Plausible dashboard
   - Play tracks, switch collections
   - Verify events appear in real-time

4. **Cross-Browser**:
   - Chrome/Edge (WebM + MP4 fallback)
   - Firefox (WebM + MP4 fallback)
   - Safari (MP4 H.264 required)
   - Mobile Safari (iOS)
   - Chrome Mobile (Android)

## Rollback Procedures

### Method 1: Replit Deployment History (Fastest)

```markdown
1. Click "Deployments" in Replit sidebar
2. View deployment history
3. Find last known good deployment
4. Click "Promote to Production"
5. Confirm rollback
6. Verify site works (~1 minute)
```

**Time**: 1-2 minutes
**Best For**: Immediate emergencies

### Method 2: Git Revert + Redeploy

```bash
# Revert last commit
git revert HEAD
git push origin main

# Then click "Deploy" in Replit UI
```

**Time**: 5-10 minutes
**Best For**: Controlled rollback with audit trail

### Method 3: Rollback to Tagged Release

```bash
# List recent tags
git tag -l

# Checkout last stable release
git checkout v0.90

# Force push to main (CAUTION)
git push origin main --force

# Deploy in Replit UI
```

**Time**: 10-15 minutes
**Best For**: Multiple bad commits, last resort
⚠️ **Warning**: Force push rewrites history

## Troubleshooting

### Issue: "Bucket not found" Errors

**Symptoms**: API routes return 500 errors, media won't load

**Solutions**:
1. Verify buckets exist in Tools → App Storage
2. Check bucket names are `music` and `visuals`
3. Verify bucket IDs in `src/lib/replit-storage.ts` match your workspace
4. Check environment variables if overriding defaults
5. Restart Replit instance

**Verification:**
```bash
# In Replit Shell
replit storage list

# Should show:
# - music
# - visuals

# Check specific bucket
replit storage ls music
```

### Issue: Media Files 404 Not Found

**Symptoms**: Audio/video won't play, console shows 404 errors

**Solutions**:
1. Verify files uploaded to correct bucket and path
2. Check file names match exactly (case-sensitive)
3. Verify collection folders exist in `music` bucket
4. Check URL encoding for spaces (e.g., `%20`)
5. Test API route directly with curl

**Debug Commands:**
```bash
# List files in music bucket
replit storage ls music/Majestic\ Ascent

# List files in visuals bucket
replit storage ls visuals

# Check specific file
replit storage cat music/Majestic\ Ascent/01\ -\ Majestic\ Ascent\ \(v0\)\ -\ Mastered.mp3 | head -c 100
```

### Issue: Deployment Fails

**Symptoms**: "Deployment failed" message, build errors

**Solutions**:
1. Check Replit console for error logs
2. Verify all dependencies in `package.json`
3. Run `npm run build` locally to reproduce
4. Check for TypeScript errors: `npm run type-check`
5. Verify linting passes: `npm run lint`
6. Check environment variables are set

**Common Build Errors:**
```bash
# TypeScript compilation failed
npm run type-check

# ESLint errors
npm run lint --fix

# Test failures
npm run test

# Build process errors
npm run build
```

### Issue: Slow Performance

**Symptoms**: Long load times, buffering, laggy UI

**Solutions**:
1. Check file sizes:
   - Audio: Should be <10MB per track (320 kbps MP3)
   - Video: Should be <150MB per file
2. Verify range requests working (check for 206 responses)
3. Check cache headers are set correctly
4. Monitor Replit resource usage
5. Consider WebM video for modern browsers (smaller size)

### Issue: App Won't Start After Deployment

**Symptoms**: 503 errors, health check fails

**Solutions**:
1. Check Replit console for startup errors
2. Verify `PORT` environment variable set (default: 8100)
3. Check `NODE_ENV=production`
4. Verify all required dependencies installed
5. Restart Repl

**Health Check Verification:**
```bash
# Check if app is responding
curl https://your-repl.replit.app/api/health

# Check if port is listening
netstat -tulpn | grep 8100
```

## Performance Optimization

### Caching Strategy

**Current Implementation:**
- **Audio/Video Files**: `Cache-Control: public, max-age=31536000, immutable`
- **Long-lived caching**: Files cached for 1 year in browser
- **Immutable content**: Media files never change after upload
- **Version filenames**: Update filename (e.g., `v1` → `v2`) to bust cache

### Range Request Support

**Enabled for:**
- Audio seeking (scrubbing through tracks)
- Video seeking (cinema controls)
- Progressive loading (start playback before full download)

**Implementation:**
- API routes honor `Range` headers
- Return HTTP 206 Partial Content
- Support byte-range specifications

### Replit-Specific Optimizations

1. **App Storage Location**: Replit automatically serves from nearest CDN edge
2. **HTTP/2 Support**: Automatic multiplexing and compression
3. **Brotli Compression**: Automatic for text assets
4. **Edge Caching**: Replit CDN caches static assets
5. **Keep-Alive**: Connection pooling for API routes

## Monitoring & Maintenance

### Replit Dashboard Metrics

**Monitor in Replit Console:**
- CPU usage
- Memory usage
- Network bandwidth
- Request rate
- Error rate
- Active connections

**Alert Thresholds:**
- CPU >80% sustained: Investigate performance bottlenecks
- Memory >90%: Check for memory leaks
- Error rate >1%: Review error logs
- Response time >500ms: Optimize slow routes

### External Monitoring

**Recommended Setup:**
- **Uptime**: UptimeRobot (free tier) - See `3-projects/5-software/metadj-nexus/docs/operations/UPTIME-MONITORING.md`
- **Errors**: Sentry (free tier) - See `3-projects/5-software/metadj-nexus/docs/operations/ERROR-TRACKING.md`
- **Analytics**: Plausible (privacy-first) - See `3-projects/5-software/metadj-nexus/docs/operations/ANALYTICS-SETUP.md`

### Regular Maintenance

**Weekly:**
- Review Replit console for errors
- Check App Storage usage
- Monitor response times

**Monthly:**
- Review dependency updates (Dependabot PRs)
- Check for security vulnerabilities (`npm audit`)
- Audit media file sizes and encoding

**Quarterly:**
- Review and optimize video encodings
- Update documentation
- Performance audit (Lighthouse)

## Cost Management

### Free Tier Limits

**Replit Free Tier Includes:**
- Hosting for public apps
- App Storage (check current limits)
- HTTPS certificates
- Basic compute resources

**Paid Tiers Available:**
- **Replit Core** (~$7/month): More resources, faster builds
- **Replit Teams** (~$20/month): Collaboration features
- **Replit Pro** (~$25/month): Priority support, more storage

### App Storage Costs

**Current Usage (MetaDJ Nexus v0.90):**
- Audio tracks: ~500 MB (51 tracks @ ~10 MB each)
- Cinema videos: ~150 MB (1-2 videos)
- Total: ~650 MB

**Monitor Usage:**
1. Replit Dashboard → Billing → Usage
2. Check App Storage metrics
3. Review bandwidth consumption
4. Plan for growth (new tracks, videos)

## Security Considerations

### HTTPS Enforcement

- Replit automatically provides SSL certificates
- All traffic forced to HTTPS
- Certificates auto-renewed

### API Security

**Current Implementation:**
- Rate limiting in `src/proxy.ts` (wired via `src/middleware.ts`):
  - Media routes: 100 req/min per IP
  - Logging routes: 10 req/min per IP
  - General API: 200 req/min per IP
- Input validation on API routes
- Error messages don't leak sensitive info
- No authentication required (public streaming)

### App Storage Security

- Buckets are private by default
- Only accessible through your API routes
- Automatic authentication via Replit SDK
- No exposed credentials in code

## CI/CD Integration

### GitHub Actions (Current)

**Validation Only** (not deployment):
- Runs on push + PRs
- Executes: linting, type-check, tests, build (coverage is optional, not gated)
- Deployment still manual via Replit UI

**See**: `.github/workflows/ci.yml`

### Future: Automated Deployment

**When Replit API/CLI Available:**
- Trigger deployment from GitHub Actions
- Deploy on every successful CI run
- No manual "Deploy" button clicking

**Status**: Not available yet (Replit limitation)

## Domain Configuration

### Custom Domain Setup

1. **Purchase Domain** (`metadjnexus.ai`)

2. **Configure DNS** (in your domain registrar):
   ```
   Type: CNAME
   Host: @
   Value: your-repl.replit.app
   TTL: 3600
   ```

3. **Enable in Replit**:
   - Go to Replit → Settings → Domains
   - Add custom domain
   - Wait for DNS propagation (up to 48 hours)

4. **SSL Certificate**:
   - Replit automatically provisions SSL
   - Certificate auto-renews

### Subdomain Setup (e.g., `status.metadjnexus.ai`)

```
Type: CNAME
Host: status
Value: your-repl.replit.app
TTL: 3600
```

## Backup & Recovery

### Code Backup

**Git Repository**: Primary backup
- All code committed to Git
- Push to GitHub/GitWisdom regularly
- Tag releases: `git tag v0.90`

### Media Backup

**App Storage Files**: Not automatically backed up
- Download media files from buckets periodically
- Store offline backups
- Use Replit CLI to download:
  ```bash
  # Download entire bucket
  replit storage download music ./backup/music
  replit storage download visuals ./backup/visuals
  ```

### Database Backup

**JSON Data Files**: Committed to Git
- `src/data/tracks.json`
- `src/data/collections.json`
- Automatically versioned with code

### Recovery Procedure

**If Repl Deleted or Corrupted:**
1. Create new Repl from Git repository
2. Recreate App Storage buckets (`music`, `visuals`)
3. Upload media files from offline backups
4. Set environment variables
5. Deploy

## Support Resources

**Replit Documentation:**
- [Replit Docs](https://docs.replit.com/)
- [App Storage Guide](https://docs.replit.com/cloud-services/storage-and-databases/object-storage)
- [Deployment Guide](https://docs.replit.com/hosting/deployments)

**Replit Community:**
- [Replit Ask Forum](https://ask.replit.com/)
- [Replit Discord](https://discord.gg/replit)
- [Replit Status](https://status.replit.com/)

**MetaDJ Nexus Documentation:**
- `README.md` — Project overview
- `3-projects/5-software/metadj-nexus/docs/APP-STORAGE-SETUP.md` — Media storage guide
- `3-projects/5-software/resources/workflows/DEPLOYMENT-WORKFLOW.md` — Deployment checklist
- `3-projects/5-software/metadj-nexus/docs/operations/UPTIME-MONITORING.md` — Monitoring setup
- `3-projects/5-software/metadj-nexus/docs/operations/ERROR-TRACKING.md` — Error tracking setup

**Contact:**
- Replit Support: support@replit.com
- MetaDJ Nexus Issues: GitHub repository

---

Remember: Replit manages the infrastructure complexity. Focus on building great features and creating amazing music experiences. The deployment should "just work."
