# Cinema System

> **Visual experience layer for MetaDJ Nexus**

**Last Modified**: 2026-02-01 11:16 EST

## Overview

The Cinema System provides immersive visual experiences synchronized with audio playback. It ships with premium 3D audio‑reactive visualizers, a growing 2D visualizer tier, and curated video scenes. Visualizers declare their renderer via `VisualizerStyle.renderer` (`3d` for React Three Fiber, `2d` for HTML5 canvas).

## Visual Fidelity & Anti‑Fuzziness Standards

To maintain a premium "high-fidelity" aesthetic, all MetaDJ visualizers must adhere to the **Anti-Fuzziness** rendering standards. This ensures that particles, pixels, and geometry feel sharp, striking, and intentional rather than blurry or washed out.

### Core Rendering Patterns

1.  **Triple-Layer Particle Shaders (3D)**: Particles must implement a 3-layer alpha falloff:
    - **Spark/Core**: A very tight, high-intensity center (e.g., `0.0-0.08`).
    - **Inner Glow**: A secondary falloff for the primary color mass (e.g., `0.0-0.2`).
    - **Outer Edge**: A sharp cutoff to eliminate "fuzzy" alpha tails (e.g., `0.0-0.45`).
2.  **Core Sparks & Pings (2D)**: Canvas-based visualizers use a dual-pass "Core Ping" or "Core Spark" method:
    - **Pass 1**: The primary particle/block drawn in the target brand color with a standard alpha.
    - **Pass 2**: A smaller, high-alpha white "ping" drawn inside the core to create a "striking" visual center.
3.  **High-Luminance Thresholds**: Post-processing Bloom must use a high luminance threshold (typically `0.55` or higher) to ensure only the sharpest "core" elements contribute to the glow, preventing a "muddy" or "foggy" scene.
4.  **No Black Endpoints**: Gradients must never terminate at pure black. Use deep charcoal (`#0a0e1f`) or brand-tinted darks to preserve visual depth.
5.  **Grid Snapping (2D/Retro)**: For 8-bit or pixel visualizers, coordinates must be aggressively snapped to the pixel grid (`Math.round(val / pixel) * pixel`) to prevent sub-pixel blurring.

### Anti-Flicker Guidelines

Flicker in 3D particle visualizers is caused by brightness values crossing the bloom threshold erratically between frames. When using `AdditiveBlending`, overlapping particles sum their colors — creating hotspots that fluctuate as particles rotate. These must be controlled:

