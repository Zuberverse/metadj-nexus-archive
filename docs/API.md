# MetaDJ Nexus API Documentation

**Last Modified**: 2025-12-27 15:24 EST

## Overview

MetaDJ Nexus exposes several API endpoints for media streaming, AI chat, health monitoring, and logging. All endpoints use the Next.js App Router API routes.

## Base URL

- **Development (HTTPS)**: `https://localhost:8100/api` (default `npm run dev`)
- **Development (HTTP)**: `http://localhost:8100/api` (use `npm run dev:http`)
- **Production**: `https://metadj.ai/api`

---

## Endpoints

### Audio Streaming

#### `GET /api/audio/[...path]` (also supports `HEAD`)

Streams MP3 audio files from Replit App Storage with range support, caching, and strict path validation.

**Path Parameters**:
- `path` — Array of path segments (e.g., `collection-name/track-file.mp3`)

**Response**:
- `200 OK` — Full stream (or HEAD metadata)
- `206 Partial Content` — Range request
- `304 Not Modified` — Cache hit (ETag / If-None-Match)
- `400 Bad Request` — Invalid/unsafe path (blocked by sanitization)
- `404 Not Found` — File missing (or blocked by content-type guard)
- `503 Service Unavailable` — Storage bucket unavailable
- `500 Internal Server Error` — Unexpected streaming error

**Headers**:
- `Content-Type`: `audio/mpeg`
- `Content-Length`: File size
- `Accept-Ranges`: `bytes`
- `Cache-Control`: `public, max-age=31536000, immutable`
- `ETag`, `Last-Modified`: When available (enables `304 Not Modified`)

**Security**:
- Path sanitization via `sanitizePathSegments()`
- Extension whitelist (`.mp3` only)
- Metadata content-type validation (`audio/mpeg` / `audio/mp3`)
- IP logging for blocked attempts

---

### Video Streaming

#### `GET /api/video/[...path]` (also supports `HEAD`)

Streams video files from Replit App Storage for Cinema visuals.

**Path Parameters**:
- `path` — Array of path segments (e.g., `scene-name/visual.mp4`)

**Response**:
- `200 OK` — Full stream (or HEAD metadata)
- `206 Partial Content` — Range request
- `304 Not Modified` — Cache hit (ETag / If-None-Match)
- `400 Bad Request` — Invalid/unsafe path (blocked by sanitization)
- `404 Not Found` — File missing or unsupported extension
- `503 Service Unavailable` — Storage bucket unavailable
- `500 Internal Server Error` — Unexpected streaming error

**Headers**:
- `Content-Type`: `video/mp4` | `video/webm` | `video/quicktime`
- `Content-Length`: File size
- `Accept-Ranges`: `bytes`

**Security**:
- Path sanitization
- Extension whitelist (`.mp4`, `.webm`, `.mov`)
- Content-type validation

---

### MetaDJai Chat (Non-Streaming)

#### `POST /api/metadjai`

Sends a message to MetaDJai and receives a complete response.

**Request Body**:
```json
{
  "messages": [
    { "role": "user", "content": "Hello MetaDJai!" }
  ],
  "modelPreference": "openai",
  "context": {
    "nowPlayingTitle": "Track Name",
    "nowPlayingArtist": "MetaDJ",
    "selectedCollectionTitle": "Majestic Ascent",
    "mode": "adaptive",
    "cinemaActive": false,
    "wisdomActive": false,
    "pageContext": {
      "view": "collections",
      "details": "Browsing Majestic Ascent."
    }
  }
}
```

**Request Fields**:
- `messages` (required) — Array of chat messages (max 50)
  - `role`: `"user"` | `"assistant"`
  - `content`: Message text (max 4000 chars, HTML stripped)
- `modelPreference` (optional) — `"openai"` | `"google"` | `"anthropic"` | `"xai"` (default: OpenAI/GPT)
- `context` (optional) — Session context to ground responses
  - `nowPlayingTitle` / `nowPlayingArtist` — Current track (if any)
  - `selectedCollectionTitle` — Currently selected collection
  - `mode` — `"adaptive"` (optional internal hint; no UI mode toggle)
  - `cinemaActive` / `wisdomActive` — Whether those surfaces are open
  - `pageContext` — `{ view, details }` describing what the user is doing
  - `catalogSummary` — Optional rich catalog snapshot for recommendations

**Response**:
```json
{
  "reply": "Here's what I found in the catalog...",
  "model": "gpt-5.2-chat-latest",
  "usage": {
    "promptTokens": 150,
    "completionTokens": 200
  },
  "toolUsage": [
    { "id": "call_123", "name": "searchCatalog" }
  ]
}
```

**Status Codes**:
- `200 OK` — Successful response
- `400 Bad Request` — Invalid payload or validation error
- `429 Too Many Requests` — Rate limit exceeded
- `502 Bad Gateway` — AI provider error
- `503 Service Unavailable` — AI not configured

**Rate Limiting**:
- 20 messages per 5-minute window
- 500ms minimum between messages (session-based clients)
- Returns `Retry-After` header when limited

---

### Daydream StreamDiffusion (Cinema "Dream")

