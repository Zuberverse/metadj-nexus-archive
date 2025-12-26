import { useUI } from "@/contexts/UIContext"
import { PANEL_POSITIONING } from "@/lib/app.constants"
import type { ActiveView } from "@/types"
import type { ReactNode } from "react"

interface PanelLayoutProps {
  leftPanel: ReactNode
  rightPanel: ReactNode
  renderMiddleContent: (activeView: ActiveView) => ReactNode
  reserveLeftSpace?: boolean
  reserveRightSpace?: boolean
}

export function PanelLayout({
  leftPanel,
  rightPanel,
  renderMiddleContent,
  reserveLeftSpace = true,
  reserveRightSpace = true,
}: PanelLayoutProps) {
  const { panels, activeView, headerHeight } = useUI()

  const middleMarginLeft =
    !reserveLeftSpace || !panels.left.isOpen ? 0 : PANEL_POSITIONING.LEFT_PANEL.WIDTH
  const middleMarginRight =
    !reserveRightSpace || !panels.right.isOpen ? 0 : PANEL_POSITIONING.RIGHT_PANEL.WIDTH
  const wrapperStyle = {
    marginLeft: middleMarginLeft,
    marginRight: middleMarginRight,
    minWidth: 320,
    paddingTop: headerHeight,
    // Fast transition to minimize visible text reflow during panel toggle
    // Uses 150ms (faster than panel animation) so text settles quickly
    transition: `margin 150ms ease-out`,
    willChange: 'margin',
  }

  return (
    <>
      {leftPanel}

      <main
        id="main-content"
        className="min-h-screen flex flex-col overflow-x-hidden"
        style={wrapperStyle}
      >
        {renderMiddleContent(activeView)}
      </main>

      {rightPanel}
    </>
  )
}
