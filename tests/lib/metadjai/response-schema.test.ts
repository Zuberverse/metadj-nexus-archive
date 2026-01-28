/**
 * MetaDJai Response Schema Tests
 *
 * Tests the structured output schema for AI SDK parsing.
 */

import { describe, expect, it } from 'vitest'
import { metaDjAiResponseSchema } from '@/lib/metadjai/response-schema'

describe('metaDjAiResponseSchema', () => {
  it('accepts valid response with reply', () => {
    const result = metaDjAiResponseSchema.safeParse({ reply: 'Hello' })
    expect(result.success).toBe(true)
  })

  it('rejects empty reply', () => {
    const result = metaDjAiResponseSchema.safeParse({ reply: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing reply', () => {
    const result = metaDjAiResponseSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects non-string reply', () => {
    const result = metaDjAiResponseSchema.safeParse({ reply: 42 })
    expect(result.success).toBe(false)
  })

  it('rejects null', () => {
    const result = metaDjAiResponseSchema.safeParse(null)
    expect(result.success).toBe(false)
  })
})
