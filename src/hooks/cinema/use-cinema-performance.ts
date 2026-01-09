/**
 * Cinema Performance Monitoring Hook
 *
 * Monitors 3D rendering performance metrics for the Cinema visualizer:
 * - FPS (frames per second)
 * - Frame time (ms per frame)
 * - Performance score (smoothed average)
 * - Auto-detects when performance mode should be recommended
 *
 * @module hooks/cinema/use-cinema-performance
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { logger } from "@/lib/logger"

/** Performance thresholds for quality recommendations */
export const PERFORMANCE_THRESHOLDS = {
  /** FPS below this triggers performance mode recommendation */
  LOW_FPS: 30,
  /** FPS below this is considered critical */
  CRITICAL_FPS: 20,
  /** Target FPS for smooth rendering */
  TARGET_FPS: 60,
  /** Frame time above this (ms) indicates sluggish rendering */
  SLOW_FRAME_MS: 33, // ~30fps
  /** Number of frames to sample for rolling average */
  SAMPLE_SIZE: 60,
  /** Interval (ms) for logging performance metrics */
  LOG_INTERVAL_MS: 10_000,
} as const

/** Performance metrics exposed by the hook */
export interface CinemaPerformanceMetrics {
  /** Current FPS (rolling average) */
  fps: number
  /** Current frame time in ms (rolling average) */
  frameTimeMs: number
  /** Performance score 0-100 (100 = excellent) */
  performanceScore: number
  /** Whether performance mode is recommended based on metrics */
  shouldRecommendPerformanceMode: boolean
  /** Number of frames below critical threshold */
  criticalFrameCount: number
  /** Total frames sampled */
  totalFramesSampled: number
}

interface UseCinemaPerformanceOptions {
  /** Enable logging performance metrics periodically */
  enableLogging?: boolean
  /** Callback when performance mode is recommended */
  onPerformanceModeRecommended?: () => void
  /** Override FPS threshold for recommendations */
  lowFpsThreshold?: number
}

/**
 * Hook for monitoring 3D Cinema rendering performance.
 *
 * Must be used within a React Three Fiber Canvas context.
 *
 * @example
 * ```tsx
 * function VisualizerWithMonitoring() {
 *   const { fps, shouldRecommendPerformanceMode } = useCinemaPerformance({
 *     enableLogging: true,
 *   })
 *
 *   return <MyVisualizer />
 * }
 * ```
 */
