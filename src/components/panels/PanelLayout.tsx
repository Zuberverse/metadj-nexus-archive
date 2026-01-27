import { useUI } from "@/contexts/UIContext"
import { useCspStyle } from "@/hooks/use-csp-style"
import { PANEL_POSITIONING } from "@/lib/app.constants"
import type { ActiveView } from "@/types"
import type { ReactNode } from "react"

interface PanelLayoutProps {
  leftPanel: ReactNode
  rightPanel: ReactNode
  renderMiddleContent: (activeView: ActiveView) => ReactNode
  reserveLeftSpace?: boolean
  reserveRightSpace?: boolean
  mainContentId?: string
}

export function PanelLayout({
  leftPanel,
  rightPanel,
  renderMiddleContent,
  reserveLeftSpace = true,
  reserveRightSpace = true,
  mainContentId = "main-content",
}: PanelLayoutProps) {
  const { panels, activeView, headerHeight } = useUI()

  const middleMarginLeft =
    !reserveLeftSpace || !panels.left.isOpen ? 0 : PANEL_POSITIONING.LEFT_PANEL.WIDTH
  const middleMarginRight =
    !reserveRightSpace || !panels.right.isOpen ? 0 : PANEL_POSITIONING.RIGHT_PANEL.WIDTH
  const wrapperStyleId = useCspStyle({
    marginLeft: `${middleMarginLeft}px`,
    marginRight: `${middleMarginRight}px`,
    minWidth: "320px",
    paddingTop: `${headerHeight}px`,
    // Fast transition to minimize visible text reflow during panel toggle
    // Uses 150ms (faster than panel animation) so text settles quickly
    transition: "margin 150ms ease-out",
    willChange: "margin",
  })

  return (
    <>
      {leftPanel}

      <main
        id={mainContentId}
        tabIndex={-1}
        className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-surface-base)]"
        data-csp-style={wrapperStyleId}
      >
        {renderMiddleContent(activeView)}
      </main>

      {rightPanel}
    </>
  )
}
