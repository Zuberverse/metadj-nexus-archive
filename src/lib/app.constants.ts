/**
 * Application constants
 * Centralized configuration values to avoid magic numbers/strings
 */

// ============================================================================
// Animation & Timing
// ============================================================================

/** Standard animation duration for UI transitions (milliseconds) */
export const ANIMATION_DURATION_MS = 300;

/** Slower animation duration for emphasis (milliseconds) */
export const ANIMATION_DURATION_SLOW_MS = 500;

/** Cinema controls auto-hide timeout (milliseconds) */
export const CINEMA_CONTROLS_TIMEOUT_MS = 5000;

/** Toast message display duration (milliseconds) */
export const TOAST_DURATION_MS = 2200;

/** Debounce delay for search input (milliseconds) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Video retry delay on error (milliseconds) */
export const VIDEO_RETRY_DELAY_MS = 1000;

/** Interval for tracking time in cinema mode (milliseconds) */
export const CINEMA_TRACKING_INTERVAL_MS = 1000;

// ============================================================================
// Audio Settings
// ============================================================================

/** Volume increment/decrement step (0-1 range) */
export const VOLUME_INCREMENT = 0.1;

/** Audio seek amount in seconds (for skip forward/backward) */
export const SEEK_AMOUNT_SECONDS = 5;

/** Default audio preload timeout (milliseconds) */
export const AUDIO_PRELOAD_TIMEOUT_MS = 10000;

/** Smart track back threshold in seconds (>3s restarts track, <3s goes to previous) */
export const SMART_TRACK_BACK_THRESHOLD_SECONDS = 3;

// ============================================================================
// Touch Targets & Accessibility (WCAG 2.1 AA)
// ============================================================================

/** Minimum touch target size in pixels for mobile (WCAG) */
export const MIN_TOUCH_TARGET_PX = 44;

/** Large touch target size for primary actions */
export const LARGE_TOUCH_TARGET_PX = 48;

/** Extra large touch target for prominent controls */
export const XL_TOUCH_TARGET_PX = 56;

// ============================================================================
// Z-Index Layers - Standardized layering system
// ============================================================================

/**
 * Z-Index Scale - Standardized layering system
 *
 * Layer Groups (from bottom to top):
 * - Base layers (0-10): Default content, backgrounds
 * - Interactive layers (20-40): Sticky elements, dropdowns, sidebars
 * - Overlay layers (50-70): Panels, headers
 * - Modal layers (80-100): Modal backdrops, modal content
 * - Top layers (110-140): Toasts, tooltips, popovers, search
 * - Maximum (9999): Emergency override (use sparingly)
 */
export const Z_INDEX = {
  // Base layers
  BASE: 0,
  CONTENT: 10,

  // Interactive layers
  STICKY: 20,
  DROPDOWN: 30,
  SIDEBAR: 40,

  // Overlay layers
  OVERLAY: 50,
  PANEL: 60,
  HEADER: 70,

  // Modal layers
  MODAL_BACKDROP: 80,
  MODAL: 90,
  MODAL_CONTENT: 100,

  // Top layers
  TOAST: 110,
  TOOLTIP: 120,
  POPOVER: 130,

  // Search dropdown (needs to stay above modals for cinema mode)
  SEARCH_DROPDOWN: 140,

  // Maximum - emergency override only
  MAX: 9999,
} as const;

// ============================================================================
// Panel Positioning & Layout
// ============================================================================

/**
 * Shared positioning configuration for side panels (desktop) and overlay panels (mobile/tablet)
 * Ensures consistent sizing and placement across layout architectures.
 */
export const PANEL_POSITIONING = {
  LEFT_PANEL: {
    WIDTH: 460,
    MIN_SCREEN_WIDTH: 1100,
  },
  RIGHT_PANEL: {
    WIDTH: 460,
    MIN_SCREEN_WIDTH: 1100,
  },
  Z_INDEX: {
    LEFT_PANEL: 50,
    RIGHT_PANEL: 50,
    MIDDLE_CONTENT: 10,
    CINEMA_OVERLAY: 70,
  },
  ANIMATION: {
    DURATION: 300,
    EASING: "ease-out",
  },
  OVERLAY: {
    /** Gap between header and panel top edge (pixels) - negative pulls panels higher */
    TOP_GAP: -60,
    /** Space reserved for action bar at bottom (pixels) */
    ACTION_BAR_OFFSET: 80,
    /**
     * Maximum panel width - matches main content container
     * Uses same responsive breakpoints as page content for visual alignment
     * - Base: 56rem (896px)
     * - lg: 64rem (1024px)
     * - xl: 72rem (1152px)
     */
    WIDTH_CLASS: "w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl",
    /** Z-index for overlay panels (chat and control panel) */
    Z_INDEX: 80,
  },
} as const;

// ============================================================================
// Responsive Breakpoints
// ============================================================================

/**
 * Centralized breakpoint values for consistent responsive behavior.
 * Use these instead of hardcoding pixel values in components.
 *
 * NOTE: These should match Tailwind's breakpoints where applicable.
 */
export const BREAKPOINTS = {
  /** Mobile/tablet boundary - below this is "mobile" */
  SM: 640,
  /** Tablet/desktop boundary - matches Tailwind md: */
  MD: 768,
  /** Desktop layout activation - side panels appear */
  LG: 1024,
  /** Full desktop experience - panels + content side-by-side */
  DESKTOP_PANELS: 1100,
  /** Large desktop */
  XL: 1280,
  /** Extra large desktop */
  XXL: 1536,
} as const;

