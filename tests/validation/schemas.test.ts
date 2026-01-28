import { describe, it, expect } from 'vitest';
import {
  trackSchema,
  collectionSchema,
  validateTrack,
  validateTracks,
  validateCollection,
  validateCollections,
  safeValidateTrack,
  safeValidateCollection,
} from '@/lib/validation/schemas';

describe('Track Schema Validation', () => {
  const validTrack = {
    id: 'test-001',
    title: 'Test Track',
    artist: 'MetaDJ',
    collection: 'Test Collection',
    duration: 180,
    releaseDate: '2025-01-01',
    audioUrl: '/api/audio/test/track.mp3',
    genres: ['Electronic', 'Ambient'],
  };

  describe('Valid Track Data', () => {
    it('should validate a complete valid track', () => {
      const result = trackSchema.safeParse(validTrack);
      expect(result.success).toBe(true);
    });

    it('should validate track with optional fields', () => {
      const trackWithOptionals = {
        ...validTrack,
        description: 'A test track description',
        artworkUrl: '/images/test-art.jpg',
        bpm: 120,
        key: 'C major',
      };
      const result = trackSchema.safeParse(trackWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe('Genre Validation', () => {
    it('should require exactly 2 genres', () => {
      const oneGenre = { ...validTrack, genres: ['Electronic'] };
      const result = trackSchema.safeParse(oneGenre);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('exactly 2 genres');
      }
    });

    it('should reject tracks with "Cinematic" genre', () => {
      const cinematicTrack = { ...validTrack, genres: ['Electronic', 'Cinematic'] };
      const result = trackSchema.safeParse(cinematicTrack);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Cinematic');
      }
    });

    it('should reject tracks with more than 2 genres', () => {
      const threeGenres = { ...validTrack, genres: ['Electronic', 'Ambient', 'Techno'] };
      const result = trackSchema.safeParse(threeGenres);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('exactly 2 genres');
      }
    });

    it('should reject empty genre strings', () => {
      const emptyGenre = { ...validTrack, genres: ['Electronic', ''] };
      const result = trackSchema.safeParse(emptyGenre);
      expect(result.success).toBe(false);
    });
  });

  describe('Required Fields', () => {
    it('should reject track without id', () => {
      const noId = { ...validTrack };
      delete (noId as { id?: string }).id;
      const result = trackSchema.safeParse(noId);
      expect(result.success).toBe(false);
    });

    it('should reject track without title', () => {
      const noTitle = { ...validTrack };
      delete (noTitle as { title?: string }).title;
      const result = trackSchema.safeParse(noTitle);
      expect(result.success).toBe(false);
    });

    it('should reject track without artist', () => {
      const noArtist = { ...validTrack };
      delete (noArtist as { artist?: string }).artist;
      const result = trackSchema.safeParse(noArtist);
      expect(result.success).toBe(false);
    });

    it('should reject track without audioUrl', () => {
      const noUrl = { ...validTrack };
      delete (noUrl as { audioUrl?: string }).audioUrl;
      const result = trackSchema.safeParse(noUrl);
      expect(result.success).toBe(false);
    });
  });

  describe('Field Validation', () => {
    it('should reject invalid release date format', () => {
      const invalidDate = { ...validTrack, releaseDate: '01-01-2025' };
      const result = trackSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('YYYY-MM-DD');
      }
    });

    it('should reject audioUrl not starting with /api/audio/', () => {
      const invalidUrl = { ...validTrack, audioUrl: '/audio/test.mp3' };
      const result = trackSchema.safeParse(invalidUrl);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('/api/audio/');
      }
    });

    it('should reject negative duration', () => {
      const negativeDuration = { ...validTrack, duration: -10 };
      const result = trackSchema.safeParse(negativeDuration);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer duration', () => {
      const floatDuration = { ...validTrack, duration: 180.5 };
      const result = trackSchema.safeParse(floatDuration);
      expect(result.success).toBe(false);
    });

    it('should reject title over 200 characters', () => {
      const longTitle = { ...validTrack, title: 'A'.repeat(201) };
      const result = trackSchema.safeParse(longTitle);
      expect(result.success).toBe(false);
    });
  });
});

