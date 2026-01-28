/**
 * Wisdom Content Tool Tests
 *
 * Tests the getWisdomContent tool that retrieves Wisdom entries
 * (Thoughts, Guides, Reflections) from the JSON data store.
 */

import { describe, expect, it } from 'vitest'
import { getWisdomContent } from '@/lib/ai/tools/wisdom'

describe('getWisdomContent', () => {
  // ─── Schema & Structure ─────────────────────────────────────────────

  describe('tool metadata', () => {
    it('has a description', () => {
      expect(getWisdomContent.description).toBeTruthy()
      expect(typeof getWisdomContent.description).toBe('string')
    })

    it('has an inputSchema', () => {
      expect(getWisdomContent.inputSchema).toBeDefined()
    })

    it('has an execute function', () => {
      expect(typeof getWisdomContent.execute).toBe('function')
    })
  })

  // ─── Listing (no id) ───────────────────────────────────────────────

  describe('listing items (no id)', () => {
    it('lists thoughts when no id provided', async () => {
      const result = await getWisdomContent.execute({ section: 'thoughts' })
      expect(result).toHaveProperty('section', 'thoughts')
      expect(result).toHaveProperty('items')
      expect(Array.isArray(result.items)).toBe(true)
      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('id')
        expect(result.items[0]).toHaveProperty('title')
      }
    })

    it('lists guides when no id provided', async () => {
      const result = await getWisdomContent.execute({ section: 'guides' })
      expect(result).toHaveProperty('section', 'guides')
      expect(result).toHaveProperty('items')
      expect(Array.isArray(result.items)).toBe(true)
      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('id')
        expect(result.items[0]).toHaveProperty('title')
        expect(result.items[0]).toHaveProperty('sectionCount')
      }
    })

    it('lists reflections when no id provided', async () => {
      const result = await getWisdomContent.execute({ section: 'reflections' })
      expect(result).toHaveProperty('section', 'reflections')
      expect(result).toHaveProperty('items')
      expect(Array.isArray(result.items)).toBe(true)
      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('id')
        expect(result.items[0]).toHaveProperty('title')
        expect(result.items[0]).toHaveProperty('sectionCount')
      }
    })
  })

  // ─── Fetching by ID ────────────────────────────────────────────────

  describe('fetching by id', () => {
    it('returns found: false for non-existent thought', async () => {
      const result = await getWisdomContent.execute({
        section: 'thoughts',
        id: 'non-existent-id-xyz',
      })
      expect(result).toHaveProperty('found', false)
    })

    it('returns found: false for non-existent guide', async () => {
      const result = await getWisdomContent.execute({
        section: 'guides',
        id: 'non-existent-guide-xyz',
      })
      expect(result).toHaveProperty('found', false)
    })

    it('returns found: false for non-existent reflection', async () => {
      const result = await getWisdomContent.execute({
        section: 'reflections',
        id: 'non-existent-reflection-xyz',
      })
      expect(result).toHaveProperty('found', false)
    })

    it('returns thought content when found', async () => {
      // First, get the list to find a valid id
      const listing = await getWisdomContent.execute({ section: 'thoughts' })
      if (listing.items.length === 0) return // Skip if no data

      const validId = listing.items[0].id
      const result = await getWisdomContent.execute({
        section: 'thoughts',
        id: validId,
      })
      expect(result).toHaveProperty('found', true)
      expect(result).toHaveProperty('id', validId)
      expect(result).toHaveProperty('title')
      expect(result).toHaveProperty('content')
      expect(Array.isArray(result.content)).toBe(true)
    })

    it('returns guide content with sections when found', async () => {
      const listing = await getWisdomContent.execute({ section: 'guides' })
      if (listing.items.length === 0) return

      const validId = listing.items[0].id
      const result = await getWisdomContent.execute({
        section: 'guides',
        id: validId,
      })
      expect(result).toHaveProperty('found', true)
      expect(result).toHaveProperty('id', validId)
      expect(result).toHaveProperty('sections')
      expect(Array.isArray(result.sections)).toBe(true)
      if (result.sections.length > 0) {
        expect(result.sections[0]).toHaveProperty('heading')
        expect(result.sections[0]).toHaveProperty('paragraphs')
      }
    })

    it('returns reflection content with sections when found', async () => {
      const listing = await getWisdomContent.execute({ section: 'reflections' })
      if (listing.items.length === 0) return

      const validId = listing.items[0].id
      const result = await getWisdomContent.execute({
        section: 'reflections',
        id: validId,
      })
      expect(result).toHaveProperty('found', true)
      expect(result).toHaveProperty('id', validId)
      expect(result).toHaveProperty('sections')
      expect(Array.isArray(result.sections)).toBe(true)
    })
  })

  // ─── Input Sanitization ────────────────────────────────────────────

  describe('input sanitization', () => {
    it('truncates excessively long id values', async () => {
      const longId = 'a'.repeat(200)
      const result = await getWisdomContent.execute({
        section: 'thoughts',
        id: longId,
      })
      // Should not throw, just return not found
      expect(result).toHaveProperty('found', false)
    })

    it('handles empty string id as listing', async () => {
      const result = await getWisdomContent.execute({
        section: 'thoughts',
        id: '',
      })
      // Empty id after slice is falsy, so treated as listing
      expect(result).toHaveProperty('items')
    })
  })

  // ─── Signoff Filtering ─────────────────────────────────────────────

  describe('signoff filtering', () => {
    it('filters out signoff lines from thought content', async () => {
      const listing = await getWisdomContent.execute({ section: 'thoughts' })
      if (listing.items.length === 0) return

      const result = await getWisdomContent.execute({
        section: 'thoughts',
        id: listing.items[0].id,
      })
      if (!result.found || !result.content) return

      // No content paragraphs should match the signoff regex
      for (const paragraph of result.content) {
        expect(paragraph.trim()).not.toMatch(/^—\s*metadj\s*$/i)
      }
    })

    it('filters out signoff lines from guide sections', async () => {
      const listing = await getWisdomContent.execute({ section: 'guides' })
      if (listing.items.length === 0) return

      const result = await getWisdomContent.execute({
        section: 'guides',
        id: listing.items[0].id,
      })
      if (!result.found || !result.sections) return

      for (const section of result.sections) {
        for (const paragraph of section.paragraphs) {
          expect(paragraph.trim()).not.toMatch(/^—\s*metadj\s*$/i)
        }
      }
    })
  })
})
