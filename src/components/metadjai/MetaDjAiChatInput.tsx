"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import clsx from "clsx"
import { SendHorizontal, Square, RotateCcw, Mic, Loader2 } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"
import { useCspStyle } from "@/hooks/use-csp-style"
import { logger } from "@/lib/logger"

interface MetaDjAiChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isStreaming: boolean
  isRateLimited: boolean
  onStop: () => void
  errorMessage?: string | null
  /** Callback to retry the last failed message */
  onRetry?: () => void
  /** Whether a retry is available (last message failed) */
  canRetry?: boolean
  leadingAccessory?: React.ReactNode
  footerRight?: React.ReactNode
}

/**
 * MetaDjAiChatInput - Chat input form with submit/stop controls
 *
 * Features:
 * - Auto-resizing textarea (max 128px height)
 * - Enter to send, Shift+Enter for new line
 * - Mobile keyboard handling (scroll input into view)
 * - Streaming indicator with stop button
 * - Rate limit visual feedback
 */
export function MetaDjAiChatInput({
  value,
  onChange,
  onSubmit,
  isStreaming,
  isRateLimited,
  onStop,
  errorMessage,
  onRetry,
  canRetry = false,
  leadingAccessory,
  footerRight,
}: MetaDjAiChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [textareaHeight, setTextareaHeight] = useState("auto")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { showToast } = useToast()

  // Max recording duration in milliseconds (60 seconds to prevent excessive API usage)
  const MAX_RECORDING_DURATION_MS = 60_000

  const extractTranscriptionText = (payload: unknown) => {
    if (typeof payload === "string") {
      const trimmed = payload.trim()
      return trimmed ? trimmed : ""
    }
    if (!payload || typeof payload !== "object") return ""

    const record = payload as Record<string, unknown>
    const nested = record.data as Record<string, unknown> | undefined
    const candidates = [
      record.text,
      record.transcript,
      record.output_text,
      nested?.text,
      nested?.transcript,
      nested?.output_text,
    ]

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim()
      }
    }

    return ""
  }

  const isSubmitReady = Boolean(value.trim()) && !isRateLimited && !isStreaming
  const statusMessage = isRateLimited
    ? "Rate limit active - try again in a moment."
    : isTranscribing
      ? "Transcribing audio..."
      : isRecording
        ? "Recording... tap to stop."
        : null

  // Auto-resize textarea based on content
  // Properly handles both expansion and contraction
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // First, set height via state to "auto" to reset and get accurate scrollHeight
    setTextareaHeight("auto")
    
    // Use requestAnimationFrame to ensure DOM has updated after auto reset
    const frame = window.requestAnimationFrame(() => {
      if (!textareaRef.current) return
      // Get the natural content height
      const contentHeight = textareaRef.current.scrollHeight
      // Clamp between min height (44px for single line) and max (128px)
      const newHeight = Math.max(44, Math.min(contentHeight, 128))
      setTextareaHeight(`${newHeight}px`)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [value])

  const textareaStyleId = useCspStyle({
    height: textareaHeight,
  })

  // Mobile keyboard handling
  // Parent handles keyboard height via visualViewport when available.
  // Fallback: ensure caret stays visible on browsers without visualViewport.
  const handleInputFocus = useCallback(() => {
    if (typeof window === "undefined") return
    if (!window.visualViewport) {
      textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        if (!isRateLimited) {
          onSubmit()
        }
      }
    },
    [isRateLimited, onSubmit]
  )

  const handleFormSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      if (isSubmitReady) {
        onSubmit()
      }
    },
    [isSubmitReady, onSubmit]
  )

  const startRecording = useCallback(async () => {
    try {
      if (typeof MediaRecorder === 'undefined') {
        showToast({ message: "Voice input isn't supported in this browser", variant: "error" })
        return
      }
      if (!navigator?.mediaDevices?.getUserMedia) {
        showToast({ message: "Microphone access isn't available here", variant: "error" })
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Determine best supported mime type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/ogg;codecs=opus'
      ]
      const options = mimeTypes.find(type => MediaRecorder.isTypeSupported(type))

      const recorder = new MediaRecorder(stream, options ? { mimeType: options } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        const tracks = stream.getTracks()
        tracks.forEach(track => track.stop())

        if (chunksRef.current.length === 0) {
          setIsRecording(false)
          return
        }

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setIsTranscribing(true)
        setIsRecording(false)

        try {
          const formData = new FormData()
          formData.append('file', blob)

          const response = await fetch('/api/metadjai/transcribe', {
            method: 'POST',
            body: formData,
          })

          const data = await response.json().catch(() => null)
          if (!response.ok) {
            const message = typeof data?.error === "string" ? data.error : "Failed to transcribe audio"
            showToast({ message, variant: "error" })
            return
          }

          const transcript = extractTranscriptionText(data)
          if (!transcript) {
            logger.error('[MetaDJai] Empty transcription response', {
              responseKeys: data && typeof data === "object" ? Object.keys(data) : typeof data,
            })
            showToast({ message: "No speech detected. Try again.", variant: "error" })
            return
          }

          const spacer = value.trim() ? " " : ""
          const newText = `${value}${spacer}${transcript}`
          onChange(newText)
          textareaRef.current?.focus()
        } catch (error) {
          logger.error('[MetaDJai] Transcription error', { error: String(error) })
          showToast({ message: "Failed to transcribe audio", variant: "error" })
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start()
      setIsRecording(true)

      // Auto-stop after max duration to prevent excessive recordings
      maxDurationTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
          showToast({ message: "Recording stopped (60 second limit reached)" })
        }
      }, MAX_RECORDING_DURATION_MS)
    } catch (error) {
      logger.error('[MetaDJai] Microphone access error', { error: String(error) })
      showToast({ message: "Could not access microphone", variant: "error" })
    }
  }, [onChange, value, showToast, MAX_RECORDING_DURATION_MS])

  const stopRecording = useCallback(() => {
    // Clear max duration timeout when manually stopped
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current)
      maxDurationTimeoutRef.current = null
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }, [isRecording])

  return (
    <form onSubmit={handleFormSubmit} className="space-y-1 relative z-20 max-w-2xl mx-auto w-full">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 mb-4 backdrop-blur-xs"
        >
          <span>{errorMessage}</span>
          {canRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-100 transition-all hover:bg-red-500/30 hover:text-white focus-ring shrink-0"
              aria-label="Retry last message"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-3xl border border-(--border-standard) bg-black/40 p-1.5 sm:flex-row sm:items-end sm:gap-2 shadow-lg backdrop-blur-md transition-all duration-300 focus-within:bg-black/60 focus-within:border-purple-500/50 focus-within:shadow-[0_0_25px_rgba(168,85,247,0.15)]">
        <div className="flex-1 min-h-[44px] flex items-center gap-2">
          {leadingAccessory ? (
            <div className="flex items-center">
              {leadingAccessory}
            </div>
          ) : null}
          <div className="flex-1 min-h-[44px] flex items-center">
            <label htmlFor="metadjai-input" className="sr-only">
              Message MetaDJai
            </label>
            <textarea
              id="metadjai-input"
              ref={textareaRef}
              data-csp-style={textareaStyleId}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              enterKeyHint="send"
              rows={1}
              placeholder="Ask MetaDJai..."
              className="w-full resize-none bg-transparent px-2.5 py-2.5 text-base text-white placeholder:text-white/70 max-h-32 overflow-y-auto overscroll-contain font-medium focus:outline-none focus-visible:outline-none scrollbar-thin"
            />
          </div>
        </div>
        <div className="flex items-center justify-end pb-0.5 pr-0.5 gap-2">
          {/* Microphone Button */}
          {!isStreaming && (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 focus-ring-glow",
                isRecording
                  ? "bg-red-500 text-white hover:bg-red-600 ring-2 ring-red-400/50 ring-offset-2 ring-offset-black/50"
                  : "bg-white/5 text-muted-accessible hover:bg-white/10 hover:text-white/80",
                isTranscribing && "cursor-wait opacity-50"
              )}
              aria-label={isRecording ? "Stop recording" : "Use microphone"}
              title={isRecording ? "Stop recording" : "Use microphone"}
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <Square className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          )}

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95 focus-ring-glow"
              aria-label="Stop response"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isSubmitReady}
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 shadow-lg focus-ring-glow",
                isSubmitReady
                  ? "gradient-4 text-white hover:scale-105 hover:shadow-cyan-500/25 hover:brightness-110"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              )}
              aria-label="Send message"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4">
        {/* WCAG: text-white/70 for 4.5:1 contrast on AI disclaimer (important user info) */}
        <p className="text-[10px] text-white/70 font-medium tracking-wide text-center">
          MetaDJai can make mistakes. Verify critical info.
        </p>
        {statusMessage ? (
          <span className="text-[10px] text-white/60 font-medium tracking-wide">
            {statusMessage}
          </span>
        ) : null}
        {footerRight ? <div className="shrink-0">{footerRight}</div> : null}
      </div>
    </form>
  )
}
