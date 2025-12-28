# Daydream Integration (StreamDiffusion)

**Last Modified**: 2025-12-27 15:24 EST

Central reference point for bringing Daydream StreamDiffusion into MetaDJ Nexus. Use this folder to coordinate API contracts, environment variables, ingest/playback flows, and Cinema-specific behavior for the Dream toggle.

## Core References
- [StreamDiffusion Reference](streamdiffusion-reference.md) — payload shape, defaults, constraints
- [MetaDJ Nexus Dream MVP](metadj-nexus-dream-mvp.md) — scope, UX rules, cinema/data flow
- External docs: https://docs.daydream.live (official API) — keep in sync with local notes

## API Surface (Upstream)
Daydream exposes a minimal set of routes:
- `POST /v1/streams` — create stream (returns `id`, `whip_url`, and `output_playback_id` / `playback_url`)
- `GET /v1/streams/:id` — stream config/details
- `GET /v1/streams/:id/status` — stream status/health (ingest + inference metrics)
- `PATCH /v1/streams/:id` — update parameters (prompt, seed, steps, etc.)
- `DELETE /v1/streams?id=:id` — tear down stream
- WHIP ingest — `whip_url` from create response receives SDP offer (POST) + trickle ICE (PATCH) + teardown (DELETE)

Our app fronts these with Next.js API routes for key/host protection and WHIP host allowlisting:
- `POST /api/daydream/streams` — Create new stream
- `GET /api/daydream/streams/:id/status` — Poll stream status
- `PATCH /api/daydream/streams/:id/parameters` — Update generation params
- `DELETE /api/daydream/streams/:id` — Delete stream
- `POST/PATCH/DELETE /api/daydream/streams/:id/whip` — WHIP ingest proxy
- `GET /api/daydream/config` — Check if API key is configured
- Mutating routes (PATCH parameters, DELETE stream, WHIP POST/PATCH/DELETE) require the active session that created the stream; other sessions receive `403`.

## Environment Variables
- `DAYDREAM_API_KEY` — required, `daydream_live_*`
- `DAYDREAM_API_GATEWAY` — optional override, default `https://api.daydream.live`
- `DAYDREAM_WHIP_ALLOWED_HOSTS` — CSV allowlist, defaults to `daydream.live,sdaydream.live,livepeer.com,livepeer.studio,livepeer.cloud,lp-playback.studio`. If Daydream returns WHIP URLs on additional domains, add those base domains here.
- `DAYDREAM_WHIP_ALLOW_DEV` — `true` to allow local HTTP WHIP during development

## Known Behaviors & Constraints
- **Output aspect**: Daydream supports various aspect ratios. MetaDJ Nexus uses **512×512** (1:1) to align with SDTurbo defaults; webcam frames are cropped to square.
- **Resolution bounds**: 384–1024 px, divisible by 64. MetaDJ Nexus uses **512×512** for Dream ingest (square). For lower-end devices, 384×384 is a viable fallback.
- **Display container**: The Dream overlay uses a 1:1 container to match the 512×512 stream:
  - Desktop default: `h-[38vh] w-[38vh]`
  - Desktop small: `h-[23vh] w-[23vh]`
  - Mobile: `h-[min(75vw,280px)] w-[min(75vw,280px)]`
- **Iframe cropping**: The iframe is scaled to hide Livepeer player controls. Three-tier system based on container size:
  - Mobile (~280px): `min-h-[140%] -mt-[20%]` — most aggressive
  - Desktop small (~207px): `min-h-[130%] -mt-[15%]` — aggressive
  - Desktop default (~342px): `min-h-[120%] -mt-[10%]` — moderate
