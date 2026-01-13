"use client"

import { ChevronRight } from "lucide-react"
import type React from "react"

/**
 * Shared UI components for the User Guide
 * Used by both MetaDJNexusGuide (page) and UserGuideOverlay (modal)
 */

// Section Header Component
export function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string
  icon: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
          {icon}
        </div>
        <h2 className="font-heading font-bold text-lg text-heading-solid">
          {title}
        </h2>
      </div>
      {action}
    </div>
  )
}

// Feature Item Component
export function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 glass-card rounded-lg p-3">
      <ChevronRight className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-white/70">{text}</p>
    </div>
  )
}

// Shortcut Item Component
export function ShortcutItem({ shortcut }: { shortcut: { key: string; label: string } }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <kbd className="px-2.5 py-1 rounded-md bg-white/10 border border-(--border-standard) text-white/90 font-mono text-xs min-w-[2.5rem] text-center">
        {shortcut.key}
      </kbd>
      <span className="text-sm text-white/60 text-right flex-1">{shortcut.label}</span>
    </div>
  )
}
