"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Maximize2, Minimize2, Send, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { usePlayer } from "@/contexts/PlayerContext"
import { useUI } from "@/contexts/UIContext"
import {
  SCENES,
  VISUALIZER_SCENES,
  isVisualizer,
  type Scene
} from "@/data/scenes"
import { useAudioAnalyzer } from "@/hooks/audio/use-audio-analyzer"
import { useCinemaFullscreen } from "@/hooks/cinema/use-cinema-fullscreen"
import { useCinemaScene } from "@/hooks/cinema/use-cinema-scene"
import { useWebcamCapture } from "@/hooks/cinema/use-webcam-capture"
import { useCspStyle } from "@/hooks/use-csp-style"
import { useResponsivePanels } from "@/hooks/use-responsive-panels"
import { trackSceneChanged } from "@/lib/analytics"
import { buildVideoSources } from "@/lib/cinema/video-utils"
import { DREAM_PROMPT_DEFAULT, DREAM_PROMPT_BASE } from "@/lib/daydream/config"
import { logger } from "@/lib/logger"
import { combineSeeds } from "@/lib/visualizers/seed"
import { CinemaDreamControls } from "./CinemaDreamControls"
import { CinemaSceneSelector } from "./CinemaSceneSelector"
import {
  CinemaVideoError,
  CinemaLoadingState,
  CinemaAwaitingMusic,
  CinemaWebcamError,
  CinemaWebGLContextLoss,
} from "./CinemaStateOverlays"
import { VisualizerCinema } from "./VisualizerCinema"
import type { Track } from "@/types"
import type { DaydreamPresentation, DaydreamStatus } from "@/types/daydream.types"

interface CinemaOverlayProps {
  // Cinema state
  enabled: boolean
  controlsVisible: boolean
  videoError: boolean
  videoReady: boolean
  posterOnly: boolean

  // Dream state
  dream: {
    status: DaydreamStatus
    isConfigured: boolean | null
    overlayReady: boolean
    startDream: () => Promise<void>
    stopDream: () => Promise<void>
    retryDream: () => Promise<void>
    forceSync: () => void
    intermediateCanvasRef: React.RefObject<HTMLCanvasElement | null>
    captureReadyRef: React.RefObject<boolean>
    presentation: DaydreamPresentation
    setPresentation: (next: DaydreamPresentation) => void
    promptBase: string
    setPromptBase: (next: string) => void
    // null = unknown, true = PATCH works, false = changes require restart
    patchSupported: boolean | null
  }

  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>
  dialogRef: React.RefObject<HTMLDivElement | null>

  // Player state
  currentTrack: Track | null
  shouldPlay: boolean

  // Layout
  headerHeight: number
  controlInsetLeft?: number
  controlInsetRight?: number

  // Handlers
  isFullscreen: boolean
  onFullscreenToggle: (next: boolean) => void
  onVideoError: (event: React.SyntheticEvent<HTMLVideoElement, Event>) => void
  onVideoLoadedData: () => void
  retryVideo: () => void
  resetControlsTimer: () => void
  hideControlsImmediately: () => void
}

/**
 * CinemaOverlay - Fullscreen immersive visual experience
 *
 * Provides a fullscreen visual cinema overlay with modes:
 * 1. Video Scenes - Pre-rendered looping video backgrounds
 * 2. Visualizers - Audio-reactive generated graphics (2D and 3D)
 *
 * Features:
 * - Video playback synced with audio track
 * - Audio-reactive visualizers using Web Audio API
 * - Hybrid rendering: HTML5 Canvas (2D) and React Three Fiber (3D)
 * - Categorized scene selector with clear separation
 * - Auto-hide controls after inactivity
 * - Keyboard controls (Space to play/pause audio)
 * - Error handling with graceful fallback
 * - Loading states
 *
 * This component manages the complete cinema experience including:
 * - Video element and playback
 * - Audio analyzer for visualizers
 * - Control visibility and auto-hide
 * - Error states and loading feedback
 * - Accessibility (ARIA labels, keyboard navigation)
 */

