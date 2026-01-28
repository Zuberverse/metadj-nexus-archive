/**
 * Color extraction utility tests
 *
 * Tests pure utility functions (getDefaultColors, createGradientFromColors)
 * and image-based extraction with mock canvas/Image.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const originalImage = global.Image
const originalCreateElement = document.createElement

afterEach(() => {
  if (originalImage) {
    global.Image = originalImage
  }
  document.createElement = originalCreateElement
})

describe('getDefaultColors', () => {
  it('returns object with dominant, secondary, and accent', async () => {
    vi.resetModules()
    const { getDefaultColors } = await import('@/lib/color/color-extraction')
    const colors = getDefaultColors()
    expect(colors).toHaveProperty('dominant')
    expect(colors).toHaveProperty('secondary')
    expect(colors).toHaveProperty('accent')
  })

  it('returns OKLCH format for all colors', async () => {
    vi.resetModules()
    const { getDefaultColors } = await import('@/lib/color/color-extraction')
    const colors = getDefaultColors()
    expect(colors.dominant).toMatch(/oklch\(/)
    expect(colors.secondary).toMatch(/oklch\(/)
    expect(colors.accent).toMatch(/oklch\(/)
  })

  it('returns a fresh copy each call', async () => {
    vi.resetModules()
    const { getDefaultColors } = await import('@/lib/color/color-extraction')
    const a = getDefaultColors()
    const b = getDefaultColors()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })
})

describe('createGradientFromColors', () => {
  it('returns CSS gradient including all three colors', async () => {
    vi.resetModules()
    const { getDefaultColors, createGradientFromColors } = await import('@/lib/color/color-extraction')
    const defaults = getDefaultColors()
    const gradient = createGradientFromColors(defaults, 0.5)
    expect(gradient).toContain(defaults.dominant)
    expect(gradient).toContain(defaults.secondary)
    expect(gradient).toContain(defaults.accent)
  })

  it('contains three radial-gradient entries', async () => {
    vi.resetModules()
    const { getDefaultColors, createGradientFromColors } = await import('@/lib/color/color-extraction')
    const gradient = createGradientFromColors(getDefaultColors())
    const matches = gradient.match(/radial-gradient/g)
    expect(matches).toHaveLength(3)
  })

  it('uses default opacity of 0.3', async () => {
    vi.resetModules()
    const { getDefaultColors, createGradientFromColors } = await import('@/lib/color/color-extraction')
    const gradient = createGradientFromColors(getDefaultColors())
    expect(gradient).toContain('/ 0.3')
  })

  it('applies custom opacity and scales secondary/accent', async () => {
    vi.resetModules()
    const { getDefaultColors, createGradientFromColors } = await import('@/lib/color/color-extraction')
    const gradient = createGradientFromColors(getDefaultColors(), 1.0)
    // Primary opacity: 1.0
    // Secondary: 1.0 * 0.8 = 0.8
    // Accent: 1.0 * 0.6 = 0.6
    expect(gradient).toContain('/ 1')
    expect(gradient).toContain('/ 0.8')
    expect(gradient).toContain('/ 0.6')
  })
})

describe('extractColorsWithCache', () => {
  it('caches extracted colors when enabled', async () => {
    vi.resetModules()
    const colorModule = await import('@/lib/color/color-extraction')

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        if (this.onload) this.onload()
      }
      get src() {
        return ''
      }
    }

    global.Image = MockImage as unknown as typeof Image

    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName !== 'canvas') {
          return originalCreateElement.call(document, tagName)
        }

        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: () => ({ data: new Uint8ClampedArray([255, 0, 0, 255]) }),
          }),
        } as unknown as HTMLCanvasElement
      })

    const first = await colorModule.extractColorsWithCache('https://example.com/a.png')
    const second = await colorModule.extractColorsWithCache('https://example.com/a.png')

    expect(first).toEqual(second)
    expect(createElementSpy).toHaveBeenCalledTimes(1)
    createElementSpy.mockRestore()
  })
})

describe('extractColorsFromImage', () => {
  it('falls back to defaults when image loading fails', async () => {
    vi.resetModules()
    const colorModule = await import('@/lib/color/color-extraction')

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        if (this.onerror) this.onerror()
      }
      get src() {
        return ''
      }
    }

    global.Image = MockImage as unknown as typeof Image

    const result = await colorModule.extractColorsFromImage('https://example.com/fail.png')
    expect(result.dominant).toContain('oklch')
  })

  it('extracts colors from valid image data', async () => {
    vi.resetModules()
    const colorModule = await import('@/lib/color/color-extraction')

    class MockImage {
      crossOrigin = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        if (this.onload) this.onload()
      }
      get src() {
        return ''
      }
    }

    global.Image = MockImage as unknown as typeof Image

    // Create a mock canvas with varied pixel data
    const pixels = new Uint8ClampedArray(64 * 64 * 4)
    // Fill with distinct colors to test extraction
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 150     // R
      pixels[i + 1] = 80  // G
      pixels[i + 2] = 200 // B
      pixels[i + 3] = 255 // A
    }

    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName !== 'canvas') {
          return originalCreateElement.call(document, tagName)
        }
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: () => ({
              data: pixels,
              width: 64,
              height: 64,
            }),
          }),
        } as unknown as HTMLCanvasElement
      })

    const result = await colorModule.extractColorsFromImage('https://example.com/art.png')
    expect(result).toHaveProperty('dominant')
    expect(result.dominant).toContain('oklch')
    createElementSpy.mockRestore()
  })
})