Endpoints proxy Daydream's StreamDiffusion API and WHIP ingest to protect secrets and enforce host rules.

**Environment Variables**
- `DAYDREAM_API_KEY` (required) — Daydream API key (`daydream_live_*`)
- `DAYDREAM_API_GATEWAY` (optional) — API gateway URL (default: `https://api.daydream.live`)
- `DAYDREAM_WHIP_ALLOWED_HOSTS` (optional) — CSV allowlist (default: `daydream.live,sdaydream.live,livepeer.com,livepeer.studio,livepeer.cloud,lp-playback.studio`). If WHIP URLs resolve to additional domains, add those base domains.
- `DAYDREAM_WHIP_ALLOW_DEV` (optional) — Set to `true` to permit local HTTP WHIP during development

**Ownership**
- Mutating endpoints (PATCH parameters, DELETE stream, WHIP POST/PATCH/DELETE) require the active session that created the stream.
- Requests from other sessions return `403`.

---

#### `POST /api/daydream/streams`

Creates a new Daydream StreamDiffusion stream.

**Request Body** (TypeScript Interface):
```typescript
interface DaydreamStreamCreateRequest {
  pipeline: "streamdiffusion"
  params: {
    model_id: string                    // Required: e.g., "stabilityai/sd-turbo"
    prompt: string                      // Required: Generation prompt
    negative_prompt?: string            // Optional: Negative prompt
    seed?: number                       // Optional: Random seed (default: 42)
    width?: number                      // Optional: Output width, 384-1024, divisible by 64
    height?: number                     // Optional: Output height, 384-1024, divisible by 64
    num_inference_steps?: number        // Optional: Inference steps (default: 25)
    guidance_scale?: number             // Optional: Guidance scale (default: 1)
    delta?: number                      // Optional: Diffusion delta (default: 0.7)
    acceleration?: "tensorrt" | "xformers" | "none"  // Optional: Acceleration method
    ip_adapter?: {
      scale: number
      enabled: boolean
    }
    use_denoising_batch?: boolean       // Optional: Batch denoising (default: true)
    do_add_noise?: boolean              // Optional: Add noise (default: true)
    t_index_list?: number[]             // Optional: Timestep indices
    normalize_seed_weights?: boolean
    normalize_prompt_weights?: boolean
    seed_interpolation_method?: "linear" | "slerp"
    prompt_interpolation_method?: "linear" | "slerp"
    enable_similar_image_filter?: boolean
    similar_image_filter_threshold?: number
    similar_image_filter_max_skip_frame?: number
    controlnets?: ControlNetConfig[]
  }
}

interface ControlNetConfig {
  enabled: boolean
  model_id: string                      // e.g., "thibaud/controlnet-sd21-openpose-diffusers"
  preprocessor?: string                 // e.g., "pose_tensorrt", "canny", "depth_tensorrt"
  conditioning_scale: number            // Weight of this controlnet (0-1)
  preprocessor_params?: Record<string, unknown>
  control_guidance_start?: number       // When to start guidance (0-1)
  control_guidance_end?: number         // When to end guidance (0-1)
}
```

**Note**: MetaDJ Nexus omits LCM LoRA fields to keep Daydream defaults. Upstream Daydream supports LoRA configuration if needed. The prompt bar UI is currently disabled; prompt updates are driven by persona selection only.

**Request Example**:
```json
{
  "pipeline": "streamdiffusion",
  "params": {
    "seed": 42,
    "delta": 0.7,
    "width": 512,
    "height": 512,
    "prompt": "androgynous cartoon magical dj blue sparkle",
    "model_id": "stabilityai/sd-turbo",
    "controlnets": [
      {
        "enabled": true,
        "model_id": "thibaud/controlnet-sd21-openpose-diffusers",
        "preprocessor": "pose_tensorrt",
        "conditioning_scale": 0.75,
        "preprocessor_params": {},
        "control_guidance_end": 1,
        "control_guidance_start": 0
      },
      {
        "enabled": true,
        "model_id": "thibaud/controlnet-sd21-depth-diffusers",
        "preprocessor": "depth_tensorrt",
        "conditioning_scale": 0.75,
        "preprocessor_params": {},
        "control_guidance_end": 1,
        "control_guidance_start": 0
      }
    ],
    "acceleration": "tensorrt",
    "do_add_noise": true,
    "t_index_list": [12, 20, 24],
    "guidance_scale": 1,
    "negative_prompt": "blurry, low quality, flat, 2d",
    "num_inference_steps": 25,
    "use_denoising_batch": true,
    "normalize_seed_weights": true,
    "normalize_prompt_weights": true,
    "seed_interpolation_method": "linear",
    "enable_similar_image_filter": true,
    "prompt_interpolation_method": "slerp",
    "similar_image_filter_threshold": 0.98,
    "similar_image_filter_max_skip_frame": 10
  }
}
```

