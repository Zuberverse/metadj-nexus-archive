# Collection Dropdown System

**Last Modified**: 2026-01-13 14:15 EST
**Status**: ARCHIVED (dropdown removed in v0.8.1 cleanup)

> Unified dropdown selector for browsing collections with integrated subtitles and optional collection details. Styled with MetaDJ's glass morphism and gradient aesthetic for all screen sizes.

## Overview

The archived collection dropdown system (removed in v0.8.1) provided a clean, familiar navigation pattern:

- **Historical Implementation**: Styled dropdown selector with two-line format (title + subtitle)
- **Width**: `max-w-lg` (32rem/512px) for comfortable subtitle display
- **Design**: Glass morphism with gradient background matching MetaDJ aesthetic
- **Hero Label**: Page heading reads “Music Collection” so marketing copy and product UI stay in sync
- **Optional Details**: Collapsible "About this collection" toggle reveals full collection story (centered pill button, expanded copy spans full column)
- **Typography**: Title line uses the Cinzel heading font (`font-heading`), subtitle uses the body font with responsive sizing for mobile/desktop
- **Scalability Plan**: Future phases introduce category groupings/overflow surfaces once the catalog exceeds the current dropdown’s capacity
- **Replacement**: Collections now live in the Left Panel browse experience (`BrowseView.tsx` + `CollectionDetailView.tsx`).

## Components

### CollectionTabs
**Location**: `src/components/collection/CollectionTabs.tsx`

Unified dropdown selector with premium MetaDJ styling and two-line display format.

**Features**:
- Single dropdown selector for all screen sizes
- **Two-line format**: Title (bold, larger) + Subtitle (lighter, smaller) on separate lines
- Width: `max-w-lg` (32rem/512px) for comfortable multi-line display
- Title line uses `font-heading` (Cinzel), `text-lg` desktop / `text-base` mobile; subtitle uses `text-xs` on mobile and `text-sm` on desktop for legibility against gradients
- Button padding scales (`px-5 py-3.5` mobile, `px-6 py-4` desktop) so touch targets remain at least 44px tall
- Collection-specific gradient fills when active
- Glass morphism background with gradient
- Smooth hover and focus states
- Styled dropdown options with dark background
- ARIA labels for accessibility
- ChevronDown icon indicator with rotation animation

**Display Format**:
```
Dropdown Button (closed):
┌─────────────────────────────────┐
│ Featured                      ▼ │
│ Hand-picked tracks resonating...│
└─────────────────────────────────┘

Dropdown Menu (open):
┌─────────────────────────────────┐
│ Featured                        │
│ Hand-picked tracks resonating...│
├─────────────────────────────────┤
│ Majestic Ascent                 │
│ A portal into the Metaverse     │
└─────────────────────────────────┘
```

**Props**:
```typescript
interface CollectionTabSummary {
  id: string
  title: string
  subtitle?: string  // Now displayed on second line
}

interface CollectionTabsProps {
  collections: CollectionTabSummary[]
  selectedCollection: string
  onCollectionChange: (collectionId: string) => void
}
```

### CollectionManager
**Location**: `src/components/collection/CollectionManager.tsx`

Orchestrates collection navigation, optional details display, and track listing.

**Features**:
- Enriches collections with subtitles from `COLLECTION_NARRATIVES` (`src/data/collectionNarratives.ts`)
- **"About this collection" toggle**: Centered pill button below the dropdown that reveals the full collection story
- Full-width narrative layout (no background card) so prose lines up with the track list margins
- Mobile-first behavior: button stretches to max-width `sm` on narrow screens, description flows as a single column; desktop keeps the same content but with wider gutters
- Auto-closes when switching collections
- Track listing with analytics integration

**Collection Descriptions**:
Each collection has:
- `heading`: Full title with branding (stored for future use; not rendered inside the toggle)
- `subtitle`: Short one-line description shown in the dropdown (40-48 chars max)
- `paragraphs`: Full collection story (1-3 paragraphs) shown when "About this collection" is toggled; rendered edge-to-edge with no background container

