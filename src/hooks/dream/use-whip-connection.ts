"use client"

/**
 * WHIP Connection Hook
 *
 * Manages WHIP WebRTC ingest connection lifecycle with retry logic.
 * Extracted from use-dream.ts for better separation of concerns.
 *
 * @module hooks/dream/use-whip-connection
 */

import { useCallback, useRef } from "react"
import { getWhipErrorStatus, isRetryableWhipError, WHIP_RETRY_CONFIG, PATCH_CONFIG } from "@/lib/daydream/utils"
import { logger } from "@/lib/logger"
import { WHIPClient } from "@/lib/streaming/whip-client"
import type { DaydreamStatus } from "@/types/daydream.types"

export interface UseWhipConnectionOptions {
  /** Function to get capture stream from canvas/webcam */
  getCaptureStream: () => Promise<MediaStream | null>
  /** Stream start timestamp for warmup window calculation */
  streamStartAt: number | null
  /** Callback when connection state changes */
  onStateChange: (update: Partial<DaydreamStatus>) => void
  /** Callback when stream becomes active */
  onStreamActive: () => void
  /** Callback when cleanup is needed */
  onCleanup: () => void
  /** Flag indicating intentional stop in progress */
  isStopping: boolean
}

export interface UseWhipConnectionReturn {
  /** Start WHIP connection */
  startWhip: (streamId: string, whipUrl: string) => Promise<void>
  /** Stop WHIP connection */
  stopWhip: () => Promise<void>
  /** Clear retry timeouts */
  clearWhipRetry: () => void
  /** Current WHIP client ref */
  whipClientRef: React.MutableRefObject<WHIPClient | null>
}

/**
 * Hook for managing WHIP WebRTC connections with retry logic.
 *
 * Handles:
 * - WHIP client lifecycle (connect/disconnect)
 * - Exponential backoff retry on transient failures
 * - Connection state change callbacks
 * - Warmup window tolerance for retries
 */
