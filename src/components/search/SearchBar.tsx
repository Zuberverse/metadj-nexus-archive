'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Book, BookOpen, Search, X } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { useCspStyle } from '@/hooks/use-csp-style';
import { useDebounce } from '@/hooks/use-debounce';
import { SEARCH_DEBOUNCE_MS, Z_INDEX } from '@/lib/app.constants';
import { buildSearchContentResults, type JournalEntryInput, type JournalSearchEntry, type SearchContentResults, type WisdomSearchEntry } from '@/lib/search/search-results';
import { STORAGE_KEYS, getString } from '@/lib/storage';
import { getCachedWisdomData, loadWisdomData, type WisdomData } from '@/lib/wisdom';
import { SearchResultItem } from './SearchResultItem';
import type { Track, Collection } from '@/types';

/**
 * SearchBar Component Props
 *
 * Provides a search interface for finding tracks with keyboard navigation
 * and accessibility support (WCAG 2.1 AA compliant)
 */
export interface SearchBarProps {
  /** All available tracks for searching */
  tracks: Track[];
  /** Available collections for searching */
  collections?: Collection[];
  /** Currently playing track (for highlighting active results) */
  currentTrack: Track | null;
  /** Callback when a search result track is selected for playback */
  onTrackSelect: (track: Track) => void;
  /** Callback when a track is added to the playback queue */
  onTrackQueueAdd: (track: Track) => void;
  /** Callback when a collection is selected */
  onCollectionSelect?: (collection: Collection) => void;
  /** Optional externally controlled query */
  value?: string;
  /** Handler fired when the query changes */
  onValueChange?: (value: string) => void;
  /** Handler fired when filtered results change */
  onResultsChange?: (results: Track[]) => void;
  /** Handler fired when composite results change */
  onContentResultsChange?: (results: SearchContentResults) => void;
  /** Callback when search queries return zero results (for analytics) */
  onEmptySearch?: (queryLength: number) => void;
  /** Callback when a Wisdom result is selected */
  onWisdomSelect?: (entry: WisdomSearchEntry) => void;
  /** Callback when a Journal result is selected */
  onJournalSelect?: (entry: JournalSearchEntry) => void;
  /** Optional CSS class name for styling customization */
  className?: string;
  /** Hide the leading search icon (for minimal inline usage) */
  hideIcon?: boolean;
  /** Disable dropdown results (for inline filtering only) */
  disableDropdown?: boolean;
  /** Optional input id (avoid duplicate IDs when multiple SearchBars render) */
  inputId?: string;
  /** Custom placeholder text for the search input */
  placeholder?: string;
  /** Ref to container element for dropdown width alignment (uses search bar width if not provided) */
  containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * SearchBar Component
 *
 * A comprehensive search interface for MetaDJ Nexus that provides:
 * - Real-time track search with debouncing (300ms)
 * - Glass morphism design with gradient effects
 * - Dropdown results with keyboard navigation (arrow keys)
 * - WCAG 2.1 AA accessibility (ARIA labels, combobox pattern)
 * - Focus management and blur handling
 * - Add to queue functionality for each result
 */
export function SearchBar({
  tracks,
  collections = [],
  currentTrack,
  onTrackSelect,
  onTrackQueueAdd,
  onCollectionSelect,
  value,
  onValueChange,
  onResultsChange,
  onContentResultsChange,
  onEmptySearch,
  onWisdomSelect,
  onJournalSelect,
  className = '',
  hideIcon = false,
  disableDropdown = false,
  inputId,
  placeholder = 'Search music, collections, playlists...',
  containerRef,
}: SearchBarProps) {
  const [internalQuery, setInternalQuery] = useState('');
  // Search state management
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const [wisdomData, setWisdomData] = useState<WisdomData | null>(() => getCachedWisdomData());
  const [journalEntries, setJournalEntries] = useState<JournalEntryInput[]>([]);

  // Refs for DOM element management
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchAreaRef = useRef<HTMLDivElement | null>(null);
  const searchBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchResultRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateQuery = useCallback(
    (next: string) => {
      if (onValueChange) {
        onValueChange(next);
      } else {
        setInternalQuery(next);
      }
    },
    [onValueChange]
  );

  const query = value ?? internalQuery;
  const resolvedInputId = inputId ?? 'metadj-search-input';
  const instructionsId = `${resolvedInputId}-instructions`;
  const resultsId = `${resolvedInputId}-results`;
  const wisdomEnabled = Boolean(onWisdomSelect);
  const journalEnabled = Boolean(onJournalSelect);

  // Debounce search query to avoid excessive filtering
  const debouncedSearchQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!wisdomEnabled) return;
    const trimmedQuery = debouncedSearchQuery.trim();
    if (!trimmedQuery || wisdomData) return;

