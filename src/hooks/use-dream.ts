"use client"

/**
 * Daydream AI Video Integration Hook
 *
 * Manages the full lifecycle of AI-driven video generation via the Daydream API
 * (StreamDiffusion backend). This hook handles:
 *
 * - Stream creation and configuration via `/api/daydream/streams`
 * - WHIP WebRTC ingest connection for real-time video input
 * - Prompt synchronization with PATCH requests (when supported by backend)
 * - Countdown warm-up period before playback visibility
 * - Error recovery and retry logic with exponential backoff
 * - Status polling for stream health monitoring
 *
 * State Machine:
 * ```
 * idle → countdown → connecting → streaming → idle/error
 *                  ↓ (on error)
 *                  error → idle (on stop/retry)
 * ```
 *
 * Key Behaviors:
 * - Warm-up countdown (DREAM_COUNTDOWN_SECONDS) before showing playback
 * - PATCH support detection: automatically disables prompt sync if backend doesn't support it
 * - WHIP retry with exponential backoff on connection failures
 * - Graceful cleanup on component unmount or explicit stop
 *
 * @module hooks/use-dream
 * @see docs/daydream/metadj-nexus-dream-mvp.md
 * @see docs/daydream/streamdiffusion-reference.md
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  DREAM_COUNTDOWN_SECONDS,
  DREAM_PROMPT_BASE,
  DREAM_PROMPT_DEFAULT,
  DREAM_PROMPT_DEFAULT_PRESENTATION,
  DREAM_STATUS_POLL_INTERVAL_MS,
  DREAM_STATUS_POLL_MAX_ATTEMPTS,
  DEFAULT_STREAM_PAYLOAD,
  createStreamPayload,
  createPromptUpdatePayload,
} from "@/lib/daydream/config"
import {
  getErrorMessage,
  getWhipErrorStatus,
  isRetryableWhipError,
  WHIP_RETRY_CONFIG,
  PATCH_CONFIG,
  STARTUP_CONFIG,
} from "@/lib/daydream/utils"
import { logger } from "@/lib/logger"
import { WHIPClient } from "@/lib/streaming/whip-client"
import type { DaydreamStatus, DaydreamStreamCreateRequest, DaydreamStreamResponse } from "@/types/daydream.types"

// Re-export prompt constants
export { DREAM_PROMPT_BASE, DREAM_PROMPT_DEFAULT, DREAM_PROMPT_DEFAULT_PRESENTATION }

/**
 * Configuration options for the useDream hook.
 */
interface UseDreamOptions {
  /** Async function that returns a MediaStream from canvas/webcam capture. Called when starting the dream. */
  getCaptureStream: () => Promise<MediaStream | null>
  /** AI generation prompt. Falls back to DREAM_PROMPT_DEFAULT if empty. */
  prompt?: string
  /** Callback invoked when the WebGL context is lost (e.g., tab backgrounded). */
  onContextLost?: () => void
  /** Master enable flag. When false, the hook remains idle. */
  enabled?: boolean
}

/**
 * React hook for Daydream AI video streaming integration.
 *
 * Provides a complete interface for starting, stopping, and monitoring
 * AI-driven video generation streams via the Daydream API.
 *
 * @param options - Configuration options for the dream stream
 * @returns Object containing:
 *   - `status`: Current stream status (idle, countdown, connecting, streaming, error)
 *   - `isConfigured`: Whether the Daydream API is properly configured (null = checking)
 *   - `patchSupported`: Whether runtime prompt updates work (null = unknown)
 *   - `startDream`: Function to initiate the dream stream
 *   - `stopDream`: Function to gracefully stop the stream
 *   - `forcePromptSync`: Function to force a prompt re-sync (re-roll)
 *
 * @example
 * ```tsx
 * const { status, startDream, stopDream } = useDream({
 *   getCaptureStream: () => canvasRef.current?.captureStream(30) ?? null,
 *   prompt: "cosmic nebula with swirling galaxies",
 *   enabled: true,
 * })
 * ```
 */
