"use client"

/**
 * Dream Status Polling Hook
 *
 * Polls Daydream stream status until active or max attempts reached.
 * Extracted from use-dream.ts for better separation of concerns.
 *
 * @module hooks/dream/use-dream-status-poll
 */

import { useCallback, useRef } from "react"
import {
  DREAM_STATUS_POLL_INTERVAL_MS,
  DREAM_STATUS_POLL_MAX_ATTEMPTS,
} from "@/lib/daydream/config"
import { PATCH_CONFIG } from "@/lib/daydream/utils"

export interface UseStatusPollOptions {
  /** Stream start timestamp for warmup window calculation */
  streamStartAt: number | null
}

export interface UseStatusPollReturn {
  /** Poll stream status until active or max attempts */
  pollStreamStatus: (streamId: string, attempt?: number) => Promise<boolean>
  /** Clear any pending poll timeout */
  clearStatusPoll: () => void
}

/**
 * Hook for polling Daydream stream status.
 *
 * Handles:
 * - Periodic status polling with configurable interval
 * - Warmup window grace period handling
 * - Various response formats from Daydream API
 * - Max attempt limiting
 */
export function useStatusPoll({
  streamStartAt,
}: UseStatusPollOptions): UseStatusPollReturn {
  const statusPollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref to hold the latest pollStreamStatus function for recursive calls
  const pollFnRef = useRef<((streamId: string, attempt?: number) => Promise<boolean>) | null>(null)

  const clearStatusPoll = useCallback(() => {
    if (statusPollRef.current) {
      clearTimeout(statusPollRef.current)
      statusPollRef.current = null
    }
  }, [])

  const pollStreamStatus = useCallback(
    async (streamId: string, attempt = 0): Promise<boolean> => {
      const warmupAgeMs = streamStartAt ? Date.now() - streamStartAt : null
      const withinWarmupWindow =
        typeof warmupAgeMs === "number" && warmupAgeMs < PATCH_CONFIG.WARMUP_GRACE_MS

      const waitAndRetry = async () => {
        await new Promise<void>((resolve) => {
          statusPollRef.current = setTimeout(resolve, DREAM_STATUS_POLL_INTERVAL_MS)
        })
        // Use ref to get latest function version for recursive call
        return pollFnRef.current?.(streamId, attempt + 1) ?? false
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
    [streamStartAt],
  )

  // Keep ref updated with latest function for recursive calls
  pollFnRef.current = pollStreamStatus

  return {
    pollStreamStatus,
    clearStatusPoll,
  }
}