> **Source of Truth**: These narratives now live in `src/data/collectionNarratives.ts` so both CollectionManager and MetaDJai share a single canonical set of descriptions/genres. Update that file whenever the collection story changes.

**Subtitle Length Guidelines**:
- **Featured**: "Hand-picked tracks resonating right now" (40 chars)
- **Majestic Ascent**: "A portal into the Metaverse" (28 chars)
- **Bridging Reality**: "Bridging physical and digital worlds" (38 chars)
- **Metaverse Revelation**: "EDM built for dancefloor and Metaverse" (39 chars)
- **Transformer**: "Melodic progressive techno meets hypnotic trance" (48 chars)

## Interaction Model

### Collection Navigation
1. User clicks dropdown button to reveal collection list
2. Each collection displays as **two lines**: Title (bold) + Subtitle (lighter)
3. Select collection → switches collection, loads tracks, closes dropdown
4. "About this collection" button appears below dropdown
5. Optional: Click "About this collection" to reveal full story
6. Description auto-closes when switching collections

### "About This Collection" Toggle
**States**:
- **Closed** (default): Centered pill button with ChevronDown icon + "About this collection"
- **Open**: Same button flips to ChevronUp + "Hide collection details" and the full narrative renders directly below it (no glass card)

**Behavior**:
- Click to toggle visibility
- Shows the complete collection narrative (no truncation, no nested toggle, single column that matches track list margins)
- Automatically closes when user switches to a different collection
- Mobile-first: button stretches to the column width on narrow screens; desktop constrains it to ~max-w-sm for balance

### Keyboard Navigation
- **Tab**: Navigate to dropdown or toggle button
- **Enter/Space**: Open dropdown menu or toggle description
- **Arrow Up/Down**: Navigate collection options (when dropdown open)
- **Enter**: Select highlighted collection
- **Escape**: Close dropdown without selection

## Scalability Strategy

### Current (5 collections)
- Show all as tabs, no "More..." button needed
- Simple, clean, familiar interface

### Growing (6-15 collections)
- Show first 4 collections + "More..." button
- "More..." highlights when selected collection is in overflow
- Modal provides easy access to all collections

### Large Catalog (15-50 collections)
**Phase 2: Category Tabs**
```
Top Tier:    [Featured] [Albums] [Singles] [EPs] [Live Sets]
Second Tier: [Majestic Ascent] [Bridging Reality] [More...]
```

### Massive Catalog (50+ collections)
**Phase 3: Full Navigation**
- Desktop: Left sidebar with collapsible categories
- Mobile: Bottom sheet or hamburger menu
- Always-visible search
- Recently played collections at top

## Visual Design

### Dropdown Styling
Premium MetaDJ aesthetic with glass morphism and two-line layout:

```css
/* Dropdown Container */
- Width: max-w-lg (32rem/512px)
- Border: border-white/20
- Background: Collection-specific gradient (from collectionGradients map)
- Backdrop blur: backdrop-blur-2xl
- Rounded corners: rounded-[24px]
- Shadow: shadow-[0_12px_30px_rgba(5,8,24,0.45)]
- Padding: px-6 py-3.5

/* Hover State */
- Border: border-white/30
- Smooth transition: transition-all duration-200

/* Two-Line Text Layout */
- Container: flex flex-col items-start
- Title: font-semibold text-base (bold, prominent)
- Subtitle: text-sm text-white/70 font-normal mt-0.5 (lighter, smaller, spaced)

/* Dropdown Menu */
- Background: bg-[#0a0e1f]/95
- Backdrop blur: backdrop-blur-2xl
- Border: border-white/20
- Shadow: shadow-[0_20px_40px_rgba(0,0,0,0.6)]
- Rounded: rounded-[24px]

/* Menu Items */
- Padding: px-6 py-3.5
- Font: font-heading (Cinzel)
- Selected: gradient background with opacity-30
- Hover: bg-white/5
```

### Icons
- **ChevronDown**: Dropdown closed state
- **ChevronUp**: Description expanded state
- Color: text-white/70
- Size: w-4 h-4 (toggle), w-5 h-5 (dropdown)
- Rotation animation on dropdown open

