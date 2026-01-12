/**
 * Bounded Map with LRU Eviction
 *
 * A Map implementation with a maximum size that evicts least-recently-used
 * entries when the limit is reached. Designed for in-memory rate limiting
 * to prevent memory exhaustion from unique identifier attacks.
 *
 * ## Memory Protection
 * - Enforces maximum entry count
 * - LRU eviction policy (oldest access evicted first)
 * - O(1) get/set operations (Map-based)
 * - Access updates recency tracking
 *
 * ## Usage
 * ```typescript
 * const cache = new BoundedMap<string, RateLimitRecord>(10000)
 * cache.set('client-123', { count: 1, resetAt: Date.now() + 60000 })
 * const record = cache.get('client-123') // Updates access time
 * ```
 *
 * @module lib/rate-limiting/bounded-map
 */

/**
 * Default maximum entries for rate limit caches
 * Based on typical memory constraints for serverless functions
 */
export const DEFAULT_MAX_ENTRIES = 10000

/**
 * Bounded Map with LRU eviction
 *
 * Uses Map iteration order (insertion order) as a proxy for recency.
 * When an entry is accessed, it's deleted and re-inserted to move it to the end.
 */
export class BoundedMap<K, V> {
  private readonly map: Map<K, V>
  private readonly maxSize: number

  constructor(maxSize: number = DEFAULT_MAX_ENTRIES) {
    if (maxSize < 1) {
      throw new Error('BoundedMap maxSize must be at least 1')
    }
    this.map = new Map()
    this.maxSize = maxSize
  }

  /**
   * Get a value and update its recency (LRU refresh)
   */
  get(key: K): V | undefined {
    const value = this.map.get(key)
    if (value !== undefined) {
      // Move to end (most recently used) by re-inserting
      this.map.delete(key)
      this.map.set(key, value)
    }
    return value
  }

  /**
   * Check if key exists without updating recency
   */
  has(key: K): boolean {
    return this.map.has(key)
  }

  /**
   * Set a value, evicting LRU entry if at capacity
   */
  set(key: K, value: V): this {
    // If key exists, delete first to maintain proper ordering
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.maxSize) {
      // Evict oldest (first) entry
      const oldestKey = this.map.keys().next().value
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey)
      }
    }

    this.map.set(key, value)
    return this
  }

  /**
   * Delete an entry
   */
  delete(key: K): boolean {
    return this.map.delete(key)
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.map.clear()
  }

  /**
   * Current number of entries
   */
  get size(): number {
    return this.map.size
  }

  /**
   * Maximum capacity
   */
  get capacity(): number {
    return this.maxSize
  }

  /**
   * Iterate over entries (for cleanup operations)
   */
  entries(): IterableIterator<[K, V]> {
    return this.map.entries()
  }

  /**
   * Iterate over keys
   */
  keys(): IterableIterator<K> {
    return this.map.keys()
  }

  /**
   * Iterate over values
   */
  values(): IterableIterator<V> {
    return this.map.values()
  }

  /**
   * ForEach iteration
   */
  forEach(callback: (value: V, key: K, map: Map<K, V>) => void): void {
    this.map.forEach(callback)
  }
}

/**
 * Factory for creating rate limit bounded maps with standard configuration
 *
 * @param maxEntries - Maximum entries (default: 10000)
 * @returns New BoundedMap instance
 */
export function createRateLimitMap<K, V>(
  maxEntries: number = DEFAULT_MAX_ENTRIES
): BoundedMap<K, V> {
  return new BoundedMap<K, V>(maxEntries)
}
