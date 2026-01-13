"use client"

/**
 * Modal Context
 *
 * Manages all modal and overlay states including welcome, info, track details,
 * collection details, queue, wisdom, keyboard shortcuts, and MetaDJai.
 * Extracted from UIContext for better performance isolation.
 *
 * Includes screen reader announcements for modal open/close events (WCAG 2.1 AA).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { announce } from '@/components/accessibility/ScreenReaderAnnouncer';
import { STORAGE_KEYS, getBoolean, runMigrations, setBoolean } from '@/lib/storage';
import type { ModalStates } from '@/types';

const WELCOME_SESSION_STORAGE_KEY = 'metadj_welcome_shown_session';

/**
 * Modal context value interface
 */
export interface ModalContextValue {
  modals: ModalStates;
  setWelcomeOpen: (open: boolean) => void;
  setInfoOpen: (open: boolean) => void;
  setTrackDetailsOpen: (open: boolean) => void;
  setCollectionDetailsOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  setWisdomOpen: (open: boolean) => void;
  setKeyboardShortcutsOpen: (open: boolean) => void;
  setMetaDjAiOpen: (open: boolean) => void;
  setFeedbackOpen: (open: boolean) => void;
  setAccountOpen: (open: boolean) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  // Modal states - Welcome overlay starts closed to avoid refresh-time flashes.
  // A post-hydration check decides whether to auto-open it for first-time visitors.
  // MetaDJai defaults to closed for a less overwhelming first impression.
  const [modals, setModals] = useState<ModalStates>({
    isWelcomeOpen: false,
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

  // After hydration, decide whether we should show the welcome overlay.
  // Show once per session unless the user opts out permanently.
  useEffect(() => {
    runMigrations();

    let hasShownInSession = false;
    try {
      hasShownInSession = sessionStorage.getItem(WELCOME_SESSION_STORAGE_KEY) === 'true';
    } catch {
      hasShownInSession = false;
    }

    const hasDismissed = getBoolean(STORAGE_KEYS.WELCOME_DISMISSED, false);

    // Auto-open once per session unless the user has dismissed it permanently.
    // This prevents refresh-time flashes while keeping the overlay available until opt-out.
    if (hasDismissed || hasShownInSession) return;

    setModals(prev => ({ ...prev, isWelcomeOpen: true }));

    // Track that the overlay has been shown at least once.
    setBoolean(STORAGE_KEYS.WELCOME_SHOWN, true);

    try {
      sessionStorage.setItem(WELCOME_SESSION_STORAGE_KEY, 'true');
    } catch {
      // Ignore session storage errors (private browsing / quota / disabled).
    }
  }, []);

  // Modal setters with screen reader announcements
  const setWelcomeOpen = useCallback((open: boolean) => {
    setModals(prev => ({ ...prev, isWelcomeOpen: open }));
    announce(open ? 'Welcome dialog opened' : 'Welcome dialog closed', { type: 'status', priority: 'polite' });
    // Note: Auto-open persistence is handled via the session flag + WELCOME_DISMISSED opt-out.
  }, []);

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

  const value: ModalContextValue = useMemo(() => ({
    modals,
    setWelcomeOpen,
    setInfoOpen,
    setTrackDetailsOpen,
    setCollectionDetailsOpen,
    setQueueOpen,
    setWisdomOpen,
    setKeyboardShortcutsOpen,
    setMetaDjAiOpen,
    setFeedbackOpen,
    setAccountOpen,
  }), [
    modals,
    setWelcomeOpen,
    setInfoOpen,
    setTrackDetailsOpen,
    setCollectionDetailsOpen,
    setQueueOpen,
    setWisdomOpen,
    setKeyboardShortcutsOpen,
    setMetaDjAiOpen,
    setFeedbackOpen,
    setAccountOpen,
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
