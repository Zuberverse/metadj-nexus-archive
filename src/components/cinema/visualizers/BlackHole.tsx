"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { VISUALIZER_SRGB } from "@/lib/color/visualizer-palette"

interface BlackHoleProps {
  bassLevel: number
  midLevel: number
  highLevel: number
  /** When true, uses reduced particle counts for smoother rendering. */
  performanceMode?: boolean
}

// Seeded random
function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

const HIGH_PARTICLE_COUNT = 12000 // Premium look
const LOW_PARTICLE_COUNT = 6000   // Performance mode

function generateDiskData(particleCount: number) {
  const positions = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const randoms = new Float32Array(particleCount * 3)
  const colorIdx = new Float32Array(particleCount)
  const random = seededRandom(5678)

  for (let i = 0; i < particleCount; i++) {
    // Disk distribution
    const angle = random() * Math.PI * 2
    // Distribute radii: inverse square-ish concentration
    // Range: Inner Edge (3.0) to Outer Edge (12.0)
    const t = random()
    const radius = 3.0 + t * t * 9.0

    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = (random() - 0.5) * 0.15 * (radius * 0.1) // Thin disk, flares slightly at edges

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    sizes[i] = 0.5 + random() * 0.5 // More uniform sizes, minimum 0.5
    colorIdx[i] = radius // Encode radius for shader color mapping

    randoms[i * 3] = random()
    randoms[i * 3 + 1] = random()
    randoms[i * 3 + 2] = random()
  }

  return { positions, sizes, colorIdx, randoms }
}

const HIGH_DISK_DATA = generateDiskData(HIGH_PARTICLE_COUNT)
const LOW_DISK_DATA = generateDiskData(LOW_PARTICLE_COUNT)

// Maximum concurrent ripple pulses tracked in the shader
const MAX_RIPPLE_PULSES = 6

