# Vercel AI SDK Integration Guide

> **Complete reference for Vercel AI SDK implementation in MetaDJ Nexus**

**Last Modified**: 2025-12-22 19:12 EST
## Overview

MetaDJ Nexus uses **Vercel AI SDK** as the foundation for all AI capabilities, providing a unified, type-safe interface for working with multiple AI providers without vendor lock-in.

### Why Vercel AI SDK?

**Provider Optionality (Active)**: SDK supports multiple providers; MetaDJai ships with GPT, Gemini, Claude, and Grok via a Model dropdown

**SDK Version**: 5.x (current; v6 beta tracked in roadmap)

**TypeScript Native**: First-class TypeScript support with full type safety and IntelliSense

**Streaming Built-In**: Native support for real-time streaming responses essential for chat experiences

**Tool Support**: Comprehensive tool/function calling for agentic behaviors and web search

**Framework Agnostic**: Works seamlessly with Next.js, React, Vue, Svelte, and Node.js

**Production Ready**: Built-in error handling, telemetry, and middleware for enterprise deployments

## Architecture

### AI SDK Core

The foundational library providing unified APIs for text generation, structured data, and tool integration.

**Main Packages**:
- `ai` - Core SDK with `generateText`, `streamText`, `generateObject`
- `@ai-sdk/openai` - OpenAI provider integration
- `@ai-sdk/anthropic` - Anthropic provider integration
- `@ai-sdk/google` - Google provider integration
- `@ai-sdk/xai` - xAI provider integration

**Installation** (see `package.json` for current versions):
```json
"dependencies": {
  "ai": "^5.0.102",
  "@ai-sdk/openai": "^2.0.72",
  "@ai-sdk/anthropic": "^2.0.49",
  "@ai-sdk/google": "^2.0.49",
  "@ai-sdk/xai": "^2.0.41"
}
```

### Current Implementation

**Default Model**: OpenAI GPT-5.2 Chat (`gpt-5.2-chat-latest`)
**Additional Providers**: Gemini 3 Flash (`gemini-3-flash-preview`), Claude Haiku 4.5 (`claude-haiku-4-5`), Grok 4.1 Fast (`grok-4-1-fast-non-reasoning`)
**Provider Selection**: Model dropdown (GPT/Gemini/Claude/Grok) per request, default GPT; server default via `AI_PROVIDER`
**Failover**: Priority order GPT → Gemini → Claude → Grok (skips the active provider) when enabled
**Model Disclosure**: The active provider + model ID are injected into the system prompt so MetaDJai can answer “what model are you?” accurately, but it only shares this when asked.

### Resilience Features

**Circuit Breaker Pattern** (`src/lib/ai/circuit-breaker.ts`):
- Opens after 3 consecutive failures to a provider
- Automatically recovers after 1 minute
- Prevents cascading failures during outages

**Failover Hooks** (`src/lib/ai/failover.ts`):
- Active: Provider errors fall back to the next available provider in priority order (GPT → Gemini → Claude → Grok)

**Response Caching** (`src/lib/ai/cache.ts`):
- In-memory LRU cache for repeated queries
- Configurable via environment variables:
  - `AI_CACHE_ENABLED`: Enable/disable caching (default: `true` in production)
  - `AI_CACHE_TTL_MS`: Cache TTL in milliseconds (default: 1,800,000 = 30 min, range: 60,000–86,400,000)
  - `AI_CACHE_MAX_SIZE`: Maximum cache entries (default: 100, range: 10–1,000)
- LRU eviction removes oldest 20% when at capacity
- Reduces costs for common questions

**Cost Tracking** (`src/lib/ai/providers.ts`):
- `estimateCost()` calculates per-request costs based on token counts
- Logged to console for monitoring
- Prep for future analytics dashboard

## Core Concepts

### 1. Provider Configuration

**File**: `src/lib/ai/providers.ts`

MetaDJ Nexus uses a multi-provider configuration (OpenAI, Google, Anthropic, xAI) with per-request overrides:

