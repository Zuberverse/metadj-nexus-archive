/**
 * Cinema Scene Management Hook
 *
 * Manages scene selection, persistence, device filtering, and auto-recommendations.
 * Handles desktop vs mobile scene capabilities (3D visualizers on desktop only).
 *
 * @module hooks/cinema/use-cinema-scene
 */

import { useState, useRef, useCallback, useEffect } from "react"
import {
  SCENES,
  DEFAULT_SCENE_ID,
  isVisualizer,
  getRecommendedScene,
  type SceneId,
  type Scene,
} from "@/data/scenes"
import { logger } from "@/lib/logger"

interface UseCinemaSceneOptions {
  /**
   * Whether 3D visualizers are allowed (typically desktop only)
   */
  allow3DVisualizers: boolean
  /**
   * Whether Cinema is currently enabled
   */
  enabled: boolean
  /**
   * Selected collection ID for auto-scene recommendation
   */
  selectedCollectionId: string | null
}

interface UseCinemaSceneReturn {
  /**
   * Currently selected scene ID
   */
  selectedScene: SceneId
  /**
   * Select a new scene
   */
  setSelectedScene: (sceneId: SceneId) => void
  /**
   * Handle user scene selection (marks as user-selected and persists)
   */
  handleSceneSelect: (scene: Scene) => void
  /**
   * Current scene object
   */
  currentScene: Scene
  /**
   * Whether scene menu is open
   */
  isSceneMenuOpen: boolean
  /**
   * Toggle scene menu open state
   */
  setIsSceneMenuOpen: (open: boolean) => void
  /**
   * Check if a scene is allowed on current device
   */
  isSceneAllowedOnDevice: (scene: Scene) => boolean
  /**
   * Ref to track current scene ID (for seamless switching)
   */
  currentSceneRef: React.RefObject<SceneId>
}

// Mobile default is pixel-paradise (Pixel Portal)
const DEFAULT_2D_VISUALIZER_SCENE_ID: SceneId = "pixel-paradise"

/**
 * Hook for managing cinema scene selection and persistence
 *
 * Handles:
 * - Scene selection with device filtering (3D on desktop only)
 * - LocalStorage persistence per device type
 * - Session-based reset to defaults on new app instance
 * - Auto-recommendation based on selected collection
 */
