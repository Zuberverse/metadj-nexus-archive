/**
 * MCP Tool Loader (Local Only)
 *
 * Lazily connects to a local MCP server over stdio and exposes its tools.
 * Disabled in production by default to avoid spawning external processes.
 */

import { createMCPClient } from '@ai-sdk/mcp'
import { Experimental_StdioMCPTransport as StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

const MCP_TOOL_PREFIX = 'mcp_'

/**
 * MCP tool structure - aligns with Vercel AI SDK tool pattern
 * Using 'unknown' for type safety while preserving flexibility for MCP server responses
 */
type ToolSet = Record<string, unknown>

let cachedToolsPromise: Promise<ToolSet> | null = null

function parseArgs(raw?: string): string[] {
  if (!raw) return []
  const trimmed = raw.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((value) => String(value))
      }
    } catch (error) {
      logger.warn('[MCP] Failed to parse AI_MCP_SERVER_ARGS as JSON; falling back to whitespace split', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return trimmed.split(/\s+/).filter(Boolean)
}

function prefixTools(tools: ToolSet): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [`${MCP_TOOL_PREFIX}${name}`, tool]),
  )
}

function getMcpConfig() {
  const env = getServerEnv()
  const enabled =
    env.NODE_ENV !== 'production' &&
    env.AI_MCP_ENABLED === 'true'

  return {
    enabled,
    command: env.AI_MCP_SERVER_COMMAND?.trim() || '',
    args: parseArgs(env.AI_MCP_SERVER_ARGS),
    cwd: env.AI_MCP_SERVER_CWD?.trim() || undefined,
  }
}

async function initMcpTools(): Promise<ToolSet> {
  const config = getMcpConfig()
  if (!config.enabled) {
    return {}
  }

  if (!config.command) {
    logger.warn('[MCP] AI_MCP_ENABLED is true but no AI_MCP_SERVER_COMMAND is set')
    return {}
  }

  try {
    const client = await createMCPClient({
      transport: new StdioMCPTransport({
        command: config.command,
        args: config.args,
        cwd: config.cwd,
      }),
      name: 'metadj-nexus',
      version: '1.0.0',
    })

    const tools = await client.tools()
    return prefixTools(tools)
  } catch (error) {
    logger.warn('[MCP] Failed to initialize MCP tools', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {}
  }
}

export async function getMcpTools(): Promise<ToolSet> {
  const { enabled } = getMcpConfig()
  if (!enabled) return {}

  if (!cachedToolsPromise) {
    cachedToolsPromise = initMcpTools()
  }

  return cachedToolsPromise
}
