/**
 * MetaDJai API Request Validation
 *
 * Consolidated Zod-based validation logic for MetaDJai API routes.
 * Used by both streaming and non-streaming endpoints to ensure
 * consistent validation behavior with type-safe schemas.
 *
 * @module lib/ai/validation
 */

import { z } from 'zod'
import {
  MAX_CATALOG_COLLECTIONS,
  MAX_CATALOG_TITLES,
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_GENRE_LENGTH,
  MAX_COLLECTION_ID_LENGTH,
  MAX_COLLECTION_PRIMARY_GENRES,
  MAX_COLLECTION_SAMPLE_TRACKS,
  MAX_COLLECTION_TITLE_LENGTH,
  MAX_COLLECTION_TRACK_TITLE_LENGTH,
  MAX_CONTENT_CONTEXT_ID_LENGTH,
  MAX_CONTENT_CONTEXT_TITLE_LENGTH,
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_MESSAGES_PER_REQUEST,
  MAX_PAGE_CONTEXT_DETAILS_LENGTH,
  MAX_PERSONALIZATION_LENGTH,
} from '@/lib/ai/limits'
import { formatZodErrorString } from '@/lib/validation/format'

export { MAX_MESSAGE_CONTENT_LENGTH, MAX_MESSAGES_PER_REQUEST }

/**
 * Role schema - user or assistant messages only
 */
const roleSchema = z.enum(['user', 'assistant'] as const)

/**
 * Single message schema with content validation
 */
const messageSchema = z.object({
  role: roleSchema,
  content: z.string()
    .min(1, 'Message content cannot be empty')
    .max(MAX_MESSAGE_CONTENT_LENGTH, `Message content exceeds ${MAX_MESSAGE_CONTENT_LENGTH} characters`),
})

/**
 * Provider preference schema
 */
const providerSchema = z.enum(['openai', 'anthropic', 'google', 'xai'] as const)

/**
 * Personalization schema for profile-based preferences
 */
const personalizationSchema = z.object({
  enabled: z.boolean(),
  profileId: z.enum(['default', 'creative', 'mentor', 'dj', 'custom'] as const),
  profileLabel: z.string().min(1).max(40),
  instructions: z.string()
    .min(1, 'Personalization instructions cannot be empty')
    .max(MAX_PERSONALIZATION_LENGTH, `Personalization exceeds ${MAX_PERSONALIZATION_LENGTH} characters`),
})

/**
 * Page context schema for navigation awareness
 */
const pageContextSchema = z.object({
  view: z.enum(['collections', 'wisdom', 'cinema', 'journal', 'search', 'queue'] as const),
  details: z.string().max(
    MAX_PAGE_CONTEXT_DETAILS_LENGTH,
    `Page context details exceed ${MAX_PAGE_CONTEXT_DETAILS_LENGTH} characters`
  ).optional(),
})

/**
 * Content context schema for Wisdom page awareness
 */
const contentContextSchema = z.object({
  view: z.literal('wisdom'),
  section: z.enum(['thoughts', 'guides', 'reflections'] as const).optional(),
  id: z.string().max(
    MAX_CONTENT_CONTEXT_ID_LENGTH,
    `Content context id exceeds ${MAX_CONTENT_CONTEXT_ID_LENGTH} characters`
  ).optional(),
  title: z.string().max(
    MAX_CONTENT_CONTEXT_TITLE_LENGTH,
    `Content context title exceeds ${MAX_CONTENT_CONTEXT_TITLE_LENGTH} characters`
  ).optional(),
})

/**
 * Catalog summary schema for collection context
 */
