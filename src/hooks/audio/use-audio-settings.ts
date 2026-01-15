"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "metadj-audio-settings"

interface AudioSettings {
  crossfadeEnabled: boolean
}

const defaultSettings: AudioSettings = {
  crossfadeEnabled: false,
}

export function useAudioSettings() {
  const [settings, setSettings] = useState<AudioSettings>(defaultSettings)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AudioSettings>
        setSettings({ ...defaultSettings, ...parsed })
      }
    } catch {
      // Ignore parse errors
    }
    setIsLoaded(true)
  }, [])

  const setCrossfadeEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, crossfadeEnabled: enabled }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore storage errors
      }
      return next
    })
  }, [])

  return {
    crossfadeEnabled: settings.crossfadeEnabled,
    setCrossfadeEnabled,
    isLoaded,
  }
}
