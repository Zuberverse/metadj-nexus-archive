/**
 * Shell Component Types
 *
 * Shared type definitions for Desktop and Mobile shell components.
 * Extracted to prevent drift between shell implementations.
 *
 * @module types/shell.types
 */

import type { DaydreamPresentation, DaydreamStatus } from "@/types/daydream.types"
import type { RefObject } from "react"

/**
 * Cinema state shared between Desktop and Mobile shells.
 *
 * Controls the immersive visual experience including:
 * - Video playback state and controls
 * - Fullscreen mode
 * - Dream (AI avatar) integration
 */
export interface CinemaState {
  enabled: boolean
  keepMounted: boolean
  controlsVisible: boolean
  videoError: boolean
  videoReady: boolean
  posterOnly: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  dialogRef: RefObject<HTMLDivElement | null>
  isFullscreen: boolean
  onToggle: () => void
  onFullscreenToggle: (fullscreen: boolean) => void
  onVideoError: (event: React.SyntheticEvent<HTMLVideoElement, Event>) => void
  onVideoLoadedData: () => void
  retryVideo: () => void
  resetControlsTimer: () => void
  hideControlsImmediately: () => void
  // Dream state
  dream: {
    status: DaydreamStatus
    isConfigured: boolean | null
    overlayReady: boolean
    startDream: () => Promise<void>
    stopDream: () => Promise<void>
    retryDream: () => Promise<void>
    forceSync: () => void
    intermediateCanvasRef: RefObject<HTMLCanvasElement | null>
    captureReadyRef: RefObject<boolean>
    presentation: DaydreamPresentation
    setPresentation: (next: DaydreamPresentation) => void
    promptBase: string
    setPromptBase: (next: string) => void
    // null = unknown, true = PATCH works, false = changes require restart
    patchSupported: boolean | null
  }
}

/**
 * Modal state shared between Desktop and Mobile shells.
 *
 * Tracks which modals/overlays are currently open.
 */
export interface ModalState {
  isWelcomeOpen: boolean
  isInfoOpen: boolean
  isCollectionDetailsOpen: boolean
  isKeyboardShortcutsOpen: boolean
  isMetaDjAiOpen: boolean
}
