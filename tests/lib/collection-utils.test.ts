/**
 * Collection Utilities Tests
 *
 * Tests for collection slug normalization and alias handling.
 */

import { describe, it, expect } from 'vitest'
import { toCollectionSlug, normalizeCollectionSlug } from '@/lib/collection-utils'

describe('toCollectionSlug', () => {
  it('converts to lowercase', () => {
    expect(toCollectionSlug('HELLO')).toBe('hello')
    expect(toCollectionSlug('Hello World')).toBe('hello-world')
  })

  it('replaces spaces with hyphens', () => {
    expect(toCollectionSlug('hello world')).toBe('hello-world')
    expect(toCollectionSlug('one two three')).toBe('one-two-three')
  })

  it('removes special characters', () => {
    expect(toCollectionSlug('Hello!')).toBe('hello')
    expect(toCollectionSlug('What?')).toBe('what')
    expect(toCollectionSlug('Test@#$%')).toBe('test')
  })

  it('collapses multiple hyphens', () => {
    expect(toCollectionSlug('hello---world')).toBe('hello-world')
    expect(toCollectionSlug('one - two - three')).toBe('one-two-three')
  })

  it('trims whitespace', () => {
    expect(toCollectionSlug('  hello  ')).toBe('hello')
    expect(toCollectionSlug('  hello world  ')).toBe('hello-world')
  })

  it('handles mixed case and special chars', () => {
    expect(toCollectionSlug('Metaverse Revelation')).toBe('metaverse-revelation')
    expect(toCollectionSlug('Ethereal AI')).toBe('ethereal-ai')
  })

  it('preserves numbers', () => {
    expect(toCollectionSlug('Collection 2024')).toBe('collection-2024')
    expect(toCollectionSlug('v1.0')).toBe('v10')
  })

  it('handles empty string', () => {
    expect(toCollectionSlug('')).toBe('')
  })

  it('handles string with only special characters', () => {
    expect(toCollectionSlug('!@#$%')).toBe('')
  })

  it('handles multiple spaces', () => {
    expect(toCollectionSlug('hello   world')).toBe('hello-world')
  })
})

describe('normalizeCollectionSlug', () => {
  it('normalizes input to slug format', () => {
    expect(normalizeCollectionSlug('Hello World')).toBe('hello-world')
    expect(normalizeCollectionSlug('Ethereal AI')).toBe('ethereal-ai')
  })

  it('resolves alias for metaverse-revalation', () => {
    // Typo: "revalation" should be "revelation"
    expect(normalizeCollectionSlug('metaverse-revalation')).toBe('metaverse-revelation')
  })

  it('resolves alias even with different input casing', () => {
    expect(normalizeCollectionSlug('Metaverse Revalation')).toBe('metaverse-revelation')
    expect(normalizeCollectionSlug('METAVERSE-REVALATION')).toBe('metaverse-revelation')
  })

  it('returns normalized slug when no alias exists', () => {
    expect(normalizeCollectionSlug('Some New Collection')).toBe('some-new-collection')
  })

  it('handles already-normalized slugs', () => {
    expect(normalizeCollectionSlug('metaverse-revelation')).toBe('metaverse-revelation')
    expect(normalizeCollectionSlug('ethereal-ai')).toBe('ethereal-ai')
  })
})
