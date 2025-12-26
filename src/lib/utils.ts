/**
 * General utility functions
 * Reusable helpers for common operations across the application
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { MS_PER_SECOND, MS_PER_MINUTE, MS_PER_HOUR } from "./app.constants";

// ============================================================================
// CSS & Styling Utilities
// ============================================================================

/**
 * Merge Tailwind CSS classes with proper precedence
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 *
 * @param inputs - Class values to merge
 * @returns Merged class string
 * @example
 * cn('px-4 py-2', condition && 'bg-blue-500', 'px-6') // 'px-6 py-2 bg-blue-500'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================================================
// Array Utilities
// ============================================================================

/**
 * Check if two arrays contain the same elements regardless of order
 * Used for efficient queue update detection and array equality checks
 *
 * @param a - First array
 * @param b - Second array
 * @returns true if arrays contain same elements
 * @example
 * haveSameMembers([1, 2, 3], [3, 2, 1]) // true
 * haveSameMembers([1, 2], [1, 2, 3]) // false
 */
export function haveSameMembers<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;

  const setA = new Set(a);
  return b.every(item => setA.has(item));
}

// ============================================================================
// Time & Duration Utilities
// ============================================================================

/**
 * Convert milliseconds to seconds (rounded)
 *
 * @param ms - Time in milliseconds
 * @returns Time in seconds
 * @example
 * msToSeconds(2500) // 3
 */
export function msToSeconds(ms: number): number {
  return Math.round(ms / MS_PER_SECOND);
}

/**
 * Convert milliseconds to minutes (rounded)
 *
 * @param ms - Time in milliseconds
 * @returns Time in minutes
 * @example
 * msToMinutes(125000) // 2
 */
export function msToMinutes(ms: number): number {
  return Math.floor(ms / MS_PER_MINUTE);
}

/**
 * Convert milliseconds to hours (rounded)
 *
 * @param ms - Time in milliseconds
 * @returns Time in hours
 * @example
 * msToHours(7200000) // 2
 */
export function msToHours(ms: number): number {
  return Math.floor(ms / MS_PER_HOUR);
}

/**
 * Format duration in seconds to MM:SS format
 *
 * @param seconds - Duration in seconds
 * @returns Formatted time string
 * @example
 * formatDuration(185) // "3:05"
 * formatDuration(45) // "0:45"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculate age of timestamp in minutes
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Age in minutes
 * @example
 * getAgeInMinutes(Date.now() - 120000) // 2
 */
export function getAgeInMinutes(timestamp: number): number {
  return msToMinutes(Date.now() - timestamp);
}

/**
 * Calculate age of timestamp in hours
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Age in hours
 * @example
 * getAgeInHours(Date.now() - 7200000) // 2
 */
export function getAgeInHours(timestamp: number): number {
  return msToHours(Date.now() - timestamp);
}
