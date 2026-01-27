"use client"

/**
 * Framer Motion is used here for:
 * - layoutId: Smooth shared layout animation when transitioning between side panel and fullscreen modes
 * - Spring physics: Natural-feeling panel slide-in/out animations
 * - Backdrop opacity: Fade animation for fullscreen overlay
 *
 * This is the primary use of framer-motion in the codebase.
 */
import { motion } from "framer-motion"
import { MetaDjAiChat } from "@/components/metadjai/MetaDjAiChat"
import { ErrorBoundary } from "@/components/ui"
import { useUI } from "@/contexts/UIContext"
import { useCspStyle } from "@/hooks/use-csp-style"
import { PANEL_POSITIONING } from "@/lib/app.constants"
import type { MetaDjAiChatProps } from "@/types/metadjai.types"

interface RightPanelProps extends MetaDjAiChatProps {
  headerHeight: number
}

export function RightPanel({ headerHeight, ...panelProps }: RightPanelProps) {
  const { panels } = useUI()

  // Combine visibility state
  const isOpen = Boolean(panels.right.isOpen && panelProps.isOpen)
  const isFullscreen = panelProps.isFullscreen
  const fullscreenStyleId = useCspStyle({ top: `${headerHeight}px` })
  const panelStyleId = useCspStyle({
    width: `${PANEL_POSITIONING.RIGHT_PANEL.WIDTH}px`,
    top: `${Math.max(headerHeight, 68)}px`,
    height: `calc(100vh - ${Math.max(headerHeight, 68)}px)`,
  })

  // Don't render anything when closed - prevents blank panel when closing from fullscreen
  if (!isOpen) {
    return null
  }

  // Content wrapper that is shared between both views
  // In fullscreen mode: transparent background, no border - content floats on dark backdrop
  // In side panel mode: solid background with left border
  const panelContent = (
    <div
      className={`relative h-full overflow-hidden ${
        isFullscreen
          ? "bg-transparent px-2 pt-2"
          : "bg-(--bg-surface-base)/90 backdrop-blur-3xl px-2 pt-2 border-l border-white/20"
      }`}
    >
      {/* Vibrant Background Blobs - Static for stability (only in side panel mode) */}
      {!isFullscreen && (
        <>
          <div className="absolute -top-[20%] -right-[20%] w-[80%] h-[60%] bg-cyan-500/5 blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[20%] -left-[20%] w-[80%] h-[60%] bg-purple-500/5 blur-[80px] pointer-events-none" />
        </>
      )}

      <div className="relative z-10 h-full">
        <ErrorBoundary componentName="MetaDJai Chat">
          <MetaDjAiChat {...panelProps} headerHeight={headerHeight} variant="panel" />
        </ErrorBoundary>
      </div>
    </div>
  )

  // Fullscreen Mode
  if (isFullscreen) {
    return (
      <motion.div
        layoutId="right-panel-root"
        className="fixed left-0 right-0 bottom-0 z-[105] flex flex-col"
        data-csp-style={fullscreenStyleId}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        <div className="relative container mx-auto h-full max-w-7xl pt-4 pb-4 px-4 z-10">
          <div role="complementary" aria-label="Chat Panel" className="h-full">
            {panelContent}
          </div>
        </div>
      </motion.div>
    )
  }

  // Side Panel Mode (Default)
  // Only rendered when isOpen is true (we return null above when closed)
  // z-[105] ensures panel appears above User Guide overlay (z-100)
  return (
    <motion.div
      layoutId="right-panel-root"
      role="complementary"
      aria-label="Chat Panel"
      className="fixed right-0 bottom-0 z-[105]"
      data-csp-style={panelStyleId}
      initial={{ x: "100%" }}
      animate={{ x: 0, pointerEvents: "auto" }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
    >
      {panelContent}
    </motion.div>
  )
}
