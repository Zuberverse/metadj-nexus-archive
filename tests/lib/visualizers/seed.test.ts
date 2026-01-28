/**
 * Visualizer Seed Tests
 *
 * Tests deterministic hash and seed combination functions used for
 * reproducible visual variation in visualizers.
 */

import { describe, expect, it } from 'vitest'
import { hashSeed, combineSeeds, type SeedInput } from '@/lib/visualizers/seed'

describe('hashSeed', () => {
  it('returns a number', () => {
    expect(typeof hashSeed('test')).toBe('number')
  })

  it('returns an unsigned 32-bit integer', () => {
    const result = hashSeed('test')
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(0xFFFFFFFF)
  })

  it('is deterministic for the same input', () => {
    expect(hashSeed('hello')).toBe(hashSeed('hello'))
    expect(hashSeed('cosmos')).toBe(hashSeed('cosmos'))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashSeed('hello')).not.toBe(hashSeed('world'))
    expect(hashSeed('a')).not.toBe(hashSeed('b'))
  })

  it('handles empty string', () => {
    const result = hashSeed('')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('handles long strings', () => {
    const result = hashSeed('a'.repeat(10000))
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('handles special characters', () => {
    const result = hashSeed('hello 🎵 world')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })
})

describe('combineSeeds', () => {
  it('combines string parts', () => {
    const result = combineSeeds('hello', 'world')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('combines number parts', () => {
    const result = combineSeeds(42, 100)
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('combines mixed types', () => {
    const result = combineSeeds('hello', 42, 'world')
    expect(typeof result).toBe('number')
  })

  it('ignores null and undefined parts', () => {
    const withNulls = combineSeeds('hello', null, undefined, 'world')
    const without = combineSeeds('hello', 'world')
    expect(withNulls).toBe(without)
  })

  it('is deterministic', () => {
    expect(combineSeeds('a', 'b', 'c')).toBe(combineSeeds('a', 'b', 'c'))
  })

  it('order matters', () => {
    expect(combineSeeds('a', 'b')).not.toBe(combineSeeds('b', 'a'))
  })

  it('handles single part', () => {
    const result = combineSeeds('only')
    expect(typeof result).toBe('number')
  })

  it('handles no parts (all filtered)', () => {
    const result = combineSeeds(null, undefined)
    expect(typeof result).toBe('number')
    // Should hash empty string
    expect(result).toBe(hashSeed(''))
  })
})
