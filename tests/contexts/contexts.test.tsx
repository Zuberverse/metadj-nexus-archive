/**
 * Context Provider Integration Tests
 *
 * Tests for all context providers ensuring:
 * - Provider nesting requirements work correctly
 * - Error messages when hooks used outside providers
 * - State updates propagate correctly
 * - Context values are properly memoized
 *
 * These tests verify the foundational state management infrastructure
 * for MetaDJ Nexus.
 */
import { render, screen, act, waitFor, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
// Context imports
import { ModalProvider } from '@/contexts/ModalContext';
import { PlayerProvider, usePlayer } from '@/contexts/PlayerContext';
import { PlaylistProvider, usePlaylist } from '@/contexts/PlaylistContext';
import { QueueProvider, useQueue } from '@/contexts/QueueContext';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import { UIProvider, useUI } from '@/contexts/UIContext';
import type React from 'react';

// Mock announcer to avoid side effects
vi.mock('@/components/accessibility/ScreenReaderAnnouncer', () => ({
  announce: vi.fn(),
}));

// Mock localStorage for storage tests
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock queue persistence
vi.mock('@/lib/queue-persistence', () => ({
  loadQueueState: vi.fn(() => null),
  saveQueueState: vi.fn(),
  clearQueueState: vi.fn(),
}));

// Mock playlist repository
vi.mock('@/lib/playlists/repository', () => ({
  getPlaylists: vi.fn(() => []),
  createPlaylist: vi.fn((name: string) => ({
    id: `playlist-${Date.now()}`,
    name,
    trackIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  duplicatePlaylist: vi.fn(),
  updatePlaylist: vi.fn(),
  deletePlaylist: vi.fn(),
  addTrackToPlaylist: vi.fn(),
  removeTrackFromPlaylist: vi.fn(),
  reorderTracks: vi.fn(),
  findPlaylistById: vi.fn(),
}));

// Mock tracks
vi.mock('@/lib/music', () => ({
  tracks: [],
}));

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
  trackActivationFirstPlaylist: vi.fn(),
}));

/**
 * ToastContext Tests
 */
describe('ToastContext', () => {
  describe('Error Handling', () => {
    it('throws error when useToast is used outside ToastProvider', () => {
      // Suppress console.error for expected error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within ToastProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Provider Functionality', () => {
    it('provides toast functions to children', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      expect(result.current.showToast).toBeDefined();
      expect(result.current.dismissToast).toBeDefined();
      expect(result.current.toasts).toEqual([]);
    });

    it('showToast adds a toast to the list', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast({ message: 'Test toast', variant: 'success' });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Test toast');
      expect(result.current.toasts[0].variant).toBe('success');
    });

    it('dismissToast removes a toast by id', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast({ message: 'Toast 1' });
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
        result.current.dismissToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('supports multiple toasts simultaneously', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast({ message: 'Toast 1' });
        result.current.showToast({ message: 'Toast 2' });
        result.current.showToast({ message: 'Toast 3' });
      });

      expect(result.current.toasts).toHaveLength(3);
    });
  });
});

/**
 * PlayerContext Tests
 */