**Response Body** (TypeScript Interface):
```typescript
interface DaydreamStreamResponse {
  id: string                    // Stream ID
  whip_url?: string             // WHIP ingest URL
  playback_id?: string          // Livepeer playback ID
  playback_url?: string         // HLS playback URL
  output_playback_id?: string   // Output playback ID (if different)
  stream_url?: string           // Alternative stream URL
  status?: string               // Stream status
  status_reason?: string        // Status reason/details
}

// Error response (rate limit)
interface DaydreamErrorResponse {
  error: string                 // Error message
  activeStreamId?: string       // ID of existing active stream
  retryAfter?: number           // Seconds to wait before retry
}
```

**Success Response Example** (`201 Created`):
```json
{
  "id": "stream_abc123",
  "whip_url": "https://sdaydream.live/whip/stk_xxx/stream_abc123",
  "playback_id": "abcd1234efgh5678",
  "playback_url": "https://lvpr.tv/?v=abcd1234efgh5678"
}
```

**Error Response Example** (`429 Too Many Requests`):
```json
{
  "error": "You already have an active stream. Please end it before creating a new one.",
  "activeStreamId": "stream_abc123"
}
```

**Status Codes**:
| Code | Description |
|------|-------------|
| `201` | Stream created successfully |
| `400` | Invalid payload or validation error (Zod validation failed) |
| `401` | Missing Daydream API key |
| `403` | Invalid Daydream API key |
| `429` | Rate limit exceeded or active stream exists |
| `504` | Upstream timeout |
| `500` | Unexpected server error |

**Headers**:
- `Set-Cookie: daydream-session=...` — Session cookie for rate limiting (if fingerprint-based)
- `Retry-After: N` — Seconds to wait (when rate limited)

**curl Example**:
```bash
curl -X POST https://localhost:8100/api/daydream/streams \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline": "streamdiffusion",
    "params": {
      "model_id": "stabilityai/sd-turbo",
      "prompt": "cartoon magical dj blue sparkle",
      "width": 512,
      "height": 512
    }
  }'
```

---

#### `POST /api/daydream/streams/[streamId]/whip`

WHIP proxy endpoint for SDP offer. Initiates WebRTC connection.

**Query Parameters**:
- `resource` (required) — URL-encoded WHIP endpoint from `whip_url`

**Request Headers**:
- `Content-Type: application/sdp`

**Request Body**: Raw SDP offer (text)

**Response Headers**:
- `Content-Type: application/sdp`
- `Location` — Proxy URL for subsequent PATCH/DELETE requests
- `Link` — ICE server information (per WHIP spec)

**Response Body**: Raw SDP answer (text)

**Status Codes**:
| Code | Description |
|------|-------------|
| `201` | SDP answer returned successfully |
| `400` | Missing resource URL or WHIP payload |
| `403` | Forbidden WHIP host or stream not owned by active session |
| `413` | Payload too large (>64KB) |
| `500` | Upstream error |

**curl Example**:
```bash
curl -X POST "https://localhost:8100/api/daydream/streams/stream_abc123/whip?resource=https%3A%2F%2Fsdaydream.live%2Fwhip%2Fstk_xxx%2Fstream_abc123" \
  -H "Content-Type: application/sdp" \
  --data-binary @offer.sdp
```

---

#### `PATCH /api/daydream/streams/[streamId]/whip`

WHIP proxy endpoint for trickle ICE candidates.

**Query Parameters**:
- `resource` (required) — URL-encoded WHIP resource URL from Location header

**Request Headers**:
- `Content-Type: application/trickle-ice-sdpfrag`

**Request Body**: SDP fragment with ICE candidates

**Status Codes**:
| Code | Description |
|------|-------------|
| `200` | ICE candidates accepted |
| `400` | Missing resource URL or payload |
| `403` | Forbidden WHIP host or stream not owned by active session |
| `500` | Upstream error |

---

#### `DELETE /api/daydream/streams/[streamId]/whip`

WHIP proxy endpoint for teardown.

**Query Parameters**:
- `resource` (required) — URL-encoded WHIP resource URL

**Status Codes**:
| Code | Description |
|------|-------------|
| `204` | Stream torn down successfully |
| `400` | Missing resource URL |
| `403` | Forbidden WHIP host or stream not owned by active session |
| `500` | Upstream error |

---

#### `GET /api/daydream/streams/[streamId]/status`

Fetches stream status from Daydream. Used for warm-up polling.

**Response Body**:
```typescript
// Pass-through of Daydream GET /v1/streams/{id}/status.
// Shape may evolve; treat as opaque beyond `success`.
interface DaydreamStreamStatusResponse {
  success: boolean
  error?: unknown
  data?: unknown
}
```

