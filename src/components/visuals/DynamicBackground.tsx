"use client"

/**
 * Dynamic Background Component
 *
 * Creates smooth gradient backgrounds derived from track artwork colors.
 * Transitions smoothly between tracks with WCAG-compliant contrast.
 */

import { useEffect, useState, useRef } from 'react';
import { useCspStyle } from '@/hooks/use-csp-style';
import { extractColorsWithCache, createGradientFromColors, type ExtractedColors } from '@/lib/color/color-extraction';
import { logger } from '@/lib/logger';
import { useReducedMotion } from '@/lib/motion-utils';

interface DynamicBackgroundProps {
  /** URL of the current track artwork */
  artworkUrl?: string;
  /** Whether to enable the dynamic background (user preference) */
  enabled?: boolean;
  /** Opacity of the gradient overlay (0-1) */
  opacity?: number;
  /** Optional CSS class */
  className?: string;
  /** Transition duration in milliseconds */
  transitionDuration?: number;
}

export function DynamicBackground({
  artworkUrl,
  enabled = true,
  opacity = 0.3,
  className = '',
  transitionDuration = 800
}: DynamicBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const [currentGradient, setCurrentGradient] = useState<string>('');
  const [nextGradient, setNextGradient] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousArtworkRef = useRef<string>('');
  const extractionInProgressRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const effectiveTransitionDuration = prefersReducedMotion ? 0 : transitionDuration;

  // Default fallback gradient (MetaDJ brand colors)
  const defaultGradient = `radial-gradient(circle at 20% 20%, oklch(0.646 0.222 264.376) / ${opacity}, transparent 60%), radial-gradient(circle at 80% 80%, oklch(0.627 0.265 303.9) / ${opacity * 0.8}, transparent 60%)`;

  useEffect(() => {
    if (!enabled) return;

    // When we don't have artwork, keep the last known gradient (prevents "reset flashes").
    // Only initialize the default once when nothing has been set yet.
    if (!artworkUrl) {
      setCurrentGradient((prev) => prev || defaultGradient);
      return;
    }

    // Skip if already processed this artwork URL.
    if (artworkUrl === previousArtworkRef.current) {
      return;
    }

    previousArtworkRef.current = artworkUrl;
    extractionInProgressRef.current = true;
    const requestId = ++requestIdRef.current;

    // If a previous transition was in-flight, stabilize on the current gradient
    // while we compute the next one (prevents "background reset" flashes).
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setNextGradient('');
    setIsTransitioning(false);

    // Extract colors asynchronously
    extractColorsWithCache(artworkUrl)
      .then((colors: ExtractedColors) => {
        if (requestId !== requestIdRef.current) return;
        const gradient = createGradientFromColors(colors, opacity);

        // Reduced motion can set duration to 0; keep it instant.
        if (effectiveTransitionDuration <= 0) {
          setCurrentGradient(gradient);
          setNextGradient('');
          setIsTransitioning(false);
          extractionInProgressRef.current = false;
          return;
        }

        // Trigger smooth transition
        setNextGradient(gradient);
        setIsTransitioning(true);

        // After transition completes, update current gradient
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
          if (requestId !== requestIdRef.current) return;
          setCurrentGradient(gradient);
          setNextGradient('');
          setIsTransitioning(false);
          extractionInProgressRef.current = false;
          timeoutRef.current = null;
        }, effectiveTransitionDuration);
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return;
        logger.warn('Failed to extract colors from artwork; keeping existing background', {
          artworkUrl,
          error: error instanceof Error ? error.message : String(error)
        });
        setCurrentGradient((prev) => prev || defaultGradient);
        setNextGradient('');
        setIsTransitioning(false);
        extractionInProgressRef.current = false;
      });

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [artworkUrl, enabled, opacity, effectiveTransitionDuration, defaultGradient]);

  useEffect(() => {
    if (!prefersReducedMotion) return;

    if (nextGradient) {
      setCurrentGradient(nextGradient);
      setNextGradient('');
    }
    setIsTransitioning(false);
  }, [prefersReducedMotion, nextGradient]);

  // Hooks must be called unconditionally before any early returns
  const transition = `opacity ${effectiveTransitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
  const currentLayerStyle = useCspStyle({
    background: currentGradient || defaultGradient,
    opacity: isTransitioning ? 0 : 1,
    transition,
  });
  const nextLayerStyle = useCspStyle({
    background: nextGradient,
    opacity: isTransitioning ? 1 : 0,
    transition,
  });
  const noiseStyle = useCspStyle({
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
    mixBlendMode: 'overlay',
    opacity: 0.4,
  });

  if (!enabled) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 pointer-events-none -z-[1] ${className}`}
      role="presentation"
      aria-hidden="true"
    >
      {/* Current gradient layer */}
      <div
        className="absolute inset-0"
        data-csp-style={currentLayerStyle}
      />

      {/* Next gradient layer (for crossfade) */}
      {nextGradient && (
        <div
          className="absolute inset-0"
          data-csp-style={nextLayerStyle}
        />
      )}

      {/* Subtle noise texture overlay for depth */}
      <div
        className="absolute inset-0"
        data-csp-style={noiseStyle}
      />
    </div>
  );
}
