"use client"

import { useEffect, useState, useRef, useCallback, type RefObject } from "react"

interface UseTitleFitOptions {
  defaultClass?: string
  shrinkClass?: string
}

export function useTitleFit(
  options: UseTitleFitOptions = {}
): {
  ref: RefObject<HTMLElement | null>
  titleClass: string
} {
  const {
    defaultClass = "text-3xl sm:text-4xl md:text-5xl",
    shrinkClass = "text-2xl sm:text-3xl md:text-4xl",
  } = options

  const ref = useRef<HTMLElement | null>(null)
  const [shouldShrink, setShouldShrink] = useState(false)
  const measurementRef = useRef<boolean>(false)

  const checkWrap = useCallback(() => {
    const el = ref.current
    if (!el) return

    if (measurementRef.current) return
    measurementRef.current = true

    requestAnimationFrame(() => {
      if (!el) {
        measurementRef.current = false
        return
      }

      const range = document.createRange()
      range.selectNodeContents(el)
      const rects = range.getClientRects()
      const isMultiLine = rects.length > 1

      setShouldShrink(isMultiLine)
      measurementRef.current = false
    })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleFontsLoaded = () => {
      checkWrap()
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(handleFontsLoaded)
    } else {
      checkWrap()
    }

    const resizeObserver = new ResizeObserver(() => {
      checkWrap()
    })

    resizeObserver.observe(el)

    return () => {
      resizeObserver.disconnect()
    }
  }, [checkWrap])

  return {
    ref,
    titleClass: shouldShrink ? shrinkClass : defaultClass,
  }
}
