# StreamDiffusion Reference (Daydream)

**Last Modified**: 2026-01-26 00:00 EST

Quick reference for the Daydream StreamDiffusion API as used by MetaDJ Nexus. Focused on defaults that keep latency low while producing on-brand visuals.

## Input Source

**CRITICAL**: Dream uses **webcam only** as the input source. There are no fallbacks to visualizers, video scenes, or any other source. If the webcam is unavailable, Dream cannot proceed.

**Lifecycle**: Webcam is acquired only while Dream is active (connecting/streaming) and is released immediately when Dream stops (idle) or errors. When Permissions API is available, Dream skips a redundant getUserMedia pre-check if camera permission is already granted.

**Capture stream**: Webcam frames (640×480, 4:3) are drawn into a hidden **512×512** canvas (1:1) and streamed via `canvas.captureStream(30)`; the draw loop is throttled to ~30fps and the capture track uses `contentHint="motion"`. The 4:3 feed is cropped to square using cover-mode drawing.

## Current Production Payload (SD-Turbo)

MetaDJ Nexus uses **SD-Turbo** (`stabilityai/sd-turbo`) with SD2.1 ControlNets:

```json
{
  "pipeline": "streamdiffusion",
  "params": {
    "seed": 42,
    "delta": 0.7,
    "width": 512,
    "height": 512,
    "prompt": "androgynous cartoon magical dj blue sparkle",
    "negative_prompt": "blurry, low quality, flat, 2d",
    "model_id": "stabilityai/sd-turbo",
    "num_inference_steps": 25,
    "guidance_scale": 1,
    "acceleration": "tensorrt",
    "use_denoising_batch": true,
    "do_add_noise": true,
    "t_index_list": [12, 20, 24],
    "normalize_seed_weights": true,
    "normalize_prompt_weights": true,
    "seed_interpolation_method": "linear",
    "prompt_interpolation_method": "slerp",
    "enable_similar_image_filter": true,
    "similar_image_filter_threshold": 0.98,
    "similar_image_filter_max_skip_frame": 10,
    "controlnets": [
      {
        "enabled": true,
        "model_id": "thibaud/controlnet-sd21-openpose-diffusers",
        "preprocessor": "pose_tensorrt",
        "conditioning_scale": 0.75,
        "preprocessor_params": {},
        "control_guidance_start": 0,
        "control_guidance_end": 1
      },
      {
        "enabled": true,
        "model_id": "thibaud/controlnet-sd21-hed-diffusers",
        "preprocessor": "soft_edge",
        "conditioning_scale": 0.2,
        "preprocessor_params": {},
        "control_guidance_start": 0,
        "control_guidance_end": 1
      },
      {
        "enabled": true,
        "model_id": "thibaud/controlnet-sd21-canny-diffusers",
        "preprocessor": "canny",
        "conditioning_scale": 0.2,
        "preprocessor_params": {
          "low_threshold": 100,
          "high_threshold": 200
        },
        "control_guidance_start": 0,
        "control_guidance_end": 1
      },
      {
        "enabled": true,
        "model_id": "thibaud/controlnet-sd21-depth-diffusers",
        "preprocessor": "depth_tensorrt",
        "conditioning_scale": 0.75,
        "preprocessor_params": {},
        "control_guidance_start": 0,
        "control_guidance_end": 1
      },
      {
        "enabled": true,
        "model_id": "thibaud/controlnet-sd21-color-diffusers",
        "preprocessor": "passthrough",
        "conditioning_scale": 0.2,
        "preprocessor_params": {},
        "control_guidance_start": 0,
        "control_guidance_end": 1
      }
    ]
  }
}
```

### Key Configuration Notes

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Model** | `stabilityai/sd-turbo` | SD 2.1 based, fast inference |
| **Resolution** | 512×512 (1:1) | SDTurbo default; webcam feed is cropped to square |
| **Inference Steps** | 25 | Balanced speed/quality |
| **ControlNets** | SD2.1 set (`thibaud/controlnet-sd21-*`) | Must match model architecture |
| **LCM LoRA** | Omitted | Daydream default |

### ControlNet Scales (Current Values)

| ControlNet | Scale | Purpose |
|------------|-------|---------|
| OpenPose | 0.75 | Body pose guidance |
| HED (soft edge) | 0.2 | Edge preservation |
| Canny | 0.2 | Sharp edge detection |
| Depth | 0.75 | Depth/3D guidance |
| Color | 0.2 | Color palette passthrough |

## Prompt Format

Prompts follow the pattern: `{persona} {prompt_base}`

- **Persona**: `androgynous` | `female` | `male` (user-selectable)
- **Prompt Base**: `cartoon magical dj blue sparkle` (prompt bar UI is currently disabled)

Example: `androgynous cartoon magical dj blue sparkle`

## Endpoint Cheatsheet

| Action | Method | Endpoint |
|--------|--------|----------|
| Create stream | POST | `/v1/streams` |
| Get status | GET | `/v1/streams/:id/status` |
| Update params | PATCH | `/v1/streams/:id` (note: may 404 if stream not ready) |
| Delete stream | DELETE | `/v1/streams?id=:id` |
| WHIP ingest | POST/PATCH/DELETE | `whip_url` from create response |

## Operational Notes

- **Warm-up**: Stream creation + WHIP handshake can take 10–20s. The app shows a 15s countdown, and status polling continues through a ~60s warm-up grace window plus a short post-poll buffer before surfacing a failure.
- **Rate limits**: Single stream per user enforced via `stream-limiter.ts`
- **Transport**: HTTPS required for WHIP (except local dev)
- **Playback**: Use Livepeer iframe with `playbackId` for lowest latency
- **WHIP startup retries**: Not-ready responses during warm-up (404/409/429/5xx) are retried with exponential backoff so quick stop/start cycles don't flash a false error.
- **WHIP trickle ICE**: Daydream docs work without trickle ICE; MetaDJ Nexus currently runs WHIP with trickle ICE **disabled** to avoid 405 candidate PATCH failures on some Livepeer sessions.
- **Parameter PATCH**: Retryable warmup errors (404/409/429/5xx) are expected while the stream initializes. After 5 consecutive failures outside the warmup window, the app displays "Live updates unavailable" and stops retrying.
- **Prompt updates**: While Dream is active, prompt sync PATCH sends a minimal `{ pipeline: "streamdiffusion", params: {...} }` payload (including required `model_id` and the updated `prompt`). Sync waits until the countdown completes and the stream is active, then retries warm-up failures (404/409/429/5xx) so changes during startup aren't lost. After repeated failures, live updates are disabled for the session and changes apply on restart.

## Archived Configurations

Previous configurations are preserved in `docs/daydream/archive/`:
- `archive/sdxl-turbo-payload-2025-12-09.md` - SDXL Turbo config (not currently used)
