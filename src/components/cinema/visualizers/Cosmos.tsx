"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { METADJ_VISUALIZER_SRGB } from "@/lib/color/metadj-visualizer-palette"

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

const HIGH_PARTICLE_COUNT = 14000
const LOW_PARTICLE_COUNT = 8000

function generateCosmosData(particleCount: number) {
  const positions = new Float32Array(particleCount * 3)
  const sizes = new Float32Array(particleCount)
  const randoms = new Float32Array(particleCount * 3)
  const armIndex = new Float32Array(particleCount) // Which spiral arm
  const random = seededRandom(42)

  const NUM_ARMS = 3 // Spiral arms

  for (let i = 0; i < particleCount; i++) {
    // Assign to spiral arm with some in core
    const isCore = random() < 0.25
    const arm = isCore ? -1 : Math.floor(random() * NUM_ARMS)

    // Radius distribution - concentrated center with spiral arms extending out
    const t = random()
    let radius: number
    let angle: number

    if (isCore) {
      // Core particles - dense center
      radius = t * t * 3.0 + 0.3
      angle = random() * Math.PI * 2
    } else {
      // Spiral arm particles
      radius = 1.5 + t * t * 9.0 // 1.5 to 10.5
      // Base angle from arm position + spiral twist based on radius
      const armAngle = (arm / NUM_ARMS) * Math.PI * 2
      const spiralTwist = radius * 0.4 // How tight the spiral is
      angle = armAngle + spiralTwist + (random() - 0.5) * 0.8 // Spread within arm
    }

    // Flattened disk with slight thickness
    const heightSpread = isCore ? 0.4 : 0.15 * (1 + radius * 0.05)
    const y = (random() - 0.5) * heightSpread

    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    // Size variation - core particles slightly larger
    sizes[i] = isCore ? 0.5 + random() * 0.5 : 0.35 + random() * 0.45

    // Store arm index for color mapping (normalized 0-1, -1 becomes 0.33 for core)
    armIndex[i] = isCore ? 0.33 : (arm + random() * 0.3) / NUM_ARMS

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

      // Spiral rotation - inner rotates faster (Keplerian-ish)
      float rotSpeed = 1.0 / sqrt(max(r, 0.5));
      float angle = uRotation * rotSpeed;
      float c = cos(angle);
      float s = sin(angle);
      vec3 rotatedPos = vec3(
        pos.x * c - pos.z * s,
        pos.y,
        pos.x * s + pos.z * c
      );

      // Breathing pulse - waves propagate outward
      float pulse = sin(uPulsePhase - r * 0.5) * 0.5 + 0.5;
      float breathe = 1.0 + pulse * uBass * 0.2;
      breathe += sin(uTime * 0.2 + r * 0.2) * 0.04;
      rotatedPos.xz *= breathe;

      // Vertical wave motion
      float vertWave = sin(uPulsePhase * 0.7 - r * 0.3 + aRandom.x * 3.0) * 0.15;
      rotatedPos.y += vertWave * uMid;

      // Smooth turbulence
      float noise = snoise(pos * 0.15 + vec3(uTime * 0.06));
      rotatedPos += normalize(vec3(pos.x, 0.0, pos.z)) * noise * (0.1 + uMid * 0.2);

      vec4 mvPosition = modelViewMatrix * vec4(rotatedPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Size with audio reactivity
      float baseSize = 0.4 * aSize * (1.0 + uHigh * 0.5 + uBass * 0.3);
      gl_PointSize = baseSize * (300.0 / -mvPosition.z) * uPixelRatio;
      gl_PointSize = clamp(gl_PointSize, 1.0, 40.0);

      // === VIBRANT COLOR SYSTEM ===
      // MetaDJ palette
      vec3 cyan = vec3(${METADJ_VISUALIZER_SRGB.cyan});
      vec3 purple = vec3(${METADJ_VISUALIZER_SRGB.purple});
      vec3 magenta = vec3(${METADJ_VISUALIZER_SRGB.magenta});
      vec3 indigo = vec3(${METADJ_VISUALIZER_SRGB.indigo});
      vec3 cyanTint = vec3(0.133, 0.827, 0.933); // #22D3EE
      vec3 white = vec3(0.95, 0.97, 1.0);

      // Core glow - hot white/cyan center
      vec3 coreColor = mix(white, cyan, 0.3);

      // Nebula regions based on angle and arm
      float theta = atan(pos.z, pos.x);
      float nebulaPhase = theta + uColorPhase * 0.3 + aArmIndex * 6.28;

      // Create flowing color regions
      float region1 = pow(sin(nebulaPhase) * 0.5 + 0.5, 1.5);
      float region2 = pow(sin(nebulaPhase + 2.094) * 0.5 + 0.5, 1.5);
      float region3 = pow(sin(nebulaPhase + 4.189) * 0.5 + 0.5, 1.5);

      // Blend nebula colors
      vec3 nebulaColor = cyan * region1 + magenta * region2 + purple * region3;
      nebulaColor = normalize(nebulaColor + 0.001) * length(nebulaColor) * 0.8;

      // Add golden/warm accents in some regions (cosmic dust feel)
      float warmRegion = pow(sin(nebulaPhase * 0.5 + 1.0) * 0.5 + 0.5, 3.0);
      vec3 warmAccent = vec3(1.0, 0.7, 0.3) * warmRegion * 0.25;

      // Radial color temperature gradient
      float radialT = smoothstep(0.0, 8.0, r);
      vec3 baseColor = mix(coreColor, nebulaColor, radialT);
      baseColor += warmAccent * (1.0 - radialT * 0.5);

      // Core brightness boost
      if (r < 2.5) {
        float coreGlow = 1.0 - r / 2.5;
        baseColor += white * coreGlow * 0.5;
        baseColor += cyan * coreGlow * 0.3;
      }

      // Audio-reactive color shifts
      float audioEnergy = uBass * 0.5 + uMid * 0.3 + uHigh * 0.2;

      // Bass pumps magenta/warm
      baseColor += magenta * uBass * 0.3;
      // Highs add cyan shimmer
      baseColor += cyan * uHigh * 0.25;
      // Mids enhance purple depth
      baseColor += indigo * uMid * 0.2;

      // Cycling color overlay
      float cycle = uColorPhase + r * 0.1 + aArmIndex * 3.0;
      float cyc1 = pow(sin(cycle) * 0.5 + 0.5, 0.8);
      float cyc2 = pow(sin(cycle + 2.094) * 0.5 + 0.5, 0.8);
      float cyc3 = pow(sin(cycle + 4.189) * 0.5 + 0.5, 0.8);
      vec3 cycleColor = cyanTint * cyc1 + purple * cyc2 + magenta * cyc3;
      baseColor += cycleColor * (0.15 + audioEnergy * 0.2);

      // Brightness boost
      baseColor *= 1.15 + audioEnergy * 0.3;

      vColor = baseColor;

      // Glow factor for bloom interaction
      vGlow = 0.8 + pulse * 0.2 + uBass * 0.3;

      // Alpha falloff
      float edgeFade = 1.0 - smoothstep(8.5, 11.0, r);
      float centerFade = smoothstep(0.2, 1.0, r);
      vAlpha = edgeFade * centerFade;
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
      if (d > 0.5) discard;

      // Soft glow falloff
      float core = 1.0 - smoothstep(0.0, 0.12, d);
      float glow = 1.0 - smoothstep(0.0, 0.5, d);
      glow = pow(glow, 1.8);

      float strength = core * 1.5 + glow * 0.6;
      strength *= vGlow;

      vec3 color = vColor;

      // Soft color boost at edges for nebula feel
      color *= 1.0 + (1.0 - glow) * 0.1;

      // Clamp to prevent harsh spots
      color = clamp(color, vec3(0.0), vec3(1.4));

      float finalAlpha = vAlpha * strength;

      // Discard dim particles
      if (finalAlpha < 0.12) discard;

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

  useFrame((state, delta) => {
    if (!materialRef.current || !pointsRef.current) return

    const time = state.clock.elapsedTime
    const clampedDelta = Math.min(delta, 0.1)
    const s = stateRef.current

    // Smooth audio
    s.smoothedBass = THREE.MathUtils.lerp(s.smoothedBass, Math.pow(bassLevel, 1.4), 0.045)
    s.smoothedMid = THREE.MathUtils.lerp(s.smoothedMid, midLevel, 0.04)
    s.smoothedHigh = THREE.MathUtils.lerp(s.smoothedHigh, Math.pow(highLevel, 1.2), 0.045)

    // Rotation with audio acceleration
    const idleSpeed = 0.1
    const bassBurst = Math.pow(s.smoothedBass, 1.5) * 0.6
    const midBoost = s.smoothedMid * 0.25
    const highAccent = s.smoothedHigh * 0.15
    const varietyWave = (Math.sin(time * 0.035) * 0.5 + 0.5) * 0.08

    const targetRotationSpeed = idleSpeed + bassBurst + midBoost + highAccent + varietyWave

    const accelRate = targetRotationSpeed > s.smoothedRotationSpeed ? 0.05 : 0.006
    s.smoothedRotationSpeed = THREE.MathUtils.lerp(s.smoothedRotationSpeed, targetRotationSpeed, accelRate)
    s.smoothedRotationSpeed = Math.max(s.smoothedRotationSpeed, 0.07)

    s.accumulatedRotation += s.smoothedRotationSpeed * clampedDelta

    // Pulse phase - ripples outward
    const pulseSpeed = 1.5 + s.smoothedBass * 3.0 + s.smoothedMid * 1.5
    s.accumulatedPulsePhase += pulseSpeed * clampedDelta

    // Color phase
    const colorSpeed = 0.3 + s.smoothedBass * 0.8 + s.smoothedMid * 0.4 + s.smoothedHigh * 0.3
    s.accumulatedColorPhase += colorSpeed * clampedDelta

    // Update uniforms
    materialRef.current.uniforms.uTime.value = time
    materialRef.current.uniforms.uRotation.value = s.accumulatedRotation
    materialRef.current.uniforms.uPixelRatio.value = state.viewport.dpr
    materialRef.current.uniforms.uBass.value = s.smoothedBass
    materialRef.current.uniforms.uMid.value = s.smoothedMid
    materialRef.current.uniforms.uHigh.value = s.smoothedHigh
    materialRef.current.uniforms.uColorPhase.value = s.accumulatedColorPhase
    materialRef.current.uniforms.uPulsePhase.value = s.accumulatedPulsePhase

    // Gentle tilt for 3D depth feel
    const tiltX = Math.PI * 0.15 + Math.sin(time * 0.15) * 0.04 * (1 + s.smoothedBass * 0.3)
    const tiltZ = Math.cos(time * 0.12) * 0.03 * (1 + s.smoothedMid * 0.2)
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
