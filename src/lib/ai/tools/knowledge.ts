/**
 * Zuberant Context Tool
 *
 * Searches the Zuberant knowledge base for information about MetaDJ, Zuberant studio,
 * and the broader ecosystem vision. Uses keyword matching and optional semantic
 * embeddings to find relevant entries.
 *
 * @module lib/ai/tools/knowledge
 */

import { createOpenAI } from '@ai-sdk/openai'
import { cosineSimilarity, embed, embedMany } from 'ai'
import { z } from 'zod'
import ecosystemKnowledge from '@/data/knowledge/ecosystem.json'
import identityKnowledge from '@/data/knowledge/identity.json'
import metadjKnowledge from '@/data/knowledge/metadj.json'
import philosophyKnowledge from '@/data/knowledge/philosophy.json'
import workflowsKnowledge from '@/data/knowledge/workflows.json'
import zuberantKnowledge from '@/data/knowledge/zuberant.json'
import { sanitizeAndValidateToolResult } from '@/lib/ai/tools/utils'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE BASE TYPES
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE BASE CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

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

/**
 * Knowledge Staleness Threshold
 *
 * Number of days before knowledge is considered stale.
 * When knowledge files exceed this age, a warning is logged
 * to prompt content refresh from the Brand Corpus.
 */
const KNOWLEDGE_STALENESS_DAYS = 90

/**
 * Knowledge files with their metadata for staleness checking
 */
interface KnowledgeFileWithMeta {
  name: string
  _meta?: {
    lastUpdated?: string
    version?: string
    source?: string
  }
}

const KNOWLEDGE_FILES_WITH_META: KnowledgeFileWithMeta[] = [
  {
    name: 'metadj',
    ...(metadjKnowledge as unknown as { _meta?: KnowledgeFileWithMeta['_meta'] }),
  },
  {
    name: 'zuberant',
    ...(zuberantKnowledge as unknown as {
      _meta?: KnowledgeFileWithMeta['_meta']
    }),
  },
  {
    name: 'ecosystem',
    ...(ecosystemKnowledge as unknown as {
      _meta?: KnowledgeFileWithMeta['_meta']
    }),
  },
  {
    name: 'philosophy',
    ...(philosophyKnowledge as unknown as {
      _meta?: KnowledgeFileWithMeta['_meta']
    }),
  },
  {
    name: 'identity',
    ...(identityKnowledge as unknown as {
      _meta?: KnowledgeFileWithMeta['_meta']
    }),
  },
  {
    name: 'workflows',
    ...(workflowsKnowledge as unknown as {
      _meta?: KnowledgeFileWithMeta['_meta']
    }),
  },
]

/**
 * Check knowledge files for staleness and log warnings
 * Runs once at module initialization
 */
function checkKnowledgeStaleness(): void {
  const now = new Date()
  const staleFiles: string[] = []
  const missingMetaFiles: string[] = []

  for (const file of KNOWLEDGE_FILES_WITH_META) {
    if (!file._meta?.lastUpdated) {
      missingMetaFiles.push(file.name)
      continue
    }

    const lastUpdated = new Date(file._meta.lastUpdated)
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceUpdate > KNOWLEDGE_STALENESS_DAYS) {
      staleFiles.push(`${file.name} (${daysSinceUpdate} days old)`)
    }
  }

  if (missingMetaFiles.length > 0) {
    logger.warn('[Knowledge] Files missing _meta.lastUpdated', {
      files: missingMetaFiles,
    })
  }

  if (staleFiles.length > 0) {
    logger.warn(
      `[Knowledge] Stale content detected (>${KNOWLEDGE_STALENESS_DAYS} days old)`,
      {
        staleFiles,
        action: 'Sync from Brand Corpus recommended',
      }
    )
  }
}

// Run staleness check at module initialization
checkKnowledgeStaleness()

// ─────────────────────────────────────────────────────────────────────────────
// EMBEDDINGS
// ─────────────────────────────────────────────────────────────────────────────

type FlatKnowledgeEntry = { entry: KnowledgeEntry; category: string }
type EmbeddedKnowledgeEntry = FlatKnowledgeEntry & { embedding: number[] }

const FLAT_KNOWLEDGE_ENTRIES: FlatKnowledgeEntry[] = KNOWLEDGE_BASE.flatMap(
  (kb) => kb.entries.map((entry) => ({ entry, category: kb.category }))
)

