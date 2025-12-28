# App Storage Setup Guide — Audio & Visuals Streaming

**Last Modified**: 2025-12-27 15:24 EST

## Overview

MetaDJ Nexus uses **Replit App Storage** to host all media files (audio and visuals) in the cloud, providing scalable, reliable streaming for:
- **Audio tracks** across the active collections (Majestic Ascent, Bridging Reality, Metaverse Revelation, and future releases)
- **Cinema visual assets** (MetaDJ Performance Loop) for the immersive fullscreen experience

### Bucket Names in Replit

**IMPORTANT**: The bucket names in your Replit workspace are:
- **`music`** — Audio tracks (320 kbps MP3 files)
- **`visuals`** — Cinema videos (H.264 MP4 + VP9 WebM files)

These are the names you'll see in **Tools → App Storage** in the Replit UI.

**Key Benefits:**
- No local media files committed to repository
- Efficient Git repository size (<10MB)
- Scalable cloud storage with automatic authentication
- Range request support for seeking and progressive loading
- Streaming responses start playback immediately without waiting for full downloads
- Simple API-based access pattern

## Architecture

### Two-Bucket Storage Architecture

MetaDJ Nexus uses **two separate App Storage buckets** for optimal organization:

1. **`music` Bucket** (Bucket ID: `replit-objstore-9b258123-d246-442b-98a6-0acf8a8770e5`)
   - **Bucket Name**: `music` (as seen in Replit UI)
   - **Environment Variable**: `MUSIC_BUCKET_ID` (alternate: `AUDIO_BUCKET_ID`)
   - **Purpose**: Hosts all audio tracks (320 kbps MP3 format)
   - **Organization**: Flat structure with numbered filenames (01 - Track Name (v0) - Mastered.mp3)
   - **API Route**: `/api/audio/[...path]`

2. **`visuals` Bucket** (Bucket ID: `replit-objstore-b107c12b-a7be-47ed-96ff-3decd5e445a3`)
   - **Bucket Name**: `visuals` (as seen in Replit UI)
   - **Environment Variable**: `VISUALS_BUCKET_ID`
   - **Purpose**: Hosts cinema visual assets (H.264 MP4 + VP9 WebM format)
   - **Organization**: Root folder with MetaDJ Performance Loop files
   - **API Route**: `/api/video/[...path]`

> **Configuration Note**: Set `MUSIC_BUCKET_ID` (or alternate `AUDIO_BUCKET_ID`) and `VISUALS_BUCKET_ID` in your environment
> for every production or Replit deployment. The defaults in `src/lib/replit-storage.ts` are a **development-only fallback**
> and are automatically disabled in production builds unless `ALLOW_OBJECT_STORAGE_FALLBACK=true`.

### Storage Structure

**`music` Bucket** (as seen in Replit UI):
```
music/
├── Majestic Ascent/              # Collection folder (39 tracks)
│   ├── 01 - Majestic Ascent (v0) - Mastered.mp3
│   ├── 02 - Convergence (v0) - Mastered.mp3
│   └── ... (18 more tracks)
├── Bridging Reality/             # Collection folder (20 tracks)
│   ├── 01 - The Evolution of AI (v0) - Mastered.mp3
│   ├── 02 - Rise of the New Dawn (v0) - Mastered.mp3
│   └── ... (18 more tracks)
├── metaverse-revelation/         # Collection folder (11 tracks)
│   ├── Beyond the Stars (v0) - Mastered.mp3
│   ├── Cosmic Rendezvous (v0) - Mastered.mp3
│   └── ... (9 more tracks)
└── transformer/                  # Collection folder (5 tracks)
    ├── 01 - Ripple (v0) - Mastered.mp3
    ├── 02 - Transformer (v0) - Mastered.mp3
    ├── 03 - Metamorphosis (v0) - Mastered.mp3
    ├── 04 - Techntonic (v0) - Mastered.mp3
    └── 05 - Sonic Storm (v0) - Mastered.mp3
```

**`visuals` Bucket** (as seen in Replit UI):
```
visuals/
└── MetaDJ Performance Loop (v1).mp4    # Cinema performance loop (H.264)
    └── MetaDJ Performance Loop (v1).webm # Optional VP9 WebM version
```

### API Routes

#### Audio API Route
- **Endpoint**: `/api/audio/[...path]`
- **Location**: `src/app/api/audio/[...path]/route.ts`
- **Method**: GET
- **Purpose**: Streams audio directly from App Storage to the client
- **Implementation Highlights**:
  - Resolves App Storage metadata to determine file size
  - Pipes `file.createReadStream({ start, end })` directly into the HTTP response using Node → Web stream conversion
  - Honors browser `Range` headers for seeking while keeping `Cache-Control: public, max-age=31536000, immutable`
- **Content-Type**: `audio/mpeg`

