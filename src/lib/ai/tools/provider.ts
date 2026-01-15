/**
 * AI Tools Provider
 *
 * Provides tools based on the AI provider and capabilities.
 *
 * @module lib/ai/tools/provider
 */

import { openai } from '@ai-sdk/openai'
import { searchCatalog, getCatalogSummary } from '@/lib/ai/tools/catalog'
import { openFeedback } from '@/lib/ai/tools/feedback'
import { getZuberantContext } from '@/lib/ai/tools/knowledge'
import { getMcpTools } from '@/lib/ai/tools/mcp'
import { getPlatformHelp } from '@/lib/ai/tools/platform-help'
import {
  proposePlayback,
  proposeQueueSet,
  proposePlaylist,
  proposeSurface,
} from '@/lib/ai/tools/proposals'
import { getRecommendations } from '@/lib/ai/tools/recommendations'
import {
  wrapToolsWithErrorHandling,
  safeToolExecute,
  sanitizeAndValidateToolResult,
} from '@/lib/ai/tools/utils'
import { getWisdomContent } from '@/lib/ai/tools/wisdom'

type ToolSet = Record<string, unknown>

function wrapToolsWithOutputSanitization(tools: ToolSet): ToolSet {
  const wrapped: ToolSet = {}

  for (const [name, tool] of Object.entries(tools)) {
    if (
      tool &&
      typeof tool === 'object' &&
      'execute' in tool &&
      typeof (tool as { execute?: unknown }).execute === 'function'
    ) {
      const execute = (tool as { execute: (input: unknown) => Promise<unknown> }).execute
      wrapped[name] = {
        ...tool,
        execute: safeToolExecute(name, async (input: unknown) => {
          const result = await execute(input)
          return sanitizeAndValidateToolResult(result, name)
        }),
      }
      continue
    }

    wrapped[name] = tool
  }

  return wrapped
}

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
export async function getTools(
  provider: 'openai' | 'anthropic' | 'google' | 'xai',
  options?: { webSearchAvailable?: boolean }
) {
  // Base tools available to all providers
  // Wrapped with error handling for graceful degradation
  const baseTools = wrapToolsWithErrorHandling({
    searchCatalog,
    getCatalogSummary,
    getPlatformHelp,
    getWisdomContent,
    getRecommendations,
    getZuberantContext,
    openFeedback,
    proposePlayback,
    proposeQueueSet,
    proposePlaylist,
    proposeSurface,
  })
  const mcpTools = wrapToolsWithOutputSanitization(await getMcpTools())

  const webSearchAvailable =
    provider === 'openai' && (options?.webSearchAvailable ?? true)

  // OpenAI has native web search capability when enabled
  if (webSearchAvailable) {
    // Wrap the SDK-provided web_search tool with our error handler for graceful degradation
    const webSearchTool = openai.tools.webSearch()
    const wrappedWebSearch = {
      ...webSearchTool,
      execute: webSearchTool.execute
        ? safeToolExecute('web_search', async (input: unknown) => {
            const result = await (
              webSearchTool.execute as (input: unknown) => Promise<unknown>
            )(input)
            return sanitizeAndValidateToolResult(result, 'web_search')
          })
        : webSearchTool.execute,
    }

    return {
      ...baseTools,
      ...mcpTools,
      // OpenAI native web search tool - enables real-time web search for current information
      // The AI will use this tool when users ask about current events, recent news,
      // or information that may not be in its training data
      // Wrapped with our error handler for graceful degradation
      web_search: wrappedWebSearch,
    }
  }

  // Anthropic and other providers get base tools only
  return {
    ...baseTools,
    ...mcpTools,
  }
}
