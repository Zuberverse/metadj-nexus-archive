"use client"

import { useMemo, useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { VISUALIZER_COLORS, VISUALIZER_SRGB } from "@/lib/color/visualizer-palette"

interface SpaceTravelProps {
  bassLevel: number
  midLevel: number
  highLevel: number
  /** When true, uses reduced star/nebula counts for smoother rendering. */
  performanceMode?: boolean
}

function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

const HIGH_STAR_COUNT = 20000
const LOW_STAR_COUNT = 10000
const HIGH_NEBULA_COUNT = 5000
const LOW_NEBULA_COUNT = 2500

function generateStarField(starCount: number) {
  const positions = new Float32Array(starCount * 3)
  const sizes = new Float32Array(starCount)
  const colors = new Float32Array(starCount)
  const twinklePhase = new Float32Array(starCount)
  const twinkleSpeed = new Float32Array(starCount)
  const layer = new Float32Array(starCount)
  const random = seededRandom(42)

  for (let i = 0; i < starCount; i++) {
    const angle = random() * Math.PI * 2
    const radiusBase = random() * random()
    const radius = 3 + radiusBase * 80
    const z = (random() - 0.5) * 300

    positions[i * 3] = Math.cos(angle) * radius + (random() - 0.5) * 5
    positions[i * 3 + 1] = Math.sin(angle) * radius + (random() - 0.5) * 5
    positions[i * 3 + 2] = z

    sizes[i] = random() * 2.2 + 0.4
    colors[i] = random()
    twinklePhase[i] = random() * Math.PI * 2
    twinkleSpeed[i] = 1.5 + random() * 2.5
    layer[i] = Math.floor(random() * 3)
  }

  return { positions, sizes, colors, twinklePhase, twinkleSpeed, layer }
}

function generateNebulaClouds(nebulaCount: number) {
  const positions = new Float32Array(nebulaCount * 3)
  const sizes = new Float32Array(nebulaCount)
  const colors = new Float32Array(nebulaCount)
  const random = seededRandom(1337)

  for (let i = 0; i < nebulaCount; i++) {
    const angle = random() * Math.PI * 2
    const radius = 10 + random() * 60
    const z = (random() - 0.5) * 280

    positions[i * 3] = Math.cos(angle) * radius + (random() - 0.5) * 20
    positions[i * 3 + 1] = Math.sin(angle) * radius + (random() - 0.5) * 20
    positions[i * 3 + 2] = z

    sizes[i] = 12 + random() * 35
    colors[i] = random()
  }

  return { positions, sizes, colors }
}

const HIGH_STAR_DATA = generateStarField(HIGH_STAR_COUNT)
const LOW_STAR_DATA = generateStarField(LOW_STAR_COUNT)
const HIGH_NEBULA_DATA = generateNebulaClouds(HIGH_NEBULA_COUNT)
const LOW_NEBULA_DATA = generateNebulaClouds(LOW_NEBULA_COUNT)

const StarShader = {
  uniforms: {
    uTime: { value: 0 },
    uZOffset: { value: 0 },
    uSpeed: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uRotation: { value: 0 },
    uColorPhase: { value: 0 },
    uColor1: { value: new THREE.Color(VISUALIZER_COLORS.starBase) },
    uColor2: { value: new THREE.Color(VISUALIZER_COLORS.cyan) },
    uColor3: { value: new THREE.Color(VISUALIZER_COLORS.purple) },
    uColor4: { value: new THREE.Color(VISUALIZER_COLORS.magenta) },
    uDensityScale: { value: 1.0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uZOffset;
    uniform float uSpeed;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uRotation;
    uniform float uDensityScale;

    attribute float aSize;
    attribute float aColorIdx;
    attribute float aTwinklePhase;
    attribute float aTwinkleSpeed;
    attribute float aLayer;
    
    varying float vAlpha;
    varying float vColorIdx;
    varying float vTwinkle;
    varying float vStretch;

    void main() {
      vec3 pos = position;

      float layerSpeed = 1.0 + aLayer * 0.5;
      pos.z = mod(pos.z + uZOffset * layerSpeed + 150.0, 300.0) - 150.0;

      float rotAngle = uRotation * (1.0 - aLayer * 0.2);
      float c = cos(rotAngle);
      float s = sin(rotAngle);
      float rx = pos.x * c - pos.y * s;
      float ry = pos.x * s + pos.y * c;
      pos.x = rx;
      pos.y = ry;

      float pulse = 1.0 + uBass * 0.04 * sin(pos.z * 0.02 + uTime * 0.5);
      pos.x *= pulse;
      pos.y *= pulse;

      vColorIdx = aColorIdx;

      // Star stretching: responds to speed AND sudden acceleration (bass)
      // At high speeds, stars become streaks of light
      float speedStretch = pow(uSpeed / 22.0, 1.4) * 0.7;
      // Bass transients add extra stretch — the punch of acceleration
      float bassStretch = pow(uBass, 1.6) * 0.3;
      vStretch = 1.0 + speedStretch + bassStretch;

      // Twinkle: high frequencies make stars sparkle — crystal field effect
      float twinkleRate = aTwinkleSpeed + uHigh * 1.5;
      float twinkle = sin(uTime * twinkleRate + aTwinklePhase);
      twinkle = twinkle * 0.5 + 0.5;
      twinkle = pow(twinkle, 2.0);
      // Highs amplify the twinkle intensity
      vTwinkle = twinkle * (0.5 + uHigh * 0.8);

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      float dist = length(mvPosition.xyz);
      float baseSize = aSize * (1.0 + uHigh * 0.2);
      baseSize *= (1.0 + twinkle * 0.5);
      gl_PointSize = baseSize * (350.0 / dist) * vStretch;
      gl_PointSize = clamp(gl_PointSize, 0.5, 55.0);

      float fogNear = 20.0;
      float fogFar = 140.0;
      vAlpha = 1.0 - smoothstep(fogNear, fogFar, abs(pos.z));
      vAlpha *= smoothstep(0.0, 20.0, abs(pos.z));
      vAlpha *= 0.7 + twinkle * 0.3;
      vAlpha *= uDensityScale;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;
    uniform float uTime;
    uniform float uSpeed;
    uniform float uColorPhase;
    uniform float uBass;

    varying float vAlpha;
    varying float vColorIdx;
    varying float vTwinkle;
    varying float vStretch;

    void main() {
      vec2 uv = gl_PointCoord.xy - 0.5;
      uv.y /= vStretch;
      
      float d = length(uv);
      if (d > 0.5) discard;

      // Sharper star rendering - tighter core, reduced glow spread
      float core = 1.0 - smoothstep(0.0, 0.04, d);
      float innerGlow = 1.0 - smoothstep(0.0, 0.12, d);
      innerGlow = pow(innerGlow, 2.5);
      float outerGlow = 1.0 - smoothstep(0.0, 0.35, d);
      outerGlow = pow(outerGlow, 4.0);
      
      float speedDim = 1.0 - smoothstep(15.0, 35.0, uSpeed) * 0.25;
      float intensity = (core * 1.0 + innerGlow * 0.3 + outerGlow * 0.12) * speedDim * 1.15;

      vec3 shiftColor1 = vec3(${VISUALIZER_SRGB.cyan});
      vec3 shiftColor2 = vec3(${VISUALIZER_SRGB.purple});
      vec3 shiftColor3 = vec3(${VISUALIZER_SRGB.magenta});
      vec3 shiftColor4 = vec3(${VISUALIZER_SRGB.indigo});
      
      float phase = uColorPhase + vColorIdx * 2.0;
      float s1 = pow(sin(phase) * 0.5 + 0.5, 0.8);
      float s2 = pow(sin(phase + 1.57) * 0.5 + 0.5, 0.8);
      float s3 = pow(sin(phase + 3.14) * 0.5 + 0.5, 0.8);
      float s4 = pow(sin(phase + 4.71) * 0.5 + 0.5, 0.8);
      
      vec3 shiftBlend = shiftColor1 * s1 + shiftColor2 * s2 + shiftColor3 * s3 + shiftColor4 * s4;
      shiftBlend = shiftBlend * 0.25;

      vec3 starColor;
      if (vColorIdx < 0.4) {
        starColor = mix(uColor1, uColor2, vColorIdx * 2.5);
      } else if (vColorIdx < 0.7) {
        starColor = mix(uColor2, uColor3, (vColorIdx - 0.4) * 3.33);
      } else {
        starColor = mix(uColor3, uColor4, (vColorIdx - 0.7) * 3.33);
      }
      
      float shiftStrength = 0.6 + uBass * 0.6;
      starColor = starColor + shiftBlend * shiftStrength;
      
      starColor = mix(starColor, vec3(1.0), vTwinkle * 0.12);
      starColor = mix(starColor, vec3(1.0), core * 0.25);
      
      starColor = clamp(starColor * 1.08, vec3(0.0), vec3(1.2));

      float finalAlpha = vAlpha * intensity;
      finalAlpha = clamp(finalAlpha, 0.0, 1.0);
      
      // Discard very dim stars to reduce overdraw and potential flicker
      if (finalAlpha < 0.01) discard;

      gl_FragColor = vec4(starColor, finalAlpha);
    }
  `
}

const NebulaShader = {
  uniforms: {
    uTime: { value: 0 },
    uZOffset: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uRotation: { value: 0 },
    uColorPhase: { value: 0 },
    uBurstIntensity: { value: 0 },
    uColor1: { value: new THREE.Color(VISUALIZER_COLORS.purple) },
    uColor2: { value: new THREE.Color(VISUALIZER_COLORS.cyan) },
    uColor3: { value: new THREE.Color(VISUALIZER_COLORS.magenta) },
    uColor4: { value: new THREE.Color(VISUALIZER_COLORS.indigo) },
    uDensityScale: { value: 1.0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uZOffset;
    uniform float uBass;
    uniform float uMid;
    uniform float uRotation;
    uniform float uDensityScale;

    attribute float aSize;
    attribute float aColorIdx;
    
    varying float vAlpha;
    varying float vColorIdx;

    void main() {
      vec3 pos = position;

      pos.z = mod(pos.z + uZOffset * 0.6 + 140.0, 280.0) - 140.0;

      float rotAngle = uRotation * 0.7;
      float c = cos(rotAngle);
      float s = sin(rotAngle);
      float rx = pos.x * c - pos.y * s;
      float ry = pos.x * s + pos.y * c;
      pos.x = rx;
      pos.y = ry;

      // Mid frequencies make nebula clouds breathe — expand/contract
      float breathePhase = uTime * 0.25 + aColorIdx * 10.0;
      float breatheAmount = sin(breathePhase) * uMid * 2.5;
      float breatheScale = 1.0 + sin(breathePhase * 0.7) * uMid * 0.04;
      pos.x = pos.x * breatheScale + breatheAmount;
      pos.y = pos.y * breatheScale + breatheAmount * 0.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      float dist = length(mvPosition.xyz);
      // Bass makes clouds pulse in size more dramatically
      float pulse = 1.0 + uBass * 0.22;
      gl_PointSize = aSize * pulse * (400.0 / dist);
      gl_PointSize = clamp(gl_PointSize, 2.0, 85.0);

      vAlpha = 1.0 - smoothstep(40.0, 130.0, abs(pos.z));
      vAlpha *= smoothstep(0.0, 30.0, abs(pos.z));
      // Bass pulses nebula brightness — clouds glow on beats
      vAlpha *= 0.16 + uBass * 0.10;
      vAlpha *= uDensityScale;
      vColorIdx = aColorIdx;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;
    uniform float uTime;
    uniform float uBass;
    uniform float uColorPhase;
    uniform float uBurstIntensity;

    varying float vAlpha;
    varying float vColorIdx;

    void main() {
      vec2 uv = gl_PointCoord.xy - 0.5;
      float d = length(uv);
      
      if (d > 0.5) discard;

      float innerSoft = 1.0 - smoothstep(0.0, 0.25, d);
      innerSoft = pow(innerSoft, 1.2);
      float outerSoft = 1.0 - smoothstep(0.0, 0.5, d);
      outerSoft = pow(outerSoft, 2.0);
      float softness = innerSoft * 0.6 + outerSoft * 0.5;

      float phase = uColorPhase + vColorIdx * 2.5;
      float colorBlend = fract(phase * 0.15);
      
      vec3 nebulaColor;
      if (colorBlend < 0.25) {
        nebulaColor = mix(uColor1, uColor2, colorBlend * 4.0);
      } else if (colorBlend < 0.5) {
        nebulaColor = mix(uColor2, uColor3, (colorBlend - 0.25) * 4.0);
      } else if (colorBlend < 0.75) {
        nebulaColor = mix(uColor3, uColor4, (colorBlend - 0.5) * 4.0);
      } else {
        nebulaColor = mix(uColor4, uColor1, (colorBlend - 0.75) * 4.0);
      }
      
      vec3 accentCyan = vec3(${VISUALIZER_SRGB.cyan});
      vec3 accentPurple = vec3(${VISUALIZER_SRGB.purple});
      vec3 accentMagenta = vec3(${VISUALIZER_SRGB.magenta});
      float accentMix1 = sin(phase * 0.5) * 0.5 + 0.5;
      float accentMix2 = sin(phase * 0.5 + 2.1) * 0.5 + 0.5;
      vec3 accent = accentCyan * accentMix1 + accentPurple * (1.0 - accentMix1) * 0.7 + accentMagenta * accentMix2 * 0.5;
      nebulaColor = mix(nebulaColor, accent, 0.35 + uBass * 0.25);
      
      nebulaColor *= 0.9 + uBass * 0.25;
      
      // Brightness burst effect - occasional flares
      float burstGlow = uBurstIntensity * (0.8 + vColorIdx * 0.4);
      nebulaColor += nebulaColor * burstGlow * 1.5;
      
      // Clamp nebula colors to prevent bloom hot spots
      nebulaColor = clamp(nebulaColor, vec3(0.0), vec3(1.3));

      float finalAlpha = vAlpha * softness * (1.0 + uBurstIntensity * 0.5);
      
      // Discard very dim nebula particles
      if (finalAlpha < 0.005) discard;

      gl_FragColor = vec4(nebulaColor, finalAlpha);
    }
  `
}

let accumulatedZOffset = 0
let accumulatedRotation = 0
let accumulatedColorPhase = 0
let smoothedSpeed = 2.0
let smoothedBass = 0
let smoothedMid = 0
let smoothedHigh = 0
let nebulaBurstIntensity = 0
let nebulaBurstTimer = 0
const NEBULA_BURST_INTERVAL_MIN = 4
const NEBULA_BURST_INTERVAL_MAX = 12
let nextBurstTime = 6

// Warp burst state — brief extreme speed spikes on heavy bass transients
let warpBurstIntensity = 0
let prevBassForTransient = 0

// Camera bass-hit reaction — Z-rotation impulse on transients
let cameraBassImpulse = 0

// Rotation momentum — accumulated rotational energy from bass
let rotationMomentum = 0

export function SpaceTravel({ bassLevel, midLevel, highLevel, performanceMode = false }: SpaceTravelProps) {
  const { camera } = useThree()
  const starsRef = useRef<THREE.Points>(null)
  const starMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const nebulaRef = useRef<THREE.Points>(null)
  const nebulaMaterialRef = useRef<THREE.ShaderMaterial>(null)

  const stars = useMemo(
    () => (performanceMode ? LOW_STAR_DATA : HIGH_STAR_DATA),
    [performanceMode],
  )
  const nebula = useMemo(
    () => (performanceMode ? LOW_NEBULA_DATA : HIGH_NEBULA_DATA),
    [performanceMode],
  )

  const starDensityScale = performanceMode ? 1.0 : Math.sqrt(LOW_STAR_COUNT / HIGH_STAR_COUNT)
  const nebulaDensityScale = performanceMode ? 1.0 : Math.sqrt(LOW_NEBULA_COUNT / HIGH_NEBULA_COUNT)

  // SpaceTravel is the only visualizer that tilts/drifts the shared R3F camera.
  // Reset on unmount so other scenes start from a neutral view.
  useEffect(() => {
    return () => {
      camera.rotation.set(0, 0, 0)
    }
  }, [camera])

  useFrame((state, delta) => {
    if (!starMaterialRef.current || !nebulaMaterialRef.current) return

    const time = state.clock.getElapsedTime()
    const clampedDelta = Math.min(delta, 0.1)

    // --- Audio smoothing ---
    // Bass: slightly faster attack for transient detection
    const bassSmRate = Math.pow(bassLevel, 1.5) > smoothedBass ? 0.035 : 0.008
    smoothedBass = THREE.MathUtils.lerp(smoothedBass, Math.pow(bassLevel, 1.5), bassSmRate)
    smoothedMid = THREE.MathUtils.lerp(smoothedMid, midLevel, 0.02)
    smoothedHigh = THREE.MathUtils.lerp(smoothedHigh, Math.pow(highLevel, 1.3), 0.03)

    const audioEnergy = smoothedBass + smoothedMid * 0.5 + smoothedHigh * 0.3

    // --- Bass transient detection ---
    // Compare current bass to previous frame to detect sudden hits
    const bassTransient = Math.max(0, smoothedBass - prevBassForTransient)
    prevBassForTransient = smoothedBass

    // --- Warp burst mechanic ---
    // When bass exceeds threshold with a strong transient, trigger a warp punch
    if (bassTransient > 0.06 && smoothedBass > 0.55 && warpBurstIntensity < 0.2) {
      // Intensity scales with how hard the hit is
      warpBurstIntensity = Math.max(warpBurstIntensity, Math.min(0.7, 0.3 + bassTransient * 3.0))
    }
    // Rapid exponential decay — the burst is felt, not sustained
    warpBurstIntensity *= Math.pow(0.04, clampedDelta) // ~96% decay per second

    // --- Speed dynamics (CORE) ---
    const idleSpeed = 1.0

    // More explosive bass response — cubic curve for that warp-drive feel
    const bassDrive = Math.pow(smoothedBass, 2.2) * 9.0

    const midCruise = smoothedMid * 5.0

    const highAccent = smoothedHigh * 2.5

    const varietyWave = (Math.sin(time * 0.08) * 0.5 + 0.5) * audioEnergy * 3.0

    // Warp burst adds a massive brief spike
    const warpBoost = warpBurstIntensity * 12.0

    const targetSpeed = idleSpeed + bassDrive + midCruise + highAccent + varietyWave + warpBoost

    // Asymmetric smoothing: fast acceleration, very slow deceleration
    // Acceleration: snappy response to energy (like engaging thrusters)
    // Deceleration: heavy inertia (massive ship coasting down)
    const accelRate = targetSpeed > smoothedSpeed ? 0.035 : 0.004
    smoothedSpeed = THREE.MathUtils.lerp(smoothedSpeed, targetSpeed, accelRate)
    smoothedSpeed = Math.max(smoothedSpeed, 0.8)
    smoothedSpeed = Math.min(smoothedSpeed, 22.0)

    accumulatedZOffset += smoothedSpeed * clampedDelta

    // --- Tunnel rotation ---
    // Base rotation: slow persistent twist
    const baseRotationSpeed = 0.015
    // Bass adds rotational momentum (accumulated, so it builds during energetic passages)
    rotationMomentum += smoothedBass * 0.006 * clampedDelta
    // Mid creates gentle oscillating sway — navigating through the tunnel
    const midSway = Math.sin(time * 0.3) * smoothedMid * 0.003
    // Friction: momentum decays slowly
    rotationMomentum *= Math.pow(0.7, clampedDelta)
    accumulatedRotation += (baseRotationSpeed + rotationMomentum + midSway) * clampedDelta

    // --- Color evolution ---
    // Quiet passages: slow cool-tone cycling. Peaks: rapid shifting through nebulae
    const colorSpeed = 0.1 + smoothedBass * 0.8 + smoothedMid * 0.3 + smoothedHigh * 0.2
        + audioEnergy * 0.25
    accumulatedColorPhase += colorSpeed * clampedDelta

    // --- Star uniforms ---
    starMaterialRef.current.uniforms.uTime.value = time
    starMaterialRef.current.uniforms.uZOffset.value = accumulatedZOffset
    starMaterialRef.current.uniforms.uSpeed.value = smoothedSpeed
    starMaterialRef.current.uniforms.uRotation.value = accumulatedRotation
    starMaterialRef.current.uniforms.uBass.value = smoothedBass
    starMaterialRef.current.uniforms.uMid.value = smoothedMid
    starMaterialRef.current.uniforms.uHigh.value = smoothedHigh
    starMaterialRef.current.uniforms.uColorPhase.value = accumulatedColorPhase
    starMaterialRef.current.uniforms.uDensityScale.value = starDensityScale

    // --- Nebula burst system (improved) ---
    // Timer-based ambient bursts
    nebulaBurstTimer += clampedDelta
    if (nebulaBurstTimer >= nextBurstTime) {
      nebulaBurstIntensity = Math.max(nebulaBurstIntensity, 0.3 + audioEnergy * 0.25)
      nebulaBurstTimer = 0
      nextBurstTime = NEBULA_BURST_INTERVAL_MIN + Math.random() * (NEBULA_BURST_INTERVAL_MAX - NEBULA_BURST_INTERVAL_MIN)
    }
    // Bass transient triggers — feels like punching through a nebula
    if (bassTransient > 0.03 && smoothedBass > 0.4 && nebulaBurstIntensity < 0.3) {
      nebulaBurstIntensity = Math.max(nebulaBurstIntensity, 0.3 + bassTransient * 3.0)
    }
    // Sustained energy keeps bursts glowing longer
    nebulaBurstIntensity = Math.min(0.7, nebulaBurstIntensity)
    if (nebulaBurstIntensity > 0) {
      // Decay rate varies: slower during sustained energy, faster during quiet
      const burstDecayRate = 0.5 + (1.0 - audioEnergy) * 0.8
      nebulaBurstIntensity = Math.max(0, nebulaBurstIntensity - clampedDelta * burstDecayRate)
    }

    // --- Nebula uniforms ---
    nebulaMaterialRef.current.uniforms.uTime.value = time
    nebulaMaterialRef.current.uniforms.uZOffset.value = accumulatedZOffset
    nebulaMaterialRef.current.uniforms.uRotation.value = accumulatedRotation
    nebulaMaterialRef.current.uniforms.uBass.value = smoothedBass
    nebulaMaterialRef.current.uniforms.uMid.value = smoothedMid
    nebulaMaterialRef.current.uniforms.uColorPhase.value = accumulatedColorPhase
    nebulaMaterialRef.current.uniforms.uBurstIntensity.value = nebulaBurstIntensity
    nebulaMaterialRef.current.uniforms.uDensityScale.value = nebulaDensityScale

    // --- Camera drift & bass-hit reaction ---
    // Bass transients create a brief Z-rotation impulse (thrust push)
    if (bassTransient > 0.06) {
      // Alternate direction for variety, scaled by transient strength
      const direction = Math.sin(time * 1.7) > 0 ? 1 : -1
      const impulseAdd = direction * bassTransient * 0.05
      cameraBassImpulse = THREE.MathUtils.clamp(cameraBassImpulse + impulseAdd, -0.08, 0.08)
    }
    // Impulse decays quickly
    cameraBassImpulse *= Math.pow(0.02, clampedDelta) // fast spring-back

    // Drift scales with speed — feels like turbulence at warp
    const speedFactor = smoothedSpeed / 22.0
    const driftAmount = 0.008 + speedFactor * 0.03
    const driftSpeed = 0.1 + speedFactor * 0.04
    const drift = Math.sin(time * driftSpeed) * driftAmount + cameraBassImpulse
    const tilt = Math.cos(time * driftSpeed * 0.7) * driftAmount * 0.4

    // Smooth return to center during quiet passages (lower lerp = slower = smoother)
    const cameraSmoothing = 0.005 + audioEnergy * 0.005
    state.camera.rotation.z = THREE.MathUtils.lerp(state.camera.rotation.z, drift, cameraSmoothing)
    state.camera.rotation.x = THREE.MathUtils.lerp(state.camera.rotation.x, tilt * 0.2, cameraSmoothing * 0.8)
  })

  return (
    <group>
      <points ref={nebulaRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nebula.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[nebula.sizes, 1]} />
          <bufferAttribute attach="attributes-aColorIdx" args={[nebula.colors, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={nebulaMaterialRef}
          args={[NebulaShader]}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[stars.sizes, 1]} />
          <bufferAttribute attach="attributes-aColorIdx" args={[stars.colors, 1]} />
          <bufferAttribute attach="attributes-aTwinklePhase" args={[stars.twinklePhase, 1]} />
          <bufferAttribute attach="attributes-aTwinkleSpeed" args={[stars.twinkleSpeed, 1]} />
          <bufferAttribute attach="attributes-aLayer" args={[stars.layer, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={starMaterialRef}
          args={[StarShader]}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
