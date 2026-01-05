/**
 * Media Storage Provider Abstraction
 *
 * Unified interface for media file storage that switches between providers
 * based on STORAGE_PROVIDER environment variable:
 * - 'replit' (default): Uses Replit App Storage
 * - 'r2': Uses Cloudflare R2 (S3-compatible, zero egress)
 *
 * Both providers implement the same StorageBucket interface, so API routes
 * and streaming helpers work identically regardless of backend.
 */

import { logger } from '@/lib/logger';
import {
  getR2MusicBucket,
  getR2VisualsBucket,
  r2Diagnostics,
} from '@/lib/r2-storage';
import {
  getMusicBucket as getReplitMusicBucket,
  getAudioBucket as getReplitAudioBucket,
  getVisualsBucket as getReplitVisualsBucket,
  getVideoBucket as getReplitVideoBucket,
  storageDiagnostics as replitDiagnostics,
} from '@/lib/replit-storage';
import type { StorageBucket } from '@/lib/storage/storage.types';

/**
 * Storage provider selection
 * Options: 'replit' (default) | 'r2'
 */
export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'replit';

// Log active provider at startup (skip in test environment)
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  logger.info(`Media storage provider: ${STORAGE_PROVIDER}`);
}

/**
 * Get music bucket from configured provider
 */
export async function getMusicBucket(): Promise<StorageBucket | null> {
  if (STORAGE_PROVIDER === 'r2') {
    return getR2MusicBucket();
  }
  return getReplitMusicBucket();
}

/**
 * Alias for getMusicBucket (backward compatibility)
 */
export async function getAudioBucket(): Promise<StorageBucket | null> {
  if (STORAGE_PROVIDER === 'r2') {
    return getR2MusicBucket();
  }
  return getReplitAudioBucket();
}

/**
 * Get visuals bucket from configured provider
 */
export async function getVisualsBucket(): Promise<StorageBucket | null> {
  if (STORAGE_PROVIDER === 'r2') {
    return getR2VisualsBucket();
  }
  return getReplitVisualsBucket();
}

/**
 * Alias for getVisualsBucket (backward compatibility)
 */
export async function getVideoBucket(): Promise<StorageBucket | null> {
  if (STORAGE_PROVIDER === 'r2') {
    return getR2VisualsBucket();
  }
  return getReplitVideoBucket();
}

/**
 * Combined diagnostics from active provider
 */
export const storageDiagnostics = {
  provider: STORAGE_PROVIDER,
  replit: replitDiagnostics,
  r2: r2Diagnostics,
  active: STORAGE_PROVIDER === 'r2' ? r2Diagnostics : replitDiagnostics,
};
