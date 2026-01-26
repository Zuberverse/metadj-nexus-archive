/**
 * Zod validation schemas for MetaDJ Nexus data integrity
 *
 * These schemas validate track and collection metadata at runtime,
 * ensuring data consistency and catching errors early.
 */

import { z } from 'zod';
import { formatZodErrorString } from './format';

/**
 * Track metadata schema
 * Validates all track properties including the "exactly 2 genres" rule
 */
export const trackSchema = z.object({
  id: z.string().min(1, 'Track ID is required'),
  title: z.string().min(1, 'Track title is required').max(200, 'Track title too long'),
  artist: z.string().min(1, 'Artist name is required').max(100, 'Artist name too long'),
  collection: z.string().min(1, 'Collection name is required'),
  duration: z.number().positive('Duration must be positive').int('Duration must be integer'),
  releaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Release date must be in YYYY-MM-DD format'),
  audioUrl: z.string().startsWith('/api/audio/', 'Audio URL must start with /api/audio/'),
  description: z.string().optional(),
  artworkUrl: z.string().optional(),
  genres: z
    .array(z.string().min(1, 'Genre cannot be empty'))
    .length(2, 'Track must have exactly 2 genres')
    .refine(
      (genres) => !genres.includes('Cinematic'),
      'Avoid using "Cinematic" as a genre tag'
    ),
  bpm: z.number().positive('BPM must be positive').int('BPM must be integer').optional(),
  key: z.string().optional(),
});

/**
 * Collection type enum
 * Shared between schema and type exports
 */
export const collectionTypeSchema = z.enum(['collection'] as const);
export type CollectionType = z.infer<typeof collectionTypeSchema>;

/**
 * Collection metadata schema
 * Validates collection properties and type constraints
 *
 * Note: This is the single source of truth for the Collection type.
 * The schema matches the actual data structure in collections.json.
 */
export const collectionSchema = z.object({
  id: z.string().min(1, 'Collection ID is required'),
  title: z.string().min(1, 'Collection title is required').max(200, 'Collection title too long'),
  artist: z.string().min(1, 'Artist name is required').max(100, 'Artist name too long'),
  type: collectionTypeSchema,
  releaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Release date must be in YYYY-MM-DD format'),
  artworkUrl: z.string().optional(),
  trackCount: z.number().positive('Track count must be positive').int('Track count must be integer'),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
});

/**
 * Type exports for TypeScript
 */
export type Track = z.infer<typeof trackSchema>;
export type Collection = z.infer<typeof collectionSchema>;

/**
 * Validate a single track
 * @throws {z.ZodError} If validation fails
 */
export function validateTrack(track: unknown): Track {
  return trackSchema.parse(track);
}

/**
 * Validate an array of tracks
 * @throws {Error} If any track fails validation
 */
export function validateTracks(tracks: unknown[]): Track[] {
  return tracks.map((track, index) => {
    try {
      return trackSchema.parse(track);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid track at index ${index}: ${formatZodErrorString(error)}`);
      }
      throw error;
    }
  });
}

/**
 * Validate a single collection
 * @throws {z.ZodError} If validation fails
 */
export function validateCollection(collection: unknown): Collection {
  return collectionSchema.parse(collection);
}

/**
 * Validate an array of collections
 * @throws {Error} If any collection fails validation
 */
export function validateCollections(collections: unknown[]): Collection[] {
  return collections.map((collection, index) => {
    try {
      return collectionSchema.parse(collection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid collection at index ${index}: ${formatZodErrorString(error)}`);
      }
      throw error;
    }
  });
}

/**
 * Safe validation that returns errors instead of throwing
 */
export function safeValidateTrack(track: unknown): { success: true; data: Track } | { success: false; error: string } {
  const result = trackSchema.safeParse(track);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: formatZodErrorString(result.error) };
}

/**
 * Safe validation for collections
 */
export function safeValidateCollection(collection: unknown): { success: true; data: Collection } | { success: false; error: string } {
  const result = collectionSchema.safeParse(collection);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: formatZodErrorString(result.error) };
}
