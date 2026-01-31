"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { VISUALIZER_SRGB } from "@/lib/color/visualizer-palette"

interface CosmosProps {
  bassLevel: number
  midLevel: number
  highLevel: number
  /** When true, uses reduced particle counts for smoother rendering. */
  performanceMode?: boolean
}

// Seeded random for reproducible particle distribution
function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

const HIGH_PARTICLE_COUNT = 18000
const LOW_PARTICLE_COUNT = 10000

function generateCosmosData(particleCount: number) {
  const positions = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const randoms = new Float32Array(particleCount * 3)
  const armIndex = new Float32Array(particleCount) // Which spiral arm
  const random = seededRandom(42)

  const NUM_ARMS = 4 // More spiral arms for fuller coverage

  for (let i = 0; i < particleCount; i++) {
    // Distribution: core, spiral arms, and outer halo
    const roll = random()
    const isCore = roll < 0.2
    const isHalo = roll > 0.85 // Outer diffuse particles
    const arm = isCore || isHalo ? -1 : Math.floor(random() * NUM_ARMS)

    const t = random()
    let radius: number
    let angle: number

    if (isCore) {
      // Core particles - dense bright center, concentrated for spherical prominence
      radius = t * t * 2.5 + 0.15
      angle = random() * Math.PI * 2
    } else if (isHalo) {
      // Halo particles - diffuse outer glow, extended reach to fill viewport
      radius = 9.0 + t * 10.0 // 9 to 19
      angle = random() * Math.PI * 2
    } else {
      // Spiral arm particles - extended reach
      radius = 1.2 + t * t * 11.0 // 1.2 to 12.2
      const armAngle = (arm / NUM_ARMS) * Math.PI * 2
      const spiralTwist = radius * 0.35
      angle = armAngle + spiralTwist + (random() - 0.5) * 0.7
    }

    // Flattened disk with thickness variation — core is more spherical for prominence
    // Halo has more vertical spread to fill upper/lower screen areas
    const heightSpread = isCore ? 1.4 : isHalo ? 1.5 : 0.2 * (1 + radius * 0.04)
    const y = (random() - 0.5) * heightSpread

    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    // Size variation - core larger for spherical prominence, halo softer
    if (isCore) {
      sizes[i] = 0.6 + random() * 0.7
    } else if (isHalo) {
      sizes[i] = 0.4 + random() * 0.5
    } else {
      sizes[i] = 0.4 + random() * 0.5
    }

    // Store arm index for color mapping
    armIndex[i] = isCore ? 0.33 : isHalo ? random() : (arm + random() * 0.3) / NUM_ARMS

    randoms[i * 3] = random()
    randoms[i * 3 + 1] = random()
    randoms[i * 3 + 2] = random()
  }

  return { positions, sizes, randoms, armIndex }
}

const HIGH_COSMOS_DATA = generateCosmosData(HIGH_PARTICLE_COUNT)
const LOW_COSMOS_DATA = generateCosmosData(LOW_PARTICLE_COUNT)