let knowledgeEmbeddingsCache: EmbeddedKnowledgeEntry[] | null = null
let knowledgeEmbeddingsPromise: Promise<EmbeddedKnowledgeEntry[]> | null = null

const EMBEDDING_MODEL_ID = 'text-embedding-3-small'
const MAX_EMBED_TEXT_LENGTH = 2000

/** Check if running on server (Node.js environment) */
const isServer = typeof window === 'undefined'

interface CachedEmbeddings {
  hash: string
  model: string
  embeddings: { id: string; embedding: number[] }[]
}

/** Compute content hash for cache invalidation (server-only) */
async function computeKnowledgeHash(): Promise<string> {
  if (!isServer) return ''
  try {
    const { createHash } = await import('crypto')
    const content = FLAT_KNOWLEDGE_ENTRIES.map(({ entry }) =>
      `${entry.id}:${entry.title}:${entry.content}`
    ).join('|')
    return createHash('sha256').update(content).digest('hex').slice(0, 16)
  } catch {
    return ''
  }
}

/** Get cache file path (server-only) */
async function getCacheFilePath(): Promise<string | null> {
  if (!isServer) return null
  try {
    const { join } = await import('path')
    return join(process.cwd(), 'node_modules', '.cache', 'metadj-embeddings', 'knowledge-embeddings.json')
  } catch {
    return null
  }
}

/** Load embeddings from file cache (server-only) */
async function loadCachedEmbeddings(): Promise<CachedEmbeddings | null> {
  if (!isServer) return null
  try {
    const cacheFile = await getCacheFilePath()
    if (!cacheFile) return null
    const { existsSync, readFileSync } = await import('fs')
    if (!existsSync(cacheFile)) return null
    const data = readFileSync(cacheFile, 'utf-8')
    return JSON.parse(data) as CachedEmbeddings
  } catch {
    return null
  }
}

