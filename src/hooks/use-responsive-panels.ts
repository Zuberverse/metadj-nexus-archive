import { useSyncExternalStore } from "react"
import { PANEL_POSITIONING } from "@/lib/app.constants"

/**
 * Debounce delay for resize events (ms)
 */
const RESIZE_DEBOUNCE_MS = 100

// Module-level cached window width for SSR/hydration
let cachedWidth: number | null = null

/**
 * Subscribe to window resize events with debouncing
 */
function subscribeToWindowResize(callback: () => void): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let rafId: number | null = null

  const debouncedHandleResize = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(() => {
        cachedWidth = window.innerWidth
        callback()
      })
    }, RESIZE_DEBOUNCE_MS)
  }

  window.addEventListener("resize", debouncedHandleResize)

  return () => {
    window.removeEventListener("resize", debouncedHandleResize)
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
  }
}

/**
 * Get current window width (client-side snapshot)
 */
function getWindowWidthSnapshot(): number {
  if (cachedWidth === null) {
    cachedWidth = window.innerWidth
  }
  return cachedWidth
}

/**
 * Get server-side snapshot (fallback value)
 */
function getServerSnapshot(): number {
  return PANEL_POSITIONING.LEFT_PANEL.MIN_SCREEN_WIDTH
}

/**
 * Determines whether the side-panel layout should be used based on viewport width.
 * Falls back to overlay experience on tablet/mobile breakpoints.
 *
 * Features:
 * - Uses React 18+ useSyncExternalStore for proper hydration
 * - Debounced resize handling to prevent layout thrashing
 * - Uses requestAnimationFrame for smooth updates
 */
export function useResponsivePanels() {
  // Use useSyncExternalStore for proper hydration and external state subscription
  const windowWidth = useSyncExternalStore(
    subscribeToWindowResize,
    getWindowWidthSnapshot,
    getServerSnapshot
  )

  const shouldUseSidePanels =
    windowWidth >= Math.min(PANEL_POSITIONING.LEFT_PANEL.MIN_SCREEN_WIDTH, PANEL_POSITIONING.RIGHT_PANEL.MIN_SCREEN_WIDTH)

  return {
    shouldUseSidePanels,
    windowWidth,
    isHydrated: true, // Always true with useSyncExternalStore
  }
}
