/**
 * EightBitAdventure Visualizer Helpers Tests
 *
 * Tests pure math/utility functions and spawning helpers.
 * Canvas drawing functions are excluded (require CanvasRenderingContext2D).
 */

import { describe, expect, it } from 'vitest'
import {
  hexToRgb,
  PALETTE_RGB,
  lerp,
  clamp01,
  samplePalette,
  mixRgb,
  seededRandom,
  createStars,
  createClouds,
  createProps,
  spawnDustBurst,
  spawnSparkBurst,
  createCosmicSparkles,
  spawnCosmicSparkleBurst,
  spawnShootingStar,
  type Star,
  type Cloud,
  type Prop,
  type Particle,
  type CosmicSparkle,
  type ShootingStar,
} from '@/lib/visualizers/eight-bit-helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Color Utilities
// ─────────────────────────────────────────────────────────────────────────────

describe('hexToRgb', () => {
  it('converts a 6-digit hex with hash to RGB tuple', () => {
    expect(hexToRgb('#FF0000')).toEqual([255, 0, 0])
    expect(hexToRgb('#00FF00')).toEqual([0, 255, 0])
    expect(hexToRgb('#0000FF')).toEqual([0, 0, 255])
  })

  it('converts a 6-digit hex without hash', () => {
    expect(hexToRgb('FFFFFF')).toEqual([255, 255, 255])
    expect(hexToRgb('000000')).toEqual([0, 0, 0])
  })

  it('handles mixed-case hex', () => {
    expect(hexToRgb('#8b5cf6')).toEqual([139, 92, 246])
    expect(hexToRgb('#8B5CF6')).toEqual([139, 92, 246])
  })

  it('handles brand palette colors', () => {
    // Purple: #8B5CF6
    expect(hexToRgb('#8B5CF6')).toEqual([139, 92, 246])
    // Cyan: #06B6D4
    expect(hexToRgb('#06B6D4')).toEqual([6, 182, 212])
    // Magenta: #D946EF
    expect(hexToRgb('#D946EF')).toEqual([217, 70, 239])
  })
})

describe('PALETTE_RGB', () => {
  it('has 4 entries (purple, cyan, magenta, indigo)', () => {
    expect(PALETTE_RGB).toHaveLength(4)
  })

  it('each entry is an RGB tuple with values 0-255', () => {
    for (const [r, g, b] of PALETTE_RGB) {
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThanOrEqual(255)
      expect(g).toBeGreaterThanOrEqual(0)
      expect(g).toBeLessThanOrEqual(255)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(255)
    }
  })
})

describe('lerp', () => {
  it('returns a when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10)
  })

  it('returns b when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20)
  })

  it('returns midpoint when t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50)
  })

  it('extrapolates beyond 0-1 range', () => {
    expect(lerp(0, 10, 2)).toBe(20)
    expect(lerp(0, 10, -1)).toBe(-10)
  })
})

describe('clamp01', () => {
  it('clamps values below 0 to 0', () => {
    expect(clamp01(-0.5)).toBe(0)
    expect(clamp01(-100)).toBe(0)
  })

  it('clamps values above 1 to 1', () => {
    expect(clamp01(1.5)).toBe(1)
    expect(clamp01(100)).toBe(1)
  })

  it('passes through values in 0-1 range', () => {
    expect(clamp01(0)).toBe(0)
    expect(clamp01(0.5)).toBe(0.5)
    expect(clamp01(1)).toBe(1)
  })

  it('returns 0 for non-finite values', () => {
    expect(clamp01(NaN)).toBe(0)
    expect(clamp01(Infinity)).toBe(0)
    expect(clamp01(-Infinity)).toBe(0)
  })
})

describe('samplePalette', () => {
  it('returns an RGB tuple', () => {
    const result = samplePalette(0)
    expect(result).toHaveLength(3)
    result.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(255)
    })
  })

  it('returns integer values (rounded)', () => {
    const result = samplePalette(0.33)
    result.forEach((v) => {
      expect(Number.isInteger(v)).toBe(true)
    })
  })

  it('wraps t values using modulo', () => {
    // t=0 and t=1 should give similar results (wraps)
    const at0 = samplePalette(0)
    const at1 = samplePalette(1)
    // Due to modulo wrapping, both map to the same position
    expect(at0).toEqual(at1)
  })

  it('handles negative t values', () => {
    const result = samplePalette(-0.5)
    expect(result).toHaveLength(3)
    result.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(255)
    })
  })

  it('returns safe fallback for non-finite t', () => {
    const nanResult = samplePalette(NaN)
    expect(nanResult).toHaveLength(3)
    const infResult = samplePalette(Infinity)
    expect(infResult).toHaveLength(3)
  })
})

