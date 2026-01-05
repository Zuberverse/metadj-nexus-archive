import { describe, expect, it } from 'vitest';
import {
  tracks,
  collections,
  getTrackById,
  getTracksByCollection,
  getCollectionById,
  shuffleTracks,
} from '@/lib/music';

describe('Music Repository', () => {
  describe('Track Operations', () => {
    it('loads all tracks from data source', () => {
      expect(tracks).toBeDefined();
      expect(Array.isArray(tracks)).toBe(true);
      expect(tracks.length).toBeGreaterThan(0);
    });

    it('retrieves track by valid ID', () => {
      const track = getTrackById('metadj-005'); // Electric Horizon
      expect(track).toBeDefined();
      expect(track?.id).toBe('metadj-005');
      expect(track?.title).toBe('Electric Horizon');
    });

    it('returns undefined for non-existent track ID', () => {
      const track = getTrackById('invalid-id');
      expect(track).toBeUndefined();
    });

    it('ensures all tracks have required fields', () => {
      tracks.forEach((track) => {
        expect(track.id).toBeTruthy();
        expect(track.title).toBeTruthy();
        expect(track.artist).toBeTruthy();
        expect(track.collection).toBeTruthy();
        expect(track.duration).toBeGreaterThan(0);
        expect(track.audioUrl).toBeTruthy();
        expect(track.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD
      });
    });

    it('validates genre tags are exactly 2 per track', () => {
      tracks.forEach((track) => {
        expect(track.genres).toBeDefined();
        expect(track.genres?.length).toBe(2);
      });
    });

    it('ensures no "Cinematic" tag is used as label', () => {
      tracks.forEach((track) => {
        const hasCinematicTag = track.genres?.some(
          (genre) => genre.toLowerCase() === 'cinematic'
        );
        expect(hasCinematicTag).toBe(false);
      });
    });
  });

  describe('Collection Operations', () => {
    it('loads all collections from data source', () => {
      expect(collections).toBeDefined();
      expect(Array.isArray(collections)).toBe(true);
      expect(collections.length).toBeGreaterThan(0);
    });

    it('retrieves collection by valid ID', () => {
      const collection = getCollectionById('majestic-ascent');
      expect(collection).toBeDefined();
      expect(collection?.id).toBe('majestic-ascent');
      expect(collection?.title).toBe('Majestic Ascent');
    });

    it('returns undefined for non-existent collection ID', () => {
      const collection = getCollectionById('invalid-collection');
      expect(collection).toBeUndefined();
    });

    it('retrieves tracks for specific collection', () => {
      const majesticAscentTracks = getTracksByCollection('majestic-ascent');
      expect(majesticAscentTracks.length).toBeGreaterThan(0);
      majesticAscentTracks.forEach((track) => {
        // Collection field uses Title Case
        expect(track.collection).toBe('Majestic Ascent');
      });
    });

    it('returns empty array for collection with no tracks', () => {
      const emptyTracks = getTracksByCollection('non-existent-collection');
      expect(emptyTracks).toEqual([]);
    });

    it('ensures all collections have required fields', () => {
      collections.forEach((collection) => {
        expect(collection.id).toBeTruthy();
        expect(collection.title).toBeTruthy();
        expect(collection.type).toMatch(/^collection$/);
        expect(collection.trackCount).toBeGreaterThan(0);
        expect(collection.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('Shuffle Operations', () => {
    it('shuffles tracks array maintaining all members', () => {
      const testTracks = tracks.slice(0, 10);
      const shuffled = shuffleTracks(testTracks);

      expect(shuffled.length).toBe(testTracks.length);

      // All original tracks present
      testTracks.forEach((track) => {
        expect(shuffled.find((t) => t.id === track.id)).toBeDefined();
      });
    });

    it('produces different order on multiple shuffles (statistical)', () => {
      const testTracks = tracks.slice(0, 5);
      const attempts = 4;
      const results = Array.from({ length: attempts }, () => shuffleTracks([...testTracks]));

      // Consider it a pass if any shuffle differs from the original order
      const anyDifferent = results.some((shuffled) =>
        shuffled.some((track, index) => track.id !== testTracks[index].id),
      );
      expect(anyDifferent).toBe(true);
    });

    it('handles empty array shuffle gracefully', () => {
      const shuffled = shuffleTracks([]);
      expect(shuffled).toEqual([]);
    });

    it('handles single track array', () => {
      const singleTrack = [tracks[0]];
      const shuffled = shuffleTracks(singleTrack);
      expect(shuffled).toEqual(singleTrack);
    });
  });

  describe('Data Integrity', () => {
    it('ensures track IDs are unique', () => {
      const ids = tracks.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('ensures collection IDs are unique', () => {
      const ids = collections.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('validates all track collections exist', () => {
      const collectionTitles = new Set(collections.map((c) => c.title));
      tracks.forEach((track) => {
        // Tracks reference collections by title, not ID
        expect(collectionTitles.has(track.collection)).toBe(true);
      });
    });

    it('validates collection track counts match actual tracks', () => {
      collections.forEach((collection) => {
        const actualCount = tracks.filter(
          (t) => t.collection === collection.title
        ).length;
        expect(actualCount).toBe(collection.trackCount);
      });
    });
  });
});
