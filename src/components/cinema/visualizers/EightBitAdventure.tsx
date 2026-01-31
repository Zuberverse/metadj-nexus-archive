"use client"

import { useEffect, useRef } from "react"
import {
  // Types
  type IntensityMode,
  type Star,
  type Cloud,
  type Prop,
  type Coin,
  type Enemy,
  type PowerUp,
  type Particle,
  type Slash,
  type Hero,
  type AdventureBackground,
  type CosmicSparkle,
  type ShootingStar,
  // Utilities
  seededRandom,
  lerp,
  clamp01,
  samplePalette,
  mixRgb,
  // Spawners
  createStars,
  createClouds,
  createProps,
  spawnDustBurst,
  spawnSparkBurst,
  createCosmicSparkles,
  spawnCosmicSparkleBurst,
  spawnShootingStar,
  // Draw functions
  drawPixelDisc,
  drawTree,
  drawTower,
  drawSign,
  drawLantern,
  drawCrystal,
  drawShrine,
  drawHero,
  drawEnemy,
  drawCoin,
  drawSlash,
  drawPowerUp,
  drawCosmicSparkle,
  drawShootingStar,
} from "@/lib/visualizers/eight-bit-helpers"

interface EightBitAdventureProps {
  active?: boolean
  bassLevel: number
  midLevel: number
  highLevel: number
  /** Stable seed for track-scoped visual variation. */
  seed?: number
  performanceMode?: boolean
}