describe('PlayerContext', () => {
  const createPlayerWrapper = ({ children }: { children: React.ReactNode }) => (
    <ToastProvider>
      <PlayerProvider>{children}</PlayerProvider>
    </ToastProvider>
  );

  describe('Error Handling', () => {
    it('throws error when usePlayer is used outside PlayerProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePlayer());
      }).toThrow('usePlayer must be used within PlayerProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Provider Functionality', () => {
    it('provides initial player state', () => {
      const { result } = renderHook(() => usePlayer(), {
        wrapper: createPlayerWrapper,
      });

      expect(result.current.currentTrack).toBeNull();
      expect(result.current.currentIndex).toBe(-1);
      expect(result.current.shouldPlay).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.volume).toBeGreaterThanOrEqual(0);
      expect(result.current.volume).toBeLessThanOrEqual(1);
      expect(result.current.isMuted).toBe(false);
    });

    it('provides playback control functions', () => {
      const { result } = renderHook(() => usePlayer(), {
        wrapper: createPlayerWrapper,
      });

      expect(result.current.play).toBeDefined();
      expect(result.current.pause).toBeDefined();
      expect(result.current.next).toBeDefined();
      expect(result.current.previous).toBeDefined();
      expect(result.current.seek).toBeDefined();
    });

    it('play() sets shouldPlay to true', () => {
      const { result } = renderHook(() => usePlayer(), {
        wrapper: createPlayerWrapper,
      });

      act(() => {
        result.current.play();
      });

      expect(result.current.shouldPlay).toBe(true);
    });

    it('pause() sets shouldPlay to false', () => {
      const { result } = renderHook(() => usePlayer(), {
        wrapper: createPlayerWrapper,
      });

      act(() => {
        result.current.play();
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.shouldPlay).toBe(false);
    });

    it('setVolume clamps values between 0 and 1', () => {
      const { result } = renderHook(() => usePlayer(), {
        wrapper: createPlayerWrapper,
      });

      act(() => {
        result.current.setVolume(1.5);
      });
      expect(result.current.volume).toBe(1);

      act(() => {
        result.current.setVolume(-0.5);
      });
      expect(result.current.volume).toBe(0);
    });

    it('toggleMute toggles muted state', () => {
      const { result } = renderHook(() => usePlayer(), {
        wrapper: createPlayerWrapper,
      });

      expect(result.current.isMuted).toBe(false);

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(true);

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(false);
    });

    it('setCurrentTrack updates current track', () => {
      const { result } = renderHook(() => usePlayer(), {
        wrapper: createPlayerWrapper,
      });

      const mockTrack = {
        id: 'test-1',
        title: 'Test Track',
        artist: 'Test Artist',
        collection: 'Test Collection',
        duration: 180,
        releaseDate: '2024-01-01',
        audioUrl: '/api/audio/test.mp3',
        genres: ['Electronic'],
      };

      act(() => {
        result.current.setCurrentTrack(mockTrack);
      });

      expect(result.current.currentTrack).toEqual(mockTrack);
    });
  });
});

/**
 * QueueContext Tests
 */
describe('QueueContext', () => {
  const createQueueWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueueProvider>{children}</QueueProvider>
  );

  beforeEach(() => {
    mockLocalStorage.clear();
    sessionStorage.clear();
  });

  describe('Error Handling', () => {
    it('throws error when useQueue is used outside QueueProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useQueue());
      }).toThrow('useQueue must be used within QueueProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Provider Functionality', () => {
    it('provides initial queue state', () => {
      const { result } = renderHook(() => useQueue(), {
        wrapper: createQueueWrapper,
      });

      expect(result.current.queue).toEqual([]);
      expect(result.current.autoQueue).toEqual([]);
      expect(result.current.manualTrackIds).toEqual([]);
      expect(result.current.isShuffleEnabled).toBe(false);
      expect(result.current.repeatMode).toBeDefined();
    });

    it('setQueue updates queue tracks', () => {
      const { result } = renderHook(() => useQueue(), {
        wrapper: createQueueWrapper,
      });

      const mockTracks = [
        { id: 't1', title: 'Track 1', artist: 'Artist', collection: 'Col', duration: 180, releaseDate: '2024-01-01', audioUrl: '/a1.mp3', genres: [] },
        { id: 't2', title: 'Track 2', artist: 'Artist', collection: 'Col', duration: 200, releaseDate: '2024-01-01', audioUrl: '/a2.mp3', genres: [] },
      ];

      act(() => {
        result.current.setQueue(mockTracks);
      });

      expect(result.current.queue).toEqual(mockTracks);
    });

    it('setIsShuffleEnabled updates shuffle state', () => {
      const { result } = renderHook(() => useQueue(), {
        wrapper: createQueueWrapper,
      });

      expect(result.current.isShuffleEnabled).toBe(false);

      act(() => {
        result.current.setIsShuffleEnabled(true);
      });

      expect(result.current.isShuffleEnabled).toBe(true);
    });

    it('setRepeatMode updates repeat mode', () => {
      const { result } = renderHook(() => useQueue(), {
        wrapper: createQueueWrapper,
      });

      act(() => {
        result.current.setRepeatMode('queue');
      });

      expect(result.current.repeatMode).toBe('queue');

      act(() => {
        result.current.setRepeatMode('none');
      });

      expect(result.current.repeatMode).toBe('none');
    });

    it('setQueueContext updates queue context', () => {
      const { result } = renderHook(() => useQueue(), {
        wrapper: createQueueWrapper,
      });

      act(() => {
        result.current.setQueueContext('search');
      });

      expect(result.current.queueContext).toBe('search');
    });

    it('hydrates correctly on mount', async () => {
      const { result } = renderHook(() => useQueue(), {
        wrapper: createQueueWrapper,
      });

      // Wait for hydration
      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });
    });
  });
});

