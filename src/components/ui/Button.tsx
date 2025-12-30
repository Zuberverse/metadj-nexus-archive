'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Button Variants
// ============================================================================

export type ButtonVariant =
  | 'primary'    // Gradient CTA
  | 'secondary'  // Glass background
  | 'accent'     // Toolbar accent (active state)
  | 'ghost'      // Transparent
  | 'destructive'; // Red/danger

export type ButtonSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'icon-sm'  // Circular icon button small
  | 'icon-md'  // Circular icon button medium (44px touch target)
  | 'icon-lg'; // Circular icon button large

// ============================================================================
// Variant Styles
// ============================================================================

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'brand-gradient',
    'text-white border border-white/25',
    'neon-glow',
    'hover:scale-105',
  ),
  secondary: cn(
    'border border-(--border-standard)',
    'bg-(--glass-light) text-(--text-secondary)',
    'hover:border-(--border-elevated) hover:bg-(--glass-medium) hover:text-white',
  ),
  accent: cn(
    'toolbar-accent text-white',
    'shadow-[0_18px_38px_rgba(12,10,32,0.48)]',
    'hover:scale-105 hover:shadow-[0_0_32px_rgba(96,118,255,0.55)]',
  ),
  ghost: cn(
    'bg-transparent text-(--text-muted)',
    'hover:bg-(--glass-light) hover:text-white',
  ),
  destructive: cn(
    'bg-red-500/20 text-red-300 border border-red-400/30',
    'hover:bg-red-500/30 hover:border-red-400/50',
  ),
};

// ============================================================================
// Size Styles
// ============================================================================

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-8 px-2.5 text-xs rounded-lg gap-1.5 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center',
  sm: 'h-9 px-3 text-sm rounded-lg gap-2 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center',
  md: 'h-11 px-4 text-sm rounded-xl gap-2 min-h-[44px] touch-manipulation',
  lg: 'h-12 px-6 text-base rounded-xl gap-2.5 min-h-[44px] touch-manipulation',
  xl: 'h-14 px-8 text-lg rounded-2xl gap-3 min-h-[44px] touch-manipulation',
  'icon-sm': 'h-9 w-9 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation',
  'icon-md': 'h-11 w-11 min-h-[44px] min-w-[44px] rounded-full touch-manipulation',
  'icon-lg': 'h-[52px] w-[52px] min-h-[52px] min-w-[52px] rounded-full touch-manipulation',
};

// ============================================================================
// Base Styles
// ============================================================================

const baseStyles = cn(
  'inline-flex items-center justify-center',
  'font-medium transition-all duration-150',
  'focus-ring-glow touch-manipulation',
  'disabled:pointer-events-none disabled:opacity-50',
);

// ============================================================================
// Button Component
// ============================================================================

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show loading spinner */
  isLoading?: boolean;
  /** Icon to display before children */
  leftIcon?: ReactNode;
  /** Icon to display after children */
  rightIcon?: ReactNode;
  /** Accessible label for icon-only buttons */
  'aria-label'?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isIconOnly = size.startsWith('icon-');

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={cn(
            'animate-spin',
            isIconOnly ? 'h-5 w-5' : 'h-4 w-4'
          )} />
        ) : leftIcon ? (
          leftIcon
        ) : null}

        {!isIconOnly && children}

        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================================================
// IconButton - Convenience wrapper for icon-only buttons
// ============================================================================

export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'leftIcon' | 'rightIcon'> {
  /** Size: sm (36px), md (44px), lg (52px) */
  size?: 'sm' | 'md' | 'lg';
  /** Icon to display */
  icon: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', icon, ...props }, ref) => {
    const sizeMap: Record<string, ButtonSize> = {
      sm: 'icon-sm',
      md: 'icon-md',
      lg: 'icon-lg',
    };

    return (
      <Button ref={ref} size={sizeMap[size]} leftIcon={icon} {...props} />
    );
  }
);

IconButton.displayName = 'IconButton';

// ============================================================================
// ToggleButton - For active/inactive states (shuffle, repeat, etc.)
// ============================================================================

export interface ToggleButtonProps extends Omit<ButtonProps, 'variant'> {
  /** Whether the toggle is active */
  isActive: boolean;
  /** Active state variant (default: accent) */
  activeVariant?: ButtonVariant;
  /** Inactive state variant (default: secondary) */
  inactiveVariant?: ButtonVariant;
}

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(
  (
    {
      isActive,
      activeVariant = 'accent',
      inactiveVariant = 'secondary',
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        variant={isActive ? activeVariant : inactiveVariant}
        aria-pressed={isActive}
        {...props}
      />
    );
  }
);

ToggleButton.displayName = 'ToggleButton';
