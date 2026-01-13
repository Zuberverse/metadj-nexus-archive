'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MoreVertical, ListPlus, Plus } from 'lucide-react';
import { PlaylistSelector } from '@/components/playlist/PlaylistSelector';
import { useToast } from '@/contexts/ToastContext';
import { useClickAway, useEscapeKey } from '@/hooks';
import { toasts } from '@/lib/toast-helpers';
import type { Track } from '@/types';

export interface TrackOptionsMenuProps {
  track: Track;
  onQueueAdd?: () => void;
  className?: string;
}

export function TrackOptionsMenu({ track, onQueueAdd, className = '' }: TrackOptionsMenuProps) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'menu' | 'playlists'>('menu');
  const [openAbove, setOpenAbove] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setView('menu'); // Reset view when closed
    }
  }, [isOpen]);

  useClickAway(menuRef, () => setIsOpen(false), { enabled: isOpen });

  useEscapeKey(() => {
    if (view === 'playlists') {
      setView('menu');
    } else {
      setIsOpen(false);
    }
  }, { enabled: isOpen });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = view === 'playlists' ? 400 : 120;
      setOpenAbove(spaceBelow < menuHeight);
    }
  }, [isOpen, view]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(prev => !prev);
  }, []);

  const handleAddToQueue = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onQueueAdd?.();
    showToast(toasts.trackAddedToQueue(track.title));
    setIsOpen(false);
  }, [onQueueAdd, showToast, track.title]);

  const handleShowPlaylists = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setView('playlists');
    // Don't close, just switch view
  }, []);

  const handlePlaylistClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setView('menu');
  }, []);

  const handleDropdownClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <div ref={menuRef} className={`relative ${className}`} onClick={handleDropdownClick}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="p-1.5 min-h-[44px] min-w-[44px] rounded-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 transition-colors focus-ring-glow"
        aria-label="Track options"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute right-0 z-[100] ${openAbove ? 'bottom-full mb-1' : 'top-full mt-1'} ${view === 'playlists' ? 'w-80' : 'w-56'}`}
          onClick={handleDropdownClick}
        >
          {view === 'playlists' ? (
            <PlaylistSelector
              trackId={track.id}
              trackTitle={track.title}
              source="track_card"
              onClose={handlePlaylistClose}
              onBack={handleBackToMenu}
              className="w-full shadow-none border-0" // Remove shadow/border as container handles it logic/styles if needed, but here we likely want the inner component to fill
            />
          ) : (
            <div className="w-full overflow-hidden rounded-xl border border-white/20 bg-(--bg-surface-elevated) shadow-2xl">
              {onQueueAdd && (
                <button
                  type="button"
                  onClick={handleAddToQueue}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/10"
                >
                  <Plus className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">Add to Queue</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleShowPlaylists}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/10 ${onQueueAdd ? 'border-t border-white/10' : ''}`}
              >
                <ListPlus className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">Add to Playlist</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
