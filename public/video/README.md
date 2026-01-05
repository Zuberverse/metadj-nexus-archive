# Video Assets — Cloudflare R2 Storage

**Last Modified**: 2026-01-05 17:00 EST

This directory is **intentionally empty** by design. All video files for MetaDJ Nexus's Cinema are hosted on **Cloudflare R2** and served through Next.js API routes.

## Architecture

### Production (Cloudflare R2)
- Video files stored in R2 bucket: `metadj-nexus-media`
- Structure: `visuals/<Descriptive Title - Context.ext>`
- Served via: `/api/video/[...path]/route.ts`

**Browser Selection**:
- Chrome/Firefox/Edge: Use VP9 WebM (37MB, 960×540, 30fps)
- Safari/iOS: Use H.264 MP4 (119MB, 1280×720, 60fps)

**Example**:
```html
<video>
  <source src="/api/video/MetaDJ Performance Loop - MetaDJ Nexus.mp4" type="video/mp4" />
</video>
```

### Local Development

For local development:
1. Place temporary video files in this directory
2. Files are gitignored (see `.gitignore`)
3. Component will fallback to local paths if R2 unavailable

**Example local setup**:
```
public/video/
├── MetaDJ Performance Loop - MetaDJ Nexus.webm  (VP9 WebM, optional)
└── MetaDJ Performance Loop - MetaDJ Nexus.mp4   (H.264 MP4)
```

## Video Specifications

### Primary: VP9 WebM
- Container: WebM
- Codec: VP9
- Resolution: 960×540 (qHD)
- Frame Rate: 30 fps
- Quality: CRF 36
- Audio: Opus @ 96 kbps
- Size: ~37 MB (60-second loop)
- Browser Support: 85%+ (Chrome, Firefox, Edge)

### Fallback: H.264 MP4
- Container: MP4
- Codec: H.264 High Profile Level 4.2
- Resolution: 1280×720 (HD)
- Frame Rate: 60 fps
- Quality: CRF 18
- Audio: AAC @ 192 kbps
- Size: ~119 MB (60-second loop)
- Browser Support: 100% (Safari, iOS)

## Why Dual Format?

**Safari requires H.264**: Safari/iOS doesn't support VP9 codec natively.
**WebM for efficiency**: VP9 delivers similar quality at 1/3 the file size.
**Native fallback**: Browser automatically selects compatible format via `<source>` tags.

## Encoding Commands

Use the provided script:
```bash
./scripts/encode-video.sh source.mp4 "MetaDJ Performance Loop - MetaDJ Nexus"
```

Or manually:
```bash
# VP9 WebM
ffmpeg -i source.mp4 \
  -vf scale=960:-2,fps=30 \
  -c:v libvpx-vp9 -crf 36 -b:v 0 \
  -c:a libopus -b:a 96k \
  "MetaDJ Performance Loop - MetaDJ Nexus.webm"

# H.264 MP4
ffmpeg -i source.mp4 \
  -c:v libx264 -preset slow -crf 18 -profile:v high -level 4.2 \
  -c:a aac -b:a 192k -movflags +faststart \
  "MetaDJ Performance Loop - MetaDJ Nexus.mp4"
```

## Complete Documentation

See **[docs/MEDIA-STORAGE.md](../../docs/MEDIA-STORAGE.md)** for:
- Upload workflow (rclone commands)
- Naming conventions
- Troubleshooting

---

**Questions?** Check `docs/MEDIA-STORAGE.md` or `CLAUDE.md`.