    let cancelled = false;
    loadWisdomData()
      .then((data) => {
        if (!cancelled) {
          setWisdomData(data);
        }
      })
      .catch(() => {
        // Wisdom search should fail silently if data cannot be loaded.
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearchQuery, wisdomData, wisdomEnabled]);

  useEffect(() => {
    if (!journalEnabled) {
      setJournalEntries([]);
      return;
    }

    const trimmedQuery = debouncedSearchQuery.trim();
    if (!trimmedQuery) {
      setJournalEntries([]);
      return;
    }

    try {
      const stored = getString(STORAGE_KEYS.WISDOM_JOURNAL_ENTRIES, "[]");
      const parsed = JSON.parse(stored);
      setJournalEntries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setJournalEntries([]);
    }
  }, [debouncedSearchQuery, journalEnabled]);

  const searchContentResults = useMemo(() => {
    return buildSearchContentResults({
      query: debouncedSearchQuery,
      tracks,
      collections,
      wisdom: wisdomEnabled ? wisdomData : null,
      journalEntries: journalEnabled ? journalEntries : null,
    });
  }, [debouncedSearchQuery, tracks, collections, wisdomData, journalEntries, wisdomEnabled, journalEnabled]);

  const { tracks: trackResults, collections: collectionResults, wisdom: wisdomResults, journal: journalResults, totalCount } = searchContentResults;

  // Fix for infinite loop: Track previous results signature to prevent redundant updates
  const prevResultsRef = useRef<string>('');
  const prevContentResultsRef = useRef<string>('');

  useEffect(() => {
    // Create a signature based on track IDs to detect actual content changes
    const resultsSignature = trackResults.map(t => t.id).join(',');

    // Only update parent if results have actually changed
    if (prevResultsRef.current !== resultsSignature) {
      prevResultsRef.current = resultsSignature;
      onResultsChange?.(trackResults);
    }

    if (onContentResultsChange) {
      const contentSignature = [
        trackResults.map(t => t.id).join(','),
        collectionResults.map(c => c.id).join(','),
        wisdomResults.map(w => `${w.section}:${w.id}`).join(','),
        journalResults.map(j => j.id).join(','),
      ].join('|');

      if (prevContentResultsRef.current !== contentSignature) {
        prevContentResultsRef.current = contentSignature;
        onContentResultsChange(searchContentResults);
      }
    }

    if (debouncedSearchQuery.trim().length >= 1 && totalCount === 0) {
      onEmptySearch?.(debouncedSearchQuery.trim().length)
    }
  }, [onResultsChange, onContentResultsChange, trackResults, collectionResults, wisdomResults, journalResults, debouncedSearchQuery, totalCount, searchContentResults]);

  // Clear hover highlight whenever the result set changes
  useEffect(() => {
    setHoveredIndex(null);
  }, [trackResults, collectionResults, wisdomResults, journalResults]);

  /**
   * Cancel pending blur timeout
   * Used to prevent dropdown from closing when focus moves within search area
   */
  const cancelPendingSearchBlur = useCallback(() => {
    if (searchBlurTimeoutRef.current) {
      clearTimeout(searchBlurTimeoutRef.current);
      searchBlurTimeoutRef.current = null;
    }
  }, []);

  // Raw position calculation (called inside rAF)
  const calculateDropdownPosition = useCallback(() => {
    if (!searchAreaRef.current || typeof window === 'undefined') return;

    const searchRect = searchAreaRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    
    // If containerRef is provided, align dropdown with container edges
    // Otherwise, use the search bar width with some expansion
    const containerEl = containerRef?.current;
    if (containerEl) {
      const containerRect = containerEl.getBoundingClientRect();
      setDropdownStyle({
        top: searchRect.bottom + 10,
        left: containerRect.left,
        width: containerRect.width,
      });
    } else {
      const availableWidth = Math.max(320, window.innerWidth - viewportPadding * 2);
      const baseWidth = Math.max(searchRect.width + 64, 420);
      const width = Math.min(baseWidth, availableWidth, 620);

      // Align left edge with search bar, but ensure it stays on screen
      const left = Math.max(
        viewportPadding,
        Math.min(searchRect.left, window.innerWidth - width - viewportPadding)
      );

      setDropdownStyle({
        top: searchRect.bottom + 10,
        left,
        width,
      });
    }
  }, [containerRef]);

