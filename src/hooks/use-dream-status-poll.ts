"use client"

/**
 * Daydream Stream Status Polling Hook
 *
 * Polls the Daydream API to determine when a stream becomes active.
 * Supports retry logic with warmup grace period for newly created streams.
 *
 * @module hooks/use-dream-status-poll
 */

import { useCallback, useEffect, useRef } from "react"
import { DREAM_STATUS_POLL_INTERVAL_MS, DREAM_STATUS_POLL_MAX_ATTEMPTS } from "@/lib/daydream/config"
import { PATCH_CONFIG } from "@/lib/daydream/utils"

interface UseDreamStatusPollOptions {
  /** Reference to stream start time for warmup grace period */
  getStreamStartTime: () => number | null
}

/**
 * Hook for polling Daydream stream status.
 *
 * @returns Object containing:
 *   - `pollStreamStatus`: Function to poll until stream is active
 *   - `clearStatusPoll`: Function to cancel pending polls
 */
export function useDreamStatusPoll({ getStreamStartTime }: UseDreamStatusPollOptions) {
  const statusPollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearStatusPoll = useCallback(() => {
    if (statusPollRef.current) {
      clearTimeout(statusPollRef.current)
      statusPollRef.current = null
    }
  }, [])

  // Use a ref to hold the poll function for recursive calls
  const pollFnRef = useRef<((streamId: string, attempt?: number) => Promise<boolean>) | null>(null)

  /**
   * Poll stream status until active or max attempts reached.
   * Returns true if stream becomes active, false otherwise.
   */
  const pollStreamStatus = useCallback(
    async (streamId: string, attempt = 0): Promise<boolean> => {
      const streamStartTime = getStreamStartTime()
      const warmupAgeMs = streamStartTime ? Date.now() - streamStartTime : null
      const withinWarmupWindow =
        typeof warmupAgeMs === "number" && warmupAgeMs < PATCH_CONFIG.WARMUP_GRACE_MS

      const waitAndRetry = async () => {
        await new Promise<void>((resolve) => {
          statusPollRef.current = setTimeout(resolve, DREAM_STATUS_POLL_INTERVAL_MS)
        })
        // Use the ref to call the latest version of the function
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
    [getStreamStartTime],
  )

  // Keep the ref updated for recursive calls
  useEffect(() => {
    pollFnRef.current = pollStreamStatus
  }, [pollStreamStatus])

  return {
    pollStreamStatus,
    clearStatusPoll,
  }
}
