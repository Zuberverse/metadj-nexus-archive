"use client"

import { useEffect, useRef } from "react"
import { VISUALIZER_COLORS } from "@/lib/color/visualizer-palette"

interface PixelParadiseProps {
  active?: boolean
  bassLevel: number
  midLevel: number
  highLevel: number
  /** Stable seed for track-scoped visual variation. */
  seed?: number
  performanceMode?: boolean
}

interface Block {
  x: number
  y: number
  size: number
  speed: number
  drift: number
  colorIdx: number
  layer: number
  wobblePhase: number
}

interface Star {
  x: number
  y: number
  size: number
  baseAlpha: number
  twinkleSpeed: number
  phase: number
  tintIdx: number
}

interface PortalPixel {
  angle: number
  ring: number
  offset: number
  size: number
  phase: number
  tintIdx: number
}

interface Shockwave {
  age: number
  duration: number
  strength: number
  seed: number
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  duration: number
  size: number
  tintIdx: number
  phase: number
}

interface GlitchFragment {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  age: number
  duration: number
  colorIdx: number
}

type IntensityMode = "focus" | "standard" | "hype"

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

function createBlocks(width: number, height: number, count: number, random: () => number): Block[] {
  const blocks: Block[] = []
  const minSize = Math.max(3, Math.min(width, height) * 0.0045)
  const maxSize = minSize * 3.1

  for (let i = 0; i < count; i++) {
    const layer = Math.floor(random() * 3)
    const size = minSize + random() * (maxSize - minSize) * (0.6 + layer * 0.35)
    blocks.push({
      x: random() * width,
      y: random() * height,
      size,
      speed: 0.55 + random() * 1.8,
      drift: (random() - 0.5) * (0.6 + layer * 0.4),
      colorIdx: random(),
      layer,
      wobblePhase: random() * Math.PI * 2,
    })
  }

  return blocks
}

function createStars(width: number, height: number, count: number, random: () => number): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    const roll = random()
    const size = roll < 0.84 ? 1 : roll < 0.975 ? 2 : 3
    stars.push({
      x: Math.floor(random() * width),
      y: Math.floor(random() * height),
      size,
      baseAlpha: 0.035 + random() * 0.11,
      twinkleSpeed: 0.45 + random() * 1.9,
      phase: random() * Math.PI * 2,
      tintIdx: random(),
    })
  }
  return stars
}

function createPortalPixels(count: number, random: () => number): PortalPixel[] {
  const pixels: PortalPixel[] = []
  // Increase density for a more detailed portal
  const safeCount = Math.max(250, count * 1.5)
  for (let i = 0; i < safeCount; i++) {
    const base = (i / safeCount) * Math.PI * 2
    const jitter = (random() - 0.5) * (Math.PI * 2 / safeCount) * 1.5

    // 0-1: Inner core vortex (event horizon)
    // 2-3: Main ring structure
    // 4-5: Outer glow/halo
    const roll = random()
    const ring = roll < 0.2 ? 0 : roll < 0.4 ? 1 : roll < 0.7 ? 2 : roll < 0.85 ? 3 : roll < 0.95 ? 4 : 5

    const sizeRoll = random()
    const size = sizeRoll < 0.6 ? 2 : sizeRoll < 0.9 ? 3 : 4

    pixels.push({
      angle: base + jitter,
      ring,
      offset: (random() - 0.5) * 2,
      size,
      phase: random() * Math.PI * 2,
      tintIdx: random(),
    })
  }

  return pixels
}

type PixelPortalBackground = {
  base: CanvasGradient | null
  glow: CanvasGradient | null
  vignette: CanvasGradient | null
  portalHalo: CanvasGradient | null
  portalCore: CanvasGradient | null
}

