/**
 * Motion Utilities Tests
 *
 * Tests pure Tailwind CSS helpers and motion preference utilities.
 * The functions shouldReduceMotion, getMotionSafe*, and onMotionPreferenceChange
 * depend on window.matchMedia; motionSafe and motion are pure string helpers.
 */

import { describe, expect, it } from 'vitest'
import { motionSafe, motion } from '@/lib/motion-utils'

describe('motion-utils', () => {
  describe('motionSafe', () => {
    it('wraps class with motion-safe prefix', () => {
      expect(motionSafe('animate-fade-in')).toBe('motion-safe:animate-fade-in')
    })

    it('handles empty string', () => {
      expect(motionSafe('')).toBe('motion-safe:')
    })
  })

  describe('motion', () => {
    it('combines full and reduced motion classes', () => {
      const result = motion('animate-spin', 'animate-none')
      expect(result).toContain('motion-safe:animate-spin')
      expect(result).toContain('motion-reduce:animate-none')
    })

    it('omits reduced class when not provided', () => {
      const result = motion('animate-fade-in')
      expect(result).toContain('motion-safe:animate-fade-in')
      expect(result).not.toContain('motion-reduce')
    })

    it('omits reduced class when empty string', () => {
      const result = motion('animate-bounce', '')
      expect(result).not.toContain('motion-reduce')
    })
  })
})
