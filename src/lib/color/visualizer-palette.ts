/**
 * Visualizer Palette
 *
 * Centralized, canonical color constants for 3D visualizers/shaders.
 * Keeps WebGL palettes aligned with the MetaDJ OKLCH visual system.
 *
 * Hex values match the canonical gradient endpoints in globals.css:
 * Purple → Cyan → Magenta, with approved tints for depth.
 */

export const VISUALIZER_COLORS = {
  // Canonical brand tier
  purple: "#8B5CF6",
  cyan: "#06B6D4",
  magenta: "#D946EF",

  // Approved supporting tints (derived from the same tier hues)
  indigo: "#A855F7",
  purpleTint: "#C084FC",
  magentaTint: "#E879F9",
  cyanTint: "#22D3EE",
  cyanTintLight: "#67E8F9",

  // Neutral starlight for SpaceTravel
  starBase: "#B8D4FF",
} as const;

// sRGB triples (0–1) for embedding into GLSL where linear-uniforms aren't used.
export const VISUALIZER_SRGB = {
  purple: "0.545, 0.361, 0.965",  // #8B5CF6
  cyan: "0.024, 0.714, 0.831",    // #06B6D4
  magenta: "0.851, 0.275, 0.937", // #D946EF
  indigo: "0.659, 0.333, 0.969",  // #A855F7
} as const;
