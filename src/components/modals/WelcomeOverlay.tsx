"use client"

import { useState, useEffect, useCallback, useRef, type MouseEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { Music, MonitorPlay, Sparkles, ChevronDown } from "lucide-react"
import { useTour } from "@/contexts/TourContext"
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { trackEvent } from "@/lib/analytics"
import {
  METADJNEXUS_WELCOME_TAGLINE,
  METADJNEXUS_WELCOME_PARAGRAPHS,
  METADJNEXUS_PREVIEW_NOTICE,
  METADJNEXUS_FEATURE_CARDS,
} from "@/lib/content/meta-dj-nexus-welcome-copy"

interface WelcomeOverlayProps {
  onClose: () => void
}
export function WelcomeOverlay({ onClose }: WelcomeOverlayProps) {
  const { startTour } = useTour()
  const [showScrollIndicator, setShowScrollIndicator] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const focusableElementsRef = useRef<HTMLElement[]>([])

  const handleClose = useCallback((e?: MouseEvent | KeyboardEvent) => {
    e?.stopPropagation()

    trackEvent("welcome_dismissed")

    onClose()
  }, [onClose])

  const handleOpenGuide = useCallback(() => {
    trackEvent('user_guide_opened', {
      source: 'welcome_overlay'
    })

    onClose()
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("metadj:openUserGuide"))
    }, 100)
  }, [onClose])

  useBodyScrollLock(true)

  // Ensure container starts at top and check if content overflows
  useEffect(() => {
    const container = dialogRef.current
    if (!container) return

    // Reset scroll position to top on mount
    container.scrollTop = 0

    const checkOverflow = () => {
      const hasOverflow = container.scrollHeight > container.clientHeight
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50
      setShowScrollIndicator(hasOverflow && !isNearBottom)
    }

    // Initial check after content renders
    const timeoutId = setTimeout(checkOverflow, 100)

    // Update on scroll
    container.addEventListener('scroll', checkOverflow, { passive: true })

    // Update on resize
    const resizeObserver = new ResizeObserver(checkOverflow)
    resizeObserver.observe(container)

    return () => {
      clearTimeout(timeoutId)
      container.removeEventListener('scroll', checkOverflow)
      resizeObserver.disconnect()
    }
  }, [])

  // Save previously focused element for restoration
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])

  // Focus management - focus the close button initially without scrolling
  useEffect(() => {
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus({ preventScroll: true })
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // Focus trap implementation
  useEffect(() => {
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable) {
      focusableElementsRef.current = Array.from(focusable)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const elements = focusableElementsRef.current
      if (elements.length === 0) return

      const firstElement = elements[0]
      const lastElement = elements[elements.length - 1]
      const currentIndex = elements.indexOf(document.activeElement as HTMLElement)

      e.preventDefault()

      if (e.shiftKey) {
        if (currentIndex === 0 || currentIndex === -1) {
          lastElement.focus()
        } else {
          elements[currentIndex - 1]?.focus()
        }
      } else {
        if (currentIndex === elements.length - 1 || currentIndex === -1) {
          firstElement.focus()
        } else {
          elements[currentIndex + 1]?.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  // Handle ESC to close overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Blur active element to prevent focus ring on trigger button
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        handleClose(e)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleClose])

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center overflow-hidden modal-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-heading"
      aria-describedby="welcome-description"
    >
      <div className="pointer-events-none fixed inset-0 gradient-1 opacity-95" />
      <div className="pointer-events-none fixed inset-0 bg-(--bg-overlay)/82 backdrop-blur-3xl" />
      {/* Gradient border container */}
      <div className="relative w-full max-w-[calc(100vw-1.5rem)] xs:max-w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-3 xs:mx-4 sm:mx-6 rounded-[30px] p-[1.5px] gradient-2-border overflow-hidden shadow-[0_35px_90px_rgba(5,8,20,0.65)]">
        <div
          ref={dialogRef}
          className="relative w-full rounded-[calc(30px_-_1.5px)] max-h-[85vh] sm:max-h-[92vh] overflow-y-auto overscroll-contain scrollbar-hide modal-content gradient-media touch-pan-y"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          <div className="relative min-h-full p-3 xs:p-4 sm:p-6 md:p-8">
            <div className="pointer-events-none absolute inset-0 gradient-media-bloom opacity-70" aria-hidden />
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-linear-to-b from-white/15 via-transparent to-transparent opacity-60" aria-hidden />
            <div className="relative z-10">
              {/* Content */}
              <div className="text-center space-y-3 xs:space-y-4 sm:space-y-6">
                {/* Welcome to MetaDJ Nexus */}
                <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                  <h1
                    id="welcome-heading"
                    className="flex items-center gap-1 sm:gap-2 text-xl xs:text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-pop"
                  >
                    <span className="text-white">Welcome to</span>
                    <span className="sr-only">MetaDJ</span>
                    <span aria-hidden="true" className="relative flex items-center h-7 xs:h-8 sm:h-10 md:h-12 w-[70px] xs:w-[80px] sm:w-[100px] md:w-[120px]">
                      <Image
                        src="/images/metadj-logo-wordmark.png"
                        alt=""
                        fill
                        sizes="(max-width: 475px) 70px, (max-width: 640px) 80px, (max-width: 768px) 100px, 120px"
                        priority
                        className="object-contain object-left drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      />
                    </span>
                    <span className="text-gradient-hero">Nexus</span>
                  </h1>
                </div>

                {/* Subheader */}
                <p
                  className="font-heading font-bold text-base xs:text-lg sm:text-xl text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                  style={{ color: "oklch(0.75 0.15 220)" }}
                >
                  {METADJNEXUS_WELCOME_TAGLINE}
                </p>

                {/* Welcome message */}
                <div className="space-y-4 xs:space-y-5 sm:space-y-6">
                  <div className="space-y-2 text-left text-white/85 text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
                    {METADJNEXUS_WELCOME_PARAGRAPHS.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 xs:gap-3 sm:gap-4 max-w-4xl mx-auto pt-1 xs:pt-2">
                    {METADJNEXUS_FEATURE_CARDS.map((card) => {
                      const Icon =
                        card.key === "music" ? Music : card.key === "visuals" ? MonitorPlay : Sparkles

                      return (
                        <div
                          key={card.key}
                          className="glass-radiant-sm rounded-xl p-3 xs:p-3.5 sm:p-4 text-left"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <Icon className="w-4 h-4 xs:w-5 xs:h-5 text-purple-400 drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]" />
                            <h3 className="font-heading font-bold text-sm xs:text-base text-gradient-hero drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]">
                              {card.title}
                            </h3>
                          </div>
                          <p
                            id={card.key === "music" ? "welcome-description" : undefined}
                            className="text-xs xs:text-sm text-white/85 leading-relaxed text-left"
                          >
                            {card.description}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-white/60 max-w-3xl mx-auto">
                  Need the quick map?{" "}
                  <button
                    type="button"
                    onClick={handleOpenGuide}
                    className="underline underline-offset-2 decoration-white/40 hover:decoration-white hover:text-white transition-colors"
                  >
                    Open the User Guide
                  </button>
                  .
                </p>

                {/* Public Preview Notice */}
                <div className="relative rounded-xl p-3 xs:p-4 text-left overflow-hidden border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-2xl max-w-3xl mx-auto">
                  <div className="relative z-10 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" aria-hidden="true" />
                      <span className="font-heading font-semibold text-sm text-cyan-200">
                        {METADJNEXUS_PREVIEW_NOTICE.title}
                      </span>
                    </div>
                    <p className="text-xs xs:text-sm text-white/75 leading-relaxed">
                      {METADJNEXUS_PREVIEW_NOTICE.description}
                    </p>
                  </div>
                </div>

                {/* CTA Buttons - WCAG-compliant touch targets (44px minimum) */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
                  {/* Interactive Tour Button */}
                  <button
                    type="button"
                    onClick={startTour}
                    className="group relative px-6 xs:px-8 sm:px-10 py-3 xs:py-3.5 rounded-lg sm:rounded-xl font-heading font-semibold text-sm xs:text-base border-2 border-white/30 bg-white/5 text-white transition-all duration-300 hover:border-white/50 hover:bg-white/10 hover:scale-105 interactive-scale"
                    style={{ minHeight: '44px', minWidth: '44px' }}
                  >
                    Take Tour
                  </button>

                  {/* Enter Button - Primary CTA */}
                  <button
                    onClick={handleClose}
                    ref={closeButtonRef}
                    className="group relative px-6 xs:px-10 sm:px-14 py-3 xs:py-3.5 sm:py-4 rounded-lg sm:rounded-xl font-heading font-semibold text-sm xs:text-base sm:text-lg neon-glow border border-white/25 bg-linear-to-r from-purple-600 via-indigo-600 to-cyan-600 transition-all duration-300 shadow-xl hover:shadow-purple-500/50 hover:scale-105 hover:brightness-110 interactive-scale"
                    style={{ minHeight: '44px', minWidth: '44px' }}
                  >
                    <span className="relative z-10">Start Exploring</span>
                    {/* Subtle glow ring animation */}
                    <span
                      className="pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl bg-white/10 animate-ping opacity-20"
                      style={{ animationDuration: '2s' }}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="pt-3 text-center text-[11px] sm:text-xs text-white/55">
                  <Link
                    href="/terms"
                    onClick={(e) => handleClose(e)}
                    className="underline underline-offset-2 decoration-white/30 hover:decoration-white hover:text-white transition-colors"
                  >
                    Terms &amp; Conditions
                  </Link>
                </div>

              </div>
            </div>
          </div>

          {/* Scroll indicator - shows when content overflows */}
          {showScrollIndicator && (
            <>
              {/* Gradient fade to hint at more content */}
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 via-black/30 to-transparent z-10"
                aria-hidden="true"
              />
              {/* Scroll hint (non-interactive) */}
              <div
                className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5"
                aria-hidden="true"
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-medium">
                  Scroll
                </span>
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full border border-white/30 bg-gradient-to-br from-purple-600/80 via-indigo-600/80 to-cyan-600/80 backdrop-blur-sm shadow-lg shadow-purple-500/30">
                  <ChevronDown className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