function drawPixelPortal(
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
  blocks: Block[],
  background: PixelPortalBackground | null,
  stars: Star[],
  portalPixels: PortalPixel[],
  shockwaves: Shockwave[],
  sparks: Spark[],
  glitches: GlitchFragment[],
  rng: () => number,
  smoothedSpeedRef: React.MutableRefObject<number>,
  performanceMode: boolean
) {
  const safeBass = clamp01(bass)
  const safeMid = clamp01(mid)
  const safeHigh = clamp01(high)
  const grid = performanceMode ? 2 : 1

  ctx.globalCompositeOperation = "source-over"
  // Fully repaint the background every frame to avoid "thumb-smear" streaks.
  ctx.fillStyle = "rgb(4, 8, 18)"
  ctx.fillRect(0, 0, width, height)

  if (background?.base) {
    ctx.fillStyle = background.base
    ctx.fillRect(0, 0, width, height)
  }
  if (background?.glow) {
    ctx.fillStyle = background.glow
    ctx.fillRect(0, 0, width, height)
  }
  if (background?.vignette) {
    ctx.fillStyle = background.vignette
    ctx.fillRect(0, 0, width, height)
  }

  const centerX = width * 0.5
  const centerY = height * 0.51
  const minSide = Math.min(width, height)
  const portalBase = minSide * 0.42
  const portalBreath = 1 + Math.sin(time * 0.65) * 0.02 + safeBass * 0.08 + dropPulse * 0.085
  const portalRadius = portalBase * portalBreath
  const portalEllipse = 0.86 + safeMid * 0.06

  // Nebula wash (slow, vibrant motion behind pixels).
  if (!performanceMode) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    const nebulaAlpha = 0.045 + safeMid * 0.07 + safeHigh * 0.06
    const drift = minSide * (0.2 + safeBass * 0.06)
    const radiusBase = minSide * (0.55 + safeMid * 0.16)

    for (let i = 0; i < 2; i++) {
      const seed = i * 0.47 + 0.21
      const nx = centerX + Math.sin(time * (0.12 + seed) + seed * 9.1) * drift
      const ny = centerY + Math.cos(time * (0.15 + seed) + seed * 7.3) * drift * 0.7
      const radius = radiusBase * (0.92 + i * 0.16)
      const [nr, ng, nb] = samplePalette((seed + time * 0.03 + safeHigh * 0.25) % 1)

      const gradient = ctx.createRadialGradient(nx, ny, 0, nx, ny, radius)
      gradient.addColorStop(0, `rgba(${nr}, ${ng}, ${nb}, ${nebulaAlpha})`)
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }

    ctx.restore()
  }

  // Cosmic sparkle field (subtle, audio-reactive twinkle).
  const sparkleBoost = (0.7 + safeHigh * 0.55) * (0.86 + intensityBoost * 0.14)
  for (const star of stars) {
    const twinkle = Math.sin(time * star.twinkleSpeed + star.phase) * 0.5 + 0.5
    const alpha = star.baseAlpha * (0.4 + twinkle * 0.75) * sparkleBoost
    if (alpha <= 0.004) continue

    const tinted = mixRgb(samplePalette(star.tintIdx), [255, 255, 255], 0.6)
    ctx.fillStyle = `rgba(${tinted[0]}, ${tinted[1]}, ${tinted[2]}, ${alpha})`
    ctx.fillRect(star.x, star.y, star.size, star.size)

    if (!performanceMode && twinkle > 0.92) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.55})`
      ctx.fillRect(star.x - star.size, star.y, star.size * 3, 1)
      ctx.fillRect(star.x, star.y - star.size, 1, star.size * 3)
    }
  }

  ctx.globalCompositeOperation = "lighter"

  // Portal shockwaves (bass peaks -> expanding pixel rings).
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const wave = shockwaves[i]
    wave.age += delta
    const progress = wave.duration > 0 ? wave.age / wave.duration : 1
    if (progress >= 1) {
      shockwaves.splice(i, 1)
      continue
    }

    const maxRadius = Math.max(width, height) * 0.65
    const radius = portalRadius * (0.95 + progress * 2.8) + progress * maxRadius * 0.25
    const alpha = (1 - progress) * (0.12 + safeHigh * 0.1) * Math.min(1, wave.strength * 1.2)
    if (alpha <= 0.004) continue

    const segments = performanceMode ? 90 : 130
    const step = (Math.PI * 2) / segments
    const wobbleAmp = (performanceMode ? 0.012 : 0.018) * minSide * (0.25 + safeMid * 0.75)
    const wobbleFreq = 4 + Math.floor(wave.seed * 4)

    const [wr, wg, wb] = samplePalette((wave.seed + time * 0.12 + safeHigh * 0.35) % 1)
    ctx.fillStyle = `rgba(${wr}, ${wg}, ${wb}, ${alpha})`

    const size = performanceMode ? 2 : 3
    const sizeSecondary = performanceMode ? 1 : 2

    for (let s = 0; s < segments; s++) {
      const angle = s * step
      const wobble = Math.sin(angle * wobbleFreq + progress * 6.2 + time * 0.55) * wobbleAmp
      const rr = radius + wobble
      const x = centerX + Math.cos(angle) * rr
      const y = centerY + Math.sin(angle) * rr * portalEllipse
      const gx = Math.round(x / grid) * grid
      const gy = Math.round(y / grid) * grid
      ctx.fillRect(gx, gy, size, size)

      // Secondary layered ring for more visual weight
      if (!performanceMode) {
        const x2 = centerX + Math.cos(angle) * (rr + grid * 2)
        const y2 = centerY + Math.sin(angle) * (rr + grid * 2) * portalEllipse
        ctx.fillRect(Math.round(x2 / grid) * grid, Math.round(y2 / grid) * grid, sizeSecondary, sizeSecondary)
      }
    }
  }

  const targetSpeed = (30 + (safeBass * 1.15 + safeMid * 0.65 + safeHigh * 0.9) * 115) * (0.92 + intensityBoost * 0.08)
  smoothedSpeedRef.current = lerp(smoothedSpeedRef.current, targetSpeed, delta * (performanceMode ? 8 : 12))
  const speedScale = smoothedSpeedRef.current

  for (const block of blocks) {
    const layerSpeed = 0.7 + block.layer * 0.6
    const wobble = Math.sin(time * (0.9 + block.layer * 0.25) + block.wobblePhase) * 0.6
    const drift = wobble * block.drift

    block.y -= block.speed * layerSpeed * speedScale * delta
    block.x += drift * delta * 50

    // Orbit lane attraction toward the portal center.
    const dx = block.x - centerX
    const dy = block.y - centerY
    const dist = Math.sqrt(dx * dx + dy * dy) + 1
    const influence = clamp01(1 - dist / (minSide * 0.75))

    const orbit = (0.28 + safeMid * 0.82) * (0.6 + block.layer * 0.3) * influence
    block.x += (-dy / dist) * orbit * delta * speedScale * 2.8
    block.y += (dx / dist) * orbit * delta * speedScale * 2.8

    const desiredRadius = portalRadius * (1.35 + block.layer * 0.22)
    const radialError = dist - desiredRadius
    const laneTightness = (0.45 + safeMid * 0.95) * influence
    const laneCorrection = radialError * laneTightness * delta * 0.22
    block.x += (-dx / dist) * laneCorrection
    block.y += (-dy / dist) * laneCorrection

    const wrapMargin = block.size * 2.5
    if (block.y + block.size < -wrapMargin) {
      block.y = height + wrapMargin
      block.x = (block.x + width * (0.15 + block.colorIdx * 0.7)) % width
    }
    if (block.x < -wrapMargin) block.x += width + wrapMargin * 2
    if (block.x > width + wrapMargin) block.x -= width + wrapMargin * 2

    const colorT = (block.colorIdx + time * 0.12 + safeHigh * 0.7) % 1
    const [r, g, b] = samplePalette(colorT)

    const sparklePhase = Math.sin(time * (2.6 + block.colorIdx * 1.2) + block.wobblePhase * 1.7)
    const sparkle = Math.pow(sparklePhase * 0.5 + 0.5, 2.2)

    const alphaBase = 0.2 + block.layer * 0.14
    const alpha = alphaBase + sparkle * (0.26 + safeHigh * 0.42)

    const pulse = 1 + safeBass * 0.55 * Math.sin(time * 2.4 + block.wobblePhase)
    const size = Math.max(2, Math.round(block.size * (0.9 + pulse * 0.12)))

    // Keep motion fluid internally, but snap draw calls to preserve crisp pixel edges.
    const x = Math.round(block.x / grid) * grid
    const y = Math.round(block.y / grid) * grid

    // Enhanced glow for more vibrance
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.55})`
    ctx.fillRect(x - size * 0.6, y - size * 0.6, size * 2.2, size * 2.2)

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 1.15})`
    ctx.fillRect(x, y, size, size)

    if (sparkle > 0.75) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.65})`
      ctx.fillRect(x + size * 0.15, y + size * 0.15, size * 0.7, size * 0.7)
    }
  }

  // Portal sparks (highs + bass: energetic pixel dust / streaks).
  const maxSparksBase = performanceMode ? 90 : 170
  const maxSparks = Math.round(
    maxSparksBase *
    (intensityMode === "focus" ? 0.75 : intensityMode === "hype" ? 1.15 : 1)
  )
  const spawnRate =
    (performanceMode ? 18 : 35) * (0.18 + safeHigh * 0.82) +
    (performanceMode ? 10 : 25) * Math.pow(safeBass, 1.15)
  const spawnFloat = spawnRate * intensityBoost * delta
  const spawnCount = Math.floor(spawnFloat) + (rng() < spawnFloat - Math.floor(spawnFloat) ? 1 : 0)

  for (let i = 0; i < spawnCount; i++) {
    const angle = rng() * Math.PI * 2 + time * (0.22 + safeMid * 0.35)
    const radial = portalRadius * (0.28 + rng() * 0.32)
    const baseX = centerX + Math.cos(angle) * radial
    const baseY = centerY + Math.sin(angle) * radial * portalEllipse

    const radialSpeed = (60 + rng() * 160) * (0.65 + safeHigh * 0.85)
    // Stronger spin for sparks to match portal energy
    const tangentSpeed = (rng() < 0.5 ? -1 : 1) * (45 + rng() * 105) * (0.35 + safeMid * 0.95)

    sparks.push({
      x: baseX,
      y: baseY,
      vx: Math.cos(angle) * radialSpeed - Math.sin(angle) * tangentSpeed,
      vy: Math.sin(angle) * radialSpeed * portalEllipse + Math.cos(angle) * tangentSpeed * portalEllipse,
      age: 0,
      duration: 0.55 + rng() * 0.85,
      size: rng() < 0.72 ? 2 : rng() < 0.92 ? 3 : 4,
      tintIdx: rng(),
      phase: rng() * Math.PI * 2,
    })
  }

  if (sparks.length > maxSparks) {
    sparks.splice(0, sparks.length - maxSparks)
  }

  const sparkGrid = performanceMode ? 2 : 1
  for (let i = sparks.length - 1; i >= 0; i--) {
    const spark = sparks[i]
    spark.age += delta
    const progress = spark.duration > 0 ? spark.age / spark.duration : 1
    if (progress >= 1) {
      sparks.splice(i, 1)
      continue
    }

    // Gentle spiral pull around the portal.
    const dx = spark.x - centerX
    const dy = spark.y - centerY
    const dist = Math.sqrt(dx * dx + dy * dy) + 1
    const spiral = (0.22 + safeMid * 0.85) * delta * 210
    spark.vx += (-dy / dist) * spiral
    spark.vy += (dx / dist) * spiral * portalEllipse

    spark.x += spark.vx * delta
    spark.y += spark.vy * delta
    spark.vx *= 1 - delta * 0.75
    spark.vy *= 1 - delta * 0.75

    const fade = Math.pow(1 - progress, 1.8)
    const shimmer = Math.sin(time * (3.4 + spark.tintIdx * 1.7) + spark.phase) * 0.5 + 0.5
    const alpha = fade * (0.08 + shimmer * 0.22 + safeHigh * 0.16)
    if (alpha <= 0.004) continue

    const [sr, sg, sb] = samplePalette((spark.tintIdx + time * 0.18 + safeHigh * 0.55) % 1)
    const size = Math.max(2, Math.round(spark.size * (0.9 + safeBass * 0.18)))
    const x = Math.round(spark.x / sparkGrid) * sparkGrid
    const y = Math.round(spark.y / sparkGrid) * sparkGrid

    ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, ${alpha * 0.25})`
    ctx.fillRect(x - size * 0.9, y - size * 0.9, size * 3.2, size * 3.2)

    ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, ${alpha})`
    ctx.fillRect(x, y, size, size)

    if (!performanceMode && shimmer > 0.88) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.55})`
      ctx.fillRect(x + size * 0.25, y + size * 0.25, Math.max(1, size * 0.45), Math.max(1, size * 0.45))
    }
  }

  // Glitch fragments removed - user found them distracting

  // Darken the portal core after block glow, then lay the portal ring on top.
  ctx.globalCompositeOperation = "source-over"
  if (background?.portalCore) {
    ctx.fillStyle = background.portalCore
    ctx.fillRect(0, 0, width, height)
  }

  ctx.globalCompositeOperation = "lighter"
  if (background?.portalHalo) {
    ctx.fillStyle = background.portalHalo
    ctx.fillRect(0, 0, width, height)
  }

  const baseRotation = time * (0.32 + safeMid * 0.6)
  const laneSpread = (performanceMode ? 0.07 : 0.09) * (1 - safeMid * 0.4)
  const ringBaseAlpha = 0.22 + safeHigh * 0.32

  for (const pixel of portalPixels) {
    let ringOffset = 0
    let layerRotation = baseRotation
    let layerAlpha = 1.0

    // Multi-layer Vortex Logic (6 Rings)
    if (pixel.ring === 0) {
      // Singularity Vortex: Tight, fast, deep
      ringOffset = -0.55 + pixel.offset * 0.08
      layerRotation = baseRotation * 2.1
      layerAlpha = 0.6 + safeBass * 0.4
    } else if (pixel.ring === 1) {
      // Inner Event Horizon
      ringOffset = -0.32 + pixel.offset * 0.1
      layerRotation = baseRotation * 1.6
      layerAlpha = 0.75 + safeHigh * 0.25
    } else if (pixel.ring === 2 || pixel.ring === 3) {
      // Main Structural Rings
      const ringIdx = pixel.ring - 2
      ringOffset = (-0.1 + ringIdx * 0.25) + pixel.offset * laneSpread
      layerRotation = baseRotation * (1.1 - ringIdx * 0.2)
    } else if (pixel.ring === 4) {
      // Outer Stabilizer
      ringOffset = 0.45 + pixel.offset * 0.12
      layerRotation = baseRotation * 0.65
      layerAlpha = 0.82
    } else {
      // Distant Halo
      ringOffset = 0.75 + pixel.offset * 0.18
      layerRotation = baseRotation * 0.4
      layerAlpha = 0.5 + safeMid * 0.5
    }

    // Vortex Filaments: Spirals that connect rings
    const filamentPhase = (pixel.angle * 3.0 + time * 0.8) % (Math.PI * 2)
    const isFilament = pixel.tintIdx > 0.85
    if (isFilament) {
      const spiralPull = Math.sin(filamentPhase) * 0.15
      ringOffset += spiralPull
      layerRotation += spiralPull * 0.4
    }

    const shimmer = Math.sin(time * 1.45 + pixel.phase) * 0.04
    const angle = pixel.angle + layerRotation + shimmer
    const radialWobble = Math.sin(time * 1.1 + pixel.phase * 1.7) * (0.01 + safeHigh * 0.02)
    const radius = portalRadius * (1 + ringOffset + radialWobble)

    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius * portalEllipse

    const twinkle = Math.sin(time * (2.2 + pixel.tintIdx * 1.4) + pixel.phase) * 0.5 + 0.5

    // Flare logic on rings
    const isFlare = !performanceMode && pixel.ring >= 2 && pixel.ring <= 3 && Math.sin(pixel.angle * 6 + time * 2) > 0.95
    const flareBoost = isFlare ? (0.5 + safeHigh * 1.5) : 0

    const alpha = (ringBaseAlpha + Math.pow(twinkle, 2.1) * (0.18 + safeHigh * 0.12) + flareBoost) * layerAlpha
    if (alpha <= 0.006) continue

    const [pr, pg, pb] = samplePalette((pixel.tintIdx + time * 0.16 + safeHigh * 0.75) % 1)
    const size = Math.max(2, Math.round(pixel.size * (0.9 + safeBass * 0.15 + flareBoost * 0.3)))

    const px = Math.round(x / grid) * grid
    const py = Math.round(y / grid) * grid

    // Enhanced core glow for darker SINGULARITY ring
    if (pixel.ring <= 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.4})`
      ctx.fillRect(px - size * 0.3, py - size * 0.3, size * 1.6, size * 1.6)
    }

    ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${alpha * 0.25})`
    ctx.fillRect(px - size * 0.6, py - size * 0.6, size * 2.2, size * 2.2)

    ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${alpha})`
    ctx.fillRect(px, py, size, size)

    if (!performanceMode && (twinkle > 0.94 || isFlare)) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.55})`
      ctx.fillRect(px + size * 0.25, py + size * 0.25, size * 0.5, size * 0.5)
    }
  }

  ctx.globalCompositeOperation = "source-over"
  if (performanceMode) return

  const scanAlpha = 0.03 + safeMid * 0.035
  ctx.fillStyle = `rgba(0, 0, 0, ${scanAlpha})`
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1)
  }
}

export function PixelParadise({ active = true, bassLevel, midLevel, highLevel, seed, performanceMode = false }: PixelParadiseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const blocksRef = useRef<Block[]>([])
  const backgroundRef = useRef<PixelPortalBackground | null>(null)
  const starsRef = useRef<Star[]>([])
  const portalPixelsRef = useRef<PortalPixel[]>([])
  const shockwavesRef = useRef<Shockwave[]>([])
  const sparksRef = useRef<Spark[]>([])
  const glitchesRef = useRef<GlitchFragment[]>([])
  const lastBassRef = useRef(0)
  const lastShockwaveAtRef = useRef(0)
  const activeRef = useRef(active)
  const rafRef = useRef<number | null>(null)
  const loopRef = useRef<((now: number) => void) | null>(null)
  const sizeRef = useRef({ width: 0, height: 0 })
  const smoothedSpeedRef = useRef(30)
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
    const layoutRandom = seededRandom((baseSeed ^ 777) >>> 0)
    const motionRandom = seededRandom((baseSeed ^ 4042) >>> 0)

    lastBassRef.current = 0
    lastShockwaveAtRef.current = 0

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

      const base = ctx.createRadialGradient(
        rect.width * 0.45,
        rect.height * 0.35,
        0,
        rect.width * 0.45,
        rect.height * 0.35,
        Math.max(rect.width, rect.height) * 1.15
      )
      base.addColorStop(0, "rgb(14, 10, 32)")
      base.addColorStop(0.6, "rgb(5, 10, 24)")
      base.addColorStop(1, "rgb(3, 9, 18)")

      const glow = ctx.createRadialGradient(
        rect.width * 0.24,
        rect.height * 0.22,
        0,
        rect.width * 0.55,
        rect.height * 0.5,
        Math.max(rect.width, rect.height) * 1.1
      )
      glow.addColorStop(0, "rgba(139, 92, 246, 0.14)")
      glow.addColorStop(0.55, "rgba(6, 182, 212, 0.06)")
      glow.addColorStop(1, "rgba(217, 70, 239, 0.08)")

      const vignette = ctx.createRadialGradient(
        rect.width * 0.5,
        rect.height * 0.5,
        Math.min(rect.width, rect.height) * 0.25,
        rect.width * 0.5,
        rect.height * 0.5,
        Math.max(rect.width, rect.height) * 0.95
      )
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)")
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.6)")

      const portalCenterX = rect.width * 0.5
      const portalCenterY = rect.height * 0.51
      const portalRadius = Math.min(rect.width, rect.height) * 0.42

      const portalHalo = ctx.createRadialGradient(
        portalCenterX,
        portalCenterY,
        0,
        portalCenterX,
        portalCenterY,
        portalRadius
      )
      portalHalo.addColorStop(0, "rgba(6, 182, 212, 0)")
      portalHalo.addColorStop(0.4, "rgba(139, 92, 246, 0.12)")
      portalHalo.addColorStop(0.7, "rgba(217, 70, 239, 0.18)")
      portalHalo.addColorStop(0.85, "rgba(6, 182, 212, 0.25)")
      portalHalo.addColorStop(0.95, "rgba(139, 92, 246, 0.15)")
      portalHalo.addColorStop(1, "rgba(0, 0, 0, 0)")

      const portalCore = ctx.createRadialGradient(
        portalCenterX,
        portalCenterY,
        0,
        portalCenterX,
        portalCenterY,
        portalRadius * 0.72
      )
      portalCore.addColorStop(0, "rgba(0, 0, 0, 0.85)")
      portalCore.addColorStop(0.4, "rgba(0, 0, 0, 0.65)")
      portalCore.addColorStop(0.8, "rgba(0, 0, 0, 0.25)")
      portalCore.addColorStop(1, "rgba(0, 0, 0, 0)")

      backgroundRef.current = { base, glow, vignette, portalHalo, portalCore }

      const starDensity = performanceMode ? 20000 : 11000
      const starCount = Math.min(260, Math.max(90, Math.floor((rect.width * rect.height) / starDensity)))
      starsRef.current = createStars(rect.width, rect.height, starCount, layoutRandom)

      const area = rect.width * rect.height
      const density = performanceMode ? 12000 : 6200
      const minCount = performanceMode ? 120 : 240
      const maxCount = performanceMode ? 260 : 440
      const count = Math.min(maxCount, Math.max(minCount, Math.floor(area / density)))
      blocksRef.current = createBlocks(rect.width, rect.height, count, layoutRandom)

      const portalCount = performanceMode ? 200 : 280
      portalPixelsRef.current = createPortalPixels(portalCount, layoutRandom)

      // Reset short-lived state on resize to avoid weird jumps.
      sparksRef.current = []
      shockwavesRef.current = []
      glitchesRef.current = []
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
    let dropPulse = 0

    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05)
      last = now
      time += delta

      const { width, height } = sizeRef.current
      if (width > 0 && height > 0) {
        const { bass, mid, high } = audioRef.current

        // Smooth audio for more intentional motion.
        smoothedBass = lerp(smoothedBass, Math.pow(clamp01(bass), 1.35), performanceMode ? 0.12 : 0.08)
        smoothedMid = lerp(smoothedMid, clamp01(mid), performanceMode ? 0.1 : 0.075)
        smoothedHigh = lerp(smoothedHigh, Math.pow(clamp01(high), 1.15), performanceMode ? 0.11 : 0.08)

        const energy = clamp01(smoothedBass * 0.55 + smoothedMid * 0.32 + smoothedHigh * 0.28)
        smoothedEnergy = lerp(smoothedEnergy, energy, 0.06)

        // Automatic intensity mode (no sliders; no extra UI).
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

        const intensityBoost = intensityMode === "focus" ? 0.85 : intensityMode === "hype" ? 1.25 : 1

        // Beat detection (bass rise), used to keep shockwaves rhythmic.
        const lastBass = lastBassRef.current
        lastBassRef.current = bass
        const bassDelta = bass - lastBass

        const beatCooldown = Math.max(0.26, beatInterval * 0.55)
        const beatThreshold = intensityMode === "focus" ? 0.72 : intensityMode === "hype" ? 0.58 : 0.64
        const beatSlope = intensityMode === "focus" ? 0.09 : 0.075

        if (bass > beatThreshold && bassDelta > beatSlope && time - lastBeatAt > beatCooldown) {
          const dt = time - lastBeatAt
          if (lastBeatAt > 0 && dt > 0.28 && dt < 1.2) {
            beatInterval = lerp(beatInterval, dt, 0.18)
          }
          lastBeatAt = time

          // "Drop pulse" gives the portal a moment of presence on strong hits.
          dropPulse = Math.max(dropPulse, bass)

          // Rate-limit shockwaves separately from beat detection.
          const shockCooldown = intensityMode === "focus" ? 0.62 : intensityMode === "hype" ? 0.36 : 0.44
          if (bass > (intensityMode === "focus" ? 0.78 : 0.66) && time - lastShockwaveAtRef.current > shockCooldown) {
            lastShockwaveAtRef.current = time
            shockwavesRef.current.push({
              age: 0,
              duration: 0.9 + (1 - bass) * 0.55,
              strength: bass,
              seed: (time * 0.12 + smoothedMid * 0.3 + smoothedHigh * 0.2) % 1,
            })
            const limit = performanceMode ? 3 : 5
            if (shockwavesRef.current.length > limit) {
              shockwavesRef.current.splice(0, shockwavesRef.current.length - limit)
            }
          }
        }

        dropPulse = Math.max(0, dropPulse - delta * 1.9)

        drawPixelPortal(
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
          blocksRef.current,
          backgroundRef.current,
          starsRef.current,
          portalPixelsRef.current,
          shockwavesRef.current,
          sparksRef.current,
          glitchesRef.current,
          motionRandom,
          smoothedSpeedRef,
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
