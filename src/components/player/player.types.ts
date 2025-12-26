/**
 * Shared types for AudioPlayer sub-components
 */

import type { Track, RepeatMode } from "@/types"

/**
 * Props for PlaybackControls component
 */
export interface PlaybackControlsProps {
  track: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  isShuffleEnabled?: boolean;
  repeatMode?: RepeatMode;
  onPlay: () => void;
  onPause: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onShuffleToggle?: () => void;
  onRepeatToggle?: () => void;
  hasQueue?: boolean;
  overallLevel?: number;
  className?: string;
}

/**
 * Props for ProgressBar component
 */
export interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek?: (percent: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Props for VolumeControl component
 */
export interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  className?: string;
}

/**
 * Audio playback state returned by useAudioPlayback hook
 */
export interface AudioPlaybackState {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  volume: number;
  isMuted: boolean;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  togglePlayback: () => void;
  seekTo: (percent: number) => void;
}
