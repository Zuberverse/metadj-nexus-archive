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
              Last updated: 2026-01-14
            </p>
            <p className="text-xs text-white/60 max-w-xl mx-auto">
              Baseline terms for Public Preview. These will be reviewed and refined as the platform evolves.
            </p>
          </div>
        </header>

        <div className="space-y-6">
          {/* Intro Card */}
          <div className="glass-radiant p-6 rounded-2xl">
            <h2 className="text-xl font-heading font-semibold text-heading-solid mb-3">
              1. Agreement &amp; Scope
            </h2>
            <p className="text-white/80 leading-relaxed text-sm sm:text-base">
              By accessing or using MetaDJ Nexus (the &quot;app&quot;), you agree to these Terms.
              If you do not agree, do not use the app. These Terms apply to the website,
              the app experience, and related services.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Account & Access */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                2. Account &amp; Access
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                The landing page is public, but the full experience requires a free account.
                You are responsible for keeping your login credentials secure and for all activity
                under your account. You must be old enough to form a binding agreement where you live,
                or have permission from a parent or guardian.
              </p>
            </div>

            {/* Public Preview */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                3. Public Preview
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                The app is in Public Preview. Features may change, break, or disappear as the platform evolves.
                Access can be paused for maintenance or upgrades, and data may reset while systems mature.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Content & Ownership */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                4. Content &amp; Ownership
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                All music, visuals, Wisdom posts, and brand assets are original works by MetaDJ / Zuberant.
                You may listen and explore for personal, non-commercial use. Do not copy, redistribute,
                scrape, or exploit the content without permission.
              </p>
            </div>

            {/* Acceptable Use */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                5. Acceptable Use
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                Do not abuse the platform, attempt unauthorized access, interfere with service
                availability, or use automation to scrape or overwhelm the app. We may suspend or
                terminate access if activity violates these Terms or harms the experience.
              </p>
            </div>
          </div>

          {/* MetaDJai Section */}
          <div className="glass-radiant p-6 rounded-2xl border-purple-500/30">
            <h2 className="text-xl font-heading font-semibold text-heading-solid mb-4 flex items-center gap-2">
              6. MetaDJai (AI Companion)
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-white/70 leading-relaxed">
              <p>
                MetaDJai is an AI creative companion. It can summarize, brainstorm, and suggest
                options, but it may be wrong or incomplete. Treat it as a creative aid, not a source
                of professional advice.
              </p>
              <p className="text-muted-accessible text-xs bg-black/20 p-3 rounded-lg border border-white/5">
                To generate responses, MetaDJai sends your chat messages to third-party AI providers (OpenAI, Anthropic, Google, xAI).
                Conversations are stored locally in your browser. Responses may be cached briefly on our servers to improve reliability.
                Do not share sensitive personal information.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Data & Privacy */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                7. Data &amp; Privacy
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                We store account details (email, username, password hash) to operate the service.
                Playlists, queue state, Journal entries, and MetaDJai history are local to your device during Public Preview.
                We may collect basic analytics to understand usage and improve the platform.
              </p>
            </div>

            {/* Third-Party Links */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                8. Third-Party Links
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                If the app links to third-party sites or services, those are outside our control and
                governed by their own terms.
              </p>
            </div>

            {/* No Warranties */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                9. No Warranties
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                The app is provided &quot;as-is&quot; and &quot;as available.&quot; We do not promise uninterrupted
                access, perfect accuracy, or fitness for a particular purpose.
              </p>
            </div>

            {/* Liability */}
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                10. Limitation of Liability
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                To the fullest extent allowed by law, MetaDJ / Zuberant will not be liable for indirect,
                incidental, or consequential damages arising from use of the app.
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
                Questions? Use the Account panel feedback form or ask MetaDJai to open it, or reach out @metadjai
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
