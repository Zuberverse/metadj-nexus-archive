/**
 * Collection Utilities
 *
 * Shared helpers for collection slug normalization and legacy alias handling.
 */

/**
 * Normalize a string into a URL-friendly slug.
 */
export function toCollectionSlug(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, "")
    .replace(/\\s+/g, "-")
    .replace(/-+/g, "-");

  return slug;
}

/**
 * Normalizes collection slugs while preserving backward compatibility with previous IDs.
 */
const COLLECTION_SLUG_ALIASES: Record<string, string> = {
  "metaverse-revalation": "metaverse-revelation",
};

/**
 * Normalize collection slugs with legacy alias support.
 */
export function normalizeCollectionSlug(input: string): string {
  const slug = toCollectionSlug(input);
  return COLLECTION_SLUG_ALIASES[slug] ?? slug;
}
