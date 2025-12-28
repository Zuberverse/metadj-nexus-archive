/**
 * Scene Configuration
 *
 * Defines the visual scenes available in the Cinema experience.
 * Supports two categories:
 * - Visualizers: Audio-reactive generated graphics (default)
 * - Video Scenes: Pre-rendered looping video backgrounds
 */

// Video scene IDs (only scenes with actual video files)
export type VideoSceneId = "metadj-avatar"

// Visualizer IDs
export type VisualizerId =
  | "cosmos"
  | "space-travel"
  | "black-hole"
  | "disco-ball"
  | "pixel-paradise"
  | "eight-bit-adventure"
  | "synthwave-horizon"

// Combined scene ID type
export type SceneId = VideoSceneId | VisualizerId |
  "majestic-ascent" | "neon-depths" | "ethereal-passage" |
  "urban-pulse" | "oceanic-drift" | "golden-hour" |
  "dream-mode"

// Scene category type
export type SceneCategory = "video" | "visualizer" | "environment" | "dream"

export interface Scene {
  id: SceneId
  name: string
  category: SceneCategory
  description?: string
  // Video scenes have a video path
  videoPath?: string
  // Visualizers have a style configuration
  visualizerStyle?: VisualizerStyle
  // Optional: recommended for specific collections
  recommendedFor?: string[]
}

export interface VisualizerStyle {
  type: "explosion" | "space-travel" | "black-hole" | "disco-ball" | "pixel-paradise" | "eight-bit-adventure" | "synthwave-horizon"
  colorScheme: "purple-cyan" | "warm" | "cool" | "monochrome"
  intensity: "subtle" | "moderate" | "intense"
  renderer?: "2d" | "3d" // Default is '2d'
}

// Audio-Reactive Visualizers (shown first)
export const VISUALIZER_SCENES: Scene[] = [
  {
    id: "cosmos",
    name: "Cosmos",
    category: "visualizer",
    description: "3D galaxy with spiral arms and layered color variation",
    visualizerStyle: {
      type: "explosion",
      colorScheme: "purple-cyan",
      intensity: "intense",
      renderer: "3d"
    }
  },
  {
    id: "black-hole",
    name: "Black Hole",
    category: "visualizer",
    description: "Event horizon and accretion disk",
    visualizerStyle: {
      type: "black-hole",
      colorScheme: "monochrome",
      intensity: "intense",
      renderer: "3d"
    }
  },
  {
    id: "space-travel",
    name: "Space Travel",
    category: "visualizer",
    description: "Warp speed starfield",
    visualizerStyle: {
      type: "space-travel",
      colorScheme: "cool",
      intensity: "subtle",
      renderer: "3d"
    },
    recommendedFor: ["majestic-ascent"]
  },
  {
    id: "disco-ball",
    name: "Disco Ball",
    category: "visualizer",
    description: "Cosmic mirror-tile sphere with glittering facets and orbiting stardust",
    visualizerStyle: {
      type: "disco-ball",
      colorScheme: "purple-cyan",
      intensity: "intense",
      renderer: "3d"
    }
  },
  {
    id: "pixel-paradise",
    name: "Pixel Portal",
    category: "visualizer",
    description: "Retro‑future portal drift: neon pixels orbit a glowing gateway",
    visualizerStyle: {
      type: "pixel-paradise",
      colorScheme: "purple-cyan",
      intensity: "moderate",
      renderer: "2d"
    }
  },
  {
    id: "synthwave-horizon",
    name: "Synthwave Horizon",
    category: "visualizer",
    description: "Outrun grid and neon sun on a cosmic horizon",
    visualizerStyle: {
      type: "synthwave-horizon",
      colorScheme: "purple-cyan",
      intensity: "moderate",
      renderer: "2d"
    }
  },
  {
    id: "eight-bit-adventure",
    name: "8-Bit Adventure",
    category: "visualizer",
    description: "8-bit quest run: pixel hero, loot sparks, and sword slashes that ride the beat",
    visualizerStyle: {
      type: "eight-bit-adventure",
      colorScheme: "purple-cyan",
      intensity: "moderate",
      renderer: "2d"
    }
  }
]

// Video Scenes (only those with actual video files)
export const VIDEO_SCENES: Scene[] = [
  {
    id: "metadj-avatar",
    name: "MetaDJ Avatar",
    category: "video",
    description: "The signature MetaDJ visual identity",
    videoPath: "/api/video/MetaDJ%20v7.0%20Performance%20Loop%202%20(v0)_prob4.mp4",
    recommendedFor: ["majestic-ascent", "transformer", "bridging-reality"]
  }
]

// Combined scenes array (visualizers first, then videos)
export const SCENES: Scene[] = [...VISUALIZER_SCENES, ...VIDEO_SCENES]

// Default scene ID (first visualizer)
export const DEFAULT_SCENE_ID: SceneId = "cosmos"

// Helper to check if a scene is a visualizer
export function isVisualizer(scene: Scene): boolean {
  return scene.category === "visualizer"
}

// Helper to get scenes by category
export function getScenesByCategory(category: SceneCategory): Scene[] {
  return SCENES.filter(scene => scene.category === category)
}

// Helper to get recommended scene for a collection
export function getRecommendedScene(collectionId: string): Scene | undefined {
  return SCENES.find(scene => scene.recommendedFor?.includes(collectionId))
}

// Collection-Cinema associations
export const COLLECTION_SCENE_MAP: Record<string, SceneId> = {
  "majestic-ascent": "metadj-avatar",
  "bridging-reality": "metadj-avatar",
  "metaverse-revelation": "cosmos", // Updated from neon-grid
  "transformer": "metadj-avatar"
}
