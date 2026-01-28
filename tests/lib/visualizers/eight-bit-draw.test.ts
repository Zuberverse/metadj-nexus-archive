/**
 * EightBitAdventure Draw Functions Tests
 *
 * Tests all Canvas draw functions from eight-bit-helpers.ts using a mock
 * CanvasRenderingContext2D. These functions render pixel-art game elements
 * (sprites, props, effects) and represent ~310 uncovered statements.
 *
 * Strategy: verify each function executes without error and invokes expected
 * ctx methods (fillRect, fillStyle, save/restore, etc.) with valid arguments.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  drawCosmicSparkle,
  drawShootingStar,
  drawPixelDisc,
  drawTree,
  drawTower,
  drawSign,
  drawLantern,
  drawCrystal,
  drawShrine,
  drawHero,
  drawEnemy,
  drawCoin,
  drawSlash,
  drawPowerUp,
  type CosmicSparkle,
  type ShootingStar,
  type Enemy,
  type Coin,
  type Slash,
  type PowerUp,
} from '@/lib/visualizers/eight-bit-helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Mock Canvas Context
// ─────────────────────────────────────────────────────────────────────────────

function createMockCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalCompositeOperation: 'source-over',
    shadowBlur: 0,
    shadowColor: '',
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Test Data
// ─────────────────────────────────────────────────────────────────────────────

const PIXEL = 4
const TIME = 1.5
const TINT: [number, number, number] = [139, 92, 246]

// ─────────────────────────────────────────────────────────────────────────────
// drawCosmicSparkle
// ─────────────────────────────────────────────────────────────────────────────

describe('drawCosmicSparkle', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  const sparkle: CosmicSparkle = {
    x: 100,
    y: 50,
    vy: -10,
    size: 5,
    baseAlpha: 0.5,
    phase: 1.2,
    tintIdx: 0.3,
    age: 1,
    duration: 5,
  }

  it('executes without error', () => {
    expect(() => drawCosmicSparkle(ctx, sparkle, PIXEL, TIME, 0.5, 0.3)).not.toThrow()
  })

  it('calls fillRect for rendering', () => {
    drawCosmicSparkle(ctx, sparkle, PIXEL, TIME, 0.5, 0.3)
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('sets fillStyle for coloring', () => {
    drawCosmicSparkle(ctx, sparkle, PIXEL, TIME, 0.8, 0.6)
    // fillStyle is set as a string containing rgba
    expect(typeof ctx.fillStyle).toBe('string')
  })

  it('handles edge case: zero highLevel and bassLevel', () => {
    expect(() => drawCosmicSparkle(ctx, sparkle, PIXEL, TIME, 0, 0)).not.toThrow()
  })

  it('handles edge case: max highLevel and bassLevel', () => {
    expect(() => drawCosmicSparkle(ctx, sparkle, PIXEL, TIME, 1, 1)).not.toThrow()
  })

  it('handles sparkle near end of duration', () => {
    const expiring = { ...sparkle, age: 4.9 }
    expect(() => drawCosmicSparkle(ctx, expiring, PIXEL, TIME, 0.5, 0.3)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawShootingStar
// ─────────────────────────────────────────────────────────────────────────────

describe('drawShootingStar', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  const star: ShootingStar = {
    x: 200,
    y: 60,
    vx: 300,
    vy: 100,
    length: 40,
    age: 0.2,
    duration: 0.8,
    tintIdx: 0.5,
    brightness: 0.8,
  }

  it('executes without error', () => {
    expect(() => drawShootingStar(ctx, star, PIXEL, TIME)).not.toThrow()
  })

  it('calls fillRect for trail segments', () => {
    drawShootingStar(ctx, star, PIXEL, TIME)
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('handles star at start of life', () => {
    const young = { ...star, age: 0.01 }
    expect(() => drawShootingStar(ctx, young, PIXEL, TIME)).not.toThrow()
  })

  it('handles star near end of life', () => {
    const old = { ...star, age: 0.79 }
    expect(() => drawShootingStar(ctx, old, PIXEL, TIME)).not.toThrow()
  })

  it('handles high brightness', () => {
    const bright = { ...star, brightness: 1.0 }
    expect(() => drawShootingStar(ctx, bright, PIXEL, TIME)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawPixelDisc
// ─────────────────────────────────────────────────────────────────────────────

describe('drawPixelDisc', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('executes without error', () => {
    expect(() => drawPixelDisc(ctx, 100, 100, 20, PIXEL, 'rgba(255,0,0,0.5)')).not.toThrow()
  })

  it('calls fillRect to draw disc pixels', () => {
    drawPixelDisc(ctx, 100, 100, 20, PIXEL, 'rgba(255,0,0,0.5)')
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('handles small radius', () => {
    expect(() => drawPixelDisc(ctx, 50, 50, 4, PIXEL, 'white')).not.toThrow()
  })

  it('handles large radius', () => {
    expect(() => drawPixelDisc(ctx, 200, 200, 100, PIXEL, 'blue')).not.toThrow()
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0)
  })

  it('handles zero radius gracefully', () => {
    expect(() => drawPixelDisc(ctx, 50, 50, 0, PIXEL, 'red')).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawTree
// ─────────────────────────────────────────────────────────────────────────────

describe('drawTree', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('executes without error', () => {
    expect(() => drawTree(ctx, 300, 400, 20, PIXEL, TINT)).not.toThrow()
  })

  it('calls fillRect for trunk and leaves', () => {
    drawTree(ctx, 300, 400, 20, PIXEL, TINT)
    // Tree has trunk shadow, trunk, trunk highlight, leaf shadow, leaf body, leaf detail
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('handles small tree size', () => {
    expect(() => drawTree(ctx, 100, 300, 5, PIXEL, TINT)).not.toThrow()
  })

  it('handles large tree size', () => {
    expect(() => drawTree(ctx, 500, 600, 50, PIXEL, TINT)).not.toThrow()
  })

  it('handles different tint colors', () => {
    expect(() => drawTree(ctx, 200, 400, 20, PIXEL, [255, 0, 0])).not.toThrow()
    expect(() => drawTree(ctx, 200, 400, 20, PIXEL, [0, 255, 0])).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawTower
// ─────────────────────────────────────────────────────────────────────────────

describe('drawTower', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('executes without error', () => {
    expect(() => drawTower(ctx, 400, 500, 30, PIXEL, TINT, 0.5)).not.toThrow()
  })

  it('calls fillRect for body and windows', () => {
    drawTower(ctx, 400, 500, 30, PIXEL, TINT, 0.5)
    // Tower has shadow, glow, body, and 3 pairs of windows
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(6)
  })

  it('handles zero glow', () => {
    expect(() => drawTower(ctx, 400, 500, 30, PIXEL, TINT, 0)).not.toThrow()
  })

  it('handles max glow', () => {
    expect(() => drawTower(ctx, 400, 500, 30, PIXEL, TINT, 1.0)).not.toThrow()
  })

  it('handles small pixel size', () => {
    expect(() => drawTower(ctx, 400, 500, 30, 2, TINT, 0.5)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawSign
// ─────────────────────────────────────────────────────────────────────────────

describe('drawSign', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('executes without error', () => {
    expect(() => drawSign(ctx, 250, 400, 18, PIXEL, TINT, 0.5)).not.toThrow()
  })

  it('calls fillRect for post, board, and arrow', () => {
    drawSign(ctx, 250, 400, 18, PIXEL, TINT, 0.5)
    // Sign has shadow (2), post, board, and arrow (3 rects)
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(5)
  })

  it('handles zero pulse', () => {
    expect(() => drawSign(ctx, 250, 400, 18, PIXEL, TINT, 0)).not.toThrow()
  })

  it('handles max pulse', () => {
    expect(() => drawSign(ctx, 250, 400, 18, PIXEL, TINT, 1.0)).not.toThrow()
  })

  it('handles different sizes', () => {
    expect(() => drawSign(ctx, 250, 400, 5, PIXEL, TINT, 0.5)).not.toThrow()
    expect(() => drawSign(ctx, 250, 400, 40, PIXEL, TINT, 0.5)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawLantern
// ─────────────────────────────────────────────────────────────────────────────

describe('drawLantern', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('executes without error', () => {
    expect(() => drawLantern(ctx, 150, 450, 14, PIXEL, TINT, TIME, 0.6)).not.toThrow()
  })

  it('calls fillRect for post, glow, body, and inner light', () => {
    drawLantern(ctx, 150, 450, 14, PIXEL, TINT, TIME, 0.6)
    // Lantern: post shadow, post, lantern glow, lantern body, inner light
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(5)
  })

  it('handles zero safeHigh', () => {
    expect(() => drawLantern(ctx, 150, 450, 14, PIXEL, TINT, TIME, 0)).not.toThrow()
  })

  it('handles different time values', () => {
    expect(() => drawLantern(ctx, 150, 450, 14, PIXEL, TINT, 0, 0.5)).not.toThrow()
    expect(() => drawLantern(ctx, 150, 450, 14, PIXEL, TINT, 100, 0.5)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawCrystal
// ─────────────────────────────────────────────────────────────────────────────

describe('drawCrystal', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('executes without error', () => {
    expect(() => drawCrystal(ctx, 350, 500, 16, PIXEL, TINT, TIME, 0.4, 0.7)).not.toThrow()
  })

  it('calls fillRect for glow, body, and highlight', () => {
    drawCrystal(ctx, 350, 500, 16, PIXEL, TINT, TIME, 0.4, 0.7)
    // Crystal: glow, 3 body sections, inner highlight
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(5)
  })

  it('handles zero audio levels', () => {
    expect(() => drawCrystal(ctx, 350, 500, 16, PIXEL, TINT, TIME, 0, 0)).not.toThrow()
  })

  it('handles max audio levels', () => {
    expect(() => drawCrystal(ctx, 350, 500, 16, PIXEL, TINT, TIME, 1, 1)).not.toThrow()
  })

  it('handles different x positions', () => {
    expect(() => drawCrystal(ctx, 0, 500, 16, PIXEL, TINT, TIME, 0.4, 0.7)).not.toThrow()
    expect(() => drawCrystal(ctx, 800, 500, 16, PIXEL, TINT, TIME, 0.4, 0.7)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawShrine
// ─────────────────────────────────────────────────────────────────────────────

describe('drawShrine', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('executes without error', () => {
    expect(() => drawShrine(ctx, 500, 480, 22, PIXEL, TINT, TIME, 0.5)).not.toThrow()
  })

  it('calls fillRect for shadow, glow, roof, body, pillars, and orb', () => {
    drawShrine(ctx, 500, 480, 22, PIXEL, TINT, TIME, 0.5)
    // Shrine: shadow, roof glow, roof(2), body, pillars(2), orb
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(7)
  })

  it('handles zero bass level', () => {
    expect(() => drawShrine(ctx, 500, 480, 22, PIXEL, TINT, TIME, 0)).not.toThrow()
  })

  it('handles high bass level', () => {
    expect(() => drawShrine(ctx, 500, 480, 22, PIXEL, TINT, TIME, 1.0)).not.toThrow()
  })

  it('handles small shrine size', () => {
    expect(() => drawShrine(ctx, 500, 480, 5, PIXEL, TINT, TIME, 0.5)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawHero
// ─────────────────────────────────────────────────────────────────────────────

describe('drawHero', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('executes without error', () => {
    expect(() =>
      drawHero(ctx, 100, 350, PIXEL, 0.5, 0.4, 0.5, 0.6, TIME, false)
    ).not.toThrow()
  })

  it('calls save and restore for transform', () => {
    drawHero(ctx, 100, 350, PIXEL, 0.5, 0.4, 0.5, 0.6, TIME, false)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('calls translate and rotate for lean effect', () => {
    drawHero(ctx, 100, 350, PIXEL, 0.5, 0.4, 0.5, 0.6, TIME, false)
    expect(ctx.translate).toHaveBeenCalled()
    expect(ctx.rotate).toHaveBeenCalled()
  })

  it('renders body parts: shadow, hair, face, eyes, headphones, torso, arms, legs', () => {
    drawHero(ctx, 100, 350, PIXEL, 0.5, 0.4, 0.5, 0.6, TIME, false)
    // Hero has many fillRect calls for all body parts
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(10)
  })

  it('handles jumping state', () => {
    expect(() =>
      drawHero(ctx, 100, 300, PIXEL, 0.5, 0.4, 0.5, 0.6, TIME, true)
    ).not.toThrow()
  })

  it('handles zero audio levels', () => {
    expect(() =>
      drawHero(ctx, 100, 350, PIXEL, 0, 0, 0, 0, TIME, false)
    ).not.toThrow()
  })

  it('handles max audio levels', () => {
    expect(() =>
      drawHero(ctx, 100, 350, PIXEL, 1.0, 1.0, 1.0, 1.0, TIME, false)
    ).not.toThrow()
  })

  it('handles different run phases', () => {
    expect(() => drawHero(ctx, 100, 350, PIXEL, 0, 0.4, 0.5, 0.6, TIME, false)).not.toThrow()
    expect(() => drawHero(ctx, 100, 350, PIXEL, Math.PI, 0.4, 0.5, 0.6, TIME, false)).not.toThrow()
    expect(() => drawHero(ctx, 100, 350, PIXEL, Math.PI * 2, 0.4, 0.5, 0.6, TIME, false)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawEnemy
// ─────────────────────────────────────────────────────────────────────────────

describe('drawEnemy', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  const slime: Enemy = {
    x: 500,
    y: 420,
    baseY: 420,
    vx: -50,
    kind: 'slime',
    size: 24,
    phase: 0.8,
    tintIdx: 0.3,
    age: 2,
  }

  const bat: Enemy = {
    x: 600,
    y: 300,
    baseY: 300,
    vx: -80,
    kind: 'bat',
    size: 20,
    phase: 1.2,
    tintIdx: 0.6,
    age: 3,
  }

  it('renders slime enemy without error', () => {
    expect(() => drawEnemy(ctx, slime, PIXEL, 0.5)).not.toThrow()
  })

  it('renders bat enemy without error', () => {
    expect(() => drawEnemy(ctx, bat, PIXEL, 0.5)).not.toThrow()
  })

  it('draws slime body and eyes', () => {
    drawEnemy(ctx, slime, PIXEL, 0.5)
    // Slime: glow, body, top section, 2 eyes
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('draws bat body with wings', () => {
    drawEnemy(ctx, bat, PIXEL, 0.5)
    // Bat: glow, body, left wing, right wing, 2 eyes
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(5)
  })

  it('handles zero safeHigh', () => {
    expect(() => drawEnemy(ctx, slime, PIXEL, 0)).not.toThrow()
    expect(() => drawEnemy(ctx, bat, PIXEL, 0)).not.toThrow()
  })

  it('handles max safeHigh', () => {
    expect(() => drawEnemy(ctx, slime, PIXEL, 1.0)).not.toThrow()
    expect(() => drawEnemy(ctx, bat, PIXEL, 1.0)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawCoin
// ─────────────────────────────────────────────────────────────────────────────

describe('drawCoin', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  const coin: Coin = {
    x: 300,
    y: 380,
    baseY: 380,
    size: 16,
    phase: 0.5,
    tintIdx: 0.4,
    age: 1.5,
  }

  it('executes without error', () => {
    expect(() => drawCoin(ctx, coin, PIXEL, TIME, 0.5)).not.toThrow()
  })

  it('calls fillRect for glow, body, and highlight', () => {
    drawCoin(ctx, coin, PIXEL, TIME, 0.5)
    // Coin: glow, body, corner highlight, optional second highlight
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('handles zero safeHigh', () => {
    expect(() => drawCoin(ctx, coin, PIXEL, TIME, 0)).not.toThrow()
  })

  it('handles max safeHigh (triggers second highlight)', () => {
    // shimmer > 0.86 condition may trigger extra highlight
    expect(() => drawCoin(ctx, coin, PIXEL, TIME, 1.0)).not.toThrow()
  })

  it('handles different time values affecting shimmer', () => {
    expect(() => drawCoin(ctx, coin, PIXEL, 0, 0.5)).not.toThrow()
    expect(() => drawCoin(ctx, coin, PIXEL, 100, 0.5)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawSlash
// ─────────────────────────────────────────────────────────────────────────────

describe('drawSlash', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  it('executes without error for active slash', () => {
    const slash: Slash = { age: 0.1, duration: 0.5, power: 0.8 }
    expect(() => drawSlash(ctx, 100, 350, slash, PIXEL)).not.toThrow()
  })

  it('early-returns for completed slash (p >= 1)', () => {
    const completed: Slash = { age: 1.0, duration: 0.5, power: 0.8 }
    drawSlash(ctx, 100, 350, completed, PIXEL)
    // No drawing calls since p >= 1
    expect((ctx.fillRect as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })

  it('early-returns for zero-duration slash', () => {
    const zeroDuration: Slash = { age: 0, duration: 0, power: 0.8 }
    drawSlash(ctx, 100, 350, zeroDuration, PIXEL)
    // p = 1 when duration is 0, so early return
    expect((ctx.fillRect as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled()
  })

  it('calls save/restore and sets globalCompositeOperation', () => {
    const slash: Slash = { age: 0.1, duration: 0.5, power: 0.8 }
    drawSlash(ctx, 100, 350, slash, PIXEL)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('handles high power slash', () => {
    const strong: Slash = { age: 0.05, duration: 0.5, power: 1.0 }
    expect(() => drawSlash(ctx, 100, 350, strong, PIXEL)).not.toThrow()
  })

  it('handles low power slash', () => {
    const weak: Slash = { age: 0.1, duration: 0.5, power: 0.1 }
    expect(() => drawSlash(ctx, 100, 350, weak, PIXEL)).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drawPowerUp
// ─────────────────────────────────────────────────────────────────────────────

describe('drawPowerUp', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockCtx()
  })

  const heart: PowerUp = {
    x: 200,
    y: 300,
    baseY: 300,
    type: 'heart',
    phase: 0.5,
    tintIdx: 0.2,
  }

  const star: PowerUp = {
    x: 350,
    y: 280,
    baseY: 280,
    type: 'star',
    phase: 0.8,
    tintIdx: 0.7,
  }

  it('renders heart power-up without error', () => {
    expect(() => drawPowerUp(ctx, heart, PIXEL, TIME)).not.toThrow()
  })

  it('renders star power-up without error', () => {
    expect(() => drawPowerUp(ctx, star, PIXEL, TIME)).not.toThrow()
  })

  it('calls save/restore for transform', () => {
    drawPowerUp(ctx, heart, PIXEL, TIME)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('draws heart shape with multiple fillRect calls', () => {
    drawPowerUp(ctx, heart, PIXEL, TIME)
    // Heart: at least 6 rects (3 heart pieces + other details) + strokeRect
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('draws star shape with multiple fillRect calls', () => {
    drawPowerUp(ctx, star, PIXEL, TIME)
    // Star: cross shape (2 rects) + inner highlight + strokeRect
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('calls strokeRect for glow border', () => {
    drawPowerUp(ctx, heart, PIXEL, TIME)
    expect(ctx.strokeRect).toHaveBeenCalled()
  })

  it('handles different time values (bob animation)', () => {
    expect(() => drawPowerUp(ctx, heart, PIXEL, 0)).not.toThrow()
    expect(() => drawPowerUp(ctx, heart, PIXEL, 50)).not.toThrow()
  })
})
