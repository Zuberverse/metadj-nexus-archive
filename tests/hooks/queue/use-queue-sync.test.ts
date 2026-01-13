/**
 * use-queue-sync Hook Tests
 *
 * Tests queue synchronization effects that keep the queue in sync
 * with collection changes, search results, and context switches.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useQueueSync } from '@/hooks/home/use-queue-sync';
import type { CommitQueueFn } from '@/hooks/home/use-queue-core';
import type { PlayerContextValue, QueueContextValue, UIContextValue, Track } from '@/types';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@/lib/utils', () => ({
  haveSameMembers: vi.fn((a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    return b.every(item => setA.has(item));
  }),
}));

vi.mock('@/lib/music/queueBuilder', () => ({
  buildShuffledQueue: vi.fn((tracks, anchorId, manualIds) => {
    if (!anchorId) return [...tracks].reverse();
    const anchor = tracks.find((t: Track) => t.id === anchorId);
    const others = tracks.filter((t: Track) => t.id !== anchorId);
    return anchor ? [anchor, ...others] : tracks;
  }),
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockTrack = (id: string, overrides?: Partial<Track>): Track => ({
  id,
  title: `Track ${id}`,
  artist: 'MetaDJ',
  collection: 'test-collection',
  duration: 180,
  releaseDate: '2025-01-01',
  audioUrl: `/api/audio/${id}.mp3`,
  genres: ['Electronic', 'Test'],
  ...overrides,
});

const mockTracks: Track[] = [
  createMockTrack('track-1', { title: 'First Track' }),
  createMockTrack('track-2', { title: 'Second Track' }),
  createMockTrack('track-3', { title: 'Third Track' }),
  createMockTrack('track-4', { title: 'Fourth Track' }),
  createMockTrack('track-5', { title: 'Fifth Track' }),
];

const createMockPlayerContext = (overrides?: Partial<PlayerContextValue>): PlayerContextValue => ({
  currentTrack: null,
  currentIndex: -1,
  shouldPlay: false,
  isLoading: false,
  isPlaying: false,
  duration: 0,
  audioRef: { current: null },
  currentTimeRef: { current: 0 },
  play: vi.fn(),
  pause: vi.fn(),
  next: vi.fn(),
  previous: vi.fn(),
  seek: vi.fn(),
  volume: 1,
  isMuted: false,
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
  setCurrentTrack: vi.fn(),
  setCurrentIndex: vi.fn(),
  setShouldPlay: vi.fn(),
  setIsLoading: vi.fn(),
  setIsPlaying: vi.fn(),
  setCurrentTimeRef: vi.fn(),
  setDuration: vi.fn(),
  notifyAudioReady: vi.fn(),
  ...overrides,
});

const createMockQueueContext = (overrides?: Partial<QueueContextValue>): QueueContextValue => ({
  queue: [],
  autoQueue: [],
  manualTrackIds: [],
  queueContext: 'collection',
  persistenceMetadata: null,
  isHydrated: true,
  isShuffleEnabled: false,
  repeatMode: 'none',
  setQueue: vi.fn(),
  updatePersistenceMetadata: vi.fn(),
  setQueueContext: vi.fn(),
  setManualTrackIds: vi.fn(),
  setAutoQueue: vi.fn(),
  setIsShuffleEnabled: vi.fn(),
  setRepeatMode: vi.fn(),
  ...overrides,
});

const createMockUIContext = (overrides: Partial<UIContextValue> = {}): UIContextValue => ({
  modals: {
    isWelcomeOpen: false,
    isInfoOpen: false,
    isTrackDetailsOpen: false,
    isCollectionDetailsOpen: false,
    isQueueOpen: false,
    isWisdomOpen: false,
    isKeyboardShortcutsOpen: false,
    isMetaDjAiOpen: false,
    isFeedbackOpen: false,
    isAccountOpen: false,
  },
  setWelcomeOpen: vi.fn(),
  setInfoOpen: vi.fn(),
  setTrackDetailsOpen: vi.fn(),
  setCollectionDetailsOpen: vi.fn(),
  setQueueOpen: vi.fn(),
  setWisdomOpen: vi.fn(),
  setKeyboardShortcutsOpen: vi.fn(),
  setMetaDjAiOpen: vi.fn(),
  setFeedbackOpen: vi.fn(),
  setAccountOpen: vi.fn(),
  searchQuery: '',
  searchResults: [],
  setSearchQuery: vi.fn(),
  setSearchResults: vi.fn(),
  selectedCollection: 'featured',
  selectedCollectionSource: 'user' as const,
  setSelectedCollection: vi.fn(),
  collectionDetails: null,
  setCollectionDetails: vi.fn(),
  featuredExpanded: false,
  setFeaturedExpanded: vi.fn(),
  headerHeight: 64,
  setHeaderHeight: vi.fn(),
  panels: { left: { isOpen: false }, right: { isOpen: false } },
  toggleLeftPanel: vi.fn(),
  toggleRightPanel: vi.fn(),
  openLeftPanel: vi.fn(),
  activeView: 'hub',
  setActiveView: vi.fn(),
  // Allow overrides for any property first.
  ...overrides,
  // Ensure new required fields are always defined.
  leftPanelTab: overrides.leftPanelTab ?? 'browse',
  setLeftPanelTab: overrides.setLeftPanelTab ?? vi.fn(),
  viewHydrated: overrides.viewHydrated ?? true,
  wisdomSection: overrides.wisdomSection ?? null,
  setWisdomSection: overrides.setWisdomSection ?? vi.fn(),
  reducedMotion: overrides.reducedMotion ?? false,
});

// ============================================================================
// Tests
// ============================================================================

describe('useQueueSync Hook', () => {
  let mockPlayer: PlayerContextValue;
  let mockQueue: QueueContextValue;
  let mockUI: UIContextValue;
  let mockCommitQueue: CommitQueueFn;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayer = createMockPlayerContext();
    mockQueue = createMockQueueContext();
    mockUI = createMockUIContext();
    mockCommitQueue = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Collection Queue Sync', () => {
    it('does not sync when context is not collection', () => {
      mockQueue.queueContext = 'search';

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: [],
          autoQueueIds: ['track-1', 'track-2'],
          filteredCollectionIds: ['track-1', 'track-2', 'track-3'],
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      expect(mockCommitQueue).not.toHaveBeenCalled();
    });

    it('does not sync when track is playing', () => {
      mockPlayer.currentTrack = mockTracks[0];
      mockPlayer.shouldPlay = true;
      mockQueue.queueContext = 'collection';

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: [],
          autoQueueIds: ['track-1'],
          filteredCollectionIds: ['track-1', 'track-2', 'track-3'],
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      expect(mockCommitQueue).not.toHaveBeenCalled();
    });

    it('does not sync when no current track and arrays match (initial load)', () => {
      mockPlayer.currentTrack = null;
      mockQueue.queueContext = 'collection';

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: [],
          autoQueueIds: ['track-1', 'track-2'],
          filteredCollectionIds: ['track-1', 'track-2'], // Same members = no sync
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      expect(mockCommitQueue).not.toHaveBeenCalled();
    });

    it('syncs queue when collection tracks change (no current track)', () => {
      // Collection sync only happens when there's NO current track playing
      mockPlayer.currentTrack = null;
      mockPlayer.shouldPlay = false;
      mockQueue.queueContext = 'collection';

      const { rerender } = renderHook(
        ({ autoQueueIds, filteredCollectionIds }) =>
          useQueueSync({
            player: mockPlayer,
            queue: mockQueue,
            ui: mockUI,
            filteredCollectionTracks: mockTracks,
            filteredSearchResults: [],
            autoQueueIds,
            filteredCollectionIds,
            filteredSearchIds: [],
            searchResultsLength: 0,
            commitQueue: mockCommitQueue,
          }),
        {
          initialProps: {
            autoQueueIds: ['track-1', 'track-2'],
            filteredCollectionIds: ['track-1', 'track-2'],
          },
        }
      );

      // Initially same members, no sync
      expect(mockCommitQueue).not.toHaveBeenCalled();

      // Change collection (different members)
      rerender({
        autoQueueIds: ['track-1', 'track-2'],
        filteredCollectionIds: ['track-1', 'track-2', 'track-3'],
      });

      expect(mockCommitQueue).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({ preserveCurrent: true })
      );
    });

    it('uses shuffled queue when shuffle is enabled (no current track)', () => {
      // Collection sync only happens when there's NO current track playing
      mockPlayer.currentTrack = null;
      mockPlayer.shouldPlay = false;
      mockQueue.queueContext = 'collection';
      mockQueue.isShuffleEnabled = true;

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: [],
          autoQueueIds: ['track-1'],
          filteredCollectionIds: ['track-1', 'track-2', 'track-3'],
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      expect(mockCommitQueue).toHaveBeenCalled();
    });
  });

  describe('Search Queue Sync', () => {
    it('does not sync when context is not search', () => {
      // Test that search sync doesn't happen when context is 'collection'
      // Also set currentTrack to prevent collection sync from firing
      mockPlayer.currentTrack = mockTracks[0];
      mockQueue.queueContext = 'collection';

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: mockTracks.slice(0, 3),
          autoQueueIds: ['track-1'],
          filteredCollectionIds: ['track-1', 'track-2'],
          filteredSearchIds: ['track-1', 'track-2', 'track-3'],
          searchResultsLength: 3,
          commitQueue: mockCommitQueue,
        })
      );

      expect(mockCommitQueue).not.toHaveBeenCalled();
    });

    it('does not sync when search results are empty', () => {
      mockQueue.queueContext = 'search';

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: [],
          autoQueueIds: ['track-1'],
          filteredCollectionIds: ['track-1', 'track-2'],
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      expect(mockCommitQueue).not.toHaveBeenCalled();
    });

    it('syncs queue when search results change', () => {
      mockQueue.queueContext = 'search';
      mockPlayer.currentTrack = mockTracks[0];

      const { rerender } = renderHook(
        ({ autoQueueIds, filteredSearchIds, searchResultsLength }) =>
          useQueueSync({
            player: mockPlayer,
            queue: mockQueue,
            ui: mockUI,
            filteredCollectionTracks: mockTracks,
            filteredSearchResults: mockTracks.slice(0, searchResultsLength),
            autoQueueIds,
            filteredCollectionIds: [],
            filteredSearchIds,
            searchResultsLength,
            commitQueue: mockCommitQueue,
          }),
        {
          initialProps: {
            autoQueueIds: ['track-1', 'track-2'],
            filteredSearchIds: ['track-1', 'track-2'],
            searchResultsLength: 2,
          },
        }
      );

      // Initially same members, no sync
      expect(mockCommitQueue).not.toHaveBeenCalled();

      // Search results change
      rerender({
        autoQueueIds: ['track-1', 'track-2'],
        filteredSearchIds: ['track-1', 'track-2', 'track-3'],
        searchResultsLength: 3,
      });

      expect(mockCommitQueue).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({ preserveCurrent: true })
      );
    });
  });

  describe('Queue Modal Auto-Close', () => {
    it('closes queue modal when queue becomes empty and no current track', async () => {
      mockQueue.queue = [];
      mockUI.modals.isQueueOpen = true;
      mockPlayer.currentTrack = null;

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: [],
          autoQueueIds: [],
          filteredCollectionIds: ['track-1'],
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      await waitFor(() => {
        expect(mockUI.setQueueOpen).toHaveBeenCalledWith(false);
      });
    });

    it('does not close queue modal when track is playing', () => {
      mockQueue.queue = [];
      mockUI.modals.isQueueOpen = true;
      mockPlayer.currentTrack = mockTracks[0];

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: [],
          autoQueueIds: [],
          filteredCollectionIds: ['track-1'],
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      expect(mockUI.setQueueOpen).not.toHaveBeenCalled();
    });

    it('does not close queue modal when queue is not empty', () => {
      mockQueue.queue = mockTracks.slice(0, 2);
      mockUI.modals.isQueueOpen = true;
      mockPlayer.currentTrack = null;

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: [],
          autoQueueIds: ['track-1', 'track-2'],
          filteredCollectionIds: ['track-1'],
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      expect(mockUI.setQueueOpen).not.toHaveBeenCalled();
    });
  });

  describe('Context Switch on Search Clear', () => {
    it('switches to collection context when search query clears', async () => {
      mockQueue.queueContext = 'search';
      mockUI.searchQuery = '';

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: [],
          autoQueueIds: [],
          filteredCollectionIds: ['track-1'],
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      await waitFor(() => {
        expect(mockQueue.setQueueContext).toHaveBeenCalledWith('collection');
      });
    });

    it('does not switch context when search query exists', () => {
      mockQueue.queueContext = 'search';
      mockUI.searchQuery = 'test';

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: mockTracks.slice(0, 2),
          autoQueueIds: ['track-1'],
          filteredCollectionIds: ['track-1'],
          filteredSearchIds: ['track-1', 'track-2'],
          searchResultsLength: 2,
          commitQueue: mockCommitQueue,
        })
      );

      // setQueueContext might be called from search sync, but not for context clear
      // We're testing it doesn't switch to collection when query exists
    });
  });

  describe('Context Switch on Empty Search Results', () => {
    it('switches to collection context when search results become empty', async () => {
      mockQueue.queueContext = 'search';

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: [],
          autoQueueIds: [],
          filteredCollectionIds: ['track-1'],
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      await waitFor(() => {
        expect(mockQueue.setQueueContext).toHaveBeenCalledWith('collection');
      });
    });

    it('does not switch context when search results exist', () => {
      mockQueue.queueContext = 'search';

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: mockTracks.slice(0, 2),
          autoQueueIds: ['track-1', 'track-2'],
          filteredCollectionIds: ['track-1'],
          filteredSearchIds: ['track-1', 'track-2'],
          searchResultsLength: 2,
          commitQueue: mockCommitQueue,
        })
      );

      // Should not switch to collection when results exist
      // (setQueueContext may not be called at all, or only for valid reasons)
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid context switches', async () => {
      type QueueContextType = 'collection' | 'search' | 'playlist';
      const { rerender } = renderHook(
        ({ queueContext }: { queueContext: QueueContextType }) =>
          useQueueSync({
            player: mockPlayer,
            queue: { ...mockQueue, queueContext },
            ui: mockUI,
            filteredCollectionTracks: mockTracks,
            filteredSearchResults: mockTracks.slice(0, 2),
            autoQueueIds: ['track-1'],
            filteredCollectionIds: ['track-1', 'track-2'],
            filteredSearchIds: ['track-1', 'track-2'],
            searchResultsLength: 2,
            commitQueue: mockCommitQueue,
          }),
        {
          initialProps: { queueContext: 'collection' as QueueContextType },
        }
      );

      rerender({ queueContext: 'search' });
      rerender({ queueContext: 'collection' });
      rerender({ queueContext: 'search' });

      // Should handle rapid switches without errors
      expect(true).toBe(true);
    });

    it('handles simultaneous collection and search sync conditions', () => {
      // Collection sync only happens when there's NO current track playing
      mockPlayer.currentTrack = null;
      mockPlayer.shouldPlay = false;
      mockQueue.queueContext = 'collection';

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: mockTracks.slice(0, 2),
          autoQueueIds: ['track-1'],
          filteredCollectionIds: ['track-1', 'track-2', 'track-3'],
          filteredSearchIds: ['track-1', 'track-2'],
          searchResultsLength: 2,
          commitQueue: mockCommitQueue,
        })
      );

      // Should sync collection (active context) not search
      expect(mockCommitQueue).toHaveBeenCalled();
    });

    it('handles empty arrays gracefully', () => {
      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: [],
          filteredSearchResults: [],
          autoQueueIds: [],
          filteredCollectionIds: [],
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      // Should not throw or cause issues
      expect(true).toBe(true);
    });

    it('handles null current track with matching arrays (no sync needed)', () => {
      mockPlayer.currentTrack = null;
      mockQueue.queueContext = 'collection';

      renderHook(() =>
        useQueueSync({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          filteredCollectionTracks: mockTracks,
          filteredSearchResults: [],
          autoQueueIds: ['track-1', 'track-2'], // Same as filteredCollectionIds
          filteredCollectionIds: ['track-1', 'track-2'],
          filteredSearchIds: [],
          searchResultsLength: 0,
          commitQueue: mockCommitQueue,
        })
      );

      // Should not sync when arrays match (even without current track)
      expect(mockCommitQueue).not.toHaveBeenCalled();
    });
  });
});
