/**
 * AI Tools
 *
 * Barrel export for all AI tool modules and utilities.
 *
 * @module lib/ai/tools
 */

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Constants
  MAX_TOOL_RESULT_SIZE,
  MAX_SEARCH_RESULTS,
  MAX_RECOMMENDATIONS,
  MAX_ACTIVE_CONTROL_TRACKS,
  DEFAULT_ACTIVE_CONTROL_LIMIT,
  // Types
  type ToolResultMeta,
  // Functions
  sanitizeAndValidateToolResult,
  safeToolExecute,
  wrapToolsWithErrorHandling,
  normalizeCatalogText,
  levenshteinDistance,
  stringSimilarity,
  fuzzyMatch,
} from "./utils"

// ─────────────────────────────────────────────────────────────────────────────
// MUSIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export {
  findTrackByTitle,
  findCollectionByName,
  resolveTracksForProposal,
} from "./music-helpers"

// ─────────────────────────────────────────────────────────────────────────────
// TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export { searchCatalog, getCatalogSummary } from "./catalog"
export { openFeedback, OPEN_FEEDBACK_EVENT, type OpenFeedbackEventDetail } from "./feedback"
export { getPlatformHelp } from "./platform-help"
export { getRecommendations } from "./recommendations"
export { getZuberantContext, warmupKnowledgeEmbeddings } from "./knowledge"
export { getWisdomContent } from "./wisdom"
export {
  proposePlayback,
  proposeQueueSet,
  proposePlaylist,
  proposeSurface,
} from "./proposals"

// ─────────────────────────────────────────────────────────────────────────────
// TOOL PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

export { getTools } from "./provider"
