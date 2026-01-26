/**
 * MetaDJai Type Definitions
 *
 * Core types for the MetaDJai AI companion chat system including:
 * - Message formats and conversation state
 * - Personalization and user preferences
 * - Action proposals (playback, queue, navigation)
 * - API request/response contracts
 * - Rate limiting and session management
 *
 * @module types/metadjai
 * @see src/hooks/use-metadjai-stream.ts - Hook using these types
 * @see src/app/api/metadjai/ - API routes using these types
 * @see docs/API.md - API documentation
 */

/** Message author role in the conversation */
export type MetaDjAiRole = 'user' | 'assistant';

/** Internal mode hint for conversation style (not user-facing) */
export type MetaDjAiMode = 'adaptive' | 'explorer' | 'dj';

/** Available AI provider backends */
export type MetaDjAiProvider = 'openai' | 'anthropic' | 'google' | 'xai';

/** Preset personalization profile identifiers */
export type MetaDjAiPersonalizationProfileId = 'default' | 'creative' | 'mentor' | 'dj' | 'custom';

/** User preference for response verbosity */
export type MetaDjAiResponseLength = 'concise' | 'balanced' | 'expansive';

/** User preference for response structure */
export type MetaDjAiResponseFormat = 'bullets' | 'steps' | 'paragraphs' | 'mixed';

/** User preference for conversational tone */
export type MetaDjAiTonePreference = 'direct' | 'warm' | 'visionary' | 'technical';

/**
 * Full personalization state stored client-side.
 * Contains all user preferences for MetaDJai interactions.
 */
export interface MetaDjAiPersonalizationState {
  /** Whether personalization is active */
  enabled: boolean;
  /** Selected preset profile */
  profileId: MetaDjAiPersonalizationProfileId;
  /** Preferred response length */
  responseLength: MetaDjAiResponseLength;
  /** Preferred response structure */
  responseFormat: MetaDjAiResponseFormat;
  /** Preferred conversational tone */
  tone: MetaDjAiTonePreference;
  /** User's display name for personalized greetings */
  displayName: string;
  /** User interests for contextual responses */
  interests: string;
  /** Current projects for relevant suggestions */
  currentProjects: string;
  /** Free-form custom instructions */
  customInstructions: string;
}

/**
 * Compact personalization payload sent to API.
 * Derived from full state, contains only what the API needs.
 */
export interface MetaDjAiPersonalization {
  /** Whether personalization is active */
  enabled: boolean;
  /** Selected preset profile */
  profileId: MetaDjAiPersonalizationProfileId;
  /** Human-friendly profile label */
  profileLabel: string;
  /** Compiled instructions string injected into system prompt */
  instructions: string;
}

/**
 * Archived version of a regenerated message.
 * Allows cycling through previous response variants.
 */
export interface MetaDjAiMessageVersion {
  /** Message content for this version */
  content: string;
  /** Unix timestamp when this version was created */
  createdAt: number;
  /** Tools called during this version's generation */
  toolsUsed?: string[];
}

export interface MetaDjAiMessage {
  id: string;
  role: MetaDjAiRole;
  content: string;
  createdAt: number;
  status?: 'streaming' | 'complete' | 'error';
  /** Optional message kind for non-chat events (mode/model markers) */
  kind?: 'mode-switch' | 'model-switch';
  /** Optional mode metadata (not surfaced in UI) */
  mode?: MetaDjAiMode;
  sources?: Array<{
    title: string;
    url: string;
  }>;
  /** Tools that were called during this response (e.g., 'searchCatalog', 'getRecommendations') */
  toolsUsed?: string[];
  /** Previous versions of this message (for regenerated responses) */
  versions?: MetaDjAiMessageVersion[];
  /** Currently displayed version index (0 = current, 1+ = older versions) */
  currentVersionIndex?: number;
  /** Active player control proposal awaiting user confirmation */
  proposal?: MetaDjAiProposal;
}

/**
 * Playback control proposal from MetaDJai.
 * Requires user confirmation before execution.
 */
