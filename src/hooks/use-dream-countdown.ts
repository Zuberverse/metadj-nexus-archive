"use client"

/**
 * Daydream Countdown Hook
 *
 * Manages the warmup countdown timer displayed before showing
 * the Dream video overlay.
 *
 * @module hooks/use-dream-countdown
 */

import { useCallback, useRef } from "react"
import { DREAM_COUNTDOWN_SECONDS } from "@/lib/daydream/config"
import type { DaydreamStatus } from "@/types/daydream.types"

interface UseDreamCountdownOptions {
  /** Callback to update status with new countdown value */
  onUpdate: (updater: (prev: DaydreamStatus) => DaydreamStatus) => void
}

/**
 * Hook for managing Dream warmup countdown.
 *
 * @returns Object containing:
 *   - `startCountdown`: Function to start the countdown
 *   - `clearCountdown`: Function to stop the countdown
 */
export function useDreamCountdown({ onUpdate }: UseDreamCountdownOptions) {
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const startCountdown = useCallback(() => {
    clearCountdown()
    onUpdate((prev) => ({ ...prev, countdownRemaining: DREAM_COUNTDOWN_SECONDS }))

    countdownRef.current = setInterval(() => {
      onUpdate((prev) => {
        const next = Math.max(0, (prev.countdownRemaining ?? DREAM_COUNTDOWN_SECONDS) - 1)
        if (next === 0 && countdownRef.current) {
          clearInterval(countdownRef.current)
          countdownRef.current = null
        }
        return { ...prev, countdownRemaining: next }
      })
    }, 1000)
  }, [clearCountdown, onUpdate])

  return {
    startCountdown,
    clearCountdown,
  }
}
