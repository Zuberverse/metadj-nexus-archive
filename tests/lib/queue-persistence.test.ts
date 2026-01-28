/**
 * Queue Persistence Tests
 *
 * Tests localStorage queue state persistence including:
 * - Saving queue state
 * - Loading queue state
 * - Handling corrupted data gracefully
 * - TTL/expiration behavior
 * - Empty queue handling
 * - Version mismatch detection
 * - Auto queue derivation
 * - Queue state age calculation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const trackQueueRestoredMock = vi.hoisted(() => vi.fn());
const trackQueueExpiredMock = vi.hoisted(() => vi.fn());

const mockStorage = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    store,
    isStorageAvailable: vi.fn(() => true),
    STORAGE_KEYS: {
      QUEUE_STATE: 'metadj_queue_state',
    },
    getRawValue: vi.fn((key: string) => store.get(key) ?? null),
    setRawValue: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return true;
    }),
    removeValue: vi.fn((key: string) => {
      store.delete(key);
      return true;
    }),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/logger', () => ({
  logger: loggerMock,
}));

vi.mock('@/lib/analytics', () => ({
  trackQueueRestored: trackQueueRestoredMock,
  trackQueueExpired: trackQueueExpiredMock,
}));

vi.mock('@/lib/storage/persistence', () => mockStorage);

// Mock app-version to return a predictable version
vi.mock('@/lib/app-version', () => ({
  APP_VERSION: '0.90',
}));

// Mock app.constants for QUEUE_EXPIRATION_MS
vi.mock('@/lib/app.constants', () => ({
  QUEUE_EXPIRATION_MS: 24 * 60 * 60 * 1000, // 24 hours
}));

// Mock utils functions
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    getAgeInMinutes: vi.fn((timestamp: number) =>
      Math.floor((Date.now() - timestamp) / 60000)
    ),
    getAgeInHours: vi.fn((timestamp: number) =>
      Math.floor((Date.now() - timestamp) / 3600000)
    ),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
}

function createMockTrack(id: string): MockTrack {
  return {
    id,
    title: `Track ${id}`,
    artist: 'MetaDJ',
    duration: 240,
  };
}

function createValidPersistedState(overrides: Record<string, unknown> = {}) {
  return {
    version: '0.90',
    timestamp: Date.now() - 60000, // 1 minute ago
    queue: [createMockTrack('track-1'), createMockTrack('track-2')],
    manualTrackIds: ['track-1'],
    autoQueue: [createMockTrack('track-2')],
    queueContext: 'collection',
    selectedCollection: 'featured',
    searchQuery: undefined,
    currentTrackId: 'track-1',
    currentIndex: 0,
    wasPlaying: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Queue Persistence', () => {
  let saveQueueState: typeof import('@/lib/queue-persistence').saveQueueState;
  let loadQueueState: typeof import('@/lib/queue-persistence').loadQueueState;
  let clearQueueState: typeof import('@/lib/queue-persistence').clearQueueState;
  let getQueueStateAge: typeof import('@/lib/queue-persistence').getQueueStateAge;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockStorage.store.clear();
    mockStorage.isStorageAvailable.mockReturnValue(true);

    vi.resetModules();
    const mod = await import('@/lib/queue-persistence');
    saveQueueState = mod.saveQueueState;
    loadQueueState = mod.loadQueueState;
    clearQueueState = mod.clearQueueState;
    getQueueStateAge = mod.getQueueStateAge;
  });

  afterEach(() => {
    mockStorage.store.clear();
  });

  describe('saveQueueState', () => {
    it('saves queue state to storage', () => {
      const tracks = [createMockTrack('t1'), createMockTrack('t2')] as any[];

      saveQueueState(tracks, ['t1'], 'collection' as any, 'featured');

      expect(mockStorage.setRawValue).toHaveBeenCalledWith(
        'metadj_queue_state',
        expect.any(String)
      );

      const savedData = JSON.parse(
        mockStorage.setRawValue.mock.calls[0][1]
      );
      expect(savedData.queue).toHaveLength(2);
      expect(savedData.manualTrackIds).toEqual(['t1']);
      expect(savedData.queueContext).toBe('collection');
      expect(savedData.selectedCollection).toBe('featured');
      expect(savedData.version).toBe('0.90');
      expect(savedData.timestamp).toBeGreaterThan(0);
    });

    it('derives autoQueue from queue when not provided', () => {
      const tracks = [
        createMockTrack('manual-1'),
        createMockTrack('auto-1'),
        createMockTrack('auto-2'),
      ] as any[];

      saveQueueState(tracks, ['manual-1'], 'collection' as any);

      const savedData = JSON.parse(
        mockStorage.setRawValue.mock.calls[0][1]
      );
      expect(savedData.autoQueue).toHaveLength(2);
      expect(savedData.autoQueue[0].id).toBe('auto-1');
      expect(savedData.autoQueue[1].id).toBe('auto-2');
    });

    it('uses provided autoQueue when available', () => {
      const tracks = [createMockTrack('t1'), createMockTrack('t2')] as any[];
      const autoQueue = [createMockTrack('auto-only')] as any[];

      saveQueueState(
        tracks,
        ['t1'],
        'collection' as any,
        undefined,
        undefined,
        undefined,
        undefined,
        autoQueue
      );

      const savedData = JSON.parse(
        mockStorage.setRawValue.mock.calls[0][1]
      );
      expect(savedData.autoQueue).toHaveLength(1);
      expect(savedData.autoQueue[0].id).toBe('auto-only');
    });

    it('saves wasPlaying flag', () => {
      saveQueueState(
        [createMockTrack('t1')] as any[],
        [],
        'collection' as any,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true
      );

      const savedData = JSON.parse(
        mockStorage.setRawValue.mock.calls[0][1]
      );
      expect(savedData.wasPlaying).toBe(true);
    });

    it('defaults wasPlaying to false when not provided', () => {
      saveQueueState(
        [createMockTrack('t1')] as any[],
        [],
        'collection' as any
      );

      const savedData = JSON.parse(
        mockStorage.setRawValue.mock.calls[0][1]
      );
      expect(savedData.wasPlaying).toBe(false);
    });

    it('does not throw when storage is unavailable', () => {
      mockStorage.isStorageAvailable.mockReturnValue(false);

      expect(() => {
        saveQueueState([], [], 'collection' as any);
      }).not.toThrow();

      expect(mockStorage.setRawValue).not.toHaveBeenCalled();
    });

    it('logs warning when storage is unavailable', () => {
      mockStorage.isStorageAvailable.mockReturnValue(false);

      saveQueueState([], [], 'collection' as any);

      expect(loggerMock.warn).toHaveBeenCalled();
    });
  });

  describe('loadQueueState', () => {
    it('returns valid persisted state', () => {
      const state = createValidPersistedState();
      mockStorage.store.set('metadj_queue_state', JSON.stringify(state));

      const result = loadQueueState();

      expect(result).not.toBeNull();
      expect(result!.queue).toHaveLength(2);
      expect(result!.manualTrackIds).toEqual(['track-1']);
      expect(result!.queueContext).toBe('collection');
    });

    it('returns null when no state is saved', () => {
      const result = loadQueueState();

      expect(result).toBeNull();
    });

    it('returns null when storage is unavailable', () => {
      mockStorage.isStorageAvailable.mockReturnValue(false);

      const result = loadQueueState();

      expect(result).toBeNull();
    });

    it('returns null and clears state for corrupted JSON', () => {
      mockStorage.store.set('metadj_queue_state', 'not-valid-json{{{');

      const result = loadQueueState();

      expect(result).toBeNull();
      expect(mockStorage.removeValue).toHaveBeenCalledWith('metadj_queue_state');
      expect(loggerMock.error).toHaveBeenCalled();
    });

    it('returns null and clears state for invalid structure (missing queue array)', () => {
      const invalid = { version: '0.90', timestamp: Date.now() };
      mockStorage.store.set('metadj_queue_state', JSON.stringify(invalid));

      const result = loadQueueState();

      expect(result).toBeNull();
      expect(loggerMock.warn).toHaveBeenCalled();
    });

    it('returns null and clears state for missing version', () => {
      const invalid = { timestamp: Date.now(), queue: [] };
      mockStorage.store.set('metadj_queue_state', JSON.stringify(invalid));

      const result = loadQueueState();

      expect(result).toBeNull();
    });

    it('returns null and clears state for missing timestamp', () => {
      const invalid = { version: '0.90', queue: [] };
      mockStorage.store.set('metadj_queue_state', JSON.stringify(invalid));

      const result = loadQueueState();

      expect(result).toBeNull();
    });

    it('returns null on version mismatch and tracks expiration', () => {
      const state = createValidPersistedState({ version: '0.50' });
      mockStorage.store.set('metadj_queue_state', JSON.stringify(state));

      const result = loadQueueState();

      expect(result).toBeNull();
      expect(mockStorage.removeValue).toHaveBeenCalledWith('metadj_queue_state');
      expect(trackQueueExpiredMock).toHaveBeenCalledWith({ reason: 'version_mismatch' });
    });

    it('returns null on TTL expiration (>24 hours old)', () => {
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const state = createValidPersistedState({ timestamp: expiredTimestamp });
      mockStorage.store.set('metadj_queue_state', JSON.stringify(state));

      const result = loadQueueState();

      expect(result).toBeNull();
      expect(mockStorage.removeValue).toHaveBeenCalledWith('metadj_queue_state');
      expect(trackQueueExpiredMock).toHaveBeenCalledWith({ reason: 'time_expired' });
    });

    it('returns state when within TTL (<24 hours)', () => {
      const recentTimestamp = Date.now() - (23 * 60 * 60 * 1000); // 23 hours ago
      const state = createValidPersistedState({ timestamp: recentTimestamp });
      mockStorage.store.set('metadj_queue_state', JSON.stringify(state));

      const result = loadQueueState();

      expect(result).not.toBeNull();
    });

    it('derives autoQueue when missing from saved state', () => {
      const state = createValidPersistedState();
      delete (state as any).autoQueue;
      mockStorage.store.set('metadj_queue_state', JSON.stringify(state));

      const result = loadQueueState();

      expect(result).not.toBeNull();
      expect(Array.isArray(result!.autoQueue)).toBe(true);
      // autoQueue should contain tracks NOT in manualTrackIds
      expect(result!.autoQueue!.every(
        (t: any) => !result!.manualTrackIds.includes(t.id)
      )).toBe(true);
    });

    it('tracks queue restoration analytics', () => {
      const state = createValidPersistedState();
      mockStorage.store.set('metadj_queue_state', JSON.stringify(state));

      loadQueueState();

      expect(trackQueueRestoredMock).toHaveBeenCalledWith(
        expect.objectContaining({
          queueSize: 2,
          context: 'collection',
        })
      );
    });

    it('handles analytics failures gracefully', () => {
      trackQueueRestoredMock.mockImplementation(() => {
        throw new Error('Analytics unavailable');
      });

      const state = createValidPersistedState();
      mockStorage.store.set('metadj_queue_state', JSON.stringify(state));

      // Should not throw
      const result = loadQueueState();
      expect(result).not.toBeNull();
    });

    it('handles expiration analytics failures gracefully', () => {
      trackQueueExpiredMock.mockImplementation(() => {
        throw new Error('Analytics unavailable');
      });

      const state = createValidPersistedState({ version: '0.50' });
      mockStorage.store.set('metadj_queue_state', JSON.stringify(state));

      // Should not throw even though analytics fails
      const result = loadQueueState();
      expect(result).toBeNull();
    });
  });

  describe('clearQueueState', () => {
    it('removes queue state from storage', () => {
      mockStorage.store.set('metadj_queue_state', 'some-data');

      clearQueueState();

      expect(mockStorage.removeValue).toHaveBeenCalledWith('metadj_queue_state');
    });

    it('does nothing when storage is unavailable', () => {
      mockStorage.isStorageAvailable.mockReturnValue(false);

      clearQueueState();

      expect(mockStorage.removeValue).not.toHaveBeenCalled();
    });
  });

  describe('getQueueStateAge', () => {
    it('returns age in minutes for valid state', () => {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const state = createValidPersistedState({ timestamp: fiveMinutesAgo });
      mockStorage.store.set('metadj_queue_state', JSON.stringify(state));

      const age = getQueueStateAge();

      expect(age).not.toBeNull();
      expect(age).toBeGreaterThanOrEqual(4); // Allow 1 min tolerance
      expect(age).toBeLessThanOrEqual(6);
    });

    it('returns null when no state exists', () => {
      const age = getQueueStateAge();

      expect(age).toBeNull();
    });

    it('returns null when storage is unavailable', () => {
      mockStorage.isStorageAvailable.mockReturnValue(false);

      const age = getQueueStateAge();

      expect(age).toBeNull();
    });

    it('returns null when stored data is corrupted', () => {
      mockStorage.store.set('metadj_queue_state', 'not-json');

      const age = getQueueStateAge();

      expect(age).toBeNull();
    });

    it('returns null when timestamp is missing', () => {
      mockStorage.store.set('metadj_queue_state', JSON.stringify({ version: '0.90' }));

      const age = getQueueStateAge();

      expect(age).toBeNull();
    });
  });

  describe('empty queue handling', () => {
    it('saves empty queue without error', () => {
      saveQueueState([], [], 'collection' as any);

      expect(mockStorage.setRawValue).toHaveBeenCalled();
      const savedData = JSON.parse(
        mockStorage.setRawValue.mock.calls[0][1]
      );
      expect(savedData.queue).toEqual([]);
      expect(savedData.manualTrackIds).toEqual([]);
    });

    it('loads empty queue correctly', () => {
      const state = createValidPersistedState({
        queue: [],
        manualTrackIds: [],
        autoQueue: [],
      });
      mockStorage.store.set('metadj_queue_state', JSON.stringify(state));

      const result = loadQueueState();

      expect(result).not.toBeNull();
      expect(result!.queue).toEqual([]);
    });
  });

  describe('round-trip save/load', () => {
    it('preserves all fields through save and load', () => {
      const tracks = [
        createMockTrack('rt-1'),
        createMockTrack('rt-2'),
        createMockTrack('rt-3'),
      ] as any[];

      saveQueueState(
        tracks,
        ['rt-1'],
        'search' as any,
        'featured',
        'ambient',
        'rt-2',
        1,
        [createMockTrack('rt-2'), createMockTrack('rt-3')] as any[],
        true
      );

      const result = loadQueueState();

      expect(result).not.toBeNull();
      expect(result!.queue).toHaveLength(3);
      expect(result!.manualTrackIds).toEqual(['rt-1']);
      expect(result!.queueContext).toBe('search');
      expect(result!.selectedCollection).toBe('featured');
      expect(result!.searchQuery).toBe('ambient');
      expect(result!.currentTrackId).toBe('rt-2');
      expect(result!.currentIndex).toBe(1);
      expect(result!.autoQueue).toHaveLength(2);
      expect(result!.wasPlaying).toBe(true);
    });
  });
});
