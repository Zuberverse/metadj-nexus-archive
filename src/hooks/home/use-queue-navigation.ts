/**
 * @file use-queue-navigation.ts
 * @description Queue navigation and playback control operations.
 * Handles track selection, next/previous, shuffle, repeat, and smart play.
 */

import { useCallback } from "react";
import { trackQueueAction, trackShuffleToggled, trackRepeatModeChanged } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import { buildShuffledQueue } from "@/lib/music/queue-builder";
import { reorderTracksFromAnchor } from "@/lib/music/utils";
import type { CommitQueueFn } from "./use-queue-core";
import type { PlayerContextValue, QueueContextValue, RepeatMode, Track, UIContextValue } from "@/types";

export interface UseQueueNavigationOptions {
  player: PlayerContextValue;
  queue: QueueContextValue;
  ui: UIContextValue;
  collectionTracks: Track[];
  searchResults: Track[];
  allTracks: Track[];
  /** Filtered search results (excluding manual) */
  filteredSearchResults: Track[];
  commitQueue: CommitQueueFn;
}

export interface UseQueueNavigationResult {
  /** Handle click on a track in the collection view */
  handleTrackClick: (track: Track, tracksOverride?: Track[]) => void;
  /** Handle selection of a search result */
  handleSearchResultSelect: (track: Track) => void;
  /** Handle selection of a track in the queue view */
  handleQueueTrackSelect: (trackId: string) => void;
  /** Skip to next track */
  handleNext: () => void;
  /** Go to previous track */
  handlePrevious: () => void;
  /** Toggle queue visibility */
  toggleQueueVisibility: () => void;
  /** Toggle shuffle mode */
  handleShuffleToggle: () => void;
  /** Cycle through repeat modes */
  handleRepeatToggle: () => void;

}

/**
 * Queue navigation and playback control operations.
 *
 * This hook provides:
 * - Track selection handlers for different contexts (collection, search, queue)
 * - Next/previous navigation with repeat mode awareness
 * - Shuffle toggle with queue rebuild
 * - Repeat mode cycling (none → track → queue)
 */