#### Visuals API Route
- **Endpoint**: `/api/video/[...path]`
- **Location**: `src/app/api/video/[...path]/route.ts`
- **Method**: GET
- **Purpose**: Streams MP4/WebM cinema visuals directly from App Storage
- **Implementation Highlights**:
  - Detects content type from file extension
  - Streams the requested byte range via `file.createReadStream({ start, end })`
  - Shares the same long-lived cache headers as audio for repeat plays
- **Content-Type**: `video/webm` or `video/mp4` (auto-detected)

### How It Works

1. **Client Request**: Browser requests media file
   ```
   /api/audio/Majestic Ascent/01 - Majestic Ascent (v0) - Mastered.mp3
   /api/video/MetaDJ Performance Loop (v1).mp4
   ```

2. **API Route**: Next.js API route receives request
   - Uses `@replit/object-storage` SDK
   - Downloads file from App Storage
   - Returns media stream to client with range request support

3. **Automatic Authentication**:
   - Replit SDK handles auth automatically
   - No manual credentials needed
   - Works in both development and production

4. **Range Request Support**:
   - Enables audio/video seeking (scrubbing)
   - Progressive loading for large files
   - HTTP 206 Partial Content responses
   - Standards-compliant streaming

## Implementation

### Dependencies

```json
{
  "@replit/object-storage": "^1.0.0"
}
```

### Audio & Video API Integration (Current Architecture)

Instead of instantiating `@replit/object-storage` clients inside every route, MetaDJ Nexus now uses:

- `src/lib/replit-storage.ts` — exposes `getMusicBucket()`/`getVisualsBucket()` with development fallbacks and production-required bucket IDs via `MUSIC_BUCKET_ID` (alternate `AUDIO_BUCKET_ID`) / `VISUALS_BUCKET_ID`.
- `src/lib/media/streaming.ts` — a shared `streamBucketFile()` helper that handles:
  - path sanitization + allowed-extension checks
  - metadata lookup, MIME enforcement, and ETag / Last-Modified headers
  - HTTP range parsing for scrubbing + partial content streaming
  - cache headers (`public, max-age=31536000, immutable`) for both audio and video

The API routes (`src/app/api/audio/[...path]/route.ts` and `src/app/api/video/[...path]/route.ts`) only need to:

```ts
const bucket = await getAudioBucket(); // or getVisualsBucket()
const filePath = sanitizePathSegments(params.path, allowedExtensions);
return streamBucketFile({ request, bucket, filePath, config });
```

That shared pattern means:
- Any improvement to streaming (retry logic, logging, analytics) lands once and benefits every media endpoint.
- Bucket credentials stay centralized and governed by Replit Secrets.
- The tests in `tests/api/streaming.test.ts` exercise the helper directly, so regressions are caught before deployment.

### Environment & Secrets Handling

- **Bucket defaults**: `replit-objstore-f682fa8b-5108-41aa-8e9f-6015fa3766ec` (`music`) and `replit-objstore-b107c12b-a7be-47ed-96ff-3decd5e445a3` (`visuals`) are the baked-in IDs used for production. Leave them untouched unless you’re purposely pointing at staging/forks.
- **Overrides**: Set `MUSIC_BUCKET_ID` (or `AUDIO_BUCKET_ID` where configured) / `VISUALS_BUCKET_ID` only through the Replit Secrets UI. That keeps forks, staging repls, and CI runs isolated without editing source.
- **Other secrets** (Plausible domains, logging webhook, future Sentry keys) follow the same rule—document them in `.env.example`, but store real values exclusively in Replit Secrets. No additional `.env` files should be checked in.

### Track Configuration

Update `src/data/tracks.json` to use API routes:

```json
{
  "id": "metadj-001",
  "title": "Majestic Ascent",
  "audioUrl": "/api/audio/Majestic Ascent/01 - Majestic Ascent (v0) - Mastered.mp3",
  "artworkUrl": "/images/Majestic Ascent-collection.svg",
  "genres": ["Retro Future", "Techno"]
}
```

### Cinema Visual Component Configuration

Update video sources in components to use API routes:

```tsx
// src/components/cinema/CinemaOverlay.tsx
<video ref={videoRef} loop muted playsInline>
<source src="/api/video/MetaDJ Performance Loop (v1).mp4" type="video/mp4" />
</video>
```

### Cinema Fallback UX

- If the cinema loop cannot load, the client renders a solid black overlay with a "No Video Available" pill so the UI remains polished while audio continues uninterrupted.
- Safari's oversized inline play controls are suppressed in `globals.css`, preventing the blown-up play icon from appearing over the fallback screen.
- Successful loads fade the loop in once `onLoadedData` fires, keeping the transition seamless.

## Adding New Media Files

### Step 1: Upload to App Storage

1. Open **Tools → App Storage** in Replit
2. Select the appropriate bucket:
   - **Audio Bucket** (`f682fa8b`) for audio files
   - **Visuals Bucket** (`b107c12b`) for cinema visual files
3. Navigate to the appropriate folder:
   - For audio: `Majestic Ascent/`, `Bridging Reality/`, or create new collection folder
   - For visuals: Root folder (no subfolders currently)
4. Click **Upload** and select your media files
5. Wait for upload to complete

