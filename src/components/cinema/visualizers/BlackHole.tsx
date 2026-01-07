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
    
    attribute float aSize;
    attribute float aColorIdx;
    attribute vec3 aRandom;
    
    varying float vAlpha;
    varying float vRadius;
    varying vec3 vColor;
    varying vec3 vPos;
    varying float vTwinkle;

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

      // Keplerian rotation using accumulated rotation (never goes backward)
      // Inner particles orbit faster than outer ones
      float keplerFactor = 1.0 / sqrt(r);
      float angle = -uRotation * keplerFactor;

      float c = cos(angle);
      float s = sin(angle);
      
      vec3 rotatedPos = vec3(
        pos.x * c - pos.z * s,
        pos.y,
        pos.x * s + pos.z * c
      );

      // Smooth turbulence - balanced for organic movement without grain
      float noise = snoise(pos * 2.0 + vec3(uTime * 0.15));
      float turbulence = noise * (0.03 + uBass * 0.15 + uMid * 0.08);
      rotatedPos.y += turbulence;
      
      // Dynamic audio-reactive ripples propagating outward from center
      // Multiple ripple waves at different speeds for organic feel
      float ripple1 = sin(uRipplePhase * 2.0 - r * 1.2) * 0.5 + 0.5;
      float ripple2 = sin(uRipplePhase * 1.5 - r * 0.8 + 1.5) * 0.5 + 0.5;
      float ripple3 = sin(uRipplePhase * 3.0 - r * 1.8 + 3.0) * 0.5 + 0.5;
      
      // Combine ripples with audio reactivity
      float combinedRipple = ripple1 * uBass + ripple2 * uMid * 0.5 + ripple3 * uHigh * 0.3;
      
      // Apply ripple as vertical displacement - balanced for visible waves without grain
      float rippleStrength = 0.06 + uBass * 0.12;
      rotatedPos.y += combinedRipple * rippleStrength;
      
      // Subtle radial wobble on bass hits - balanced for punch without flicker
      float wobble = sin(uTime * 2.0 + r * 0.5) * uBass * 0.1;
      rotatedPos.xz *= 1.0 + wobble * 0.012 + combinedRipple * 0.005;

      vPos = rotatedPos;

      // Twinkle effect disabled to reduce graininess
      vTwinkle = 0.0;

      vec4 mvPosition = modelViewMatrix * vec4(rotatedPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // HIGH FIDELITY: Stable particle sizes (minimal audio response to prevent glow pulse)
      float sizeBoost = 1.0 + uHigh * 0.1 + uBass * 0.06;  // Subtle size variation only
      float baseSize = 0.45 * aSize * sizeBoost;
      gl_PointSize = baseSize * (380.0 / -mvPosition.z) * uPixelRatio;
      gl_PointSize = clamp(gl_PointSize, 2.5, 45.0);
      
      // ═══════════════════════════════════════════════════════════════════════
      // PURPLE/BLUE/CYAN DOMINANT PALETTE (matching Cosmos)
      // Purple is PRIMARY, no white, magenta as accent only
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

      // Add violet core glow (not white-blue)
      if (r < 4.0) baseColor += violetCore * 0.4;

      // Create smooth cycling with PURPLE PRIMARY (weighted higher)
      float colorCycle = uColorPhase;
      float purpleWeight = pow(sin(colorCycle) * 0.5 + 0.5, 0.5) * 1.4;        // PRIMARY 1.4x
      float cyanWeight = pow(sin(colorCycle + 2.094) * 0.5 + 0.5, 0.6);
      float blueWeight = pow(sin(colorCycle + 3.5) * 0.5 + 0.5, 0.7);
      float magentaAccent = pow(sin(colorCycle + 4.5) * 0.5 + 0.5, 1.2) * uHigh * 0.4; // Accent on highs only

      // Audio-reactive color pumping
      float audioColorBoost = uBass * 0.8 + uMid * 0.5 + uHigh * 0.4;

      // Blend colors with purple dominant
      vec3 shiftBlend = purple * purpleWeight + cyan * cyanWeight + electricBlue * blueWeight + magenta * magentaAccent;
      float totalWeight = purpleWeight + cyanWeight + blueWeight + magentaAccent + 0.001;
      shiftBlend = shiftBlend / totalWeight;

      // Bass pumps purple/indigo, mid pumps electric blue (subtle to reduce glow pulse)
      vec3 audioPump = indigo * uBass * 0.2 + electricBlue * uMid * 0.15;

      // Apply color shift across entire disk - stable base
      float shiftStrength = 0.7 + smoothstep(3.0, 7.0, r) * 0.3;
      shiftStrength *= (0.7 + audioColorBoost * 0.3);  // Reduced audio response

      vec3 finalColor = baseColor * 0.55 + shiftBlend * shiftStrength + audioPump;

      // SATURATION BOOST (1.35x like Cosmos)
      float luma = dot(finalColor, vec3(0.299, 0.587, 0.114));
      finalColor = mix(vec3(luma), finalColor, 1.35);

      vColor = finalColor;
      
      float edgeFade = 1.0 - smoothstep(9.5, 11.0, r);
      float holeFade = smoothstep(2.8, 3.2, r);
      // Let particles fade naturally without alpha floor to prevent grainy stacking
      vAlpha = edgeFade * holeFade;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying vec3 vColor;
    varying float vTwinkle;

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

      vec3 color = vColor * 1.35;
      color = mix(color, color * 1.15, vTwinkle);

      // Core brightening
      color *= 1.0 + core * 0.3;

      // Clamp color to prevent hot spots
      color = clamp(color, vec3(0.0), vec3(1.5));

      float finalAlpha = vAlpha * strength;
      // HIGH threshold for crisp particles
      if (finalAlpha < 0.22) discard;

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
      float audioWaves = 1.0 + bassWave * 1.0 + midWave * 0.7 + highWave * 0.5;
      
      // Audio also intensifies the gradient colors - STRONGER COLOR BOOSTS
      vec3 bassBoost = cyan * bassWave * 0.8;
      vec3 midBoost = purple * midWave * 0.6;
      vec3 highBoost = magenta * highWave * 0.7;
      
      gradientColor += bassBoost + midBoost + highBoost;
      
      // Base intensity - stable without audio, responsive with audio
      // Removed idle breathing (sin(uTime)) to prevent glow pulse without audio
      float bassPulse = 1.0 + uBass * 0.5;
      float intensity = (0.85 + uBass * 0.4 + uMid * 0.25) * bassPulse * audioWaves;
      
      // Apply glow and intensity
      vec3 finalColor = gradientColor * glow * intensity * 2.0;
      
      // Ensure vibrant colors even at rest (minimum brightness)
      finalColor = max(finalColor, gradientColor * glow * 0.6);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
}