1.  **Color clamp ceiling ≤ 1.5**: Never allow fragment colors above `vec3(1.5)`. Higher clamps (1.8+) create extreme additive peaks that oscillate above/below bloom threshold.
2.  **Bloom threshold ≥ 0.55**: Lower thresholds cause too many particles to bloom, amplifying frame-to-frame brightness variance into visible flicker.
3.  **Spark/core multipliers ≤ 1.5x**: Keep the `spark * N` factor in fragment shaders at or below 1.5. Higher multipliers (2.5x) create brightness peaks that swing wildly with overlap changes.
4.  **Avoid stacking brightness boosts**: The chain `core multiplier → vibrancy boost → white mix → color clamp` compounds. Each step should be modest; the product matters more than individual values.
5.  **Chromatic aberration offset ≤ 0.0005**: Larger offsets (0.002+) create visible RGB fringing that degrades perceived quality. Keep barely perceptible.
6.  **Test with and without audio**: Flicker often only appears at idle (when particles aren't moving enough to mask it) or during quiet passages between tracks.

Cinema currently opens into the **Virtualizer** (audio‑reactive visualizers + video scenes). **Moments** is a future production mode for curated audio + video, with a Cinema menu toggle planned once Moments content is available.

## Cinema Controls

### Exiting Cinema

Cinema no longer includes an in‑overlay "Exit Cinema" control. Use the main navigation (Header / feature rail) to return to Hub.

### Toggle Performance

Cinema is one of the heaviest surfaces (WebGL + shaders + post‑processing). To keep tab switching feeling instant, the Cinema overlay stays mounted after the first open and pauses rendering when hidden:

- **3D visualizers**: React Three Fiber `Canvas` switches to `frameloop="never"` when Cinema is not visible.
- **2D visualizers**: requestAnimationFrame loops stop when Cinema is not visible.
- **Low-end tiers**: On lazy/low-capability devices, Cinema does **not** remain mounted after closing to reduce memory and GPU pressure.
- **Prefetch gating**: The Cinema overlay bundle is only prefetched on non-lazy, desktop-capable tiers.

### Adaptive Performance Mode

Cinema now auto‑enables performance mode when it detects low‑end device signals or sustained low FPS in 3D scenes. When performance mode is active:

- **Auto triggers**: <= 4 CPU cores, <= 4GB device memory, Save-Data enabled, or low FPS in 3D scenes.
- **Quality dials down**: lower visualizer complexity is used via `performanceMode=true`.
- **DPR capped at 1.5**: Canvas `dpr` uses `[1, 1.5]` (not `[1, 2]`) to prevent GPU overload on fullscreen Retina displays. This 44% pixel reduction keeps FPS above 30 and avoids triggering auto-degradation.
- **Desktop minimum bloom**: Desktop always gets at least "lite" bloom (single-pass, no mipmapBlur, 65% intensity). Bloom is what transforms individual particle points into cohesive glowing visuals — disabling it entirely makes particles look like scattered dots.
- **Mobile bloom off**: Mobile (`!shouldUseSidePanels`) disables bloom entirely for maximum performance.
- **Sticky for session**: once activated, it remains on to avoid oscillation.

### View Transition Fade

When switching between views (Hub/Cinema/Wisdom), the Cinema overlay uses a smooth 250ms opacity fade:

- **Entering Cinema**: Overlay becomes visible immediately, then fades from opacity 0 → 1
- **Exiting Cinema**: Fades from opacity 1 → 0, then hides completely

This fade prevents the visual "snap" that occurs when resuming paused visualizers. Since Three.js uses `frameloop="never"` when hidden, the animation effectively freezes in place. When the user returns to Cinema, the clock has advanced but the animation hasn't—causing it to "jump" to catch up. The fade gives the animation a moment to stabilize before becoming fully visible.

**Implementation**: `CinemaOverlay.tsx` uses `isVisible` and `opacity` state with CSS `transition-opacity duration-250 ease-out`.

---

## 3D Audio-Reactive Visualizers

MetaDJ features four premium 3D visualizers—**Cosmos**, **Black Hole**, **Space Travel**, and **Disco Ball**—built with React Three Fiber, GLSL shaders, and post-processing bloom. All share a consistent architectural foundation.

### Shared Visualizer Specification

All 3D visualizers adhere to these core principles:

#### MetaDJ Brand Color Palette

| Color | Hex | RGB (normalized) | Purpose |
|-------|-----|------------------|---------|
| **Cyan** | `#06b6d4` | `(0.024, 0.714, 0.831)` | AI amplification |
| **Purple** | `#8b5cf6` | `(0.545, 0.361, 0.965)` | Human wisdom, brand foundation |
| **Magenta** | `#d946ef` | `(0.851, 0.275, 0.937)` | Transformation/synthesis |
| **Indigo** | `#a855f7` | `(0.659, 0.333, 0.969)` | Technical depth |

#### Motion Principles

- **Forward-only motion**: Accumulated rotation/phase values that never reverse direction
- **Asymmetric lerp**: Fast attack (0.04-0.085), slow release (0.008-0.025) for musical punch without seizure-level intensity. Performance mode uses slightly higher rates (top of range) for responsiveness on lower-end hardware.
- **Power curves**: Bass and high frequencies use `pow()` curves (1.3-2.2) for dynamic punch
- **Delta clamping**: Frame time capped at 50ms to handle drops gracefully
- **Smooth interpolation**: Audio levels lerped to prevent jitter
- **Impulse capping**: Burst events (rotation, wobble, shockwave) use `Math.min()` to prevent unbounded accumulation during rapid bass hits

#### Audio Reactivity Architecture

```typescript
// Common audio input uniforms
uBass: number    // Low frequency energy (0-1), power-curved
uMid: number     // Mid frequency energy (0-1)
uHigh: number    // High frequency energy (0-1)

// Asymmetric lerp pattern (reduced rates prevent seizure-level reactivity)
// 3D visualizers: per-band rates (bass ~0.05-0.06 up / 0.008-0.015 down)
// 2D visualizers: 0.06-0.085 up / 0.02-0.025 down (performance mode slightly higher)
const lerpUp = 0.06;   // Fast attack (was 0.1)
const lerpDown = 0.02; // Slow release
smoothedBass += (targetBass - smoothedBass) * (targetBass > smoothedBass ? lerpUp : lerpDown);
```

#### Density Compensation

Desktop uses higher particle counts for smoother visuals, but more particles + `AdditiveBlending` = brighter/whiter. All 3D visualizers apply a `uDensityScale` uniform in the vertex shader to compensate:

```typescript
// Scale alpha so additive accumulation produces identical brightness at any particle count
const densityScale = performanceMode ? 1.0 : Math.sqrt(LOW_COUNT / HIGH_COUNT);
// Cosmos: sqrt(10000/18000) ≈ 0.745, BlackHole: sqrt(6000/12000) ≈ 0.707, etc.

// In vertex shader:
vAlpha *= uDensityScale;
```

Why `sqrt`: overlap probability in 2D projection scales with the square root of density, not linearly.

#### Intensity Scaling

`VisualizerStyle.intensity` gently scales incoming audio bands before they hit the shaders.  
This keeps “subtle” scenes calmer without changing the premium look of intense scenes.

- **subtle**: `0.8×` bass/mid/high
- **moderate**: `0.95×`
- **intense**: `1.0×` (default)

#### Color Phase Evolution

All visualizers implement continuous color shifting:

```glsl
// Accumulated phase (never reverses)
colorPhaseRef.current += deltaTime * (0.35 + bass * 0.25 + mid * 0.15);

// Smooth cycling in shader
float phase = uColorPhase;
float c1 = pow(sin(phase) * 0.5 + 0.5, 0.6);
float c2 = pow(sin(phase + 2.09) * 0.5 + 0.5, 0.6);
float c3 = pow(sin(phase + 4.18) * 0.5 + 0.5, 0.6);
vec3 colorBlend = brandCyan * c1 + brandPurple * c2 + brandMagenta * c3;
```

#### Post-Processing

All 3D visualizers use `@react-three/postprocessing` Bloom via `Visualizer3D.tsx`, which supports four post-processing tiers:

| Tier | Bloom Intensity | Bloom Radius | mipmapBlur | Chromatic Aberration | Vignette | Use Case |
|------|----------------|-------------|------------|---------------------|----------|----------|
| **off** | None | — | — | — | — | Mobile / low-end |
| **lite** | 65% | 10% | No | No | No | Performance mode desktop |
| **balanced** | 50% | 80% | No | No | No | **Desktop default** — subtle cinematic glow without color washout |
| **full** | 100% | 100% | Yes | 0.0004 | Yes | Maximum fidelity (opt-in) |

Desktop defaults to **"balanced"** to prevent the washed-out/whiter appearance that "full" bloom causes when combined with high particle density and additive blending. Mobile uses **"off"** for maximum performance.

**Implementation Note**: `three` is intentionally pinned to the 0.182.x line to satisfy `postprocessing` peer dependency requirements. If upgrading Three.js, upgrade postprocessing in lockstep and re‑verify visualizer stability.

Per-visualizer bloom settings (used by "full" tier):

| Visualizer | Threshold | Intensity | Radius | Notes |
|------------|-----------|-----------|--------|-------|
| Cosmos | 0.6 | 0.65 | 0.14 | High threshold prevents additive flicker in dense core |
| Black Hole | 0.65 | 0.55 | 0.12 | Only event horizon ring blooms; particles stay clean |
| Space Travel | 0.6 | 0.5 | 0.17 | Subtle ambient glow for warp tunnel |
| Disco Ball | 0.55 | 0.8 | 0.16 | Balances sparkle emphasis with flicker prevention |

Chromatic aberration: fixed at `0.0004` offset (barely perceptible depth cue without visible RGB fringing).

#### Static Post-Processing (Bloom Stability)

3D scenes use **static bloom settings** to prevent glow pulsing artifacts:
- **Static Bloom**: Intensity and threshold remain constant—particles handle audio reactivity via motion and color.
- **Static Chromatic Aberration**: Fixed offset (`0.0004`) prevents flicker. Never exceed `0.001`.
- **Rationale**: Reactive bloom on top of reactive particles creates double-pulsing. Separating motion reactivity (particles) from brightness reactivity (bloom) eliminates artifacts.
- **Anti-flicker**: See the Anti-Flicker Guidelines section above. All bloom thresholds must be ≥ 0.55, and fragment color clamps must be ≤ 1.5.

---

### Cosmos Visualizer

**File**: `src/components/cinema/visualizers/Cosmos.tsx`

A majestic spiral galaxy with Keplerian rotation, flowing nebula colors, and high-fidelity circular particles.

#### Visual Characteristics

- **18,000 particles** distributed across core, 4 spiral arms, and outer halo
- **High-fidelity circular particles**: 3-layer rendering (tight core 0.08, inner glow 0.2, outer edge 0.45) with sharper power curves for crisp, defined particles
- **Spiral galaxy structure**: 4 spiral arms with Keplerian rotation (inner particles orbit faster)
- **Particle distribution**: 20% core, 65% spiral arms, 15% outer halo for full space coverage
- **Purple/blue/cyan dominant palette** with magenta as accent only
- **Enhanced audio-reactive breathing**: Dual pulse waves propagating outward
- **Vertical wave motion** responding to mid frequencies
- **Simplex noise turbulence** for organic movement
- **Gentle group tilt** on X/Z axes for 3D depth perception

#### Color Implementation

```glsl
// Purple/Blue/Cyan dominant palette (purple is PRIMARY)
purple: #8b5cf6   // Primary - strongest weight (1.4x)
indigo: #a855f7   // Support for purple regions
cyan: #06b6d4     // Secondary
deepBlue: vec3(0.15, 0.25, 0.85)     // Cosmic depth
electricBlue: vec3(0.2, 0.4, 1.0)    // Mid-frequency accent
violetCore: vec3(0.6, 0.4, 1.0)      // Bright core center
magenta: #d946ef  // Accent only (on high frequencies)

// Core: violet/cyan center (no white)
// Nebula regions weighted: purple > cyan > blue > magenta (subtle)
// Outer regions blend toward deep blue for cosmic depth
```

#### Audio Response

| Frequency | Effect |
|-----------|--------|
| Bass | Rotation acceleration (+80%), breathing pulse (+25%), subtle color pump |
| Mid | Electric blue waves, vertical motion, turbulence, rotation boost (+35%) |
| High | Cyan shimmer, subtle magenta sparkle, minimal size variation (+6%) |

**Idle Stability**: At idle (no audio), color cycling runs at base speed 0.02 and pulse phase at 0.08—nearly imperceptible to prevent glow fluctuation.

#### High-Fidelity Rendering

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Particle base size | 0.6 | Larger for definition |
| Size multiplier | 350.0 | Prominent particles |
| Size audio response | +6% high, +4% bass | Stable—minimal fluctuation |
| Min/max size | 2.0-50.0 px | No tiny noise particles |
| Core smoothstep | 0.0-0.08 | Tight bright center |
| Inner smoothstep | 0.0-0.15 | Controlled glow (tighter than outer) |
| Outer smoothstep | 0.0-0.45 | Sharp edge cutoff |
| Inner/outer power curves | 2.0 / 3.0 | Sharper falloff for defined particles |
| Alpha discard | 0.14 | Removes fuzzy particles |
| Vibrancy boost | 1.15× | Fragment color intensity |
| Color clamp | 1.15 | Conservative ceiling (anti-flicker) |
| vGlow | 1.0 (static) | No brightness pulsing |

#### Unique Features

- Keplerian rotation creates natural orbital motion
- 4 spiral arms with twist factor for galaxy structure
- Outer halo layer fills space without noise
- Deep blue outer regions for cosmic depth
- No white in palette—purple/violet core instead
- Saturation boost (1.6×) for rich colors
- **Idle stability**: No breathing/pulsing without audio

---

### Black Hole Visualizer

**File**: `src/components/cinema/visualizers/BlackHole.tsx`

A gravitational accretion disk with Keplerian orbital mechanics, high-fidelity circular particles, and a flowing gradient event horizon.

#### Visual Characteristics

- **12,000 particles** forming an accretion disk (optimized for smooth rendering)
- **High-fidelity circular particles**: 3-layer rendering (tight core 0.06, inner glow 0.18, outer edge 0.42) with sharp power curves
- **Larger particles for definition**: 0.45 base size with 380.0 multiplier
- **Keplerian orbital mechanics**: Inner particles orbit faster than outer (inverse square root)
- **Dynamic audio-reactive ripple waves** propagating outward from center (3 wave layers)
- **Purple/blue/cyan dominant palette** (matching Cosmos—no white)
- **Radius-based color blending**: Smooth color transitions without per-particle variation
- **Flowing 4-color gradient event horizon**: Cyan → purple → magenta → indigo with audio-reactive wave patterns

#### Color Implementation

```glsl
// Disk particles - purple/blue/cyan dominant (matching Cosmos)
purple: #8b5cf6   // Primary - weighted 1.4x
indigo: #a855f7   // Support
cyan: #06b6d4     // Secondary
deepBlue: vec3(0.15, 0.25, 0.85)    // Cosmic depth
electricBlue: vec3(0.2, 0.4, 1.0)   // Mid accent
violetCore: vec3(0.7, 0.5, 1.0)     // Inner disk (no white)
magenta: #d946ef  // Accent only (on high frequencies)

// Radial gradient: violet core → purple/indigo mid → deep blue outer
// Saturation boost: 1.35x

// Event horizon - flowing 4-color gradient (weight-based blending)
color1: #06b6d4  // Cyan (starting color)
color2: #8b5cf6  // Purple
color3: #d946ef  // Magenta
color4: #a855f7  // Indigo (ending color)
```

#### Audio Response

| Frequency | Effect |
|-----------|--------|
| Bass | Orbital speed, ripple strength (+200%), subtle color pump |
| Mid | Disk turbulence, ripple amplitude, electric blue accent |
| High | Minimal size variation (+5%), magenta accent |

**Idle Stability**: At idle, color/ripple/flow phases run at base speeds (0.02-0.08)—nearly imperceptible. Event horizon breathing removed.

#### Unique Features

- Simplex noise for organic disk turbulence
- Audio-reactive wobble and turbulence
- Event horizon with gradient flow (audio-driven speed)
- Audio-reactive wave patterns on event horizon ring
- Radial distance affects particle behavior (inner = hotter, faster)
- Bass transient detection triggers ripple pulses and tilt impulses
- 3-second energy history window for sustained-loudness awareness
- Color temperature blending (cool at quiet → warm at peaks)
- **Idle stability**: No breathing/pulsing without audio

#### Technical Note: Grain/Flicker Prevention

BlackHole requires careful parameter tuning to prevent visual grain and flickering. The following optimizations are critical:

**Root Causes of Grain:**
1. **Depth-based size jitter**: Tilted disk + turbulence causes particles to shift in Z, making `gl_PointSize = baseSize * (320.0 / -mvPosition.z)` fluctuate
2. **Alpha floor stacking**: With additive blending, many dim particles create grainy texture
3. **Per-particle oscillations**: Twinkle effects and per-particle color variation cause individual particles to flicker

**Applied Solutions:**

| Parameter | Original | Optimized | Reason |
|-----------|----------|-----------|--------|
| Particle count | 20,000 | 12,000 | Fewer particles = less stacking grain |
| Particle size range | 0.0-1.0 | 0.5-1.0 | Eliminates tiny flickering particles |
| Base particle size | 0.18 | 0.45 | Larger particles for high-fidelity definition |
| Size multiplier | 320.0 | 380.0 | More prominent particles |
| Min particle size | 1.0 | 2.5 px | No sub-pixel noise |
| Turbulence amplitude | 0.05 + bass×0.3 | 0.03 + bass×0.08 + mid×0.04 | Reduces depth jitter; mid adds organic motion |
| Ripple strength | 0.1 + bass×0.18 | 0.04 + bass×0.08 | Further reduced for smoothness |
| Wobble amplitude | bass×0.15 | bass×0.05 | Heavily reduced for stability |
| Discard threshold | 0.04 | 0.16 | Higher threshold removes fuzzy particles |
| Core smoothstep | 0.0-0.1 | 0.0-0.06 | Tighter bright core |
| Inner smoothstep | 0.0-0.3 | 0.0-0.18 | Controlled glow layer |
| Outer smoothstep | 0.0-0.5 | 0.0-0.42 | Sharp edge cutoff |
| Alpha floor | max(fade, 0.08) | No floor | Lets particles fade naturally |
| Twinkle effect | Enabled | Disabled | Eliminates per-particle brightness oscillation |
| Per-particle color | Enabled | Disabled | Uses smooth radius-based color only |

**Key Principle**: BlackHole must prioritize smooth, stable rendering over maximum visual complexity. The tilted disk perspective combined with additive blending makes it uniquely susceptible to grain artifacts that don't affect Cosmos or SpaceTravel. High-fidelity rendering uses larger particles with sharper edges rather than more particles with soft falloff.

---

### Space Travel Visualizer

**File**: `src/components/cinema/visualizers/SpaceTravel.tsx`

A forward-flying starfield with nebula clouds and dramatic speed variation.

#### Visual Characteristics

- **20,000 stars** across 3 depth layers with parallax motion
- **5,000 soft nebula cloud particles** in brand colors
- **Sharp particle rendering**: Tight core (0.06), inner glow (0.2), outer glow (0.45) with power curves for crisp stars
- **Per-star twinkle effects** with randomized phase and speed
- **Infinite warp tunnel** with bass-reactive speed (dramatic range from slow idle to fast bursts)
- **Nebula clouds** with soft rendering and color evolution
- **Nebula brightness bursts**: Occasional flares every 4-12 seconds and on strong bass hits
- **Camera drift** and subtle bass-reactive shake
- **Fog effect** for depth perception

#### Color Implementation

```glsl
// Star base colors (tinted, not pure white)
uColor1: #b8d4ff  // Light blue
uColor2: #06b6d4  // Cyan
uColor3: #8b5cf6  // Purple
uColor4: #d946ef  // Magenta

// Color shift palette
shiftColor1: #06b6d4  // Cyan
shiftColor2: #8b5cf6  // Purple
shiftColor3: #d946ef  // Magenta
shiftColor4: #a855f7  // Indigo

// Nebula colors
uColor1: #8b5cf6  // Purple
uColor2: #06b6d4  // Cyan
uColor3: #d946ef  // Magenta
uColor4: #a855f7  // Indigo
```

#### Audio Response

| Frequency | Effect |
|-----------|--------|
| Bass | Punchy acceleration bursts, nebula brightness pulsing, warp burst trigger |
| Mid | Sustained cruising speed, nebula breathing (expand/contract), gentle tunnel sway |
| High | Speed accents, star twinkle + size variation, star color shifting |

#### Speed Dynamics

```typescript
const audioEnergy = smoothedBass + smoothedMid * 0.5 + smoothedHigh * 0.3

const idleSpeed = 1.0
const bassDrive = Math.pow(smoothedBass, 2.2) * 9.0     // Cubic curve for punch
const midCruise = smoothedMid * 5.0
const highAccent = smoothedHigh * 2.5

// Slow variety wave scales with overall energy for natural ebb/flow
const varietyWave = (Math.sin(time * 0.08) * 0.5 + 0.5) * audioEnergy * 3.0

// Warp burst: extreme speed spike on heavy bass transients
// Triggers when bassTransient > 0.06 && smoothedBass > 0.55, capped at 0.7 intensity
const warpBoost = warpBurstIntensity * 12.0

const targetSpeed = idleSpeed + bassDrive + midCruise + highAccent + varietyWave + warpBoost

// Clamp speed to keep stars readable and prevent white‑out
smoothedSpeed = THREE.MathUtils.lerp(smoothedSpeed, targetSpeed, accelRate)
smoothedSpeed = Math.min(22.0, Math.max(1.0, smoothedSpeed))

// In shader: speed‑based dimming to prevent bloom wash‑out
float speedDim = 1.0 - smoothstep(15.0, 35.0, uSpeed) * 0.25
```

#### Unique Features

- Slow variety wave adds natural ebb and flow during consistent audio sections
- Speed-based brightness dimming prevents white wash-out at high speeds
- **Warp burst mechanic**: Heavy bass transients trigger dramatic speed spikes (threshold: bass > 0.55, capped at 0.7 intensity, ~96% decay/sec)
- **Star stretching**: Stars become motion-streaked at high speeds for warp tunnel effect
- Bass transient detection with rotation momentum accumulation
- Camera drift + bass-reactive Z-rotation shake (impulse clamped ±0.08, drift base 0.008)
- White core effect reduced (25%) to preserve brand colors
- Stars use tinted base colors instead of pure white
- Tighter color clamp (1.05) for controlled brightness

---

### Disco Ball Visualizer

**File**: `src/components/cinema/visualizers/DiscoBall.tsx`

A large futuristic mirror sphere with a mirror-tile core layered under glittering facet particles, surrounded by an orbiting cosmic halo. Designed to feel like a disco ball drifting through deep space.

#### Visual Characteristics

- **Mirror-tile core sphere** (~4.8 radius, `DISCO_CORE_RADIUS`) with a shader-driven facet grid + reflective "cosmic" environment to make the disco ball read as a real mirror surface rather than a particle sphere
- **14,000 facet particles** forming a prominent mirror‑sphere (~5.0 radius, `DISCO_RADIUS`)
- **6,500 halo particles** in a wide orbital field with spiral drift
- **Physically‑inspired lighting**: dual moving light vectors, strong specular glints, and rim glow
- **Additive sparkle** with controlled clamping to avoid bloom white‑out
- **Breathing scale** and subtle axis wobble for organic motion (wobble impulse capped at 0.8, rotation impulse capped at 1.5)

#### Audio Response

| Frequency | Effect |
|-----------|--------|
| Bass | Sphere pulse, rotation acceleration, halo expansion, **primary shockwave trigger** |
| Mid | Sustained halo swirl and drift, **secondary shockwave trigger** |
| High | Specular sparkle intensity, facet jitter, **facet glow pop** |

#### Unique Features

- **Bass Shockwaves**: Strong bass transients (`bassDelta > 0.12`, level > 0.55) trigger a primary radial expanding shockwave on the sphere surface.
- **Mid Shockwaves**: Mid-frequency peaks (`midDelta > 0.18`, level > 0.5) trigger a secondary independent shockwave ring.
- **Facet Popping**: Facets "pop" brighter via deterministic `smoothstep` thresholds on high (0.5-0.9), bass (0.6-1.0), and energy (0.7-1.0) — not per-facet random.
- **Impulse capping**: Rotation impulse capped at 1.5, wobble at 0.8, with exponential decay (0.85/0.88) to prevent unbounded accumulation.
- **Sustained energy accumulator**: 3-second energy window influences rotation speed and color phase evolution.

---

## 2D Audio-Reactive Visualizers

2D visualizers use an HTML5 `<canvas>` renderer for lighter‑weight retro/focus modes. They still receive the same analyzer bands and intensity scaling as 3D scenes.

### Pixel Portal Visualizer

**File**: `src/components/cinema/visualizers/PixelParadise.tsx`

Retro‑future portal drift: neon pixels orbit a glowing gateway, pulse with bass‑triggered shockwaves, and shimmer through the brand gradient with a subtle nebula wash and portal spark dust.

#### Visual Characteristics

- DPR‑aware full‑screen canvas with `imageSmoothingEnabled = false` for crisp pixels
- **Prominent Vortex Design**: 6 structured concentric rings with varying rotation speeds and alpha levels.
- **Vortex Filaments**: Energetic pixel filaments that spiral between rings, creating movement and depth.
- **Defined Singularity**: Deepened central core with multi-layered radial gradients for an event horizon effect.
- **Energy Flares**: Bass and high-driven bright flashes that trigger on specific ring segments.
- **Enhanced Shockwaves**: Bass-triggered shockwaves are now multi-layered for more visual weight.
- **Optimized Motion & Positioning**: The portal is centered at 51% height to provide balanced header clearance while maintaining fluid, audio-reactive pixel movement via velocity interpolation.
- **Track‑seeded variation**: stars/blocks/portal pixels vary per track (stable during playback)
- **Auto intensity (no user controls)**: the scene adapts between Focus → Standard → Hype based on audio energy
- **120–440 moving blocks** based on viewport area, split into 3 depth layers (lower caps in performance mode)
- Portal centerpiece with shimmering ring pixels + bass shockwave ripples
- Additive glows + occasional white sparkle squares on high‑frequency peaks
- Vibrant nebula wash layer behind the portal (slow moving radial gradients)
- Portal spark dust (highs + bass) spirals around the gateway with additive glow
- Ambient radial brand gradient underlay for cosmic depth

#### Audio Response

| Frequency | Effect |
|-----------|--------|
| Bass | Shockwave rings, portal breathing, block pulse |
| Mid | Orbit lane tightness, ring rotation, scanline depth |
| High | Spark dust + sparkle bursts, faster color cycling, ring twinkle |

### 8-Bit Adventure Visualizer

**File**: `src/components/cinema/visualizers/EightBitAdventure.tsx`

8‑bit quest run: a MetaDJ-styled pixel hero stands on the ground of a neon world with step‑mountains and drifting clouds, collecting loot sparks, dodging tiny foes, and firing high‑triggered sword slashes. Features enhanced cosmic sky elements with prominent audio-reactive effects.

#### Visual Characteristics

- DPR‑aware full‑screen canvas with chunky pixel grid and subtle scanlines
- **Track‑seeded variation**: stars/clouds/props vary per track (stable during playback)
- **Auto intensity (no user controls)**: Focus → Standard → Hype shifts spawn rates, scroll speed, and shake amplitude
- Side‑scrolling parallax world: step‑mountains, drifting clouds, roadside props (trees/signs/towers)
- **Pixel moon** centered horizontally at 20% height with gentle vertical breathing animation (bass-driven) and radial glow gradient
- **MetaDJ-styled pixel hero** positioned on the ground (physics-based at ~78% height):
  - Headphones (MetaDJ signature element)
  - Purple/cyan brand color palette
  - Larger head proportions for distinctive silhouette
  - Animated glow aura with purple/cyan pulse that responds to audio
  - Eye glow with cyan highlights
- Loot coins shimmer and burst into spark pixels when collected
- Tiny enemies (slimes/bats) drift through the lane and pop on slash bursts

#### Cosmic Sky Elements (Enhanced)

- **Enhanced Star Twinkle**: Stars twinkle more dramatically with audio, including size pulsing on bass hits for prominent stars and dynamic color shifting
- **Cosmic Sparkles**: Large glowing particles that float upward in the sky area with multi-layer rendering (core, glow, shimmer), spawn in bursts on high peaks
- **Shooting Stars**: Occasional streaks across the sky triggered by bass or high peaks with gradient trails and motion blur effect (2.5-4s cooldown)
- **Sky Glow Pulses**: Radial gradient breathing effect synced with bass, using purple/cyan colors for cosmic atmosphere

#### Audio Response

| Frequency | Effect |
|-----------|--------|
| Bass | Hero aura pulse, landing dust, subtle screen shake, road glow, star size pulsing, shooting star trigger, sky glow pulses |
| Mid | World scroll speed, prop drift, tower window flicker |
| High | Hero glow intensity, star twinkles, coin shimmer, sword slash + spark bursts, cosmic sparkle bursts, shooting star trigger, enhanced star color shift |

### Synthwave Horizon Visualizer

**File**: `src/components/cinema/visualizers/SynthwaveHorizon.tsx`

Synthwave outrun horizon: neon sun + perspective grid on a cosmic sky, with twinkle-star glints, cute sky flyers, aurora ribbons, occasional shooting comets, and a mid‑driven shimmer band at the horizon.

#### Visual Characteristics

- DPR‑aware full‑screen canvas with crisp pixel stars
- **Track‑seeded variation**: sky flyers + starfield vary per track (stable during playback)
- **Auto intensity (no user controls)**: Focus → Standard → Hype adjusts flyer energy, sun flare, and comet frequency
- Enhanced sparkle-star glints (high‑driven) for extra twinkle
- Neon sky flyers (UFOs/gliders/ring-orbs) drifting with additive glow + trails
- Neon sun with retro scanlines (clipped to the disc)
- Perspective grid with audio‑reactive brightness and forward scroll
- Aurora ribbons in the sky (vibrant additive bands; skipped in performance mode)
- Shooting comets spawned on high‑frequency peaks (rate‑limited; may appear in Hype even in performance mode)
- Bass pulse band travels through the grid rows for rhythmic motion
- Horizon shimmer band (mid‑driven) for gentle motion without full scene warping

#### Audio Response

| Frequency | Effect |
|-----------|--------|
| Bass | Sun pulse + grid brightness + forward scroll speed + sky-flyer bob/thrusters + grid pulse band + **grid vertical bounce** |
| Mid | Horizon shimmer amplitude + sky-flyer drift speed + **aurora pulsing** |
| High | Star twinkle/glints + sky-flyer glow/trails + scanline intensity + comet spawns |

#### Unique Features

- **Aurora Ribbons**: Vibrancy and alpha pulse in response to mid/high frequency energy.
- **Bouncing Grid**: The perspective grid rows perform a rhythmic vertical "bounce" synchronized with the bass.

### Spectrum Ring Visualizer

**File**: `src/components/cinema/visualizers/SpectrumRing.tsx`

A radial spectrum halo with a neon glow pulse, frequency burst particles, and a secondary inner ring. Minimal and focused — designed for contemplative listening.

#### Visual Characteristics

- DPR‑aware full‑screen canvas
- **Track‑seeded variation**: ring segments and burst particles vary per track
- **Primary ring** with per‑segment length and alpha responding to frequency bands
- **Secondary inner ring** (bass‑responsive) with dynamic length variation
- **Neon glow pulse** driven by accumulated energy for sustained intensity
- **Frequency burst particles** spawned on bass/mid/high peaks with delta‑based movement
- **Inner halo ring** with bass‑responsive radius and energy glow
- **Core stroke** on each segment for crispness
- Color temperature shifts cooler during quiet passages, warmer during peaks

#### Audio Response

| Frequency | Effect |
|-----------|--------|
| Bass | Ring radius breathing, inner ring expansion, burst particle spawning |
| Mid | Segment length variation, ring rotation speed, energy accumulation |
| High | Burst particle spawning, sparkle alpha, color cycling acceleration |

### Starlight Drift Visualizer

**File**: `src/components/cinema/visualizers/StarlightDrift.tsx`

A slow starfield drift with shimmering constellations, nebula gas clouds, and warp speed trails. Ambient and contemplative, designed for lower‑energy tracks.

#### Visual Characteristics

- DPR‑aware full‑screen canvas
- **Track‑seeded variation**: star positions, sizes, and tints vary per track
- **Nebula gas clouds**: soft radial gradient clouds that shift from cool purple/cyan to warmer magenta during peaks
- **Warp speed effect**: radial trails triggered by energy buildup, creating brief streak effects
- **Constellation ties**: stars within proximity thresholds connect with faint lines (reach extends during loud passages)
- **Core ping**: each star uses a sharper high‑contrast core for "striking" visuals
- Color temperature shifts from cool to warm based on sustained energy

#### Audio Response

| Frequency | Effect |
|-----------|--------|
| Bass | Star brightness boost, nebula expansion, energy accumulation |
| Mid | Star drift speed, nebula cloud size breathing |
| High | Twinkle speed + sparkle, warp trail trigger, constellation tie visibility |

---

## Dream (Daydream StreamDiffusion)

Dream ships as an optional AI remix layer inside Cinema:
- **Toggle-based**: Dream ON creates a stream, shows a 15s warm‑up countdown, then reveals the AI overlay. Status polling continues through a ~60s grace window plus a short post-poll buffer before surfacing a failure.
- **Window sizes (desktop)**: Dream floating windows use square aspect ratios with responsive clamp sizing:
  - Small: `clamp(230px, 31vh, 374px)`
  - Default: `clamp(288px, 46vh, 490px)`
  - Large: `clamp(346px, 64vh, 605px)`
- **Mobile sizing**: Full-width responsive sizing with fixed height breakpoints.
- **WHIP startup retries**: Not-ready WHIP responses during warm-up (404/409/429/5xx) are retried with exponential backoff to avoid false errors on quick stop/start.
- **Audio-reactive bounce animation**: When Dream is streaming and music is playing, the avatar iframe container performs subtle bounce animations triggered by bass peaks (threshold: 0.55, cooldown: 1.2s). The bounce translates the container up by 8-15px based on bass intensity and returns smoothly.
- **Ingest source**: **Webcam only** — no fallbacks to visualizers or video scenes. If webcam is unavailable, Dream shows an error state.
- **Camera pre-check**: Uses the Permissions API when available to skip a redundant getUserMedia pre-check if camera permission is already granted.
- **Auto-hide behavior**: Cinema controls still fade after ~5s of inactivity during the Dream countdown; pointer/tap resets the timer.
- **Prompt bar**: Temporarily disabled (partially implemented). Prompt base stays locked to default; persona selection is the only live prompt control right now.
- **Persona dropdown**: Selects the leading prompt token (Androgynous / Female / Male) that prefixes the prompt base.
- **Prompt sync timing**: Persona changes sync after the countdown completes and the stream is active (WHIP connected or status poll confirms). The hook retries warm-up failures (404/409/429/5xx) so updates apply as soon as Daydream is ready.
- **Live parameter updates**: Persona (gender) toggles update the stream in real-time without requiring restart. The sync effect in `use-dream.ts` watches for `resolvedPrompt` changes and triggers PATCH requests to `/api/daydream/streams/{id}/parameters` with the updated prompt. If Daydream rejects PATCH repeatedly, live updates pause for the session and changes apply on restart.
- **Persistence**: Dream overlay, ingest, and custom prompts stay active across scene/video switches while Dream is ON.
- **Teardown**: Dream OFF or closing Cinema stops ingest, deletes the stream, hides the overlay, and releases the camera.

### Browser Permissions Required

Dream requires webcam access via `navigator.mediaDevices.getUserMedia()`. Two things must be true:

1. **HTTP Header**: `Permissions-Policy` must allow `camera=(self)` — configured in `src/proxy.ts`
2. **User Permission**: Browser must grant camera access when prompted

**Troubleshooting `NotAllowedError: Permission denied`**:
- Check `src/proxy.ts` has `camera=(self)` not `camera=()` in Permissions-Policy
- Clear cached browser permission (site settings → Camera → Reset)
- Ensure HTTPS (required for getUserMedia)

See `docs/security/README.md` → "Permissions-Policy Configuration" for full details.

Full scope and defaults live in `docs/daydream/metadj-nexus-dream-mvp.md`.

## Architecture

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `CinemaOverlay.tsx` | `src/components/cinema/` | Main fullscreen Cinema overlay (3D/Video/Dream) |
| `CinemaStateOverlays.tsx` | `src/components/cinema/` | State overlay components (Awaiting, Paused, Error, Loading) |
| `CinemaSceneSelector.tsx` | `src/components/cinema/` | Categorized scene dropdown selector |
| `CinemaDreamControls.tsx` | `src/components/cinema/` | Daydream toggle and frame controls |
| `VisualizerCinema.tsx` | `src/components/cinema/` | Hybrid visualizer wrapper + scene transitions (routes 3D/2D) |
| `Visualizer3D.tsx` | `src/components/cinema/` | 3D visualizer switchboard + post‑processing |
| `Visualizer2D.tsx` | `src/components/cinema/` | 2D visualizer switchboard |
| `Cosmos.tsx` | `src/components/cinema/visualizers/` | 3D morphing particle cloud visualizer |
| `BlackHole.tsx` | `src/components/cinema/visualizers/` | 3D accretion disk with event horizon |
| `SpaceTravel.tsx` | `src/components/cinema/visualizers/` | 3D warp‑tunnel starfield with nebula |
| `DiscoBall.tsx` | `src/components/cinema/visualizers/` | 3D cosmic mirror‑tile disco sphere with halo |
| `PixelParadise.tsx` | `src/components/cinema/visualizers/` | 2D Pixel Portal drift visualizer |
| `EightBitAdventure.tsx` | `src/components/cinema/visualizers/` | 2D 8‑bit adventure pixel runner visualizer |
| `SynthwaveHorizon.tsx` | `src/components/cinema/visualizers/` | 2D synthwave outrun horizon visualizer |

**Archived / not currently shipped**: `SonicExplosion`, `SonicSphere`, and pre‑Pixel‑Portal 2D prototypes. If re‑introduced, they’ll return under a clearly labeled “experimental” tier.

### Data Configuration

| File | Location | Purpose |
|------|----------|---------|
| `scenes.ts` | `src/data/` | Scene definitions and configuration |

### Related Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `use-cinema.ts` | `src/hooks/cinema/` | Cinema state management |
| `use-cinema-controls.ts` | `src/hooks/cinema/` | Auto-hide controls behavior |
| `use-cinema-video.ts` | `src/hooks/cinema/` | Video playback and error handling |
| `use-cinema-analytics.ts` | `src/hooks/cinema/` | Cinema analytics tracking |
| `use-audio-analyzer.ts` | `src/hooks/` | Web Audio API frequency analysis |

## Scene Types

### Audio-Reactive Visualizers

Generated graphics that respond to audio frequency data in real-time. Visualizers are grouped by renderer.

#### 3D Visualizers (React Three Fiber)

| Scene ID | Name | Description | Style | Renderer |
|----------|------|-------------|-------|----------|
| `cosmos` | Cosmos | Spiral galaxy with Keplerian rotation and purple/blue/cyan palette | particles, brand-colors, intense | 3D (R3F) |
| `black-hole` | Black Hole | Accretion disk with Keplerian orbits and flowing gradient event horizon | gravitational, brand-colors, intense | 3D (R3F) |
| `space-travel` | Space Travel | Forward‑flying starfield with nebula clouds | cosmic, brand-colors, subtle | 3D (R3F) |
| `disco-ball` | Disco Ball | Cosmic mirror-tile sphere with glittering facets and orbiting stardust | glitter, brand-colors, intense | 3D (R3F) |

#### 2D Visualizers (HTML5 Canvas)

| Scene ID | Name | Description | Style | Renderer |
|----------|------|-------------|-------|----------|
| `pixel-paradise` | Pixel Portal | Retro‑future portal drift: neon pixels orbit a glowing gateway | retro, brand-colors, moderate | 2D (HTML5 canvas) |
| `synthwave-horizon` | Synthwave Horizon | Outrun grid and neon sun on a cosmic horizon | synthwave, brand-colors, moderate | 2D (HTML5 canvas) |
| `eight-bit-adventure` | 8-Bit Adventure | MetaDJ-styled pixel hero with headphones, loot sparks, and sword slashes | adventure, brand-colors, moderate | 2D (HTML5 canvas) |
| `spectrum-ring` | Spectrum Ring | Radial spectrum halo with neon glow pulse, frequency burst particles, and inner ring | ambient, brand-colors, subtle | 2D (HTML5 canvas) |
| `starlight-drift` | Starlight Drift | Slow starfield drift with nebula clouds, constellation ties, and warp trails | cosmic, cool, subtle | 2D (HTML5 canvas) |

**Roadmap note**: Spectrum Ring is now live as a low‑distraction 2D experiment. **Waveform and Frequency Bars are explicitly not planned.**

### Video Scenes

Pre-rendered looping video backgrounds:

| Scene ID | Name | Video Path | Recommended For |
|----------|------|------------|-----------------|
| `metadj-avatar` | MetaDJ Avatar | `/api/video/metadj-avatar/MetaDJ%20Performance%20Loop%20-%20MetaDJ%20Nexus.mp4` | Majestic Ascent (current); Bridging Reality/Transformer reserved |

## Visualizer Styles

### Style Configuration

```typescript
interface VisualizerStyle {
  type: "explosion" | "space-travel" | "black-hole" | "disco-ball" | "pixel-paradise" | "eight-bit-adventure" | "synthwave-horizon" | "spectrum-ring" | "starlight-drift"
  colorScheme: "purple-cyan" | "warm" | "cool" | "monochrome"
  intensity: "subtle" | "moderate" | "intense"
  renderer?: "2d" | "3d" // Default is '2d'; set '3d' for R3F scenes
}
```

### Color Schemes

| Scheme | Primary | Secondary | Accent |
|--------|---------|-----------|--------|
| `brand-colors` | #8b5cf6 (purple) | #06b6d4 (cyan) | #d946ef (magenta) |
| `purple-cyan` | #a855f7 | #06b6d4 | #ec4899 |
| `warm` | #f97316 | #eab308 | #ef4444 |
| `cool` | #3b82f6 | #06b6d4 | #8b5cf6 |
| `monochrome` | #ffffff | #a1a1aa | #e4e4e7 |

### Intensity Multipliers

| Level | Multiplier | Use Case |
|-------|------------|----------|
| `subtle` | 0.8 | Background ambiance |
| `moderate` | 0.95 | Standard visualization |
| `intense` | 1.0 | High-energy experience |

## Cinema Overlay

### Hybrid Rendering

The `CinemaOverlay` component switches between **visualizers** and **video scenes**.  
For visualizers, `VisualizerCinema` routes to the appropriate renderer based on `VisualizerStyle.renderer`.

1. **Visualizer Mode**
   - **3D**: React Three Fiber `<Canvas>` with post‑processing Bloom (**Cosmos**, **Black Hole**, **Space Travel**, **Disco Ball**).
   - **2D**: HTML5 `<canvas>` renderer (**Pixel Portal**, **8‑Bit Adventure**, **Synthwave Horizon**).
2. **Video Mode**: Standard HTML5 `<video>` element for pre-rendered loops (e.g., MetaDJ Avatar).

### Display Modes

1. **Inline Mode** (Desktop) — Cinema renders within the page layout
2. **Fullscreen Mode** — Cinema takes over the entire viewport

### Container Styling

```typescript
// Inline mode
"relative w-full overflow-hidden rounded-2xl border border-(--border-standard) bg-black"

// Fullscreen mode
"fixed inset-0 z-40 overflow-hidden bg-black"
```

### Height Calculation

```typescript
// Inline mode height
const inlineHeight = `calc(100vh - ${headerHeight}px - 8px)`
```

### Controls Overlay

- Auto-hide after 5 seconds (all devices)
- Tap anywhere on the visual surface to show controls and reset auto-hide timer
- Scene selector dropdown (categorized: Visualizers first, then Video Scenes)
- Top and bottom gradient overlays for control visibility against dark backgrounds
- Keyboard hints
- `touch-manipulation` class prevents pinch-zoom while allowing pan/scroll on mobile

### Cinema State Overlays

The Cinema system displays contextual overlays based on playback state:

| State | Component | Display |
|-------|-----------|---------|
| No track loaded | None | Clean Cinema surface awaiting audio—no prompt shown |
| Track paused | `CinemaPaused` | Centered play button with pulse animation, "Paused" label |
| Track playing | None | Clean Cinema surface, controls appear on tap/hover |
| Video error | `CinemaVideoError` | Error message with retry button |
| Loading | `CinemaLoadingState` | Loading indicator |

## Audio Analyzer

The `useAudioAnalyzer` hook provides frequency data for visualizers:

```typescript
interface AudioAnalyzerData {
  frequencyData: Uint8Array    // FFT frequency bins
  waveformData: Uint8Array     // Time-domain samples
  bassLevel: number            // Low frequency energy (0-1)
  midLevel: number             // Mid frequency energy (0-1)
  highLevel: number            // High frequency energy (0-1)
  overallLevel: number         // Combined energy level (0-1)
}
```

### Configuration

```typescript
useAudioAnalyzer({
  audioElement: HTMLAudioElement,
  enabled: boolean,
  fftSize: 256,              // FFT resolution (128-2048)
  smoothingTimeConstant: 0.8 // Smoothing factor (0-1)
})

// NOTE: The analyzer can be initialized with enabled: false to "warm up"
// the audio graph (createMediaElementSource) without starting the analysis loop.
// This is used in AudioPlayer.tsx to prevent audio cutouts when the visualizer opens.
```

## Scene Persistence

Selected scene is persisted to localStorage:

```typescript
// Desktop key: metadj_cinema_scene
// Mobile key: metadj_cinema_scene_mobile
// Value: SceneId (e.g., "cosmos", "pixel-paradise", "metadj-avatar")
const key = isMobile ? "metadj_cinema_scene_mobile" : "metadj_cinema_scene"
localStorage.setItem(key, selectedScene)
```

## Collection-Cinema Associations

Recommended scenes for collections:

```typescript
const COLLECTION_SCENE_MAP = {
  "majestic-ascent": "metadj-avatar",
  "bridging-reality": "metadj-avatar", // Default until specific scene
  "metaverse-revelation": "cosmos",
  "transformer": "metadj-avatar"
}
```

## Video Playback

### Video Element Props

```typescript
<video
  src={currentScene.videoPath}
  playsInline
  loop
  muted
  preload="metadata"
  className="absolute inset-0 h-full w-full object-cover"
/>
```

### Error Handling

- Graceful fallback on video load failure
- Retry button for failed loads
- Audio playback continues independently

## Keyboard Controls

| Key | Action |
|-----|--------|
| `Space` | Play/pause audio |
| `F` | Toggle fullscreen (desktop) |
| `Escape` | Exit fullscreen (including browser fullscreen) |

## Integration Points

### View Management

Cinema is one of three main views (Hub, Wisdom, Cinema):

```typescript
type ActiveView = "hub" | "wisdom" | "cinema"
```

### Header Integration

Cinema toggle available in `AppHeader` navigation.

### Panel Layout

When Cinema view is active:
- Side panels don't affect Cinema margins
- Cinema fills available width
- Panels remain accessible but separate

## Performance Optimizations

### Visualizer Rendering

- Uses `requestAnimationFrame` for ~60fps rendering (2D visualizers); Dream ingest draw loop is throttled to ~30fps for stable capture
- Cinema context reused to avoid GC
- React state updates throttled
- DPR-aware canvas sizing
- **3D Optimization**: Uses React Three Fiber's efficient loop and instance management (e.g., Points)
- **Particle Caching**: Particle positions and attributes are pre-calculated outside the component render cycle to prevent recalculation on re-renders

### Static State (Paused)

When audio is paused, visualizers switch to "alive" idle states with subtle animations (breathing gradients, drifting particles, rotating rings) rather than static noise, ensuring the visuals remain engaging.

## Mobile Behavior

On mobile devices (< 1024px):
- Cinema renders in fullscreen overlay mode
- **2D visualizers only** (3D visualizers are available on desktop)
- Tap anywhere in Cinema to show/hide controls and reset auto-hide timer (5 seconds)
- Simplified control layout with compressed padding (px-3 vs px-6)
- Dream controls: Inline timer and stop button with gap-2 spacing
- Shortened status text ("16s" vs "Dream in 16s")
- Dream toolbar: Mobile shows only persona (gender) + hide; toolbar stays in the header row.
- **Daydream Timer Display**: Fixed-width countdown (`w-[2.5ch] tabular-nums`) prevents layout shift as numbers change
- **Daydream Mobile Overlay**:
  - Uses absolute positioning with explicit square dimensions: `h-[min(75vw,280px)] w-[min(75vw,280px)]`
  - Centered with offset for header: `top-[calc(50%+1rem)] left-1/2 -translate-x-1/2 -translate-y-1/2`
  - Same iframe cropping as desktop (`min-h-[140%] -mt-[20%]`) to hide Livepeer player controls
  - Maximum 280px size maintains optimal fidelity for 512px stream

## Daydream AI Generation

### Default Settings

| Setting | Value |
|---------|-------|
| Model | `stabilityai/sd-turbo` |
| Default Prompt Base | `cartoon magical dj blue sparkle` (locked; prompt bar disabled) |
| Persona Prefix | `androgynous` / `female` / `male` (selectable) |
| Full Prompt | `{persona} {promptBase}` |
| Negative Prompt | `blurry, low quality, flat, 2d` |
| Resolution | 512×512 (1:1) |
| Input Capture | 512×512 canvas capture @ 30fps (webcam requested 640×480 @ 30fps) |
| Countdown | 15 seconds |
| Prompt Persistence | NOT persisted (resets to default on app restart) |

### ControlNet Configuration (SD21)

| ControlNet | Scale | Purpose |
|------------|-------|---------|
| OpenPose | 0.75 | Pose/body structure detection |
| HED (soft edge) | 0.2 | Soft edge detection |
| Canny | 0.2 | Hard edge detection |
| Depth | 0.75 | Depth perception |
| Color | 0.2 | Color reference passthrough |

### Additional Parameters

- LCM LoRA: omitted (Daydream default)
- `t_index_list: [12, 20, 24]`
- `guidance_scale: 1.0`
- `delta: 0.7`
- `enable_similar_image_filter: true` with `prompt_interpolation_method: slerp`
- IP Adapter: Disabled

## Related Documentation

- [Audio Player Standards](audio-player-standards.md) — Playback integration
- [UI Visual System](ui-visual-system.md) — Design tokens and styling
- [MEDIA-STORAGE](../MEDIA-STORAGE.md) — Video asset hosting (Cloudflare R2)

## Future Enhancements

### Cinema as an Intelligent Companion (Roadmap Concept)

Cinema is on track to evolve from a reactive visual layer into an intelligent companion that *guides state* while reflecting sound. This is future‑vision work, not shipped behavior yet.

Potential directions:
- **Adaptive scene guidance**: suggest or auto‑select scenes based on collection, mood channel, BPM/energy, or user focus mode.
- **MetaDJai‑assisted visuals**: let MetaDJai influence scene choice and style shifts as part of a holistic session.
- **Session continuity**: visuals evolve across a set rather than resetting per track, building a coherent arc.

### Other Future Enhancements
- [ ] Dream prompt bar (partially implemented, currently disabled)
- [ ] Spectrum Ring 2D visualizer (next low‑distraction candidate)
- [ ] User‑created visual packs
- [ ] Additional 3D visualizer styles
- [ ] Visualizer customization controls
- [ ] Expanded video scene library / uploads
- [ ] Spatial audio visualization
