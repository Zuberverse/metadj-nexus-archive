import { createOpenAI, openai } from '@ai-sdk/openai'
import { cosineSimilarity, embed, embedMany } from 'ai'
import { z } from 'zod'
import ecosystemKnowledge from '@/data/knowledge/ecosystem.json'
import identityKnowledge from '@/data/knowledge/identity.json'
import metadjKnowledge from '@/data/knowledge/metadj.json'
import philosophyKnowledge from '@/data/knowledge/philosophy.json'
import workflowsKnowledge from '@/data/knowledge/workflows.json'
import zuberantKnowledge from '@/data/knowledge/zuberant.json'
import wisdomContent from '@/data/wisdom-content.json'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { shuffleTracks } from '@/lib/music'
import { trackList, collectionList, trackIndex } from '@/lib/music/data'
import type { Track, Collection } from '@/types'

type CatalogSearchResult =
  | (Track & { kind: 'track' })
  | (Collection & { kind: 'collection' })

/**
 * AI Tools Configuration
 *
 * Configures tools for the AI model.
 * Currently includes catalog search for local music data.
 *
 * SECURITY CONSIDERATIONS:
 * ========================
 * - Tool results are returned to the AI model for processing
 * - Large results can consume excessive tokens and increase costs
 * - All tool results should be size-limited to prevent abuse
 *
 * SIZE LIMITS:
 * - MAX_TOOL_RESULT_SIZE: Maximum JSON string length for any tool result
 * - MAX_SEARCH_RESULTS: Maximum number of items returned from searches
 * - MAX_RECOMMENDATIONS: Maximum number of recommendations
 */

/**
 * Maximum size (in characters) for serialized tool results
 * Prevents excessive token consumption from oversized responses
 */
const MAX_TOOL_RESULT_SIZE = 8000; // ~2000 tokens at 4 chars/token

/**
 * Maximum number of search results returned
 */
const MAX_SEARCH_RESULTS = 10;

/**
 * Maximum number of recommendations returned
 */
const MAX_RECOMMENDATIONS = 10;

const WISDOM_SIGNOFF_REGEX = /^—\s*metadj\s*$/i

const MAX_ACTIVE_CONTROL_TRACKS = 50;
const DEFAULT_ACTIVE_CONTROL_LIMIT = 20;

/**
 * Tool result with optional metadata about processing
 */
interface ToolResultMeta {
  _meta?: {
    truncated: boolean;
    originalSize?: number;
  };
}

/**
 * Validate and potentially truncate tool results to prevent oversized responses
 *
 * @param result - The tool result to validate
 * @param toolName - Name of the tool for logging
 * @returns Validated result, potentially truncated with _meta.truncated flag
 */
function validateToolResultSize<T>(result: T, toolName: string): T & ToolResultMeta {
  const serialized = JSON.stringify(result);
  const size = serialized.length;

  if (size > MAX_TOOL_RESULT_SIZE) {
    logger.warn(`Tool result exceeds size limit`, {
      tool: toolName,
      size,
      limit: MAX_TOOL_RESULT_SIZE,
    });

    // For arrays, truncate to fit and add metadata
    if (Array.isArray(result)) {
      let truncated = [...result];
      while (JSON.stringify(truncated).length > MAX_TOOL_RESULT_SIZE && truncated.length > 1) {
        truncated = truncated.slice(0, Math.floor(truncated.length * 0.8));
      }
      // Return as object with array and meta for arrays
      return {
        items: truncated,
        _meta: { truncated: true, originalSize: size },
      } as unknown as T & ToolResultMeta;
    }

    // For objects with arrays, try to find and truncate the main array
    if (typeof result === 'object' && result !== null) {
      const obj = { ...result } as Record<string, unknown>;
      let wasTruncated = false;
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key])) {
          let arr = [...(obj[key] as unknown[])];
          const originalLength = arr.length;
          while (JSON.stringify(obj).length > MAX_TOOL_RESULT_SIZE && arr.length > 1) {
            arr = arr.slice(0, Math.floor(arr.length * 0.8));
            obj[key] = arr;
          }
          if (arr.length < originalLength) {
            wasTruncated = true;
          }
        }
      }
      if (wasTruncated) {
        obj._meta = { truncated: true, originalSize: size };
      }
      return obj as T & ToolResultMeta;
    }
  }

  return result as T & ToolResultMeta;
}

/**
 * Patterns that may indicate prompt injection attempts in tool outputs
 * These are sanitized to prevent indirect prompt injection attacks
 */