export interface PlaybackProposal {
  type: 'playback';
  /** Requires explicit approval before execution */
  approvalRequired?: boolean;
  /** Playback action to perform */
  action: 'play' | 'pause' | 'next' | 'prev' | 'queue';
  /** Target track ID (for play/queue actions) */
  trackId?: string;
  /** Display title for confirmation UI */
  trackTitle?: string;
  /** Display artist for confirmation UI */
  trackArtist?: string;
  /** Reasoning shown in confirmation card (e.g., "from Neon Nights collection") */
  context?: string;
}

/**
 * UI navigation proposal from MetaDJai.
 * Requires user confirmation before execution.
 */
export interface UiProposal {
  type: 'ui';
  /** Requires explicit approval before execution */
  approvalRequired?: boolean;
  /** Navigation action to perform */
  action: 'openWisdom' | 'openQueue' | 'focusSearch' | 'openMusicPanel';
  /** Specific tab within music panel */
  tab?: 'browse' | 'queue' | 'playlists';
  /** Reasoning shown in confirmation card */
  context?: string;
}

/**
 * Queue update proposal from MetaDJai.
 * Allows setting multiple tracks at once with user confirmation.
 */
export interface QueueSetProposal {
  type: 'queue-set';
  /** Requires explicit approval before execution */
  approvalRequired?: boolean;
  action: 'set';
  /** Ordered list of track IDs to queue */
  trackIds: string[];
  /** Display titles for confirmation UI */
  trackTitles?: string[];
  /** Replace queue or append to existing */
  mode?: 'replace' | 'append';
  /** Start playback after queuing */
  autoplay?: boolean;
  /** Reasoning shown in confirmation card */
  context?: string;
}

/**
 * Playlist creation proposal from MetaDJai.
 * Creates a named playlist with user confirmation.
 */
export interface PlaylistProposal {
  type: 'playlist';
  /** Requires explicit approval before execution */
  approvalRequired?: boolean;
  action: 'create';
  /** Name for the new playlist */
  name: string;
  /** Track IDs to include */
  trackIds?: string[];
  /** Display titles for confirmation UI */
  trackTitles?: string[];
  /** Whether to also queue the tracks */
  queueMode?: 'replace' | 'append' | 'none';
  /** Start playback after queuing */
  autoplay?: boolean;
  /** Reasoning shown in confirmation card */
  context?: string;
}

/** Union of all proposal types MetaDJai can generate */
export type MetaDjAiProposal = PlaybackProposal | UiProposal | QueueSetProposal | PlaylistProposal;

/**
 * Simplified message format for API requests.
 * Subset of MetaDjAiMessage with only role and content.
 */
export interface MetaDjAiApiMessage {
  /** Message author role */
  role: MetaDjAiRole;
  /** Message text content */
  content: string;
}

export interface MetaDjAiContext {
  nowPlayingTitle?: string;
  nowPlayingArtist?: string;
  selectedCollectionTitle?: string;
  /** Internal intent hint (adaptive default; values ignored in UI) */
  mode?: MetaDjAiMode;
  pageContext?: {
    view: 'collections' | 'wisdom' | 'cinema' | 'journal' | 'search' | 'queue';
    details?: string;
  };
  /** Specific content the user is viewing (used for Wisdom summaries and page-aware help). */
  contentContext?: {
    view: 'wisdom';
    /** Section within wisdom (may be undefined with state-based navigation) */
    section?: 'thoughts' | 'guides' | 'reflections';
    id?: string;
    title?: string;
  };
  cinemaActive?: boolean;
  /** Current Cinema scene ID (e.g., 'cosmos', 'black-hole', 'synthwave-horizon') */
  cinemaScene?: string;
  wisdomActive?: boolean;
  /** Dream is active when streaming webcam-to-avatar transformation */
  dreamActive?: boolean;
  /** Unix timestamp (ms) when the current chat session started */
  sessionStartedAt?: number;
  catalogSummary?: {
    totalCollections: number;
    collectionTitles: string[];
    collections: Array<{
      id: string;
      title: string;
      description?: string;
      trackCount: number;
      sampleTracks: string[];
      primaryGenres?: string[];
    }>;
  };
}

/**
 * Request body for MetaDJai API endpoints.
 * Sent to /api/metadjai and /api/metadjai/stream.
 */
