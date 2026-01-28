/**
 * Daydream Schemas Tests
 *
 * Tests Zod validation schemas for Daydream stream creation payloads.
 */

import { describe, expect, it } from 'vitest'
import {
  CreateStreamSchema,
  parseCreateStreamPayload,
  safeParseCreateStreamPayload,
} from '@/lib/daydream/schemas'

describe('CreateStreamSchema', () => {
  describe('StreamDiffusion format', () => {
    it('accepts valid StreamDiffusion payload', () => {
      const payload = {
        pipeline: 'streamdiffusion',
        params: {
          model_id: 'stabilityai/sd-turbo',
          prompt: 'cosmic nebula, vibrant colors',
        },
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('accepts payload with all optional params', () => {
      const payload = {
        pipeline: 'streamdiffusion',
        params: {
          model_id: 'stabilityai/sd-turbo',
          prompt: 'abstract art',
          negative_prompt: 'blurry, low quality',
          seed: 42,
          width: 512,
          height: 512,
          num_inference_steps: 4,
          guidance_scale: 1.5,
          delta: 0.5,
          acceleration: 'tensorrt',
          use_lcm_lora: true,
          lcm_lora_id: null,
          lora_dict: null,
          use_denoising_batch: true,
          do_add_noise: true,
          t_index_list: [0, 16, 32, 45],
          normalize_seed_weights: false,
          normalize_prompt_weights: false,
          seed_interpolation_method: 'slerp',
          prompt_interpolation_method: 'linear',
          enable_similar_image_filter: true,
          similar_image_filter_threshold: 0.98,
          similar_image_filter_max_skip_frame: 10,
        },
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('accepts payload with controlnets', () => {
      const payload = {
        pipeline: 'streamdiffusion',
        params: {
          model_id: 'stabilityai/sd-turbo',
          prompt: 'landscape',
          controlnets: [
            {
              enabled: true,
              model_id: 'controlnet-canny',
              conditioning_scale: 0.5,
            },
          ],
        },
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('accepts payload with ip_adapter', () => {
      const payload = {
        pipeline: 'streamdiffusion',
        params: {
          model_id: 'stabilityai/sd-turbo',
          prompt: 'portrait',
          ip_adapter: {
            scale: 0.8,
            enabled: true,
          },
        },
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects payload without model_id', () => {
      const payload = {
        pipeline: 'streamdiffusion',
        params: {
          prompt: 'test',
        },
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('rejects payload without prompt', () => {
      const payload = {
        pipeline: 'streamdiffusion',
        params: {
          model_id: 'stabilityai/sd-turbo',
        },
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('rejects payload with empty model_id', () => {
      const payload = {
        pipeline: 'streamdiffusion',
        params: {
          model_id: '',
          prompt: 'test',
        },
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('rejects payload with empty prompt', () => {
      const payload = {
        pipeline: 'streamdiffusion',
        params: {
          model_id: 'stabilityai/sd-turbo',
          prompt: '',
        },
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('rejects invalid acceleration value', () => {
      const payload = {
        pipeline: 'streamdiffusion',
        params: {
          model_id: 'stabilityai/sd-turbo',
          prompt: 'test',
          acceleration: 'invalid',
        },
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('allows passthrough of extra fields', () => {
      const payload = {
        pipeline: 'streamdiffusion',
        params: {
          model_id: 'stabilityai/sd-turbo',
          prompt: 'test',
          custom_field: 'value',
        },
        extra: true,
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })
  })

  describe('Compatibility format', () => {
    it('accepts valid compatibility payload', () => {
      const payload = {
        pipeline_id: 'my-pipeline',
        pipeline_params: { key: 'value' },
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects compatibility payload with empty pipeline_id', () => {
      const payload = {
        pipeline_id: '',
        pipeline_params: {},
      }

      const result = CreateStreamSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('invalid payloads', () => {
    it('rejects null', () => {
      const result = CreateStreamSchema.safeParse(null)
      expect(result.success).toBe(false)
    })

    it('rejects empty object', () => {
      const result = CreateStreamSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects string', () => {
      const result = CreateStreamSchema.safeParse('not an object')
      expect(result.success).toBe(false)
    })
  })
})

describe('parseCreateStreamPayload', () => {
  it('returns parsed data for valid payload', () => {
    const payload = {
      pipeline: 'streamdiffusion',
      params: {
        model_id: 'stabilityai/sd-turbo',
        prompt: 'test prompt',
      },
    }

    const result = parseCreateStreamPayload(payload)
    expect(result).toMatchObject({
      pipeline: 'streamdiffusion',
      params: {
        model_id: 'stabilityai/sd-turbo',
        prompt: 'test prompt',
      },
    })
  })

  it('throws for invalid payload', () => {
    expect(() => parseCreateStreamPayload({})).toThrow()
  })
})

describe('safeParseCreateStreamPayload', () => {
  it('returns success for valid payload', () => {
    const payload = {
      pipeline: 'streamdiffusion',
      params: {
        model_id: 'stabilityai/sd-turbo',
        prompt: 'test',
      },
    }

    const result = safeParseCreateStreamPayload(payload)
    expect(result.success).toBe(true)
  })

  it('returns failure for invalid payload', () => {
    const result = safeParseCreateStreamPayload({})
    expect(result.success).toBe(false)
  })
})
