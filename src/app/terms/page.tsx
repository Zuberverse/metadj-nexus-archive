"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

export default function TermsPage() {
  const router = useRouter()

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

  return (
    <main className="min-h-screen relative overflow-hidden px-4 py-10 sm:py-16">
      {/* Background - matches app gradient */}
      <div className="fixed inset-0 gradient-1 pointer-events-none" />
      <div className="fixed inset-0 bg-(--bg-overlay)/85 backdrop-blur-sm pointer-events-none" />
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/30 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-900/30 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl space-y-10">
        <header className="space-y-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors group"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to MetaDJ Nexus
          </Link>
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-heading font-bold text-gradient-hero tracking-tight">
              Terms &amp; Conditions
            </h1>
            <p className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-muted-accessible">
              Last updated: 2026‑01‑13
            </p>
          </div>
        </header>

        <div className="space-y-6">
          {/* Intro Card */}
          <div className="glass-radiant p-6 rounded-2xl">
            <h2 className="text-xl font-heading font-semibold text-heading-solid mb-3">
              1. Using MetaDJ Nexus
            </h2>
            <p className="text-white/80 leading-relaxed text-sm sm:text-base">
              By accessing or using MetaDJ Nexus (the &quot;app&quot;), you agree to follow these
              basic terms. If you don&apos;t agree, please don&apos;t use the app.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Public Preview */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                2. Public Preview
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                The app is currently in Public Preview. That means features may change, break,
                or disappear as the platform evolves. Access may be paused for maintenance or
                upgrades.
              </p>
            </div>

            {/* Content & Ownership */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                3. Content &amp; Ownership
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                All music, visuals, Wisdom posts, and brand assets are original works
                by MetaDJ / Zuberant. You&apos;re welcome to listen and explore for personal, non‑commercial purposes.
                Please don&apos;t copy, redistribute, or scrape content without permission.
              </p>
            </div>
          </div>

          {/* MetaDJai Section */}
          <div className="glass-radiant p-6 rounded-2xl border-purple-500/30">
            <h2 className="text-xl font-heading font-semibold text-heading-solid mb-4 flex items-center gap-2">
              4. MetaDJai (AI Companion)
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-white/70 leading-relaxed">
              <p>
                MetaDJai is an AI creative companion. It can summarize, brainstorm, and suggest
                options, but it may be wrong or incomplete. Treat it as a creative aid, not a source
                of professional advice.
              </p>
              <p className="text-muted-accessible text-xs bg-black/20 p-3 rounded-lg border border-white/5">
                To generate responses, MetaDJai sends your chat messages to third‑party AI providers (OpenAI, Anthropic, Google, xAI).
                We don’t store your conversations on our servers; they live locally in your browser. Responses may be cached briefly
                on our servers to improve reliability and speed. Please don’t share sensitive personal information.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Data & Privacy */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                5. Data &amp; Privacy
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                The landing page doesn&apos;t require an account. The full experience currently requires
                a free account during Public Preview. The app may store local preferences in your browser.
                We may collect basic, non‑identifying analytics to understand usage.
              </p>
            </div>

            {/* Third‑Party Links */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                6. Third‑Party Links
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                If the app links to third‑party sites or services, those are outside our control and
                governed by their own terms.
              </p>
            </div>

            {/* No Warranties */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                7. No Warranties
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                The app is provided &quot;as‑is&quot; and &quot;as available.&quot; We don&apos;t make promises about
                uninterrupted access, perfect accuracy, or fitness for a particular purpose.
              </p>
            </div>

            {/* Liability */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                8. Limitation of Liability
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                To the fullest extent allowed by law, MetaDJ / Zuberant won&apos;t be liable for indirect
                or incidental damages arising from use of the app.
              </p>
            </div>
          </div>

          {/* Footer Sections */}
          <div className="glass-radiant p-6 rounded-2xl text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-heading font-semibold text-heading-solid">
                Changes &amp; Contact
              </h2>
              <p className="text-white/60 text-sm max-w-xl mx-auto">
                These terms may evolve as the platform evolves. Continuing to use the app after
                an update means you accept the new version.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-cyan-200/80 text-sm">
                Questions? Use the feedback button in the app or reach out @metadjai
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
