"use client"

import { type FC, useMemo } from "react"
import clsx from "clsx"
import { CheckCircle2, Play, Film, BookOpen, MessageSquare } from "lucide-react"
import { useOnboardingChecklist } from "@/hooks/onboarding/use-onboarding-checklist"
import type { ActiveView, Track } from "@/types"

interface OnboardingChecklistProps {
  heroTrack?: Track | null
  currentTrack?: Track | null
  isPlaying?: boolean
  activeView?: ActiveView
  isMetaDjAiOpen?: boolean
  onPlayTrack: (track: Track) => void
  onOpenCinema: () => void
  onOpenWisdom: () => void
  onOpenMetaDjAi: () => void
  onOpenMusicPanel?: () => void
  className?: string
}

export const OnboardingChecklist: FC<OnboardingChecklistProps> = ({
  heroTrack,
  currentTrack,
  isPlaying,
  activeView,
  isMetaDjAiOpen,
  onPlayTrack,
  onOpenCinema,
  onOpenWisdom,
  onOpenMetaDjAi,
  onOpenMusicPanel,
  className,
}) => {
  const { completed, completedCount, totalCount, isDismissed, dismiss } = useOnboardingChecklist({
    currentTrack,
    isPlaying,
    activeView,
    isMetaDjAiOpen,
  })

  const steps = useMemo(
    () => [
      {
        id: "playedTrack",
        title: "Play a track",
        description: "Start the hero track to set the vibe.",
        actionLabel: heroTrack ? "Play" : "Open music",
        onAction: heroTrack
          ? () => onPlayTrack(heroTrack)
          : () => onOpenMusicPanel?.(),
        icon: Play,
      },
      {
        id: "openedCinema",
        title: "Enter Cinema",
        description: "Launch the visual experience layer.",
        actionLabel: "Open",
        onAction: onOpenCinema,
        icon: Film,
      },
      {
        id: "openedWisdom",
        title: "Open Wisdom",
        description: "Read a thought, guide, or reflection.",
        actionLabel: "Explore",
        onAction: onOpenWisdom,
        icon: BookOpen,
      },
      {
        id: "openedMetaDjAi",
        title: "Chat with MetaDJai",
        description: "Ask for guidance or a quick summary.",
        actionLabel: "Chat",
        onAction: onOpenMetaDjAi,
        icon: MessageSquare,
      },
    ],
    [heroTrack, onPlayTrack, onOpenCinema, onOpenWisdom, onOpenMetaDjAi, onOpenMusicPanel]
  )

  if (isDismissed) return null

  return (
    <section
      className={clsx(
        "rounded-3xl border border-white/10 gradient-3 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl",
        className
      )}
      aria-label="Quick start checklist"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/60">Quick start</p>
          <h3 className="text-lg font-heading font-semibold text-heading-solid">
            Finish the warmup ({completedCount}/{totalCount})
          </h3>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs font-semibold uppercase tracking-wider text-white/50 hover:text-white/80 transition"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {steps.map((step) => {
          const isComplete = completed[step.id as keyof typeof completed]
          const Icon = step.icon
          return (
            <div
              key={step.id}
              className={clsx(
                "flex items-start gap-3 rounded-2xl border px-4 py-3",
                isComplete
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-white/10 bg-white/5"
              )}
            >
              <div
                className={clsx(
                  "mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border",
                  isComplete
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                    : "border-white/10 bg-white/5 text-white/70"
                )}
              >
                {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-heading-solid">{step.title}</p>
                <p className="text-xs text-white/60">{step.description}</p>
              </div>
              {isComplete ? (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                  Done
                </span>
              ) : (
                <button
                  type="button"
                  onClick={step.onAction}
                  className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-100 hover:border-cyan-300/70 hover:bg-cyan-500/20 transition"
                  disabled={!step.onAction}
                >
                  {step.actionLabel}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
