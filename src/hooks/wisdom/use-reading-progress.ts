"use client"

import { useCallback, useEffect, useState } from "react"
import type { RefObject } from "react"

export function useReadingProgress(targetRef: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)

  const updateProgress = useCallback(() => {
    if (typeof window === "undefined") return
    const element = targetRef.current
    if (!element) {
      setProgress(0)
      return
    }

    const rect = element.getBoundingClientRect()
    const elementTop = rect.top + window.scrollY
    const elementHeight = rect.height
    const scrollable = elementHeight - window.innerHeight

    if (scrollable <= 0) {
      setProgress(window.scrollY >= elementTop ? 1 : 0)
      return
    }

    const current = (window.scrollY - elementTop) / scrollable
    const clamped = Math.max(0, Math.min(1, current))
    setProgress(clamped)
  }, [targetRef])

  useEffect(() => {
    if (typeof window === "undefined") return

    let rafId: number | null = null

    const handleUpdate = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        updateProgress()
      })
    }

    updateProgress()
    window.addEventListener("scroll", handleUpdate, { passive: true })
    window.addEventListener("resize", handleUpdate)

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      window.removeEventListener("scroll", handleUpdate)
      window.removeEventListener("resize", handleUpdate)
    }
  }, [updateProgress])

  return progress
}
