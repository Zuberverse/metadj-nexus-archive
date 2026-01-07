"use client"

import { useEffect, useRef } from "react"
import { VISUALIZER_COLORS } from "@/lib/color/visualizer-palette"

interface SynthwaveHorizonProps {
  active?: boolean
  bassLevel: number
  midLevel: number
  highLevel: number
  /** Stable seed for track-scoped visual variation. */
  seed?: number
  performanceMode?: boolean
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

interface Comet {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  duration: number
  size: number
  tintIdx: number
}

type SkyFlyerKind = "ufo" | "glider" | "orb" | "music-note"

interface SkyFlyer {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  phase: number
  tintIdx: number
  spin: number
  kind: SkyFlyerKind
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
  return [Math.round(lerp(a[0], b[0], frac)), Math.round(lerp(a[1], b[1], frac)), Math.round(lerp(a[2], b[2], frac))]
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))]
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
      twinkleSpeed: 0.5 + random() * 2.2,
      phase: random() * Math.PI * 2,
      tintIdx: random(),
    })
  }
  return stars
}

function createSkyFlyers(width: number, height: number, count: number, random: () => number): SkyFlyer[] {
  const flyers: SkyFlyer[] = []
  const minSide = Math.min(width, height)
  const skyTop = height * 0.08
  const skyBottom = height * 0.38

  for (let i = 0; i < count; i++) {
    const kindRoll = random()
    // More variety: 25% ufo, 35% glider, 25% orb, 15% music-note
    const kind: SkyFlyerKind =
      kindRoll < 0.25 ? "ufo"
        : kindRoll < 0.60 ? "glider"
          : kindRoll < 0.85 ? "orb"
            : "music-note"

    // Increased size: 2.5x larger base with more variance for visual impact
    const size = Math.max(18, Math.round(minSide * (0.028 + random() * 0.042))) * (kind === "music-note" ? 1.5 : 1)
    const direction = random() < 0.5 ? 1 : -1
    const baseSpeed = kind === "music-note" ? 20 : 14
    const speed = (baseSpeed + random() * 34) * (0.8 + (size / 24) * 0.35)

    flyers.push({
      x: random() * width,
      y: skyTop + random() * (skyBottom - skyTop),
      vx: direction * speed,
      vy: (random() - 0.5) * speed * (kind === "music-note" ? 0.25 : 0.08), // Music notes bob more
      size,
      phase: random() * Math.PI * 2,
      tintIdx: random(),
      spin: (random() - 0.5) * 0.9,
      kind,
    })
  }

  return flyers
}

type SynthwaveBackground = {
  sky: CanvasGradient | null
  glow: CanvasGradient | null
  haze: CanvasGradient | null
  vignette: CanvasGradient | null
}