describe('Collection Schema Validation', () => {
  const validCollection = {
    id: 'test-col-001',
    title: 'Test Collection',
    artist: 'MetaDJ',
    type: 'collection' as const,
    releaseDate: '2025-01-01',
    trackCount: 10,
    artworkUrl: '/images/test-collection.jpg',
  };

  describe('Valid Collection Data', () => {
    it('should validate a complete valid collection', () => {
      const result = collectionSchema.safeParse(validCollection);
      expect(result.success).toBe(true);
    });

    it('should validate collection with optional description', () => {
      const withDescription = {
        ...validCollection,
        description: 'A test collection description',
      };
      const result = collectionSchema.safeParse(withDescription);
      expect(result.success).toBe(true);
    });

    it('should reject singles type collection (only "collection" type is valid)', () => {
      const singles = { ...validCollection, type: 'singles' };
      const result = collectionSchema.safeParse(singles);
      expect(result.success).toBe(false);
    });
  });

  describe('Required Fields', () => {
    it('should reject collection without id', () => {
      const noId = { ...validCollection };
      delete (noId as { id?: string }).id;
      const result = collectionSchema.safeParse(noId);
      expect(result.success).toBe(false);
    });

    it('should reject collection without type', () => {
      const noType = { ...validCollection };
      delete (noType as { type?: string }).type;
      const result = collectionSchema.safeParse(noType);
      expect(result.success).toBe(false);
    });

    it('should reject collection without artist', () => {
      const noArtist = { ...validCollection };
      delete (noArtist as { artist?: string }).artist;
      const result = collectionSchema.safeParse(noArtist);
      expect(result.success).toBe(false);
    });

    it('should accept collection without artworkUrl (optional field)', () => {
      const noArtwork = { ...validCollection };
      delete (noArtwork as { artworkUrl?: string }).artworkUrl;
      const result = collectionSchema.safeParse(noArtwork);
      expect(result.success).toBe(true);
    });
  });

  describe('Field Validation', () => {
    it('should reject invalid collection type', () => {
      const invalidType = { ...validCollection, type: 'mixtape' };
      const result = collectionSchema.safeParse(invalidType);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod error message varies by version: "Invalid enum value", "Invalid option", or "Invalid input: expected \"collection\""
        expect(result.error.issues[0].message).toMatch(/Invalid (enum value|option|input)/i);
      }
    });

    it('should reject invalid release date format', () => {
      const invalidDate = { ...validCollection, releaseDate: '2025/01/01' };
      const result = collectionSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
    });

    it('should reject negative track count', () => {
      const negativeCount = { ...validCollection, trackCount: -5 };
      const result = collectionSchema.safeParse(negativeCount);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer track count', () => {
      const floatCount = { ...validCollection, trackCount: 10.5 };
      const result = collectionSchema.safeParse(floatCount);
      expect(result.success).toBe(false);
    });
  });
});

describe('Validation Helper Functions', () => {
  const validTrack = {
    id: 'test-001',
    title: 'Test Track',
    artist: 'MetaDJ',
    collection: 'Test Collection',
    duration: 180,
    releaseDate: '2025-01-01',
    audioUrl: '/api/audio/test/track.mp3',
    genres: ['Electronic', 'Ambient'],
  };

  const validCollection = {
    id: 'test-col-001',
    title: 'Test Collection',
    artist: 'MetaDJ',
    type: 'collection' as const,
    releaseDate: '2025-01-01',
    trackCount: 10,
    artworkUrl: '/images/test-collection.jpg',
  };

  describe('validateTrack', () => {
    it('should return validated track for valid data', () => {
      const result = validateTrack(validTrack);
      expect(result).toEqual(validTrack);
    });

    it('should throw descriptive error for invalid data', () => {
      const invalidTrack = { ...validTrack, duration: -10 };
      expect(() => validateTrack(invalidTrack)).toThrow();
    });
  });

  describe('validateTracks', () => {
    it('should validate array of valid tracks', () => {
      const tracks = [validTrack, { ...validTrack, id: 'test-002' }];
      const result = validateTracks(tracks);
      expect(result).toHaveLength(2);
    });

    it('should throw error with index for invalid track in array', () => {
      const tracks = [validTrack, { ...validTrack, id: 'test-002', duration: -10 }];
      expect(() => validateTracks(tracks)).toThrow(/index 1/);
    });
  });

  describe('safeValidateTrack', () => {
    it('should return success for valid track', () => {
      const result = safeValidateTrack(validTrack);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validTrack);
      }
    });

    it('should return error message for invalid track', () => {
      const invalidTrack = { ...validTrack, duration: -10 };
      const result = safeValidateTrack(invalidTrack);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('duration');
      }
    });
  });

  describe('validateCollection', () => {
    it('should return validated collection for valid data', () => {
      const result = validateCollection(validCollection);
      expect(result).toEqual(validCollection);
    });

    it('should throw descriptive error for invalid data', () => {
      const invalidCollection = { ...validCollection, trackCount: -5 };
      expect(() => validateCollection(invalidCollection)).toThrow();
    });
  });

  describe('validateCollections', () => {
    it('should validate array of valid collections', () => {
      const collections = [validCollection, { ...validCollection, id: 'test-col-002' }];
      const result = validateCollections(collections);
      expect(result).toHaveLength(2);
    });

    it('should throw error with index for invalid collection in array', () => {
      const collections = [validCollection, { ...validCollection, id: 'test-col-002', trackCount: -5 }];
      expect(() => validateCollections(collections)).toThrow(/index 1/);
    });
  });

  describe('safeValidateCollection', () => {
    it('should return success for valid collection', () => {
      const result = safeValidateCollection(validCollection);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validCollection);
      }
    });

    it('should return error message for invalid collection', () => {
      const invalidCollection = { ...validCollection, trackCount: -5 };
      const result = safeValidateCollection(invalidCollection);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('trackCount');
      }
    });
  });
});
