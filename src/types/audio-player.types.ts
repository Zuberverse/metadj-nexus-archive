/**
 * Audio Player Types
 *
 * Grouped prop interfaces for the AudioPlayer component.
 * These types organize the prop list into logical nested objects
 * for better maintainability and clarity.
 */

import type { RepeatMode, Track } from './index';

/**
 * Playback control callbacks
 */
export interface PlaybackControls {
  onPlayStateChange?: (playing: boolean) => void;
  onShouldPlayChange?: (shouldPlay: boolean) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

/**
 * Volume control state and callbacks
 */
export interface VolumeControls {
  level?: number;
  isMuted?: boolean;
  onChange?: (volume: number) => void;
  onMuteChange?: (muted: boolean) => void;
}

/**
 * Queue management state and callbacks
 */
export interface QueueControls {
  items?: Track[];
  isShuffleEnabled?: boolean;
  repeatMode?: RepeatMode;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onRemove?: (trackId: string) => void;
  onClear?: () => void;
  onTrackSelect?: (trackId: string) => void;
  onInsert?: (tracks: Track[], index: number) => void;
  onShuffleToggle?: () => void;
  onRepeatToggle?: () => void;
}

/**
 * Search functionality callbacks
 */
export interface SearchControls {
  allTracks?: Track[];
  onTrackSelect?: (track: Track) => void;
  onTrackQueueAdd?: (track: Track) => void;
}

/**
 * MetaDJai chat state and callbacks
 */
export interface MetaDjAiControls {
  isOpen?: boolean;
  onToggle?: () => void;
}

/**
 * Grouped AudioPlayer props interface
 */
export interface AudioPlayerProps {
  track: Track | null;
  shouldPlay?: boolean;
  playback?: PlaybackControls;
  volume?: VolumeControls;
  queue?: QueueControls;
  search?: SearchControls;
  metaDjAi?: MetaDjAiControls;
  collectionLabel?: string;
  className?: string;
}