```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI, google } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createXai, xai } from '@ai-sdk/xai'
import { getServerEnv } from '@/lib/env'

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'xai'

const DEFAULT_PRIMARY_MODEL = 'gpt-5.2-chat-latest'
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5'
const DEFAULT_GOOGLE_MODEL = 'gemini-3-flash-preview'
const DEFAULT_XAI_MODEL = 'grok-4-1-fast-non-reasoning'

function getOpenAIClient() {
  const env = getServerEnv()
  if (env.OPENAI_API_KEY) {
    return createOpenAI({ apiKey: env.OPENAI_API_KEY })
  }
  return createOpenAI({})
}

function getGoogleClient() {
  const env = getServerEnv()
  if (env.GOOGLE_API_KEY) {
    return createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
  }
  return google
}

function getXaiClient() {
  const env = getServerEnv()
  return env.XAI_API_KEY ? createXai({ apiKey: env.XAI_API_KEY }) : xai
}

function getEnvConfig() {
  const env = getServerEnv()
  return {
    PRIMARY_MODEL: process.env.PRIMARY_AI_MODEL || DEFAULT_PRIMARY_MODEL,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_AI_MODEL || DEFAULT_ANTHROPIC_MODEL,
    GOOGLE_MODEL: process.env.GOOGLE_AI_MODEL || DEFAULT_GOOGLE_MODEL,
    XAI_MODEL: process.env.XAI_AI_MODEL || DEFAULT_XAI_MODEL,
    AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
    HAS_OPENAI: !!env.OPENAI_API_KEY,
    HAS_ANTHROPIC: !!env.ANTHROPIC_API_KEY,
    HAS_GOOGLE: !!googleApiKey,
    HAS_XAI: !!env.XAI_API_KEY,
  }
}

function resolveProvider(providerOverride?: AIProvider): AIProvider {
  if (providerOverride) return providerOverride
  const { AI_PROVIDER } = getEnvConfig()
  return AI_PROVIDER === 'anthropic' || AI_PROVIDER === 'google' || AI_PROVIDER === 'xai'
    ? AI_PROVIDER
    : 'openai'
}

export function getModel(providerOverride?: AIProvider) {
  const { PRIMARY_MODEL, ANTHROPIC_MODEL, GOOGLE_MODEL, XAI_MODEL } = getEnvConfig()
  const provider = resolveProvider(providerOverride)
  if (provider === 'anthropic') return anthropic(ANTHROPIC_MODEL)
  if (provider === 'google') return getGoogleClient()(GOOGLE_MODEL)
  if (provider === 'xai') return getXaiClient()(XAI_MODEL)
  return getOpenAIClient()(PRIMARY_MODEL)
}

const PROVIDER_PRIORITY: AIProvider[] = ['openai', 'google', 'anthropic', 'xai']

function getProviderAvailability() {
  const { HAS_OPENAI, HAS_GOOGLE, HAS_ANTHROPIC, HAS_XAI } = getEnvConfig()
  return {
    openai: HAS_OPENAI,
    google: HAS_GOOGLE,
    anthropic: HAS_ANTHROPIC,
    xai: HAS_XAI,
  }
}

function resolveFallbackProvider(providerOverride?: AIProvider) {
  const provider = resolveProvider(providerOverride)
  const availability = getProviderAvailability()
  return PROVIDER_PRIORITY.find((candidate) => candidate !== provider && availability[candidate]) ?? null
}

export function getFallbackModel(providerOverride?: AIProvider) {
  const { PRIMARY_MODEL, ANTHROPIC_MODEL, GOOGLE_MODEL, XAI_MODEL } = getEnvConfig()
  const fallbackProvider = resolveFallbackProvider(providerOverride)
  if (!fallbackProvider) return null
  if (fallbackProvider === 'anthropic') return anthropic(ANTHROPIC_MODEL)
  if (fallbackProvider === 'google') return getGoogleClient()(GOOGLE_MODEL)
  if (fallbackProvider === 'xai') return getXaiClient()(XAI_MODEL)
  return getOpenAIClient()(PRIMARY_MODEL)
}
```

**Key Design Decisions**:
- **Default provider**: `AI_PROVIDER` sets the server default; UI `modelPreference` overrides per request
- **Fallback safety**: automatic failover when the fallback provider is configured
- **Fallback mapping**: Priority order GPT → Gemini → Claude → Grok; future providers default to GPT unless explicitly mapped
- **Web search**: only available when OpenAI is active and `OPENAI_API_KEY` is set
- **UI labels**: Model selector uses simplified labels (GPT, Gemini, Claude, Grok) rather than official model names
- Validated environment via `getServerEnv()` ensures type safety

