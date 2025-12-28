# MetaDJai Knowledge Base System

> **Complete reference for the MetaDJai knowledge base architecture, content, and extension**

**Last Modified**: 2025-12-27 15:26 EST
## Overview

MetaDJai is the AI companion built by Z (the creator behind MetaDJ) and serves as MetaDJ's AI extension inside MetaDJ Nexus. It includes a comprehensive knowledge base system that provides accurate, curated information about MetaDJ, Zuberant, the broader ecosystem vision, creative philosophy, and brand identity. This enables MetaDJai to answer questions about the artist, studio, and creative approach with grounded, consistent responses.

### Why a Knowledge Base?

**Grounded Responses**: Instead of relying on general AI knowledge, MetaDJai retrieves specific, curated content that accurately represents MetaDJ's identity and philosophy.

**Consistency**: All responses about MetaDJ, Zuberant, and related concepts come from a single authoritative source.

**Extensibility**: New knowledge can be added by updating JSON files without modifying code.

**Search Optimization**: Hybrid keyword + semantic search ensures relevant content surfaces for user queries, even when phrased differently.

### Content Standards

All knowledge base content follows the knowledge base standard: `docs/standards/knowledge-base-standard.md`.

- **Third-person voice**: No first-person narration in entries (no "I," "me," "my," "we," "our"), except inside quoted user prompts or proper titles.
- **Glossary alignment**: Use canonical terminology (MetaDJ, MetaDJai, Zuberant, Digital Jockey, Zuberverse).
- **AI framing**: Prefer "AI companion" / "Creative Companion"; avoid "AI assistant" in content.
- **Mission/Vision/Aspiration**: Use the verbatim short-form sentences from `1-system/1-context/1-knowledge/0-core/core-mission-vision.md` when quoted.
- **Persona emulation**: MetaDJai emulates the MetaDJai persona (not a human). It can be represented through the MetaDJ avatar with explicit AI disclosure.

## Architecture

### File Structure

```
src/data/knowledge/
├── metadj.json        # Artist identity, creative journey, music
├── zuberant.json      # Studio operations, methodologies
├── ecosystem.json     # Ecosystem vision, culture, community
├── philosophy.json    # AI & creative philosophy
├── identity.json      # Brand voice, visual identity
└── workflows.json     # Creative protocols (Deep Work, Ideation)
```

### Data Flow

```
User Query
    ↓
getZuberantContext Tool (tools.ts)
    ↓
Keyword + Semantic Similarity Search (in-memory embeddings, no vector DB)
    ↓
Score & Rank Entries
    ↓
Return Top 5 Results
    ↓
MetaDJai Response
```

### Integration Points

| Component | File | Purpose |
|-----------|------|---------|
| Tool Definition | `src/lib/ai/tools.ts` | Defines `getZuberantContext` tool |
| Knowledge Files | `src/data/knowledge/*.json` | JSON knowledge entries |
| System Prompt | `src/lib/ai/meta-dj-ai-prompt.ts` | Documents tool usage for AI |

## Knowledge Categories

### 1. MetaDJ (`metadj.json`)

The avatar and Digital Jockey.

**Topics Covered**:
- Artist identity and origin story
- The creator behind the MetaDJ avatar
- Creative journey and evolution
- Digital Jockey archetype
- Synthetic Orchaistra production method
- Musical identity and influences
- Creative principles
- Music collections philosophy
- Music collections (Majestic Ascent, Bridging Reality, Metaverse Revelation)
- Performance methodology
- Key milestones

**Example Queries**:
- "Who is MetaDJ?"
- "What is the Synthetic Orchaistra method?"
- "Tell me about Majestic Ascent"
- "How does MetaDJ create music?"

### 2. Zuberant (`zuberant.json`)

The Metaverse Experience Studio (the production entity behind MetaDJ; AI-native in how it operates).

**Topics Covered**:
- Studio identity and name meaning
- AI-native approach
- Being Zuberant philosophy
- One person amplified by AI
- Version Zero (v0) Philosophy
- Systems + Spontaneity balance
- Brand Corpus framework
- Iterative Curation methodology
- Music Collections model
- Three converging forces (AI, Metaverse, Creator Economy)
- Transparency principle
- Mission and vision

