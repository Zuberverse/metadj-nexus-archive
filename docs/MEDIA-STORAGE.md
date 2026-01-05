# Media Storage Reference

> **Cloudflare R2 storage configuration and directory structure for MetaDJ Nexus**

**Last Modified**: 2026-01-05 16:30 EST

## Overview

MetaDJ Nexus uses **Cloudflare R2** as the primary media storage provider, with Replit App Storage as a fallback. R2 provides S3-compatible object storage with zero egress fees, making it ideal for audio streaming.

### Storage Provider Architecture

The storage layer uses an abstraction pattern (`src/lib/media-storage.ts`) that switches between providers based on the `STORAGE_PROVIDER` environment variable:

```
STORAGE_PROVIDER=r2     → Cloudflare R2 (primary, recommended)
STORAGE_PROVIDER=replit → Replit App Storage (fallback)
```

**Key Benefits of R2:**
- Zero egress fees (significant cost savings for audio streaming)
- S3-compatible API (uses AWS SDK)
- Global edge caching via Cloudflare
- No local media files committed to repository

## R2 Configuration

### Bucket Details

| Property | Value |
|----------|-------|
| **Bucket Name** | `metadj-nexus-media` |
| **Account ID** | `eba827ecf8d18ee5804f797724b773e1` |
| **Region** | Auto (Cloudflare edge) |
| **Endpoint** | `https://<account-id>.r2.cloudflarestorage.com` |

### Environment Variables

```bash
# Required for R2
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=eba827ecf8d18ee5804f797724b773e1
R2_ACCESS_KEY_ID=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret-key>
R2_BUCKET=metadj-nexus-media
```

### Directory Structure

```
metadj-nexus-media/
├── music/
│   └── majestic-ascent/
│       ├── 01 - Majestic Ascent (v0) - Mastered.mp3
│       ├── 02 - Convergence (v0) - Mastered.mp3
│       ├── 03 - Futures Grace (v0) - Mastered.mp3
│       ├── 04 - Synthetic Emergence (v0) - Mastered.mp3
│       ├── 05 - Electric Horizon (v0) - Mastered.mp3
│       ├── 06 - Portal to Infinity (v0) - Mastered.mp3
│       ├── 07 - Virtual Awakening (v0) - Mastered.mp3
│       ├── 08 - Day Dreaming (v0) - Mastered.mp3
│       ├── 09 - Strollin Through Paradise (v0) - Mastered.mp3
│       └── 10 - The Minotaurs Dance (v0) - Mastered.mp3
│
└── visuals/
    └── (video files for Cinema feature)
```

### Naming Conventions

MetaDJ Nexus uses a **hybrid naming strategy** that optimizes for both programmatic access (directories) and human readability (files).

#### Design Rationale

| Element | Convention | Optimized For |
|---------|------------|---------------|
| **Directories** | Lowercase kebab-case | URL routing, API paths, CLI tools |
| **Filenames** | Title Case with spaces | Human readability, catalog management |

**Why this split?**
- **Directories = structure** — Machines parse paths; kebab-case is URL-safe, case-insensitive, and avoids encoding issues
- **Filenames = content** — Humans identify files; Title Case with spaces matches track titles and is readable in dashboards

#### Directory Naming Rules

**Pattern:** `lowercase-with-hyphens/`

```
✅ Correct:
  music/majestic-ascent/
  music/bridging-reality/
  visuals/metadj-avatar/

❌ Incorrect:
  music/Majestic Ascent/     (spaces break URLs)
  music/MajesticAscent/      (PascalCase causes case-sensitivity issues)
  music/majestic_ascent/     (underscores are non-standard for URLs)
```

**Benefits:**
- URL-safe without encoding: `/api/audio/majestic-ascent/...`
- Case-insensitive matching (avoids `Majestic-Ascent` vs `majestic-ascent` bugs)
- Easy to type in CLI: `rclone ls r2:metadj-nexus-media/music/majestic-ascent/`
- Consistent with web conventions (kebab-case)

#### Filename Naming Rules

**Pattern:** `NN - Track Title (vX) - Mastered.mp3`

```
✅ Correct:
  01 - Majestic Ascent (v0) - Mastered.mp3
  02 - Convergence (v0) - Mastered.mp3
  10 - The Minotaurs Dance (v0) - Mastered.mp3

❌ Incorrect:
  01-majestic-ascent-v0-mastered.mp3    (hard to scan visually)
  majestic_ascent.mp3                    (no metadata context)
  01_Majestic_Ascent.mp3                 (inconsistent separators)
```

**Filename Components:**

| Component | Format | Purpose |
|-----------|--------|---------|
| Track number | `NN - ` (2-digit, space-dash-space) | Sort order in storage browsers |
| Title | Title Case with spaces | Human-readable, matches catalog |
| Version | `(vX)` | Track revision tracking |
| Quality | `- Mastered` | Confirms production-ready audio |
| Extension | `.mp3` | 320 kbps CBR MP3 standard |

