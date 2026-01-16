import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioPlayer } from '@/components/player/AudioPlayer';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModalProvider } from '@/contexts/ModalContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { QueueProvider } from '@/contexts/QueueContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { UIProvider } from '@/contexts/UIContext';
import { useAudioPlayback } from '@/hooks/audio/use-audio-playback';
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
import type { Track } from '@/lib/music';
import type React from 'react';

// Mocks
vi.mock('@/hooks/audio/use-audio-playback', () => ({
  useAudioPlayback: vi.fn(),
}));

vi.mock('@/hooks/use-swipe-gesture', () => ({
  useSwipeGesture: vi.fn(),
}));

const mockTrack: Track = {
  id: 'test-001',
  title: 'Test Track',
  artist: 'MetaDJ',
  collection: 'Test Collection',
  duration: 180,
  releaseDate: '2025-01-01',
  audioUrl: '/api/audio/test/track.mp3',
  artworkUrl: '/images/test-art.jpg',
  genres: ['Electronic', 'Ambient'],
};

const defaultPlaybackState = {
  audioRef: { current: null },
  audioSrc: '/test-audio.mp3',
  isPlaying: false,
  currentTime: 0,
  duration: 180,
  isLoading: false,
  playbackBlocked: false,
  hasError: false,
  errorMessage: null,
  retries: 0,
  lastErrorAt: null,
  retryPlayback: vi.fn(),
  togglePlayback: vi.fn(),
  seekTo: vi.fn(),
  trackPlayedRef: { current: false },
  trackCompletedRef: { current: false },
  volume: 1,
  isMuted: false,
  setVolume: vi.fn(),
  setIsMuted: vi.fn(),
  toggleMute: vi.fn(),
  beginSeek: vi.fn(),
  endSeek: vi.fn(),
};

function mockPlayback(overrides: Partial<typeof defaultPlaybackState> = {}) {
  vi.mocked(useAudioPlayback).mockReturnValue({
    ...defaultPlaybackState,
    ...overrides,
  });
}

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <AuthProvider>
      <ToastProvider>
        <ModalProvider>
          <UIProvider>
            <QueueProvider>
              <PlayerProvider>
                {ui}
              </PlayerProvider>
            </QueueProvider>
          </UIProvider>
        </ModalProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

describe('AudioPlayer', () => {
  let mediaSessionStub: { metadata: any; setActionHandler: ReturnType<typeof vi.fn>; playbackState: string };

  beforeEach(() => {
    mockPlayback();
    vi.mocked(useSwipeGesture).mockReset();
    mediaSessionStub = { metadata: null, setActionHandler: vi.fn(), playbackState: 'none' };
    Object.defineProperty(navigator, 'mediaSession', {
      value: mediaSessionStub,
      configurable: true,
    });
    (global as any).MediaMetadata = class {
      constructor(init: Record<string, unknown>) {
        Object.assign(this, init);
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (navigator as any).mediaSession;
    delete (global as any).MediaMetadata;
  });

  it('renders an audio element with the playback source', () => {
    renderWithProviders(<AudioPlayer track={mockTrack} />);

    const audio = document.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio?.getAttribute('src') ?? audio?.getAttribute('data-src') ?? audio?.src).toContain('test-audio.mp3');
  });

  it('shows the playback unlock overlay when playback is blocked and calls retry on tap', async () => {
    const retryPlayback = vi.fn();
    mockPlayback({
      playbackBlocked: true,
      retryPlayback,
    });

    const user = userEvent.setup();
    renderWithProviders(<AudioPlayer track={mockTrack} />);

    expect(screen.getByText('Ready to Play')).toBeInTheDocument();
    expect(screen.getByText(/Test Track by MetaDJ/)).toBeInTheDocument();

    await user.click(screen.getByLabelText('Tap to enable audio playback'));
    expect(retryPlayback).toHaveBeenCalled();
  });

  it('sets Media Session metadata when a track is provided', () => {
    renderWithProviders(<AudioPlayer track={mockTrack} />);

    expect(mediaSessionStub.metadata?.title).toBe('Test Track');
    expect(mediaSessionStub.metadata?.artist).toBe('MetaDJ');
    expect(mediaSessionStub.setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
    expect(mediaSessionStub.setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function));
    expect(mediaSessionStub.setActionHandler).toHaveBeenCalledWith('previoustrack', expect.any(Function));
    expect(mediaSessionStub.setActionHandler).toHaveBeenCalledWith('nexttrack', expect.any(Function));
  });

  it('invokes swipe gesture hook with navigation callbacks', () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();

    renderWithProviders(
      <AudioPlayer
        track={mockTrack}
        playback={{ onNext, onPrevious }}
      />
    );

    expect(vi.mocked(useSwipeGesture)).toHaveBeenCalled();
    const [, options] = vi.mocked(useSwipeGesture).mock.calls[0];
    expect(options).toMatchObject({
      onSwipeLeft: expect.any(Function),
      onSwipeRight: expect.any(Function),
      minSwipeDistance: 50,
      maxCrossAxisDistance: 100,
    });
  });

  it('renders without a track and does not show track UI', () => {
    renderWithProviders(<AudioPlayer track={null} />);

    expect(screen.queryByText('Ready to Play')).not.toBeInTheDocument();
    expect(document.querySelector('audio')).toBeInTheDocument();
  });
});
