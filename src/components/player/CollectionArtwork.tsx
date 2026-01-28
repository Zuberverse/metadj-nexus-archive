"use client"

/**
 * Track Artwork Component
 *
 * Enhanced artwork display with loading states, error fallbacks,
 * and accessibility features.
 *
 * PERFORMANCE OPTIMIZATION:
 * - Wrapped with React.memo to prevent unnecessary re-renders
 * - Only re-renders when src, alt, or size changes
 * - Useful in lists where many artworks are displayed
 */

import { useState, memo } from 'react';
import Image from 'next/image';
import { Music } from 'lucide-react';
import { useCspStyle } from '@/hooks/use-csp-style';
import { DEFAULT_ARTWORK_SRC } from '@/lib/app.constants';

interface CollectionArtworkProps {
  /** URL of the artwork image */
  src?: string;
  /** Alt text for accessibility */
  alt: string;
  /** Size preset or custom dimensions */
  size?: 'small' | 'medium' | 'large' | number;
  /** Optional CSS class */
  className?: string;
  /** Priority loading for above-the-fold images */
  priority?: boolean;
  /** Show loading skeleton */
  showLoading?: boolean;
}

const SIZE_PRESETS = {
  small: 64,
  medium: 120,
  large: 256
};

function CollectionArtworkComponent({
  src,
  alt,
  size = 'medium',
  className = '',
  priority = false,
  showLoading = true
}: CollectionArtworkProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const sizeValue = typeof size === 'number' ? size : SIZE_PRESETS[size];
  const artworkUrl = src || DEFAULT_ARTWORK_SRC;
  const sizeStyleId = useCspStyle({ width: `${sizeValue}px`, height: `${sizeValue}px` })

  // Fallback placeholder when image fails to load
  if (hasError) {
    return (
      <div
        className={`relative flex items-center justify-center bg-linear-to-br from-white/10 to-white/5 backdrop-blur-xs border border-white/10 rounded-md overflow-hidden ${className}`}
        data-csp-style={sizeStyleId}
        role="img"
        aria-label={alt}
      >
        <Music className="w-1/3 h-1/3 text-white/40" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-md ${className}`}
      data-csp-style={sizeStyleId}
    >
      {/* Loading skeleton */}
      {showLoading && isLoading && (
        <div
          className="absolute inset-0 bg-linear-to-br from-white/10 to-white/5 animate-pulse"
          aria-hidden="true"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Music className="w-1/3 h-1/3 text-white/60" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Artwork image */}
      <Image
        src={artworkUrl}
        alt={alt}
        width={sizeValue}
        height={sizeValue}
        priority={priority}
        className={`object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />

      {/* Subtle gradient overlay for depth */}
      <div
        className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Glassmorphic border */}
      <div
        className="absolute inset-0 rounded-md border border-white/10 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders in track lists
export const CollectionArtwork = memo(CollectionArtworkComponent)
