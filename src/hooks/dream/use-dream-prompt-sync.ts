"use client"

/**
 * Dream Prompt Synchronization Hook
 *
 * Handles prompt synchronization with Daydream API via PATCH requests.
 * Includes exponential backoff retry logic and PATCH support detection.
 * Extracted from use-dream.ts for better separation of concerns.
 *
 * @module hooks/dream/use-dream-prompt-sync
 */

import { useCallback, useRef, useState, useEffect } from "react"
import {
  DREAM_COUNTDOWN_SECONDS,
  DREAM_PROMPT_DEFAULT,
  createPromptUpdatePayload,
} from "@/lib/daydream/config"
import { PATCH_CONFIG } from "@/lib/daydream/utils"
import { logger } from "@/lib/logger"
import type { DaydreamStatus } from "@/types/daydream.types"

export interface UsePromptSyncOptions {
  /** Current resolved prompt to sync */
  resolvedPrompt: string
  /** Current stream status */
  status: DaydreamStatus
  /** Stream start timestamp for warmup window calculation */
  streamStartAt: number | null
  /** Model ID for the stream */
  modelId: string
  /** Whether the stream is active */
  streamActive: boolean
  /** Flag indicating intentional stop in progress */
  isStopping: boolean
  /** Callback when status should change (for error states) */
  onStatusChange?: (update: Partial<DaydreamStatus>) => void
}

export interface UsePromptSyncReturn {
  /** Whether PATCH is supported (null = unknown, true = yes, false = no) */
  patchSupported: boolean | null
  /** Currently applied prompt */
  appliedPrompt: string | null
  /** Sync prompt to Daydream */
  syncPrompt: (streamId: string, force?: boolean) => Promise<void>
  /** Force sync (bypasses equality check) */
  forceSync: () => void
  /** Clear prompt sync state and timeouts */
  clearPromptSync: () => void
  /** Reset applied prompt (call on stream start) */
  resetAppliedPrompt: (prompt: string | null) => void
  /** Set PATCH supported state */
  setPatchSupported: (supported: boolean | null) => void
}

/**
 * Hook for synchronizing prompts with Daydream API.
 *
 * Handles:
 * - PATCH requests with exponential backoff retry
 * - PATCH support detection (auto-disable after failures)
 * - Warmup window tolerance
 * - Force sync for re-rolls
 */
export function usePromptSync({
  resolvedPrompt,
  status,
  streamStartAt,
  modelId,
  streamActive,
  isStopping,
  onStatusChange,
}: UsePromptSyncOptions): UsePromptSyncReturn {
  const [patchSupported, setPatchSupported] = useState<boolean | null>(null)
  const patchSupportedRef = useRef<boolean | null>(null)
  const patchFailureCountRef = useRef(0)

  const promptSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const promptSyncInFlightRef = useRef(false)
  const promptSyncAttemptRef = useRef(0)
  const appliedPromptRef = useRef<string | null>(null)
  const forcedPromptRef = useRef<string | null>(null)
  const resolvedPromptRef = useRef(resolvedPrompt)
  const statusRef = useRef(status)

  // Keep refs synced
  useEffect(() => {
    patchSupportedRef.current = patchSupported
  }, [patchSupported])

  useEffect(() => {
    resolvedPromptRef.current = resolvedPrompt
  }, [resolvedPrompt])

  useEffect(() => {
    statusRef.current = status
  }, [status])

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

  const resetAppliedPrompt = useCallback((prompt: string | null) => {
    appliedPromptRef.current = prompt
  }, [])

  const syncPrompt = useCallback(
    async (streamId: string, force = false) => {
      logger.debug("[Dream] syncPrompt called", { streamId, force })

      if (isStopping) {
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
      const streamReady = streamActive || current.status === "streaming"
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
      let isWarmupRetry = false
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      try {
        const paramsPayload = createPromptUpdatePayload(desiredPrompt, undefined, modelId)
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
          if (isStopping || latestStatus.streamId !== streamId) {
            return
          }
          appliedPromptRef.current = desiredPrompt
          setPatchSupported(true)
          clearPromptSync()

          const latestDesired = resolvedPromptRef.current.trim() || DREAM_PROMPT_DEFAULT
          if (latestDesired !== desiredPrompt) {
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
        const warmupAgeMs = streamStartAt ? Date.now() - streamStartAt : null
        const withinWarmupWindow =
          typeof warmupAgeMs === "number" && warmupAgeMs < PATCH_CONFIG.WARMUP_GRACE_MS

        if (res.status === 404) {
          const isNotReadyYet =
            text.toLowerCase().includes("not ready") ||
            text.includes("NOT_READY") ||
            text.includes("STREAM_NOT_READY")

          if (isNotReadyYet || withinWarmupWindow) {
            logger.debug("[Dream] Stream not ready yet, will retry PATCH")
            shouldRetry = true
            isWarmupRetry = true
          } else {
            logger.warn("[Dream] Prompt sync rejected", { status: res.status, body: text.slice(0, 160) })
            onStatusChange?.({
              status: "error",
              message: "Stream connection lost (404)",
            })
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
        if (error instanceof Error && error.name === "AbortError" && isStopping) {
          return
        }
        logger.warn("[Dream] Prompt sync failed", { error })
        shouldRetry = true
        const warmupAgeMs = streamStartAt ? Date.now() - streamStartAt : null
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

      // Track consecutive failures
      if (!isWarmupRetry) {
        patchFailureCountRef.current += 1
        if (patchFailureCountRef.current >= PATCH_CONFIG.MAX_FAILURES) {
          logger.warn("[Dream] PATCH not supported for this stream - runtime updates disabled")
          setPatchSupported(false)
          patchSupportedRef.current = false
          clearPromptSync()
          return
        }
      }

      if (!shouldRetry) return

      // Exponential backoff
      promptSyncAttemptRef.current += 1
      const attempt = promptSyncAttemptRef.current
      const retryDelayMs = Math.min(5000, 500 * Math.pow(2, attempt - 1))

      if (promptSyncTimeoutRef.current) {
        clearTimeout(promptSyncTimeoutRef.current)
        promptSyncTimeoutRef.current = null
      }

      promptSyncTimeoutRef.current = setTimeout(() => {
        const next = statusRef.current
        if (isStopping) return
        const nextOverlayReady =
          (next.countdownRemaining ?? DREAM_COUNTDOWN_SECONDS) <= 0
        const nextActiveStatus = next.status === "streaming" || next.status === "connecting"
        const nextStreamReady = streamActive || next.status === "streaming"
        const isStillSyncable = nextActiveStatus && nextStreamReady && nextOverlayReady
        if (!isStillSyncable) return
        if (!next.streamId || next.streamId !== streamId) return
        void syncPrompt(streamId)
      }, retryDelayMs)
    },
    [isStopping, streamActive, streamStartAt, modelId, clearPromptSync, onStatusChange],
  )

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
    patchSupported,
    appliedPrompt: appliedPromptRef.current,
    syncPrompt,
    forceSync,
    clearPromptSync,
    resetAppliedPrompt,
    setPatchSupported,
  }
}