// Instance-scoped state interface (prevents module-level pollution and HMR bugs)
interface BlackHoleState {
  accumulatedRotation: number
  accumulatedRipplePhase: number
  accumulatedColorPhase: number
  accumulatedFlowPhase: number
  smoothedRotationSpeed: number
  smoothedBass: number
  smoothedMid: number
  smoothedHigh: number
}

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

  useFrame((state, delta) => {
    if (!materialRef.current || !horizonRef.current || !pointsRef.current) return

    const time = state.clock.elapsedTime
    const clampedDelta = Math.min(delta, 0.1)
    const s = stateRef.current

    // Smooth audio levels with power curves for punch
    s.smoothedBass = THREE.MathUtils.lerp(s.smoothedBass, Math.pow(bassLevel, 1.5), 0.04)
    s.smoothedMid = THREE.MathUtils.lerp(s.smoothedMid, midLevel, 0.03)
    s.smoothedHigh = THREE.MathUtils.lerp(s.smoothedHigh, Math.pow(highLevel, 1.2), 0.045)

    // Rotation speed: dramatic range from slow idle to fast on hits
    const idleSpeed = 0.12
    const bassBurst = Math.pow(s.smoothedBass, 1.8) * 0.9
    const midBoost = s.smoothedMid * 0.35
    const highAccent = Math.pow(s.smoothedHigh, 1.3) * 0.25

    // Slow variety wave for natural evolution
    const varietyWave = (Math.sin(time * 0.05) * 0.5 + 0.5) * 0.15

    const targetRotationSpeed = idleSpeed + bassBurst + midBoost + highAccent + varietyWave

    // Asymmetric lerp: fast acceleration on hits, slow deceleration for drama
    const accelRate = targetRotationSpeed > s.smoothedRotationSpeed ? 0.045 : 0.006
    s.smoothedRotationSpeed = THREE.MathUtils.lerp(s.smoothedRotationSpeed, targetRotationSpeed, accelRate)
    s.smoothedRotationSpeed = Math.max(s.smoothedRotationSpeed, 0.08)

    // Accumulate rotation - always increases, never decreases
    s.accumulatedRotation += s.smoothedRotationSpeed * clampedDelta

    // Ripple phase - propagates outward continuously, speed tied to audio
    // Ripple phase - very slow at idle to prevent glow pulse
    const rippleSpeed = 0.15 + s.smoothedBass * 2.0 + s.smoothedMid * 1.0
    s.accumulatedRipplePhase += rippleSpeed * clampedDelta

    // Color phase - very slow at idle (fast cycling causes brightness variation)
    const colorSpeed = 0.05 + s.smoothedBass * 0.8 + s.smoothedMid * 0.4 + s.smoothedHigh * 0.25
    s.accumulatedColorPhase += colorSpeed * clampedDelta

    // Update shader uniforms
    materialRef.current.uniforms.uTime.value = time
    materialRef.current.uniforms.uRotation.value = s.accumulatedRotation
    materialRef.current.uniforms.uPixelRatio.value = state.viewport.dpr
    materialRef.current.uniforms.uBass.value = s.smoothedBass
    materialRef.current.uniforms.uMid.value = s.smoothedMid
    materialRef.current.uniforms.uHigh.value = s.smoothedHigh
    materialRef.current.uniforms.uRipplePhase.value = s.accumulatedRipplePhase
    materialRef.current.uniforms.uColorPhase.value = s.accumulatedColorPhase

    // Flow phase for ring gradient rotation - very slow at idle to prevent glow pulse
    const baseFlowSpeed = 0.05
    const audioFlowBoost = s.smoothedBass * 0.6 + s.smoothedMid * 0.3 + s.smoothedHigh * 0.15
    s.accumulatedFlowPhase += (baseFlowSpeed + audioFlowBoost) * clampedDelta

    // Horizon ring uniforms - synced color evolution with disk
    horizonRef.current.uniforms.uTime.value = time
    horizonRef.current.uniforms.uColorPhase.value = s.accumulatedColorPhase
    horizonRef.current.uniforms.uFlowPhase.value = s.accumulatedFlowPhase
    horizonRef.current.uniforms.uBass.value = s.smoothedBass
    horizonRef.current.uniforms.uMid.value = s.smoothedMid
    horizonRef.current.uniforms.uHigh.value = s.smoothedHigh

    // Apply tilt with subtle audio-reactive wobble
    const baseTilt = Math.PI / 2.2
    const wobbleX = Math.sin(time * 0.3) * 0.02 * (1 + s.smoothedBass * 0.5)
    const wobbleZ = Math.cos(time * 0.25) * 0.015 * (1 + s.smoothedMid * 0.3)
    pointsRef.current.rotation.x = baseTilt + wobbleX
    pointsRef.current.rotation.z = wobbleZ
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