function drawEightBitAdventure(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  delta: number,
  bass: number,
  mid: number,
  high: number,
  intensityMode: IntensityMode,
  intensityBoost: number,
  dropPulse: number,
  hero: Hero,
  scrollRef: { current: number },
  stars: Star[],
  clouds: Cloud[],
  props: Prop[],
  coins: Coin[],
  enemies: Enemy[],
  powerUps: PowerUp[],
  slashes: Slash[],
  particles: Particle[],
  cosmicSparkles: CosmicSparkle[],
  shootingStars: ShootingStar[],
  lastBassRef: { current: number },
  lastHighRef: { current: number },
  lastJumpAtRef: { current: number },
  lastSlashAtRef: { current: number },
  lastSpawnAtRef: { current: number },
  lastSparkleBurstRef: { current: number },
  lastShootingStarRef: { current: number },
  skyGlowPulseRef: { current: number },
  background: AdventureBackground | null,
  rng: () => number,
  performanceMode: boolean
) {
  const safeBass = clamp01(bass)
  const safeMid = clamp01(mid)
  const safeHigh = clamp01(high)

  const pixel = performanceMode ? 3 : 2
  const snap = (v: number) => Math.round(v / pixel) * pixel

  const horizonY = height * 0.5
  const groundY = height * 0.78

  // Speed: wider dynamic range — contemplative walk during quiet, intense sprint during peaks
  const worldBoost = intensityMode === "focus" ? 0.85 : intensityMode === "hype" ? 1.12 : 1
  const dynamicMid = Math.pow(safeMid, 1.3)
  const dynamicBass = Math.pow(safeBass, 1.4)
  const speed = (65 + dynamicMid * 165 + dynamicBass * 115) * (performanceMode ? 0.9 : 1) * worldBoost
  scrollRef.current += speed * delta

  // Beat-like bass jump: one clear action per bass rise.
  const lastHitBass = lastBassRef.current
  const hitBass = clamp01(safeBass + dropPulse * 0.22)
  lastBassRef.current = hitBass
  const bassRise = hitBass - lastHitBass
  // Hero is centered horizontally, on the ground
  const heroSpawnX = width * 0.5
  const heroSpawnY = groundY // Ground level for particle spawns

  const jumpThreshold =
    intensityMode === "focus"
      ? 0.68 + safeMid * 0.12
      : intensityMode === "hype"
        ? 0.54 + safeMid * 0.08
        : 0.6 + safeMid * 0.1
  const jumpRise = intensityMode === "focus" ? 0.075 : intensityMode === "hype" ? 0.055 : 0.065
  const jumpCooldown = intensityMode === "focus" ? 0.38 : intensityMode === "hype" ? 0.26 : 0.3
  if (
    hero.onGround &&
    hitBass > jumpThreshold &&
    bassRise > jumpRise &&
    time - lastJumpAtRef.current > jumpCooldown
  ) {
    lastJumpAtRef.current = time
    // Variable jump height based on bass intensity
    const jumpPower = (320 + hitBass * 360 + safeMid * 80) * (0.92 + intensityBoost * 0.08)
    hero.vy = -jumpPower
    hero.onGround = false
    const dustCount = performanceMode
      ? intensityMode === "hype"
        ? 10
        : 8
      : intensityMode === "focus"
        ? 12
        : 14
    spawnDustBurst(particles, heroSpawnX, heroSpawnY, dustCount, rng, (time * 0.06 + safeHigh * 0.2) % 1)
  }

  // High-peek sword slash: clears the lane (purely visual).
  const lastHigh = lastHighRef.current
  lastHighRef.current = safeHigh
  const allowSlash = !performanceMode || intensityMode === "hype"
  const slashThreshold = intensityMode === "hype" ? 0.72 : intensityMode === "focus" ? 0.82 : 0.78
  const slashCooldown = intensityMode === "focus" ? 0.85 : performanceMode ? 0.75 : 0.55
  if (
    allowSlash &&
    safeHigh > slashThreshold &&
    safeHigh - lastHigh > 0.08 &&
    time - lastSlashAtRef.current > slashCooldown
  ) {
    lastSlashAtRef.current = time
    slashes.push({ age: 0, duration: 0.22 + safeHigh * 0.12, power: safeHigh })
    const limit = performanceMode ? 2 : 3
    if (slashes.length > limit) slashes.splice(0, slashes.length - limit)
    // Sparks from the centered hero position
    spawnSparkBurst(
      particles,
      heroSpawnX + pixel * 18,
      heroSpawnY - pixel * 10,
      performanceMode ? 8 : 10,
      rng,
      (0.5 + time * 0.05) % 1
    )
  }

  // Spawn coins and enemies (rate-limited; scroll-world).
  const spawnInterval =
    (performanceMode ? 0.6 : 0.45) *
    (intensityMode === "focus" ? 1.25 : intensityMode === "hype" ? 0.85 : 1)
  if (time - lastSpawnAtRef.current > spawnInterval) {
    lastSpawnAtRef.current = time

    const coinCap = Math.max(
      6,
      Math.round(
        (performanceMode ? 14 : 22) *
        (intensityMode === "focus" ? 0.85 : intensityMode === "hype" ? 1.1 : 1)
      )
    )
    const coinChance = Math.min(
      0.88,
      0.7 * (intensityMode === "focus" ? 0.75 : intensityMode === "hype" ? 1.1 : 1)
    )
    if (coins.length < coinCap && rng() < coinChance) {
      const size = (rng() < 0.85 ? 6 : 8) * pixel
      const baseY = groundY - (14 + rng() * 44)
      coins.push({
        x: width + rng() * width * 0.25,
        y: baseY,
        baseY,
        size,
        phase: rng() * Math.PI * 2,
        tintIdx: rng(),
        age: 0,
      })
    }

    const enemyCap = Math.max(
      1,
      Math.round(
        (performanceMode ? 3 : 6) *
        (intensityMode === "focus" ? 0.6 : intensityMode === "hype" ? 1.2 : 1)
      )
    )
    const enemyChance =
      (0.26 + safeMid * 0.24) *
      (intensityMode === "focus" ? 0.55 : intensityMode === "hype" ? 1.25 : 1)
    if (enemies.length < enemyCap && rng() < enemyChance) {
      const kind = rng() < 0.6 ? "slime" : "bat"
      const size = (kind === "slime" ? 16 : 14) * pixel * (0.8 + rng() * 0.45)
      const baseY = kind === "slime" ? groundY - size : groundY - size * (2.2 + rng() * 1.2)
      enemies.push({
        x: width + rng() * width * 0.35,
        y: baseY,
        baseY,
        vx: -(40 + rng() * 65),
        kind,
        size,
        phase: rng() * Math.PI * 2,
        tintIdx: rng(),
        age: 0,
      })
    }

    if (powerUps.length < 2 && rng() < 0.05) {
      powerUps.push({
        x: width + rng() * width * 0.5,
        y: groundY - pixel * 30,
        baseY: groundY - pixel * 30,
        type: rng() < 0.5 ? "heart" : "star",
        phase: rng() * Math.PI * 2,
        tintIdx: rng(),
      })
    }
  }

  // Pixel Weather - digital rain / falling embers
  const weatherRate = performanceMode ? 0.1 : 0.25
  if (rng() < weatherRate * (0.2 + safeHigh * 0.8)) {
    const isRain = safeMid > 0.5
    particles.push({
      x: rng() * width,
      y: -pixel * 5,
      vx: (rng() - 0.5) * 40,
      vy: isRain ? 400 + rng() * 200 : 100 + rng() * 100,
      size: isRain ? pixel : pixel * 2,
      age: 0,
      duration: 2 + rng() * 2,
      tintIdx: isRain ? 0.4 : 0.8,
      kind: isRain ? "dust" : "spark"
    })
  }

  const particleLimit = performanceMode ? 160 : 280
  if (particles.length > particleLimit) {
    particles.splice(0, particles.length - particleLimit)
  }

  // Cosmic sparkle spawning - continuous upward floaters + bursts on high peaks
  const sparkleLimit = performanceMode ? 12 : 24
  const sparkleCap = Math.max(4, Math.round(sparkleLimit * (intensityMode === "hype" ? 1.2 : 1)))

  // Continuous sparkle spawning
  if (cosmicSparkles.length < sparkleCap && rng() < (performanceMode ? 0.03 : 0.05)) {
    const skyBottom = height * 0.42
    cosmicSparkles.push({
      x: rng() * width,
      y: skyBottom + rng() * height * 0.1,
      vy: -(8 + rng() * 12),
      size: 3 + rng() * 4,
      baseAlpha: 0.3 + rng() * 0.4,
      phase: rng() * Math.PI * 2,
      tintIdx: rng(),
      age: 0,
      duration: 4 + rng() * 6,
    })
  }

  // Burst spawn on high peaks
  const sparkleBurstCooldown = performanceMode ? 2.5 : 1.8
  if (
    safeHigh > 0.7 &&
    safeHigh - lastHighRef.current > 0.12 &&
    time - lastSparkleBurstRef.current > sparkleBurstCooldown
  ) {
    lastSparkleBurstRef.current = time
    const burstCount = performanceMode ? 4 : 8
    spawnCosmicSparkleBurst(cosmicSparkles, width, height, burstCount, rng, (time * 0.1 + safeHigh * 0.3) % 1)
  }

  // Update cosmic sparkles
  for (let i = cosmicSparkles.length - 1; i >= 0; i--) {
    const sparkle = cosmicSparkles[i]
    sparkle.age += delta
    sparkle.y += sparkle.vy * delta

    if (sparkle.age >= sparkle.duration || sparkle.y < -sparkle.size * 3) {
      cosmicSparkles.splice(i, 1)
    }
  }

  // Shooting star spawning - triggered on bass or high peaks with cooldown
  const shootingStarCooldown = performanceMode ? 4.0 : 2.5
  const shootingStarLimit = performanceMode ? 2 : 4
  if (
    shootingStars.length < shootingStarLimit &&
    time - lastShootingStarRef.current > shootingStarCooldown
  ) {
    const shouldSpawn = (
      (safeBass > 0.65 && bassRise > 0.1) ||
      (safeHigh > 0.75 && safeHigh - lastHighRef.current > 0.1)
    )
    if (shouldSpawn) {
      lastShootingStarRef.current = time
      const audioIntensity = Math.max(safeBass, safeHigh)
      spawnShootingStar(shootingStars, width, height, rng, (time * 0.05) % 1, audioIntensity)
    }
  }

  // Update shooting stars
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const star = shootingStars[i]
    star.age += delta
    star.x += star.vx * delta
    star.y += star.vy * delta

    if (star.age >= star.duration || star.x > width * 1.5 || star.y > height) {
      shootingStars.splice(i, 1)
    }
  }

  // Update sky glow pulse - pulses with bass for "breathing" atmosphere
  const targetGlow = safeBass * 0.8 + dropPulse * 0.4
  skyGlowPulseRef.current = lerp(skyGlowPulseRef.current, targetGlow, 0.08)

  // Physics: hero gravity.
  const heroSize = pixel * 16
  const groundTop = groundY - heroSize
  if (!hero.onGround) {
    hero.vy += 980 * delta
    hero.y += hero.vy * delta
    if (hero.y >= groundTop) {
      hero.y = groundTop
      hero.vy = 0
      hero.onGround = true
      spawnDustBurst(
        particles,
        heroSpawnX,
        heroSpawnY,
        performanceMode ? 5 : 9,
        rng,
        (time * 0.08 + safeBass * 0.2) % 1
      )
    }
  } else {
    hero.y = groundTop
  }
  // Run animation: gentle walk during quiet, sprinting during peaks
  hero.runPhase += delta * (6 + dynamicMid * 8.5 + dynamicBass * 4.5)

  // Clear background.
  ctx.globalCompositeOperation = "source-over"
  ctx.fillStyle = "rgb(10, 12, 26)"
  ctx.fillRect(0, 0, width, height)

  if (background?.sky) {
    ctx.fillStyle = background.sky
    ctx.fillRect(0, 0, width, height)
  }
  if (!performanceMode && background?.glow) {
    ctx.fillStyle = background.glow
    ctx.fillRect(0, 0, width, height)
  }

  // Sky glow pulses - breathing cosmic atmosphere that pulses with bass
  const glowIntensity = skyGlowPulseRef.current
  if (glowIntensity > 0.02) {
    const glowTint = samplePalette((time * 0.03 + safeBass * 0.2) % 1)
    const glowAlpha = glowIntensity * (performanceMode ? 0.1 : 0.15)

    // Upper sky glow
    const skyGlowGradient = ctx.createRadialGradient(
      width * 0.5, height * 0.15, 0,
      width * 0.5, height * 0.15, width * 0.6
    )
    skyGlowGradient.addColorStop(0, `rgba(${glowTint[0]}, ${glowTint[1]}, ${glowTint[2]}, ${glowAlpha * 1.5})`)
    skyGlowGradient.addColorStop(0.5, `rgba(${glowTint[0]}, ${glowTint[1]}, ${glowTint[2]}, ${glowAlpha * 0.5})`)
    skyGlowGradient.addColorStop(1, `rgba(10, 14, 31, 0)`)
    ctx.fillStyle = skyGlowGradient
    ctx.fillRect(0, 0, width, height * 0.5)
  }

  const shakeBass = clamp01(safeBass + dropPulse * 0.15)
  const shakeMode = intensityMode === "focus" ? 0.4 : intensityMode === "hype" ? 0.8 : 0.6
  // Reduced shake: higher exponent = only strong bass causes shake, lower multiplier = less intense
  const shake = Math.pow(shakeBass, performanceMode ? 3.2 : 2.8) * (performanceMode ? 1.5 : 2.5) * shakeMode
  // Slower shake frequency for less jarring effect
  // Slower shake frequency for less jarring effect
  const shakeX = Math.sin(time * (18 + safeBass * 10)) * shake
  const shakeY = Math.cos(time * (14 + safeBass * 8)) * shake * 0.8 // Increased vertical shake for impact

  ctx.save()
  ctx.translate(shakeX, shakeY)

  // Stars: subtler during calm, brighter and more alive during peaks
  ctx.globalCompositeOperation = "lighter"
  const dynamicHigh = Math.pow(safeHigh, 1.3)
  const sparkleBoost = (0.55 + dynamicHigh * 1.05) * (0.86 + intensityBoost * 0.2)
  const bassSizePulse = 1 + dynamicBass * 0.5 + dropPulse * 0.35
  for (const star of stars) {
    // Twinkle speed responds more to highs
    const twinkle = Math.sin(time * star.twinkleSpeed * (1 + dynamicHigh * 0.7) + star.phase) * 0.5 + 0.5
    const dramaticTwinkle = Math.pow(twinkle, 0.6)
    const alpha = star.baseAlpha * (0.2 + dramaticTwinkle * 1.2) * sparkleBoost
    if (alpha <= 0.004) continue

    // Color cycling accelerates with energy; cooler at rest, warmer at peaks
    const colorShift = (star.tintIdx + time * (0.04 + dynamicHigh * 0.06) + dynamicHigh * 0.3 + dynamicMid * 0.18) % 1
    const tinted = mixRgb(samplePalette(colorShift), [255, 255, 255], 0.55 + dynamicHigh * 0.12)

    // Size pulsing on bass for prominent stars
    const isProminent = star.size >= 2
    const sizeMult = isProminent ? bassSizePulse : 1
    const starSize = Math.max(pixel, Math.round(star.size * sizeMult / pixel) * pixel)

    ctx.fillStyle = `rgba(${tinted[0]}, ${tinted[1]}, ${tinted[2]}, ${alpha})`
    ctx.fillRect(snap(star.x), snap(star.y), starSize, starSize)

    // Add glow for very prominent stars on high audio
    if (isProminent && safeHigh > 0.4 && alpha > 0.08) {
      ctx.fillStyle = `rgba(${tinted[0]}, ${tinted[1]}, ${tinted[2]}, ${alpha * 0.25})`
      ctx.fillRect(snap(star.x - pixel), snap(star.y - pixel), starSize + pixel * 2, starSize + pixel * 2)
    }
  }

  // Cosmic sparkles - larger, brighter floating particles
  for (const sparkle of cosmicSparkles) {
    drawCosmicSparkle(ctx, sparkle, pixel, time, safeHigh, safeBass)
  }

  // Shooting stars
  for (const star of shootingStars) {
    drawShootingStar(ctx, star, pixel, time)
  }

  ctx.globalCompositeOperation = "source-over"

  // Pixel moon (breathes with bass)
  const moonR = Math.min(width, height) * 0.085 * (1 + safeBass * 0.08 + dropPulse * 0.06)
  const moonX = width * 0.5
  const moonY = height * 0.2 + Math.sin(time * 0.35) * height * 0.01
  drawPixelDisc(ctx, moonX, moonY, moonR, pixel, "rgba(255, 255, 255, 0.38)")
  drawPixelDisc(ctx, moonX, moonY, moonR * 0.72, pixel, "rgba(255, 255, 255, 0.45)")
  drawPixelDisc(ctx, moonX + pixel * 3, moonY - pixel * 2, moonR * 0.22, pixel, "rgba(8, 10, 22, 0.55)")

  // Mountains (8-bit steps).
  const stepW = pixel * 6
  const amp = height * (0.055 + safeMid * 0.045)
  const base = horizonY + height * 0.03

  for (let layer = 0; layer < 2; layer++) {
    const parallax = layer === 0 ? 0.12 : 0.22
    const tint = samplePalette((0.68 + layer * 0.18 + time * 0.02) % 1)
    const alpha = layer === 0 ? 0.26 : 0.38
    ctx.fillStyle = `rgba(${tint[0]}, ${tint[1]}, ${tint[2]}, ${alpha})`

    const wave = (layer === 0 ? 0.0065 : 0.0095) + safeHigh * 0.004
    const local = scrollRef.current * parallax
    for (let x = -stepW; x <= width + stepW; x += stepW) {
      const nx = (x + local) * wave
      const h =
        Math.sin(nx * 1.9 + layer * 3.2) * amp +
        Math.cos(nx * 0.9 + layer * 1.7) * amp * 0.55 +
        Math.sin(nx * 3.4 + time * 0.35) * amp * 0.25
      const y = snap(base - layer * amp * 0.6 - h)
      ctx.fillRect(snap(x), y, stepW, horizonY - y + pixel * 2)
    }
  }

  // Clouds (parallax).
  ctx.globalCompositeOperation = "lighter"
  const cloudSpeed = (0.55 + safeMid * 0.9) * (performanceMode ? 0.9 : 1)
  for (const cloud of clouds) {
    cloud.x -= cloud.speed * delta * cloudSpeed
    const bob = Math.sin(time * 0.55 + cloud.phase) * (performanceMode ? 4 : 6 + safeMid * 4)
    cloud.y = cloud.baseY + bob

    const margin = cloud.w * 1.4
    if (cloud.x < -margin) {
      cloud.x = width + margin
      cloud.baseY = height * (0.08 + rng() * 0.3)
      cloud.y = cloud.baseY
      cloud.tintIdx = rng()
    }

    const [cr, cg, cb] = samplePalette((cloud.tintIdx + time * 0.05 + safeHigh * 0.12) % 1)
    const alpha = 0.03 + safeHigh * 0.06
    const cx = snap(cloud.x)
    const cy = snap(cloud.y)
    const w = Math.max(pixel * 8, snap(cloud.w))
    const h = Math.max(pixel * 3, snap(cloud.h))
    ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`
    ctx.fillRect(cx, cy, w, h)
    ctx.fillRect(cx + pixel * 4, cy - pixel * 2, w - pixel * 8, h)
    ctx.fillRect(cx + pixel * 8, cy + pixel * 2, w - pixel * 16, h - pixel * 2)
  }
  ctx.globalCompositeOperation = "source-over"

  // Ground.
  ctx.fillStyle = "rgb(6, 7, 20)"
  ctx.fillRect(0, snap(groundY), width, height - groundY)

  // Road band (audio-reactive hue).
  const roadY = snap(groundY + pixel * 3)
  const roadH = Math.max(pixel * 12, snap((height - groundY) * 0.55))
  // Road hue: cooler during quiet, warmer/brighter during peaks
  const [rr, rg, rb] = samplePalette((0.14 + time * (0.03 + dynamicMid * 0.04) + dynamicMid * 0.25) % 1)
  ctx.fillStyle = `rgba(${rr}, ${rg}, ${rb}, ${0.08 + dynamicBass * 0.28})`
  ctx.fillRect(0, roadY, width, roadH)

  // Road stripes.
  const stripeW = pixel * 6
  const stripeH = pixel * 2
  const stripeY = roadY + Math.round((roadH * 0.45) / pixel) * pixel
  const stripeOffset = (scrollRef.current * 0.45) % (stripeW * 3)
  ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + safeHigh * 0.2})`
  for (let x = -stripeW * 3; x < width + stripeW * 3; x += stripeW * 3) {
    const sx = snap(x - stripeOffset)
    ctx.fillRect(sx, stripeY, stripeW, stripeH)
  }

  // Foreground Ruins (extreme parallax)
  const ruinW = pixel * 24
  const ruinOffset = (scrollRef.current * 1.6) % (width + ruinW * 4)
  const ruinX = width + ruinW * 2 - ruinOffset
  if (ruinX > -ruinW && ruinX < width + ruinW) {
    const [rr, rg, rb] = samplePalette((0.9 + time * 0.05) % 1)
    ctx.fillStyle = `rgba(${rr}, ${rg}, ${rb}, 0.2)`
    ctx.fillRect(snap(ruinX), snap(groundY - ruinW), ruinW, ruinW)
    ctx.fillRect(snap(ruinX + pixel * 4), snap(groundY - ruinW * 1.5), ruinW * 0.5, ruinW * 0.5)
  }

  // Foreground props with smooth animation.
  ctx.globalCompositeOperation = "lighter"
  for (const prop of props) {
    prop.x -= speed * delta * prop.parallax
    const margin = prop.size * 6
    if (prop.x < -margin) {
      prop.x = width + margin + rng() * width * 0.4
      const kindRoll = rng()
      prop.kind =
        kindRoll < 0.35
          ? "tree"
          : kindRoll < 0.5
            ? "sign"
            : kindRoll < 0.65
              ? "tower"
              : kindRoll < 0.78
                ? "lantern"
                : kindRoll < 0.9
                  ? "crystal"
                  : "shrine"
      prop.size =
        prop.kind === "tower"
          ? 18 + rng() * 20
          : prop.kind === "lantern"
            ? 10 + rng() * 8
            : prop.kind === "crystal"
              ? 12 + rng() * 10
              : prop.kind === "shrine"
                ? 16 + rng() * 12
                : 14 + rng() * 18
      prop.parallax =
        prop.kind === "tower"
          ? 0.35
          : prop.kind === "shrine"
            ? 0.4
            : prop.kind === "tree"
              ? 0.55
              : prop.kind === "crystal"
                ? 0.6
                : prop.kind === "lantern"
                  ? 0.65
                  : 0.7
      prop.bobSpeed =
        prop.kind === "lantern"
          ? 2.5 + rng() * 1.5
          : prop.kind === "crystal"
            ? 1.8 + rng() * 1.2
            : 0.8 + rng() * 0.6
      prop.bobAmount =
        prop.kind === "lantern"
          ? 3 + rng() * 2
          : prop.kind === "crystal"
            ? 2 + rng() * 1.5
            : 0.5 + rng() * 0.5
      prop.tintIdx = rng()
      prop.phase = rng() * Math.PI * 2
    }

    // Smooth bobbing animation for all props
    const bob = Math.sin(time * prop.bobSpeed + prop.phase) * prop.bobAmount * pixel
    const px = snap(prop.x)
    const tint = samplePalette((prop.tintIdx + time * 0.04 + safeHigh * 0.14) % 1)

    if (prop.kind === "tree") {
      drawTree(ctx, px, groundY, prop.size, pixel, tint)
    } else if (prop.kind === "tower") {
      drawTower(ctx, px, groundY, prop.size, pixel, tint, safeMid)
    } else if (prop.kind === "sign") {
      const pulse = Math.sin(time * (2.6 + safeHigh * 2.2) + prop.phase) * 0.5 + 0.5
      drawSign(ctx, px, groundY, prop.size, pixel, tint, pulse)
    } else if (prop.kind === "lantern") {
      drawLantern(ctx, px, groundY + bob, prop.size, pixel, tint, time, safeHigh)
    } else if (prop.kind === "crystal") {
      drawCrystal(ctx, px, groundY + bob, prop.size, pixel, tint, time, safeMid, safeHigh)
    } else if (prop.kind === "shrine") {
      drawShrine(ctx, px, groundY, prop.size, pixel, tint, time, safeBass)
    }
  }
  ctx.globalCompositeOperation = "source-over"

  // Coins
  ctx.globalCompositeOperation = "lighter"
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i]
    coin.age += delta
    coin.x -= speed * delta * 1.05
    coin.y =
      coin.baseY +
      Math.sin(time * (2.2 + safeMid * 1.2) + coin.phase) * (performanceMode ? 5 : 7 + safeHigh * 4)

    if (coin.x < -coin.size * 3) {
      coins.splice(i, 1)
      continue
    }

    // Collect when coin crosses center of screen (visual reward)
    const collectX = width * 0.5
    const dx = coin.x - collectX
    if (dx < pixel * 10 && dx > -pixel * 6) {
      coins.splice(i, 1)
      spawnSparkBurst(
        particles,
        heroSpawnX,
        heroSpawnY,
        performanceMode ? 6 : 10,
        rng,
        (coin.tintIdx + time * 0.1) % 1
      )
      continue
    }

    drawCoin(ctx, coin, pixel, time, safeHigh)
  }
  ctx.globalCompositeOperation = "source-over"

  // Enemies
  ctx.globalCompositeOperation = "lighter"
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i]
    enemy.age += delta
    enemy.x += (enemy.vx - speed) * delta * 1.0
    if (enemy.kind === "bat") {
      enemy.y =
        enemy.baseY +
        Math.sin(enemy.phase + time * (2.1 + safeMid * 2.0)) *
        (performanceMode ? 10 : 14 + safeHigh * 10)
    }

    if (enemy.x < -enemy.size * 4) {
      enemies.splice(i, 1)
      continue
    }

    // Slash clears enemies when they cross center (visual payoff)
    if (slashes.length > 0) {
      const slashX = width * 0.5
      const dx = enemy.x - slashX
      if (Math.abs(dx) < enemy.size * 2) {
        enemies.splice(i, 1)
        spawnSparkBurst(
          particles,
          enemy.x,
          enemy.y,
          performanceMode ? 8 : 14,
          rng,
          (enemy.tintIdx + time * 0.06) % 1
        )
        continue
      }
    }

    drawEnemy(ctx, enemy, pixel, safeHigh)
  }

  // Draw Powerups
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i]
    p.x -= speed * delta
    if (p.x < -pixel * 20) {
      powerUps.splice(i, 1)
      continue
    }
    drawPowerUp(ctx, p, pixel, time)
  }

  ctx.globalCompositeOperation = "source-over"

  // Hero + slashes - centered horizontally, on the ground
  const heroX = width * 0.5
  const heroY = hero.y // Use physics-based position (on ground)
  const isJumping = !hero.onGround
  drawHero(ctx, heroX, heroY, pixel, hero.runPhase, safeBass, safeMid, safeHigh, time, isJumping)

  for (let i = slashes.length - 1; i >= 0; i--) {
    const slash = slashes[i]
    slash.age += delta
    if (slash.age >= slash.duration) {
      slashes.splice(i, 1)
      continue
    }
    drawSlash(ctx, heroX, heroY, slash, pixel)
  }

  // Particles
  ctx.globalCompositeOperation = "lighter"
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.age += delta
    const t = p.duration > 0 ? p.age / p.duration : 1
    if (t >= 1) {
      particles.splice(i, 1)
      continue
    }

    p.x += p.vx * delta
    p.y += p.vy * delta
    p.vy += (p.kind === "dust" ? 260 : 0) * delta

    const fade = (1 - t) * (p.kind === "dust" ? 0.22 : 0.35)
    const [pr, pg, pb] = samplePalette((p.tintIdx + time * 0.08) % 1)
    const size = Math.max(pixel, Math.round(p.size / pixel) * pixel)

    ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${fade})`
    ctx.fillRect(snap(p.x), snap(p.y), size, size)

    // NEW: Core Spark for particles
    if (t < 0.4 || (p.kind === "spark" && fade > 0.15)) {
      ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.9})`
      ctx.fillRect(snap(p.x + pixel * 0.25), snap(p.y + pixel * 0.25), Math.max(pixel, size - pixel), Math.max(pixel, size - pixel))
    }
  }
  ctx.globalCompositeOperation = "source-over"

  ctx.restore()

  if (!performanceMode && background?.vignette) {
    ctx.fillStyle = background.vignette
    ctx.fillRect(0, 0, width, height)
  }

  if (!performanceMode) {
    const scanAlpha = 0.02 + safeHigh * 0.03
    ctx.fillStyle = `rgba(0, 0, 0, ${scanAlpha})`
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1)
    }
  }
}