function drawSkyFlyer(
  ctx: CanvasRenderingContext2D,
  flyer: SkyFlyer,
  x: number,
  y: number,
  time: number,
  safeBass: number,
  safeMid: number,
  safeHigh: number,
  performanceMode: boolean
) {
  const [baseR, baseG, baseB] = samplePalette((flyer.tintIdx + time * 0.08 + safeHigh * 0.18) % 1)
  const core = mixRgb([baseR, baseG, baseB], [255, 255, 255], 0.22)
  const glowAlpha = 0.06 + safeHigh * 0.22 + safeMid * 0.06
  const coreAlpha = 0.16 + safeHigh * 0.22

  const dir = flyer.vx >= 0 ? 1 : -1
  const size = flyer.size
  const grid = performanceMode ? 2 : 1

  // Trails (skip for the orb; keep it clean).
  if (flyer.kind !== "orb") {
    const speed = Math.hypot(flyer.vx, flyer.vy) || 1
    const nx = flyer.vx / speed
    const ny = flyer.vy / speed

    const trailSteps = performanceMode ? 6 : 10
    const trailStep = (2 + safeHigh * 4) * (flyer.kind === "glider" ? 1.25 : 1)
    const trailSize = Math.max(1, Math.round(size * 0.12))
    const trailAlphaBase = (0.03 + safeHigh * 0.14) * (0.55 + safeMid * 0.55)

    for (let t = 1; t <= trailSteps; t++) {
      const f = t / trailSteps
      const tx = x - nx * t * trailStep
      const ty = y - ny * t * trailStep
      const a = trailAlphaBase * Math.pow(1 - f, 1.6)
      if (a <= 0.004) continue
      ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${a})`
      ctx.fillRect(Math.round(tx / grid) * grid, Math.round(ty / grid) * grid, trailSize, trailSize)
    }
  }

  if (flyer.kind === "ufo") {
    const rx = size * 0.78
    const ry = size * 0.28

    ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${glowAlpha * 0.25})`
    ctx.beginPath()
    ctx.ellipse(x, y, rx * 1.08, ry * 1.35, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = `rgba(${core[0]}, ${core[1]}, ${core[2]}, ${coreAlpha})`
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()

    // Dome
    ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${glowAlpha * 0.22})`
    ctx.beginPath()
    ctx.ellipse(x, y - ry * 0.75, rx * 0.42, ry * 0.95, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = `rgba(255, 255, 255, ${coreAlpha * 0.2})`
    ctx.beginPath()
    ctx.ellipse(x + rx * 0.18, y - ry * 0.9, rx * 0.18, ry * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()

    // Lights (twinkle with highs)
    const lightCount = 4
    const lightY = y + ry * 0.55
    const lightAlpha = (0.05 + safeHigh * 0.22) * (0.55 + Math.pow(safeHigh, 1.2))
    for (let i = 0; i < lightCount; i++) {
      const t = i / (lightCount - 1)
      const lx = x + (t - 0.5) * rx * 1.1
      const pulse = Math.sin(time * (5.2 + safeHigh * 4.5) + flyer.phase + i) * 0.5 + 0.5
      const a = lightAlpha * (0.55 + pulse * 0.75)
      ctx.fillStyle = `rgba(255, 255, 255, ${a})`
      ctx.fillRect(Math.round(lx / grid) * grid, Math.round(lightY / grid) * grid, grid, grid)
    }

    // Subtle beam (bass shimmer), skipped in performance mode.
    if (!performanceMode && safeBass > 0.18) {
      const beamPulse = Math.pow(Math.sin(time * (3.8 + safeBass * 3.2) + flyer.phase) * 0.5 + 0.5, 1.6)
      const beamAlpha = (0.01 + safeBass * 0.07) * (0.25 + beamPulse * 0.75)
      const beamHeight = size * (0.75 + safeBass * 1.35)
      ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${beamAlpha})`
      ctx.beginPath()
      ctx.moveTo(x - rx * 0.45, y + ry * 0.7)
      ctx.lineTo(x + rx * 0.45, y + ry * 0.7)
      ctx.lineTo(x, y + ry * 0.7 + beamHeight)
      ctx.closePath()
      ctx.fill()
    }
    return
  }

  if (flyer.kind === "glider") {
    const w = size * 1.15
    const h = size * 0.6

    ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${glowAlpha * 0.24})`
    ctx.beginPath()
    ctx.moveTo(x + dir * w * 0.65, y)
    ctx.lineTo(x - dir * w * 0.35, y - h * 0.55)
    ctx.lineTo(x - dir * w * 0.62, y)
    ctx.lineTo(x - dir * w * 0.35, y + h * 0.55)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = `rgba(${core[0]}, ${core[1]}, ${core[2]}, ${coreAlpha})`
    ctx.beginPath()
    ctx.moveTo(x + dir * w * 0.58, y)
    ctx.lineTo(x - dir * w * 0.26, y - h * 0.45)
    ctx.lineTo(x - dir * w * 0.52, y)
    ctx.lineTo(x - dir * w * 0.26, y + h * 0.45)
    ctx.closePath()
    ctx.fill()

    const cockpitR = Math.max(1, size * 0.12)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + safeHigh * 0.35})`
    ctx.beginPath()
    ctx.arc(x + dir * w * 0.16, y, cockpitR, 0, Math.PI * 2)
    ctx.fill()

    // Thruster flicker (bass)
    const backX = x - dir * w * 0.55
    const flame = (0.5 + safeBass * 1.25) * (0.5 + (Math.sin(time * (9 + safeBass * 8) + flyer.phase) * 0.5 + 0.5) * 0.9)
    const flameLen = size * 0.45 * flame
    const flameAlpha = 0.05 + safeBass * 0.22
    const [fr, fg, fb] = samplePalette((flyer.tintIdx + 0.5 + time * 0.18) % 1)
    ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${flameAlpha})`
    ctx.beginPath()
    ctx.moveTo(backX, y - grid)
    ctx.lineTo(backX, y + grid)
    ctx.lineTo(backX - dir * flameLen, y)
    ctx.closePath()
    ctx.fill()
    return
  }

  // Orb (ringed planet vibe).
  // Music Note (bouncy, musical element).
  if (flyer.kind === "music-note") {
    const [nr, ng, nb] = samplePalette((flyer.tintIdx + time * 0.2 + safeMid * 0.4) % 1)
    const wobble = Math.sin(time * (3 + safeBass * 2) + flyer.phase) * 0.2

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(wobble + flyer.spin * 0.4)

    // Scale for drawing coordinates
    const scale = size * 0.05
    ctx.scale(scale, scale)

    ctx.fillStyle = `rgba(${nr}, ${ng}, ${nb}, ${coreAlpha})`
    ctx.strokeStyle = `rgba(${nr}, ${ng}, ${nb}, ${coreAlpha * 0.8})`

    // Heads
    ctx.beginPath()
    ctx.ellipse(-7, 6, 5, 4, -0.3, 0, Math.PI * 2)
    ctx.ellipse(7, 4, 5, 4, -0.3, 0, Math.PI * 2)
    ctx.fill()

    // Stems
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(-3, 6)
    ctx.lineTo(-3, -12) // Left stem
    ctx.lineTo(11, -14) // Beam
    ctx.lineTo(11, 4)   // Right stem
    ctx.stroke()

    // Beam (thicker)
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-3, -12)
    ctx.lineTo(11, -14)
    ctx.stroke()

    // Glow
    ctx.shadowBlur = 15
    ctx.shadowColor = `rgba(${nr}, ${ng}, ${nb}, ${glowAlpha})`
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.restore()
    return
  }

  // Orb (ringed planet vibe).
  const r = size * 0.36 * (1 + safeMid * 0.06)
  const glowR = r * 1.6
  const ringW = r * 1.55
  const ringH = r * 0.62
  const ringRot = Math.sin(time * 0.45 + flyer.phase) * 0.35 + flyer.spin * 0.8

  ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${glowAlpha * 0.2})`
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = `rgba(${core[0]}, ${core[1]}, ${core[2]}, ${coreAlpha * 0.95})`
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${glowAlpha * 0.34})`
  ctx.lineWidth = performanceMode ? 1 : 1 + safeMid * 1.8
  ctx.beginPath()
  ctx.ellipse(x, y + r * 0.12, ringW, ringH, ringRot, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + safeHigh * 0.25})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(x - r * 0.2, y - r * 0.15, r * 0.45, -0.4, 1.2)
  ctx.stroke()
}

function drawSynthwaveHorizon(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  delta: number,
  bass: number,
  mid: number,
  high: number,
  tempoHz: number,
  beatPhase: number,
  intensityMode: IntensityMode,
  intensityBoost: number,
  dropPulse: number,
  stars: Star[],
  flyers: SkyFlyer[],
  comets: Comet[],
  background: SynthwaveBackground | null,
  performanceMode: boolean
) {
  const safeBass = clamp01(bass)
  const safeMid = clamp01(mid)
  const safeHigh = clamp01(high)

  ctx.globalCompositeOperation = "source-over"
  ctx.fillStyle = "rgb(2, 3, 16)"
  ctx.fillRect(0, 0, width, height)

  if (background?.sky) {
    ctx.fillStyle = background.sky
    ctx.fillRect(0, 0, width, height)
  }
  if (background?.glow) {
    ctx.fillStyle = background.glow
    ctx.fillRect(0, 0, width, height)
  }

  const horizonY = height * 0.62
  const sunRadiusBase = Math.min(width, height) * 0.18
  const sunRadius = sunRadiusBase * (1 + safeBass * 0.08 + dropPulse * 0.055)
  const sunX = width * 0.5
  const sunY = horizonY + sunRadius * 0.06

  // Stars
  const sparkleBoost = (0.8 + safeHigh * 0.5) * (0.86 + intensityBoost * 0.14)
  for (const star of stars) {
    const twinkle = Math.sin(time * star.twinkleSpeed + star.phase) * 0.5 + 0.5
    const alpha = star.baseAlpha * (0.35 + twinkle * 0.9) * sparkleBoost
    if (alpha <= 0.004) continue

    const tinted = mixRgb(samplePalette(star.tintIdx), [255, 255, 255], 0.64)
    ctx.fillStyle = `rgba(${tinted[0]}, ${tinted[1]}, ${tinted[2]}, ${alpha})`
    ctx.fillRect(star.x, star.y, star.size, star.size)

    if (!performanceMode && twinkle > 0.93) {
      const glintAlpha = alpha * (0.25 + safeHigh * 0.45)
      const glintLen = 3 + star.size * 3
      ctx.fillStyle = `rgba(255, 255, 255, ${glintAlpha})`
      ctx.fillRect(star.x - glintLen, star.y, glintLen * 2 + star.size, 1)
      ctx.fillRect(star.x, star.y - glintLen, 1, glintLen * 2 + star.size)
    }
  }

  // Aurora ribbons (slow, vibrant motion in the sky).
  if (!performanceMode) {
    ctx.globalCompositeOperation = "lighter"

    const bandCount = 3
    const segments = 80
    const baseAlpha = 0.05 + safeMid * 0.12 + safeHigh * 0.08

    for (let band = 0; band < bandCount; band++) {
      const bandSeed = band * 0.33 + 0.18
      const baseY = height * (0.18 + band * 0.08) + Math.sin(time * 0.25 + bandSeed * 6) * height * 0.01
      const amp = (12 + safeMid * 45 + safeHigh * 15) * (0.85 + band * 0.18)
      const freq = 1.1 + band * 0.55 + safeHigh * 1.5

      const gradient = ctx.createLinearGradient(0, baseY, width, baseY)
      const [c1r, c1g, c1b] = samplePalette((0.12 + bandSeed + time * 0.04) % 1)
      const [c2r, c2g, c2b] = samplePalette((0.55 + bandSeed * 0.6 + time * 0.03 + safeHigh * 0.2) % 1)
      const [c3r, c3g, c3b] = samplePalette((0.86 + bandSeed * 0.9 + time * 0.05) % 1)
      gradient.addColorStop(0, `rgba(${c1r}, ${c1g}, ${c1b}, ${baseAlpha * 0.9})`)
      gradient.addColorStop(0.5, `rgba(${c2r}, ${c2g}, ${c2b}, ${baseAlpha})`)
      gradient.addColorStop(1, `rgba(${c3r}, ${c3g}, ${c3b}, ${baseAlpha * 0.85})`)

      ctx.strokeStyle = gradient
      ctx.lineWidth = 10 + band * 3
      ctx.beginPath()
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * width
        const y =
          baseY +
          Math.sin(i * 0.24 + time * freq + bandSeed * 4.2) * amp +
          Math.cos(i * 0.11 + time * (freq * 0.72)) * amp * 0.6
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }

  // Sky flyers (cute synth silhouettes that drift + react to audio).
  if (flyers.length > 0) {
    ctx.save()
    ctx.globalCompositeOperation = "lighter"

    const flyerBoost = intensityMode === "focus" ? 0.85 : intensityMode === "hype" ? 1.15 : 1
    const speedBoost = (0.85 + safeMid * 0.75 + safeBass * 0.25) * flyerBoost
    const bobAmp = ((performanceMode ? 1.0 : 1.6) + safeBass * (performanceMode ? 2.6 : 5.2)) * (0.92 + flyerBoost * 0.08)
    const skyTop = height * 0.06
    const skyBottom = height * 0.42
    const grid = performanceMode ? 2 : 1

    for (const flyer of flyers) {
      flyer.x += flyer.vx * delta * speedBoost
      flyer.y += flyer.vy * delta * (0.55 + safeMid * 0.65)

      const margin = flyer.size * 3
      if (flyer.x < -margin) flyer.x = width + margin
      if (flyer.x > width + margin) flyer.x = -margin

      if (flyer.y < skyTop) {
        flyer.y = skyTop
        flyer.vy = Math.abs(flyer.vy)
      } else if (flyer.y > skyBottom) {
        flyer.y = skyBottom
        flyer.vy = -Math.abs(flyer.vy)
      }

      const bob = Math.sin(time * (0.9 + safeBass * 1.4) + flyer.phase) * bobAmp
      const drift = Math.cos(time * (0.32 + safeHigh * 0.6) + flyer.phase * 1.3) * flyer.size * 0.08

      const fx = Math.round((flyer.x + drift) / grid) * grid
      const fy = Math.round((flyer.y + bob) / grid) * grid

      drawSkyFlyer(ctx, flyer, fx, fy, time, safeBass, safeMid, safeHigh, performanceMode)
    }

    ctx.restore()
  }

  // Shooting comets (spawned on high peaks).
  if (comets.length > 0) {
    ctx.globalCompositeOperation = "lighter"
    const grid = performanceMode ? 2 : 1

    for (let i = comets.length - 1; i >= 0; i--) {
      const comet = comets[i]
      comet.age += delta
      const progress = comet.duration > 0 ? comet.age / comet.duration : 1
      if (progress >= 1) {
        comets.splice(i, 1)
        continue
      }

      comet.x += comet.vx * delta
      comet.y += comet.vy * delta

      if (comet.x < -width * 0.25 || comet.x > width * 1.25 || comet.y < -height * 0.25 || comet.y > height * 1.25) {
        comets.splice(i, 1)
        continue
      }

      const fade = Math.pow(1 - progress, 1.6)
      const alpha = fade * (0.08 + safeHigh * 0.22)
      if (alpha <= 0.004) continue

      const [cr, cg, cb] = samplePalette((comet.tintIdx + time * 0.12 + safeHigh * 0.3) % 1)
      const size = Math.max(2, Math.round(comet.size * (0.9 + safeHigh * 0.35)))

      const headX = Math.round(comet.x / grid) * grid
      const headY = Math.round(comet.y / grid) * grid

      // Pixel-ish streak trail
      const trailSteps = performanceMode ? 8 : 14
      for (let t = 0; t < trailSteps; t++) {
        const trailT = t / trailSteps
        const tx = headX - comet.vx * trailT * 0.06
        const ty = headY - comet.vy * trailT * 0.06
        const a = alpha * (1 - trailT) * (1 - trailT)
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${a})`
        ctx.fillRect(Math.round(tx / grid) * grid, Math.round(ty / grid) * grid, size, size)
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.55})`
      ctx.fillRect(headX + size * 0.25, headY + size * 0.25, Math.max(1, size * 0.5), Math.max(1, size * 0.5))
    }
  }

  // Sun glow + disc (retro outrun)
  ctx.globalCompositeOperation = "lighter"
  const [glowR, glowG, glowB] = samplePalette((0.6 + time * 0.04) % 1)
  ctx.fillStyle = `rgba(${glowR}, ${glowG}, ${glowB}, ${(0.06 + safeBass * 0.08 + dropPulse * 0.06) * (0.9 + intensityBoost * 0.1)})`
  ctx.beginPath()
  ctx.arc(sunX, sunY, sunRadius * 1.35, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalCompositeOperation = "source-over"
  if (!performanceMode) {
    const [s1r, s1g, s1b] = samplePalette((0.86 + time * 0.05 + safeHigh * 0.18) % 1)
    const [s2r, s2g, s2b] = samplePalette((0.55 + safeMid * 0.25 + time * 0.03) % 1)
    const sunGradient = ctx.createRadialGradient(
      sunX - sunRadius * 0.25,
      sunY - sunRadius * 0.22,
      sunRadius * 0.08,
      sunX,
      sunY,
      sunRadius
    )
    const sunAlpha = 0.7 + safeBass * 0.22
    sunGradient.addColorStop(0, `rgba(${s1r}, ${s1g}, ${s1b}, ${sunAlpha})`)
    sunGradient.addColorStop(0.55, `rgba(${s2r}, ${s2g}, ${s2b}, ${sunAlpha * 0.85})`)
    sunGradient.addColorStop(1, `rgba(8, 6, 24, ${sunAlpha * 0.18})`)
    ctx.fillStyle = sunGradient
  } else {
    const sunAlpha = Math.min(0.95, 0.62 + safeBass * 0.18 + dropPulse * 0.12)
    ctx.fillStyle = `rgba(217, 70, 239, ${sunAlpha})`
  }
  ctx.beginPath()
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2)
  ctx.fill()

  // Sun scanlines
  ctx.save()
  ctx.beginPath()
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2)
  ctx.clip()
  const stripeAlpha = 0.08 + safeHigh * 0.12 + dropPulse * 0.04
  ctx.fillStyle = `rgba(0, 0, 0, ${stripeAlpha})`
  const stripeGap = performanceMode ? 8 : 6
  const stripeOffset = (time * (40 + safeBass * 80)) % stripeGap
  for (let y = sunY - sunRadius; y <= sunY + sunRadius; y += stripeGap) {
    ctx.fillRect(sunX - sunRadius, Math.round(y + stripeOffset), sunRadius * 2, 2)
  }
  ctx.restore()

  // Horizon haze
  if (background?.haze) {
    ctx.globalCompositeOperation = "lighter"
    ctx.fillStyle = background.haze
    ctx.fillRect(0, 0, width, height)
  }

  // Ground base (cuts the sun at the horizon)
  ctx.globalCompositeOperation = "source-over"
  ctx.fillStyle = "rgba(2, 3, 16, 0.92)"
  ctx.fillRect(0, horizonY, width, height - horizonY)

  // Perspective grid
  ctx.globalCompositeOperation = "lighter"
  const gridAlphaBase = 0.18 + safeBass * 0.22
  const gridTint = mixRgb(samplePalette(0.25 + safeHigh * 0.15), samplePalette(0.85), 0.45)
  ctx.strokeStyle = `rgba(${gridTint[0]}, ${gridTint[1]}, ${gridTint[2]}, ${gridAlphaBase})`
  ctx.lineWidth = 1

  const vanishingX = width * 0.5
  const vanishingY = horizonY
  const verticalLines = performanceMode ? 14 : 18

  for (let i = -verticalLines; i <= verticalLines; i++) {
    const t = i / verticalLines
    const x0 = vanishingX + t * width * 0.52
    ctx.beginPath()
    ctx.moveTo(Math.round(x0), height)
    ctx.lineTo(vanishingX, vanishingY)
    ctx.stroke()
  }

  const rows = performanceMode ? 22 : 30
  const scrollSpeed = (0.18 + tempoHz * 0.12) * (0.85 + safeBass * 0.35) * (0.92 + intensityBoost * 0.08)
  const scroll = (time * scrollSpeed) % 1
  const pulseZ = beatPhase
  const bassPulse = Math.pow(safeBass, 1.25)
  for (let r = 0; r < rows; r++) {
    const z = (r / rows + scroll) % 1
    const depth = z * z
    const bounce = Math.sin(time * 1.5 + z * 10.0) * safeBass * 18.0 * (1.0 - z)
    const y = vanishingY + depth * (height - vanishingY) + bounce
    const t = (height - y) / (height - vanishingY)
    const leftX = lerp(0, vanishingX, t)
    const rightX = lerp(width, vanishingX, t)

    const wrapDist = Math.min(Math.abs(z - pulseZ), 1 - Math.abs(z - pulseZ))
    const pulseGlow = Math.exp(-wrapDist * wrapDist * 90) * bassPulse * 1.9
    const rowAlpha = (0.12 + (1 - t) * 0.3) * (0.9 + safeBass * 0.4 + pulseGlow)
    // More vibrant gradient for the grid lines
    const [rr, rg, rb] = samplePalette((0.18 + z * 0.45 + safeHigh * 0.2 + time * 0.1) % 1)
    ctx.strokeStyle = `rgba(${rr}, ${rg}, ${rb}, ${rowAlpha})`

    ctx.beginPath()
    ctx.moveTo(leftX, y)
    ctx.lineTo(rightX, y)
    ctx.stroke()
  }

  // Mid-driven shimmer band at the horizon (subtle wave, no geometry warp).
  const shimmerAlpha = 0.06 + safeMid * 0.12
  const shimmerAmp = (performanceMode ? 3 : 5) + safeMid * 10
  const shimmerFreq = 1.8 + safeHigh * 1.4
  const segments = performanceMode ? 60 : 90
  const [sr, sg, sb] = samplePalette((0.5 + time * 0.06) % 1)
  ctx.strokeStyle = `rgba(${sr}, ${sg}, ${sb}, ${shimmerAlpha})`
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width
    const y = horizonY + Math.sin(i * 0.22 + time * shimmerFreq) * shimmerAmp
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  ctx.globalCompositeOperation = "source-over"
  if (!performanceMode && background?.vignette) {
    ctx.fillStyle = background.vignette
    ctx.fillRect(0, 0, width, height)
  }

  if (performanceMode) return

  // Subtle global scanlines
  const scanAlpha = 0.02 + safeHigh * 0.03
  ctx.fillStyle = `rgba(0, 0, 0, ${scanAlpha})`
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1)
  }
}

export function SynthwaveHorizon({
  active = true,
  bassLevel,
  midLevel,
  highLevel,
  seed,
  performanceMode = false,
}: SynthwaveHorizonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const flyersRef = useRef<SkyFlyer[]>([])
  const cometsRef = useRef<Comet[]>([])
  const backgroundRef = useRef<SynthwaveBackground | null>(null)
  const lastHighRef = useRef(0)
  const lastCometAtRef = useRef(0)
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
    const layoutRandom = seededRandom((baseSeed ^ 1312) >>> 0)
    const motionRandom = seededRandom((baseSeed ^ 2421) >>> 0)

    lastHighRef.current = 0
    lastCometAtRef.current = 0

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
      sky.addColorStop(0, "rgb(4, 6, 24)")
      sky.addColorStop(0.4, "rgb(7, 5, 30)")
      sky.addColorStop(1, "rgb(2, 3, 16)")

      const horizonY = rect.height * 0.62
      const haze = ctx.createLinearGradient(0, horizonY - 120, 0, horizonY + 80)
      haze.addColorStop(0, "rgba(0, 0, 0, 0)")
      haze.addColorStop(0.35, "rgba(6, 182, 212, 0.075)")
      haze.addColorStop(0.55, "rgba(217, 70, 239, 0.085)")
      haze.addColorStop(1, "rgba(0, 0, 0, 0)")

      const sunGlow = ctx.createRadialGradient(rect.width * 0.5, horizonY, 0, rect.width * 0.5, horizonY, rect.width * 0.55)
      sunGlow.addColorStop(0, "rgba(217, 70, 239, 0.12)")
      sunGlow.addColorStop(0.55, "rgba(6, 182, 212, 0.04)")
      sunGlow.addColorStop(1, "rgba(0, 0, 0, 0)")

      const vignette = ctx.createRadialGradient(rect.width * 0.5, rect.height * 0.5, rect.height * 0.2, rect.width * 0.5, rect.height * 0.5, rect.height)
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)")
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.65)")

      backgroundRef.current = { sky, glow: sunGlow, haze, vignette }

      const starDensity = performanceMode ? 18000 : 8000
      const starCount = Math.min(240, Math.max(80, Math.floor((rect.width * rect.height) / starDensity)))
      starsRef.current = createStars(rect.width, rect.height, starCount, layoutRandom)

      // Increased flyer count for more visual interest in the sky
      const flyerCount = performanceMode ? 5 : Math.min(14, Math.max(8, Math.floor(rect.width / 140)))
      flyersRef.current = createSkyFlyers(rect.width, rect.height, flyerCount, layoutRandom)

      cometsRef.current = []
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

        const energy = clamp01(smoothedBass * 0.48 + smoothedMid * 0.3 + smoothedHigh * 0.28)
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

        // Beat detection (bass rise) to sync grid pulses and sun flares.
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
        dropPulse = Math.max(0, dropPulse - delta * 1.6)

        const safeBeatInterval = Math.max(0.28, Math.min(1.2, beatInterval))
        const tempoHz = Math.min(3.5, Math.max(0.6, 1 / safeBeatInterval))
        const beatPhase = (((time - lastBeatAt) / safeBeatInterval) % 1 + 1) % 1

        // Spawn comets on high peaks (occasional, cinematic).
        const lastHigh = lastHighRef.current
        lastHighRef.current = high
        const allowComets = !performanceMode || intensityMode === "hype"
        if (
          allowComets &&
          high > (intensityMode === "hype" ? 0.74 : 0.8) &&
          high - lastHigh > 0.08 &&
          time - lastCometAtRef.current > (performanceMode ? 1.65 : 1.1)
        ) {
          lastCometAtRef.current = time
          const fromLeft = motionRandom() < 0.5
          const startX = fromLeft ? -width * 0.12 : width * 1.12
          const startY = height * (0.06 + motionRandom() * 0.22)
          const angle = fromLeft
            ? Math.PI * (0.15 + motionRandom() * 0.12)
            : Math.PI * (0.85 - motionRandom() * 0.12)
          const speed = (performanceMode ? 260 : 300 + motionRandom() * 260) * (0.75 + high * 0.6) * (0.9 + intensityBoost * 0.1)
          cometsRef.current.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            age: 0,
            duration: 0.65 + motionRandom() * 0.55,
            size: performanceMode ? 2 : motionRandom() < 0.75 ? 2 : 3,
            tintIdx: motionRandom(),
          })

          const limit = performanceMode ? 1 : 3
          if (cometsRef.current.length > limit) {
            cometsRef.current.splice(0, cometsRef.current.length - limit)
          }
        }

        drawSynthwaveHorizon(
          ctx,
          width,
          height,
          time,
          delta,
          smoothedBass,
          smoothedMid,
          smoothedHigh,
          tempoHz,
          beatPhase,
          intensityMode,
          intensityBoost,
          dropPulse,
          starsRef.current,
          flyersRef.current,
          cometsRef.current,
          backgroundRef.current,
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
