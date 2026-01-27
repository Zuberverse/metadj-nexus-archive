# MetaDJai Skills & MCP Integration Roadmap

> **Strategic roadmap for modular skill files and MCP server integration in MetaDJai**

**Last Modified**: 2026-01-26 17:04 EST
**Status**: Planning
**Priority**: High

---

## Executive Summary

This document outlines the architecture and implementation roadmap for incorporating **modular skill files** and **MCP (Model Context Protocol) servers** into MetaDJai, the AI companion within MetaDJ Nexus. The goal is to make MetaDJai more capable, contextual, and extensible while maintaining the lean, focused architecture already in place.

### Key Findings from Research

1. **Vercel AI SDK supports skill-like composition** through `prepareCall`, `dynamicTool`, and the newer `bash-tool` package
2. **MCP Prompts are server-side skills** — reusable templates that can be loaded dynamically
3. **Your current `ToolLoopAgent` architecture is compatible** — skills can be adopted incrementally
4. **Corpus skills can be adapted** for MetaDJai with minimal transformation

---

## Current State

### Existing MetaDJai Capabilities

| Tool | Purpose | Status |
|------|---------|--------|
| `searchCatalog` | Find tracks/collections by query | Active |
| `getCatalogSummary` | Full catalog overview | Active |
| `getRecommendations` | Mood/energy/similarity suggestions | Active |
| `getWisdomContent` | Thoughts, Guides, Reflections | Active |
| `proposePlayback/Queue/Playlist/Surface` | UI action proposals | Active |
| `getPlatformHelp` | Help system | Active |
| `getZuberantContext` | Brand/Zuberant context | Active |
| `openFeedback` | Feedback modal trigger | Active |
| `web_search` | Real-time web search (OpenAI only) | Active |
| `mcp_*` | Local MCP tools (dev only) | Active (gated) |

### Current Architecture

```
User Message
    │
    ▼
┌─────────────────────────────────────┐
│         buildSystemInstructions()   │
│  - Static persona                   │
│  - Context (track, collection)      │
│  - Personalization                  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│           ToolLoopAgent             │
│  - model (GPT/Claude/Gemini/Grok)   │
│  - tools (base + MCP)               │
│  - instructions                     │
│  - output schema                    │
└─────────────────────────────────────┘
    │
    ▼
Response
```

---

## Proposed Architecture: Skills + MCP

### Target Architecture

```
User Message
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Skill Resolution Layer                     │
│  1. Detect skill triggers from message content               │
│  2. Match against skill registry (corpus + MCP prompts)      │
│  3. Load skill instructions                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                      prepareCall()                           │
│  - Base instructions + skill instructions                    │
│  - Configure active tools based on skill                     │
│  - Inject user context (personalization, history)            │
│  - Optional: Load MCP prompt with arguments                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                     ToolLoopAgent                            │
│  - model (provider-specific)                                 │
│  - tools (base + skill-specific + MCP)                       │
│  - instructions (composed dynamically)                       │
│  - output schema (skill-defined or general)                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Response
```

### Three Integration Patterns

| Pattern | Mechanism | Complexity | Best For |
|---------|-----------|------------|----------|
| **prepareCall** | Dynamic instructions/tools at runtime | Low | Context-specific behavior, user personas |
| **MCP Prompts** | Server-provided skill templates | Medium | External skills, shared skill libraries |
| **dynamicTool** | Runtime-loaded tools with unknown schemas | Medium | User-defined functions, MCP tools |

---

## Skill Recommendations

### Tier 1: High-Value, Low-Complexity (Phase 1)

| Skill | Purpose | Trigger Keywords | Implementation |
|-------|---------|------------------|----------------|
| **harmonic-mixing-advisor** | Suggest tracks that mix well based on key/BPM | "mix with", "goes after", "harmonic", "Camelot" | Uses catalog data + Camelot wheel logic |
| **mood-interpreter** | Translate vague feelings into concrete recommendations | "I feel...", "something for when...", "vibe" | Enhances `getRecommendations` mapping |
| **track-analyzer** | Explain track characteristics deeply | "tell me about this track", "analyze", "breakdown" | Enriches catalog explanations |

### Tier 2: Engagement & Personalization (Phase 2)

