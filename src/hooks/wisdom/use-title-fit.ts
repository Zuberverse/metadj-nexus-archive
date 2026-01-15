"use client"

import { useEffect, useState, useRef, useCallback, useLayoutEffect, type RefObject } from "react"

interface UseTitleFitOptions {
  defaultClass?: string
  shrinkClass?: string
  watch?: string
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
    watch,
  } = options

  const ref = useRef<HTMLElement | null>(null)
  const [shouldShrink, setShouldShrink] = useState(false)

  const checkWrap = useCallback(() => {
    const el = ref.current
    if (!el) return

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!el) return

        const computedStyle = getComputedStyle(el)
        const lineHeight = parseFloat(computedStyle.lineHeight)
        const fontSize = parseFloat(computedStyle.fontSize)
        const effectiveLineHeight = isNaN(lineHeight) ? fontSize * 1.2 : lineHeight

        const isMultiLine = el.scrollHeight > effectiveLineHeight * 1.3

        setShouldShrink(isMultiLine)
      })
    })
  }, [])

  useLayoutEffect(() => {
    checkWrap()
  }, [watch, checkWrap])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleFontsLoaded = () => {
      checkWrap()
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(handleFontsLoaded)
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
