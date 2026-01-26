import { getAppBaseUrl } from '@/lib/app-url';
import type { Track } from '@/types';

/**
 * Generate JSON-LD structured data for MetaDJ Nexus
 * Implements Schema.org MusicAlbum, MusicRecording, and MusicGroup types
 * for enhanced SEO and music platform discoverability.
 *
 * TERMINOLOGY NOTE: MetaDJ Nexus uses "music collections" internally — evolving
 * projects that grow over time rather than fixed albums. However, Schema.org does not
 * have a "MusicCollection" type. Available options are:
 *   - MusicAlbum: Traditional album (closest semantic match)
 *   - MusicPlaylist: User-created playlists (not appropriate for releases)
 *   - CreativeWork: Too generic for music-specific SEO
 *
 * We use MusicAlbum for SEO and rich snippet support while treating collections
 * as evolving projects internally. This ensures optimal discoverability
 * without compromising the creative philosophy.
 */

interface Collection {
  id: string;
  title: string;
  type: 'collection';
  description?: string;
  artworkUrl?: string;
  trackCount?: number;
}

/**
 * Generate MusicGroup (Artist) structured data
 */
export function generateArtistSchema() {
  const baseUrl = getAppBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    '@id': `${baseUrl}/#artist`,
    name: 'MetaDJ',
    url: baseUrl,
    image: `${baseUrl}/images/metadj-logo-wordmark.png`,
    description: 'AI-driven, human-directed music journeys for fans, Metaverse enthusiasts, and explorers.',
    genre: ['Electronic', 'Techno', 'Retro Future'],
  };
}

/**
 * Generate MusicAlbum structured data for a collection
 *
 * Uses Schema.org MusicAlbum type (no MusicCollection equivalent exists).
 * This maps MetaDJ Nexus's "music collection" concept to the closest SEO-friendly schema.
 */
export function generateCollectionSchema(collection: Collection, tracks: Track[]) {
  const baseUrl = getAppBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    '@id': `${baseUrl}/#collection-${collection.id}`,
    name: collection.title,
    description: collection.description || `${collection.title} by MetaDJ`,
    image: collection.artworkUrl ? `${baseUrl}${collection.artworkUrl}` : undefined,
    numTracks: collection.trackCount || tracks.length,
    datePublished: tracks[0]?.releaseDate,
    byArtist: {
      '@type': 'MusicGroup',
      '@id': `${baseUrl}/#artist`,
      name: 'MetaDJ',
    },
    track: tracks.map((track, index) => generateTrackSchema(track, index + 1)),
  };
}

/**
 * Generate MusicRecording structured data for a track
 */
export function generateTrackSchema(track: Track, position?: number) {
  const baseUrl = getAppBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    '@id': `${baseUrl}/#track-${track.id}`,
    name: track.title,
    description: track.description,
    duration: `PT${Math.floor(track.duration / 60)}M${track.duration % 60}S`, // ISO 8601 duration format
    datePublished: track.releaseDate,
    genre: track.genres,
    url: `${baseUrl}${track.audioUrl}`,
    image: track.artworkUrl ? `${baseUrl}${track.artworkUrl}` : undefined,
    byArtist: {
      '@type': 'MusicGroup',
      '@id': `${baseUrl}/#artist`,
      name: track.artist,
    },
    inAlbum: track.collection ? {
      '@type': 'MusicAlbum',
      '@id': `${baseUrl}/#collection-${track.collection.toLowerCase().replace(/\s+/g, '-')}`,
      name: track.collection,
    } : undefined,
    position: position,
    encodingFormat: 'audio/mpeg',
    ...(track.bpm && { tempo: track.bpm }),
    ...(track.key && { musicalKey: track.key }),
  };
}

/**
 * Generate complete website structured data with all collections and tracks
 */
export function generateWebsiteSchema() {
  const baseUrl = getAppBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    name: 'MetaDJ Nexus',
    description: 'Original MetaDJ music. AI-driven, human-directed journeys for fans, Metaverse enthusiasts, and explorers on MetaDJ Nexus (metadjnexus.ai).',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'Zuberant',
      url: baseUrl,
    },
  };
}

/**
 * Generate MusicPlaylist schema for featured tracks
 */
export function generateFeaturedPlaylistSchema(featuredTracks: Track[]) {
  const baseUrl = getAppBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicPlaylist',
    '@id': `${baseUrl}/#featured-playlist`,
    name: 'MetaDJ Nexus Featured',
    description: 'Curated selection of MetaDJ\'s most compelling AI-driven tracks',
    numTracks: featuredTracks.length,
    track: featuredTracks.map((track, index) => generateTrackSchema(track, index + 1)),
    byArtist: {
      '@type': 'MusicGroup',
      '@id': `${baseUrl}/#artist`,
      name: 'MetaDJ',
    },
  };
}

/**
 * Combine multiple schema objects into a single JSON-LD script
 */
export function combineSchemas(...schemas: object[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': schemas,
  };
}