| Skill | Purpose | Trigger Keywords |
|-------|---------|------------------|
| **energy-flow-architect** | Design energy arcs for sets/playlists | "set flow", "energy arc", "build up", "peak" |
| **music-discovery-guide** | Guided catalog exploration with storytelling | "explore", "discover", "surprise me", "journey" |
| **collection-storyteller** | Deep narrative about collections | "story behind", "why this collection", "inspiration" |
| **dj-transition-advisor** | Suggest transition techniques | "how to transition", "blend", "mix from X to Y" |

### Tier 3: Advanced/Power User (Phase 3)

| Skill | Purpose | Use Case |
|-------|---------|----------|
| **set-builder** | Build complete DJ sets with transitions | Power users planning sets |
| **bpm-key-calculator** | Calculate mixing compatibility | Technical DJ queries |
| **music-memory-keeper** | Remember preferences across sessions | Personalization over time |
| **creative-prompt-generator** | Inspire creative work from music | Artists, writers using music for inspiration |

### Skill Adaptation from Corpus

Existing corpus skills that can be adapted for MetaDJai:

| Corpus Skill | MetaDJai Adaptation | Changes Needed |
|--------------|---------------------|----------------|
| `harmonic-mixing-advisor` | Focus on platform catalog | Simpler output, catalog-aware |
| `energy-flow-architect` | Output as playlist proposal | Use `proposePlaylist` tool |
| `track-analyzer` | Conversational tone | Integrate with `searchCatalog` |
| `dj-set-curator` | Reference collections | Map to catalog genres |
| `genre-blending-advisor` | Cross-collection picks | Use catalog genre data |

---

## MCP Server Recommendations

### Tier 1: Essential Integrations (Phase 1-2)

| MCP | Purpose | Implementation | Priority |
|-----|---------|----------------|----------|
| **Memory MCP** | Persistent user preferences across sessions | `@modelcontextprotocol/server-memory` | HIGH |
| **Spotify MCP** | External music discovery, artist context | Custom or community server | HIGH |
| **Perplexity MCP** | Real-time music news, artist info | `mcp.perplexity.ai` | MEDIUM |

### Tier 2: Enhanced Discovery (Phase 2-3)

| MCP | Purpose | Implementation |
|-----|---------|----------------|
| **YouTube MCP** | Music videos, DJ sets, tutorials | Custom server |
| **Last.fm MCP** | Listening history, similar artists | Community server |
| **Discogs MCP** | Vinyl/release information, music history | Custom (Discogs API) |
| **Genius MCP** | Lyrics, song meanings, artist stories | Custom (Genius API) |

### Tier 3: DJ-Specific (Phase 3+)

| MCP | Purpose | Implementation |
|-----|---------|----------------|
| **Beatport MCP** | New releases, charts, DJ trends | Custom (Beatport API) |
| **Resident Advisor MCP** | Events, DJ profiles, venue info | Custom (RA API) |
| **Mixcloud MCP** | DJ mix discovery, radio shows | Custom (Mixcloud API) |
| **SoundCloud MCP** | DJ mixes, unreleased tracks | Custom (SoundCloud API) |

### Production Considerations

Current MCP implementation is dev-only (`AI_MCP_ENABLED` gated). For production:

| Approach | How | Trade-offs |
|----------|-----|------------|
| **HTTP Transport** | Replace stdio with HTTP MCP server | More stable, requires deployed server |
| **OpenAI MCP Tool** | Use `openai.tools.mcp({ serverUrl })` | Only works with OpenAI provider |
| **Anthropic MCP** | Use `mcpServers` provider option | Only works with Anthropic provider |
| **Baked-in Skills** | Load corpus skills at build time | No runtime overhead, less dynamic |

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Establish skill infrastructure with minimal disruption.

**Tasks**:
1. [ ] Create skill registry system (`src/lib/ai/skills/registry.ts`)
2. [ ] Implement skill detection from user messages
3. [ ] Add `prepareCall` to existing `ToolLoopAgent` usage
4. [ ] Implement first skill: `harmonic-mixing-advisor`
5. [ ] Implement second skill: `mood-interpreter`

