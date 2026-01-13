# MetaDJ Nexus Storage Architecture — Visual Reference

**Last Modified**: 2026-01-13 14:10 EST

**Quick visual guide to understand what breaks what**

---

## The Critical Path: How Audio Reaches Users

```
USER CLICKS PLAY
        ↓
   Browser sends GET /api/audio/collection/track.mp3
        ↓
   Next.js Route Handler (src/app/api/audio/[...path]/route.ts)
        ↓
   sanitizePath() validates URL ✅
        ↓
   rateLimit() checks 100 req/min ✅
        ↓
   getAudioBucket() from media-storage.ts ✅
        ↓
   media-storage selects R2 (primary) or Replit (fallback) ✅
        ↓
   bucket.file(path).createReadStream() ✅
        ↓
   toWebStream() converts to HTTP Stream ✅
        ↓
   NextResponse with 200 or 206 ✅
        ↓
   <audio> element plays stream
        ↓
   USER HEARS MUSIC ✅
```

**Break ANY step above = NO AUDIO**

---

## Component Dependencies Map

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT LAYER                          │
│              (Safe to refactor freely)                      │
├─────────────────────────────────────────────────────────────┤
│  AudioPlayer.tsx  │  BrowseView.tsx │  CollectionDetailView.tsx │
│  VisualConsole    │  WelcomeOverlay │  Wisdom.tsx          │
│                                                              │
│  All use track.audioUrl="/api/audio/..."                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                (DEPENDS ON)
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATA LAYER                                 │
│         (Safe to change if URLs preserved)                  │
├─────────────────────────────────────────────────────────────┤
│  music.json                                                │
│  collections.json                                           │
│                                                              │
│  Critical: ALL audioUrl fields must be "/api/audio/..."    │
└─────────────────────────────┬───────────────────────────────┘
                              │
                  (FETCHES FROM)
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   API LAYER                                 │
│      (CRITICAL - Breaking changes destroy app)             │
├─────────────────────────────────────────────────────────────┤
│  /api/audio/[...path]/route.ts                             │
│  /api/video/[...path]/route.ts                             │
│                                                              │
│  MUST STAY INTACT:                                          │
│  - Route paths                                              │
│  - Path sanitization                                        │
│  - Bucket access                                            │
│  - Stream handling                                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                  (READS FROM)
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 STORAGE LAYER                               │
│       (CRITICAL - Only accessed via API routes)            │
├─────────────────────────────────────────────────────────────┤
│  src/lib/media-storage.ts                                   │
│  - getAudioBucket() / getVideoBucket()                      │
│  - Selects provider via STORAGE_PROVIDER                    │
│                                                              │
│  Provider Implementations                                   │
│  - src/lib/r2-storage.ts (primary)                           │
│  - src/lib/replit-storage.ts (fallback)                      │
│                                                              │
│  R2 Bucket (metadj-nexus-media)                              │
│  - music/ (audio)                                            │
│  - visuals/ (video)                                          │
│                                                              │
│  MUST STAY INTACT:                                           │
│  - media-storage exports                                    │
│  - Provider selection logic                                 │
│  - R2 credentials (or Replit IDs if fallback)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Refactoring Impact Matrix

```
IF YOU CHANGE...                    THEN THIS BREAKS...

Components (AudioPlayer.tsx)         Nothing (✅ Safe)
├─ Extract sub-components           → Playback might improve
├─ Refactor styles                  → UI might look different
└─ Add features                      → Features work

Data Structure (music.json)
├─ Add new fields                    → Nothing (✅ Safe)
├─ Rearrange tracks                  → Nothing (✅ Safe)
└─ Change audioUrl pattern           → EVERYTHING (❌ All audio)

API Routes (/api/audio/route.ts)
├─ Change route path                 → EVERYTHING (❌ All audio)
├─ Modify path sanitization          → EVERYTHING (❌ Security)
├─ Change bucket access              → EVERYTHING (❌ All audio)
└─ Modify stream handling            → EVERYTHING (❌ All audio)

Storage Providers (media-storage.ts / r2-storage.ts)
├─ Change provider selection         → EVERYTHING (❌ All audio)
├─ Change function names             → EVERYTHING (❌ API routes)
└─ Remove exports                    → EVERYTHING (❌ All routes)

Rate Limiter (rate-limiter.ts)
├─ Lower request limit               → Maybe (⚠️ Performance)
├─ Remove rate limiting              → Nothing (✅ Works faster)
└─ Add authentication                → Breaks (❌ Blocks audio)
```

---

