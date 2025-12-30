'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// EmptyState Component
// ============================================================================
// Reusable empty state pattern for consistent messaging across:
// - QueueManager (empty queue)
// - PlaylistList (no playlists)
// - SearchBar (no results)
// - Other list/content views
// ============================================================================

/** Size variant for EmptyState component */
export type EmptyStateSize = 'sm' | 'md' | 'lg';

/** Icon container variant for EmptyState component */
export type EmptyStateIconVariant = 'default' | 'elevated' | 'subtle';

export interface EmptyStateProps {
  /** Icon to display in the rounded container */
  icon: ReactNode;
  /** Main heading text */
  title: string;
  /** Supporting description text or element */
  description?: ReactNode;
  /** Optional action button or content */
  action?: ReactNode;
  /** Additional class name */
  className?: string;
  /** Size variant */
  size?: EmptyStateSize;
  /** Icon container variant */
  iconVariant?: EmptyStateIconVariant;
}

const sizeStyles = {
  sm: {
    container: 'py-6 px-4',
    iconContainer: 'p-3 mb-2',
    iconSize: 'h-5 w-5',
    title: 'text-sm font-medium',
    description: 'text-xs',
  },
  md: {
    container: 'py-8 px-5',
    iconContainer: 'p-4 mb-3',
    iconSize: 'h-8 w-8',
    title: 'text-base font-semibold',
    description: 'text-sm',
  },
  lg: {
    container: 'py-12 px-6',
    iconContainer: 'p-5 mb-4',
    iconSize: 'h-10 w-10',
    title: 'text-lg font-bold',
    description: 'text-base',
  },
};

const iconVariantStyles = {
  default: 'rounded-full border border-(--border-elevated) bg-(--glass-strong)',
  elevated: 'rounded-full border border-white/20 bg-white/6 shadow-[0_10px_26px_rgba(6,8,26,0.35)]',
  subtle: 'rounded-full border border-white/20 bg-white/5',
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'md',
  iconVariant = 'default',
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        styles.container,
        className
      )}
    >
      <div className={cn(iconVariantStyles[iconVariant], styles.iconContainer)}>
        <div className={cn('text-(--text-subtle)', styles.iconSize)}>
          {icon}
        </div>
      </div>
      <h4 className={cn('font-heading text-heading-solid mb-1', styles.title)}>
        {title}
      </h4>
      {description && (
        <p className={cn('text-(--text-subtle) max-w-xs', styles.description)}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
