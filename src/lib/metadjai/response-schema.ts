/**
 * MetaDJai Structured Output Schema
 *
 * Defines the structured reply format for AI SDK Output parsing.
 */

import { z } from "zod"

export const metaDjAiResponseSchema = z.object({
  reply: z.string().min(1),
})

export type MetaDjAiStructuredReply = z.infer<typeof metaDjAiResponseSchema>
