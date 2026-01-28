/**
 * Tour Config Tests
 *
 * Tests the guided tour step configuration for the Nexus app.
 */

import { describe, expect, it } from 'vitest'
import { GLOBAL_TOUR_STEPS, type TourStep } from '@/lib/tour/tour-config'

describe('GLOBAL_TOUR_STEPS', () => {
  it('is an array of tour steps', () => {
    expect(Array.isArray(GLOBAL_TOUR_STEPS)).toBe(true)
    expect(GLOBAL_TOUR_STEPS.length).toBeGreaterThan(0)
  })

  it('contains 11 steps', () => {
    expect(GLOBAL_TOUR_STEPS).toHaveLength(11)
  })

  it('each step has a popover with title and description', () => {
    for (const step of GLOBAL_TOUR_STEPS) {
      expect(step.popover).toBeDefined()
      expect(typeof step.popover.title).toBe('string')
      expect(step.popover.title.length).toBeGreaterThan(0)
      expect(typeof step.popover.description).toBe('string')
      expect(step.popover.description.length).toBeGreaterThan(0)
    }
  })

  it('first step targets cinema start element', () => {
    const firstStep = GLOBAL_TOUR_STEPS[0]
    expect(firstStep.element).toBe('#tour-start-cinematic')
    expect(firstStep.popover.title).toBe('Enter Cinema')
  })

  it('last step has no element selector (modal)', () => {
    const lastStep = GLOBAL_TOUR_STEPS[GLOBAL_TOUR_STEPS.length - 1]
    expect(lastStep.element).toBeUndefined()
    expect(lastStep.popover.title).toBe("You're Set")
  })

  it('music panel step exists', () => {
    const musicStep = GLOBAL_TOUR_STEPS.find(s => s.popover.title === 'Music Panel')
    expect(musicStep).toBeDefined()
    expect(musicStep!.element).toBe('#tour-toggle-music')
  })

  it('MetaDJai step exists', () => {
    const aiStep = GLOBAL_TOUR_STEPS.find(s => s.popover.title === 'MetaDJai')
    expect(aiStep).toBeDefined()
    expect(aiStep!.element).toBe('#tour-toggle-ai')
  })

  it('all element selectors are valid CSS id selectors or undefined', () => {
    for (const step of GLOBAL_TOUR_STEPS) {
      if (step.element) {
        expect(step.element).toMatch(/^#[\w-]+$/)
      }
    }
  })

  it('popover sides are valid values', () => {
    const validSides = ['top', 'bottom', 'left', 'right']
    for (const step of GLOBAL_TOUR_STEPS) {
      if (step.popover.side) {
        expect(validSides).toContain(step.popover.side)
      }
    }
  })

  it('popover aligns are valid values', () => {
    const validAligns = ['start', 'center', 'end']
    for (const step of GLOBAL_TOUR_STEPS) {
      if (step.popover.align) {
        expect(validAligns).toContain(step.popover.align)
      }
    }
  })
})
