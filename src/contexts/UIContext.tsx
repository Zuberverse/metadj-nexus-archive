"use client"

/**
 * UI Context
 *
 * Manages UI state including search, collection selection, panel layout, and view state.
 * Modal state has been extracted to ModalContext for better performance isolation.
 * Centralizes UI state to eliminate prop drilling across the component tree.
 *
 * ## Module Purpose
 *
 * UIContext serves as the central hub for non-modal UI state management:
 * - **Search State**: Query string and search results for the global search
 * - **Collection State**: Selected collection ID and collection details for detail views
 * - **Panel States**: Left (control) and right (chat) panel visibility
 * - **View Navigation**: Active view (hub, cinema, wisdom, journal)
 * - **Layout State**: Header height for cinema positioning, featured section expansion
 *
 * Modal state is managed separately by ModalContext but re-exported here
 * to keep UI state access centralized.
 *
 * ## Context Dependencies
 *
 * This context depends on:
 * - **ModalContext** (required): Used for modal state re-export
 *
 * UIProvider MUST be rendered inside ModalProvider.
 * See `src/app/layout.tsx` for the correct provider nesting order.
 *
 * ## Exported Values
 *
 * ### Modal State (from ModalContext)
 * - **modals**: Object containing all modal visibility states (ModalStates)
 * - **setWelcomeOpen/setInfoOpen/etc.**: Individual modal setters
 *
 * ### Search State
 * - **searchQuery/setSearchQuery**: Current search query string
 * - **searchResults/setSearchResults**: Array of Track results
 *
 * ### Collection State
 * - **selectedCollection/setSelectedCollection**: Active collection ID (persisted)
 * - **collectionDetails/setCollectionDetails**: Collection metadata for detail views
 *
 * ### Layout State
 * - **featuredExpanded/setFeaturedExpanded**: Featured section collapse state (persisted)
 * - **headerHeight/setHeaderHeight**: Dynamic header height for layout calculations
 *
 * ### Panel State
 * - **panels**: Panel visibility state ({ left: { isOpen }, right: { isOpen } })
 * - **toggleLeftPanel/toggleRightPanel**: Toggle panel visibility
 * - **openLeftPanel**: Ensure left panel is open
 *
 * ### View State
 * - **activeView/setActiveView**: Current view ('hub' | 'cinema' | 'wisdom')
 *
 * ## Usage Example
 *
 * ```tsx
 * import { useUI } from '@/contexts/UIContext';
 *
 * function MyComponent() {
 *   const {
 *     modals,
 *     setQueueOpen,
 *     activeView,
 *     setActiveView,
 *     searchQuery,
 *     setSearchQuery,
 *     panels,
 *     toggleLeftPanel,
 *   } = useUI();
 *
 *   return (
 *     <div>
 *       <button onClick={() => setActiveView('hub')}>
 *         Go to Hub
 *       </button>
 *       <button onClick={toggleLeftPanel}>
 *         {panels.left.isOpen ? 'Close' : 'Open'} Panel
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Storage Persistence
 *
 * The following states are persisted to localStorage:
 * - Selected collection (STORAGE_KEYS.SELECTED_COLLECTION)
 * - Featured section expanded state (STORAGE_KEYS.FEATURED_EXPANDED)
 *
 * Note: Welcome overlay dismissal is managed by ModalContext.
 */

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { announce } from '@/components/accessibility/ScreenReaderAnnouncer';
import { DEFAULT_COLLECTION_ID } from '@/lib/app.constants';
import { logger } from '@/lib/logger';
import { useReducedMotion } from '@/lib/motion-utils';
import { STORAGE_KEYS, getBoolean, setBoolean, getString, setString, getValue, setValue, isStorageAvailable } from '@/lib/storage';
import { useModal } from './ModalContext';
import type { Track, UIContextValue, ActiveView, Collection, LeftPanelTab, SelectedCollectionSource, WisdomSection } from '@/types';

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  // Modal state is now managed by ModalContext - consume it here to share access
  const modalContext = useModal();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [collectionDetails, setCollectionDetails] = useState<Collection | null>(null);

  // Collection selection - with unified storage persistence
  const [selectedCollection, setSelectedCollectionState] = useState<string>(DEFAULT_COLLECTION_ID);
  const [selectedCollectionSource, setSelectedCollectionSource] = useState<SelectedCollectionSource>('default');

  // Load persisted collection on mount
  useEffect(() => {
    if (!isStorageAvailable()) return;
    const savedCollection = getString(STORAGE_KEYS.SELECTED_COLLECTION, DEFAULT_COLLECTION_ID);
    if (savedCollection && savedCollection !== DEFAULT_COLLECTION_ID) {
      setSelectedCollectionState(savedCollection);
      setSelectedCollectionSource('hydrate');
    }
  }, []);

  // Persist collection changes
  const setSelectedCollection = useCallback(
    (collection: string, source: SelectedCollectionSource = 'user') => {
      setSelectedCollectionState(collection);
      setSelectedCollectionSource(source);
      setString(STORAGE_KEYS.SELECTED_COLLECTION, collection);
    },
    []
  );

  // Featured section expanded state - with unified storage persistence
  const [featuredExpanded, setFeaturedExpandedState] = useState<boolean>(true);

  // Load persisted featured expanded state on mount
  useEffect(() => {
    if (!isStorageAvailable()) return;
    const savedState = getBoolean(STORAGE_KEYS.FEATURED_EXPANDED, true);
    setFeaturedExpandedState(savedState);
  }, []);

  // Persist featured expanded changes
  const setFeaturedExpanded = useCallback((expanded: boolean) => {
    setFeaturedExpandedState(expanded);
    setBoolean(STORAGE_KEYS.FEATURED_EXPANDED, expanded);
  }, []);

  // Header height (for cinema positioning)
  // Desktop: py-3 (24px) + h-12 (48px) = 72px
  // Mobile: py-3 (24px) + min-h-[44px] = 68px
  // Use 72px to prevent layout shift on desktop (most common case in screenshots)
  const [headerHeight, setHeaderHeight] = useState(72);

  // Left panel active tab (browse / queue / playlists)
  const [leftPanelTab, setLeftPanelTabState] = useState<LeftPanelTab>("browse");

  useEffect(() => {
    if (!isStorageAvailable()) return;
    const savedTab = getString(STORAGE_KEYS.LEFT_PANEL_TAB, "browse") as LeftPanelTab;
    if (savedTab === "browse" || savedTab === "queue" || savedTab === "playlists") {
      setLeftPanelTabState(savedTab);
    }
  }, []);

  const setLeftPanelTab = useCallback((tab: LeftPanelTab) => {
    setLeftPanelTabState(tab);
    setString(STORAGE_KEYS.LEFT_PANEL_TAB, tab);
  }, []);

  // Panel layout (desktop side panels)
  const [panels, setPanels] = useState({
    left: { isOpen: false },
    right: { isOpen: false },
  });

  // Load persisted panel state on mount (left panel always starts closed)
  useEffect(() => {
    const savedPanels = getValue<{ left: { isOpen: boolean }; right: { isOpen: boolean } } | null>(
      STORAGE_KEYS.PANEL_STATE,
      null
    );
    if (savedPanels) {
      setPanels({
        left: { isOpen: false },
        right: { isOpen: savedPanels.right?.isOpen ?? false },
      });
    }
  }, []);

  // Persist panel changes (left panel open state is intentionally not persisted)
  useEffect(() => {
    setValue(STORAGE_KEYS.PANEL_STATE, {
      left: { isOpen: false },
      right: panels.right,
    });
  }, [panels.right]);

  // Keep chat panel layout in sync with MetaDJai open state.
  // Prevents "blank right gutter" when the panel is open but chat is closed (or vice versa).
  useEffect(() => {
    setPanels((prev) => {
      const shouldBeOpen = modalContext.modals.isMetaDjAiOpen;
      if (prev.right.isOpen === shouldBeOpen) return prev;
      return { ...prev, right: { isOpen: shouldBeOpen } };
    });
  }, [modalContext.modals.isMetaDjAiOpen]);

  // Active view (music, cinema, wisdom, journal)
  // Start with 'hub' for SSR, then hydrate from storage before first paint to avoid flicker
  const [activeView, setActiveViewState] = useState<ActiveView>('hub');
  const [viewHydrated, setViewHydrated] = useState(false);

  // Load persisted active view on mount (client only)
  useLayoutEffect(() => {
    if (!isStorageAvailable()) {
      setViewHydrated(true);
      return;
    }
    const savedView = getString(STORAGE_KEYS.ACTIVE_VIEW, 'hub');
    if (savedView === 'hub' || savedView === 'cinema' || savedView === 'wisdom' || savedView === 'journal') {
      setActiveViewState(savedView as ActiveView);
    } else if (savedView === 'music') {
      setActiveViewState('hub');
    } else if (savedView === 'canvas') {
      // Migration: canvas was renamed to cinema
      setActiveViewState('cinema');
    }
    setViewHydrated(true);
  }, []);

  // View change handler with screen reader announcement
  const setActiveView = useCallback((newView: ActiveView) => {
    setActiveViewState(newView);
    // Announce view change to screen readers
    const viewLabels: Record<ActiveView, string> = {
      hub: 'Hub',
      cinema: 'Cinema',
      wisdom: 'Wisdom',
      journal: 'Journal',
    };
    announce(`Navigated to ${viewLabels[newView]}`, { type: 'status', priority: 'polite' });
  }, []);

  // Persist active view changes
  useEffect(() => {
    if (!isStorageAvailable()) return;
    setString(STORAGE_KEYS.ACTIVE_VIEW, activeView);
  }, [activeView]);

  // Reduced motion preference - use centralized hook from motion-utils
  const reducedMotion = useReducedMotion();

  // Wisdom section tracking (for MetaDJai content context)
  const [wisdomSection, setWisdomSection] = useState<WisdomSection>(null);

  const value: UIContextValue = useMemo(() => ({
    // Modal state from ModalContext
    modals: modalContext.modals,
    setWelcomeOpen: modalContext.setWelcomeOpen,
    setInfoOpen: modalContext.setInfoOpen,
    setTrackDetailsOpen: modalContext.setTrackDetailsOpen,
    setCollectionDetailsOpen: modalContext.setCollectionDetailsOpen,
    setQueueOpen: modalContext.setQueueOpen,
    setWisdomOpen: modalContext.setWisdomOpen,
    setKeyboardShortcutsOpen: modalContext.setKeyboardShortcutsOpen,
    setMetaDjAiOpen: modalContext.setMetaDjAiOpen,
    // Search state
    searchQuery,
    searchResults,
    setSearchQuery,
    setSearchResults,
    // Collection state
    selectedCollection,
    selectedCollectionSource,
    setSelectedCollection,
    collectionDetails,
    setCollectionDetails,
    // Featured state
    featuredExpanded,
    setFeaturedExpanded,
    // Header height
    headerHeight,
    setHeaderHeight,
    // Panel state
    panels,
    toggleLeftPanel: () => setPanels(prev => {
      const willOpen = !prev.left.isOpen;
      announce(willOpen ? 'Control panel opened' : 'Control panel closed', { type: 'status', priority: 'polite' });
      return { ...prev, left: { isOpen: willOpen } };
    }),
    toggleRightPanel: () => setPanels(prev => {
      const willOpen = !prev.right.isOpen;
      announce(willOpen ? 'Chat panel opened' : 'Chat panel closed', { type: 'status', priority: 'polite' });
      return { ...prev, right: { isOpen: willOpen } };
    }),
    openLeftPanel: () => setPanels(prev => {
      if (!prev.left.isOpen) {
        announce('Control panel opened', { type: 'status', priority: 'polite' });
      }
      return { ...prev, left: { isOpen: true } };
    }),
    // Left panel tab state
    leftPanelTab,
    setLeftPanelTab,
    activeView,
    setActiveView,
    viewHydrated,
    // Wisdom section tracking
    wisdomSection,
    setWisdomSection,
    // Accessibility
    reducedMotion,
  }), [
    modalContext,
    headerHeight,
    searchQuery,
    searchResults,
    selectedCollection,
    selectedCollectionSource,
    collectionDetails,
    featuredExpanded,
    panels,
    leftPanelTab,
    activeView,
    viewHydrated,
    wisdomSection,
    reducedMotion,
    setSearchQuery,
    setSearchResults,
    setSelectedCollection,
    setCollectionDetails,
    setFeaturedExpanded,
    setHeaderHeight,
    setLeftPanelTab,
    setActiveView,
  ]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

/**
 * Hook to access UI context
 * @throws Error if used outside UIProvider
 */
export function useUI(): UIContextValue {
  const context = useContext(UIContext);

  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }

  return context;
}