### "About This Collection" Button
```css
- Display: inline-flex items-center justify-center gap-2
- Width: w-full max-w-sm on mobile, auto on desktop
- Border: border-white/20 (hover border-white/35)
- Text: text-[0.65rem] uppercase tracking-[0.28em] text-white/70
- Hover: text-white
- Transition: transition-colors
- Margin: centered with `mx-auto mt-6`
```

### Description Copy
```css
- Layout: space-y-3 text-white/80
- Typography: text-sm leading-relaxed (sm:text-base optional)
- Column: single column on mobile; optional `sm:grid sm:grid-cols-2 sm:gap-6` when desired
- Background: none (text sits directly on the gradient field)
- Auto-reset: `useEffect` resets state when `selectedCollection` changes
```

## Analytics Integration

Collection navigation events tracked:
- `collection_viewed` – fired whenever a user selects a new collection from the dropdown
- `collection_browsed` – emitted when the corresponding track list renders (ensures analytics capture scroll depth/engagement)

## Accessibility

- **ARIA roles**: `role="listbox"`, `role="option"`, `aria-selected`
- **Focus management**: Dropdown button retains focus state; menu closes on Escape without side effects
- **Keyboard shortcuts**: Full keyboard navigation support (Enter/Space to open, Arrow keys to move, Enter to select)
- **Touch targets**: 44px minimum height for all interactive elements
- **Screen readers**: Clear labels and state announcements

## Future Enhancements

### Phase 2 (15-50 collections)
- [ ] Add category-based organization (e.g., Albums, Singles, Live)
- [ ] Two-tier tab navigation or quick-filter chips
- [ ] Category-specific gradients
- [x] Pinned “Recently Played” category (implemented as Music panel “Recently Played” under Featured)

### Phase 3 (50+ collections)
- [ ] Left sidebar navigation (desktop)
- [ ] Bottom sheet drawer (mobile)
- [ ] Advanced search with filters
- [ ] Collection sorting options
- [ ] Favorite/pin collections

## Implementation Example

```tsx
// In CollectionManager
const [showDescription, setShowDescription] = useState(false)

// Enrich collections with subtitles
const collectionsWithSubtitles = useMemo(() => {
  return collections.map((collection) => {
    const info = COLLECTION_NARRATIVES[collection.id] ?? COLLECTION_NARRATIVES.featured
    return {
      id: collection.id,
      title: collection.title,
      subtitle: info.subtitle,
    }
  })
}, [collections])

// Reset description when collection changes
useEffect(() => {
  setShowDescription(false)
}, [selectedCollection])

return (
  <>
    {/* Collection Tabs with Subtitles */}
    <CollectionTabs
      collections={collectionsWithSubtitles}
      selectedCollection={selectedCollection}
      onCollectionChange={onCollectionChange}
    />

    {/* About This Collection Toggle */}
    <div className="flex justify-center px-2 mt-6">
      <button
        onClick={() => setShowDescription((prev) => !prev)}
        className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2 text-[0.65rem] uppercase tracking-[0.28em] text-white/70 transition hover:border-white/35 hover:text-white"
      >
        {showDescription ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide collection details
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            About this collection
          </>
        )}
      </button>
    </div>

    {/* Collapsible Description Copy */}
    {showDescription && (
      <div className="mt-4 space-y-3 text-white/80" aria-live="polite">
        {description.paragraphs.map((paragraph, index) => (
          <p
            key={`${selectedCollection}-desc-${index}`}
            className="text-sm sm:text-base leading-relaxed text-left"
          >
            {paragraph}
          </p>
        ))}
      </div>
    )}
  </>
)
```

## Related Documentation

- **Tab Content Reference**: `3-projects/5-software/metadj-nexus/docs/features/tab-content-reference.md`
- **Collections System**: `3-projects/5-software/metadj-nexus/docs/features/collections-system.md`
- **Analytics**: `3-projects/5-software/metadj-nexus/docs/features/analytics-quick-reference.md`