describe('mixRgb', () => {
  it('returns first color when t=0', () => {
    const a: [number, number, number] = [100, 150, 200]
    const b: [number, number, number] = [200, 50, 100]
    expect(mixRgb(a, b, 0)).toEqual([100, 150, 200])
  })

  it('returns second color when t=1', () => {
    const a: [number, number, number] = [100, 150, 200]
    const b: [number, number, number] = [200, 50, 100]
    expect(mixRgb(a, b, 1)).toEqual([200, 50, 100])
  })

  it('returns midpoint when t=0.5', () => {
    const a: [number, number, number] = [0, 0, 0]
    const b: [number, number, number] = [100, 200, 50]
    expect(mixRgb(a, b, 0.5)).toEqual([50, 100, 25])
  })

  it('returns integer values', () => {
    const a: [number, number, number] = [10, 20, 30]
    const b: [number, number, number] = [11, 21, 31]
    const result = mixRgb(a, b, 0.3)
    result.forEach((v) => {
      expect(Number.isInteger(v)).toBe(true)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Random & Spawning
// ─────────────────────────────────────────────────────────────────────────────

describe('seededRandom', () => {
  it('returns a function', () => {
    const rng = seededRandom(42)
    expect(typeof rng).toBe('function')
  })

  it('produces values between 0 and 1', () => {
    const rng = seededRandom(42)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is deterministic for the same seed', () => {
    const rng1 = seededRandom(12345)
    const rng2 = seededRandom(12345)
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2())
    }
  })

  it('produces different sequences for different seeds', () => {
    const rng1 = seededRandom(1)
    const rng2 = seededRandom(2)
    // Collect first 5 values
    const seq1 = Array.from({ length: 5 }, () => rng1())
    const seq2 = Array.from({ length: 5 }, () => rng2())
    // At least one value should differ
    const allSame = seq1.every((v, i) => v === seq2[i])
    expect(allSame).toBe(false)
  })
})

describe('createStars', () => {
  it('creates the requested number of stars', () => {
    const rng = seededRandom(42)
    const stars = createStars(800, 600, 50, rng)
    expect(stars).toHaveLength(50)
  })

  it('returns zero stars when count is 0', () => {
    const rng = seededRandom(42)
    const stars = createStars(800, 600, 0, rng)
    expect(stars).toHaveLength(0)
  })

  it('places stars within the canvas bounds', () => {
    const rng = seededRandom(42)
    const width = 800
    const height = 600
    const stars = createStars(width, height, 100, rng)
    stars.forEach((star: Star) => {
      expect(star.x).toBeGreaterThanOrEqual(0)
      expect(star.x).toBeLessThan(width)
      // Stars only appear in upper 56% of canvas
      expect(star.y).toBeGreaterThanOrEqual(0)
      expect(star.y).toBeLessThan(height * 0.56)
    })
  })

  it('assigns valid star properties', () => {
    const rng = seededRandom(42)
    const stars = createStars(800, 600, 30, rng)
    stars.forEach((star: Star) => {
      expect([1, 2, 3]).toContain(star.size)
      expect(star.baseAlpha).toBeGreaterThan(0)
      expect(star.twinkleSpeed).toBeGreaterThan(0)
      expect(star.phase).toBeGreaterThanOrEqual(0)
      expect(star.tintIdx).toBeGreaterThanOrEqual(0)
      expect(star.tintIdx).toBeLessThan(1)
    })
  })
})

describe('createClouds', () => {
  it('creates the requested number of clouds', () => {
    const rng = seededRandom(42)
    const clouds = createClouds(800, 600, 10, rng)
    expect(clouds).toHaveLength(10)
  })

  it('returns empty array when count is 0', () => {
    const rng = seededRandom(42)
    expect(createClouds(800, 600, 0, rng)).toHaveLength(0)
  })

  it('places clouds in the sky region', () => {
    const rng = seededRandom(42)
    const height = 600
    const clouds = createClouds(800, height, 20, rng)
    const skyTop = height * 0.08
    const skyBottom = height * 0.38
    clouds.forEach((cloud: Cloud) => {
      expect(cloud.y).toBeGreaterThanOrEqual(skyTop)
      expect(cloud.y).toBeLessThanOrEqual(skyBottom)
      expect(cloud.w).toBeGreaterThan(0)
      expect(cloud.h).toBeGreaterThan(0)
      expect(cloud.speed).toBeGreaterThan(0)
    })
  })
})

describe('createProps', () => {
  it('creates the requested number of props', () => {
    const rng = seededRandom(42)
    const props = createProps(800, 600, 15, rng)
    expect(props).toHaveLength(15)
  })

  it('returns empty array when count is 0', () => {
    const rng = seededRandom(42)
    expect(createProps(800, 600, 0, rng)).toHaveLength(0)
  })

  it('assigns valid prop kinds', () => {
    const rng = seededRandom(42)
    const validKinds = ['tree', 'sign', 'tower', 'lantern', 'crystal', 'shrine']
    const props = createProps(800, 600, 50, rng)
    props.forEach((prop: Prop) => {
      expect(validKinds).toContain(prop.kind)
      expect(prop.size).toBeGreaterThan(0)
      expect(prop.parallax).toBeGreaterThan(0)
      expect(prop.parallax).toBeLessThanOrEqual(1)
      expect(prop.bobSpeed).toBeGreaterThan(0)
      expect(prop.bobAmount).toBeGreaterThan(0)
    })
  })

  it('places props at ground level', () => {
    const rng = seededRandom(42)
    const height = 600
    const groundY = height * 0.78
    const props = createProps(800, height, 10, rng)
    props.forEach((prop: Prop) => {
      expect(prop.y).toBe(groundY)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Particle Spawning
// ─────────────────────────────────────────────────────────────────────────────

describe('spawnDustBurst', () => {
  it('spawns the requested number of dust particles', () => {
    const particles: Particle[] = []
    const rng = seededRandom(42)
    spawnDustBurst(particles, 100, 200, 10, rng, 0.5)
    expect(particles).toHaveLength(10)
  })

  it('appends to existing particles array', () => {
    const particles: Particle[] = [
      { x: 0, y: 0, vx: 0, vy: 0, age: 0, duration: 1, size: 1, tintIdx: 0, kind: 'dust' },
    ]
    const rng = seededRandom(42)
    spawnDustBurst(particles, 100, 200, 5, rng, 0.5)
    expect(particles).toHaveLength(6)
  })

  it('creates particles with dust kind', () => {
    const particles: Particle[] = []
    const rng = seededRandom(42)
    spawnDustBurst(particles, 100, 200, 5, rng, 0.5)
    particles.forEach((p) => {
      expect(p.kind).toBe('dust')
      expect(p.age).toBe(0)
      expect(p.duration).toBeGreaterThan(0)
      expect(p.size).toBeGreaterThan(0)
    })
  })

  it('spawns nothing when count is 0', () => {
    const particles: Particle[] = []
    const rng = seededRandom(42)
    spawnDustBurst(particles, 100, 200, 0, rng, 0.5)
    expect(particles).toHaveLength(0)
  })
})

describe('spawnSparkBurst', () => {
  it('spawns the requested number of spark particles', () => {
    const particles: Particle[] = []
    const rng = seededRandom(42)
    spawnSparkBurst(particles, 100, 200, 8, rng, 0.3)
    expect(particles).toHaveLength(8)
  })

  it('creates particles with spark kind', () => {
    const particles: Particle[] = []
    const rng = seededRandom(42)
    spawnSparkBurst(particles, 100, 200, 5, rng, 0.3)
    particles.forEach((p) => {
      expect(p.kind).toBe('spark')
      expect(p.age).toBe(0)
      expect(p.duration).toBeGreaterThan(0)
      expect(p.size).toBeGreaterThan(0)
    })
  })

  it('spawns nothing when count is 0', () => {
    const particles: Particle[] = []
    const rng = seededRandom(42)
    spawnSparkBurst(particles, 100, 200, 0, rng, 0.3)
    expect(particles).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cosmic Sparkle & Shooting Star Spawning
// ─────────────────────────────────────────────────────────────────────────────

describe('createCosmicSparkles', () => {
  it('creates the requested number of sparkles', () => {
    const rng = seededRandom(42)
    const sparkles = createCosmicSparkles(800, 600, 20, rng)
    expect(sparkles).toHaveLength(20)
  })

  it('returns empty array when count is 0', () => {
    const rng = seededRandom(42)
    expect(createCosmicSparkles(800, 600, 0, rng)).toHaveLength(0)
  })

  it('places sparkles in the sky region', () => {
    const rng = seededRandom(42)
    const height = 600
    const sparkles = createCosmicSparkles(800, height, 30, rng)
    sparkles.forEach((sparkle: CosmicSparkle) => {
      expect(sparkle.y).toBeGreaterThanOrEqual(0)
      expect(sparkle.y).toBeLessThanOrEqual(height * 0.45)
      expect(sparkle.vy).toBeLessThan(0) // Moving upward
      expect(sparkle.size).toBeGreaterThan(0)
      expect(sparkle.baseAlpha).toBeGreaterThan(0)
      expect(sparkle.age).toBe(0)
      expect(sparkle.duration).toBeGreaterThan(0)
    })
  })
})

describe('spawnCosmicSparkleBurst', () => {
  it('appends sparkles to existing array', () => {
    const sparkles: CosmicSparkle[] = []
    const rng = seededRandom(42)
    spawnCosmicSparkleBurst(sparkles, 800, 600, 10, rng, 0.5)
    expect(sparkles).toHaveLength(10)
  })

  it('creates sparkles with burst properties', () => {
    const sparkles: CosmicSparkle[] = []
    const rng = seededRandom(42)
    spawnCosmicSparkleBurst(sparkles, 800, 600, 5, rng, 0.5)
    sparkles.forEach((s) => {
      expect(s.vy).toBeLessThan(0) // Moving upward
      expect(s.size).toBeGreaterThanOrEqual(4)
      expect(s.baseAlpha).toBeGreaterThanOrEqual(0.5)
      expect(s.age).toBe(0)
      expect(s.duration).toBeGreaterThan(0)
    })
  })

  it('spawns nothing when count is 0', () => {
    const sparkles: CosmicSparkle[] = []
    const rng = seededRandom(42)
    spawnCosmicSparkleBurst(sparkles, 800, 600, 0, rng, 0.5)
    expect(sparkles).toHaveLength(0)
  })
})

describe('spawnShootingStar', () => {
  it('appends one shooting star to array', () => {
    const stars: ShootingStar[] = []
    const rng = seededRandom(42)
    spawnShootingStar(stars, 800, 600, rng, 0.5, 0.7)
    expect(stars).toHaveLength(1)
  })

  it('creates shooting star with valid properties', () => {
    const stars: ShootingStar[] = []
    const rng = seededRandom(42)
    spawnShootingStar(stars, 800, 600, rng, 0.5, 0.7)
    const star = stars[0]
    expect(star.x).toBeGreaterThanOrEqual(0)
    expect(star.y).toBeGreaterThanOrEqual(0)
    expect(star.vx).toBeGreaterThan(0) // Moving right
    expect(star.vy).toBeGreaterThan(0) // Moving down
    expect(star.length).toBeGreaterThan(0)
    expect(star.age).toBe(0)
    expect(star.duration).toBeGreaterThan(0)
    expect(star.brightness).toBeGreaterThan(0)
  })

  it('increases length and speed with higher audio intensity', () => {
    const rng1 = seededRandom(42)
    const rng2 = seededRandom(42)
    const lowIntensity: ShootingStar[] = []
    const highIntensity: ShootingStar[] = []
    spawnShootingStar(lowIntensity, 800, 600, rng1, 0.5, 0.0)
    spawnShootingStar(highIntensity, 800, 600, rng2, 0.5, 1.0)
    // Higher audio intensity = longer + brighter
    expect(highIntensity[0].length).toBeGreaterThan(lowIntensity[0].length)
    expect(highIntensity[0].brightness).toBeGreaterThan(lowIntensity[0].brightness)
  })
})