### Step 2: Update Application Configuration

#### For Audio Tracks

Add/update entries in `src/data/tracks.json`:

```json
{
  "id": "unique-id",
  "title": "Track Name",
  "artist": "MetaDJ",
  "collection": "Collection Name",
  "duration": 305,
  "releaseDate": "2025-10-04",
  "audioUrl": "/api/audio/collection-folder/filename.mp3",
  "artworkUrl": "/images/artwork.svg",
  "genres": ["Genre1", "Genre2"]
}
```

#### For Cinema Visual Assets

Update visual source URLs in component files:

```tsx
<source src="/api/video/MetaDJ Performance Loop (v1).mp4" type="video/mp4" />
```

### Step 3: Test Playback

1. Restart the development server (if running)
2. Navigate to your media in the UI
3. Verify audio/video loads and plays correctly
4. Test seeking/scrubbing functionality

## Local Development

### Working with App Storage from Local Environment

The Replit SDK works seamlessly in the Replit environment but requires additional setup for local development in IDEs like VS Code or Claude Code.

#### Option 1: Replit Development Environment (Recommended)

- Work directly in the Replit IDE
- App Storage authentication works automatically
- No additional configuration needed
- Full production parity

#### Option 2: Local IDE with Mock Data (Development Only)

If you must work locally, add fallback logic to serve from local files:

```typescript
// Add to src/app/api/audio/[...path]/route.ts
// Add to src/app/api/video/[...path]/route.ts

import fs from 'fs';
import path from 'path';

const IS_LOCAL = process.env.NODE_ENV === 'development' && !process.env.REPL_ID;

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = params.path.join('/');

  if (IS_LOCAL) {
    // Serve from local public/ directory for development
    const localPath = path.join(process.cwd(), 'public', 'audio', filePath); // or 'video'

    try {
      const file = fs.readFileSync(localPath);
      return new NextResponse(file, {
        headers: {
          'Content-Type': 'audio/mpeg', // or 'video/mp4'/'video/webm'
          'Accept-Ranges': 'bytes'
        }
      });
    } catch (error) {
      return new NextResponse('File not found', { status: 404 });
    }
  }

  // Production: Use App Storage
  // ... existing App Storage code ...
}
```

