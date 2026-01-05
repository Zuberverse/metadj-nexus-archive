import { Readable } from 'stream';
import { NextRequest } from 'next/server';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { GET as audioGet } from '@/app/api/audio/[...path]/route';
import { POST as logPost } from '@/app/api/log/route';
import { GET as videoGet } from '@/app/api/video/[...path]/route';
import { __audioPreloaderTestUtils } from '@/hooks/audio/use-audio-preloader';
import { clearEnvCache } from '@/lib/env';
import type { Track } from '@/lib/music';

const getVideoBucketMock = vi.hoisted(() => vi.fn());
const getAudioBucketMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({
  warn: vi.fn(),
  error: vi.fn(),
  audioError: vi.fn(),
}));

type NetworkInfoStub = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
  downlink?: number;
};

vi.mock('@/lib/media-storage', () => ({
  getVideoBucket: getVideoBucketMock,
  getAudioBucket: getAudioBucketMock,
  storageDiagnostics: { provider: 'test', active: {} },
}));

vi.mock('@/lib/logger', () => ({
  logger: loggerMock,
}));

function buildBucket(metadata: Record<string, unknown>) {
  return {
    file: () => ({
      getMetadata: async () => [metadata],
      createReadStream: () => Readable.from('stub'),
    }),
  };
}

describe('API route safeguards', () => {
  beforeEach(() => {
    getVideoBucketMock.mockReset();
    getAudioBucketMock.mockReset();
    Object.values(loggerMock).forEach(mock => mock.mockReset?.());
  });

  it('blocks video requests with disallowed extensions', async () => {
    const request = new NextRequest('http://localhost/api/video/sample.txt');
    const response = await videoGet(request, { params: Promise.resolve({ path: ['sample.txt'] }) });

    expect(response).toBeDefined();
    expect(response!.status).toBe(400);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Invalid path attempt blocked',
      expect.objectContaining({ requestedPath: 'sample.txt' }),
    );
  });

  it('blocks video requests when metadata content type is not video', async () => {
    getVideoBucketMock.mockResolvedValue(
      buildBucket({
        size: '1024',
        contentType: 'text/plain',
        updated: new Date().toISOString(),
      }),
    );

    const request = new NextRequest('http://localhost/api/video/sample.mp4');
    const response = await videoGet(request, { params: Promise.resolve({ path: ['sample.mp4'] }) });

    expect(response).toBeDefined();
    expect(response!.status).toBe(404);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Blocked video request due to metadata content type mismatch',
      expect.objectContaining({ filePath: 'sample.mp4' }),
    );
  });

  it('blocks audio requests when metadata content type is not audio', async () => {
    getAudioBucketMock.mockResolvedValue(
      buildBucket({
        size: '1024',
        contentType: 'text/plain',
        updated: new Date().toISOString(),
      }),
    );

    const request = new NextRequest('http://localhost/api/audio/sample.mp3');
    const response = await audioGet(request, { params: Promise.resolve({ path: ['sample.mp3'] }) });

    expect(response).toBeDefined();
    expect(response!.status).toBe(404);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Blocked non-audio content from audio route',
      expect.objectContaining({ filePath: 'sample.mp3' }),
    );
  });
});

