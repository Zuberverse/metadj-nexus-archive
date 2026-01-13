/**
 * Contexts Barrel Export
 *
 * Centralized exports for all React Contexts.
 * Import from '@/contexts' for cleaner imports.
 */

// Auth Context
export { AuthProvider, useAuth } from './AuthContext';

// Modal Context
export { ModalProvider, useModal } from './ModalContext';

// Player Context (includes PlaybackTime for performance optimization)
export {
  PlayerProvider,
  usePlayer,
  usePlaybackTime,
  useCurrentTimeRef,
} from './PlayerContext';

// Playlist Context
export {
  PlaylistProvider,
  usePlaylist,
} from './PlaylistContext';

// Queue Context
export {
  QueueProvider,
  useQueue,
} from './QueueContext';

// Toast Context
export {
  ToastProvider,
  useToast,
} from './ToastContext';

// Tour Context
export {
  TourProvider,
  useTour,
} from './TourContext';

// UI Context
export {
  UIProvider,
  useUI,
} from './UIContext';
