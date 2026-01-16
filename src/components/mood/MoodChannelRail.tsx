"use client"

/**
 * Mood Channel Rail
 *
 * A horizontal rail of mood-based listening channels.
 * Each channel curates tracks for a specific mood/activity state.
 */

import { useMemo } from "react"
import { clsx } from "clsx"
import { Play } from "lucide-react"
import { getMoodChannelIcon } from "@/components/mood/MoodChannelIcons"
import { MOOD_CHANNELS, getTracksForMoodChannel, sortTracksByMoodRelevance, getMoodChannelHoverStyles } from "@/data/moodChannels"
import type { Track } from "@/types"

interface MoodChannelRailProps {
  tracks: Track[]
  onPlayChannel: (trackIds: string[], moodChannelId: string) => void
  className?: string
}

export function MoodChannelRail({ tracks, onPlayChannel, className }: MoodChannelRailProps) {
  // Pre-compute track matches for all channels
  const channelTrackMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const channel of MOOD_CHANNELS) {
      const matchingIds = getTracksForMoodChannel(channel, tracks)
      const sortedIds = sortTracksByMoodRelevance(matchingIds, channel, tracks)
      map.set(channel.id, sortedIds)
    }
    return map
  }, [tracks])

  const handleChannelClick = (channelId: string) => {
    const trackIds = channelTrackMap.get(channelId) || []
    if (trackIds.length > 0) {
      onPlayChannel(trackIds, channelId)
    }
  }

  return (
    <section className={clsx("relative", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
            <span className="text-heading-solid">Mood Channels</span>
          </h2>
          <p className="text-xs text-muted-accessible mt-0.5">Curated experiences for every state</p>
        </div>
      </div>

      {/* Channel Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MOOD_CHANNELS.map((channel) => {
          const trackCount = channelTrackMap.get(channel.id)?.length || 0

          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => handleChannelClick(channel.id)}
              disabled={trackCount === 0}
              className={clsx(
                "group relative overflow-hidden rounded-2xl border border-white/20 p-4 text-left transition-all duration-300",
                "bg-black/20 backdrop-blur-2xl shadow-lg",
                "hover:scale-[1.02] hover:border-white/30 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)]",
                getMoodChannelHoverStyles(channel.id),
                "focus-ring-light",
                trackCount === 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Subtle gradient overlay */}
              <div className={clsx("absolute inset-0 bg-gradient-to-br opacity-60 group-hover:opacity-70 transition-opacity", channel.gradient)} />

              <div className="relative z-10 flex flex-col h-full min-h-[120px]">
                {/* Icon and Title */}
                <div className="flex items-start justify-between mb-2">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm shadow-lg">
                    {(() => {
                      const IconComponent = getMoodChannelIcon(channel.id)
                      return IconComponent ? (
                        <IconComponent size={24} className="text-white drop-shadow-lg" />
                      ) : null
                    })()}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-end">
                  <h3 className="text-lg font-heading font-bold text-heading-solid mb-1">
                    {channel.name}
                  </h3>
                  <p className="text-xs text-white/80 leading-relaxed line-clamp-2 mb-2">
                    {channel.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-accessible font-medium">
                      {trackCount} tracks
                    </span>
                    <span className="text-muted-accessible">•</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-accessible font-medium">
                      Energy {channel.energyLevel}/10
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