export function CinemaOverlay({
  enabled,
  controlsVisible,
  videoError,
  videoReady,
  videoRef,
  dialogRef,
  currentTrack,
  shouldPlay,
  headerHeight,
  controlInsetLeft = 0,
  controlInsetRight = 0,
  isFullscreen,
  onFullscreenToggle,
  onVideoError,
  onVideoLoadedData,
  retryVideo,
  resetControlsTimer,

  hideControlsImmediately,
  dream,
  posterOnly,
}: CinemaOverlayProps) {
  const { shouldUseSidePanels } = useResponsivePanels()
  const allow3DVisualizers = shouldUseSidePanels

  // Get audio element from PlayerContext for visualizer
  const { audioRef, play } = usePlayer()
  const [playerAudioElement, setPlayerAudioElement] = useState<HTMLAudioElement | null>(null)

  // Detect when modals are active to disable Cinema pointer events
  const { modals, setActiveView, openLeftPanel, selectedCollection } = useUI()
  const modalActive = modals.isQueueOpen || modals.isMetaDjAiOpen

  // Scene management (selection, persistence, device filtering)
  const {
    selectedScene,
    setSelectedScene,
    handleSceneSelect: baseHandleSceneSelect,
    currentScene,
    isSceneMenuOpen,
    setIsSceneMenuOpen,
    isSceneAllowedOnDevice,
    currentSceneRef,
  } = useCinemaScene({
    allow3DVisualizers,
    enabled,
    selectedCollectionId: selectedCollection,
  })

  // Fullscreen management (browser API, focus, keyboard)
  const { handleFullscreenToggle } = useCinemaFullscreen({
    isFullscreen,
    onFullscreenToggle,
    enabled,
    shouldUseSidePanels,
    dialogRef,
  })
  const [frameSize, setFrameSize] = useState<"default" | "small">("default")
  const [framePosition, setFramePosition] = useState<"center" | "bottom-center" | "bottom-left" | "bottom-right" | "top" | "bottom">("center")
  const [isOverlayHidden, setIsOverlayHidden] = useState(false)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const r3fCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [visualizerCanvasEl, setVisualizerCanvasEl] = useState<HTMLCanvasElement | null>(null)

  const isPerformanceMode = true

  // Dream state from props
  const {
    status: dreamStatus,
    isConfigured: dreamConfigured,
    overlayReady: dreamOverlayReady,
    startDream,
    stopDream,
    retryDream,
    forceSync: forceDreamSync,
    intermediateCanvasRef,
    captureReadyRef,
    presentation: dreamPresentation,
    setPresentation: setDreamPresentation,
    promptBase: dreamPromptBase,
    setPromptBase: setDreamPromptBase,
    patchSupported: dreamPatchSupported,
  } = dream

  const isDreamActive = dreamStatus.status === "connecting" || dreamStatus.status === "streaming"

  // Webcam capture (extracted hook manages acquisition and draw loop)
  const {
    webcamVideoRef,
    webcamReady,
    webcamError,
    retryWebcam,
  } = useWebcamCapture({
    isDreamActive,
    intermediateCanvasRef,
    captureReadyRef,
  })

  // Local state for editing the dream prompt
  const [editingPrompt, setEditingPrompt] = useState(dreamPromptBase)
  const [isSubmitAnimating, setIsSubmitAnimating] = useState(false)
  const [promptTextareaHeight, setPromptTextareaHeight] = useState("auto")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Prompt bar is temporarily disabled; flip to true to re-enable the UI.
  const promptBarEnabled = false
  const promptTextareaStyleId = useCspStyle({ height: promptTextareaHeight })

  // Sync editingPrompt when dreamPromptBase changes externally
  useEffect(() => {
    setEditingPrompt(dreamPromptBase)
  }, [dreamPromptBase])

  useEffect(() => {
    if (!promptBarEnabled) return
    const textarea = textareaRef.current
    if (!textarea) return
    setPromptTextareaHeight("auto")
    const frame = window.requestAnimationFrame(() => {
      setPromptTextareaHeight(`${Math.min(textarea.scrollHeight, 120)}px`)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [editingPrompt, promptBarEnabled])

  // Handle submitting the prompt - only force sync if text IS SAME (re-roll)
  // If text changed, the setDreamPromptBase update will trigger the natural sync effect in use-dream
  const handlePromptSubmit = useCallback(() => {
    const trimmed = editingPrompt.trim()
    if (trimmed) {
      // Trigger visual feedback animation on send button
      setIsSubmitAnimating(true)
      setTimeout(() => setIsSubmitAnimating(false), 150)

      // Check if prompt actually changed
      const hasChanged = trimmed !== dreamPromptBase

      // Update the prompt base (will trigger normal sync if text changed)
      setDreamPromptBase(trimmed)

      // Only force sync if text is the same (explicit user re-roll)
      // If we force sync on a generic change, we might race with the state update
      // and send the OLD prompt before the new one settles.
      if (!hasChanged) {
        logger.debug("[Dream] Forcing sync for same prompt (re-roll)")
        forceDreamSync()
      }
    }
  }, [editingPrompt, dreamPromptBase, setDreamPromptBase, forceDreamSync])

  // Handle resetting to the default prompt (applies immediately)
  const handlePromptReset = useCallback(() => {
    setEditingPrompt(DREAM_PROMPT_BASE)
    const alreadyDefault = dreamPromptBase === DREAM_PROMPT_BASE
    setDreamPromptBase(DREAM_PROMPT_BASE)
    // If we're already on the default, force a re-sync (treat like a re-roll)
    if (alreadyDefault) {
      logger.debug("[Dream] Forcing sync for reset-to-default (re-roll)")
      forceDreamSync()
    }
  }, [dreamPromptBase, setDreamPromptBase, forceDreamSync])

  // Handle keyboard events for the prompt textarea - Enter submits, Shift+Enter inserts a newline
  const handlePromptKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handlePromptSubmit()
    }
  }, [handlePromptSubmit])

  const [webglContextLost, setWebglContextLost] = useState(false)
  const [webglRecovering, setWebglRecovering] = useState(false)
  const handleVisualizerCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    r3fCanvasRef.current = canvas
    setVisualizerCanvasEl(canvas)
  }, [])

  // Fade transition state for smooth enter/exit
  const [isVisible, setIsVisible] = useState(enabled)
  const [opacity, setOpacity] = useState(enabled ? 1 : 0)
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current)
      fadeTimeoutRef.current = null
    }

    if (enabled) {
      // Entering: show immediately, then fade in
      setIsVisible(true)
      // Small delay to ensure visibility is applied before opacity transition
      requestAnimationFrame(() => {
        setOpacity(1)
      })
    } else {
      // Exiting: fade out, then hide
      setOpacity(0)
      fadeTimeoutRef.current = setTimeout(() => {
        setIsVisible(false)
      }, 250) // Match transition duration
    }

    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current)
      }
    }
  }, [enabled])

  // currentScene is provided by useCinemaScene hook
  const isVisualizerScene = isVisualizer(currentScene)
  const videoSources = useMemo(() => buildVideoSources(currentScene), [currentScene])
  const hasVideoSource = videoSources.length > 0

  // Audio analyzer for visualizers (only active when visualizer is selected)
  const analyzerData = useAudioAnalyzer({
    audioElement: playerAudioElement,
    enabled: enabled && isVisualizerScene && shouldPlay,
    fftSize: 256,
    smoothingTimeConstant: 0.8,
  })

  // Track the shared audio element for the analyzer.
  // audioRef is stable (never changes), so we poll until the element is available.
  // This ensures the analyzer gets the real audio element once PlayerContext mounts it.
  useEffect(() => {
    // If we already have it, we're done
    if (playerAudioElement) return

    // Poll for the audio element until it's available
    const checkAudioElement = () => {
      if (audioRef.current && audioRef.current !== playerAudioElement) {
        setPlayerAudioElement(audioRef.current)
      }
    }

    // Check immediately
    checkAudioElement()

    // Then poll every 100ms until we get it
    const interval = setInterval(checkAudioElement, 100)

    return () => clearInterval(interval)
  }, [audioRef, playerAudioElement])

  const hideControlsWithGrace = useCallback((delay = 150) => {
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current)
    }
    graceTimeoutRef.current = setTimeout(() => {
      hideControlsImmediately()
      graceTimeoutRef.current = null
    }, delay)
  }, [hideControlsImmediately])

  const resetControlsTimerWithCancel = useCallback(() => {
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current)
      graceTimeoutRef.current = null
    }
    resetControlsTimer()
  }, [resetControlsTimer])

  const handleCinemaTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current)
      graceTimeoutRef.current = null
    }
    resetControlsTimer()
  }, [resetControlsTimer])

  // Close scene dropdown when controls are hidden OR Cinema is disabled
  // Consolidated from two separate useEffect hooks to reduce overhead
  useEffect(() => {
    if ((!controlsVisible || !enabled) && isSceneMenuOpen) {
      setIsSceneMenuOpen(false)
    }
  }, [controlsVisible, enabled, isSceneMenuOpen])

  useEffect(() => {
    return () => {
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled && dreamStatus.status !== "idle") {
      logger.debug('[CinemaOverlay] Stopping Dream because enabled prop became false')
      void stopDream()
    }
  }, [dreamStatus.status, enabled, stopDream])

  // Reset overlay hidden state when Dream stops so it's visible by default next time
  useEffect(() => {
    if (dreamStatus.status === "idle") {
      setIsOverlayHidden(false)
    }
  }, [dreamStatus.status])

  // Lifecycle debugging (webcam cleanup is handled by useWebcamCapture hook)
  useEffect(() => {
    logger.debug('[CinemaOverlay] Mounted')
    return () => {
      logger.debug('[CinemaOverlay] Unmounted')
    }
  }, [])

  // Monitor WebGL context loss on R3F canvas
  useEffect(() => {
    const canvas = visualizerCanvasEl
    if (!canvas) return

    const handleContextLost = (e: Event) => {
      e.preventDefault()
      logger.warn('[Cinema] WebGL context lost - attempting recovery')
      setWebglContextLost(true)
      setWebglRecovering(true)
    }

    const handleContextRestored = () => {
      logger.info('[Cinema] WebGL context restored')
      setWebglContextLost(false)
      setWebglRecovering(false)
    }

    canvas.addEventListener("webglcontextlost", handleContextLost)
    canvas.addEventListener("webglcontextrestored", handleContextRestored)

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost)
      canvas.removeEventListener("webglcontextrestored", handleContextRestored)
    }
  }, [visualizerCanvasEl])

  // Handle seamless scene switching - reload video when scene changes
  useEffect(() => {
    // Skip if scene hasn't actually changed (currentSceneRef is managed by hook)
    if (currentSceneRef.current === selectedScene) return

    const video = videoRef.current
    const scene = SCENES.find(s => s.id === selectedScene)

    // Only handle video loading for video scenes
    const sceneHasVideo = Boolean(
      scene?.videoPath ||
      scene?.videoWebmPath ||
      scene?.videoMobilePath ||
      scene?.videoFallbackPath
    )

    if (!video || !scene || !sceneHasVideo || isVisualizer(scene)) return

    // Handler to resume playback once video is loaded
    const handleLoadedData = () => {
      // Play if there's a track and audio is playing
      if (!posterOnly && currentTrack && shouldPlay) {
        video.play().catch(() => {
          // Autoplay may fail, that's okay
        })
      }
      video.removeEventListener('loadeddata', handleLoadedData)
    }

    // Wait for video to load before attempting playback.
    // Sources are managed via <source> tags; call load() when the scene changes.
    video.addEventListener('loadeddata', handleLoadedData)
    if (!posterOnly) {
      video.load()
    }

    // Cleanup listener if component unmounts during load
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
    }
  }, [selectedScene, shouldPlay, currentTrack, videoRef, posterOnly, currentSceneRef])

  // Studio feature: Handle tab visibility changes to resume video/stream
  // This prevents video freezing when the tab is backgrounded for a long time
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Resume video if needed
        if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
          // Verify it's actually playing, if not, kick it
          videoRef.current.play().catch(() => { })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [videoRef])

  // Dream toggle handler - must be before early return to satisfy hooks rules
  const handleDreamToggle = useCallback(() => {
    if (dreamStatus.status === "idle" || dreamStatus.status === "error") {
      void startDream()
    } else {
      void stopDream()
    }
  }, [dreamStatus.status, startDream, stopDream])

  const isPlaceholderScene = !isVisualizerScene && !hasVideoSource
  const effectiveReady = isVisualizerScene ? true : (posterOnly ? true : videoReady)
  const effectiveError = isVisualizerScene ? false : (posterOnly ? false : videoError)

  // Calculate container height using dvh for better mobile viewport handling
  // dvh (dynamic viewport height) accounts for mobile browser chrome visibility changes


  // touch-action: manipulation prevents pinch zoom while allowing pan/scroll
  // Cinema always covers full viewport - only controls are inset from panels
  // Cinema uses fixed positioning to always cover full viewport
  // Non-fullscreen mode uses z-30 to stay below modals/panels; fullscreen uses z-40
  const containerClass = isFullscreen
    ? "fixed inset-0 z-40 overflow-hidden bg-black touch-manipulation h-[100dvh] w-[100dvw]"
    : `fixed inset-0 z-30 overflow-hidden bg-black touch-manipulation h-[100dvh] w-[100dvw] ${!shouldUseSidePanels ? 'pb-[72px]' : ''}`

  const containerRole = isFullscreen ? "dialog" : "region"
  const containerAriaModal = isFullscreen ? true : undefined
  const controlsInsetStyleId = useCspStyle({
    paddingLeft: `${controlInsetLeft}px`,
    paddingRight: `${controlInsetRight}px`,
    paddingTop: `${headerHeight}px`,
  })

  // Scene selection handler (wraps hook's handler with video retry and analytics)
  const handleSceneSelect = useCallback((scene: Scene) => {
    baseHandleSceneSelect(scene)
    // Reset video state when switching to a video scene for a fresh attempt
    const sceneHasVideo = Boolean(
      scene.videoPath ||
      scene.videoWebmPath ||
      scene.videoMobilePath ||
      scene.videoFallbackPath
    )
    if (!isVisualizer(scene) && sceneHasVideo && !posterOnly) {
      retryVideo()
    }
    try {
      trackSceneChanged(scene.id)
    } catch (error) {
      logger.debug('Analytics: trackSceneChanged failed', { sceneId: scene.id, error: String(error) })
    }
  }, [baseHandleSceneSelect, posterOnly, retryVideo])

  // Handler to switch to 2D visualizer when WebGL context is lost
  const handleSwitchTo2DVisualizer = useCallback(() => {
    const scene2D = VISUALIZER_SCENES.find(
      (scene) => (scene.visualizerStyle?.renderer ?? "2d") === "2d"
    )
    if (scene2D) {
      setSelectedScene(scene2D.id)
      setWebglContextLost(false)
      setWebglRecovering(false)
      logger.info('[Cinema] Switched to 2D visualizer as fallback')
      try {
        trackSceneChanged(scene2D.id)
      } catch (error) {
        logger.debug('Analytics: trackSceneChanged failed', { sceneId: scene2D.id, error: String(error) })
      }
    }
  }, [setSelectedScene])

  return (
    <div
      ref={dialogRef as React.RefObject<HTMLDivElement>}
      className={`${containerClass} transition-opacity duration-250 ease-out ${opacity === 0 ? "opacity-0" : "opacity-100"} ${!isVisible ? "hidden" : ""}`}
      role={containerRole}
      aria-modal={containerAriaModal}
      aria-labelledby="cinema-console-heading"
      tabIndex={-1}
      onMouseMove={resetControlsTimerWithCancel}
      onPointerDown={resetControlsTimerWithCancel}
      onClick={(e) => {
        if (!isFullscreen) return
        if (e.target === e.currentTarget) {
          handleFullscreenToggle()
        }
      }}
    >
      {/* Video element (only for video scenes) */}
      {!isVisualizerScene && !posterOnly && hasVideoSource && (
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          playsInline
          loop
          muted
          preload="metadata"
          onError={onVideoError}
          onLoadedData={onVideoLoadedData}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${effectiveReady && !effectiveError ? "opacity-100" : "opacity-0"
            }`}
        >
          {videoSources.map((source) => (
            <source
              key={source.src}
              src={source.src}
              type={source.type}
              media={source.media}
            />
          ))}
        </video>
      )}

      {/* Audio Visualizer (only for visualizer scenes) */}
      {isVisualizerScene && currentScene.visualizerStyle && (
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <VisualizerCinema
            active={enabled}
            bassLevel={analyzerData.bassLevel}
            midLevel={analyzerData.midLevel}
            highLevel={analyzerData.highLevel}
            style={currentScene.visualizerStyle}
            seed={combineSeeds(currentTrack?.id ?? "no-track", currentScene.id)}
            performanceMode={isPerformanceMode}
            postProcessing={isPerformanceMode ? (shouldUseSidePanels ? "lite" : "off") : "full"}
            onCanvasReady={handleVisualizerCanvasReady}
          />
        </div>
      )}

      {/* Permanent subtle vignette for contrast - top and bottom shadows */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div
          className="absolute top-0 left-0 right-0 h-32 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.15)_50%,transparent_100%)]"
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-32 bg-[linear-gradient(to_top,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.15)_50%,transparent_100%)]"
        />
      </div>

      {/* Gradient overlay - also handles mouse move to show controls when hidden */}
      <div
        className={`absolute inset-0 ${controlsVisible ? 'pointer-events-none' : 'pointer-events-auto'}`}
        onClick={handleCinemaTap}
        onTouchStart={handleCinemaTap}
        onMouseMove={resetControlsTimerWithCancel}
      />

      {/* Dream overlay (Daydream output) - Only rendered when dream output is ready */}
      {dreamOverlayReady && dreamStatus.status !== 'idle' && (dreamStatus.playbackId || dreamStatus.playbackUrl) && (
        <div className={`absolute inset-0 z-30 transition-opacity duration-300 ${isOverlayHidden ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-none'}`}>
          <div className={`absolute overflow-hidden transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) pointer-events-auto shadow-2xl ring-1 ring-black/30 rounded-2xl md:rounded-3xl bg-black shadow-[0_0_60px_10px_rgba(0,0,0,0.5),0_25px_50px_-12px_rgba(0,0,0,0.6)] ${
            // Mobile: square frame to match 512x512 stream (reduced 20% for crisper low-res output)
            // Position options: center (Middle), top, bottom
            !shouldUseSidePanels
              ? `h-[min(60vw,224px)] w-[min(60vw,224px)] left-1/2 -translate-x-1/2 ${
                  framePosition === "top"
                    ? "top-20 translate-y-0"
                    : framePosition === "bottom"
                      ? "bottom-24 translate-y-0"
                      : "top-[calc(50%+1rem)] -translate-y-1/2"
                }`
              : // Desktop (floating window) - square aspect ratio (reduced 20% for crisper low-res output)
              frameSize === "default"
                ? "h-[30vh] w-[30vh]"
                : "h-[18vh] w-[18vh] border border-white/10"
            } ${
            // Positioning for desktop
            shouldUseSidePanels
              ? framePosition === "center"
                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                : framePosition === "bottom-center"
                  ? "top-[calc(100%-2rem)] left-1/2 -translate-x-1/2 -translate-y-full"
                  : framePosition === "bottom-left"
                    ? "top-[calc(100%-2rem)] left-8 -translate-y-full"
                    : "top-[calc(100%-2rem)] left-[calc(100%-2rem)] -translate-x-full -translate-y-full"
              : ""
            }`}
          >
            {dreamStatus.playbackId ? (
              <iframe
                title="Dream Visual"
                src={`https://lvpr.tv/?v=${encodeURIComponent(dreamStatus.playbackId)}&lowLatency=force&autoplay=1&muted=1&controls=0`}
                className="w-full h-full border-0 pointer-events-none"
                allow="autoplay; fullscreen; encrypted-media"
              />
            ) : dreamStatus.playbackUrl ? (
              <video
                src={dreamStatus.playbackUrl}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover pointer-events-none"
              />
            ) : null}
            {/* Subtle vignette shadows inside dream frame */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl md:rounded-3xl overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-8 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35)_0%,transparent_100%)]"
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-8 bg-[linear-gradient(to_top,rgba(0,0,0,0.35)_0%,transparent_100%)]"
              />
            </div>
          </div>
        </div>
      )}


      {/* Video error state (only for video scenes) */}
      {
        !isVisualizerScene && videoError && (
          <CinemaVideoError
            currentScene={currentScene}
            controlsVisible={controlsVisible}
            onTap={handleCinemaTap}
            onRetry={retryVideo}
          />
        )
      }

      {/* Loading state (or placeholder scene state) - only for video scenes */}
      {
        !isVisualizerScene && (isPlaceholderScene || (!effectiveError && !effectiveReady && !posterOnly)) && (
          <CinemaLoadingState
            currentScene={currentScene}
            isPlaceholder={isPlaceholderScene}
            controlsVisible={controlsVisible}
            onTap={handleCinemaTap}
          />
        )
      }

      {/* Video scenes now display without prompts - clean cinema awaiting audio */}

      {/* Hidden Webcam Video for Cinema Ingest */}
      <video
        ref={webcamVideoRef}
        playsInline
        muted
        autoPlay
        className="absolute w-1 h-1 opacity-0 pointer-events-none -z-50"
      />

      {/* Webcam Error Overlay - Dream requires webcam, so always show error if it fails */}
      {webcamError && dreamStatus.status !== "idle" && (
        <CinemaWebcamError
          webcamError={webcamError}
          onRetry={() => {
            retryWebcam()
            retryDream()
          }}
          onCancel={() => void stopDream()}
        />
      )}

      {/* WebGL Context Loss Overlay - shown when 3D visualizer loses GPU context */}
      {webglContextLost && isVisualizerScene && currentScene.visualizerStyle?.renderer === "3d" && (
        <CinemaWebGLContextLoss
          isRecovering={webglRecovering}
          onSwitchTo2D={handleSwitchTo2DVisualizer}
          controlsVisible={controlsVisible}
          onTap={handleCinemaTap}
        />
      )}




      {/* Controls overlay */}
      <div
        ref={overlayRef}
        className={`absolute inset-0 flex flex-col transition-opacity duration-200 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        data-csp-style={controlsInsetStyleId}
      >
        {/* Top gradient for control visibility */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none h-[140px] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.4)_50%,transparent_100%)]"
        />

        {/* Header with categorized scene selector */}
        <div className="relative flex items-center px-2 md:px-4 pt-3 md:pt-4 text-white">
          {/* Screen reader heading for aria-labelledby */}
          <h2 id="cinema-console-heading" className="sr-only">Cinema Console</h2>
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex items-center gap-2 min-w-0 justify-self-start">
              <CinemaSceneSelector
                currentScene={currentScene}
                selectedScene={selectedScene}
                isOpen={isSceneMenuOpen}
                onToggle={() => setIsSceneMenuOpen(!isSceneMenuOpen)}
                onSelect={handleSceneSelect}
                allow3DVisualizers={allow3DVisualizers}
              />
            </div>

            <div className="flex items-center justify-center justify-self-center">
              <CinemaDreamControls
                dreamStatus={dreamStatus}
                dreamConfigured={dreamConfigured}
                webglContextLost={webglContextLost}
                isVisualizerScene={isVisualizerScene}
                onDreamToggle={handleDreamToggle}
                onRetryDream={() => void retryDream()}
                frameSize={frameSize}
                onFrameSizeChange={setFrameSize}
                framePosition={framePosition}
                onFramePositionChange={setFramePosition}
                presentation={dreamPresentation}
                onPresentationChange={setDreamPresentation}
                onForceSync={forceDreamSync}
                isOverlayHidden={isOverlayHidden}
                onOverlayHiddenChange={setIsOverlayHidden}
                settingsOnly
              />
            </div>

            <div className="flex items-center gap-2 justify-self-end">
              <CinemaDreamControls
                dreamStatus={dreamStatus}
                dreamConfigured={dreamConfigured}
                webglContextLost={webglContextLost}
                isVisualizerScene={isVisualizerScene}
                onDreamToggle={handleDreamToggle}
                onRetryDream={() => void retryDream()}
                frameSize={frameSize}
                onFrameSizeChange={setFrameSize}
                framePosition={framePosition}
                onFramePositionChange={setFramePosition}
                presentation={dreamPresentation}
                onPresentationChange={setDreamPresentation}
                onForceSync={forceDreamSync}
                isOverlayHidden={isOverlayHidden}
                onOverlayHiddenChange={setIsOverlayHidden}
                compactMode
              />
              {shouldUseSidePanels && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleFullscreenToggle}
                  leftIcon={isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                  className="gap-2 rounded-full border-white/30 bg-black/50 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white hover:bg-black/40 hover:border-white/50 backdrop-blur-md"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? "Exit" : "Fullscreen"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dream prompt bar (editable) - z-40 to layer above Dream overlay (z-30) */}
        {/* Positioned at bottom-8 (2rem) to align with iframe bottom edge when frame is at bottom-center */}
        {promptBarEnabled && controlsVisible && (dreamStatus.status === "connecting" || dreamStatus.status === "streaming") && (
          <div className={`absolute left-0 right-0 flex flex-col items-center px-2 md:px-4 pointer-events-none z-40 gap-2 ${
            !shouldUseSidePanels ? "bottom-24" : "bottom-8"
          }`}>
            {/* Live updates unavailable message */}
            {dreamPatchSupported === false && (
              <div className="pointer-events-auto text-center text-xs text-amber-300/90 bg-black/40 rounded-full px-3 py-1 backdrop-blur-sm">
                Live updates unavailable — changes will apply on restart
              </div>
            )}
            {/* Width matches Dream iframe: 30vh default, 18vh small (square aspect, reduced 20%) */}
            <div className={`pointer-events-auto w-full ${
              !shouldUseSidePanels
                ? "max-w-[min(60vw,224px)]"
                : frameSize === "default"
                  ? "max-w-[30vh]"
                  : "max-w-[18vh]"
            }`}>
              <div className="flex items-center gap-3 rounded-full border border-white/30 bg-black/50 px-3 py-1.5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:bg-black/40 hover:border-white/50">
                <span className="text-[11px] uppercase tracking-[0.2em] text-white/90 whitespace-nowrap font-medium pl-1">
                  Prompt
                </span>
                <textarea
                  ref={textareaRef}
                  value={editingPrompt}
                  onChange={(e) => setEditingPrompt(e.target.value)}
                  onKeyDown={handlePromptKeyDown}
                  aria-label="Dream prompt"
                  placeholder="Describe your visual style..."
                  rows={1}
                  className="w-full min-h-[24px] max-h-[120px] resize-none overflow-hidden bg-transparent text-sm text-white focus-ring font-medium placeholder:text-white/40 leading-relaxed translate-y-[1px]"
                  data-csp-style={promptTextareaStyleId}
                />
                <button
                  type="button"
                  onClick={handlePromptReset}
                  aria-label="Reset to default prompt"
                  title="Reset to default"
                  className="flex-shrink-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-all hover:scale-105 active:scale-95"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePromptSubmit}
                  disabled={!editingPrompt.trim()}
                  aria-label="Send prompt"
                  className={`flex-shrink-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 ${isSubmitAnimating ? "scale-95 bg-white/30" : ""}`}
                >
                  <Send className="h-4 w-4 rotate-45" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div >
  )
}