### 2. Streaming Text Responses

**File**: `src/app/api/metadjai/stream/route.ts`

Streaming enables real-time chat experiences with progressive token delivery. **AI SDK 5.x replaced `maxSteps` with `stopWhen`**—default is `stepCountIs(1)`, which stops right after a tool call (finishReason: `tool-calls`). Add a custom `stopWhen` that allows one extra step when the last step ended with `tool-calls`, otherwise stop after the first step. Without this, tool-triggered questions return blank responses.

```typescript
import { streamText } from 'ai'
import { getModel, getModelInfo, getModelSettingsForProvider } from '@/lib/ai/providers'
import { getTools } from '@/lib/ai/tools'

export async function POST(request: NextRequest) {
  const payload = await request.json()
  const requestedProvider = payload.modelPreference
  const preferredProvider =
    requestedProvider === 'openai' ||
    requestedProvider === 'anthropic' ||
    requestedProvider === 'google' ||
    requestedProvider === 'xai'
      ? requestedProvider
      : getModelInfo().provider
  const { hasOpenAI, hasAnthropic, hasGoogle, hasXai } = getModelInfo(preferredProvider)

  if (preferredProvider === 'openai' && !hasOpenAI) {
    return Response.json({ error: 'MetaDJai is not configured.' }, { status: 503 })
  }
  if (preferredProvider === 'anthropic' && !hasAnthropic) {
    return Response.json({ error: 'MetaDJai is not configured.' }, { status: 503 })
  }
  if (preferredProvider === 'google' && !hasGoogle) {
    return Response.json({ error: 'MetaDJai is not configured.' }, { status: 503 })
  }
  if (preferredProvider === 'xai' && !hasXai) {
    return Response.json({ error: 'MetaDJai is not configured.' }, { status: 503 })
  }

  const model = getModel(preferredProvider)
  const modelSettings = getModelSettingsForProvider(preferredProvider)
  const webSearchAvailable = preferredProvider === 'openai' && hasOpenAI
  const tools = getTools(preferredProvider, { webSearchAvailable })

  const result = streamText({
    model,
    maxOutputTokens: modelSettings.maxOutputTokens,
    temperature: modelSettings.temperature,
    system: buildMetaDjAiSystemPrompt(payload.context, preferredProvider, {
      webSearchAvailable,
    }),
    messages: sanitizeMessages(payload.messages),
    tools,
    stopWhen: ({ steps }) => {
      if (steps.length === 0) return false
      const last = steps[steps.length - 1]
      if (last?.finishReason === 'tool-calls') {
        return steps.length >= 2 // allow one more step to turn tool output into text
      }
      return true // no tools -> stop after first step
    },
  })

  // AI SDK 5.x uses toUIMessageStreamResponse() for SSE format
  // Outputs: data: {"type":"text-delta","delta":"..."} lines
  return result.toUIMessageStreamResponse()
}
```

**Streaming Benefits**:
- Immediate response starts, no waiting for completion
- Lower perceived latency in UI
- Natural conversational flow
- Efficient token delivery (Server-Sent Events)
- Paired with per-session rate limiting (20 messages / 5 minutes) and duplicate-message checks at the API layer to keep usage predictable
  - **Sync endpoint parity**: `/api/metadjai` enforces the same guardrails (20 / 5 minutes, HTML scrub, duplicate suppression, session cookies, 429 + Retry-After) when streaming is unavailable. Use the same `stopWhen` there so tool-driven replies complete.
  - **UI transparency**: the chat header shows the live counter `x/20 in 5m` with a cooldown countdown when limited.

### 3. Tool Integration (Local Tools)

**File**: `src/lib/ai/tools.ts`

Vercel AI SDK supports provider-executed tools and custom local tools. MetaDJai ships with nine local tools plus one provider‑native tool:

**Local tools (in `src/lib/ai/tools.ts`)**
- `searchCatalog` — local catalog search
- `getPlatformHelp` — feature/navigation help
- `getRecommendations` — mood/similarity recommendations
- `getZuberantContext` — hybrid keyword + semantic knowledge retrieval
- `getWisdomContent` — fetch full Wisdom item text for summaries/context
- `proposePlayback` — active control proposals for playback (user‑confirmed)
- `proposeQueueSet` — active control proposals for multi-track queue updates (user‑confirmed)
- `proposePlaylist` — active control proposals for playlist creation (user‑confirmed)
- `proposeSurface` — active control proposals for Wisdom/Queue/Search/Music panel (user‑confirmed)

