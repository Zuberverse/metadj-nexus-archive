/**
 * EightBitAdventure Visualizer Helpers
 *
 * Extracted draw functions and utilities for the 8-bit adventure visualizer.
 * These helpers handle pixel-perfect rendering of game elements.
 *
 * @module lib/visualizers/eight-bit-helpers
 */

import { VISUALIZER_COLORS } from "@/lib/color/visualizer-palette"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EnemyKind = "slime" | "bat"
export type IntensityMode = "focus" | "standard" | "hype"
export type PropKind = "tree" | "sign" | "tower" | "lantern" | "crystal" | "shrine"

export interface Star {
  x: number
  y: number
  size: number
  baseAlpha: number
  twinkleSpeed: number
  phase: number
  tintIdx: number
}

export interface Cloud {
  x: number
  y: number
  baseY: number
  w: number
  h: number
  speed: number
  phase: number
  tintIdx: number
}

export interface Prop {
  x: number
  y: number
  size: number
  parallax: number
  kind: PropKind
  tintIdx: number
  phase: number
  bobSpeed: number
  bobAmount: number
}

export interface Coin {
  x: number
  y: number
  baseY: number
  size: number
  phase: number
  tintIdx: number
  age: number
}

export interface Enemy {
  x: number
  y: number
  baseY: number
  vx: number
  kind: EnemyKind
  size: number
  phase: number
  tintIdx: number
  age: number
}

export interface PowerUp {
  x: number
  y: number
  baseY: number
  type: "heart" | "star"
  phase: number
  tintIdx: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  duration: number
  size: number
  tintIdx: number
  kind: "dust" | "spark"
}

export interface Slash {
  age: number
  duration: number
  power: number
}

export interface Hero {
  y: number
  vy: number
  onGround: boolean
  runPhase: number
}

export interface AdventureBackground {
  sky: CanvasGradient | null
  glow: CanvasGradient | null
  vignette: CanvasGradient | null
}

export interface CosmicSparkle {
  x: number
  y: number
  vy: number
  size: number
  baseAlpha: number
  phase: number
  tintIdx: number
  age: number
  duration: number
}

export interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  length: number
  age: number
  duration: number
  tintIdx: number
  brightness: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Color Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace("#", "")
  const bigint = parseInt(sanitized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return [r, g, b]
}

export const PALETTE_RGB = [
  hexToRgb(VISUALIZER_COLORS.purple),
  hexToRgb(VISUALIZER_COLORS.cyan),
  hexToRgb(VISUALIZER_COLORS.magenta),
  hexToRgb(VISUALIZER_COLORS.indigo),
]

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function samplePalette(t: number): [number, number, number] {
  const count = PALETTE_RGB.length
  const fallback = PALETTE_RGB[0]
  if (count === 0 || !fallback) return [255, 255, 255]

  const safeT = Number.isFinite(t) ? ((t % 1) + 1) % 1 : 0
  const scaled = safeT * count
  const idx = Math.min(count - 1, Math.max(0, Math.floor(scaled)))
  const next = (idx + 1) % count
  const frac = scaled - Math.floor(scaled)
  const a = PALETTE_RGB[idx] ?? fallback
  const b = PALETTE_RGB[next] ?? fallback
  return [
    Math.round(lerp(a[0], b[0], frac)),
    Math.round(lerp(a[1], b[1], frac)),
    Math.round(lerp(a[2], b[2], frac)),
  ]
}

export function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Random & Spawning
// ─────────────────────────────────────────────────────────────────────────────

export function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

export function createStars(
  width: number,
  height: number,
  count: number,
  random: () => number
): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    const roll = random()
    const size = roll < 0.86 ? 1 : roll < 0.975 ? 2 : 3
    stars.push({
      x: Math.floor(random() * width),
      y: Math.floor(random() * (height * 0.56)),
      size,
      baseAlpha: 0.03 + random() * 0.09,
      twinkleSpeed: 0.8 + random() * 2.6,
      phase: random() * Math.PI * 2,
      tintIdx: random(),
    })
  }
  return stars
}

export function createClouds(
  width: number,
  height: number,
  count: number,
  random: () => number
): Cloud[] {
  const clouds: Cloud[] = []
  const skyTop = height * 0.08
  const skyBottom = height * 0.38
  for (let i = 0; i < count; i++) {
    const w = 36 + random() * 90
    const h = 12 + random() * 26
    const y = skyTop + random() * (skyBottom - skyTop)
    clouds.push({
      x: random() * width,
      y,
      baseY: y,
      w,
      h,
      speed: 9 + random() * 18,
      phase: random() * Math.PI * 2,
      tintIdx: random(),
    })
  }
  return clouds
}

