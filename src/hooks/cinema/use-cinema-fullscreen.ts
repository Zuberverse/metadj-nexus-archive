/**
 * Cinema Fullscreen Management Hook
 *
 * Manages browser Fullscreen API integration, focus management, and keyboard controls.
 * Desktop-only feature that syncs app state with browser fullscreen state.
 *
 * @module hooks/cinema/use-cinema-fullscreen
 */

import { useEffect, useRef, useCallback } from "react"

interface UseCinemaFullscreenOptions {
  /**
   * Current fullscreen state
   */
  isFullscreen: boolean
  /**
   * Callback to update fullscreen state
   */
  onFullscreenToggle: (next: boolean) => void
  /**
   * Whether Cinema is currently enabled
   */
  enabled: boolean
  /**
   * Whether side panels are visible (desktop mode)
   */
  shouldUseSidePanels: boolean
  /**
   * Ref to the dialog/container element for focus management
   */
  dialogRef: React.RefObject<HTMLDivElement | null>
}

interface UseCinemaFullscreenReturn {
  /**
   * Toggle fullscreen state (uses browser API when available)
   */
  handleFullscreenToggle: () => void
  /**
   * Ref to previously focused element (for focus restoration)
   */
  previousFocusRef: React.RefObject<HTMLElement | null>
}

/**
 * Hook for managing cinema fullscreen functionality
 *
 * Handles:
 * - Browser Fullscreen API integration
 * - Escape key to exit fullscreen
 * - Focus management (trap focus in fullscreen, restore on exit)
 * - Sync with browser fullscreen state changes
 * - "F" keyboard shortcut on desktop
 */
export function useCinemaFullscreen({
  isFullscreen,
  onFullscreenToggle,
  enabled,
  shouldUseSidePanels,
  dialogRef,
}: UseCinemaFullscreenOptions): UseCinemaFullscreenReturn {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Desktop-only fullscreen toggle (uses browser Fullscreen API when available)
  const handleFullscreenToggle = useCallback(() => {
    const shouldEnter = !isFullscreen

    if (typeof document === "undefined") {
      onFullscreenToggle(shouldEnter)
      return
    }

    if (shouldEnter) {
      onFullscreenToggle(true)
      if (typeof document.documentElement.requestFullscreen === "function") {
        void document.documentElement.requestFullscreen().catch(() => {
          // Fall back to internal overlay fullscreen
        })
      }
      return
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {
        // ignore
      })
    }
    onFullscreenToggle(false)
  }, [isFullscreen, onFullscreenToggle])

  // Keep state in sync with the browser Fullscreen API (desktop)
  // Also sync on visibility change to handle alt-tab scenarios
  useEffect(() => {
    if (typeof document === "undefined") return

    const syncFullscreenState = () => {
      const browserIsFullscreen = !!document.fullscreenElement
      // Sync app state with browser state (handles both enter and exit)
      if (browserIsFullscreen !== isFullscreen) {
        onFullscreenToggle(browserIsFullscreen)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncFullscreenState()
      }
    }

    document.addEventListener("fullscreenchange", syncFullscreenState)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [isFullscreen, onFullscreenToggle])

  // Focus management for fullscreen modal dialog
  // When entering fullscreen, focus moves to the dialog to trap focus properly
  // When exiting fullscreen, focus returns to previously focused element
  useEffect(() => {
    if (isFullscreen) {
      // Store current focus before moving to fullscreen
      previousFocusRef.current = document.activeElement as HTMLElement | null
      // Focus the dialog container for keyboard navigation
      dialogRef.current?.focus()
    } else if (previousFocusRef.current) {
      // Restore focus when exiting fullscreen
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [isFullscreen, dialogRef])

  // Escape closes fullscreen (browser fullscreen when active, otherwise internal overlay)
  useEffect(() => {
    if (!isFullscreen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (typeof document !== "undefined" && document.fullscreenElement) {
          void document.exitFullscreen().catch(() => {
            // ignore
          })
        } else {
          onFullscreenToggle(false)
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen, onFullscreenToggle])

  // Keyboard shortcut: "F" toggles fullscreen on desktop when Cinema is open
  useEffect(() => {
    if (!enabled || !shouldUseSidePanels) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target && target.isContentEditable)
      ) {
        return
      }
      if (event.key === "f" || event.key === "F") {
        event.preventDefault()
        handleFullscreenToggle()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [enabled, shouldUseSidePanels, handleFullscreenToggle])

  return {
    handleFullscreenToggle,
    previousFocusRef,
  }
}