- **Capture smoothness**: Webcam feed (640×480) is drawn to the 512×512 canvas using cover mode and streamed via `canvas.captureStream(30)`; the draw loop is throttled to ~30fps and the capture track uses `contentHint="motion"` for smoother WebRTC encoding.
- **Warm-up**: Stream creation + WHIP handshake can take 10–20s. The app shows a 15s countdown before displaying the output iframe.
- **Status polling**: Retries non-OK and `success:false` responses during warm-up; failures surface only after the countdown and a warm-up grace window (~60s), plus a short post-poll grace (~3s) to avoid false "did not become active" flashes when the stream flips active late.
- **WHIP startup retries**: Not-ready responses during warm-up (404/409/429/5xx) are retried with exponential backoff so quick stop/start cycles don't flash a false error. Errors surface only after the retry budget or warm-up window is exhausted.
- **Single WHIP client**: Only one client should own ingest per stream to avoid races (one handler, no duplicates).
- **Webcam lifecycle**: Webcam is acquired only while Dream is active (connecting/streaming) and is released immediately when Dream stops (idle) or errors. When the Permissions API is available, Dream skips the redundant getUserMedia pre-check if camera permission is already granted.
- **Prompt/persona sync**: While Dream is active (connecting/streaming), prompt + persona changes PATCH the stream parameters via `{ pipeline: "streamdiffusion", params: {...} }` (preferred). The proxy route also accepts `{ params: {...} }` and normalizes it upstream. Sync attempts wait until the countdown completes and the stream is active (WHIP connected or status poll confirms), then retry on warm-up failures (404/409/429/5xx) so updates apply as soon as the backend is ready. PATCH payloads always include the `model_id` used when the stream was created.
- **Prompt bar status**: The prompt bar UI is currently disabled (partially implemented). The prompt base is locked to the default; only persona changes trigger runtime prompt updates for now.
- **Prompt reset on restart**: The custom prompt does NOT persist to localStorage. On app restart, the prompt resets to the default (`cartoon magical dj blue sparkle`). This ensures a fresh creative start each session. Only the presentation/persona (androgynous/female/male) persists across sessions.
- **Payload format**: `pipeline_id` is still accepted; recommended path is `pipeline: "streamdiffusion"` with `params.model_id` (see StreamDiffusion reference). Current defaults: seed 42, 512×512 (1:1), prompt "androgynous cartoon magical dj blue sparkle", steps 25, guidance 1.0, delta 0.7, ControlNets (sd21) openpose 0.75 / hed 0.2 / canny 0.2 (100/200) / depth 0.75 / color 0.2, `t_index_list: [12, 20, 24]`, `enable_similar_image_filter: true`, `prompt_interpolation_method: slerp`, IP Adapter disabled. (LCM LoRA omitted; Daydream default)
- **Dynamic parameter updates**: Certain parameters can be updated during an active stream **without triggering a full pipeline reload**. See `src/lib/daydream/config.ts` for `createPromptUpdatePayload()` which emits a minimal `{ pipeline, params }` payload containing only dynamic params. Dynamic parameters: `prompt`, `guidance_scale`, `delta`, `num_inference_steps`, `t_index_list`, `seed`, `controlnets.conditioning_scale`. All other parameters trigger a full pipeline reload.
- **PATCH support detection**: The Daydream API may not reliably support PATCH for live parameter updates on all streams. The app tracks consecutive PATCH failures (max 5), then displays "Live updates unavailable — changes will apply on restart" and stops retrying (runtime updates are skipped until restart). **Important**: warm-up errors (404/409/429/5xx) inside the grace window do NOT count as failures—they're expected and retried automatically. 404s without explicit "not ready" messaging are treated as warmup for a short grace window after stream creation to avoid false negatives. Only actual failures after warmup (non-retryable responses, stream gone, or persistent network errors) count toward the limit. Initial prompts (set during stream creation) always work; only runtime updates may be affected.
- **WHIP auth**: The `whip_url` is pre-signed with a stream-specific token. Do **not** attach `DAYDREAM_API_KEY` or other Bearer auth to WHIP ingest requests—this can cause 401/403 auth conflicts.
- **WHIP trickle ICE**: Daydream docs work without trickle ICE; MetaDJ Nexus currently runs WHIP with trickle ICE **disabled** (`enableTrickleICE: false`) because Livepeer can return 405 for candidate PATCH calls on some sessions. The proxy route still supports POST/PATCH/DELETE if we re-enable it later.
- **CSP**: Dream playback pulls from Livepeer (`lvpr.tv` iframe / HLS). CSP `frame-src` / `media-src` in `src/proxy.ts` must include the required Livepeer hosts (and the Daydream gateway origin if it changes).

## WHIP Client Configuration

