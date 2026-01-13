# Motion System

> **Animation specifications and motion principles for MetaDJ Nexus**

**Last Modified**: 2026-01-13 14:10 EST

## Overview

MetaDJ Nexus uses purposeful motion to enhance the user experience, provide feedback, and create a premium feel. All animations respect user preferences for reduced motion and follow consistent timing patterns.

## Motion Principles

### 1. Purposeful
Every animation serves a purpose—guiding attention, providing feedback, or indicating state changes. Avoid decorative motion that doesn't add value.

### 2. Responsive
Animations should feel immediate and connected to user actions. Keep durations short for interactive elements.

### 3. Natural
Use easing curves that feel organic. Avoid linear timing for UI elements.

### 4. Accessible
Always respect `prefers-reduced-motion`. Provide functional alternatives when motion is disabled.

## Navigation Pill (Header Tabs)

- The header view selector pill resolves to the saved view on initial load with **no transition**.
- Slide animations only run after view hydration and user-initiated tab switches.
- Desktop tabs use a fixed width to prevent hydration-time size shifts when fonts swap.

## Timing Tokens

### Duration Variables

```css
:root {
  --transition-quick: 75ms;    /* Micro-interactions */
  --transition-standard: 150ms; /* Standard transitions */
  --transition-smooth: 300ms;   /* Emphasis animations */
}
```

### Duration Guidelines

| Duration | Use Case | Examples |
|----------|----------|----------|
| 75ms | Micro-interactions | Button press, toggle state |
| 100ms | Quick feedback | Hover states, focus rings |
| 150ms | Standard transitions | Color changes, opacity |
| 200ms | Modal enter/exit | Dialogs, overlays |
| 300ms | Emphasis | Card lifts, zoom effects |
| 500ms | Fade in | Content appearance |
| 3s+ | Ambient | Pulse, shimmer effects |

### Easing Functions

```css
/* Standard ease - most transitions */
ease-out: cubic-bezier(0, 0, 0.2, 1)

/* Smooth ease - emphasis */
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)

/* Quick ease - exits */
ease-in: cubic-bezier(0.4, 0, 1, 1)
```

## Animation Classes

**Implementation Note**: Core enter/exit utilities like `animate-in`, `animate-out`, `fade-in`, `fade-out`, `zoom-in-95`, `zoom-out-95`, and `slide-in-from-*` come from `tailwindcss-animate` (enabled in `tailwind.config.ts`). Custom project-specific keyframes/utilities (e.g., `animate-fade-in`, `animate-slide-in-right`) live in `src/app/globals.css`.

### Utility Classes

```css
/* Quick transition */
.transition-quick {
  transition-duration: var(--transition-quick);
  transition-timing-function: ease-out;
}

/* Standard transition */
.transition-standard {
  transition-duration: var(--transition-standard);
  transition-timing-function: ease-out;
}

/* Smooth transition */
.transition-smooth {
  transition-duration: var(--transition-smooth);
  transition-timing-function: ease-in-out;
}
```

### Fade Animations

```css
/* Fade in */
.animate-fade-in {
  animation: fadeIn 0.5s ease-in;
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
.animate-in.fade-in.zoom-in-95 {
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

### Ambient Animations

```css
/* Gentle pulse - loading states */
.animate-pulse-gentle {
  animation: pulse-gentle 3s ease-in-out infinite;
}