  // rAF-throttled position update to prevent layout thrashing on scroll/resize
  const updateDropdownPosition = useCallback(() => {
    if (rafIdRef.current !== null) return; // Already scheduled

    rafIdRef.current = requestAnimationFrame(() => {
      calculateDropdownPosition();
      rafIdRef.current = null;
    });
  }, [calculateDropdownPosition]);

  /**
   * Handle focus events on search area
   * Shows dropdown and cancels any pending blur
   */
  const handleSearchAreaFocus = useCallback(() => {
    cancelPendingSearchBlur();
    setIsSearchFocused(true);
    updateDropdownPosition();
  }, [cancelPendingSearchBlur, updateDropdownPosition]);

  /**
   * Handle blur events on search area
   * Hides dropdown after checking if focus moved outside search area
   */
  const handleSearchAreaBlur = useCallback(
    (event: ReactFocusEvent<HTMLDivElement>) => {
      cancelPendingSearchBlur();
      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget && searchAreaRef.current?.contains(nextTarget)) {
        return;
      }
      searchBlurTimeoutRef.current = setTimeout(() => {
        setIsSearchFocused(false);
      }, 0);
    },
    [cancelPendingSearchBlur]
  );

  /**
   * Handle keyboard navigation in search input
   * Arrow down moves focus to first search result
   */
  const handleSearchInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown' && totalCount > 0) {
        event.preventDefault();
        searchResultRefs.current[0]?.focus();
      } else if (event.key === 'Escape') {
        setIsSearchFocused(false);
        updateQuery('');
        searchInputRef.current?.blur();
      }
    },
    [totalCount, updateQuery]
  );

  /**
   * Handle search result selection
   * Plays selected track and closes dropdown
   * UX-2: Close dropdown when playing a track
   */
  const handleSearchResultSelect = useCallback(
    (track: Track) => {
      onTrackSelect(track);
      cancelPendingSearchBlur();
      // UX-2: Close dropdown when track is selected to play
      setIsSearchFocused(false);
      searchInputRef.current?.blur();
    },
    [onTrackSelect, cancelPendingSearchBlur]
  );

  const handleCollectionSelect = useCallback(
    (collection: Collection) => {
      onCollectionSelect?.(collection);
      cancelPendingSearchBlur();
      setIsSearchFocused(false);
      searchInputRef.current?.blur();
    },
    [onCollectionSelect, cancelPendingSearchBlur]
  );

  const handleWisdomSelect = useCallback(
    (entry: WisdomSearchEntry) => {
      if (!onWisdomSelect) return;
      onWisdomSelect(entry);
      cancelPendingSearchBlur();
      setIsSearchFocused(false);
      searchInputRef.current?.blur();
    },
    [onWisdomSelect, cancelPendingSearchBlur]
  );

  const handleJournalSelect = useCallback(
    (entry: JournalSearchEntry) => {
      if (!onJournalSelect) return;
      onJournalSelect(entry);
      cancelPendingSearchBlur();
      setIsSearchFocused(false);
      searchInputRef.current?.blur();
    },
    [onJournalSelect, cancelPendingSearchBlur]
  );

  /**
   * Handle queue add from search results
   * UX-2: Keep dropdown open after adding to queue for easier multi-track queueing
   * User retains search context and can quickly add multiple tracks
   */
  const handleSearchResultQueueAdd = useCallback(
    (track: Track) => {
      onTrackQueueAdd(track);
      // UX-2: Don't close search results - user keeps search context
    },
    [onTrackQueueAdd]
  );

  /**
   * Handle keyboard navigation within search results
   * Arrow up/down moves between results, up from first returns to input
   * Enter selects track, Escape closes dropdown
   */
  const handleSearchResultKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      index: number,
      item: Track | Collection | WisdomSearchEntry | JournalSearchEntry,
      type: 'track' | 'collection' | 'wisdom' | 'journal'
    ) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = searchResultRefs.current[index + 1] ?? searchResultRefs.current[0];
        next?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (index === 0) {
          searchInputRef.current?.focus();
        } else {
          searchResultRefs.current[index - 1]?.focus();
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (type === 'track') {
          handleSearchResultSelect(item as Track);
        } else if (type === 'collection') {
          handleCollectionSelect(item as Collection);
        } else if (type === 'wisdom') {
          handleWisdomSelect(item as WisdomSearchEntry);
        } else {
          handleJournalSelect(item as JournalSearchEntry);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setIsSearchFocused(false);
        updateQuery('');
        searchInputRef.current?.focus();
      }
    },
    [handleSearchResultSelect, handleCollectionSelect, handleWisdomSelect, handleJournalSelect, updateQuery]
  );

  // Cleanup timeouts and rAF on unmount
  useEffect(() => {
    return () => {
      if (searchBlurTimeoutRef.current) {
        clearTimeout(searchBlurTimeoutRef.current);
        searchBlurTimeoutRef.current = null;
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isSearchFocused || !query) return;

    updateDropdownPosition();
    const handleWindowChange = () => updateDropdownPosition();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [isSearchFocused, query, updateDropdownPosition]);

  const hasResults = totalCount > 0;
  const resolvedDropdownStyle = useMemo(() => {
    if (dropdownStyle) return dropdownStyle;
    if (!searchAreaRef.current) return null;
    const rect = searchAreaRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 10,
      left: rect.left,
      width: rect.width + 64,
    };
  }, [dropdownStyle]);

  const dropdownStyleId = useCspStyle({
    zIndex: Z_INDEX.SEARCH_DROPDOWN,
    top: resolvedDropdownStyle ? `${resolvedDropdownStyle.top}px` : undefined,
    left: resolvedDropdownStyle ? `${resolvedDropdownStyle.left}px` : undefined,
    width: resolvedDropdownStyle ? `${resolvedDropdownStyle.width}px` : undefined,
  });

  const formatWisdomLabel = (entry: WisdomSearchEntry) => {
    if (entry.section === "guides") {
      return entry.category ? `Guide - ${entry.category}` : "Guide";
    }
    if (entry.section === "thoughts") return "Thought";
    return "Reflection";
  };

  const formatJournalDate = (value: string) => {
    if (!value) return "Saved entry";
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return "Saved entry";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const shouldShowDropdown = !disableDropdown && Boolean(query && isSearchFocused);

  return (
    <div
      ref={searchAreaRef}
      onFocusCapture={handleSearchAreaFocus}
      onBlurCapture={handleSearchAreaBlur}
      className={`relative w-full ${className}`}
    >
      {/* Search Input Container - Glassy style matching Queue search */}
      <div className="relative group">
        {/* WCAG 2.1 AA: Label element for search input */}
        <label htmlFor={resolvedInputId} className="sr-only">
          Search music, wisdom, and journal entries
        </label>

        {/* Search icon - positioned inside input */}
        {!hideIcon && (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60 group-focus-within:text-white/80 transition-colors z-10" aria-hidden="true" />
        )}

        {/* Search Input */}
        <input
          id={resolvedInputId}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          onKeyDown={handleSearchInputKeyDown}
          ref={searchInputRef}
          className={`w-full bg-white/5 border border-white/20 rounded-lg py-2 ${hideIcon ? "pl-3 pr-10" : "pl-9 pr-10"} text-xs text-white placeholder:text-white/60 focus-ring-light focus:bg-white/10 transition-all`}
          aria-label="Search music, wisdom, and journal entries"
          aria-describedby={instructionsId}
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup={disableDropdown ? undefined : "listbox"}
          aria-expanded={shouldShowDropdown}
          aria-controls={shouldShowDropdown ? resultsId : undefined}
        />

        {/* Screen reader instructions */}
        <span id={instructionsId} className="sr-only">
          Type to search across tracks, collections, wisdom, and journal entries. Use arrow keys to navigate results.
        </span>
      </div>

      {/* Clear Button - uses padding to expand touch target while keeping visual size contained */}
      {query && (
        <button
          onClick={() => updateQuery('')}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-8 w-8 min-h-[44px] min-w-[44px] rounded-full hover:bg-(--glass-light) active:bg-(--glass-medium) flex items-center justify-center transition-colors z-10 touch-manipulation focus-ring"
          aria-label="Clear search"
        >
          <X className="h-4 w-4 text-(--text-muted)" aria-hidden="true" />
        </button>
      )}

      {/* Search View (dropdown container) - rendered via portal to escape transform context */}
      {!disableDropdown && query.trim().length >= 1 && isSearchFocused && isMounted && createPortal(
        <div
          id={resultsId}
          className="pointer-events-auto fixed"
          data-csp-style={dropdownStyleId}
        >
          <div
            className="pointer-events-auto relative w-full overflow-hidden rounded-3xl border border-(--border-standard) bg-(--bg-surface-base) shadow-[0_20px_48px_rgba(5,6,22,0.45)] flex flex-col max-h-[min(70vh,520px)]"
          >
            {/* Subtle Background Blobs for visual interest */}
            <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[60%] bg-purple-600/8 blur-[80px] pointer-events-none" />
            <div className="absolute top-[40%] -right-[20%] w-[80%] h-[60%] bg-blue-600/8 blur-[80px] pointer-events-none" />

            <div className="relative z-10 flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between gap-3 border-b border-(--border-subtle) px-4 py-3 bg-black/20">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-(--border-standard) bg-white/5 text-white/80">
                    <Search className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-[0.65rem] uppercase tracking-[0.32em] text-(--text-muted)">Search</p>
                    <p className="text-sm font-heading font-semibold text-heading-solid">Search results</p>
                  </div>
                </div>
                <span className="text-xs text-(--text-muted)">
                  {totalCount} {totalCount === 1 ? "match" : "matches"}
                </span>
              </div>

              <div
                role="listbox"
                aria-label="Search suggestions"
                className="relative flex-1 overflow-y-auto min-h-0 overscroll-contain space-y-2 px-3 pb-4 pt-3"
              >
                {hasResults ? (
                  (() => {
                    const collectionOffset = 0;
                    const trackOffset = collectionResults.length;
                    const wisdomOffset = trackOffset + trackResults.length;
                    const journalOffset = wisdomOffset + wisdomResults.length;

                    return (
                      <>
                        {/* Collection Results */}
                        {collectionResults.length > 0 && (
                          <div className="mb-2">
                            <p className="px-2 pb-1 text-[10px] mobile:text-[11px] font-bold uppercase tracking-wider text-white/60">Collections</p>
                            {collectionResults.map((collection, index) => {
                              const actualIndex = collectionOffset + index;
                              return (
                                <button
                                  key={`col-${collection.id}`}
                                  ref={(el) => { searchResultRefs.current[actualIndex] = el }}
                                  onClick={() => handleCollectionSelect(collection)}
                                  onKeyDown={(e) => handleSearchResultKeyDown(e, actualIndex, collection, 'collection')}
                                  onMouseEnter={() => setHoveredIndex(actualIndex)}
                                  onMouseLeave={() => setHoveredIndex(null)}
                                  role="option"
                                  aria-selected={hoveredIndex === actualIndex}
                                  className={`w-full text-left flex items-center gap-3 p-2 rounded-xl transition-colors focus-ring ${hoveredIndex === actualIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                >
                                  <div className="h-10 w-10 rounded-md bg-white/10 overflow-hidden relative shrink-0">
                                    {collection.artworkUrl ? (
                                      <Image
                                        src={collection.artworkUrl}
                                        alt={collection.title}
                                        fill
                                        sizes="40px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="absolute inset-0 gradient-2-soft" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-heading font-semibold text-heading-solid text-sm">{collection.title}</p>
                                    <p className="text-xs text-white/60">{collection.trackCount || 0} tracks</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Track Results */}
                        {trackResults.length > 0 && (
                          <div>
                            {collectionResults.length > 0 && <p className="px-2 pb-1 pt-2 text-[10px] mobile:text-[11px] font-bold uppercase tracking-wider text-white/60">Tracks</p>}
                            {trackResults.map((track, index) => {
                              const actualIndex = trackOffset + index;
                              return (
                                <SearchResultItem
                                  key={track.id}
                                  track={track}
                                  index={actualIndex}
                                  isActive={currentTrack?.id === track.id}
                                  isHovered={hoveredIndex === actualIndex}
                                  onSelect={handleSearchResultSelect}
                                  onQueueAdd={handleSearchResultQueueAdd}
                                  onKeyDown={(e) => handleSearchResultKeyDown(e, actualIndex, track, 'track')}
                                  onMouseEnter={setHoveredIndex}
                                  onMouseLeave={(idx) => setHoveredIndex((current) => (current === idx ? null : current))}
                                  onFocus={setHoveredIndex}
                                  onBlur={(idx) => setHoveredIndex((current) => (current === idx ? null : current))}
                                  buttonRef={(element) => {
                                    searchResultRefs.current[actualIndex] = element
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Wisdom Results */}
                        {wisdomResults.length > 0 && (
                          <div className="mb-2">
                            {(collectionResults.length > 0 || trackResults.length > 0) && (
                              <p className="px-2 pb-1 pt-2 text-[10px] mobile:text-[11px] font-bold uppercase tracking-wider text-white/60">Wisdom</p>
                            )}
                            {wisdomResults.map((entry, index) => {
                              const actualIndex = wisdomOffset + index;
                              return (
                                <button
                                  key={`wisdom-${entry.section}-${entry.id}`}
                                  ref={(el) => { searchResultRefs.current[actualIndex] = el }}
                                  onClick={() => handleWisdomSelect(entry)}
                                  onKeyDown={(e) => handleSearchResultKeyDown(e, actualIndex, entry, 'wisdom')}
                                  onMouseEnter={() => setHoveredIndex(actualIndex)}
                                  onMouseLeave={() => setHoveredIndex(null)}
                                  role="option"
                                  aria-selected={hoveredIndex === actualIndex}
                                  className={`w-full text-left flex items-start gap-3 p-2 rounded-xl transition-colors focus-ring ${hoveredIndex === actualIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                >
                                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-(--border-subtle) bg-white/5 text-cyan-200 shrink-0">
                                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-heading font-semibold text-heading-solid text-sm truncate">{entry.title}</p>
                                    <p className="text-[11px] uppercase tracking-wider text-white/55">{formatWisdomLabel(entry)}</p>
                                    <p className="text-xs text-white/60 line-clamp-2">{entry.excerpt}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Journal Results */}
                        {journalResults.length > 0 && (
                          <div>
                            {(collectionResults.length > 0 || trackResults.length > 0 || wisdomResults.length > 0) && (
                              <p className="px-2 pb-1 pt-2 text-[10px] mobile:text-[11px] font-bold uppercase tracking-wider text-white/60">Journal</p>
                            )}
                            {journalResults.map((entry, index) => {
                              const actualIndex = journalOffset + index;
                              return (
                                <button
                                  key={`journal-${entry.id}`}
                                  ref={(el) => { searchResultRefs.current[actualIndex] = el }}
                                  onClick={() => handleJournalSelect(entry)}
                                  onKeyDown={(e) => handleSearchResultKeyDown(e, actualIndex, entry, 'journal')}
                                  onMouseEnter={() => setHoveredIndex(actualIndex)}
                                  onMouseLeave={() => setHoveredIndex(null)}
                                  role="option"
                                  aria-selected={hoveredIndex === actualIndex}
                                  className={`w-full text-left flex items-start gap-3 p-2 rounded-xl transition-colors focus-ring ${hoveredIndex === actualIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                >
                                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-(--border-subtle) bg-white/5 text-purple-200 shrink-0">
                                    <Book className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-heading font-semibold text-heading-solid text-sm truncate">{entry.title}</p>
                                    <p className="text-[11px] uppercase tracking-wider text-white/55">Updated {formatJournalDate(entry.updatedAt)}</p>
                                    <p className="text-xs text-white/60 line-clamp-2">{entry.excerpt}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()
                ) : (
                  /* UX-5: Enhanced empty state */
                  <EmptyState
                    icon={<Search className="h-8 w-8" />}
                    title="No results found"
                    description={<>No results for &ldquo;<span className="text-(--text-primary) font-medium">{query}</span>&rdquo;</>}
                    iconVariant="elevated"
                    action={
                      <div className="text-xs text-(--text-subtle) space-y-1">
                        <p className="font-medium text-(--text-secondary)">Try:</p>
                        <ul className="space-y-0.5">
                          <li>• Using different keywords</li>
                          <li>• Checking your spelling</li>
                        </ul>
                      </div>
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