## Safe Refactoring Zones

### 🟢 GREEN ZONE (Refactor freely)

```
✅ Component Tree
   - src/app/(experience)/layout.tsx
   - src/components/home/HomePageClient.tsx
   - src/components/*.tsx
   - Extract components
   - Add new components
   - Restyle anything
   → Audio still works!

✅ State Management
   - Add Context providers
   - Extract custom hooks
   - Refactor localStorage
   - Change component state
   → Audio still works!

✅ Utilities
   - src/hooks/useKeyboardShortcuts.ts
   - Search and filtering logic
   - Collection switching
   - UI interactions
   → Audio still works!
```

### 🟡 YELLOW ZONE (Careful changes)

```
⚠️ Track Data (music.json)
   CAN CHANGE:
   - Add new fields
   - Reorganize data
   - Create new collections

   CANNOT CHANGE:
   - audioUrl pattern must stay /api/audio/...

   TEST AFTER:
   - Verify 10 tracks play
   - Check Network tab for 200/206 responses

⚠️ Collections (collections.json)
   CAN CHANGE:
   - Rename collections
   - Reorder tracks in collections
   - Add new collections

   CANNOT CHANGE:
   - Must reference tracks with /api/audio/ URLs

   TEST AFTER:
   - Play tracks from Majestic Ascent
```

### 🔴 RED ZONE (Don't touch)

```
❌ Storage Providers (src/lib/media-storage.ts, src/lib/r2-storage.ts)
   ✓ If you break this → All audio breaks
   ✓ Extensive testing required
   ✓ Have rollback plan ready

   DO NOT:
   - Change provider exports
   - Modify initialization
   - Remove exports

❌ Audio Route (src/app/api/audio/[...path]/route.ts)
   ✓ If you break this → All audio breaks
   ✓ Extensive testing required
   ✓ Have rollback plan ready

   DO NOT:
   - Change route path
   - Modify path sanitization
   - Change bucket access pattern
   - Touch stream handling

❌ Video Route (src/app/api/video/[...path]/route.ts)
   ✓ If you break this → Video breaks
   ✓ Extensive testing required
   ✓ Have rollback plan ready

   DO NOT:
   - Change route path
   - Modify path sanitization
   - Touch stream.destroy() logic
   - Change range request handling
```

---

## The Armor Around Streaming

```
┌─────────────────────────────────────┐
│    Browser Request for Audio        │
│  GET /api/audio/collection/file.mp3 │
└────────────────────┬────────────────┘
                     │
                     ↓
        ┌──────────────────────────┐
        │  Path Sanitization       │
        │  ✅ Reject '..' traversal│
        │  ✅ Reject null bytes    │
        │  ✅ Reject absolute '/'  │
        │  ✅ Enforce .mp3 only    │
        └────────────┬─────────────┘
                     │
                     ↓
        ┌──────────────────────────┐
        │  Rate Limiter            │
        │  ✅ 200 req/min limit    │
        │  ✅ IP fingerprinting    │
        │  ✅ 429 if exceeded      │
        └────────────┬─────────────┘
                     │
                     ↓
        ┌──────────────────────────┐
        │  Bucket Access           │
        │  ✅ Get GCS Bucket       │
        │  ✅ Fetch metadata       │
        │  ✅ Validate content type│
        │  ✅ Only serve audio     │
        └────────────┬─────────────┘
                     │
                     ↓
        ┌──────────────────────────┐
        │  Stream Creation         │
        │  ✅ createReadStream()   │
        │  ✅ Handle HTTP ranges   │
        │  ✅ Proper headers       │
        │  ✅ Cache-control: 1yr   │
        └────────────┬─────────────┘
                     │
                     ↓
        ┌──────────────────────────┐
        │  Response to Browser     │
        │  ✅ HTTP 200 or 206      │
        │  ✅ audio/mpeg MIME type │
        │  ✅ Content-Length set   │
        │  ✅ Accept-Ranges: bytes │
        └────────────┬─────────────┘
                     │
                     ↓
        ┌──────────────────────────┐
        │  Browser Playback        │
        │  ✅ <audio> gets stream  │
        │  ✅ Can seek with ranges │
        │  ✅ Buffering works      │
        │  ✅ User hears music     │
        └──────────────────────────┘

EVERY LAYER PROTECTS THE STREAM
Break one layer = no audio
```

---

## Testing Decision Tree

