/**
 * MetaDJai request and history limits.
 *
 * Centralized to keep validation, rate limiting, and sanitization aligned.
 */

/** Maximum number of messages allowed per request */
export const MAX_MESSAGES_PER_REQUEST = 50;

/** Maximum content length per message (characters) */
export const MAX_MESSAGE_CONTENT_LENGTH = 8000;

/** Maximum number of messages retained in history */
export const MAX_MESSAGE_HISTORY = 12;

/** Maximum personalization instruction length (characters) */
export const MAX_PERSONALIZATION_LENGTH = 500;

/** Maximum length for page context detail strings */
export const MAX_PAGE_CONTEXT_DETAILS_LENGTH = 280;

/** Maximum length for content context identifiers */
export const MAX_CONTENT_CONTEXT_ID_LENGTH = 120;

/** Maximum length for content context titles */
export const MAX_CONTENT_CONTEXT_TITLE_LENGTH = 200;

/** Maximum catalog summary title length */
export const MAX_COLLECTION_TITLE_LENGTH = 100;

/** Maximum catalog summary collection id length */
export const MAX_COLLECTION_ID_LENGTH = 120;

/** Maximum catalog summary description length */
export const MAX_COLLECTION_DESCRIPTION_LENGTH = 200;

/** Maximum catalog summary track title length */
export const MAX_COLLECTION_TRACK_TITLE_LENGTH = 100;

/** Maximum catalog summary genre length */
export const MAX_COLLECTION_GENRE_LENGTH = 50;

/** Maximum number of collection titles in catalog summary */
export const MAX_CATALOG_TITLES = 50;

/** Maximum number of collections in catalog summary */
export const MAX_CATALOG_COLLECTIONS = 30;

/** Maximum number of sample tracks per collection */
export const MAX_COLLECTION_SAMPLE_TRACKS = 10;

/** Maximum number of primary genres per collection */
export const MAX_COLLECTION_PRIMARY_GENRES = 10;
