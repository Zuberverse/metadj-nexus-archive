/**
 * Static Music Repository Tests
 *
 * Tests the singleton static repository that wraps the JSON data sources.
 */

import { describe, expect, it } from 'vitest'
import { getMusicRepository, preloadMusic } from '@/lib/music/static-repository'

describe('getMusicRepository', () => {
  it('returns a repository instance', () => {
    const repo = getMusicRepository()
    expect(repo).toBeDefined()
    expect(typeof repo.listCollections).toBe('function')
    expect(typeof repo.listTracks).toBe('function')
    expect(typeof repo.findTrackById).toBe('function')
    expect(typeof repo.listTracksByCollection).toBe('function')
    expect(typeof repo.findCollectionById).toBe('function')
  })

  it('returns the same singleton instance', () => {
    const repo1 = getMusicRepository()
    const repo2 = getMusicRepository()
    expect(repo1).toBe(repo2)
  })

  it('lists all collections', async () => {
    const repo = getMusicRepository()
    const collections = await repo.listCollections()
    expect(Array.isArray(collections)).toBe(true)
    expect(collections.length).toBeGreaterThan(0)
  })

  it('lists all tracks', async () => {
    const repo = getMusicRepository()
    const tracks = await repo.listTracks()
    expect(Array.isArray(tracks)).toBe(true)
    expect(tracks.length).toBeGreaterThan(0)
  })

  it('finds a track by ID', async () => {
    const repo = getMusicRepository()
    const tracks = await repo.listTracks()
    const firstTrack = tracks[0]

    const found = await repo.findTrackById(firstTrack.id)
    expect(found).toBeDefined()
    expect(found?.id).toBe(firstTrack.id)
  })

  it('returns undefined for unknown track ID', async () => {
    const repo = getMusicRepository()
    const found = await repo.findTrackById('non-existent-track-id')
    expect(found).toBeUndefined()
  })

  it('lists tracks by collection', async () => {
    const repo = getMusicRepository()
    const collections = await repo.listCollections()
    const firstCollection = collections[0]

    const tracks = await repo.listTracksByCollection(firstCollection.id)
    expect(Array.isArray(tracks)).toBe(true)
    expect(tracks.length).toBeGreaterThan(0)
  })

  it('finds collection by ID', async () => {
    const repo = getMusicRepository()
    const collections = await repo.listCollections()
    const firstCollection = collections[0]

    const found = await repo.findCollectionById(firstCollection.id)
    expect(found).toBeDefined()
    expect(found?.id).toBe(firstCollection.id)
  })

  it('finds collection by title slug', async () => {
    const repo = getMusicRepository()
    const collections = await repo.listCollections()
    const firstCollection = collections[0]

    // Try finding by title (slug matching)
    const found = await repo.findCollectionById(firstCollection.title)
    expect(found).toBeDefined()
  })

  it('returns undefined for unknown collection ID', async () => {
    const repo = getMusicRepository()
    const found = await repo.findCollectionById('non-existent-collection-id')
    expect(found).toBeUndefined()
  })
})

describe('preloadMusic', () => {
  it('returns collections and tracks', async () => {
    const result = await preloadMusic()
    expect(result.collections).toBeDefined()
    expect(result.tracks).toBeDefined()
    expect(Array.isArray(result.collections)).toBe(true)
    expect(Array.isArray(result.tracks)).toBe(true)
    expect(result.collections.length).toBeGreaterThan(0)
    expect(result.tracks.length).toBeGreaterThan(0)
  })
})