export function useCinemaScene({
  allow3DVisualizers,
  enabled,
  selectedCollectionId,
}: UseCinemaSceneOptions): UseCinemaSceneReturn {
  const sceneStorageKey = allow3DVisualizers
    ? "metadj_cinema_scene"
    : "metadj_cinema_scene_mobile"

  const hadPersistedSceneRef = useRef(false)
  const userSelectedSceneRef = useRef(false)
  const sessionResetDone = useRef(false)

  const [isSceneMenuOpen, setIsSceneMenuOpen] = useState(false)

  const isSceneAllowedOnDevice = useCallback(
    (scene: Scene) => {
      if (!allow3DVisualizers && isVisualizer(scene)) {
        const renderer = scene.visualizerStyle?.renderer ?? "2d"
        return renderer !== "3d"
      }
      return true
    },
    [allow3DVisualizers]
  )

  const [selectedScene, setSelectedSceneState] = useState<SceneId>(() => {
    const fallback = allow3DVisualizers
      ? DEFAULT_SCENE_ID
      : DEFAULT_2D_VISUALIZER_SCENE_ID
    if (typeof window === "undefined") return fallback

    try {
      const stored = window.localStorage.getItem(sceneStorageKey) as SceneId | null
      if (stored) {
        const storedScene = SCENES.find((scene) => scene.id === stored)
        if (storedScene && isSceneAllowedOnDevice(storedScene)) {
          hadPersistedSceneRef.current = true
          return stored
        }
      }
    } catch {
      // ignore
    }
    return fallback
  })

  const currentSceneRef = useRef<SceneId>(selectedScene)

  // Wrapper to update both state and ref
  const setSelectedScene = useCallback((sceneId: SceneId) => {
    setSelectedSceneState(sceneId)
    currentSceneRef.current = sceneId
  }, [])

  // Session-based reset: Clear persisted cinema/dream settings on new app instance
  useEffect(() => {
    if (sessionResetDone.current) return
    sessionResetDone.current = true

    const SESSION_MARKER = "metadj_session_active"
    const isNewSession = !window.sessionStorage.getItem(SESSION_MARKER)

    if (isNewSession) {
      // Mark session as active
      window.sessionStorage.setItem(SESSION_MARKER, "1")
      // Clear persisted settings to reset to defaults
      try {
        window.localStorage.removeItem("metadj_cinema_scene")
        window.localStorage.removeItem("metadj_cinema_scene_mobile")
        window.localStorage.removeItem("metadj_dream_presentation")
        window.localStorage.removeItem("metadj_dream_prompt_base")
      } catch {
        // ignore
      }
      // Reset scene to default
      const fallback = allow3DVisualizers
        ? DEFAULT_SCENE_ID
        : DEFAULT_2D_VISUALIZER_SCENE_ID
      setSelectedScene(fallback)
    }
  }, [allow3DVisualizers, setSelectedScene])

  // Auto-scene: if user has never chosen a scene, default to the collection recommendation
  useEffect(() => {
    if (!enabled) return
    if (hadPersistedSceneRef.current || userSelectedSceneRef.current) return
    if (!selectedCollectionId) return

    const recommended = getRecommendedScene(selectedCollectionId)
    if (!recommended) return

    const nextSceneId = isSceneAllowedOnDevice(recommended)
      ? recommended.id
      : allow3DVisualizers
        ? DEFAULT_SCENE_ID
        : DEFAULT_2D_VISUALIZER_SCENE_ID

    if (nextSceneId !== selectedScene) {
      setSelectedScene(nextSceneId)
    }
  }, [
    enabled,
    selectedCollectionId,
    selectedScene,
    allow3DVisualizers,
    isSceneAllowedOnDevice,
    setSelectedScene,
  ])

  // Re-hydrate scene selection when switching between desktop/mobile layouts
  useEffect(() => {
    if (typeof window === "undefined") return

    const fallback = allow3DVisualizers
      ? DEFAULT_SCENE_ID
      : DEFAULT_2D_VISUALIZER_SCENE_ID
    let nextSceneId: SceneId = fallback
    let hasPersisted = false

    try {
      const stored = window.localStorage.getItem(sceneStorageKey) as SceneId | null
      if (stored) {
        const storedScene = SCENES.find((scene) => scene.id === stored)
        if (storedScene && isSceneAllowedOnDevice(storedScene)) {
          nextSceneId = stored
          hasPersisted = true
        }
      }
    } catch {
      // ignore
    }

    hadPersistedSceneRef.current = hasPersisted
    setSelectedSceneState((current) => (current === nextSceneId ? current : nextSceneId))
  }, [allow3DVisualizers, isSceneAllowedOnDevice, sceneStorageKey])

  // Persist scene selection to localStorage
  const persistScene = useCallback(
    (sceneId: SceneId) => {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(sceneStorageKey, sceneId)
        }
      } catch {
        // ignore
      }
    },
    [sceneStorageKey]
  )

  // Handle user scene selection
  const handleSceneSelect = useCallback(
    (scene: Scene) => {
      userSelectedSceneRef.current = true
      setSelectedScene(scene.id)
      setIsSceneMenuOpen(false)
      persistScene(scene.id)
      logger.debug("[Cinema] Scene selected by user", { sceneId: scene.id })
    },
    [setSelectedScene, persistScene]
  )

  // Get current scene object
  const currentScene = SCENES.find((s) => s.id === selectedScene) || SCENES[0]

  return {
    selectedScene,
    setSelectedScene,
    handleSceneSelect,
    currentScene,
    isSceneMenuOpen,
    setIsSceneMenuOpen,
    isSceneAllowedOnDevice,
    currentSceneRef,
  }
}
