"use client"

/**
 * PageLoadingSkeleton
 *
 * Loading skeleton shown during initial page hydration.
 * Prevents FOUC (Flash of Unstyled Content) by showing
 * a skeleton that matches the final layout structure.
 *
 * Accessibility: Uses aria-busy and aria-live to announce
 * loading state to screen readers.
 */
export function PageLoadingSkeleton() {
  return (
    <div
      className="flex flex-col min-h-screen overflow-x-hidden w-full max-w-full"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading MetaDJ Nexus"
    >
      {/* Header Skeleton */}
      <header className="relative sticky top-0 z-100 backdrop-blur-3xl bg-black/40 border-b border-(--border-subtle)">
        <div className="w-full px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo skeleton */}
            <div className="h-10 w-48 bg-white/10 rounded-lg animate-pulse" />

            {/* Search skeleton */}
            <div className="flex-1 max-w-md h-10 bg-white/10 rounded-full animate-pulse" />

            {/* User Guide button skeleton */}
            <div className="h-10 w-10 bg-white/10 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="relative flex-1 pb-32">
        <div className="mx-auto w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl px-4 pt-6 sm:px-6 xl:px-8">
          {/* Collections Heading Skeleton */}
          <div className="h-12 w-64 mx-auto bg-linear-to-r from-white/20 via-white/10 to-white/20 rounded-lg mb-6 animate-pulse" />

          {/* Collection Dropdown Skeleton */}
          <div className="mb-6 flex justify-center">
            <div className="h-[52px] w-full max-w-md rounded-[24px] border border-(--border-standard) gradient-2-tint backdrop-blur-3xl animate-pulse" />
          </div>

          {/* Description Card Skeleton */}
          <div className="mb-6 rounded-[28px] border border-(--border-subtle) bg-(--bg-surface-base)/75 p-6 backdrop-blur-xl">
            <div className="h-6 w-48 mx-auto bg-white/10 rounded mb-2 animate-pulse" />
            <div className="h-4 w-32 mx-auto bg-white/10 rounded mb-4 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
            </div>
          </div>

          {/* Track Cards Skeleton */}
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-(--border-subtle) bg-black/40 p-4 backdrop-blur-xl"
              >
                <div className="flex items-center gap-4">
                  {/* Artwork skeleton */}
                  <div className="h-14 w-14 bg-white/10 rounded-xl animate-pulse shrink-0" />

                  {/* Track info skeleton */}
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
                  </div>

                  {/* Duration skeleton */}
                  <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Player Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 z-60 border-t border-(--border-subtle) bg-black/60 backdrop-blur-3xl px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          {/* Track artwork skeleton */}
          <div className="h-14 w-14 bg-white/10 rounded-xl animate-pulse shrink-0" />

          {/* Track info skeleton */}
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
          </div>

          {/* Controls skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-white/10 rounded-full animate-pulse" />
            <div className="h-10 w-10 bg-white/10 rounded-full animate-pulse" />
            <div className="h-10 w-10 bg-white/10 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