export function createProps(
  width: number,
  height: number,
  count: number,
  random: () => number
): Prop[] {
  const props: Prop[] = []
  const groundY = height * 0.78
  for (let i = 0; i < count; i++) {
    const kindRoll = random()
    const kind: PropKind =
      kindRoll < 0.35
        ? "tree"
        : kindRoll < 0.5
          ? "sign"
          : kindRoll < 0.65
            ? "tower"
            : kindRoll < 0.78
              ? "lantern"
              : kindRoll < 0.9
                ? "crystal"
                : "shrine"
    const size =
      kind === "tower"
        ? 18 + random() * 20
        : kind === "lantern"
          ? 10 + random() * 8
          : kind === "crystal"
            ? 12 + random() * 10
            : kind === "shrine"
              ? 16 + random() * 12
              : 14 + random() * 18
    const parallax =
      kind === "tower"
        ? 0.35
        : kind === "shrine"
          ? 0.4
          : kind === "tree"
            ? 0.55
            : kind === "crystal"
              ? 0.6
              : kind === "lantern"
                ? 0.65
                : 0.7
    const bobSpeed =
      kind === "lantern"
        ? 2.5 + random() * 1.5
        : kind === "crystal"
          ? 1.8 + random() * 1.2
          : 0.8 + random() * 0.6
    const bobAmount =
      kind === "lantern"
        ? 3 + random() * 2
        : kind === "crystal"
          ? 2 + random() * 1.5
          : 0.5 + random() * 0.5
    props.push({
      x: random() * width,
      y: groundY,
      size,
      parallax,
      kind,
      tintIdx: random(),
      phase: random() * Math.PI * 2,
      bobSpeed,
      bobAmount,
    })
  }
  return props
}

// ─────────────────────────────────────────────────────────────────────────────
// Particle Spawning
// ─────────────────────────────────────────────────────────────────────────────

export function spawnDustBurst(
  particles: Particle[],
  x: number,
  y: number,
  count: number,
  random: () => number,
  tintBase: number
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.PI * (0.8 + random() * 0.4)
    const speed = 40 + random() * 140
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * (0.45 + random() * 0.35),
      age: 0,
      duration: 0.35 + random() * 0.35,
      size: 2 + random() * 2,
      tintIdx: (tintBase + random() * 0.4) % 1,
      kind: "dust",
    })
  }
}

export function spawnSparkBurst(
  particles: Particle[],
  x: number,
  y: number,
  count: number,
  random: () => number,
  tintBase: number
): void {
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2
    const speed = 80 + random() * 190
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      duration: 0.25 + random() * 0.45,
      size: 1 + random() * 2,
      tintIdx: (tintBase + random() * 0.6) % 1,
      kind: "spark",
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cosmic Sparkle & Shooting Star Spawning
// ─────────────────────────────────────────────────────────────────────────────

export function createCosmicSparkles(
  width: number,
  height: number,
  count: number,
  random: () => number
): CosmicSparkle[] {
  const sparkles: CosmicSparkle[] = []
  const skyTop = 0
  const skyBottom = height * 0.45
  for (let i = 0; i < count; i++) {
    sparkles.push({
      x: random() * width,
      y: skyTop + random() * (skyBottom - skyTop),
      vy: -(8 + random() * 12),
      size: 3 + random() * 4,
      baseAlpha: 0.3 + random() * 0.4,
      phase: random() * Math.PI * 2,
      tintIdx: random(),
      age: 0,
      duration: 4 + random() * 6,
    })
  }
  return sparkles
}

export function spawnCosmicSparkleBurst(
  sparkles: CosmicSparkle[],
  width: number,
  height: number,
  count: number,
  random: () => number,
  tintBase: number
): void {
  const skyTop = 0
  const skyBottom = height * 0.4
  for (let i = 0; i < count; i++) {
    sparkles.push({
      x: random() * width,
      y: skyBottom - random() * (skyBottom - skyTop) * 0.3,
      vy: -(15 + random() * 25),
      size: 4 + random() * 5,
      baseAlpha: 0.5 + random() * 0.4,
      phase: random() * Math.PI * 2,
      tintIdx: (tintBase + random() * 0.5) % 1,
      age: 0,
      duration: 2.5 + random() * 3,
    })
  }
}

export function spawnShootingStar(
  shootingStars: ShootingStar[],
  width: number,
  height: number,
  random: () => number,
  tintBase: number,
  audioIntensity: number
): void {
  const startX = random() * width * 0.6
  const startY = random() * height * 0.25 + height * 0.05
  const angle = Math.PI * 0.15 + random() * Math.PI * 0.15
  const speed = 350 + random() * 250 + audioIntensity * 200
  shootingStars.push({
    x: startX,
    y: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length: 25 + random() * 35 + audioIntensity * 20,
    age: 0,
    duration: 0.6 + random() * 0.4,
    tintIdx: (tintBase + random() * 0.3) % 1,
    brightness: 0.6 + audioIntensity * 0.4,
  })
}

export function drawCosmicSparkle(
  ctx: CanvasRenderingContext2D,
  sparkle: CosmicSparkle,
  pixel: number,
  time: number,
  highLevel: number,
  bassLevel: number
): void {
  const t = sparkle.age / sparkle.duration
  const fadeIn = Math.min(1, t * 4)
  const fadeOut = Math.max(0, 1 - (t - 0.7) * 3.33)
  const fade = fadeIn * fadeOut

  const pulse = Math.sin(time * 4 + sparkle.phase) * 0.4 + 0.6
  const audioPulse = 1 + highLevel * 0.5 + bassLevel * 0.3
  const alpha = sparkle.baseAlpha * fade * pulse * audioPulse

  if (alpha < 0.01) return

  const tint = samplePalette((sparkle.tintIdx + time * 0.08 + highLevel * 0.15) % 1)
  const size = Math.max(pixel * 2, Math.round((sparkle.size * audioPulse) / pixel) * pixel)

  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${alpha * 0.3})`
  ctx.fillRect(
    Math.round((sparkle.x - size) / pixel) * pixel,
    Math.round((sparkle.y - size) / pixel) * pixel,
    size * 3,
    size * 3
  )

  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${alpha * 0.7})`
  ctx.fillRect(
    Math.round((sparkle.x - size * 0.5) / pixel) * pixel,
    Math.round((sparkle.y - size * 0.5) / pixel) * pixel,
    size * 2,
    size * 2
  )

  const coreBright = mixRgb(tint, [255, 255, 255], 0.6)
  ctx.fillStyle = `rgba(${coreBright[0]}, ${coreBright[1]}, ${coreBright[2]}, ${alpha})`
  ctx.fillRect(
    Math.round(sparkle.x / pixel) * pixel,
    Math.round(sparkle.y / pixel) * pixel,
    size,
    size
  )
}

