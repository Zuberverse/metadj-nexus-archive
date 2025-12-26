/**
 * Consolidated Type Definitions for MetaDJ Nexus
 *
 * Central source of truth for all TypeScript interfaces and types.
 *
 * ARCHITECTURE NOTE:
 * Track and Collection types are derived from Zod schemas in validation/schemas.ts.
 * This follows the Zod best practice of "schema as source of truth" - define once,
 * infer types, validate at runtime. See: https://zod.dev/
 */

// ============================================================================
// Core Domain Types (from Zod schemas)
// ============================================================================

/**
 * Music track and collection types - derived from Zod validation schemas.
 * These are the canonical type definitions used throughout the application.
 *
 * @see lib/validation/schemas.ts for the schema definitions and validation rules
 */
import type {
  Track as TrackType,
  Collection as CollectionType_,
  CollectionType as CollectionTypeEnum,
} from '@/lib/validation/schemas';

// Re-export with canonical names
export type Track = TrackType;
export type Collection = CollectionType_;
export type CollectionType = CollectionTypeEnum;

// ============================================================================
// Application State Types
// ============================================================================

export type RepeatMode = 'none' | 'track' | 'queue';
export type QueueContext = 'collection' | 'search' | 'playlist';
export type ActiveView = 'hub' | 'cinema' | 'wisdom' | 'journal';

// Left panel primary tabs
export type LeftPanelTab = "browse" | "queue" | "playlists";
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

/**
 * Persisted queue metadata stored alongside the queue payload.
 */
export interface QueuePersistenceMetadata {
  selectedCollection?: string;
  searchQuery?: string;
  playlistId?: string;
  currentTrackId?: string;
  currentIndex?: number;
  wasPlaying?: boolean;
  restoredAt?: number;
}

// ============================================================================
// Player Context Types
// ============================================================================

/**
 * Audio player state and controls (slow-changing values)
 *
 * PERFORMANCE NOTE: This context excludes currentTime to prevent
 * cascade re-renders during playback. Use usePlaybackTime() for
 * components that need time updates.
 */
export interface PlayerContextValue {
  // Current playback state
  currentTrack: Track | null;
  currentIndex: number;
  shouldPlay: boolean;
  isLoading: boolean;

  // Actual playback state (from audio element) - excludes currentTime
  isPlaying: boolean;
  duration: number;

  // Audio element reference
  audioRef: React.RefObject<HTMLAudioElement | null>;

  // Playback controls
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;

  // Volume controls
  volume: number;
  isMuted: boolean;
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  // Internal state management
  setCurrentTrack: (track: Track | null) => void;
  setCurrentIndex: (index: number) => void;
  setShouldPlay: (shouldPlay: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setDuration: (duration: number) => void;

  // Time updates via ref (not state) - use usePlaybackTime() hook instead
  currentTimeRef: React.RefObject<number>;
  setCurrentTimeRef: (time: number) => void;

  // Notify when audio element is attached (triggers PlaybackTimeProvider re-sync)
  notifyAudioReady: () => void;
}

/**
 * Playback time context for components that need time updates
 *
 * PERFORMANCE NOTE: Only subscribe to this context if your component
 * needs to update based on playback position. Most components should
 * use usePlayer() instead.
 */
export interface PlaybackTimeContextValue {
  currentTime: number;
  duration: number;
  setCurrentTime: (time: number) => void;
}

// ============================================================================
// Queue Context Types
// ============================================================================

/**
 * Queue state and management
 */
export interface QueueContextValue {
  // Queue state
  queue: Track[];
  autoQueue: Track[];
  manualTrackIds: string[];
  queueContext: QueueContext;
  persistenceMetadata: QueuePersistenceMetadata | null;
  isHydrated: boolean;

  // Queue modes
  isShuffleEnabled: boolean;
  repeatMode: RepeatMode;

  // Queue operations
  setQueue: (queue: Track[]) => void;
  updatePersistenceMetadata: (metadata: QueuePersistenceMetadata) => void;

  // Context management
  setQueueContext: (context: QueueContext) => void;

  // Internal state
  setManualTrackIds: (ids: string[]) => void;
  setAutoQueue: (tracks: Track[]) => void;
  setIsShuffleEnabled: (enabled: boolean) => void;
  setRepeatMode: (mode: RepeatMode) => void;
}

// ============================================================================
// UI Context Types
// ============================================================================

/**
 * Modal and overlay states
 */
export interface ModalStates {
  isWelcomeOpen: boolean;
  isInfoOpen: boolean;
  isTrackDetailsOpen: boolean;
  isCollectionDetailsOpen: boolean;
  isQueueOpen: boolean;
  isWisdomOpen: boolean;
  isKeyboardShortcutsOpen: boolean;
  isMetaDjAiOpen: boolean;
}

/**
 * Toast message
 */
export interface ToastMessage {
  message: string;
  id: number;
}

/**
 * UI state and controls
 *
 * Note: Toast functionality has been consolidated into ToastContext.
 * Use useToast() from ToastContext for toast notifications.
 */
export type SelectedCollectionSource = 'default' | 'hydrate' | 'user' | 'system';

export interface UIContextValue {
  // Modal states
  modals: ModalStates;
  setWelcomeOpen: (open: boolean) => void;
  setInfoOpen: (open: boolean) => void;
  setTrackDetailsOpen: (open: boolean) => void;
  setCollectionDetailsOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  setWisdomOpen: (open: boolean) => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setMetaDjAiOpen: (open: boolean) => void;

  // Search state
  searchQuery: string;
  searchResults: Track[];
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Track[]) => void;

  // Collection selection
  selectedCollection: string;
  selectedCollectionSource: SelectedCollectionSource;
  setSelectedCollection: (collectionId: string, source?: SelectedCollectionSource) => void;
  collectionDetails: Collection | null;
  setCollectionDetails: (collection: Collection | null) => void;

  // Featured section state
  featuredExpanded: boolean;
  setFeaturedExpanded: (expanded: boolean) => void;

  // Header height
  headerHeight: number;
  setHeaderHeight: (height: number) => void;

  // Panel layout
  panels: {
    left: {
      isOpen: boolean;
    };
    right: {
      isOpen: boolean;
    };
  };
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  openLeftPanel: () => void;

  // Left panel navigation (Library / Queue / Playlists)
  leftPanelTab: LeftPanelTab;
  setLeftPanelTab: (tab: LeftPanelTab) => void;

  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Hydration state - true when activeView has been loaded from storage
  viewHydrated: boolean;

  // Accessibility
  reducedMotion: boolean;
}

// ============================================================================
// Playlist Types
// ============================================================================

export * from './playlist';

// ============================================================================
// Audio Player Types
// ============================================================================

export * from './audio-player.types';
