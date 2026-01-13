/**
 * MetaDJ Nexus Guide Content
 *
 * Comprehensive content for the MetaDJ Nexus User Guide.
 * Organized by sections with detailed information about all app features.
 */

export interface GuideSection {
  id: string
  title: string
  icon?: string
  description?: string
}

export interface QuickStartStep {
  number: string
  title: string
  description: string
  tip?: string
}

export interface CoreSurface {
  key: string
  title: string
  icon: string
  description: string
  features: string[]
}

export interface KeyboardShortcut {
  key: string
  label: string
  category: "playback" | "navigation" | "queue"
}

export interface CollectionInfo {
  name: string
  description: string
  vibe: string
}

// Navigation sections for quick jump
export const GUIDE_NAV_SECTIONS: GuideSection[] = [
  { id: "quick-start", title: "Quick Start", icon: "🚀" },
  { id: "hub", title: "Hub", icon: "🏠" },
  { id: "music", title: "Music", icon: "🎵" },
  { id: "cinema", title: "Cinema", icon: "🎬" },
  { id: "wisdom", title: "Wisdom", icon: "📚" },
  { id: "journal", title: "Journal", icon: "📝" },
  { id: "metadjai", title: "MetaDJai", icon: "✨" },
  { id: "queue", title: "Queue", icon: "📋" },
  { id: "search", title: "Search", icon: "🔍" },
  { id: "shortcuts", title: "Shortcuts", icon: "⌨️" },
  { id: "help", title: "Getting Help", icon: "🧭" },
]

// Welcome section
export const GUIDE_WELCOME = {
  tagline: "Where music, visuals, and creative guidance converge",
  intro: "MetaDJ Nexus is my living studio and stage: original music, Cinema visuals, Wisdom, a private Journal, and MetaDJai as your creative companion. The Hub is mission control for launching a cinematic listen and catching the latest updates, while the Music panel holds the library, playlists, and queue.",
  previewNotice:
    "Welcome to the Public Preview—an early look at the MetaDJ Nexus experience. Explore original music, Cinema visuals, and MetaDJai as the platform evolves toward full launch.",
  askAiPrompt: "Questions? Ask MetaDJai for a walkthrough, creative guidance, or a listening flow.",
}

// Quick Start steps
export const GUIDE_QUICK_START: QuickStartStep[] = [
  {
    number: "1",
    title: "Start in the Hub",
    description: "On the Hub, tap Enter Cinema to play the hero track and open the visual layer. Or open the Music panel → Library to browse Featured, Recently Played, and collections. Inside a collection, use the \"About Collection\" toggle to read the story.",
    tip: "Featured is 10 curated tracks; Recently Played keeps your last 50 plays on this device.",
  },
  {
    number: "2",
    title: "Play From the Library",
    description: "Tap any track card to load it into the player. Use the ••• menu or Track Details to add to Queue or Playlists.",
    tip: "Ctrl/Cmd + Space plays/pauses, Ctrl/Cmd + / focuses search."
  },
  {
    number: "3",
    title: "Shape the Experience",
    description: "Toggle Cinema for fullscreen visuals, open Wisdom for guides, journal your ideas, or chat with MetaDJai for creative direction. On mobile, the bottom nav switches surfaces; on desktop, use the header toggles and side panels.",
    tip: "Ctrl/Cmd + S shuffles, Ctrl/Cmd + R cycles repeat."
  },
]

