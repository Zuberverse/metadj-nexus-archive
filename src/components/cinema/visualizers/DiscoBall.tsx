"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { VISUALIZER_COLORS } from "@/lib/color/visualizer-palette"

interface DiscoBallProps {
  bassLevel: number
  midLevel: number
  highLevel: number
  /** When true, uses reduced particle counts for smoother rendering. */
  performanceMode?: boolean
}

function seededRandom(seed: number): () => number {
  return function () {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
}

const HIGH_FACET_COUNT = 14000
const LOW_FACET_COUNT = 7000
const HIGH_HALO_COUNT = 6500
const LOW_HALO_COUNT = 3200
const DISCO_RADIUS = 5.0
const DISCO_CORE_RADIUS = 4.8

function generateFacetData(facetCount: number) {
  const positions = new Float32Array(facetCount * 3)
  const sizes = new Float32Array(facetCount)
  const colorIdx = new Float32Array(facetCount)
  const randoms = new Float32Array(facetCount * 3)
  const random = seededRandom(4242)

  for (let i = 0; i < facetCount; i++) {
    const u = random()
    const v = random()
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v - 1)

    const jitter = (random() - 0.5) * 0.18
    const radius = DISCO_RADIUS + jitter

    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.sin(theta)

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    sizes[i] = 0.35 + random() * 1.2
    colorIdx[i] = random()

    randoms[i * 3] = random()
    randoms[i * 3 + 1] = random()
    randoms[i * 3 + 2] = random()
  }

  return { positions, sizes, colorIdx, randoms }
}

function generateHaloData(haloCount: number) {
  const positions = new Float32Array(haloCount * 3)
  const sizes = new Float32Array(haloCount)
  const colorIdx = new Float32Array(haloCount)
  const randoms = new Float32Array(haloCount * 3)
  const random = seededRandom(9001)

  const inner = DISCO_RADIUS * 1.6
  const outer = DISCO_RADIUS * 4.2

  for (let i = 0; i < haloCount; i++) {
    const angle = random() * Math.PI * 2
    const t = random()
    const radius = inner + t * t * (outer - inner)
    const vertical = (random() - 0.5) * (4 + t * 8)
    const spiral = Math.sin(angle * 3) * (0.6 + random() * 0.8)

    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = vertical + spiral

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    sizes[i] = 0.25 + random() * 1.4
    colorIdx[i] = random()

    randoms[i * 3] = random()
    randoms[i * 3 + 1] = random()
    randoms[i * 3 + 2] = random()
  }

  return { positions, sizes, colorIdx, randoms }
}

const HIGH_FACET_DATA = generateFacetData(HIGH_FACET_COUNT)
const LOW_FACET_DATA = generateFacetData(LOW_FACET_COUNT)
const HIGH_HALO_DATA = generateHaloData(HIGH_HALO_COUNT)
const LOW_HALO_DATA = generateHaloData(LOW_HALO_COUNT)