export function useDream({ getCaptureStream, prompt, onContextLost, enabled = false }: UseDreamOptions) {
  const resolvedPrompt = prompt?.trim() || DREAM_PROMPT_DEFAULT

  const resolvedPromptRef = useRef(resolvedPrompt)
  const [status, setStatus] = useState<DaydreamStatus>({ status: "idle" })
  const statusRef = useRef(status)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const daydreamEnabledRef = useRef<boolean | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const whipClientRef = useRef<WHIPClient | null>(null)
  const startWhipRef = useRef<(streamId: string, whipUrl: string) => Promise<void>>(() => Promise.resolve())
  const activeStreamIdRef = useRef<string | null>(null)
  const streamStartAtRef = useRef<number | null>(null)
  const streamModelIdRef = useRef<string>(DEFAULT_STREAM_PAYLOAD.params.model_id)
  const streamActiveRef = useRef(false)
  const statusPollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startupErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const whipRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const whipRetryAttemptRef = useRef(0)
  // Guard to suppress noisy WHIP close/failed events during intentional stop
  const stoppingRef = useRef(false)
  const appliedPromptRef = useRef<string | null>(null)
  // When the user explicitly requests a re-sync (e.g. re-roll same prompt),
  // store the prompt string to bypass equality checks until a successful PATCH.
  const forcedPromptRef = useRef<string | null>(null)
  const promptSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const promptSyncInFlightRef = useRef(false)
  const promptSyncAttemptRef = useRef(0)
  const lastResolvedPromptRef = useRef(resolvedPrompt)
  // Track whether PATCH is working - Daydream's StreamDiffusion may not support runtime updates
  const [patchSupported, setPatchSupported] = useState<boolean | null>(null)
  const patchSupportedRef = useRef<boolean | null>(null)
  const patchFailureCountRef = useRef(0)
  // Keep a ref to the latest resolved prompt so long-running async flows (startDream)
  // can use the most current value at the moment of API calls.
  // NOTE: This ref is updated synchronously via useMemo-style pattern below,
  // not in a useEffect, to avoid race conditions with the sync effect.
  // The ref update now happens at the START of the sync effect (lines 652+)
  // to ensure the ref is current before syncPrompt reads it.
  //
  // NOTE: getErrorMessage and isRetryableWhipError are now imported from
  // @/lib/daydream/utils for reusability and testability.

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const clearStatusPoll = useCallback(() => {
    if (statusPollRef.current) {
      clearTimeout(statusPollRef.current)
      statusPollRef.current = null
    }
  }, [])

  const clearStartupError = useCallback(() => {
    if (startupErrorTimeoutRef.current) {
      clearTimeout(startupErrorTimeoutRef.current)
      startupErrorTimeoutRef.current = null
    }
  }, [])

  const clearWhipRetry = useCallback(() => {
    if (whipRetryTimeoutRef.current) {
      clearTimeout(whipRetryTimeoutRef.current)
      whipRetryTimeoutRef.current = null
    }
    whipRetryAttemptRef.current = 0
  }, [])

  const clearPromptSync = useCallback(() => {
    if (promptSyncTimeoutRef.current) {
      clearTimeout(promptSyncTimeoutRef.current)
      promptSyncTimeoutRef.current = null
    }
    promptSyncAttemptRef.current = 0
    promptSyncInFlightRef.current = false
    patchFailureCountRef.current = 0
    forcedPromptRef.current = null
  }, [])

  // NOTE: getWhipErrorStatus and isRetryableWhipError are imported from @/lib/daydream/utils

  useEffect(() => {
    patchSupportedRef.current = patchSupported
  }, [patchSupported])

  // Check if Daydream API is configured on mount (uses GET to avoid creating streams)
  useEffect(() => {
    if (!enabled) {
      setIsConfigured(null)
      daydreamEnabledRef.current = null
      return
    }

    let cancelled = false
    async function checkConfig() {
      try {
        // Use the config endpoint which doesn't create streams
        const res = await fetch("/api/daydream/config", { cache: "no-store" })
        if (!res.ok) {
          if (!cancelled) setIsConfigured(null)
          return
        }
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (typeof data?.enabled === "boolean") {
          daydreamEnabledRef.current = data.enabled
        }
        if (typeof data?.configured === "boolean") {
          setIsConfigured(data.configured)
          return
        }
        setIsConfigured(null)
      } catch {
        if (!cancelled) setIsConfigured(null)
      }
    }
    checkConfig()
    return () => {
      cancelled = true
    }
  }, [enabled])

  // Poll stream status until active or max attempts
  const pollStreamStatus = useCallback(
    async (streamId: string, attempt = 0): Promise<boolean> => {
      const warmupAgeMs = streamStartAtRef.current ? Date.now() - streamStartAtRef.current : null
      const withinWarmupWindow =
        typeof warmupAgeMs === "number" && warmupAgeMs < PATCH_CONFIG.WARMUP_GRACE_MS
      const waitAndRetry = async () => {
        await new Promise<void>((resolve) => {
          statusPollRef.current = setTimeout(resolve, DREAM_STATUS_POLL_INTERVAL_MS)
        })
        return pollStreamStatus(streamId, attempt + 1)
      }
      if (attempt >= DREAM_STATUS_POLL_MAX_ATTEMPTS) {
        return withinWarmupWindow ? waitAndRetry() : false
      }

      try {
        const res = await fetch(`/api/daydream/streams/${encodeURIComponent(streamId)}/status`)
        const responseText = await res.text().catch(() => "")
        let body: Record<string, unknown> = {}
        try {
          body = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {}
        } catch {
          body = { raw: responseText }
        }

        if (!res.ok) {
          const retryable =
            res.status === 404 ||
            res.status === 409 ||
            res.status === 429 ||
            (res.status >= 500 && res.status < 600)
          if (!retryable) return false

          const textLower = responseText.toLowerCase()
          const isNotReadyYet =
            textLower.includes("not ready") ||
            responseText.includes("NOT_READY") ||
            responseText.includes("STREAM_NOT_READY")

          if (isNotReadyYet || withinWarmupWindow || res.status !== 404) {
            return waitAndRetry()
          }
          return false
        }

        if (body?.success === false) {
          const textLower = responseText.toLowerCase()
          const isNotReadyYet =
            textLower.includes("not ready") ||
            responseText.includes("NOT_READY") ||
            textLower.includes("warming") ||
            textLower.includes("initializing")
          if (isNotReadyYet || withinWarmupWindow) {
            return waitAndRetry()
          }
          return false
        }

        const data = (body as Record<string, unknown>)?.data ?? body
        const dataObj = data as Record<string, unknown>
        const bodyObj = body as Record<string, unknown>
        const gatewayStatus = dataObj?.gateway_status as Record<string, unknown> | undefined
        const inferenceStatus = dataObj?.inference_status as Record<string, unknown> | undefined

        const statusValue =
          dataObj?.status ||
          dataObj?.state ||
          gatewayStatus?.status ||
          bodyObj?.status ||
          bodyObj?.state

        if (
          typeof statusValue === "string" &&
          (statusValue === "active" || statusValue === "streaming" || statusValue === "ready" || statusValue === "running")
        ) {
          return true
        }

        const lastOutputTime = inferenceStatus?.last_output_time
        if (typeof lastOutputTime === "number" && lastOutputTime > 0) return true
        const lastInputTime = inferenceStatus?.last_input_time
        if (typeof lastInputTime === "number" && lastInputTime > 0) return true

        const ingestMetrics = gatewayStatus?.ingest_metrics as Record<string, unknown> | undefined
        const stats = ingestMetrics?.stats as Record<string, unknown> | undefined
        const peerConnStats = stats?.peer_conn_stats as Record<string, unknown> | undefined
        const bytesReceived = peerConnStats?.BytesReceived
        if (typeof bytesReceived === "number" && bytesReceived > 0) return true
        return waitAndRetry()
      } catch {
        return waitAndRetry()
      }
    },
    [],
  )

  const stopWhip = useCallback(async () => {
    if (whipClientRef.current) {
      try {
        await whipClientRef.current.disconnect()
      } catch {
        // ignore cleanup
      }
      whipClientRef.current = null
    }
  }, [])

  const deleteStream = useCallback(async (streamId: string | null) => {
    if (!streamId) return
    try {
      await fetch(`/api/daydream/streams/${encodeURIComponent(streamId)}`, { method: "DELETE" })
    } catch {
      // ignore failures during teardown
    }
  }, [])

  const startCountdown = useCallback(() => {
    clearCountdown()
    setStatus((prev) => ({ ...prev, countdownRemaining: DREAM_COUNTDOWN_SECONDS }))
    countdownRef.current = setInterval(() => {
      setStatus((prev) => {
        const next = Math.max(0, (prev.countdownRemaining ?? DREAM_COUNTDOWN_SECONDS) - 1)
        if (next === 0 && countdownRef.current) {
          clearInterval(countdownRef.current)
          countdownRef.current = null
        }
        return { ...prev, countdownRemaining: next }
      })
    }, 1000)
  }, [clearCountdown])

  const startWhip = useCallback(
    async (streamId: string, whipUrl: string) => {
      // Give the draw loop time to start and render at least one frame
      // This ensures the intermediate canvas has content before we capture
      logger.debug("[Dream] Waiting for draw loop to initialize...")
      await new Promise((resolve) => setTimeout(resolve, 500))

      const captureStream = await getCaptureStream()

      if (!captureStream) {
        setStatus((prev) => {
          if (prev.streamId && prev.streamId !== streamId) return prev
          return {
            status: "error",
            streamId,
            whipUrl,
            message: "Cinema capture not ready",
            countdownRemaining: 0,
          }
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
        setStatus((prev) => {
          if (prev.streamId && prev.streamId !== streamId) return prev
          return {
            status: "error",
            streamId,
            whipUrl,
            message: "Cinema not ready - no video track",
            countdownRemaining: 0,
          }
        })
        return
      }

      const scheduleWhipRetry = (errorMessage?: string, reason?: string) => {
        if (stoppingRef.current) return false
        if (whipRetryTimeoutRef.current) return true

        const warmupAgeMs = streamStartAtRef.current
          ? Date.now() - streamStartAtRef.current
          : null
        const withinWarmupWindow =
          typeof warmupAgeMs === "number" && warmupAgeMs < PATCH_CONFIG.WARMUP_GRACE_MS
        if (!withinWarmupWindow) return false
        if (!isRetryableWhipError(errorMessage)) return false

        const currentStreamId = activeStreamIdRef.current || statusRef.current.streamId
        if (currentStreamId && currentStreamId !== streamId) return false

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

        clearStartupError()
        setStatus((prev) => {
          if (prev.streamId && prev.streamId !== streamId) return prev
          if (prev.status === "streaming") return prev
          return {
            ...prev,
            status: "connecting",
            message: "Dream warming up",
          }
        })

        void stopWhip()

        if (whipRetryTimeoutRef.current) {
          clearTimeout(whipRetryTimeoutRef.current)
          whipRetryTimeoutRef.current = null
        }

        whipRetryTimeoutRef.current = setTimeout(() => {
          whipRetryTimeoutRef.current = null
          if (stoppingRef.current) return
          const latestStreamId = activeStreamIdRef.current || statusRef.current.streamId
          if (latestStreamId && latestStreamId !== streamId) return
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
        // Livepeer's WHIP endpoint may return 405 to trickle ICE PATCH requests.
        // Daydream docs work without trickle ICE, so we default to a single full offer.
        enableTrickleICE: false,
      })

      client.onConnectionStateChange((state) => {
        if (stoppingRef.current) {
          return
        }
        logger.debug("[Dream] WHIP state:", { state: state.state })
        if (state.state === "connected") {
          logger.debug("[Dream] WHIP connected successfully")
          streamActiveRef.current = true
          clearWhipRetry()
          clearStartupError()
          setStatus((prev) => {
            if (prev.streamId && prev.streamId !== streamId) return prev
            return {
              ...prev,
              status: "streaming",
              streamId,
              whipUrl,
              message: "Dream ingest connected",
            }
          })
        }
        if (state.state === "failed") {
          if (scheduleWhipRetry(state.error, "failed")) {
            streamActiveRef.current = false
            return
          }
          logger.error("[Dream] WHIP failed", { error: state.error, whipUrl })
          streamActiveRef.current = false
          setStatus((prev) => {
            if (prev.streamId && prev.streamId !== streamId) return prev
            return {
              ...prev,
              status: "error",
              streamId,
              whipUrl,
              message: state.error || "WHIP connection failed",
            }
          })
        }
        if (state.state === "closed") {
          streamActiveRef.current = false
          if (scheduleWhipRetry(state.error, "closed")) {
            return
          }

          // Always clear timers/refs on close so restart is clean.
          clearCountdown()
          clearStatusPoll()
          whipClientRef.current = null
          activeStreamIdRef.current = null

          setStatus((prev) => {
            if (prev.streamId && prev.streamId !== streamId) return prev
            // If we were actively streaming and the connection closes unexpectedly,
            // reset to idle without surfacing a user-visible error.
            if (prev.status === "streaming") {
              logger.warn("[Dream] WHIP closed while streaming; resetting to idle")
              return { status: "idle" }
            }

            // If we never reached streaming, treat as error for internal state,
            // but this should not fire during intentional stop (guarded above).
            return {
              ...prev,
              status: "error",
              streamId,
              whipUrl,
              message: state.error || "WHIP closed before connecting",
            }
          })
        }
      })

      whipClientRef.current = client
      activeStreamIdRef.current = streamId

      try {
        await client.connect()
      } catch (error) {
        const message = error instanceof Error ? error.message : "WHIP connection failed"
        if (scheduleWhipRetry(message, "connect")) {
          return
        }
        logger.error("[Dream] WHIP connect error", { error: message, whipUrl })
        await stopWhip()
        setStatus((prev) => {
          if (prev.streamId && prev.streamId !== streamId) return prev
          return {
            ...prev,
            status: "error",
            streamId,
            whipUrl,
            message,
          }
        })
      }
    },
    [
      getCaptureStream,
      stopWhip,
      clearCountdown,
      clearStatusPoll,
      clearStartupError,
      clearWhipRetry,
    ],
  )

  useEffect(() => {
    startWhipRef.current = startWhip
  }, [startWhip])

  const startDream = useCallback(async () => {
    stoppingRef.current = false
    resolvedPromptRef.current = resolvedPrompt
    streamActiveRef.current = false
    streamStartAtRef.current = null
    clearStartupError()
    clearWhipRetry()
    if (status.status === "connecting" || status.status === "streaming") {
      return
    }

    // If we already know Daydream isn't configured, fail fast without prompting for camera.
    if (isConfigured === false) {
      const daydreamEnabled = daydreamEnabledRef.current
      setStatus({
        status: "error",
        message: daydreamEnabled === false
          ? "Daydream is not enabled"
          : "DAYDREAM_API_KEY not configured",
        countdownRemaining: 0,
      })
      return
    }

    // If configuration hasn't been checked yet, confirm it before proceeding.
    if (isConfigured === null) {
      try {
        const res = await fetch("/api/daydream/config", { cache: "no-store" })
        const data = res.ok ? await res.json().catch(() => ({})) : {}
        if (typeof data?.enabled === "boolean") {
          daydreamEnabledRef.current = data.enabled
        }
        const configured = typeof data?.configured === "boolean" ? data.configured : null
        if (configured === false) {
          setIsConfigured(false)
          const daydreamEnabled = daydreamEnabledRef.current
          setStatus({
            status: "error",
            message: daydreamEnabled === false
              ? "Daydream is not enabled"
              : "DAYDREAM_API_KEY not configured",
            countdownRemaining: 0,
          })
          return
        }
        if (configured === true) {
          setIsConfigured(true)
        }
      } catch {
        // ignore - we'll let stream creation handle unexpected failures
      }
    }

    // Pre-check: Verify camera access before creating stream
    // This prevents wasting API resources if camera is unavailable
    try {
      logger.debug("[Dream] Verifying camera access...")
      let permissionState: PermissionState | null = null
      if (navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: "camera" as PermissionName })
          permissionState = status.state
        } catch {
          // Permissions API not available or blocked; fall back to getUserMedia
        }
      }

      if (permissionState === "denied") {
        setStatus({
          status: "error",
          message: "Camera permission denied",
          countdownRemaining: 0,
        })
        return
      }

      if (permissionState !== "granted") {
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 30 },
          },
        })
        // Camera accessible - stop test stream, CinemaOverlay will acquire its own
        testStream.getTracks().forEach((track) => track.stop())
        logger.debug("[Dream] Camera access verified")
      } else {
        logger.debug("[Dream] Camera permission already granted; skipping pre-check")
      }
    } catch (err) {
      const errorName = err instanceof Error ? err.name : "Unknown"
      const errorMsg =
        errorName === "NotAllowedError"
          ? "Camera permission denied"
          : errorName === "NotFoundError"
            ? "No camera found"
            : "Camera unavailable"
      logger.error("[Dream] Camera pre-check failed", { error: err })
      setStatus({
        status: "error",
        message: errorMsg,
        countdownRemaining: 0,
      })
      return
    }

    // New sessions should start with a clean prompt-sync state.
    clearPromptSync()
    appliedPromptRef.current = null
    setPatchSupported(null) // Reset - we'll find out if PATCH works after the stream starts
    patchSupportedRef.current = null

    clearCountdown()
    setStatus({ status: "connecting", countdownRemaining: DREAM_COUNTDOWN_SECONDS, message: "Starting Dream" })
    logger.debug("[Dream] Initializing stream...", { prompt: resolvedPromptRef.current })

    try {
      // Ensure any previous WHIP session is fully stopped before starting a new stream
      await stopWhip()

      const createStream = async (): Promise<{
        response: Response
        body: unknown
        stream: DaydreamStreamResponse | null
        errorMessage: string | null
        activeStreamId: string | null
        promptUsed: string
      }> => {
        const promptUsed = resolvedPromptRef.current.trim() || DREAM_PROMPT_DEFAULT
        const payload: DaydreamStreamCreateRequest = createStreamPayload(promptUsed)
        streamModelIdRef.current = payload.params.model_id

        logger.debug("[Dream] Creating stream...", { prompt: promptUsed })
        const response = await fetch("/api/daydream/streams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const body = (await response.json().catch(() => ({}))) as unknown
        const errorMessage = getErrorMessage(body)
        const activeStreamId =
          body && typeof body === "object" && typeof (body as { activeStreamId?: unknown }).activeStreamId === "string"
            ? String((body as { activeStreamId: string }).activeStreamId)
            : null

        if (!response.ok) {
          return { response, body, stream: null, errorMessage, activeStreamId, promptUsed }
        }

        const stream = body as DaydreamStreamResponse
        return { response, body, stream, errorMessage, activeStreamId, promptUsed }
      }

      let { response, body, stream, errorMessage, activeStreamId, promptUsed } = await createStream()

      // Recovery: if the limiter believes a previous stream is still active,
      // tear it down and retry once so the user isn't stuck.
      if (!response.ok && response.status === 429 && activeStreamId) {
        logger.warn("[Dream] Stream limiter blocked creation; attempting cleanup", { activeStreamId })
        setStatus({ status: "connecting", countdownRemaining: DREAM_COUNTDOWN_SECONDS, message: "Recovering Dream…" })
        try {
          await fetch(`/api/daydream/streams/${encodeURIComponent(activeStreamId)}`, { method: "DELETE" })
        } catch (cleanupError) {
          logger.warn("[Dream] Cleanup delete failed", { error: cleanupError })
        }
        try {
          await fetch("/api/daydream/streams/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ streamId: activeStreamId }),
          })
        } catch (cleanupError) {
          logger.warn("[Dream] Cleanup unlock failed", { error: cleanupError })
        }
        await new Promise((r) => setTimeout(r, 250))
          ; ({ response, body, stream, errorMessage, activeStreamId, promptUsed } = await createStream())
      }

      if (!response.ok || !stream) {
        if (typeof errorMessage === "string" && errorMessage.includes("DAYDREAM_API_KEY")) {
          setIsConfigured(false)
        }
        logger.error("[Dream] Stream creation failed", { status: response.status, body })
        throw new Error(errorMessage || `Dream failed to start (HTTP ${response.status})`)
      }

      if (!stream.id) {
        logger.error("[Dream] Stream creation returned no id", { status: response.status, body })
        throw new Error("Dream failed to start (missing stream id)")
      }

      setIsConfigured(true)
      streamStartAtRef.current = Date.now()
      // The stream already has the creation prompt applied; avoid a no-op PATCH unless it changes.
      appliedPromptRef.current = promptUsed
      // Daydream sometimes returns both IDs; output_playback_id is the one we want for viewing.
      const extractedPlaybackId = stream.output_playback_id || stream.playback_id
      logger.debug("[Dream] Stream created", {
        id: stream.id,
        whip: stream.whip_url,
        playback_id: stream.playback_id,
        output_playback_id: stream.output_playback_id,
        playback_url: stream.playback_url,
        extractedPlaybackId,
        fullResponse: stream,
      })
      startCountdown()

      setStatus((prev) => ({
        ...prev,
        status: "connecting",
        streamId: stream.id,
        whipUrl: stream.whip_url,
        playbackId: extractedPlaybackId,
        playbackUrl: stream.playback_url,
        message: "Dream warming up",
      }))

      // Start WHIP immediately - stream was created with correct parameters
      // Per Daydream docs: PATCH is optional for runtime adjustments, not required before WHIP
      if (stream.whip_url) {
        logger.debug("[Dream] Starting WHIP ingest...")
        void startWhip(stream.id, stream.whip_url)

        // Poll status in the background to confirm Daydream becomes active
        void (async () => {
          const active = await pollStreamStatus(stream.id)
          if (active) {
            if (stoppingRef.current) return
            streamActiveRef.current = true
            clearStartupError()
            setStatus((prev) => {
              if (prev.streamId !== stream.id) return prev
              if (prev.status === "streaming") return prev
              return {
                ...prev,
                status: "streaming",
                message: "Dream active",
              }
            })
            return
          }
          if (!active) {
            clearStartupError()
            const currentStreamId = stream.id
            startupErrorTimeoutRef.current = setTimeout(() => {
              const latest = statusRef.current
              if (stoppingRef.current) return
              if (latest.streamId !== currentStreamId) return
              if (latest.status === "error") return
              if (latest.status === "streaming") return
              if ((latest.countdownRemaining ?? 0) > 0) return
              if (streamActiveRef.current) return
              setStatus((prev) => {
                if (prev.streamId !== currentStreamId) return prev
                if (prev.status === "streaming") return prev
                return {
                  ...prev,
                  status: "error",
                  message: "Daydream stream did not become active in time",
                }
              })
            }, STARTUP_CONFIG.ERROR_GRACE_MS)
          }
        })()
      }
    } catch (error) {
      const errorContext =
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : { error }
      logger.error("[Dream] Error starting dream", errorContext)
      setStatus({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to start Dream",
        countdownRemaining: 0,
      })
    }
  }, [clearCountdown, clearStartupError, clearWhipRetry, startCountdown, startWhip, status.status, stopWhip, pollStreamStatus, isConfigured, clearPromptSync, resolvedPrompt])

  // Keep prompt synced to Daydream while Dream is running.
  // Daydream may return 404 during warm-up; retries ensure persona/prompt changes
  // made during startup are eventually applied.
  // Keep statusRef current for async flows (setTimeout callbacks in syncPrompt).
  // NOTE: The sync effect (below) ALSO updates this ref to ensure it's current
  // before syncPrompt reads it, avoiding race conditions between effects.
  useEffect(() => {
    statusRef.current = status
    if (status.status === "streaming") {
      streamActiveRef.current = true
    }
    if (status.status === "idle" || status.status === "error") {
      streamActiveRef.current = false
    }
  }, [status])

  const syncPrompt = useCallback(
    async (streamId: string, force = false) => {
      logger.debug("[Dream] syncPrompt called", { streamId, force })
      if (stoppingRef.current) {
        logger.debug("[Dream] syncPrompt: stopping, skip")
        return
      }
      if (promptSyncInFlightRef.current) {
        logger.debug("[Dream] syncPrompt: already in-flight, skip")
        return
      }
      if (patchSupportedRef.current === false) {
        logger.debug("[Dream] syncPrompt: PATCH disabled for this session")
        return
      }

      const current = statusRef.current
      const overlayReadyNow =
        (current.countdownRemaining ?? DREAM_COUNTDOWN_SECONDS) <= 0
      const isActiveStatus = current.status === "streaming" || current.status === "connecting"
      const streamReady = streamActiveRef.current || current.status === "streaming"
      const isSyncable = isActiveStatus && streamReady && overlayReadyNow
      if (!isSyncable) {
        logger.debug("[Dream] syncPrompt: not ready to sync yet, skip", {
          status: current.status,
          overlayReady: overlayReadyNow,
        })
        return
      }
      if (!current.streamId || current.streamId !== streamId) {
        logger.debug("[Dream] syncPrompt: streamId mismatch")
        return
      }

      const desiredPrompt = resolvedPromptRef.current.trim() || DREAM_PROMPT_DEFAULT
      if (!desiredPrompt) {
        logger.debug("[Dream] syncPrompt: no desired prompt")
        return
      }
      // Skip equality check when force is true or a force-sync is queued for this prompt.
      const shouldForce = force || forcedPromptRef.current === desiredPrompt
      if (!shouldForce && appliedPromptRef.current === desiredPrompt) {
        logger.debug("[Dream] syncPrompt: already applied", { desiredPrompt })
        return
      }

      logger.debug("[Dream] syncPrompt: sending PATCH", { desiredPrompt, appliedPrompt: appliedPromptRef.current })
      promptSyncInFlightRef.current = true
      let shouldRetry = false
      let retryDelayMs: number | null = null
      let isWarmupRetry = false // Track "not ready" 404s separately - they're expected, not failures
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      try {
        // Send only dynamic parameters to avoid triggering pipeline reload (~30s).
        // Per Daydream docs, prompt/guidance_scale/delta can be updated without reload.
        const paramsPayload = createPromptUpdatePayload(
          desiredPrompt,
          undefined,
          streamModelIdRef.current,
        )

        const controller = new AbortController()
        timeoutId = setTimeout(() => controller.abort(), PATCH_CONFIG.TIMEOUT_MS)

        const res = await fetch(`/api/daydream/streams/${encodeURIComponent(streamId)}/parameters`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paramsPayload),
          signal: controller.signal,
        })

        if (res.ok) {
          const latestStatus = statusRef.current
          if (stoppingRef.current || latestStatus.streamId !== streamId) {
            return
          }
          appliedPromptRef.current = desiredPrompt
          setPatchSupported(true) // PATCH is working!
          clearPromptSync()

          const latestDesired = resolvedPromptRef.current.trim() || DREAM_PROMPT_DEFAULT
          if (latestDesired !== desiredPrompt) {
            // Prompt changed while PATCH was in-flight; immediately sync again
            promptSyncAttemptRef.current = 0
            queueMicrotask(() => {
              void syncPrompt(streamId)
            })
          }
          return
        }

        const retryable =
          res.status === 409 ||
          res.status === 429 ||
          (res.status >= 500 && res.status < 600)

        const text = await res.text().catch(() => "")
        const warmupAgeMs = streamStartAtRef.current
          ? Date.now() - streamStartAtRef.current
          : null
        const withinWarmupWindow =
          typeof warmupAgeMs === "number" && warmupAgeMs < PATCH_CONFIG.WARMUP_GRACE_MS

        if (res.status === 404) {
          // Check if it's a "not ready yet" response (normal during warmup) vs actual stream gone.
          // "Stream not ready yet" 404s should be retried, not treated as fatal.
          const isNotReadyYet =
            text.toLowerCase().includes("not ready") ||
            text.includes("NOT_READY") ||
            text.includes("STREAM_NOT_READY")
          if (isNotReadyYet || withinWarmupWindow) {
            // Stream still warming up - retry with backoff (don't count as failure)
            logger.debug("[Dream] Stream not ready yet, will retry PATCH")
            shouldRetry = true
            isWarmupRetry = true
          } else {
            logger.warn("[Dream] Prompt sync rejected", { status: res.status, body: text.slice(0, 160) })
            // Stream actually gone/invalid - fatal error
            setStatus((prev) => ({
              ...prev,
              status: "error",
              message: "Stream connection lost (404)"
            }))
            shouldRetry = false
          }
        } else if (retryable) {
          logger.warn("[Dream] Prompt sync rejected", { status: res.status, body: text.slice(0, 160) })
          shouldRetry = true
          if (withinWarmupWindow) {
            isWarmupRetry = true
          }
        } else {
          logger.warn("[Dream] Prompt sync rejected", { status: res.status, body: text.slice(0, 160) })
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError" && stoppingRef.current) {
          return
        }
        logger.warn("[Dream] Prompt sync failed", { error })
        shouldRetry = true
        const warmupAgeMs = streamStartAtRef.current
          ? Date.now() - streamStartAtRef.current
          : null
        const withinWarmupWindow =
          typeof warmupAgeMs === "number" && warmupAgeMs < PATCH_CONFIG.WARMUP_GRACE_MS
        if (withinWarmupWindow) {
          isWarmupRetry = true
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        promptSyncInFlightRef.current = false
      }

      // Track consecutive failures (includes non-retryable errors), but don't count
      // expected warmup 404s since those are normal during Daydream initialization.
      if (!isWarmupRetry) {
        patchFailureCountRef.current += 1

        // After too many failures, assume Daydream doesn't support PATCH for this stream.
        if (patchFailureCountRef.current >= PATCH_CONFIG.MAX_FAILURES) {
          logger.warn("[Dream] PATCH not supported for this stream - runtime updates disabled")
          setPatchSupported(false)
          patchSupportedRef.current = false
          clearPromptSync()
          return
        }
      }

      if (!shouldRetry) return

      // Exponential backoff (caps at 5s) while Daydream warms up.
      promptSyncAttemptRef.current += 1
      const attempt = promptSyncAttemptRef.current
      retryDelayMs = Math.min(5000, 500 * Math.pow(2, attempt - 1))

      if (promptSyncTimeoutRef.current) {
        clearTimeout(promptSyncTimeoutRef.current)
        promptSyncTimeoutRef.current = null
      }

      promptSyncTimeoutRef.current = setTimeout(() => {
        const next = statusRef.current
        if (stoppingRef.current) return
        // Only retry when active
        const nextOverlayReady =
          (next.countdownRemaining ?? DREAM_COUNTDOWN_SECONDS) <= 0
        const nextActiveStatus = next.status === "streaming" || next.status === "connecting"
        const nextStreamReady = streamActiveRef.current || next.status === "streaming"
        const isStillSyncable = nextActiveStatus && nextStreamReady && nextOverlayReady
        if (!isStillSyncable) return
        if (!next.streamId || next.streamId !== streamId) return
        void syncPrompt(streamId)
      }, retryDelayMs)
    },
    [clearPromptSync],
  )

  const overlayReady = status.status !== "idle" && (status.countdownRemaining ?? DREAM_COUNTDOWN_SECONDS) <= 0

  // Trigger prompt sync on any prompt change once Dream is active.
  // Daydream needs time to warm up before accepting PATCH requests, so we wait
  // for the countdown to finish and for WHIP or status polling to confirm activity.
  //
  // CRITICAL FIX: We update resolvedPromptRef.current at the START of this effect
  // rather than in a separate effect. This eliminates the race condition where
  // syncPrompt() could read a stale ref value if effects ran in the wrong order.
  useEffect(() => {
    // UPDATE REFS FIRST - eliminates race condition with syncPrompt reading stale values
    // Both refs must be current before syncPrompt reads them
    resolvedPromptRef.current = resolvedPrompt
    statusRef.current = status
    if (lastResolvedPromptRef.current !== resolvedPrompt) {
      lastResolvedPromptRef.current = resolvedPrompt
      promptSyncAttemptRef.current = 0
    }

    logger.debug("[Dream] Sync effect triggered", { resolvedPrompt, status: status.status, streamId: status.streamId })

    // Reset sync state when not active
    if (status.status !== "connecting" && status.status !== "streaming") {
      clearPromptSync()
      appliedPromptRef.current = null
      return
    }

    // Cancel any pending retry so updates feel immediate on change.
    if (promptSyncTimeoutRef.current) {
      clearTimeout(promptSyncTimeoutRef.current)
      promptSyncTimeoutRef.current = null
    }

    const streamId = status.streamId
    if (streamId && overlayReady && (status.status === "streaming" || status.status === "connecting")) {
      logger.debug("[Dream] Calling syncPrompt from effect", { streamId, resolvedPrompt })
      void syncPrompt(streamId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPrompt, status.status, status.streamId, overlayReady, clearPromptSync, syncPrompt])

  const stopDream = useCallback(async () => {
    logger.debug('[Dream] stopDream called')

    stoppingRef.current = true
    streamActiveRef.current = false
    streamStartAtRef.current = null
    clearStartupError()
    clearWhipRetry()
    // Cancel any prompt retries immediately so we don't PATCH after teardown.
    clearPromptSync()
    appliedPromptRef.current = null
    forcedPromptRef.current = null

    // Immediately reset status to idle FIRST to hide the iframe
    // This ensures the UI updates even if cleanup takes time
    setStatus({
      status: "idle",
      countdownRemaining: undefined,
      streamId: undefined,
      playbackId: undefined,
      playbackUrl: undefined,
      message: undefined,
    })
    logger.debug('[Dream] Reset to idle - ready for new dream')

    // Then clean up resources
    clearCountdown()
    clearStatusPoll()
    const streamId = activeStreamIdRef.current || status.streamId || null
    activeStreamIdRef.current = null

    // Cleanup WHIP connection
    try {
      await stopWhip()
    } catch (e) {
      logger.warn('[Dream] Error stopping WHIP', { error: e })
    }

    // Delete stream on backend
    try {
      await deleteStream(streamId)
    } catch (e) {
      logger.warn('[Dream] Error deleting stream', { error: e })
    }

    // Release the local limiter lock even if the upstream delete fails (best-effort).
    // This prevents users from getting stuck after refresh/network glitches.
    try {
      await fetch("/api/daydream/streams/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(streamId ? { streamId } : {}),
      })
    } catch (e) {
      logger.warn("[Dream] Error releasing stream lock", { error: e })
    }

    stoppingRef.current = false
  }, [clearCountdown, clearPromptSync, clearStatusPoll, clearStartupError, clearWhipRetry, deleteStream, status.streamId, stopWhip])

  // retryDream uses a ref to avoid circular dependency with startDream
  const startDreamRef = useRef(startDream)
  startDreamRef.current = startDream

  const retryDream = useCallback(async () => {
    await stopDream()
    // Small delay to ensure cleanup completes
    await new Promise((r) => setTimeout(r, 200))
    await startDreamRef.current()
  }, [stopDream])

  // Keep a ref to stopDream so we can clean up on unmount without re-running the effect when stopDream changes
  const stopDreamRef = useRef(stopDream)
  useEffect(() => {
    stopDreamRef.current = stopDream
  }, [stopDream])

  // Cleanup on unmount (normal navigation)
  useEffect(() => {
    return () => {
      clearStatusPoll()
      void stopDreamRef.current()
    }
  }, [clearStatusPoll])

  // Reliable cleanup on page refresh/close using sendBeacon
  // This ensures the rate limiter is cleared even if the page closes before fetch completes
  useEffect(() => {
    const handleBeforeUnload = () => {
      const streamId = activeStreamIdRef.current
      if (streamId) {
        // sendBeacon is more reliable for unload events than fetch
        // The end endpoint clears the rate limiter so user can restart immediately
        navigator.sendBeacon(
          "/api/daydream/streams/end",
          JSON.stringify({ streamId })
        )
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  // Force sync the current prompt (bypasses equality check)
  // Use when user explicitly submits the same prompt to force a refresh
  const forceSync = useCallback(() => {
    const current = statusRef.current
    const streamId = current.streamId
    if (!streamId) {
      logger.debug("[Dream] forceSync: no streamId")
      return
    }
    const desiredPrompt = resolvedPromptRef.current.trim() || DREAM_PROMPT_DEFAULT
    forcedPromptRef.current = desiredPrompt

    const overlayReadyNow =
      (current.countdownRemaining ?? DREAM_COUNTDOWN_SECONDS) <= 0
    if (current.status !== "streaming" || !overlayReadyNow) {
      logger.debug("[Dream] forceSync: queued until ready", {
        status: current.status,
        overlayReady: overlayReadyNow,
      })
      return
    }
    logger.debug("[Dream] forceSync: triggering forced sync")
    void syncPrompt(streamId, true)
  }, [syncPrompt])

  return {
    status,
    isConfigured,
    overlayReady,
    startDream,
    stopDream,
    retryDream,
    forceSync,
    // null = unknown, true = PATCH works, false = PATCH failed (restart needed for changes)
    patchSupported,
  }
}