// Core Surfaces (expanded)
export const GUIDE_CORE_SURFACES: CoreSurface[] = [
  {
    key: "hub",
    title: "Hub",
    icon: "🏠",
    description: "Mission control for MetaDJ Nexus—launch cinematic listening, jump into MetaDJai, and catch the latest platform pulse.",
    features: [
      "Enter Cinema: plays the hero track and opens the visual layer",
      "Chat with MetaDJai: quick access to your creative companion",
      "Wisdom Spotlight: latest Thought, Guide, and Reflection cards",
      "Platform Pulse: preview status and recent updates",
      "News + Events: coming soon",
    ]
  },
  {
    key: "music",
    title: "Music Experience",
    icon: "🎵",
    description: "Original music organized into collections that grow as the creative exploration continues.",
    features: [
      "Library tab: Featured highlights, Recently Played (last 50 plays), and collections",
      "Tabs: Library, Playlists, Queue",
      "Track details: BPM, key, release date, and share links",
      "Share deep links for tracks, collections, and playlists",
      "Add to Queue: manual picks stay at the top",
      "Playlists: create, start, and share your own sets",
      "Collection stories: \"About Collection\" reveals the narrative intent",
    ]
  },
  {
    key: "cinema",
    title: "Cinema (Visual Experience)",
    icon: "🎬",
    description: "The visual experience layer—immersive scenes and visualizers synchronized with audio playback.",
    features: [
      "Scene selector: switch between visualizers and video scenes",
      "3D visualizers (desktop): Cosmos, Black Hole, Space Travel, Disco Ball",
      "2D visualizers: Pixel Portal, 8-Bit Adventure, Synthwave Horizon",
      "Video scenes: MetaDJ Avatar",
      "Dream overlay: optional AI remix layer (requires Daydream config + webcam)",
      "Audio-reactive with auto-hide controls for full-screen immersion",
      "Moments (Future): curated productions when content is ready",
    ]
  },
  {
    key: "wisdom",
    title: "Wisdom Hub",
    icon: "📚",
    description: "Long-form content sharing the philosophy, frameworks, and evolution behind MetaDJ.",
    features: [
      "Thoughts: essays on creativity, AI collaboration, and building in public",
      "Guides: practical frameworks you can apply to your own work",
      "Reflections: stories behind the music and the MetaDJ evolution",
      "Share links: deep links to specific Thoughts, Guides, or Reflections",
      "Clean reading layouts with section navigation",
    ]
  },
  {
    key: "journal",
    title: "Journal",
    icon: "📝",
    description: "Private, local-first space for capturing ideas, drafts, and reflections.",
    features: [
      "Local-first entries stored in your browser (no account required)",
      "Rich-text editor with formatting toolbar",
      "Voice dictation with a 60-second recording limit",
      "Autosaved drafts and session restore on refresh",
      "Export or import entries as JSON with optional passphrase encryption",
    ]
  },
]

// Music Collections info
export const GUIDE_COLLECTIONS: CollectionInfo[] = [
  {
    name: "Featured",
    description: "A curated set of 10 tracks representing the current pulse of MetaDJ's catalog. Start here for a quick taste.",
    vibe: "Curated highlights from Majestic Ascent"
  },
  {
    name: "Majestic Ascent",
    description: "Portal narration meets orchestral/electronic fusion powered by AI-driven creation. Cinematic compositions across 10 tracks.",
    vibe: "Epic • Orchestral • Cinematic"
  },
]

// MetaDJai section
export const GUIDE_METADJAI = {
  title: "MetaDJai",
  description: "MetaDJai is an AI-driven creative companion built on my creative philosophy and methods. It tracks what you're listening to and which surface you're exploring, then uses that context to respond. Transparent about being AI while channeling MetaDJ's voice to help you navigate, create, and explore.",
  howToOpen: "Click MetaDJai in the header (desktop) or the bottom nav (mobile).",
  features: [
    {
      title: "Context-Aware",
      description: "Knows your now-playing track, active collection, and current surface. Suggestions stay grounded in what you're actually doing."
    },
    {
      title: "Actions Menu",
      description: "One-tap starters tied to what you're listening to or exploring—instant prompts without typing."
    },
    {
      title: "Adaptive Focus",
      description: "Defaults to creative support and shifts into music-first guidance when you ask about playback."
    },
    {
      title: "Model Selector",
      description: "Switch between GPT, Gemini, Claude, and Grok. Labels stay simple on purpose; GPT is the default."
    },
    {
      title: "Session History",
      description: "Chats are saved locally (up to 20 sessions). Use History to revisit or reset threads."
    },
    {
      title: "Active Control",
      description: "When you ask, MetaDJai can propose playback or surface actions. You always confirm before anything happens."
    },
    {
      title: "Voice Input",
      description: "Tap the microphone to speak your ideas. MetaDJai transcribes your voice for natural, hands-free interaction."
    },
  ],
  tips: [
    "Ask for a platform walkthrough if you're new",
    "Use the Actions menu for fast starters tied to the current moment",
    "Open History to jump between chats",
    "MetaDJai suggests tracks only when you ask",
    "Ask for DJ support (play, queue, playlists) when you want music-first help",
    "Use the Model dropdown if you want a different tone or approach",
    "Voice input requires microphone permission",
  ],
  rateLimit: "20 messages every 5 minutes. The usage indicator shows where you are in the window.",
  disclaimer: "MetaDJai generates options; you make the meaningful choices. Technology amplifies; humans conduct meaning.",
}