/**
 * UIContext Tests
 */
describe('UIContext', () => {
  const createUIWrapper = ({ children }: { children: React.ReactNode }) => (
    <ModalProvider>
      <UIProvider>{children}</UIProvider>
    </ModalProvider>
  );

  beforeEach(() => {
    mockLocalStorage.clear();
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  describe('Error Handling', () => {
    it('throws error when useUI is used outside UIProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useUI());
      }).toThrow('useUI must be used within UIProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Provider Functionality', () => {
    it('provides initial modal states', async () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      expect(result.current.modals).toBeDefined();
      await waitFor(() => {
        expect(result.current.modals.isWelcomeOpen).toBe(true); // Opens on first-time visit
      });
      expect(result.current.modals.isInfoOpen).toBe(false);
      expect(result.current.modals.isQueueOpen).toBe(false);
      expect(result.current.modals.isMetaDjAiOpen).toBe(false);
    });

    it('auto-opens welcome overlay even after it has been shown (until dismissed)', async () => {
      mockLocalStorage.setItem('metadj-nexus-welcome-shown', 'true');

      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      await waitFor(() => {
        expect(result.current.modals.isWelcomeOpen).toBe(true);
      });
    });

    it('does not auto-open welcome overlay after refresh in the same session', async () => {
      sessionStorage.setItem('metadj_welcome_shown_session', 'true');

      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      await waitFor(() => {
        expect(result.current.modals.isWelcomeOpen).toBe(false);
      });
    });

    it('does not auto-open welcome overlay when dismissed forever', async () => {
      mockLocalStorage.setItem('metadj-nexus-welcome-dismissed', 'true');

      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      await waitFor(() => {
        expect(result.current.modals.isWelcomeOpen).toBe(false);
      });
    });

    it('provides modal toggle functions', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      expect(result.current.setWelcomeOpen).toBeDefined();
      expect(result.current.setInfoOpen).toBeDefined();
      expect(result.current.setQueueOpen).toBeDefined();
      expect(result.current.setMetaDjAiOpen).toBeDefined();
      expect(result.current.setKeyboardShortcutsOpen).toBeDefined();
    });

    it('setWelcomeOpen updates welcome modal state', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      act(() => {
        result.current.setWelcomeOpen(false);
      });

      expect(result.current.modals.isWelcomeOpen).toBe(false);

      act(() => {
        result.current.setWelcomeOpen(true);
      });

      expect(result.current.modals.isWelcomeOpen).toBe(true);
    });

    it('provides search state', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.setSearchQuery).toBeDefined();
      expect(result.current.setSearchResults).toBeDefined();
    });

    it('setSearchQuery updates search query', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });

    it('provides panel state and toggle functions', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      expect(result.current.panels).toBeDefined();
      expect(result.current.panels.left.isOpen).toBe(false); // Default closed
      expect(result.current.toggleLeftPanel).toBeDefined();
      expect(result.current.toggleRightPanel).toBeDefined();
      expect(result.current.openLeftPanel).toBeDefined();
    });

    it('toggleLeftPanel toggles left panel state', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      expect(result.current.panels.left.isOpen).toBe(false);

      act(() => {
        result.current.toggleLeftPanel();
      });

      expect(result.current.panels.left.isOpen).toBe(true);

      act(() => {
        result.current.toggleLeftPanel();
      });

      expect(result.current.panels.left.isOpen).toBe(false);
    });

    it('openLeftPanel opens left panel without toggling', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      // Call openLeftPanel multiple times - should always result in open
      act(() => {
        result.current.openLeftPanel();
      });
      expect(result.current.panels.left.isOpen).toBe(true);

      act(() => {
        result.current.openLeftPanel();
      });
      expect(result.current.panels.left.isOpen).toBe(true);
    });

    it('provides active view state', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      expect(result.current.activeView).toBe('hub');
      expect(result.current.setActiveView).toBeDefined();
    });

    it('setActiveView updates active view', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      act(() => {
        result.current.setActiveView('cinema');
      });

      expect(result.current.activeView).toBe('cinema');
    });

    it('setHeaderHeight updates header height', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createUIWrapper,
      });

      act(() => {
        result.current.setHeaderHeight(80);
      });

      expect(result.current.headerHeight).toBe(80);
    });
  });
});

