# Modal & Overlay Patterns

> **Specifications for modal dialogs, overlays, and floating UI elements in MetaDJ Nexus**

**Last Modified**: 2026-01-14 21:23 EST

## Overview

MetaDJ Nexus uses a consistent system of modals, overlays, and floating panels to present focused content without navigating away from the main experience. All overlays share common patterns for accessibility, animation, and visual styling.

## Z-Index Layering Strategy

### Layer Hierarchy

```
z-300  - Share menu (highest, contextual)
z-150  - Search dropdown
z-100  - User Guide overlay, modals
z-60   - Audio player footer
z-50   - Playback unlock overlay
z-45   - MetaDJai panel
z-40   - Header
z-20   - Collection dropdown options
z-10   - Content overlays, tooltips
z-0      - Base content layer
```

### Layer Guidelines

- **Modals** (z-100): Full-focus dialogs that require user action
- **Panels** (z-45-60): Persistent UI that coexists with content
- **Dropdowns** (z-20-150): Contextual menus that appear on interaction
- **Tooltips** (z-10): Non-blocking informational overlays

## Modal Variants

### 1. Full-Screen Modal (User Guide Overlay)

**Component**: `src/components/guide/UserGuideOverlay.tsx`

```typescript
// Structure
<div className="fixed inset-0 z-100 flex items-center justify-center">
  {/* Backdrop */}
  <div className="pointer-events-none fixed inset-0 bg-[#050a1c]/82 backdrop-blur-3xl" />

  {/* Content */}
  <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto">
    {/* Modal content */}
  </div>
</div>
```

**Characteristics**:
- Centered positioning with max-width constraint
- Dark backdrop with heavy blur (`backdrop-blur-3xl`)
- Gradient border treatment (`.gradient-media`)
- Scrollable content area
- Focus trap implementation

### 2. Side Panel (MetaDJai Chat)

**Component**: `src/components/metadjai/MetaDjAiChat.tsx`

**Characteristics**:
- Fixed position, anchored to bottom
- Below audio player (z-45 vs z-60)
- Slides in from bottom on mobile
- Glass morphism background
- Keyboard-dismissable

### 3. Floating Panel (Control Panel Overlay)

**Component**: `src/components/player/ControlPanelOverlay.tsx`

**Characteristics**:
- Floating above content
- Contains nested panels (queue)
- Maintains access to underlying controls
- Backdrop blur with dark tint

### 4. Dropdown Menu (Search, Track Options)

**Components**:
- `src/components/search/SearchBar.tsx`
- `src/components/ui/TrackOptionsMenu.tsx`

**Characteristics**:
- Positioned relative to trigger
- Click-outside dismissal
- No focus trap (allows interaction with trigger)
- Subtle backdrop blur

### 5. Contextual Menu (Share Button)

**Component**: `src/components/ui/ShareButton.tsx`

**Characteristics**:
- Highest z-index (z-300)
- Positioned near trigger element
- Auto-dismisses on action
- Minimal backdrop

## Backdrop Patterns

### Heavy Backdrop (Modals)
```css
bg-[#050a1c]/82 backdrop-blur-3xl
```
- High opacity (82%)
- Maximum blur
- Blocks interaction with background
- Used for: User Guide overlay, keyboard shortcuts modal

### Medium Backdrop (Panels)
```css
bg-background/95 backdrop-blur-xs
```
- Near-opaque
- Light blur
- Used for: Playback unlock overlay

### Light Backdrop (Dropdowns)
```css
bg-[#0a0e1f]/95 backdrop-blur-3xl
```
- High opacity on element itself
- No separate backdrop layer
- Used for: Search dropdown, collection menu

## Focus Management

### Focus Trap Pattern

```typescript
// From UserGuideOverlay.tsx
const focusableElementsRef = useRef<HTMLElement[]>([]);

useEffect(() => {
  // Capture all focusable elements
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const elements = overlayRef.current?.querySelectorAll(focusableSelectors);
  focusableElementsRef.current = Array.from(elements || []);
}, []);

// Handle tab cycling
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    const elements = focusableElementsRef.current;
    const first = elements[0];
    const last = elements[elements.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
};
```

### Focus Restoration

```typescript
// Store previous focus
const previousFocusRef = useRef<HTMLElement | null>(null);

useEffect(() => {
  previousFocusRef.current = document.activeElement as HTMLElement;

  return () => {
    previousFocusRef.current?.focus();
  };
}, []);
```

### Initial Focus

- Set focus to first interactive element on open
- Or to a semantically appropriate element (close button, primary action)
- Use `autoFocus` prop or `useEffect` with `ref.focus()`

## Body Scroll Lock

### Implementation Pattern

```typescript
useEffect(() => {
  // Lock body scroll
  document.body.style.overflow = 'hidden';

  return () => {
    // Restore scroll
    document.body.style.overflow = '';
  };
}, []);
```

### When to Lock

- **Always lock**: Full-screen modals, User Guide overlay
- **Conditionally lock**: Panels on mobile (when covering full viewport)
- **Never lock**: Dropdowns, tooltips, contextual menus

## Dismiss Behaviors

### Escape Key

All modals and panels should close on Escape. Use the `useEscapeKey` hook for consistent behavior:

```typescript
import { useEscapeKey } from '@/hooks';

// ... inside component
useEscapeKey(onClose, { enabled: isOpen });
```