export function drawShootingStar(
  ctx: CanvasRenderingContext2D,
  star: ShootingStar,
  pixel: number,
  time: number
): void {
  const t = star.age / star.duration
  const fade = t < 0.2 ? t * 5 : Math.max(0, 1 - (t - 0.2) * 1.25)

  if (fade < 0.01) return

  const tint = samplePalette((star.tintIdx + time * 0.1) % 1)
  const bright = mixRgb(tint, [255, 255, 255], 0.7)

  const speed = Math.sqrt(star.vx * star.vx + star.vy * star.vy)
  const dirX = star.vx / speed
  const dirY = star.vy / speed

  const segments = Math.ceil(star.length / pixel)
  for (let i = 0; i < segments; i++) {
    const segFade = (1 - i / segments) * fade * star.brightness
    if (segFade < 0.02) continue

    const sx = Math.round((star.x - dirX * i * pixel) / pixel) * pixel
    const sy = Math.round((star.y - dirY * i * pixel) / pixel) * pixel

    if (i === 0) {
      ctx.fillStyle = `rgba(${bright[0]}, ${bright[1]}, ${bright[2]}, ${segFade})`
      ctx.fillRect(sx - pixel, sy - pixel, pixel * 3, pixel * 3)
    } else {
      ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${segFade * 0.7})`
      ctx.fillRect(sx, sy, pixel * 2, pixel * 2)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Draw Functions - Primitives
// ─────────────────────────────────────────────────────────────────────────────

export function drawPixelDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  pixel: number,
  fillStyle: string
): void {
  const r = Math.max(pixel, radius)
  ctx.fillStyle = fillStyle
  for (let row = -r; row <= r; row += pixel) {
    const half = Math.sqrt(Math.max(0, r * r - row * row))
    const w = Math.max(pixel, Math.round((half * 2) / pixel) * pixel)
    const rx = Math.round((x - w * 0.5) / pixel) * pixel
    const ry = Math.round((y + row) / pixel) * pixel
    ctx.fillRect(rx, ry, w, pixel)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Draw Functions - Props
// ─────────────────────────────────────────────────────────────────────────────

export function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  size: number,
  pixel: number,
  tint: [number, number, number]
): void {
  const trunkW = Math.max(pixel, Math.round((size * 0.18) / pixel) * pixel)
  const trunkH = Math.max(pixel * 5, Math.round((size * 0.48) / pixel) * pixel)
  const leafW = Math.max(pixel * 5, Math.round((size * 0.75) / pixel) * pixel)
  const leafH = Math.max(pixel * 5, Math.round((size * 0.62) / pixel) * pixel)

  const trunkX = Math.round((x - trunkW * 0.5) / pixel) * pixel
  const trunkY = Math.round((groundY - trunkH) / pixel) * pixel
  const leafX = Math.round((x - leafW * 0.5) / pixel) * pixel
  const leafY = Math.round((trunkY - leafH + pixel * 2) / pixel) * pixel

  ctx.fillStyle = `rgba(0, 0, 0, 0.25)`
  ctx.fillRect(trunkX + pixel * 2, trunkY + pixel * 2, trunkW, trunkH)
  ctx.fillRect(leafX + pixel * 2, leafY + pixel * 2, leafW, leafH)

  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, 0.22)`
  ctx.fillRect(leafX - pixel * 2, leafY - pixel * 2, leafW + pixel * 4, leafH + pixel * 4)

  ctx.fillStyle = "rgba(12, 14, 28, 0.95)"
  ctx.fillRect(trunkX, trunkY, trunkW, trunkH)

  const leaf = mixRgb(tint, [255, 255, 255], 0.15)
  ctx.fillStyle = `rgba(${leaf[0]}, ${leaf[1]}, ${leaf[2]}, 0.82)`
  ctx.fillRect(leafX, leafY, leafW, leafH)

  ctx.fillStyle = "rgba(255, 255, 255, 0.12)"
  ctx.fillRect(
    leafX + pixel * 2,
    leafY + pixel * 2,
    Math.max(pixel, Math.round(leafW * 0.3)),
    Math.max(pixel, Math.round(leafH * 0.25))
  )
}

export function drawTower(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  size: number,
  pixel: number,
  tint: [number, number, number],
  glow: number
): void {
  const w = Math.max(pixel * 6, Math.round((size * 0.7) / pixel) * pixel)
  const h = Math.max(pixel * 12, Math.round((size * 2.1) / pixel) * pixel)
  const baseX = Math.round((x - w * 0.5) / pixel) * pixel
  const baseY = Math.round((groundY - h) / pixel) * pixel

  ctx.fillStyle = "rgba(0, 0, 0, 0.25)"
  ctx.fillRect(baseX + pixel * 2, baseY + pixel * 2, w, h)

  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${0.08 + glow * 0.18})`
  ctx.fillRect(baseX - pixel * 2, baseY - pixel * 2, w + pixel * 4, h + pixel * 4)

  ctx.fillStyle = "rgba(8, 10, 22, 0.9)"
  ctx.fillRect(baseX, baseY, w, h)

  // Windows
  const winCount = 3
  const winW = pixel * 2
  const winH = pixel * 3
  const winGap = Math.max(pixel * 3, Math.round((h * 0.18) / pixel) * pixel)
  for (let i = 0; i < winCount; i++) {
    const wy = baseY + pixel * 4 + i * winGap
    const pulse = Math.sin(i + glow * 8) * 0.5 + 0.5
    const a = 0.05 + glow * 0.18 + pulse * 0.08
    ctx.fillStyle = `rgba(255, 255, 255, ${a})`
    ctx.fillRect(baseX + pixel * 2, wy, winW, winH)
    ctx.fillRect(baseX + w - pixel * 4, wy, winW, winH)
  }
}

export function drawSign(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  size: number,
  pixel: number,
  tint: [number, number, number],
  pulse: number
): void {
  const postW = pixel * 2
  const postH = Math.max(pixel * 7, Math.round((size * 0.9) / pixel) * pixel)
  const signW = Math.max(pixel * 10, Math.round((size * 1.2) / pixel) * pixel)
  const signH = Math.max(pixel * 6, Math.round((size * 0.55) / pixel) * pixel)

  const postX = Math.round((x - postW * 0.5) / pixel) * pixel
  const postY = Math.round((groundY - postH) / pixel) * pixel
  const signX = Math.round((x - signW * 0.5) / pixel) * pixel
  const signY = Math.round((postY + pixel * 2) / pixel) * pixel

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
  ctx.fillRect(postX + pixel * 2, postY + pixel * 2, postW, postH)
  ctx.fillRect(signX + pixel * 2, signY + pixel * 2, signW, signH)

  ctx.fillStyle = "rgba(14, 16, 34, 0.95)"
  ctx.fillRect(postX, postY, postW, postH)

  const board = mixRgb(tint, [255, 255, 255], 0.2)
  ctx.fillStyle = `rgba(${board[0]}, ${board[1]}, ${board[2]}, ${0.6 + pulse * 0.25})`
  ctx.fillRect(signX, signY, signW, signH)

  // Arrow
  ctx.fillStyle = `rgba(255, 255, 255, ${0.18 + pulse * 0.42})`
  const ax = signX + pixel * 3
  const ay = signY + Math.round((signH * 0.5) / pixel) * pixel
  ctx.fillRect(ax, ay, pixel * 4, pixel)
  ctx.fillRect(ax + pixel * 4, ay - pixel, pixel, pixel)
  ctx.fillRect(ax + pixel * 4, ay + pixel, pixel, pixel)
}

export function drawLantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  size: number,
  pixel: number,
  tint: [number, number, number],
  time: number,
  safeHigh: number
): void {
  const postW = pixel * 2
  const postH = Math.max(pixel * 8, Math.round((size * 1.2) / pixel) * pixel)
  const lanternSize = Math.max(pixel * 5, Math.round((size * 0.7) / pixel) * pixel)

  const postX = Math.round((x - postW * 0.5) / pixel) * pixel
  const postY = Math.round((groundY - postH) / pixel) * pixel
  const lanternX = Math.round((x - lanternSize * 0.5) / pixel) * pixel
  const lanternY = postY - lanternSize - pixel

  // Post shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.15)"
  ctx.fillRect(postX + pixel, postY + pixel, postW, postH)

  // Post
  ctx.fillStyle = "rgba(14, 16, 34, 0.9)"
  ctx.fillRect(postX, postY, postW, postH)

  // Lantern glow (pulsing)
  const glowPulse = Math.sin(time * 4) * 0.3 + 0.7
  const glowAlpha = (0.15 + safeHigh * 0.25) * glowPulse
  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${glowAlpha * 0.4})`
  ctx.fillRect(
    lanternX - pixel * 3,
    lanternY - pixel * 3,
    lanternSize + pixel * 6,
    lanternSize + pixel * 6
  )

  // Lantern body
  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${0.7 + glowPulse * 0.2})`
  ctx.fillRect(lanternX, lanternY, lanternSize, lanternSize)

  // Lantern inner light
  ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + glowPulse * 0.4})`
  ctx.fillRect(
    lanternX + pixel,
    lanternY + pixel,
    lanternSize - pixel * 2,
    lanternSize - pixel * 2
  )
}

