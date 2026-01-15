# Gradient System — MetaDJ Nexus

**Last Modified**: 2026-01-14 21:23 EST

MetaDJ Nexus now uses a tokenized gradient stack so every surface—code, docs, and future agents—pulls from the same source of truth. The system lives in `src/app/globals.css` and exposes:

- **CSS custom properties** for the actual gradient recipes
- **Utility classes** that map those tokens to the common use cases (backgrounds, borders, hover states, pseudo-elements, and text)
- **Documentation parity** across MetaDJ surfaces so the backdrop looks identical no matter how far you scroll

The goal: no component hardcodes `bg-linear-to-r from-purple-500 via-blue-500 to-cyan-400` anymore. Everything routes through the tokens listed below.

---

## Gradient Tokens

| Token | Definition | Purpose |
| --- | --- | --- |
| `--gradient-1` | Layered cosmic background (radial clusters + deep blue linear fade) | Default backdrop applied to `html, body` |
| `--gradient-1-overlay` | Subtle purple/indigo sweep at 12% opacity | Fixed overlay that keeps the gradient consistent while scrolling |
| `--gradient-brand` | Purple → Cyan → Magenta brand sweep | Marquee/hero CTAs, wordmarks, brand moments |
| `--gradient-2` | Lavender → violet → indigo sweep | Tinted chrome, halos, elevated list items |
| `--gradient-2-border` | 55%/45%/50% alpha version of gradient-2 | Gradient borders + stroked frames |
| `--gradient-2-soft` | 35%/30%/32% alpha | Glass cards or icon chips that need gentle color |
| `--gradient-2-tint` | 22%/18%/20% alpha | Hover fills, queue highlights, tinted pills |
| `--gradient-3` | Deep indigo media shell with radial blooms | Player chrome, hero shells, media surfaces |
| `--gradient-4` | Core purple → blue CTA gradient | Primary buttons, badges, luminous chrome |
| `--gradient-4-soft` | Soft overlay companion to gradient-4 | Header sheens, CTA overlays, mix-blend layers |
| `--gradient-media` | Indigo midnight sweep | Audio player shell, empty-state hero |
| `--gradient-media-bloom` | Magenta/blue bloom overlay | Layered highlight for media shells |

All tokens are declared once inside `:root` so Tailwind utilities can keep using RGB/HSL/OKLCH colors elsewhere without duplication.

---

## Utility Classes

| Class | What it does | Typical usage |
| --- | --- | --- |
| `.gradient-1` | Applies `--gradient-1` | User Guide overlay backdrop, marketing hero blocks |
| `.gradient-1-overlay` | Applies `--gradient-1-overlay` | Header/footer fades, body ::after, User Guide overlay glass |
| `.gradient-2` | Applies `--gradient-2` | Elevated list items, Wisdom feature badges |
| `.gradient-2-border` | Applies `--gradient-2-border` | Modal frames, Search bar halo |
| `.gradient-2-soft` | Applies `--gradient-2-soft` | Glass cards or icon chips that need gentle color |
| `.gradient-2-tint` | Applies `--gradient-2-tint` | Queue rows, TrackListItem actives, hover fills |
| `.gradient-3` | Applies `--gradient-3` | Deep media shells, hero surfaces, loop console |
| `.gradient-4` | Applies `--gradient-4` | CTA buttons, active toggles, play/pause states |
| `.gradient-4-soft` | Applies `--gradient-4-soft` | Header chrome sheens, CTA overlays |
| `.gradient-media` | Applies `--gradient-media` | Player pill base, empty-state hero |
| `.gradient-media-bloom` | Applies `--gradient-media-bloom` | Overlay bloom inside media shells |
| `.hover-gradient-2` | Adds tint token on hover | Icon-only buttons that are otherwise transparent |
| `.before-gradient-2(-tint)` | Sets pseudo-element background to gradient-2 tokens | TrackListItem/collection card sheen, floating glows |
| `.text-gradient-*` | Text-specific gradients (`primary`, `hero`, `thoughts`, `guides`, `reflections`) | Wordmarks, Hero headlines, Wisdom taxonomy |

