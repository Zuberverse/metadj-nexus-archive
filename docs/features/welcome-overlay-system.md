# Welcome Overlay System

> **First-time visitor onboarding experience for MetaDJ Nexus**

**Last Modified**: 2025-12-27 15:24 EST
## Overview

The Welcome Overlay is a modal dialog presented to first-time visitors, introducing MetaDJ Nexus and its core experiences. It appears at most once per session and provides immediate pathways to explore the platform.

## Public Preview Status

The Welcome Overlay prominently displays the platform's **Public Preview** status:

### Visual Elements
- **Public Preview Badge**: Animated badge at the top with pulsing cyan indicator
- **Preview Notice Box**: Cyan-tinted callout explaining access status

### Key Messaging
The overlay communicates:
1. **Currently in Public Preview** — Everything is free
2. **No account required** — Full access without registration
3. **Local-first data** — Playlists and journal entries stay on this device

### Content Exports
```typescript
// From meta-dj-nexus-welcome-copy.ts
export const METADJNEXUS_PREVIEW_BADGE = "Public Preview"
export const METADJNEXUS_PREVIEW_NOTICE = {
  title: "Public Preview",
  description: "Public Preview is free and requires no account. Playlists and journal entries stay local on this device while the core experience is refined."
}
```

## Component Architecture

**Primary Component**: `src/components/modals/WelcomeOverlay.tsx`

**Content Source**: `src/lib/content/meta-dj-nexus-welcome-copy.ts`

```
meta-dj-nexus-welcome-copy.ts
       ↓
┌──────────────────────────┐
│   Welcome Overlay        │
│   (First-time modal)     │
└──────────────────────────┘
       ↓
User Guide / Main Experience
```

## Display Logic

### Show Conditions
- Not dismissed (`STORAGE_KEYS.WELCOME_DISMISSED` not set; alternate key)
- Not already shown (`STORAGE_KEYS.WELCOME_SHOWN` not set)
- Not already shown in this session (`metadj_welcome_shown_session`)

### Flow Orchestration
```
1. ModalContext initializes `isWelcomeOpen: false` for a clean first paint
2. After hydration, ModalContext checks localStorage (`WELCOME_SHOWN`, `WELCOME_DISMISSED`) + sessionStorage shown flag
3. If eligible → open WelcomeOverlay and set `STORAGE_KEYS.WELCOME_SHOWN` + `metadj_welcome_shown_session`
4. User chooses a CTA → close overlay and continue to main experience
```

**Component**: `src/components/modals/ModalOrchestrator.tsx` manages display

## Content Structure

### Header
- "Welcome to MetaDJ Nexus" with gradient text
- MetaDJ logo wordmark integration

### Tagline
From `METADJNEXUS_WELCOME_TAGLINE`:
> "Where music, cinema, and creative guidance converge"

### Welcome Message
`METADJNEXUS_WELCOME_PARAGRAPHS` - Short artist-direct intro to what MetaDJ Nexus offers

### Feature Cards (3)
`METADJNEXUS_FEATURE_CARDS`:

| Key | Title | Description |
|-----|-------|-------------|
| `music` | Original Music | Music collections, Featured highlights, and playlists you build |
| `visuals` | Cinema Visuals | Audio-reactive visualizers, video scenes, and optional Dream overlays |
| `beyond` | Creative Guidance | Wisdom, Journal, and MetaDJai to shape ideas and next steps |

### Actions
- **CTA**: "Take Tour" → Starts the interactive desktop tour (on mobile, opens the User Guide)
- **Primary CTA**: "Start Exploring" → Closes overlay
- **Inline link**: "Open the User Guide" → Opens the User Guide overlay (placed under creator note)
- **Footer link**: "Terms & Conditions" → Navigates to `/terms`
- **Auto-open**: The overlay is shown once by default (persisted via `STORAGE_KEYS.WELCOME_SHOWN`).

## Visual Design