const DiscoCoreShader = {
  uniforms: {
    uTime: { value: 0 },
    uRotation: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uColorPhase: { value: 0 },
    uColor1: { value: new THREE.Color(VISUALIZER_COLORS.purple) },
    uColor2: { value: new THREE.Color(VISUALIZER_COLORS.cyan) },
    uColor3: { value: new THREE.Color(VISUALIZER_COLORS.magenta) },
    uColor4: { value: new THREE.Color(VISUALIZER_COLORS.indigo) },
    uStarBase: { value: new THREE.Color(VISUALIZER_COLORS.starBase) },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uRotation;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;

    varying vec3 vNormal;
    varying vec3 vViewDir;

    void main() {
      vec3 pos = position;

      float energy = uBass * 0.9 + uMid * 0.6 + uHigh * 0.75;
      float breath = 1.0 + sin(uTime * 0.55) * 0.012 + energy * 0.02;
      pos *= breath;

      float rotY = uRotation * 0.58;
      float cY = cos(rotY);
      float sY = sin(rotY);
      pos = vec3(
        pos.x * cY + pos.z * sY,
        pos.y,
        -pos.x * sY + pos.z * cY
      );

      float rotZ = uRotation * 0.32;
      float cZ = cos(rotZ);
      float sZ = sin(rotZ);
      pos = vec3(
        pos.x * cZ - pos.y * sZ,
        pos.x * sZ + pos.y * cZ,
        pos.z
      );

      vec3 normalObj = normalize(pos);
      vNormal = normalize(normalMatrix * normalObj);

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewDir = normalize(-mvPosition.xyz);

      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uColorPhase;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;
    uniform vec3 uStarBase;

    varying vec3 vNormal;
    varying vec3 vViewDir;

    float hash12(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    vec3 cosmicEnv(vec3 dir) {
      const float PI = 3.141592653589793;
      vec3 d = normalize(dir);
      float u = atan(d.z, d.x) / (2.0 * PI) + 0.5;
      float v = asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5;
      vec2 uv = vec2(u, v);

      float w1 = sin((uv.x * 7.0 + uv.y * 4.0) * 6.2831 + uTime * 0.12);
      float w2 = sin((uv.x * 11.0 - uv.y * 6.0) * 6.2831 - uTime * 0.09);
      float neb = (w1 * w2) * 0.5 + 0.5;
      neb = pow(neb, 2.2);

      vec3 base = mix(uStarBase * 0.14, uColor4 * 0.55, 0.55);
      base = mix(base, mix(uColor1, uColor2, neb), 0.75);
      base = mix(base, uColor3, smoothstep(0.55, 1.0, neb) * 0.25);

      float s = fract(sin(dot(uv * vec2(173.3, 251.9), vec2(12.9898, 78.233))) * 43758.5453);
      float stars = pow(smoothstep(0.992, 1.0, s), 2.2);
      base += vec3(1.0) * stars * (0.35 + uHigh * 0.45);

      return base;
    }

    void main() {
      const float PI = 3.141592653589793;
      vec3 n = normalize(vNormal);
      vec3 viewDir = normalize(vViewDir);

      float u = atan(n.z, n.x) / (2.0 * PI) + 0.5;
      float v = asin(clamp(n.y, -1.0, 1.0)) / PI + 0.5;
      vec2 st = vec2(u, v);

      float tilesX = 28.0;
      float tilesY = 18.0;
      vec2 grid = vec2(st.x * tilesX, st.y * tilesY);
      vec2 tileId = floor(grid);
      vec2 tileUv = fract(grid);

      float lineWidth = 0.075;
      vec2 edge = min(tileUv, 1.0 - tileUv);
      float tileMask = smoothstep(0.0, lineWidth, edge.x) * smoothstep(0.0, lineWidth, edge.y);
      tileMask = clamp(tileMask, 0.0, 1.0);

      vec2 tileCenterUv = (tileId + 0.5) / vec2(tilesX, tilesY);
      float theta = (tileCenterUv.x - 0.5) * 2.0 * PI;
      float lat = (tileCenterUv.y - 0.5) * PI;
      vec3 facetNormal = normalize(vec3(cos(theta) * cos(lat), sin(lat), sin(theta) * cos(lat)));

      float rnd = hash12(tileId);
      vec3 upAxis = abs(facetNormal.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
      vec3 tangent = normalize(cross(upAxis, facetNormal));
      vec3 bitangent = cross(facetNormal, tangent);
      float ang = rnd * 6.28318530718;
      vec2 dir = vec2(cos(ang), sin(ang));

      float micro = (rnd - 0.5) * 0.18;
      vec3 microNormal = normalize(facetNormal + (tangent * dir.x + bitangent * dir.y) * micro);
      vec3 finalNormal = normalize(mix(n, microNormal, 0.82));

      vec3 lightDir1 = normalize(vec3(cos(uTime * 0.55), sin(uTime * 0.38), 0.9));
      vec3 lightDir2 = normalize(vec3(sin(uTime * 0.28), cos(uTime * 0.46), -0.6));

      float diff1 = max(dot(finalNormal, lightDir1), 0.0);
      float diff2 = max(dot(finalNormal, lightDir2), 0.0);
      float diffuse = diff1 * 0.55 + diff2 * 0.35;

      vec3 halfDir1 = normalize(lightDir1 + viewDir);
      vec3 halfDir2 = normalize(lightDir2 + viewDir);
      float spec1 = pow(max(dot(finalNormal, halfDir1), 0.0), 170.0);
      float spec2 = pow(max(dot(finalNormal, halfDir2), 0.0), 240.0);
      float spec = (spec1 + spec2);

      float energy = uBass * 0.8 + uMid * 0.45 + uHigh * 0.75;
      spec *= (0.55 + uHigh * 0.95 + uBass * 0.45);

      float phase = uColorPhase * 0.03 + rnd * 3.0 + st.y * 1.1;
      float band = fract(phase);
      vec3 tint;
      if (band < 0.33) {
        tint = mix(uColor1, uColor2, band / 0.33);
      } else if (band < 0.66) {
        tint = mix(uColor2, uColor3, (band - 0.33) / 0.33);
      } else {
        tint = mix(uColor3, uColor4, (band - 0.66) / 0.34);
      }

      float fresnel = pow(1.0 - max(dot(finalNormal, viewDir), 0.0), 3.2);
      vec3 reflectDir = reflect(-viewDir, finalNormal);
      vec3 env = cosmicEnv(reflectDir);

      float reflectivity = 0.55 + fresnel * 0.45;
      reflectivity += energy * 0.12;

      vec3 mirror = mix(tint * 0.08, env, clamp(reflectivity, 0.0, 1.0));

      float grout = 1.0 - tileMask;
      float tileBoost = 0.65 + rnd * 0.2 + energy * 0.18;
      vec3 color = mirror * tileBoost;
      color += vec3(1.0) * spec * 0.85;
      color += tint * fresnel * (0.12 + uBass * 0.12);

      color *= mix(0.22, 1.0, tileMask);
      color = mix(color, uStarBase * 0.02, grout * 0.75);

      // --- Random Tile Twinkle Logic ---
      // Use the random value per tile (rnd) and time to create flashing
      float flashSpeed = 1.0; 
      float flashOffset = rnd * 50.0;
      float tileFlash = sin(uTime * flashSpeed + flashOffset) * 0.5 + 0.5;
      
      // Make flashes sharp/rare (pow) but frequent enough (threshold)
      tileFlash = pow(tileFlash, 12.0); 
      tileFlash = smoothstep(0.1, 1.0, tileFlash);

      // Color the flash: mix the base tint with white for a bright pastel glow
      // or rotate lightly for variety.
      vec3 flashColor = mix(tint, vec3(1.0), 0.6) * tileFlash * 2.0;

      // Add flash to the tile (masked by tileMask so grout doesn't flash)
      color += flashColor * tileMask;
      // --------------------------------

      color = clamp(color, vec3(0.0), vec3(1.6));

      float alpha = 0.55 + energy * 0.12 + fresnel * 0.12;
      alpha *= 0.9 + tileMask * 0.1;
      alpha = clamp(alpha, 0.0, 0.9);

      gl_FragColor = vec4(color, alpha);
    }
  `
}

const DiscoFacetShader = {
  uniforms: {
    uTime: { value: 0 },
    uRotation: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uColorPhase: { value: 0 },
    uPixelRatio: { value: 1.0 },
    uColor1: { value: new THREE.Color(VISUALIZER_COLORS.purple) },
    uColor2: { value: new THREE.Color(VISUALIZER_COLORS.cyan) },
    uColor3: { value: new THREE.Color(VISUALIZER_COLORS.magenta) },
    uColor4: { value: new THREE.Color(VISUALIZER_COLORS.indigo) },
    uStarBase: { value: new THREE.Color(VISUALIZER_COLORS.starBase) },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uRotation;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uColorPhase;
    uniform float uPixelRatio;

    attribute float aSize;
    attribute vec3 aRandom;
    attribute float aColorIdx;

    varying float vAlpha;
    varying float vColorIdx;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying float vSparkle;

    void main() {
      vec3 pos = position;

      float breath = 1.0 + uBass * 0.12 + sin(uTime * 0.6 + aColorIdx * 6.0) * 0.015;
      pos *= breath;

      float rotY = uRotation * 0.6;
      float cY = cos(rotY);
      float sY = sin(rotY);
      pos = vec3(
        pos.x * cY + pos.z * sY,
        pos.y,
        -pos.x * sY + pos.z * cY
      );

      float rotZ = uRotation * 0.35;
      float cZ = cos(rotZ);
      float sZ = sin(rotZ);
      pos = vec3(
        pos.x * cZ - pos.y * sZ,
        pos.x * sZ + pos.y * cZ,
        pos.z
      );

      float jitterAmp = 0.04 + uHigh * 0.12;
      pos += (aRandom - 0.5) * jitterAmp * sin(uTime * 1.8 + aColorIdx * 12.0);

      vec3 normalObj = normalize(pos);
      vNormal = normalize(normalMatrix * normalObj);

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewDir = normalize(-mvPosition.xyz);

      vColorIdx = aColorIdx;
      vSparkle = fract(aColorIdx * 21.0 + uColorPhase * 0.1);

      float size = aSize * (0.85 + uHigh * 0.9 + uBass * 0.5);
      gl_PointSize = size * uPixelRatio * (30.0 / -mvPosition.z);

      gl_Position = projectionMatrix * mvPosition;
      vAlpha = 0.85;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uColorPhase;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uColor4;
    uniform vec3 uStarBase;

    varying float vAlpha;
    varying float vColorIdx;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying float vSparkle;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float dist = length(uv);
      if (dist > 0.5) discard;
      
      // Sharper falloff for crisper checkers
      float soft = 1.0 - smoothstep(0.0, 0.48, dist);
      soft = pow(soft, 1.8);

      // Increased multiplier from 3.0 to 12.0 for more color variety across the ball
      float phase = uColorPhase * 0.04 + vColorIdx * 12.0;
      float band = fract(phase);
      vec3 base;
      if (band < 0.33) {
        base = mix(uColor1, uColor2, band / 0.33);
      } else if (band < 0.66) {
        base = mix(uColor2, uColor3, (band - 0.33) / 0.33);
      } else {
        base = mix(uColor3, uColor4, (band - 0.66) / 0.34);
      }

      vec3 viewDir = normalize(vViewDir);

      vec3 lightDir1 = normalize(vec3(cos(uTime * 0.7), sin(uTime * 0.5), 0.8));
      vec3 lightDir2 = normalize(vec3(sin(uTime * 0.35), cos(uTime * 0.55), -0.4));

      float diff1 = max(dot(vNormal, lightDir1), 0.0);
      float diff2 = max(dot(vNormal, lightDir2), 0.0);
      float diffuse = diff1 * 0.7 + diff2 * 0.4;

      vec3 halfDir1 = normalize(lightDir1 + viewDir);
      vec3 halfDir2 = normalize(lightDir2 + viewDir);
      float spec1 = pow(max(dot(vNormal, halfDir1), 0.0), 65.0);
      float spec2 = pow(max(dot(vNormal, halfDir2), 0.0), 85.0);
      float spec = (spec1 + spec2) * (0.6 + uHigh * 1.1 + uBass * 0.5);

      // Changed threshold from 0.7 to 0.45 to make more checkers glow
      // Increased multipliers for potentially faster/more varied twinkling
      float sparkle = sin(uTime * (1.5 + vColorIdx * 1.2) + vColorIdx * 18.0) * 0.5 + 0.5;
      sparkle = smoothstep(0.45, 1.0, sparkle);
      spec *= sparkle;

      float rim = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
      vec3 rimColor = mix(base, uStarBase, 0.5) * rim * (0.35 + uBass * 0.4);

      vec3 color = base * (0.25 + diffuse * 0.9);
      color += vec3(1.0) * spec; // Specular adds white/glowing checkers
      color += rimColor;

      float energy = uBass * 0.7 + uMid * 0.35 + uHigh * 0.6;
      color *= 0.9 + energy * 0.35;

      // Facet popping: brief intensity boost based on frequency energy
      float pop = smoothstep(0.6, 1.0, uHigh) * 0.4 + smoothstep(0.7, 1.0, uBass) * 0.3;
      color += base * pop;

      color = clamp(color, vec3(0.0), vec3(1.5));

      float alpha = vAlpha * soft * (0.7 + spec * 0.8);
      // Threshold for crispness
      if (alpha < 0.2) discard;
      
      gl_FragColor = vec4(color, alpha);
    }
  `
}

const DiscoShockwaveShader = {
  uniforms: {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uColor1: { value: new THREE.Color(VISUALIZER_COLORS.purple) },
    uColor2: { value: new THREE.Color(VISUALIZER_COLORS.cyan) },
    uRadius: { value: 0 },
    uAlpha: { value: 0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uRadius;
    varying vec2 vUv;
    varying float vAlpha;

    void main() {
      vUv = uv;
      vec3 pos = position;
      // Expand disk
      pos *= uRadius;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBass;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uAlpha;
    varying vec2 vUv;

    void main() {
      float dist = length(vUv - 0.5);
      if (dist > 0.5) discard;
      
      // Ring effect
      float ring = smoothstep(0.4, 0.45, dist) * smoothstep(0.5, 0.45, dist);
      
      vec3 color = mix(uColor1, uColor2, sin(uTime + dist * 10.0) * 0.5 + 0.5);
      color += uBass * 0.5;
      
      gl_FragColor = vec4(color, ring * uAlpha);
    }
  `
}

const HaloShader = {
  uniforms: {
    uTime: { value: 0 },
    uRotation: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uHigh: { value: 0 },
    uColorPhase: { value: 0 },
    uPixelRatio: { value: 1.0 },
    uColor1: { value: new THREE.Color(VISUALIZER_COLORS.purple) },
    uColor2: { value: new THREE.Color(VISUALIZER_COLORS.cyan) },
    uColor3: { value: new THREE.Color(VISUALIZER_COLORS.magenta) },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uRotation;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uColorPhase;
    uniform float uPixelRatio;

    attribute float aSize;
    attribute vec3 aRandom;
    attribute float aColorIdx;

    varying float vAlpha;
    varying float vColorIdx;
    varying float vTwinkle;

    void main() {
      vec3 pos = position;

      float swirl = uRotation * (0.4 + aColorIdx * 0.6);
      float c = cos(swirl);
      float s = sin(swirl);
      pos = vec3(pos.x * c - pos.z * s, pos.y, pos.x * s + pos.z * c);

      float wave = sin(uTime * 0.8 + aColorIdx * 8.0) * (0.15 + uBass * 0.6);
      pos.y += wave * (0.8 + aRandom.x);

      float outward = 1.0 + uBass * 0.08 + uMid * 0.05;
      pos *= outward;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      float size = aSize * (0.7 + uHigh * 0.6);
      gl_PointSize = size * uPixelRatio * (24.0 / -mvPosition.z);

      vColorIdx = aColorIdx;
      vTwinkle = fract(aColorIdx * 14.0 + uColorPhase * 0.15);
      vAlpha = 0.6 + aRandom.y * 0.4;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uHigh;
    uniform float uColorPhase;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;

    varying float vAlpha;
    varying float vColorIdx;
    varying float vTwinkle;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float dist = length(uv);
      if (dist > 0.5) discard;
      
      // Sharper falloff for halo particles
      float soft = 1.0 - smoothstep(0.0, 0.45, dist);
      soft = pow(soft, 2.5);

      float phase = fract(vColorIdx + uColorPhase * 0.05);
      vec3 base;
      if (phase < 0.5) {
        base = mix(uColor1, uColor2, phase / 0.5);
      } else {
        base = mix(uColor2, uColor3, (phase - 0.5) / 0.5);
      }

      float twinkle = sin(uTime * (1.6 + vTwinkle * 1.8) + vTwinkle * 10.0) * 0.5 + 0.5;
      twinkle = pow(twinkle, 2.0);

      float energy = uBass * 0.6 + uHigh * 0.5;
      float glow = 0.35 + twinkle * 0.9 + energy * 0.6;

      vec3 color = base * glow;
      color = clamp(color, vec3(0.0), vec3(1.6));

      float alpha = vAlpha * soft * (0.5 + twinkle * 0.7 + energy * 0.4);
      
      // Threshold for crispness
      if (alpha < 0.18) discard;
      
      gl_FragColor = vec4(color, alpha);
    }
  `
}

let smoothedBass = 0
let smoothedMid = 0
let smoothedHigh = 0
let rotationAccum = 0
let colorPhaseAccum = 0
let shockwaveRadius = 0
let shockwaveAlpha = 0

export function DiscoBall({ bassLevel, midLevel, highLevel, performanceMode = false }: DiscoBallProps) {
  const coreMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const facetsRef = useRef<THREE.Points>(null)
  const facetsMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const haloRef = useRef<THREE.Points>(null)
  const haloMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const shockwaveMaterialRef = useRef<THREE.ShaderMaterial>(null)

  const facets = useMemo(
    () => (performanceMode ? LOW_FACET_DATA : HIGH_FACET_DATA),
    [performanceMode],
  )
  const halo = useMemo(
    () => (performanceMode ? LOW_HALO_DATA : HIGH_HALO_DATA),
    [performanceMode],
  )

  useFrame((state, delta) => {
    if (!coreMaterialRef.current || !facetsMaterialRef.current || !haloMaterialRef.current) return

    const time = state.clock.getElapsedTime()
    const clampedDelta = Math.min(delta, 0.1)

    const prevBass = smoothedBass
    smoothedBass = THREE.MathUtils.lerp(smoothedBass, Math.pow(bassLevel, 1.6), 0.06)
    smoothedMid = THREE.MathUtils.lerp(smoothedMid, midLevel, 0.045)
    smoothedHigh = THREE.MathUtils.lerp(smoothedHigh, Math.pow(highLevel, 1.4), 0.055)

    // Trigger shockwave on bass hit
    if (bassLevel > 0.75 && (bassLevel - prevBass) > 0.1) {
      shockwaveRadius = DISCO_RADIUS * 1.0
      shockwaveAlpha = 0.8
    }

    // Shockwave animation
    shockwaveRadius += clampedDelta * 15.0
    shockwaveAlpha = THREE.MathUtils.lerp(shockwaveAlpha, 0, 0.1)

    if (shockwaveMaterialRef.current) {
      shockwaveMaterialRef.current.uniforms.uTime.value = time
      shockwaveMaterialRef.current.uniforms.uBass.value = smoothedBass
      shockwaveMaterialRef.current.uniforms.uRadius.value = shockwaveRadius
      shockwaveMaterialRef.current.uniforms.uAlpha.value = shockwaveAlpha
    }

    const energy = smoothedBass * 1.1 + smoothedMid * 0.7 + smoothedHigh * 0.6

    const baseRotSpeed = 0.18
    rotationAccum += (baseRotSpeed + energy * 0.5) * clampedDelta

    const colorSpeed = 0.45 + smoothedBass * 1.0 + smoothedMid * 0.5 + smoothedHigh * 0.35
    colorPhaseAccum += colorSpeed * clampedDelta

    coreMaterialRef.current.uniforms.uTime.value = time
    coreMaterialRef.current.uniforms.uRotation.value = rotationAccum
    coreMaterialRef.current.uniforms.uBass.value = smoothedBass
    coreMaterialRef.current.uniforms.uMid.value = smoothedMid
    coreMaterialRef.current.uniforms.uHigh.value = smoothedHigh
    coreMaterialRef.current.uniforms.uColorPhase.value = colorPhaseAccum

    facetsMaterialRef.current.uniforms.uTime.value = time
    facetsMaterialRef.current.uniforms.uRotation.value = rotationAccum
    facetsMaterialRef.current.uniforms.uBass.value = smoothedBass
    facetsMaterialRef.current.uniforms.uMid.value = smoothedMid
    facetsMaterialRef.current.uniforms.uHigh.value = smoothedHigh
    facetsMaterialRef.current.uniforms.uColorPhase.value = colorPhaseAccum
    facetsMaterialRef.current.uniforms.uPixelRatio.value = state.viewport.dpr

    haloMaterialRef.current.uniforms.uTime.value = time
    haloMaterialRef.current.uniforms.uRotation.value = rotationAccum * 0.6
    haloMaterialRef.current.uniforms.uBass.value = smoothedBass
    haloMaterialRef.current.uniforms.uMid.value = smoothedMid
    haloMaterialRef.current.uniforms.uHigh.value = smoothedHigh
    haloMaterialRef.current.uniforms.uColorPhase.value = colorPhaseAccum
    haloMaterialRef.current.uniforms.uPixelRatio.value = state.viewport.dpr

    if (facetsRef.current) {
      const breathe = 1.0 + Math.sin(time * 0.5) * 0.02 + smoothedBass * 0.03
      facetsRef.current.scale.setScalar(breathe)
      facetsRef.current.rotation.y += clampedDelta * (0.12 + smoothedMid * 0.03)
      facetsRef.current.rotation.x += clampedDelta * (0.008 + smoothedHigh * 0.015)
    }

    if (haloRef.current) {
      haloRef.current.rotation.y += clampedDelta * (0.05 + smoothedBass * 0.08)
      haloRef.current.rotation.z += clampedDelta * (0.02 + smoothedHigh * 0.05)
    }
  })

  return (
    <group position={[0, -0.4, 0]}>
      <mesh renderOrder={0}>
        <sphereGeometry args={[DISCO_CORE_RADIUS, performanceMode ? 42 : 64, performanceMode ? 28 : 48]} />
        <shaderMaterial
          ref={coreMaterialRef}
          args={[DiscoCoreShader]}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <points ref={haloRef} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[halo.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[halo.sizes, 1]} />
          <bufferAttribute attach="attributes-aRandom" args={[halo.randoms, 3]} />
          <bufferAttribute attach="attributes-aColorIdx" args={[halo.colorIdx, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={haloMaterialRef}
          args={[HaloShader]}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <mesh rotation={[Math.PI * 0.5, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={shockwaveMaterialRef}
          args={[DiscoShockwaveShader]}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <points ref={facetsRef} renderOrder={2}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[facets.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[facets.sizes, 1]} />
          <bufferAttribute attach="attributes-aRandom" args={[facets.randoms, 3]} />
          <bufferAttribute attach="attributes-aColorIdx" args={[facets.colorIdx, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={facetsMaterialRef}
          args={[DiscoFacetShader]}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
