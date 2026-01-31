"use client"

import { useEffect, useRef } from "react"
import { VISUALIZER_COLORS } from "@/lib/color/visualizer-palette"

interface StarlightDriftProps {
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
  speed: number
  alpha: number
  twinkle: number
  tint: [number, number, number]
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

const STAR_TINTS: [number, number, number][] = [
  hexToRgb(VISUALIZER_COLORS.cyan),
  hexToRgb(VISUALIZER_COLORS.purple),
  hexToRgb(VISUALIZER_COLORS.magenta),
  hexToRgb(VISUALIZER_COLORS.cyanTintLight),
]

function lerpAudio(current: number, target: number, attack: number, release: number) {
  return current < target
    ? current + (target - current) * attack
    : current + (target - current) * release
}

export function StarlightDrift({
  active = true,
  bassLevel,
  midLevel,
  highLevel,
  seed,
  performanceMode = false,
}: StarlightDriftProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const sizeRef = useRef({ width: 0, height: 0 })
  const starsRef = useRef<Star[]>([])
  const activeRef = useRef(active)
  const audioRef = useRef({ bass: 0, mid: 0, high: 0 })
  const smoothedRef = useRef({ bass: 0, mid: 0, high: 0, energy: 0 })
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
    const random = seededRandom(baseSeed ^ 0x2b77)
    const starCount = performanceMode ? 90 : 150

    const resetStars = (width: number, height: number) => {
      starsRef.current = Array.from({ length: starCount }, () => {
        const tint = STAR_TINTS[Math.floor(random() * STAR_TINTS.length)] || STAR_TINTS[0]
        return {
          x: random() * width,
          y: random() * height,
          size: 0.6 + random() * 1.8,
          speed: 0.08 + random() * 0.22,
          alpha: 0.25 + random() * 0.6,
          twinkle: 0.6 + random() * 1.2,
          tint,
        }
      })
    }

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = performanceMode ? 1 : Math.min(2, window.devicePixelRatio || 1)

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      sizeRef.current = { width: rect.width, height: rect.height }
      resetStars(rect.width, rect.height)

      const gradient = ctx.createRadialGradient(
        rect.width * 0.5,
        rect.height * 0.45,
        0,
        rect.width * 0.5,
        rect.height * 0.45,
        Math.max(rect.width, rect.height) * 0.9
      )
      gradient.addColorStop(0, "rgba(18, 12, 36, 0.92)")
      gradient.addColorStop(0.5, "rgba(8, 12, 24, 0.86)")
      gradient.addColorStop(1, "rgba(10, 14, 31, 0.7)")
      gradientRef.current = gradient
    }

    resize()
    window.addEventListener("resize", resize)

    const draw = (now: number) => {
      if (!activeRef.current) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

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

      const energy = Math.min(1, bass * 0.65 + mid * 0.3 + high * 0.2)
      // Slow-decaying energy accumulator for musical arc awareness
      sm.energy = sm.energy + (energy - sm.energy) * 0.005
      const accumulatedEnergy = sm.energy

      // Dynamic range: quiet passages feel contemplative, peaks feel dramatic
      const dynamicEnergy = Math.pow(energy, 1.4)
      const speedBoost = 0.3 + dynamicEnergy * 1.5 + accumulatedEnergy * 0.3

      // Color temperature shift: cooler during quiet, warmer during peaks
      const colorWarmth = Math.pow(energy, 1.2) * 0.3 + accumulatedEnergy * 0.15

      // Nebula Gas Clouds
      if (!performanceMode) {
        ctx.save()
        ctx.globalCompositeOperation = "screen"
        const nTime = now * 0.0001 * (0.7 + dynamicEnergy * 0.6)
        for (let i = 0; i < 2; i++) {
          const nx = width * (0.5 + Math.sin(nTime * (i + 1)) * 0.2)
          const ny = height * (0.5 + Math.cos(nTime * (i + 1.5)) * 0.2)
          const nr = Math.max(width, height) * (0.35 + dynamicEnergy * 0.3 + accumulatedEnergy * 0.1)
          // Shift from cool purple/cyan to warmer magenta during peaks
          const [r, g, b] = i === 0
            ? [Math.round(139 + colorWarmth * 78), Math.round(92 - colorWarmth * 22), 246]
            : [Math.round(6 + colorWarmth * 50), Math.round(182 - colorWarmth * 40), Math.round(212 + colorWarmth * 27)]
          const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr)
          grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.05 + dynamicEnergy * 0.12 + accumulatedEnergy * 0.04})`)
          grad.addColorStop(1, "rgba(10, 14, 31, 0)")
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, width, height)
        }
        ctx.restore()
      }

      starsRef.current.forEach((star) => {
        star.y += star.speed * speedBoost
        if (star.y > height + 4) {
          star.y = -4
          star.x = random() * width
        }

        // Twinkle speed responds to highs for sparkling effect
        const twinkleSpeed = 0.0012 + high * 0.001
        const flicker = 0.7 + Math.sin(now * twinkleSpeed * star.twinkle + star.x) * 0.3
        // Wider dynamic range: quiet stars are subtler, loud stars are brighter
        const dynamicAlpha = star.alpha * flicker * (0.6 + dynamicEnergy * 0.9 + accumulatedEnergy * 0.2)
        const size = star.size + dynamicEnergy * 1.2 + accumulatedEnergy * 0.3 + (performanceMode ? 0.4 : 0)

        // Warp Speed Effect (Radial Trails) - wider trigger range with dynamic energy
        if (dynamicEnergy > 0.5) {
          const trailLen = dynamicEnergy * 28 + accumulatedEnergy * 8
          ctx.strokeStyle = `rgba(${star.tint[0]}, ${star.tint[1]}, ${star.tint[2]}, ${dynamicAlpha * 0.4})`
          ctx.lineWidth = size
          ctx.beginPath()
          ctx.moveTo(star.x, star.y)
          ctx.lineTo(star.x, star.y - trailLen)
          ctx.stroke()
        }

        // Define clean edges with high-contrast fill
        ctx.fillStyle = `rgba(${star.tint[0]}, ${star.tint[1]}, ${star.tint[2]}, ${dynamicAlpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, size, 0, Math.PI * 2)
        ctx.fill()

        // Sharper core ping for "striking" visuals
        if (dynamicAlpha > 0.35) {
          ctx.fillStyle = `rgba(255, 255, 255, ${(dynamicAlpha * 0.65).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(star.x, star.y, size * 0.35, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // Constellation Ties - lower threshold for more visible connections
      if (!performanceMode && (mid > 0.45 || high > 0.45)) {
        ctx.save()
        const tieIntensity = Math.max(mid, high)
        ctx.strokeStyle = `rgba(255, 255, 255, ${tieIntensity * 0.18 + accumulatedEnergy * 0.04})`
        ctx.lineWidth = 0.5
        for (let i = 0; i < starsRef.current.length; i += 10) {
          const s1 = starsRef.current[i]
          const s2 = starsRef.current[(i + 1) % starsRef.current.length]
          if (s1 && s2) {
            const dx = s1.x - s2.x
            const dy = s1.y - s2.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            // Wider reach during loud passages
            const maxDist = 80 + dynamicEnergy * 60
            if (dist < maxDist) {
              ctx.beginPath()
              ctx.moveTo(s1.x, s1.y)
              ctx.lineTo(s2.x, s2.y)
              ctx.stroke()
            }
          }
        }
        ctx.restore()
      }

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
