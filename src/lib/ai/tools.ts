/**
 * AI Tools
 *
 * Re-exports from modular tool files.
 * This file maintains backwards compatibility for existing imports.
 *
 * @module lib/ai/tools
 * @see lib/ai/tools/index for the modular implementation
 */

// Re-export everything from the modular tools directory
export {
  // Utilities
  MAX_TOOL_RESULT_SIZE,
  MAX_SEARCH_RESULTS,
  MAX_RECOMMENDATIONS,
  MAX_ACTIVE_CONTROL_TRACKS,
  DEFAULT_ACTIVE_CONTROL_LIMIT,
  type ToolResultMeta,
  sanitizeAndValidateToolResult,
  safeToolExecute,
  wrapToolsWithErrorHandling,
  normalizeCatalogText,
  levenshteinDistance,
  stringSimilarity,
  fuzzyMatch,
  // Music helpers
  findTrackByTitle,
  findCollectionByName,
  resolveTracksForProposal,
  // Tools
  searchCatalog,
  getPlatformHelp,
  getRecommendations,
  getZuberantContext,
  warmupKnowledgeEmbeddings,
  getWisdomContent,
  proposePlayback,
  proposeQueueSet,
  proposePlaylist,
  proposeSurface,
  // Provider
  getTools,
} from '@/lib/ai/tools/index'
