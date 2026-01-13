/**
 * Music Deep Link Tests
 *
 * Tests for music URL path parsing and building utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  isMusicDeepLinkKind,
  buildMusicDeepLinkPath,
  buildMusicDeepLinkUrl,
  parseMusicDeepLinkPath,
} from '@/lib/music/deeplink'

describe('isMusicDeepLinkKind', () => {
  it('returns true for "track"', () => {
    expect(isMusicDeepLinkKind('track')).toBe(true)
  })

  it('returns true for "collection"', () => {
    expect(isMusicDeepLinkKind('collection')).toBe(true)
  })

  it('returns true for "playlist"', () => {
    expect(isMusicDeepLinkKind('playlist')).toBe(true)
  })

  it('returns false for invalid kinds', () => {
    expect(isMusicDeepLinkKind('wisdom')).toBe(false)
    expect(isMusicDeepLinkKind('TRACK')).toBe(false)
    expect(isMusicDeepLinkKind('')).toBe(false)
  })
})

describe('buildMusicDeepLinkPath', () => {
  it('builds track path', () => {
    expect(buildMusicDeepLinkPath('track', 'metadj-001')).toBe('/track/metadj-001')
  })

  it('builds collection path', () => {
    expect(buildMusicDeepLinkPath('collection', 'majestic-ascent')).toBe('/collection/majestic-ascent')
  })

  it('builds playlist path', () => {
    expect(buildMusicDeepLinkPath('playlist', 'night-drive')).toBe('/playlist/night-drive')
  })

  it('encodes spaces in ids', () => {
    expect(buildMusicDeepLinkPath('track', 'future grace')).toBe('/track/future%20grace')
  })
})

describe('buildMusicDeepLinkUrl', () => {
  it('builds full URL with origin', () => {
    expect(buildMusicDeepLinkUrl('track', 'metadj-001', 'https://example.com')).toBe(
      'https://example.com/track/metadj-001'
    )
  })

  it('handles origin with trailing slash', () => {
    expect(buildMusicDeepLinkUrl('collection', 'majestic-ascent', 'https://example.com/')).toBe(
      'https://example.com/collection/majestic-ascent'
    )
  })
})

describe('parseMusicDeepLinkPath', () => {
  it('parses track deep link', () => {
    expect(parseMusicDeepLinkPath('/track/metadj-001')).toEqual({
      kind: 'track',
      id: 'metadj-001',
    })
  })

  it('parses collection deep link', () => {
    expect(parseMusicDeepLinkPath('/collection/majestic-ascent')).toEqual({
      kind: 'collection',
      id: 'majestic-ascent',
    })
  })

  it('parses playlist deep link', () => {
    expect(parseMusicDeepLinkPath('/playlist/night-drive')).toEqual({
      kind: 'playlist',
      id: 'night-drive',
    })
  })

  it('decodes URL-encoded ids', () => {
    expect(parseMusicDeepLinkPath('/track/future%20grace')).toEqual({
      kind: 'track',
      id: 'future grace',
    })
  })

  it('handles ids with slashes', () => {
    expect(parseMusicDeepLinkPath('/collection/series/vol-1')).toEqual({
      kind: 'collection',
      id: 'series/vol-1',
    })
  })

  it('returns null for invalid paths', () => {
    expect(parseMusicDeepLinkPath('/wisdom/thoughts/test')).toBeNull()
    expect(parseMusicDeepLinkPath('/music')).toBeNull()
    expect(parseMusicDeepLinkPath('/')).toBeNull()
  })

  it('returns null for incomplete paths', () => {
    expect(parseMusicDeepLinkPath('/track')).toBeNull()
    expect(parseMusicDeepLinkPath('/collection/')).toBeNull()
  })
})
