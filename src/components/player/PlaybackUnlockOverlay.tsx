"use client"

import { useCallback, useEffect, useState } from "react"
import { Play } from "lucide-react"

interface PlaybackUnlockOverlayProps {
  isVisible: boolean
  onUnlock: () => void
  trackTitle?: string
  trackArtist?: string
}

export function PlaybackUnlockOverlay({
  isVisible,
  onUnlock,
  trackTitle = "Track",
  trackArtist = "Artist"
}: PlaybackUnlockOverlayProps) {
  const [isPressed, setIsPressed] = useState(false)
  
  // Prewarm on pointer down for better mobile response
  const handlePointerDown = useCallback(() => {
    setIsPressed(true)
    // Create silent audio context to prewarm on iOS
    // Uses webkitAudioContext for Safari (type declared in types/global.d.ts)
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) {
        const audioContext = new AudioContextClass()
        if (audioContext.state === 'suspended') {
          audioContext.resume()
        }
      }
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    setIsPressed(false)
    onUnlock()
  }, [onUnlock])

  const handlePointerCancel = useCallback(() => {
    setIsPressed(false)
  }, [])

  // Handle tap/click events for fallback
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onUnlock()
  }, [onUnlock])

  // Handle keyboard activation
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        onUnlock()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, onUnlock])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div className="flex flex-col items-center space-y-6 px-6 max-w-sm text-center">
        <div className="flex flex-col items-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Ready to Play
          </h2>
          <p className="text-sm text-muted-foreground">
            {trackTitle} by {trackArtist}
          </p>
        </div>
        
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
          onClick={handleClick}
          className={`
            group relative flex h-20 w-20 items-center justify-center
            rounded-full bg-primary transition-all duration-200
            hover:scale-110 focus-ring-glow
            ${isPressed ? 'scale-95' : ''}
          `}
          aria-label="Tap to enable audio playback"
        >
          <Play 
            className="h-8 w-8 text-primary-foreground ml-1" 
            fill="currentColor"
          />
          
          {/* Pulse animation ring */}
          <span 
            className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30"
            aria-hidden="true"
          />
        </button>
        
        <p className="text-xs text-muted-foreground">
          Tap to enable audio
        </p>
      </div>
    </div>
  )
}
