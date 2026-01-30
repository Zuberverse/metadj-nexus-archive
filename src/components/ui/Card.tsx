import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Card Variants
// ============================================================================

export type CardVariant =
  | 'default'     // Standard card with subtle background
  | 'glass'       // Glassmorphism effect
  | 'elevated'    // Elevated with stronger shadow
  | 'interactive' // Clickable with hover effects
  | 'info'        // Information display card
  | 'radiant'     // Premium glowing glass
  | 'radiant-sm';  // Subtle glowing glass

export type CardSize = 'sm' | 'md' | 'lg' | 'xl';

// ============================================================================
// Variant Styles
// ============================================================================

const variantStyles: Record<CardVariant, string> = {
  default: cn(
    'bg-(--bg-surface-base)/55 border-(--border-standard)',
    'hover:border-(--border-elevated)',
  ),
  glass: cn(
    'glass-card',
    'border-(--border-standard)',
  ),
  elevated: cn(
    'bg-(--bg-surface-elevated, rgba(5,10,28,0.92)) border-(--border-elevated)',
    'shadow-[0_12px_36px_rgba(18,15,45,0.45)]',
  ),
  interactive: cn(
    'bg-(--bg-surface-base)/55 border-(--border-standard)',
    'cursor-pointer transform-gpu',
    'hover:-translate-y-0.5 hover:border-(--border-active)',
    'active:scale-[0.99]',
    'focus-ring-glow',
  ),
  info: cn(
    'bg-white/5 border-white/10',
  ),
  radiant: 'glass-radiant',
  'radiant-sm': 'glass-radiant-sm',
};

// ============================================================================
// Size Styles
// ============================================================================

const sizeStyles: Record<CardSize, string> = {
  sm: 'rounded-lg p-3',
  md: 'rounded-xl p-4',
  lg: 'rounded-2xl p-6',
  xl: 'rounded-[28px] p-8',
};

// ============================================================================
// Base Styles
// ============================================================================

const baseStyles = cn(
  'relative overflow-hidden',
  'border backdrop-blur-xl',
  'transition-all duration-150',
);

// ============================================================================
// Card Component
// ============================================================================

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual style variant */
  variant?: CardVariant;
  /** Size preset (affects padding and border radius) */
  size?: CardSize;
  /** Add gradient hover effect */
  hoverGradient?: boolean;
  /** Make the card a clickable element (adds button role) */
  asButton?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      hoverGradient = false,
      asButton = false,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role={asButton ? 'button' : undefined}
        tabIndex={asButton ? 0 : undefined}
        onClick={onClick}
        onKeyDown={asButton ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        } : undefined}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          hoverGradient && 'hover-gradient',
          asButton && 'cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ============================================================================
// Card Header
// ============================================================================

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> { }

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-1.5 pb-3', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

// ============================================================================
// Card Title
// ============================================================================

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        'font-heading font-semibold text-heading-solid text-lg leading-tight',
        className
      )}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

// ============================================================================
// Card Description
// ============================================================================

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> { }

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-(--text-muted)', className)}
      {...props}
    />
  )
);

CardDescription.displayName = 'CardDescription';

// ============================================================================
// Card Content
// ============================================================================

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> { }

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-(--text-secondary)', className)}
      {...props}
    />
  )
);

CardContent.displayName = 'CardContent';

// ============================================================================
// Card Footer
// ============================================================================

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> { }

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-3 pt-4', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';