**Files to Create/Modify**:
```
src/lib/ai/skills/
├── registry.ts       # Skill manifest and lookup
├── detector.ts       # Trigger keyword matching
├── loader.ts         # Load skill instructions
└── skills/
    ├── harmonic-mixing.ts
    └── mood-interpreter.ts

src/app/api/metadjai/route.ts  # Add prepareCall
```

**Success Criteria**:
- Skills activate based on message keywords
- Instructions dynamically composed
- No regression in existing functionality

### Phase 2: MCP Integration (Weeks 3-4)

**Goal**: Enable MCP prompts as external skill sources.

**Tasks**:
1. [ ] Extend `mcp.ts` to support `experimental_listPrompts()` and `experimental_getPrompt()`
2. [ ] Create unified skill loader (corpus + MCP)
3. [ ] Implement Memory MCP for user preference persistence
4. [ ] Add Spotify MCP for external music context
5. [ ] Implement 2-3 additional skills from Tier 1-2

**Files to Create/Modify**:
```
src/lib/ai/tools/mcp.ts         # Add prompt support
src/lib/ai/skills/unified-loader.ts
src/lib/ai/skills/skills/
├── track-analyzer.ts
├── energy-flow-architect.ts
└── collection-storyteller.ts
```

**Success Criteria**:
- MCP prompts discoverable as skills
- Memory persists user preferences
- Spotify integration provides external context

### Phase 3: Production Hardening (Weeks 5-6)

**Goal**: Production-ready skill system with robust error handling.

**Tasks**:
1. [ ] Add skill execution telemetry
2. [ ] Implement skill caching for performance
3. [ ] Add fallback behavior when skills fail
4. [ ] HTTP transport for production MCP servers
5. [ ] Document skill creation process for future development

**Success Criteria**:
- Skills gracefully degrade on failure
- Telemetry tracks skill usage and performance
- Production MCP deployment guide complete

### Phase 4: Advanced Features (Weeks 7+)

**Goal**: Power user features and ecosystem expansion.

**Tasks**:
1. [ ] Implement `set-builder` skill
2. [ ] Add YouTube MCP for video content
3. [ ] User-facing skill preferences (enable/disable)
4. [ ] Skill marketplace exploration (skills.sh integration)
5. [ ] Multi-skill orchestration (skill chains)

---

## Technical Specifications

### Skill File Format

```typescript
// src/lib/ai/skills/skills/harmonic-mixing.ts
import { z } from 'zod';

export const harmonicMixingSkill = {
  name: 'harmonic-mixing-advisor',
  description: 'Suggests tracks that mix harmonically based on musical key and BPM',

  triggerKeywords: [
    'mix with', 'goes with', 'harmonic', 'blend',
    'transition from', 'after this', 'camelot'
  ],

  instructions: `
## Harmonic Mixing Advisor

When users ask what tracks mix well together:

1. **Identify the reference track** from query or current context
2. **Find harmonically compatible tracks** using Camelot wheel:
   - Same key (1A → 1A)
   - Adjacent keys (1A → 12A, 2A)
   - Parallel major/minor (1A → 1B)
3. **Consider BPM compatibility**: ±5% ideal, ±10% workable
4. **Rank by combined score**: harmonic + BPM + energy match

**Output format**:
- Lead with 2-3 best recommendations
- Explain WHY they mix well
- Suggest transition technique if relevant
`,

  // Optional: structured output schema
  outputSchema: z.object({
    referenceTrack: z.string(),
    recommendations: z.array(z.object({
      trackId: z.string(),
      title: z.string(),
      key: z.string().optional(),
      bpm: z.number().optional(),
      matchReason: z.string(),
      transitionTip: z.string().optional(),
    })),
  }).optional(),

  // Optional: tools this skill needs
  requiredTools: ['searchCatalog', 'getRecommendations'],
};
```

### Skill Registry

```typescript
// src/lib/ai/skills/registry.ts
export interface SkillDefinition {
  name: string;
  description: string;
  triggerKeywords: string[];
  instructions: string;
  outputSchema?: z.ZodType;
  requiredTools?: string[];
  source: 'corpus' | 'mcp';
}

export async function buildSkillRegistry(): Promise<SkillDefinition[]> {
  const skills: SkillDefinition[] = [];

  // Load corpus skills
  const corpusSkills = await loadCorpusSkills();
  skills.push(...corpusSkills);

  // Load MCP prompts as skills (if enabled)
  if (getMcpConfig().enabled) {
    const mcpPrompts = await listMcpPrompts();
    skills.push(...mcpPrompts.map(adaptMcpPromptToSkill));
  }

  return skills;
}
```

