/**
 * Active Control Proposal Tools
 *
 * Tools that allow the AI to propose actions requiring user confirmation:
 * - proposePlayback: Play, pause, skip, or queue single tracks
 * - proposeQueueSet: Multi-track queue operations
 * - proposePlaylist: Playlist creation
 * - proposeSurface: UI navigation actions
 *
 * @module lib/ai/tools/proposals
 */

import { z } from 'zod'
import {
  findTrackByTitle,
  findCollectionByName,
  resolveTracksForProposal,
} from '@/lib/ai/tools/music-helpers'
import {
  MAX_ACTIVE_CONTROL_TRACKS,
  sanitizeAndValidateToolResult,
  sanitizeInputQuery,
} from '@/lib/ai/tools/utils'
import { trackList, collectionList } from '@/lib/music/data'

// ─────────────────────────────────────────────────────────────────────────────
// PROPOSE PLAYBACK
// ─────────────────────────────────────────────────────────────────────────────

const playbackSchema = z.object({
  action: z.enum(['play', 'pause', 'next', 'prev', 'queue']),
  searchQuery: z
    .string()
    .optional()
    .describe('Search query to find a track to play or queue'),
  context: z
    .string()
    .optional()
    .describe('Reasoning or context for the action'),
})

/**
 * Propose Playback Tool (Active Control)
 *
 * Allows the AI to propose playback actions like playing a track or pausing.
 * This tool returns a proposal that the UI renders as a "Confirm" card.
 * The AI cannot directly execute playback; the user must confirm in the UI.
 */