@keyframes pulse-gentle {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* Shimmer - skeleton loading */
.animate-shimmer {
  animation: shimmer 2s ease-in-out infinite;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Float - subtle movement */
.animate-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* Wave - gradient background */
.animate-wave {
  animation: slow-wave 28s ease-in-out infinite;
}

@keyframes slow-wave {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* AI Action Pulse - Tool Discoverability */
.animate-ai-pulse {
  animation: ai-button-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes ai-button-pulse {
  0% {
    box-shadow: 0 0 0 0 oklch(0.6 0.118 184.704 / 0.4);
    border-color: rgba(6, 182, 212, 0.35);
  }
  50% {
    box-shadow: 0 0 0 8px oklch(0.6 0.118 184.704 / 0);
    border-color: rgba(6, 182, 212, 0.65);
  }
  100% {
    box-shadow: 0 0 0 0 oklch(0.6 0.118 184.704 / 0);
    border-color: rgba(6, 182, 212, 0.35);
  }
}
```

### Typing Animation

```css
.animate-typing {
  animation: typing 1.5s steps(20) infinite;
}

@keyframes typing {
  0%, 100% {
    width: 0;
  }
  50% {
    width: 100%;
  }
}
```

## Interaction Patterns

### Hover States

```css
/* Lift effect for cards */
.hover-lift {
  transition: transform var(--transition-standard) ease-out;
}

.hover-lift:hover {
  transform: translateY(-2px);
}

/* Scale effect for buttons */
.hover-scale {
  transition: transform var(--transition-quick) ease-out;
}

.hover-scale:hover {
  transform: scale(1.02);
}

.hover-scale:active {
  transform: scale(0.98);
}
```

### Focus States

```css
/* Focus ring animation */
.focus-animated {
  transition:
    box-shadow var(--transition-standard) ease-out,
    outline-offset var(--transition-quick) ease-out;
}

.focus-animated:focus-visible {
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.4);
  outline-offset: 2px;
}
```

### Toggle States

```css
/* Toggle button */
.toggle-animated {
  transition:
    background-color var(--transition-standard) ease-out,
    border-color var(--transition-standard) ease-out;
}

/* Icon rotation */
.icon-rotate {
  transition: transform var(--transition-standard) ease-out;
}

.icon-rotate.active {
  transform: rotate(180deg);
}
```

## Component-Specific Motion

### Track Cards

```typescript
className={`
  transition-all duration-150 ease-out
  transform-gpu
  hover:-translate-y-0.5
  active:scale-[0.99]
`}
```

- Lift on hover: `translateY(-2px)` over 150ms
- Press feedback: `scale(0.99)` immediately
- Use `transform-gpu` for smooth animation

### Audio Player Progress

```css
/* Progress bar fill */
.progress-fill {
  transition: width 100ms ease-out;
}

/* Volume slider */
.volume-fill {
  transition: width 100ms ease-out;
}
```

### Modal Enter/Exit

```typescript
// Enter animation
className="animate-in fade-in zoom-in-95 duration-200"

// Exit animation
className="animate-out fade-out zoom-out-95 duration-150"
```

### Dropdown Menus

```typescript
// Open state
className={`
  transition-all duration-150 ease-out
  ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
`}
```

### Toast Notifications

```css
/* Slide in from bottom */
@keyframes slideInUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.toast-enter {
  animation: slideInUp 200ms ease-out;
}
```

### Loading States

```typescript
// Standard Spinner rotation
<div className="animate-spin h-5 w-5">
  <Loader2 />
</div>

// Center Play/Pause Loader
// Used when a track is loading/buffering to provide immediate visual feedback
<IconButton
  icon={<Loader2 className="animate-spin" />}
  // ...
/>

// Skeleton pulse
<div className="animate-pulse bg-white/10 rounded" />
```

### Dynamic Background

- Component: `src/components/visuals/DynamicBackground.tsx` (used by `DesktopShell` and `MobileShell`).
- Crossfades artwork-derived gradients; default transition is 1500ms.
- Honors reduced motion by switching instantly.

### Waveform Visualizer (Prototype)

- Component: `src/components/visuals/WaveformVisualizer.tsx`.
- Status: experimental canvas-based audio visualization, not wired into the live player yet.

## Reduced Motion Support

### CSS Implementation

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .animate-pulse-gentle,
  .animate-shimmer,
  .animate-wave,
  .animate-float,
  .animate-fade-in,
  .animate-typing {
    animation: none !important;
  }

  .transition-smooth,
  .transition-standard,
  .transition-quick {
    transition: none !important;
  }
}
```

### React Context Integration

The application provides a global `reducedMotion` state via `UIContext`, which should be used to optimize performance or simplify layouts in React components.

```typescript
import { useUI } from '@/contexts/UIContext';

const MyComponent = () => {
  const { reducedMotion } = useUI();
  
  // Conditionally disable complex effects
  if (reducedMotion) {
    return <SimpleState />;
  }
  
  return <FullExperience />;
};
```

### Alternative Patterns

When motion is reduced:
- Use opacity changes instead of movement
- Show/hide instantly instead of animating
- Keep functional feedback (color changes, borders)

## Performance Guidelines

### Use `transform` and `opacity`

These properties can be GPU-accelerated:
- `transform: translate(), scale(), rotate()`
- `opacity`

Avoid animating:
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`
- `box-shadow` (use opacity on pseudo-element instead)

### GPU Acceleration

```css
/* Force GPU acceleration */
.gpu-accelerated {
  transform: translateZ(0);
  will-change: transform;
}

/* Only use will-change when needed */
.animating {
  will-change: transform, opacity;
}

/* Remove after animation */
.animation-complete {
  will-change: auto;
}
```

### Avoid Layout Thrashing

```typescript
// ❌ Bad - causes reflow
element.style.width = '100px';
const height = element.offsetHeight; // Forces reflow
element.style.height = height + 'px';

// ✅ Good - batch reads and writes
const height = element.offsetHeight;
requestAnimationFrame(() => {
  element.style.width = '100px';
  element.style.height = height + 'px';
});
```

## Animation Timing Reference

### By Interaction Type

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Button press | 75ms | ease-out |
| Hover state | 100-150ms | ease-out |
| Toggle change | 150ms | ease-out |
| Modal open | 200ms | ease-out |
| Modal close | 150ms | ease-in |
| Page transition | 300ms | ease-in-out |
| Content fade in | 500ms | ease-in |

### By Component

| Component | Animation | Duration |
|-----------|-----------|----------|
| Track card | Hover lift | 150ms |
| Track card | Active press | immediate |
| Play button | State change | 150ms |
| Progress bar | Fill update | 100ms |
| Dropdown | Open/close | 150ms |
| Modal | Enter | 200ms |
| Modal | Exit | 150ms |
| Toast | Slide in | 200ms |
| Toast | Slide out | 150ms |
| Skeleton | Pulse | 3000ms |

## Testing Animations

### Checklist

- [ ] Animation serves a clear purpose
- [ ] Duration feels appropriate (not too slow or fast)
- [ ] Easing feels natural
- [ ] Works with `prefers-reduced-motion`
- [ ] Performance is smooth (60fps)
- [ ] No layout thrashing
- [ ] GPU-accelerated where possible
- [ ] Consistent with similar components

### Browser DevTools

1. Open DevTools → Performance tab
2. Record while triggering animation
3. Check for:
   - Frame drops below 60fps
   - Long tasks blocking main thread
   - Excessive paint/layout operations

## Related Documentation

- [UI Visual System](./ui-visual-system.md) - Design tokens and styling
- [Modal Patterns](./modal-patterns.md) - Modal animation specifications
- [Components UI Reference](../reference/components-ui-reference.md) - Loading and skeleton state patterns
- [Component Architecture](../architecture/component-architecture.md) - Component implementation
