/**
 * use-queue-navigation Hook Tests
 *
 * Tests queue navigation and playback control operations.
 * Covers track selection, next/previous, shuffle, repeat, and smart play.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useQueueNavigation } from '@/hooks/home/use-queue-navigation';
import type { CommitQueueFn } from '@/hooks/home/use-queue-core';
import type { PlayerContextValue, QueueContextValue, UIContextValue, Track } from '@/types';

// ============================================================================
// Mock Dependencies
// ============================================================================

const mockShowToast = vi.fn();

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    toasts: [],
    showToast: mockShowToast,
    dismissToast: vi.fn(),
  }),
}));

vi.mock('@/lib/analytics', () => ({
  trackQueueAction: vi.fn(),
}));



vi.mock('@/lib/music/queue-builder', () => ({
  buildShuffledQueue: vi.fn((tracks, anchorId, manualIds) => {
    // Simple mock: just return tracks in reverse order with anchor first
    if (!anchorId) return [...tracks].reverse();
    const anchor = tracks.find((t: Track) => t.id === anchorId);
    const others = tracks.filter((t: Track) => t.id !== anchorId);
    return anchor ? [anchor, ...others] : tracks;
  }),
}));

vi.mock('@/lib/music/utils', () => ({
  reorderTracksFromAnchor: vi.fn((tracks, anchorId) => {
    const anchorIndex = tracks.findIndex((t: Track) => t.id === anchorId);
    if (anchorIndex === -1) return tracks;
    return [...tracks.slice(anchorIndex), ...tracks.slice(0, anchorIndex)];
  }),
  shuffleTracks: vi.fn((tracks, anchorId) => {
    // Simple mock: Fisher-Yates simulation - reverse for predictable testing
    if (!anchorId) return [...tracks].reverse();
    const anchor = tracks.find((t: Track) => t.id === anchorId);
    const others = tracks.filter((t: Track) => t.id !== anchorId);
    return anchor ? [anchor, ...others.reverse()] : [...tracks].reverse();
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
  bpm: 128,
  key: 'C major',
  ...overrides,
});

const mockTracks: Track[] = [
  createMockTrack('track-1', { title: 'First Track', bpm: 120 }),
  createMockTrack('track-2', { title: 'Second Track', bpm: 125 }),
  createMockTrack('track-3', { title: 'Third Track', bpm: 128 }),
  createMockTrack('track-4', { title: 'Fourth Track', bpm: 130 }),
  createMockTrack('track-5', { title: 'Fifth Track', bpm: 140 }),
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
  leftPanelTab: overrides.leftPanelTab ?? "browse",
  setLeftPanelTab: overrides.setLeftPanelTab ?? vi.fn(),
  viewHydrated: overrides.viewHydrated ?? true,
  wisdomSection: overrides.wisdomSection ?? null,
  setWisdomSection: overrides.setWisdomSection ?? vi.fn(),
  reducedMotion: overrides.reducedMotion ?? false,
});

// ============================================================================
// Tests
// ============================================================================

describe('useQueueNavigation Hook', () => {
  let mockPlayer: PlayerContextValue;
  let mockQueue: QueueContextValue;
  let mockUI: UIContextValue;
  let mockCommitQueue: CommitQueueFn;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlayer = createMockPlayerContext();
    mockQueue = createMockQueueContext({ queue: mockTracks });
    mockUI = createMockUIContext();
    mockCommitQueue = vi.fn();
  });

  describe('handleTrackClick', () => {
    it('toggles playback when clicking same track', () => {
      mockPlayer.currentTrack = mockTracks[0];
      mockPlayer.shouldPlay = true;

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleTrackClick(mockTracks[0]);
      });

      expect(mockPlayer.setShouldPlay).toHaveBeenCalledWith(false);
      expect(mockCommitQueue).not.toHaveBeenCalled();
    });

    it('builds new queue when clicking different track', () => {
      mockPlayer.currentTrack = mockTracks[0];

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleTrackClick(mockTracks[2]);
      });

      expect(mockQueue.setQueueContext).toHaveBeenCalledWith('collection');
      expect(mockCommitQueue).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          anchorTrackId: 'track-3',
          autoplay: true,
          preserveCurrent: false,
          immediatePlay: true,
        })
      );
    });

    it('uses shuffled queue when shuffle is enabled', () => {
      mockQueue.isShuffleEnabled = true;

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleTrackClick(mockTracks[2]);
      });

      expect(mockCommitQueue).toHaveBeenCalled();
    });
  });

  describe('handleSearchResultSelect', () => {
    it('does nothing when search results are empty', () => {
      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleSearchResultSelect(mockTracks[0]);
      });

      expect(mockCommitQueue).not.toHaveBeenCalled();
    });

    it('builds queue from search results', () => {
      const searchResults = mockTracks.slice(0, 3);

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults,
          allTracks: mockTracks,
          filteredSearchResults: searchResults,
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleSearchResultSelect(mockTracks[1]);
      });

      expect(mockQueue.setQueueContext).toHaveBeenCalledWith('search');
      expect(mockCommitQueue).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          anchorTrackId: 'track-2',
          autoplay: true,
          immediatePlay: true,
        })
      );
      expect(mockUI.setQueueOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('handleQueueTrackSelect', () => {
    it('returns early when track not found in queue', () => {
      mockQueue.queue = mockTracks.slice(0, 3);

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleQueueTrackSelect('non-existent-track');
      });

      expect(mockPlayer.setCurrentTrack).not.toHaveBeenCalled();
    });

    it('toggles playback when selecting current track', () => {
      mockPlayer.currentTrack = mockTracks[0];
      mockPlayer.shouldPlay = false;
      mockQueue.queue = mockTracks.slice(0, 3);

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleQueueTrackSelect('track-1');
      });

      expect(mockPlayer.setShouldPlay).toHaveBeenCalledWith(true);
    });

    it('switches to selected track', () => {
      mockPlayer.currentTrack = mockTracks[0];
      mockQueue.queue = mockTracks.slice(0, 3);

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleQueueTrackSelect('track-2');
      });

      expect(mockPlayer.setCurrentTrack).toHaveBeenCalledWith(mockTracks[1]);
      expect(mockPlayer.setCurrentIndex).toHaveBeenCalledWith(1);
      expect(mockPlayer.setShouldPlay).toHaveBeenCalledWith(true);
    });
  });

  describe('handleNext', () => {
    it('does nothing when queue is empty', () => {
      mockQueue.queue = [];

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleNext();
      });

      expect(mockPlayer.setCurrentTrack).not.toHaveBeenCalled();
    });

    it('advances to next track', () => {
      mockPlayer.currentTrack = mockTracks[0];
      mockQueue.queue = mockTracks.slice(0, 3);

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleNext();
      });

      expect(mockPlayer.setCurrentTrack).toHaveBeenCalledWith(mockTracks[1]);
      expect(mockPlayer.setCurrentIndex).toHaveBeenCalledWith(1);
    });

    it('wraps to beginning with queue repeat mode', () => {
      mockPlayer.currentTrack = mockTracks[2];
      mockPlayer.shouldPlay = true;
      mockQueue.queue = mockTracks.slice(0, 3);
      mockQueue.repeatMode = 'queue';

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleNext();
      });

      expect(mockPlayer.setCurrentTrack).toHaveBeenCalledWith(mockTracks[0]);
      expect(mockPlayer.setCurrentIndex).toHaveBeenCalledWith(0);
    });

    it('stops playback at end with no repeat mode', () => {
      mockPlayer.currentTrack = mockTracks[2];
      mockQueue.queue = mockTracks.slice(0, 3);
      mockQueue.repeatMode = 'none';

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleNext();
      });

      expect(mockPlayer.setShouldPlay).toHaveBeenCalledWith(false);
    });

    it('continues playing if already playing', () => {
      mockPlayer.currentTrack = mockTracks[0];
      mockPlayer.shouldPlay = true;
      mockQueue.queue = mockTracks.slice(0, 3);

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleNext();
      });

      expect(mockPlayer.setShouldPlay).toHaveBeenCalledWith(true);
    });
  });

  describe('handlePrevious', () => {
    it('does nothing when queue is empty', () => {
      mockQueue.queue = [];

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handlePrevious();
      });

      expect(mockPlayer.setCurrentTrack).not.toHaveBeenCalled();
    });

    it('goes to previous track', () => {
      mockPlayer.currentTrack = mockTracks[1];
      mockQueue.queue = mockTracks.slice(0, 3);

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handlePrevious();
      });

      expect(mockPlayer.setCurrentTrack).toHaveBeenCalledWith(mockTracks[0]);
      expect(mockPlayer.setCurrentIndex).toHaveBeenCalledWith(0);
    });

    it('wraps to end when at beginning', () => {
      mockPlayer.currentTrack = mockTracks[0];
      mockQueue.queue = mockTracks.slice(0, 3);

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handlePrevious();
      });

      expect(mockPlayer.setCurrentTrack).toHaveBeenCalledWith(mockTracks[2]);
      expect(mockPlayer.setCurrentIndex).toHaveBeenCalledWith(2);
    });
  });

  describe('toggleQueueVisibility', () => {
    it('toggles queue modal open state', () => {
      mockUI.modals.isQueueOpen = false;

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.toggleQueueVisibility();
      });

      expect(mockUI.setQueueOpen).toHaveBeenCalledWith(true);
    });

    it('closes queue modal when open', () => {
      mockUI.modals.isQueueOpen = true;

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.toggleQueueVisibility();
      });

      expect(mockUI.setQueueOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('handleShuffleToggle', () => {
    it('enables shuffle and rebuilds queue', () => {
      mockQueue.isShuffleEnabled = false;
      mockPlayer.currentTrack = mockTracks[0];

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleShuffleToggle();
      });

      expect(mockQueue.setIsShuffleEnabled).toHaveBeenCalledWith(true);
      expect(mockCommitQueue).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({ preserveCurrent: true })
      );
    });

    it('disables shuffle and restores order', () => {
      mockQueue.isShuffleEnabled = true;

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleShuffleToggle();
      });

      expect(mockQueue.setIsShuffleEnabled).toHaveBeenCalledWith(false);
      expect(mockCommitQueue).toHaveBeenCalled();
    });

    it('uses search results when in search context', () => {
      mockQueue.queueContext = 'search';
      const filteredSearchResults = mockTracks.slice(0, 3);

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: filteredSearchResults,
          allTracks: mockTracks,
          filteredSearchResults,
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleShuffleToggle();
      });

      expect(mockCommitQueue).toHaveBeenCalled();
    });
  });

  describe('handleRepeatToggle', () => {
    it('cycles from none to track', () => {
      mockQueue.repeatMode = 'none';

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleRepeatToggle();
      });

      expect(mockQueue.setRepeatMode).toHaveBeenCalledWith('track');
    });

    it('cycles from track to queue', () => {
      mockQueue.repeatMode = 'track';

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleRepeatToggle();
      });

      expect(mockQueue.setRepeatMode).toHaveBeenCalledWith('queue');
    });

    it('cycles from queue to none', () => {
      mockQueue.repeatMode = 'queue';

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleRepeatToggle();
      });

      expect(mockQueue.setRepeatMode).toHaveBeenCalledWith('none');
    });
  });

  describe('Edge Cases', () => {
    it('handles track click with null current track', () => {
      mockPlayer.currentTrack = null;

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleTrackClick(mockTracks[0]);
      });

      expect(mockCommitQueue).toHaveBeenCalled();
    });

    it('handles next with currentIndex fallback', () => {
      mockPlayer.currentTrack = null;
      mockPlayer.currentIndex = 0;
      mockQueue.queue = mockTracks.slice(0, 3);

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleNext();
      });

      expect(mockPlayer.setCurrentTrack).toHaveBeenCalledWith(mockTracks[1]);
    });

    it('handles single track queue navigation', () => {
      mockPlayer.currentTrack = mockTracks[0];
      mockQueue.queue = [mockTracks[0]];
      mockQueue.repeatMode = 'none';

      const { result } = renderHook(() =>
        useQueueNavigation({
          player: mockPlayer,
          queue: mockQueue,
          ui: mockUI,
          collectionTracks: mockTracks,
          searchResults: [],
          allTracks: mockTracks,
          filteredSearchResults: [],
          commitQueue: mockCommitQueue,
        })
      );

      act(() => {
        result.current.handleNext();
      });

      // At end of single track queue with no repeat, should stop
      expect(mockPlayer.setShouldPlay).toHaveBeenCalledWith(false);
    });
  });
});