export interface MetaDjAiApiRequestBody {
  /** Conversation history (max 50 messages) */
  messages: MetaDjAiApiMessage[];
  /** Session context for grounded responses */
  context?: MetaDjAiContext | null;
  /** Preferred AI provider (defaults to OpenAI) */
  modelPreference?: MetaDjAiProvider;
  /** User personalization settings */
  personalization?: MetaDjAiPersonalization;
}

/**
 * Response body from MetaDJai API (non-streaming endpoint).
 * Contains AI reply, model info, and tool usage details.
 */
export interface MetaDjAiApiResponseBody {
  /** AI-generated response text */
  reply: string;
  /** Model identifier used for this response */
  model: string;
  /** Provider backend used for this response */
  provider: MetaDjAiProvider;
  /** Whether a failover provider was used */
  usedFallback?: boolean;
  /** Token usage statistics */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
  /** Tools that were called during generation */
  toolUsage?: Array<{
    id: string;
    name: string;
  }>;
  /** Results from tool calls (for proposals, etc.) */
  toolResults?: Array<{
    name: string;
    result: unknown;
  }>;
}

/**
 * Summary of a stored chat session for history display.
 * Full messages are loaded on-demand when session is selected.
 */
export interface MetaDjAiChatSessionSummary {
  /** Unique session identifier */
  id: string;
  /** Auto-generated or user-set session title */
  title: string;
  /** Unix timestamp of session creation */
  createdAt: number;
  /** Unix timestamp of last message */
  updatedAt: number;
  /** Total messages in this session */
  messageCount: number;
}

export interface MetaDjAiChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MetaDjAiMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  onSend: (message: string) => Promise<void> | void;
  onStop: () => void;
  onRefresh: () => void;
  /** Create and switch to a new chat session */
  onNewSession?: () => void;
  /** Stored chat history */
  sessions?: MetaDjAiChatSessionSummary[];
  /** Currently active session id */
  activeSessionId?: string;
  /** Switch to a session from history */
  onSelectSession?: (sessionId: string) => void;
  /** Delete a session from history */
  onDeleteSession?: (sessionId: string) => void;
  /** Refresh session list from server */
  onRefreshSessions?: () => void | Promise<void>;
  onRegenerate?: () => Promise<void> | void;
  /** Callback to switch between message versions */
  onSwitchVersion?: (messageId: string, versionIndex: number) => void;
  /** Callback to retry the last failed message */
  onRetry?: () => Promise<void> | void;
  /** Whether a retry is available (last message failed) */
  canRetry?: boolean;
  rateLimit: MetaDjAiRateLimitState;
  welcomeDetails?: MetaDjAiWelcomeDetails | null;
  modelPreference?: MetaDjAiProvider;
  onModelPreferenceChange?: (provider: MetaDjAiProvider) => void;
  personalization: MetaDjAiPersonalizationState;
  onPersonalizationToggle: (enabled: boolean) => void;
  onPersonalizationUpdate: (next: Partial<MetaDjAiPersonalizationState>) => void;
  hasTrack?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

/**
 * Rate limit state exposed to UI.
 * Used to display remaining quota and cooldown timers.
 */
export interface MetaDjAiRateLimitState {
  /** Whether user is currently rate limited */
  isLimited: boolean;
  /** Milliseconds until rate limit resets */
  remainingMs: number;
  /** Unix timestamp when next message allowed */
  nextAvailableAt: number | null;
  /** Seconds remaining in inter-message cooldown */
  remainingCooldown?: number;
  /** Messages sent in current window */
  windowCount: number;
  /** Maximum messages per window */
  windowMax: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Unix timestamp when current window ends */
  windowEndsAt: number | null;
}

/**
 * Context details for personalized welcome messages.
 * Provides situational awareness for greeting text.
 */
export interface MetaDjAiWelcomeDetails {
  /** Currently playing track title */
  nowPlayingTitle?: string;
  /** Currently playing track artist */
  nowPlayingArtist?: string;
  /** Currently selected collection */
  collectionTitle?: string;
  /** Current page/view context description */
  pageDetails?: string;
}
