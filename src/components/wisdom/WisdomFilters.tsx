"use client"

import { type FC } from "react"
import clsx from "clsx"

interface WisdomFiltersProps {
  topics: string[]
  selectedTopic: string
  onTopicChange: (value: string) => void
}

export const WisdomFilters: FC<WisdomFiltersProps> = ({
  topics,
  selectedTopic,
  onTopicChange,
}) => {
  const topicOptions = ["all", ...topics]

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap gap-2">
        {topicOptions.map((topic) => {
            const isActive = selectedTopic === topic
            return (
              <button
                key={topic}
                type="button"
                onClick={() => onTopicChange(topic)}
                aria-pressed={isActive}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-xs font-heading font-semibold tracking-wide transition",
                  isActive
                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white/80"
                )}
              >
                {topic === "all" ? "All topics" : topic}
              </button>
            )
        })}
      </div>
    </div>
  )
}
