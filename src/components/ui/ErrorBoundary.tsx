"use client"

import { Component, ReactNode } from "react"
import { AlertCircle, RefreshCw, XCircle } from "lucide-react"
import { logger } from "@/lib/logger"

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  children: ReactNode
  /**
   * Name of the component for error reporting
   */
  componentName: string
  /**
   * Optional custom fallback UI
   */
  fallback?: ReactNode
  /**
   * Optional callback when error occurs
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /**
   * Whether to show a compact error UI (for smaller components)
   */
  compact?: boolean
  /**
   * Maximum number of retry attempts before showing permanent error state.
   * When undefined, retries are unlimited.
   */
  maxRetries?: number
  /**
   * Optional callback when user dismisses the error state.
   * When provided, a Close button appears alongside the retry button.
   */
  onClose?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  retryCount: number
}

/**
 * ErrorBoundary
 *
 * Reusable error boundary for wrapping critical components.
 * Provides graceful degradation instead of crashing the entire app.
 *
 * @example
 * <ErrorBoundary componentName="AudioPlayer">
 *   <AudioPlayer />
 * </ErrorBoundary>
 *
 * @example Compact variant for inline components
 * <ErrorBoundary componentName="TrackInfo" compact>
 *   <TrackInfo track={track} />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    logger.error(`Component error in ${this.props.componentName}`, {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })

    // Call optional callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1,
    }))
  }

  handleClose = () => {
    this.setState({ hasError: false, error: null, retryCount: 0 })
    if (this.props.onClose) {
      this.props.onClose()
    }
  }

  render() {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { maxRetries, onClose, compact, componentName } = this.props
      const hasReachedMaxRetries = maxRetries !== undefined && this.state.retryCount >= maxRetries
      const canRetry = !hasReachedMaxRetries

      // Compact error UI for smaller components
      if (compact) {
        return (
          <div className="flex items-center justify-center gap-2 p-4 text-white/60">
            {hasReachedMaxRetries ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span className="text-sm">
              {hasReachedMaxRetries ? "Unable to load" : "Failed to load"}
            </span>
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="text-sm text-purple-400 hover:text-purple-300 underline focus-ring rounded"
              >
                Retry
              </button>
            )}
            {onClose && (
              <button
                onClick={this.handleClose}
                className="text-sm text-white/60 hover:text-white underline focus-ring rounded"
              >
                Close
              </button>
            )}
          </div>
        )
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
          {hasReachedMaxRetries ? (
            <XCircle className="h-10 w-10 text-red-500 mb-3" />
          ) : (
            <AlertCircle className="h-10 w-10 text-yellow-500 mb-3" />
          )}
          <h3 className="text-base font-semibold text-white mb-1">
            {hasReachedMaxRetries
              ? `Unable to Load ${componentName}`
              : `${componentName} Error`}
          </h3>
          <p className="text-sm text-white/60 mb-4 text-center max-w-xs">
            {hasReachedMaxRetries
              ? "We've tried multiple times but couldn't load this section. Please try again later."
              : this.state.retryCount > 0
                ? `Still having trouble loading. (Attempt ${this.state.retryCount + 1}${maxRetries ? ` of ${maxRetries}` : ""})`
                : "Something went wrong loading this section."}
          </p>
          <div className="flex items-center gap-3">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 text-white text-sm hover:bg-white/20 transition-colors focus-ring"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try Again
              </button>
            )}
            {onClose && (
              <button
                onClick={this.handleClose}
                className="inline-flex items-center px-4 py-2 rounded-full border border-white/10 text-white/70 text-sm hover:text-white hover:bg-white/10 transition-colors focus-ring"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * @deprecated Use ErrorBoundary instead. ComponentErrorBoundary is kept for backward compatibility.
 */
export const ComponentErrorBoundary = ErrorBoundary
