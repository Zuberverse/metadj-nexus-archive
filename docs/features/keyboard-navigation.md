# Keyboard Navigation

> **Keyboard accessibility patterns for MetaDJ Nexus**

**Last Modified**: 2025-12-27 15:24 EST

## Overview

MetaDJ Nexus is fully keyboard accessible, following WCAG 2.1 AA guidelines. All interactive elements can be reached and operated via keyboard, with clear focus indicators and logical tab order.

## Keyboard Shortcuts Reference

> **IMPORTANT**: For the authoritative, current keyboard shortcuts reference, see **[KEYBOARD-SHORTCUTS.md](../KEYBOARD-SHORTCUTS.md)**.
>
> MetaDJ Nexus uses **modifier keys** (Ctrl on Windows/Linux, Cmd on Mac) for most shortcuts per **WCAG 2.1.4 Character Key Shortcuts** compliance. This ensures shortcuts work harmoniously with screen readers and assistive technologies.

### Quick Reference

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Space` | Play/Pause |
| `Ctrl/Cmd + Arrow Left/Right` | Previous/Next track |
| `Ctrl/Cmd + Arrow Up/Down` | Volume +/- 10% |
| `Ctrl/Cmd + M` | Toggle mute |
| `Escape` | Close modal/overlay |
| `Tab` / `Shift+Tab` | Navigate elements |

See [KEYBOARD-SHORTCUTS.md](../KEYBOARD-SHORTCUTS.md) for complete documentation.

## Implementation

### Hook: useKeyboardShortcuts

**Location**: `src/hooks/use-keyboard-shortcuts.ts`

The hook implements WCAG 2.1.4 compliant shortcuts requiring modifier keys (Ctrl/Cmd). See the actual implementation file for current code - this hook:

- Requires modifier keys for most shortcuts (WCAG 2.1.4)
- Detects platform and uses appropriate modifier (Cmd on Mac, Ctrl elsewhere)
- Skips shortcuts when user is typing in inputs
- Provides configurable callback handlers for all actions

### Hook: useEscapeKey

**Location**: `src/hooks/use-escape-key.ts`

Standardizes Escape key dismissal for all overlays.
- Automatically handles `event.preventDefault()`
- Blurs current focus to prevent accidental trigger highlights
- Configurable toggle (`enabled`)

### Input Detection

Shortcuts are disabled when user is typing:

```typescript
// Check if user is in a text input
if (
  e.target instanceof HTMLInputElement ||
  e.target instanceof HTMLTextAreaElement ||
  (e.target as HTMLElement).isContentEditable
) {
  return; // Don't handle shortcut
}
```

## Tab Order Strategy

### Logical Flow

The tab order follows the visual layout from top to bottom, left to right:

1. **Header**
   - Primary header controls (music toggle, view tabs, playback pill)
   - Search
     - Desktop: Search button opens a dropdown panel with the search input
     - Mobile: Inline SearchBar input
   - User guide button
   - MetaDJai toggle (desktop)

2. **Main Content**
   - Collection selector
   - Track list items
   - Track action buttons

3. **Audio Player (Footer)**
   - Feature toggles (AI, Music, Cinema, Wisdom)
   - Playback controls (prev, play/pause, next)
   - Progress bar
   - Volume controls
   - Queue toggle

### Tab Index Guidelines

```typescript
// Default: element is in natural tab order
tabIndex={0}

// Remove from tab order (for decorative or redundant elements)
tabIndex={-1}

// Never use positive tabIndex values
// ❌ tabIndex={1}, tabIndex={2}, etc.
```

### Skip Links

```typescript
// Skip to main content (implemented)
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
>
  Skip to main content
</a>

<main id="main-content" tabIndex={-1}>
  {/* Main content */}
</main>
```

## Focus Management

### Focus Visible Styling

```css
/* Default focus ring */
.focus-visible:outline-hidden {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Enhanced focus ring for important elements */
.focus-ring-enhanced {
  @apply focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2;
}

/* Purple glow focus */
focus-visible:shadow-[0_0_0_2px_rgba(168,85,247,0.4)]
```

### Focus States by Element Type

| Element | Focus Style |
|---------|-------------|
| Buttons | Purple outline + glow |
| Links | Purple outline |
| Inputs | White/30 border |
| Cards | Elevated shadow + border |
| Sliders | Thumb highlight |

### Focus Trap in Modals

When a modal opens:
1. Store the previously focused element
2. Move focus to first focusable element in modal
3. Trap Tab/Shift+Tab within modal
4. Restore focus to previous element on close

```typescript
// Focus trap implementation
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements?.length) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

