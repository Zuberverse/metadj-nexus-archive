/**
 * MetaDJai Request & Response Limits
 *
 * Centralized configuration for all AI-related validation, rate limiting,
 * and sanitization. These limits balance user experience with cost control
 * and security.
 *
 * DESIGN PRINCIPLES:
 * 1. User Experience: Limits should not interfere with normal usage
 * 2. Cost Control: Prevent excessive token consumption
 * 3. Security: Mitigate prompt injection and abuse vectors
 * 4. Performance: Keep payloads reasonable for fast responses
 *
 * TOKEN ESTIMATION:
 * - Average: ~4 characters per token (English text)
 * - JSON overhead: ~20-30% additional characters
 * - Always err on the generous side for user-facing limits
 *
 * @module lib/ai/limits
 */

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE LIMITS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum number of messages allowed per API request
 *
 * Rationale: 50 messages provides ample conversation context while preventing
 * abuse. Most conversations stay under 20 messages. The AI SDK handles
 * context windowing internally.
 */
export const MAX_MESSAGES_PER_REQUEST = 50;

/**
 * Maximum content length per message (characters)
 *
 * Rationale: 16,000 chars (~4,000 tokens) allows for:
 * - Long user questions with code snippets
 * - Detailed AI responses with examples
 * - Pasted content for analysis
 *
 * This is generous enough for power users while preventing abuse.
 */
export const MAX_MESSAGE_CONTENT_LENGTH = 16000;

/**
 * Maximum number of messages retained in client-side history
 *
 * Rationale: 12 messages (6 turns) provides sufficient context for
 * continuity while keeping localStorage usage reasonable.
 */
export const MAX_MESSAGE_HISTORY = 12;

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALIZATION LIMITS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum personalization instruction length (characters)
 *
 * Rationale: 500 chars is enough for custom AI behavior preferences
 * without bloating every request. Users can express tone, style,
 * and format preferences concisely.
 */
export const MAX_PERSONALIZATION_LENGTH = 500;

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT LIMITS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum length for page context detail strings
 *
 * Rationale: 280 chars (tweet-length) is sufficient for describing
 * current view state like "Browsing Majestic Ascent collection".
 */
export const MAX_PAGE_CONTEXT_DETAILS_LENGTH = 280;

/**
 * Maximum length for Wisdom content context identifiers
 *
 * Rationale: 120 chars handles slug-style IDs with room to spare.
 */
export const MAX_CONTENT_CONTEXT_ID_LENGTH = 120;

/**
 * Maximum length for Wisdom content context titles
 *
 * Rationale: 200 chars accommodates long essay/guide titles.
 */
export const MAX_CONTENT_CONTEXT_TITLE_LENGTH = 200;

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG LIMITS
//
// These apply to the getCatalogSummary tool response and any catalog
// data passed in context. The tool retrieves catalog data on-demand
// rather than sending it with every message.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum collection title length
 *
 * Rationale: 100 chars handles creative collection names with room.
 */
export const MAX_COLLECTION_TITLE_LENGTH = 100;

/**
 * Maximum collection ID length
 *
 * Rationale: 120 chars for slug-style IDs with potential prefixes.
 */
export const MAX_COLLECTION_ID_LENGTH = 120;

/**
 * Maximum collection description length
 *
 * Rationale: 1,000 chars allows rich narrative descriptions while
 * keeping total catalog payload manageable. Descriptions are
 * truncated gracefully with "..." suffix.
 */
export const MAX_COLLECTION_DESCRIPTION_LENGTH = 1000;

/**
 * Maximum track title length
 *
 * Rationale: 100 chars handles creative track titles.
 */
export const MAX_COLLECTION_TRACK_TITLE_LENGTH = 100;

/**
 * Maximum genre string length
 *
 * Rationale: 50 chars for genre names like "Progressive Electronic".
 */
export const MAX_COLLECTION_GENRE_LENGTH = 50;

/**
 * Maximum number of collection titles returned in summary
 *
 * Rationale: 50 titles provides comprehensive catalog overview
 * while keeping response size reasonable.
 */
export const MAX_CATALOG_TITLES = 50;

/**
 * Maximum number of full collection objects in catalog summary
 *
 * Rationale: 30 collections with descriptions, sample tracks, and
 * genres balances completeness with response size. The AI can
 * request more specific data via searchCatalog if needed.
 */
export const MAX_CATALOG_COLLECTIONS = 30;

/**
 * Maximum sample tracks per collection
 *
 * Rationale: 10 tracks gives a representative sample without
 * overwhelming the response. For full track lists, use searchCatalog.
 */
export const MAX_COLLECTION_SAMPLE_TRACKS = 10;

/**
 * Maximum primary genres per collection
 *
 * Rationale: 10 genres covers even the most eclectic collections.
 */
export const MAX_COLLECTION_PRIMARY_GENRES = 10;

// ─────────────────────────────────────────────────────────────────────────────
// SPAM DETECTION THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Number of identical messages required to trigger spam detection
 *
 * Rationale: 5 identical messages is very permissive to accommodate
 * legitimate retries (network issues, accidental double-clicks,
 * re-asking when AI doesn't respond as expected). Users can retry up
 * to 4 times before triggering spam detection. Combined with rate
 * limiting, this provides sufficient abuse protection.
 */
export const SPAM_THRESHOLD_IDENTICAL_MESSAGES = 5;

/**
 * Window size for checking duplicate messages
 *
 * Rationale: Check last 8 user messages - wide enough window to catch
 * sustained spam patterns, but requires 5+ duplicates within this window.
 * This balances spam detection with allowing legitimate repeated questions
 * (e.g., asking "hello" at the start of sessions, retrying after errors).
 */
export const SPAM_CHECK_WINDOW = 8;
