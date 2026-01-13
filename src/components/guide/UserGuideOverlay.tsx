"use client"

import { useEffect, useCallback, useRef, useState, useMemo, type MouseEvent } from "react"
import clsx from "clsx"
import { X, Sparkles, ChevronDown } from "lucide-react"
import { GuideContent, NAV_ICONS, GUIDE_NAV_SECTIONS } from "@/components/guide"
import { useTour } from "@/contexts/TourContext"
import { useUI } from "@/contexts/UIContext"
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { useFocusTrap } from "@/hooks/use-focus-trap"
import { BREAKPOINTS } from "@/lib/app.constants"

interface UserGuideOverlayProps {
  onClose: () => void
}

export function UserGuideOverlay({ onClose }: UserGuideOverlayProps) {
  const { panels, toggleRightPanel, setMetaDjAiOpen, setInfoOpen } = useUI()
  const { startTour } = useTour()
  const [activeSection, setActiveSection] = useState<string>("quick-start")
  const [isNavDropdownOpen, setIsNavDropdownOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const dialogWrapperRef = useRef<HTMLDivElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const navDropdownRef = useRef<HTMLDivElement>(null)

  useFocusTrap(dialogWrapperRef)
  useBodyScrollLock(true)

  // Detect desktop for tour availability messaging
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= BREAKPOINTS.DESKTOP_PANELS)
    checkDesktop()
    window.addEventListener("resize", checkDesktop)
    return () => window.removeEventListener("resize", checkDesktop)
  }, [])

  const handleClose = useCallback((e?: MouseEvent | KeyboardEvent) => {
    e?.stopPropagation()
    onClose()
  }, [onClose])

  const handleAskMetaDJai = useCallback(() => {
    onClose()
    setInfoOpen(false)
    setTimeout(() => {
      if (!panels.right.isOpen) {
        toggleRightPanel()
      }
      setMetaDjAiOpen(true)
    }, 200)
  }, [onClose, panels.right.isOpen, toggleRightPanel, setMetaDjAiOpen, setInfoOpen])

  const scrollToSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId)
    const container = contentRef.current
    if (section && container) {
      const offset = 80
      const top = section.offsetTop - offset
      const prefersReducedMotion = typeof window !== "undefined"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth"
      container.scrollTo({ top, behavior })
      setActiveSection(sectionId)
      setIsNavDropdownOpen(false)
    }
  }, [])

  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollPosition = container.scrollTop + 100

      for (const section of GUIDE_NAV_SECTIONS) {
        const element = document.getElementById(section.id)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  // Force scroll to top on mount to override browser scroll restoration
  useEffect(() => {
    if (contentRef.current) {
      // Use requestAnimationFrame to ensure this happens after layout/paint
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = 0
        }
      })
    }
  }, [])

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusTarget = dialogRef.current ?? closeButtonRef.current
    focusTarget?.focus()

    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Blur active element to prevent focus ring on trigger button
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        handleClose()
      }
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [handleClose])

  useEffect(() => {
    if (!isNavDropdownOpen) return

    const handleClickOutside = (event: Event) => {
      if (navDropdownRef.current && !navDropdownRef.current.contains(event.target as Node)) {
        setIsNavDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isNavDropdownOpen])

  const activeSectionData = GUIDE_NAV_SECTIONS.find((s) => s.id === activeSection) || GUIDE_NAV_SECTIONS[0]

  return (
    <div className="fixed inset-0 z-100">
      <div className="pointer-events-none absolute inset-0 gradient-1 opacity-95" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-(--bg-overlay)/92 backdrop-blur-3xl" aria-hidden="true" />

      <div
        ref={dialogWrapperRef}
        className="relative z-10 flex h-full flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-guide-heading"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            handleClose()
          }
        }}
      >
        <div className="sticky top-0 z-50 bg-(--bg-overlay)/80 backdrop-blur-xl border-b border-white/10">
          <div className="w-full px-3 sm:px-6 py-3">
            <div className="relative flex items-center justify-between gap-2">
              <div className="hidden lg:flex gap-1 flex-wrap justify-center flex-1">
                {GUIDE_NAV_SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-all duration-200 whitespace-nowrap",
                      activeSection === section.id
                        ? "bg-purple-500/20 text-purple-200 border border-purple-500/40"
                        : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
                    )}
                  >
                    {NAV_ICONS[section.id]}
                    <span>{section.title}</span>
                  </button>
                ))}
              </div>

              <div className="lg:hidden relative" ref={navDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsNavDropdownOpen(!isNavDropdownOpen)}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium bg-purple-500/20 text-purple-200 border border-purple-500/40 transition-all duration-200"
                  aria-expanded={isNavDropdownOpen}
                  aria-haspopup="listbox"
                >
                  {NAV_ICONS[activeSectionData.id]}
                  <span>{activeSectionData.title}</span>
                  <ChevronDown className={clsx("h-3 w-3 transition-transform", isNavDropdownOpen && "rotate-180")} />
                </button>

                {isNavDropdownOpen && (
                  <div
                    className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-white/20 bg-(--bg-surface-elevated)/95 backdrop-blur-xl shadow-xl shadow-black/50 overflow-hidden z-50"
                    role="listbox"
                    aria-label="Jump to section"
                  >
                    {GUIDE_NAV_SECTIONS.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        role="option"
                        aria-selected={activeSection === section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={clsx(
                          "w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all duration-200 text-sm",
                          activeSection === section.id
                            ? "bg-purple-500/20 text-purple-200"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {NAV_ICONS[section.id]}
                        <span>{section.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleAskMetaDJai}
                  className="hidden sm:inline-flex items-center gap-2 rounded-full gradient-2-tint border border-purple-500/30 px-3 py-1.5 text-xs font-medium text-white transition-all duration-300 hover:brightness-110 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] focus-ring-glow whitespace-nowrap"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  <span>Ask MetaDJai</span>
                </button>

                <button
                  type="button"
                  onClick={handleAskMetaDJai}
                  className="sm:hidden inline-flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] rounded-full gradient-2-tint border border-purple-500/30 text-purple-400 transition-all duration-300 hover:brightness-110 touch-manipulation"
                  aria-label="Ask MetaDJai"
                >
                  <Sparkles className="h-4 w-4" />
                </button>

                {isDesktop && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose()
                      startTour()
                    }}
                    className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-white transition-all duration-300 hover:bg-white/10 hover:border-white/20 whitespace-nowrap"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    <span>Start Tour</span>
                  </button>
                )}

                <button
                  ref={closeButtonRef}
                  onClick={handleClose}
                  className="inline-flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] rounded-full text-white/60 hover:text-white hover:bg-white/10 transition touch-manipulation"
                  aria-label="Close guide"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-4 sm:px-6 py-8 [-webkit-overflow-scrolling:touch]"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={dialogRef}
            className="max-w-5xl mx-auto"
            tabIndex={-1}
          >
            <GuideContent
              scrollContainerRef={contentRef}
              isModal={true}
              headerContent={
                <h1
                  id="user-guide-heading"
                  className="text-3xl md:text-4xl font-heading font-bold text-gradient-hero"
                >
                  User Guide
                </h1>
              }
              onAskMetaDJai={handleAskMetaDJai}
              footerContent={
                <div className="text-center pb-12">
                  <button
                    onClick={handleClose}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-heading font-semibold text-base brand-gradient neon-glow text-white transition-all duration-150 hover:scale-105 border border-white/25"
                  >
                    Back to the Experience
                  </button>
                  <div className="mt-6 flex justify-center">
                    {isDesktop ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          startTour();
                        }}
                        className="text-sm font-medium text-purple-300 hover:text-white transition-colors border-b border-purple-500/30 hover:border-white/50"
                      >
                        Start Interactive Tour
                      </button>
                    ) : (
                      <p className="text-sm text-muted-accessible">
                        Interactive tour available on desktop
                      </p>
                    )}
                  </div>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