export function useCinemaPerformance(
  options: UseCinemaPerformanceOptions = {}
): CinemaPerformanceMetrics {
  const {
    enableLogging = false,
    onPerformanceModeRecommended,
    lowFpsThreshold = PERFORMANCE_THRESHOLDS.LOW_FPS,
  } = options

  // Rolling buffer for frame times (circular)
  const frameTimesRef = useRef<number[]>([])
  const frameIndexRef = useRef(0)
  const lastTimeRef = useRef(0)
  const lastLogTimeRef = useRef(0)
  const totalFramesRef = useRef(0)
  const criticalFramesRef = useRef(0)
  const hasRecommendedRef = useRef(false)
  const initializedRef = useRef(false)

  // State for exposing metrics
  const [metrics, setMetrics] = useState<CinemaPerformanceMetrics>({
    fps: PERFORMANCE_THRESHOLDS.TARGET_FPS,
    frameTimeMs: 16.67,
    performanceScore: 100,
    shouldRecommendPerformanceMode: false,
    criticalFrameCount: 0,
    totalFramesSampled: 0,
  })

  const calculateMetrics = useCallback((): CinemaPerformanceMetrics => {
    const frameTimes = frameTimesRef.current
    if (frameTimes.length === 0) {
      return {
        fps: PERFORMANCE_THRESHOLDS.TARGET_FPS,
        frameTimeMs: 16.67,
        performanceScore: 100,
        shouldRecommendPerformanceMode: false,
        criticalFrameCount: criticalFramesRef.current,
        totalFramesSampled: totalFramesRef.current,
      }
    }

    // Calculate rolling average frame time
    const avgFrameTime =
      frameTimes.reduce((sum, t) => sum + t, 0) / frameTimes.length
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 60

    // Performance score: 100 at 60fps, 0 at 0fps, clamped
    const performanceScore = Math.max(
      0,
      Math.min(100, (fps / PERFORMANCE_THRESHOLDS.TARGET_FPS) * 100)
    )

    // Recommend performance mode if FPS is consistently low
    const shouldRecommend =
      fps < lowFpsThreshold && frameTimes.length >= PERFORMANCE_THRESHOLDS.SAMPLE_SIZE / 2

    return {
      fps: Math.round(fps * 10) / 10,
      frameTimeMs: Math.round(avgFrameTime * 100) / 100,
      performanceScore: Math.round(performanceScore),
      shouldRecommendPerformanceMode: shouldRecommend,
      criticalFrameCount: criticalFramesRef.current,
      totalFramesSampled: totalFramesRef.current,
    }
  }, [lowFpsThreshold])

  // Use R3F's useFrame for accurate frame timing
  useFrame(() => {
    const now = performance.now()

    // Initialize time refs on first frame (avoids impure call in useRef)
    if (!initializedRef.current) {
      initializedRef.current = true
      lastTimeRef.current = now
      lastLogTimeRef.current = now
      return
    }

    const delta = now - lastTimeRef.current
    lastTimeRef.current = now

    // Skip anomalous frame times (e.g., tab switch, debugger pause)
    if (delta > 500) return

    // Add to circular buffer
    const idx = frameIndexRef.current % PERFORMANCE_THRESHOLDS.SAMPLE_SIZE
    frameTimesRef.current[idx] = delta
    frameIndexRef.current++
    totalFramesRef.current++

    // Track critical frames
    if (delta > 1000 / PERFORMANCE_THRESHOLDS.CRITICAL_FPS) {
      criticalFramesRef.current++
    }

    // Update metrics every ~30 frames for efficiency
    if (frameIndexRef.current % 30 === 0) {
      const newMetrics = calculateMetrics()
      setMetrics(newMetrics)

      // Fire recommendation callback once
      if (
        newMetrics.shouldRecommendPerformanceMode &&
        !hasRecommendedRef.current &&
        onPerformanceModeRecommended
      ) {
        hasRecommendedRef.current = true
        onPerformanceModeRecommended()
      }
    }

    // Periodic logging
    if (enableLogging && now - lastLogTimeRef.current > PERFORMANCE_THRESHOLDS.LOG_INTERVAL_MS) {
      lastLogTimeRef.current = now
      const currentMetrics = calculateMetrics()
      logger.debug("Cinema 3D performance metrics", {
        fps: currentMetrics.fps,
        frameTimeMs: currentMetrics.frameTimeMs,
        performanceScore: currentMetrics.performanceScore,
        criticalFrames: currentMetrics.criticalFrameCount,
        totalFrames: currentMetrics.totalFramesSampled,
      })
    }
  })

  // Reset on unmount
  useEffect(() => {
    return () => {
      frameTimesRef.current = []
      frameIndexRef.current = 0
      totalFramesRef.current = 0
      criticalFramesRef.current = 0
      hasRecommendedRef.current = false
      initializedRef.current = false
    }
  }, [])

  return metrics
}

/**
 * Lightweight performance monitor component for use inside Canvas.
 *
 * Use this when you need performance metrics but don't want to
 * restructure existing components.
 *
 * @example
 * ```tsx
 * <Canvas>
 *   <CinemaPerformanceMonitor
 *     onMetricsUpdate={(m) => console.log(m.fps)}
 *   />
 *   <MyVisualizer />
 * </Canvas>
 * ```
 */
export function CinemaPerformanceMonitor({
  onMetricsUpdate,
  enableLogging = false,
  onPerformanceModeRecommended,
}: {
  onMetricsUpdate?: (metrics: CinemaPerformanceMetrics) => void
  enableLogging?: boolean
  onPerformanceModeRecommended?: () => void
}) {
  const metrics = useCinemaPerformance({
    enableLogging,
    onPerformanceModeRecommended,
  })

  // Report metrics to parent
  useEffect(() => {
    onMetricsUpdate?.(metrics)
  }, [metrics, onMetricsUpdate])

  return null
}