/**
 * Helper to check if we're at or above a breakpoint (client-side only)
 */
export function isAboveBreakpoint(breakpoint: keyof typeof BREAKPOINTS): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS[breakpoint];
}

// ============================================================================
// Storage & Persistence
// ============================================================================

/** Queue state expiration time in milliseconds (24 hours) */
export const QUEUE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/** Time conversion constants */
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_HOUR = 60 * 60 * 1000;

// ============================================================================
// Retry & Error Handling
// ============================================================================

/** Maximum retry attempts for video loading */
export const MAX_VIDEO_RETRY_ATTEMPTS = 2;

/** Threshold for "near completion" in seconds (within 2s of end) */
export const COMPLETION_THRESHOLD_SECONDS = 2;

// ============================================================================
// Content Configuration
// ============================================================================

/** Featured track IDs (curated tracks alternating between Majestic Ascent and Metaverse Revelation) */
export const FEATURED_TRACK_IDS = [
  // Alternating between collections for variety
  "metadj-001", // Majestic Ascent (hero track)
  "mr-001",     // I Want to Believe
  "metadj-002", // Convergence
  "mr-003",     // Metaverse Revelation
  "metadj-006", // Portal to Infinity
  "mr-005",     // We're the Dreamers
  "metadj-007", // Virtual Awakening
  "mr-002",     // Embrace the Moment
  "metadj-005", // Electric Horizon
  "mr-007",     // MetaDJ Revolution
  "metadj-004", // Synthetic Emergence
  "mr-004",     // We Unite the Nation with the Metaverse
  "metadj-009", // Strollin Through Paradise
  "mr-006",     // In the Metaverse
  "metadj-003", // Future's Grace
  "mr-008",     // Welcome to the Zuberverse
  "metadj-008", // Day Dreaming
  "mr-009",     // Pioneers
  "metadj-010", // The Minotaur's Dance
  "mr-010",     // Cosmic Journey
] as const;

/** Hub hero track ID for "Enter Cinema" button and Odyssey journey */
export const HUB_HERO_TRACK_ID = FEATURED_TRACK_IDS[0];

/** Default track ID to play when user presses play with no track loaded */
export const DEFAULT_FALLBACK_TRACK_ID = "mr-007"; // MetaDJ Revolution

/** Default collection ID */
export const DEFAULT_COLLECTION_ID = "featured";

/** Pseudo-collection ID for local playback history (not shareable) */
export const RECENTLY_PLAYED_COLLECTION_ID = "recently-played";

/** Maximum number of tracks kept in local playback history */
export const RECENTLY_PLAYED_MAX_ITEMS = 50;

/** Default artwork fallback for tracks and collections */
export const DEFAULT_ARTWORK_SRC = "/images/placeholder-artwork.svg";

// ============================================================================
// Platform Configuration - MetaDJ Nexus
// ============================================================================

/** Platform name */
export const PLATFORM_NAME = "MetaDJ Nexus";

/** Primary promoted domain */
export const PRIMARY_DOMAIN = "metadjnexus.ai";

/** Platform features with slug and display label */
export const FEATURES = {
  HUB: { slug: "hub", label: "Hub" },
  MUSIC: { slug: "music", label: "Music" },
  CINEMA: { slug: "cinema", label: "Cinema" },
  WISDOM: { slug: "wisdom", label: "Wisdom" },
  METADJAI: { slug: "metadjai", label: "AI" },
} as const;

// ============================================================================
// Feature Flags - Temporarily Disabled Features
// ============================================================================

/**
 * Mood Channels Feature
 *
 * STATUS: DISABLED
 * DISABLED DATE: December 2024
 *
 * REASON FOR DISABLING:
 * Requires larger music catalog to be meaningful. Mood Channels provide curated
 * listening experiences based on mood/activity states (Deep Focus, Energy Boost,
 * Creative Flow). Currently disabled because:
 * - Limited track catalog makes mood filtering less useful
 * - Mood-based playlists feel sparse with current track count
 * - Will revisit as music collection expands
 *
 * RE-ENABLEMENT CRITERIA:
 * 1. Music catalog reaches 50+ tracks minimum
 * 2. At least 10 tracks per mood category for meaningful variety
 * 3. User testing validates mood filtering provides value
 * 4. Update mood channel track assignments in moodChannels.ts
 *
 * PRESERVED CODE LOCATIONS:
 * - src/data/moodChannels.ts (mood definitions and track assignments)
 * - src/components/mood/MoodChannelRail.tsx (UI component)
 * - src/components/mood/MoodChannelIcons.tsx (mood icons)
 * - src/hooks/home/use-hub-playback.ts (handlePlayMoodChannel handler)
 *
 * CLEANUP NEEDED WHEN RE-ENABLING:
 * 1. Review and update track assignments in moodChannels.ts
 * 2. Test mood filtering with expanded catalog
 * 3. Update UI positioning in Hub layout
 * 4. Remove this flag usage and set to true
 *
 * @see docs/features/disabled-features.md for complete documentation
 */
export const FEATURE_MOOD_CHANNELS = false;