### Click Outside

For dropdowns, popovers, and contextual menus, use the `useClickAway` hook. This hook handles both `mousedown` and `touchstart` events for cross-device consistency:

```typescript
import { useClickAway } from '@/hooks';

// ... inside component
const ref = useRef<HTMLDivElement>(null);
useClickAway(ref, onClose, { enabled: isOpen });

return <div ref={ref}>...</div>;
```

For complex cases (e.g., portals), `useClickAway` supports an array of refs:
```typescript
useClickAway([popoverRef, triggerRef], onClose, { enabled: isOpen });
```

### Explicit Close

- Close button in header (top-right)
- Cancel/Done actions
- Completing the modal's purpose

## Animation Specifications

### Enter Animations

**Implementation Note**: We rely on `tailwindcss-animate` utilities (enabled in `tailwind.config.ts`) for `animate-in`/`animate-out` combinations used across overlays. The CSS below describes the intended motion; in-app styling comes from the plugin plus any custom keyframes in `src/app/globals.css`.

```css
/* Fade in */
.animate-in {
  animation: fadeIn 200ms ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Fade in with scale */
.fade-in.zoom-in-95 {
  animation: fadeInScale 300ms ease-out;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Exit Animations

- Mirror enter animations in reverse
- Use `duration-200` for quick, responsive feel
- Ensure content is unmounted after animation completes

### Timing Guidelines

| Type | Enter | Exit |
|------|-------|------|
| Modals | 200-300ms | 150-200ms |
| Panels | 200ms | 150ms |
| Dropdowns | 150ms | 100ms |
| Tooltips | 100ms | 75ms |

## Accessibility Requirements

### ARIA Attributes

```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Description text</p>
</div>
```

### Required Attributes

- `role="dialog"` for modal dialogs
- `aria-modal="true"` to indicate modal behavior
- `aria-labelledby` pointing to title element
- `aria-describedby` for description (optional)

### Screen Reader Announcements

- Announce modal opening
- Provide clear title and purpose
- Announce when modal closes

## Visual Styling

### Glass Morphism Treatment

```css
/* Standard glass panel */
.glass-panel {
  background: rgba(6, 8, 28, 0.95);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}
```

### Gradient Border

```css
/* Gradient border wrapper */
.gradient-media {
  background: linear-gradient(135deg,
    var(--gradient-start),
    var(--gradient-mid),
    var(--gradient-end)
  );
  padding: 1.5px;
  border-radius: 30px;
}

.gradient-media > * {
  background: var(--background);
  border-radius: calc(30px - 1.5px);
}
```

### Shadow Specifications

```css
/* Modal shadow */
box-shadow: 0 25px 60px rgba(41, 12, 90, 0.55);

/* Panel shadow */
box-shadow: 0 20px 42px rgba(12, 10, 32, 0.65);

/* Dropdown shadow */
box-shadow: 0 12px 36px rgba(18, 15, 45, 0.65);
```

## Responsive Considerations

### Mobile Adaptations

- Full-width modals on small screens
- Bottom-sheet pattern for panels
- Larger touch targets (44px minimum)
- Account for virtual keyboard

### Breakpoint Adjustments

```typescript
// Example responsive modal sizing
className={`
  w-full
  max-w-[calc(100vw-2rem)]
  sm:max-w-lg
  md:max-w-xl
  lg:max-w-2xl
`}
```

## Implementation Checklist

When creating a new modal or overlay:

- [ ] Set appropriate z-index from layer hierarchy
- [ ] Implement backdrop with correct opacity and blur
- [ ] Add focus trap for true modals
- [ ] Store and restore previous focus
- [ ] Lock body scroll if appropriate
- [ ] Handle Escape key dismissal (use `useEscapeKey`)
- [ ] Handle click-outside dismissal (use `useClickAway`)
- [ ] Add enter/exit animations
- [ ] Include all required ARIA attributes
- [ ] Apply glass morphism styling
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Verify mobile responsiveness

## Shared Modal Component

As of v0.9.26, a reusable Modal component is available at `src/components/ui/Modal.tsx`:

```typescript
import { Modal, ModalContent, ConfirmDialog } from '@/components/ui/Modal'

// Basic usage
<Modal isOpen={isOpen} onClose={handleClose} title="Modal Title">
  <ModalContent>
    {/* Modal content */}
  </ModalContent>
</Modal>

// Confirmation dialog
<ConfirmDialog
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleConfirm}
  title="Confirm Action"
  description="Are you sure you want to proceed?"
  confirmLabel="Confirm"
  cancelLabel="Cancel"
  variant="destructive" // 'default' | 'destructive'
/>
```

**Features**:
- Focus trapping with automatic focus management
- Escape key dismissal
- Click-outside dismissal
- Smooth enter/exit animations
- Glass morphism styling consistent with brand
- Accessible ARIA attributes

## Related Documentation

- [UI Visual System](./ui-visual-system.md) - Design tokens and styling
- [Keyboard Navigation](./keyboard-navigation.md) - Keyboard interaction patterns
- [Motion System](./motion-system.md) - Animation specifications
- [Component Architecture](../architecture/component-architecture.md) - Component patterns
- [Shared UI Components](../architecture/shared-ui-components.md) - Button, Card, Modal component specs
