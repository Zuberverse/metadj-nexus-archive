# MetaDJ Nexus UI & Visual System

> **Source of truth for MetaDJ Nexus's premium glass-neon presentation**

**Last Modified**: 2025-12-29 12:28 EST

---

## Table of Contents

- [Purpose](#purpose)
- [Design Principles](#design-principles)
- [Brand Header & Feature Labels](#brand-header--feature-labels)
- [Visual Foundations](#visual-foundations)
  - [Color Tokens](#color-tokens-srcappglobalscss)
  - [Gradient Treatments](#gradient-treatments)
  - [Typography & Spacing](#typography--spacing)
  - [Surfaces & Elevation](#surfaces--elevation)
- [Layout Structure](#layout-structure)
  - [Global Cinema](#global-cinema)
  - [Sticky Header](#sticky-header-srccomponentslayoutappheadertsx)
  - [Collections Section (Left Panel)](#collections-section-left-panel)
  - [Track Listing](#track-listing-collection-detail)
  - [Footer](#footer)
- [Key Component Treatments](#key-component-treatments)
- [Visual Console (Fullscreen Cinema)](#visual-console-fullscreen-cinema)
- [Mobile-First Responsive Design](#mobile-first-responsive-design)
- [Interaction, Motion & Accessibility](#interaction-motion--accessibility)
- [Asset & Media Guidance](#asset--media-guidance)
- [Extending the System](#extending-the-system)

---

## Purpose

MetaDJ Nexus establishes the visual benchmark for all MetaDJ experiences. This guide captures the exact color language, surface treatments, layouts, and interaction patterns present in v1.54 so other MetaDJ products can mirror the same high-polish feel without reverse-engineering the codebase.

## Design Principles

- **Glassmorphism everywhere** – Layered glass panels (`bg-card/30`, `.glass`, `.glass-card`) with frosted blur (up to `backdrop-blur-2xl` for premium cards) and subtle borders keep the interface luminous without losing legibility.
- **Radiant Depth** – Semantic `glass-radiant` and `glass-radiant-sm` utilities provide a standard for high-exposure panels with integrated glows and secondary gradients, ensuring a consistent luminous depth across the application.
- **Alive Ambience** – Backgrounds (like the Hub Hero) use `animate-pulse-gentle` to create a living, breathing atmosphere. Main control panels feature a **Global Aura Glow** that pulses with the real-time audio energy (`overallLevel`).
- **Neon gradients as energy** – `gradient-4` (purple → deep blue) powers in-app actions, tabs, and active player states; reserve the brand sweep (`--gradient-brand`) for marquee/hero CTAs and wordmark moments.
- **Pulse-Driven Controls** – The primary play/pause button implements a **Beat-Shimmer** pulse, scaling slightly in sync with the audio beat during playback.
- **Dark nightclub backdrop** – A deep purple-tinted background (`hsl(240 10% 12%)`) framed by an OKLCH gradient overlay keeps content floating in a cinematic void.
- **Typography as luxury** – Cinzel headings with widened tracking signal prestige; Poppins body text keeps long-form copy legible.
- **Contextual feedback** – Active/hover states always introduce light, glow, and subtle motion (`interactive-scale`, `animate-pulse-gentle`) so the UI feels alive without being noisy.

## Brand Header & Feature Labels

The top header serves as the persistent MetaDJ brand anchor and reflects the active feature:

- **Welcome / User Guide** — MetaDJ logo + “verse” suffix.  
- **Music feature** — MetaDJ logo + “Music” label.  
- **Cinema feature** — MetaDJ logo + “Cinema” label.  
- **Wisdom feature** — MetaDJ logo + “Wisdom” label.  
- **MetaDJai panel** — Cinzel “MetaDJai” wordmark only (no logo), to distinguish the companion from the main navigation stack. Control Panel shares the same glass treatment so both overlays feel consistent.

This pattern keeps the brand consistent while making it clear which experience the listener is currently in, without introducing separate platform names.

## Visual Foundations

### Color Tokens (`src/app/globals.css`)

| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `hsl(240 10% 12%)` | Page backdrop and player base.
| `--card` | `hsl(240 8% 18%)` | Glass panels, search, queue, descriptions.
| `--primary` | `hsl(264 82% 65%)` | Primary accents, highlights, focus rings.
| `--secondary` | `hsl(250 80% 63%)` | Secondary gradient stop.
| `--accent` | `hsl(190 70% 58%)` | Cyan highlight for visuals and success states.
| `--muted` | `hsl(240 5% 45%)` | Subdued labels and supporting copy.
| `--border` | `hsl(240 8% 28%)` | Card outlines and separators.
| Agent OKLCH tokens | e.g. `oklch(0.646 0.222 264.376)` | Brand badge palette shared across cards/badges.

**Global overlay:** `body::after` applies `--gradient-1-overlay` to add the shared ambient glow across the suite.

### Gradient Treatments

- **In-app CTA gradient** – `gradient-4` utility (purple → deep blue sweep) used on play/pause, Add to Queue, Start Exploring, Explore Wisdom, and view-toggle buttons.
- **Header sweep** – `gradient-4-soft opacity-40` layered under the sticky header glass.
- **Tinted chrome** – `gradient-2`, `gradient-2-tint`, and `gradient-2-border` power search halos, queue active states, and featured cards.
- **Search dropdown container** – Anchored to the search input width (clamped ~560px, padded viewport edges), rendered as a compact glass card (`bg-[rgba(7,10,24,0.96)]`, subtle white veil, border-white/20) with hover/active shadows matching the queue palette. Lives in `src/components/search/SearchBar.tsx` and uses a fixed portal so page scroll remains unlocked.
- **Primary Heading Gradient** – `.text-gradient-hero` uses a high-luminosity pastel sweep (`from-purple-200 via-cyan-200 to-fuchsia-200`); reserve it for hero H1s and marquee wordmarks.
- **Heading Solid Standard** – Use `.text-heading-solid` (cyan-leading heading gradient + `text-pop`) for all non-hero headers and subheaders (section headers, card titles, list headings, panel labels, modal headers, track titles, collection titles). **Exceptions**: hero H1 split gradients (Hub/Wisdom) and other marquee wordmarks keep their custom span gradients; apply `text-pop` directly only when using custom multi-span gradients.
- **Brand Sweep (Marquee)** – `.text-gradient-primary` uses the canonical brand sweep (`--gradient-brand`: Purple → Cyan → Magenta). Use for marquee/hero headlines and wordmarks when brand signal should dominate.
- **Overlay Toggle Icons** – Use `BrandGradientIcon` (stroke: `--gradient-brand`) for the Music + MetaDJai overlay toggles (header + mobile nav) so both icons share the same brand energy.
- **Section Header Icons** – Use `BrandGradientIcon` for leading icons in section/container headers so the icon energy matches the primary gradient typography.
- **Hero Backgrounds** – The Hub Hero adopts the `gradient-media` + `gradient-media-bloom` stack from the Welcome Overlay, creating a unified "portal" aesthetic with deep, rich background layers and a vibrant gradient border.
- **No Black Endpoints** – To preserve visual depth and prevent artifacts, all gradients within the "Glass-Neon" system must avoid black (`#000`, `hsl(0 0% 0%)`) at their endpoints. Use dark charcoal or deep purple tints instead (e.g., `#0a0e1f`).
- **Seamless Color Continuity (Elegant Shift)** – When text headings are split into multiple spans (e.g., "Explore MetaDJ's Reality"), the first span must terminate at the exact color token where the second span begins. For example, if "MetaDJ" starts with `violet-300`, the preceding "Explore" word must transition from its start color (`indigo-500`) into `violet-300` at its terminus. This creates a bridge that makes the entire header feel like a single fluid energy field.
- **Collections browse & details (Left Panel)** (`src/components/panels/left-panel/BrowseView.tsx`, `CollectionDetailView.tsx`) — Featured card + vertical collection list; selecting opens a detail view with Play All / Shuffle and optional About toggle. This is the canonical collection selector.
- **Track rows** (`src/components/ui/TrackListItem.tsx`) mirror collection gradients for hover/current states and inline actions (queue, share, options).
- **Themed Highlight System** (`getCollectionHoverStyles`): A centralized utility applies collection-specific glow effects (border + gradient background fill + shadow) to interactive elements.
  - **Majestic Ascent**: Purple/Magenta glow (`shadow-purple-500/25`) with gradient fill.
  - **Bridging Reality**: Deep Blue/Indigo glow (`shadow-blue-600/25`) with gradient fill.
  - **Metaverse Revelation**: Cyan/Electric Blue glow (`shadow-cyan-500/25`) with gradient fill.
  - **Transformer**: Emerald/Teal glow (`shadow-emerald-500/25`) with gradient fill.
  - **Featured**: Indigo/Blue glow (`shadow-indigo-500/25`) with gradient fill.
  - **Default**: Signature Purple glow.
  - **Usage**: Applied to Hub cards, Left Panel collection lists, Track items, and Wisdom categories (mapped to collection themes).
- **Queue add feedback** (player/left‑panel controls + toasts) uses prominent gradient confirmations; the old TrackCard overlay system is retired.
- **Compact Track Cards** (`HubExperience.tsx`, `RecentlyPlayedRail.tsx`): Hub track cards use a space-efficient design where action buttons (play, add to queue) overlay on hover using absolute positioning. Artist labels removed since all music is by MetaDJ. This pattern maximizes content density while maintaining full functionality via `group-hover` states. Max-width constraints (`max-w-3xl`) ensure comfortable reading on wide screens.
- **Cinema active state** (`AudioPlayer.tsx`): cyan gradient outline (`border-cyan-300/60`) + glow when the fullscreen loop is enabled.
- **MetaDJai composer** (`src/components/metadjai/MetaDjAiChat.tsx`): curved square send button with paper-plane icon, gradient glow, and disabled states that dim when the textarea is empty or a response is streaming. The "Actions" menu is an absolute overlay with context suggestions, curated on-demand prompts, and a custom action builder (local-only) so layout stays stable.
- **AI Action Discoverability**: The "Actions" button in MetaDJai chat features an `animate-ai-pulse` glow that triggers on new track starts to guide user attention toward available tools. Interaction immediately stops the animation.
- **Chat Bubbles & Input**: The chat input area and message containers now have clearer `border-white/20` outlines for better visibility against the dark background.
- **Queue Empty States**: Initial and depleted queue states use premium high-fidelity glassmorphic illustrations (derived from brand assets) and direct CTAs ("Discover Music", "Feed the Queue") to maintain the premium feel even during content gaps.

### Typography & Spacing

- Headings: Cinzel (`font-heading`) with aggressive letter-spacing (`tracking-[0.32em]` for micro labels).
- Body: Poppins-defined sans stack for readability.
- Heading sizes: `h1` scales to `text-6xl` on desktop, `h2` to `md:text-4xl`, `h3` to `md:text-3xl`.
- Radii: Shared via `--radius: 0.625rem` → `rounded-2xl` for primary surfaces, `rounded-3xl` for overlays.
- Spacing: Containers center at `max-w-6xl` with `px-4`–`px-8` padding; cards use `p-3`/`p-4`, overlays expand to `px-6` or more for spacious breathing room.

### Surfaces & Elevation

- `.glass`: base glass header/backdrop (transparent white fill, blur 10px, border alpha 0.1).
- `.glass-card`: deeper blur + boxed shadow for overlays (used in Welcome overlay, high-impact panels).
- `.glass-radiant`: Standard luminous panel with integrated glow and `gradient-2-tint` background.
- `.glass-radiant-sm`: Lighter luminous panel for secondary/smaller interactive cards.
- **Layered Drop-Shadow "Pop" (`text-pop`)** – To make the vibrant gradient text stand out against dark backgrounds, use the `.text-pop` utility which applies three layers of `drop-shadow`:
    1.  **Definition Layer**: `drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]` – A sharp dark offset that acts as an "outline" for legibility.
    2.  **Vibrance Layer**: `drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]` – A concentrated inner glow that enhances the text's luminosity.
    3.  **Ambience Layer**: `drop-shadow-[0_0_40px_rgba(139,92,246,0.25)]` – A broad outer glow that creates the ambient neon "presence".
- **Standard Thickness Usage**: `.text-heading-solid` is the default for gradient headers/subheaders. Use `.text-pop` only when a custom gradient span replaces `.text-gradient-hero`.
- Shadows lean purple: `shadow-[0_12px_36px_rgba(18,15,45,0.45)]` for cards; `shadow-purple-500/40` for queue popover.
- Hover overlay utility `.hover-gradient` adds a restrained tri-tone sheen with white inset border.

## Layout Structure

### Global Cinema

- `div.flex-col min-h-screen` ensures footer sits at bottom with `Footer` applying an additional gradient fade.
- `main` pads the bottom to accommodate the fixed player (`pb-12`).

### Sticky Header (`src/components/layout/AppHeader.tsx`)

- Full-width glass panel pinned at `top-0` with `backdrop-blur-xl` and gradient overlay.
- **Music Pill Integration**: The track selection "pill" acts as a unified playback/navigation hub.
    - **Header Music Pill**: Features a dynamic `ChevronDown` that rotates 180° when the music panel is open/active, signaling the "collapse" affordance.
    - **Visual Feedback**: Hover interaction includes an icon-scale effect and a subtly brighter background glow (`bg-white/10`).
    - **Interactivity Reinforcement**: The music toggle pill features a persistent subtle outline (`ring-1 ring-white/10`) to reinforce its role as a clickable toggle even without hover. Hovering increases this to `ring-white/20`.
- **Footer Standards**:
    - **Single-Line Layout**: Consolidates legal text and links into a single horizontal row on desktop.
    - **Brand Purity**: Redundant logos and wordmarks are removed from the footer to avoid "logo fatigue" (since branding is persistent in the header).
    - **Legal Accuracy**: Removed all inaccurate copyright symbols and year markers in favor of a clean, factual legal statement.
    - **Mobile Optimization**: Uses stylized bullet separators (`&bull;`) and uppercase tracking (`0.2em`) for an ultra-minimal, high-end mobile experience.
- **Floating Border**: Bottom border uses a radial-style gradient (`from-transparent via-white/15 to-transparent`) instead of a solid line, creating a floating effect.
- **Left (desktop):** Music toggle + MetaDJ wordmark image + "verse" gradient label.
- **Center (desktop):** View toggles + Playback pill (track title + prev/play/next + one-tap Library/Queue + Search dropdown).
- **View toggle icons:** Optically balanced sizes (Cinema slightly larger, Wisdom matched to Hub) with non-shrinking icons so every tab shows a consistent glyph.
- **Mobile header:** Fully-featured music pill only (track title + playback controls + queue + search). Logo and view toggles hidden on mobile.
- **Right (desktop):** MetaDJai toggle. On mobile, all navigation lives in the 6-button bottom nav (Hub, Cinema, Wisdom, Journal, Music, MetaDJai).

### Collections Section (Left Panel)

- Collections are browsed from the Left Panel **Library** tab (`leftPanelTab="browse"`, rendered by `BrowseView.tsx`) rather than center-page tabs.
- The Library includes a SearchBar above Featured for quick track + collection discovery.
- Featured renders as a top gradient “card,” followed by a vertical list of collections with artwork + track count.
- Selecting a collection opens `CollectionDetailView.tsx` with Play All / Shuffle controls and an optional “About Collection” toggle.

### Track Listing (Collection Detail)

- Tracks render as glass rows via `TrackListItem.tsx`, with collection‑specific hover gradients and inline actions.
- Current/playing tracks get a subtle gradient‑tint highlight and animated `PlayingIndicator` overlay on artwork.

### Footer

- Glass gradient (`bg-linear-to-b from-background/50 to-background/80`).
- Footer links (User Guide + Terms) use neutral white styling that matches the User Guide link treatment.
- Brand labels (MetaDJ + Zuberant) share the same weight and color for balance.
- Stacked center alignment with gradient text brand mark, licensing copy, and `licensing@metadj.ai` link styled with purple underline.

## Key Component Treatments

### Audio Player (Anchored Bottom)

- Launch surfaces use a full-width pill on desktop (`lg:max-w-none`) with `border-white/15`, `bg-background/85`, `shadow-2xl shadow-purple-500/30`, `backdrop-blur-xl`, and generous side padding.
- Responsive layout: left column for artwork/metadata, center column for transport controls, right column for queue/shuffle/repeat plus a glass volume slider; small screens collapse to stacked rows with mobile-friendly buttons and a compact slider.
- Controls use bordered ghost buttons (`border-white/15`, hover lighten) with gradient highlight when toggled; play/pause remains a 56–64px gradient capsule sourced from Lucide icons.
- Queue button reveals the popover described below.

### Queue Popover

- Dialog anchored above player with width clamp `<= 760px`.
- Sections: "Priority Cue" (manual adds) and "Auto Sequence", each with count badge.
- Active items get gradient background (`gradient-2-tint`), inactive stay glass with dashed border option when empty.
- Action buttons (reorder, remove) are circular bordered glass controls.

### Search Results Dropdown

- Uses `border-white/15`, `bg-card/95`, `backdrop-blur-xl`.
- Header label uses wide tracking uppercase.
- Row hover uses `bg-white/10`; active queue CTA inherits primary gradient button styling.

### Empty States

Empty states maintain the premium glass-neon aesthetic even when content is absent. The shared `EmptyState` component (`src/components/ui/EmptyState.tsx`) provides consistent treatment across all empty content areas.

**Structure:**
- Centered flexbox layout with icon container, title, description, and optional action
- Icon wrapped in a rounded container with glass styling
- Title uses heading typography; description uses muted text

**Size Variants:**
| Variant | Container Padding | Icon Container | Title Size | Description Size |
|---------|-------------------|----------------|------------|------------------|
| `sm` | `py-6 px-4` | `p-3` | `text-sm` | `text-xs` |
| `md` | `py-8 px-5` | `p-4` | `text-base` | `text-sm` |
| `lg` | `py-12 px-6` | `p-5` | `text-lg` | `text-base` |

**Icon Variants:**
| Variant | Style | Use Case |
|---------|-------|----------|
| `default` | Glass background (`bg-white/5`), elevated border | Standard empty states |
| `elevated` | White overlay (`bg-white/10`), stronger shadow | Primary content areas |
| `subtle` | Minimal white overlay (`bg-white/3`) | Inline/secondary areas |

**Codebase Usage:**
- **RecentlyPlayedRail** — `size="md"`, `iconVariant="subtle"` with History icon; wrapped in gradient border card
- **CollectionManager** — `size="lg"`, `iconVariant="elevated"` with Music icon; premium treatment for main content
- **Queue sections** — Custom glassmorphic treatment preserved for high-fidelity queue illustrations (intentionally not using shared EmptyState)

**Voice & Copy:**
- First-person artist voice for descriptions ("My originals will appear here")
- Action-oriented titles ("Your listening history will appear here")
- Optional CTA buttons inherit Button component styling

**Related Reference:** See `docs/reference/components-ui-reference.md` → EmptyState section for full props interface.

### Welcome Overlay

- Full-screen overlay (`z-100`) using the shared `gradient-1` + `--bg-overlay` blur stack.
- Container: `rounded-[30px]` with `gradient-2-border`, inner `gradient-media` + `gradient-media-bloom`.
- **Auto-open gating**: `STORAGE_KEYS.WELCOME_SHOWN` + a per-session flag (`metadj_welcome_shown_session`) keep it first-time-only by default (alternate key: `STORAGE_KEYS.WELCOME_DISMISSED`).
- **Header**: "Welcome to MetaDJ Nexus" with wordmark integration.
- **Tagline**: "Where music, visuals, and wisdom converge".
- **Feature Cards**: Original Music / Immersive Visuals / Beyond the Sound (glass cards with icon + heading + description).
- **Public Preview callout**: cyan-tinted notice block.
- **CTAs**: "Take Tour" (desktop tour; mobile opens the User Guide) + "Start Exploring" (primary close).
- **Keyboard**: Escape closes; focus is trapped and restored on close.

### Toast Notifications

- Fixed bottom center, rounded pill `bg-black/80`, `border-white/20`, purple shadow.

## Visual Console (Fullscreen Cinema)

- Activated via cinema toggle (`MonitorPlay` icon). When open:
  - Fullscreen video background streamed from `/api/video/metadj-avatar/MetaDJ Performance Loop - MetaDJ Nexus.mp4` (H.264). An optional VP9 WebM variant can live alongside it for Chrome/Firefox if uploaded to App Storage.
  - **2D Visualizers**:
    - **Eight Bit Adventure**: A retro pixel-art runner with parallax backgrounds, collectible power-ups, and audio-reactive enemies.
    - **Pixel Portal**: A digital void with a central portal, bass shockwaves, and spark dust that rides the highs.
    - **Synthwave Horizon**: An outrun-style neon grid with a sunset, bobbing music notes, and a starry sky.
- If the video fails to load, a solid black overlay with a "No Video Available" pill and clarification message displays instead of stretching the poster or controls.
- If no track is selected, a center message with `Visual Console Ready` pill guides users to start playback.
- Controls stack vertically with the `MetaDJ Visual Console` pill header, exit button, and audio player transplanted to the overlay.
- Controls auto-hide after 5 seconds (`cinemaControlsVisible` toggles `opacity-0 pointer-events-none`); pointer movement or tap resets the timer immediately.
- Instruction footer clarifies `Esc` and `Space` keyboard shortcuts.
- Base page audio player fades out (`opacity-0 pointer-events-none`) while overlay is active.
- Cinema now renders full-bleed; panels overlay on top rather than constraining the viewport. Panel toggles surface alongside the cinema controls so both panels can be reopened without edge-hovering.
- The cinema toolbar is simplified (scene selector + status) with the poster/video pill removed.

## Mobile-First Responsive Design

MetaDJ Nexus is built with a mobile-first approach, ensuring optimal touch interaction, viewport management, and responsive layouts across all screen sizes.

### Viewport Configuration

- **Interactive Widget Behavior**: `interactiveWidget: 'resizes-content'` allows viewport to resize when keyboard opens
- **Keyboard Detection**: `visualViewport` API tracks keyboard height for dynamic positioning
- **Responsive Breakpoints**: Uses Tailwind's default breakpoints
  - `xs`: 480px (extra small phones)
  - `sm`: 640px (small tablets)
  - `md`: 768px (tablets)
  - `lg`: 1024px (laptops)
  - `xl`: 1280px (desktops)
  - `2xl`: 1536px (large desktops)

### Player Controls Layout

**Mobile (<lg breakpoint):**
- Single-row layout sequencing: Shuffle → Previous → Play/Pause → Next → Repeat
- Queue button remains accessible in the utility row beside volume, avoiding clutter in the primary ribbon
- Responsive gaps: `gap-2 xs:gap-2.5 sm:gap-3` maintain 44px touch targets
- Responsive padding: `px-2 py-2 sm:px-3 sm:py-2.5 md:px-4` keeps the pill compact while centering the controls

**Desktop (≥lg breakpoint):**
- Three-column grid expands the center column to host the widened progress slider
- Control ribbon mirrors shuffle/previous and next/repeat around the gradient play button for perfect symmetry
- Right column houses view toggles, queue button, and gradient volume slider with mute button

### Touch Gestures

**Swipe Navigation:**
- **Swipe left**: Next track
- **Swipe right**: Previous track
- **Minimum horizontal distance**: 50px (prevents accidental triggers)
- **Maximum vertical distance**: 100px (avoids conflicts with vertical scrolling)

**Touch Targets:**
- All interactive elements use `touch-manipulation` class
- Minimum target size: `min-h-[44px] min-w-[44px]` for accessibility
- Follows WCAG 2.5.5 guidelines for touch target spacing

**Pinch-Zoom Prevention:**
- `touch-manipulation` class applied to fullscreen overlays (Cinema, MetaDJai, Music panel)
- Prevents accidental pinch-zoom while preserving native scroll behavior
- Scoped to specific overlays rather than global body to maintain accessibility
- Input fields use 16px font-size to prevent iOS auto-zoom on focus

### Popups & Modal Sizing

**Queue Manager:**
- Width: `min(100vw - 2.5rem, 760px)` (viewport-aware with max-width cap)
- Heights: `60vh` (mobile) → `65vh` (sm) → `80vh` (md+)
- Internal padding: `px-3 sm:px-5 py-5`
- Single-line summary row shows **Priority** and **Auto** counts (padded to two digits) with a shared info icon; copy explaining each lane now lives in the tooltip instead of occupying body space.
- Info icon floats without a pill/border so it feels like a native glyph; counts bumped to `text-base` weight for at-a-glance readability.
- Empty states stay silent (no instructional paragraphs) so the queue surface preserves vertical space for real tracks.
- Shares the same radiant glass stack and backdrop blur as the MetaDJai chat panel (`bg-[rgba(6,8,28,0.92)]`, bloom overlay, pointer-events-none wrapper) so listeners can keep scrolling the page while the overlay floats above the player.

**Search Dropdown:**
- Width: `calc(100vw-1.5rem)` (mobile) → `calc(100vw-3rem)` (sm) → `full` (md+)
- Max-height: `50vh` (mobile) → `60vh` (sm) → `420px` (md+)
- Near-full viewport coverage on mobile for easy result scanning
- Uses the same radiant glass as the queue overlay (98% opacity, zero bleed-through) so body copy stays readable atop hero text.
- Each result is a rounded card with hover/focus glow; the circular play button fades in only on hover/active rows to reduce visual clutter.
- Queue CTA stays pinned on the right for every row, matching the playlist cards.
- Dropdown wrapper mirrors the MetaDJai panel (pointer-events-none fixed portal) so the rest of the page remains scrollable even when the search surface is open.

**Welcome Overlay:**
- Max-widths: `calc(100vw-1.5rem)` (mobile) → `calc(100vw-2rem)` (xs) → `2xl` (sm) → `3xl` (md) → `4xl` (lg) → `5xl` (xl)
- Padding: `p-3 xs:p-4 sm:p-6 md:p-8`
- Margins: `mx-3 xs:mx-4 sm:mx-6`
- Vertical scrolling: `max-h-[92vh] overflow-y-auto`

**Track Details Modal:**
- Mobile: Full-screen (`w-full h-full`)
- Tablet+: Side-panel (`sm:w-[85%] md:w-[55%] lg:w-[45%] xl:w-[38%] 2xl:w-[32%]`)
- Heights: `h-full` (mobile) → `sm:h-auto sm:max-h-[85vh]` (tablet+)
- Border radius: None (mobile) → `sm:rounded-2xl` (tablet+)

### Component Responsiveness

**Track Cards:**
- Padding: `p-2.5 sm:p-3 md:p-4`
- Gaps: `gap-2 sm:gap-3`
- Genre tags: `hidden xs:inline-block` (hidden on smallest screens)
- Play button overlay scales with card size

**Left Panel Tabs (Library / Playlists / Queue):**
- Equal-width buttons (`flex-1`) so the three tabs fit cleanly across mobile/tablet/desktop.
- Touch-friendly sizing on mobile overlay, with clear active state glow.

**Breadcrumbs:**
- Horizontal scroll: `overflow-x-auto scrollbar-hide`
- Prevents wrapping on mobile while maintaining full visibility

### Interaction Patterns

**Touch-Specific Classes:**
- `touch-manipulation`: Applied to all buttons and interactive elements
- Optimizes touch delay and prevents double-tap zoom
- Improves perceived responsiveness on mobile devices

**Scrollbar Management:**
- Custom `scrollbar-hide` utility class removes scrollbars while maintaining scroll functionality
- Used on navigation pills, breadcrumbs, and horizontal scrolling containers
- Maintains clean visual appearance on mobile

## Interaction, Motion & Accessibility

- Hover lift: `.interactive-scale` + `active:scale` keeps controls tactile.
- Motion utilities: `animate-pulse-gentle` (gentle 3s pulse), `hover-gradient` shimmer, `shadow-sm` transitions. `prefers-reduced-motion` disables animations.
- **Audio-Reactive Motion**:
  - **Global Aura Glow**: A semi-transparent radial glow behind the main control panel that scales with `overallLevel` (0.4 magnitude).
  - **Beat-Shimmer**: Play/Pause button scales (up to 12%) in sync with `overallLevel` peaks.
- Keyboard support:
  - Global shortcuts from `useKeyboardShortcuts` (Space, arrows, M, queue navigation).
  - Consistent dismissals via `useEscapeKey` and `useClickAway` hooks.
  - All interactive elements include `aria-label` or `aria-pressed` states; queue uses `role="dialog"`.
  - Search dropdown uses `onMouseDown` prevent-default to keep input focus.
  - Welcome overlay locks body scroll and closes on `Esc`.
- Focus styling: `focus-visible:outline-solid`, purple glow, or `.focus-ring-enhanced` for custom elements.

## Asset & Media Guidance

- Logo wordmark referenced at `/images/metadj-logo-wordmark.png` with drop shadow for readability.
- Collection artwork sits in `/images/*-collection.svg` and is shown at 56px square inside rounded frames.
- Visual console poster fallback `/images/og-image.png` matches brand gradient palette.
- Track artwork fallback uses `/images/placeholder-artwork.svg` (glass disc on gradient) instead of a generic image.
- Audio derivatives stream as 320 kbps MP3s from App Storage (`audio-files/<collection>/...`) with matching metadata in `src/data/tracks.json`.

## Extending the System

- **New tabs or badges** must define matching gradient triplets and white border overlays.
- **New buttons** must use the shared `Button`, `IconButton`, or `ToggleButton` components (`src/components/ui/Button.tsx`).
  - **Primary**: Gradient fill (`variant="primary"`) for main calls-to-action.
  - **Secondary**: Glass background (`variant="secondary"`) for alternative actions.
  - **Ghost**: Transparent with hover effect (`variant="ghost"`) for low-emphasis controls.
  - **Destructive**: Red-tinted (`variant="destructive"`) for dangerous actions like deletion.
  - **Touch Targets**: All interactive elements must meet the 44px minimum touch target size.
- **Additional overlays** follow the `glass-card` template: deep blur, 20px white border alpha, heavy purple shadow, and wide-spacing typography.
- **Icons** come from Lucide with 1.5–2px stroke; maintain white/70 idle, white/100 active states.

MetaDJai and future MetaDJ surfaces should import these tokens and patterns directly (colors, gradients, glass surfaces, typography, interaction states) to guarantee consistent brand presence.
