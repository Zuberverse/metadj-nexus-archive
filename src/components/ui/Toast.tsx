"use client"

import { type FC, useEffect, useState, useRef, useCallback } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { type ToastVariant } from "@/types"
import { Button, IconButton } from "./Button"

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastProps {
  id: string
  message: string
  variant?: ToastVariant
  duration?: number
  action?: ToastAction
  onDismiss: (id: string) => void
  /** Count of collapsed similar toasts */
  collapseCount?: number
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: typeof CheckCircle }> = {
  success: {
    bg: "bg-(--metadj-emerald)/10",
    border: "border-white/15",
    icon: CheckCircle,
  },
  error: {
    bg: "bg-(--metadj-red)/10",
    border: "border-white/15",
    icon: AlertCircle,
  },
  info: {
    bg: "bg-(--metadj-purple)/10",
    border: "border-white/15",
    icon: Info,
  },
  warning: {
    bg: "bg-(--metadj-amber)/10",
    border: "border-(--metadj-amber)/30",
    icon: AlertTriangle,
  },
}

const iconColors: Record<ToastVariant, string> = {
  success: "text-(--metadj-emerald)",
  error: "text-(--metadj-red)",
  info: "text-(--metadj-purple)",
  warning: "text-(--metadj-amber)",
}

export const Toast: FC<ToastProps> = ({
  id,
  message,
  variant = "info",
  duration = 3000,
  action,
  onDismiss,
  collapseCount = 1,
}) => {
  const { bg, border, icon: Icon } = variantStyles[variant]
  const iconColor = iconColors[variant]
  const showCount = collapseCount > 1

  // WCAG: Use role="alert" for error/warning (immediate announcement) vs role="status" for info/success
  const isUrgent = variant === "error" || variant === "warning"
  const role = isUrgent ? "alert" : "status"
  const ariaLive = isUrgent ? "assertive" : "polite"

  // Track hover state to pause auto-dismiss (WCAG 2.2.1 - Timing Adjustable)
  const [isPaused, setIsPaused] = useState(false)
  const remainingTimeRef = useRef(duration)
  const startTimeRef = useRef(0) // Initialized on mount
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback((timeRemaining: number) => {
    clearTimer()
    if (timeRemaining > 0) {
      startTimeRef.current = Date.now()
      remainingTimeRef.current = timeRemaining
      timerRef.current = setTimeout(() => {
        onDismiss(id)
      }, timeRemaining)
    }
  }, [clearTimer, id, onDismiss])

  // Handle mouse enter - pause the timer
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true)
    clearTimer()
    // Calculate remaining time
    const elapsed = Date.now() - startTimeRef.current
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed)
  }, [clearTimer])

  // Handle mouse leave - resume the timer
  const handleMouseLeave = useCallback(() => {
    setIsPaused(false)
    // Ensure at least 1 second remains after un-pausing for user comfort
    const timeToStart = Math.max(remainingTimeRef.current, 1000)
    startTimer(timeToStart)
  }, [startTimer])

  // Initial timer setup for toasts without action
  useEffect(() => {
    if (!action && duration > 0 && !isPaused) {
      startTimer(duration)
      return () => clearTimer()
    }
    return undefined
  }, [action, duration, isPaused, startTimer, clearTimer])

  // Auto-dismiss after extended time even with undo button (5 seconds when not hovered)
  useEffect(() => {
    if (action && !isPaused) {
      remainingTimeRef.current = 5000
      startTimer(5000)
      return () => clearTimer()
    }
    return undefined
  }, [action, isPaused, startTimer, clearTimer])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  return (
    <div
      role={role}
      aria-live={ariaLive}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      className={`
        group relative flex items-center gap-3 rounded-2xl border ${border} ${bg}
        px-4 py-3 backdrop-blur-xl shadow-lg
        animate-slide-in-right
        min-w-[300px] max-w-[400px]
        ${isPaused ? "ring-2 ring-white/20" : ""}
        transition-shadow duration-200
      `}
    >
      {/* Icon with optional collapse count badge */}
      <div className="relative shrink-0">
        <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
        {showCount && (
          <span
            className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold text-white"
            aria-label={`${collapseCount} similar notifications`}
          >
            {collapseCount}
          </span>
        )}
      </div>

      {/* Message */}
      <p className="flex-1 text-sm font-medium text-white leading-snug">{message}</p>

      {/* Action Button (Undo) */}
      {action && (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            action.onClick()
            onDismiss(id)
          }}
          className="shrink-0 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30"
        >
          {action.label}
        </Button>
      )}

      {/* Dismiss Button */}
      <IconButton
        variant="ghost"
        size="sm"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        icon={<X className="h-4 w-4" />}
        className="shrink-0 text-white/70 hover:text-white hover:bg-white/10"
      />
    </div>
  )
}
