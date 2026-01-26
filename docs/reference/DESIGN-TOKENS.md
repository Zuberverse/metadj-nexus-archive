# Design Tokens Reference

**Last Modified**: 2026-01-26 00:00 EST

## Overview

MetaDJ Nexus uses a comprehensive design token system defined in `src/app/globals.css`. All tokens use CSS custom properties and are registered with Tailwind CSS 4's `@theme` directive for utility class generation.

**Design Principles**:
- **OKLCH Colors** — Perceptually uniform color space for consistent vibrance
- **Semantic Naming** — Tokens named by purpose, not appearance
- **8px Base Grid** — Spacing follows 8px increments
- **Progressive Scale** — Tokens scale predictably (xs, sm, md, lg, xl, 2xl)

---

## Color Tokens

### Brand Colors (OKLCH)

The MetaDJ brand uses a Purple → Cyan → Magenta transformation arc representing Human → AI → Synthesis.

| Token | OKLCH Value | Usage |
|-------|-------------|-------|
| `--metadj-purple` | `oklch(0.646 0.222 264.376)` | Human wisdom, primary brand |
| `--metadj-cyan` | `oklch(0.6 0.118 184.704)` | AI amplification |
| `--metadj-magenta` | `oklch(0.702 0.295 328.3)` | Synthesis, completion |
| `--metadj-blue` | `oklch(0.59 0.21 255)` | Technical reliability, links |
| `--metadj-emerald` | `oklch(0.72 0.17 155)` | Growth, success states |
| `--metadj-red` | `oklch(0.57 0.24 27)` | Alert, error states |
| `--metadj-amber` | `oklch(0.78 0.17 85)` | Warning states |

### Semantic Color Tokens

Surface colors, text colors, and borders are defined as semantic tokens that adapt to the dark theme context.

```css
/* Surface colors */
--bg-surface-base: oklch(0.13 0.02 270);
--bg-surface-elevated: oklch(0.16 0.025 270);

/* Text colors */
--text-primary: oklch(0.98 0 0);
--text-secondary: oklch(0.85 0.01 270);
--text-muted: oklch(0.65 0.01 270);
--text-subtle: oklch(0.55 0.01 270);

/* Border colors */
--border-default: oklch(0.25 0.02 270);
--border-subtle: oklch(0.2 0.015 270);
```

### Known Exceptions (Intentional Hex)

These values are currently used for specific visual effects and are allowed until migrated:

- **Control panel aura glow**: `#6076ff` in `src/components/player/ControlPanelOverlay.tsx` (radial gradient accent).
- **Admin dashboard base**: `#0a0a0a` in `src/components/admin/AdminDashboard.tsx` (backdrop base).

---

## Border Radius Tokens

### Base Scale

| Token | Value | Tailwind Class |
|-------|-------|----------------|
| `--radius-xs` | `4px` | `rounded-xs` |
| `--radius-sm` | `8px` | `rounded-sm` |
| `--radius-md` | `12px` | `rounded-md` |
| `--radius-lg` | `16px` | `rounded-lg` |
| `--radius-xl` | `24px` | `rounded-xl` |
| `--radius-2xl` | `32px` | `rounded-2xl` |
| `--radius-full` | `9999px` | `rounded-full` |

### Semantic Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-panel` | `18px` | Side panels, content containers |
| `--radius-card` | `22px` | Cards, elevated containers |
| `--radius-modal` | `1.75rem` (28px) | Modal dialogs |
| `--radius-hero` | `1.875rem` (30px) | Hero sections, large overlays |

### Usage Guidelines

```css
/* Small interactive elements */
.badge { border-radius: var(--radius-xs); }
.button-sm { border-radius: var(--radius-sm); }

/* Standard components */
.button { border-radius: var(--radius-md); }
.input { border-radius: var(--radius-md); }
.toast { border-radius: var(--radius-lg); }

/* Containers */
.card { border-radius: var(--radius-card); }
.panel { border-radius: var(--radius-panel); }

/* Large surfaces */
.modal { border-radius: var(--radius-modal); }
.hero-overlay { border-radius: var(--radius-hero); }
```

---

## Shadow Tokens

### Semantic Elevation Shadows

