"use client"

import React from "react"
import { ChevronRight, ArrowLeft } from "lucide-react"

export interface BreadcrumbItem {
  /** Display label for the breadcrumb segment */
  label: string
  /** Click handler for navigation. If undefined, renders as current (non-clickable) item */
  onClick?: () => void
}

interface WisdomBreadcrumbProps {
  /** Array of breadcrumb items in order (root to current) */
  path: BreadcrumbItem[]
  /** Optional className for additional styling */
  className?: string
}

/**
 * WisdomBreadcrumb - Persistent navigation trail for Wisdom section
 *
 * Displays hierarchical path like: Wisdom > Guides > [Guide Title]
 * - Back button for quick navigation to previous level
 * - Clickable segments for navigation back to parent views
 * - Current segment rendered as non-interactive text
 * - Keyboard accessible with focus states
 * - Screen reader friendly with proper ARIA attributes
 */
export function WisdomBreadcrumb({ path, className = "" }: WisdomBreadcrumbProps) {
  if (path.length === 0) return null

  // Find the previous clickable item for the back button
  const previousItem = path.length > 1
    ? path.slice(0, -1).reverse().find(item => item.onClick)
    : null

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={`flex items-center gap-3 text-sm ${className}`}
    >
      {/* Back button - shows when there's a previous level to go back to */}
      {previousItem && (
        <button
          type="button"
          onClick={previousItem.onClick}
          className="
            inline-flex items-center justify-center
            h-8 w-8 rounded-lg
            bg-white/5 border border-white/10
            text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20
            transition-all duration-200
            focus-ring
            shrink-0
          "
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <ol className="flex items-center gap-1.5 flex-wrap">
        {path.map((item, index) => {
          const isLast = index === path.length - 1
          const isClickable = !!item.onClick

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 text-white/40 shrink-0"
                  aria-hidden="true"
                />
              )}

              {isClickable && !isLast ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="
                    text-white/60 hover:text-cyan-400
                    transition-colors duration-200
                    focus-ring
                    truncate max-w-[150px] sm:max-w-[200px]
                  "
                  aria-current={undefined}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={`
                    truncate max-w-[150px] sm:max-w-[250px]
                    ${isLast ? "text-white font-medium" : "text-white/60"}
                  `}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
