'use client';

import { forwardRef, useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { cn } from '@/lib/utils';
import { Button } from './Button';

// ============================================================================
// Modal Sizes
// ============================================================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
};

// ============================================================================
// Modal Component
// ============================================================================

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title (renders in header) */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Size preset */
  size?: ModalSize;
  /** Show close button in header */
  showCloseButton?: boolean;
  /** Close when clicking overlay */
  closeOnOverlayClick?: boolean;
  /** Close when pressing Escape */
  closeOnEscape?: boolean;
  /** Additional class name for modal container */
  className?: string;
  /** Additional class name for overlay */
  overlayClassName?: string;
  /** Use gradient border wrapper (premium look) */
  gradientBorder?: boolean;
  /** ARIA label ID (overrides auto-generated from title) */
  'aria-labelledby'?: string;
  /** ARIA description ID */
  'aria-describedby'?: string;
  /** Footer content */
  footer?: ReactNode;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      size = 'md',
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      className,
      overlayClassName,
      gradientBorder = false,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      footer,
    },
    ref
  ) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const titleId = useId();

    // Lock body scroll when open
    useBodyScrollLock(isOpen);

    // Trap focus within modal
    useFocusTrap(dialogRef, { enabled: isOpen });

    // Handle escape key
    useEscapeKey(onClose, { enabled: isOpen && closeOnEscape });

    // Store previously focused element when modal opens
    useEffect(() => {
      if (isOpen) {
        previousFocusRef.current = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      }
    }, [isOpen]);

    // Restore focus when modal closes
    useEffect(() => {
      if (!isOpen && previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
      <div
        ref={dialogRef}
        className={cn(
          'relative w-full',
          gradientBorder ? 'rounded-[calc(30px_-_1.5px)]' : 'rounded-[28px]',
          'overflow-hidden',
          'bg-[rgba(10,14,31,0.95)]',
          !gradientBorder && 'border border-(--border-standard)',
          'shadow-[0_35px_80px_rgba(3,5,20,0.75)]',
          'backdrop-blur-xl',
          sizeStyles[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient overlay for premium look */}
        <div className="pointer-events-none absolute inset-0 gradient-media-bloom opacity-40" />
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-b from-white/15 via-transparent to-transparent opacity-60" />

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-(--border-subtle)">
            {title && (
              <h2
                id={titleId}
                className="text-xl font-heading font-bold text-heading-solid"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center',
                  'rounded-full border border-(--border-standard)',
                  'text-(--text-muted) transition',
                  'hover:bg-(--glass-medium) hover:text-white',
                  'focus-ring-glow',
                  !title && 'ml-auto'
                )}
                aria-label="Close modal"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="relative z-10">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="relative z-10 flex items-center justify-end gap-3 px-6 py-4 border-t border-(--border-subtle)">
            {footer}
          </div>
        )}
      </div>
    );

    return (
      <div
        ref={ref}
        className="fixed inset-0 z-100 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy ?? (title ? titleId : undefined)}
        aria-describedby={ariaDescribedBy}
        onClick={closeOnOverlayClick ? onClose : undefined}
      >
        {/* Overlay */}
        <div
          className={cn(
            'pointer-events-none fixed inset-0',
            'bg-black/80 backdrop-blur-xl',
            overlayClassName
          )}
        />

        {/* Modal with optional gradient border */}
        {gradientBorder ? (
          <div className="relative mx-4 rounded-[30px] p-[1.5px] gradient-2-border overflow-hidden">
            {modalContent}
          </div>
        ) : (
          modalContent
        )}
      </div>
    );
  }
);

Modal.displayName = 'Modal';

// ============================================================================
// Modal Content Section
// ============================================================================

export interface ModalContentProps {
  children: ReactNode;
  className?: string;
}

export const ModalContent = ({ children, className }: ModalContentProps) => (
  <div className={cn('px-6 py-4', className)}>{children}</div>
);

ModalContent.displayName = 'ModalContent';

// ============================================================================
// Confirm Dialog - Convenience wrapper
// ============================================================================

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant === 'destructive' ? 'destructive' : 'primary'}
          size="sm"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </Button>
      </>
    }
  >
    <ModalContent>
      <p className="text-(--text-secondary)">{message}</p>
    </ModalContent>
  </Modal>
);

ConfirmDialog.displayName = 'ConfirmDialog';
