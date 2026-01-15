/**
 * Platform Help Tool
 *
 * Provides contextual help about MetaDJ Nexus features and navigation.
 *
 * @module lib/ai/tools/platform-help
 */

import { z } from 'zod'
import { sanitizeAndValidateToolResult } from '@/lib/ai/tools/utils'

// Platform feature documentation for the help tool
const PLATFORM_FEATURES = {
  hub: {
    title: 'Hub',
    description:
      'Mission control for MetaDJ Nexus—launch cinematic listening, catch updates, and jump into key surfaces.',
    howToUse:
      'Start in the Hub to launch the hero track into Cinema, browse spotlight updates, or open Music, Wisdom, Journal, or MetaDJai.',
    tips: [
      'Enter Cinema launches the hero track + visuals',
      'Wisdom Spotlight surfaces the latest Thought, Guide, and Reflection',
      'Platform Pulse tracks recent updates',
      'Quick Start checklist appears on mobile to track warmup steps',
    ],
  },
  music: {
    title: 'Music Experience',
    description:
      'Browse original music organized into music collections that grow organically.',
    howToUse:
      'Open the Music panel and use the Library tab to browse Featured and collections. Select a collection to see its track list (Start Here / Shuffle) and use "About Collection" for the story.',
    tips: [
      'Featured surfaces 10 rotating tracks for quick discovery',
      'Recently Played keeps your last 50 plays on this device',
      'Track options (•••) include Add to Queue and Add to Playlist',
    ],
  },
  cinema: {
    title: 'Cinema (Visual Experience)',
    description:
      'The visual experience layer—immersive scenes and visualizers synchronized with audio playback. Three modes: 3D visualizers, 2D visualizers, and video scenes.',
    howToUse:
      'Tap the Cinema button in the navigation to open. Choose from audio-reactive visualizers (respond to music frequency in real-time) or video scenes (ambient looping atmospheres).',
    tips: [
      'Controls auto-hide after 3.5 seconds',
      'Each collection has recommended visuals',
      '3D visualizers: Cosmos, Black Hole, Space Travel, Disco Ball',
      '2D visualizers: Pixel Portal, 8-Bit Adventure, Synthwave Horizon',
    ],
  },
  dream: {
    title: 'Dream (AI Avatar)',
    description:
      'Real-time AI avatar transformation — your webcam feed becomes a stylized avatar using Daydream/StreamDiffusion. Currently runs in avatar mode with a default visual style.',
    howToUse:
      'Open Cinema first, then enable Dream from the Cinema controls. Grant webcam permission when prompted. Your feed transforms into an AI-generated avatar in real-time.',
    tips: [
      'Requires Cinema to be open',
      'Webcam permission needed',
      'Currently uses a default avatar style — custom prompting coming soon',
      'Works best with good lighting and clear background',
    ],
  },
  wisdom: {
    title: 'Wisdom Hub',
    description:
      'Long-form content including Thoughts, Guides, and Reflections from MetaDJ.',
    howToUse:
      'Open Wisdom from the navigation, then choose Thoughts (essays), Guides (how‑to), or Reflections (biography).',
    tips: [
      'Clean reading experience with custom typography',
      'Wisdom reopens to your last‑visited section',
    ],
  },
  journal: {
    title: 'Journal',
    description:
      'Private, local-first space for ideas, drafts, and reflections.',
    howToUse:
      'Open Journal from the navigation, then add entries with the editor or voice dictation.',
    tips: [
      'Entries stay local in your browser',
      'Rich-text formatting toolbar is built in',
      'Voice dictation caps at 60 seconds',
    ],
  },
  queue: {
    title: 'Queue & Playback',
    description: 'Personal listening queue with priority lane for your picks.',
    howToUse:
      'Click the queue icon in the player controls. Add tracks via hover controls. Drag to reorder. Your picks play before automated queue.',
    tips: [
      'Queue persists for 24 hours',
      'Reset Order returns to curated collection flow',
      'Drag tracks to reorder your queue',
      'Your queue is local to your device',
    ],
  },
  search: {
    title: 'Search',
    description: 'Find tracks, collections, Wisdom entries, and Journal notes from anywhere.',
    howToUse:
      'Press Ctrl/Cmd + / to focus search. Type to see real-time results. Play or queue directly from results.',
    tips: [
      'Search by collection name: "majestic" finds Majestic Ascent tracks',
      'Search by genre: "epic" or "ambient" finds matching tracks',
    ],
  },
  metadjai: {
    title: 'MetaDJai',
    description:
      'AI-driven creative companion for navigation, ideation, and music-first support when you ask for it.',
    howToUse:
      'Open MetaDJai from the header (desktop) or bottom nav (mobile). Ask about the platform, request creative help, or explore ideas.',
    tips: [
      "I'm context-aware of what you're listening to",
      'Try Quick Actions for structured prompts',
      'Ask for playback or queue changes when you want music-first help',
      'Use Personalize to tune tone, length, and format',
    ],
  },
  account: {
    title: 'Account & Feedback',
    description:
      'Manage account settings, sign out, and send feedback to the team.',
    howToUse:
      'Open the Account panel from the user icon in the header (desktop). You can also ask MetaDJai to open the feedback form from any device.',
    tips: [
      'Update email or change password in the Account panel',
      'Feedback supports bugs, feature requests, ideas, and general notes',
      'Bug reports include severity from low to critical',
    ],
  },
  shortcuts: {
    title: 'Keyboard Shortcuts',
    description:
      'Quick keyboard controls for power users (WCAG 2.1.4 compliant with Ctrl/Cmd modifiers).',
    howToUse:
      'Press ? to see all shortcuts. Most require Ctrl/Cmd modifier: Ctrl/Cmd + Space for play/pause, Ctrl/Cmd + arrows for navigation.',
    tips: [
      'Ctrl/Cmd + / focuses search',
      'Ctrl/Cmd + M toggles mute',
      'Esc closes modals',
      '? shows help (no modifier needed)',
    ],
  },
}

const platformHelpSchema = z.object({
  feature: z
    .enum([
      'hub',
      'music',
      'cinema',
      'dream',
      'wisdom',
      'journal',
      'queue',
      'search',
      'metadjai',
      'account',
      'shortcuts',
      'overview',
    ])
    .describe('The platform feature to get help about'),
})

/**
 * Platform Help Tool
 *
 * Provides contextual help about MetaDJ Nexus features and navigation.
 */
export const getPlatformHelp = {
  description:
    'Get contextual help about MetaDJ Nexus platform features. Use when users ask how to navigate, find features, or need guidance.',
  inputSchema: platformHelpSchema,
  execute: async ({
    feature,
  }: {
    feature: keyof typeof PLATFORM_FEATURES | 'overview'
  }) => {
    let result

    if (feature === 'overview') {
      result = {
        title: 'MetaDJ Nexus Overview',
        description:
          "Your platform hub for MetaDJ's evolving ecosystem—Hub, Music, Cinema, Wisdom, Journal, MetaDJai, and account tools. The landing page is public; the full experience requires a free account.",
        surfaces: Object.entries(PLATFORM_FEATURES).map(([key, info]) => ({
          key,
          title: info.title,
          description: info.description,
        })),
      }
    } else {
      result = PLATFORM_FEATURES[feature] || { error: 'Feature not found' }
    }

    // SECURITY: Validate result size before returning
    return sanitizeAndValidateToolResult(result, 'getPlatformHelp')
  },
}