**Success Response Example** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "gateway_status": {}
  }
}
```

**Status Codes**:
| Code | Description |
|------|-------------|
| `200` | Status returned |
| `400` | Missing streamId |
| `404` | Stream not found |
| `504` | Upstream timeout |
| `500` | Unexpected error |

**curl Example**:
```bash
curl https://localhost:8100/api/daydream/streams/stream_abc123/status
```

---

#### `PATCH /api/daydream/streams/[streamId]/parameters`

Updates stream parameters (prompt, guidance, etc.) for an active stream. Used to update prompts, guidance scale, and other dynamic parameters during streaming.

**IMPORTANT**: Per Daydream’s official OpenAPI, upstream expects `PATCH /v1/streams/{id}` with `{ pipeline, params }`. This proxy endpoint accepts `{ pipeline, params }` (preferred) and also accepts `{ params }` or a flat params object, then normalizes upstream.

**Request Body**:
```typescript
// Preferred format for PATCH updates
interface ParameterUpdatePayload {
  pipeline: "streamdiffusion"
  params: {
    model_id: string                    // Required: Must match stream's model
    prompt?: string                     // Dynamic: Updates generation prompt
    guidance_scale?: number             // Dynamic: Guidance scale
    delta?: number                      // Dynamic: Diffusion delta
    num_inference_steps?: number        // Dynamic: Inference steps
    t_index_list?: number[]             // Dynamic: Timestep indices
    seed?: number                       // Dynamic: Random seed
    // Note: Other params may trigger pipeline reload
  }
}
```

**Dynamic vs Static Parameters**:
- **Dynamic** (hot-swappable): `prompt`, `guidance_scale`, `delta`, `num_inference_steps`, `t_index_list`, `seed`, `controlnets.conditioning_scale`
- **Static** (require stream restart): `model_id`, `width`, `height`, `controlnets` (adding/removing), `acceleration`

**404 "Stream not ready yet"**: During warmup (~15s after WHIP connects), Daydream may return 404 with "Stream not ready yet". This is normal - the client starts sync attempts after the warm-up countdown completes and the stream is active, then retries with exponential backoff until the stream is ready. **These warmup 404s do NOT count toward the PATCH failure limit** (5 consecutive failures disable live updates). 404s without explicit "not ready" messaging are also treated as warmup for a short grace window after stream creation to avoid false negatives. Only actual failures (409, 5xx, network errors, or 404s indicating the stream is gone) count.

**Request Example** (dynamic prompt update):
```json
{
  "pipeline": "streamdiffusion",
  "params": {
    "model_id": "stabilityai/sd-turbo",
    "prompt": "female cartoon magical dj pink sparkle",
    "guidance_scale": 1,
    "delta": 0.7
  }
}
```

**Note**: Only include the parameters you want to update. `model_id` is always required in the PATCH payload per Daydream API requirements.

**Response**: Updated stream configuration from upstream

**Status Codes**:
| Code | Description |
|------|-------------|
| `200` | Parameters updated |
| `400` | Missing streamId or invalid payload |
| `403` | Stream not owned by active session |
| `404` | Stream not found |
| `504` | Upstream timeout |
| `500` | Unexpected error |

**curl Example**:
```bash
curl -X PATCH https://localhost:8100/api/daydream/streams/stream_abc123/parameters \
  -H "Content-Type: application/json" \
  -d '{"pipeline":"streamdiffusion","params":{"model_id":"stabilityai/sd-turbo","prompt":"new prompt here"}}'
```

---

#### `DELETE /api/daydream/streams/[streamId]`

Tears down a Daydream stream and releases the single-stream lock.

**Response Body**:
```typescript
interface DeleteResponse {
  ok: boolean
}
```

**Success Response** (`200 OK`):
```json
{
  "ok": true
}
```

**Status Codes**:
| Code | Description |
|------|-------------|
| `200` | Stream deleted |
| `400` | Missing streamId |
| `403` | Stream not owned by active session |
| `404` | Stream not found (treated as success) |
| `504` | Upstream timeout |
| `500` | Unexpected error |

**curl Example**:
```bash
curl -X DELETE https://localhost:8100/api/daydream/streams/stream_abc123
```

---

#### `POST /api/daydream/streams/end`

Releases the per-client single-stream lock. Supports both JSON and `sendBeacon()` payloads.

**Request Body** (optional):
```typescript
interface EndStreamRequest {
  streamId?: string  // Optional: specific stream ID to end
}
```

**Request Example**:
```json
{
  "streamId": "stream_abc123"
}
```

**Response Body**:
```typescript
interface EndStreamResponse {
  success: boolean
  message: string   // "Stream ended" or "No active stream found"
}
```

**Success Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Stream ended"
}
```

**Usage with sendBeacon**:
```typescript
// For page unload cleanup
navigator.sendBeacon(
  "/api/daydream/streams/end",
  JSON.stringify({ streamId: "stream_abc123" })
)
```

**Status Codes**:
| Code | Description |
|------|-------------|
| `200` | Lock released (even if no active stream) |
| `500` | Unexpected error |

**curl Example**:
```bash
curl -X POST https://localhost:8100/api/daydream/streams/end \
  -H "Content-Type: application/json" \
  -d '{"streamId": "stream_abc123"}'
```

---

#### `GET /api/daydream/config`

Checks if Daydream API is configured. Used to enable/disable Dream controls.

**Response Body**:
```typescript
interface ConfigResponse {
  configured: boolean
}
```

**Response Example**:
```json
{
  "configured": true
}
```

**Status Codes**:
| Code | Description |
|------|-------------|
| `200` | Configuration status returned |

**curl Example**:
```bash
curl https://localhost:8100/api/daydream/config
```

---

**Rate Limiting Notes**:
- Single stream per client enforced via session cookie or fingerprint
- 30-second cooldown between rapid stream creations (without proper cleanup)
- 30-minute maximum stream lifetime (auto-expire orphaned streams)
- Handle upstream 429 with exponential backoff
- Frontend uses a 30s warm-up countdown before showing playback