/**
 * PlaylistContext Tests
 */
describe('PlaylistContext', () => {
  const createPlaylistWrapper = ({ children }: { children: React.ReactNode }) => (
    <ToastProvider>
      <QueueProvider>
        <PlaylistProvider>{children}</PlaylistProvider>
      </QueueProvider>
    </ToastProvider>
  );

  describe('Error Handling', () => {
    it('throws error when usePlaylist is used outside PlaylistProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => usePlaylist());
      }).toThrow('usePlaylist must be used within PlaylistProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Provider Functionality', () => {
    it('provides initial playlist state', () => {
      const { result } = renderHook(() => usePlaylist(), {
        wrapper: createPlaylistWrapper,
      });

      expect(result.current.playlists).toEqual([]);
      expect(result.current.selectedPlaylist).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('provides playlist operations', () => {
      const { result } = renderHook(() => usePlaylist(), {
        wrapper: createPlaylistWrapper,
      });

      expect(result.current.createPlaylist).toBeDefined();
      expect(result.current.duplicatePlaylist).toBeDefined();
      expect(result.current.updatePlaylist).toBeDefined();
      expect(result.current.deletePlaylist).toBeDefined();
      expect(result.current.addTrackToPlaylist).toBeDefined();
      expect(result.current.removeTrackFromPlaylist).toBeDefined();
      expect(result.current.reorderTracks).toBeDefined();
      expect(result.current.playPlaylist).toBeDefined();
      expect(result.current.selectPlaylist).toBeDefined();
      expect(result.current.clearSelection).toBeDefined();
    });

    it('createPlaylist adds a new playlist', async () => {
      const { result } = renderHook(() => usePlaylist(), {
        wrapper: createPlaylistWrapper,
      });

      await act(async () => {
        await result.current.createPlaylist('New Playlist');
      });

      expect(result.current.playlists).toHaveLength(1);
      expect(result.current.playlists[0].name).toBe('New Playlist');
    });

    it('clearSelection clears selected playlist', () => {
      const { result } = renderHook(() => usePlaylist(), {
        wrapper: createPlaylistWrapper,
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedPlaylist).toBeNull();
    });
  });

  describe('Provider Dependencies', () => {
    it('requires ToastProvider as parent', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // PlaylistProvider without ToastProvider should throw
      expect(() => {
        render(
          <QueueProvider>
            <PlaylistProvider>
              <div>Test</div>
            </PlaylistProvider>
          </QueueProvider>
        );
      }).toThrow();

      consoleSpy.mockRestore();
    });

    it('requires QueueProvider as parent', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // PlaylistProvider without QueueProvider should throw
      expect(() => {
        render(
          <ToastProvider>
            <PlaylistProvider>
              <div>Test</div>
            </PlaylistProvider>
          </ToastProvider>
        );
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });
});

/**
 * Context Value Memoization Tests
 */
describe('Context Memoization', () => {
  it('PlayerContext value is memoized correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ToastProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </ToastProvider>
    );

    const { result, rerender } = renderHook(() => usePlayer(), { wrapper });
    const firstValue = result.current;

    rerender();
    const secondValue = result.current;

    // Check that functions are the same reference (memoized)
    expect(firstValue.play).toBe(secondValue.play);
    expect(firstValue.pause).toBe(secondValue.pause);
    expect(firstValue.setVolume).toBe(secondValue.setVolume);
    expect(firstValue.toggleMute).toBe(secondValue.toggleMute);
  });

  it('QueueContext value is memoized correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueueProvider>{children}</QueueProvider>
    );

    const { result, rerender } = renderHook(() => useQueue(), { wrapper });
    const firstValue = result.current;

    rerender();
    const secondValue = result.current;

    // Check that functions are the same reference (memoized)
    expect(firstValue.setQueue).toBe(secondValue.setQueue);
    expect(firstValue.setRepeatMode).toBe(secondValue.setRepeatMode);
    expect(firstValue.setIsShuffleEnabled).toBe(secondValue.setIsShuffleEnabled);
  });

  it('UIContext value is memoized correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>
        <UIProvider>{children}</UIProvider>
      </ModalProvider>
    );

    const { result, rerender } = renderHook(() => useUI(), { wrapper });
    const firstValue = result.current;

    rerender();
    const secondValue = result.current;

    // Check that functions are the same reference (memoized)
    expect(firstValue.setWelcomeOpen).toBe(secondValue.setWelcomeOpen);
    expect(firstValue.setSearchQuery).toBe(secondValue.setSearchQuery);
    expect(firstValue.toggleLeftPanel).toBe(secondValue.toggleLeftPanel);
  });
});