export function useQueueNavigation({
  player,
  queue,
  ui,
  collectionTracks,
  searchResults,
  allTracks,
  filteredSearchResults,
  commitQueue,
}: UseQueueNavigationOptions): UseQueueNavigationResult {
  /**
   * Handle click on a track in the collection view.
   * Toggles playback if same track, otherwise builds new queue from collection.
   * @param track - The track to play
   * @param tracksOverride - Optional tracks array to use instead of collectionTracks (for hub playback race condition fix)
   */
  const handleTrackClick = useCallback(
    (track: Track, tracksOverride?: Track[]) => {
      if (player.currentTrack?.id === track.id) {
        player.setShouldPlay(!player.shouldPlay);
        return;
      }

      // Set queue context to "collection" (not "search")
      // This ensures queue management tracks the current collection view
      queue.setQueueContext("collection");

      // Use tracksOverride if provided (for hub playback and collection view clicks),
      // otherwise fall back to collectionTracks
      const tracksSource = tracksOverride ?? collectionTracks;

      // Build queue from tracks source
      const baseTracks = queue.isShuffleEnabled
        ? buildShuffledQueue(tracksSource, track.id, queue.manualTrackIds)
        : reorderTracksFromAnchor(tracksSource, track.id);

      // Use immediatePlay flag to trigger flushSync for synchronous state updates
      // This ensures audio.play() happens while still in user gesture context (critical for mobile)
      commitQueue(baseTracks, queue.manualTrackIds, {
        anchorTrackId: track.id,
        autoplay: true,
        preserveCurrent: false,
        immediatePlay: true, // Force synchronous state updates for mobile
      });
    },
    [player, queue, collectionTracks, commitQueue]
  );

  /**
   * Handle selection of a search result.
   * Builds queue from search results and switches to search context.
   */
  const handleSearchResultSelect = useCallback(
    (track: Track) => {
      if (searchResults.length === 0) return;

      const baseTracks = queue.isShuffleEnabled
        ? buildShuffledQueue(searchResults, track.id, queue.manualTrackIds)
        : reorderTracksFromAnchor(searchResults, track.id);

      queue.setQueueContext("search");
      commitQueue(baseTracks, queue.manualTrackIds, {
        anchorTrackId: track.id,
        autoplay: true,
        preserveCurrent: false,
        immediatePlay: true, // Force synchronous state updates for mobile
      });
      try {
        trackQueueAction({ action: "add", trackId: track.id, queueSize: baseTracks.length });
      } catch (error) {
        logger.debug('Analytics: trackQueueAction failed', { action: 'add', error: String(error) })
      }
      ui.setQueueOpen(false);
    },
    [searchResults, queue, commitQueue, ui]
  );

  /**
   * Handle selection of a track in the queue view.
   * Toggles playback if same track, otherwise switches to selected track.
   */
  const handleQueueTrackSelect = useCallback(
    (trackId: string) => {
      const nextIndex = queue.queue.findIndex((track) => track.id === trackId);
      if (nextIndex === -1) return;

      const nextTrack = queue.queue[nextIndex];

      // If selecting the same track, toggle play/pause (same as handleTrackClick)
      if (player.currentTrack?.id === trackId) {
        player.setShouldPlay(!player.shouldPlay);
        return;
      }

      // Selecting a different track: switch track and start playback
      player.setCurrentTrack(nextTrack);
      player.setCurrentIndex(nextIndex);
      player.setShouldPlay(true);
    },
    [queue, player]
  );

  /**
   * Skip to the next track in the queue.
   * Respects repeat mode settings.
   * Always continues playback when advancing to next track (for seamless auto-advance).
   */
  const handleNext = useCallback(() => {
    if (queue.queue.length === 0) return;

    const activeIndex = player.currentTrack
      ? queue.queue.findIndex((item) => item.id === player.currentTrack?.id)
      : player.currentIndex;

    const safeIndex = activeIndex >= 0 ? activeIndex : 0;
    const nextIndex = (safeIndex + 1) % queue.queue.length;

    if (nextIndex === 0 && safeIndex === queue.queue.length - 1 && queue.repeatMode === "none") {
      player.setShouldPlay(false);
      return;
    }

    const nextTrack = queue.queue[nextIndex];

    player.setCurrentTrack(nextTrack);
    player.setCurrentIndex(nextIndex);
    // Always continue playback when advancing to next track
    // This handles both manual next clicks and auto-advance when track ends
    player.setShouldPlay(true);
  }, [queue, player]);

  /**
   * Go to the previous track in the queue.
   * Wraps around to the end if at the beginning.
   * Always continues playback when going to previous track.
   */
  const handlePrevious = useCallback(() => {
    if (queue.queue.length === 0) return;

    const activeIndex = player.currentTrack
      ? queue.queue.findIndex((item) => item.id === player.currentTrack?.id)
      : player.currentIndex;

    const safeIndex = activeIndex >= 0 ? activeIndex : 0;
    const previousIndex = safeIndex > 0 ? safeIndex - 1 : queue.queue.length - 1;
    const previousTrack = queue.queue[previousIndex];

    player.setCurrentTrack(previousTrack);
    player.setCurrentIndex(previousIndex);
    // Always continue playback when going to previous track
    player.setShouldPlay(true);
  }, [queue, player]);

  /**
   * Toggle queue visibility modal.
   */
  const toggleQueueVisibility = useCallback(() => {
    ui.setQueueOpen(!ui.modals.isQueueOpen);
  }, [ui]);

  /**
   * Toggle shuffle mode and rebuild queue.
   */
  const handleShuffleToggle = useCallback(() => {
    const nextShuffleState = !queue.isShuffleEnabled;
    queue.setIsShuffleEnabled(nextShuffleState);

    const canonical = queue.queueContext === "search" ? filteredSearchResults : collectionTracks;
    const base = nextShuffleState
      ? buildShuffledQueue(canonical, player.currentTrack?.id, queue.manualTrackIds)
      : canonical;

    commitQueue(base, queue.manualTrackIds, {
      anchorTrackId: player.currentTrack?.id,
      preserveCurrent: true,
      autoplay: player.shouldPlay,
    });

    try {
      trackShuffleToggled(nextShuffleState);
    } catch (error) {
      logger.debug('Analytics: trackShuffleToggled failed', { error: String(error) })
    }
  }, [queue, filteredSearchResults, collectionTracks, player, commitQueue]);

  /**
   * Cycle repeat modes: none → track → queue → none
   */
  const handleRepeatToggle = useCallback(() => {
    const nextMode: RepeatMode =
      queue.repeatMode === "none"
        ? "track"
        : queue.repeatMode === "track"
          ? "queue"
          : "none";
    queue.setRepeatMode(nextMode);

    try {
      trackRepeatModeChanged(nextMode);
    } catch (error) {
      logger.debug('Analytics: trackRepeatModeChanged failed', { error: String(error) })
    }
  }, [queue]);

  return {
    handleTrackClick,
    handleSearchResultSelect,
    handleQueueTrackSelect,
    handleNext,
    handlePrevious,
    toggleQueueVisibility,
    handleShuffleToggle,
    handleRepeatToggle,
  };
}
