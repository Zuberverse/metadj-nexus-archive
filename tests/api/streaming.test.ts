import { Readable } from 'stream';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as audioRoute } from '@/app/api/audio/[...path]/route';
import { GET as videoRoute } from '@/app/api/video/[...path]/route';

const getVideoBucketMock = vi.hoisted(() => vi.fn());
const getAudioBucketMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/media-storage', () => ({
  getVideoBucket: getVideoBucketMock,
  getAudioBucket: getAudioBucketMock,
  storageDiagnostics: { provider: 'test', active: {} },
}));

vi.mock('@/lib/logger', () => ({
  logger: loggerMock,
}));

function buildMetadata(overrides: Record<string, unknown> = {}) {
  return {
    size: '1024000',
    contentType: 'audio/mpeg',
    updated: new Date().toISOString(),
    etag: '"test-etag"',
    ...overrides,
  };
}

function buildBucket(metadata: Record<string, unknown>, streamData = 'test-audio-data') {
  return {
    file: () => ({
      getMetadata: async () => [metadata],
      createReadStream: () => Readable.from(streamData),
    }),
  };
}

describe('Audio Streaming API', () => {
  beforeEach(() => {
    getAudioBucketMock.mockReset();
    Object.values(loggerMock).forEach(mock => mock.mockReset?.());
  });

  describe('Range Request Support', () => {
    it('should return 206 Partial Content with range header', async () => {
      const fileSize = 1024000;
      getAudioBucketMock.mockResolvedValue(buildBucket(buildMetadata({ size: fileSize.toString() })));

      const request = new NextRequest('http://localhost:3000/api/audio/majestic-ascent/01-track.mp3', {
        headers: { Range: 'bytes=0-1023' },
      });

      const response = await audioRoute(request, {
        params: Promise.resolve({ path: ['majestic-ascent', '01-track.mp3'] }),
      });

      expect(response).toBeDefined();
      expect(response!.status).toBe(206);
      expect(response!.headers.get('Content-Range')).toContain('bytes 0-1023');
      expect(response!.headers.get('Content-Type')).toBe('audio/mpeg');
      expect(response!.headers.get('Accept-Ranges')).toBe('bytes');
    });

    it('should return full file without range header', async () => {
      const fileSize = 1024000;
      getAudioBucketMock.mockResolvedValue(buildBucket(buildMetadata({ size: fileSize.toString() })));

      const request = new NextRequest('http://localhost:3000/api/audio/majestic-ascent/01-track.mp3');

      const response = await audioRoute(request, {
        params: Promise.resolve({ path: ['majestic-ascent', '01-track.mp3'] }),
      });

      expect(response).toBeDefined();
      expect(response!.status).toBe(200);
      expect(response!.headers.get('Accept-Ranges')).toBe('bytes');
      expect(response!.headers.get('Content-Type')).toBe('audio/mpeg');
    });

    it('should handle multi-part range requests', async () => {
      const fileSize = 1024000;
      getAudioBucketMock.mockResolvedValue(buildBucket(buildMetadata({ size: fileSize.toString() })));

      const request = new NextRequest('http://localhost:3000/api/audio/majestic-ascent/01-track.mp3', {
        headers: { Range: 'bytes=500000-999999' },
      });

      const response = await audioRoute(request, {
        params: Promise.resolve({ path: ['majestic-ascent', '01-track.mp3'] }),
      });

      expect(response).toBeDefined();
      expect(response!.status).toBe(206);
      expect(response!.headers.get('Content-Range')).toContain('bytes 500000-999999');
    });
  });

  describe('Security', () => {
    it('should reject path traversal attempts', async () => {
      const request = new NextRequest('http://localhost:3000/api/audio/../../../etc/passwd');

      const response = await audioRoute(request, {
        params: Promise.resolve({ path: ['..', '..', 'etc', 'passwd'] }),
      });

      expect(response).toBeDefined();
      expect(response!.status).toBe(400);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Invalid path attempt blocked',
        expect.any(Object)
      );
    });

    it('should validate file extensions', async () => {
      const request = new NextRequest('http://localhost:3000/api/audio/malicious.exe');

      const response = await audioRoute(request, {
        params: Promise.resolve({ path: ['malicious.exe'] }),
      });

      expect(response).toBeDefined();
      expect(response!.status).toBe(400);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Invalid path attempt blocked',
        expect.any(Object)
      );
    });

    it('should block requests with null bytes', async () => {
      const request = new NextRequest('http://localhost:3000/api/audio/test%00.mp3');

      const response = await audioRoute(request, {
        params: Promise.resolve({ path: ['test\0.mp3'] }),
      });

      expect(response).toBeDefined();
      expect(response!.status).toBe(400);
    });
  });

  describe('Caching', () => {
    it('should return 304 with matching ETag', async () => {
      const fileSize = 1024000;
      const lastModified = new Date('2024-01-01T00:00:00Z').toISOString();

      getAudioBucketMock.mockResolvedValue(
        buildBucket(
          buildMetadata({
            size: fileSize.toString(),
            updated: lastModified,
            etag: '"cache-test-etag"',
          }),
        ),
      );

      // First request to get ETag
      const request1 = new NextRequest('http://localhost:3000/api/audio/majestic-ascent/01-track.mp3');
      const response1 = await audioRoute(request1, {
        params: Promise.resolve({ path: ['majestic-ascent', '01-track.mp3'] }),
      });

      const etag = response1!.headers.get('ETag');
      expect(etag).toBeTruthy();

      // Second request with ETag
      const request2 = new NextRequest('http://localhost:3000/api/audio/majestic-ascent/01-track.mp3', {
        headers: { 'If-None-Match': etag! },
      });

      const response2 = await audioRoute(request2, {
        params: Promise.resolve({ path: ['majestic-ascent', '01-track.mp3'] }),
      });

      expect(response2).toBeDefined();
      expect(response2!.status).toBe(304);
    });

    it('should include Cache-Control headers', async () => {
      const fileSize = 1024000;
      getAudioBucketMock.mockResolvedValue(buildBucket(buildMetadata({ size: fileSize.toString() })));

      const request = new NextRequest('http://localhost:3000/api/audio/majestic-ascent/01-track.mp3');
      const response = await audioRoute(request, {
        params: Promise.resolve({ path: ['majestic-ascent', '01-track.mp3'] }),
      });

      expect(response).toBeDefined();
      expect(response!.headers.get('Cache-Control')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent files', async () => {
      getAudioBucketMock.mockResolvedValue({
        file: () => ({
          getMetadata: async () => {
            throw new Error('File not found');
          },
          createReadStream: () => {
            throw new Error('Should not stream when file is missing');
          },
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/audio/nonexistent/track.mp3');
      const response = await audioRoute(request, {
        params: Promise.resolve({ path: ['nonexistent', 'track.mp3'] }),
      });

      expect(response).toBeDefined();
      expect(response!.status).toBe(404);
    });

    it('should handle malformed range headers gracefully', async () => {
      const fileSize = 1024000;
      getAudioBucketMock.mockResolvedValue(
        buildBucket({
          size: fileSize.toString(),
          contentType: 'audio/mpeg',
          updated: new Date().toISOString(),
        })
      );

      const request = new NextRequest('http://localhost:3000/api/audio/majestic-ascent/01-track.mp3', {
        headers: { Range: 'bytes=invalid-range' },
      });

      const response = await audioRoute(request, {
        params: Promise.resolve({ path: ['majestic-ascent', '01-track.mp3'] }),
      });

      expect(response).toBeDefined();
      // Should either return 416 (Range Not Satisfiable) or fall back to 200
      expect([200, 416]).toContain(response!.status);
    });
  });
});

describe('Video Streaming API', () => {
  beforeEach(() => {
    getVideoBucketMock.mockReset();
    Object.values(loggerMock).forEach(mock => mock.mockReset?.());
  });

  it('should support dual-format delivery (WebM + MP4)', async () => {
    const fileSize = 5242880; // 5 MB

    // Test WebM
    getVideoBucketMock.mockResolvedValue(
      buildBucket({
        size: fileSize.toString(),
        contentType: 'video/webm',
        updated: new Date().toISOString(),
      }, 'webm-video-data')
    );

    const webmRequest = new NextRequest('http://localhost:3000/api/video/metadj-avatar/cinema-loop.webm');
    const webmResponse = await videoRoute(webmRequest, {
      params: Promise.resolve({ path: ['metadj-avatar', 'cinema-loop.webm'] }),
    });

    expect(webmResponse).toBeDefined();
    expect(webmResponse!.headers.get('Content-Type')).toBe('video/webm');

    // Test MP4 fallback
    getVideoBucketMock.mockResolvedValue(
      buildBucket({
        size: fileSize.toString(),
        contentType: 'video/mp4',
        updated: new Date().toISOString(),
      }, 'mp4-video-data')
    );

    const mp4Request = new NextRequest('http://localhost:3000/api/video/metadj-avatar/cinema-loop.mp4');
    const mp4Response = await videoRoute(mp4Request, {
      params: Promise.resolve({ path: ['metadj-avatar', 'cinema-loop.mp4'] }),
    });

    expect(mp4Response).toBeDefined();
    expect(mp4Response!.headers.get('Content-Type')).toBe('video/mp4');
  });

  it('should handle range requests for video scrubbing', async () => {
    const fileSize = 10485760; // 10 MB
    getVideoBucketMock.mockResolvedValue(
      buildBucket({
        size: fileSize.toString(),
        contentType: 'video/mp4',
        updated: new Date().toISOString(),
      })
    );

    const request = new NextRequest('http://localhost:3000/api/video/metadj-avatar/cinema-loop.mp4', {
      headers: { Range: 'bytes=0-1048575' }, // First 1 MB
    });

    const response = await videoRoute(request, {
      params: Promise.resolve({ path: ['metadj-avatar', 'cinema-loop.mp4'] }),
    });

    expect(response).toBeDefined();
    expect(response!.status).toBe(206);
    expect(response!.headers.get('Content-Range')).toContain('bytes 0-1048575');
  });

  it('should reject non-video content types', async () => {
    getVideoBucketMock.mockResolvedValue(
      buildBucket({
        size: '1024',
        contentType: 'text/plain',
        updated: new Date().toISOString(),
      })
    );

    const request = new NextRequest('http://localhost:3000/api/video/malicious.mp4');
    const response = await videoRoute(request, {
      params: Promise.resolve({ path: ['malicious.mp4'] }),
    });

    expect(response).toBeDefined();
    expect(response!.status).toBe(404);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Blocked video request due to metadata content type mismatch',
      expect.any(Object)
    );
  });
});

describe('Performance & Optimization', () => {
  beforeEach(() => {
    getAudioBucketMock.mockReset();
  });

  it('should handle concurrent requests efficiently', async () => {
    const fileSize = 1024000;
    getAudioBucketMock.mockResolvedValue(
      buildBucket(buildMetadata({ size: fileSize.toString() })),
    );

    const requests = Array.from({ length: 10 }, (_, i) =>
      audioRoute(
        new NextRequest(`http://localhost:3000/api/audio/majestic-ascent/track-${i}.mp3`),
        { params: Promise.resolve({ path: ['majestic-ascent', `track-${i}.mp3`] }) }
      )
    );

    const responses = await Promise.all(requests);

    expect(responses).toHaveLength(10);
    responses.forEach(response => {
      expect(response).toBeDefined();
      expect([200, 206, 404]).toContain(response!.status);
    });
  });

  it('should include appropriate headers for streaming optimization', async () => {
    const fileSize = 1024000;
    getAudioBucketMock.mockResolvedValue(
      buildBucket(buildMetadata({ size: fileSize.toString(), etag: '"optimization-etag"' })),
    );

    const request = new NextRequest('http://localhost:3000/api/audio/majestic-ascent/01-track.mp3');
    const response = await audioRoute(request, {
      params: Promise.resolve({ path: ['majestic-ascent', '01-track.mp3'] }),
    });

    expect(response).toBeDefined();
    expect(response!.headers.get('Accept-Ranges')).toBe('bytes');
    expect(response!.headers.get('Content-Type')).toBeTruthy();
    expect(response!.headers.get('ETag')).toBeTruthy();
  });
});
