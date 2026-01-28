/**
 * Cinema Video Utilities Tests
 *
 * Tests the video source building and content type detection utilities.
 */

import { describe, expect, it } from 'vitest'
import {
  getVideoContentType,
  buildVideoSources,
  hasVideoSource,
} from '@/lib/cinema/video-utils'
import type { Scene } from '@/data/scenes'

describe('getVideoContentType', () => {
  it('returns video/webm for .webm files', () => {
    expect(getVideoContentType('/video/test.webm')).toBe('video/webm')
  })

  it('returns video/mp4 for .mp4 files', () => {
    expect(getVideoContentType('/video/test.mp4')).toBe('video/mp4')
  })

  it('returns video/quicktime for .mov files', () => {
    expect(getVideoContentType('/video/test.mov')).toBe('video/quicktime')
  })

  it('returns undefined for unknown extensions', () => {
    expect(getVideoContentType('/video/test.avi')).toBeUndefined()
  })

  it('returns undefined for undefined input', () => {
    expect(getVideoContentType(undefined)).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(getVideoContentType('')).toBeUndefined()
  })
})

describe('buildVideoSources', () => {
  it('builds sources from a full scene', () => {
    const scene: Scene = {
      id: 'metadj-avatar',
      name: 'Test',
      category: 'video',
      videoPath: '/video/test.mp4',
      videoWebmPath: '/video/test.webm',
      videoMobilePath: '/video/test-mobile.webm',
      videoFallbackPath: '/video/fallback.mp4',
    }

    const sources = buildVideoSources(scene)
    expect(sources).toHaveLength(4)

    // Mobile first with media query
    expect(sources[0].src).toBe('/video/test-mobile.webm')
    expect(sources[0].media).toBe('(max-width: 767px)')
    expect(sources[0].type).toBe('video/webm')

    // WebM second
    expect(sources[1].src).toBe('/video/test.webm')
    expect(sources[1].type).toBe('video/webm')

    // MP4 third
    expect(sources[2].src).toBe('/video/test.mp4')
    expect(sources[2].type).toBe('video/mp4')

    // Fallback last
    expect(sources[3].src).toBe('/video/fallback.mp4')
    expect(sources[3].type).toBe('video/mp4')
  })

  it('skips missing video paths', () => {
    const scene: Scene = {
      id: 'metadj-avatar',
      name: 'Test',
      category: 'video',
      videoPath: '/video/test.mp4',
    }

    const sources = buildVideoSources(scene)
    expect(sources).toHaveLength(1)
    expect(sources[0].src).toBe('/video/test.mp4')
  })

  it('deduplicates identical paths', () => {
    const scene: Scene = {
      id: 'metadj-avatar',
      name: 'Test',
      category: 'video',
      videoPath: '/video/same.mp4',
      videoFallbackPath: '/video/same.mp4',
    }

    const sources = buildVideoSources(scene)
    expect(sources).toHaveLength(1)
  })

  it('returns empty array for visualizer scene', () => {
    const scene: Scene = {
      id: 'cosmos',
      name: 'Cosmos',
      category: 'visualizer',
    }

    const sources = buildVideoSources(scene)
    expect(sources).toEqual([])
  })
})

describe('hasVideoSource', () => {
  it('returns true when scene has videoPath', () => {
    const scene: Scene = {
      id: 'metadj-avatar',
      name: 'Test',
      category: 'video',
      videoPath: '/video/test.mp4',
    }
    expect(hasVideoSource(scene)).toBe(true)
  })

  it('returns true when scene has videoWebmPath', () => {
    const scene: Scene = {
      id: 'metadj-avatar',
      name: 'Test',
      category: 'video',
      videoWebmPath: '/video/test.webm',
    }
    expect(hasVideoSource(scene)).toBe(true)
  })

  it('returns true when scene has videoMobilePath', () => {
    const scene: Scene = {
      id: 'metadj-avatar',
      name: 'Test',
      category: 'video',
      videoMobilePath: '/video/test-mobile.webm',
    }
    expect(hasVideoSource(scene)).toBe(true)
  })

  it('returns true when scene has videoFallbackPath', () => {
    const scene: Scene = {
      id: 'metadj-avatar',
      name: 'Test',
      category: 'video',
      videoFallbackPath: '/video/fallback.mp4',
    }
    expect(hasVideoSource(scene)).toBe(true)
  })

  it('returns false when scene has no video sources', () => {
    const scene: Scene = {
      id: 'cosmos',
      name: 'Cosmos',
      category: 'visualizer',
    }
    expect(hasVideoSource(scene)).toBe(false)
  })
})