// Vibrant cosmic nebula shader
const CosmosShader = {
  uniforms: {
    uTime: { value: 0 },
    uRotation: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uColorPhase: { value: 0 },
    uPulsePhase: { value: 0 },
    uPixelRatio: { value: 1.0 },
    // New uniforms for enhanced audio reactivity
    uEnergyHistory: { value: 0 },   // Slow-moving sustained energy (0-1)
    uBassImpact: { value: 0 },      // Fast-attack bass transient detector
    uTurbulenceLevel: { value: 0 }, // Dynamic turbulence intensity
    uDensityScale: { value: 1.0 },   // Compensate additive brightness when HIGH particle count
  },
  vertexShader: `
    uniform float uTime;
    uniform float uRotation;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uColorPhase;
    uniform float uPulsePhase;
    uniform float uPixelRatio;
    uniform float uEnergyHistory;
    uniform float uBassImpact;
    uniform float uTurbulenceLevel;
    uniform float uDensityScale;

    attribute float aSize;
    attribute vec3 aRandom;
    attribute float aArmIndex;

    varying float vAlpha;
    varying float vRadius;
    varying vec3 vColor;
    varying float vGlow;

    // Simplex noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vec3 pos = position;
      float r = length(pos.xz);
      vRadius = r;

      // === ROTATION: Enhanced Keplerian differential with bass-driven acceleration ===
      // Inner particles respond more dramatically to bass — galaxy stirred by energy
      // Bass impact creates stronger differential: inner arms whip faster on hits
      float keplerian = 1.0 / sqrt(max(r, 0.5));
      // Bass impact amplifies the differential — inner particles accelerate harder
      float bassKick = 1.0 + uBassImpact * 2.5 * keplerian;
      float rotSpeed = keplerian * bassKick;
      float angle = uRotation * rotSpeed;
      float c = cos(angle);
      float s = sin(angle);
      vec3 rotatedPos = vec3(
        pos.x * c - pos.z * s,
        pos.y,
        pos.x * s + pos.z * c
      );

      // Outer-edge attenuation: sparse outer particles get reduced displacement
      // to prevent flicker. Extended to match wider halo.
      float outerFade = 1.0 - smoothstep(12.0, 18.0, r);

      // === BREATHING: Multi-layered radial expansion waves ===
      // Layer 1: Bass creates radial expansion waves propagating outward
      // The wave travels from center outward — like a shockwave through the galaxy
      float bassWaveSpeed = 2.5;
      float bassWaveWidth = 0.8; // Wider waves for smoother look
      float bassWave1 = sin(uPulsePhase * bassWaveSpeed - r * bassWaveWidth) * 0.5 + 0.5;
      float bassWave2 = sin(uPulsePhase * bassWaveSpeed * 0.6 - r * bassWaveWidth * 1.3 + 1.0) * 0.5 + 0.5;
      // Outer particles get the wave later — creates propagation feel
      float radialExpansion = 1.0 + (bassWave1 * uBass * 0.16 + bassWave2 * uBass * 0.07) * outerFade;

      // Layer 2: Mid-frequency gentle breathing — slower, more global
      float midBreath = sin(uPulsePhase * 0.8 - r * 0.2) * 0.5 + 0.5;
      radialExpansion += midBreath * uMid * 0.04 * outerFade;

      // Energy history adds a slow, sustained expansion during loud passages
      radialExpansion += uEnergyHistory * 0.03 * outerFade;

      rotatedPos.xz *= radialExpansion;

      // === VERTICAL WAVES: Mid frequencies create undulating waves through the disk ===
      // Primary vertical wave — mid-driven, propagates through disk angle
      float diskAngle = atan(rotatedPos.z, rotatedPos.x);
      float vertWave1 = sin(uPulsePhase * 0.7 - r * 0.3 + aRandom.x * 3.0) * 0.14;
      // Secondary wave at different frequency — creates interference pattern
      float vertWave2 = sin(uPulsePhase * 1.1 - r * 0.45 + diskAngle * 2.0) * 0.07;
      // Tertiary wave — angular, creates ripples across spiral arms
      float vertWave3 = sin(uPulsePhase * 0.5 + diskAngle * 3.0 - r * 0.15) * 0.05;
      rotatedPos.y += (vertWave1 * uMid + vertWave2 * uMid * 0.7 + vertWave3 * uBass * 0.5) * outerFade;

      // Bass creates a global "heave" — the whole disk lifts and settles
      float bassHeave = sin(uPulsePhase * 0.4) * uBass * 0.03;
      rotatedPos.y += bassHeave * outerFade;

      // === HIGH-FREQUENCY JITTER: Individual particle sparkle ===
      // Each particle gets tiny random displacement proportional to high frequencies
      // Uses per-particle random seeds for unique motion
      // Attenuated at edges to prevent sparse-particle flicker
      float jitterAmount = uHigh * 0.05 * outerFade;
      float jitterX = sin(uTime * 5.0 * aRandom.x + aRandom.y * 100.0) * jitterAmount;
      float jitterY = sin(uTime * 7.0 * aRandom.y + aRandom.z * 100.0) * jitterAmount * 0.6;
      float jitterZ = sin(uTime * 6.0 * aRandom.z + aRandom.x * 100.0) * jitterAmount;
      rotatedPos += vec3(jitterX, jitterY, jitterZ);

      // === TURBULENCE: Dynamic — settled elegance vs heated gas ===
      // Base turbulence is calm; energy history and audio levels heat it up
      float noise1 = snoise(pos * 0.15 + vec3(uTime * 0.06));
      float noise2 = snoise(pos * 0.3 + vec3(uTime * 0.1, 0.0, uTime * 0.08));
      // Low energy: gentle flow. High energy: particles feel alive, like heated gas
      float turbBase = 0.06;
      float turbAudio = uTurbulenceLevel * 0.25;
      float turbEnergy = uEnergyHistory * 0.08;
      float audioTurb = turbBase + turbAudio + turbEnergy;
      // Primary turbulence — radial displacement (attenuated at edges)
      rotatedPos += normalize(vec3(pos.x, 0.0, pos.z) + 0.001) * noise1 * audioTurb * outerFade;
      // Secondary turbulence — adds vertical chaos during high energy
      rotatedPos.y += noise2 * audioTurb * 0.4 * outerFade;

      vec4 mvPosition = modelViewMatrix * vec4(rotatedPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // HIGH FIDELITY: Stable particle sizes (minimal audio response to prevent glow pulse)
      float sizeBoost = 1.0 + uHigh * 0.06 + uBass * 0.04;
      float baseSize = 0.6 * aSize * sizeBoost;
      gl_PointSize = baseSize * (350.0 / -mvPosition.z) * uPixelRatio;
      gl_PointSize = clamp(gl_PointSize, 2.0, 50.0);

      // === PURPLE/BLUE/CYAN DOMINANT COLOR SYSTEM ===
      // MetaDJ palette - purple dominant
      vec3 purple = vec3(${VISUALIZER_SRGB.purple});      // #8B5CF6 - PRIMARY
      vec3 indigo = vec3(${VISUALIZER_SRGB.indigo});      // #A855F7
      vec3 cyan = vec3(${VISUALIZER_SRGB.cyan});          // #06B6D4
      vec3 magenta = vec3(${VISUALIZER_SRGB.magenta});    // #D946EF - accent only
      vec3 deepBlue = vec3(0.15, 0.25, 0.85);                    // Deep cosmic blue
      vec3 electricBlue = vec3(0.2, 0.4, 1.0);                   // Electric blue
      vec3 violetCore = vec3(0.6, 0.4, 1.0);                     // Bright violet for core

      // Core glow - purple/cyan center (no white!)
      vec3 coreColor = mix(violetCore, cyan, 0.35);

      // Nebula regions based on angle and arm
      float theta = atan(pos.z, pos.x);
      float nebulaPhase = theta + uColorPhase * 0.3 + aArmIndex * 6.28;

      // Create flowing color regions - PURPLE DOMINANT
      float region1 = pow(sin(nebulaPhase) * 0.5 + 0.5, 1.2);        // Purple region
      float region2 = pow(sin(nebulaPhase + 2.094) * 0.5 + 0.5, 1.5); // Cyan region
      float region3 = pow(sin(nebulaPhase + 4.189) * 0.5 + 0.5, 2.0); // Blue region
      float region4 = pow(sin(nebulaPhase + 1.0) * 0.5 + 0.5, 2.5);   // Magenta (subtle)

      // Blend nebula colors - purple/indigo dominant, then cyan/blue, magenta accent
      vec3 nebulaColor = purple * region1 * 1.4        // Purple strongest
                       + indigo * region1 * 0.6        // Indigo support
                       + cyan * region2 * 0.9          // Cyan secondary
                       + deepBlue * region3 * 0.7      // Deep blue for depth
                       + magenta * region4 * 0.3;      // Magenta subtle accent
      nebulaColor = normalize(nebulaColor + 0.001) * length(nebulaColor) * 0.85;

      // Radial color gradient - purple core to blue/cyan edges
      float radialT = smoothstep(0.0, 10.0, r);
      vec3 baseColor = mix(coreColor, nebulaColor, radialT);

      // Add deep blue in outer regions for cosmic depth
      float outerRegion = smoothstep(6.0, 12.0, r);
      baseColor = mix(baseColor, mix(baseColor, deepBlue, 0.3), outerRegion);

      // Core brightness boost - purple/cyan, no white (smooth falloff, no hard threshold)
      float coreGlow = 1.0 - smoothstep(0.0, 3.5, r);
      baseColor += violetCore * coreGlow * 0.4;
      baseColor += cyan * coreGlow * 0.25;
      baseColor += purple * coreGlow * 0.3;

      // === ENERGY-DRIVEN COLOR EVOLUTION ===
      // audioEnergy for immediate response, energyHistory for sustained mood
      float audioEnergy = uBass * 0.4 + uMid * 0.2 + uHigh * 0.15;

      // Quiet passages: shift toward deeper, cooler tones (blue/indigo)
      // Building energy: shift toward warmer purple/magenta
      // Peak energy: cyan/electric highlights intensify
      float quietness = 1.0 - smoothstep(0.0, 0.3, uEnergyHistory);
      float building = smoothstep(0.2, 0.6, uEnergyHistory) * (1.0 - smoothstep(0.6, 1.0, uEnergyHistory));
      float peaking = smoothstep(0.5, 0.9, uEnergyHistory);

      // Cool shift during quiet passages — deeper indigo/blue tones
      baseColor = mix(baseColor, mix(baseColor, deepBlue, 0.25), quietness);
      baseColor = mix(baseColor, mix(baseColor, vec3(0.12, 0.15, 0.6), 0.15), quietness);

      // Warm shift during buildups — purple/magenta warmth
      vec3 buildColor = mix(purple, magenta, 0.35);
      baseColor = mix(baseColor, mix(baseColor, buildColor, 0.2), building);

      // Electric highlights at peak — cyan intensifies
      baseColor = mix(baseColor, mix(baseColor, cyan, 0.2), peaking * uHigh);
      baseColor = mix(baseColor, mix(baseColor, electricBlue, 0.15), peaking);

      // Create audio-reactive accent colors (blended, not added)
      vec3 bassAccent = mix(purple, indigo, 0.4);    // Purple/indigo for bass
      vec3 midAccent = mix(deepBlue, purple, 0.5);   // Deep blue/purple for mids
      vec3 highAccent = mix(cyan, magenta, 0.2);     // Cyan with magenta hint for highs

      // Blend accents INTO base color — stronger response at high energy
      float accentBoost = 1.0 + uEnergyHistory * 0.25;
      baseColor = mix(baseColor, bassAccent, uBass * 0.08 * accentBoost);
      baseColor = mix(baseColor, midAccent, uMid * 0.06 * accentBoost);
      baseColor = mix(baseColor, highAccent, uHigh * 0.05 * accentBoost);

      // Cycling color overlay - speed accelerates with energy
      float cycle = uColorPhase + r * 0.1 + aArmIndex * 3.0;
      float cyc1 = pow(sin(cycle) * 0.5 + 0.5, 0.7);         // Purple
      float cyc2 = pow(sin(cycle + 2.094) * 0.5 + 0.5, 0.9); // Cyan
      float cyc3 = pow(sin(cycle + 4.189) * 0.5 + 0.5, 1.5); // Indigo
      float cyc4 = pow(sin(cycle + 3.14) * 0.5 + 0.5, 2.0);  // Magenta (subtle)
      vec3 cycleColor = normalize(purple * cyc1 + cyan * cyc2 * 0.7 + indigo * cyc3 * 0.5 + magenta * cyc4 * 0.2 + 0.001);
      // Blend cycling color — stronger when audio active, accelerated by energy
      float cycleStrength = 0.05 + audioEnergy * 0.08 + uEnergyHistory * 0.03;
      baseColor = mix(baseColor, cycleColor, cycleStrength);

      // Brightness boost - subtle, preserves color (no audio multiplier to prevent washout)
      baseColor *= 1.12;

      // STRONG saturation push - counteract any desaturation from blending
      float luminance = dot(baseColor, vec3(0.299, 0.587, 0.114));
      baseColor = mix(vec3(luminance), baseColor, 1.6);  // Increased from 1.4

      vColor = baseColor;

      // Stable glow factor - minimal pulsing to prevent bloom flicker
      vGlow = 1.0;

      // Alpha falloff - extended to match wider halo reach
      float edgeFade = 1.0 - smoothstep(14.0, 19.5, r);
      // Gentler center fade — keeps core bright for spherical prominence
      float centerFade = smoothstep(0.05, 0.4, r);
      vAlpha = edgeFade * mix(centerFade, 1.0, 0.5);
      vAlpha *= uDensityScale;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying float vRadius;
    varying vec3 vColor;
    varying float vGlow;

    void main() {
      vec2 uv = gl_PointCoord.xy - 0.5;
      float d = length(uv);

      // Sharp circular cutoff
      if (d > 0.45) discard;

      // Sharp core with controlled glow — reduced spark to prevent bloom flicker
      float core = 1.0 - smoothstep(0.0, 0.08, d);  // Slightly wider core
      float spark = 1.0 - smoothstep(0.0, 0.03, d); // Subtle core spark
      float inner = 1.0 - smoothstep(0.0, 0.15, d); // Inner glow
      float outer = 1.0 - smoothstep(0.0, 0.45, d); // Outer edge

      // Sharper falloff curve for defined particles
      inner = pow(inner, 2.0);
      outer = pow(outer, 3.0);

      float strength = spark * 0.8 + core * 1.2 + inner * 0.6 + outer * 0.2;
      strength *= vGlow;

      vec3 color = vColor;

      // Core brightening for definition
      color *= 1.0 + core * 0.2;

      // Boost vibrancy
      color *= 1.15;

      // Subtle core highlight (toned down to prevent flicker)
      color = mix(color, vec3(1.0), spark * 0.12);

      // Tighter clamp to prevent bloom-amplified hot spots
      color = clamp(color, vec3(0.0), vec3(1.15));

      float finalAlpha = vAlpha * strength;

      // HIGHER threshold for crisp particles (removes fuzzy ones)
      // Dynamic threshold: higher for smaller particles to keep them sharp
      if (finalAlpha < 0.14) discard;

      gl_FragColor = vec4(color, finalAlpha);
    }
  `
}

