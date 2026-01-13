'use client';

/**
 * SearchResultItem Component
 *
 * Memoized search result card for optimized render performance.
 * Displays track information with artwork, metadata, and queue controls.
 */

import { memo, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { clsx } from 'clsx';
import { ListPlus } from 'lucide-react';
import { IconButton, TrackArtwork } from '@/components/ui';
import { getCollectionHoverStyles } from '@/lib/collection-theme';
import type { Track } from '@/types';

export interface SearchResultItemProps {
  /** Track data to display */
  track: Track;
  /** Index position in the search results list */
  index: number;
  /** Whether this track is currently playing */
  isActive: boolean;
  /** Whether this item is currently hovered/focused */
  isHovered: boolean;
  /** Callback when the track is selected for playback */
  onSelect: (track: Track) => void;
  /** Callback when the track is added to queue */
  onQueueAdd: (track: Track) => void;
  /** Callback for keyboard navigation */
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>, index: number, track: Track) => void;
  /** Callback when mouse enters the item */
  onMouseEnter: (index: number) => void;
  /** Callback when mouse leaves the item */
  onMouseLeave: (index: number) => void;
  /** Callback when the play button receives focus */
  onFocus: (index: number) => void;
  /** Callback when the play button loses focus */
  onBlur: (index: number) => void;
  /** Ref callback for keyboard navigation */
  buttonRef: (element: HTMLButtonElement | null) => void;
}

/**
 * SearchResultItem - Memoized search result card
 *
 * Renders a single search result with:
 * - Track artwork with play icon overlay
 * - Title, artist, and genre metadata
 * - Add to queue button
 * - Keyboard navigation support
 * - WCAG 2.1 AA accessibility (ARIA roles, focus management)
 */
export const SearchResultItem = memo(function SearchResultItem({
  track,
  index,
  isActive,
  isHovered,
  onSelect,
  onQueueAdd,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  buttonRef,
}: SearchResultItemProps) {
  const shouldShowPlayIcon = isHovered || isActive;

  return (
    <div
      role="presentation"
      className={clsx(
        "group relative w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-300",
        isActive
          ? "border-purple-500/30 gradient-2-tint shadow-[0_0_20px_rgba(124,58,237,0.1)]"
          : clsx("border-white/10 bg-white/3", getCollectionHoverStyles(track.collection))
      )}
      onMouseEnter={() => onMouseEnter(index)}
      onMouseLeave={() => onMouseLeave(index)}
    >
      <button
        type="button"
        onClick={() => onSelect(track)}
        onKeyDown={(event) => onKeyDown(event, index, track)}
        onFocus={() => onFocus(index)}
        onBlur={() => onBlur(index)}
        ref={buttonRef}
        role="option"
        aria-selected={isActive}
        className="flex-1 text-left focus-ring-glow rounded-lg"
      >
        <div className="flex items-center gap-3">
          <TrackArtwork
            artworkUrl={track.artworkUrl}
            title={track.title}
            sizes="40px"
            className="h-10 w-10 rounded-md border border-white/20 shadow-lg"
            playOverlayVisible={shouldShowPlayIcon}
            playButtonClassName="p-2"
            playIconClassName="h-4 w-4"
          />

          <div className="min-w-0 flex-1">
            <p className={clsx(
              "text-sm font-heading font-medium truncate text-heading-solid transition-opacity",
              isActive ? "opacity-100" : "opacity-85 group-hover:opacity-100"
            )}>
              {track.title}
            </p>
            <div className="mt-1 flex items-center gap-x-2 text-xs text-white/70 overflow-hidden">
              <span className="truncate group-hover:text-white/85">{track.collection}</span>
              {track.genres && track.genres.length > 0 && (
                <>
                  <span className="text-white/60 shrink-0">•</span>
                  <span className="truncate group-hover:text-white/70">{track.genres.slice(0, 2).join(" · ")}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </button>

      <IconButton
        size="sm"
        variant="ghost"
        onClick={(event) => {
          event.stopPropagation();
          onQueueAdd(track);
        }}
        className="min-h-[44px] min-w-[44px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
        aria-label={`Add ${track.title} to queue`}
        icon={<ListPlus className="h-4 w-4" />}
      />
    </div>
  );
});