## Component-Specific Patterns

### Audio Player Controls

```typescript
<button
  onClick={onPlayPause}
  aria-label={isPlaying ? 'Pause' : 'Play'}
  aria-pressed={isPlaying}
  className="focus-visible:outline-hidden focus-visible:ring-2"
>
  {isPlaying ? <Pause /> : <Play />}
</button>
```

### Progress Bar / Sliders

```typescript
<input
  type="range"
  min={0}
  max={duration}
  value={currentTime}
  onChange={handleSeek}
  aria-label="Track progress"
  aria-valuemin={0}
  aria-valuemax={duration}
  aria-valuenow={currentTime}
  aria-valuetext={formatTime(currentTime)}
  className="focus-visible:outline-hidden"
/>
```

### Track Cards

```typescript
<button
  onClick={() => playTrack(track)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playTrack(track);
    }
  }}
  aria-label={`Play ${track.title} by ${track.artist}`}
  className="focus-visible:outline-hidden focus-visible:ring-2"
>
  {/* Track content */}
</button>
```

### Dropdowns

```typescript
// Trigger button
<button
  aria-haspopup="listbox"
  aria-expanded={isOpen}
  aria-controls="dropdown-menu"
  onClick={() => setIsOpen(!isOpen)}
>
  Select Collection
</button>

// Dropdown menu
<ul
  id="dropdown-menu"
  role="listbox"
  aria-label="Collections"
>
  {options.map((option) => (
    <li
      key={option.id}
      role="option"
      aria-selected={option.id === selected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          selectOption(option);
        }
        if (e.key === 'ArrowDown') {
          focusNextOption();
        }
        if (e.key === 'ArrowUp') {
          focusPreviousOption();
        }
      }}
    >
      {option.label}
    </li>
  ))}
</ul>
```

## Escape Key Behavior

### Hierarchy

When Escape is pressed, close the topmost layer:

1. Contextual menus (share, dropdown)
2. Search results dropdown
3. Modals (track details, keyboard shortcuts)
4. Panels (MetaDJai, control panel)
5. Overlays (welcome)

We use the `useEscapeKey` hook in individual components to handle dismissal in a way that respects focus and overlay priority.

```typescript
useEscapeKey(onClose, { enabled: isOpen });
```

## ARIA Patterns

### Button States

```typescript
// Toggle button
<button
  aria-pressed={isActive}
  aria-label="Shuffle"
>
  <Shuffle />
</button>

// Disabled button
<button
  disabled
  aria-disabled="true"
>
  Next
</button>
```

### Live Regions

```typescript
// Announce track changes
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  Now playing: {currentTrack.title} by {currentTrack.artist}
</div>
```

### Landmarks

```typescript
<header role="banner">
  {/* Header content */}
</header>

<main role="main" id="main-content">
  {/* Main content */}
</main>

<footer role="contentinfo">
  {/* Audio player */}
</footer>
```

## Testing Keyboard Navigation

### Manual Testing Checklist

- [ ] Tab through entire page in logical order
- [ ] Shift+Tab reverses correctly
- [ ] All interactive elements are reachable
- [ ] Focus indicators are visible
- [ ] Modals trap focus correctly
- [ ] Escape closes overlays
- [ ] Shortcuts work when not in input
- [ ] Shortcuts disabled in text inputs
- [ ] Screen reader announces correctly

### Automated Testing

```typescript
// Example vitest accessibility test
import { axe } from 'vitest-axe';

test('page has no accessibility violations', async () => {
  const { container } = render(<Page />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## User-Facing Shortcuts Reference

> See **[KEYBOARD-SHORTCUTS.md](../KEYBOARD-SHORTCUTS.md)** for complete user-facing documentation.

### Key Points for Users

- Most shortcuts require **Ctrl** (Windows/Linux) or **Cmd** (Mac) modifier
- This ensures support for screen readers and assistive technology
- `?` key opens the shortcuts help modal (no modifier required)
- Shortcuts are disabled when typing in search, chat, or other inputs
- Use Tab to navigate through all controls with visible focus indicators

## Related Documentation

- [Audio Player Standards](3-projects/5-software/metadj-nexus/docs/features/audio-player-standards.md) - Player control specifications
- [Modal Patterns](3-projects/5-software/metadj-nexus/docs/features/modal-patterns.md) - Modal and overlay patterns
- [UI Visual System](3-projects/5-software/metadj-studio/docs/features/ui-visual-system.md) - Focus styling specifications
- [Accessibility Validation](../ACCESSIBILITY-VALIDATION.md) - Testing procedures
