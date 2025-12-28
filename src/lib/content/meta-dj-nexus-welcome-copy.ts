export const METADJNEXUS_WELCOME_TAGLINE =
  "Where music, cinema, and creative guidance converge";

export const METADJNEXUS_PREVIEW_BADGE = "Public Preview";

export const METADJNEXUS_WELCOME_PARAGRAPHS: string[] = [
  "MetaDJ Nexus is my living studio and stage: original music, Cinema visuals, Wisdom, a private Journal, and MetaDJai as your creative companion. It is a working showcase of AI-driven creation across code, content, sound, and visuals, plus a playground for experiments as the broader ecosystem evolves.",
  "Start in the Hub for a cinematic listen, or open the Music panel to explore Featured, Recently Played, collections, playlists, and your queue.",
];

export const METADJNEXUS_PREVIEW_NOTICE = {
  title: "Public Preview",
  description:
    "Public Preview is free and requires no account. Playlists, queue state, and journal entries stay local on this device while the core experience is refined.",
};

export interface MetaDJNexusFeatureCard {
  key: "music" | "visuals" | "beyond";
  title: string;
  description: string;
  details?: string[];
}

export const METADJNEXUS_FEATURE_CARDS: MetaDJNexusFeatureCard[] = [
  {
    key: "music",
    title: "Original Music",
    description:
      "Music collections, Featured highlights, and playlists you build.",
  },
  {
    key: "visuals",
    title: "Cinema Visuals",
    description:
      "Audio-reactive visualizers, video scenes, and optional Dream overlays.",
  },
  {
    key: "beyond",
    title: "Creative Guidance",
    description:
      "Wisdom, Journal, and MetaDJai to shape ideas and next steps.",
  },
];

export interface KeyboardShortcut {
  key: string;
  action: string;
  category: "playback" | "navigation" | "accessibility";
}

export const ESSENTIAL_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: "Ctrl/Cmd + Space", action: "Play / Pause", category: "playback" },
  { key: "Ctrl/Cmd + ←", action: "Previous track (or restart)", category: "playback" },
  { key: "Ctrl/Cmd + →", action: "Next track", category: "playback" },
  { key: "Ctrl/Cmd + ↑", action: "Volume up (+10%)", category: "playback" },
  { key: "Ctrl/Cmd + ↓", action: "Volume down (-10%)", category: "playback" },
  { key: "Ctrl/Cmd + M", action: "Toggle mute", category: "playback" },
  { key: "Ctrl/Cmd + /", action: "Focus search", category: "navigation" },
  { key: "?", action: "Show keyboard shortcuts", category: "accessibility" },
  { key: "Esc", action: "Close modals / Exit fullscreen", category: "navigation" },
];
