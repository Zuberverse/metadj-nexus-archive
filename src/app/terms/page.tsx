"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { TERMS_VERSION } from "@/lib/constants/terms"

export default function TermsPage() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
      <div className="fixed inset-0 gradient-1 pointer-events-none" />
      <div className="fixed inset-0 bg-(--bg-overlay)/85 backdrop-blur-sm pointer-events-none" />
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
              Version: {TERMS_VERSION}
            </p>
            <p className="text-xs text-white/60 max-w-xl mx-auto">
              These terms govern your use of MetaDJ Nexus during Public Preview and beyond.
            </p>
          </div>
        </header>

        <div className="space-y-6">
          <div className="glass-radiant p-6 rounded-2xl">
            <h2 className="text-xl font-heading font-semibold text-heading-solid mb-3">
              1. Agreement &amp; Scope
            </h2>
            <p className="text-white/80 leading-relaxed text-sm sm:text-base">
              By accessing or using MetaDJ Nexus (the &quot;Platform&quot;), you agree to these Terms.
              If you do not agree, do not use the Platform. These Terms apply to the website,
              the application experience, and all related services provided by MetaDJ / Zuberant.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
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

            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors border-amber-500/20">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                3. Public Preview &amp; Future Features
              </h2>
              <div className="space-y-3 text-white/80 leading-relaxed text-sm">
                <p>
                  The Platform is currently in <strong className="text-amber-200">Public Preview</strong>. 
                  Features may change, break, or be removed as the platform evolves. Access can be paused 
                  for maintenance or upgrades, and data may reset while systems mature.
                </p>
                <p className="text-amber-200/90 bg-amber-900/20 p-3 rounded-lg border border-amber-500/20 text-xs">
                  By using the Platform, you understand that some features currently available for free 
                  may become accessible only through a paid subscription in the future. We will provide 
                  reasonable notice before implementing any paid features.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-radiant p-6 rounded-2xl">
            <h2 className="text-xl font-heading font-semibold text-heading-solid mb-4">
              4. Content, Ownership &amp; Social Sharing
            </h2>
            <div className="space-y-4 text-white/80 leading-relaxed text-sm sm:text-base">
              <p>
                All music, audio compositions, visual works, Wisdom content, cinematics, software, and 
                brand assets on this Platform are original copyrighted works owned by MetaDJ / Zuberant 
                and are protected under applicable copyright and intellectual property laws.
              </p>
              <p>
                You are granted a limited, non-exclusive, non-transferable license to access and enjoy 
                the content for personal, non-commercial use only. You may not copy, reproduce, distribute, 
                modify, create derivative works from, publicly display, or exploit Platform content without 
                prior written permission.
              </p>
              <div className="bg-cyan-900/20 p-4 rounded-lg border border-cyan-500/20">
                <p className="text-cyan-200/90 text-sm">
                  <strong>Social Media Sharing:</strong> Users are welcome and encouraged to share their 
                  experience on social media platforms. You may capture screenshots, short video clips, 
                  and images of the Platform strictly for the purpose of sharing your personal experience 
                  on social media, provided you credit MetaDJ Nexus and do not misrepresent or commercially 
                  exploit the content.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
            <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
              5. Acceptable Use
            </h2>
            <p className="text-white/80 leading-relaxed text-sm">
              Do not abuse the Platform, attempt unauthorized access, interfere with service
              availability, or use automation to scrape or overwhelm the app. You agree not to 
              reverse engineer, decompile, or attempt to extract source code from the Platform.
              We may suspend or terminate access if activity violates these Terms or harms the experience.
            </p>
          </div>

          <div className="glass-radiant p-6 rounded-2xl border-purple-500/30">
            <h2 className="text-xl font-heading font-semibold text-heading-solid mb-4 flex items-center gap-2">
              6. MetaDJai (AI Companion)
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-white/70 leading-relaxed">
              <p>
                MetaDJai is an AI creative companion designed to assist with exploration, discovery, 
                and creative brainstorming. It can summarize, suggest, and provide information, but 
                responses may be inaccurate or incomplete. Treat MetaDJai as a creative aid, not a 
                source of professional, legal, medical, or financial advice.
              </p>
              
              <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/20 space-y-3">
                <p className="text-purple-200/90 font-medium text-sm">Third-Party AI Services:</p>
                <p className="text-white/70 text-sm">
                  MetaDJai utilizes third-party AI APIs to generate responses, including services from:
                </p>
                <ul className="list-disc list-inside text-white/60 text-xs space-y-1 ml-2">
                  <li><strong>OpenAI</strong> (GPT models)</li>
                  <li><strong>Anthropic</strong> (Claude models)</li>
                  <li><strong>Google</strong> (Gemini models)</li>
                  <li><strong>xAI</strong> (Grok models)</li>
                </ul>
                <p className="text-white/60 text-xs mt-2">
                  We are not responsible for outages, errors, delays, or unavailability of these 
                  third-party services. Your interactions with MetaDJai may be processed by these 
                  providers according to their respective privacy policies and terms of service. 
                  We cannot guarantee the accuracy, completeness, or appropriateness of AI-generated 
                  responses. Do not share sensitive personal, financial, or confidential information.
                </p>
              </div>

              <div className="bg-black/20 p-4 rounded-lg border border-white/5 space-y-2">
                <p className="text-white/80 font-medium text-sm">Chat History &amp; Data:</p>
                <p className="text-white/60 text-xs">
                  Your MetaDJai conversation history is stored on our servers (not locally on your device) 
                  to enable features such as conversation continuity, history viewing, and personalized 
                  recommendations. This data is associated with your account and is accessible when you 
                  log in. You can view your conversation history through the MetaDJai interface. 
                  Conversations may be retained to improve service quality but are not sold to third parties.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                7. Data &amp; Privacy
              </h2>
              <div className="space-y-3 text-white/80 leading-relaxed text-sm">
                <p>
                  We store account details (email, username, password hash) to operate the service.
                  Playlists, queue state, and Journal entries are stored locally on your device. 
                  MetaDJai conversation history is stored on our servers as described in Section 6.
                </p>
                <p className="text-white/60 text-xs">
                  We may collect basic analytics to understand usage patterns and improve the Platform. 
                  We do not sell your personal information to third parties. Your data may be shared 
                  with service providers necessary to operate the Platform (hosting, AI services, analytics).
                </p>
              </div>
            </div>

            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                8. Third-Party Services &amp; Links
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                The Platform integrates with and links to third-party services (including AI providers, 
                analytics, and external websites). These services are governed by their own terms and 
                privacy policies. We are not responsible for the content, availability, practices, or 
                policies of third-party services.
              </p>
            </div>

            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                9. No Warranties
              </h2>
              <p className="text-white/80 leading-relaxed text-sm">
                The Platform is provided &quot;AS-IS&quot; and &quot;AS AVAILABLE&quot; without warranties 
                of any kind, express or implied. We do not guarantee uninterrupted access, error-free 
                operation, accuracy of content or AI responses, or fitness for a particular purpose. 
                Use of the Platform is at your own risk.
              </p>
            </div>

            <div className="glass-radiant-sm p-6 rounded-2xl hover:border-white/30 transition-colors">
              <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
                10. Limitation of Liability
              </h2>
              <div className="space-y-2 text-white/80 leading-relaxed text-sm">
                <p>
                  To the maximum extent permitted by applicable law, MetaDJ / Zuberant and its affiliates, 
                  officers, directors, employees, and agents shall not be liable for any indirect, incidental, 
                  special, consequential, or punitive damages arising from your use of the Platform.
                </p>
                <p className="text-white/60 text-xs">
                  This includes, but is not limited to, damages for loss of profits, data, goodwill, 
                  or other intangible losses, even if advised of the possibility of such damages. Our 
                  total liability shall not exceed the amounts paid by you, if any, for access to the Platform.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-radiant-sm p-6 rounded-2xl">
            <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
              11. Governing Law &amp; Dispute Resolution
            </h2>
            <div className="space-y-3 text-white/80 leading-relaxed text-sm">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the 
                Commonwealth of Pennsylvania, United States, without regard to its conflict of law provisions.
              </p>
              <p className="text-white/60 text-xs">
                Any disputes arising from these Terms or your use of the Platform shall be resolved 
                through binding arbitration in accordance with the rules of the American Arbitration 
                Association, with proceedings held in Pennsylvania. You agree to waive any right to a 
                jury trial or participation in a class action lawsuit.
              </p>
            </div>
          </div>

          <div className="glass-radiant-sm p-6 rounded-2xl">
            <h2 className="text-lg font-heading font-semibold text-heading-solid mb-3">
              12. Indemnification
            </h2>
            <p className="text-white/80 leading-relaxed text-sm">
              You agree to indemnify, defend, and hold harmless MetaDJ / Zuberant and its affiliates 
              from any claims, damages, losses, or expenses (including reasonable attorney fees) 
              arising from your use of the Platform, violation of these Terms, or infringement of 
              any third-party rights.
            </p>
          </div>

          <div className="glass-radiant p-6 rounded-2xl text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-heading font-semibold text-heading-solid">
                Changes &amp; Contact
              </h2>
              <p className="text-white/60 text-sm max-w-xl mx-auto">
                We may update these Terms as the Platform evolves. When we make material changes, 
                we will notify you through the Platform (such as a notice upon login) and update 
                the version date above. Continued use of the Platform after changes constitutes 
                acceptance of the updated Terms.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-cyan-200/80 text-sm">
                Questions? Use the Account panel feedback form, ask MetaDJai to open it, or reach out @metadjai
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
