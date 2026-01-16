"use client"

import { useEffect } from "react"
import { X } from "lucide-react"

interface AudioSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  crossfadeEnabled: boolean
  onCrossfadeChange: (enabled: boolean) => void
}

export function AudioSettingsModal({
  isOpen,
  onClose,
  crossfadeEnabled,
  onCrossfadeChange,
}: AudioSettingsModalProps) {
  useEffect(() => {
    if (!isOpen) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl border border-white/15 bg-black/90 p-6 backdrop-blur-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-heading font-bold text-heading-solid">Audio Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-accessible hover:text-white hover:bg-white/10 transition focus-ring-glow"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white">Crossfade</p>
              <p className="text-xs text-muted-accessible">Smooth 3-second transitions between tracks</p>
            </div>
            <button
              type="button"
              onClick={() => onCrossfadeChange(!crossfadeEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus-ring-glow ${
                crossfadeEnabled ? "bg-cyan-500" : "bg-white/20"
              }`}
              role="switch"
              aria-checked={crossfadeEnabled}
              aria-label="Toggle crossfade"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                  crossfadeEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
