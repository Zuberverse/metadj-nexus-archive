/**
 * Collection Theme Utilities
 * 
 * Centralized logic for collection-specific visual themes (gradients, glows, hover effects).
 * Decoupled from generic utility functions for better maintainability.
 */

import { normalizeCollectionSlug } from "@/lib/collection-utils";

/**
 * Collection gradient definitions for consistent theming across the app
 * Maps collection slugs to Tailwind gradient classes
 */
const COLLECTION_GRADIENTS: Record<string, string> = {
    featured: "from-[#5F6CFF]/40 via-[#38D4FF]/35 to-[#A250FF]/35",
    "majestic-ascent": "from-[#A250FF]/45 via-[#C079FF]/40 to-[#FF8FD1]/40",
    "bridging-reality": "from-[#1D4ED8]/35 via-[#2E3FA5]/30 to-[#1A2C6A]/30",
    "metaverse-revelation": "from-[#0C9CCF]/35 via-[#0B6AA0]/30 to-[#0A3B61]/30",
    transformer: "from-[#11CFA7]/35 via-[#0F9E78]/30 to-[#0A5B46]/30",
};

/** Default gradient for unknown collections */
const DEFAULT_COLLECTION_GRADIENT = "from-[#5F6CFF]/35 via-[#38D4FF]/25 to-[#A250FF]/35";

/**
 * Get collection-specific background gradient for consistent theming
 *
 * @param collectionIdOrTitle - Collection ID, title, or slug to match
 * @returns Tailwind gradient class string (includes bg-linear-to-r prefix)
 * @example
 * getCollectionGradient("majestic-ascent") // "bg-linear-to-r from-[#A250FF]/45 via-[#C079FF]/40 to-[#FF8FD1]/40"
 * getCollectionGradient("Majestic Ascent") // Same result (normalized)
 */
export function getCollectionGradient(collectionIdOrTitle: string): string {
    const slug = normalizeCollectionSlug(collectionIdOrTitle);
    const gradient = COLLECTION_GRADIENTS[slug] ?? DEFAULT_COLLECTION_GRADIENT;
    return `bg-linear-to-r ${gradient}`;
}

/**
 * Get raw gradient values without bg-linear-to-r prefix
 * Useful for custom gradient directions or composite styles
 *
 * @param collectionIdOrTitle - Collection ID, title, or slug to match
 * @returns Raw gradient color stops (from-X via-Y to-Z)
 */
export function getCollectionGradientRaw(collectionIdOrTitle: string): string {
    const slug = normalizeCollectionSlug(collectionIdOrTitle);
    return COLLECTION_GRADIENTS[slug] ?? DEFAULT_COLLECTION_GRADIENT;
}

/**
 * Get collection-specific hover styles for consistent UI glow effects
 *
 * @param collectionIdOrTitle - Collection ID or Title to match
 * @returns Tailwind class string for hover effects
 */
export function getCollectionHoverStyles(collectionIdOrTitle: string): string {
    const normalized = normalizeCollectionSlug(collectionIdOrTitle);

    const hoverStyles: Array<{ matches: string[]; classes: string }> = [
        {
            matches: ["majestic"],
            classes:
                "hover:border-(--border-active) hover:bg-(--glass-light) hover:shadow-[var(--shadow-glow-purple)]",
        },
        {
            matches: ["featured", "bridging"],
            classes:
                "hover:border-(--border-active) hover:bg-(--glass-light) hover:shadow-[var(--shadow-glow-brand)]",
        },
        {
            matches: ["metaverse"],
            classes:
                "hover:border-(--border-active) hover:bg-(--glass-light) hover:shadow-[var(--shadow-glow-cyan)]",
        },
        {
            matches: ["transformer"],
            classes:
                "hover:border-(--border-active) hover:bg-(--glass-light) hover:shadow-[var(--shadow-glow-emerald)]",
        },
    ];

    const matched = hoverStyles.find(({ matches }) =>
        matches.some((key) => normalized.includes(key))
    );

    if (matched) {
        return matched.classes;
    }

    // Default signature glow (Purple foundation)
    return "hover:border-(--border-active) hover:bg-(--glass-light) hover:shadow-[var(--shadow-glow-purple)]";
}