**Provider tool**
- `web_search` — OpenAI native web search (OpenAI provider + direct `OPENAI_API_KEY` only)

```typescript
// Catalog Search Tool (Local)
export const searchCatalog = {
  description: 'Search the MetaDJ music catalog for tracks and collections...',
  inputSchema: z.object({
    query: z.string(),
    type: z.enum(['track', 'collection', 'all']).optional(),
  }),
  execute: async ({ query, type }) => {
    // Searches local tracks.json and collections.json
    // Returns up to 10 results sorted by relevance
  },
}

// Platform Help Tool (Local)
export const getPlatformHelp = {
  description: 'Get contextual help about MetaDJ Nexus platform features...',
  inputSchema: z.object({
    feature: z.enum(['music', 'cinema', 'wisdom', 'queue', 'search', 'metadjai', 'shortcuts', 'overview']),
  }),
  execute: async ({ feature }) => {
    // Returns feature-specific documentation including:
    // - title, description, howToUse, tips
    // - Or platform overview with all surfaces
  },
}

// Track Recommendations Tool (Local)
export const getRecommendations = {
  description: 'Get track recommendations based on mood, energy level, or similarity...',
  inputSchema: z.object({
    mood: z.enum(['focus', 'energy', 'relaxation', 'epic', 'creative', 'ambient']).optional(),
    energyLevel: z.enum(['low', 'medium', 'high']).optional(),
    similarTo: z.string().optional(),
    collection: z.string().optional(),
    limit: z.number().optional(),
  }),
  execute: async ({ mood, energyLevel, similarTo, collection, limit = 5 }) => {
    // Scores tracks based on:
    // - Mood-to-genre mapping
    // - BPM as energy proxy
    // - Collection/genre similarity
    // Returns scored recommendations with metadata
  },
}

// Playback Control Tool (Local)
export const proposePlayback = {
  description: 'Propose a track to play or add to queue based on user request...',
  inputSchema: z.object({
    action: z.enum(['play', 'pause', 'next', 'prev', 'queue']).describe('Playback action to propose'),
    searchQuery: z.string().optional().describe('Optional track/collection query'),
    context: z.string().optional(),
  }),
  execute: async ({ searchQuery, action, context }) => {
    // 1. Searches catalog for best match
    // 2. Returns structured proposal UI
    // 3. UI renders interactive "Play/Queue" card
  },
}

// Provider tool selection
export function getTools(provider: 'openai' | 'anthropic' | 'google' | 'xai', options?: { webSearchAvailable?: boolean }) {
  // Base tools available to all providers
  const baseTools = {
    searchCatalog,       // Always available - catalog queries
    getPlatformHelp,     // Always available - navigation assistance
    getRecommendations,  // Always available - music suggestions
    getZuberantContext,  // Always available - knowledge base search
    getWisdomContent,    // Always available - wisdom retrieval
    proposePlayback,     // Always available - interactive playback control
    proposeQueueSet,     // Always available - interactive queue updates
    proposePlaylist,     // Always available - interactive playlist creation
    proposeSurface,      // Always available - interactive UI navigation
  }

  const webSearchAvailable = provider === 'openai' && (options?.webSearchAvailable ?? true)

  // OpenAI has native web search capability when enabled
  if (webSearchAvailable) {
    return {
      ...baseTools,
      web_search: openai.tools.webSearch(), // Real-time web search for current info
    }
  }

  return baseTools
}
```