The WHIPClient (`src/lib/streaming/whip-client.ts`) handles WebRTC ingest to Daydream:

```typescript
{
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  iceTransportPolicy: "all",
  connectionTimeout: 45000,  // 45 seconds
  iceGatheringTimeout: 20000, // 20 seconds
  enableTrickleICE: false,     // Most reliable with Livepeer WHIP
}
```

**Key notes:**
- **Google STUN**: Sufficient for most NAT traversal; TURN servers not required for Livepeer
- **Trickle ICE disabled**: Wait for ICE gathering (or timeout) and send a single offer; avoids 405 PATCH failures
- **ICE candidate errors are expected**: STUN lookup failures (error 701) during ICE probing are non-fatal — connections succeed through other candidates
- **45s connection timeout**: Generous timeout to handle slow handshakes
- **20s ICE gathering timeout**: Allows sufficient time for candidate discovery

---

## WHIP Client Reference

The `WHIPClient` class (`src/lib/streaming/whip-client.ts`) manages WebRTC ingest to Daydream's StreamDiffusion service via the WHIP (WebRTC-HTTP Ingestion Protocol) standard.

### Class Overview

```typescript
import { WHIPClient, WHIPConnectionOptions, WHIPConnectionState } from "@/lib/streaming/whip-client"
```

### Initialization

```typescript
const client = new WHIPClient({
  whipUrl: string,              // Required: WHIP endpoint URL from stream creation
  stream: MediaStream,          // Required: MediaStream with video track
  iceServers?: RTCIceServer[],  // Optional: ICE servers (default: Google STUN)
  iceTransportPolicy?: "all" | "relay",  // Optional: ICE policy (default: "all")
  connectionTimeout?: number,   // Optional: Connection timeout in ms (default: 45000)
  iceGatheringTimeout?: number, // Optional: ICE gathering timeout in ms (default: 20000)
  enableTrickleICE?: boolean,   // Optional: Enable trickle ICE (default: true)
})
```

### Connection Options Interface

```typescript
interface WHIPConnectionOptions {
  whipUrl: string
  stream: MediaStream
  iceServers?: RTCIceServer[]
  iceTransportPolicy?: "all" | "relay"
  connectionTimeout?: number
  iceGatheringTimeout?: number
  enableTrickleICE?: boolean
}
```

### Connection State Interface

```typescript
interface WHIPConnectionState {
  state: "connecting" | "connected" | "failed" | "disconnected" | "closed"
  error?: string
  iceConnectionState?: RTCIceConnectionState
  iceGatheringState?: RTCIceGatheringState
  signallingState?: RTCSignalingState
}
```

### Public Methods

#### `connect(): Promise<void>`

Establishes WebRTC connection to the WHIP endpoint.

```typescript
try {
  await client.connect()
  // Connection initiated - listen for state changes
} catch (error) {
  // Handle connection error
}
```

**Flow**:
1. Creates RTCPeerConnection with configured ICE servers
2. Adds MediaStream tracks to peer connection
3. Creates SDP offer
4. If trickle ICE enabled: sends offer immediately, trickles candidates via PATCH
5. If trickle ICE disabled: waits for ICE gathering, sends complete offer
6. Sets remote description from WHIP answer
7. Monitors connection state until connected or failed

**Throws**: Error if connection already exists or if connection fails.

#### `disconnect(): Promise<void>`

Gracefully disconnects the WHIP session.

```typescript
await client.disconnect()
```

**Flow**:
1. Marks as intentional close (prevents spurious state events)
2. Removes event handlers from peer connection
3. Stops all media tracks
4. Closes peer connection
5. Sends DELETE to WHIP resource URL (cleanup upstream)
6. Clears internal state

#### `onConnectionStateChange(callback: (state: WHIPConnectionState) => void): void`

Registers a callback for connection state changes.

```typescript
client.onConnectionStateChange((state) => {
  console.log("State:", state.state)
  if (state.error) {
    console.error("Error:", state.error)
  }
})
```

#### `getPeerConnection(): RTCPeerConnection | null`

Returns the underlying RTCPeerConnection for advanced monitoring.