const catalogSummarySchema = z.object({
  totalCollections: z.number().int().nonnegative(),
  collectionTitles: z.array(
    z.string().max(
      MAX_COLLECTION_TITLE_LENGTH,
      `Collection title exceeds ${MAX_COLLECTION_TITLE_LENGTH} characters`
    )
  ).max(
    MAX_CATALOG_TITLES,
    `Too many collection titles. Limit is ${MAX_CATALOG_TITLES}.`
  ),
  collections: z.array(z.object({
    id: z.string().max(
      MAX_COLLECTION_ID_LENGTH,
      `Collection id exceeds ${MAX_COLLECTION_ID_LENGTH} characters`
    ),
    title: z.string().max(
      MAX_COLLECTION_TITLE_LENGTH,
      `Collection title exceeds ${MAX_COLLECTION_TITLE_LENGTH} characters`
    ),
    description: z.string().max(
      MAX_COLLECTION_DESCRIPTION_LENGTH,
      `Collection description exceeds ${MAX_COLLECTION_DESCRIPTION_LENGTH} characters`
    ).optional(),
    trackCount: z.number().int().nonnegative(),
    sampleTracks: z.array(
      z.string().max(
        MAX_COLLECTION_TRACK_TITLE_LENGTH,
        `Sample track title exceeds ${MAX_COLLECTION_TRACK_TITLE_LENGTH} characters`
      )
    ).max(
      MAX_COLLECTION_SAMPLE_TRACKS,
      `Too many sample tracks. Limit is ${MAX_COLLECTION_SAMPLE_TRACKS}.`
    ),
    primaryGenres: z.array(
      z.string().max(
        MAX_COLLECTION_GENRE_LENGTH,
        `Genre exceeds ${MAX_COLLECTION_GENRE_LENGTH} characters`
      )
    ).max(
      MAX_COLLECTION_PRIMARY_GENRES,
      `Too many primary genres. Limit is ${MAX_COLLECTION_PRIMARY_GENRES}.`
    ).optional(),
  })).max(
    MAX_CATALOG_COLLECTIONS,
    `Too many collections in catalog summary. Limit is ${MAX_CATALOG_COLLECTIONS}.`
  ),
})

/**
 * Context schema for playback and UI state
 */
const contextSchema = z.object({
  nowPlayingTitle: z.string().optional(),
  nowPlayingArtist: z.string().optional(),
  selectedCollectionTitle: z.string().optional(),
  mode: z.enum(['adaptive', 'explorer', 'dj'] as const).optional(),
  pageContext: pageContextSchema.optional(),
  contentContext: contentContextSchema.optional(),
  cinemaActive: z.boolean().optional(),
  wisdomActive: z.boolean().optional(),
  catalogSummary: catalogSummarySchema.optional(),
}).nullable()

/**
 * MetaDJai API request body schema
 *
 * Validates:
 * - messages array with proper structure
 * - message count limits
 * - content length limits
 * - optional context object
 * - optional model preference
 */
export const metaDjAiRequestSchema = z.object({
  messages: z.array(messageSchema)
    .min(1, 'At least one message is required')
    .max(MAX_MESSAGES_PER_REQUEST, `Too many messages. Limit is ${MAX_MESSAGES_PER_REQUEST}.`),
  context: contextSchema.optional(),
  modelPreference: providerSchema.optional(),
  personalization: personalizationSchema.optional(),
})

export type MetaDjAiRequestPayload = z.infer<typeof metaDjAiRequestSchema>

export interface ValidationResult {
  valid: boolean
  error?: string
  statusCode?: number
  data?: MetaDjAiRequestPayload
}

/**
 * Check for spam patterns (duplicate messages)
 *
 * Detects when users send the same message repeatedly,
 * which may indicate spam or accidental double-clicks.
 */
function checkSpamPatterns(messages: { role: string; content: string }[]): string | null {
  const userMessages = messages.filter((m) => m.role === 'user')
  const lastUserMessage = userMessages.at(-1)

  if (lastUserMessage) {
    const recentIdentical = userMessages
      .slice(-3)
      .filter((m) => m.content.trim() === lastUserMessage.content.trim())

    if (recentIdentical.length >= 2) {
      return 'Please avoid sending duplicate messages'
    }
  }

  return null
}

/**
 * Validates the MetaDJai API request payload using Zod
 *
 * Checks:
 * - Schema validation (types, structure, limits)
 * - Spam patterns (duplicate messages)
 *
 * @param payload - The parsed request body (unknown type for safety)
 * @returns Validation result with typed data if valid, error details if invalid
 */
export function validateMetaDjAiRequest(
  payload: unknown
): ValidationResult {
  // Validate against Zod schema
  const result = metaDjAiRequestSchema.safeParse(payload)

  if (!result.success) {
    return {
      valid: false,
      error: formatZodErrorString(result.error),
      statusCode: 400,
    }
  }

  // Check for spam patterns
  const spamError = checkSpamPatterns(result.data.messages)
  if (spamError) {
    return {
      valid: false,
      error: spamError,
      statusCode: 400,
    }
  }

  return {
    valid: true,
    data: result.data,
  }
}

/**
 * Type-safe validation for use in API routes
 *
 * Returns the validated and typed data directly,
 * or throws with appropriate HTTP status code.
 *
 * @param payload - The parsed request body
 * @throws ValidationError with statusCode if validation fails
 */
export function validateMetaDjAiRequestStrict(payload: unknown): MetaDjAiRequestPayload {
  const result = validateMetaDjAiRequest(payload)

  if (!result.valid || !result.data) {
    const error = new Error(result.error || 'Validation failed')
    ;(error as Error & { statusCode: number }).statusCode = result.statusCode || 400
    throw error
  }

  return result.data
}
