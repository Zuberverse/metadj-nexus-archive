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
  { id: "account", title: "Account", icon: "👤" },
  { id: "queue", title: "Queue", icon: "📋" },
  { id: "search", title: "Search", icon: "🔍" },
  { id: "shortcuts", title: "Shortcuts", icon: "⌨️" },
  { id: "help", title: "Getting Help", icon: "🧭" },
]

// Welcome section
export const GUIDE_WELCOME = {
  tagline: "Where music, visuals, and creative guidance converge",
  intro: "MetaDJ Nexus is my living studio and stage: original music, Cinema visuals, Wisdom, a private Journal, and MetaDJai as your creative companion. The full experience unlocks after you create a free account and accept the Terms & Conditions. The Hub is mission control for launching a cinematic listen and catching the latest updates, while the Music panel holds Browse, Playlists, and Queue.",
  previewNotice:
    "Public Preview is open while the core experience is refined. Playlists, queue state, Journal entries, and MetaDJai history stay local on this device for now.",
  askAiPrompt: "Questions? Ask MetaDJai for a walkthrough, creative guidance, or a listening flow.",
}

// Quick Start steps
export const GUIDE_QUICK_START: QuickStartStep[] = [
  {
    number: "1",
    title: "Create your account",
    description: "Sign up on the landing page, accept the Terms & Conditions, then enter the Hub to start your session.",
    tip: "Account settings and sign-out live in the Account panel (desktop).",
  },
  {
    number: "2",
    title: "Warm up the experience",
    description: "Press Enter Cinema to start the hero track and visuals. On mobile, the Hub Quick Start checklist tracks play, Cinema, Wisdom, and MetaDJai steps.",
    tip: "If playback is locked, tap the audio unlock prompt to enable sound."
  },
  {
    number: "3",
    title: "Shape the Experience",
    description: "Use the Music panel to browse collections, build playlists, and queue tracks. Toggle Wisdom and Journal for reading and notes, and open MetaDJai when you want guidance.",
    tip: "Ctrl/Cmd + S shuffles, Ctrl/Cmd + R cycles repeat, Ctrl/Cmd + J opens MetaDJai."
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
      "Quick Start checklist (mobile): play a track, open Cinema, open Wisdom, and chat with MetaDJai",
      "Chat with MetaDJai: quick access to your creative companion",
      "Wisdom Spotlight: latest Thought, Guide, and Reflection cards",
      "Continue reading: resume the last opened Wisdom item",
      "Platform Pulse: preview status and recent updates",
      "News + Events: curated notes when available (quiet during preview)",
    ]
  },
  {
    key: "music",
    title: "Music Experience",
    icon: "🎵",
    description: "Original music organized into collections that grow as the creative exploration continues.",
    features: [
      "Browse tab: Featured highlights, Recently Played (last 50 plays), and collections",
      "Mood Channels: curated energy lanes that unlock as the catalog grows",
      "Tabs: Browse, Playlists, Queue",
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
      "2D visualizers: Pixel Portal, 8-Bit Adventure, Synthwave Horizon, Spectrum Ring, Starlight Drift",
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
      "Local-first entries stored in your browser (no cloud sync)",
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
  {
    name: "Metaverse Revelation",
    description: "Epic techno, nu disco, and synthwave anthems exploring virtual worlds and AI-driven creativity.",
    vibe: "High-energy • Anthemic • Synthwave"
  },
]

// MetaDJai section
export const GUIDE_METADJAI = {
  title: "MetaDJai",
  description: "MetaDJai is an AI-driven creative companion built on my creative philosophy and methods. It tracks what you're listening to and which surface you're exploring, then uses that context to respond. Transparent about being AI while channeling MetaDJ's voice to help you navigate, create, and explore.",
  howToOpen: "Click MetaDJai in the header (desktop) or the bottom nav (mobile), or press Ctrl/Cmd + J.",
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
      title: "Personalize",
      description: "Turn on Personalize to choose a style profile, response length/format, and tone, plus add notes about your projects."
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
    "MetaDJai suggests tracks when you ask",
    "Turn on Personalize to tune tone, length, and format",
    "Ask for DJ support (play, queue, playlists) when you want music-first help",
    "Use the Model dropdown if you want a different tone or approach",
    "Voice input requires microphone permission",
  ],
  rateLimit: "20 messages every 5 minutes. The usage indicator shows where you are in the window.",
  disclaimer: "MetaDJai generates options; you make the meaningful choices. Technology amplifies; people conduct meaning.",
}

