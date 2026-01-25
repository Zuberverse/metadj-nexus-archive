# MetaDJ Nexus Scripts

**Last Modified**: 2026-01-24 01:00 EST

Automation utilities for audio encoding, video conversion, and data validation.

## Available Scripts

### Audio Encoding

**`encode-audio.sh`**
- Helper that converts any high-resolution source files (e.g., WAV) to 320 kbps MP3 for streaming. The current pipeline exports directly to MP3 music.
- Usage: `./scripts/encode-audio.sh input.wav output.mp3`
- See: `docs/MEDIA-STORAGE.md` for full workflow

### Video Encoding

**`encode-video.sh`**
- Creates VP9 WebM and H.264 MP4 versions for cinema
- Usage: `./scripts/encode-video.sh input.mp4 output-name`
- Outputs: `output-name.webm` and `output-name.mp4`

### Track Validation

**`validate-music.js`**
- Validates track metadata in `src/data/music.json`
- Checks: unique IDs, valid collection refs, 2 genre tags, required fields, valid URLs, collection track counts, retired tags
- Usage: `node scripts/validate-music.js`

### Knowledge Base Validation

**`validate-knowledge-base.js`**
- Validates MetaDJai knowledge base files in `src/data/knowledge/`
- Checks: file freshness (lastUpdated timestamps), entry structure, required keywords, category coverage
- Usage: `node scripts/validate-knowledge-base.js [--strict]`
- Options:
  - `--strict`: Fail if any file is older than 7 days (useful for CI)
- Output: Color-coded report showing validation status, entry counts, and freshness per file

## Requirements

- **FFmpeg**: Required for audio/video encoding
  - Install: `brew install ffmpeg` (macOS)
- **Node.js**: Required for validation script
  - Version: 20+

## Encoding Standards

### Audio
- Format: MP3
- Bitrate: 320 kbps CBR
- Sample Rate: 44.1 kHz
- Channels: Stereo

### Video
- Primary: VP9 WebM @ 960×540, 30fps, CRF 36
- Fallback: H.264 MP4 @ 1280×720, 60fps, CRF 18

See `docs/MEDIA-STORAGE.md` for complete specifications.
