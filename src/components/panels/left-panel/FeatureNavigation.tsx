import clsx from "clsx"
import { Home, MonitorPlay, Sparkles } from "lucide-react"
import type { ActiveView } from "@/types"

interface FeatureNavigationProps {
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
  compact?: boolean
}

export function FeatureNavigation({ activeView, onViewChange, compact = false }: FeatureNavigationProps) {
  const features: Array<{ id: ActiveView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "hub", label: "Hub", icon: Home },
    { id: "cinema", label: "Cinema", icon: MonitorPlay },
    { id: "wisdom", label: "Wisdom", icon: Sparkles },
  ]

  return (
    <div className={`flex ${compact ? "gap-1.5" : "gap-2"} ${compact ? "pt-1 pb-3" : "p-4"}`}>
      {features.map((feature) => {
        const Icon = feature.icon
        const isActive = activeView === feature.id

        return (
          <button
            key={feature.id}
            type="button"
            onClick={() => onViewChange(feature.id)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm font-semibold transition focus-ring border",
              isActive
                ? "border-white/30 bg-linear-to-r from-[#5F6CFF]/60 via-[#38D4FF]/55 to-[#A250FF]/65 shadow-[0_18px_40px_rgba(6,8,28,0.55)] text-white"
                : "border-(--border-standard) text-white/80 bg-white/4 hover:border-(--border-elevated) hover:bg-white/8"
            )}
            aria-pressed={isActive}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline font-heading">{feature.label}</span>
          </button>
        )
      })}
    </div>
  )
}