---

### MetaDJai Chat (Streaming)

#### `POST /api/metadjai/stream`

Streams MetaDJai responses in real-time using Vercel AI SDK text streaming format.

**Request Body**:
Same as `/api/metadjai`

**Response**:
SSE UI message stream (AI SDK 6, `toUIMessageStreamResponse()` format):
```
data: {"type":"text-delta","delta":"Hello"}
data: {"type":"text-delta","delta":" there"}
data: {"type":"finish"}
```

**Note**: The frontend stream parser accepts SSE UI streams and data stream formats as a fallback, but the server emits SSE UI events by default.

**Status Codes**:
Same as `/api/metadjai`

**Rate Limiting**:
Same limits as non-streaming endpoint

**Usage**:
```typescript
import { useChat } from 'ai/react'

const { messages, input, handleSubmit } = useChat({
  api: '/api/metadjai/stream',
  body: {
    context: metaDjAiSessionContext
  }
})
```

---

### MetaDJai Transcription (Voice Input)

#### `POST /api/metadjai/transcribe`

Transcribes a short voice recording into text for MetaDJai chat input using OpenAI GPT-4o transcriptions (default `gpt-4o-mini-transcribe-2025-12-15`).

**Request**: `multipart/form-data`

Form fields:
- `file` (required) — Audio blob (recommended: `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, `webm`)

**Response**:
```json
{ "text": "Transcribed text..." }
```

**Limits & Security**:
- Shares the same session‑based rate limiting as other MetaDJai endpoints (20 / 5 minutes).
- Audio size capped at 10MB (OpenAI file upload guidance allows up to 25MB per request).
- We use a permissive audio type check and map the extension best‑effort; upstream format errors surface from OpenAI.
- The server enforces `language=en` and does not send a `prompt` to avoid prompt‑echo with short dictation.

**Error Cases**:
- `400` — Missing file
- `413` — File too large
- `502` — Transcription returned no text

### Health Check

#### `GET /api/health`

Returns minimal system health status for external monitoring. Detailed diagnostics are logged server-side only for security.

**Response** (Public):
```json
{
  "status": "healthy",
  "timestamp": "2025-12-19T23:37:00.000Z"
}
```

**Status Values**:
- `healthy` — All checks pass
- `degraded` — Some warnings present (non-critical)
- `unhealthy` — Critical checks failed

**Internal Checks** (logged server-side only):
- Environment configuration validation
- Storage bucket connectivity (Replit App Storage)
- AI provider availability

**Status Codes**:
- `200 OK` — Healthy or degraded (warnings present)
- `503 Service Unavailable` — Unhealthy (one or more critical checks failed)

**Headers**:
- `Cache-Control`: `no-store, no-cache, must-revalidate`
- `Content-Type`: `application/json`

---

### Logging

#### `POST /api/log`

Forwards client-side logs to external logging service.

**Request Body**:
```json
{
  "level": "error",
  "message": "Audio playback failed",
  "context": {
    "trackId": "track-123",
    "error": "Network timeout"
  }
}
```

**Request Fields**:
- `level` (required) — Log level: `"debug"` | `"info"` | `"warn"` | `"error"`
- `message` (required) — Log message
- `context` (optional) — Additional context object

**Headers Required**:
- `x-logging-client-key` — Client authentication key

**Response**:
- `200 OK` — Log forwarded successfully
- `400 Bad Request` — Invalid payload
- `403 Forbidden` — Invalid client key or origin

**Security**:
- Origin validation
- Client key authentication
- Server-side secret for upstream webhook

---

### Wisdom Content

#### `GET /api/wisdom`

Returns the Wisdom content payload used by the Wisdom experience (Thoughts, Guides, Reflections).

**Response**:
- `200 OK` — JSON from `src/data/wisdom-content.json`
- `429 Too Many Requests` — Rate limit exceeded (60 requests per minute per client)

**Headers**:
- `Content-Type`: `application/json`
- `Cache-Control`: `public, max-age=3600, stale-while-revalidate=86400`
- `Access-Control-Allow-Origin`: `*`
- `Access-Control-Allow-Methods`: `GET, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Accept`

**Rate Limiting**:
- 60 requests per minute per client
- IP-based identification with fallback to browser fingerprint
- Returns `Retry-After` header when limited

**Caching**:
- Revalidated hourly (`export const revalidate = 3600`)
- Stale-while-revalidate for 24 hours

---

#### `OPTIONS /api/wisdom`

CORS preflight handler for cross-origin requests.

**Response**:
- `204 No Content` — CORS headers only

**Headers**:
- `Access-Control-Allow-Origin`: `*`
- `Access-Control-Allow-Methods`: `GET, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Accept`
- `Access-Control-Max-Age`: `86400` (24 hours)

---

## Rate Limiting

All MetaDJai endpoints share rate limiting configuration:

| Parameter | Value |
|-----------|-------|
| Window | 5 minutes |
| Max messages per window | 20 |
| Min interval (session) | 500ms |
| Max message history | 12 |
| Max content length | 4000 chars |

**Transcription Rate Limits** (stricter due to higher API costs):

| Parameter | Value |
|-----------|-------|
| Window | 5 minutes |
| Max transcriptions per window | 5 |

### Client Identification

Priority order:
1. **Session cookie** (`metadjai-session`) — Set after first request, scoped to `/api/metadjai`
2. **Fingerprint** — SHA-256 hash of request headers (UA, language, etc.)

### Cookie Security

Session cookies are restricted to MetaDJai routes only:
- **Path**: `/api/metadjai` — Prevents cookie from being sent to unrelated API routes
- **HttpOnly**: Yes — Prevents JavaScript access
- **Secure**: Yes (production) — HTTPS only
- **SameSite**: Lax — Prevents CSRF while allowing normal navigation

### Response Headers

When rate limited:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 180
```

---

## Authentication

### MetaDJai Endpoints

No authentication required. Rate limiting prevents abuse.

### Logging Endpoint

Requires `X-Client-Key` header matching configured client key.

### Media Endpoints

No authentication. Files accessed by known paths only.

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

With optional fields:
```json
{
  "error": "Rate limit exceeded. Please wait before sending another message.",
  "retryAfter": 180
}
```

---

## AI Tools

MetaDJai has access to 10 tools for grounded, accurate responses. Nine are local tools shipped with the app; `web_search` is provider‑native and only available on OpenAI **when a direct `OPENAI_API_KEY` is configured**. All tool results are size‑limited (~8k chars max) to prevent excessive token consumption.

### searchCatalog

Searches the local music catalog for tracks and collections.

**Parameters**:
- `query` (string, required) — Search query (title, artist, genre, or description)
- `type` (optional) — `"track"` | `"collection"` | `"all"` (default: `"all"`)

**Returns**: Array of matching tracks/collections (max 10)

**Example Use Cases**:
- "Find tracks with epic sounds"
- "What's in the Majestic Ascent collection?"
- "Search for ambient music"

---

### getPlatformHelp

Provides contextual help about MetaDJ Nexus features and navigation.

**Parameters**:
- `feature` (required) — `"music"` | `"cinema"` | `"wisdom"` | `"queue"` | `"search"` | `"metadjai"` | `"shortcuts"` | `"overview"`

**Returns**: Feature documentation including title, description, howToUse, and tips

**Example Use Cases**:
- "How do I use the Cinema?"
- "What keyboard shortcuts are available?"
- "Give me an overview of all features"

---

### getRecommendations

Suggests tracks based on mood, energy level, or similarity to a reference track.

**Parameters**:
- `mood` (optional) — `"focus"` | `"energy"` | `"relaxation"` | `"epic"` | `"creative"` | `"ambient"`
- `energyLevel` (optional) — `"low"` | `"medium"` | `"high"`
- `similarTo` (optional) — Track title to find similar tracks
- `collection` (optional) — Collection to filter recommendations from
- `limit` (optional) — Maximum recommendations (default 5, max 10)

**Returns**: Array of recommended tracks with match scores

**Example Use Cases**:
- "Recommend something for focus"
- "What's similar to Quantum Dreams?"
- "Give me high-energy tracks from Majestic Ascent"

---

### getZuberantContext

Searches the Zuberant knowledge base for information about MetaDJ, Zuberant studio, the broader ecosystem vision, creative philosophy, and brand identity.

**Retrieval**: Hybrid keyword scoring with an optional semantic similarity boost (OpenAI `text-embedding-3-small`, cached in memory). If embeddings aren’t available, it falls back to keyword‑only search automatically.

**Parameters**:
- `query` (string, required) — What the user wants to know
- `topic` (optional) — `"metadj"` | `"zuberant"` | `"zuberverse"` | `"philosophy"` | `"identity"` | `"workflows"` | `"all"` (default: `"all"`)

**Returns**: Up to 5 matching knowledge entries with category, title, and content

**Knowledge Categories**:
| Category | Description |
|----------|-------------|
| `metadj` | Artist identity, Digital Jockey, music collections, creative journey |
| `zuberant` | Metaverse Experience Studio (production entity behind MetaDJ; AI-native in how it operates), methodologies, operating principles |
| `zuberverse` | Interconnected universe, reality layers, purest vibes culture |
| `philosophy` | AI philosophy (compose/orchestrate/conduct), creative principles |
| `identity` | Brand voice, visual identity, design language |

**Example Use Cases**:
- "Who is MetaDJ?"
- "What is the Synthetic Orchaistra method?"
- "Explain the compose/orchestrate/conduct philosophy"
- "What are music collections?"

---

### getWisdomContent

Fetches Wisdom content (Thoughts, Guides, or Reflections) by section and id. If `id` is omitted, returns a compact list of available items in that section.

**Parameters**:
- `section` (required) — `"thoughts"` | `"guides"` | `"reflections"`
- `id` (optional) — Specific Wisdom item id to fetch

**Returns**:
- Without `id`: `{ section, items: [...] }` list of titles/excerpts (plus dates/categories when relevant)
- With `id`: Full content object with section headings and paragraphs (inline sign‑offs removed)

**Example Use Cases**:
- "Summarize this guide"
- "What reflections are available?"
- "Give me the full text of MetaDJ’s Origin"

---

### proposePlayback

Proposes a playback action that must be confirmed by the user in the chat UI.

**Parameters**:
- `action` (required) — `"play"` | `"pause"` | `"next"` | `"prev"` | `"queue"`
- `searchQuery` (optional) — Track/collection title to target
- `context` (optional) — Brief reasoning shown in the confirm card

**Returns**: `{ type: "playback", action, trackId?, trackTitle?, trackArtist?, context? }`

**Example Use Cases**:
- "Play Neon Dreams"
- "Add this to my queue"
- "Skip to the next track"

---

### proposeQueueSet

Proposes a multi-track queue update that must be confirmed by the user in the chat UI.

**Parameters**:
- `trackIds` (optional) — Ordered list of track IDs to queue
- `trackTitles` (optional) — Ordered list of track titles to queue
- `collection` (optional) — Collection name to pull tracks from
- `limit` (optional) — Maximum number of tracks to include (default 20, max 50)
- `mode` (optional) — `"replace"` | `"append"` (default: `"replace"`)
- `autoplay` (optional) — Start playback after updating the queue
- `context` (optional) — Brief reasoning shown in the confirm card

**Returns**: `{ type: "queue-set", action: "set", trackIds, trackTitles?, mode?, autoplay?, context? }`

**Example Use Cases**:
- "Queue these five tracks in order"
- "Add this collection to the end of my queue"
- "Line up a short focus set"

---

### proposePlaylist

Proposes creating a named playlist that must be confirmed by the user in the chat UI.

**Parameters**:
- `name` (required) — Playlist name
- `trackIds` (optional) — Ordered list of track IDs to include
- `trackTitles` (optional) — Ordered list of track titles to include
- `collection` (optional) — Collection name to pull tracks from
- `limit` (optional) — Maximum number of tracks to include (default 20, max 50)
- `queueMode` (optional) — `"replace"` | `"append"` | `"none"` (default: `"none"`)
- `autoplay` (optional) — Start playback after queueing tracks
- `context` (optional) — Brief reasoning shown in the confirm card

**Returns**: `{ type: "playlist", action: "create", name, trackIds?, trackTitles?, queueMode?, autoplay?, context? }`

**Example Use Cases**:
- "Make me a playlist called Night Drive"
- "Save this set as a playlist"
- "Create a playlist from the Neon Horizon collection"

---

### proposeSurface

Proposes a simple navigation action that must be confirmed by the user in the chat UI.

**Parameters**:
- `action` (required) — `"openWisdom"` | `"openQueue"` | `"focusSearch"` | `"openMusicPanel"`
- `tab` (optional) — `"browse"` | `"queue"` | `"playlists"` (only used with `openMusicPanel`)
- `context` (optional) — Brief reasoning shown in the confirm card

**Returns**: `{ type: "ui", action, tab?, context? }`

**Example Use Cases**:
- "Open Wisdom for me"
- "Show my queue"
- "Jump me to search"
- "Open the music panel"

---

### web_search (OpenAI + direct OPENAI_API_KEY only)

Searches the web for current information. Only available when using the OpenAI provider **with a direct `OPENAI_API_KEY`**.

**Parameters**:
- `query` (string, required) — Search query

**Returns**: Web search results with URLs and content

**Provider Availability**: OpenAI only.

**UX Features**:
- **Visual Indicator**: During streaming, the chat UI shows "Searching the web..." with a Globe icon
- **Source Attribution**: MetaDJai includes a "Sources:" section with hyperlinked references when using web search results
- **Natural Mention**: MetaDJai mentions when it searched the web (e.g., "I searched for that...")

**Example Use Cases**:
- "What's the latest news about AI music?"
- "Search the web for current electronic music trends"
- "Look up recent developments in virtual concerts"

---

## AI Resilience Architecture

MetaDJai includes several resilience features for robust AI interactions.

### Configurable Timeouts

Timeouts are configurable per-route via environment variables with sensible defaults:

| Route | Default | Env Override |
|-------|---------|--------------|
| `stream` | 60s | `AI_TIMEOUT_STREAM` |
| `chat` | 30s | `AI_TIMEOUT_CHAT` |
| `transcribe` | 45s | `AI_TIMEOUT_TRANSCRIBE` |
| `tools` | 90s | `AI_TIMEOUT_TOOLS` |
| (global) | 30s | `AI_REQUEST_TIMEOUT_MS` |

**Priority Order**:
1. Route-specific env var (e.g., `AI_TIMEOUT_STREAM=60000`)
2. Global env var (`AI_REQUEST_TIMEOUT_MS`)
3. Route-specific default from table above
4. Global default (30s)

### Stream Recovery

The streaming endpoint includes automatic recovery for transient failures:

**Error Classification**:
- `parse_error` — Malformed JSON/SSE chunk (not recoverable)
- `connection_error` — Network/connection dropped (recoverable)
- `timeout_error` — Stream timeout (not recoverable)
- `incomplete_error` — Stream ended prematurely (recoverable)
- `provider_error` — Rate limits, 502/503 errors (not recoverable)

**Recovery Behavior**:
- Recoverable errors trigger automatic retry with exponential backoff
- Default: 2 retries with 500ms base delay (500ms → 1000ms → 2000ms)
- User-friendly error messages for all error types

### Circuit Breaker

Provider health is tracked with a three-state circuit breaker:

| State | Behavior |
|-------|----------|
| `closed` | Normal operation, requests pass through |
| `open` | Provider failing, skip to fallback immediately |
| `half-open` | Testing if provider recovered, limited requests allowed |

**Thresholds**:
- Opens after 3 consecutive failures
- Recovers after 30s in half-open state
- Resets on successful request

### Tool Output Sanitization

All tool results are sanitized for injection protection:

**Blocked Patterns**:
- System role impersonation (`system:`, `[SYSTEM]`)
- Instruction override attempts (`ignore previous instructions`)
- Role manipulation (`you are now`, `new instructions:`)

**Size Limits**:
- Tool results capped at ~8KB to prevent token exhaustion
- Nested objects truncated with `...[truncated]` marker

---

## Environment Variables

Required for API functionality:

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes | OpenAI provider key for MetaDJai (enables chat + embeddings + `web_search`) |
| `ANTHROPIC_API_KEY` | No | Anthropic API key (enables Claude as secondary provider) |
| `GOOGLE_API_KEY` | No | Google AI API key (enables Gemini as secondary provider) |
| `XAI_API_KEY` | No | xAI API key (enables Grok as secondary provider) |
| `OPENAI_TRANSCRIBE_MODEL` | No | Speech‑to‑text model for `/api/metadjai/transcribe` (defaults to `gpt-4o-mini-transcribe-2025-12-15`) |
| `MUSIC_BUCKET_ID` | Yes | Replit App Storage for audio |
| `VISUALS_BUCKET_ID` | Yes | Replit App Storage for video |
| `LOGGING_WEBHOOK_URL` | No | External logging endpoint |
| `LOGGING_SHARED_SECRET` | No | Logging authentication |
| `AI_REQUEST_TIMEOUT_MS` | No | Global AI request timeout in ms (default: 30000) |
| `AI_TIMEOUT_STREAM` | No | Streaming route timeout in ms (default: 60000) |
| `AI_TIMEOUT_CHAT` | No | Chat route timeout in ms (default: 30000) |
| `AI_TIMEOUT_TRANSCRIBE` | No | Transcribe route timeout in ms (default: 45000) |
| `AI_TIMEOUT_TOOLS` | No | Tool-calling route timeout in ms (default: 90000) |
| `AI_TOKEN_COSTS` | No | JSON override for token cost rates (e.g., `{"gpt-4o":{"input":2.5,"output":10}}`) |
| `AI_FAILOVER_ENABLED` | No | Enable automatic provider failover (default: true) |
| `AI_CACHE_ENABLED` | No | Enable response caching (default: true in production) |
| `AI_CACHE_TTL_MS` | No | Cache entry TTL in ms (default: 1800000 = 30 min, range: 60000–86400000) |
| `AI_CACHE_MAX_SIZE` | No | Maximum cache entries (default: 100, range: 10–1000) |

Set `OPENAI_API_KEY` to enable MetaDJai chat, embeddings, and web search. Additional providers are optional for failover.

---

## Usage Examples

### Streaming Chat with React

```typescript
import { useChat } from 'ai/react'

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/metadjai/stream',
    body: {
      context: {
        currentTrack: getCurrentTrack()
      }
    }
  })

  return (
    <form onSubmit={handleSubmit}>
      {messages.map(m => (
        <div key={m.id}>{m.content}</div>
      ))}
      <input
        value={input}
        onChange={handleInputChange}
        disabled={isLoading}
      />
    </form>
  )
}
```

### Audio Streaming

```html
<audio src="/api/audio/majestic-ascent/track-01.mp3" controls />
```

### Health Check

```bash
curl -s https://metadj.ai/api/health | jq
```

---

### Development Utilities

#### `POST /api/dev/clear-rate-limits`

Clears all rate limit records. **Development mode only**.

**Response**:
```json
{
  "success": true,
  "message": "All rate limits cleared"
}
```

**Headers Required**:
- `X-Dev-Secret` — Primary authentication (REQUIRED). Must match `DEV_SECRET` environment variable.
- `X-Dev-Token` — Secondary authentication (optional). Only checked if `DEV_API_TOKEN` is set.

**Status Codes**:
- `200 OK` — Rate limits cleared
- `401 Unauthorized` — Missing/invalid `X-Dev-Secret`, or missing `X-Dev-Token` when `DEV_API_TOKEN` is set
- `403 Forbidden` — Production (deny-list) or not in `NODE_ENV=development`
- `503 Service Unavailable` — `DEV_SECRET` not configured (endpoint disabled)

---

## Request Limits

### Body Size Limits

Server Actions and API routes have a 1MB body size limit to prevent DoS attacks:

```javascript
// next.config.js
experimental: {
  serverActions: {
    bodySizeLimit: '1mb',
  },
},
```

---

## Changelog

API behavior is documented against current `src/app/api/*` routes. For release history, see `../CHANGELOG.md`.