**Tool Architecture**:
- **searchCatalog**: Custom tool accessing local JSON data for precise music answers
- **getPlatformHelp**: Contextual help for all platform features (Music, Cinema, Wisdom, Queue, Search, MetaDJai)
- **getRecommendations**: Mood-based and similarity-based track recommendations using local catalog data
- **getZuberantContext**: Knowledge base search for MetaDJ, Zuberant, broader ecosystem vision, philosophy, identity, and workflows content
- **getWisdomContent**: Pull full Wisdom item text for summaries or context-aware responses
- **proposePlayback**: Interactive tool that generates a UI card allowing the user to confirm playback actions (Active Control pattern)
- **proposeQueueSet**: Interactive tool for multi-track queue updates with user confirmation
- **proposePlaylist**: Interactive tool for playlist creation with user confirmation (and optional queueing)
- **proposeSurface**: Interactive tool for UI navigation (Wisdom, Queue, Search, Music panel) with user confirmation
- **web_search** (OpenAI + direct `OPENAI_API_KEY` only): Native OpenAI web search for real-time information about current events, recent news, or topics beyond training data
- **Multi-Step Reasoning**: Controlled via `stopWhen: stepCountIs()` in the streaming route (replaces deprecated `maxSteps`)

### 4. Model Configuration

**File**: `src/lib/ai/providers.ts`

Model settings are centralized and environment-driven (provider + model name), with safe defaults for responsiveness:

```typescript
export type ModelSettings = {
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'xai'
  maxOutputTokens: number
  temperature: number
}

export function getModelSettingsForProvider(providerOverride: AIProvider): ModelSettings {
  const { PRIMARY_MODEL, ANTHROPIC_MODEL, GOOGLE_MODEL, XAI_MODEL } = getEnvConfig()
  const provider = resolveProvider(providerOverride)
  const name = provider === 'openai'
    ? PRIMARY_MODEL
    : provider === 'anthropic'
      ? ANTHROPIC_MODEL
      : provider === 'google'
        ? GOOGLE_MODEL
        : XAI_MODEL
  return { name, provider, maxOutputTokens: 2048, temperature: 0.7 }
}
```

**Configuration Strategy**:
- Centralized model settings for consistency
- Temperature 0.7 for balanced creativity/coherence
- 2048 token limit for responsive experiences
- Easy to extend for new models

## Implementation Patterns

### Environment Configuration

**File**: `.env.example`

```bash
# OpenAI API Key (Required for GPT + web search)
OPENAI_API_KEY=sk-proj-...

# Google API Key (Optional, enables Gemini)
# GOOGLE_API_KEY=AIza...

# Anthropic API Key (Optional, enables Claude)
# ANTHROPIC_API_KEY=sk-ant-...

# xAI API Key (Optional, enables Grok)
# XAI_API_KEY=...

# Provider selection (optional; defaults to openai)
# AI_PROVIDER=openai

# Model Configuration (optional overrides)
# PRIMARY_AI_MODEL=gpt-5.2-chat-latest
# GOOGLE_AI_MODEL=gemini-3-flash-preview
# ANTHROPIC_AI_MODEL=claude-haiku-4-5
# XAI_AI_MODEL=grok-4-1-fast-non-reasoning
# OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe-2025-12-15

# Failover toggle (optional; defaults to true)
# AI_FAILOVER_ENABLED=true
```

**Environment Validation** (`src/lib/env.ts`):
```typescript
const serverEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  XAI_API_KEY: z.string().min(1).optional(),
});
```

### Error Handling

**Provider Availability Check**:
```typescript
const { hasOpenAI, hasAnthropic, hasGoogle, hasXai } = getModelInfo(preferredProvider)
if (preferredProvider === 'openai' && !hasOpenAI) {
  return Response.json({ error: 'MetaDJai is not configured.' }, { status: 503 })
}
if (preferredProvider === 'anthropic' && !hasAnthropic) {
  return Response.json({ error: 'MetaDJai is not configured.' }, { status: 503 })
}
if (preferredProvider === 'google' && !hasGoogle) {
  return Response.json({ error: 'MetaDJai is not configured.' }, { status: 503 })
}
if (preferredProvider === 'xai' && !hasXai) {
  return Response.json({ error: 'MetaDJai is not configured.' }, { status: 503 })
}
```

**Model Selection**:
- `modelPreference` overrides per request (Model dropdown)
- `AI_PROVIDER` sets the server default when no preference is sent (`openai`, `google`, `anthropic`, `xai`)
- `PRIMARY_AI_MODEL` / `ANTHROPIC_AI_MODEL` / `GOOGLE_AI_MODEL` / `XAI_AI_MODEL` override base models

### Model Information Introspection