```typescript
const pc = client.getPeerConnection()
if (pc) {
  console.log("ICE state:", pc.iceConnectionState)
  console.log("Connection state:", pc.connectionState)
}
```

### Connection Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WHIP Connection Flow                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   new WHIPClient()                                                  │
│         │                                                           │
│         ▼                                                           │
│   ┌───────────┐                                                     │
│   │disconnected│ (initial state)                                    │
│   └─────┬─────┘                                                     │
│         │ connect()                                                 │
│         ▼                                                           │
│   ┌───────────┐  create RTCPeerConnection                          │
│   │connecting │  add tracks, create offer                          │
│   │           │  POST SDP to WHIP URL                              │
│   └─────┬─────┘  set remote description                            │
│         │                                                           │
│    ┌────┴────┐                                                      │
│    │         │                                                      │
│    ▼         ▼                                                      │
│ ┌──────┐ ┌──────┐                                                   │
│ │failed│ │connected│ ◄─── ICE negotiation successful               │
│ └──────┘ └───┬──────┘                                               │
│              │                                                      │
│         ┌────┴────┐                                                 │
│         │         │                                                 │
│         ▼         ▼                                                 │
│    ┌──────────┐ ┌──────┐                                            │
│    │disconnected│ │closed│ ◄─── disconnect() or remote close       │
│    │(transient)│ └──────┘                                           │
│    └──────────┘                                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Error Codes & Recovery Strategies

| Error | Cause | Recovery |
|-------|-------|----------|
| `WHIP client already has an active connection` | Calling `connect()` twice | Call `disconnect()` first |
| `MediaStream has no tracks` | Empty MediaStream provided | Ensure webcam is active |
| `Video track is not live` | Track ended before connection | Re-acquire MediaStream |
| `WHIP offer failed: 4xx/5xx` | Server rejected SDP | Check payload, retry with backoff |
| `Connection timed out` | 45s timeout exceeded | Check network, retry |
| `ICE connection failed` | No ICE candidates succeeded | Check firewall, try TURN |
| `Peer connection failed` | WebRTC negotiation failed | Retry connection |

### Configuration Defaults

```typescript
const DEFAULT_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  iceTransportPolicy: "all",
  connectionTimeout: 45000,     // 45 seconds
  iceGatheringTimeout: 20000,   // 20 seconds
  enableTrickleICE: true,
}
```

### Usage Example

```typescript
import { WHIPClient } from "@/lib/streaming/whip-client"

// 1. Create stream via API
const response = await fetch("/api/daydream/streams", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(streamPayload),
})
const { whip_url, playback_url } = await response.json()

// 2. Get user media
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 512, height: 512 },
  audio: false,
})

// 3. Create WHIP client
const client = new WHIPClient({
  whipUrl: `/api/daydream/streams/${streamId}/whip?resource=${encodeURIComponent(whip_url)}`,
  stream,
})

// 4. Listen for state changes
client.onConnectionStateChange((state) => {
  switch (state.state) {
    case "connecting":
      console.log("Establishing connection...")
      break
    case "connected":
      console.log("Stream is live!")
      // Show playback iframe
      break
    case "failed":
      console.error("Connection failed:", state.error)
      break
    case "closed":
      console.log("Stream ended")
      break
  }
})

// 5. Connect
try {
  await client.connect()
} catch (error) {
  console.error("Failed to start stream:", error)
}

// 6. Later: disconnect
await client.disconnect()
```

### Best Practices

1. **Single client per stream**: Only one WHIPClient should manage ingest per stream to avoid races
2. **Monitor track state**: Listen for `track.onended` to detect source loss
3. **Handle disconnected state**: "disconnected" is often transient; wait before declaring failure
4. **Use proxy endpoint**: Always route through `/api/daydream/streams/:id/whip` for security
5. **Clean up on unmount**: Call `disconnect()` in React cleanup effects
6. **Check stream status**: Poll `/api/daydream/streams/:id/status` during warm-up

---

## Next Actions
- ~~Stand up `/docs/daydream/*` as the canonical place for MetaDJ Nexus Daydream notes~~ (done)
- ~~Align env var handling with `src/lib/env.ts`~~ (done)
- ~~Implement WHIP proxy with HTTPS enforcement + host allowlist~~ (done)
