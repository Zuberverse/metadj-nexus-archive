/**
 * Color extraction worker tests
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

const originalSelf = (globalThis as any).self

afterEach(() => {
  if (originalSelf) {
    ;(globalThis as any).self = originalSelf
  } else {
    delete (globalThis as any).self
  }
})

describe('color-extraction worker', () => {
  it('posts a result message for valid image data', async () => {
    const postMessage = vi.fn()
    ;(globalThis as any).self = { postMessage, onmessage: null }

    vi.resetModules()
    await import('@/lib/workers/color-extraction.worker')

    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255])
    const imageData = { data } as ImageData

    ;(globalThis as any).self.onmessage({
      data: { type: 'extract', imageData, requestId: 'req-1' },
    })

    expect(postMessage).toHaveBeenCalled()
    const payload = postMessage.mock.calls[0][0]
    expect(payload.type).toBe('result')
    expect(payload.requestId).toBe('req-1')
  })

  it('posts an error message when extraction fails', async () => {
    const postMessage = vi.fn()
    ;(globalThis as any).self = { postMessage, onmessage: null }

    vi.resetModules()
    await import('@/lib/workers/color-extraction.worker')

    const imageData = { data: null } as unknown as ImageData

    ;(globalThis as any).self.onmessage({
      data: { type: 'extract', imageData, requestId: 'req-2' },
    })

    const payload = postMessage.mock.calls[0][0]
    expect(payload.type).toBe('error')
    expect(payload.requestId).toBe('req-2')
  })
})
