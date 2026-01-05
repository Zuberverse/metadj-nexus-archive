/**
 * Cloudflare R2 Storage Adapter
 *
 * S3-compatible storage with zero egress fees.
 * Uses a single bucket with prefixed paths for logical separation:
 * - music/  → Audio files
 * - visuals/ → Video files
 *
 * Configuration via environment variables:
 * - R2_ACCOUNT_ID: Cloudflare account ID
 * - R2_ACCESS_KEY_ID: R2 API access key
 * - R2_SECRET_ACCESS_KEY: R2 API secret key
 * - R2_BUCKET: Bucket name (default: metadj-nexus-media)
 */

import { PassThrough } from 'stream';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';
import type { StorageBucket, StorageBucketFile } from '@/lib/storage/storage.types';

// Environment configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || 'metadj-nexus-media';

// Prefix paths for logical separation within single bucket
const MUSIC_PREFIX = 'music/';
const VISUALS_PREFIX = 'visuals/';

/**
 * Create configured S3 client for R2
 */
function createR2Client(): S3Client | null {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * R2 file wrapper implementing StorageBucketFile interface
 */
class R2BucketFile implements StorageBucketFile {
  constructor(
    private client: S3Client,
    private bucketName: string,
    private key: string
  ) {}

  async getMetadata(): Promise<[Record<string, unknown>]> {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: this.key,
    });

    const response = await this.client.send(command);

    return [{
      size: response.ContentLength,
      contentType: response.ContentType,
      etag: response.ETag,
      updated: response.LastModified?.toISOString(),
    }];
  }

  createReadStream(options?: { start?: number; end?: number }): NodeJS.ReadableStream {
    const rangeHeader = options?.start !== undefined || options?.end !== undefined
      ? `bytes=${options.start ?? 0}-${options.end ?? ''}`
      : undefined;

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: this.key,
      Range: rangeHeader,
    });

    // Return a PassThrough stream that fetches data asynchronously
    const passthrough = new PassThrough();
    const client = this.client;

    (async () => {
      try {
        const response = await client.send(command);
        if (response.Body) {
          // Handle the response body as an async iterable
          const webStream = response.Body as AsyncIterable<Uint8Array>;
          for await (const chunk of webStream) {
            passthrough.write(chunk);
          }
          passthrough.end();
        } else {
          passthrough.destroy(new Error('Empty response body from R2'));
        }
      } catch (error) {
        logger.error('R2 stream error', { key: this.key, error });
        passthrough.destroy(error as Error);
      }
    })();

    return passthrough;
  }
}

/**
 * R2 bucket wrapper implementing StorageBucket interface
 */
class R2Bucket implements StorageBucket {
  constructor(
    private client: S3Client,
    private bucketName: string
  ) {}

  file(path: string): StorageBucketFile {
    return new R2BucketFile(this.client, this.bucketName, path);
  }
}

/**
 * Prefixed bucket wrapper - prepends prefix to all file paths
 * Enables logical separation (music/, visuals/) within a single bucket
 */
class PrefixedR2Bucket implements StorageBucket {
  constructor(
    private bucket: R2Bucket,
    private prefix: string
  ) {}

  file(path: string): StorageBucketFile {
    return this.bucket.file(this.prefix + path);
  }
}

// Singleton R2 client instance
const r2Client = createR2Client();

/**
 * Get R2 bucket for music files (prefixed with music/)
 */
export async function getR2MusicBucket(): Promise<StorageBucket | null> {
  if (!r2Client) {
    logger.warn('R2 storage not configured for music bucket');
    return null;
  }
  const bucket = new R2Bucket(r2Client, R2_BUCKET);
  return new PrefixedR2Bucket(bucket, MUSIC_PREFIX);
}

/**
 * Get R2 bucket for visual files (prefixed with visuals/)
 */
export async function getR2VisualsBucket(): Promise<StorageBucket | null> {
  if (!r2Client) {
    logger.warn('R2 storage not configured for visuals bucket');
    return null;
  }
  const bucket = new R2Bucket(r2Client, R2_BUCKET);
  return new PrefixedR2Bucket(bucket, VISUALS_PREFIX);
}

/**
 * Diagnostics for health checks and debugging
 */
export const r2Diagnostics = {
  configured: Boolean(r2Client),
  bucket: R2_BUCKET,
  musicPrefix: MUSIC_PREFIX,
  visualsPrefix: VISUALS_PREFIX,
  accountId: R2_ACCOUNT_ID ? `${R2_ACCOUNT_ID.slice(0, 8)}...` : null,
};
