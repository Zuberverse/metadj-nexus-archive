"use client"

import { Modal, ModalContent } from "@/components/ui"

interface KeyboardShortcutsModalProps {
  onClose: () => void
}

interface Shortcut {
  key: string;
  action: string;
  category: "playback" | "navigation" | "queue" | "accessibility";
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
const mod = isMac ? '⌘' : 'Ctrl'

const shortcuts: Shortcut[] = [
  // Playback (require modifier)
  { key: `${mod} + Space`, action: "Play / Pause", category: "playback" },
  { key: `${mod} + ←`, action: "Previous track", category: "playback" },
  { key: `${mod} + →`, action: "Next track", category: "playback" },
  { key: `${mod} + ↑`, action: "Volume up (+10%)", category: "playback" },
  { key: `${mod} + ↓`, action: "Volume down (-10%)", category: "playback" },
  { key: `${mod} + M`, action: "Toggle mute", category: "playback" },

  // Queue & Navigation (require modifier)
  { key: `${mod} + N`, action: "Next track in queue", category: "queue" },
  { key: `${mod} + P`, action: "Previous track", category: "queue" },
  { key: `${mod} + S`, action: "Toggle shuffle", category: "queue" },
  { key: `${mod} + R`, action: "Cycle repeat mode", category: "queue" },

  // Navigation
  { key: `${mod} + /`, action: "Focus search", category: "navigation" },
  { key: `${mod} + K`, action: "Focus search", category: "navigation" },
  { key: `${mod} + J`, action: "Toggle MetaDJai", category: "navigation" },
  { key: "Esc", action: "Close modals / Exit fullscreen", category: "navigation" },
  { key: "Tab", action: "Navigate interactive elements", category: "navigation" },

  // Accessibility
  { key: "?", action: "Show this help", category: "accessibility" },
]

const categoryLabels: Record<Shortcut["category"], string> = {
  playback: "Playback Controls",
  queue: "Queue Management",
  navigation: "Navigation",
  accessibility: "Accessibility",
}

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="md"
      gradientBorder
      overlayClassName="bg-black/85 backdrop-blur-xl"
      className="bg-black/90"
    >
      <ModalContent className="px-6 py-6 sm:px-8 sm:py-6">
        {/* Shortcuts list organized by category */}
        <div className="space-y-5 max-h-[60vh] overflow-y-auto">
          {(["playback", "queue", "navigation", "accessibility"] as const).map((category) => {
            const categoryShortcuts = shortcuts.filter(s => s.category === category)
            if (categoryShortcuts.length === 0) return null

            return (
              <div key={category}>
                {/* WCAG: text-white/70 for 4.5:1 contrast on category labels */}
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-heading-solid mb-2">
                  {categoryLabels[category]}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <span className="text-sm sm:text-base text-white/90">
                        {shortcut.action}
                      </span>
                      <kbd className="px-3 py-1.5 text-xs sm:text-sm font-mono font-semibold text-white gradient-2-soft border border-white/20 rounded-lg shadow-xs">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="mt-6 space-y-2 text-center">
          {/* WCAG: text-muted-accessible for 5.2:1 contrast on informational text */}
          <p className="text-xs sm:text-sm text-muted-accessible">
            Most shortcuts require <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">{mod}</kbd> modifier (WCAG 2.1.4 compliant)
          </p>
          {/* Secondary note - using accessible muted color for WCAG compliance */}
          <p className="text-xs text-muted-accessible">
            Shortcuts disabled when typing in search or input fields
          </p>
        </div>
      </ModalContent>
    </Modal>
  )
}