**Example Queries**:
- "What is Zuberant?"
- "What does 'Being Zuberant' mean?"
- "How does the Brand Corpus work?"
- "What is Iterative Curation?"

### 3. Ecosystem Vision (`ecosystem.json`)

The broader ecosystem vision anchored by MetaDJ Nexus.

**Topics Covered**:
- Ecosystem vision and how MetaDJ Nexus fits today
- Three reality layers (Physical, Virtual, Phygital)
- Purest Vibes culture
- Narrative philosophy
- Community participation
- MetaDJ as Digital Jockey within the ecosystem
- Long-term expansion framing

**Example Queries**:
- "What is the ecosystem vision?"
- "How does MetaDJ Nexus fit into the broader vision?"
- "What does 'purest vibes' mean?"
- "What are the three reality layers?"

### 4. Philosophy (`philosophy.json`)

Creative and AI philosophy foundations.

**Topics Covered**:
- Three-tier framework: Compose, Orchestrate, Conduct
- The Conductor's Choice
- Creativity, Sensibility, Discernment
- Human-AI collaboration philosophy
- Iterative Curation philosophy
- Creative philosophy (movements over mechanisms)
- Transparency and ethics
- Systems and Spontaneity
- The Authentic vs. The Algorithmic
- Work and meaning
- Organic presence at scale

**Example Queries**:
- "What is the AI philosophy?"
- "What does 'compose, orchestrate, conduct' mean?"
- "How do humans and AI collaborate?"
- "What makes creativity irreplaceable?"

### 5. Identity (`identity.json`)

Brand identity, voice, and visual expression.

**Topics Covered**:
- Core identity elements (MetaDJ, MetaDJai, Zuberant, ecosystem vision)
- Brand voice characteristics
- The 80s warmth aesthetic
- Adaptive voice spectrum
- Language patterns
- Color philosophy (Purple, Cyan, Magenta, Blue)
- Visual design language
- Typography system
- The MetaDJ avatar
- What Being Zuberant looks like

**Example Queries**:
- "What is the brand voice?"
- "What do the colors mean?"
- "What typography does MetaDJ use?"
- "How should MetaDJ sound?"

### 6. Workflows (`workflows.json`)

Creative protocols and structured working modes.

**Topics Covered**:
- Deep Work protocol
- Ideation session structure
- Writing assistance mode
- Learning/Research framework
- Coding companion mode
- Zuberant Method application

**Example Queries**:
- "Start a deep work session"
- "Help me brainstorm ideas"
- "I need to write a blog post"
- "Let's code something"

## Entry Schema

Each knowledge entry follows this structure:

```typescript
interface KnowledgeEntry {
  id: string          // Unique identifier (kebab-case)
  title: string       // Human-readable title
  content: string     // Full knowledge content (can be multi-paragraph)
  keywords: string[]  // Search terms for matching
  synonyms?: string[] // Optional synonym matches for higher relevance
}

interface KnowledgeCategory {
  category: string    // Category identifier
  title: string       // Category display name
  description: string // Category description
  entries: KnowledgeEntry[]
}
```

### Example Entry

```json
{
  "id": "metadj-synthetic-orchaistra",
  "title": "The Synthetic Orchaistra Method",
  "content": "The Synthetic Orchaistra is MetaDJ's signature production methodology that treats AI as an infinite digital ensemble. The name itself tells the story—'Synthetic' embraces AI generation while 'Orchaistra' fuses orchestra with AI.\n\nThe process works like conducting an actual orchestra: compose individual elements (melodies, beats, harmonies, atmospheres), then orchestrate them into unified experiences. Generate hundreds of variations for each element, evaluate for emotional resonance, and select through discernment.\n\nEvery track represents countless explorations, with human taste determining what deserves to exist. It's not about finding the 'best' by any objective measure—it's about recognizing when something resonates.",
  "keywords": ["synthetic orchaistra", "production", "method", "methodology", "music", "process", "how", "ai", "orchestra", "compose", "orchestrate"]
}
```

## Search Algorithm