**Benefits:**
- Human-readable in Cloudflare dashboard and rclone output
- Matches track titles in `tracks.json` exactly
- Preserves production metadata (version, mastered status)
- Scannable: quickly identify tracks when browsing

#### URL Encoding (Automatic)

Spaces in filenames are **automatically URL-encoded** by browsers and the API:

```
Browser requests:  /api/audio/majestic-ascent/01 - Majestic Ascent (v0) - Mastered.mp3
Browser encodes:   /api/audio/majestic-ascent/01%20-%20Majestic%20Ascent%20(v0)%20-%20Mastered.mp3
API decodes:       majestic-ascent/01 - Majestic Ascent (v0) - Mastered.mp3
R2 serves:         ✅ File streams successfully
```

No manual encoding needed in `tracks.json` — use natural filenames:

```json
{
  "audioUrl": "/api/audio/majestic-ascent/01 - Majestic Ascent (v0) - Mastered.mp3"
}
```

#### CLI Considerations

When using rclone or other CLI tools, **quote paths** containing spaces:

```bash
# Quote the entire path
rclone copy "r2:metadj-nexus-media/music/majestic-ascent/01 - Majestic Ascent (v0) - Mastered.mp3" ./

# Or escape spaces and parentheses
rclone copy r2:metadj-nexus-media/music/majestic-ascent/01\ -\ Majestic\ Ascent\ \(v0\)\ -\ Mastered.mp3 ./

# Listing works without quotes
rclone ls r2:metadj-nexus-media/music/majestic-ascent/
```

#### Video File Naming

**Pattern:** `Descriptive Title - Context.ext`

```
✅ Correct:
  MetaDJ Performance Loop - MetaDJ Nexus.mp4
  MetaDJ Performance Loop - MetaDJ Nexus.webm
  MetaDJ Performance Loop - MetaDJ Nexus - Mobile.webm

❌ Incorrect:
  performance-loop.mp4                  (too generic)
  MetaDJPerformanceLoop.mp4             (no spaces, hard to read)
```

**Video formats:** Provide both WebM (VP9, primary) and MP4 (H.264, fallback) for cross-browser support.

#### Summary

| Layer | Convention | Example |
|-------|------------|---------|
| Bucket | lowercase | `metadj-nexus-media` |
| Top-level directories | lowercase | `music/`, `visuals/` |
| Collection directories | kebab-case | `majestic-ascent/` |
| Audio files | Title Case + spaces | `01 - Majestic Ascent (v0) - Mastered.mp3` |
| Video files | Title Case + spaces | `MetaDJ Performance Loop - MetaDJ Nexus.mp4` |

> **Cross-reference:** For code naming conventions, see [`docs/NAMING-CONVENTIONS.md`](NAMING-CONVENTIONS.md).

## API Routes

### Audio Streaming

**Endpoint:** `/api/audio/[...path]`
**Location:** `src/app/api/audio/[...path]/route.ts`

```
Request:  GET /api/audio/majestic-ascent/01 - Majestic Ascent (v0) - Mastered.mp3
Response: Audio stream with range request support
```

**Features:**
- Range request support for seeking/scrubbing
- HTTP 206 Partial Content responses
- Long cache headers: `max-age=31536000, immutable`
- Content-Type: `audio/mpeg`

### Video Streaming

**Endpoint:** `/api/video/[...path]`
**Location:** `src/app/api/video/[...path]/route.ts`

```
Request:  GET /api/video/visuals/performance-loop.mp4
Response: Video stream with range request support
```

**Features:**
- Supports MP4 (H.264) and WebM (VP9) formats
- Range request support for seeking
- Same caching strategy as audio

## Implementation Details

### Storage Provider Files

| File | Purpose |
|------|---------|
| `src/lib/media-storage.ts` | Provider abstraction layer |
| `src/lib/r2-storage.ts` | Cloudflare R2 adapter |
| `src/lib/replit-storage.ts` | Replit App Storage adapter |
| `src/lib/storage/storage.types.ts` | Shared type definitions |
| `src/lib/media/streaming.ts` | Shared streaming helper |

### How Streaming Works

1. **Client Request:** Browser requests media file via API route
2. **Provider Selection:** `media-storage.ts` selects R2 or Replit based on env
3. **File Lookup:** Provider fetches file metadata (size, content-type)
4. **Range Parsing:** If `Range` header present, calculate byte range
5. **Stream Response:** Return `ReadableStream` with appropriate headers

### Storage Interface

Both providers implement the same interface:

```typescript
interface StorageBucket {
  file(path: string): StorageBucketFile;
}

interface StorageBucketFile {
  getMetadata(): Promise<[Record<string, unknown>]>;
  createReadStream(options?: { start?: number; end?: number }): NodeJS.ReadableStream;
}
```