// Account & Feedback section
export const GUIDE_ACCOUNT = {
  title: "Account & Feedback",
  description: "Account access unlocks the full MetaDJ Nexus experience. Manage settings, sign out, and send feedback from the Account panel.",
  features: [
    "Access: Create a free account on the landing page and accept the Terms & Conditions to enter /app.",
    "Account panel (desktop): use the user icon in the header to update email, change password, or sign out.",
    "Feedback: submit bugs, feature requests, ideas, or general feedback; bug reports include severity.",
    "Admin dashboard: approved accounts see an Admin Dashboard action in the Account panel.",
    "Mobile note: account settings are desktop-first right now; use a larger screen for updates.",
  ],
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
      description: "Manual picks stay pinned at the top so your selections play first."
    },
    {
      title: "Persistent Queue",
      description: "Your queue persists for 24 hours, surviving page refreshes and browser closes."
    },
  ],
  controls: [
    { action: "Add to Queue", description: "Use the ••• menu, Track Details, or search results" },
    { action: "Remove", description: "Click the X or press Delete/Backspace on a focused item" },
    { action: "Reorder", description: "Drag tracks on desktop, or use Arrow Up/Down on a focused item" },
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
  description: "Find tracks, collections, Wisdom entries, and Journal notes fast from anywhere in the app.",
  features: [
    "Desktop: Use the search icon in the playback pill to open the header search",
    "Music panel: Browse SearchBar lives above Featured",
    "Header search includes tracks, collections, Wisdom, and Journal results",
    "Results update in real time as you type",
    "Shows artwork, genres, and inline action buttons",
    "Play or queue directly from search results",
    "Glass aesthetic dropdown matches the MetaDJai vibe",
    "Press Ctrl/Cmd + K or / to focus search from anywhere",
    "Stays above Cinema for uninterrupted crate digging",
  ],
  tips: [
    "Search track titles: \"odyssey\" finds \"Metaversal Odyssey\"",
    "Search collections: \"majestic\" surfaces \"Majestic Ascent\" under Collections",
    "Multi-word queries work: \"boss battle\" matches \"Boss Battle\"",
    "Journal results appear after you save entries on this device",
  ],
}

// Keyboard Shortcuts (WCAG 2.1.4 compliant - require Ctrl/Cmd modifier)
export const GUIDE_SHORTCUTS: KeyboardShortcut[] = [
  // Playback (require Ctrl/Cmd)
  { key: "Ctrl/Cmd + Space", label: "Play / Pause", category: "playback" },
  { key: "Ctrl/Cmd + ←", label: "Previous track", category: "playback" },
  { key: "Ctrl/Cmd + →", label: "Next track", category: "playback" },
  { key: "Ctrl/Cmd + ↑", label: "Volume up (+10%)", category: "playback" },
  { key: "Ctrl/Cmd + ↓", label: "Volume down (-10%)", category: "playback" },
  { key: "Ctrl/Cmd + M", label: "Mute / Unmute", category: "playback" },
  // Navigation
  { key: "Ctrl/Cmd + /", label: "Focus search bar", category: "navigation" },
  { key: "Ctrl/Cmd + K", label: "Focus search bar", category: "navigation" },
  { key: "Ctrl/Cmd + J", label: "Toggle MetaDJai", category: "navigation" },
  { key: "Esc", label: "Close modals / Exit fullscreen", category: "navigation" },
  { key: "?", label: "Show keyboard shortcuts", category: "navigation" },
  // Queue (require Ctrl/Cmd)
  { key: "Ctrl/Cmd + N", label: "Next track in queue", category: "queue" },
  { key: "Ctrl/Cmd + P", label: "Previous track", category: "queue" },
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
      description: "Open via the header info button (desktop), the footer User Guide link, or the mobile \"Help & shortcuts\" button."
    },
    {
      title: "MetaDJai",
      description: "Ask MetaDJai for a walkthrough, creative prompts, or help with any surface you're exploring."
    },
    {
      title: "Feedback",
      description: "Open the Account panel on desktop or ask MetaDJai to open the feedback form from any device."
    },
    {
      title: "Connect",
      description: "Follow @metadjai on X, YouTube, Instagram, TikTok, or Threads for updates."
    },
    {
      title: "Keyboard Shortcuts",
      description: "Press ? anywhere in the app to see the full shortcut reference."
    },
  ],
}
