"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { useCspStyle } from "@/hooks/use-csp-style"
import { useReducedMotion } from "@/lib/motion-utils"
import { Visualizer2D } from "./Visualizer2D"
import type { VisualizerStyle } from "@/data/scenes"

// Lazy load 3D visualizer to avoid loading Three.js bundle on mobile/2D views
const Visualizer3D = dynamic(() => import("./Visualizer3D").then(mod => mod.Visualizer3D), {
  ssr: false,
})
const Canvas = dynamic(() => import("@react-three/fiber").then(mod => mod.Canvas), {
  ssr: false,
})

interface VisualizerCinemaProps {
  /** When false, pauses all rendering work. */
  active?: boolean
  bassLevel: number
  midLevel: number
  highLevel: number
  style: VisualizerStyle
  /** Stable seed for track-scoped visual variation. */
  seed?: number
  /** When true, renders with lower GPU/CPU cost. */
  performanceMode?: boolean
  /** Postprocessing preset for the 3D renderer. */
  postProcessing?: "off" | "lite" | "full"
  /** Optional callback for capturing the underlying <canvas> element (2D or 3D). */
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  /** Enable performance monitoring and logging for 3D scenes */
  enablePerformanceMonitoring?: boolean
  /** Callback when performance mode is recommended due to low FPS */
  onPerformanceModeRecommended?: () => void
}

// No memo - audio levels must flow through on every frame for reactive visualizers
export function VisualizerCinema({
  active = true,
  bassLevel,
  midLevel,
  highLevel,
  style,
  seed,
  performanceMode = false,
  postProcessing,
  onCanvasReady,
  enablePerformanceMonitoring = false,
  onPerformanceModeRecommended,
}: VisualizerCinemaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [opacity, setOpacity] = useState(1)
  const [currentStyle, setCurrentStyle] = useState(style)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const targetStyleRef = useRef(style)

  // Respect user's reduced motion preference - enables performance mode for simpler animations
  const prefersReducedMotion = useReducedMotion()
  const effectivePerformanceMode = performanceMode || prefersReducedMotion

  // Intensity scaling: currently only used to keep "subtle" scenes gentler.
  // Intense scenes remain unchanged to preserve the established premium look.
  const intensityScale = useMemo(() => {
    switch (currentStyle.intensity) {
      case "subtle":
        return 0.9
      case "moderate":
        return 1
      default:
        return 1
    }
  }, [currentStyle.intensity])

  const scaledBass = Math.min(1, bassLevel * intensityScale)
  const scaledMid = Math.min(1, midLevel * intensityScale)
  const scaledHigh = Math.min(1, highLevel * intensityScale)

  const renderer = currentStyle.renderer ?? "2d"
  const resolvedPostProcessing = postProcessing ?? (effectivePerformanceMode ? "off" : "full")

  // Simple transition: any style change triggers fade-out, swap, fade-in
  useEffect(() => {
    targetStyleRef.current = style

    if (style.type !== currentStyle.type) {
      // Clear any pending transition
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Start fade-out
      setOpacity(0)

      // After fade-out completes, swap style and fade-in
      timeoutRef.current = setTimeout(() => {
        // Use latest target in case it changed during fade-out
        setCurrentStyle(targetStyleRef.current)
        setOpacity(1)
        timeoutRef.current = null
      }, 300)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [style, currentStyle.type])

  // Expose the rendered canvas element (for Dream capture) once mounted.
  useEffect(() => {
    if (!onCanvasReady) return
    let canceled = false

    const sync = () => {
      if (canceled) return
      const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null
      onCanvasReady(canvas)
    }

    // Sync immediately and once more after paint (R3F canvas can mount async).
    sync()
    const raf = requestAnimationFrame(sync)

    return () => {
      canceled = true
      cancelAnimationFrame(raf)
      onCanvasReady(null)
    }
  }, [onCanvasReady, renderer, currentStyle.type])

  const containerStyleId = useCspStyle({
    opacity,
    transition: "opacity 300ms ease-in-out",
  })

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      data-csp-style={containerStyleId}
    >
      {renderer === "3d" ? (
        <Canvas
          frameloop={active ? "always" : "never"}
          dpr={effectivePerformanceMode ? 1 : [1, 1.5]}
          camera={{ position: [0, 0, 15], fov: 45 }}
          gl={{
            antialias: false,
            alpha: false,
            stencil: false,
            depth: false,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance",
          }}
        >
          <Visualizer3D
            bassLevel={scaledBass}
            midLevel={scaledMid}
            highLevel={scaledHigh}
            style={currentStyle}
            performanceMode={effectivePerformanceMode}
            postProcessing={resolvedPostProcessing}
            enablePerformanceMonitoring={enablePerformanceMonitoring}
            onPerformanceModeRecommended={onPerformanceModeRecommended}
          />
        </Canvas>
      ) : (
        <Visualizer2D
          active={active}
          bassLevel={scaledBass}
          midLevel={scaledMid}
          highLevel={scaledHigh}
          style={currentStyle}
          seed={seed}
          performanceMode={effectivePerformanceMode}
        />
      )}
    </div>
  )
}
