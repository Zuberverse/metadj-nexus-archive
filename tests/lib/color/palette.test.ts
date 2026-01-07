/**
 * Visualizer Palette Tests
 *
 * Tests for canonical color constants used in 3D visualizers.
 */

import { describe, it, expect } from 'vitest'
import {
  VISUALIZER_COLORS,
  VISUALIZER_SRGB,
} from '@/lib/color/visualizer-palette'

describe('VISUALIZER_COLORS', () => {
  it('exports canonical brand colors', () => {
    expect(VISUALIZER_COLORS.purple).toBe('#8B5CF6')
    expect(VISUALIZER_COLORS.cyan).toBe('#06B6D4')
    expect(VISUALIZER_COLORS.magenta).toBe('#D946EF')
  })

  it('exports supporting tint colors', () => {
    expect(VISUALIZER_COLORS.indigo).toBe('#A855F7')
    expect(VISUALIZER_COLORS.purpleTint).toBe('#C084FC')
    expect(VISUALIZER_COLORS.magentaTint).toBe('#E879F9')
    expect(VISUALIZER_COLORS.cyanTint).toBe('#22D3EE')
    expect(VISUALIZER_COLORS.cyanTintLight).toBe('#67E8F9')
  })

  it('exports starlight neutral color', () => {
    expect(VISUALIZER_COLORS.starBase).toBe('#B8D4FF')
  })

  it('has all colors as valid hex strings', () => {
    const hexPattern = /^#[0-9A-F]{6}$/i
    Object.values(VISUALIZER_COLORS).forEach((color) => {
      expect(color).toMatch(hexPattern)
    })
  })
})

describe('VISUALIZER_SRGB', () => {
  it('exports sRGB values for purple', () => {
    expect(VISUALIZER_SRGB.purple).toBe('0.545, 0.361, 0.965')
  })

  it('exports sRGB values for cyan', () => {
    expect(VISUALIZER_SRGB.cyan).toBe('0.024, 0.714, 0.831')
  })

  it('exports sRGB values for magenta', () => {
    expect(VISUALIZER_SRGB.magenta).toBe('0.851, 0.275, 0.937')
  })

  it('exports sRGB values for indigo', () => {
    expect(VISUALIZER_SRGB.indigo).toBe('0.659, 0.333, 0.969')
  })

  it('has sRGB values in correct format', () => {
    const srgbPattern = /^\d+\.\d+, \d+\.\d+, \d+\.\d+$/
    Object.values(VISUALIZER_SRGB).forEach((value) => {
      expect(value).toMatch(srgbPattern)
    })
  })

  it('has sRGB values in 0-1 range', () => {
    Object.values(VISUALIZER_SRGB).forEach((value) => {
      const [r, g, b] = value.split(', ').map(Number)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(1)
      expect(g).toBeGreaterThanOrEqual(0)
      expect(g).toBeLessThanOrEqual(1)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(1)
    })
  })
})
