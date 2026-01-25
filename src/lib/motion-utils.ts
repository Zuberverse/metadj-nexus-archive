/**
 * Motion Utilities
 *
 * Utilities for respecting user motion preferences (prefers-reduced-motion).
 * Ensures animations and transitions respect accessibility needs.
 */

/**
 * Check if the user prefers reduced motion
 *
 * @returns true if user has enabled "reduce motion" in their OS settings
 */
export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get appropriate class names based on motion preference
 *
 * @param fullMotion - Class names for full motion
 * @param reducedMotion - Class names for reduced motion (defaults to no motion)
 * @returns Appropriate class names based on user preference
 */
export function getMotionSafeClasses(fullMotion: string, reducedMotion: string = ''): string {
  return shouldReduceMotion() ? reducedMotion : fullMotion;
}

/**
 * Get animation duration based on motion preference
 *
 * @param fullDuration - Duration for full motion (e.g., "300ms", "0.3s")
 * @param reducedDuration - Duration for reduced motion (defaults to "0s")
 * @returns Appropriate duration based on user preference
 */
export function getMotionSafeDuration(fullDuration: string, reducedDuration: string = '0s'): string {
  return shouldReduceMotion() ? reducedDuration : fullDuration;
}

/**
 * Get transition configuration based on motion preference
 *
 * @param fullTransition - Transition for full motion
 * @param reducedTransition - Transition for reduced motion (defaults to "none")
 * @returns Appropriate transition based on user preference
 */
export function getMotionSafeTransition(fullTransition: string, reducedTransition: string = 'none'): string {
  return shouldReduceMotion() ? reducedTransition : fullTransition;
}

/**
 * Create a CSS @media query listener for motion preference changes
 *
 * @param callback - Function to call when motion preference changes
 * @returns Cleanup function to remove the listener
 */
export function onMotionPreferenceChange(callback: (reducedMotion: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const handler = (event: MediaQueryListEvent) => {
    callback(event.matches);
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }

  // Older browsers (Safari < 14, older Chrome/Firefox)
  // Note: addListener/removeListener are legacy but included in DOM lib types
  if (mediaQuery.addListener) {
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }

  return () => {};
}

/**
 * React hook for motion preference
 * (For use in components that need reactive motion preference)
 */
import { useState, useEffect } from 'react';

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const cleanup = onMotionPreferenceChange(setReducedMotion);
    return cleanup;
  }, []);

  return reducedMotion;
}

/**
 * Tailwind CSS helper - conditionally apply animation classes
 *
 * Usage:
 * ```tsx
 * <div className={motionSafe('animate-fade-in')}>...</div>
 * ```
 *
 * @param animationClass - Tailwind animation class to apply
 * @returns Class name with motion-safe wrapper
 */
export function motionSafe(animationClass: string): string {
  return `motion-safe:${animationClass}`;
}

/**
 * Tailwind CSS helper - apply different classes for motion preference
 *
 * Usage:
 * ```tsx
 * <div className={motion('animate-spin', 'animate-none')}>...</div>
 * ```
 *
 * @param fullMotionClass - Class for full motion
 * @param reducedMotionClass - Class for reduced motion
 * @returns Combined class names with motion preference wrappers
 */
export function motion(fullMotionClass: string, reducedMotionClass: string = ''): string {
  const full = motionSafe(fullMotionClass);
  const reduced = reducedMotionClass ? `motion-reduce:${reducedMotionClass}` : '';
  return [full, reduced].filter(Boolean).join(' ');
}