The `getZuberantContext` tool uses a **hybrid retrieval** approach:

1. **Keyword Scoring (always on)** — The original weighted keyword/synonym/content scoring.
2. **Semantic Similarity (when OpenAI is configured)** — Lightweight in‑memory embeddings using OpenAI `text-embedding-3-small`, cached per server process. No external vector database is required (requires `OPENAI_API_KEY`).

Semantic similarity gently boosts relevant entries even when exact keywords aren’t present, while keyword scoring keeps results grounded in canonical terminology.

### Scoring Weights

| Match Type | Score |
|------------|-------|
| Title contains query | +10 |
| Keyword exact match | +5 |
| Synonym match | +4 |
| Keyword partial match | +2 |
| Content contains query | +3 |
| Content contains query word | +1 |

### Semantic Boost (Optional)

When embeddings are available:
- Each knowledge entry is embedded once and cached in memory.
- The user’s query is embedded on request.
- Cosine similarity is computed between the query vector and each entry.
- Similarity is added as a boost to keyword score.

If embeddings fail (missing key, network issues), the system falls back automatically to keyword‑only search.

### Topic Filtering

The tool supports filtering by topic:

```typescript
topic: 'metadj' | 'zuberant' | 'zuberverse' | 'philosophy' | 'identity' | 'workflows' | 'all'
```

**Default**: `all` (searches all categories)

### Result Limits

- **Maximum results**: 5 entries per query
- **Query length limit**: 200 characters (security)
- **Result size limit**: ~8k characters (token optimization)

## Extending the Knowledge Base

### Adding New Entries

1. **Choose the appropriate category file** based on content topic
2. **Create a new entry** following the schema:
   ```json
   {
     "id": "category-topic-name",
     "title": "Human-Readable Title",
     "content": "Comprehensive content...",
     "keywords": ["relevant", "search", "terms"]
   }
   ```
3. **Use unique IDs** in kebab-case format
4. **Include rich keywords** for search discovery
5. **Test retrieval** by asking MetaDJai related questions

### Keyword Best Practices

- Include obvious terms users would search for
- Add synonyms and related concepts
- Include question patterns ("what is", "how does")
- Keep keywords lowercase
- Include both full phrases and individual words

### Content Guidelines

- Write in first-person where natural ("I create...", "My approach...")
- Keep content comprehensive but focused
- Use natural language, not bullet points
- Multiple paragraphs are supported and encouraged
- No internal R&D details, roadmaps, or sensitive information
- Content should be appropriate for public knowledge base

### Adding a New Category

1. Create new JSON file in `src/data/knowledge/`
2. Follow the `KnowledgeCategory` structure
3. Import in `src/lib/ai/tools.ts`:
   ```typescript
   import newKnowledge from '@/data/knowledge/new-category.json'
   ```
4. Add to `KNOWLEDGE_BASE` array:
   ```typescript
   const KNOWLEDGE_BASE: KnowledgeCategory[] = [
     // ... existing
     newKnowledge as KnowledgeCategory,
   ]
   ```
5. Update schema enum in `zuberantContextSchema`:
   ```typescript
   topic: z.enum(['metadj', 'zuberant', 'zuberverse', 'philosophy', 'identity', 'new-category', 'all'])
   ```
6. Update tool description in `getZuberantContext`
7. Update system prompt in `meta-dj-ai-prompt.ts`

## Security Considerations

### Input Sanitization

- Query strings are sanitized and limited to 200 characters
- Prevents prompt injection through search queries

### Result Size Limits

- Results capped at ~8k characters to prevent token abuse
- Maximum 5 results returned per query

### Content Guidelines

- No internal R&D details
- No roadmaps or future plans
- No business metrics or financials
- No personal private information
- All content appropriate for public consumption

## Testing

### Manual Testing

Ask MetaDJai questions and verify responses:

```
"Who is MetaDJ?"
"What is the Synthetic Orchaistra method?"
"What does 'purest vibes' mean?"
"What is the AI philosophy?"
"What colors does MetaDJ use?"
```

### Validating JSON

Run JSON validation on knowledge files:

```bash
cd src/data/knowledge
for f in *.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f', 'utf8'))"
  echo "$f: valid"
done
```

### Checking Entry Coverage

Review each category for completeness:
- Are all major topics covered?
- Are keywords sufficient for discovery?
- Is content accurate and current?

## Web Search Capability

In addition to the knowledge base, MetaDJai has real-time web search capability when using the OpenAI provider with a direct `OPENAI_API_KEY`.

### When Web Search Is Used

- **Current events** — News, recent developments, trending topics
- **Recent information** — Data that may have changed since training
- **Explicit requests** — When users ask to "search the web" or "look up" something
- **Real-time topics** — Music charts, release dates, current events

### Source Attribution

When MetaDJai uses web search, it includes a formatted Sources section at the end of responses:

```markdown
---
**Sources:**
- [Article Title](https://example.com/article)
- [Page Description](https://example.com/page)
```

### Provider Availability

| Tool | OpenAI (GPT-5.2) | Google (Gemini) | Anthropic (Claude) | xAI (Grok) |
|------|------------------|----------------|-------------------|------------|
| `getZuberantContext` | ✅ | ✅ | ✅ | ✅ |
| `searchCatalog` | ✅ | ✅ | ✅ | ✅ |
| `getPlatformHelp` | ✅ | ✅ | ✅ | ✅ |
| `getRecommendations` | ✅ | ✅ | ✅ | ✅ |
| `web_search` | ✅ (direct `OPENAI_API_KEY` only) | ❌ | ❌ | ❌ |

Web search is only available when OpenAI is the active provider and MetaDJai is configured with a direct `OPENAI_API_KEY`. Gemini, Claude, and Grok rely on the knowledge base and other local tools.

## Voice Adaptation (Internal)

### Intentional Simplification from Corpus

The Brand Corpus defines a **5-mode voice spectrum** for MetaDJ's full creative range. MetaDJai adapts this internally into **4 voice facets** optimized for real-time conversational context. These are not user-facing modes—MetaDJai shifts automatically based on intent.

| Corpus Voice Mode | Chatbot Equivalent | Rationale |
|-------------------|-------------------|-----------|
| **Friendly Explainer** | **Warm Connector** | Both: clear, warm, practical communication |
| **Philosopher-Essayist** | **Deep Explorer** | Both: reflective, meaning-forward, probing |
| **Systems Architect** | **Structured Architect** | Direct match: crisp, ordered, trade-offs explicit |
| **Creative Director / Exuberant Muse** | **Exuberant Muse** | Chatbot simplifies to single creative mode |
| **Mentor-Leader** | *(Not mapped)* | Community/guidance context less common in chat |

### Why This Simplification?

1. **Chatbot context differs from full writing**: Real-time chat benefits from faster mode recognition
2. **Four modes cover primary interaction patterns**: Help, exploration, technical, creative
3. **Mentor-Leader mode is contextually rare**: Community leadership voice less needed in 1:1 chat
4. **Facet blending still occurs**: The AI naturally blends facets based on conversation flow

### Implementation Location

Voice facets are defined in `src/lib/ai/meta-dj-ai-prompt.ts:149`:

```typescript
Embody MetaDJ's voice spectrum: **Warm Connector**, **Exuberant Muse**,
**Structured Architect**, **Deep Explorer**. Blend these naturally based on context.
```

The knowledge base (`identity.json`) mirrors this 4-facet system for consistency.

### Source of Truth

- **Corpus authority**: `1-system/1-context/2-instructions/core-instructions.md` defines the canonical 5-mode spectrum
- **Chatbot adaptation**: This document clarifies the intentional simplification is by design, not drift

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md) - AI Configuration section
- [vercel-ai-sdk-integration.md](vercel-ai-sdk-integration.md) - AI SDK implementation
- [../API.md](../API.md) - API endpoint documentation

## Maintenance

### Regular Review

- Quarterly review of content accuracy
- Update when brand messaging evolves
- Add entries for new concepts or offerings
- Remove outdated information

### Sync with Brand Corpus

The knowledge base content is derived from the Zuberant Brand Corpus but adapted for public consumption. When corpus documents are updated, review knowledge base for sync needs.