export function drawCrystal(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  size: number,
  pixel: number,
  tint: [number, number, number],
  time: number,
  safeMid: number,
  safeHigh: number
): void {
  const crystalH = Math.max(pixel * 10, Math.round((size * 1.4) / pixel) * pixel)
  const crystalW = Math.max(pixel * 6, Math.round((size * 0.8) / pixel) * pixel)

  const baseX = Math.round((x - crystalW * 0.5) / pixel) * pixel
  const baseY = Math.round((groundY - crystalH) / pixel) * pixel

  // Crystal glow
  const shimmer = Math.sin(time * 3 + x * 0.01) * 0.3 + 0.7
  const glowAlpha = (0.12 + safeHigh * 0.2 + safeMid * 0.15) * shimmer
  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${glowAlpha * 0.5})`
  ctx.fillRect(baseX - pixel * 2, baseY - pixel * 2, crystalW + pixel * 4, crystalH + pixel * 4)

  // Crystal body (tapered shape)
  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${0.6 + shimmer * 0.25})`
  ctx.fillRect(baseX + pixel, baseY, crystalW - pixel * 2, crystalH) // Main body
  ctx.fillRect(baseX, baseY + pixel * 3, crystalW, crystalH - pixel * 3) // Wider base
  ctx.fillRect(baseX + pixel * 2, baseY - pixel * 2, crystalW - pixel * 4, pixel * 2) // Top point

  // Inner highlight
  ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + shimmer * 0.25})`
  ctx.fillRect(baseX + pixel * 2, baseY + pixel * 2, pixel * 2, crystalH - pixel * 6)
}

export function drawShrine(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  size: number,
  pixel: number,
  tint: [number, number, number],
  time: number,
  safeBass: number
): void {
  const shrineW = Math.max(pixel * 12, Math.round((size * 1.5) / pixel) * pixel)
  const shrineH = Math.max(pixel * 8, Math.round((size * 0.9) / pixel) * pixel)
  const roofH = Math.max(pixel * 4, Math.round((size * 0.4) / pixel) * pixel)

  const baseX = Math.round((x - shrineW * 0.5) / pixel) * pixel
  const baseY = Math.round((groundY - shrineH) / pixel) * pixel
  const roofY = baseY - roofH

  // Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
  ctx.fillRect(baseX + pixel * 2, baseY + pixel * 2, shrineW, shrineH)

  // Roof glow (pulses with bass)
  const pulse = 0.6 + safeBass * 0.4
  const glowAlpha = (0.1 + safeBass * 0.15) * pulse
  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${glowAlpha})`
  ctx.fillRect(baseX - pixel * 3, roofY - pixel * 2, shrineW + pixel * 6, roofH + shrineH + pixel * 4)

  // Roof
  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${0.7 + pulse * 0.2})`
  ctx.fillRect(baseX - pixel * 2, roofY, shrineW + pixel * 4, roofH)
  ctx.fillRect(baseX - pixel * 4, roofY + pixel * 2, shrineW + pixel * 8, pixel * 2)

  // Shrine body
  ctx.fillStyle = "rgba(14, 16, 34, 0.9)"
  ctx.fillRect(baseX, baseY, shrineW, shrineH)

  // Pillars
  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, 0.5)`
  ctx.fillRect(baseX, baseY, pixel * 2, shrineH)
  ctx.fillRect(baseX + shrineW - pixel * 2, baseY, pixel * 2, shrineH)

  // Inner glow (orb)
  const orbPulse = Math.sin(time * 2.5) * 0.3 + 0.7
  ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + orbPulse * 0.35})`
  const orbX = baseX + shrineW * 0.5 - pixel * 2
  const orbY = baseY + shrineH * 0.4
  ctx.fillRect(Math.round(orbX / pixel) * pixel, Math.round(orbY / pixel) * pixel, pixel * 4, pixel * 4)
}

// ─────────────────────────────────────────────────────────────────────────────
// Draw Functions - Characters & Items
// ─────────────────────────────────────────────────────────────────────────────

export function drawHero(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pixel: number,
  runPhase: number,
  safeBass: number,
  safeMid: number,
  safeHigh: number,
  time: number,
  isJumping: boolean
): void {
  // Larger avatar: increased from 10/8 to 13/10
  const body = pixel * 13
  const head = pixel * 10

  // Dynamic forward lean - always leaning slightly right to imply forward motion
  const baseLean = 0.06 // Constant forward lean
  const musicLean = (safeMid * 0.1 + safeBass * 0.06) * (isJumping ? 0.4 : 1)
  const leanAmount = baseLean + musicLean

  // Smoother run animation with asymmetric bias for rightward walking feel
  const smoothPhase = runPhase * 0.85 // Slightly slower for fluidity
  const step = Math.sin(smoothPhase) * 0.5 + 0.5

  // Asymmetric leg movement
  const frontLegExtend = Math.round(step * pixel * 4)
  const backLegRetract = Math.round((1 - step) * pixel * 2.5)

  // Arms swing opposite to legs
  const frontArmSwing = Math.round((1 - step) * pixel * 2.5)
  const backArmSwing = Math.round(step * pixel * 1.5)

  // Smooth horizontal motion
  const runBob = Math.sin(smoothPhase * 1.8) * pixel * (1.2 + safeMid * 1.5)
  const forwardDrift = Math.sin(smoothPhase * 0.5) * pixel * 0.8
  const hx = x + runBob + forwardDrift

  ctx.save()
  ctx.translate(hx, y + body * 0.5)
  ctx.rotate(leanAmount)
  ctx.translate(-hx, -(y + body * 0.5))

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)"
  ctx.fillRect(
    Math.round((x - body * 0.5) / pixel) * pixel,
    Math.round((y + body + pixel * 2) / pixel) * pixel,
    Math.round(body / pixel) * pixel,
    pixel * 3
  )

  // Hair/top
  const hairColor = samplePalette(0.1)
  ctx.fillStyle = `rgba(${hairColor[0]}, ${hairColor[1]}, ${hairColor[2]}, 0.9)`
  ctx.fillRect(
    Math.round((hx - head * 0.6) / pixel) * pixel,
    Math.round((y - pixel * 2) / pixel) * pixel,
    Math.round((head * 1.2) / pixel) * pixel,
    pixel * 3
  )

  // Face
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
  ctx.fillRect(Math.round((hx - head * 0.5) / pixel) * pixel, Math.round(y / pixel) * pixel, head, head)

  // Eyes
  ctx.fillStyle = `rgba(8, 10, 22, 0.95)`
  ctx.fillRect(
    Math.round((hx - head * 0.3) / pixel) * pixel,
    Math.round((y + pixel * 2) / pixel) * pixel,
    pixel * 2,
    pixel * 2
  )
  ctx.fillRect(
    Math.round((hx + head * 0.1) / pixel) * pixel,
    Math.round((y + pixel * 2) / pixel) * pixel,
    pixel * 2,
    pixel * 2
  )

  // Eye glow
  const eyeGlow = samplePalette(0.5)
  ctx.fillStyle = `rgba(${eyeGlow[0]}, ${eyeGlow[1]}, ${eyeGlow[2]}, ${0.4 + safeHigh * 0.4})`
  ctx.fillRect(
    Math.round((hx - head * 0.25) / pixel) * pixel,
    Math.round((y + pixel * 2.5) / pixel) * pixel,
    pixel,
    pixel
  )
  ctx.fillRect(
    Math.round((hx + head * 0.15) / pixel) * pixel,
    Math.round((y + pixel * 2.5) / pixel) * pixel,
    pixel,
    pixel
  )

  // Headphones
  ctx.fillStyle = `rgba(${hairColor[0]}, ${hairColor[1]}, ${hairColor[2]}, 0.95)`
  ctx.fillRect(
    Math.round((hx - head * 0.7) / pixel) * pixel,
    Math.round((y + pixel) / pixel) * pixel,
    pixel * 2,
    pixel * 4
  )
  ctx.fillRect(
    Math.round((hx + head * 0.5) / pixel) * pixel,
    Math.round((y + pixel) / pixel) * pixel,
    pixel * 2,
    pixel * 4
  )
  ctx.fillRect(
    Math.round((hx - head * 0.5) / pixel) * pixel,
    Math.round((y - pixel * 2) / pixel) * pixel,
    head,
    pixel
  )

  // Body
  const torsoTint = samplePalette((0.05 + safeBass * 0.15) % 1)
  ctx.fillStyle = `rgba(${torsoTint[0]}, ${torsoTint[1]}, ${torsoTint[2]}, 0.92)`
  ctx.fillRect(
    Math.round((hx - body * 0.5) / pixel) * pixel,
    Math.round((y + head) / pixel) * pixel,
    body,
    pixel * 5
  )

  // Body highlight
  ctx.fillStyle = `rgba(255, 255, 255, 0.15)`
  ctx.fillRect(
    Math.round((hx - body * 0.3) / pixel) * pixel,
    Math.round((y + head + pixel) / pixel) * pixel,
    pixel * 3,
    pixel * 2
  )

  // Arms
  const armColor = samplePalette(0.4)
  ctx.fillStyle = `rgba(${armColor[0]}, ${armColor[1]}, ${armColor[2]}, 0.8)`
  ctx.fillRect(
    Math.round((hx - body * 0.7) / pixel) * pixel,
    Math.round((y + head + pixel + backArmSwing) / pixel) * pixel,
    pixel * 2,
    pixel * 4
  )
  ctx.fillRect(
    Math.round((hx + body * 0.5) / pixel) * pixel,
    Math.round((y + head + pixel * 0.5 - frontArmSwing) / pixel) * pixel,
    pixel * 2,
    pixel * 4
  )

  // Legs
  ctx.fillStyle = `rgba(8, 10, 22, 0.95)`
  ctx.fillRect(
    Math.round((hx - pixel * 3) / pixel) * pixel,
    Math.round((y + head + pixel * 5 - backLegRetract * 0.3) / pixel) * pixel,
    pixel * 2,
    pixel * 5
  )
  ctx.fillRect(
    Math.round((hx + pixel) / pixel) * pixel,
    Math.round((y + head + pixel * 5 - frontLegExtend * 0.4) / pixel) * pixel,
    pixel * 2,
    pixel * 5
  )

  // Leg highlights
  ctx.fillStyle = `rgba(255, 255, 255, 0.18)`
  ctx.fillRect(
    Math.round((hx - pixel * 3) / pixel) * pixel,
    Math.round((y + head + pixel * 5 + backLegRetract) / pixel) * pixel,
    pixel * 2,
    pixel
  )
  ctx.fillRect(
    Math.round((hx + pixel) / pixel) * pixel,
    Math.round((y + head + pixel * 5 + frontLegExtend) / pixel) * pixel,
    pixel * 2,
    Math.max(pixel, pixel * (1 + step * 0.5))
  )

  ctx.restore()
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  pixel: number,
  safeHigh: number
): void {
  const [br, bg, bb] = samplePalette((enemy.tintIdx + safeHigh * 0.2) % 1)
  const core = mixRgb([br, bg, bb], [255, 255, 255], 0.18)
  const glowAlpha = 0.05 + safeHigh * 0.18

  const x = Math.round(enemy.x / pixel) * pixel
  const y = Math.round(enemy.y / pixel) * pixel
  const size = Math.max(pixel * 6, Math.round(enemy.size / pixel) * pixel)

  ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${glowAlpha * 0.25})`
  ctx.fillRect(x - pixel * 2, y - pixel * 2, size + pixel * 4, size + pixel * 4)

  ctx.fillStyle = `rgba(${core[0]}, ${core[1]}, ${core[2]}, 0.88)`
  if (enemy.kind === "slime") {
    ctx.fillRect(x, y, size, size)
    ctx.fillRect(x + pixel * 2, y - pixel * 2, size - pixel * 4, pixel * 2)
    ctx.fillStyle = `rgba(8, 10, 22, 0.9)`
    ctx.fillRect(x + pixel * 2, y + pixel * 3, pixel, pixel)
    ctx.fillRect(x + size - pixel * 3, y + pixel * 3, pixel, pixel)
  } else {
    // bat
    const wing = Math.max(pixel * 4, Math.round((size * 0.55) / pixel) * pixel)
    const flap = Math.sin(enemy.phase + enemy.age * 8.5) * 0.5 + 0.5
    const wingLift = Math.round(flap * pixel * 2)
    ctx.fillRect(x + pixel * 2, y + pixel * 2, size - pixel * 4, size - pixel * 4)
    ctx.fillRect(x - wing, y + wingLift, wing, pixel * 2)
    ctx.fillRect(x + size, y + (pixel * 2 - wingLift), wing, pixel * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.14 + safeHigh * 0.25})`
    ctx.fillRect(x + pixel * 3, y + pixel * 3, pixel, pixel)
    ctx.fillRect(x + size - pixel * 4, y + pixel * 3, pixel, pixel)
  }
}

export function drawCoin(
  ctx: CanvasRenderingContext2D,
  coin: Coin,
  pixel: number,
  time: number,
  safeHigh: number
): void {
  const x = Math.round(coin.x / pixel) * pixel
  const y = Math.round(coin.y / pixel) * pixel
  const size = Math.max(pixel * 4, Math.round(coin.size / pixel) * pixel)

  const shimmer = Math.sin(time * (6.5 + safeHigh * 5.5) + coin.phase) * 0.5 + 0.5
  const [r, g, b] = samplePalette((coin.tintIdx + time * 0.08 + safeHigh * 0.25) % 1)
  const alpha = 0.12 + shimmer * (0.28 + safeHigh * 0.35)

  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.22})`
  ctx.fillRect(x - pixel * 2, y - pixel * 2, size + pixel * 4, size + pixel * 4)

  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
  ctx.fillRect(x, y, size, size)

  ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + shimmer * 0.3})`
  ctx.fillRect(x + pixel, y + pixel, pixel, pixel)
  if (shimmer > 0.86) {
    ctx.fillRect(x + size - pixel * 2, y + pixel, pixel, pixel)
  }
}

export function drawSlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  slash: Slash,
  pixel: number
): void {
  const p = slash.duration > 0 ? slash.age / slash.duration : 1
  if (p >= 1) return

  const strength = slash.power
  const alpha = (1 - p) * (0.12 + strength * 0.25)
  const len = Math.max(pixel * 10, Math.round((pixel * 18 + strength * pixel * 14) / pixel) * pixel)
  const thickness = pixel * 2
  const tilt = -0.55

  const sx = Math.round((x + pixel * 8) / pixel) * pixel
  const sy = Math.round((y + pixel * 10) / pixel) * pixel

  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  ctx.translate(sx, sy)
  ctx.rotate(tilt)
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
  ctx.fillRect(0, 0, len, thickness)
  ctx.fillStyle = `rgba(217, 70, 239, ${alpha * 0.55})`
  ctx.fillRect(pixel, pixel, len - pixel * 2, thickness)
  ctx.restore()
  ctx.globalCompositeOperation = "source-over"
}

export function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  p: PowerUp,
  pixel: number,
  time: number
): void {
  const x = Math.round(p.x / pixel) * pixel
  const y = Math.round(p.y / pixel) * pixel
  const size = pixel * 8
  const bob = Math.sin(time * 4 + p.phase) * pixel * 2

  ctx.save()
  ctx.translate(x, y + bob)

  const [r, g, b] = samplePalette(p.tintIdx + time * 0.5)
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"
  ctx.lineWidth = pixel

  if (p.type === "heart") {
    // Pixel heart shape
    ctx.fillStyle = "#ef4444" // Red
    ctx.fillRect(pixel, pixel, pixel * 2, pixel * 2)
    ctx.fillRect(pixel * 5, pixel, pixel * 2, pixel * 2)
    ctx.fillRect(0, pixel * 3, pixel * 8, pixel * 2)
    ctx.fillRect(pixel, pixel * 5, pixel * 6, pixel)
    ctx.fillRect(pixel * 2, pixel * 6, pixel * 4, pixel)
    ctx.fillRect(pixel * 3, pixel * 7, pixel * 2, pixel)
  } else {
    // Star
    ctx.fillStyle = "#eab308" // Yellow
    ctx.fillRect(pixel * 3, 0, pixel * 2, pixel * 8)
    ctx.fillRect(0, pixel * 3, pixel * 8, pixel * 2)
    ctx.fillStyle = "#fef08a"
    ctx.fillRect(pixel * 3, pixel * 3, pixel * 2, pixel * 2)
  }

  // Glow
  ctx.shadowBlur = 10
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`
  ctx.strokeRect(0, 0, size, size)
  ctx.shadowBlur = 0

  ctx.restore()
}
