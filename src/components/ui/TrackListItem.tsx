'use client';

import { forwardRef, type ReactNode, type KeyboardEvent } from 'react';
import { getCollectionHoverStyles } from '@/lib/collection-theme';
import { cn, formatDuration } from '@/lib/utils';
import { ShareButton } from './ShareButton';
import { TrackArtwork } from './TrackArtwork';
import { TrackOptionsMenu } from './TrackOptionsMenu';
import type { Track } from '@/types';

// ============================================================================
// TrackListItem Component
// ============================================================================
// Reusable track list item for consistent track display across:
// - LeftPanel (mood channel tracks, collection tracks)
// - QueueManager (manual queue, auto queue)
// - PlaylistDetailView, search results, and other track listings
// ============================================================================

export interface TrackListItemProps {
  /** Track data */
  track: Track;
  /** Whether this track is currently playing (shows animated equalizer) */
  isPlaying?: boolean;
  /** Whether this is the current/highlighted track (visual emphasis) */
  isCurrent?: boolean;
  /** Click handler for playing/selecting the track */
  onPlay?: () => void;
  /** Keyboard handler for accessibility (arrow keys, enter, space) */
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void;
  /** Additional actions (buttons) to show on hover/focus - takes precedence over onQueueAdd */
  actions?: ReactNode;
  /** Queue add handler - shows built-in queue button if provided (ignored if actions is set) */
  onQueueAdd?: () => void;
  /** Show share button (appears to left of queue button) */
  showShare?: boolean;
  /** Show duration on the right side */
  showDuration?: boolean;
  /** Show collection name in metadata */
  showCollection?: boolean;
  /** Show track number instead of artwork */
  trackNumber?: number;
  /** Additional class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Whether to show the playing indicator animation */
  showPlayingIndicator?: boolean;
  /** Apply collection-specific hover gradient styles */
  useCollectionHover?: boolean;
  /** ARIA role for accessibility (defaults to button) */
  role?: 'button' | 'option';
  /** Data attribute for queue item identification */
  dataQueueItem?: string;
}

export const TrackListItem = forwardRef<HTMLDivElement, TrackListItemProps>(
  (
    {
      track,
      isPlaying = false,
      isCurrent = false,
      onPlay,
      onKeyDown,
      actions,
      onQueueAdd,
      showShare = false,
      showDuration = false,
      showCollection = false,
      trackNumber,
      className,
      size = 'md',
      showPlayingIndicator = true,
      useCollectionHover = false,
      role = 'button',
      dataQueueItem,
    },
    ref
  ) => {
    const sizeStyles = {
      sm: {
        container: 'px-2 py-1.5 gap-2',
        artwork: 'h-8 w-8 rounded',
        title: 'text-xs',
        artist: 'text-[10px]',
        duration: 'text-[10px]',
        number: 'text-xs',
      },
      md: {
        container: 'px-2 py-2 gap-3',
        artwork: 'h-10 w-10 rounded-lg',
        title: 'text-sm',
        artist: 'text-xs',
        duration: 'text-xs',
        number: 'text-xs',
      },
    };

    const styles = sizeStyles[size];

    // Collection-specific hover styles or default hover
    const hoverStyles = useCollectionHover
      ? getCollectionHoverStyles(track.collection)
      : 'hover:bg-white/8 hover:border-white/20';

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPlay?.();
      }
      if (onKeyDown) {
        onKeyDown(e as unknown as KeyboardEvent<HTMLButtonElement>);
      }
    };

    return (
      <div
        ref={ref}
        role={role}
        tabIndex={0}
        onClick={onPlay}
        onKeyDown={handleKeyDown}
        aria-selected={role === 'option' ? isCurrent : undefined}
        data-queue-item={dataQueueItem}
        className={cn(
          'group relative w-full flex items-center rounded-xl border text-left cursor-pointer',
          'transition-all duration-300 focus-ring',
          'active:scale-[0.98] active:bg-white/12 touch-manipulation',
          isCurrent
            ? 'border-purple-500/30 bg-linear-to-r from-purple-500/10 to-blue-500/10 shadow-[0_0_20px_rgba(124,58,237,0.1)]'
            : cn('border-white/8 bg-white/2', hoverStyles),
          styles.container,
          className
        )}
      >
        {/* Track Number or Artwork */}
        {trackNumber !== undefined ? (
          <span
            // WCAG: text-white/70 for 4.5:1 contrast on track numbers
            className={cn(
              'font-semibold tabular-nums shrink-0',
              styles.number,
              isCurrent ? 'text-white' : 'text-white/70'
            )}
          >
            {trackNumber.toString().padStart(2, '0')}
          </span>
        ) : null}

        {/* Artwork (with playing indicator overlay) */}
        <TrackArtwork
          artworkUrl={track.artworkUrl}
          title={track.title}
          sizes="(max-width: 640px) 32px, 40px"
          className={cn(
            "shadow-lg border border-white/15",
            styles.artwork
          )}
          playButtonClassName="p-1.5"
          playIconClassName="h-3 w-3"
          showPlayingIndicator={showPlayingIndicator}
          isPlaying={isCurrent || isPlaying}
          playingIndicatorSize="md"
          playingOverlayClassName="backdrop-blur-[1px]"
        />

        {/* Track Info */}
        <div className="flex-1 min-w-0 relative z-10">
          <p
            className={cn(
              'truncate font-heading font-medium text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-cyan-300 to-indigo-300',
              styles.title
            )}
          >
            {track.title || 'Untitled Track'}
          </p>
          <div
            className={cn(
              'flex items-center gap-2 truncate',
              styles.artist,
              isCurrent ? 'text-white/80' : 'text-white/70 group-hover:text-white/85'
            )}
          >
            <span className="truncate">{track.collection || 'Unknown Collection'}</span>
            {showDuration && track.duration && (
              <>
                <span className="text-white/60">-</span>
                <span className="tabular-nums shrink-0">
                  {formatDuration(track.duration)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions (shown on hover) */}
        {actions ? (
          <div className="shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            {actions}
          </div>
        ) : (
          <div className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity flex items-center gap-3">
            {showShare && (
              <ShareButton track={track} size="xs" />
            )}
            <TrackOptionsMenu track={track} onQueueAdd={onQueueAdd} />
          </div>
        )}
      </div>
    );
  }
);

TrackListItem.displayName = 'TrackListItem';