/** Save embeddings to file cache (server-only) */
async function saveCachedEmbeddings(embeddings: EmbeddedKnowledgeEntry[]): Promise<void> {
  if (!isServer) return
  try {
    const cacheFile = await getCacheFilePath()
    if (!cacheFile) return
    const { mkdirSync, writeFileSync } = await import('fs')
    const { dirname } = await import('path')
    const hash = await computeKnowledgeHash()
    mkdirSync(dirname(cacheFile), { recursive: true })
    const cache: CachedEmbeddings = {
      hash,
      model: EMBEDDING_MODEL_ID,
      embeddings: embeddings.map((e) => ({
        id: e.entry.id,
        embedding: e.embedding,
      })),
    }
    writeFileSync(cacheFile, JSON.stringify(cache), 'utf-8')
    logger.info('Knowledge embeddings cached to disk', {
      entriesCount: embeddings.length,
      cacheFile,
    })
  } catch (error) {
    logger.warn('Failed to cache embeddings to disk', { error: String(error) })
  }
}

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
    const currentHash = await computeKnowledgeHash()

    // Try to load from file cache first (server-only)
    const cached = await loadCachedEmbeddings()
    if (cached && cached.hash === currentHash && cached.model === EMBEDDING_MODEL_ID) {
      // Cache hit - reconstruct embedded entries from cache
      const embeddingMap = new Map(cached.embeddings.map((e) => [e.id, e.embedding]))
      knowledgeEmbeddingsCache = FLAT_KNOWLEDGE_ENTRIES.map((item) => ({
        ...item,
        embedding: embeddingMap.get(item.entry.id) ?? [],
      }))
      logger.info('Knowledge embeddings loaded from disk cache', {
        entriesCount: knowledgeEmbeddingsCache.length,
        hash: currentHash,
      })
      return knowledgeEmbeddingsCache
    }

    const openaiClient = createEmbeddingsOpenAIClient()

    if (!openaiClient) {
      knowledgeEmbeddingsCache = []
      return knowledgeEmbeddingsCache
    }

    try {
      logger.info('Generating new knowledge embeddings (cache miss or content changed)', {
        cacheExists: !!cached,
        hashMatch: cached?.hash === currentHash,
      })

      const model = openaiClient.embedding(EMBEDDING_MODEL_ID)
      const values = FLAT_KNOWLEDGE_ENTRIES.map(({ entry }) =>
        buildEmbeddingText(entry)
      )
      const { embeddings } = await embedMany({ model, values })

      knowledgeEmbeddingsCache = FLAT_KNOWLEDGE_ENTRIES.map((item, index) => ({
        ...item,
        embedding: embeddings[index] ?? [],
      }))

      // Save to file cache for next startup (server-only)
      await saveCachedEmbeddings(knowledgeEmbeddingsCache)

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
      logger.info(
        'Knowledge embeddings warmup skipped (no OpenAI key or empty)',
        {
          durationMs,
        }
      )
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    logger.warn('Failed to pre-warm knowledge embeddings, will load on first query', {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ZUBERANT CONTEXT TOOL
// ─────────────────────────────────────────────────────────────────────────────

// Maximum number of knowledge results
const MAX_KNOWLEDGE_RESULTS = 5

const zuberantContextSchema = z.object({
  query: z
    .string()
    .describe(
      'What the user wants to know about MetaDJ, Zuberant, or the broader ecosystem vision'
    ),
  topic: z
    .enum([
      'metadj',
      'zuberant',
      'ecosystem',
      'philosophy',
      'identity',
      'workflows',
      'all',
    ])
    .optional()
    .describe('Narrow search to specific topic area'),
})

export const getZuberantContext = {
  description:
    'Search the Zuberant knowledge base for information about MetaDJ (artist/DJ), Zuberant (studio), the broader ecosystem vision, philosophy, identity, and creative workflows. Use this to answer "who is...", "what is...", "how do I...", or to find creative protocols like "deep work" or "brainstorming".',
  inputSchema: zuberantContextSchema,
  execute: async ({
    query,
    topic,
  }: {
    query: string
    topic?:
      | 'metadj'
      | 'zuberant'
      | 'ecosystem'
      | 'philosophy'
      | 'identity'
      | 'workflows'
      | 'all'
  }) => {
    // SECURITY: Sanitize and limit query length
    const normalizeSearchToken = (value: string) => value.toLowerCase()
    const q = normalizeSearchToken(query).slice(0, 200)
    const searchTopic = topic ?? 'all'

    // Determine which categories to search
    const categoriesToSearch =
      searchTopic === 'all'
        ? KNOWLEDGE_BASE
        : KNOWLEDGE_BASE.filter((kb) => kb.category === searchTopic)

    // Optional semantic similarity scores (in-memory embeddings, no vector DB)
    const semanticScores = new Map<string, number>()
    try {
      const embeddedEntries = await loadKnowledgeEmbeddings()
      if (embeddedEntries.length > 0) {
        const openaiClient = createEmbeddingsOpenAIClient()
        if (openaiClient) {
          const model = openaiClient.embedding(EMBEDDING_MODEL_ID)
          const { embedding: queryEmbedding } = await embed({ model, value: q })
          const allowedCategories = new Set(
            categoriesToSearch.map((kb) => kb.category)
          )

          for (const item of embeddedEntries) {
            if (
              !allowedCategories.has(item.category) ||
              item.embedding.length === 0
            )
              continue
            const similarity = cosineSimilarity(queryEmbedding, item.embedding)
            semanticScores.set(item.entry.id, similarity)
          }
        }
      }
    } catch {
      // ignore semantic failures; keyword search will still work
    }

    // Score each entry based on query match
    const scoredEntries: {
      entry: KnowledgeEntry
      category: string
      score: number
    }[] = []

    for (const kb of categoriesToSearch) {
      for (const entry of kb.entries) {
        let score = 0

        // Check title match (highest weight)
        if (entry.title.toLowerCase().includes(q)) {
          score += 10
        }

        // Check keyword matches
        const queryWords = q.split(/\s+/).filter((w) => w.length > 2)
        for (const keyword of entry.keywords) {
          const normalizedKeyword = normalizeSearchToken(keyword)
          if (q.includes(normalizedKeyword)) {
            score += 5
          }
          // Partial keyword match
          for (const word of queryWords) {
            if (
              normalizedKeyword.includes(word) ||
              word.includes(normalizedKeyword)
            ) {
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

    let result

    if (topResults.length === 0) {
      // Return a helpful fallback
      result = {
        found: false,
        suggestion:
          'No specific matches found. Try asking about: who MetaDJ is, what Zuberant does, the broader ecosystem vision, music collections, the Synthetic Orchaistra method, Digital Jockey, AI philosophy, purest vibes, or creative principles.',
        availableTopics: KNOWLEDGE_BASE.map((kb) => ({
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