// Advanced Accretion Disk Shader
const DiskShader = {
  uniforms: {
    uTime: { value: 0 },
    uRotation: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uRipplePhase: { value: 0 },
    uColorPhase: { value: 0 },
    uPixelRatio: { value: 1.0 },
    // New uniforms for enhanced audio reactivity
    uSustainedEnergy: { value: 0 },
    uRadialCompression: { value: 0 },
    uDiskThickness: { value: 0 },
    uColorTemperature: { value: 0 },
    // Ripple pulse origins (phase at which each pulse was spawned) and strengths
    uRipplePulseOrigins: { value: new Float32Array(MAX_RIPPLE_PULSES) },
    uRipplePulseStrengths: { value: new Float32Array(MAX_RIPPLE_PULSES) },
    uRipplePulseCount: { value: 0 },
    uDensityScale: { value: 1.0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uRotation;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uRipplePhase;
    uniform float uColorPhase;
    uniform float uPixelRatio;
    uniform float uSustainedEnergy;
    uniform float uRadialCompression;
    uniform float uDiskThickness;
    uniform float uColorTemperature;
    uniform float uRipplePulseOrigins[${MAX_RIPPLE_PULSES}];
    uniform float uRipplePulseStrengths[${MAX_RIPPLE_PULSES}];
    uniform float uRipplePulseCount;
    uniform float uDensityScale;

    attribute float aSize;
    attribute float aColorIdx;
    attribute vec3 aRandom;

    varying float vAlpha;
    varying float vRadius;
    varying vec3 vColor;
    varying vec3 vPos;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
      vec3 pos = position;
      float r = length(pos.xz);
      vRadius = r;

      // ═══════════════════════════════════════════════════════════════════════
      // KEPLERIAN ROTATION
      // Inner particles orbit faster — accumulated rotation never reverses
      // ═══════════════════════════════════════════════════════════════════════
      float keplerFactor = 1.0 / sqrt(r);
      float angle = -uRotation * keplerFactor;

      float c = cos(angle);
      float s = sin(angle);

      vec3 rotatedPos = vec3(
        pos.x * c - pos.z * s,
        pos.y,
        pos.x * s + pos.z * c
      );

      // ═══════════════════════════════════════════════════════════════════════
      // TURBULENCE — organic particle movement, scaled by audio energy
      // ═══════════════════════════════════════════════════════════════════════
      float noise = snoise(pos * 2.0 + vec3(uTime * 0.15));
      float turbulence = noise * (0.03 + uBass * 0.08 + uMid * 0.04);
      rotatedPos.y += turbulence;

      // ═══════════════════════════════════════════════════════════════════════
      // GRAVITATIONAL WAVE RIPPLES
      // Continuous background ripples + discrete bass-triggered pulse waves
      // Pulses propagate outward from center with distance-based decay
      // ═══════════════════════════════════════════════════════════════════════

      // Background ripple waves (continuous, subtle)
      float rippleSpeedMult = 1.0 + uSustainedEnergy * 1.5;
      float ripple1 = sin(uRipplePhase * 2.0 * rippleSpeedMult - r * 1.2) * 0.5 + 0.5;
      float ripple2 = sin(uRipplePhase * 1.5 * rippleSpeedMult - r * 0.8 + 1.5) * 0.5 + 0.5;
      float ripple3 = sin(uRipplePhase * 3.0 * rippleSpeedMult - r * 1.8 + 3.0) * 0.5 + 0.5;

      float combinedRipple = ripple1 * uBass + ripple2 * uMid * 0.5 + ripple3 * uHigh * 0.3;

      // Discrete bass pulse ripples — each pulse propagates outward from center
      // Creates visible wavefronts that travel through the disk on bass hits
      float pulseDisplacement = 0.0;
      int pulseCount = int(uRipplePulseCount);
      for (int i = 0; i < ${MAX_RIPPLE_PULSES}; i++) {
        if (i >= pulseCount) break;
        float pulseOrigin = uRipplePulseOrigins[i];
        float pulseStrength = uRipplePulseStrengths[i];

        // How far this pulse has traveled (in ripple-phase units)
        float pulseTraveled = (uRipplePhase - pulseOrigin) * 3.5;

        // Wavefront position — maps to radial distance in the disk
        float wavefrontR = pulseTraveled * 2.8;

        // Gaussian pulse envelope centered at the wavefront
        float distFromFront = r - wavefrontR;
        float envelope = exp(-distFromFront * distFromFront * 1.8);

        // Smooth visibility as pulse arrives and fades past outer edge
        float visible = smoothstep(-0.3, 0.3, pulseTraveled) * smoothstep(13.0, 11.5, wavefrontR);

        pulseDisplacement += envelope * pulseStrength * visible * 0.18;
      }

      // Combined vertical ripple displacement
      float rippleStrength = 0.04 + uBass * 0.08;
      rotatedPos.y += combinedRipple * rippleStrength + pulseDisplacement;

      // ═══════════════════════════════════════════════════════════════════════
      // DISK WARPING — gravitational distortion on audio energy
      // ═══════════════════════════════════════════════════════════════════════

      // Radial compression on bass — particles pulled inward toward singularity
      float compressionFactor = 1.0 - uRadialCompression * 0.02 * (r / 12.0);
      rotatedPos.xz *= compressionFactor;

      // Mid-frequency vertical displacement waves — disk surface undulation
      float midWarp = snoise(vec3(rotatedPos.xz * 0.3, uTime * 0.4)) * uMid * 0.06;
      rotatedPos.y += midWarp;

      // Disk thickening during intense passages — more vertical spread
      rotatedPos.y *= 1.0 + uDiskThickness * 0.3;

      // ═══════════════════════════════════════════════════════════════════════
      // RADIAL WOBBLE — bass-driven radial breathing (subtle)
      // ═══════════════════════════════════════════════════════════════════════
      float wobble = sin(uTime * 2.0 + r * 0.5) * uBass * 0.05;
      rotatedPos.xz *= 1.0 + wobble * 0.012 + combinedRipple * 0.005;

      vPos = rotatedPos;

      vec4 mvPosition = modelViewMatrix * vec4(rotatedPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // HIGH FIDELITY: Stable particle sizes (minimal audio response to prevent glow pulse)
      float sizeBoost = 1.0 + uHigh * 0.05 + uBass * 0.03;  // Minimal size variation
      float baseSize = 0.45 * aSize * sizeBoost;
      gl_PointSize = baseSize * (380.0 / -mvPosition.z) * uPixelRatio;
      gl_PointSize = clamp(gl_PointSize, 2.5, 45.0);

      // ═══════════════════════════════════════════════════════════════════════
      // PURPLE/BLUE/CYAN DOMINANT PALETTE (matching Cosmos)
      // Purple is PRIMARY, no white, magenta as accent only
      //
      // Color temperature shifts with energy:
      //   Quiet  → deep purple/indigo dominance (cooler, more distant)
      //   Build  → cyan emergence in the inner disk
      //   Peak   → inner disk glows intensely, outer particles richer
      // ═══════════════════════════════════════════════════════════════════════

      // Core colors (purple/violet dominant - NO WHITE)
      vec3 purple = vec3(${VISUALIZER_SRGB.purple});      // #8B5CF6 - PRIMARY
      vec3 indigo = vec3(${VISUALIZER_SRGB.indigo});      // #A855F7
      vec3 cyan = vec3(${VISUALIZER_SRGB.cyan});          // #06B6D4
      vec3 magenta = vec3(${VISUALIZER_SRGB.magenta});    // #D946EF - accent only
      vec3 deepBlue = vec3(0.15, 0.25, 0.85);                    // Deep cosmic blue
      vec3 electricBlue = vec3(0.2, 0.4, 1.0);                   // Electric blue
      vec3 violetCore = vec3(0.7, 0.5, 1.0);                     // Bright violet for inner disk

      // Radial gradient: violet core → purple mid → deep blue outer
      float t = smoothstep(3.0, 10.0, r);
      vec3 innerColor = violetCore;                              // Violet core (not white)
      vec3 midColor = mix(purple, indigo, 0.4);                  // Purple/indigo blend
      vec3 outerColor = mix(deepBlue, purple * 0.5, 0.3);        // Deep blue with purple tint

      vec3 baseColor = mix(innerColor, midColor, t);
      baseColor = mix(baseColor, outerColor, smoothstep(0.5, 1.0, t));

      // Add violet core glow (not white-blue) — smooth falloff, no hard threshold
      float coreGlow = 1.0 - smoothstep(2.8, 4.5, r);
      baseColor += violetCore * 0.4 * coreGlow;

      // ── Energy-dependent color temperature ──
      // uColorTemperature: 0 = quiet (deep purple), 1 = peak (cyan/bright)
      float temp = uColorTemperature;

      // Quiet: push toward deeper indigo/purple
      vec3 coolShift = deepBlue * 0.15 * (1.0 - temp);

      // Building/Peak: cyan emerges in inner disk, outer gets richer purple
      float innerMask = 1.0 - smoothstep(3.0, 7.0, r); // 1 at center, 0 at edge
      vec3 warmShift = cyan * 0.25 * temp * innerMask
                     + indigo * 0.12 * temp * (1.0 - innerMask);

      // Inner disk glow intensification at peak energy
      float innerGlow = temp * innerMask * 0.3;

      baseColor += coolShift + warmShift + violetCore * innerGlow;

      // Create smooth cycling with PURPLE PRIMARY (weighted higher)
      // Color phase speed accelerates with sustained energy
      float colorCycle = uColorPhase;
      float purpleWeight = pow(sin(colorCycle) * 0.5 + 0.5, 0.5) * 1.4;        // PRIMARY 1.4x
      float cyanWeight = pow(sin(colorCycle + 2.094) * 0.5 + 0.5, 0.6);
      float blueWeight = pow(sin(colorCycle + 3.5) * 0.5 + 0.5, 0.7);
      float magentaAccent = pow(sin(colorCycle + 4.5) * 0.5 + 0.5, 1.2) * uHigh * 0.4; // Accent on highs only

      // Audio-reactive color pumping — amplified by sustained energy
      float sustainBoost = 1.0 + uSustainedEnergy * 0.5;
      float audioColorBoost = (uBass * 0.4 + uMid * 0.25 + uHigh * 0.2) * sustainBoost;

      // Blend colors with purple dominant
      vec3 shiftBlend = purple * purpleWeight + cyan * cyanWeight + electricBlue * blueWeight + magenta * magentaAccent;
      float totalWeight = purpleWeight + cyanWeight + blueWeight + magentaAccent + 0.001;
      shiftBlend = shiftBlend / totalWeight;

      // Bass pumps purple/indigo, mid pumps electric blue (subtle to reduce glow pulse)
      vec3 audioPump = indigo * uBass * 0.1 + electricBlue * uMid * 0.07;

      // Apply color shift across entire disk - stable base
      float shiftStrength = 0.7 + smoothstep(3.0, 7.0, r) * 0.3;
      shiftStrength *= (0.7 + audioColorBoost * 0.3);  // Reduced audio response

      vec3 finalColor = baseColor * 0.65 + shiftBlend * shiftStrength + audioPump;

      // SATURATION BOOST (1.35x like Cosmos)
      float luma = dot(finalColor, vec3(0.299, 0.587, 0.114));
      finalColor = mix(vec3(luma), finalColor, 1.35);

      vColor = finalColor;

      float edgeFade = 1.0 - smoothstep(9.5, 11.0, r);
      float holeFade = smoothstep(2.8, 3.2, r);
      // Let particles fade naturally without alpha floor to prevent grainy stacking
      vAlpha = edgeFade * holeFade;
      vAlpha *= uDensityScale;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      vec2 uv = gl_PointCoord.xy - 0.5;
      float d = length(uv);

      // Sharp circular cutoff
      if (d > 0.42) discard;

      // HIGH FIDELITY: Sharp core with controlled glow
      float core = 1.0 - smoothstep(0.0, 0.06, d);   // Very tight core
      float inner = 1.0 - smoothstep(0.0, 0.18, d);  // Inner glow
      float outer = 1.0 - smoothstep(0.0, 0.42, d);  // Outer edge

      // Sharper falloff for defined particles
      inner = pow(inner, 1.8);
      outer = pow(outer, 2.5);

      float strength = core * 1.6 + inner * 0.6 + outer * 0.25;

      vec3 color = vColor * 1.45;

      // Core brightening
      color *= 1.0 + core * 0.3;

      // Clamp color to prevent hot spots
      color = clamp(color, vec3(0.0), vec3(1.5));

      float finalAlpha = vAlpha * strength;
      // HIGH threshold for crisp particles
      if (finalAlpha < 0.16) discard;

      gl_FragColor = vec4(color, finalAlpha);
    }
  `
}

// Dynamic Event Horizon Ring with flowing gradient colors and audio reactivity
const EventHorizonShader = {
  uniforms: {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uColorPhase: { value: 0 },
    uFlowPhase: { value: 0 },
    uSustainedEnergy: { value: 0 },
    uFeedIntensity: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uColorPhase;
    uniform float uFlowPhase;
    uniform float uSustainedEnergy;
    uniform float uFeedIntensity;
    varying vec2 vUv;

    // Simple pseudo-random noise
    float rand(vec2 n) {
      return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv - 0.5;
      float r = length(uv);
      float angle = atan(uv.y, uv.x);

      // Ring shape: 0.42 to 0.48
      float glow = smoothstep(0.42, 0.48, r);
      float edgeCull = 1.0 - smoothstep(0.485, 0.49, r);
      glow *= edgeCull;

      // MetaDJ brand color palette (canonical sRGB)
      vec3 cyan = vec3(${VISUALIZER_SRGB.cyan});       // #06B6D4
      vec3 purple = vec3(${VISUALIZER_SRGB.purple});   // #8B5CF6
      vec3 magenta = vec3(${VISUALIZER_SRGB.magenta}); // #D946EF
      vec3 indigo = vec3(${VISUALIZER_SRGB.indigo});   // #A855F7

      // Flowing angular gradient - rotates around the ring continuously
      float flowAngle = angle + uFlowPhase;

      // Smooth 4-color gradient using sine blending (no harsh if/else branches)
      float p = flowAngle / 6.28318;
      float w1 = max(0.0, 1.0 - abs(fract(p) - 0.0) * 4.0);
      float w2 = max(0.0, 1.0 - abs(fract(p) - 0.25) * 4.0);
      float w3 = max(0.0, 1.0 - abs(fract(p) - 0.5) * 4.0);
      float w4 = max(0.0, 1.0 - abs(fract(p) - 0.75) * 4.0);
      float w5 = max(0.0, 1.0 - abs(fract(p) - 1.0) * 4.0);
      w1 += w5;
      float wTotal = w1 + w2 + w3 + w4;
      vec3 gradientColor = (cyan * w1 + purple * w2 + magenta * w3 + indigo * w4) / max(wTotal, 0.001);

      // Add color phase shifting (changes the base hue over time) - safe version
      float hueShift = uColorPhase * 0.3;
      float s1 = sin(hueShift) * 0.5 + 0.5;
      float s2 = sin(hueShift + 2.09) * 0.5 + 0.5;
      float s3 = sin(hueShift + 4.19) * 0.5 + 0.5;
      vec3 shiftTint = cyan * s1 + magenta * s2 + purple * s3;
      shiftTint = shiftTint * 0.15;
      gradientColor = gradientColor * 0.85 + shiftTint;

      // Audio-reactive wave patterns that pulse through the ring
      float waveSpeed1 = uFlowPhase * 3.0;
      float waveSpeed2 = uFlowPhase * 2.0;
      float waveSpeed3 = uFlowPhase * 5.0;

      // Bass creates slow powerful waves - MORE PRONOUNCED
      float bassWave = sin(angle * 2.0 + waveSpeed1) * 0.5 + 0.5;
      bassWave = pow(bassWave, 1.5) * uBass; // Reduced power for visibility

      // Mid creates medium ripples - MORE PRONOUNCED
      float midWave = sin(angle * 4.0 - waveSpeed2) * 0.5 + 0.5;
      midWave = pow(midWave, 1.2) * uMid; // Reduced power for visibility

      // High creates fast sparkle movement - MORE PRONOUNCED
      float highWave = sin(angle * 8.0 + waveSpeed3) * 0.5 + 0.5;
      highWave = pow(highWave, 2.0) * uHigh; // Reduced power for visibility

      // Combine audio waves for brightness modulation - STRONGER EFFECT
      float audioWaves = 1.0 + bassWave * 0.5 + midWave * 0.35 + highWave * 0.25;

      // Audio also intensifies the gradient colors - STRONGER COLOR BOOSTS
      vec3 bassBoost = cyan * bassWave * 0.4;
      vec3 midBoost = purple * midWave * 0.3;
      vec3 highBoost = magenta * highWave * 0.35;

      gradientColor += bassBoost + midBoost + highBoost;

      // ── Singularity feeding pulse ──
      // Bass-driven intensity that makes the ring feel like it's consuming energy
      // uFeedIntensity is a smoothed, transient-aware bass signal
      float feedPulse = 1.0 + uFeedIntensity * 0.35;

      // Sustained energy adds a slower, building brightness
      float sustainGlow = 1.0 + uSustainedEnergy * 0.18;

      // Base intensity - stable without audio, responsive with audio
      // Removed idle breathing (sin(uTime)) to prevent glow pulse without audio
      float bassPulse = 1.0 + uBass * 0.25;
      float intensity = (0.95 + uBass * 0.25 + uMid * 0.15) * bassPulse * audioWaves * feedPulse * sustainGlow;

      // Apply glow and intensity
      vec3 finalColor = gradientColor * glow * intensity * 2.2;

      // Ensure vibrant colors even at rest (minimum brightness)
      finalColor = max(finalColor, gradientColor * glow * 0.75);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
}

// ═══════════════════════════════════════════════════════════════════════
// Instance-scoped state
// Tracks smoothed audio, accumulated phases, energy history,
// bass transients, ripple pulses, and tilt impulses
// ═══════════════════════════════════════════════════════════════════════

// Single ripple pulse spawned on a bass transient
interface RipplePulse {
  originPhase: number  // ripple phase at time of spawn
  strength: number     // initial strength (0-1), based on transient magnitude
  age: number          // seconds since spawn
}

// Tilt impulse from bass impact — decays over time
interface TiltImpulse {
  x: number
  z: number
  age: number
  decay: number // seconds to decay
}

interface BlackHoleState {
  accumulatedRotation: number
  accumulatedRipplePhase: number
  accumulatedColorPhase: number
  accumulatedFlowPhase: number
  smoothedRotationSpeed: number
  smoothedBass: number
  smoothedMid: number
  smoothedHigh: number
  // Energy accumulation — tracks sustained loudness over ~3 seconds
  energyHistory: number[]      // ring buffer of recent energy samples
  energyHistoryIndex: number
  sustainedEnergy: number      // smoothed output (0-1)
  // Bass transient detection for ripple pulses and tilt
  prevBassLevel: number
  bassTransientCooldown: number
  ripplePulses: RipplePulse[]
  // Tilt impulses from bass impacts
  tiltImpulses: TiltImpulse[]
  // Color temperature (0 = quiet/cool, 1 = peak/warm)
  colorTemperature: number
  // Radial compression and disk thickness (smoothed)
  radialCompression: number
  diskThickness: number
  // Feed intensity for event horizon (smoothed bass transient)
  feedIntensity: number
}

// ~3 seconds of history at 60fps
const ENERGY_HISTORY_SIZE = 180

function createInitialBlackHoleState(): BlackHoleState {
  return {
    accumulatedRotation: 0,
    accumulatedRipplePhase: 0,
    accumulatedColorPhase: 0,
    accumulatedFlowPhase: 0,
    smoothedRotationSpeed: 0.4,
    smoothedBass: 0,
    smoothedMid: 0,
    smoothedHigh: 0,
    energyHistory: new Array(ENERGY_HISTORY_SIZE).fill(0),
    energyHistoryIndex: 0,
    sustainedEnergy: 0,
    prevBassLevel: 0,
    bassTransientCooldown: 0,
    ripplePulses: [],
    tiltImpulses: [],
    colorTemperature: 0,
    radialCompression: 0,
    diskThickness: 0,
    feedIntensity: 0,
  }
}

export function BlackHole({ bassLevel, midLevel, highLevel, performanceMode = false }: BlackHoleProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const horizonRef = useRef<THREE.ShaderMaterial>(null)
  const stateRef = useRef<BlackHoleState>(createInitialBlackHoleState())

  const particles = useMemo(
    () => (performanceMode ? LOW_DISK_DATA : HIGH_DISK_DATA),
    [performanceMode],
  )

  const densityScale = performanceMode ? 1.0 : Math.sqrt(LOW_PARTICLE_COUNT / HIGH_PARTICLE_COUNT)

  useFrame((state, delta) => {
    if (!materialRef.current || !horizonRef.current || !pointsRef.current) return

    const time = state.clock.elapsedTime
    const clampedDelta = Math.min(delta, 0.1)
    const s = stateRef.current

    // ═══════════════════════════════════════════════════════════════════════
    // AUDIO SMOOTHING
    // Power curves for punch; asymmetric smoothing per band
    // ═══════════════════════════════════════════════════════════════════════
    const bassTarget = Math.pow(bassLevel, 1.5)
    const bassSmooth = bassTarget > s.smoothedBass ? 0.05 : 0.008
    s.smoothedBass = THREE.MathUtils.lerp(s.smoothedBass, bassTarget, bassSmooth)

    const midTarget = midLevel
    const midSmooth = midTarget > s.smoothedMid ? 0.04 : 0.01
    s.smoothedMid = THREE.MathUtils.lerp(s.smoothedMid, midTarget, midSmooth)

    const highTarget = Math.pow(highLevel, 1.2)
    const highSmooth = highTarget > s.smoothedHigh ? 0.05 : 0.012
    s.smoothedHigh = THREE.MathUtils.lerp(s.smoothedHigh, highTarget, highSmooth)

    // ═══════════════════════════════════════════════════════════════════════
    // ENERGY ACCUMULATION (~3 second window)
    // Tracks sustained loudness to create musical arc awareness.
    // Sustained loud passages gradually intensify rotation and color
    // beyond what momentary peaks achieve.
    // ═══════════════════════════════════════════════════════════════════════
    const instantEnergy = s.smoothedBass * 0.5 + s.smoothedMid * 0.3 + s.smoothedHigh * 0.2
    s.energyHistory[s.energyHistoryIndex] = instantEnergy
    s.energyHistoryIndex = (s.energyHistoryIndex + 1) % ENERGY_HISTORY_SIZE

    // Compute average energy over the window
    let energySum = 0
    for (let i = 0; i < ENERGY_HISTORY_SIZE; i++) {
      energySum += s.energyHistory[i]
    }
    const avgEnergy = energySum / ENERGY_HISTORY_SIZE

    // Smooth the sustained energy output — slow rise, moderate decay
    const sustainTarget = Math.min(avgEnergy * 2.5, 1.0) // scale up since avg is typically low
    const sustainRate = sustainTarget > s.sustainedEnergy ? 0.015 : 0.025
    s.sustainedEnergy = THREE.MathUtils.lerp(s.sustainedEnergy, sustainTarget, sustainRate)

    // ═══════════════════════════════════════════════════════════════════════
    // BASS TRANSIENT DETECTION
    // Detects sharp increases in bass level to trigger:
    //   - Ripple pulse waves
    //   - Tilt impulses
    //   - Event horizon feed pulses
    // ═══════════════════════════════════════════════════════════════════════
    const bassDelta = bassLevel - s.prevBassLevel
    s.bassTransientCooldown = Math.max(0, s.bassTransientCooldown - clampedDelta)

    // Transient threshold: significant upward jump with cooldown
    const transientThreshold = 0.12
    const isTransient = bassDelta > transientThreshold && s.bassTransientCooldown <= 0 && bassLevel > 0.2

    if (isTransient) {
      const transientStrength = Math.min(bassDelta / 0.5, 1.0) // normalize to 0-1

      // Spawn a ripple pulse
      if (s.ripplePulses.length < MAX_RIPPLE_PULSES) {
        s.ripplePulses.push({
          originPhase: s.accumulatedRipplePhase,
          strength: transientStrength,
          age: 0,
        })
      } else {
        // Replace the oldest pulse
        let oldestIdx = 0
        let oldestAge = 0
        for (let i = 0; i < s.ripplePulses.length; i++) {
          if (s.ripplePulses[i].age > oldestAge) {
            oldestAge = s.ripplePulses[i].age
            oldestIdx = i
          }
        }
        s.ripplePulses[oldestIdx] = {
          originPhase: s.accumulatedRipplePhase,
          strength: transientStrength,
          age: 0,
        }
      }

      // Spawn a tilt impulse — random direction, strength proportional to transient
      const tiltAngle = Math.random() * Math.PI * 2
      s.tiltImpulses.push({
        x: Math.cos(tiltAngle) * transientStrength * 0.06,
        z: Math.sin(tiltAngle) * transientStrength * 0.04,
        age: 0,
        decay: 0.8 + transientStrength * 0.6, // stronger hits decay slower
      })

      // Feed intensity spike
      s.feedIntensity = Math.max(s.feedIntensity, transientStrength)

      // Cooldown to avoid rapid-fire detection
      s.bassTransientCooldown = 0.08
    }

    s.prevBassLevel = bassLevel

    // Age and cull ripple pulses (max lifetime ~4 seconds)
    for (let i = s.ripplePulses.length - 1; i >= 0; i--) {
      s.ripplePulses[i].age += clampedDelta
      // Fade strength over time
      s.ripplePulses[i].strength *= 0.995
      if (s.ripplePulses[i].age > 4.0 || s.ripplePulses[i].strength < 0.01) {
        s.ripplePulses.splice(i, 1)
      }
    }

    // Age and cull tilt impulses
    for (let i = s.tiltImpulses.length - 1; i >= 0; i--) {
      s.tiltImpulses[i].age += clampedDelta
      if (s.tiltImpulses[i].age > s.tiltImpulses[i].decay * 2.5) {
        s.tiltImpulses.splice(i, 1)
      }
    }

    // Decay feed intensity smoothly
    s.feedIntensity = THREE.MathUtils.lerp(s.feedIntensity, 0, 0.04)

    // ═══════════════════════════════════════════════════════════════════════
    // COLOR TEMPERATURE
    // Blends from cool (quiet) to warm (peak) based on combined energy
    // Uses a mix of instant and sustained energy for responsiveness + arc
    // ═══════════════════════════════════════════════════════════════════════
    const tempTarget = Math.min(instantEnergy * 1.5 + s.sustainedEnergy * 0.8, 1.0)
    const tempRate = tempTarget > s.colorTemperature ? 0.025 : 0.012
    s.colorTemperature = THREE.MathUtils.lerp(s.colorTemperature, tempTarget, tempRate)

    // ═══════════════════════════════════════════════════════════════════════
    // RADIAL COMPRESSION & DISK THICKNESS
    // Compression: bass pulls particles inward
    // Thickness: overall energy expands vertical spread
    // ═══════════════════════════════════════════════════════════════════════
    const compressionTarget = s.smoothedBass
    s.radialCompression = THREE.MathUtils.lerp(s.radialCompression, compressionTarget, 0.04)

    const thicknessTarget = Math.min(instantEnergy * 1.8, 1.0)
    s.diskThickness = THREE.MathUtils.lerp(s.diskThickness, thicknessTarget, 0.02)

    // ═══════════════════════════════════════════════════════════════════════
    // ROTATION — dramatic range from ominous crawl to vortex
    // Sustained energy amplifies the ceiling, creating arc awareness
    // ═══════════════════════════════════════════════════════════════════════
    const idleSpeed = 0.04 // Slower idle for ominous feel (was 0.12)
    const bassBurst = Math.pow(s.smoothedBass, 1.6) * 0.8 // Reduced for ominous crawl (was 1.4)
    const midBoost = s.smoothedMid * 0.25 // Gentler mid response (was 0.45)
    const highAccent = Math.pow(s.smoothedHigh, 1.3) * 0.15 // Subtle accent (was 0.3)

    // Sustained energy adds a building momentum — like the vortex gaining power
    const sustainedMomentum = s.sustainedEnergy * 0.3

    // Slow variety wave for natural evolution
    const varietyWave = (Math.sin(time * 0.05) * 0.5 + 0.5) * 0.1

    const targetRotationSpeed = idleSpeed + bassBurst + midBoost + highAccent + sustainedMomentum + varietyWave

    // Asymmetric lerp: fast acceleration on hits, slow deceleration for drama
    const accelRate = targetRotationSpeed > s.smoothedRotationSpeed ? 0.04 : 0.004 // gentler accel (was 0.06), slow decel preserved
    s.smoothedRotationSpeed = THREE.MathUtils.lerp(s.smoothedRotationSpeed, targetRotationSpeed, accelRate)
    s.smoothedRotationSpeed = Math.max(s.smoothedRotationSpeed, 0.03) // Lower floor (was 0.08)

    // Accumulate rotation - always increases, never decreases
    s.accumulatedRotation += s.smoothedRotationSpeed * clampedDelta

    // ═══════════════════════════════════════════════════════════════════════
    // RIPPLE PHASE — propagation speed scales with energy
    // ═══════════════════════════════════════════════════════════════════════
    const rippleBaseSpeed = 0.06 + s.sustainedEnergy * 0.4 // slower propagation (was 0.1 + 0.8)
    const rippleSpeed = rippleBaseSpeed + s.smoothedBass * 1.2 + s.smoothedMid * 0.6
    s.accumulatedRipplePhase += rippleSpeed * clampedDelta

    // ═══════════════════════════════════════════════════════════════════════
    // COLOR PHASE — accelerates significantly with sustained energy
    // ═══════════════════════════════════════════════════════════════════════
    const colorBaseSpeed = 0.02 // Slower idle (was 0.03)
    const colorAudioSpeed = s.smoothedBass * 0.35 + s.smoothedMid * 0.2 + s.smoothedHigh * 0.12
    const colorSustainSpeed = s.sustainedEnergy * 0.5 // gentler sustained color cycling (was 1.2)
    const colorSpeed = colorBaseSpeed + colorAudioSpeed + colorSustainSpeed
    s.accumulatedColorPhase += colorSpeed * clampedDelta

    // ═══════════════════════════════════════════════════════════════════════
    // UPDATE DISK SHADER UNIFORMS
    // ═══════════════════════════════════════════════════════════════════════
    materialRef.current.uniforms.uTime.value = time
    materialRef.current.uniforms.uRotation.value = s.accumulatedRotation
    materialRef.current.uniforms.uPixelRatio.value = state.viewport.dpr
    materialRef.current.uniforms.uBass.value = s.smoothedBass
    materialRef.current.uniforms.uMid.value = s.smoothedMid
    materialRef.current.uniforms.uHigh.value = s.smoothedHigh
    materialRef.current.uniforms.uRipplePhase.value = s.accumulatedRipplePhase
    materialRef.current.uniforms.uColorPhase.value = s.accumulatedColorPhase
    materialRef.current.uniforms.uSustainedEnergy.value = s.sustainedEnergy
    materialRef.current.uniforms.uRadialCompression.value = s.radialCompression
    materialRef.current.uniforms.uDiskThickness.value = s.diskThickness
    materialRef.current.uniforms.uColorTemperature.value = s.colorTemperature
    materialRef.current.uniforms.uDensityScale.value = densityScale

    // Pack ripple pulse data into uniform arrays
    const pulseOrigins = materialRef.current.uniforms.uRipplePulseOrigins.value as Float32Array
    const pulseStrengths = materialRef.current.uniforms.uRipplePulseStrengths.value as Float32Array
    pulseOrigins.fill(0)
    pulseStrengths.fill(0)
    for (let i = 0; i < Math.min(s.ripplePulses.length, MAX_RIPPLE_PULSES); i++) {
      pulseOrigins[i] = s.ripplePulses[i].originPhase
      pulseStrengths[i] = s.ripplePulses[i].strength
    }
    materialRef.current.uniforms.uRipplePulseCount.value = Math.min(s.ripplePulses.length, MAX_RIPPLE_PULSES)

    // ═══════════════════════════════════════════════════════════════════════
    // FLOW PHASE — ring gradient rotation
    // ═══════════════════════════════════════════════════════════════════════
    const baseFlowSpeed = 0.05
    const audioFlowBoost = s.smoothedBass * 0.3 + s.smoothedMid * 0.15 + s.smoothedHigh * 0.08
    s.accumulatedFlowPhase += (baseFlowSpeed + audioFlowBoost) * clampedDelta

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT HORIZON RING UNIFORMS
    // Includes feed intensity for singularity-consuming-energy effect
    // ═══════════════════════════════════════════════════════════════════════
    horizonRef.current.uniforms.uTime.value = time
    horizonRef.current.uniforms.uColorPhase.value = s.accumulatedColorPhase
    horizonRef.current.uniforms.uFlowPhase.value = s.accumulatedFlowPhase
    horizonRef.current.uniforms.uBass.value = s.smoothedBass
    horizonRef.current.uniforms.uMid.value = s.smoothedMid
    horizonRef.current.uniforms.uHigh.value = s.smoothedHigh
    horizonRef.current.uniforms.uSustainedEnergy.value = s.sustainedEnergy
    horizonRef.current.uniforms.uFeedIntensity.value = s.feedIntensity

    // ═══════════════════════════════════════════════════════════════════════
    // TILT — base inclination + bass-impact gravitational wobble
    // Each bass transient spawns a decaying tilt impulse.
    // The disk feels massive: perturbations are brief but elegant.
    // ═══════════════════════════════════════════════════════════════════════
    const baseTilt = Math.PI / 2.2

    // Ambient slow wobble (continuous gentle drift)
    const ambientWobbleX = Math.sin(time * 0.2) * 0.008 * (1 + s.smoothedBass * 0.15)
    const ambientWobbleZ = Math.cos(time * 0.17) * 0.006 * (1 + s.smoothedMid * 0.1)

    // Sum active tilt impulses with exponential decay
    let impulseX = 0
    let impulseZ = 0
    for (const impulse of s.tiltImpulses) {
      // Critically damped decay: fast initial response, elegant settle
      const t = impulse.age / impulse.decay
      const envelope = Math.exp(-3.5 * t) * Math.cos(t * 4.0) // damped oscillation
      impulseX += impulse.x * envelope
      impulseZ += impulse.z * envelope
    }

    pointsRef.current.rotation.x = baseTilt + ambientWobbleX + impulseX
    pointsRef.current.rotation.z = ambientWobbleZ + impulseZ
  })

  return (
    <group>
      {/* The Singularity / Event Horizon (Black Void) */}
      <mesh position={[0, 0, -0.1]}>
        {/* Subtle Glow Shader */}
        <circleGeometry args={[2.9, 64]} />
        <shaderMaterial
          ref={horizonRef}
          args={[EventHorizonShader]}
          transparent={false}
        />
      </mesh>

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[particles.sizes, 1]} />
          <bufferAttribute attach="attributes-aColorIdx" args={[particles.colorIdx, 1]} />
          <bufferAttribute attach="attributes-aRandom" args={[particles.randoms, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          args={[DiskShader]}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
