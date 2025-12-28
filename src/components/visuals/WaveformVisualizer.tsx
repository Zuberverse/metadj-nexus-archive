"use client"

/**
 * Waveform Visualizer Component
 *
 * Real-time audio waveform visualization synchronized with playback.
 * Uses Canvas API for 60fps performance with glassmorphism aesthetic.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';

interface WaveformVisualizerProps {
  /** Audio element reference for analysis */
  audioRef: React.RefObject<HTMLAudioElement>;
  /** Current playback time in seconds */
  currentTime: number;
  /** Track duration in seconds */
  duration: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Canvas height in pixels */
  height?: number;
  /** Optional CSS class */
  className?: string;
  /** Bar color (default: MetaDJ purple) */
  barColor?: string;
  /** Progress bar color (default: MetaDJ cyan) */
  progressColor?: string;
}

function WaveformVisualizer({
  audioRef,
  currentTime,
  duration,
  isPlaying,
  height = 80,
  className = '',
  barColor = 'oklch(0.646 0.222 264.376)', // MetaDJ purple
  progressColor = 'oklch(0.6 0.118 184.704)' // MetaDJ cyan
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const particlesRef = useRef<{ x: number, y: number, vx: number, vy: number, alpha: number, color: string }[]>([]);

  // Lazy initialization to check Web Audio API support without causing render loop
  // Uses webkitAudioContext for Safari (type declared in types/global.d.ts)
  const [supportsWebAudio, setSupportsWebAudio] = useState(() => {
    if (typeof window === 'undefined') return false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    return Boolean(AudioContextClass);
  });

  // Initialize Web Audio API
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || typeof window === 'undefined' || !supportsWebAudio) return;

    let mounted = true;

    try {
      // Resume audio context if suspended (required by some browsers)
      const audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        void audioContext.resume();
      }
      const analyzer = audioContext.createAnalyser();

      // Configure analyzer for smooth, responsive visualization
      analyzer.fftSize = 256; // Higher = more detailed, lower = more performant
      analyzer.smoothingTimeConstant = 0.8; // Smooth transitions
      analyzer.minDecibels = -90;
      analyzer.maxDecibels = -10;

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;

      // Create media source and connect to analyzer
      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyzer);
      analyzer.connect(audioContext.destination);

      analyzerRef.current = analyzer;
      dataArrayRef.current = dataArray;

      return () => {
        mounted = false;
        // Cleanup
        source.disconnect();
        analyzer.disconnect();
        audioContext.close();
      };
    } catch (error) {
      // Web Audio API initialization failed - visualizer will fall back to static waveform
      // Error details available in browser console if needed
      return undefined
    }
  }, [audioRef, supportsWebAudio]);

  // Helper function to draw static waveform when paused
  const drawStaticWaveform = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    current: number,
    total: number,
    bar: string,
    progress: string
  ) => {
    ctx.clearRect(0, 0, width, height);

    const barCount = 60;
    const barWidth = width / barCount;
    const progressX = (current / total) * width;

    // Draw static bars with varying heights for visual interest
    for (let i = 0; i < barCount; i++) {
      const x = i * barWidth;
      // Use sine wave for pleasing static pattern
      const heightFactor = 0.3 + (Math.sin(i * 0.5) + 1) * 0.35;
      const barHeight = height * heightFactor;
      const isPastProgress = x < progressX;

      const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);

      if (isPastProgress) {
        gradient.addColorStop(0, progress + ' / 0.6');
        gradient.addColorStop(1, progress + ' / 0.2');
      } else {
        gradient.addColorStop(0, bar + ' / 0.5');
        gradient.addColorStop(1, bar + ' / 0.2');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
    }

    // Progress indicator
    ctx.strokeStyle = progress;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();
  }, []);

  // Render waveform visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    const analyzer = analyzerRef.current;
    const dataArray = dataArrayRef.current;

    if (!canvas || !analyzer || !dataArray || !supportsWebAudio) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Set canvas size for crisp rendering
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      if (!isPlaying) {
        // Draw static waveform when paused
        drawStaticWaveform(ctx, rect.width, rect.height, currentTime, duration, barColor, progressColor);
        return;
      }

      // Get frequency data
      analyzer.getByteFrequencyData(dataArray);

      // Clear canvas with subtle transparency for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      const barWidth = rect.width / dataArray.length;
      const progressX = (currentTime / duration) * rect.width;

      // Draw frequency bars and reflections
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i];
        const barHeight = (value / 255) * (rect.height * 0.65); // Scale down to leave room for reflection
        const x = i * barWidth;

        const isPastProgress = x < progressX;
        const color = isPastProgress ? progressColor : barColor;

        // Main bar gradient
        const gradient = ctx.createLinearGradient(0, rect.height * 0.7 - barHeight, 0, rect.height * 0.7);
        gradient.addColorStop(0, color + ' / 0.9');
        gradient.addColorStop(1, color + ' / 0.3');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, rect.height * 0.7 - barHeight, barWidth - 1, barHeight);

        // Reflection (mirrored)
        const reflectionHeight = barHeight * 0.4;
        const reflectionGradient = ctx.createLinearGradient(0, rect.height * 0.7, 0, rect.height * 0.7 + reflectionHeight);
        reflectionGradient.addColorStop(0, color + ' / 0.3');
        reflectionGradient.addColorStop(1, color + ' / 0');

        ctx.fillStyle = reflectionGradient;
        ctx.fillRect(x, rect.height * 0.7, barWidth - 1, reflectionHeight);

        // Particle Spawning
        if (value > 210 && Math.random() > 0.85) {
          particlesRef.current.push({
            x: x + barWidth / 2,
            y: rect.height * 0.7 - barHeight,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -Math.random() * 2 - 1,
            alpha: 1,
            color: color
          });
        }
      }

      // Update and Draw Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        p.vy += 0.05; // gravity

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color + ` / ${p.alpha}`;
        ctx.fillRect(p.x, p.y, 2, 2);
      }

      // Draw progress indicator line
      ctx.strokeStyle = progressColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, rect.height);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, duration, barColor, progressColor, supportsWebAudio, drawStaticWaveform]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Force re-render on resize
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!supportsWebAudio) {
    // Fallback: simple progress bar if Web Audio API not supported
    return (
      <div
        className={`relative w-full bg-black/20 backdrop-blur-xs border border-white/10 rounded-lg overflow-hidden ${className}`}
        style={{ height }}
      >
        <div
          className="absolute inset-y-0 left-0 bg-linear-to-r from-metadj-cyan/40 to-metadj-purple/40 transition-all duration-300"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
          Audio visualization not supported
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-lg ${className}`}
      style={{
        height,
        imageRendering: 'crisp-edges'
      }}
      role="img"
      aria-label={`Audio waveform visualization - ${Math.floor((currentTime / duration) * 100)}% played`}
    />
  );
}

// Memoize WaveformVisualizer to prevent unnecessary re-renders on 60fps canvas updates
const MemoizedWaveformVisualizer = memo(WaveformVisualizer)
export { MemoizedWaveformVisualizer as WaveformVisualizer }
