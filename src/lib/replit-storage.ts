import { Client } from '@replit/object-storage';
import { trackEvent } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import type { StorageBucket } from '@/lib/storage/storage.types';

/**
 * Replit Object Storage Configuration
 *
 * SECURITY NOTICE:
 * ================
 * Production deployments MUST configure bucket IDs via environment variables:
 * - MUSIC_BUCKET_ID: Audio file storage bucket
 * - VISUALS_BUCKET_ID: Video file storage bucket
 *
 * Fallback bucket IDs are ONLY available in development mode (NODE_ENV !== 'production')
 * or when explicitly enabled via ALLOW_OBJECT_STORAGE_FALLBACK=true.
 *
 * In production, if bucket IDs are not configured:
 * - Storage clients will be null
 * - API routes will return appropriate errors
 * - No fallback IDs will be used
 *
 * To configure:
 * 1. Create Replit Object Storage buckets in your Replit project
 * 2. Set MUSIC_BUCKET_ID and VISUALS_BUCKET_ID in Replit Secrets
 * 3. Ensure ALLOW_OBJECT_STORAGE_FALLBACK is NOT set in production
 */

/**
 * Development-only fallback bucket IDs
 *
 * SECURITY: Fallback bucket IDs are loaded ONLY from environment variables.
 * No bucket IDs are hardcoded in source code.
 *
 * In development:
 * 1. Set DEV_FALLBACK_MUSIC_BUCKET_ID and DEV_FALLBACK_VISUALS_BUCKET_ID in .env
 * 2. These are used when primary MUSIC_BUCKET_ID/VISUALS_BUCKET_ID are not set
 *
 * In production:
 * 1. Set MUSIC_BUCKET_ID and VISUALS_BUCKET_ID in Replit Secrets
 * 2. Fallback buckets are blocked unless ALLOW_OBJECT_STORAGE_FALLBACK=true
 *
 * See .env.example for complete configuration documentation.
 */
const DEV_FALLBACK_MUSIC_BUCKET_ID = process.env.DEV_FALLBACK_MUSIC_BUCKET_ID;
const DEV_FALLBACK_VISUALS_BUCKET_ID = process.env.DEV_FALLBACK_VISUALS_BUCKET_ID;

/**
 * Determine if fallback buckets are allowed
 *
 * SECURITY: Fallbacks are only allowed in development or when explicitly enabled.
 * This prevents accidental use of development buckets in production.
 */
const isProduction = process.env.NODE_ENV === 'production';
const explicitlyAllowFallback = process.env.ALLOW_OBJECT_STORAGE_FALLBACK === 'true';
const allowFallbackBuckets = explicitlyAllowFallback || !isProduction;

// Log security-relevant configuration at startup (development only)
if (!isProduction && allowFallbackBuckets) {
  logger.info('Storage fallback buckets enabled (development mode)', {
    musicConfigured: Boolean(process.env.MUSIC_BUCKET_ID),
    visualsConfigured: Boolean(process.env.VISUALS_BUCKET_ID),
  });
}

function resolveBucketId({
  primary,
  secondary,
  fallback,
}: {
  primary?: string;
  secondary?: string;
  fallback?: string;
}) {
  if (primary) {
    return { bucketId: primary, usingFallback: false };
  }

  if (secondary) {
    return { bucketId: secondary, usingFallback: false };
  }

  if (allowFallbackBuckets && fallback) {
    return { bucketId: fallback, usingFallback: true };
  }

  return { bucketId: null, usingFallback: false };
}

const {
  bucketId: musicBucketId,
  usingFallback: musicUsingFallback,
} = resolveBucketId({
  primary: process.env.MUSIC_BUCKET_ID,
  secondary: process.env.AUDIO_BUCKET_ID,
  fallback: DEV_FALLBACK_MUSIC_BUCKET_ID,
});

const {
  bucketId: visualsBucketId,
  usingFallback: visualsUsingFallback,
} = resolveBucketId({
  primary: process.env.VISUALS_BUCKET_ID,
  fallback: DEV_FALLBACK_VISUALS_BUCKET_ID,
});

const musicClient = musicBucketId ? new Client({ bucketId: musicBucketId }) : null;
const visualsClient = visualsBucketId ? new Client({ bucketId: visualsBucketId }) : null;

// SECURITY: Log warning if fallback buckets are used in production
// This should never happen if ALLOW_OBJECT_STORAGE_FALLBACK is properly managed
if (isProduction && (musicUsingFallback || visualsUsingFallback)) {
  logger.warn('SECURITY WARNING: Using fallback bucket IDs in production!', {
    musicUsingFallback,
    visualsUsingFallback,
    hint: 'Set MUSIC_BUCKET_ID and VISUALS_BUCKET_ID environment variables and remove ALLOW_OBJECT_STORAGE_FALLBACK',
  });
}

// Note: No startup error log here.
// Next.js runs `next build` with NODE_ENV=production, and missing Replit bucket IDs is expected
// outside a Replit runtime. API routes and `/api/health` surface storage misconfiguration when used.

export const storageDiagnostics = {
  music: {
    configured: Boolean(musicBucketId),
    usingFallback: musicUsingFallback,
  },
  visuals: {
    configured: Boolean(visualsBucketId),
    usingFallback: visualsUsingFallback,
  },
  isProduction,
};

async function getBucket(client: Client | null, kind: 'music' | 'visuals'): Promise<StorageBucket | null> {
  if (!client) {
    logger.warn(`Storage bucket for ${kind} is not configured`);
    try {
      trackEvent('storage_bucket_missing', { kind });
    } catch {
      // ignore
    }
    return null;
  }

  try {
    const internalClient = client as unknown as { getBucket?: () => Promise<StorageBucket> };
    if (typeof internalClient.getBucket !== 'function') {
      return null;
    }
    return await internalClient.getBucket.call(client);
  } catch {
    try {
      trackEvent('storage_bucket_error', { kind });
    } catch {
      // ignore
    }
    return null;
  }
}

export async function getMusicBucket(): Promise<StorageBucket | null> {
  return getBucket(musicClient, 'music');
}

export async function getAudioBucket(): Promise<StorageBucket | null> {
  return getMusicBucket();
}

export async function getVisualsBucket(): Promise<StorageBucket | null> {
  return getBucket(visualsClient, 'visuals');
}

export async function getVideoBucket(): Promise<StorageBucket | null> {
  return getVisualsBucket();
}
