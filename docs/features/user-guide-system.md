# User Guide System

> **Design strategy and implementation for the MetaDJ Nexus User Guide**

**Last Modified**: 2025-12-22 19:12 EST
## Overview

The User Guide system provides comprehensive onboarding and feature documentation through two complementary surfaces:

1. **User Guide Overlay** (`src/components/guide/UserGuideOverlay.tsx`) - Quick-access modal via the header info button (ⓘ), Hub “User Guide” chip, or Welcome Overlay CTA.
2. **Guide Page** (`src/components/guide/MetaDJNexusGuide.tsx`) - Full standalone page at `/guide`

Both surfaces share the same content source (`src/lib/content/meta-dj-nexus-guide-copy.ts`) and the same renderer (`src/components/guide/GuideContent.tsx`) to avoid drift between overlay and page.

## Design Strategy

### Unified Content Architecture

```
meta-dj-nexus-guide-copy.ts (Single Source of Truth)
       ↓
┌──────────────────┐     ┌──────────────────┐
│  Guide Overlay   │     │   Guide Page     │
│  (ⓘ button)      │     │   (/guide)       │
└──────────────────┘     └──────────────────┘
```

**Rationale**: Content is defined once and consumed by both surfaces. Updates propagate automatically without drift between the overlay and page.

### Navigation Pattern

**Header Layout (Overlay)**:
```
┌─────────────────────────────────────────────────────────┐
│                    [Navigation Pills]        [AI] [X]   │
│         (centered on page)               (fixed right)  │
└─────────────────────────────────────────────────────────┘
```

- Navigation pills are **centered** on the page for visual balance
- Action buttons (Ask MetaDJai, Close) are **absolute-positioned right**
- Desktop layout is designed to keep pills readable without feeling cramped
- Mobile: pills wrap naturally while buttons stay accessible

### Quick-Jump Navigation

Eleven sections with icon + label pills:
1. **Quick Start** - Getting started in 3 steps
2. **Hub** - Mission control and platform pulse
3. **Music** - Living collections and playback
4. **Cinema** - Visual experience layer
5. **Wisdom** - Knowledge hub content
6. **Journal** - Local-first writing space
7. **MetaDJai** - AI companion features
8. **Queue** - Playback queue management
9. **Search** - Discovery tools
10. **Shortcuts** - Keyboard reference
11. **Getting Help** - MetaDJai handoff

### Public Preview Status

The User Guide prominently displays the platform's Public Preview status:

**Visual Elements**:
- **Public Preview Badge**: Animated badge at the top with pulsing cyan indicator
- **Preview Notice Box**: Cyan-tinted callout in the hero section explaining access status

The guide keeps the preview notice simple and focused on current access, including that playlists, queue state, and journal entries stay local to the current device.

**Active Section Tracking**:
- Scroll position determines active pill highlighting
- `IntersectionObserver`-style pattern tracks visible sections
- Clicking a pill smooth-scrolls to that section

### MetaDJai Integration

The "Ask MetaDJai" button creates a seamless handoff:
1. User clicks "Ask MetaDJai" in guide header
2. Guide overlay closes (150ms transition delay)
3. MetaDJai panel opens with full context
4. User can ask platform questions directly

This pattern encourages AI-driven onboarding without forcing users into a specific flow.

Each major guide section includes a **“Summarize”** chip. Clicking it dispatches an external prompt into MetaDJai with that section’s current copy and a consistent output format (thesis → key bullets → “try this next” steps). This mirrors the Wisdom “Summarize with MetaDJai” pattern for fast, contextual onboarding.

## Component Architecture

### Shared Components

The guide content is rendered by a shared component:
- `src/components/guide/GuideContent.tsx` — The single renderer for sections, cards, and CTAs.
- `src/components/guide/MetaDJNexusGuide.tsx` — Page wrapper for `/guide` (window scroll).
- `src/components/guide/UserGuideOverlay.tsx` — Modal wrapper (internal scroll container + focus trap).

### Content Exports

```typescript
// Navigation structure
export const GUIDE_NAV_SECTIONS: GuideSection[]

// Section content
export const GUIDE_WELCOME
export const GUIDE_QUICK_START: QuickStartStep[]
export const GUIDE_CORE_SURFACES: CoreSurface[]
export const GUIDE_COLLECTIONS: CollectionInfo[]
export const GUIDE_METADJAI
export const GUIDE_QUEUE
export const GUIDE_SEARCH
export const GUIDE_SHORTCUTS: KeyboardShortcut[]
export const GUIDE_HELP
```

## Visual Design

### Glassmorphism Cards

Content sections use the `glass-card` utility class:
- Semi-transparent indigo-black background
- Backdrop blur for depth
- Subtle white border
- Brand-aligned shadow glow

### Typography Hierarchy

- **Section Headers**: `font-heading` (Cinzel), bold, with icon badge
- **Card Titles**: `font-heading`, semibold, white
- **Body Text**: System font, `text-white/70` for readability
- **Pro Tips**: Cyan accent with Lightbulb icon

### Brand Colors

- Active nav pill: `bg-purple-500/20`, `border-purple-500/40`
- Inactive nav pill: `bg-white/5`, `border-white/10`
- MetaDJai button: Purple-to-cyan gradient
- Section icons: Purple accent (`text-purple-400`)
- Tips/highlights: Cyan accent (`text-cyan-400`)

## Accessibility

### Keyboard Navigation

- `Escape` closes the overlay
- `Tab` navigates through interactive elements
- Focus trap within overlay when open
- Focus returns to trigger element on close

### Screen Reader Support

- `role="dialog"` with `aria-modal="true"`
- Descriptive `aria-label` on close button
- Section headings create document outline
- Content organized semantically with `<section>` elements

### Motion Preferences

- Respects `prefers-reduced-motion` for scroll behavior
- Transitions use reasonable durations (200-300ms)

## File Structure

```
src/
├── components/
│   └── guide/
│       ├── UserGuideOverlay.tsx     # Modal overlay component
│       └── MetaDJNexusGuide.tsx     # Standalone page component
│       └── GuideContent.tsx         # Shared guide renderer
├── lib/
│   └── content/
│       └── meta-dj-nexus-guide-copy.ts # Shared content definitions
└── app/
    └── guide/
        └── page.tsx                # Standalone /guide route
```

## Future Considerations

### Potential Enhancements

- **Search within guide**: Filter sections by keyword
- **Progress tracking**: Mark sections as "read"
- **Contextual help**: Surface relevant guide sections based on user location
- **Video walkthroughs**: Embed short tutorial clips

### Content Updates

When updating guide content:
1. Edit `meta-dj-nexus-guide-copy.ts` only
2. Both surfaces automatically reflect changes
3. Update this spec if structure changes
4. Test both overlay and page rendering
5. Keep model labels aligned with the UI (GPT/Gemini/Claude/Grok), and only list full IDs if the UI does
6. Update counts (Featured = 10, Recently Played = 50) when collection logic changes

## Related Documentation

- [Modal Patterns](./modal-patterns.md) - Overlay implementation patterns
- [UI Visual System](./ui-visual-system.md) - Design system reference
- [Keyboard Navigation](./keyboard-navigation.md) - Accessibility standards
