# Transformer Collection — Preview Documentation

**Last Modified**: 2026-01-26 00:00 EST

## Status: Preview / Placeholder

**Current State**: Music Collection dropdown entry visible with placeholder tracks
**Track Upload**: In progress (awaiting final polish)
**Timeline**: TBD based on final prep completion

## Overview

The Transformer collection represents the next evolution in my AI-generated music journey. This collection explores themes of change, growth, and metamorphosis through dynamic soundscapes and energetic compositions.

## Collection Identity

**Name**: Transformer
**Type**: Collection
**Gradient**: Orange → Amber → Red (energy surge)
**Theme**: Transformation, evolution, dynamic change
**Energy**: High-intensity, powerful, transformative

## Current Implementation

### Placeholder Status

The Transformer tab currently displays with:
- **Visible collection tab** with distinctive gradient
- **Placeholder tracks** (5 initial tracks defined)
- **Coming soon messaging** in UI
- **Collection system integration** complete

### Technical Details

**File**: `src/data/collections.json`
```json
{
  "id": "transformer",
  "name": "Transformer",
  "type": "collection",
  "description": "Powerful transformations through dynamic soundscapes",
  "gradient": "from-orange-500 via-amber-500 to-red-500",
  "releaseDate": "TBD",
  "trackCount": 5
}
```

**Track Definitions**: `src/data/tracks.json`
- Placeholder metadata structure complete
- Audio files not yet uploaded to App Storage
- Artwork: `/images/transformer-collection.svg` (hexagonal grid with circuit nodes)

## Upload Workflow (When Ready)

### 1. Master and Export
```bash
# Local prep workflow
~/MusicArchive/Transformer/
  ├── 01 - Track Title - Mastered V0.wav
  ├── 02 - Track Title - Mastered V0.wav
  └── ...
```

### 2. Create MP3 Derivatives
```bash
# 320 kbps MP3 encoding
ffmpeg -i "01 - Track Title - Mastered V0.wav" \
  -codec:a libmp3lame -b:a 320k \
  "01-track-title-mastered-v0.mp3"
```

### 3. Upload to Replit App Storage
```bash
# Upload to transformer collection folder
replit storage upload \
  audio-files/transformer/01-track-title-mastered-v0.mp3 \
  ./renders/01-track-title-mastered-v0.mp3
```

### 4. Update Track Metadata
```json
// Update src/data/tracks.json with real data
{
  "id": "transformer-001",
  "title": "Actual Track Title",
  "artist": "MetaDJ",
  "collection": "transformer",
  "duration": 240,
  "releaseDate": "2025-MM-DD",
  "audioUrl": "/api/audio/transformer/01-track-title-mastered-v0.mp3",
  "artworkUrl": "/images/collections/transformer-cover.jpg",
  "genres": ["Genre1", "Genre2"]
}
```

### 5. Deploy and Verify
```bash
# Test locally first
npm run dev

# Deploy to production
git add .
git commit -m "feat: Add Transformer collection tracks"
git push origin main
```

## Collection System Integration

### Queue Behavior
- Transformer tracks integrate with existing queue system
- Collection context preserved in queue persistence
- Shuffle respects collection boundaries
- Share actions for tracks/collections point to the platform home URL (no deep links); Wisdom content uses `/wisdom/*` deep links for sharing.

### UI Integration
- Carousel card with orange/amber/red gradient
- Badge system shows "Transformer" on all transformer tracks
- Collection description displays when tab selected
- Search includes transformer tracks when available

### Analytics Tracking
When tracks are live:
- `track_played` events track transformer listens
- `collection_viewed` logs transformer tab interactions
- Search results include transformer track discovery

## Visual Identity

### Gradient System
```css
/* Transformer gradient - energy surge */
.gradient-transformer {
  background: linear-gradient(135deg,
    oklch(0.70 0.15 45),   /* Orange */
    oklch(0.75 0.12 75),   /* Amber */
    oklch(0.60 0.20 25)    /* Red */
  );
}
```

### Design Elements
- **Primary Color**: Orange (#F97316)
- **Accent Colors**: Amber, Red
- **Theme**: Energy, transformation, power
- **Visual Style**: Bold, dynamic, high-contrast

## Timeline

**Current Phase**: Pre-production
- [ ] Final polish in progress
- [ ] Track selection and ordering
- [ ] Artwork creation
- [ ] Metadata finalization

**Next Phase**: Upload preparation
- [ ] Export 320 kbps MP3 derivatives
- [ ] Upload to Replit App Storage
- [ ] Update track metadata
- [ ] Test playback and queue integration

**Final Phase**: Launch
- [ ] Deploy updated metadata
- [ ] Verify all tracks playable
- [ ] Update collection documentation
- [ ] Announce collection availability

## Related Documentation

- **Collection System**: `3-projects/5-software/metadj-nexus/docs/features/collections-system.md`
- **Upload Guide**: `docs/MEDIA-STORAGE.md`
- **Tab System**: `../archive/2026-01-05-tab-content-reference.md`
- **Data Architecture**: `3-projects/5-software/metadj-nexus/docs/architecture/data-architecture.md`

---

**Note**: This document will be updated when Transformer tracks are ready for upload and launch. The collection infrastructure is complete and ready for track ingestion once the final prep work is complete.