### Container
- Full-screen modal at `z-100`
- Centered with max-width constraints
- Responsive sizing: `max-w-2xl` → `max-w-5xl`
- Gradient border using `.gradient-2-border`

### Background Treatment
- Dark backdrop: `bg-[#050a1c]/82`
- Heavy blur: `backdrop-blur-3xl`
- Gradient overlay: `.gradient-1` at 95% opacity
- Inner bloom: `.gradient-media-bloom` at 70% opacity
- Scroll hint: Gradient fade + chevron indicator appears only when content overflows (non-interactive)

### Typography
- Heading: `font-heading` (Cinzel), gradient text
- Body: System font, `text-white/85`
- Cards: Smaller text with icon badges

### Feature Cards
- Uses `.radiant-panel` utility
- Icon + Title + Description layout
- Grid: 1 column mobile, 3 columns desktop

## Accessibility

### WCAG 2.1 AA Compliance

**Focus Management**:
- Focus trap cycles within overlay (Tab/Shift+Tab)
- Initial focus on the Close button
- Focus returns to trigger on close

**Keyboard Navigation**:
- `Escape` closes overlay
- `Enter` activates the focused control (does not dismiss the overlay globally)
- Tab cycles through interactive elements
- No focus escape to underlying content

**Screen Reader Support**:
- `role="dialog"` with `aria-modal="true"`
- `aria-labelledby` points to heading
- `aria-describedby` points to music description
- Decorative images marked with `aria-hidden`

**Body Scroll Lock**:
- Uses `useBodyScrollLock(true)` hook
- Prevents background scroll while modal is open

## Analytics Integration

Events tracked via `trackEvent()`:

| Event | Trigger | Properties |
|-------|---------|------------|
| `welcome_dismissed` | User closes overlay | None |
| `user_guide_opened` | "Open the User Guide" clicked | `source: 'welcome_overlay'` |

## State Persistence

**Storage Keys**:
- `STORAGE_KEYS.WELCOME_SHOWN` (`metadj-nexus-welcome-shown`)
- `STORAGE_KEYS.WELCOME_DISMISSED` (`metadj-nexus-welcome-dismissed`, alternate key)
**Session Key**: `metadj_welcome_shown_session`

**Error Handling**: Gracefully handles localStorage errors (private browsing)

## Integration Points

### User Guide Handoff
```typescript
const handleOpenGuide = useCallback(() => {
  onClose()
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent("metadj:openUserGuide"))
  }, 100)
}, [onClose])
```

The welcome overlay dispatches a custom event that triggers the User Guide overlay.

### Modal Orchestrator
`ModalOrchestrator` manages the priority and display of:
1. Welcome Overlay (first-time)
2. User Guide Overlay (on demand)
3. Other modals as needed

## File Structure

```
src/
├── components/
│   └── modals/
│       ├── WelcomeOverlay.tsx      # Main component
│       └── ModalOrchestrator.tsx   # Display orchestration
├── lib/
│   └── content/
│       └── meta-dj-nexus-welcome-copy.ts # Content definitions
└── hooks/
    └── use-body-scroll-lock.ts     # Scroll lock utility
```

## Future Considerations

### Potential Enhancements
- **Personalization**: Tailor content based on referral source
- **Progress indicator**: Show completion state for returning visitors
- **A/B testing**: Test different value propositions
- **Video intro**: Short animated welcome video

### Content Updates
When updating welcome content:
1. Edit `meta-dj-nexus-welcome-copy.ts` only
2. Maintain artist-direct voice (I/me/my)
3. Keep messaging concise and inviting
4. Test on mobile viewports

## Related Documentation

- [User Guide System](./user-guide-system.md) - Post-welcome documentation
- [Modal Patterns](./modal-patterns.md) - Overlay implementation patterns
- [Analytics Implementation](./analytics-implementation.md) - Event tracking
- [UI Visual System](./ui-visual-system.md) - Design system reference
