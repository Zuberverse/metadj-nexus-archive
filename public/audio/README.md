# Audio Assets — Cloudflare R2 Storage

**Last Modified**: 2026-01-05 17:00 EST

This directory is **intentionally empty** by design. All audio files for MetaDJ Nexus are hosted on **Cloudflare R2** and served through Next.js API routes.

## Architecture

### Production (Cloudflare R2)
- Audio files stored in R2 bucket: `metadj-nexus-media`
- Structure: `music/<collection>/<NN - Track Title (vX) - Mastered.mp3>`
- Served via: `/api/audio/[...path]/route.ts`
- Format: 320 kbps MP3

**Example**:
- Storage path: `music/majestic-ascent/01 - Majestic Ascent (v0) - Mastered.mp3`
- Public URL: `/api/audio/majestic-ascent/01 - Majestic Ascent (v0) - Mastered.mp3`
- Browser streams from R2 through API proxy

### Local Development

For local development:
1. Place temporary MP3 files in this directory
2. Files are gitignored (see `.gitignore`)
3. Update `audioUrl` in `src/data/tracks.json` to point to local paths if needed

**Example local setup**:
```
public/audio/
└── majestic-ascent/
    ├── 01-track.mp3
    └── 02-track.mp3
```

## Why This Approach?

**Benefits**:
- ✅ Repository stays lightweight (<10MB vs 500MB+)
- ✅ Large media files never committed to Git
- ✅ Zero egress fees with Cloudflare R2
- ✅ Streaming performance optimized via range requests
- ✅ Scalable for future catalog expansion

## Complete Documentation

See **[docs/MEDIA-STORAGE.md](../../docs/MEDIA-STORAGE.md)** for:
- Full upload workflow (rclone commands)
- Encoding specifications (320 kbps MP3)
- Naming conventions (kebab-case directories, Title Case filenames)
- Troubleshooting guide

## Data References

Track metadata lives in:
- `src/data/tracks.json` — Track metadata with `/api/audio/` URLs
- `src/data/collections.json` — Collection metadata

## Scripts

Encoding utilities available in:
- `scripts/encode-audio.sh` — Helper that converts high-resolution source files to 320 kbps MP3
- `scripts/validate-tracks.js` — Validate track metadata

---

**Questions?** Check `docs/MEDIA-STORAGE.md` or `CLAUDE.md`.
