/**
 * Webcam Capture Hook
 *
 * Manages webcam acquisition and draw loop for Dream feature.
 * Handles webcam permissions, error states, and canvas drawing.
 *
 * @module hooks/cinema/use-webcam-capture
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { logger } from "@/lib/logger"

interface UseWebcamCaptureOptions {
  /**
   * Whether Dream is actively streaming (connecting or streaming status)
   */
  isDreamActive: boolean
  /**
   * Ref to the intermediate canvas for drawing webcam frames
   */
  intermediateCanvasRef: React.RefObject<HTMLCanvasElement | null>
  /**
   * Ref to track whether capture has drawn a real frame
   */
  captureReadyRef: React.RefObject<boolean>
}

interface UseWebcamCaptureReturn {
  /**
   * Ref to the hidden video element for webcam preview
   */
  webcamVideoRef: React.RefObject<HTMLVideoElement | null>
  /**
   * Whether the webcam is ready and streaming
   */
  webcamReady: boolean
  /**
   * Error message if webcam acquisition failed
   */
  webcamError: string | null
  /**
   * Retry webcam acquisition
   */
  retryWebcam: () => void
  /**
   * Stop webcam and release resources
   */
  stopWebcam: () => void
}

/**
 * Hook for managing webcam capture for Dream feature
 *
 * Handles:
 * - Webcam permission acquisition
 * - Video stream management
 * - Draw loop to intermediate canvas
 * - Error states and cleanup
 */
