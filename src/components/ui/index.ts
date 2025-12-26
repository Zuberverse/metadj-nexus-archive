/**
 * UI Components Barrel Export
 *
 * Centralized exports for all shared UI components.
 * Import from '@/components/ui' for cleaner imports.
 */

// Button
export {
  Button,
  IconButton,
  ToggleButton,
  type ButtonProps,
  type IconButtonProps,
  type ToggleButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './Button';

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
  type CardHeaderProps,
  type CardTitleProps,
  type CardDescriptionProps,
  type CardContentProps,
  type CardFooterProps,
  type CardVariant,
  type CardSize,
} from './Card';

// Modal
export {
  Modal,
  ModalContent,
  ConfirmDialog,
  type ModalProps,
  type ModalContentProps,
  type ConfirmDialogProps,
  type ModalSize,
} from './Modal';

// Toast
export { Toast, type ToastProps, type ToastAction } from './Toast';
export { ToastContainer } from './ToastContainer';

// Indicators
export { OfflineIndicator } from './OfflineIndicator';
export { PlayingIndicator, type PlayingIndicatorProps } from './PlayingIndicator';

// TrackListItem
export { TrackListItem, type TrackListItemProps } from './TrackListItem';

// TrackArtwork
export { TrackArtwork, type TrackArtworkProps } from './TrackArtwork';

// ShareButton
export { ShareButton, type ShareButtonProps } from './ShareButton';

// EmptyState
export {
  EmptyState,
  type EmptyStateProps,
  type EmptyStateSize,
  type EmptyStateIconVariant,
} from './EmptyState';

// TrackOptionsMenu
export { TrackOptionsMenu, type TrackOptionsMenuProps } from './TrackOptionsMenu';

// ErrorDisplay
export {
  ErrorDisplay,
  type ErrorDisplayProps,
  type ErrorVariant,
} from './ErrorDisplay';

// ErrorBoundary
export {
  ErrorBoundary,
  ComponentErrorBoundary, // @deprecated - use ErrorBoundary
  type ErrorBoundaryProps,
} from './ErrorBoundary';

// Skeleton loading states
export {
  Skeleton,
  SkeletonText,
  SkeletonTrackCard,
  SkeletonCollectionCard,
  SkeletonMessage,
  SkeletonWisdomCard,
  SkeletonPlayerBar,
} from './Skeleton';