```
Audio won't play?

    ├─ One specific track?
    │  └─ Check music.json audioUrl for that track
    │     └─ Is it "/api/audio/collection/file.mp3"?
    │        ├─ NO  → Fix URL pattern
    │        └─ YES → Check browser Network tab
    │                 └─ Is status 404? → File not in storage (R2 or fallback)
    │                 └─ Is status 400? → Path sanitization blocked
    │                 └─ Is status 429? → Rate limiter blocked
    │
    ├─ All tracks broken?
    │  └─ Check browser console for errors
    │     ├─ "Cannot read property 'file' of null" → media-storage broken
    │     ├─ "Invalid file path" → path sanitization changed
    │     ├─ "bucket.file is not a function" → storage API changed
    │     └─ Something else → Investigate API route
    │
    ├─ Cinema video won't play?
    │  └─ Same process but check /api/video/ route
    │     ├─ Check browser Network tab for /api/video/ request
    │     └─ Is it 200/206?
    │        ├─ YES → But video won't play? → Format issue
    │        └─ NO  → Route issue, check video route
    │
    └─ Multiple errors?
       └─ You likely modified RED ZONE (storage/API routes)
          └─ REVERT CHANGES and start over
```

---

## The Two Unbreakable Rules

```
RULE 1: audioUrl Pattern
────────────────────────
Every track.audioUrl must match:
  /api/audio/<collection-slug>/<filename>.mp3

Examples:
  ✅ /api/audio/majestic-ascent/01 - Track Title - Mastered v0.mp3
  ✅ /api/audio/bridging-reality/05 - Track - Mastered v0.mp3
  ❌ /api/audio/file.mp3 (wrong pattern, path sanitization rejects)
  ❌ /public/audio/file.mp3 (wrong route, API route won't serve)
  ❌ https://storage.com/file.mp3 (external URL, won't work)

If you change this pattern → All audio breaks


RULE 2: API Route Stability
────────────────────────────
API routes MUST NOT change:
  - Route path: /api/audio/[...path]
  - Route path: /api/video/[...path]
  - Bucket access pattern
  - Stream handling
  - Path sanitization logic

If you change any of these → All audio/video breaks
```

---

## Before You Refactor: 3-Step Validation

```
STEP 1: Understand What You're Changing
────────────────────────────────────────
Files to change: ____________________
Questions to ask:
  ✓ Does this modify audioUrl pattern?
  ✓ Does this touch API routes?
  ✓ Does this change storage access?
  ✓ Does this modify path validation?

If any answer is YES → Extra careful, extensive testing required


STEP 2: Plan Your Testing
────────────────────────
Before commit, you will test:
  ✓ All 10 tracks play
  ✓ Seeking/scrubbing works
  ✓ Collection switching works
  ✓ Cinema plays
  ✓ Network tab shows 200/206
  ✓ No console errors
  ✓ Mobile works
  ✓ Multiple browsers work

If you can't test all these → Don't commit yet


STEP 3: Have Rollback Ready
────────────────────────────
Before committing:
  ✓ Know the current working commit hash
  ✓ Know how to git revert if needed
  ✓ Have staging environment set up
  ✓ Know who to ask for help
```

---

## Quick Status Codes Reference

### Expected Responses

```
✅ HTTP 200 - Full file served (normal)
✅ HTTP 206 - Partial content for seek (normal)

❌ HTTP 400 - Bad request (path sanitization blocked)
   → Check audioUrl pattern
   → Check for .. or null bytes in path

❌ HTTP 404 - File not found
   → Check file exists in storage (R2 or fallback)
   → Check audioUrl pattern matches file

❌ HTTP 429 - Too many requests (rate limit)
   → Check rate limiter isn't broken
   → Check for request loops

❌ HTTP 500 - Server error
   → Check logs
   → Check storage access
   → Check path handling
```

---

## Architecture in One Diagram

```
SAFE                           CRITICAL
┌──────────────┐              ┌──────────────┐
│ Components   │ ---uses---→  │ audioUrl     │
│ (refactor!)  │              │ pattern      │
└──────────────┘              └──────┬───────┘
                                     │
                    Must match /api/audio/...
                                     │
                              ┌──────▼───────┐
                              │  API Route   │
                              │ (don't touch)│
                              └──────┬───────┘
                                     │
                              Uses bucket.file()
                                     │
                              ┌──────▼───────┐
                              │  Storage     │
                              │  (critical!) │
                              └──────────────┘


CONCLUSION:
- Components change freely
- As long as audioUrl stays the same
- API and Storage stay safe
- Audio keeps working
```

---

**Key Takeaway**: All roads lead back to the audioUrl pattern and API routes. Keep those intact, refactor everything else freely.
