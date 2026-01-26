/**
 * useMetaDjAiChatProps Hook
 *
 * Extracts and memoizes the MetaDJai chat component props configuration
 * from HomePageClient to improve maintainability and reduce component size.
 */

import { useMemo } from "react"
import type { Track } from "@/types"
import type {
  MetaDjAiChatSessionSummary,
  MetaDjAiMessage,
  MetaDjAiPersonalizationState,
  MetaDjAiProvider,
  MetaDjAiRateLimitState,
} from "@/types/metadjai.types"

interface MetaDjAiWelcomeDetails {
  nowPlayingTitle?: string
  nowPlayingArtist?: string
  collectionTitle?: string
  pageDetails: string
}

interface MetaDjAiSession {
  messages: MetaDjAiMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  sendMessage: (message: string) => Promise<void>
  stopStreaming: () => void
  resetConversation: () => void
  startNewSession: (seedMessages?: MetaDjAiMessage[]) => string
  regenerateLastResponse: () => Promise<void>
  retryLastMessage: () => Promise<void>
  switchMessageVersion: (messageId: string, versionIndex: number) => void
  canRetry: boolean
  rateLimit: MetaDjAiRateLimitState
  modelPreference: MetaDjAiProvider
  changeModelPreference: (provider: MetaDjAiProvider) => void
  personalization: MetaDjAiPersonalizationState
  togglePersonalization: (enabled: boolean) => void
  updatePersonalization: (next: Partial<MetaDjAiPersonalizationState>) => void
  sessions: MetaDjAiChatSessionSummary[]
  activeSessionId: string
  switchSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  refreshSessions: () => void
}

interface UseMetaDjAiChatPropsParams {
  isMetaDjAiOpen: boolean
  handleMetaDjAiClose: () => void
  metaDjAiSession: MetaDjAiSession
  metaDjAiWelcomeDetails: MetaDjAiWelcomeDetails
  headerHeight: number
  currentTrack: Track | null
}

export function useMetaDjAiChatProps({
  isMetaDjAiOpen,
  handleMetaDjAiClose,
  metaDjAiSession,
  metaDjAiWelcomeDetails,
  headerHeight,
  currentTrack,
}: UseMetaDjAiChatPropsParams) {
  return useMemo(
    () => ({
      isOpen: isMetaDjAiOpen,
      onClose: handleMetaDjAiClose,
      messages: metaDjAiSession.messages,
      isLoading: metaDjAiSession.isLoading,
      isStreaming: metaDjAiSession.isStreaming,
      error: metaDjAiSession.error,
      onSend: metaDjAiSession.sendMessage,
      onStop: metaDjAiSession.stopStreaming,
      onRefresh: metaDjAiSession.resetConversation,
      onNewSession: () => metaDjAiSession.startNewSession(),
      sessions: metaDjAiSession.sessions,
      activeSessionId: metaDjAiSession.activeSessionId,
      onSelectSession: metaDjAiSession.switchSession,
      onDeleteSession: metaDjAiSession.deleteSession,
      onRefreshSessions: metaDjAiSession.refreshSessions,
      onRegenerate: metaDjAiSession.regenerateLastResponse,
      onSwitchVersion: metaDjAiSession.switchMessageVersion,
      onRetry: metaDjAiSession.retryLastMessage,
      canRetry: metaDjAiSession.canRetry,
      welcomeDetails: metaDjAiWelcomeDetails,
      rateLimit: metaDjAiSession.rateLimit,
      modelPreference: metaDjAiSession.modelPreference,
      onModelPreferenceChange: metaDjAiSession.changeModelPreference,
      personalization: metaDjAiSession.personalization,
      onPersonalizationToggle: metaDjAiSession.togglePersonalization,
      onPersonalizationUpdate: metaDjAiSession.updatePersonalization,
      headerHeight,
      hasTrack: !!currentTrack,
    }),
    [isMetaDjAiOpen, handleMetaDjAiClose, metaDjAiSession, metaDjAiWelcomeDetails, headerHeight, currentTrack]
  )
}