```typescript
export function getModelInfo(providerOverride?: AIProvider) {
  const {
    PRIMARY_MODEL,
    ANTHROPIC_MODEL,
    GOOGLE_MODEL,
    XAI_MODEL,
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    GOOGLE_API_KEY,
    XAI_API_KEY,
  } = getEnvConfig()
  const provider = resolveProvider(providerOverride)

  return {
    provider,
    model: provider === 'openai'
      ? PRIMARY_MODEL
      : provider === 'anthropic'
        ? ANTHROPIC_MODEL
        : provider === 'google'
          ? GOOGLE_MODEL
          : XAI_MODEL,
    hasOpenAI: !!OPENAI_API_KEY,
    hasAnthropic: !!ANTHROPIC_API_KEY,
    hasGoogle: !!googleApiKey,
    hasXai: !!XAI_API_KEY,
  }
}
```

## Advanced Features

### Provider-Specific Tools

MetaDJ Nexus uses OpenAI-native tools via the unified SDK:

**OpenAI Tools** (Currently Implemented):
- `web_search` - Native OpenAI web search via `openai.tools.webSearch()` (enabled in MetaDJai only when direct `OPENAI_API_KEY` is configured)
- DALL-E integration (future)
- Code interpreter (future)
 
**Note**: Web search is only available when OpenAI is the active provider and a direct `OPENAI_API_KEY` is configured. Gemini, Claude, and Grok rely on local tools and the knowledge base.

**Web Search UX Features**:
- **Visual indicator**: During streaming, the chat UI shows "Searching the web..." with a Globe icon while the web_search tool executes
- **Source attribution**: The system prompt instructs MetaDJai to include a "Sources:" section with hyperlinked references when using web search results
- **Natural mention**: MetaDJai mentions when it searched the web (e.g., "I searched for that..." or "Based on what I found...")

### Voice Interaction (OpenAI Audio Transcriptions)

**File**: `src/app/api/metadjai/transcribe/route.ts`

MetaDJ Nexus integrates **OpenAI Audio Transcriptions** for high-fidelity speech-to-text.

**Architecture**:
1. **Client**: `MetaDjAiChatInput` uses `MediaRecorder` API to capture audio (webm/opus).
2. **Proxy**: `/api/metadjai/transcribe` securely routes the audio blob to OpenAI's API.
3. **Model**: Uses `gpt-4o-mini-transcribe-2025-12-15` by default (override with `OPENAI_TRANSCRIBE_MODEL`).
4. **Integration**: Transcribed text is automatically inserted into the chat input for fluid voice-driven interaction.

**Privacy**:
- API keys are server-side only.
- Audio is processed transiently and not stored.

**Best‑practice alignment (OpenAI Cookbook)**:
- **File upload workflow**: Suited for short dictation; OpenAI file uploads allow up to 25MB, and we intentionally cap at 10MB for cost/latency control.
- **Real‑time alternatives**: Streaming or Realtime APIs are recommended for live captions; MetaDJ Nexus uses short, non‑streaming dictation for reliability.
- **Prompt usage**: Whisper prompts are best for context/proper nouns, limited to ~224 tokens; short prompts can be unreliable. We omit prompts by default to avoid prompt‑echo on short inputs.
- **Language hint**: The server sets `language=en` for consistent short‑phrase accuracy.

### Future Capabilities

**Structured Data Extraction** (not yet implemented):
```typescript
import { generateObject } from 'ai'

const result = await generateObject({
  model: getModel(),
  schema: z.object({
    trackRecommendations: z.array(z.object({
      title: z.string(),
      reason: z.string(),
    })),
  }),
  prompt: 'Recommend 5 tracks based on user preferences',
})
```

**User Personalization Layer** (planned):
- Opt‑in user profiles that let listeners share context about themselves (goals, tastes, current projects, constraints, preferred collaboration style).
- Stored locally first, with a clear “what MetaDJai knows about me” surface and granular toggles.
- Injected into the MetaDJai system prompt to enable deeper, more personal collaboration without breaking transparency or control.

**Agentic Multi‑Step Tool Calling** (planned):
- MetaDJai will be able to chain multiple tools in a single intent (ex: analyze your recent listening → build a micro‑set → open Cinema → draft a Wisdom summary → propose next steps).
- Tool chains stay within a strict “propose → confirm → execute” pattern. The AI supports execution; the user conducts meaning.
- Enables richer workflows beyond single‑step function calls while keeping safety and predictability intact.

