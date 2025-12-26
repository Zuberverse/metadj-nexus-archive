import { useMemo } from "react"
import { PANEL_POSITIONING } from "@/lib/app.constants"

/**
 * usePanelPosition - Shared positioning hook for overlay panels
 *
 * Provides consistent positioning calculations for Chat Panel and Control Panel.
 * Ensures both panels use identical top/bottom offsets, width, and height calculations.
 *
 * @param headerHeight - Dynamic header height from HeaderRef measurement
 * @returns Positioning object with top, bottom, width, height, and containerStyles
 *
 * @example
 * ```tsx
 * const position = usePanelPosition(ui.headerHeight)
 *
 * <div
 *   className="fixed left-1/2 -translate-x-1/2 z-80"
 *   style={position.containerStyles}
 * >
 *   {children}
 * </div>
 * ```
 */
interface PanelPositionOptions {
  /** Clamp overlay top so it never overlaps the header (mobile/tablet). */
  clampToHeader?: boolean
  /** Override the shared top gap (pixels). */
  topGapOverride?: number
  /** Override the shared bottom offset (pixels). */
  bottomOffsetOverride?: number
}

export function usePanelPosition(headerHeight: number, options?: PanelPositionOptions) {
  return useMemo(() => {
    const topGap = options?.topGapOverride ?? PANEL_POSITIONING.OVERLAY.TOP_GAP
    const bottom = options?.bottomOffsetOverride ?? PANEL_POSITIONING.OVERLAY.ACTION_BAR_OFFSET
    const rawTop = headerHeight + topGap
    const top = options?.clampToHeader ? Math.max(headerHeight, rawTop) : rawTop
    const height = `calc(100vh - ${top + bottom}px)`

    return {
      /** Top offset from viewport (pixels) */
      top,

      /** Bottom offset from viewport (pixels) */
      bottom,

      /** Calculated max height for panel */
      height,

      /** Panel width class (responsive, matches main content) */
      widthClass: PANEL_POSITIONING.OVERLAY.WIDTH_CLASS,

      /** Z-index for overlay panels */
      zIndex: PANEL_POSITIONING.OVERLAY.Z_INDEX,

      /**
       * Complete style object for outer container
       * Apply to the fixed positioned panel wrapper (top, bottom, maxHeight)
       * Use widthClass for className
       */
      containerStyles: {
        top,
        bottom,
        maxHeight: height,
      },

      /**
       * Inner content padding for consistent edge spacing
       * Chat panel and control panel should both use px-5 py-5
       */
      contentPadding: {
        horizontal: "1.25rem", // px-5
        vertical: "1.25rem",   // py-5
      },
    }
  }, [
    headerHeight,
    options?.bottomOffsetOverride,
    options?.clampToHeader,
    options?.topGapOverride,
  ])
}
