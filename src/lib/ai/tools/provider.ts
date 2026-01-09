/**
 * AI Tools Provider
 *
 * Provides tools based on the AI provider and capabilities.
 *
 * @module lib/ai/tools/provider
 */

import { openai } from '@ai-sdk/openai'
import { searchCatalog } from '@/lib/ai/tools/catalog'
import { getZuberantContext } from '@/lib/ai/tools/knowledge'
import { getPlatformHelp } from '@/lib/ai/tools/platform-help'
import {
  proposePlayback,
  proposeQueueSet,
  proposePlaylist,
  proposeSurface,
} from '@/lib/ai/tools/proposals'
import { getRecommendations } from '@/lib/ai/tools/recommendations'
import { wrapToolsWithErrorHandling, safeToolExecute } from '@/lib/ai/tools/utils'
import { getWisdomContent } from '@/lib/ai/tools/wisdom'

/**
 * Get tools for the current provider
 *
 * Returns the tools object for streamText/generateText.
 * Includes web_search tool only when explicitly enabled (native OpenAI web search).
 *
 * @param provider 'openai' | 'anthropic' | 'google' | 'xai'
 * @param options Provider capabilities override
 * @returns Tools object with provider-appropriate tools
 */
export function getTools(
  provider: 'openai' | 'anthropic' | 'google' | 'xai',
  options?: { webSearchAvailable?: boolean }
) {
  // Base tools available to all providers
  // Wrapped with error handling for graceful degradation
  const baseTools = wrapToolsWithErrorHandling({
    searchCatalog,
    getPlatformHelp,
    getWisdomContent,
    getRecommendations,
    getZuberantContext,
    proposePlayback,
    proposeQueueSet,
    proposePlaylist,
    proposeSurface,
  })

  const webSearchAvailable =
    provider === 'openai' && (options?.webSearchAvailable ?? true)

  // OpenAI has native web search capability when enabled
  if (webSearchAvailable) {
    // Wrap the SDK-provided web_search tool with our error handler for graceful degradation
    const webSearchTool = openai.tools.webSearch()
    const wrappedWebSearch = {
      ...webSearchTool,
      execute: webSearchTool.execute
        ? safeToolExecute(
            'web_search',
            webSearchTool.execute as (input: unknown) => Promise<unknown>
          )
        : webSearchTool.execute,
    }

    return {
      ...baseTools,
      // OpenAI native web search tool - enables real-time web search for current information
      // The AI will use this tool when users ask about current events, recent news,
      // or information that may not be in its training data
      // Wrapped with our error handler for graceful degradation
      web_search: wrappedWebSearch,
    }
  }

  // Anthropic and other providers get base tools only
  return baseTools
}