export function useWebcamCapture({
  isDreamActive,
  intermediateCanvasRef,
  captureReadyRef,
}: UseWebcamCaptureOptions): UseWebcamCaptureReturn {
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null)
  const webcamStreamRef = useRef<MediaStream | null>(null)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const [webcamReady, setWebcamReady] = useState(false)
  const drawLogStateRef = useRef<{
    hasSource: boolean
    webcamReady: boolean
    webcamError: string | null
    readyState: number | null
    captureReady: boolean
  } | null>(null)

  // Stop webcam and release resources
  const stopWebcam = useCallback(() => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop())
      webcamStreamRef.current = null
    }
    if (webcamVideoRef.current) {
      webcamVideoRef.current.pause()
      webcamVideoRef.current.srcObject = null
    }
    setWebcamReady(false)
    setWebcamError(null)
  }, [])

  // Retry webcam acquisition
  const retryWebcam = useCallback(() => {
    stopWebcam()
    // Re-acquisition will happen via the effect below
  }, [stopWebcam])

  // Webcam acquisition effect
  useEffect(() => {
    // Always release the webcam when Dream is OFF to avoid leaving the camera running.
    if (!isDreamActive) {
      if (webcamStreamRef.current) stopWebcam()
      return
    }

    // Already have stream?
    if (webcamStreamRef.current) return

    const controller = new AbortController()

    const acquireWebcam = async () => {
      logger.debug("[Dream] Acquiring webcam...")
      setWebcamError(null)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 30 },
            facingMode: "user",
          },
          audio: false,
        })

        // Check if aborted during async acquisition
        if (controller.signal.aborted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        logger.debug("[Dream] Webcam acquired")
        webcamStreamRef.current = stream

        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = stream
          setWebcamReady(true)
          logger.debug("[Dream] webcamReady set to true")

          try {
            await webcamVideoRef.current.play()

            if (controller.signal.aborted) {
              stream.getTracks().forEach((t) => t.stop())
              return
            }

            const videoSettings = stream.getVideoTracks()[0]?.getSettings()
            logger.debug("[Dream] Webcam video playing", {
              readyState: webcamVideoRef.current.readyState,
              videoWidth: webcamVideoRef.current.videoWidth,
              videoHeight: webcamVideoRef.current.videoHeight,
              trackSettings: videoSettings,
            })
          } catch (e) {
            const errorName = e instanceof Error ? e.name : String(e)
            if (controller.signal.aborted || errorName === "AbortError") {
              logger.debug("[Dream] Video play aborted")
            } else {
              logger.warn("[Dream] Video play error", { error: e })
              setWebcamError("Camera preview failed")
            }
          }
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return

        const errorName = err instanceof Error ? err.name : String(err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        logger.error("[Dream] Webcam failed", {
          name: errorName,
          message: errorMessage,
        })

        if (
          errorName === "NotAllowedError" ||
          errorName === "PermissionDeniedError"
        ) {
          setWebcamError("Camera access denied")
        } else if (
          errorName === "NotFoundError" ||
          errorName === "DevicesNotFoundError"
        ) {
          setWebcamError("No camera found")
        } else if (
          errorName === "NotReadableError" ||
          errorName === "TrackStartError"
        ) {
          setWebcamError("Camera in use")
        } else {
          setWebcamError("Camera error")
        }
      }
    }

    void acquireWebcam()

    return () => {
      controller.abort()
      stopWebcam()
    }
  }, [isDreamActive, stopWebcam])

  // Draw loop: Copy webcam to intermediate canvas
  useEffect(() => {
    if (!isDreamActive) {
      if (captureReadyRef.current) {
        // TypeScript workaround: captureReadyRef is RefObject<boolean> which is readonly
        // but we need to update it. The parent component passes a MutableRefObject.
        ;(captureReadyRef as { current: boolean }).current = false
      }
      // Clear the canvas when Dream stops
      const canvas = intermediateCanvasRef.current
      if (canvas) {
        const ctx = canvas.getContext("2d", { alpha: false })
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
      return
    }

    let animationFrameId: number
    const ctx = intermediateCanvasRef.current?.getContext("2d", {
      alpha: false,
      desynchronized: true,
    })
    if (!ctx) return

    const canvasWidth = intermediateCanvasRef.current?.width || 512
    const canvasHeight = intermediateCanvasRef.current?.height || 512

    let consecutiveFailures = 0
    const MIN_FRAME_INTERVAL_MS = 1000 / 30
    let lastDrawAt = 0

    const loop = () => {
      const now = performance.now()
      if (now - lastDrawAt < MIN_FRAME_INTERVAL_MS) {
        animationFrameId = requestAnimationFrame(loop)
        return
      }
      lastDrawAt = now

      let source: HTMLVideoElement | null = null
      let drawn = false

      // Webcam is the ONLY Dream input source
      if (webcamReady && webcamVideoRef.current && !webcamError) {
        if (webcamVideoRef.current.readyState >= 2) {
          source = webcamVideoRef.current
        }
      }

      // Debug logging for state changes
      const nextLogState = {
        hasSource: Boolean(source),
        webcamReady,
        webcamError: webcamError || null,
        readyState: webcamVideoRef.current?.readyState ?? null,
        captureReady: captureReadyRef.current,
      }
      const prevLogState = drawLogStateRef.current
      if (
        !prevLogState ||
        prevLogState.hasSource !== nextLogState.hasSource ||
        prevLogState.webcamReady !== nextLogState.webcamReady ||
        prevLogState.webcamError !== nextLogState.webcamError ||
        prevLogState.readyState !== nextLogState.readyState ||
        prevLogState.captureReady !== nextLogState.captureReady
      ) {
        logger.debug("[Dream] Draw loop state", {
          webcamReady: nextLogState.webcamReady,
          webcamError: nextLogState.webcamError,
          webcamReadyState: nextLogState.readyState,
          hasSource: nextLogState.hasSource,
          captureReady: nextLogState.captureReady,
        })
        drawLogStateRef.current = nextLogState
      }

      if (source) {
        try {
          // Clear to black before drawing
          ctx.fillStyle = "black"
          ctx.fillRect(0, 0, canvasWidth, canvasHeight)

          const sourceWidth = source.videoWidth || canvasWidth
          const sourceHeight = source.videoHeight || canvasHeight

          // Cover mode - fills canvas, crops excess
          const scale = Math.max(
            canvasWidth / sourceWidth,
            canvasHeight / sourceHeight
          )
          const targetWidth = sourceWidth * scale
          const targetHeight = sourceHeight * scale
          const dx = (canvasWidth - targetWidth) / 2
          const dy = (canvasHeight - targetHeight) / 2

          // Mirror webcam horizontally
          ctx.save()
          ctx.translate(canvasWidth, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(source, dx, dy, targetWidth, targetHeight)
          ctx.restore()

          drawn = true
          if (!captureReadyRef.current) {
            ;(captureReadyRef as { current: boolean }).current = true
          }
          if (consecutiveFailures > 0) {
            logger.debug("[Dream] Webcam source recovered")
            consecutiveFailures = 0
          }
        } catch {
          // Source not ready
        }
      }

      // Fallback: Show waiting state
      if (!drawn) {
        if (consecutiveFailures === 0) {
          logger.debug("[Dream] Webcam not ready, showing waiting state")
        }
        consecutiveFailures++
        if (captureReadyRef.current) {
          ;(captureReadyRef as { current: boolean }).current = false
        }

        // Animated gradient fallback
        const time = Date.now() / 3000
        const brightness = 10 + Math.sin(time) * 5

        const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight)
        gradient.addColorStop(0, `hsl(270, 50%, ${brightness}%)`)
        gradient.addColorStop(1, `hsl(280, 60%, ${brightness * 0.7}%)`)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        // Status text
        ctx.font = "bold 24px sans-serif"
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
        ctx.textAlign = "center"
        ctx.fillText(
          webcamError || "Initializing Camera...",
          canvasWidth / 2,
          canvasHeight / 2
        )
      }

      animationFrameId = requestAnimationFrame(loop)
    }

    loop()

    return () => cancelAnimationFrame(animationFrameId)
  }, [isDreamActive, webcamReady, webcamError, captureReadyRef, intermediateCanvasRef])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  return {
    webcamVideoRef,
    webcamReady,
    webcamError,
    retryWebcam,
    stopWebcam,
  }
}