## Testing and Development

### Local Testing

```bash
# Start development server
npm run dev

# Test with OpenAI (default)
OPENAI_API_KEY=sk-... npm run dev

# Test with Gemini
GOOGLE_API_KEY=... AI_PROVIDER=google npm run dev

# Test with Claude
ANTHROPIC_API_KEY=sk-... AI_PROVIDER=anthropic npm run dev

# Test with Grok
XAI_API_KEY=... AI_PROVIDER=xai npm run dev
```

### Model Overrides

```bash
# Explicitly pin the OpenAI default (gpt-5.2-chat-latest)
PRIMARY_AI_MODEL=gpt-5.2-chat-latest npm run dev

# Explicitly pin the Gemini default (gemini-3-flash-preview)
GOOGLE_AI_MODEL=gemini-3-flash-preview AI_PROVIDER=google npm run dev

# Explicitly pin the Anthropic default (claude-haiku-4-5)
ANTHROPIC_AI_MODEL=claude-haiku-4-5 AI_PROVIDER=anthropic npm run dev

# Explicitly pin the Grok default (grok-4-1-fast-non-reasoning)
XAI_AI_MODEL=grok-4-1-fast-non-reasoning AI_PROVIDER=xai npm run dev
```

## Best Practices

### 1. Always Validate Environment

```typescript
// ✅ CORRECT - Use validated environment
const env = getServerEnv()
const apiKey = env.OPENAI_API_KEY

// ❌ INCORRECT - Direct process.env access
const apiKey = process.env.OPENAI_API_KEY
```

### 2. Use Centralized Provider Functions

```typescript
// ✅ CORRECT - Use helper functions
const model = getModel(preferredProvider)
const settings = getModelSettingsForProvider(preferredProvider)

// ❌ INCORRECT - Direct instantiation
const model = openai('gpt-5.2-chat-latest')
```

### 3. Handle Provider Unavailability

```typescript
// ✅ CORRECT - Check availability
const { hasOpenAI, hasAnthropic, hasGoogle, hasXai } = getModelInfo(preferredProvider)
if (preferredProvider === 'openai' && !hasOpenAI) {
  return errorResponse('AI not configured')
}
if (preferredProvider === 'anthropic' && !hasAnthropic) {
  return errorResponse('AI not configured')
}
if (preferredProvider === 'google' && !hasGoogle) {
  return errorResponse('AI not configured')
}
if (preferredProvider === 'xai' && !hasXai) {
  return errorResponse('AI not configured')
}

// ❌ INCORRECT - Assume provider available
const model = openai(PRIMARY_MODEL) // Crashes if no key
```

## Migration Notes

Provider migrations are archived. The current stack is multi-provider (GPT + Gemini + Claude + Grok) with a UI selector and automatic fallback.

### From Tavily Search to Native Tools

**Before** (external API dependency):
```typescript
import { TavilySearchResults } from '@langchain/community/tools/tavily_search'

const searchTool = new TavilySearchResults({
  apiKey: process.env.TAVILY_API_KEY,
})
```

**After** (provider-native):
```typescript
const tools = getTools('openai', { webSearchAvailable: true })
// No external API, no extra dependency
```

**Benefits**:
- Zero external API costs
- No Tavily dependency
- Provider-executed (faster)
- Built-in citation support

## Troubleshooting

### Issue: "MetaDJai is not configured"

**Cause**: No API keys provided

**Solution**:
```bash
# Add at least one provider key to .env
OPENAI_API_KEY=sk-proj-...
GOOGLE_API_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=...

# If only one provider is configured, set the default provider
AI_PROVIDER=openai # or google/anthropic/xai
```

### Issue: Streaming not working

**Cause**: Not using the correct streaming response method for AI SDK version

**Solution** (AI SDK 5.x):
```typescript
// ✅ CORRECT - AI SDK 5.x uses toUIMessageStreamResponse()
return result.toUIMessageStreamResponse()

// ❌ INCORRECT - toDataStreamResponse() doesn't exist in AI SDK 5.x
return result.toDataStreamResponse()

// ❌ INCORRECT - toTextStreamResponse() sends plain text without delimiters
return result.toTextStreamResponse()

// ❌ INCORRECT - Raw response won't stream properly
return new Response(result)
```