**Local Development Setup:**
1. Keep media files in `public/audio/` and `public/video/` for local testing
2. Files are gitignored (won't be committed)
3. Add environment variable check for local vs Replit
4. App automatically uses App Storage in production

#### Option 3: Environment Variable Sync (Advanced)

For advanced users who need App Storage in local IDE:

1. Contact Replit support for App Storage credentials export
2. Set up Google Cloud Storage credentials locally
3. Use environment variables to authenticate

**Note**: This approach is not officially supported and may break with updates.

## Repository Structure

### Local Files (Gitignored)

```
public/
├── audio/
│   └── .gitkeep              # Keep folder structure only
└── video/
    └── .gitkeep              # Keep folder structure only
```

**Important**: `.gitignore` excludes all media files:

```gitignore
# large media files (keep directory structure in git)
# Note: All media now served via Replit App Storage API routes
/public/audio/**/*.mp3
/public/video/**/*.mp4
/public/video/**/*.webm
/public/video/**/*.mov
!/public/audio/.gitkeep
!/public/audio/**/.gitkeep
!/public/video/.gitkeep
```

### API Routes (Committed)

```
src/app/api/
├── audio/
│   └── [...path]/
│       └── route.ts          # Audio streaming API
└── video/
    └── [...path]/
        └── route.ts          # Video streaming API
```

## Audio File Naming Standards

### Actual Naming Convention (As Uploaded)

All audio files in the bucket use **title case with spaces** and the suffix ` (v0) - Mastered.mp3`.

#### Naming Pattern

**Numbered Tracks (Majestic Ascent, Bridging Reality, Transformer):**
```
NN - Track Title (v0) - Mastered.mp3
```

**Unnumbered Tracks (Metaverse Revelation):**
```
Track Title (v0) - Mastered.mp3
```

#### Naming Rules

1. **Title Case**: Each word capitalized (e.g., "Metaversal Odyssey")
2. **Spaces**: Words separated by spaces, not dashes
3. **No Apostrophes**: `Future's` → `Futures`, `Minotaur's` → `Minotaurs`
4. **Track Numbers**: Zero-padded 2-digit prefix with spaces (`01 - `, `02 - `, etc.)
5. **Suffix**: ` (v0) - Mastered.mp3` (with spaces)
6. **Separators**: ` - ` (space-dash-space) between number/title/suffix

#### Examples

**✅ ACTUAL FORMAT (in bucket):**
```
01 - Majestic Ascent (v0) - Mastered.mp3
05 - Metaversal Odyssey (v0) - Mastered.mp3
03 - Futures Grace (v0) - Mastered.mp3
20 - The Minotaurs Dance (v0) - Mastered.mp3
Beyond the Stars (v0) - Mastered.mp3
```

**❌ OLD/INCORRECT:**
```
01-Majestic Ascent-mastered-v0.mp3        (old lowercase dash format)
05-the-metaversal-odyssey-mastered-v0.mp3 (old lowercase dash format)
03-future's-grace-mastered-v0.mp3         (apostrophe not allowed)
```

### Folder Structure in App Storage

**Audio Bucket** (`replit-objstore-d115d11f-db73-441e-9c3d-e94db8c5dbe3`):

```
Audio Bucket (d115d11f)
├── Majestic Ascent/                          # 39 tracks (✅ uploaded)
│   ├── 01 - Majestic Ascent (v0) - Mastered.mp3
│   ├── 02 - Convergence (v0) - Mastered.mp3
│   ├── 03 - Futures Grace (v0) - Mastered.mp3
│   ├── 04 - Synthetic Emergence (v0) - Mastered.mp3
│   ├── 05 - Infinite Spark (v0) - Mastered.mp3
│   ├── 06 - Boss Battle (v0) - Mastered.mp3
│   ├── 07 - Adrenaline (v0) - Mastered.mp3
│   ├── 08 - Artificial Turbulence (v0) - Mastered.mp3
│   ├── 09 - Quantum Cathedral (v0) - Mastered.mp3
│   ├── 10 - Cybernetic Evolution (v0) - Mastered.mp3
│   ├── 11 - Vortex (v0) - Mastered.mp3
│   ├── 12 - Side Scroller (v0) - Mastered.mp3
│   ├── 13 - Level Up (v0) - Mastered.mp3
│   ├── 14 - Digital Phantom (v0) - Mastered.mp3
│   ├── 15 - Electric Horizon (v0) - Mastered.mp3
│   ├── 16 - Portal to Infinity (v0) - Mastered.mp3
│   ├── 17 - Virtual Awakening (v0) - Mastered.mp3
│   ├── 18 - Day Dreaming (v0) - Mastered.mp3
│   ├── 19 - Strollin Through Paradise (v0) - Mastered.mp3
│   └── 20 - The Minotaurs Dance (v0) - Mastered.mp3
│
├── Bridging Reality/                         # 20 tracks (✅ uploaded)
│   ├── 01 - The Evolution of AI (v0) - Mastered.mp3
│   ├── 02 - Rise of the New Dawn (v0) - Mastered.mp3
│   ├── 03 - Protocol of Joy (v0) - Mastered.mp3
│   ├── 04 - I Am Artificial (v0) - Mastered.mp3
│   ├── 05 - Metaversal Odyssey (v0) - Mastered.mp3
│   ├── 06 - Metaverse Movement (v0) - Mastered.mp3
│   ├── 07 - Rave in the Matrix (v0) - Mastered.mp3
│   ├── 08 - Metaverse Is Here (v0) - Mastered.mp3
│   ├── 09 - Be Who You Want To Be (v0) - Mastered.mp3
│   ├── 10 - Wake Up in the Metaverse (v0) - Mastered.mp3
│   ├── 11 - New Universe (v0) - Mastered.mp3
│   ├── 12 - Pinch to Zoom (v0) - Mastered.mp3
│   ├── 13 - Future Superstars (v0) - Mastered.mp3
│   ├── 14 - Are You Ready (v0) - Mastered.mp3
│   ├── 15 - Amplify (v0) - Mastered.mp3
│   ├── 16 - Unlock Your Inner Creator (v0) - Mastered.mp3
│   ├── 17 - Magic of the Metaverse (v0) - Mastered.mp3
│   ├── 18 - We Unite the Nation with the Metaverse (v0) - Mastered.mp3
│   ├── 19 - Metaverse Nation (v0) - Mastered.mp3
│   └── 20 - Next Frontier (v0) - Mastered.mp3
│
├── transformer/                              # 5 tracks (✅ uploaded)
│   ├── 01 - Ripple (v0) - Mastered.mp3
│   ├── 02 - Transformer (v0) - Mastered.mp3
│   ├── 03 - Metamorphosis (v0) - Mastered.mp3
│   ├── 04 - Techntonic (v0) - Mastered.mp3
│   └── 05 - Sonic Storm (v0) - Mastered.mp3
│
└── metaverse-revelation/                               # 11 tracks (✅ uploaded)
    ├── Beyond the Stars (v0) - Mastered.mp3
    ├── Cosmic Rendezvous (v0) - Mastered.mp3
    ├── Dreaming of a World (v0) - Mastered.mp3
    ├── Embrace the Moment (v0) - Mastered.mp3
    ├── In the Metaverse (v0) - Mastered.mp3
    ├── MetaDJ Revolution (v0) - Mastered.mp3
    ├── Metaverse Revelation (v0) - Mastered.mp3
    ├── Techno Dreams (v0) - Mastered.mp3
    ├── Vibe Coder (v0) - Mastered.mp3
    ├── We Are the Creators (v0) - Mastered.mp3
    └── Welcome to the Zuberverse (v0) - Mastered.mp3

Total: 56 of 56 audio files available (Transformer collection live)
```

### File Verification Checklist

Use this checklist to verify all files are uploaded correctly:

**Majestic Ascent (39 files):** ✅ Uploaded
- [x] `01 - Majestic Ascent (v0) - Mastered.mp3`
- [x] `02 - Convergence (v0) - Mastered.mp3`
- [x] `03 - Futures Grace (v0) - Mastered.mp3`
- [x] `04 - Synthetic Emergence (v0) - Mastered.mp3`
- [x] `05 - Infinite Spark (v0) - Mastered.mp3`
- [x] `06 - Boss Battle (v0) - Mastered.mp3`
- [x] `07 - Adrenaline (v0) - Mastered.mp3`
- [x] `08 - Artificial Turbulence (v0) - Mastered.mp3`
- [x] `09 - Quantum Cathedral (v0) - Mastered.mp3`
- [x] `10 - Cybernetic Evolution (v0) - Mastered.mp3`
- [x] `11 - Vortex (v0) - Mastered.mp3`
- [x] `12 - Side Scroller (v0) - Mastered.mp3`
- [x] `13 - Level Up (v0) - Mastered.mp3`
- [x] `14 - Digital Phantom (v0) - Mastered.mp3`
- [x] `15 - Electric Horizon (v0) - Mastered.mp3`
- [x] `16 - Portal to Infinity (v0) - Mastered.mp3`
- [x] `17 - Virtual Awakening (v0) - Mastered.mp3`
- [x] `18 - Day Dreaming (v0) - Mastered.mp3`
- [x] `19 - Strollin Through Paradise (v0) - Mastered.mp3`
- [x] `20 - The Minotaurs Dance (v0) - Mastered.mp3`

**Bridging Reality (20 files):** ✅ Uploaded
- [x] `01 - The Evolution of AI (v0) - Mastered.mp3`
- [x] `02 - Rise of the New Dawn (v0) - Mastered.mp3`
- [x] `03 - Protocol of Joy (v0) - Mastered.mp3`
- [x] `04 - I Am Artificial (v0) - Mastered.mp3`
- [x] `05 - Metaversal Odyssey (v0) - Mastered.mp3`
- [x] `06 - Metaverse Movement (v0) - Mastered.mp3`
- [x] `07 - Rave in the Matrix (v0) - Mastered.mp3`
- [x] `08 - Metaverse Is Here (v0) - Mastered.mp3`
- [x] `09 - Be Who You Want To Be (v0) - Mastered.mp3`
- [x] `10 - Wake Up in the Metaverse (v0) - Mastered.mp3`
- [x] `11 - New Universe (v0) - Mastered.mp3`
- [x] `12 - Pinch to Zoom (v0) - Mastered.mp3`
- [x] `13 - Future Superstars (v0) - Mastered.mp3`
- [x] `14 - Are You Ready (v0) - Mastered.mp3`
- [x] `15 - Amplify (v0) - Mastered.mp3`
- [x] `16 - Unlock Your Inner Creator (v0) - Mastered.mp3`
- [x] `17 - Magic of the Metaverse (v0) - Mastered.mp3`
- [x] `18 - We Unite the Nation with the Metaverse (v0) - Mastered.mp3`
- [x] `19 - Metaverse Nation (v0) - Mastered.mp3`
- [x] `20 - Next Frontier (v0) - Mastered.mp3`

**Transformer (5 files):** ✅ Uploaded
- [x] `01 - Ripple (v0) - Mastered.mp3`
- [x] `02 - Transformer (v0) - Mastered.mp3`
- [x] `03 - Metamorphosis (v0) - Mastered.mp3`
- [x] `04 - Techntonic (v0) - Mastered.mp3`
- [x] `05 - Sonic Storm (v0) - Mastered.mp3`

**Metaverse Revelation (11 files):** ✅ Uploaded
- [x] `Beyond the Stars (v0) - Mastered.mp3`
- [x] `Cosmic Rendezvous (v0) - Mastered.mp3`
- [x] `Dreaming of a World (v0) - Mastered.mp3`
- [x] `Embrace the Moment (v0) - Mastered.mp3`
- [x] `In the Metaverse (v0) - Mastered.mp3`
- [x] `Metaverse Revelation (v0) - Mastered.mp3`
- [x] `Metaverse Revelation (v0) - Mastered.mp3`
- [x] `Techno Dreams (v0) - Mastered.mp3`
- [x] `Vibe Coder (v0) - Mastered.mp3`
- [x] `We Are the Creators (v0) - Mastered.mp3`
- [x] `Welcome to the Metaverse Revelation (v0) - Mastered.mp3`

## Optimal File Formats & Encoding Standards

### Audio Format Specifications

MetaDJ Nexus uses high-quality MP3 encoding optimized for web streaming while maintaining near-transparent audio fidelity.

#### Required Audio Format
```
Format: MP3 (MPEG-1 Audio Layer III)
Bitrate: 320 kbps CBR (Constant Bit Rate)
Sample Rate: 44.1 kHz
Bit Depth: 16-bit (standard for MP3)
Channels: Stereo (2.0)
Encoder: LAME (recommended) or equivalent high-quality encoder
Target File Size: 5-10 MB per track (3-5 min duration)
```

#### Why These Specifications?

**320 kbps CBR:**
- Highest quality MP3 encoding (near-transparent to source)
- Constant bitrate ensures consistent quality throughout track
- Balances file size (~10 MB) with streaming performance
- Universal browser support with no browser issues
- Perceptually indistinguishable from lossless for most listeners

**44.1 kHz Sample Rate:**
- Industry standard for music distribution (CD quality)
- Nyquist theorem: captures all audible frequencies up to 22.05 kHz
- Native format for most audio production and mastering
- No resampling artifacts when converting from 44.1 kHz source files
- Optimal balance of quality and file size

**Why MP3-only (no WAV/FLAC stage)?**
- **File Size**: 10x smaller than typical lossless exports (5-10 MB vs 50-80 MB for uncompressed source files)
- **Streaming**: Fast loading and progressive playback
- **Bandwidth**: Reasonable data usage for users
- **Quality**: 320 kbps CBR is transparent for web playback
- **Support**: Universal across all browsers/devices
- **Performance**: No decoding overhead vs lossless formats

#### Production Workflow

**From Master to MetaDJ Nexus:**

1. **Production / Mastering** → Export the final mix directly as 320 kbps MP3
   - Format: 320 kbps CBR, 44.1 kHz, stereo
   - LANDR exports: request MP3 deliverables to avoid intermediate formats
   - Follow naming convention `NN - Track Title (v0) - Mastered.mp3`

2. **Archive** → Save the final MP3 as the canonical asset
   - Store offline: Master MP3 library with redundant backups
   - Backups mirror the exact files uploaded to App Storage

3. **Convert (optional)** → Only if a collaborator provides WAV/FLAC
   ```bash
   # Example: FFmpeg conversion with LAME encoder
   ffmpeg -i mastered-track.wav \
     -codec:a libmp3lame \
     -b:a 320k \
     -q:a 0 \
     -ar 44100 \
     -ac 2 \
     track-mastered-v0.mp3
   ```

4. **Upload** → Add to App Storage and update tracks.json

### Video Format Specifications

MetaDJ Nexus cinema videos are optimized for quality, performance, and cross-browser support.

#### Dual-Format Strategy

Provide two formats for maximum support:

**Primary: WebM (VP9 Codec)**
```
Container: WebM
Video Codec: VP9
Resolution: 960x540 (qHD) or 1280x720 (HD)
Frame Rate: 30 fps
Quality: CRF 36 (lower = higher quality, range 0-63)
Audio: Opus @ 96 kbps (if needed)
Target Size: ~35-50 MB for 60-second loop
Browsers: Chrome, Firefox, Edge (85%+ coverage)
```

**Fallback: MP4 (H.264 Codec)**
```
Container: MP4
Video Codec: H.264 (AVC) High Profile Level 4.2
Resolution: 1280x720 (HD) or 1920x1080 (Full HD)
Frame Rate: 30 fps (60 fps for high-motion)
Quality: CRF 18-23 (lower = higher quality, range 0-51)
Audio: AAC @ 192 kbps (if needed)
Target Size: ~100-150 MB for 60-second loop
Browsers: Safari, iOS, all others (100% coverage)
```

#### Resolution Guidelines

**For Background Visuals:**
- **960x540 (qHD)**: Optimal for abstract visuals, ~35 MB WebM
- **1280x720 (HD)**: Best balance of quality/size, ~50 MB WebM / ~120 MB MP4
- **1920x1080 (Full HD)**: Use only for high-detail content, ~80 MB WebM / ~200 MB MP4

**Recommendations:**
- Abstract/looping visuals: 960x540 or 1280x720
- Detailed/performance videos: 1280x720 or 1920x1080
- Mobile-first: Favor lower resolutions (960x540) for bandwidth

#### Frame Rate Guidelines

**30 fps (Standard):**
- ✅ Recommended for most visuals
- ✅ Smooth motion for abstract/ambient content
- ✅ 50% smaller file size vs 60 fps
- ✅ Lower CPU/GPU load during playback
- ✅ Better mobile device support

**60 fps (High-Motion):**
- Use only for fast-motion or performance content
- Requires 2x bitrate to maintain quality
- Higher CPU/GPU usage during decode
- ~2x file size vs 30 fps equivalent

#### Encoding Commands

**WebM (VP9) - Recommended Primary:**
```bash
ffmpeg -i source-video.mp4 \
  -vf scale=960:-2,fps=30 \
  -c:v libvpx-vp9 \
  -crf 36 \
  -b:v 0 \
  -row-mt 1 \
  -threads 8 \
  -speed 2 \
  -c:a libopus \
  -b:a 96k \
  output-video.webm
```

**MP4 (H.264) - Universal Fallback:**
```bash
ffmpeg -i source-video.mp4 \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -profile:v high \
  -level 4.2 \
  -c:a aac \
  -b:a 192k \
  -movflags +faststart \
  output-video.mp4
```

#### Quality vs Performance Balance

**Prioritize Quality:**
- Music showcases, artist portfolios
- HD resolution (1280x720 or 1920x1080)
- Lower CRF (18-23 for MP4, 30-36 for WebM)
- Accept larger file sizes (150-200 MB)

**Prioritize Performance:**
- Background loops, ambient visuals
- qHD resolution (960x540)
- Higher CRF (23-28 for MP4, 36-42 for WebM)
- Smaller files (35-80 MB)

**MetaDJ Nexus Approach (Current):**
- WebM: 960x540 @ 30fps, CRF 36 (~37 MB)
- MP4: 1280x720 @ 60fps, CRF 18 (~119 MB)
- Result: Fast WebM for modern browsers, quality MP4 for Safari/iOS

## Best Practices

### File Organization

#### Audio Files
- ✅ Use collection-based folders: `collection-name/track-file.mp3`
- ✅ Use descriptive filenames: `01-track-title-mastered-v0.mp3`
- ✅ Keep consistent naming conventions across collections
- ✅ Follow 320 kbps CBR MP3 standard (see specifications above)
- ✅ Archive the MP3s offline (not in App Storage)

#### Video Files
- ✅ Use `metadj-avatar/` folder (or other descriptive folders) for cinema assets
- ✅ Provide both WebM (primary) and MP4 (fallback) formats
- ✅ Optimize encoding per specifications above
- ✅ Test on Safari/iOS to ensure H.264 support
- ✅ Verify file sizes stay under 200 MB per file

### Performance Optimization

#### Caching Strategy
- ✅ Set long cache headers: `max-age=31536000, immutable` (1 year)
- ✅ Immutable content: Media files don't change after upload
- ✅ Efficient browser caching reduces bandwidth usage
- ✅ Version filenames when replacing existing files (e.g., `01-track-title-mastered-v2.mp3`) so clients with aggressive caching fetch the latest audio instantly
- ✅ Frontend preloader honors the browser HTTP cache; cached blob URLs resolve immediately on track selection and fall back to the direct `/api/audio/...` URL if a preload misses

#### Streaming Delivery
- ✅ API routes stream from App Storage using `createReadStream`, so playback starts as soon as the first bytes arrive
- ✅ `Readable.toWeb` bridges Node streams to the Next.js Web Response body without buffering entire files in memory
- ✅ Range requests map to `{ start, end }` stream offsets, allowing precise scrubbing for long-form mixes
- ✅ 200 responses include `Content-Length` when metadata is available, but rely on chunked transfer so the connection stays active for the full stream

#### Range Request Support
- ✅ Essential for audio/video seeking
- ✅ Enables progressive loading for large files
- ✅ Reduces initial load time and bandwidth
- ✅ Standards-compliant HTTP 206 responses

#### File Size Recommendations
- Audio: <10MB per track (320 kbps MP3)
- Video: <150MB per file (balance quality and load time)
- Total bucket: Monitor App Storage usage limits

### Security

- ✅ App Storage files are private by default
- ✅ Only accessible through your API routes
- ✅ Automatic authentication via Replit SDK
- ✅ No exposed credentials in code
- ✅ Request validation in API routes
- ✅ Error handling prevents information leakage

## Troubleshooting

### Issue: "File not found" errors (404)

**Symptoms**: Audio or video won't load, 404 errors in console

**Solutions**:
1. Verify file exists in App Storage UI (Tools → App Storage)
2. Check exact file path matches URL in tracks.json or component
3. Ensure collection/folder name is correct and case-sensitive
4. Verify correct bucket is configured in API route
5. Check file uploaded completely (no partial uploads)

### Issue: API routes connecting to wrong bucket

**Symptoms**: 
- Files exist in App Storage but return 404 errors
- Command-line tools can access files but browser cannot
- Different bucket appears when checking from different contexts

**Root Cause**: 
Next.js API routes run in a separate process and don't automatically use the `defaultBucketID` from `.replit` config. Each API route must explicitly specify its bucket ID.

**Solution**:
Update API routes to explicitly specify bucket IDs:

```typescript
// Audio API Route - Use audio bucket
const client = new Client({
  bucketId: 'replit-objstore-d115d11f-db73-441e-9c3d-e94db8c5dbe3'
});

// Video API Route - Use video bucket
const client = new Client({
  bucketId: 'replit-objstore-2f704fe3-7572-44ea-a321-f71c6c83daa6'
});
```

**Verification**:
1. Test audio endpoint: `curl -I http://localhost:5000/api/audio/Majestic Ascent/01%20-%20Majestic%20Ascent%20-%20Mastered%20v0.mp3`
2. Test video endpoint: `curl -I http://localhost:5000/api/video/metadj-avatar/MetaDJ%20Performance%20Loop%20-%20MetaDJ%20Radio.mp4`
3. Both should return `HTTP/1.1 200 OK`

### Issue: "Authentication failed"

**Symptoms**: API routes return authentication errors

**Solutions**:
1. Ensure you're using `@replit/object-storage` (not `@google-cloud/storage`)
2. Verify the app is running in Replit environment
3. Check that bucket exists in Tools → App Storage
4. Restart the Replit instance if authentication is stale

### Issue: Slow media loading

**Symptoms**: Long buffering times, slow initial playback

**Solutions**:
1. Check your internet connection
2. Verify file sizes are reasonable:
   - Audio: <10MB per track
   - Video: <150MB per file
3. Review App Storage usage limits in billing
4. Optimize file encoding/compression
5. Enable range requests for progressive loading

### Issue: Video not playing in Safari/iOS

**Symptoms**: Video works in Chrome but not Safari

**Solutions**:
1. Verify you have H.264 MP4 fallback in addition to WebM
2. Check video codec is H.264 (not HEVC/H.265)
3. Ensure both video sources use `/api/video/` URLs
4. Test with Safari Web Inspector for specific errors

### Issue: Local development not working

**Symptoms**: API routes fail in local IDE

**Solutions**:
1. Use Option 2 above (mock data for local dev)
2. Place test media files in `public/audio/` and `public/video/`
3. Add `IS_LOCAL` environment check to API routes
4. Or develop directly in Replit IDE for seamless experience

### Issue: Range requests not working (can't seek)

**Symptoms**: Audio/video won't scrub or seek to specific positions

**Solutions**:
1. Verify API routes return `Accept-Ranges: bytes` header
2. Check range request logic handles edge cases correctly
3. Ensure buffer slicing uses correct byte ranges
4. Test with browser DevTools Network tab (look for 206 responses)
5. Verify Content-Range header format matches spec

## Migration Notes

### From Local Files to App Storage

**Migration Steps:**

1. **Upload all media files to App Storage bucket**
   - Audio: Upload to collection folders (`Majestic Ascent/`, `Bridging Reality/`)
   - Video: Upload to `video/` folder

2. **Update all media URLs**
   - Audio: Update `audioUrl` paths in `src/data/tracks.json` to `/api/audio/...`
   - Video: Update `<source>` tags in components to `/api/video/...`

3. **Delete local media files**
   - Remove all MP3 files from `public/audio/`
   - Remove all video files from `public/video/`
   - Keep folder structure with `.gitkeep` files

4. **Verify .gitignore configuration**
   - Ensure all media patterns are excluded
   - Keep `.gitkeep` files allowed

5. **Test in production (Replit)**
   - Verify all tracks play correctly
   - Test seeking/scrubbing functionality
   - Verify video cinema loads and plays

### Deprecated Code Removed

The following previous Google Cloud Storage files were removed during migration:

- `lib/storage.js` - Manual auth setup (replaced by Replit SDK)
- `scripts/upload-to-storage.js` - Programmatic upload (use UI instead)
- `scripts/make-files-public.js` - Public access (not needed)
- `@google-cloud/storage` package - Replaced by `@replit/object-storage`

### Benefits of App Storage Migration

- ✅ **Automatic authentication**: No credential management
- ✅ **Simplified deployment**: No external services to configure
- ✅ **Smaller repository**: ~500MB reduced to <10MB
- ✅ **Better performance**: Replit's CDN infrastructure
- ✅ **Cost-effective**: Included with Replit hosting
- ✅ **Easier management**: Built-in UI for uploads

## Monitoring & Maintenance

### Storage Usage

**Check Current Usage:**
1. Open Replit Dashboard
2. Navigate to Billing → Usage
3. Review App Storage metrics

**Usage Limits:**
- Free tier: Check Replit documentation for current limits
- Paid plans: Higher limits available

### Performance Monitoring

**Metrics to Track:**
- API route response times (should be <200ms for initial request)
- Cache hit rates (aim for >80% after initial load)
- File download completion rates
- Error rates (should be <0.1%)

**Monitoring Tools:**
- Replit built-in analytics
- Browser DevTools Network tab
- Custom logging in API routes

### Regular Maintenance Tasks

**Weekly:**
- Review error logs for failed requests
- Check for unusually large files

**Monthly:**
- Audit storage usage and costs
- Review file organization and naming
- Clean up unused media files

**Quarterly:**
- Optimize file encodings and sizes
- Update video codecs for efficiency
- Review and update documentation

## Resources

- [Replit App Storage Docs](https://docs.replit.com/cloud-services/storage-and-databases/object-storage)
- [Replit Object Storage SDK (JavaScript)](https://docs.replit.com/reference/object-storage-javascript-sdk)
- [Replit Blog: Introducing App Storage](https://blog.replit.com/app-storage)
- [HTTP Range Requests (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests)
- [Video Formats for Web (MDN)](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Video_codecs)
- [Audio on the Web (MDN)](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Audio_codecs)

## Support

For issues specific to:
- **App Storage**: Contact Replit Support
- **MetaDJ Nexus**: Check project documentation or open GitHub issue
- **Media encoding**: See FFmpeg documentation and codec guides
