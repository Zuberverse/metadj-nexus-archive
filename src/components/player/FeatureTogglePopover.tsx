"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import MessageCircle from "lucide-react/dist/esm/icons/message-circle"
import MonitorPlay from "lucide-react/dist/esm/icons/monitor-play"
import Music from "lucide-react/dist/esm/icons/music"
import Sparkles from "lucide-react/dist/esm/icons/sparkles"
import { useClickAway, useEscapeKey } from "@/hooks"

interface FeatureTogglePopoverProps {
  cinemaEnabled: boolean
  cosmosEnabled: boolean
  isMetaDjAiOpen: boolean
  onCinemaToggle?: () => void
  onCosmosToggle?: () => void
  onMetaDjAiToggle?: () => void
}

export function FeatureTogglePopover({
  cinemaEnabled,
  cosmosEnabled,
  isMetaDjAiOpen,
  onCinemaToggle,
  onCosmosToggle,
  onMetaDjAiToggle,
}: FeatureTogglePopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Determine which feature is currently active
  const getActiveFeature = () => {
    if (isMetaDjAiOpen) return "metadjai"
    if (cosmosEnabled) return "wisdom"
    if (cinemaEnabled) return "cinema"
    return "music"
  }

  const activeFeature = getActiveFeature()

  // Get icon for the currently active feature
  const getActiveIcon = () => {
    switch (activeFeature) {
      case "metadjai":
        return <MessageCircle className="h-4 w-4" />
      case "wisdom":
        return <Sparkles className="h-4 w-4" />
      case "cinema":
        return <MonitorPlay className="h-4 w-4" />
      default:
        return <Music className="h-4 w-4" />
    }
  }

  // Get inactive features (those not currently active)
  const getInactiveFeatures = () => {
    const features = []

    // MetaDJai
    if (activeFeature !== "metadjai" && onMetaDjAiToggle) {
      features.push({
        id: "metadjai",
        label: "MetaDJai",
        icon: <MessageCircle className="h-4 w-4" />,
        onClick: () => {
          onMetaDjAiToggle()
          setIsOpen(false)
        },
      })
    }

    // Music (base view)
    if (activeFeature !== "music") {
      features.push({
        id: "music",
        label: "Music",
        icon: <Music className="h-4 w-4" />,
        onClick: () => {
          // Close all features to return to music view
          if (cinemaEnabled && onCinemaToggle) onCinemaToggle()
          if (cosmosEnabled && onCosmosToggle) onCosmosToggle()
          if (isMetaDjAiOpen && onMetaDjAiToggle) onMetaDjAiToggle()
          setIsOpen(false)
        },
      })
    }

    // Wisdom
    if (activeFeature !== "wisdom" && onCosmosToggle) {
      features.push({
        id: "wisdom",
        label: "Wisdom",
        icon: <Sparkles className="h-4 w-4" />,
        onClick: () => {
          onCosmosToggle()
          setIsOpen(false)
        },
      })
    }

    // Cinema
    if (activeFeature !== "cinema" && onCinemaToggle) {
      features.push({
        id: "cinema",
        label: "Cinema",
        icon: <MonitorPlay className="h-4 w-4" />,
        onClick: () => {
          onCinemaToggle()
          setIsOpen(false)
        },
      })
    }

    return features
  }

  const inactiveFeatures = getInactiveFeatures()

  // Check if component is mounted (SSR guard)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useClickAway([popoverRef, buttonRef], () => setIsOpen(false), { enabled: isOpen });
  useEscapeKey(() => setIsOpen(false), { enabled: isOpen });

  const baseButtonClasses =
    "inline-flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full border border-white/20 transition focus-ring touch-manipulation"

  const getStateClasses = (isActive: boolean) =>
    isActive
      ? "toolbar-accent text-white shadow-[0_20px_42px_rgba(12,10,32,0.55)] border border-primary/45"
      : "text-white/80 hover:bg-white/10 hover:border-white/30 hover:text-white"

  // Calculate popover position for portal rendering
  const getPopoverStyle = () => {
    if (!buttonRef.current) return {}

    const rect = buttonRef.current.getBoundingClientRect()
    const popoverHeight = 200 // Approximate height of the popover
    const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0')

    // Calculate position relative to viewport
    // Position above the button with proper spacing
    const bottomPosition = window.innerHeight - rect.top + 8
    const leftPosition = rect.left + (rect.width / 2) - 70 // Center align (140px width / 2)

    // Ensure popover stays within viewport bounds
    const adjustedLeft = Math.max(8, Math.min(leftPosition, window.innerWidth - 148))
    const adjustedBottom = Math.max(safeAreaBottom + 8, bottomPosition)

    return {
      position: 'fixed' as const,
      bottom: `${adjustedBottom}px`,
      left: `${adjustedLeft}px`,
      zIndex: 9999,
    }
  }

  // Render popover via portal to avoid clipping
  const popoverContent = isOpen && inactiveFeatures.length > 0 && isMounted ? (
    <div
      ref={popoverRef}
      className="animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={getPopoverStyle()}
    >
      <div className="min-w-[140px] overflow-hidden rounded-2xl border border-white/20 bg-[rgba(6,8,28,0.95)] backdrop-blur-xl shadow-[0_20px_42px_rgba(12,10,32,0.65)]">
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-b from-white/10 via-transparent to-transparent opacity-60" />
        <div className="relative z-10 py-2">
          {inactiveFeatures.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={feature.onClick}
              onPointerUp={(e) => {
                // Fix stuck press state on mobile
                e.currentTarget.blur()
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors touch-manipulation"
              aria-label={`Switch to ${feature.label}`}
            >
              <span className="shrink-0">{feature.icon}</span>
              <span className="text-sm font-medium">{feature.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null

  return (
    <div className="relative">
      {/* Render popover via portal to prevent clipping */}
      {popoverContent && createPortal(popoverContent, document.body)}

      {/* Toggle Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-pressed={isOpen}
        aria-expanded={isOpen}
        aria-label={`View features menu - ${activeFeature} active`}
        className={`${baseButtonClasses} ${getStateClasses(activeFeature !== "music")}`}
      >
        {getActiveIcon()}
      </button>
    </div>
  )
}
