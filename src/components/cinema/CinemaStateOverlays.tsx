"use client"

import { Loader2, Play, Camera } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { Scene } from "@/data/scenes"

interface CinemaVideoErrorProps {
  currentScene: Scene
  controlsVisible: boolean
  onTap: (e: React.MouseEvent | React.TouchEvent) => void
  onRetry: () => void
}

/**
 * CinemaVideoError - Error state overlay when video fails to load
 */
export function CinemaVideoError({
  currentScene,
  controlsVisible,
  onTap,
  onRetry,
}: CinemaVideoErrorProps) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-black text-white ${controlsVisible ? 'pointer-events-none' : ''}`}
      onClick={onTap}
      onTouchStart={onTap}
    >
      <div className="rounded-full border border-(--border-elevated) bg-(--glass-strong) px-4 py-1 text-xs uppercase tracking-[0.4em] text-(--text-muted) pointer-events-none">
        Video Failed to Load
      </div>
      <p className="mt-4 max-w-sm px-6 text-center text-sm text-(--text-subtle) pointer-events-none">
        Unable to load &quot;{currentScene.name}&quot; scene.
      </p>
      <p className="mt-2 max-w-sm px-6 text-center text-xs text-(--text-subtle) pointer-events-none">
        Audio playback continues normally. Try switching scenes or refreshing the page.
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRetry();
        }}
        className="mt-4 rounded-full border border-(--border-subtle) px-4 py-2 text-sm text-(--text-muted) transition hover:border-(--border-active) hover:text-white focus-ring pointer-events-auto"
      >
        Retry Loading
      </button>
    </div>
  )
}

interface CinemaLoadingStateProps {
  currentScene: Scene
  isPlaceholder: boolean
  controlsVisible: boolean
  onTap: (e: React.MouseEvent | React.TouchEvent) => void
}

/**
 * CinemaLoadingState - Loading spinner and placeholder state overlay
 */
export function CinemaLoadingState({
  currentScene,
  isPlaceholder,
  controlsVisible,
  onTap,
}: CinemaLoadingStateProps) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black text-center text-white ${controlsVisible ? 'pointer-events-none' : ''}`}
      onClick={onTap}
      onTouchStart={onTap}
    >
      <Loader2 className="h-12 w-12 animate-spin text-purple-400 pointer-events-none" role="status" aria-label="Loading cinema scene" />
      <div className="rounded-full border border-(--border-elevated) bg-(--glass-strong) px-4 py-1 text-xs uppercase tracking-[0.4em] text-(--text-muted) pointer-events-none">
        {isPlaceholder ? `${currentScene.name} Coming Soon` : "Loading Cinema"}
      </div>
      <span className="sr-only">{isPlaceholder ? `${currentScene.name} scene coming soon` : "Loading cinema video, please wait"}</span>
    </div>
  )
}

interface CinemaAwaitingMusicProps {
  controlsVisible: boolean
  onTap: (e: React.MouseEvent | React.TouchEvent) => void
}

/**
 * CinemaAwaitingMusic - Shown when cinema is ready but no track is playing
 */
export function CinemaAwaitingMusic({
  controlsVisible,
  onTap,
}: CinemaAwaitingMusicProps) {
  return (
    <div
      className={`absolute inset-0 ${controlsVisible ? 'pointer-events-none' : ''}`}
      onClick={onTap}
      onTouchStart={onTap}
    >
      <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
        <span className="rounded-full border border-white/30 backdrop-blur-md px-4 py-2 text-xs uppercase tracking-[0.35em] text-white">
          Play Audio to Activate
        </span>
      </div>
    </div>
  )
}


interface CinemaWebcamErrorProps {
  webcamError: string
  onRetry: () => void
  onCancel: () => void
}

/**
 * CinemaWebcamError - Webcam error overlay when camera access fails
 */
export function CinemaWebcamError({
  webcamError,
  onRetry,
  onCancel,
}: CinemaWebcamErrorProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-50">
      <Camera className="h-12 w-12 text-red-400 mb-4" />
      <h3 className="text-lg font-bold text-red-400">Camera Access Required</h3>
      <p className="text-sm text-white/70 max-w-sm text-center mb-6">
        {webcamError}
      </p>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
        >
          Retry
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface CinemaWebGLContextLossProps {
  isRecovering: boolean
  onSwitchTo2D?: () => void
  controlsVisible: boolean
  onTap: (e: React.MouseEvent | React.TouchEvent) => void
}

/**
 * CinemaWebGLContextLoss - WebGL context loss recovery overlay
 *
 * Shown when the WebGL context is lost (GPU memory pressure, tab backgrounding, etc.).
 * Provides visual feedback during automatic recovery and option to switch to 2D visualizer.
 */
export function CinemaWebGLContextLoss({
  isRecovering,
  onSwitchTo2D,
  controlsVisible,
  onTap,
}: CinemaWebGLContextLossProps) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-40 ${controlsVisible ? 'pointer-events-none' : ''}`}
      onClick={onTap}
      onTouchStart={onTap}
    >
      {/* Animated recovery indicator */}
      <div className="relative mb-6">
        {isRecovering ? (
          <>
            {/* Pulsing ring animation */}
            <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/30 [animation-duration:1.5s]" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-purple-400/50 bg-purple-500/20 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
            </div>
          </>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/20 backdrop-blur-sm">
            <svg className="h-8 w-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="rounded-full border border-(--border-elevated) bg-(--glass-strong) px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-(--text-muted) pointer-events-none mb-3">
        {isRecovering ? "Recovering Graphics" : "Graphics Interrupted"}
      </div>

      {/* Description */}
      <p className="max-w-sm px-6 text-center text-sm text-(--text-subtle) pointer-events-none mb-2">
        {isRecovering
          ? "Restoring WebGL context. This happens when the GPU needs to reclaim memory."
          : "WebGL context was lost. The visualizer will attempt to recover automatically."}
      </p>

      {/* Progress indicator */}
      {isRecovering && (
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-2 mb-4 pointer-events-none">
          <div
            className="h-full gradient-4 rounded-full animate-pulse w-[60%] [animation-duration:1.5s]"
          />
        </div>
      )}

      {/* Fallback option */}
      {onSwitchTo2D && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSwitchTo2D()
          }}
          className="mt-4 rounded-full border border-(--border-subtle) px-4 py-2 text-sm text-(--text-muted) transition hover:border-(--border-active) hover:text-white focus-ring pointer-events-auto"
        >
          Switch to 2D Visualizer
        </button>
      )}

      {/* Audio continues notice */}
      <p className="mt-4 text-xs text-(--text-subtle)/70 pointer-events-none">
        Audio playback continues normally
      </p>
    </div>
  )
}
