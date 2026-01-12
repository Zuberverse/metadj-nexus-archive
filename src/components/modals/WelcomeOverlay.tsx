"use client"

import { useEffect, useCallback, useRef, type MouseEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { Music, MonitorPlay, Sparkles } from "lucide-react"
import { useTour } from "@/contexts/TourContext"
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { useFocusTrap } from "@/hooks/use-focus-trap"
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
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Use centralized focus trap hook for accessibility
  useFocusTrap(dialogRef, { enabled: true, autoFocus: false })

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

  // Ensure container starts at top
  useEffect(() => {
    const container = dialogRef.current
    if (!container) return
    container.scrollTop = 0
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
          className="relative w-full rounded-[calc(30px_-_1.5px)] max-h-[85vh] sm:max-h-[92vh] overflow-y-auto overscroll-contain scrollbar-hide modal-content gradient-media touch-pan-y [-webkit-overflow-scrolling:touch]"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
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
                    <span className="text-heading-solid">Nexus</span>
                  </h1>
                </div>

                {/* Subheader */}
                <p
                  className="font-heading font-bold text-base xs:text-lg sm:text-xl text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] text-[oklch(0.75_0.15_220)]"
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
                            <h3 className="font-heading font-bold text-sm xs:text-base text-heading-solid">
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
                    className="group relative px-6 xs:px-8 sm:px-10 py-3 xs:py-3.5 rounded-lg sm:rounded-xl font-heading font-semibold text-sm xs:text-base border-2 border-white/30 bg-white/5 text-white transition-all duration-300 hover:border-white/50 hover:bg-white/10 hover:scale-105 interactive-scale min-h-[44px] min-w-[44px]"
                  >
                    Take Tour
                  </button>

                  {/* Enter Button - Primary CTA */}
                  <button
                    onClick={handleClose}
                    ref={closeButtonRef}
                    className="group relative px-6 xs:px-10 sm:px-14 py-3 xs:py-3.5 sm:py-4 rounded-lg sm:rounded-xl font-heading font-semibold text-sm xs:text-base sm:text-lg neon-glow border border-white/25 bg-linear-to-r from-purple-600 via-indigo-600 to-cyan-600 transition-all duration-300 shadow-xl hover:shadow-purple-500/50 hover:scale-105 hover:brightness-110 interactive-scale min-h-[44px] min-w-[44px]"
                  >
                    <span className="relative z-10">Start Exploring</span>
                    {/* Subtle glow ring animation */}
                    <span
                      className="pointer-events-none absolute inset-0 rounded-lg sm:rounded-xl bg-white/10 animate-ping opacity-20 [animation-duration:2s]"
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="pt-3 text-center text-[11px] sm:text-xs text-muted-accessible">
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
        </div>
      </div>
    </div>
  )
}
