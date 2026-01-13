# Shared UI Components

> **Reusable component library for MetaDJ Nexus**

**Last Modified**: 2026-01-12 19:45 EST

## Overview

As of v0.9.26, MetaDJ Nexus includes a shared UI component library at `src/components/ui/`. These components consolidate common patterns across the application, ensuring visual consistency and reducing code duplication.

## Components

### Button

**Location**: `src/components/ui/Button.tsx`

A flexible button component with multiple variants, sizes, and loading states.

#### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| `primary` | Purple gradient with glow | Primary actions, CTAs |
| `secondary` | Subtle background, white text | Secondary actions |
| `accent` | Cyan accent color | Highlight actions |
| `ghost` | Transparent with hover fill | Tertiary actions, toggles |
| `destructive` | Red tones | Delete, remove actions |

#### Sizes

| Size | Dimensions | Use Case |
|------|------------|----------|
| `xs` | h-7, text-xs | Compact UI elements |
| `sm` | h-8, text-sm | Small buttons |
| `md` | h-10, text-sm | Default size |
| `lg` | h-11, text-base | Emphasized buttons |
| `xl` | h-12, text-lg | Hero CTAs |
| `icon-sm` | h-8 w-8 | Small icon buttons |
| `icon-md` | h-10 w-10 | Default icon buttons |
| `icon-lg` | h-12 w-12 | Large icon buttons |

#### Usage

```typescript
import { Button, IconButton, ToggleButton } from '@/components/ui/Button'
import { Play, Heart } from 'lucide-react'

// Standard button
<Button variant="primary" size="md">
  Play Collection
</Button>

// With loading state
<Button variant="primary" isLoading>
  Loading...
</Button>

// With icon
<Button variant="secondary" leftIcon={<Play />}>
  Play Track
</Button>

// Icon button
<IconButton
  icon={<Play />}
  variant="primary"
  size="icon-md"
  aria-label="Play track"
/>

// Toggle button
<ToggleButton
  icon={<Heart />}
  isActive={isLiked}
  onToggle={handleToggle}
  activeClassName="text-pink-500"
  aria-label={isLiked ? 'Unlike' : 'Like'}
/>
```

#### Props

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'destructive'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon-sm' | 'icon-md' | 'icon-lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  // ...extends HTMLButtonElement props
}
```

---

### Card

**Location**: `src/components/ui/Card.tsx`

A versatile card component with glassmorphism styling and multiple variants.

#### Variants

| Variant | Description | Use Case |
|---------|-------------|----------|
| `default` | Standard card styling | General content |
| `glass` | Glassmorphism with backdrop blur | Overlays, floating panels |
| `elevated` | Higher elevation, stronger shadow | Featured content |
| `interactive` | Hover effects, clickable | Clickable cards |
| `info` | Info-styled with subtle accent | Informational content |

#### Sizes

| Size | Padding | Use Case |
|------|---------|----------|
| `sm` | p-3 | Compact cards |
| `md` | p-4 | Default |
| `lg` | p-6 | Spacious cards |
| `xl` | p-8 | Hero cards |

#### Usage

```typescript
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/Card'

// Basic card
<Card variant="glass" size="md">
  <CardHeader>
    <CardTitle>Track Info</CardTitle>
    <CardDescription>Currently playing</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
  <CardFooter>
    <Button>Play</Button>
  </CardFooter>
</Card>

// Interactive card
<Card variant="interactive" onClick={handleClick}>
  <CardContent>
    Click me!
  </CardContent>
</Card>
```

---

### Modal

**Location**: `src/components/ui/Modal.tsx`

An accessible modal component with focus trapping, keyboard navigation, and animations.

#### Features

- Focus trapping (tab cycles within modal)
- Escape key dismissal
- Click-outside dismissal
- Enter/exit animations
- Accessible ARIA attributes
- Body scroll lock

#### Usage

```typescript
import { Modal, ModalContent, ConfirmDialog } from '@/components/ui/Modal'

// Basic modal
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
>
  <ModalContent>
    <p>Modal content goes here.</p>
  </ModalContent>
</Modal>

// Modal with custom size
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Large Modal"
  size="lg"
>
  <ModalContent>
    <p>Larger content area.</p>
  </ModalContent>
</Modal>

// Confirmation dialog
<ConfirmDialog
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleDelete}
  title="Delete Playlist?"
  description="This action cannot be undone. The playlist will be permanently removed."
  confirmLabel="Delete"
  cancelLabel="Cancel"
  variant="destructive"
/>
```

#### Props

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
  children: React.ReactNode
}

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}
```

---

### TrackListItem

**Location**: `src/components/ui/TrackListItem.tsx`

A reusable track list item for displaying tracks in lists and queues.

#### Features

- Consistent track display across the app
- Play/pause state indication
- Queue add functionality
- Responsive layout

#### Usage

```typescript
import { TrackListItem } from '@/components/ui/TrackListItem'

<TrackListItem
  track={track}
  isCurrentTrack={currentTrack?.id === track.id}
  isPlaying={isPlaying}
  onPlay={handlePlay}
  onQueueAdd={handleQueueAdd}
/>
```

---

## Barrel Export

All UI components are exported from `src/components/ui/index.ts`:

```typescript
import {
  Button,
  IconButton,
  ToggleButton,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Modal,
  ModalContent,
  ConfirmDialog,
  TrackListItem
} from '@/components/ui'
```

## Design Tokens

The shared components use design tokens defined in `src/app/globals.css`:

```css
/* Surface backgrounds */
--bg-surface-base: oklch(0.12 0.02 280);
--bg-surface-elevated: oklch(0.08 0.025 260);
--bg-modal: oklch(0.10 0.03 270 / 0.95);

/* Shadow scale */
--shadow-sm: 0 1px 2px rgb(0 0 0 / 0.3);
--shadow-md: 0 4px 8px rgb(0 0 0 / 0.4);
--shadow-lg: 0 8px 16px rgb(0 0 0 / 0.4);
--shadow-xl: 0 16px 32px rgb(0 0 0 / 0.5);

/* Glow shadows */
--shadow-glow-purple: 0 0 20px rgb(167 139 250 / 0.3);
--shadow-glow-cyan: 0 0 20px rgb(34 211 238 / 0.3);
--shadow-glow-brand: 0 0 20px rgb(167 139 250 / 0.2), 0 0 40px rgb(34 211 238 / 0.1);

/* Border radius */
--radius-2xl: 1.75rem;
--radius-3xl: 1.875rem;
```

## Accessibility

All shared components follow WCAG 2.1 AA guidelines:

- **Focus visible**: Clear focus indicators on all interactive elements
- **Keyboard navigation**: Full keyboard support
- **ARIA labels**: Proper labeling for screen readers
- **Touch targets**: Minimum 44x44px touch targets
- **Color contrast**: Meets 4.5:1 ratio for text

## Related Documentation

- [Modal Patterns](../features/modal-patterns.md) — Modal/overlay specifications
- [Panel System](../features/panel-system.md) — Panel architecture
- [Component Architecture](component-architecture.md) — Overall component patterns