## CLI Management (rclone)

For managing R2 content from terminal, use rclone:

### Configuration

```bash
# ~/.config/rclone/rclone.conf
[r2]
type = s3
provider = Cloudflare
access_key_id = <your-access-key>
secret_access_key = <your-secret-key>
endpoint = https://<account-id>.r2.cloudflarestorage.com
acl = private
no_check_bucket = true
```

### Common Commands

```bash
# List all files
rclone ls r2:metadj-nexus-media/

# List music directory
rclone ls r2:metadj-nexus-media/music/

# Upload a file
rclone copy /path/to/file.mp3 r2:metadj-nexus-media/music/collection-name/

# Upload a directory
rclone copy /path/to/collection/ r2:metadj-nexus-media/music/collection-name/

# Download a file
rclone copy r2:metadj-nexus-media/music/collection/track.mp3 ./local/

# Delete a file
rclone delete r2:metadj-nexus-media/music/old-file.mp3
```

## Current Media Inventory

### Majestic Ascent Collection (10 tracks)

| # | Filename | Size |
|---|----------|------|
| 1 | 01 - Majestic Ascent (v0) - Mastered.mp3 | 12.2 MB |
| 2 | 02 - Convergence (v0) - Mastered.mp3 | 17.4 MB |
| 3 | 03 - Futures Grace (v0) - Mastered.mp3 | 7.4 MB |
| 4 | 04 - Synthetic Emergence (v0) - Mastered.mp3 | 9.7 MB |
| 5 | 05 - Electric Horizon (v0) - Mastered.mp3 | 8.2 MB |
| 6 | 06 - Portal to Infinity (v0) - Mastered.mp3 | 10.2 MB |
| 7 | 07 - Virtual Awakening (v0) - Mastered.mp3 | 11.8 MB |
| 8 | 08 - Day Dreaming (v0) - Mastered.mp3 | 7.3 MB |
| 9 | 09 - Strollin Through Paradise (v0) - Mastered.mp3 | 12.4 MB |
| 10 | 10 - The Minotaurs Dance (v0) - Mastered.mp3 | 5.2 MB |

**Total:** ~102 MB

### Visuals (pending)

Cinema visual assets will be uploaded to `visuals/` directory.

## Adding New Media

### Upload New Tracks

1. **Prepare files** with correct naming convention
2. **Upload via rclone:**
   ```bash
   rclone copy ./new-track.mp3 r2:metadj-nexus-media/music/collection-name/
   ```
3. **Update `src/data/tracks.json`** with track metadata
4. **Update `src/data/collections.json`** track count
5. **Test playback** in development

### Upload New Visuals

1. **Prepare video files** (WebM + MP4 for cross-browser)
2. **Upload via rclone:**
   ```bash
   rclone copy ./video.mp4 r2:metadj-nexus-media/visuals/
   rclone copy ./video.webm r2:metadj-nexus-media/visuals/
   ```
3. **Update component** with new video source paths

## Deployment Checklist

### Replit Secrets (Production)

Add these secrets in Replit's Secrets panel:

```
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=eba827ecf8d18ee5804f797724b773e1
R2_ACCESS_KEY_ID=<access-key>
R2_SECRET_ACCESS_KEY=<secret-key>
R2_BUCKET=metadj-nexus-media
```

### Local Development

Copy `.env.example` to `.env.local` and fill in R2 credentials.

## Troubleshooting

### Common Issues

**404 File Not Found:**
- Verify file exists: `rclone ls r2:metadj-nexus-media/music/`
- Check path matches exactly (case-sensitive)
- Ensure `STORAGE_PROVIDER=r2` is set

**Authentication Failed:**
- Verify R2 credentials are correct
- Check token has Object Read & Write permissions
- Confirm account ID matches bucket

**Slow Streaming:**
- R2 edge caching should handle this
- Check file sizes are reasonable (<15MB per track)
- Verify no network throttling

### Diagnostics

The storage layer exposes diagnostics:

```typescript
import { storageDiagnostics } from '@/lib/media-storage';

console.log(storageDiagnostics);
// { provider: 'r2', configured: true, bucket: 'metadj-nexus-media', ... }
```

## Migration Notes

### From Replit to R2 (Completed 2026-01-05)

1. Created R2 bucket `metadj-nexus-media`
2. Implemented R2 adapter (`src/lib/r2-storage.ts`)
3. Created provider abstraction (`src/lib/media-storage.ts`)
4. Updated API routes to use abstraction
5. Uploaded 10 Majestic Ascent tracks
6. Updated `tracks.json` with R2 paths
7. Consolidated from 3 collections to 1 (Majestic Ascent)

### Legacy Replit Storage

Replit App Storage remains as fallback. Set `STORAGE_PROVIDER=replit` to use it.

## Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [rclone S3 Configuration](https://rclone.org/s3/)
