/**
 * Color extraction utility tests
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

describe('color extraction', () => {
  it('returns default colors and builds gradients', async () => {
    vi.resetModules()
    const { getDefaultColors, createGradientFromColors } = await import('@/lib/color/color-extraction')

    const defaults = getDefaultColors()
    expect(defaults.dominant).toContain('oklch')

    const gradient = createGradientFromColors(defaults, 0.5)
    expect(gradient).toContain(defaults.dominant)
    expect(gradient).toContain(defaults.secondary)
    expect(gradient).toContain(defaults.accent)
  })

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
})
