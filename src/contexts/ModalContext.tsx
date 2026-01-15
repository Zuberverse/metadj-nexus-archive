"use client"

/**
 * Modal Context
 *
 * Manages all modal and overlay states including info, track details,
 * collection details, queue, wisdom, keyboard shortcuts, and MetaDJai.
 * Extracted from UIContext for better performance isolation.
 *
 * Includes screen reader announcements for modal open/close events (WCAG 2.1 AA).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { announce } from '@/components/accessibility/ScreenReaderAnnouncer';
import { runMigrations } from '@/lib/storage';
import type { ModalStates } from '@/types';

/**
 * Modal context value interface
 */
export interface ModalContextValue {
  modals: ModalStates;
  setInfoOpen: (open: boolean) => void;
  setTrackDetailsOpen: (open: boolean) => void;
  setCollectionDetailsOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  setWisdomOpen: (open: boolean) => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setMetaDjAiOpen: (open: boolean) => void;
  setFeedbackOpen: (open: boolean) => void;
  setAccountOpen: (open: boolean) => void;
  resetModals: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  // Modal states - MetaDJai defaults to closed for a less overwhelming first impression.
  const [modals, setModals] = useState<ModalStates>({
    isInfoOpen: false,
    isTrackDetailsOpen: false,
    isCollectionDetailsOpen: false,
    isQueueOpen: false,
    isWisdomOpen: false,
    isKeyboardShortcutsOpen: false,
    isMetaDjAiOpen: false,
    isFeedbackOpen: false,
    isAccountOpen: false,
  });

  // Run storage migrations after hydration.
  useEffect(() => {
    runMigrations();
  }, []);

  // Modal setters with screen reader announcements
  const setInfoOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, isInfoOpen: open }));
    announce(open ? 'Info dialog opened' : 'Info dialog closed', { type: 'status', priority: 'polite' });
  }, []);

  const setTrackDetailsOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, isTrackDetailsOpen: open }));
    announce(open ? 'Track details opened' : 'Track details closed', { type: 'status', priority: 'polite' });
  }, []);

  const setCollectionDetailsOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, isCollectionDetailsOpen: open }));
    announce(open ? 'Collection details opened' : 'Collection details closed', { type: 'status', priority: 'polite' });
  }, []);

  const setQueueOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, isQueueOpen: open }));
    announce(open ? 'Queue panel opened' : 'Queue panel closed', { type: 'status', priority: 'polite' });
  }, []);

  const setWisdomOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, isWisdomOpen: open }));
    announce(open ? 'Wisdom panel opened' : 'Wisdom panel closed', { type: 'status', priority: 'polite' });
  }, []);

  const setKeyboardShortcutsOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, isKeyboardShortcutsOpen: open }));
    announce(open ? 'Keyboard shortcuts dialog opened' : 'Keyboard shortcuts dialog closed', { type: 'status', priority: 'polite' });
  }, []);

  const setMetaDjAiOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, isMetaDjAiOpen: open }));
    announce(open ? 'MetaDJai chat opened' : 'MetaDJai chat closed', { type: 'status', priority: 'polite' });
  }, []);

  const setFeedbackOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, isFeedbackOpen: open }));
    announce(open ? 'Feedback form opened' : 'Feedback form closed', { type: 'status', priority: 'polite' });
  }, []);

  const setAccountOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, isAccountOpen: open }));
    announce(open ? 'Account settings opened' : 'Account settings closed', { type: 'status', priority: 'polite' });
  }, []);

  const resetModals = useCallback(() => {
    setModals({
      isInfoOpen: false,
      isTrackDetailsOpen: false,
      isCollectionDetailsOpen: false,
      isQueueOpen: false,
      isWisdomOpen: false,
      isKeyboardShortcutsOpen: false,
      isMetaDjAiOpen: false,
      isFeedbackOpen: false,
      isAccountOpen: false,
    });
  }, []);

  const value: ModalContextValue = useMemo(() => ({
    modals,
    setInfoOpen,
    setTrackDetailsOpen,
    setCollectionDetailsOpen,
    setQueueOpen,
    setWisdomOpen,
    setKeyboardShortcutsOpen,
    setMetaDjAiOpen,
    setFeedbackOpen,
    setAccountOpen,
    resetModals,
  }), [
    modals,
    setInfoOpen,
    setTrackDetailsOpen,
    setCollectionDetailsOpen,
    setQueueOpen,
    setWisdomOpen,
    setKeyboardShortcutsOpen,
    setMetaDjAiOpen,
    setFeedbackOpen,
    setAccountOpen,
    resetModals,
  ]);

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

/**
 * Hook to access modal context
 * @throws Error if used outside ModalProvider
 */
export function useModal(): ModalContextValue {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }

  return context;
}