export const proposePlayback = {
  description:
    'Propose a media playback action. Use this to PLAY music, PAUSE, SKIP, or ADD TO QUEUE. If the user asks to "play [song]", use this tool with action="play" and searchQuery="[song]". The user will see a confirmation card before it happens.',
  inputSchema: playbackSchema,
  needsApproval: true,
  execute: async ({
    action,
    searchQuery,
    context,
  }: {
    action: 'play' | 'pause' | 'next' | 'prev' | 'queue'
    searchQuery?: string
    context?: string
  }) => {
    let proposal: {
      type: 'playback'
      approvalRequired?: boolean
      action: typeof action
      trackId?: string
      trackTitle?: string
      trackArtist?: string
      context?: string
    } = {
      type: 'playback',
      approvalRequired: true,
      action,
      context,
    }

    if (searchQuery && (action === 'play' || action === 'queue')) {
      // Sanitize input to prevent indirect prompt injection
      const rawQuery = sanitizeInputQuery(searchQuery)
      const q = rawQuery.toLowerCase()

      // Find best match in tracks
      const bestTrack = trackList
        .filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description?.toLowerCase().includes(q)
        )
        .sort((a, b) => {
          // Simple exact match boost
          const aExact = a.title.toLowerCase() === q
          const bExact = b.title.toLowerCase() === q
          if (aExact && !bExact) return -1
          if (!aExact && bExact) return 1
          return 0
        })[0]

      if (bestTrack) {
        proposal.trackId = bestTrack.id
        proposal.trackTitle = bestTrack.title
        proposal.trackArtist = bestTrack.artist // though artist is always MetaDJ
      } else {
        // Fallback: search collections if no track found
        const bestCollection = collectionList.find((c) =>
          c.title.toLowerCase().includes(q)
        )
        if (bestCollection) {
          // Play first track of this collection
          const firstCollectionTrack = trackList.find(
            (t) => t.collection === bestCollection.title
          )

          if (firstCollectionTrack) {
            proposal.context =
              proposal.context ?? `Playing from ${bestCollection.title}`
            proposal.trackId = firstCollectionTrack.id
            proposal.trackTitle = firstCollectionTrack.title
            proposal.trackArtist = firstCollectionTrack.artist
          }
        }
      }

      // If a query was provided but no track could be resolved, keep the query around
      // so the UI can show a "not found" state instead of treating this as "resume".
      if (!proposal.trackId && rawQuery) {
        const notFoundMessage = `I couldn't find "${rawQuery}" in the catalog.`
        proposal.trackTitle = rawQuery
        proposal.context = proposal.context
          ? `${proposal.context} ${notFoundMessage}`
          : notFoundMessage
      }
    }

    // Return the proposal. The UI will catch this tool result and render the card.
    return sanitizeAndValidateToolResult(proposal, 'proposePlayback')
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPOSE QUEUE SET
// ─────────────────────────────────────────────────────────────────────────────

const queueSetSchema = z.object({
  trackIds: z
    .array(z.string())
    .optional()
    .describe('Ordered list of track IDs to queue'),
  trackTitles: z
    .array(z.string())
    .optional()
    .describe('Ordered list of track titles to queue'),
  collection: z
    .string()
    .optional()
    .describe('Collection name to pull tracks from'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_ACTIVE_CONTROL_TRACKS)
    .optional()
    .describe('Maximum number of tracks to include'),
  mode: z
    .enum(['replace', 'append'])
    .optional()
    .describe('Replace the queue or append to it'),
  autoplay: z
    .boolean()
    .optional()
    .describe('Start playback after queuing tracks'),
  context: z
    .string()
    .optional()
    .describe('Reasoning or context for the action'),
})

/**
 * Propose Queue Set Tool (Active Control)
 *
 * Allows the AI to propose multi-track queue changes (replace or append).
 * Returns a proposal that the UI renders as a confirmation card.
 */
export const proposeQueueSet = {
  description:
    'Propose setting multiple tracks in the queue. Use this when the user asks to "queue this playlist", "line these tracks up", or requests a multi-track sequence. The user will confirm before anything changes.',
  inputSchema: queueSetSchema,
  needsApproval: true,
  execute: async ({
    trackIds,
    trackTitles,
    collection,
    limit,
    mode,
    autoplay,
    context,
  }: {
    trackIds?: string[]
    trackTitles?: string[]
    collection?: string
    limit?: number
    mode?: 'replace' | 'append'
    autoplay?: boolean
    context?: string
  }) => {
    const resolved = resolveTracksForProposal({
      trackIds,
      trackTitles,
      collection,
      limit,
    })

    let nextContext = context
    if (!nextContext && resolved.collectionTitle) {
      nextContext = `Queue ${resolved.collectionTitle}${mode === 'append' ? ' after the current queue' : ''}.`
    }
    if (!nextContext && resolved.trackIds.length === 0) {
      nextContext = 'No matching tracks found in the catalog.'
    }

    const proposal = {
      type: 'queue-set' as const,
      approvalRequired: true,
      action: 'set' as const,
      trackIds: resolved.trackIds,
      trackTitles: resolved.trackTitles,
      mode,
      autoplay,
      context: nextContext,
    }

    return sanitizeAndValidateToolResult(proposal, 'proposeQueueSet')
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPOSE PLAYLIST
// ─────────────────────────────────────────────────────────────────────────────

const playlistSchema = z.object({
  name: z.string().min(1).max(100).describe('Playlist name'),
  trackIds: z
    .array(z.string())
    .optional()
    .describe('Ordered list of track IDs to include'),
  trackTitles: z
    .array(z.string())
    .optional()
    .describe('Ordered list of track titles to include'),
  collection: z
    .string()
    .optional()
    .describe('Collection name to pull tracks from'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_ACTIVE_CONTROL_TRACKS)
    .optional()
    .describe('Maximum number of tracks to include'),
  queueMode: z
    .enum(['replace', 'append', 'none'])
    .optional()
    .describe('Queue these tracks after creating the playlist'),
  autoplay: z.boolean().optional().describe('Start playback after queuing'),
  context: z
    .string()
    .optional()
    .describe('Reasoning or context for the action'),
})

/**
 * Propose Playlist Tool (Active Control)
 *
 * Allows the AI to propose playlist creation with optional queueing.
 */
export const proposePlaylist = {
  description:
    'Propose creating a playlist. Use this when the user asks to "make a playlist", "save this set", or wants a named collection. The user will confirm before it is created.',
  inputSchema: playlistSchema,
  needsApproval: true,
  execute: async ({
    name,
    trackIds,
    trackTitles,
    collection,
    limit,
    queueMode,
    autoplay,
    context,
  }: {
    name: string
    trackIds?: string[]
    trackTitles?: string[]
    collection?: string
    limit?: number
    queueMode?: 'replace' | 'append' | 'none'
    autoplay?: boolean
    context?: string
  }) => {
    const safeName = name.trim().slice(0, 100)
    const resolved = resolveTracksForProposal({
      trackIds,
      trackTitles,
      collection,
      limit,
    })

    let nextContext = context
    if (!nextContext && resolved.collectionTitle) {
      nextContext = `Create "${safeName}" from ${resolved.collectionTitle}.`
    }
    if (!nextContext && resolved.trackIds.length === 0) {
      nextContext = `Create "${safeName}" (no matching tracks found).`
    }

    const proposal = {
      type: 'playlist' as const,
      approvalRequired: true,
      action: 'create' as const,
      name: safeName,
      trackIds: resolved.trackIds,
      trackTitles: resolved.trackTitles,
      queueMode,
      autoplay,
      context: nextContext,
    }

    return sanitizeAndValidateToolResult(proposal, 'proposePlaylist')
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPOSE SURFACE
// ─────────────────────────────────────────────────────────────────────────────

const surfaceSchema = z.object({
  action: z.enum(['openWisdom', 'openQueue', 'focusSearch', 'openMusicPanel']),
  tab: z
    .enum(['browse', 'queue', 'playlists'])
    .optional()
    .describe('Optional music panel tab to open'),
  context: z
    .string()
    .optional()
    .describe('Reasoning or context for the action'),
})

/**
 * Propose Surface Tool (Active Control)
 *
 * Allows the AI to propose simple UI navigation actions that the user must confirm:
 * - openWisdom: open Wisdom overlay
 * - openQueue: open Queue overlay
 * - focusSearch: focus the Search input
 * - openMusicPanel: open the Music panel (optional tab)
 */
export const proposeSurface = {
  description:
    'Propose a UI navigation action like opening Wisdom, opening Queue, focusing Search, or opening the Music panel. The user will see a confirmation card before it happens.',
  inputSchema: surfaceSchema,
  needsApproval: true,
  execute: async ({
    action,
    tab,
    context,
  }: {
    action: 'openWisdom' | 'openQueue' | 'focusSearch' | 'openMusicPanel'
    tab?: 'browse' | 'queue' | 'playlists'
    context?: string
  }) => {
    const proposal = {
      type: 'ui' as const,
      approvalRequired: true,
      action,
      tab,
      context,
    }

    return sanitizeAndValidateToolResult(proposal, 'proposeSurface')
  },
}