> All of the classes above also set `background-size: 200% 200%` and `background-position: 0% 50%` so animated shimmer utilities can simply adjust background position if needed.

---

## Primary Surface Behavior (Shared Pattern)

- `html, body` already receive `--gradient-1`, so the gradient stays locked while scrolling—no more wrapping the app in `div.app-gradient`.
- `body::after` is `position: fixed` with `--gradient-1-overlay`, guaranteeing the same luminous wash that anchors the rest of the suite.
- Use `.gradient-1` only when a **nested** surface (e.g., a takeover overlay) needs its own copy of the cosmic background; otherwise rely on the root surface.
- For glass panels, prefer `bg-black/80 backdrop-blur-xl` layered on top of the root gradient. Never nest another gradient container just to “refresh” the background.

```tsx
// Root layout (no wrapper div needed)
export default function RootLayout({ children }: Props) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen">
        <UIProvider>{children}</UIProvider>
      </body>
    </html>
  )
}
```

```tsx
// User Guide overlay still uses a dedicated gradient surface
<section className="relative">
  <div className="pointer-events-none absolute inset-0 gradient-1 opacity-95" />
  <div className="relative p-[1.5px] gradient-2-border rounded-[30px]">
    <div className="rounded-[calc(30px_-_1.5px)] bg-black/80 backdrop-blur-2xl">
      {/* Overlay content */}
    </div>
  </div>
</section>
```

---

## Secondary Surface Patterns

### Buttons & CTAs
- **In-app action CTAs** (play/pause, view toggles, Start Exploring, Explore Wisdom, modal actions): `gradient-4 text-white`
- **Marquee/hero CTAs** and brand moments: use the brand sweep (`--gradient-brand`) for the strongest brand signal
- Supporting secondary actions: `gradient-4 text-white`
- Hover: scale/brightness changes (`hover:scale-105 hover:brightness-110`)
- Focus: keep existing outline utilities (`focus-visible:outline-purple-400`)

```tsx
<button className="gradient-4 text-white rounded-full px-6 py-3 font-heading hover:brightness-110 transition">
  Start Exploring
</button>
```

### Borders & Frames

To ensure perfect border radius alignment and avoid "double border" artifacts, follow this standard:

1. **Wrapper**: Use `relative`, `rounded-[30px]` (or your desired radius), and `p-[1.5px]` (standard border thickness).
2. **Inner Content**: Use `rounded-[calc(30px_-_1.5px)]` (match outer radius minus padding) and ensure **no inner border** is applied.

```tsx
<div className="p-[1.5px] gradient-2-border rounded-[30px]">
  <div className="rounded-[calc(30px_-_1.5px)] bg-black/80 backdrop-blur-xl">
    {/* Inner content - NO border class here */}
  </div>
</div>
```

### Soft Surfaces & Chips

Use `.gradient-4` for icon circles (User Guide overlay steps) and `.gradient-2-tint` for queue states or status dots. When you only need the effect on hover, add `.hover-gradient-2` to the button and keep its base transparent.

Media-heavy shells (player, empty states, hero trays) pair `.gradient-media` with a `.gradient-media-bloom` overlay to mirror the luminous sweep from the Tune experience.

### Pseudo-Element Sheen

`TrackListItem` and other cards that animate a sheen on hover now use `.before-gradient-2-tint`. Keep the existing Tailwind utilities for sizing/opacity and drop the manual `before:bg-linear-to-br ...` chain.

### Text Gradients

- `.text-heading-solid`: Default non-hero header gradient (cyan-leading heading sweep for section headers, card titles, list headings, panel labels, track/collection titles)
- `.text-gradient-hero`: Hero heading gradient (marquee H1s and wordmarks)
- `.text-gradient-primary`: Canonical brand sweep (`--gradient-brand`: Purple → Cyan → Magenta) for accents and wordmark experiments
- `.text-gradient-full`: Alias of `.text-gradient-primary` (prefer `hero` for marquee headings)
- `.text-gradient-thoughts`, `.text-gradient-guides`, `.text-gradient-reflections`: Wisdom palettes (utilities exist, currently unused; see `docs/features/wisdom-gradient-system.md`)

