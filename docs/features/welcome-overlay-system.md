# Welcome Overlay System

> **Session-based onboarding overlay for MetaDJ Nexus**

**Last Modified**: 2026-01-13 14:42 EST
## Overview

The Welcome Overlay is a modal dialog presented to visitors who have not opted out, introducing MetaDJ Nexus and its core experiences. It appears once per session and provides immediate pathways to explore the platform.

## Public Preview Status

The Welcome Overlay surfaces the platform's **Public Preview** status:

### Visual Elements
- **Preview Notice Box**: Cyan-tinted callout with a pulsing dot + "Public Preview" label

### Key Messaging
The overlay communicates:
1. **Public Preview is open** — The experience is still being refined
2. **Local-first data** — Playlists, queue state, and journal entries stay on this device

### Content Exports
```typescript
// From meta-dj-nexus-welcome-copy.ts
export const METADJNEXUS_PREVIEW_NOTICE = {
  title: "Public Preview",
  description: "Public Preview is open while the core experience is refined. Playlists, queue state, and Journal entries stay local on this device for now."
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
- Not already shown in this session (`metadj_welcome_shown_session`)

### Flow Orchestration
```
1. ModalContext initializes `isWelcomeOpen: false` for a clean first paint
2. After hydration, ModalContext checks localStorage (`WELCOME_DISMISSED`) + sessionStorage shown flag
3. If eligible → open WelcomeOverlay and set `STORAGE_KEYS.WELCOME_SHOWN` + `metadj_welcome_shown_session`
4. User chooses a CTA → close overlay and continue to main experience (optional opt-out persists `WELCOME_DISMISSED`)
```

**Component**: `src/components/modals/ModalOrchestrator.tsx` manages display

## Content Structure

### Header
- "Welcome to MetaDJ Nexus" with gradient text
- MetaDJ logo wordmark integration

### Tagline
From `METADJNEXUS_WELCOME_TAGLINE`:
> "Where music, visuals, and creative guidance converge"

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
- **CTA (desktop)**: "Take Tour" → Starts the interactive desktop tour
- **CTA (mobile/tablet)**: "Open User Guide" → Opens the User Guide overlay
- **Primary CTA**: "Start Exploring" → Closes overlay
- **Inline link**: "Open the User Guide" → Opens the User Guide overlay (placed under creator note)
- **Footer link**: "Terms & Conditions" → Navigates to `/terms`
- **Opt-out**: "Do not show this again" stores `WELCOME_DISMISSED`
- **Auto-open**: The overlay is shown once per session until opt-out.

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

### Typography
- Heading: `font-heading` (Cinzel), gradient text
- Body: System font, `text-white/85`
- Cards: Smaller text with icon badges

### Feature Cards
- Uses `.glass-radiant-sm` utility
- Icon + Title + Description layout
- Grid: compact 3-up on mobile, expanded cards with descriptions on sm+

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
- `aria-describedby` points to the intro copy block
- Decorative images marked with `aria-hidden`

**Body Scroll Lock**:
- Uses `useBodyScrollLock(true)` hook
- Prevents background scroll while modal is open

## Analytics Integration

Events tracked via `trackEvent()`:

| Event | Trigger | Properties |
|-------|---------|------------|
| `welcome_dismissed` | User closes overlay | `dismissed_permanently` |
| `user_guide_opened` | "Open the User Guide" clicked | `source: 'welcome_overlay'` |

## State Persistence

**Storage Keys**:
- `STORAGE_KEYS.WELCOME_SHOWN` (`metadj-nexus-welcome-shown`) — tracks first view
- `STORAGE_KEYS.WELCOME_DISMISSED` (`metadj-nexus-welcome-dismissed`) — opt-out flag
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
