import Link from "next/link"

interface FooterProps {
  onInfoOpen?: () => void
}

export function Footer({ onInfoOpen }: FooterProps) {
  return (
    <footer className="relative mt-auto w-full backdrop-blur-3xl">
      {/* Solid background matching Header */}
      <div className="absolute inset-0 bg-(--bg-surface-base)/90 pointer-events-none" />
      
      {/* Gradient blobs matching Header */}
      <div className="absolute -bottom-[20%] -left-[20%] w-[80%] h-[60%] bg-purple-600/5 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[20%] w-[80%] h-[60%] bg-blue-600/5 blur-[80px] pointer-events-none" />
      
      {/* Top gradient line matching Header's bottom line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Content container - minimal padding on all screen sizes */}
      <div className="relative z-10 mx-auto w-full max-w-(--breakpoint-2xl) px-4 pt-2 pb-2 sm:px-6 sm:py-1.5">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between sm:gap-4">
          {/* Legal Notice - Ultra Minimal (Hidden on very small screens, integrated on desktop) */}
          <p className="hidden md:block text-[10px] lg:text-[11px] font-heading font-bold text-muted-accessible leading-relaxed hover:text-white/80 transition-colors duration-300 text-left flex-1 truncate">
            MetaDJ Nexus. Original works & AI-driven content. Reproduction prohibited.
          </p>

          {/* Links Row - WCAG 2.5.5 compliant touch targets (44x44px) */}
          <div className="flex items-center justify-center gap-x-1 gap-y-2 text-[10px] lg:text-[11px] font-heading font-bold text-muted-accessible sm:justify-end shrink-0">
            {onInfoOpen ? (
              <button
                type="button"
                onClick={onInfoOpen}
                className="min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center text-muted-accessible hover:text-white transition-colors cursor-pointer touch-manipulation"
              >
                User Guide
              </button>
            ) : null}
            <Link
              href="/terms"
              className="min-h-[44px] min-w-[44px] px-3 inline-flex items-center justify-center text-muted-accessible hover:text-white transition-colors cursor-pointer touch-manipulation"
            >
              Terms
            </Link>
            <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-1">
              <span className="text-white/70 font-black">MetaDJ</span>
              <span className="text-white/30 text-[8px]" aria-hidden="true">•</span>
              <span className="text-white/70 font-black">Zuberant</span>
            </div>
          </div>
        </div>

        {/* Mobile-only Legal Notice - Refined (min 10px for readability) */}
        <p className="md:hidden mt-3 text-[10px] font-heading font-medium uppercase tracking-widest text-muted-accessible text-center">
          Original works & AI-driven content &bull; Zuberant
        </p>
      </div>
    </footer>
  )
}
