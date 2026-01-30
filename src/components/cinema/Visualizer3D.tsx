"use client"

import { useMemo } from "react"
import dynamic from "next/dynamic"
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing"
import { BlendFunction } from "postprocessing"
import * as THREE from "three"
import { CinemaPerformanceMonitor } from "@/hooks/cinema"
import type { VisualizerStyle } from "@/data/scenes"

interface Visualizer3DProps {
  bassLevel: number
  midLevel: number
  highLevel: number
  style: VisualizerStyle
  /** When true, uses lower particle counts and lower-cost rendering defaults. */
  performanceMode?: boolean
  /** Postprocessing preset (independent of particle quality). */
  postProcessing?: "off" | "lite" | "full"
  /** Enable performance monitoring and logging */
  enablePerformanceMonitoring?: boolean
  /** Callback when performance mode is recommended due to low FPS */
  onPerformanceModeRecommended?: () => void
}

type Visualizer3DRendererProps = Pick<
  Visualizer3DProps,
  "bassLevel" | "midLevel" | "highLevel" | "performanceMode"
>

const Cosmos = dynamic<Visualizer3DRendererProps>(
  () => import("./visualizers/Cosmos").then((mod) => mod.Cosmos),
  { ssr: false, loading: () => null },
)

const SpaceTravel = dynamic<Visualizer3DRendererProps>(
  () => import("./visualizers/SpaceTravel").then((mod) => mod.SpaceTravel),
  { ssr: false, loading: () => null },
)

const DiscoBall = dynamic<Visualizer3DRendererProps>(
  () => import("./visualizers/DiscoBall").then((mod) => mod.DiscoBall),
  { ssr: false, loading: () => null },
)

const BlackHole = dynamic<Visualizer3DRendererProps>(
  () => import("./visualizers/BlackHole").then((mod) => mod.BlackHole),
  { ssr: false, loading: () => null },
)

// HIGH FIDELITY: Tighter bloom radius and higher threshold for sharper, defined glow
const BLOOM_SETTINGS = {
  "explosion": { threshold: 0.6, intensity: 0.65, radius: 0.14 },
  "black-hole": { threshold: 0.65, intensity: 0.55, radius: 0.12 },
  "space-travel": { threshold: 0.6, intensity: 0.5, radius: 0.17 },
  "disco-ball": { threshold: 0.55, intensity: 0.8, radius: 0.16 }
} as const

const CHROMATIC_OFFSET = new THREE.Vector2(0.0004, 0.0004)

export function Visualizer3D({
  bassLevel,
  midLevel,
  highLevel,
  style,
  performanceMode = false,
  postProcessing,
  enablePerformanceMonitoring = false,
  onPerformanceModeRecommended,
}: Visualizer3DProps) {
  const bloomSettings = BLOOM_SETTINGS[style.type as keyof typeof BLOOM_SETTINGS] || BLOOM_SETTINGS["explosion"]
  const postProcessingMode = performanceMode ? "off" : "full"
  const resolvedPostProcessing = postProcessing ?? postProcessingMode
  const shouldPostProcess = resolvedPostProcessing !== "off"
  const isLite = resolvedPostProcessing === "lite"

  const bloomIntensity = isLite ? bloomSettings.intensity * 0.65 : bloomSettings.intensity
  const bloomThreshold = isLite ? Math.max(0.05, bloomSettings.threshold - 0.15) : bloomSettings.threshold
  const bloomRadius = isLite ? bloomSettings.radius * 0.9 : bloomSettings.radius
  const sharedProps = { bassLevel, midLevel, highLevel, performanceMode }

  // STATIC bloom - particles already have audio reactivity built in
  // Reactive bloom on top of reactive particles creates double-pulsing artifact
  const chromaticOffset = useMemo(() => {
    return new THREE.Vector2(0.0004, 0.0004)
  }, [])

  return (
    <>
      {/* Performance monitoring - runs inside R3F context */}
      {enablePerformanceMonitoring && (
        <CinemaPerformanceMonitor
          enableLogging
          onPerformanceModeRecommended={onPerformanceModeRecommended}
        />
      )}

      {style.type === "explosion" && (
        <Cosmos {...sharedProps} />
      )}
      {style.type === "space-travel" && (
        <SpaceTravel {...sharedProps} />
      )}
      {style.type === "disco-ball" && (
        <DiscoBall {...sharedProps} />
      )}
      {style.type === "black-hole" && (
        <BlackHole {...sharedProps} />
      )}

      {shouldPostProcess &&
        (isLite ? (
          <EffectComposer enableNormalPass={false}>
            <Bloom
              luminanceThreshold={bloomThreshold}
              mipmapBlur={false}
              intensity={bloomIntensity}
              radius={bloomRadius}
            />
          </EffectComposer>
        ) : (
          <EffectComposer enableNormalPass={false}>
            <Bloom
              luminanceThreshold={bloomThreshold}
              mipmapBlur
              intensity={bloomIntensity}
              radius={bloomRadius}
            />
            <ChromaticAberration
              offset={chromaticOffset}
              radialModulation={false}
              modulationOffset={0}
            />
            {/* Subtle vignette for cinematic framing */}
            <Vignette
              offset={0.55}
              darkness={0.12}
              blendFunction={BlendFunction.NORMAL}
            />
          </EffectComposer>
        ))}
    </>
  )
}
