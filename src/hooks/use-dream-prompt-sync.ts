"use client"

/**
 * Daydream Prompt Synchronization Hook
 *
 * Manages runtime prompt updates to Daydream streams via PATCH requests.
 * Handles retry logic with exponential backoff during stream warmup.
 *
 * Key behaviors:
 * - Detects if PATCH is supported (Daydream may not support runtime updates)
 * - Exponential backoff during warmup period (expected 404s)
 * - Force sync capability for re-rolling same prompt
 * - Automatic disable after too many consecutive failures
 *
 * @module hooks/use-dream-prompt-sync
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  DREAM_COUNTDOWN_SECONDS,
  DREAM_PROMPT_DEFAULT,
  createPromptUpdatePayload,
} from "@/lib/daydream/config"
import { PATCH_CONFIG } from "@/lib/daydream/utils"
import { logger } from "@/lib/logger"
import type { DaydreamStatus } from "@/types/daydream.types"

interface UseDreamPromptSyncOptions {
  /** Current resolved prompt to sync */
  resolvedPrompt: string
  /** Current stream status */
  status: DaydreamStatus
  /** Whether the overlay countdown is ready (countdown <= 0) */
  overlayReady: boolean
  /** Whether the stream is actively receiving data */
  streamActive: boolean
  /** Reference to stream start time for warmup grace period */
  getStreamStartTime: () => number | null
  /** Current model ID for the stream */
  getModelId: () => string
  /** Whether the hook is in stopping state */
  isStopping: () => boolean
}

interface UseDreamPromptSyncReturn {
  /** Synchronize prompt to current stream */
  syncPrompt: (streamId: string, force?: boolean) => Promise<void>
  /** Force sync the current prompt (bypasses equality check) */
  forceSync: () => void
  /** Clear all pending sync operations */
  clearPromptSync: () => void
  /** Whether PATCH is supported (null = unknown, true = works, false = disabled) */
  patchSupported: boolean | null
  /** Last successfully applied prompt */
  appliedPrompt: string | null
  /** Set the applied prompt (for stream creation) */
  setAppliedPrompt: (prompt: string | null) => void
  /** Reset patch support detection for new stream */
  resetPatchSupport: () => void
}

/**
 * Hook for synchronizing prompts to Daydream streams.
 *
 * @returns Object containing sync functions and state
 */
export function useDreamPromptSync({
  resolvedPrompt,
  status,
  overlayReady,
  streamActive,
  getStreamStartTime,
  getModelId,
  isStopping,
}: UseDreamPromptSyncOptions): UseDreamPromptSyncReturn {
  const [patchSupported, setPatchSupported] = useState<boolean | null>(null)
  const patchSupportedRef = useRef<boolean | null>(null)

  // Refs for tracking sync state
  const appliedPromptRef = useRef<string | null>(null)
  const forcedPromptRef = useRef<string | null>(null)
  const promptSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const promptSyncInFlightRef = useRef(false)
  const promptSyncAttemptRef = useRef(0)
  const patchFailureCountRef = useRef(0)
  const resolvedPromptRef = useRef(resolvedPrompt)
  const statusRef = useRef(status)

  // Keep refs in sync
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

  const setAppliedPrompt = useCallback((prompt: string | null) => {
    appliedPromptRef.current = prompt
  }, [])

  const resetPatchSupport = useCallback(() => {
    setPatchSupported(null)
    patchSupportedRef.current = null
    patchFailureCountRef.current = 0
  }, [])

  const syncPrompt = useCallback(
    async (streamId: string, force = false) => {
      logger.debug("[Dream] syncPrompt called", { streamId, force })
      if (isStopping()) {
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
        const paramsPayload = createPromptUpdatePayload(
          desiredPrompt,
          undefined,
          getModelId(),
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
          if (isStopping() || latestStatus.streamId !== streamId) {
            return
          }
          appliedPromptRef.current = desiredPrompt
          setPatchSupported(true)
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
        const streamStartTime = getStreamStartTime()
        const warmupAgeMs = streamStartTime ? Date.now() - streamStartTime : null
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
        if (error instanceof Error && error.name === "AbortError" && isStopping()) {
          return
        }
        logger.warn("[Dream] Prompt sync failed", { error })
        shouldRetry = true
        const streamStartTime = getStreamStartTime()
        const warmupAgeMs = streamStartTime ? Date.now() - streamStartTime : null
        const withinWarmupWindow =
          typeof warmupAgeMs === "number" && warmupAgeMs < PATCH_CONFIG.WARMUP_GRACE_MS
        if (withinWarmupWindow) {
          isWarmupRetry = true
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        promptSyncInFlightRef.current = false
      }

      // Track consecutive failures, but don't count expected warmup 404s
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

      // Exponential backoff (caps at 5s) while Daydream warms up
      promptSyncAttemptRef.current += 1
      const attempt = promptSyncAttemptRef.current
      const retryDelayMs = Math.min(5000, 500 * Math.pow(2, attempt - 1))

      if (promptSyncTimeoutRef.current) {
        clearTimeout(promptSyncTimeoutRef.current)
        promptSyncTimeoutRef.current = null
      }

      promptSyncTimeoutRef.current = setTimeout(() => {
        const next = statusRef.current
        if (isStopping()) return
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
    [clearPromptSync, getModelId, getStreamStartTime, isStopping, streamActive],
  )

  // Force sync the current prompt (bypasses equality check)
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

  // Trigger sync on prompt changes when stream is active
  useEffect(() => {
    // Reset sync state when not active
    if (status.status !== "connecting" && status.status !== "streaming") {
      clearPromptSync()
      appliedPromptRef.current = null
      return
    }

    // Cancel any pending retry so updates feel immediate on change
    if (promptSyncTimeoutRef.current) {
      clearTimeout(promptSyncTimeoutRef.current)
      promptSyncTimeoutRef.current = null
    }

    const streamId = status.streamId
    if (streamId && overlayReady && (status.status === "streaming" || status.status === "connecting")) {
      logger.debug("[Dream] Calling syncPrompt from effect", { streamId, resolvedPrompt })
      void syncPrompt(streamId)
    }
  }, [resolvedPrompt, status.status, status.streamId, overlayReady, clearPromptSync, syncPrompt])

  return {
    syncPrompt,
    forceSync,
    clearPromptSync,
    patchSupported,
    appliedPrompt: appliedPromptRef.current,
    setAppliedPrompt,
    resetPatchSupport,
  }
}
