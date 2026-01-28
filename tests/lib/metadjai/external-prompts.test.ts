/**
 * MetaDJai External Prompts Tests
 *
 * Tests the external prompt dispatch mechanism for MetaDJai.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  META_DJAI_PROMPT_EVENT,
  dispatchMetaDjAiPrompt,
} from '@/lib/metadjai/external-prompts'

describe('META_DJAI_PROMPT_EVENT', () => {
  it('is the expected event name', () => {
    expect(META_DJAI_PROMPT_EVENT).toBe('metadjai:prompt')
  })
})

describe('dispatchMetaDjAiPrompt', () => {
  let dispatchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    dispatchSpy = vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('dispatches a CustomEvent with the prompt detail', () => {
    dispatchMetaDjAiPrompt({ prompt: 'Tell me about MetaDJ' })

    expect(dispatchSpy).toHaveBeenCalledOnce()
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent
    expect(event.type).toBe('metadjai:prompt')
    expect(event.detail).toEqual({ prompt: 'Tell me about MetaDJ' })
  })

  it('includes newSession flag when provided', () => {
    dispatchMetaDjAiPrompt({ prompt: 'Start fresh', newSession: true })

    const event = dispatchSpy.mock.calls[0][0] as CustomEvent
    expect(event.detail).toEqual({ prompt: 'Start fresh', newSession: true })
  })

  it('does not dispatch for empty prompt', () => {
    dispatchMetaDjAiPrompt({ prompt: '' })
    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('does not dispatch for null detail', () => {
    dispatchMetaDjAiPrompt(null as any)
    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('does not dispatch for undefined detail', () => {
    dispatchMetaDjAiPrompt(undefined as any)
    expect(dispatchSpy).not.toHaveBeenCalled()
  })
})