**Note**: AI SDK 5.x changed the streaming API. The `toUIMessageStreamResponse()` method outputs SSE format (`data: {json}` lines) which the client-side parser expects.

### Issue: Tools not working

**Cause**: `web_search` disabled, missing OpenAI key, or OpenAI not selected

**Solution**:
```typescript
// ✅ CORRECT - OpenAI tools with web search enabled
const openaiTools = getTools('openai', { webSearchAvailable: true })

// Gemini, Claude, and Grok do not expose web_search; use local tools instead
const claudeTools = getTools('anthropic')
const geminiTools = getTools('google')
const grokTools = getTools('xai')
```

### Issue: TypeScript errors on model configuration

**Cause**: Not using validated environment

**Solution**:
```typescript
// ✅ CORRECT
const env = getServerEnv() // Validated with Zod
const key = env.OPENAI_API_KEY

// ❌ INCORRECT
const key = process.env.OPENAI_API_KEY // Unsafe
```

## Resources

### Official AI SDK Documentation
- **AI SDK Introduction**: https://sdk.vercel.ai/docs/introduction
- **AI SDK Core (streamText, generateText)**: https://sdk.vercel.ai/docs/ai-sdk-core
- **AI SDK UI (useChat, useCompletion)**: https://sdk.vercel.ai/docs/ai-sdk-ui
- **Tool Calling Guide**: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
- **Streaming Guide**: https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#streaming-text

### Provider Documentation
- **OpenAI Provider**: https://sdk.vercel.ai/providers/ai-sdk-providers/openai
- **Provider Registry**: https://sdk.vercel.ai/docs/ai-sdk-core/provider-management

### AI SDK GitHub & Examples
- **GitHub Repository**: https://github.com/vercel/ai
- **Example: Chatbot with Tools**: https://github.com/vercel/ai/tree/main/examples/next-openai

### MetaDJ Nexus Implementation Files
- **Provider Config**: `src/lib/ai/providers.ts`
- **Tools Config**: `src/lib/ai/tools.ts`
- **System Prompt**: `src/lib/ai/meta-dj-ai-prompt.ts`
- **Streaming Route**: `src/app/api/metadjai/stream/route.ts`
- **Environment Validation**: `src/lib/env.ts`

### AI Output Rendering & Styling

**File**: `src/components/metadjai/MetaDjAiMessageItem.tsx`

MetaDJ Nexus uses a customized Markdown rendering engine to ensure AI outputs match the application's premium aesthetic.

**Styling Features**:
- **Typography**: Uses `Cinzel` for headers (H1-H4) with gradients, and `Poppins` for body text with optimized readability (`leading-7`).
- **Interactive Elements**:
  - **Code Blocks**: Mac-style window headers with "Copy" functionality and `JetBrains Mono` font.
  - **Tables**: Zebra-striped, responsive tables with hover effects.
  - **Links**: High-visibility cyan links with transition effects.
- **Lists**: Custom styled bullets (cyan dots) and checkboxes for task lists.
- **Streaming State**: Custom pulsing indicators for "Thinking..." states and tool usage.

**Implementation**:
- Uses `react-markdown` with `remark-gfm` for GitHub Flavored Markdown support.
- Custom components overrides mapped in `markdownComponents` useMemo hook.
- Strict Tailwind utility usage for consistent design tokens (colors, spacing, shadows).

### Related Documentation
- **Changelog**: `CHANGELOG.md` (v0.9.20+ AI enhancements)
- **Deployment**: `docs/operations/BUILD-DEPLOYMENT-GUIDE.md` (environment setup)
- **User Guide Update Standard**: `docs/standards/user-guide-update-standard.md`

### Current Package Versions (as of 2025-12-19)

Provider packages are active in production: GPT (OpenAI), Gemini (Google), Claude (Anthropic), and Grok (xAI) are wired in.

```json
{
  "ai": "^5.0.102",
  "@ai-sdk/openai": "^2.0.72",
  "@ai-sdk/anthropic": "^2.0.49"
}
```

---

**Remember**: Vercel AI SDK is the foundation for all AI capabilities in MetaDJ Nexus. The unified interface enables flexibility while maintaining type safety and performance. Models may change, but the SDK provides stability.
