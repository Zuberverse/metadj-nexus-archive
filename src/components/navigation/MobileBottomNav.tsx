"use client"

import { Home, Music, MonitorPlay, Sparkles, MessageCircle, Book, type LucideIcon } from "lucide-react"
import { BrandGradientIcon } from "@/components/icons/BrandGradientIcon"
import type { ActiveView } from "@/types"
import type React from "react"

interface MobileBottomNavProps {
  activeView: ActiveView
  onViewChange: (view: ActiveView) => void
  isMetaDjAiOpen: boolean
  onMetaDjAiToggle: () => void
  isMusicOpen: boolean
  onMusicToggle: () => void
}

/**
 * MobileBottomNav - Fixed bottom navigation bar for mobile devices
 *
 * Provides persistent, always-visible navigation to main features (Hub, Cinema, Wisdom, MetaDJai).
 * Positioned fixed at the bottom of the viewport for instant access without scrolling.
 * Hidden on desktop (md+) where side panels and header toggles are used.
 */
export function MobileBottomNav({
  activeView,
  onViewChange,
  isMetaDjAiOpen,
  onMetaDjAiToggle,
  isMusicOpen,
  onMusicToggle,
}: MobileBottomNavProps) {
  const navItems: Array<{
    id: ActiveView | "metadjai" | "music"
    label: string
    icon: LucideIcon
    isSpecial?: boolean
  }> = [
      { id: "hub", label: "Hub", icon: Home },
      { id: "cinema", label: "Cinema", icon: MonitorPlay },
      { id: "wisdom", label: "Wisdom", icon: Sparkles },
      { id: "journal", label: "Journal", icon: Book },
      { id: "music", label: "Music", icon: Music, isSpecial: true },
      { id: "metadjai", label: "MetaDJai", icon: MessageCircle, isSpecial: true },
    ]

  const handleNavClick = (id: ActiveView | "metadjai" | "music") => {
    // Special overlays should be mutually exclusive.
    if (id === "metadjai") {
      if (isMetaDjAiOpen) {
        onMetaDjAiToggle()
        return
      }
      if (isMusicOpen) {
        onMusicToggle()
      }
      onMetaDjAiToggle()
      return
    }

    if (id === "music") {
      if (isMusicOpen) {
        onMusicToggle()
        return
      }
      if (isMetaDjAiOpen) {
        onMetaDjAiToggle()
      }
      onMusicToggle()
      return
    }

    // Navigating to a primary view closes any open overlays first for clarity.
    if (isMetaDjAiOpen) {
      onMetaDjAiToggle()
    }
    if (isMusicOpen) {
      onMusicToggle()
    }
    onViewChange(id)
  }

  const overlaysOpen = isMetaDjAiOpen || isMusicOpen

  const isActive = (id: ActiveView | "metadjai" | "music") => {
    if (id === "metadjai") return isMetaDjAiOpen
    if (id === "music") return isMusicOpen
    // On mobile, overlays (Music/MetaDJai) act as page views, so hide active state from other views when an overlay is open
    if (overlaysOpen) return false
    return activeView === id
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] safe-area-bottom safe-area-x"
      aria-label="Main navigation"
    >
      {/* Background with glassmorphism */}
      <div className="absolute inset-0 bg-(--bg-surface-base)/95 backdrop-blur-xl" />

      {/* Top border - subtle solid line instead of distracting gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />

      {/* Navigation items - optimized sizing for mobile */}
      <div className="relative flex items-center justify-around px-1 py-1.5 max-w-md mx-auto w-full">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.id)
          const isDimmedViewActive = active && overlaysOpen && !item.isSpecial

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`
                relative flex flex-col items-center justify-center
                min-w-12 min-h-11 px-2.5 py-1.5
                rounded-xl transition-all duration-200
                focus-ring-glow
                touch-manipulation
                ${active
                  ? item.isSpecial
                    ? "bg-white/10 text-white"
                    : isDimmedViewActive
                      ? "bg-white/5 text-white/85"
                      : "bg-white/10 text-white"
                  : "text-muted-accessible hover:text-white/90 hover:bg-white/5 active:bg-white/15 active:scale-[0.96]"
                }
              `}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              {/* Active indicator glow - uses brand gradient */}
              {active && (
                <div className={`absolute inset-0 rounded-xl brand-gradient opacity-20 pointer-events-none ${isDimmedViewActive ? "opacity-10" : ""}`} />
              )}

              {/* Icon with active state - Special items (Music/AI) use BrandGradientIcon when active */}
              <div className="flex items-center justify-center h-5 w-5 mb-0.5 z-10">
                {active && item.isSpecial ? (
                  <BrandGradientIcon icon={Icon} className="h-4.5 w-4.5" />
                ) : (
                  <Icon className={`h-4 w-4 transition-colors duration-200 ${active ? "text-white" : "text-muted-accessible"}`} />
                )}
              </div>

              {/* Label - refined typography for high-density mobile displays */}
              <span className={`
                text-[10px] leading-tight font-heading font-semibold uppercase tracking-[0.2em]
              ${active ? "text-white" : "text-muted-accessible"}
              `}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav >
  )
}
