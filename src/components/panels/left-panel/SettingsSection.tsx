import clsx from "clsx"
import { Repeat, Shuffle } from "lucide-react"
import type { RepeatMode } from "@/types"

interface SettingsSectionProps {
  shuffle: boolean
  repeat: RepeatMode
  onShuffleToggle: () => void
  onRepeatChange: (mode: RepeatMode) => void
}

export function SettingsSection({
  shuffle,
  repeat,
  onShuffleToggle,
  onRepeatChange,
}: SettingsSectionProps) {
  const cycleRepeat = () => {
    const modes: RepeatMode[] = ["none", "track", "queue"]
    const currentIndex = modes.indexOf(repeat)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    onRepeatChange(nextMode)
  }

  return (
    <div className="p-4">
      <div className="relative rounded-2xl border border-(--border-subtle) bg-[rgba(8,10,28,0.72)] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 gradient-media opacity-80" aria-hidden />
        <div className="pointer-events-none absolute inset-0 gradient-media-bloom opacity-45" aria-hidden />
        <div className="relative p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Settings</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shuffle className="h-4 w-4 text-(--text-secondary)" />
                <span className="text-sm text-white">Shuffle</span>
              </div>
              <button
                type="button"
                onClick={onShuffleToggle}
                className={clsx(
                  "w-11 h-6 rounded-full transition focus-ring",
                  shuffle ? "bg-primary" : "bg-white/20"
                )}
                aria-pressed={shuffle}
                aria-label="Toggle shuffle"
              >
                <div
                  className={clsx(
                    "w-5 h-5 rounded-full bg-white transition transform",
                    shuffle ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-(--text-secondary)" />
                <span className="text-sm text-white">Repeat</span>
              </div>
              <button
                type="button"
                onClick={cycleRepeat}
                className="px-3 py-1.5 rounded-lg border border-(--border-standard) text-xs text-white hover:border-(--border-elevated) hover:bg-black/20 transition focus-ring"
                aria-label={`Repeat mode ${repeat}`}
              >
                {repeat === "none" && "Off"}
                {repeat === "track" && "Track"}
                {repeat === "queue" && "Queue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