export function useWhipConnection({
  getCaptureStream,
  streamStartAt,
  onStateChange,
  onStreamActive,
  onCleanup,
  isStopping,
}: UseWhipConnectionOptions): UseWhipConnectionReturn {
  const whipClientRef = useRef<WHIPClient | null>(null)
  const whipRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const whipRetryAttemptRef = useRef(0)
  const startWhipRef = useRef<(streamId: string, whipUrl: string) => Promise<void>>(() => Promise.resolve())

  const clearWhipRetry = useCallback(() => {
    if (whipRetryTimeoutRef.current) {
      clearTimeout(whipRetryTimeoutRef.current)
      whipRetryTimeoutRef.current = null
    }
    whipRetryAttemptRef.current = 0
  }, [])

  const stopWhip = useCallback(async () => {
    if (whipClientRef.current) {
      try {
        await whipClientRef.current.disconnect()
      } catch {
        // ignore cleanup errors
      }
      whipClientRef.current = null
    }
  }, [])

  const startWhip = useCallback(
    async (streamId: string, whipUrl: string) => {
      // Give the draw loop time to start and render at least one frame
      logger.debug("[Dream] Waiting for draw loop to initialize...")
      await new Promise((resolve) => setTimeout(resolve, 500))

      const captureStream = await getCaptureStream()

      if (!captureStream) {
        onStateChange({
          status: "error",
          streamId,
          whipUrl,
          message: "Cinema capture not ready",
          countdownRemaining: 0,
        })
        return
      }

      const proxiedWhip = `/api/daydream/streams/${encodeURIComponent(streamId)}/whip?resource=${encodeURIComponent(
        whipUrl,
      )}`

      // Log stream details to help debug WHIP issues
      const videoTracks = captureStream.getVideoTracks()
      logger.debug("[Dream] Capture stream details:", {
        id: captureStream.id,
        active: captureStream.active,
        videoTracks: videoTracks.length,
        trackSettings: videoTracks[0]?.getSettings(),
        trackState: videoTracks[0]?.readyState,
      })

      if (!videoTracks.length || videoTracks[0]?.readyState !== "live") {
        logger.error("[Dream] Capture stream has no live video track")
        onStateChange({
          status: "error",
          streamId,
          whipUrl,
          message: "Cinema not ready - no video track",
          countdownRemaining: 0,
        })
        return
      }

      const scheduleWhipRetry = (errorMessage?: string, reason?: string): boolean => {
        if (isStopping) return false
        if (whipRetryTimeoutRef.current) return true

        const warmupAgeMs = streamStartAt ? Date.now() - streamStartAt : null
        const withinWarmupWindow =
          typeof warmupAgeMs === "number" && warmupAgeMs < PATCH_CONFIG.WARMUP_GRACE_MS
        if (!withinWarmupWindow) return false
        if (!isRetryableWhipError(errorMessage)) return false

        const nextAttempt = whipRetryAttemptRef.current + 1
        if (nextAttempt > WHIP_RETRY_CONFIG.MAX_ATTEMPTS) return false
        whipRetryAttemptRef.current = nextAttempt

        const delayMs = Math.min(
          WHIP_RETRY_CONFIG.MAX_DELAY_MS,
          WHIP_RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, nextAttempt - 1),
        )
        const statusCode = getWhipErrorStatus(errorMessage)
        logger.warn("[Dream] WHIP not ready, retrying", {
          attempt: nextAttempt,
          delayMs,
          status: statusCode,
          reason,
          error: errorMessage,
        })

        onStateChange({
          status: "connecting",
          message: "Dream warming up",
        })

        void stopWhip()

        if (whipRetryTimeoutRef.current) {
          clearTimeout(whipRetryTimeoutRef.current)
          whipRetryTimeoutRef.current = null
        }

        whipRetryTimeoutRef.current = setTimeout(() => {
          whipRetryTimeoutRef.current = null
          if (isStopping) return
          void startWhipRef.current(streamId, whipUrl)
        }, delayMs)

        return true
      }

      const client = new WHIPClient({
        whipUrl: proxiedWhip,
        stream: captureStream,
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        iceTransportPolicy: "all",
        connectionTimeout: 45000,
        iceGatheringTimeout: 20000,
        enableTrickleICE: false,
      })

      client.onConnectionStateChange((state) => {
        if (isStopping) return

        logger.debug("[Dream] WHIP state:", { state: state.state })

        if (state.state === "connected") {
          logger.debug("[Dream] WHIP connected successfully")
          onStreamActive()
          clearWhipRetry()
          onStateChange({
            status: "streaming",
            streamId,
            whipUrl,
            message: "Dream ingest connected",
          })
        }

        if (state.state === "failed") {
          if (scheduleWhipRetry(state.error, "failed")) {
            return
          }
          logger.error("[Dream] WHIP failed", { error: state.error, whipUrl })
          onStateChange({
            status: "error",
            streamId,
            whipUrl,
            message: state.error || "WHIP connection failed",
          })
        }

        if (state.state === "closed") {
          if (scheduleWhipRetry(state.error, "closed")) {
            return
          }
          onCleanup()
          whipClientRef.current = null
        }
      })

      whipClientRef.current = client

      try {
        await client.connect()
      } catch (error) {
        const message = error instanceof Error ? error.message : "WHIP connection failed"
        if (scheduleWhipRetry(message, "connect")) {
          return
        }
        logger.error("[Dream] WHIP connect error", { error: message, whipUrl })
        await stopWhip()
        onStateChange({
          status: "error",
          streamId,
          whipUrl,
          message,
        })
      }
    },
    [getCaptureStream, streamStartAt, onStateChange, onStreamActive, onCleanup, isStopping, stopWhip, clearWhipRetry],
  )

  // Keep ref updated for retry callbacks
  startWhipRef.current = startWhip

  return {
    startWhip,
    stopWhip,
    clearWhipRetry,
    whipClientRef,
  }
}