### prepareCall Integration

```typescript
// In route.ts - ToolLoopAgent configuration
const agent = new ToolLoopAgent({
  model,
  maxOutputTokens: modelSettings.maxOutputTokens,
  temperature: modelSettings.temperature,

  callOptionsSchema: z.object({
    skillContext: z.string().optional(),
    personalization: z.record(z.string()).optional(),
  }),

  prepareCall: async ({ options, ...settings }) => {
    let instructions = buildSystemInstructions(/* base params */);

    // Detect and inject skill
    if (options.skillContext) {
      const skill = await loadSkill(options.skillContext);
      if (skill) {
        instructions += `\n\n## Active Skill: ${skill.name}\n${skill.instructions}`;
      }
    }

    return { ...settings, instructions };
  },

  tools,
  providerOptions,
  stopWhen: createStopCondition(),
  output: structuredReplyOutput,
});
```

---

## Considerations & Risks

### Technical Risks

| Risk | Mitigation |
|------|------------|
| **Token budget overflow** | Skills should be concise (~200-400 tokens); monitor with `checkTokenBudget()` |
| **Skill detection false positives** | Use multi-keyword matching, not single keywords |
| **MCP server reliability** | Implement timeouts, fallbacks, circuit breaker pattern |
| **Performance degradation** | Cache skill registry, lazy-load skill instructions |

### UX Considerations

| Consideration | Approach |
|---------------|----------|
| **Skill activation transparency** | Consider subtle UI indicator when skill is active |
| **Skill override** | Allow users to say "ignore X skill" or "just answer directly" |
| **Skill discovery** | Future: help users discover what skills are available |

### Security Considerations

| Consideration | Approach |
|---------------|----------|
| **MCP prompt injection** | Validate MCP prompt content before injection |
| **Skill instruction injection** | Sanitize any user-provided skill parameters |
| **External MCP servers** | Only connect to trusted MCP servers in production |

---

## Success Metrics

### Phase 1 Metrics
- Skill activation rate (% of conversations using skills)
- User satisfaction with skill-enhanced responses
- No increase in error rate vs baseline

### Phase 2 Metrics
- MCP prompt usage rate
- Memory persistence utilization
- External context (Spotify) usage in recommendations

### Phase 3+ Metrics
- Skill diversity (how many different skills used)
- User preference for skill-enabled features
- Performance benchmarks (latency, token usage)

---

## Related Documentation

- **Vercel AI SDK Integration**: `docs/features/vercel-ai-sdk-integration.md`
- **MCP DevTools Plan**: `docs/architecture/MCP-DEVTOOLS-PLAN.md`
- **AI Resilience Patterns**: `docs/architecture/AI-RESILIENCE-PATTERNS.md`
- **Corpus Skills Architecture**: `1-system/3-docs/standards/architecture/agents-skills-commands-architecture.md`
- **Vercel Skills Config**: `1-system/3-docs/integrations/vercel-skills-config.md`

---

## Appendix: Priority Matrix

```
                    HIGH VALUE
                        │
     ┌──────────────────┼──────────────────┐
     │                  │                  │
     │  harmonic-       │  Spotify MCP     │
     │  mixing-advisor  │                  │
     │                  │  Memory MCP      │
     │  energy-flow-    │                  │
LOW  │  architect       │  YouTube MCP     │  HIGH
EFFORT│                 │                  │  EFFORT
     │  track-analyzer  │                  │
     │                  │                  │
     │  mood-           │  Perplexity MCP  │
     │  interpreter     │                  │
     │                  │                  │
     └──────────────────┼──────────────────┘
                        │
                    LOW VALUE
```

---

## TL;DR

**What**: Add modular skill files and MCP server integration to MetaDJai.

**Key Points**:
- Use `prepareCall` for dynamic instruction injection (lowest friction)
- Adapt corpus skills for MetaDJai context
- Prioritize: harmonic-mixing, mood-interpreter, Memory MCP, Spotify MCP
- Phased rollout over 6+ weeks

**Next Steps**: Decide which Phase 1 skill to prototype first.
