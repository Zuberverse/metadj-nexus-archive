"use client"

import { useEffect, useLayoutEffect, useState } from "react"
import { DesktopShell, MobileShell } from "@/components/home/shells"
import { BREAKPOINTS } from "@/lib/app.constants"
import type { DesktopShellProps, MobileShellProps } from "@/components/home/shells"

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

interface HomeShellRouterProps {
  mobileProps: MobileShellProps
  desktopProps: DesktopShellProps
}

/**
 * HomeShellRouter renders BOTH shells during SSR/hydration so CSS can pick the correct UI
 * immediately (prevents layout shift because MobileBottomNav exists in the initial HTML).
 *
 * On the client, it prunes down to a single active shell before first paint, preventing
 * double-mount side effects (analytics, warmups) and ref collisions.
 */
export function HomeShellRouter({
  mobileProps,
  desktopProps,
}: HomeShellRouterProps) {
  const [activeShell, setActiveShell] = useState<"both" | "mobile" | "desktop">("both")

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") {
      setActiveShell("both")
      return
    }

    const update = (matchesDesktop: boolean) => {
      setActiveShell(matchesDesktop ? "desktop" : "mobile")
    }

    if (typeof window.matchMedia !== "function") {
      update(window.innerWidth >= BREAKPOINTS.DESKTOP_PANELS)

      const onResize = () => update(window.innerWidth >= BREAKPOINTS.DESKTOP_PANELS)
      window.addEventListener("resize", onResize)
      return () => window.removeEventListener("resize", onResize)
    }

    const mediaQuery = window.matchMedia(`(min-width: ${BREAKPOINTS.DESKTOP_PANELS}px)`)

    update(mediaQuery.matches)

    const onChange = (event: MediaQueryListEvent) => update(event.matches)

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange)
      return () => mediaQuery.removeEventListener("change", onChange)
    }

    mediaQuery.addListener(onChange)
    return () => mediaQuery.removeListener(onChange)
  }, [])

  if (activeShell === "mobile") {
    return <MobileShell {...mobileProps} />
  }

  if (activeShell === "desktop") {
    return <DesktopShell {...desktopProps} />
  }

  return (
    <>
      {/* Mobile shell - visible below 1100px, hidden on desktop */}
      <div className="contents min-[1100px]:hidden">
        <MobileShell {...mobileProps} />
      </div>
      {/* Desktop shell - hidden below 1100px, visible on desktop */}
      <div className="hidden min-[1100px]:contents">
        <DesktopShell {...desktopProps} />
      </div>
    </>
  )
}
