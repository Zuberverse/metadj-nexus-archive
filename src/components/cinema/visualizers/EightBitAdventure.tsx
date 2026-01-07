"use client"

import { useEffect, useRef } from "react"
import { VISUALIZER_COLORS } from "@/lib/color/visualizer-palette"

interface EightBitAdventureProps {
  active?: boolean
  bassLevel: number
  midLevel: number
  highLevel: number
  /** Stable seed for track-scoped visual variation. */
  seed?: number
  performanceMode?: boolean
}

type EnemyKind = "slime" | "bat"

type IntensityMode = "focus" | "standard" | "hype"

interface Star {
  x: number
  y: number
  size: number
  baseAlpha: number
  twinkleSpeed: number
  phase: number
  tintIdx: number
}

interface Cloud {
  x: number
  y: number
  baseY: number
  w: number
  h: number
  speed: number
  phase: number
  tintIdx: number
}

interface Prop {
  x: number
  y: number
  size: number
  parallax: number
  kind: "tree" | "sign" | "tower" | "lantern" | "crystal" | "shrine"
  tintIdx: number
  phase: number
  bobSpeed: number
  bobAmount: number
}

interface Coin {
  x: number
  y: number
  baseY: number
  size: number
  phase: number
  tintIdx: number
  age: number
}

interface Enemy {
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

interface PowerUp {
  x: number
  y: number
  baseY: number
  type: "heart" | "star"
  phase: number
  tintIdx: number
}

interface Particle {
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

interface Slash {
  age: number
  duration: number
  power: number
}

interface Hero {
  y: number
  vy: number
  onGround: boolean
  runPhase: number
}

interface PowerUp {
  x: number
  y: number
  phase: number
  tintIdx: number
  type: "heart" | "star"
}

function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace("#", "")
  const bigint = parseInt(sanitized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return [r, g, b]
}

const PALETTE_RGB = [
  hexToRgb(VISUALIZER_COLORS.purple),
  hexToRgb(VISUALIZER_COLORS.cyan),
  hexToRgb(VISUALIZER_COLORS.magenta),
  hexToRgb(VISUALIZER_COLORS.indigo),
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function samplePalette(t: number): [number, number, number] {
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

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))]
}

