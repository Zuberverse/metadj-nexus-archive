"use client"

import { useMemo } from "react"
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing"
import { BlendFunction } from "postprocessing"
import * as THREE from "three"
import { BlackHole } from "./visualizers/BlackHole"
import { Cosmos } from "./visualizers/Cosmos"
import { DiscoBall } from "./visualizers/DiscoBall"
import { SpaceTravel } from "./visualizers/SpaceTravel"
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
}

const BLOOM_SETTINGS = {
  "explosion": { threshold: 0.35, intensity: 0.75, radius: 0.28 },
  "black-hole": { threshold: 0.1, intensity: 1.0, radius: 0.3 },
  "space-travel": { threshold: 0.55, intensity: 0.35, radius: 0.2 },
  "disco-ball": { threshold: 0.25, intensity: 0.9, radius: 0.35 }
} as const

const CHROMATIC_OFFSET = new THREE.Vector2(0.002, 0.002)

export function Visualizer3D({
  bassLevel,
  midLevel,
  highLevel,
  style,
  performanceMode = false,
  postProcessing,
}: Visualizer3DProps) {
  const bloomSettings = BLOOM_SETTINGS[style.type as keyof typeof BLOOM_SETTINGS] || BLOOM_SETTINGS["explosion"]
  const postProcessingMode = performanceMode ? "off" : "full"
  const resolvedPostProcessing = postProcessing ?? postProcessingMode
  const shouldPostProcess = resolvedPostProcessing !== "off"
  const isLite = resolvedPostProcessing === "lite"

  const bloomIntensity = isLite ? bloomSettings.intensity * 0.65 : bloomSettings.intensity
  const bloomThreshold = isLite ? Math.max(0.05, bloomSettings.threshold - 0.15) : bloomSettings.threshold
  const bloomRadius = isLite ? bloomSettings.radius * 0.9 : bloomSettings.radius

  // Reactive enhancements: scale intensity with bass and threshold with highs
  const reactiveIntensity = bloomIntensity * (1.0 + bassLevel * 0.5)
  const reactiveThreshold = Math.max(0.01, bloomThreshold - highLevel * 0.1)

  const reactiveChromaticOffset = useMemo(() => {
    // Physical impact: bass causes a global shudder, highs cause spectral spikes
    const impact = bassLevel * 0.005 + highLevel * 0.008
    return new THREE.Vector2(0.001 + impact, 0.001 + impact)
  }, [bassLevel, highLevel])

  return (
    <>
      {style.type === "explosion" && (
        <Cosmos bassLevel={bassLevel} midLevel={midLevel} highLevel={highLevel} performanceMode={performanceMode} />
      )}
      {style.type === "space-travel" && (
        <SpaceTravel bassLevel={bassLevel} midLevel={midLevel} highLevel={highLevel} performanceMode={performanceMode} />
      )}
      {style.type === "disco-ball" && (
        <DiscoBall bassLevel={bassLevel} midLevel={midLevel} highLevel={highLevel} performanceMode={performanceMode} />
      )}
      {style.type === "black-hole" && (
        <BlackHole bassLevel={bassLevel} midLevel={midLevel} highLevel={highLevel} performanceMode={performanceMode} />
      )}

      {shouldPostProcess &&
        (isLite ? (
          <EffectComposer enableNormalPass={false}>
            <Bloom
              luminanceThreshold={reactiveThreshold}
              mipmapBlur={false}
              intensity={reactiveIntensity}
              radius={bloomRadius}
            />
          </EffectComposer>
        ) : (
          <EffectComposer enableNormalPass={false}>
            <Bloom
              luminanceThreshold={reactiveThreshold}
              mipmapBlur
              intensity={reactiveIntensity}
              radius={bloomRadius}
            />
            <ChromaticAberration
              offset={reactiveChromaticOffset}
              radialModulation={false}
              modulationOffset={0}
            />
            {/* Subtle vignette for cinematic framing */}
            <Vignette
              offset={0.4}
              darkness={0.35}
              blendFunction={BlendFunction.NORMAL}
            />
          </EffectComposer>
        ))}
    </>
  )
}
