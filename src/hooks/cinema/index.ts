/**
 * Cinema Hooks Domain
 *
 * Hooks for visual experience layer, video playback, and cinema controls.
 */

export { useCinema } from "./use-cinema"
export { useCinemaVideo } from "./use-cinema-video"
export { useCinemaControls } from "./use-cinema-controls"
export { useCinemaAnalytics } from "./use-cinema-analytics"
export {
  useCinemaPerformance,
  CinemaPerformanceMonitor,
  PERFORMANCE_THRESHOLDS,
  type CinemaPerformanceMetrics,
} from "./use-cinema-performance"
export { useWebcamCapture } from "./use-webcam-capture"
export { useCinemaScene } from "./use-cinema-scene"
export { useCinemaFullscreen } from "./use-cinema-fullscreen"
