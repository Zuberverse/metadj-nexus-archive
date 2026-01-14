"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { ChevronDown, Film, Activity } from "lucide-react"
import {
  VISUALIZER_SCENES,
  VIDEO_SCENES,
  isVisualizer,
  type SceneId,
  type Scene
} from "@/data/scenes"
import { useClickAway } from "@/hooks"

interface CinemaSceneSelectorProps {
  currentScene: Scene
  selectedScene: SceneId
  isOpen: boolean
  onToggle: () => void
  onSelect: (scene: Scene) => void
  /** When false, hides 3D visualizers (mobile performance mode). */
  allow3DVisualizers?: boolean
}

/**
 * CinemaSceneSelector - Categorized dropdown for selecting cinema scenes
 *
 * Displays visualizers first, then video scenes, with clear category headers.
 */
export function CinemaSceneSelector({
  currentScene,
  selectedScene,
  isOpen,
  onToggle,
  onSelect,
  allow3DVisualizers = true,
}: CinemaSceneSelectorProps) {
  const isVisualizerScene = isVisualizer(currentScene)

  // Memoize scene lists to avoid dependency issues
  const visualizer3DScenes = useMemo(
    () => VISUALIZER_SCENES.filter(scene => scene.visualizerStyle?.renderer === "3d"),
    []
  )
  const visualizer2DScenes = useMemo(
    () => VISUALIZER_SCENES.filter(scene => (scene.visualizerStyle?.renderer ?? "2d") === "2d"),
    []
  )

  // Flatten all scenes into a single navigable list
  const allScenes = useMemo(() => {
    const scenes: Scene[] = []
    if (allow3DVisualizers) {
      scenes.push(...visualizer3DScenes)
    }
    scenes.push(...visualizer2DScenes)
    scenes.push(...VIDEO_SCENES)
    return scenes
  }, [allow3DVisualizers, visualizer3DScenes, visualizer2DScenes])

  // Roving tabindex state
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Find current selected index for initial focus
  const selectedIndex = useMemo(() => {
    return allScenes.findIndex(s => s.id === selectedScene)
  }, [allScenes, selectedScene])

  // Reset focused index when dropdown opens, focus selected item
  useEffect(() => {
    if (isOpen) {
      const targetIndex = selectedIndex >= 0 ? selectedIndex : 0
      setFocusedIndex(targetIndex)
      // Focus the button after a brief delay to ensure DOM is ready
      requestAnimationFrame(() => {
        buttonRefs.current.get(targetIndex)?.focus()
      })
    } else {
      setFocusedIndex(-1)
    }
  }, [isOpen, selectedIndex])

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    const totalItems = allScenes.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        const nextIndex = (index + 1) % totalItems
        setFocusedIndex(nextIndex)
        buttonRefs.current.get(nextIndex)?.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        const prevIndex = (index - 1 + totalItems) % totalItems
        setFocusedIndex(prevIndex)
        buttonRefs.current.get(prevIndex)?.focus()
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        buttonRefs.current.get(0)?.focus()
        break
      case 'End':
        e.preventDefault()
        const lastIndex = totalItems - 1
        setFocusedIndex(lastIndex)
        buttonRefs.current.get(lastIndex)?.focus()
        break
      case 'Escape':
        e.preventDefault()
        onToggle()
        triggerRef.current?.focus()
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        const scene = allScenes[index]
        if (scene) onSelect(scene)
        break
    }
  }, [allScenes, onToggle, onSelect])

  // Handle trigger keyboard events
  const handleTriggerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      if (!isOpen) {
        e.preventDefault()
        onToggle()
      }
    } else if (e.key === 'Escape' && isOpen) {
      e.preventDefault()
      onToggle()
    }
  }, [isOpen, onToggle])

  const renderSceneButton = (scene: Scene, index: number) => (
    <button
      key={scene.id}
      ref={(el) => {
        if (el) buttonRefs.current.set(index, el)
        else buttonRefs.current.delete(index)
      }}
      type="button"
      role="option"
      aria-selected={scene.id === selectedScene}
      tabIndex={focusedIndex === index ? 0 : -1}
      onClick={() => onSelect(scene)}
      onKeyDown={(e) => handleKeyDown(e, index)}
      className={`w-full px-4 py-3 text-left transition-colors focus-ring ${scene.id === selectedScene
        ? 'bg-(--border-standard) text-white'
        : 'text-(--text-secondary) hover:bg-(--glass-strong) hover:text-white'
        }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{scene.name}</span>
      </div>
      {scene.description && (
        <p className="text-xs text-(--text-subtle) mt-0.5">{scene.description}</p>
      )}
    </button>
  )

  // Calculate index ranges for each section
  const visualizer3DStartIndex = 0
  const visualizer3DEndIndex = allow3DVisualizers ? visualizer3DScenes.length : 0
  const visualizer2DStartIndex = visualizer3DEndIndex
  const visualizer2DEndIndex = visualizer2DStartIndex + visualizer2DScenes.length
  const videoStartIndex = visualizer2DEndIndex

  // Click-away support
  const containerRef = useRef<HTMLDivElement>(null)
  useClickAway(containerRef, () => {
    if (isOpen) onToggle()
  })

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        onKeyDown={handleTriggerKeyDown}
        className="group flex items-center gap-2 rounded-full border border-white/30 bg-black/50 backdrop-blur-md px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:bg-black/40 hover:border-white/50 focus-ring-glow"
        aria-label="Select cinema scene"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {isVisualizerScene ? (
          <Activity className="h-3.5 w-3.5" />
        ) : (
          <Film className="h-3.5 w-3.5" />
        )}
        <span id="cinema-console-heading">Scene: {currentScene.name}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Categorized scene dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Cinema scenes"
          aria-activedescendant={focusedIndex >= 0 ? `scene-option-${allScenes[focusedIndex]?.id}` : undefined}
          className="absolute left-0 top-full mt-2 min-w-64 max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y rounded-2xl border border-(--border-elevated) bg-(--bg-surface-elevated)/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.75)] z-50 [-webkit-overflow-scrolling:touch]"
        >
          {/* Visualizers Category (shown first) */}
          <div className="px-4 py-2.5 border-b border-(--border-standard) sticky top-0 bg-(--bg-surface-elevated)/95 backdrop-blur-xl" role="presentation">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-(--text-muted)">
              <Activity className="h-3.5 w-3.5" />
              <span>Audio-Reactive Visualizers</span>
            </div>
          </div>
          {!allow3DVisualizers && (
            <div className="px-4 pt-3 pb-2 text-xs text-(--text-subtle)" role="presentation">
              3D visualizers are available on desktop.
            </div>
          )}

          {allow3DVisualizers && visualizer3DScenes.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.35em] text-(--text-subtle)" role="presentation">
                3D Visualizers
              </div>
              {visualizer3DScenes.map((scene, idx) => renderSceneButton(scene, visualizer3DStartIndex + idx))}
            </>
          )}

          {visualizer2DScenes.length > 0 && (
            <>
              {allow3DVisualizers && visualizer3DScenes.length > 0 && (
                <div className="h-px bg-(--border-standard) my-1" role="presentation" />
              )}
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.35em] text-(--text-subtle)" role="presentation">
                2D Visualizers
              </div>
              {visualizer2DScenes.map((scene, idx) => renderSceneButton(scene, visualizer2DStartIndex + idx))}
            </>
          )}

          {/* Divider */}
          <div className="h-px bg-(--border-standard) my-1" role="presentation" />

          {/* Video Scenes Category */}
          <div className="px-4 py-2.5 border-b border-(--border-standard) sticky top-0 bg-(--bg-surface-elevated)/95 backdrop-blur-xl" role="presentation">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-(--text-muted)">
              <Film className="h-3.5 w-3.5" />
              <span>Video Scenes</span>
            </div>
          </div>
          {VIDEO_SCENES.map((scene, idx) => renderSceneButton(scene, videoStartIndex + idx))}
        </div>
      )}
    </div>
  )
}
