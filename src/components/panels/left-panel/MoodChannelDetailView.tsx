'use client'

import { ChevronLeft, Play, Shuffle, Radio } from "lucide-react"
import { getMoodChannelIcon } from "@/components/mood/MoodChannelIcons"
import { TrackListItem } from "@/components/ui"
import { usePlayer } from "@/contexts/PlayerContext"
import { shuffleTracks } from "@/lib/music"
import { cn } from "@/lib/utils"
import type { MoodChannel } from "@/data/moodChannels"
import type { Track } from "@/types"

interface MoodChannelDetailViewProps {
  channel: MoodChannel
  tracks: Track[]
  onBack: () => void
  onTrackPlay: (track: Track, tracks?: Track[]) => void
  onQueueAdd?: (track: Track) => void
}

/**
 * Detail view for a selected mood channel.
 * Displays channel info, description, and filtered track list.
 */
export function MoodChannelDetailView({
  channel,
  tracks,
  onBack,
  onTrackPlay,
  onQueueAdd,
}: MoodChannelDetailViewProps) {
  const player = usePlayer()
  const IconComponent = getMoodChannelIcon(channel.id)

  const handlePlayChannel = () => {
    if (tracks.length === 0) return
    onTrackPlay(tracks[0], tracks)
  }

  const handleShuffleChannel = () => {
    if (tracks.length === 0) return
    const shuffled = shuffleTracks(tracks)
    onTrackPlay(shuffled[0], shuffled)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      {/* Header with back button */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-medium text-white/70 hover:text-white transition flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/5"
        >
          <ChevronLeft className="h-3 w-3" /> Back
        </button>
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <h3 className="text-sm font-heading font-bold text-heading-solid text-center truncate">
            {channel.name}
          </h3>
        </div>
        <div className="w-[60px]" />
      </div>

      {/* Mood Channel Info Card */}
      <div className={cn(
        "rounded-xl border border-white/20 p-3 mb-2 bg-gradient-to-br",
        channel.gradient
      )}>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
            {IconComponent && (
              <IconComponent size={20} className="text-white drop-shadow-lg" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs text-white/80">{channel.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span>{tracks.length} tracks</span>
          <span>-</span>
          <span>Energy {channel.energyLevel}/10</span>
        </div>
      </div>

      {tracks.length > 0 && (
        <div className="flex items-center gap-2 overflow-visible">
          <button
            type="button"
            onClick={handlePlayChannel}
            className="inline-flex items-center gap-1.5 rounded-full gradient-4-soft px-4 py-2 text-xs font-heading font-semibold text-white drop-shadow-[0_0_18px_rgba(95,108,255,0.45)] transition hover:drop-shadow-[0_0_24px_rgba(95,108,255,0.65)] hover:brightness-110"
            aria-label={`Play all tracks in ${channel.name}`}
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            Play
          </button>
          <button
            type="button"
            onClick={handleShuffleChannel}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-heading font-semibold text-white/90 transition hover:bg-white/10 hover:border-white/30"
            aria-label={`Shuffle play ${channel.name}`}
          >
            <Shuffle className="h-3.5 w-3.5" />
            Shuffle
          </button>
        </div>
      )}

      {/* Track List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
        {tracks.map((track) => {
          const isPlaying = player.currentTrack?.id === track.id && player.shouldPlay
          const isCurrent = player.currentTrack?.id === track.id
          return (
            <TrackListItem
              key={track.id}
              track={track}
              isCurrent={isCurrent}
              isPlaying={isPlaying}
              onPlay={() => onTrackPlay(track, tracks)}
              onQueueAdd={onQueueAdd ? () => onQueueAdd(track) : undefined}
              showShare
              useCollectionHover
            />
          )
        })}
        {tracks.length === 0 && (
          <div className="flex flex-col items-center gap-3 text-center px-4 py-12">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center border border-white/15">
              <Radio className="h-6 w-6 text-white/40" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-(--text-muted)">No Tracks Match</p>
              <p className="text-xs text-muted-accessible">Try a different mood channel</p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-white/10 text-(--text-muted) hover:bg-white/15 hover:text-(--text-secondary) border border-white/15 transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Explore Other Moods
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
