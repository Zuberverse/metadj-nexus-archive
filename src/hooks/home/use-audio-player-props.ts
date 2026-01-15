/**
 * useAudioPlayerProps Hook
 *
 * Extracts and memoizes the complex audio player props configuration
 * from HomePageClient to improve maintainability and reduce component size.
 *
 * Returns props in grouped format for cleaner organization.
 */

import { useMemo } from "react"
import type { JournalSearchEntry, WisdomSearchEntry } from "@/lib/search/search-results"
import type { Track, RepeatMode, AudioPlayerProps } from "@/types"

interface UseAudioPlayerPropsParams {
  // Player state
  currentTrack: Track | null
  shouldPlay: boolean
  setShouldPlay: (value: boolean) => void
  volume: number
  setVolume: (value: number) => void
  isMuted: boolean
  toggleMute: () => void

  // Queue state
  queue: Track[]
  isShuffleEnabled: boolean
  repeatMode: RepeatMode
  allTracks: Track[]

  // Queue handlers
  handleNext: () => void
  handlePrevious: () => void
  handleShuffleToggle: () => void
  handleRepeatToggle: () => void
  handleQueueReorder: (fromIndex: number, toIndex: number) => void
  handleQueueRemove: (trackId: string) => void
  handleQueueClear: () => void
  handleQueueTrackSelect: (trackId: string) => void
  handleSearchTrackSelect: (track: Track) => void
  handleSearchTrackQueueAdd: (track: Track) => void
  handleSearchWisdomSelect: (entry: WisdomSearchEntry) => void
  handleSearchJournalSelect: (entry: JournalSearchEntry) => void

  // UI state
  isMetaDjAiOpen: boolean
  selectedCollectionTitle: string

  // Cinema state (used for z-index class)
  cinemaEnabled: boolean

  // Feature handlers
  handleMetaDjAiToggle: () => void
  
  /** Called when play is pressed but no track is loaded - load default track */
  handlePlayWithNoTrack: () => void
}

/**
 * Returns memoized AudioPlayer props in grouped format
 * Organizes props into logical groups: playback, volume, queue, search, metaDjAi
 */
export function useAudioPlayerProps({
  currentTrack,
  shouldPlay,
  setShouldPlay,
  volume,
  setVolume,
  isMuted,
  toggleMute,
  queue,
  isShuffleEnabled,
  repeatMode,
  allTracks,
  handleNext,
  handlePrevious,
  handleShuffleToggle,
  handleRepeatToggle,
  handleQueueReorder,
  handleQueueRemove,
  handleQueueClear,
  handleQueueTrackSelect,
  handleSearchTrackSelect,
  handleSearchTrackQueueAdd,
  handleSearchWisdomSelect,
  handleSearchJournalSelect,
  isMetaDjAiOpen,
  selectedCollectionTitle,
  cinemaEnabled,
  handleMetaDjAiToggle,
  handlePlayWithNoTrack,
}: UseAudioPlayerPropsParams): AudioPlayerProps {
  return useMemo(
    () => ({
      track: currentTrack,
      shouldPlay,
      playback: {
        onPlayStateChange: setShouldPlay,
        onShouldPlayChange: setShouldPlay,
        onNext: queue.length > 1 ? handleNext : undefined,
        onPrevious: queue.length > 1 ? handlePrevious : undefined,
        onPlayWithNoTrack: handlePlayWithNoTrack,
      },
      volume: {
        level: volume,
        isMuted,
        onChange: setVolume,
        onMuteChange: toggleMute,
      },
      queue: {
        items: queue,
        isShuffleEnabled,
        repeatMode,
        onReorder: queue.length > 1 ? handleQueueReorder : undefined,
        onRemove: queue.length > 0 ? handleQueueRemove : undefined,
        onClear: queue.length > 0 ? handleQueueClear : undefined,
        onTrackSelect: handleQueueTrackSelect,
        onShuffleToggle: queue.length > 0 ? handleShuffleToggle : undefined,
        onRepeatToggle: handleRepeatToggle,

      },
      search: {
        allTracks,
        onTrackSelect: handleSearchTrackSelect,
        onTrackQueueAdd: handleSearchTrackQueueAdd,
        onWisdomSelect: handleSearchWisdomSelect,
        onJournalSelect: handleSearchJournalSelect,
      },
      metaDjAi: {
        isOpen: isMetaDjAiOpen,
        onToggle: handleMetaDjAiToggle,
      },
      collectionLabel: selectedCollectionTitle,
      className: cinemaEnabled ? "z-90!" : "",
    }),
    [
      currentTrack,
      shouldPlay,
      setShouldPlay,
      volume,
      setVolume,
      isMuted,
      toggleMute,
      queue,
      isShuffleEnabled,
      repeatMode,
      allTracks,
      handleNext,
      handlePrevious,
      handleShuffleToggle,
      handleRepeatToggle,
      handleQueueReorder,
      handleQueueRemove,
      handleQueueClear,
      handleQueueTrackSelect,
      handleSearchTrackSelect,
      handleSearchTrackQueueAdd,
      handleSearchWisdomSelect,
      handleSearchJournalSelect,
      isMetaDjAiOpen,
      selectedCollectionTitle,
      cinemaEnabled,
      handleMetaDjAiToggle,
      handlePlayWithNoTrack,
    ]
  )
}