describe('Logging route security', () => {
  const originalWebhook = process.env.LOGGING_WEBHOOK_URL;
  const originalSecret = process.env.LOGGING_SHARED_SECRET;
  const originalClientKey = process.env.LOGGING_CLIENT_KEY;
  const originalPublicClientKey = process.env.NEXT_PUBLIC_LOGGING_CLIENT_KEY;
  let originalFetch: typeof fetch | undefined;

  const testSharedSecret = 'unit-test-secret-'.repeat(3);
  const testClientKey = 'client-test-key-'.repeat(3);

  const buildLogRequest = (overrides?: Record<string, string>, body = { message: 'Test log' }) => {
    return new NextRequest('http://localhost/api/log', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: new Headers({
        'content-type': 'application/json',
        origin: 'https://metadjnexus.ai',
        'x-logging-client-key': testClientKey,
        ...overrides,
      }),
    });
  };

  beforeEach(() => {
    process.env.LOGGING_WEBHOOK_URL = 'https://example.com/webhook';
    process.env.LOGGING_SHARED_SECRET = testSharedSecret;
    process.env.LOGGING_CLIENT_KEY = testClientKey;
    process.env.NEXT_PUBLIC_LOGGING_CLIENT_KEY = testClientKey;
    clearEnvCache();
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  afterEach(() => {
    if (originalWebhook === undefined) {
      delete process.env.LOGGING_WEBHOOK_URL;
    } else {
      process.env.LOGGING_WEBHOOK_URL = originalWebhook;
    }
    if (originalSecret === undefined) {
      delete process.env.LOGGING_SHARED_SECRET;
    } else {
      process.env.LOGGING_SHARED_SECRET = originalSecret;
    }
    if (originalClientKey === undefined) {
      delete process.env.LOGGING_CLIENT_KEY;
    } else {
      process.env.LOGGING_CLIENT_KEY = originalClientKey;
    }
    if (originalPublicClientKey === undefined) {
      delete process.env.NEXT_PUBLIC_LOGGING_CLIENT_KEY;
    } else {
      process.env.NEXT_PUBLIC_LOGGING_CLIENT_KEY = originalPublicClientKey;
    }
    clearEnvCache();
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as unknown as { fetch?: typeof fetch }).fetch;
    }
  });

  it('accepts logs when webhook is not configured (graceful degradation)', async () => {
    delete process.env.LOGGING_WEBHOOK_URL;
    delete process.env.LOGGING_SHARED_SECRET;

    const response = await logPost(buildLogRequest());
    expect(response.status).toBe(202); // Accepted but not forwarded
  });

  it('accepts logs from allowed origins without client-side authentication', async () => {
    const response = await logPost(buildLogRequest());
    expect(response.status).toBe(200);
  });

  it('rejects logs from forbidden origins', async () => {
    const response = await logPost(
      buildLogRequest({ origin: 'https://malicious-site.com' }),
    );
    expect(response.status).toBe(403);
  });

  it('rejects logs without client key', async () => {
    const request = buildLogRequest();
    request.headers.delete('x-logging-client-key');
    const response = await logPost(request);
    expect(response.status).toBe(403);
  });

  it('rejects oversized log payloads even with understated content-length', async () => {
    const oversizedMessage = 'x'.repeat(12 * 1024);
    const response = await logPost(
      buildLogRequest({ 'content-length': '1' }, { message: oversizedMessage }),
    );
    expect(response.status).toBe(413);
  });

  it('forwards logs to webhook with server-side authentication', async () => {
    const response = await logPost(buildLogRequest());
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-logging-secret': testSharedSecret,
        }),
      }),
    );
  });
});

describe('Audio preloader heuristics', () => {
  it('only prefetches featured tracks on high-throughput connections', () => {
    const highThroughputConnection: NetworkInfoStub = {
      effectiveType: '4g',
      downlink: 10,
    };
    const highThroughput = __audioPreloaderTestUtils.updateRuntimePreloadConfig(highThroughputConnection);
    expect(highThroughput.prefetchFeaturedOnLoad).toBe(true);

    const defaultProfile = __audioPreloaderTestUtils.updateRuntimePreloadConfig(null);
    expect(defaultProfile.prefetchFeaturedOnLoad).toBe(true); // Uses default config when connection unavailable

    const slowConnection: NetworkInfoStub = {
      effectiveType: '3g',
    };
    const slowProfile = __audioPreloaderTestUtils.updateRuntimePreloadConfig(slowConnection);
    expect(slowProfile.prefetchFeaturedOnLoad).toBe(false);
  });

  it('skips low-priority preloads for very long tracks', () => {
    const threshold = __audioPreloaderTestUtils.LONG_TRACK_DURATION_THRESHOLD_SECONDS;
    const longTrack = { id: 'long', duration: threshold + 60 } as Pick<Track, 'id' | 'duration'>;
    const shortTrack = { id: 'short', duration: threshold - 60 } as Pick<Track, 'id' | 'duration'>;

    expect(__audioPreloaderTestUtils.shouldSkipLowPriorityPreload(longTrack as Track, 'low')).toBe(true);
    expect(__audioPreloaderTestUtils.shouldSkipLowPriorityPreload(shortTrack as Track, 'low')).toBe(false);
    expect(__audioPreloaderTestUtils.shouldSkipLowPriorityPreload(longTrack as Track, 'high')).toBe(false);
  });
});
