"use client"

import { useEffect, useRef } from "react"
import { VISUALIZER_COLORS } from "@/lib/color/visualizer-palette"

interface SpectrumRingProps {
  active?: boolean
  bassLevel: number
  midLevel: number
  highLevel: number
  /** Stable seed for track-scoped visual variation. */
  seed?: number
  performanceMode?: boolean
}

interface RingPalette {
  rgb: [number, number, number][]
}

interface BurstParticle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  size: number
  colorIdx: number
  age: number
  duration: number
}

function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace("#", "")
  const bigint = parseInt(sanitized, 16)
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function samplePalette(palette: RingPalette, t: number): [number, number, number] {
  const count = palette.rgb.length
  if (count === 0) return [255, 255, 255]
  const wrapped = ((t % 1) + 1) % 1
  const scaled = wrapped * count
  const idx = Math.floor(scaled)
  const next = (idx + 1) % count
  const frac = scaled - idx
  const [r1, g1, b1] = palette.rgb[idx] ?? palette.rgb[0]
  const [r2, g2, b2] = palette.rgb[next] ?? palette.rgb[0]
  return [lerp(r1, r2, frac), lerp(g1, g2, frac), lerp(b1, b2, frac)]
}

const PALETTE: RingPalette = {
  rgb: [
    hexToRgb(VISUALIZER_COLORS.purple),
    hexToRgb(VISUALIZER_COLORS.cyan),
    hexToRgb(VISUALIZER_COLORS.magenta),
    hexToRgb(VISUALIZER_COLORS.indigo),
  ],
}

function lerpAudio(current: number, target: number, attack: number, release: number) {
  return current < target
    ? current + (target - current) * attack
    : current + (target - current) * release
}

