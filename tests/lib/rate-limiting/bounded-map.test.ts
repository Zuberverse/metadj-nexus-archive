/**
 * BoundedMap Tests
 *
 * Tests for the bounded Map with LRU eviction, used for memory-safe
 * in-memory rate limiting.
 *
 * @module tests/lib/rate-limiting/bounded-map
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BoundedMap, DEFAULT_MAX_ENTRIES, createRateLimitMap } from '@/lib/rate-limiting/bounded-map';

describe('BoundedMap', () => {
  describe('construction', () => {
    it('creates a map with default max size', () => {
      const map = new BoundedMap<string, number>();
      expect(map.capacity).toBe(DEFAULT_MAX_ENTRIES);
      expect(map.size).toBe(0);
    });

    it('creates a map with custom max size', () => {
      const map = new BoundedMap<string, number>(100);
      expect(map.capacity).toBe(100);
    });

    it('throws if max size is less than 1', () => {
      expect(() => new BoundedMap(0)).toThrow('BoundedMap maxSize must be at least 1');
      expect(() => new BoundedMap(-5)).toThrow('BoundedMap maxSize must be at least 1');
    });
  });

  describe('basic operations', () => {
    let map: BoundedMap<string, number>;

    beforeEach(() => {
      map = new BoundedMap<string, number>(5);
    });

    it('sets and gets values', () => {
      map.set('a', 1);
      map.set('b', 2);
      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
      expect(map.size).toBe(2);
    });

    it('returns undefined for missing keys', () => {
      expect(map.get('missing')).toBeUndefined();
    });

    it('checks key existence with has()', () => {
      map.set('a', 1);
      expect(map.has('a')).toBe(true);
      expect(map.has('b')).toBe(false);
    });

    it('deletes values', () => {
      map.set('a', 1);
      expect(map.delete('a')).toBe(true);
      expect(map.has('a')).toBe(false);
      expect(map.delete('a')).toBe(false); // Already deleted
    });

    it('clears all values', () => {
      map.set('a', 1);
      map.set('b', 2);
      map.clear();
      expect(map.size).toBe(0);
      expect(map.has('a')).toBe(false);
    });

    it('overwrites existing values', () => {
      map.set('a', 1);
      map.set('a', 100);
      expect(map.get('a')).toBe(100);
      expect(map.size).toBe(1);
    });
  });

  describe('LRU eviction', () => {
    it('evicts oldest entry when at capacity', () => {
      const map = new BoundedMap<string, number>(3);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);
      expect(map.size).toBe(3);

      // Adding 'd' should evict 'a' (oldest)
      map.set('d', 4);
      expect(map.size).toBe(3);
      expect(map.has('a')).toBe(false);
      expect(map.has('b')).toBe(true);
      expect(map.has('c')).toBe(true);
      expect(map.has('d')).toBe(true);
    });

    it('get() updates recency (prevents eviction)', () => {
      const map = new BoundedMap<string, number>(3);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      // Access 'a' to make it recently used
      map.get('a');

      // Now add 'd' - should evict 'b' (now oldest)
      map.set('d', 4);
      expect(map.has('a')).toBe(true); // Still exists - was accessed
      expect(map.has('b')).toBe(false); // Evicted
      expect(map.has('c')).toBe(true);
      expect(map.has('d')).toBe(true);
    });

    it('has() does NOT update recency', () => {
      const map = new BoundedMap<string, number>(3);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      // has() should NOT update recency
      map.has('a');

      // Add 'd' - should still evict 'a' (oldest by insertion order)
      map.set('d', 4);
      expect(map.has('a')).toBe(false); // Evicted despite has() call
      expect(map.has('b')).toBe(true);
      expect(map.has('c')).toBe(true);
      expect(map.has('d')).toBe(true);
    });

    it('set() on existing key moves to most recent', () => {
      const map = new BoundedMap<string, number>(3);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      // Update 'a' - makes it most recent
      map.set('a', 100);

      // Add 'd' - should evict 'b' (now oldest)
      map.set('d', 4);
      expect(map.has('a')).toBe(true);
      expect(map.get('a')).toBe(100);
      expect(map.has('b')).toBe(false);
    });
  });

  describe('iteration', () => {
    it('iterates over entries in insertion order', () => {
      const map = new BoundedMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      map.set('c', 3);

      const entries = Array.from(map.entries());
      expect(entries).toEqual([['a', 1], ['b', 2], ['c', 3]]);
    });

    it('iterates over keys', () => {
      const map = new BoundedMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      expect(Array.from(map.keys())).toEqual(['a', 'b']);
    });

    it('iterates over values', () => {
      const map = new BoundedMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);
      expect(Array.from(map.values())).toEqual([1, 2]);
    });

    it('forEach iterates over all entries', () => {
      const map = new BoundedMap<string, number>(5);
      map.set('a', 1);
      map.set('b', 2);

      const collected: [string, number][] = [];
      map.forEach((value, key) => {
        collected.push([key, value]);
      });
      expect(collected).toEqual([['a', 1], ['b', 2]]);
    });
  });

  describe('factory function', () => {
    it('createRateLimitMap creates a bounded map', () => {
      const map = createRateLimitMap<string, number>();
      expect(map.capacity).toBe(DEFAULT_MAX_ENTRIES);
    });

    it('createRateLimitMap accepts custom size', () => {
      const map = createRateLimitMap<string, number>(500);
      expect(map.capacity).toBe(500);
    });
  });

  describe('edge cases', () => {
    it('works with size of 1', () => {
      const map = new BoundedMap<string, number>(1);
      map.set('a', 1);
      expect(map.get('a')).toBe(1);

      map.set('b', 2);
      expect(map.has('a')).toBe(false);
      expect(map.get('b')).toBe(2);
      expect(map.size).toBe(1);
    });

    it('handles rapid set/get cycles', () => {
      const map = new BoundedMap<string, number>(10);
      for (let i = 0; i < 100; i++) {
        map.set(`key-${i}`, i);
        if (i >= 5) {
          // Access some older keys to keep them alive
          map.get(`key-${i - 5}`);
        }
      }
      // Should have exactly 10 entries
      expect(map.size).toBe(10);
    });
  });
});
