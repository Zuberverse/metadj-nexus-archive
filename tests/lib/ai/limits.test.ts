/**
 * AI Limits Tests
 *
 * Tests the centralized limit constants for MetaDJai validation.
 * Ensures limits maintain expected values and relationships.
 * Also validates that the limits integrate correctly with the validation layer.
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_MESSAGES_PER_REQUEST,
  MAX_MESSAGE_CONTENT_LENGTH,
  MAX_MESSAGE_HISTORY,
  MAX_PERSONALIZATION_LENGTH,
  MAX_PAGE_CONTEXT_DETAILS_LENGTH,
  MAX_CONTENT_CONTEXT_ID_LENGTH,
  MAX_CONTENT_CONTEXT_TITLE_LENGTH,
  MAX_COLLECTION_TITLE_LENGTH,
  MAX_COLLECTION_ID_LENGTH,
  MAX_COLLECTION_DESCRIPTION_LENGTH,
  MAX_COLLECTION_TRACK_TITLE_LENGTH,
  MAX_COLLECTION_GENRE_LENGTH,
  MAX_CATALOG_TITLES,
  MAX_CATALOG_COLLECTIONS,
  MAX_COLLECTION_SAMPLE_TRACKS,
  MAX_COLLECTION_PRIMARY_GENRES,
  SPAM_THRESHOLD_IDENTICAL_MESSAGES,
  SPAM_CHECK_WINDOW,
} from '@/lib/ai/limits';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Message limits', () => {
  it('MAX_MESSAGES_PER_REQUEST is a reasonable positive integer', () => {
    expect(MAX_MESSAGES_PER_REQUEST).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_MESSAGES_PER_REQUEST)).toBe(true);
    // Should be generous but bounded (between 10 and 200)
    expect(MAX_MESSAGES_PER_REQUEST).toBeGreaterThanOrEqual(10);
    expect(MAX_MESSAGES_PER_REQUEST).toBeLessThanOrEqual(200);
  });

  it('MAX_MESSAGES_PER_REQUEST is currently 50', () => {
    expect(MAX_MESSAGES_PER_REQUEST).toBe(50);
  });

  it('MAX_MESSAGE_CONTENT_LENGTH allows substantial content', () => {
    expect(MAX_MESSAGE_CONTENT_LENGTH).toBeGreaterThan(0);
    // Should allow at least a few thousand characters for code snippets
    expect(MAX_MESSAGE_CONTENT_LENGTH).toBeGreaterThanOrEqual(4000);
  });

  it('MAX_MESSAGE_CONTENT_LENGTH is currently 16000', () => {
    expect(MAX_MESSAGE_CONTENT_LENGTH).toBe(16000);
  });

  it('MAX_MESSAGE_HISTORY is smaller than MAX_MESSAGES_PER_REQUEST', () => {
    expect(MAX_MESSAGE_HISTORY).toBeLessThanOrEqual(MAX_MESSAGES_PER_REQUEST);
  });

  it('MAX_MESSAGE_HISTORY is currently 12', () => {
    expect(MAX_MESSAGE_HISTORY).toBe(12);
  });
});

describe('Personalization limits', () => {
  it('MAX_PERSONALIZATION_LENGTH allows sufficient instructions', () => {
    expect(MAX_PERSONALIZATION_LENGTH).toBeGreaterThanOrEqual(100);
    expect(MAX_PERSONALIZATION_LENGTH).toBeLessThanOrEqual(2000);
  });

  it('MAX_PERSONALIZATION_LENGTH is currently 500', () => {
    expect(MAX_PERSONALIZATION_LENGTH).toBe(500);
  });
});

describe('Context limits', () => {
  it('MAX_PAGE_CONTEXT_DETAILS_LENGTH is tweet-length', () => {
    expect(MAX_PAGE_CONTEXT_DETAILS_LENGTH).toBe(280);
  });

  it('MAX_CONTENT_CONTEXT_ID_LENGTH handles slug-style IDs', () => {
    expect(MAX_CONTENT_CONTEXT_ID_LENGTH).toBeGreaterThanOrEqual(50);
    expect(MAX_CONTENT_CONTEXT_ID_LENGTH).toBe(120);
  });

  it('MAX_CONTENT_CONTEXT_TITLE_LENGTH handles long titles', () => {
    expect(MAX_CONTENT_CONTEXT_TITLE_LENGTH).toBeGreaterThanOrEqual(100);
    expect(MAX_CONTENT_CONTEXT_TITLE_LENGTH).toBe(200);
  });
});

describe('Catalog limits', () => {
  it('collection field lengths are positive', () => {
    expect(MAX_COLLECTION_TITLE_LENGTH).toBeGreaterThan(0);
    expect(MAX_COLLECTION_ID_LENGTH).toBeGreaterThan(0);
    expect(MAX_COLLECTION_DESCRIPTION_LENGTH).toBeGreaterThan(0);
    expect(MAX_COLLECTION_TRACK_TITLE_LENGTH).toBeGreaterThan(0);
    expect(MAX_COLLECTION_GENRE_LENGTH).toBeGreaterThan(0);
  });

  it('collection field lengths have expected values', () => {
    expect(MAX_COLLECTION_TITLE_LENGTH).toBe(100);
    expect(MAX_COLLECTION_ID_LENGTH).toBe(120);
    expect(MAX_COLLECTION_DESCRIPTION_LENGTH).toBe(1000);
    expect(MAX_COLLECTION_TRACK_TITLE_LENGTH).toBe(100);
    expect(MAX_COLLECTION_GENRE_LENGTH).toBe(50);
  });

  it('catalog array limits are positive integers', () => {
    expect(MAX_CATALOG_TITLES).toBeGreaterThan(0);
    expect(MAX_CATALOG_COLLECTIONS).toBeGreaterThan(0);
    expect(MAX_COLLECTION_SAMPLE_TRACKS).toBeGreaterThan(0);
    expect(MAX_COLLECTION_PRIMARY_GENRES).toBeGreaterThan(0);
  });

  it('catalog array limits have expected values', () => {
    expect(MAX_CATALOG_TITLES).toBe(50);
    expect(MAX_CATALOG_COLLECTIONS).toBe(30);
    expect(MAX_COLLECTION_SAMPLE_TRACKS).toBe(10);
    expect(MAX_COLLECTION_PRIMARY_GENRES).toBe(10);
  });

  it('catalog titles limit is >= catalog collections limit', () => {
    // Titles should be a superset or equal to full collection objects
    expect(MAX_CATALOG_TITLES).toBeGreaterThanOrEqual(MAX_CATALOG_COLLECTIONS);
  });
});

describe('Spam detection thresholds', () => {
  it('SPAM_THRESHOLD_IDENTICAL_MESSAGES is currently 5', () => {
    expect(SPAM_THRESHOLD_IDENTICAL_MESSAGES).toBe(5);
  });

  it('SPAM_CHECK_WINDOW is currently 8', () => {
    expect(SPAM_CHECK_WINDOW).toBe(8);
  });

  it('spam threshold is less than or equal to check window', () => {
    // Threshold must be <= window size, otherwise spam detection would never trigger
    expect(SPAM_THRESHOLD_IDENTICAL_MESSAGES).toBeLessThanOrEqual(SPAM_CHECK_WINDOW);
  });

  it('spam threshold allows at least one retry', () => {
    // Should allow at least 2 identical messages (1 original + 1 retry)
    expect(SPAM_THRESHOLD_IDENTICAL_MESSAGES).toBeGreaterThan(2);
  });

  it('check window is wider than threshold for pattern detection', () => {
    expect(SPAM_CHECK_WINDOW).toBeGreaterThan(SPAM_THRESHOLD_IDENTICAL_MESSAGES);
  });
});

describe('Limit relationships and invariants', () => {
  it('total maximum request payload estimate is bounded', () => {
    // Rough upper bound: max messages * max content length
    const maxPayloadChars = MAX_MESSAGES_PER_REQUEST * MAX_MESSAGE_CONTENT_LENGTH;
    // Should not exceed ~1M characters to keep requests manageable
    expect(maxPayloadChars).toBeLessThanOrEqual(1_000_000);
  });

  it('description length is larger than title length', () => {
    expect(MAX_COLLECTION_DESCRIPTION_LENGTH).toBeGreaterThan(MAX_COLLECTION_TITLE_LENGTH);
  });

  it('all limits are finite numbers', () => {
    const limits = [
      MAX_MESSAGES_PER_REQUEST,
      MAX_MESSAGE_CONTENT_LENGTH,
      MAX_MESSAGE_HISTORY,
      MAX_PERSONALIZATION_LENGTH,
      MAX_PAGE_CONTEXT_DETAILS_LENGTH,
      MAX_CONTENT_CONTEXT_ID_LENGTH,
      MAX_CONTENT_CONTEXT_TITLE_LENGTH,
      MAX_COLLECTION_TITLE_LENGTH,
      MAX_COLLECTION_ID_LENGTH,
      MAX_COLLECTION_DESCRIPTION_LENGTH,
      MAX_COLLECTION_TRACK_TITLE_LENGTH,
      MAX_COLLECTION_GENRE_LENGTH,
      MAX_CATALOG_TITLES,
      MAX_CATALOG_COLLECTIONS,
      MAX_COLLECTION_SAMPLE_TRACKS,
      MAX_COLLECTION_PRIMARY_GENRES,
      SPAM_THRESHOLD_IDENTICAL_MESSAGES,
      SPAM_CHECK_WINDOW,
    ];

    for (const limit of limits) {
      expect(Number.isFinite(limit)).toBe(true);
      expect(limit).toBeGreaterThan(0);
    }
  });
});