// Queue & Playback section
export const GUIDE_QUEUE = {
  title: "Queue & Playback",
  description: "Your personal listening queue with manual picks prioritized at the top. Build your own flow or let the curated order guide you.",
  features: [
    {
      title: "Priority Lane",
      description: "Tracks you add manually always play before the automated queue. Your picks, your priority."
    },
    {
      title: "Searchable Queue",
      description: "Filter tracks and collections directly inside the queue tab."
    },
    {
      title: "Clear Queue",
      description: "Use Clear in the queue header to wipe the list when you want a fresh start."
    },
    {
      title: "Visual Hierarchy",
      description: "Manual picks are highlighted at the top so you always know what's yours."
    },
    {
      title: "Persistent Queue",
      description: "Your queue persists for 24 hours, surviving page refreshes and browser closes."
    },
  ],
  controls: [
    { action: "Add to Queue", description: "Use the ••• menu, Track Details, or search results" },
    { action: "Remove", description: "Click the X or press Delete/Backspace on a focused item" },
    { action: "Reorder", description: "Drag tracks (desktop) or long-press to move them on mobile" },
    { action: "Clear", description: "Tap Clear in the queue header to remove everything" },
  ],
  playlists: {
    title: "Playlists (Your Sets)",
    description: "Playlists let you save your own flows and come back to them anytime.",
    features: [
      "Open the Music panel → Playlists tab to create and manage playlists",
      "Add tracks from Track Details or the ••• menu with \"Add to Playlist\"",
      "Start queues the playlist in order from the top",
      "Share a playlist with the Share button (local playlists + URL share in Public Preview)",
    ],
  },
}

// Search section
export const GUIDE_SEARCH = {
  title: "Search & Discovery",
  description: "Find tracks and collections by title—fast, anywhere in the app.",
  features: [
    "Desktop: Use the search icon in the playback pill to open the header search",
    "Music panel: Library SearchBar lives above Featured",
    "Real-time results as you type (tracks + collections)",
    "Shows artwork, genres, and inline action buttons",
    "Play or queue directly from search results",
    "Glass aesthetic dropdown matches the MetaDJai vibe",
    "Press Ctrl/Cmd + / to focus search from anywhere",
    "Stays above Cinema for uninterrupted crate digging",
  ],
  tips: [
    "Search track titles: \"odyssey\" finds \"Metaversal Odyssey\"",
    "Search collections: \"majestic\" surfaces \"Majestic Ascent\" under Collections",
    "Multi-word queries work: \"boss battle\" matches \"Boss Battle\"",
  ],
}

// Keyboard Shortcuts (WCAG 2.1.4 compliant - require Ctrl/Cmd modifier)
export const GUIDE_SHORTCUTS: KeyboardShortcut[] = [
  // Playback (require Ctrl/Cmd)
  { key: "Ctrl/Cmd + Space", label: "Play / Pause", category: "playback" },
  { key: "Ctrl/Cmd + ←", label: "Seek backward / Previous track", category: "playback" },
  { key: "Ctrl/Cmd + →", label: "Seek forward / Next track", category: "playback" },
  { key: "Ctrl/Cmd + ↑", label: "Volume up (+10%)", category: "playback" },
  { key: "Ctrl/Cmd + ↓", label: "Volume down (-10%)", category: "playback" },
  { key: "Ctrl/Cmd + M", label: "Mute / Unmute", category: "playback" },
  // Navigation
  { key: "Ctrl/Cmd + /", label: "Focus search bar", category: "navigation" },
  { key: "Esc", label: "Close modals / Exit fullscreen", category: "navigation" },
  { key: "?", label: "Show keyboard shortcuts", category: "navigation" },
  // Queue (require Ctrl/Cmd)
  { key: "Ctrl/Cmd + N", label: "Next track in queue", category: "queue" },
  { key: "Ctrl/Cmd + P", label: "Previous track (or restart)", category: "queue" },
  { key: "Ctrl/Cmd + S", label: "Toggle shuffle", category: "queue" },
  { key: "Ctrl/Cmd + R", label: "Cycle repeat mode", category: "queue" },
]

// Help section
export const GUIDE_HELP = {
  title: "Getting Help",
  description: "Multiple ways to get assistance and learn more about the platform.",
  options: [
    {
      title: "This Guide",
      description: "Tap the info button (ⓘ) in the header anytime to reopen this guide."
    },
    {
      title: "MetaDJai",
      description: "Ask MetaDJai for a walkthrough, creative prompts, or help with any surface you're exploring."
    },
    {
      title: "Keyboard Shortcuts",
      description: "Press ? anywhere in the app to see the full shortcut reference."
    },
  ],
}
