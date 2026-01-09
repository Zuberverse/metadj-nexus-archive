/**
 * Curated On-Demand Actions
 *
 * Static actions always available in MetaDJai regardless of context.
 * These are general-purpose prompts that help users get started.
 */

export interface QuickAction {
  id: string
  title: string
  description: string
  prompt: string
}

/**
 * Curated actions that are always available in the Actions panel.
 * These prompts are designed to be context-agnostic and help users
 * clarify their thinking, explore the platform, or get creative inspiration.
 */
export const CURATED_ACTIONS: QuickAction[] = [
  {
    id: "curated-clarify-plan",
    title: "Clarify & plan",
    description: "Three questions, then a simple map to move.",
    prompt: "Ask me three quick questions (goal, constraints, time) as a numbered list with each item on its own line. Add a blank line, then share a 3-bullet plan with bold headers and one 10-minute starter—each bullet on its own line.",
  },
  {
    id: "curated-reframe-idea",
    title: "Reframe my idea",
    description: "Tighten the angle and the very next move.",
    prompt: "Ask for what I'm making and who it's for. Reflect it back with a tighter angle, a creative twist, and the clearest next step. Keep it in MetaDJai's tone and use short lines so the pieces stay separate.",
  },
  {
    id: "curated-platform-guide",
    title: "Platform guide",
    description: "Quick nav or creative help—your pick.",
    prompt: "Ask me what I'm trying to do in MetaDJ Nexus. Then give 2–3 steps using the actual labels (Hub, Music, Cinema, Wisdom, Journal, MetaDJai, Queue). Put each step on its own line. Keep it short—no tours.",
  },
  {
    id: "curated-perspective-shift",
    title: "Perspective shift",
    description: "See the work from a fresh angle.",
    prompt: "Offer two alternative framings for what I'm making—one bold, one minimal—each on its own line. Suggest one question I should answer next.",
  },
  {
    id: "curated-surprise",
    title: "Surprise me",
    description: "A random creative lateral jump.",
    prompt: "Give me a completely random creative constraint or idea that I haven't asked for, which could apply to music, visuals, or strategy. Keep it brief and provocative.",
  },
  {
    id: "curated-explain-feature",
    title: "Explain feature",
    description: "How does this app work?",
    prompt: "Briefly explain the core features of MetaDJ Nexus (Hub, Music, Cinema, Wisdom, Journal, MetaDJai) in one sentence each. Then ask if I want a deeper dive into one.",
  }
]
