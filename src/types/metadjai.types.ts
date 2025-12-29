export type MetaDjAiRole = 'user' | 'assistant';
export type MetaDjAiMode = 'adaptive' | 'explorer' | 'dj';
export type MetaDjAiProvider = 'openai' | 'anthropic' | 'google' | 'xai';
export type MetaDjAiPersonalizationProfileId = 'default' | 'creative' | 'mentor' | 'dj' | 'custom';
export type MetaDjAiResponseLength = 'concise' | 'balanced' | 'expansive';
export type MetaDjAiResponseFormat = 'bullets' | 'steps' | 'paragraphs' | 'mixed';
export type MetaDjAiTonePreference = 'direct' | 'warm' | 'visionary' | 'technical';

export interface MetaDjAiPersonalizationState {
  enabled: boolean;
  profileId: MetaDjAiPersonalizationProfileId;
  responseLength: MetaDjAiResponseLength;
  responseFormat: MetaDjAiResponseFormat;
  tone: MetaDjAiTonePreference;
  displayName: string;
  interests: string;
  currentProjects: string;
  customInstructions: string;
}

export interface MetaDjAiPersonalization {
  enabled: boolean;
  profileId: MetaDjAiPersonalizationProfileId;
  profileLabel: string;
  instructions: string;
}

export interface MetaDjAiMessageVersion {
  content: string;
  createdAt: number;
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

export interface PlaybackProposal {
  type: 'playback';
  action: 'play' | 'pause' | 'next' | 'prev' | 'queue';
  trackId?: string;
  trackTitle?: string;
  trackArtist?: string;
  context?: string; // e.g. "Neon Nights collection"
}

export interface UiProposal {
  type: 'ui';
  action: 'openWisdom' | 'openQueue' | 'focusSearch' | 'openMusicPanel';
  tab?: 'browse' | 'queue' | 'playlists';
  context?: string;
}

export interface QueueSetProposal {
  type: 'queue-set';
  action: 'set';
  trackIds: string[];
  trackTitles?: string[];
  mode?: 'replace' | 'append';
  autoplay?: boolean;
  context?: string;
}

export interface PlaylistProposal {
  type: 'playlist';
  action: 'create';
  name: string;
  trackIds?: string[];
  trackTitles?: string[];
  queueMode?: 'replace' | 'append' | 'none';
  autoplay?: boolean;
  context?: string;
}

export type MetaDjAiProposal = PlaybackProposal | UiProposal | QueueSetProposal | PlaylistProposal;

export interface MetaDjAiApiMessage {
  role: MetaDjAiRole;
  content: string;
}

export interface MetaDjAiContext {
  nowPlayingTitle?: string;
  nowPlayingArtist?: string;
  selectedCollectionTitle?: string;
  /** Internal intent hint (adaptive default; values ignored in UI) */
  mode?: MetaDjAiMode;
  pageContext?: {
    view: 'collections' | 'wisdom' | 'cinema' | 'search' | 'queue';
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

export interface MetaDjAiApiRequestBody {
  messages: MetaDjAiApiMessage[];
  context?: MetaDjAiContext | null;
  modelPreference?: MetaDjAiProvider;
  personalization?: MetaDjAiPersonalization;
}

export interface MetaDjAiApiResponseBody {
  reply: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
  toolUsage?: Array<{
    id: string;
    name: string;
  }>;
  toolResults?: Array<{
    name: string;
    result: unknown;
  }>;
}

export interface MetaDjAiChatSessionSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
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

export interface MetaDjAiRateLimitState {
  isLimited: boolean;
  remainingMs: number;
  nextAvailableAt: number | null;
  remainingCooldown?: number;
  windowCount: number;
  windowMax: number;
  windowMs: number;
  windowEndsAt: number | null;
}

export interface MetaDjAiWelcomeDetails {
  nowPlayingTitle?: string;
  nowPlayingArtist?: string;
  collectionTitle?: string;
  pageDetails?: string;
}