export function EightBitAdventure({
  active = true,
  bassLevel,
  midLevel,
  highLevel,
  seed,
  performanceMode = false,
}: EightBitAdventureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backgroundRef = useRef<AdventureBackground | null>(null)
  const starsRef = useRef<Star[]>([])
  const cloudsRef = useRef<Cloud[]>([])
  const propsRef = useRef<Prop[]>([])
  const coinsRef = useRef<Coin[]>([])
  const enemiesRef = useRef<Enemy[]>([])
  const powerUpsRef = useRef<PowerUp[]>([])
  const slashesRef = useRef<Slash[]>([])
  const particlesRef = useRef<Particle[]>([])
  const cosmicSparklesRef = useRef<CosmicSparkle[]>([])
  const shootingStarsRef = useRef<ShootingStar[]>([])
  const heroRef = useRef<Hero>({ y: 0, vy: 0, onGround: true, runPhase: 0 })
  const scrollRef = useRef(0)
  const lastBassRef = useRef(0)
  const lastHighRef = useRef(0)
  const lastJumpAtRef = useRef(0)
  const lastSlashAtRef = useRef(0)
  const lastSpawnAtRef = useRef(0)
  const lastSparkleBurstRef = useRef(0)
  const lastShootingStarRef = useRef(0)
  const skyGlowPulseRef = useRef(0)
  const activeRef = useRef(active)
  const rafRef = useRef<number | null>(null)
  const loopRef = useRef<((now: number) => void) | null>(null)
  const sizeRef = useRef({ width: 0, height: 0 })
  const audioRef = useRef({ bass: 0, mid: 0, high: 0 })

  audioRef.current.bass = clamp01(bassLevel)
  audioRef.current.mid = clamp01(midLevel)
  audioRef.current.high = clamp01(highLevel)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Deterministic per-track/per-scene variation without user-facing controls.
    const baseSeed = (seed ?? 0) >>> 0
    const layoutRandom = seededRandom((baseSeed ^ 8027) >>> 0)
    const motionRandom = seededRandom((baseSeed ^ 2113) >>> 0)

    lastBassRef.current = 0
    lastHighRef.current = 0
    lastJumpAtRef.current = 0
    lastSlashAtRef.current = 0
    lastSpawnAtRef.current = 0

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = performanceMode ? 1 : Math.min(2, window.devicePixelRatio || 1)

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false

      sizeRef.current = { width: rect.width, height: rect.height }

      const sky = ctx.createLinearGradient(0, 0, 0, rect.height)
      sky.addColorStop(0, "rgb(12, 12, 36)")
      sky.addColorStop(0.52, "rgb(18, 14, 42)")
      sky.addColorStop(1, "rgb(10, 12, 26)")

      const glow = ctx.createRadialGradient(
        rect.width * 0.5,
        rect.height * 0.2,
        0,
        rect.width * 0.5,
        rect.height * 0.2,
        rect.width * 0.65
      )
      glow.addColorStop(0, "rgba(217, 70, 239, 0.16)")
      glow.addColorStop(0.55, "rgba(6, 182, 212, 0.08)")
      glow.addColorStop(1, "rgba(10, 14, 31, 0)")

      const vignette = ctx.createRadialGradient(
        rect.width * 0.5,
        rect.height * 0.45,
        rect.height * 0.2,
        rect.width * 0.5,
        rect.height * 0.5,
        rect.height
      )
      vignette.addColorStop(0, "rgba(10, 14, 31, 0)")
      vignette.addColorStop(1, "rgba(10, 14, 31, 0.45)")

      backgroundRef.current = { sky, glow, vignette }

      const starDensity = performanceMode ? 21000 : 12500
      const starCount = Math.min(220, Math.max(70, Math.floor((rect.width * rect.height) / starDensity)))
      starsRef.current = createStars(rect.width, rect.height, starCount, layoutRandom)

      const cloudCount = performanceMode
        ? 5
        : Math.min(9, Math.max(6, Math.floor(rect.width / 220)))
      cloudsRef.current = createClouds(rect.width, rect.height, cloudCount, layoutRandom)

      const propCount = performanceMode
        ? Math.min(6, Math.max(4, Math.floor(rect.width / 260)))
        : Math.min(11, Math.max(7, Math.floor(rect.width / 170)))
      propsRef.current = createProps(rect.width, rect.height, propCount, layoutRandom)

      // Reset short-lived state on resize for stability.
      coinsRef.current = []
      enemiesRef.current = []
      powerUpsRef.current = []
      slashesRef.current = []
      particlesRef.current = []
      cosmicSparklesRef.current = []
      shootingStarsRef.current = []
      heroRef.current = {
        y: rect.height * 0.78 - 16 * (performanceMode ? 3 : 2),
        vy: 0,
        onGround: true,
        runPhase: 0,
      }
      scrollRef.current = 0
      lastSparkleBurstRef.current = 0
      lastShootingStarRef.current = 0
      skyGlowPulseRef.current = 0
    }

    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) {
      ro.observe(canvas.parentElement)
    }

    let last = performance.now()
    let time = 0
    let smoothedBass = 0
    let smoothedMid = 0
    let smoothedHigh = 0
    let smoothedEnergy = 0
    let accumulatedEnergy = 0
    let intensityMode: IntensityMode = "standard"
    let intensityHoldUntil = 0
    let beatInterval = 0.55
    let lastBeatAt = 0
    let prevBass = 0
    let dropPulse = 0

    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05)
      last = now
      time += delta

      const { width, height } = sizeRef.current
      if (width > 0 && height > 0) {
        const { bass, mid, high } = audioRef.current

        // Asymmetric smoothing: fast attack (~0.06), slow release (~0.02)
        const bassTarget = Math.pow(clamp01(bass), 1.25)
        const midTarget = clamp01(mid)
        const highTarget = Math.pow(clamp01(high), 1.1)
        smoothedBass = smoothedBass < bassTarget
          ? lerp(smoothedBass, bassTarget, performanceMode ? 0.08 : 0.06)
          : lerp(smoothedBass, bassTarget, performanceMode ? 0.035 : 0.02)
        smoothedMid = smoothedMid < midTarget
          ? lerp(smoothedMid, midTarget, performanceMode ? 0.07 : 0.05)
          : lerp(smoothedMid, midTarget, performanceMode ? 0.03 : 0.022)
        smoothedHigh = smoothedHigh < highTarget
          ? lerp(smoothedHigh, highTarget, performanceMode ? 0.075 : 0.06)
          : lerp(smoothedHigh, highTarget, performanceMode ? 0.035 : 0.02)

        const energy = clamp01(smoothedBass * 0.5 + smoothedMid * 0.3 + smoothedHigh * 0.28)
        smoothedEnergy = lerp(smoothedEnergy, energy, 0.06)
        // Slow-decaying energy accumulator: sustained loud passages feel different
        accumulatedEnergy = accumulatedEnergy + (energy - accumulatedEnergy) * 0.005

        // Automatic intensity mode (no user controls).
        if (time >= intensityHoldUntil) {
          const e = smoothedEnergy
          if (intensityMode === "focus") {
            if (e > 0.34) {
              intensityMode = "standard"
              intensityHoldUntil = time + 1.4
            }
          } else if (intensityMode === "hype") {
            if (e < 0.56) {
              intensityMode = "standard"
              intensityHoldUntil = time + 1.4
            }
          } else {
            if (e < 0.26) {
              intensityMode = "focus"
              intensityHoldUntil = time + 1.6
            } else if (e > 0.68) {
              intensityMode = "hype"
              intensityHoldUntil = time + 1.6
            }
          }
        }

        // Musical arc: accumulated energy nudges intensity up during sustained loud passages
        const baseIntensity = intensityMode === "focus" ? 0.85 : intensityMode === "hype" ? 1.18 : 1
        const intensityBoost = baseIntensity + accumulatedEnergy * 0.1

        // Beat detection (bass rise) to drive "drop" moments (shake/moon/hero aura).
        const bassDelta = bass - prevBass
        prevBass = bass
        const beatCooldown = Math.max(0.26, beatInterval * 0.55)
        const beatThreshold = intensityMode === "focus" ? 0.7 : intensityMode === "hype" ? 0.56 : 0.62
        const beatSlope = intensityMode === "focus" ? 0.085 : 0.07
        if (bass > beatThreshold && bassDelta > beatSlope && time - lastBeatAt > beatCooldown) {
          const dt = time - lastBeatAt
          if (lastBeatAt > 0 && dt > 0.28 && dt < 1.2) {
            beatInterval = lerp(beatInterval, dt, 0.18)
          }
          lastBeatAt = time
          dropPulse = Math.max(dropPulse, bass)
        }
        dropPulse = Math.max(0, dropPulse - delta * 1.7)

        drawEightBitAdventure(
          ctx,
          width,
          height,
          time,
          delta,
          smoothedBass,
          smoothedMid,
          smoothedHigh,
          intensityMode,
          intensityBoost,
          dropPulse,
          heroRef.current,
          scrollRef,
          starsRef.current,
          cloudsRef.current,
          propsRef.current,
          coinsRef.current,
          enemiesRef.current,
          powerUpsRef.current,
          slashesRef.current,
          particlesRef.current,
          cosmicSparklesRef.current,
          shootingStarsRef.current,
          lastBassRef,
          lastHighRef,
          lastJumpAtRef,
          lastSlashAtRef,
          lastSpawnAtRef,
          lastSparkleBurstRef,
          lastShootingStarRef,
          skyGlowPulseRef,
          backgroundRef.current,
          motionRandom,
          performanceMode
        )
      }

      if (!activeRef.current) {
        rafRef.current = null
        return
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    loopRef.current = loop
    if (activeRef.current) {
      rafRef.current = requestAnimationFrame(loop)
    }

    return () => {
      ro.disconnect()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = null
      loopRef.current = null
    }
  }, [performanceMode, seed])

  useEffect(() => {
    if (!active) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    if (rafRef.current !== null) return
    if (!loopRef.current) return

    rafRef.current = requestAnimationFrame(loopRef.current)
  }, [active])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