export function SpectrumRing({
  active = true,
  bassLevel,
  midLevel,
  highLevel,
  seed,
  performanceMode = false,
}: SpectrumRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const sizeRef = useRef({ width: 0, height: 0 })
  const audioRef = useRef({ bass: 0, mid: 0, high: 0 })
  const smoothedRef = useRef({ bass: 0, mid: 0, high: 0, energy: 0 })
  const activeRef = useRef(active)
  const ringNoiseRef = useRef<number[]>([])
  const innerRingNoiseRef = useRef<number[]>([])
  const particlesRef = useRef<BurstParticle[]>([])
  const gradientRef = useRef<CanvasGradient | null>(null)

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

    const baseSeed = (seed ?? 0) >>> 0
    const random = seededRandom(baseSeed ^ 0x1f4b)
    const segmentCount = performanceMode ? 84 : 120
    ringNoiseRef.current = Array.from({ length: segmentCount }, () => random())

    const innerSegmentCount = performanceMode ? 42 : 60
    innerRingNoiseRef.current = Array.from({ length: innerSegmentCount }, () => random())
    particlesRef.current = []

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = performanceMode ? 1 : Math.min(2, window.devicePixelRatio || 1)

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { width: rect.width, height: rect.height }

      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const radius = Math.min(rect.width, rect.height) * 0.55
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.15, centerX, centerY, radius)
      gradient.addColorStop(0, "rgba(18, 12, 38, 0.92)")
      gradient.addColorStop(0.55, "rgba(8, 16, 30, 0.88)")
      gradient.addColorStop(1, "rgba(10, 14, 31, 0.72)")
      gradientRef.current = gradient
    }

    resize()
    window.addEventListener("resize", resize)

    let lastNow = performance.now()

    const draw = (now: number) => {
      if (!activeRef.current) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const frameDelta = Math.min((now - lastNow) / 1000, 0.05)
      lastNow = now

      const { width, height } = sizeRef.current
      if (!width || !height) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, width, height)
      if (gradientRef.current) {
        ctx.fillStyle = gradientRef.current
        ctx.fillRect(0, 0, width, height)
      }

      const centerX = width / 2
      const centerY = height / 2
      const baseRadius = Math.min(width, height) * 0.28

      // Asymmetric smoothing: fast attack, slow release for musical response
      const rawBass = audioRef.current.bass
      const rawMid = audioRef.current.mid
      const rawHigh = audioRef.current.high
      const sm = smoothedRef.current
      sm.bass = lerpAudio(sm.bass, Math.pow(rawBass, 1.5), 0.07, 0.02)
      sm.mid = lerpAudio(sm.mid, rawMid, 0.06, 0.025)
      sm.high = lerpAudio(sm.high, Math.pow(rawHigh, 1.3), 0.065, 0.02)

      const bass = sm.bass
      const mid = sm.mid
      const high = sm.high

      const energy = Math.min(1, bass * 0.7 + mid * 0.35 + high * 0.2)
      // Slow-decaying energy accumulator: sustained loud passages feel different from brief hits
      sm.energy = sm.energy + (energy - sm.energy) * 0.005
      const accumulatedEnergy = sm.energy

      // Dynamic range expansion: quiet is subtle, peaks are dramatic
      const dynamicEnergy = Math.pow(energy, 1.4)
      const maxParticles = performanceMode ? 30 : 120

      // Neon Glow Pulse - responds to accumulated energy for sustained intensity
      if (!performanceMode) {
        const glowAlpha = dynamicEnergy * 0.25 + accumulatedEnergy * 0.08
        const glowRadius = baseRadius * (1.4 + dynamicEnergy * 0.65 + accumulatedEnergy * 0.2)
        const glow = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.5, centerX, centerY, glowRadius)
        // Color temperature: cooler during quiet, warmer during peaks
        const colorShift = dynamicEnergy * 0.3 + accumulatedEnergy * 0.15
        const [gr, gg, gb] = samplePalette(PALETTE, now * 0.0001 + colorShift)
        glow.addColorStop(0, `rgba(${gr}, ${gg}, ${gb}, ${glowAlpha})`)
        glow.addColorStop(1, "rgba(10, 14, 31, 0)")
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, width, height)
      }

      // Ring pulse: wider dynamic range between quiet and loud
      const ringPulse = 0.5 + dynamicEnergy * 0.8 + accumulatedEnergy * 0.15
      // Rotation speed responds to energy: contemplative idle, intense at peaks
      const rotationSpeed = 0.00025 + dynamicEnergy * 0.00025 + accumulatedEnergy * 0.0001
      const time = now * rotationSpeed
      // Color cycling accelerates with energy
      const colorCycleSpeed = 0.08 + dynamicEnergy * 0.12 + accumulatedEnergy * 0.04

      ctx.lineCap = "round"

      // Bass-responsive radius breathing
      const radiusBreath = 1 + bass * 0.06 + accumulatedEnergy * 0.02

      ringNoiseRef.current.forEach((noise, index) => {
        const segCount = ringNoiseRef.current.length
        const angle = (index / segCount) * Math.PI * 2 + time
        const wobble = Math.sin(time * 2.1 + noise * 6.2) * (0.08 + dynamicEnergy * 0.12)
        // Segment length responds more dramatically to energy
        const length = (8 + noise * 14) * ringPulse * (0.5 + wobble) + dynamicEnergy * 18
        const innerRadius = baseRadius * (0.95 + noise * 0.12) * radiusBreath
        const outerRadius = innerRadius + length

        const [r, g, b] = samplePalette(PALETTE, (index / segCount) + time * colorCycleSpeed)
        // Wider alpha range: quieter segments during calm, brighter during peaks
        const alpha = 0.25 + dynamicEnergy * 0.55 + accumulatedEnergy * 0.1

        ctx.strokeStyle = `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}, ${alpha.toFixed(3)})`
        ctx.lineWidth = 1.4 + noise * 1.6 + bass * 0.8

        const x1 = centerX + Math.cos(angle) * innerRadius
        const y1 = centerY + Math.sin(angle) * innerRadius
        const x2 = centerX + Math.cos(angle) * outerRadius
        const y2 = centerY + Math.sin(angle) * outerRadius

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()

        // Core Stroke for extra crispness
        if (alpha > 0.35) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.55).toFixed(3)})`
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }

        // Frequency Burst Particle Spawning - lower threshold, energy-proportional rate
        if (!performanceMode && dynamicEnergy > 0.6 && particlesRef.current.length < maxParticles && Math.random() < 0.03 + dynamicEnergy * 0.05) {
          const pAngle = angle
          const pSpeed = (1.5 + Math.random() * 3) * (0.8 + dynamicEnergy * 0.8)
          particlesRef.current.push({
            x: x2,
            y: y2,
            vx: Math.cos(pAngle) * pSpeed,
            vy: Math.sin(pAngle) * pSpeed,
            alpha: 1.0,
            size: 2 + Math.random() * 3,
            colorIdx: (index / segCount) + time * colorCycleSpeed,
            age: 0,
            duration: 0.4 + Math.random() * 0.6
          })
        }
      })

      // Secondary Inner Ring - bass-responsive with dynamic range
      const innerRotationSpeed = 0.00038 + dynamicEnergy * 0.0003
      const innerTime = now * innerRotationSpeed
      innerRingNoiseRef.current.forEach((noise, index) => {
        const segCount = innerRingNoiseRef.current.length
        const angle = (index / segCount) * Math.PI * 2 - innerTime
        // Wider dynamic range on inner ring length
        const length = (5 + noise * 8) * (0.5 + Math.pow(high, 1.3) * 0.8 + bass * 0.3)
        const innerRadius = baseRadius * 0.7 * radiusBreath
        const outerRadius = innerRadius - length

        const [r, g, b] = samplePalette(PALETTE, (index / segCount) - innerTime * 0.15 + accumulatedEnergy * 0.2)
        const alpha = 0.18 + Math.pow(high, 1.2) * 0.5 + accumulatedEnergy * 0.08

        ctx.strokeStyle = `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}, ${alpha.toFixed(3)})`
        ctx.lineWidth = 1.0 + bass * 0.6

        const x1 = centerX + Math.cos(angle) * innerRadius
        const y1 = centerY + Math.sin(angle) * innerRadius
        const x2 = centerX + Math.cos(angle) * outerRadius
        const y2 = centerY + Math.sin(angle) * outerRadius

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      })

      // Update and Draw Particles with delta-based movement
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i]
        p.age += frameDelta
        const t = p.age / p.duration
        if (t >= 1) {
          particlesRef.current.splice(i, 1)
          continue
        }

        p.x += p.vx * frameDelta * 60
        p.y += p.vy * frameDelta * 60
        p.alpha = Math.pow(1 - t, 1.5)

        const [pr, pg, pb] = samplePalette(PALETTE, p.colorIdx)
        const particleAlpha = Math.min(1, p.alpha * 1.15)
        ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${particleAlpha})`
        ctx.fillRect(p.x, p.y, p.size, p.size)
      }

      // Inner halo ring - bass-responsive radius with energy glow
      ctx.beginPath()
      const haloAlpha = 0.2 + dynamicEnergy * 0.35 + accumulatedEnergy * 0.1
      ctx.strokeStyle = `rgba(139, 92, 246, ${haloAlpha})`
      ctx.lineWidth = 0.8 + bass * 0.6
      ctx.arc(centerX, centerY, baseRadius * (0.82 + dynamicEnergy * 0.12) * radiusBreath, 0, Math.PI * 2)
      ctx.stroke()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [seed, performanceMode])

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden />
}
