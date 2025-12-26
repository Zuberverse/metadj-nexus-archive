"use client"

import { useEffect, useState, useCallback } from "react"
import { MessageCircle, Home as HomeIcon, MonitorPlay, Sparkles, Loader2 } from "lucide-react"
import { BrandGradientIcon } from "@/components/icons/BrandGradientIcon"
import type { ActiveView } from "@/types"
import type { ComponentType } from "react"

interface MobileFeatureRailProps {
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
  isMetaDjAiOpen: boolean
  onMetaDjAiToggle: () => void
  onOpenGuide: () => void
}

/**
 * MobileFeatureRail - Bottom navigation for mobile devices
 *
 * Provides quick access to main features (Hub, Cinema, Wisdom, MetaDJai)
 * with visual indicators for active state and help/shortcuts access.
 */
export function MobileFeatureRail({
  activeView,
  onViewChange,
  isMetaDjAiOpen,
  onMetaDjAiToggle,
  onOpenGuide,
}: MobileFeatureRailProps) {
  const [pendingView, setPendingView] = useState<ActiveView | null>(null)
  const [isMetaDjAiLoading, setIsMetaDjAiLoading] = useState(false)

  const features: Array<{
    id: ActiveView
    label: string
    icon: ComponentType<{ className?: string }>
    description: string
  }> = [
    { id: "hub", label: "Hub", icon: HomeIcon, description: "Home + library" },
    { id: "cinema", label: "Cinema", icon: MonitorPlay, description: "Visual console" },
    { id: "wisdom", label: "Wisdom", icon: Sparkles, description: "Guides + essays" },
  ]

  const handleViewChange = useCallback((view: ActiveView) => {
    if (view === activeView) return
    setPendingView(view)
    onViewChange(view)
  }, [activeView, onViewChange])

  // Clear loading state when navigation completes.
  useEffect(() => {
    if (!pendingView) return
    if (activeView !== pendingView) return
    setPendingView(null)
  }, [activeView, pendingView])

  const handleMetaDjAiToggle = useCallback(() => {
    if (!isMetaDjAiOpen) {
      setIsMetaDjAiLoading(true)
    }
    onMetaDjAiToggle()
  }, [isMetaDjAiOpen, onMetaDjAiToggle])

  // Clear MetaDJai loading once open.
  useEffect(() => {
    if (!isMetaDjAiLoading) return
    if (!isMetaDjAiOpen) return
    setIsMetaDjAiLoading(false)
  }, [isMetaDjAiLoading, isMetaDjAiOpen])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 xl:px-8 pt-3 pb-1 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.7rem] uppercase tracking-[0.26em] text-white/70">Quick switch</p>
        <button
          type="button"
          onClick={onOpenGuide}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 min-h-[44px] text-[0.75rem] font-semibold text-white/80 transition hover:border-white/30 hover:text-white focus-ring"
        >
          <span>Help & shortcuts</span>
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {features.map((feature) => {
          const Icon = feature.icon
          const isActive = activeView === feature.id
          const isLoading = pendingView === feature.id
          return (
            <button
              key={feature.id}
              type="button"
              onClick={() => handleViewChange(feature.id)}
              disabled={isLoading}
              className={`relative overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition focus-ring ${
                isActive
                  ? "border-white/30 bg-linear-to-r from-[#5F6CFF]/60 via-[#38D4FF]/55 to-[#A250FF]/65 shadow-[0_18px_40px_rgba(6,8,28,0.55)]"
                  : "border-white/15 bg-black/35 hover:border-white/25 hover:bg-black/45"
              } ${isLoading ? "cursor-wait" : ""}`}
              aria-pressed={isActive}
              aria-busy={isLoading}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                    isActive ? "border-white/60 bg-white/10" : "border-white/10 bg-white/5"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-heading font-semibold text-white truncate">{feature.label}</p>
                  <p className="text-[0.7rem] text-white/70 truncate">{feature.description}</p>
                </div>
              </div>
            </button>
          )
        })}

        <button
          type="button"
          onClick={handleMetaDjAiToggle}
          disabled={isMetaDjAiLoading}
          className={`relative overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition focus-ring ${
            isMetaDjAiOpen
              ? "border-white/30 bg-linear-to-r from-[#5F6CFF]/60 via-[#38D4FF]/55 to-[#A250FF]/65 shadow-[0_18px_40px_rgba(6,8,28,0.55)]"
              : "border-white/15 bg-black/35 hover:border-white/25 hover:bg-black/45"
          } ${isMetaDjAiLoading ? "cursor-wait" : ""}`}
          aria-pressed={isMetaDjAiOpen}
          aria-busy={isMetaDjAiLoading}
        >
          <div className="flex items-center gap-2">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                isMetaDjAiOpen ? "border-white/60 bg-white/10" : "border-white/10 bg-white/5"
              }`}
            >
	              {isMetaDjAiLoading ? (
	                <Loader2 className="h-4 w-4 text-white animate-spin" />
	              ) : (
	                <BrandGradientIcon icon={MessageCircle} className="h-4 w-4" strokeWidth={2.5} />
	              )}
	            </div>
	            <div className="min-w-0">
	              <p className="text-sm font-heading font-semibold text-white truncate">MetaDJai</p>
	              <p className="text-[0.7rem] text-white/70 truncate">Chat + prompts</p>
	            </div>
	          </div>
	        </button>
	      </div>
	    </div>
  )
}
