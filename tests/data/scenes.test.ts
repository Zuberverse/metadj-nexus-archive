/**
 * Scene Configuration Tests
 *
 * Tests scene data exports and helper functions.
 */

import { describe, expect, it } from 'vitest'
import {
  SCENES,
  VISUALIZER_SCENES,
  VIDEO_SCENES,
  DEFAULT_SCENE_ID,
  COLLECTION_SCENE_MAP,
  isVisualizer,
  getScenesByCategory,
  getRecommendedScene,
  type Scene,
} from '@/data/scenes'

describe('scene data exports', () => {
  it('exports SCENES as non-empty array', () => {
    expect(Array.isArray(SCENES)).toBe(true)
    expect(SCENES.length).toBeGreaterThan(0)
  })

  it('exports VISUALIZER_SCENES as non-empty array', () => {
    expect(VISUALIZER_SCENES.length).toBeGreaterThan(0)
    VISUALIZER_SCENES.forEach((scene) => {
      expect(scene.category).toBe('visualizer')
    })
  })

  it('exports VIDEO_SCENES as non-empty array', () => {
    expect(VIDEO_SCENES.length).toBeGreaterThan(0)
    VIDEO_SCENES.forEach((scene) => {
      expect(scene.category).toBe('video')
    })
  })

  it('SCENES combines visualizers and videos', () => {
    expect(SCENES.length).toBe(VISUALIZER_SCENES.length + VIDEO_SCENES.length)
  })

  it('exports DEFAULT_SCENE_ID as cosmos', () => {
    expect(DEFAULT_SCENE_ID).toBe('cosmos')
  })

  it('exports COLLECTION_SCENE_MAP', () => {
    expect(COLLECTION_SCENE_MAP).toBeDefined()
    expect(typeof COLLECTION_SCENE_MAP).toBe('object')
    expect(COLLECTION_SCENE_MAP['majestic-ascent']).toBe('metadj-avatar')
  })

  it('all scenes have required fields', () => {
    SCENES.forEach((scene) => {
      expect(scene.id).toBeTruthy()
      expect(scene.name).toBeTruthy()
      expect(['video', 'visualizer', 'environment', 'dream']).toContain(scene.category)
    })
  })

  it('visualizer scenes have visualizerStyle', () => {
    VISUALIZER_SCENES.forEach((scene) => {
      expect(scene.visualizerStyle).toBeDefined()
      expect(scene.visualizerStyle?.type).toBeTruthy()
      expect(scene.visualizerStyle?.colorScheme).toBeTruthy()
      expect(scene.visualizerStyle?.intensity).toBeTruthy()
    })
  })

  it('video scenes have video paths', () => {
    VIDEO_SCENES.forEach((scene) => {
      expect(scene.videoPath).toBeTruthy()
    })
  })
})

describe('isVisualizer', () => {
  it('returns true for visualizer scenes', () => {
    const visualizer: Scene = {
      id: 'cosmos',
      name: 'Cosmos',
      category: 'visualizer',
    }
    expect(isVisualizer(visualizer)).toBe(true)
  })

  it('returns false for video scenes', () => {
    const video: Scene = {
      id: 'metadj-avatar',
      name: 'MetaDJ Avatar',
      category: 'video',
    }
    expect(isVisualizer(video)).toBe(false)
  })
})

describe('getScenesByCategory', () => {
  it('returns all visualizer scenes', () => {
    const visualizers = getScenesByCategory('visualizer')
    expect(visualizers.length).toBe(VISUALIZER_SCENES.length)
    visualizers.forEach((scene) => {
      expect(scene.category).toBe('visualizer')
    })
  })

  it('returns all video scenes', () => {
    const videos = getScenesByCategory('video')
    expect(videos.length).toBe(VIDEO_SCENES.length)
    videos.forEach((scene) => {
      expect(scene.category).toBe('video')
    })
  })

  it('returns empty array for unused category', () => {
    const dreams = getScenesByCategory('dream')
    expect(dreams).toEqual([])
  })
})

describe('getRecommendedScene', () => {
  it('finds recommended scene for majestic-ascent', () => {
    const scene = getRecommendedScene('majestic-ascent')
    expect(scene).toBeDefined()
  })

  it('returns undefined for collection without recommendation', () => {
    const scene = getRecommendedScene('nonexistent-collection')
    expect(scene).toBeUndefined()
  })
})