const INJECTION_PATTERNS = [
  // System instruction override attempts
  /(?:^|\n)\s*system\s*:\s*/gi,
  /\b(ignore|forget)\s+(all\s+)?(previous\s+)?(instructions?|prompts?|rules?)/gi,
  /\byou\s+(are|must|should)\s+now\b/gi,
  /(?:^|\n)\s*new\s+instructions?\s*:/gi,
  // Role manipulation
  /\b(act|behave|respond)\s+as\s+(if\s+you\s+are|a)\b/gi,
  /(?:^|\n)\s*role\s*:\s*/gi,
  /(?:^|\n)\s*assistant\s*:\s*/gi,
  // Prompt delimiter injection
  /```+\s*(system|assistant|user)/gi,
  /<\/?(?:system|assistant|user)>/gi,
  // Command injection patterns
  /(?:^|\n)\s*execute\s*:\s*/gi,
  /\brun\s+command\b/gi,
];

/**
 * Sanitize a string value to prevent indirect prompt injection
 *
 * @param value - String to sanitize
 * @returns Sanitized string with injection patterns neutralized
 */
function sanitizeInjectionPatterns(value: string): string {
  let sanitized = value;

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      // Replace with bracketed version to neutralize without losing context
      const prefix = match.startsWith('\n') ? '\n' : '';
      const cleaned = match
        .replace(/[^\w\s]/g, '')
        .trim()
        .replace(/\s+/g, ' ');
      return `${prefix}[filtered: ${cleaned}]`;
    });
  }

  return sanitized;
}

/**
 * Recursively sanitize all string values in an object to prevent injection
 *
 * @param obj - Object to sanitize
 * @returns Sanitized copy of the object
 */
function sanitizeToolOutput<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeInjectionPatterns(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeToolOutput(item)) as T;
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeToolOutput((obj as Record<string, unknown>)[key]);
    }
    return result as T;
  }

  return obj;
}

/**
 * Validate, sanitize, and size-limit tool results
 *
 * Combines injection protection with size validation.
 * Use this as the final step before returning tool results.
 *
 * @param result - The tool result to process
 * @param toolName - Name of the tool for logging
 * @returns Sanitized and validated result
 */
export function sanitizeAndValidateToolResult<T>(result: T, toolName: string): T {
  // First sanitize for injection protection
  const sanitized = sanitizeToolOutput(result);

  // Then validate size
  return validateToolResultSize(sanitized, toolName);
}

function normalizeCatalogText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findTrackByTitle(title: string): Track | undefined {
  const normalized = normalizeCatalogText(title);
  if (!normalized) return undefined;

  const exactMatch = trackList.find((track) => normalizeCatalogText(track.title) === normalized);
  if (exactMatch) return exactMatch;

  return trackList.find((track) => normalizeCatalogText(track.title).includes(normalized));
}

function findCollectionByName(name: string): Collection | undefined {
  const normalized = normalizeCatalogText(name);
  if (!normalized) return undefined;

  const exactMatch = collectionList.find((collection) => normalizeCatalogText(collection.title) === normalized);
  if (exactMatch) return exactMatch;

  return collectionList.find((collection) => normalizeCatalogText(collection.title).includes(normalized));
}

function resolveTracksForProposal(input: {
  trackIds?: string[];
  trackTitles?: string[];
  collection?: string;
  limit?: number;
}): { trackIds: string[]; trackTitles: string[]; collectionTitle?: string } {
  const max = Math.min(input.limit ?? DEFAULT_ACTIVE_CONTROL_LIMIT, MAX_ACTIVE_CONTROL_TRACKS);
  const trackIds: string[] = [];
  const trackTitles: string[] = [];
  const seen = new Set<string>();
  let collectionTitle: string | undefined;

  const addTrack = (track?: Track) => {
    if (!track || trackIds.length >= max || seen.has(track.id)) return;
    seen.add(track.id);
    trackIds.push(track.id);
    trackTitles.push(track.title);
  };

  if (input.trackIds?.length) {
    for (const id of input.trackIds) {
      addTrack(trackIndex.get(id));
      if (trackIds.length >= max) break;
    }
  }

  if (input.trackTitles?.length) {
    for (const title of input.trackTitles) {
      addTrack(findTrackByTitle(title));
      if (trackIds.length >= max) break;
    }
  }

  if (input.collection && trackIds.length < max) {
    const matchedCollection = findCollectionByName(input.collection);
    if (matchedCollection) {
      collectionTitle = matchedCollection.title;
      for (const track of trackList) {
        if (track.collection !== matchedCollection.title) continue;
        addTrack(track);
        if (trackIds.length >= max) break;
      }
    }
  }

  return { trackIds, trackTitles, collectionTitle };
}

// Schema for catalog search parameters
const catalogSearchSchema = z.object({
  query: z.string().describe('The search query (title, artist, genre, or description)'),
  type: z.enum(['track', 'collection', 'all']).optional().describe('The type of content to search for'),
})

/**
 * Catalog Search Tool
 *
 * Allows the AI to search the local music catalog (tracks and collections).
 */
export const searchCatalog = {
  description: 'Search the MetaDJ music catalog for tracks and collections. Use this to find specific songs, collections, or genres mentioned by the user.',
  inputSchema: catalogSearchSchema,
  execute: async ({ query, type }: { query: string; type?: 'track' | 'collection' | 'all' }) => {
    // SECURITY: Sanitize and limit query length
    const normalizeSearchToken = (value: string) => value.toLowerCase()
    const q = normalizeSearchToken(query).slice(0, 200)
    const searchType = type ?? 'all'
    const results: CatalogSearchResult[] = []

    if (searchType === 'all' || searchType === 'collection') {
      const matchedCollections = collectionList.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      )
      results.push(...matchedCollections.map(c => ({ ...c, kind: 'collection' as const })))
    }

    if (searchType === 'all' || searchType === 'track') {
      const matchedTracks = trackList.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.genres.some(g => g.toLowerCase().includes(q))
      )
      results.push(...matchedTracks.map(t => ({ ...t, kind: 'track' as const })))
    }

    // Prioritize exact matches and limit results
    const sortedResults = results
      .sort((a, b) => {
        const aExact = a.title.toLowerCase() === q
        const bExact = b.title.toLowerCase() === q
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        return 0
      })
      .slice(0, MAX_SEARCH_RESULTS)

    // SECURITY: Validate result size before returning
    return sanitizeAndValidateToolResult(sortedResults, 'searchCatalog')
  },
}

/**
 * Platform Help Tool
 *
 * Provides contextual help about MetaDJ Nexus features and navigation.
 */

// Platform feature documentation for the help tool
const PLATFORM_FEATURES = {
  hub: {
    title: 'Hub',
    description: 'Mission control for MetaDJ Nexus—launch cinematic listening, catch updates, and jump into key surfaces.',
    howToUse: 'Start in the Hub to launch the hero track into Cinema, browse spotlight updates, or open Music, Wisdom, Journal, or MetaDJai.',
    tips: ['Enter Cinema launches the hero track + visuals', 'Wisdom Spotlight surfaces the latest Thought, Guide, and Reflection', 'Platform Pulse tracks recent updates'],
  },
  music: {
    title: 'Music Experience',
    description: 'Browse original music organized into music collections that grow organically.',
    howToUse: 'Open the Music panel and use the Library tab to browse Featured and collections. Select a collection to see its track list (Start Here / Shuffle) and use "About Collection" for the story.',
    tips: ['Featured surfaces 10 rotating tracks for quick discovery', 'Recently Played keeps your last 50 plays on this device', 'Track options (•••) include Add to Queue and Add to Playlist'],
  },
  cinema: {
    title: 'Cinema (Visual Experience)',
    description: 'The visual experience layer—immersive scenes and visualizers synchronized with audio playback. Three modes: 3D visualizers, 2D visualizers, and video scenes.',
    howToUse: 'Tap the Cinema button in the navigation to open. Choose from audio-reactive visualizers (respond to music frequency in real-time) or video scenes (ambient looping atmospheres).',
    tips: ['Controls auto-hide after 3.5 seconds', 'Each collection has recommended visuals', '3D visualizers: Cosmos, Black Hole, Space Travel, Disco Ball', '2D visualizers: Pixel Portal, 8-Bit Adventure, Synthwave Horizon'],
  },
  dream: {
    title: 'Dream (AI Avatar)',
    description: 'Real-time AI avatar transformation — your webcam feed becomes a stylized avatar using Daydream/StreamDiffusion. Currently runs in avatar mode with a default visual style.',
    howToUse: 'Open Cinema first, then enable Dream from the Cinema controls. Grant webcam permission when prompted. Your feed transforms into an AI-generated avatar in real-time.',
    tips: ['Requires Cinema to be open', 'Webcam permission needed', 'Currently uses a default avatar style — custom prompting coming soon', 'Works best with good lighting and clear background'],
  },
  wisdom: {
    title: 'Wisdom Hub',
    description: 'Long-form content including Thoughts, Guides, and Reflections from MetaDJ.',
    howToUse: 'Open Wisdom from the navigation, then choose Thoughts (essays), Guides (how‑to), or Reflections (biography).',
    tips: ['Clean reading experience with custom typography', 'Wisdom reopens to your last‑visited section'],
  },
  journal: {
    title: 'Journal',
    description: 'Private, local-first space for ideas, drafts, and reflections.',
    howToUse: 'Open Journal from the navigation, then add entries with the editor or voice dictation.',
    tips: ['Entries stay local in your browser', 'Rich-text formatting toolbar is built in', 'Voice dictation caps at 60 seconds'],
  },
  queue: {
    title: 'Queue & Playback',
    description: 'Personal listening queue with priority lane for your picks.',
    howToUse: 'Click the queue icon in the player controls. Add tracks via hover controls. Drag to reorder. Your picks play before automated queue.',
    tips: ['Queue persists for 24 hours', 'Reset Order returns to curated collection flow', 'Drag tracks to reorder your queue', 'Your queue is local to your device'],
  },
  search: {
    title: 'Search',
    description: 'Find any track instantly by title, collection, or genre.',
    howToUse: 'Press Ctrl/Cmd + / to focus search. Type to see real-time results. Play or queue directly from results.',
    tips: ['Search by collection name: "majestic" finds Majestic Ascent tracks', 'Search by genre: "epic" or "ambient" finds matching tracks'],
  },
  metadjai: {
    title: 'MetaDJai',
    description: 'AI-driven creative companion for navigation, ideation, and music-first support when you ask for it.',
    howToUse: 'Open MetaDJai from the header (desktop) or bottom nav (mobile). Ask about the platform, request creative help, or explore ideas.',
    tips: ['I\'m context-aware of what you\'re listening to', 'Try Quick Actions for structured prompts', 'Ask for playback or queue changes when you want music-first help'],
  },
  shortcuts: {
    title: 'Keyboard Shortcuts',
    description: 'Quick keyboard controls for power users (WCAG 2.1.4 compliant with Ctrl/Cmd modifiers).',
    howToUse: 'Press ? to see all shortcuts. Most require Ctrl/Cmd modifier: Ctrl/Cmd + Space for play/pause, Ctrl/Cmd + arrows for navigation.',
    tips: ['Ctrl/Cmd + / focuses search', 'Ctrl/Cmd + M toggles mute', 'Esc closes modals', '? shows help (no modifier needed)'],
  },
}

const platformHelpSchema = z.object({
  feature: z.enum(['hub', 'music', 'cinema', 'dream', 'wisdom', 'journal', 'queue', 'search', 'metadjai', 'shortcuts', 'overview']).describe('The platform feature to get help about'),
})

export const getPlatformHelp = {
  description: 'Get contextual help about MetaDJ Nexus platform features. Use when users ask how to navigate, find features, or need guidance.',
  inputSchema: platformHelpSchema,
  execute: async ({ feature }: { feature: keyof typeof PLATFORM_FEATURES | 'overview' }) => {
    let result;

    if (feature === 'overview') {
      result = {
        title: 'MetaDJ Nexus Overview',
        description: 'Your platform hub for MetaDJ\'s evolving ecosystem—Hub, Music, Cinema, Wisdom, Journal, and MetaDJai as your creative companion. Note: MetaDJ Nexus is currently free to use.',
        surfaces: Object.entries(PLATFORM_FEATURES).map(([key, info]) => ({
          key,
          title: info.title,
          description: info.description,
        })),
      }
    } else {
      result = PLATFORM_FEATURES[feature] || { error: 'Feature not found' }
    }

    // SECURITY: Validate result size before returning
    return sanitizeAndValidateToolResult(result, 'getPlatformHelp')
  },
}

/**
 * Track Recommendations Tool
 *
 * Suggests tracks based on mood, energy level, or similarity to a reference track.
 */
const recommendationsSchema = z.object({
  mood: z.enum(['focus', 'energy', 'relaxation', 'epic', 'creative', 'ambient']).optional().describe('Mood to match'),
  energyLevel: z.enum(['low', 'medium', 'high']).optional().describe('Desired energy level'),
  similarTo: z.string().optional().describe('Track title to find similar tracks'),
  collection: z.string().optional().describe('Collection to filter recommendations from'),
  limit: z.number().optional().describe('Maximum number of recommendations (default 5)'),
})

// Mood to genre mapping for recommendations
const MOOD_GENRES: Record<string, string[]> = {
  focus: ['ambient', 'downtempo', 'electronic'],
  energy: ['electronic', 'progressive', 'high-energy'],
  relaxation: ['ambient', 'atmospheric', 'chill'],
  epic: ['orchestral', 'cinematic', 'epic'],
  creative: ['electronic', 'progressive', 'experimental'],
  ambient: ['ambient', 'atmospheric', 'drone'],
}

export const getRecommendations = {
  description: 'Get track recommendations based on mood, energy level, or similarity. Use when users want music suggestions or ask "what should I listen to?"',
  inputSchema: recommendationsSchema,
  execute: async ({
    mood,
    energyLevel,
    similarTo,
    collection,
    limit = 5,
  }: {
    mood?: keyof typeof MOOD_GENRES
    energyLevel?: 'low' | 'medium' | 'high'
    similarTo?: string
    collection?: string
    limit?: number
  }) => {
    // SECURITY: Enforce maximum limit
    const effectiveLimit = Math.min(limit, MAX_RECOMMENDATIONS)

    // SECURITY: Sanitize string inputs
    const sanitizedSimilarTo = similarTo?.slice(0, 200)
    const sanitizedCollection = collection?.slice(0, 100)

    let candidates: Track[] = [...trackList]

    // Filter by collection if specified
    if (sanitizedCollection) {
      const collectionLower = sanitizedCollection.toLowerCase()
      candidates = candidates.filter(t =>
        t.collection?.toLowerCase().includes(collectionLower)
      )
    }

    // Score tracks based on criteria
    const scored = candidates.map(track => {
      let score = 0

      // Mood matching
      if (mood && MOOD_GENRES[mood]) {
        const moodGenres = MOOD_GENRES[mood]
        const matchingGenres = track.genres.filter(g =>
          moodGenres.some(mg => g.toLowerCase().includes(mg.toLowerCase()))
        )
        score += matchingGenres.length * 2
      }

      // Energy level matching (using BPM as proxy)
      if (energyLevel && track.bpm) {
        const bpm = track.bpm
        if (energyLevel === 'low' && bpm < 100) score += 3
        else if (energyLevel === 'medium' && bpm >= 100 && bpm <= 130) score += 3
        else if (energyLevel === 'high' && bpm > 130) score += 3
      }

      // Similarity matching
      if (sanitizedSimilarTo) {
        const refTrack = trackList.find(t =>
          t.title.toLowerCase().includes(sanitizedSimilarTo.toLowerCase())
        )
        if (refTrack && track.id !== refTrack.id) {
          // Same collection bonus
          if (track.collection === refTrack.collection) score += 2
          // Shared genres bonus
          const sharedGenres = track.genres.filter(g => refTrack.genres.includes(g))
          score += sharedGenres.length
          // Similar BPM bonus
          if (track.bpm && refTrack.bpm && Math.abs(track.bpm - refTrack.bpm) <= 10) {
            score += 1
          }
        }
      }

      return { track, score }
    })

    // Sort by score and return top results
    const recommendations = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, effectiveLimit)
      .map(s => ({
        id: s.track.id,
        title: s.track.title,
        collection: s.track.collection,
        genres: s.track.genres,
        bpm: s.track.bpm,
        key: s.track.key,
        matchScore: s.score,
      }))

    let result;

    // If no matches, return random selection from candidates
    if (recommendations.length === 0) {
      const shuffled = shuffleTracks(candidates).slice(0, effectiveLimit)
      result = {
        recommendations: shuffled.map(t => ({
          id: t.id,
          title: t.title,
          collection: t.collection,
          genres: t.genres,
          bpm: t.bpm,
          key: t.key,
        })),
        note: 'No exact matches found. Here are some suggestions to explore.',
      }
    } else {
      result = { recommendations }
    }

    // SECURITY: Validate result size before returning
    return sanitizeAndValidateToolResult(result, 'getRecommendations')
  },
}

/**
 * Zuberant Context Tool
 *
 * Searches the Zuberant knowledge base for information about MetaDJ, Zuberant studio,
 * and the broader ecosystem vision. Uses keyword matching to find relevant entries.
 */

// Knowledge base types
interface KnowledgeEntry {
  id: string
  title: string
  content: string
  keywords: string[]
  synonyms?: string[]
}

interface KnowledgeCategory {
  category: string
  title: string
  description: string
  entries: KnowledgeEntry[]
}

/**
 * Combined knowledge base from JSON files in src/data/knowledge/
 *
 * FRESHNESS METADATA PATTERN:
 * Each knowledge JSON file includes a `_meta` object at the top level with:
 * - lastUpdated: ISO date string (YYYY-MM-DD) of last content sync
 * - version: Semantic version of the knowledge schema
 * - source: Origin of the content (e.g., "Brand Corpus")
 *
 * This metadata enables:
 * - Tracking knowledge base currency
 * - Validating sync with Brand Corpus
 * - Identifying stale content for refresh
 *
 * Update _meta.lastUpdated whenever knowledge content is synchronized
 * from the Brand Corpus or manually updated.
 */
const KNOWLEDGE_BASE: KnowledgeCategory[] = [
  metadjKnowledge as KnowledgeCategory,
  zuberantKnowledge as KnowledgeCategory,
  ecosystemKnowledge as KnowledgeCategory,
  philosophyKnowledge as KnowledgeCategory,
  identityKnowledge as KnowledgeCategory,
  workflowsKnowledge as KnowledgeCategory,
]

type FlatKnowledgeEntry = { entry: KnowledgeEntry; category: string }
type EmbeddedKnowledgeEntry = FlatKnowledgeEntry & { embedding: number[] }

const FLAT_KNOWLEDGE_ENTRIES: FlatKnowledgeEntry[] = KNOWLEDGE_BASE.flatMap((kb) =>
  kb.entries.map((entry) => ({ entry, category: kb.category }))
)

let knowledgeEmbeddingsCache: EmbeddedKnowledgeEntry[] | null = null
let knowledgeEmbeddingsPromise: Promise<EmbeddedKnowledgeEntry[]> | null = null

const EMBEDDING_MODEL_ID = 'text-embedding-3-small'
const MAX_EMBED_TEXT_LENGTH = 2000

function buildEmbeddingText(entry: KnowledgeEntry): string {
  const text = `${entry.title}\n\n${entry.content}`
  return text.slice(0, MAX_EMBED_TEXT_LENGTH)
}

function createEmbeddingsOpenAIClient(): ReturnType<typeof createOpenAI> | null {
  try {
    const env = getServerEnv()
    if (env.OPENAI_API_KEY) {
      return createOpenAI({ apiKey: env.OPENAI_API_KEY })
    }
  } catch {
    // ignore
  }

  return null
}

async function loadKnowledgeEmbeddings(): Promise<EmbeddedKnowledgeEntry[]> {
  if (knowledgeEmbeddingsCache) return knowledgeEmbeddingsCache
  if (knowledgeEmbeddingsPromise) return knowledgeEmbeddingsPromise

  knowledgeEmbeddingsPromise = (async () => {
    const openaiClient = createEmbeddingsOpenAIClient()

    if (!openaiClient) {
      knowledgeEmbeddingsCache = []
      return knowledgeEmbeddingsCache
    }

    try {
      const model = openaiClient.embedding(EMBEDDING_MODEL_ID)
      const values = FLAT_KNOWLEDGE_ENTRIES.map(({ entry }) => buildEmbeddingText(entry))
      const { embeddings } = await embedMany({ model, values })

      knowledgeEmbeddingsCache = FLAT_KNOWLEDGE_ENTRIES.map((item, index) => ({
        ...item,
        embedding: embeddings[index] ?? [],
      }))

      return knowledgeEmbeddingsCache
    } catch (error) {
      logger.warn('Semantic knowledge embeddings failed; falling back to keywords', {
        error: String(error),
      })
      knowledgeEmbeddingsCache = []
      return knowledgeEmbeddingsCache
    } finally {
      knowledgeEmbeddingsPromise = null
    }
  })()

  return knowledgeEmbeddingsPromise
}

/**
 * Pre-warm knowledge embeddings on server startup
 *
 * Call this during server initialization to avoid cold-start latency
 * on the first user query. Safe to call multiple times (idempotent).
 *
 * @returns Promise that resolves when embeddings are loaded
 *
 * @example
 * ```typescript
 * // In instrumentation.ts or server startup
 * import { warmupKnowledgeEmbeddings } from '@/lib/ai/tools'
 * await warmupKnowledgeEmbeddings()
 * ```
 */
export async function warmupKnowledgeEmbeddings(): Promise<void> {
  const startTime = Date.now()
  try {
    const embeddings = await loadKnowledgeEmbeddings()
    const durationMs = Date.now() - startTime
    if (embeddings.length > 0) {
      logger.info('Knowledge embeddings pre-warmed successfully', {
        entriesLoaded: embeddings.length,
        durationMs,
      })
    } else {
      logger.info('Knowledge embeddings warmup skipped (no OpenAI key or empty)', {
        durationMs,
      })
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    logger.warn('Failed to pre-warm knowledge embeddings, will load on first query', {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    })
  }
}

// Maximum number of knowledge results
const MAX_KNOWLEDGE_RESULTS = 5

const zuberantContextSchema = z.object({
  query: z.string().describe('What the user wants to know about MetaDJ, Zuberant, or the broader ecosystem vision'),
  topic: z.enum(['metadj', 'zuberant', 'ecosystem', 'philosophy', 'identity', 'workflows', 'all']).optional().describe('Narrow search to specific topic area'),
})

export const getZuberantContext = {
  description: 'Search the Zuberant knowledge base for information about MetaDJ (artist/DJ), Zuberant (studio), the broader ecosystem vision, philosophy, identity, and creative workflows. Use this to answer "who is...", "what is...", "how do I...", or to find creative protocols like "deep work" or "brainstorming".',
  inputSchema: zuberantContextSchema,
  execute: async ({ query, topic }: { query: string; topic?: 'metadj' | 'zuberant' | 'ecosystem' | 'philosophy' | 'identity' | 'workflows' | 'all' }) => {
    // SECURITY: Sanitize and limit query length
    const normalizeSearchToken = (value: string) => value.toLowerCase()
    const q = normalizeSearchToken(query).slice(0, 200)
    const searchTopic = topic ?? 'all'

    // Determine which categories to search
    const categoriesToSearch = searchTopic === 'all'
      ? KNOWLEDGE_BASE
      : KNOWLEDGE_BASE.filter(kb => kb.category === searchTopic)

    // Optional semantic similarity scores (in-memory embeddings, no vector DB)
    const semanticScores = new Map<string, number>()
    try {
      const embeddedEntries = await loadKnowledgeEmbeddings()
      if (embeddedEntries.length > 0) {
        const openaiClient = createEmbeddingsOpenAIClient()
        if (openaiClient) {
          const model = openaiClient.embedding(EMBEDDING_MODEL_ID)
          const { embedding: queryEmbedding } = await embed({ model, value: q })
          const allowedCategories = new Set(categoriesToSearch.map(kb => kb.category))

          for (const item of embeddedEntries) {
            if (!allowedCategories.has(item.category) || item.embedding.length === 0) continue
            const similarity = cosineSimilarity(queryEmbedding, item.embedding)
            semanticScores.set(item.entry.id, similarity)
          }
        }
      }
    } catch {
      // ignore semantic failures; keyword search will still work
    }

    // Score each entry based on query match
    const scoredEntries: { entry: KnowledgeEntry; category: string; score: number }[] = []

    for (const kb of categoriesToSearch) {
      for (const entry of kb.entries) {
        let score = 0

        // Check title match (highest weight)
        if (entry.title.toLowerCase().includes(q)) {
          score += 10
        }

        // Check keyword matches
        const queryWords = q.split(/\s+/).filter(w => w.length > 2)
        for (const keyword of entry.keywords) {
          const normalizedKeyword = normalizeSearchToken(keyword)
          if (q.includes(normalizedKeyword)) {
            score += 5
          }
          // Partial keyword match
          for (const word of queryWords) {
            if (normalizedKeyword.includes(word) || word.includes(normalizedKeyword)) {
              score += 2
            }
          }
        }

        // Check synonyms
        if (entry.synonyms) {
          for (const synonym of entry.synonyms) {
            const normalizedSynonym = normalizeSearchToken(synonym)
            if (q.includes(normalizedSynonym)) {
              score += 4
            }
          }
        }

        // Check content match (lower weight)
        if (entry.content.toLowerCase().includes(q)) {
          score += 3
        }

        // Partial content match for individual query words
        for (const word of queryWords) {
          if (entry.content.toLowerCase().includes(word)) {
            score += 1
          }
        }

        const semanticScore = semanticScores.get(entry.id) ?? 0
        const combinedScore = score + semanticScore * 8

        if (combinedScore > 0) {
          scoredEntries.push({ entry, category: kb.category, score: combinedScore })
        }
      }
    }

    // Sort by score and take top results
    const topResults = scoredEntries
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_KNOWLEDGE_RESULTS)
      .map(({ entry, category }) => ({
        category,
        title: entry.title,
        content: entry.content,
      }))

    let result;

    if (topResults.length === 0) {
      // Return a helpful fallback
      result = {
        found: false,
        suggestion: 'No specific matches found. Try asking about: who MetaDJ is, what Zuberant does, the broader ecosystem vision, music collections, the Synthetic Orchaistra method, Digital Jockey, AI philosophy, purest vibes, or creative principles.',
        availableTopics: KNOWLEDGE_BASE.map(kb => ({
          topic: kb.category,
          title: kb.title,
          description: kb.description,
        })),
      }
    } else {
      result = {
        found: true,
        results: topResults,
        totalMatches: scoredEntries.length,
      }
    }

    // SECURITY: Validate result size before returning
    return sanitizeAndValidateToolResult(result, 'getZuberantContext')
  },
}

/**
 * Wisdom Content Tool
 *
 * Returns full Wisdom content for a specific Thought/Guide/Reflection.
 * Use when users ask about "this essay/guide/reflection" or want a summary.
 */
const wisdomContentSchema = z.object({
  section: z.enum(['thoughts', 'guides', 'reflections']).describe('Wisdom section to fetch from'),
  id: z.string().optional().describe('Optional content id. If omitted, returns a list of available items.'),
})

export const getWisdomContent = {
  description: 'Get Wisdom content (Thoughts, Guides, or Reflections) by section and id. Use to read the full text when users want a summary or refer to the current Wisdom page.',
  inputSchema: wisdomContentSchema,
  execute: async ({ section, id }: { section: 'thoughts' | 'guides' | 'reflections'; id?: string }) => {
    const safeId = id?.slice(0, 120)

    if (!safeId) {
      const list =
        section === 'thoughts'
          ? wisdomContent.thoughtsPosts.map((post) => ({
              id: post.id,
              title: post.title,
              excerpt: post.excerpt,
              date: post.date,
            }))
          : section === 'guides'
            ? wisdomContent.guides.map((guide) => ({
                id: guide.id,
                title: guide.title,
                excerpt: guide.excerpt,
                category: guide.category,
                sectionCount: guide.sections.length,
              }))
            : wisdomContent.reflections.map((reflection) => ({
                id: reflection.id,
                title: reflection.title,
                excerpt: reflection.excerpt,
                sectionCount: reflection.sections.length,
              }))

      return sanitizeAndValidateToolResult({ section, items: list }, 'getWisdomContent')
    }

    if (section === 'thoughts') {
      const post = wisdomContent.thoughtsPosts.find((p) => p.id === safeId)
      if (!post) return sanitizeAndValidateToolResult({ found: false }, 'getWisdomContent')
      const content = post.content.filter((p) => !WISDOM_SIGNOFF_REGEX.test(p.trim()))
      return sanitizeAndValidateToolResult(
        {
          found: true,
          section,
          id: post.id,
          title: post.title,
          excerpt: post.excerpt,
          date: post.date,
          content,
        },
        'getWisdomContent'
      )
    }

    if (section === 'guides') {
      const guide = wisdomContent.guides.find((g) => g.id === safeId)
      if (!guide) return sanitizeAndValidateToolResult({ found: false }, 'getWisdomContent')
      const sections = guide.sections.map((s) => ({
        heading: s.heading,
        paragraphs: s.paragraphs.filter((p) => !WISDOM_SIGNOFF_REGEX.test(p.trim())),
      }))
      return sanitizeAndValidateToolResult(
        {
          found: true,
          section,
          id: guide.id,
          title: guide.title,
          excerpt: guide.excerpt,
          category: guide.category,
          sections,
        },
        'getWisdomContent'
      )
    }

    const reflection = wisdomContent.reflections.find((r) => r.id === safeId)
    if (!reflection) return sanitizeAndValidateToolResult({ found: false }, 'getWisdomContent')
    const sections = reflection.sections.map((s) => ({
      heading: s.heading,
      paragraphs: s.paragraphs.filter((p) => !WISDOM_SIGNOFF_REGEX.test(p.trim())),
    }))

    return sanitizeAndValidateToolResult(
      {
        found: true,
        section,
        id: reflection.id,
        title: reflection.title,
        excerpt: reflection.excerpt,
        sections,
      },
      'getWisdomContent'
    )
  },
}

/**
 * Propose Playback Tool (Active Control)
 *
 * Allows the AI to propose playback actions like playing a track or pausing.
 * This tool returns a proposal that the UI renders as a "Confirm" card.
 * The AI cannot directly execute playback; the user must confirm in the UI.
 */
const playbackSchema = z.object({
  action: z.enum(['play', 'pause', 'next', 'prev', 'queue']),
  searchQuery: z.string().optional().describe('Search query to find a track to play or queue'),
  context: z.string().optional().describe('Reasoning or context for the action'),
})

export const proposePlayback = {
  description: 'Propose a media playback action. Use this to PLAY music, PAUSE, SKIP, or ADD TO QUEUE. If the user asks to "play [song]", use this tool with action="play" and searchQuery="[song]". The user will see a confirmation card before it happens.',
  inputSchema: playbackSchema,
  execute: async ({ action, searchQuery, context }: { action: 'play' | 'pause' | 'next' | 'prev' | 'queue'; searchQuery?: string; context?: string }) => {
    let proposal: {
      type: 'playback',
      action: typeof action,
      trackId?: string,
      trackTitle?: string,
      trackArtist?: string,
      context?: string
    } = {
      type: 'playback',
      action,
      context,
    }

    if (searchQuery && (action === 'play' || action === 'queue')) {
      const rawQuery = searchQuery.slice(0, 200).trim()
      const q = rawQuery.toLowerCase()

      // Find best match in tracks
      const bestTrack = trackList
        .filter(t =>
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
        const bestCollection = collectionList.find(c => c.title.toLowerCase().includes(q))
        if (bestCollection) {
          // Play first track of this collection
          const firstCollectionTrack = trackList.find(t => t.collection === bestCollection.title)

          if (firstCollectionTrack) {
            proposal.context = proposal.context ?? `Playing from ${bestCollection.title}`
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
        proposal.context = proposal.context ? `${proposal.context} ${notFoundMessage}` : notFoundMessage
      }
    }

    // Return the proposal. The UI will catch this tool result and render the card.
    return sanitizeAndValidateToolResult(proposal, 'proposePlayback')
  },
}

/**
 * Propose Queue Set Tool (Active Control)
 *
 * Allows the AI to propose multi-track queue changes (replace or append).
 * Returns a proposal that the UI renders as a confirmation card.
 */
const queueSetSchema = z.object({
  trackIds: z.array(z.string()).optional().describe('Ordered list of track IDs to queue'),
  trackTitles: z.array(z.string()).optional().describe('Ordered list of track titles to queue'),
  collection: z.string().optional().describe('Collection name to pull tracks from'),
  limit: z.number().int().min(1).max(MAX_ACTIVE_CONTROL_TRACKS).optional().describe('Maximum number of tracks to include'),
  mode: z.enum(['replace', 'append']).optional().describe('Replace the queue or append to it'),
  autoplay: z.boolean().optional().describe('Start playback after queuing tracks'),
  context: z.string().optional().describe('Reasoning or context for the action'),
})

export const proposeQueueSet = {
  description: 'Propose setting multiple tracks in the queue. Use this when the user asks to "queue this playlist", "line these tracks up", or requests a multi-track sequence. The user will confirm before anything changes.',
  inputSchema: queueSetSchema,
  execute: async ({
    trackIds,
    trackTitles,
    collection,
    limit,
    mode,
    autoplay,
    context,
  }: {
    trackIds?: string[];
    trackTitles?: string[];
    collection?: string;
    limit?: number;
    mode?: 'replace' | 'append';
    autoplay?: boolean;
    context?: string;
  }) => {
    const resolved = resolveTracksForProposal({
      trackIds,
      trackTitles,
      collection,
      limit,
    });

    let nextContext = context;
    if (!nextContext && resolved.collectionTitle) {
      nextContext = `Queue ${resolved.collectionTitle}${mode === 'append' ? ' after the current queue' : ''}.`;
    }
    if (!nextContext && resolved.trackIds.length === 0) {
      nextContext = 'No matching tracks found in the catalog.';
    }

    const proposal = {
      type: 'queue-set' as const,
      action: 'set' as const,
      trackIds: resolved.trackIds,
      trackTitles: resolved.trackTitles,
      mode,
      autoplay,
      context: nextContext,
    };

    return sanitizeAndValidateToolResult(proposal, 'proposeQueueSet')
  },
}

/**
 * Propose Playlist Tool (Active Control)
 *
 * Allows the AI to propose playlist creation with optional queueing.
 */
const playlistSchema = z.object({
  name: z.string().min(1).max(100).describe('Playlist name'),
  trackIds: z.array(z.string()).optional().describe('Ordered list of track IDs to include'),
  trackTitles: z.array(z.string()).optional().describe('Ordered list of track titles to include'),
  collection: z.string().optional().describe('Collection name to pull tracks from'),
  limit: z.number().int().min(1).max(MAX_ACTIVE_CONTROL_TRACKS).optional().describe('Maximum number of tracks to include'),
  queueMode: z.enum(['replace', 'append', 'none']).optional().describe('Queue these tracks after creating the playlist'),
  autoplay: z.boolean().optional().describe('Start playback after queuing'),
  context: z.string().optional().describe('Reasoning or context for the action'),
})

export const proposePlaylist = {
  description: 'Propose creating a playlist. Use this when the user asks to "make a playlist", "save this set", or wants a named collection. The user will confirm before it is created.',
  inputSchema: playlistSchema,
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
    name: string;
    trackIds?: string[];
    trackTitles?: string[];
    collection?: string;
    limit?: number;
    queueMode?: 'replace' | 'append' | 'none';
    autoplay?: boolean;
    context?: string;
  }) => {
    const safeName = name.trim().slice(0, 100);
    const resolved = resolveTracksForProposal({
      trackIds,
      trackTitles,
      collection,
      limit,
    });

    let nextContext = context;
    if (!nextContext && resolved.collectionTitle) {
      nextContext = `Create "${safeName}" from ${resolved.collectionTitle}.`;
    }
    if (!nextContext && resolved.trackIds.length === 0) {
      nextContext = `Create "${safeName}" (no matching tracks found).`;
    }

    const proposal = {
      type: 'playlist' as const,
      action: 'create' as const,
      name: safeName,
      trackIds: resolved.trackIds,
      trackTitles: resolved.trackTitles,
      queueMode,
      autoplay,
      context: nextContext,
    };

    return sanitizeAndValidateToolResult(proposal, 'proposePlaylist')
  },
}

/**
 * Propose Surface Tool (Active Control)
 *
 * Allows the AI to propose simple UI navigation actions that the user must confirm:
 * - openWisdom: open Wisdom overlay
 * - openQueue: open Queue overlay
 * - focusSearch: focus the Search input
 * - openMusicPanel: open the Music panel (optional tab)
 */
const surfaceSchema = z.object({
  action: z.enum(['openWisdom', 'openQueue', 'focusSearch', 'openMusicPanel']),
  tab: z.enum(['browse', 'queue', 'playlists']).optional().describe('Optional music panel tab to open'),
  context: z.string().optional().describe('Reasoning or context for the action'),
})

export const proposeSurface = {
  description: 'Propose a UI navigation action like opening Wisdom, opening Queue, focusing Search, or opening the Music panel. The user will see a confirmation card before it happens.',
  inputSchema: surfaceSchema,
  execute: async ({ action, tab, context }: { action: 'openWisdom' | 'openQueue' | 'focusSearch' | 'openMusicPanel'; tab?: 'browse' | 'queue' | 'playlists'; context?: string }) => {
    const proposal = {
      type: 'ui' as const,
      action,
      tab,
      context,
    }

    return sanitizeAndValidateToolResult(proposal, 'proposeSurface')
  },
}

/**
 * Get tools for the current provider
 *
 * Returns the tools object for streamText/generateText.
 * Includes web_search tool only when explicitly enabled (native OpenAI web search).
 *
 * @param provider 'openai' | 'anthropic' | 'google' | 'xai'
 * @param options Provider capabilities override
 * @returns Tools object with provider-appropriate tools
 */
export function getTools(
  provider: 'openai' | 'anthropic' | 'google' | 'xai',
  options?: { webSearchAvailable?: boolean }
) {
  // Base tools available to all providers
  const baseTools = {
    searchCatalog,
    getPlatformHelp,
    getWisdomContent,
    getRecommendations,
    getZuberantContext,
    proposePlayback,
    proposeQueueSet,
    proposePlaylist,
    proposeSurface,
  }

  const webSearchAvailable = provider === 'openai' && (options?.webSearchAvailable ?? true)

  // OpenAI has native web search capability when enabled
  if (webSearchAvailable) {
    return {
      ...baseTools,
      // OpenAI native web search tool - enables real-time web search for current information
      // The AI will use this tool when users ask about current events, recent news,
      // or information that may not be in its training data
      web_search: openai.tools.webSearch(),
    }
  }

  // Anthropic and other providers get base tools only
  return baseTools
}