Always apply these classes **instead** of hardcoding `bg-linear-to-r` on the text node.

### Text Gradient Continuity Rules
When a heading spans multiple elements/spans, the gradient stops must align to ensure **Seamless Color Continuity**.
-   **Terminal Alignment**: The concluding color of the first span must exactly match the initial color of the second span.
-   **Bridging Pattern**: Use a 3-stop gradient (`from`, `via`, `to`) on the first span to bridge the energy into the second span (e.g., `indigo-500` → `violet-400` → `violet-300` matches a second span starting at `violet-300`).
-   **Standard "Pop" (Thickness)**: Always apply the `.text-pop` utility alongside text gradients to ensure consistent legibility and presence.

---

## Application Patterns

### Pattern 1: Cosmic Container + Radiant Panel
```tsx
<section className="bg-black/80 backdrop-blur-2xl rounded-3xl">
  <div className="grid gap-4 md:grid-cols-3">
    <article className="radiant-panel rounded-2xl p-5">
      <h3 className="text-heading-solid font-heading text-xl">Cinema</h3>
      <p className="text-white/75 text-sm">
        Fullscreen immersive console with the MetaDJ loop.
      </p>
    </article>
  </div>
</section>
```

### Pattern 2: Fixed Background (no wrapper)
```tsx
export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 px-4 sm:px-6">{/* content */}</main>
      <Footer />
    </div>
  )
}
```

### Pattern 3: Queue & Icon Buttons
```tsx
<button
  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/80 hover-gradient-2 hover:border-white/30 transition"
  aria-label="Move later in queue"
>
  <ChevronDown className="h-4 w-4" />
</button>
```

### Pattern 4: Progress + Volume Fills
```tsx
<div className="gradient-4 h-2 rounded-full" style={{ width: `${progress}%` }} />
```

---

## Implementation Guidelines

1. **Never hardcode** `bg-gradient-to-*` for the purple/blue/cyan palette—always reach for the utility classes.
2. **Root backdrop only**: the app no longer wraps content in `.app-gradient`. Body + fixed overlay already provide the effect.
3. **Borders use the border utility**: if you need a gradient frame, wrap your content with `p-[1.5px] gradient-2-border` instead of applying gradients directly to the content block.
4. **Hover effects**: prefer `.hover-gradient-2` for icon-only controls instead of repeating gradient declarations.
5. **Pseudo-elements**: when you need a sheen, use `.before-gradient-2` or `.before-gradient-2-tint` plus the usual Tailwind `before:` utilities.
6. **Text**: use `.text-heading-solid` for non-hero headings; reserve `.text-gradient-hero` for marquee H1s and hero wordmarks; use `.text-gradient-primary` for accents/wordmarks; prefer `.text-gradient-*` utilities instead of hardcoded gradients.

### Exceptions (Temporary)

- **Collection themes**: collection-specific gradients remain centralized in `src/lib/collection-theme.ts` until tokenized variants are added to `src/styles/gradients.css`.
- **Decorative sheens**: white → transparent overlay gradients are permitted when no tokenized alternative exists.

---

## Quick Reference

- **Tokens & Classes**: `src/app/globals.css`
- **UI System Overview**: `docs/features/ui-visual-system.md`
- **Wisdom Gradient Details**: `docs/features/wisdom-gradient-system.md`
- **Implementation Examples**: `src/components/guide/UserGuideOverlay.tsx`, `src/components/layout/AppHeader.tsx`, `src/components/panels/left-panel/QueueSection.tsx`, `src/components/player/`

Always align updates with CLAUDE.md and Cursor rules before committing—to keep the documentation triad in sync.