All shadows use OKLCH colors for consistent, rich depth.

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-panel` | `0 14px 32px oklch(0.03 0.01 270 / 0.55)` | Side panels, drawers |
| `--shadow-card` | `0 12px 26px oklch(0.03 0.01 270 / 0.4)` | Cards, list items |
| `--shadow-menu` | `0 20px 42px oklch(0.06 0.02 280 / 0.65)` | Dropdowns, popovers |
| `--shadow-modal` | `0 35px 80px oklch(0.03 0.01 270 / 0.75)` | Modal dialogs |
| `--shadow-toast` | `0 12px 36px oklch(0.10 0.03 280 / 0.45)` | Toast notifications |
| `--shadow-focus` | `0 0 0 2px oklch(0.65 0.22 290 / 0.5)` | Focus rings |

### Status Glow Shadows

For state indication and neon effects:

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-glow-error` | `0 0 20px oklch(0.60 0.25 25 / 0.25), 0 0 40px oklch(0.60 0.25 25 / 0.12)` | Error states |
| `--shadow-glow-warning` | `0 0 20px oklch(0.78 0.17 85 / 0.25), 0 0 40px oklch(0.78 0.17 85 / 0.12)` | Warning states |
| `--shadow-glow-active` | `0 0 25px oklch(0.70 0.20 280 / 0.25)` | Active/selected states |

### Usage Examples

```css
/* Apply via CSS variable */
.card { box-shadow: var(--shadow-card); }

/* Apply via Tailwind arbitrary value */
<div className="shadow-[var(--shadow-modal)]" />

/* Combine with glow for status */
.error-card {
  box-shadow: var(--shadow-card), var(--shadow-glow-error);
}
```

---

## Typography Tokens

### Letter Spacing (Tracking)

For uppercase/all-caps text styling:

| Token | Value | Usage |
|-------|-------|-------|
| `--tracking-caps-tight` | `0.15em` | Tight labels, small badges |
| `--tracking-caps` | `0.2em` | Standard uppercase text |
| `--tracking-caps-wide` | `0.3em` | Section headers, emphasis |
| `--tracking-caps-wider` | `0.4em` | Hero text, maximum impact |

### Usage Examples

```css
/* Standard uppercase label */
.label {
  text-transform: uppercase;
  letter-spacing: var(--tracking-caps);
}

/* Hero section header */
.hero-title {
  text-transform: uppercase;
  letter-spacing: var(--tracking-caps-wider);
}
```

---

## Animation Tokens

### Transition Durations

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-instant` | `75ms` | Micro-interactions, button press |
| `--duration-fast` | `150ms` | Hover states, toggles |
| `--duration-normal` | `200ms` | Standard transitions |
| `--duration-medium` | `300ms` | Panels, modals entering |
| `--duration-slow` | `500ms` | Complex animations |
| `--duration-slower` | `700ms` | Page transitions, hero effects |

### Pre-defined Transition Tokens

```css
--transition-quick: 75ms;    /* Alias for --duration-instant (prefer --duration-instant) */
--transition-standard: 150ms; /* Alias for --duration-fast (prefer --duration-fast) */
--transition-smooth: 300ms;   /* Alias for --duration-medium (prefer --duration-medium) */
```

### Usage Guidelines

```css
/* Micro-interaction */
.button:active { transition: transform var(--duration-instant); }

/* Hover state */
.card:hover { transition: box-shadow var(--duration-fast); }

/* Modal animation */
.modal {
  transition: opacity var(--duration-medium), transform var(--duration-medium);
}
```

---

## Tailwind Integration

All design tokens are registered in the `@theme` block for Tailwind utility generation:

```css
@theme {
  /* Border Radius */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-panel: 18px;
  --radius-card: 22px;
  --radius-xl: 24px;
  --radius-modal: 1.75rem;
  --radius-hero: 1.875rem;
  --radius-2xl: 32px;
  --radius-full: 9999px;

  /* Transition Durations */
  --duration-instant: 75ms;
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-medium: 300ms;
  --duration-slow: 500ms;
  --duration-slower: 700ms;
}
```

This generates Tailwind classes like:
- `rounded-panel`, `rounded-card`, `rounded-modal`
- `duration-instant`, `duration-fast`, `duration-medium`

---

## Migration Guide

### From Arbitrary Values to Tokens

**Before (arbitrary)**:
```tsx
<div className="rounded-[18px] shadow-[0_12px_36px_rgba(18,15,45,0.45)]">
```

**After (tokens)**:
```tsx
<div className="rounded-panel shadow-[var(--shadow-card)]">
```

### From Tailwind Colors to OKLCH

**Before (Tailwind yellow)**:
```tsx
bg="bg-yellow-500/10"
border="border-yellow-400/30"
```

**After (OKLCH)**:
```tsx
bg="bg-(--metadj-amber)/10"
border="border-(--metadj-amber)/30"
```

---

## Related Documentation

- **Visual Identity Standards**: `1-system/1-context/1-knowledge/9-visual-assets/visual-identity-context-standards.md`
- **UI Components Reference**: `docs/reference/components-ui-reference.md`
- **Visual Design Audit**: `docs/reports/UX-AUDIT-MVP-READINESS.md` (latest UI/UX audit)
- **Source File**: `src/app/globals.css`