function createStars(width: number, height: number, count: number, random: () => number): Star[] {
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

function createClouds(width: number, height: number, count: number, random: () => number): Cloud[] {
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

function createProps(width: number, height: number, count: number, random: () => number): Prop[] {
  const props: Prop[] = []
  const groundY = height * 0.78
  for (let i = 0; i < count; i++) {
    const kindRoll = random()
    const kind: Prop["kind"] = kindRoll < 0.35 ? "tree" 
      : kindRoll < 0.50 ? "sign" 
      : kindRoll < 0.65 ? "tower"
      : kindRoll < 0.78 ? "lantern"
      : kindRoll < 0.90 ? "crystal"
      : "shrine"
    const size = kind === "tower" ? 18 + random() * 20 
      : kind === "lantern" ? 10 + random() * 8
      : kind === "crystal" ? 12 + random() * 10
      : kind === "shrine" ? 16 + random() * 12
      : 14 + random() * 18
    const parallax = kind === "tower" ? 0.35 
      : kind === "shrine" ? 0.4
      : kind === "tree" ? 0.55 
      : kind === "crystal" ? 0.6
      : kind === "lantern" ? 0.65
      : 0.7
    const bobSpeed = kind === "lantern" ? 2.5 + random() * 1.5
      : kind === "crystal" ? 1.8 + random() * 1.2
      : 0.8 + random() * 0.6
    const bobAmount = kind === "lantern" ? 3 + random() * 2
      : kind === "crystal" ? 2 + random() * 1.5
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

type AdventureBackground = {
  sky: CanvasGradient | null
  glow: CanvasGradient | null
  vignette: CanvasGradient | null
}

function drawPixelDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  pixel: number,
  fillStyle: string
) {
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

function drawTree(ctx: CanvasRenderingContext2D, x: number, groundY: number, size: number, pixel: number, tint: [number, number, number]) {
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
  ctx.fillRect(leafX + pixel * 2, leafY + pixel * 2, Math.max(pixel, Math.round(leafW * 0.3)), Math.max(pixel, Math.round(leafH * 0.25)))
}

function drawTower(ctx: CanvasRenderingContext2D, x: number, groundY: number, size: number, pixel: number, tint: [number, number, number], glow: number) {
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

function drawSign(ctx: CanvasRenderingContext2D, x: number, groundY: number, size: number, pixel: number, tint: [number, number, number], pulse: number) {
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
  const ay = signY + Math.round(signH * 0.5 / pixel) * pixel
  ctx.fillRect(ax, ay, pixel * 4, pixel)
  ctx.fillRect(ax + pixel * 4, ay - pixel, pixel, pixel)
  ctx.fillRect(ax + pixel * 4, ay + pixel, pixel, pixel)
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, groundY: number, size: number, pixel: number, tint: [number, number, number], time: number, safeHigh: number) {
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
  ctx.fillRect(lanternX - pixel * 3, lanternY - pixel * 3, lanternSize + pixel * 6, lanternSize + pixel * 6)

  // Lantern body
  ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${0.7 + glowPulse * 0.2})`
  ctx.fillRect(lanternX, lanternY, lanternSize, lanternSize)

  // Lantern inner light
  ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + glowPulse * 0.4})`
  ctx.fillRect(lanternX + pixel, lanternY + pixel, lanternSize - pixel * 2, lanternSize - pixel * 2)
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, groundY: number, size: number, pixel: number, tint: [number, number, number], time: number, safeMid: number, safeHigh: number) {
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

function drawShrine(ctx: CanvasRenderingContext2D, x: number, groundY: number, size: number, pixel: number, tint: [number, number, number], time: number, safeBass: number) {
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

function drawHero(
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
) {
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
  
  // Asymmetric leg movement - front leg extends more than back leg retracts
  const frontLegExtend = Math.round(step * pixel * 4) // Front leg pushes forward more
  const backLegRetract = Math.round((1 - step) * pixel * 2.5) // Back leg trails
  
  // Arms swing opposite to legs with forward bias
  const frontArmSwing = Math.round((1 - step) * pixel * 2.5)
  const backArmSwing = Math.round(step * pixel * 1.5)
  
  // Smooth horizontal motion - subtle forward drift to imply walking right
  const runBob = Math.sin(smoothPhase * 1.8) * pixel * (1.2 + safeMid * 1.5)
  const forwardDrift = Math.sin(smoothPhase * 0.5) * pixel * 0.8 // Gentle rightward sway
  const hx = x + runBob + forwardDrift // Bobbed x with forward bias
  
  ctx.save()
  // Apply forward lean rotation around hero center
  ctx.translate(hx, y + body * 0.5)
  ctx.rotate(leanAmount)
  ctx.translate(-hx, -(y + body * 0.5))

  // Shadow (larger, softer) - stays at base x for grounding effect
  ctx.fillStyle = "rgba(0,0,0,0.3)"
  ctx.fillRect(Math.round((x - body * 0.5) / pixel) * pixel, Math.round((y + body + pixel * 2) / pixel) * pixel, Math.round(body / pixel) * pixel, pixel * 3)

  // MetaDJ-style Head (larger, more distinctive)
  // Hair/top - purple gradient
  const hairColor = samplePalette(0.1) // Purple
  ctx.fillStyle = `rgba(${hairColor[0]}, ${hairColor[1]}, ${hairColor[2]}, 0.9)`
  ctx.fillRect(Math.round((hx - head * 0.6) / pixel) * pixel, Math.round((y - pixel * 2) / pixel) * pixel, Math.round(head * 1.2 / pixel) * pixel, pixel * 3)

  // Face
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
  ctx.fillRect(Math.round((hx - head * 0.5) / pixel) * pixel, Math.round(y / pixel) * pixel, head, head)

  // Eyes (larger, more expressive)
  ctx.fillStyle = `rgba(8, 10, 22, 0.95)`
  ctx.fillRect(Math.round((hx - head * 0.3) / pixel) * pixel, Math.round((y + pixel * 2) / pixel) * pixel, pixel * 2, pixel * 2)
  ctx.fillRect(Math.round((hx + head * 0.1) / pixel) * pixel, Math.round((y + pixel * 2) / pixel) * pixel, pixel * 2, pixel * 2)

  // Eye glow (cyan highlights)
  const eyeGlow = samplePalette(0.5) // Cyan
  ctx.fillStyle = `rgba(${eyeGlow[0]}, ${eyeGlow[1]}, ${eyeGlow[2]}, ${0.4 + safeHigh * 0.4})`
  ctx.fillRect(Math.round((hx - head * 0.25) / pixel) * pixel, Math.round((y + pixel * 2.5) / pixel) * pixel, pixel, pixel)
  ctx.fillRect(Math.round((hx + head * 0.15) / pixel) * pixel, Math.round((y + pixel * 2.5) / pixel) * pixel, pixel, pixel)

  // Headphones (MetaDJ signature) - purple
  ctx.fillStyle = `rgba(${hairColor[0]}, ${hairColor[1]}, ${hairColor[2]}, 0.95)`
  ctx.fillRect(Math.round((hx - head * 0.7) / pixel) * pixel, Math.round((y + pixel) / pixel) * pixel, pixel * 2, pixel * 4)
  ctx.fillRect(Math.round((hx + head * 0.5) / pixel) * pixel, Math.round((y + pixel) / pixel) * pixel, pixel * 2, pixel * 4)
  // Headphone band
  ctx.fillRect(Math.round((hx - head * 0.5) / pixel) * pixel, Math.round((y - pixel * 2) / pixel) * pixel, head, pixel)

  // Body - Purple/Magenta gradient (MetaDJ colors)
  const torsoTint = samplePalette((0.05 + safeBass * 0.15) % 1) // Purple-magenta
  ctx.fillStyle = `rgba(${torsoTint[0]}, ${torsoTint[1]}, ${torsoTint[2]}, 0.92)`
  ctx.fillRect(Math.round((hx - body * 0.5) / pixel) * pixel, Math.round((y + head) / pixel) * pixel, body, pixel * 5)

  // Body highlight
  ctx.fillStyle = `rgba(255, 255, 255, 0.15)`
  ctx.fillRect(Math.round((hx - body * 0.3) / pixel) * pixel, Math.round((y + head + pixel) / pixel) * pixel, pixel * 3, pixel * 2)

  // Arms (with glow effect) - asymmetric swing for rightward walking feel
  // Back arm (left) swings back more, front arm (right) swings forward more
  const armColor = samplePalette(0.4)
  ctx.fillStyle = `rgba(${armColor[0]}, ${armColor[1]}, ${armColor[2]}, 0.8)`
  ctx.fillRect(Math.round((hx - body * 0.7) / pixel) * pixel, Math.round((y + head + pixel + backArmSwing) / pixel) * pixel, pixel * 2, pixel * 4)
  ctx.fillRect(Math.round((hx + body * 0.5) / pixel) * pixel, Math.round((y + head + pixel * 0.5 - frontArmSwing) / pixel) * pixel, pixel * 2, pixel * 4)

  // Legs - asymmetric movement for walking feel
  // Front leg (right) extends more, back leg (left) trails
  ctx.fillStyle = `rgba(8, 10, 22, 0.95)`
  ctx.fillRect(Math.round((hx - pixel * 3) / pixel) * pixel, Math.round((y + head + pixel * 5 - backLegRetract * 0.3) / pixel) * pixel, pixel * 2, pixel * 5)
  ctx.fillRect(Math.round((hx + pixel) / pixel) * pixel, Math.round((y + head + pixel * 5 - frontLegExtend * 0.4) / pixel) * pixel, pixel * 2, pixel * 5)

  // Leg highlights (animated) - front leg gets longer highlight when extended
  ctx.fillStyle = `rgba(255, 255, 255, 0.18)`
  ctx.fillRect(Math.round((hx - pixel * 3) / pixel) * pixel, Math.round((y + head + pixel * 5 + backLegRetract) / pixel) * pixel, pixel * 2, pixel)
  ctx.fillRect(Math.round((hx + pixel) / pixel) * pixel, Math.round((y + head + pixel * 5 + frontLegExtend) / pixel) * pixel, pixel * 2, Math.max(pixel, pixel * (1 + step * 0.5)))
  
  ctx.restore() // Restore from forward lean transform
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, pixel: number, safeHigh: number) {
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
    const wing = Math.max(pixel * 4, Math.round(size * 0.55 / pixel) * pixel)
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

function drawCoin(ctx: CanvasRenderingContext2D, coin: Coin, pixel: number, time: number, safeHigh: number) {
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

function drawSlash(ctx: CanvasRenderingContext2D, x: number, y: number, slash: Slash, pixel: number) {
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

function drawPowerUp(ctx: CanvasRenderingContext2D, p: PowerUp, pixel: number, time: number) {
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
    ctx.fillRect(0, 0, size, size) // Placeholder, could be better shape
    // Better 8-bit heart
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

function spawnDustBurst(particles: Particle[], x: number, y: number, count: number, random: () => number, tintBase: number) {
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

function spawnSparkBurst(particles: Particle[], x: number, y: number, count: number, random: () => number, tintBase: number) {
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

function drawEightBitAdventure(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  delta: number,
  bass: number,
  mid: number,
  high: number,
  intensityMode: IntensityMode,
  intensityBoost: number,
  dropPulse: number,
  hero: Hero,
  scrollRef: { current: number },
  stars: Star[],
  clouds: Cloud[],
  props: Prop[],
  coins: Coin[],
  enemies: Enemy[],
  powerUps: PowerUp[],
  slashes: Slash[],
  particles: Particle[],
  lastBassRef: { current: number },
  lastHighRef: { current: number },
  lastJumpAtRef: { current: number },
  lastSlashAtRef: { current: number },
  lastSpawnAtRef: { current: number },
  background: AdventureBackground | null,
  rng: () => number,
  performanceMode: boolean
) {
  const safeBass = clamp01(bass)
  const safeMid = clamp01(mid)
  const safeHigh = clamp01(high)

  const pixel = performanceMode ? 3 : 2
  const snap = (v: number) => Math.round(v / pixel) * pixel

  const horizonY = height * 0.50
  const groundY = height * 0.78

  const worldBoost = intensityMode === "focus" ? 0.9 : intensityMode === "hype" ? 1.08 : 1
  const speed = (95 + safeMid * 135 + safeBass * 95) * (performanceMode ? 0.9 : 1) * worldBoost
  scrollRef.current += speed * delta

  // Beat-like bass jump: one clear action per bass rise.
  const lastHitBass = lastBassRef.current
  const hitBass = clamp01(safeBass + dropPulse * 0.22)
  lastBassRef.current = hitBass
  const bassRise = hitBass - lastHitBass
  // Hero is centered horizontally, on the ground
  const heroSpawnX = width * 0.5
  const heroSpawnY = groundY // Ground level for particle spawns
  
  const jumpThreshold =
    intensityMode === "focus" ? 0.68 + safeMid * 0.12
      : intensityMode === "hype" ? 0.54 + safeMid * 0.08
        : 0.6 + safeMid * 0.1
  const jumpRise = intensityMode === "focus" ? 0.075 : intensityMode === "hype" ? 0.055 : 0.065
  const jumpCooldown = intensityMode === "focus" ? 0.38 : intensityMode === "hype" ? 0.26 : 0.3
  if (hero.onGround && hitBass > jumpThreshold && bassRise > jumpRise && time - lastJumpAtRef.current > jumpCooldown) {
    lastJumpAtRef.current = time
    // Variable jump height based on bass intensity
    const jumpPower = (320 + hitBass * 360 + safeMid * 80) * (0.92 + intensityBoost * 0.08)
    hero.vy = -jumpPower
    hero.onGround = false
    const dustCount = performanceMode ? (intensityMode === "hype" ? 10 : 8) : intensityMode === "focus" ? 12 : 14
    spawnDustBurst(particles, heroSpawnX, heroSpawnY, dustCount, rng, (time * 0.06 + safeHigh * 0.2) % 1)
  }

  // High-peek sword slash: clears the lane (purely visual).
  const lastHigh = lastHighRef.current
  lastHighRef.current = safeHigh
  const allowSlash = !performanceMode || intensityMode === "hype"
  const slashThreshold = intensityMode === "hype" ? 0.72 : intensityMode === "focus" ? 0.82 : 0.78
  const slashCooldown = intensityMode === "focus" ? 0.85 : performanceMode ? 0.75 : 0.55
  if (allowSlash && safeHigh > slashThreshold && safeHigh - lastHigh > 0.08 && time - lastSlashAtRef.current > slashCooldown) {
    lastSlashAtRef.current = time
    slashes.push({ age: 0, duration: 0.22 + safeHigh * 0.12, power: safeHigh })
    const limit = performanceMode ? 2 : 3
    if (slashes.length > limit) slashes.splice(0, slashes.length - limit)
    // Sparks from the centered hero position
    spawnSparkBurst(particles, heroSpawnX + pixel * 18, heroSpawnY - pixel * 10, performanceMode ? 8 : 10, rng, (0.5 + time * 0.05) % 1)
  }

  // Spawn coins and enemies (rate-limited; scroll-world).
  const spawnInterval =
    (performanceMode ? 0.6 : 0.45) *
    (intensityMode === "focus" ? 1.25 : intensityMode === "hype" ? 0.85 : 1)
  if (time - lastSpawnAtRef.current > spawnInterval) {
    lastSpawnAtRef.current = time

    const coinCap = Math.max(6, Math.round((performanceMode ? 14 : 22) * (intensityMode === "focus" ? 0.85 : intensityMode === "hype" ? 1.1 : 1)))
    const coinChance = Math.min(0.88, 0.7 * (intensityMode === "focus" ? 0.75 : intensityMode === "hype" ? 1.1 : 1))
    if (coins.length < coinCap && rng() < coinChance) {
      const size = (rng() < 0.85 ? 6 : 8) * pixel
      const baseY = groundY - (14 + rng() * 44)
      coins.push({
        x: width + rng() * width * 0.25,
        y: baseY,
        baseY,
        size,
        phase: rng() * Math.PI * 2,
        tintIdx: rng(),
        age: 0,
      })
    }

    const enemyCap = Math.max(1, Math.round((performanceMode ? 3 : 6) * (intensityMode === "focus" ? 0.6 : intensityMode === "hype" ? 1.2 : 1)))
    const enemyChance = (0.26 + safeMid * 0.24) * (intensityMode === "focus" ? 0.55 : intensityMode === "hype" ? 1.25 : 1)
    if (enemies.length < enemyCap && rng() < enemyChance) {
      const kind: EnemyKind = rng() < 0.6 ? "slime" : "bat"
      const size = (kind === "slime" ? 16 : 14) * pixel * (0.8 + rng() * 0.45)
      const baseY = kind === "slime" ? groundY - size : groundY - size * (2.2 + rng() * 1.2)
      enemies.push({
        x: width + rng() * width * 0.35,
        y: baseY,
        baseY,
        vx: -(40 + rng() * 65),
        kind,
        size,
        phase: rng() * Math.PI * 2,
        tintIdx: rng(),
        age: 0,
      })
    }

    if (powerUps.length < 2 && rng() < 0.05) {
      powerUps.push({
        x: width + rng() * width * 0.5,
        y: groundY - pixel * 30,
        baseY: groundY - pixel * 30,
        type: rng() < 0.5 ? "heart" : "star",
        phase: rng() * Math.PI * 2,
        tintIdx: rng(),
      })
    }
  }

  const particleLimit = performanceMode ? 160 : 280
  if (particles.length > particleLimit) {
    particles.splice(0, particles.length - particleLimit)
  }

  // Physics: hero gravity.
  const heroSize = pixel * 16
  const groundTop = groundY - heroSize
  if (!hero.onGround) {
    hero.vy += 980 * delta
    hero.y += hero.vy * delta
    if (hero.y >= groundTop) {
      hero.y = groundTop
      hero.vy = 0
      hero.onGround = true
      spawnDustBurst(particles, heroSpawnX, heroSpawnY, performanceMode ? 5 : 9, rng, (time * 0.08 + safeBass * 0.2) % 1)
    }
  } else {
    hero.y = groundTop
  }
  // More dynamic run animation - faster when music is intense
  hero.runPhase += delta * (8.5 + safeMid * 6.5 + safeBass * 3.5)

  // Clear background.
  ctx.globalCompositeOperation = "source-over"
  ctx.fillStyle = "rgb(4, 6, 18)"
  ctx.fillRect(0, 0, width, height)

  if (background?.sky) {
    ctx.fillStyle = background.sky
    ctx.fillRect(0, 0, width, height)
  }
  if (!performanceMode && background?.glow) {
    ctx.fillStyle = background.glow
    ctx.fillRect(0, 0, width, height)
  }

  const shakeBass = clamp01(safeBass + dropPulse * 0.25)
  const shakeMode = intensityMode === "focus" ? 0.6 : intensityMode === "hype" ? 1.1 : 1
  const shake = Math.pow(shakeBass, performanceMode ? 2.6 : 2.3) * (performanceMode ? 3 : 5) * shakeMode
  const shakeX = Math.sin(time * (32 + safeBass * 18)) * shake
  const shakeY = Math.cos(time * (26 + safeBass * 14)) * shake * 0.55

  ctx.save()
  ctx.translate(shakeX, shakeY)

  // Stars
  ctx.globalCompositeOperation = "lighter"
  const sparkleBoost = (0.75 + safeHigh * 0.65) * (0.86 + intensityBoost * 0.14)
  for (const star of stars) {
    const twinkle = Math.sin(time * star.twinkleSpeed + star.phase) * 0.5 + 0.5
    const alpha = star.baseAlpha * (0.25 + twinkle * 0.9) * sparkleBoost
    if (alpha <= 0.004) continue
    const tinted = mixRgb(samplePalette(star.tintIdx), [255, 255, 255], 0.62)
    ctx.fillStyle = `rgba(${tinted[0]}, ${tinted[1]}, ${tinted[2]}, ${alpha})`
    ctx.fillRect(snap(star.x), snap(star.y), Math.max(pixel, star.size), Math.max(pixel, star.size))
  }
  ctx.globalCompositeOperation = "source-over"

  // Pixel moon (breathes with bass) - upper area, lowered to not cut off
  const moonR = Math.min(width, height) * 0.085 * (1 + safeBass * 0.08 + dropPulse * 0.06)
  const moonX = width * 0.5
  const moonY = height * 0.20 + Math.sin(time * 0.35) * height * 0.01
  drawPixelDisc(ctx, moonX, moonY, moonR, pixel, "rgba(255, 255, 255, 0.25)")
  drawPixelDisc(ctx, moonX, moonY, moonR * 0.72, pixel, "rgba(255, 255, 255, 0.45)")
  drawPixelDisc(ctx, moonX + pixel * 3, moonY - pixel * 2, moonR * 0.22, pixel, "rgba(8, 10, 22, 0.55)")

  // Mountains (8-bit steps).
  const stepW = pixel * 6
  const amp = height * (0.055 + safeMid * 0.045)
  const base = horizonY + height * 0.03

  for (let layer = 0; layer < 2; layer++) {
    const parallax = layer === 0 ? 0.12 : 0.22
    const tint = samplePalette((0.68 + layer * 0.18 + time * 0.02) % 1)
    const alpha = layer === 0 ? 0.26 : 0.38
    ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${alpha})`

    const wave = (layer === 0 ? 0.0065 : 0.0095) + safeHigh * 0.004
    const local = scrollRef.current * parallax
    for (let x = -stepW; x <= width + stepW; x += stepW) {
      const nx = (x + local) * wave
      const h =
        Math.sin(nx * 1.9 + layer * 3.2) * amp +
        Math.cos(nx * 0.9 + layer * 1.7) * amp * 0.55 +
        Math.sin(nx * 3.4 + time * 0.35) * amp * 0.25
      const y = snap(base - layer * amp * 0.6 - h)
      ctx.fillRect(snap(x), y, stepW, horizonY - y + pixel * 2)
    }
  }

  // Clouds (parallax).
  ctx.globalCompositeOperation = "lighter"
  const cloudSpeed = (0.55 + safeMid * 0.9) * (performanceMode ? 0.9 : 1)
  for (const cloud of clouds) {
    cloud.x -= cloud.speed * delta * cloudSpeed
    const bob = Math.sin(time * 0.55 + cloud.phase) * (performanceMode ? 4 : 6 + safeMid * 4)
    cloud.y = cloud.baseY + bob

    const margin = cloud.w * 1.4
    if (cloud.x < -margin) {
      cloud.x = width + margin
      cloud.baseY = height * (0.08 + rng() * 0.3)
      cloud.y = cloud.baseY
      cloud.tintIdx = rng()
    }

    const [cr, cg, cb] = samplePalette((cloud.tintIdx + time * 0.05 + safeHigh * 0.12) % 1)
    const alpha = 0.03 + safeHigh * 0.06
    const cx = snap(cloud.x)
    const cy = snap(cloud.y)
    const w = Math.max(pixel * 8, snap(cloud.w))
    const h = Math.max(pixel * 3, snap(cloud.h))
    ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`
    ctx.fillRect(cx, cy, w, h)
    ctx.fillRect(cx + pixel * 4, cy - pixel * 2, w - pixel * 8, h)
    ctx.fillRect(cx + pixel * 8, cy + pixel * 2, w - pixel * 16, h - pixel * 2)
  }
  ctx.globalCompositeOperation = "source-over"

  // Ground.
  ctx.fillStyle = "rgb(6, 7, 20)"
  ctx.fillRect(0, snap(groundY), width, height - groundY)

  // Road band (audio-reactive hue).
  const roadY = snap(groundY + pixel * 3)
  const roadH = Math.max(pixel * 12, snap((height - groundY) * 0.55))
  const [rr, rg, rb] = samplePalette((0.14 + time * 0.05 + safeMid * 0.2) % 1)
  ctx.fillStyle = `rgba(${rr}, ${rg}, ${rb}, ${0.12 + safeBass * 0.2})`
  ctx.fillRect(0, roadY, width, roadH)

  // Road stripes.
  const stripeW = pixel * 6
  const stripeH = pixel * 2
  const stripeY = roadY + Math.round(roadH * 0.45 / pixel) * pixel
  const stripeOffset = (scrollRef.current * 0.45) % (stripeW * 3)
  ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + safeHigh * 0.2})`
  for (let x = -stripeW * 3; x < width + stripeW * 3; x += stripeW * 3) {
    const sx = snap(x - stripeOffset)
    ctx.fillRect(sx, stripeY, stripeW, stripeH)
  }

  // Foreground props (trees/signs/towers/lanterns/crystals/shrines) with smooth animation.
  ctx.globalCompositeOperation = "lighter"
  for (const prop of props) {
    prop.x -= speed * delta * prop.parallax
    const margin = prop.size * 6
    if (prop.x < -margin) {
      prop.x = width + margin + rng() * width * 0.4
      const kindRoll = rng()
      prop.kind = kindRoll < 0.35 ? "tree" 
        : kindRoll < 0.50 ? "sign" 
        : kindRoll < 0.65 ? "tower"
        : kindRoll < 0.78 ? "lantern"
        : kindRoll < 0.90 ? "crystal"
        : "shrine"
      prop.size = prop.kind === "tower" ? 18 + rng() * 20 
        : prop.kind === "lantern" ? 10 + rng() * 8
        : prop.kind === "crystal" ? 12 + rng() * 10
        : prop.kind === "shrine" ? 16 + rng() * 12
        : 14 + rng() * 18
      prop.parallax = prop.kind === "tower" ? 0.35 
        : prop.kind === "shrine" ? 0.4
        : prop.kind === "tree" ? 0.55 
        : prop.kind === "crystal" ? 0.6
        : prop.kind === "lantern" ? 0.65
        : 0.7
      prop.bobSpeed = prop.kind === "lantern" ? 2.5 + rng() * 1.5
        : prop.kind === "crystal" ? 1.8 + rng() * 1.2
        : 0.8 + rng() * 0.6
      prop.bobAmount = prop.kind === "lantern" ? 3 + rng() * 2
        : prop.kind === "crystal" ? 2 + rng() * 1.5
        : 0.5 + rng() * 0.5
      prop.tintIdx = rng()
      prop.phase = rng() * Math.PI * 2
    }

    // Smooth bobbing animation for all props
    const bob = Math.sin(time * prop.bobSpeed + prop.phase) * prop.bobAmount * pixel
    const px = snap(prop.x)
    const tint = samplePalette((prop.tintIdx + time * 0.04 + safeHigh * 0.14) % 1)
    
    if (prop.kind === "tree") {
      drawTree(ctx, px, groundY, prop.size, pixel, tint)
    } else if (prop.kind === "tower") {
      drawTower(ctx, px, groundY, prop.size, pixel, tint, safeMid)
    } else if (prop.kind === "sign") {
      const pulse = Math.sin(time * (2.6 + safeHigh * 2.2) + prop.phase) * 0.5 + 0.5
      drawSign(ctx, px, groundY, prop.size, pixel, tint, pulse)
    } else if (prop.kind === "lantern") {
      drawLantern(ctx, px, groundY + bob, prop.size, pixel, tint, time, safeHigh)
    } else if (prop.kind === "crystal") {
      drawCrystal(ctx, px, groundY + bob, prop.size, pixel, tint, time, safeMid, safeHigh)
    } else if (prop.kind === "shrine") {
      drawShrine(ctx, px, groundY, prop.size, pixel, tint, time, safeBass)
    }
  }
  ctx.globalCompositeOperation = "source-over"

  // Coins
  ctx.globalCompositeOperation = "lighter"
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i]
    coin.age += delta
    coin.x -= speed * delta * 1.05
    coin.y = coin.baseY + Math.sin(time * (2.2 + safeMid * 1.2) + coin.phase) * (performanceMode ? 5 : 7 + safeHigh * 4)

    if (coin.x < -coin.size * 3) {
      coins.splice(i, 1)
      continue
    }

    // Collect when coin crosses center of screen (visual reward)
    const collectX = width * 0.5
    const dx = coin.x - collectX
    if (dx < pixel * 10 && dx > -pixel * 6) {
      coins.splice(i, 1)
      spawnSparkBurst(particles, heroSpawnX, heroSpawnY, performanceMode ? 6 : 10, rng, (coin.tintIdx + time * 0.1) % 1)
      continue
    }

    drawCoin(ctx, coin, pixel, time, safeHigh)
  }
  ctx.globalCompositeOperation = "source-over"

  // Enemies
  ctx.globalCompositeOperation = "lighter"
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i]
    enemy.age += delta
    enemy.x += (enemy.vx - speed) * delta * 1.0
    if (enemy.kind === "bat") {
      enemy.y =
        enemy.baseY +
        Math.sin(enemy.phase + time * (2.1 + safeMid * 2.0)) * (performanceMode ? 10 : 14 + safeHigh * 10)
    }

    // Simple collision check with slash -> defeat enemy
    for (const slash of slashes) {
      // ... (simplified logic: if slash is active and enemy is close, remove enemy?)
      // For visualizer we just let them pass or hero jumps over.
    }

    if (enemy.x < -enemy.size * 4) {
      enemies.splice(i, 1)
      continue
    }

    // Slash clears enemies when they cross center (visual payoff)
    if (slashes.length > 0) {
      const slashX = width * 0.5
      const dx = enemy.x - slashX
      if (Math.abs(dx) < enemy.size * 2) {
        enemies.splice(i, 1)
        spawnSparkBurst(particles, enemy.x, enemy.y, performanceMode ? 8 : 14, rng, (enemy.tintIdx + time * 0.06) % 1)
        continue
      }
    }

    drawEnemy(ctx, enemy, pixel, safeHigh)
  }

  // Draw Powerups
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i]
    p.x -= speed * delta
    if (p.x < -pixel * 20) {
      powerUps.splice(i, 1)
      continue
    }
    drawPowerUp(ctx, p, pixel, time)
  }

  ctx.globalCompositeOperation = "source-over"

  // Hero + slashes - centered horizontally, on the ground
  const heroX = width * 0.5
  const heroY = hero.y // Use physics-based position (on ground)
  const isJumping = !hero.onGround
  drawHero(ctx, heroX, heroY, pixel, hero.runPhase, safeBass, safeMid, safeHigh, time, isJumping)

  for (let i = slashes.length - 1; i >= 0; i--) {
    const slash = slashes[i]
    slash.age += delta
    if (slash.age >= slash.duration) {
      slashes.splice(i, 1)
      continue
    }
    drawSlash(ctx, heroX, heroY, slash, pixel)
  }

  // Particles
  ctx.globalCompositeOperation = "lighter"
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.age += delta
    const t = p.duration > 0 ? p.age / p.duration : 1
    if (t >= 1) {
      particles.splice(i, 1)
      continue
    }

    p.x += p.vx * delta
    p.y += p.vy * delta
    p.vy += (p.kind === "dust" ? 260 : 0) * delta

    const fade = (1 - t) * (p.kind === "dust" ? 0.22 : 0.35)
    const [pr, pg, pb] = samplePalette((p.tintIdx + time * 0.08) % 1)
    const size = Math.max(pixel, Math.round(p.size / pixel) * pixel)

    ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${fade})`
    ctx.fillRect(snap(p.x), snap(p.y), size, size)

    if (!performanceMode && p.kind === "spark" && t < 0.35) {
      ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.65})`
      ctx.fillRect(snap(p.x + pixel), snap(p.y), pixel, pixel)
    }
  }
  ctx.globalCompositeOperation = "source-over"

  ctx.restore()

  if (!performanceMode && background?.vignette) {
    ctx.fillStyle = background.vignette
    ctx.fillRect(0, 0, width, height)
  }

  // HUD removed for cleaner visual experience

  if (!performanceMode) {
    const scanAlpha = 0.02 + safeHigh * 0.03
    ctx.fillStyle = `rgba(0, 0, 0, ${scanAlpha})`
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1)
    }
  }
}

export function EightBitAdventure({
  active = true,
  bassLevel,
  midLevel,
  highLevel,
  seed,
  performanceMode = false,
}: EightBitAdventureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backgroundRef = useRef<AdventureBackground | null>(null)
  const starsRef = useRef<Star[]>([])
  const cloudsRef = useRef<Cloud[]>([])
  const propsRef = useRef<Prop[]>([])
  const coinsRef = useRef<Coin[]>([])
  const enemiesRef = useRef<Enemy[]>([])
  const powerUpsRef = useRef<PowerUp[]>([])
  const slashesRef = useRef<Slash[]>([])
  const particlesRef = useRef<Particle[]>([])
  const heroRef = useRef<Hero>({ y: 0, vy: 0, onGround: true, runPhase: 0 })
  const scrollRef = useRef(0)
  const lastBassRef = useRef(0)
  const lastHighRef = useRef(0)
  const lastJumpAtRef = useRef(0)
  const lastSlashAtRef = useRef(0)
  const lastSpawnAtRef = useRef(0)
  const activeRef = useRef(active)
  const rafRef = useRef<number | null>(null)
  const loopRef = useRef<((now: number) => void) | null>(null)
  const sizeRef = useRef({ width: 0, height: 0 })
  const audioRef = useRef({ bass: 0, mid: 0, high: 0 })

  audioRef.current.bass = clamp01(bassLevel)
  audioRef.current.mid = clamp01(midLevel)
  audioRef.current.high = clamp01(highLevel)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Deterministic per-track/per-scene variation without user-facing controls.
    const baseSeed = (seed ?? 0) >>> 0
    const layoutRandom = seededRandom((baseSeed ^ 8027) >>> 0)
    const motionRandom = seededRandom((baseSeed ^ 2113) >>> 0)

    lastBassRef.current = 0
    lastHighRef.current = 0
    lastJumpAtRef.current = 0
    lastSlashAtRef.current = 0
    lastSpawnAtRef.current = 0

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = performanceMode ? 1 : Math.min(2, window.devicePixelRatio || 1)

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false

      sizeRef.current = { width: rect.width, height: rect.height }

      const sky = ctx.createLinearGradient(0, 0, 0, rect.height)
      sky.addColorStop(0, "rgb(6, 7, 26)")
      sky.addColorStop(0.52, "rgb(12, 10, 34)")
      sky.addColorStop(1, "rgb(4, 6, 18)")

      const glow = ctx.createRadialGradient(rect.width * 0.5, rect.height * 0.20, 0, rect.width * 0.5, rect.height * 0.20, rect.width * 0.65)
      glow.addColorStop(0, "rgba(217, 70, 239, 0.09)")
      glow.addColorStop(0.55, "rgba(6, 182, 212, 0.04)")
      glow.addColorStop(1, "rgba(0, 0, 0, 0)")

      const vignette = ctx.createRadialGradient(rect.width * 0.5, rect.height * 0.45, rect.height * 0.2, rect.width * 0.5, rect.height * 0.5, rect.height)
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)")
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.65)")

      backgroundRef.current = { sky, glow, vignette }

      const starDensity = performanceMode ? 21000 : 12500
      const starCount = Math.min(220, Math.max(70, Math.floor((rect.width * rect.height) / starDensity)))
      starsRef.current = createStars(rect.width, rect.height, starCount, layoutRandom)

      const cloudCount = performanceMode ? 5 : Math.min(9, Math.max(6, Math.floor(rect.width / 220)))
      cloudsRef.current = createClouds(rect.width, rect.height, cloudCount, layoutRandom)

      const propCount = performanceMode ? Math.min(6, Math.max(4, Math.floor(rect.width / 260))) : Math.min(11, Math.max(7, Math.floor(rect.width / 170)))
      propsRef.current = createProps(rect.width, rect.height, propCount, layoutRandom)

      // Reset short-lived state on resize for stability.
      coinsRef.current = []
      enemiesRef.current = []
      powerUpsRef.current = []
      slashesRef.current = []
      particlesRef.current = []
      heroRef.current = { y: rect.height * 0.78 - 16 * (performanceMode ? 3 : 2), vy: 0, onGround: true, runPhase: 0 }
      scrollRef.current = 0
    }

    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) {
      ro.observe(canvas.parentElement)
    }

    let last = performance.now()
    let time = 0
    let smoothedBass = 0
    let smoothedMid = 0
    let smoothedHigh = 0
    let smoothedEnergy = 0
    let intensityMode: IntensityMode = "standard"
    let intensityHoldUntil = 0
    let beatInterval = 0.55
    let lastBeatAt = 0
    let prevBass = 0
    let dropPulse = 0

    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05)
      last = now
      time += delta

      const { width, height } = sizeRef.current
      if (width > 0 && height > 0) {
        const { bass, mid, high } = audioRef.current

        // Smooth audio for more intentional motion.
        smoothedBass = lerp(smoothedBass, Math.pow(clamp01(bass), 1.25), performanceMode ? 0.11 : 0.08)
        smoothedMid = lerp(smoothedMid, clamp01(mid), performanceMode ? 0.09 : 0.07)
        smoothedHigh = lerp(smoothedHigh, Math.pow(clamp01(high), 1.1), performanceMode ? 0.1 : 0.075)

        const energy = clamp01(smoothedBass * 0.5 + smoothedMid * 0.3 + smoothedHigh * 0.28)
        smoothedEnergy = lerp(smoothedEnergy, energy, 0.06)

        // Automatic intensity mode (no user controls).
        if (time >= intensityHoldUntil) {
          const e = smoothedEnergy
          if (intensityMode === "focus") {
            if (e > 0.34) {
              intensityMode = "standard"
              intensityHoldUntil = time + 1.4
            }
          } else if (intensityMode === "hype") {
            if (e < 0.56) {
              intensityMode = "standard"
              intensityHoldUntil = time + 1.4
            }
          } else {
            if (e < 0.26) {
              intensityMode = "focus"
              intensityHoldUntil = time + 1.6
            } else if (e > 0.68) {
              intensityMode = "hype"
              intensityHoldUntil = time + 1.6
            }
          }
        }

        const intensityBoost = intensityMode === "focus" ? 0.85 : intensityMode === "hype" ? 1.18 : 1

        // Beat detection (bass rise) to drive "drop" moments (shake/moon/hero aura).
        const bassDelta = bass - prevBass
        prevBass = bass
        const beatCooldown = Math.max(0.26, beatInterval * 0.55)
        const beatThreshold = intensityMode === "focus" ? 0.7 : intensityMode === "hype" ? 0.56 : 0.62
        const beatSlope = intensityMode === "focus" ? 0.085 : 0.07
        if (bass > beatThreshold && bassDelta > beatSlope && time - lastBeatAt > beatCooldown) {
          const dt = time - lastBeatAt
          if (lastBeatAt > 0 && dt > 0.28 && dt < 1.2) {
            beatInterval = lerp(beatInterval, dt, 0.18)
          }
          lastBeatAt = time
          dropPulse = Math.max(dropPulse, bass)
        }
        dropPulse = Math.max(0, dropPulse - delta * 1.7)

        drawEightBitAdventure(
          ctx,
          width,
          height,
          time,
          delta,
          smoothedBass,
          smoothedMid,
          smoothedHigh,
          intensityMode,
          intensityBoost,
          dropPulse,
          heroRef.current,
          scrollRef,
          starsRef.current,
          cloudsRef.current,
          propsRef.current,
          coinsRef.current,
          enemiesRef.current,
          powerUpsRef.current,
          slashesRef.current,
          particlesRef.current,
          lastBassRef,
          lastHighRef,
          lastJumpAtRef,
          lastSlashAtRef,
          lastSpawnAtRef,
          backgroundRef.current,
          motionRandom,
          performanceMode
        )
      }

      if (!activeRef.current) {
        rafRef.current = null
        return
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    loopRef.current = loop
    if (activeRef.current) {
      rafRef.current = requestAnimationFrame(loop)
    }

    return () => {
      ro.disconnect()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = null
      loopRef.current = null
    }
  }, [performanceMode, seed])

  useEffect(() => {
    if (!active) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    if (rafRef.current !== null) return
    if (!loopRef.current) return

    rafRef.current = requestAnimationFrame(loopRef.current)
  }, [active])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
