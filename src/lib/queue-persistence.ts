/**
 * Queue Persistence Utilities
 *
 * Manages localStorage persistence for MetaDJ Nexus playback queue state.
 * Handles saving, loading, and expiration of queue data with robust error handling.
 */

import { trackQueueRestored, trackQueueExpired } from './analytics'
import { APP_VERSION } from './app-version'
import { QUEUE_EXPIRATION_MS } from './app.constants'
import { logger } from './logger'
import { isStorageAvailable, STORAGE_KEYS, getRawValue, setRawValue, removeValue } from './storage/persistence'
import { getAgeInMinutes, getAgeInHours } from './utils'
import type { Track, QueueContext } from '@/types'

// Configuration
const VERSION = APP_VERSION || '0.0.0'

/**
 * Persisted queue state structure
 */
export interface PersistedQueueState {
  version: string
  timestamp: number
  queue: Track[]
  manualTrackIds: string[]
  autoQueue?: Track[]
  queueContext: QueueContext
  selectedCollection?: string // Preserve collection selection
  searchQuery?: string // Preserve active search query
  currentTrackId?: string // Currently playing/loaded track
  currentIndex?: number // Current track position in queue
  wasPlaying?: boolean // Whether track was playing when persisted
}

/**
 * Check if persisted state is expired
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns true if state should be expired
 */
function isExpired(timestamp: number): boolean {
  return Date.now() - timestamp > QUEUE_EXPIRATION_MS
}

/**
 * Check if persisted state version matches current app version
 *
 * @param version - Persisted version string
 * @returns true if versions match
 */
function isVersionMatch(version: string): boolean {
  return version === VERSION
}

/**
 * Save queue state to localStorage
 *
 * Persists queue, manual track IDs, and context metadata with version and timestamp.
 * Handles all errors gracefully without throwing.
 *
 * @param queue - Current track queue
 * @param manualTrackIds - IDs of manually added tracks
 * @param queueContext - Queue context type ('collection' or 'search')
 * @param selectedCollection - Currently selected collection ID (optional)
 * @param searchQuery - Active search query (optional)
 * @param currentTrackId - Currently playing/loaded track ID (optional)
 * @param currentIndex - Current track position in queue (optional)
 * @param autoQueue - Auto-generated queue (excluding manual tracks)
 * @param wasPlaying - Whether track was playing when persisted (optional)
 */
export function saveQueueState(
  queue: Track[],
  manualTrackIds: string[],
  queueContext: QueueContext,
  selectedCollection?: string,
  searchQuery?: string,
  currentTrackId?: string,
  currentIndex?: number,
  autoQueue?: Track[],
  wasPlaying?: boolean
): void {
  // Validate localStorage availability
  if (!isStorageAvailable()) {
    logger.warn('localStorage unavailable (private browsing?)')
    return
  }

  try {
    const resolvedAutoQueue = Array.isArray(autoQueue)
      ? autoQueue
      : queue.filter((track) => !manualTrackIds.includes(track.id))

    const state: PersistedQueueState = {
      version: VERSION,
      timestamp: Date.now(),
      queue,
      manualTrackIds,
      queueContext,
      selectedCollection,
      searchQuery,
      currentTrackId,
      currentIndex,
      autoQueue: resolvedAutoQueue,
      wasPlaying: wasPlaying ?? false
    }

    const serialized = JSON.stringify(state)
    setRawValue(STORAGE_KEYS.QUEUE_STATE, serialized)

    logger.debug(`Saved queue state (${queue.length} tracks)`)
  } catch (error) {
    // Handle quota exceeded or serialization errors
    logger.error('Failed to save queue state', { error })
  }
}

/**
 * Load queue state from localStorage
 *
 * Retrieves and validates persisted queue state. Handles expiration,
 * version mismatches, and corrupted data gracefully.
 *
 * @returns Persisted state if valid, null otherwise
 */
export function loadQueueState(): PersistedQueueState | null {
  // Validate localStorage availability
  if (!isStorageAvailable()) {
    logger.warn('localStorage unavailable (private browsing?)')
    return null
  }

  try {
    const serialized = getRawValue(STORAGE_KEYS.QUEUE_STATE)

    // No saved state
    if (!serialized) {
      logger.debug('No saved queue state found')
      return null
    }

    // Parse stored data
    const state = JSON.parse(serialized) as PersistedQueueState

    // Validate structure
    if (!state.version || !state.timestamp || !Array.isArray(state.queue)) {
      logger.warn('Invalid queue state structure')
      clearQueueState()
      return null
    }

    // Check version match
    if (!isVersionMatch(state.version)) {
      logger.info(`Version mismatch (${state.version} → ${APP_VERSION})`)
      clearQueueState()
      try {
        trackQueueExpired({ reason: 'version_mismatch' })
      } catch (error) {
        logger.debug('Analytics: trackQueueExpired failed', { reason: 'version_mismatch', error: String(error) })
      }
      return null
    }

    // Check expiration
    if (isExpired(state.timestamp)) {
      const ageHours = getAgeInHours(state.timestamp)
      logger.info(`Queue expired (${ageHours} hours old)`)
      clearQueueState()
      try {
        trackQueueExpired({ reason: 'time_expired' })
      } catch (error) {
        logger.debug('Analytics: trackQueueExpired failed', { reason: 'time_expired', error: String(error) })
      }
      return null
    }

    // Derive auto queue if missing (previous saves)
    if (!Array.isArray(state.autoQueue)) {
      const manualSet = new Set(state.manualTrackIds)
      state.autoQueue = state.queue.filter((track) => !manualSet.has(track.id))
    }

    // Valid state - track restoration
    logger.debug(`Restored queue (${state.queue.length} tracks)`)
    try {
      const ageMinutes = getAgeInMinutes(state.timestamp)
      trackQueueRestored({
        queueSize: state.queue.length,
        ageMinutes,
        context: state.queueContext
      })
    } catch (error) {
      logger.debug('Analytics: trackQueueRestored failed', { error: String(error) })
    }

    return state

  } catch (error) {
    // Handle JSON parse errors or corrupted data
    logger.error('Failed to load queue state (corrupted data?)', { error })
    clearQueueState()
    return null
  }
}

/**
 * Clear persisted queue state from localStorage
 *
 * Removes stored queue data. Safe to call even if no data exists.
 */
export function clearQueueState(): void {
  if (!isStorageAvailable()) {
    return
  }

  removeValue(STORAGE_KEYS.QUEUE_STATE)
  logger.debug('Cleared queue state')
}

/**
 * Get queue state age in minutes
 *
 * Useful for UI feedback about how old restored queue is.
 *
 * @returns Age in minutes, or null if no valid state
 */
export function getQueueStateAge(): number | null {
  if (!isStorageAvailable()) {
    return null
  }

  try {
    const serialized = getRawValue(STORAGE_KEYS.QUEUE_STATE)
    if (!serialized) return null

    const state = JSON.parse(serialized) as PersistedQueueState
    if (!state.timestamp) return null

    return getAgeInMinutes(state.timestamp)
  } catch {
    return null
  }
}
