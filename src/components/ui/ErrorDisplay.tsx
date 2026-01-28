'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

// ============================================================================
// ErrorDisplay Component
// ============================================================================
// Unified error display for consistent error states across the app.
// Supports inline, fullscreen, and toast variants with glassmorphism styling.
// ============================================================================

export type ErrorVariant = 'inline' | 'fullscreen' | 'toast';

// ============================================================================
// Variant Styles
// ============================================================================

const variantStyles: Record<ErrorVariant, string> = {
  inline: cn(
    'relative rounded-2xl',
    'bg-(--bg-surface-base)/70 backdrop-blur-xl',
    'border border-(--metadj-red)/20',
    'p-6',
    'animate-fade-in',
  ),
  fullscreen: cn(
    'fixed inset-0 z-50',
    'flex items-center justify-center',
    'bg-black/60 backdrop-blur-xl',
    'p-6',
    'animate-fade-in',
  ),
  toast: cn(
    'fixed bottom-6 right-6 z-50',
    'max-w-sm w-full',
    'rounded-xl',
    'bg-(--bg-surface-elevated) backdrop-blur-2xl',
    'border border-(--metadj-red)/30',
    'p-4',
    'shadow-[var(--shadow-glow-error)]',
    'animate-slide-in',
  ),
};

// ============================================================================
// Icon Container Styles
// ============================================================================

const iconContainerStyles: Record<ErrorVariant, string> = {
  inline: cn(
    'inline-flex items-center justify-center',
    'h-14 w-14 rounded-2xl',
    'bg-(--metadj-red)/10 border border-(--metadj-red)/20',
    'mb-4',
  ),
  fullscreen: cn(
    'inline-flex items-center justify-center',
    'h-20 w-20 rounded-2xl',
    'gradient-2-tint border border-(--border-subtle)',
    'shadow-lg shadow-purple-900/20',
    'mb-6',
  ),
  toast: cn(
    'inline-flex items-center justify-center',
    'h-10 w-10 rounded-xl',
    'bg-(--metadj-red)/15 border border-(--metadj-red)/25',
  ),
};

// ============================================================================
// Icon Styles
// ============================================================================

const iconStyles: Record<ErrorVariant, string> = {
  inline: 'h-7 w-7 text-(--metadj-red)',
  fullscreen: 'h-10 w-10 text-white',
  toast: 'h-5 w-5 text-(--metadj-red)',
};

// ============================================================================
// Text Styles
// ============================================================================

const titleStyles: Record<ErrorVariant, string> = {
  inline: 'text-lg font-heading font-semibold text-white mb-2',
  fullscreen: 'text-3xl font-heading font-bold text-heading-solid mb-3 uppercase tracking-wider',
  toast: 'text-sm font-heading font-semibold text-white',
};

const messageStyles: Record<ErrorVariant, string> = {
  inline: 'text-sm text-(--text-muted) mb-4 max-w-md',
  fullscreen: 'text-white/80 font-sans mb-8 leading-relaxed max-w-md text-center',
  toast: 'text-xs text-(--text-muted) mt-1',
};

// ============================================================================
// ErrorDisplay Props
// ============================================================================

export interface ErrorDisplayProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Error title - defaults to "Something went wrong" */
  title?: string;
  /** Error message to display */
  message: string;
  /** Retry callback - shows retry button when provided */
  retry?: () => void;
  /** Display variant */
  variant?: ErrorVariant;
  /** Custom icon - defaults to AlertCircle */
  icon?: ReactNode;
  /** Close callback - for toast variant */
  onClose?: () => void;
  /** Additional content below message */
  children?: ReactNode;
}

// ============================================================================
// ErrorDisplay Component
// ============================================================================

export const ErrorDisplay = forwardRef<HTMLDivElement, ErrorDisplayProps>(
  (
    {
      title,
      message,
      retry,
      variant = 'inline',
      icon,
      onClose,
      children,
      className,
      ...props
    },
    ref
  ) => {
    // Default titles based on variant
    const displayTitle = title ?? (variant === 'fullscreen'
      ? 'Signal Interrupted'
      : 'Something went wrong');

    // Toast variant has horizontal layout
    if (variant === 'toast') {
      return (
        <div
          ref={ref}
          role="alert"
          className={cn(variantStyles.toast, className)}
          {...props}
        >
          <div className="flex items-start gap-3">
            <div className={iconContainerStyles.toast}>
              {icon ?? <AlertCircle className={iconStyles.toast} strokeWidth={1.5} aria-hidden="true" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className={titleStyles.toast}>{displayTitle}</h4>
              <p className={messageStyles.toast}>{message}</p>

              {retry && (
                <button
                  type="button"
                  onClick={retry}
                  className="mt-2 text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors focus-ring"
                >
                  Try again
                </button>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all focus-ring"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {children}
        </div>
      );
    }

    // Fullscreen variant wraps content in a glassmorphic card
    if (variant === 'fullscreen') {
      return (
        <div
          ref={ref}
          role="alert"
          className={cn(variantStyles.fullscreen, className)}
          {...props}
        >
          <div className="max-w-md w-full text-center border border-(--border-subtle) rounded-3xl bg-card/40 backdrop-blur-xl px-8 py-10 shadow-[0_25px_60px_rgba(41,12,90,0.55)]">
            <div className="mx-auto mb-6 inline-flex">
              <div className={iconContainerStyles.fullscreen}>
                {icon ?? <AlertCircle className={iconStyles.fullscreen} strokeWidth={1.5} aria-hidden="true" />}
              </div>
            </div>

            <h1 className={titleStyles.fullscreen}>{displayTitle}</h1>
            <p className={messageStyles.fullscreen}>{message}</p>

            {retry && (
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={retry}
                  leftIcon={<RefreshCw className="w-4 h-4 group-hover:animate-spin" aria-hidden="true" />}
                  className="w-full group"
                >
                  Try Again
                </Button>
              </div>
            )}

            {children}
          </div>
        </div>
      );
    }

    // Inline variant (default)
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(variantStyles.inline, className)}
        {...props}
      >
        <div className="flex flex-col items-center text-center">
          <div className={iconContainerStyles.inline}>
            {icon ?? <AlertCircle className={iconStyles.inline} strokeWidth={1.5} aria-hidden="true" />}
          </div>

          <h3 className={titleStyles.inline}>{displayTitle}</h3>
          <p className={messageStyles.inline}>{message}</p>

          {retry && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={retry}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
            >
              Try Again
            </Button>
          )}

          {children}
        </div>
      </div>
    );
  }
);

ErrorDisplay.displayName = 'ErrorDisplay';