/**
 * Full Provider Nesting Integration Test
 */
describe('Full Provider Stack Integration', () => {
  const FullProviderStack = ({ children }: { children: React.ReactNode }) => (
    <ToastProvider>
      <ModalProvider>
        <UIProvider>
          <QueueProvider>
            <PlayerProvider>
              <PlaylistProvider>{children}</PlaylistProvider>
            </PlayerProvider>
          </QueueProvider>
        </UIProvider>
      </ModalProvider>
    </ToastProvider>
  );

  it('all contexts are accessible when properly nested', () => {
    const TestComponent = () => {
      const toast = useToast();
      const player = usePlayer();
      const queue = useQueue();
      const ui = useUI();
      const playlist = usePlaylist();

      return (
        <div>
          <span data-testid="toast">{toast.toasts.length}</span>
          <span data-testid="player">{String(player.shouldPlay)}</span>
          <span data-testid="queue">{queue.queue.length}</span>
          <span data-testid="ui">{ui.activeView}</span>
          <span data-testid="playlist">{playlist.playlists.length}</span>
        </div>
      );
    };

    render(
      <FullProviderStack>
        <TestComponent />
      </FullProviderStack>
    );

    expect(screen.getByTestId('toast')).toHaveTextContent('0');
    expect(screen.getByTestId('player')).toHaveTextContent('false');
    expect(screen.getByTestId('queue')).toHaveTextContent('0');
    expect(screen.getByTestId('ui')).toHaveTextContent('hub');
    expect(screen.getByTestId('playlist')).toHaveTextContent('0');
  });
});