// State interface
interface CosmosState {
  accumulatedRotation: number
  accumulatedColorPhase: number
  accumulatedPulsePhase: number
  smoothedRotationSpeed: number
  smoothedBass: number
  smoothedMid: number
  smoothedHigh: number
  // Enhanced audio reactivity state
  energyHistory: number       // Slow-moving sustained energy (2-3 second window)
  bassImpact: number          // Fast-attack transient for bass hits
  prevBassLevel: number       // Previous frame bass for transient detection
  turbulenceLevel: number     // Dynamic turbulence intensity
  tiltImpactX: number         // Bass-driven rotational punch (X axis)
  tiltImpactZ: number         // Bass-driven rotational punch (Z axis)
}

function createInitialCosmosState(): CosmosState {
  return {
    accumulatedRotation: 0,
    accumulatedColorPhase: 0,
    accumulatedPulsePhase: 0,
    smoothedRotationSpeed: 0.12,
    smoothedBass: 0,
    smoothedMid: 0,
    smoothedHigh: 0,
    energyHistory: 0,
    bassImpact: 0,
    prevBassLevel: 0,
    turbulenceLevel: 0,
    tiltImpactX: 0,
    tiltImpactZ: 0,
  }
}

export function Cosmos({ bassLevel, midLevel, highLevel, performanceMode = false }: CosmosProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const stateRef = useRef<CosmosState>(createInitialCosmosState())

  const particles = useMemo(
    () => (performanceMode ? LOW_COSMOS_DATA : HIGH_COSMOS_DATA),
    [performanceMode],
  )

  const densityScale = performanceMode ? 1.0 : Math.sqrt(LOW_PARTICLE_COUNT / HIGH_PARTICLE_COUNT)

  useFrame((state, delta) => {
    if (!materialRef.current || !pointsRef.current) return

    const time = state.clock.elapsedTime
    const clampedDelta = Math.min(delta, 0.1)
    const s = stateRef.current

    // === AUDIO SMOOTHING: Fast attack, slow release for musical dynamics ===
    // Bass: fast attack (0.06) for punch on hits, very slow release (0.008) for drama
    const bassTarget = Math.pow(bassLevel, 1.4)
    const bassRate = bassTarget > s.smoothedBass ? 0.06 : 0.008
    s.smoothedBass = THREE.MathUtils.lerp(s.smoothedBass, bassTarget, bassRate)

    // Mids: slightly softer attack (0.05), slow release (0.008) — melodic flow
    const midTarget = midLevel
    const midRate = midTarget > s.smoothedMid ? 0.05 : 0.008
    s.smoothedMid = THREE.MathUtils.lerp(s.smoothedMid, midTarget, midRate)

    // Highs: fast attack (0.06) for crisp response, moderate release (0.015)
    const highTarget = Math.pow(highLevel, 1.2)
    const highRate = highTarget > s.smoothedHigh ? 0.06 : 0.015
    s.smoothedHigh = THREE.MathUtils.lerp(s.smoothedHigh, highTarget, highRate)

    // === ENERGY ACCUMULATION: Musical arc over 2-3 seconds ===
    // Tracks sustained energy — brief hits barely register, sustained passages build up
    // This creates the "musical story" — quiet intro vs sustained drop feel totally different
    const instantEnergy = s.smoothedBass * 0.5 + s.smoothedMid * 0.3 + s.smoothedHigh * 0.2
    // Very slow attack (0.006 = ~2.5 second ramp), ultra-slow release (0.003 = ~5 second decay)
    const energyRate = instantEnergy > s.energyHistory ? 0.006 : 0.003
    s.energyHistory = THREE.MathUtils.lerp(s.energyHistory, instantEnergy, energyRate)
    s.energyHistory = Math.min(s.energyHistory, 1.0) // Clamp

    // === BASS IMPACT: Transient detection for hits ===
    // Detects sudden bass increases — the "punch" of a kick drum or drop
    const bassDelta = Math.max(0, bassLevel - s.prevBassLevel)
    const bassTransient = Math.pow(bassDelta, 0.6)
    const impactRate = bassTransient > s.bassImpact ? 0.08 : 0.008
    s.bassImpact = THREE.MathUtils.lerp(s.bassImpact, bassTransient, impactRate)
    s.prevBassLevel = bassLevel

    // === TURBULENCE: Tracks combined audio activity for particle turbulence ===
    const turbTarget = s.smoothedBass * 0.5 + s.smoothedMid * 0.35 + s.smoothedHigh * 0.15
    const turbRate = turbTarget > s.turbulenceLevel ? 0.08 : 0.01
    s.turbulenceLevel = THREE.MathUtils.lerp(s.turbulenceLevel, turbTarget, turbRate)

    // === ROTATION: Wider dynamic range, more dramatic contrast ===
    const idleSpeed = 0.08 // Lower idle — quiet passages feel more still
    // Bass burst now uses squared smoothedBass for more explosive response at peaks
    const bassBurst = Math.pow(s.smoothedBass, 1.6) * 0.7
    const midBoost = s.smoothedMid * 0.25
    const highAccent = s.smoothedHigh * 0.12
    // Energy history adds a sustained baseline during loud passages
    const energyBaseline = s.energyHistory * 0.3
    const varietyWave = (Math.sin(time * 0.035) * 0.5 + 0.5) * 0.08

    const targetRotationSpeed = idleSpeed + bassBurst + midBoost + highAccent + energyBaseline + varietyWave

    // Faster acceleration on hits (0.10), much slower deceleration (0.003) — spinning top drama
    const accelRate = targetRotationSpeed > s.smoothedRotationSpeed ? 0.06 : 0.003
    s.smoothedRotationSpeed = THREE.MathUtils.lerp(s.smoothedRotationSpeed, targetRotationSpeed, accelRate)
    s.smoothedRotationSpeed = Math.max(s.smoothedRotationSpeed, 0.06) // Lower minimum for quieter idle

    s.accumulatedRotation += s.smoothedRotationSpeed * clampedDelta

    // === PULSE PHASE: Drives radial wave propagation in shader ===
    const pulseSpeed = 0.08 + s.smoothedBass * 1.2 + s.smoothedMid * 0.6 + s.bassImpact * 1.5
    s.accumulatedPulsePhase += pulseSpeed * clampedDelta

    // === COLOR PHASE: Accelerates dramatically with energy ===
    // Quiet: barely moves (0.03). Peak energy: races (1.5+). Creates dramatic color evolution.
    const colorSpeed = 0.02 + s.smoothedBass * 0.35 + s.smoothedMid * 0.2 + s.smoothedHigh * 0.15 + s.energyHistory * 0.25
    s.accumulatedColorPhase += colorSpeed * clampedDelta

    // === UPDATE UNIFORMS ===
    materialRef.current.uniforms.uTime.value = time
    materialRef.current.uniforms.uRotation.value = s.accumulatedRotation
    materialRef.current.uniforms.uPixelRatio.value = state.viewport.dpr
    materialRef.current.uniforms.uBass.value = s.smoothedBass
    materialRef.current.uniforms.uMid.value = s.smoothedMid
    materialRef.current.uniforms.uHigh.value = s.smoothedHigh
    materialRef.current.uniforms.uColorPhase.value = s.accumulatedColorPhase
    materialRef.current.uniforms.uPulsePhase.value = s.accumulatedPulsePhase
    materialRef.current.uniforms.uEnergyHistory.value = s.energyHistory
    materialRef.current.uniforms.uBassImpact.value = s.bassImpact
    materialRef.current.uniforms.uTurbulenceLevel.value = s.turbulenceLevel
    materialRef.current.uniforms.uDensityScale.value = densityScale

    // === TILT: Bass impact creates camera-like rotational punch ===
    // Each bass hit imparts a small rotational impulse that decays slowly
    // Direction varies with time so consecutive hits don't always push the same way
    const impactDirection = Math.sin(time * 0.7)
    const impactDirectionZ = Math.cos(time * 0.9)
    // Fast attack on impact, slow exponential decay (0.004) — like a physical system settling
    s.tiltImpactX = THREE.MathUtils.lerp(s.tiltImpactX, s.bassImpact * impactDirection * 0.04, 0.06)
    s.tiltImpactX *= (1.0 - 0.004)
    s.tiltImpactZ = THREE.MathUtils.lerp(s.tiltImpactZ, s.bassImpact * impactDirectionZ * 0.03, 0.06)
    s.tiltImpactZ *= (1.0 - 0.004)

    // Base tilt (gentle ambient sway) + impact tilt (bass punches) + energy sway (more at high energy)
    const ambientSwayScale = 1 + s.energyHistory * 0.2
    const tiltX = Math.PI * 0.15
      + Math.sin(time * 0.15) * 0.025 * ambientSwayScale
      + s.tiltImpactX
    const tiltZ = Math.cos(time * 0.12) * 0.018 * ambientSwayScale
      + s.tiltImpactZ
    pointsRef.current.rotation.x = tiltX
    pointsRef.current.rotation.z = tiltZ
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[particles.sizes, 1]} />
        <bufferAttribute attach="attributes-aRandom" args={[particles.randoms, 3]} />
        <bufferAttribute attach="attributes-aArmIndex" args={[particles.armIndex, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        args={[CosmosShader]}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
