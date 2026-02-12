# Archived Payload — SDXL Turbo (Pre SD-Turbo Switch)

**Last Modified**: 2026-02-11 19:29 EST

**Captured**: 2025-12-09  
**Context**: Previous All Access Dream defaults before switching to `stabilityai/sd-turbo`. Keep for quick rollback/reference.

```json
{
  "pipeline": "streamdiffusion",
  "params": {
    "seed": 42,
    "delta": 0.7,
    "width": 1024,
    "height": 1024,
    "prompt": "magical dj",
    "model_id": "stabilityai/sdxl-turbo",
    "lora_dict": null,
    "controlnets": [
      {
        "enabled": true,
        "model_id": "xinsir/controlnet-depth-sdxl-1.0",
        "preprocessor": "depth_tensorrt",
        "conditioning_scale": 0.5,
        "preprocessor_params": {},
        "control_guidance_end": 1,
        "control_guidance_start": 0
      },
      {
        "enabled": true,
        "model_id": "xinsir/controlnet-canny-sdxl-1.0",
        "preprocessor": "canny",
        "conditioning_scale": 0.1,
        "preprocessor_params": {},
        "control_guidance_end": 1,
        "control_guidance_start": 0
      },
      {
        "enabled": true,
        "model_id": "xinsir/controlnet-tile-sdxl-1.0",
        "preprocessor": "feedback",
        "conditioning_scale": 0.1,
        "preprocessor_params": {},
        "control_guidance_end": 1,
        "control_guidance_start": 0
      }
    ],
    "acceleration": "tensorrt",
    "do_add_noise": true,
    "t_index_list": [5, 15, 32],
    "use_lcm_lora": true,
    "guidance_scale": 1.0,
    "negative_prompt": "blurry, low quality, flat, 2d",
    "num_inference_steps": 50,
    "use_denoising_batch": true,
    "normalize_seed_weights": true,
    "normalize_prompt_weights": true,
    "seed_interpolation_method": "linear",
    "prompt_interpolation_method": "slerp",
    "enable_similar_image_filter": false,
    "similar_image_filter_threshold": 0.98,
    "similar_image_filter_max_skip_frame": 10
  }
}
```
