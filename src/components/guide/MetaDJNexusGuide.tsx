"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import { ArrowLeft, Sparkles } from "lucide-react"
import { GuideContent, NAV_ICONS, GUIDE_NAV_SECTIONS } from "@/components/guide"

/**
 * MetaDJNexusGuide - Full page user guide for MetaDJ Nexus
 *
 * This is a thin wrapper around the shared GuideContent component.
 * Renders as a standalone page at /guide with:
 * - Sticky header with back button and navigation
 * - Full window scrolling
 * - Link-based navigation back to app
 */
export function MetaDJNexusGuide() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string>("quick-start")
  const navRef = useRef<HTMLDivElement>(null)

  // Handle smooth scroll to section
  const scrollToSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId)
    if (section) {
      const offset = 120
      const top = section.offsetTop - offset
      window.scrollTo({ top, behavior: "smooth" })
      setActiveSection(sectionId)
    }
  }, [])

  // ESC key to navigate back to home
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Blur active element to prevent focus ring on trigger button
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        router.push("/")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router])

  // Track active section on scroll
  useEffect(() => {
    let ticking = false
    let lastActiveSection = activeSection

    const handleScroll = () => {
      if (ticking) return
      ticking = true

      requestAnimationFrame(() => {
        const scrollPosition = window.scrollY + 150

        for (const section of GUIDE_NAV_SECTIONS) {
          const element = document.getElementById(section.id)
          if (element) {
            const { offsetTop, offsetHeight } = element
            if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
              if (lastActiveSection !== section.id) {
                lastActiveSection = section.id
                setActiveSection(section.id)
              }
              break
            }
          }
        }
        ticking = false
      })
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [activeSection])

  // MetaDJai lives in the main experience shell, not on /guide.
  // Route back to the app and request MetaDJai to open.
  const handleAskMetaDJai = useCallback(() => {
    try {
      sessionStorage.setItem("metadj_request_open_metadjai", "true")
    } catch {
      // ignore storage errors
    }
    router.push("/", { scroll: false })
  }, [router])

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="pointer-events-none fixed inset-0 gradient-1 opacity-95" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 bg-(--bg-overlay)/92 backdrop-blur-3xl" aria-hidden="true" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Sticky Header with Navigation */}
        <div className="sticky top-0 z-50 bg-(--bg-overlay)/80 backdrop-blur-xl border-b border-white/10 will-change-transform">
          <div className="max-w-5xl mx-auto px-4 py-3">
            {/* Top row: Back button and Ask MetaDJai */}
            <div className="flex items-center justify-between mb-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-white/70 hover:text-white transition text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to MetaDJ Nexus</span>
                <span className="sm:hidden">Back</span>
              </Link>

            <button
              type="button"
              onClick={handleAskMetaDJai}
              className="inline-flex items-center gap-2 rounded-full gradient-2-tint border border-purple-500/30 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:brightness-110 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.25)] focus-ring-glow"
            >
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Ask MetaDJai</span>
            </button>
          </div>

            {/* Navigation Pills */}
            <div
              ref={navRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
            >
              {GUIDE_NAV_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={clsx(
                    "flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
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
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <GuideContent
              isModal={false}
              headerContent={
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-gradient-hero">
                  User Guide
                </h1>
              }
              onAskMetaDJai={handleAskMetaDJai}
            />
        </div>
      </div>
      </div>
    </div>
  )
}
