/**
 * Audio Streaming API Route
 *
 * Serves audio files from Replit Object Storage with:
 * - Path traversal protection
 * - Content-type validation (audio/mpeg only)
 * - Range request support for seeking
 * - Proper caching headers (1 year, immutable)
 * - ETag and Last-Modified support
 * - IP-based rate limiting (100 req/min)
 *
 * @route GET /api/audio/[...path]
 * @route HEAD /api/audio/[...path]
 *
 * @example
 * GET /api/audio/collections/majestic-ascent/track-01.mp3
 *
 * Response codes:
 * - 200: Success (full file or partial content)
 * - 206: Partial content (range request)
 * - 304: Not modified (ETag match)
 * - 400: Invalid file path
 * - 404: File not found
 * - 429: Too many requests (rate limited)
 * - 503: Storage bucket unavailable
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { sanitizePathSegments, streamBucketFile } from "@/lib/media/streaming";
import { getAudioBucket } from "@/lib/media-storage";
import {
  checkMediaRateLimit,
  buildRateLimitHeaders,
  buildMediaRateLimitResponse,
} from "@/lib/rate-limiting/media-rate-limiter";

export const runtime = "nodejs";

const AUDIO_EXTENSIONS = new Set([".mp3"]);
const AUDIO_CONTENT_TYPE = /audio\/(mpeg|mp3)/i;

async function resolveAudioBucket() {
  const bucket = await getAudioBucket();
  if (!bucket) {
    logger.error("Failed to access audio storage bucket (check STORAGE_PROVIDER and credentials)");
  }
  return bucket;
}

function sanitizeAudioPath(pathSegments: string[], request: NextRequest): string | null {
  const sanitized = sanitizePathSegments(pathSegments, AUDIO_EXTENSIONS);
  if (!sanitized) {
    logger.warn("Invalid path attempt blocked", {
      requestedPath: pathSegments.join("/"),
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });
  }
  return sanitized;
}

/**
 * Streams an audio file from Replit Object Storage.
 *
 * Supports range requests for seeking, content validation, and proper caching headers.
 * Only serves audio/mpeg (MP3) files with path traversal protection.
 *
 * @route GET /api/audio/[...path]
 * @param request - The incoming Next.js request with optional Range header for partial content
 * @param props - Route parameters containing the file path segments
 * @returns Audio stream with appropriate headers (Content-Type, Content-Length, Accept-Ranges)
 *
 * @example
 * // GET /api/audio/collections/majestic-ascent/track-01.mp3
 *
 * @throws {400} Invalid or unsafe file path (path traversal attempt)
 * @throws {404} File not found or blocked non-audio content
 * @throws {500} Internal server error during streaming
 * @throws {503} Storage bucket unavailable
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> },
) {
  const params = await props.params;
  const pathArray = params.path;

  // Handle warmup requests (bypass rate limiting)
  if (pathArray.length === 1 && pathArray[0] === "warmup") {
    return new NextResponse(null, { status: 200 });
  }

  // Rate limit check
  const rateLimitResult = await checkMediaRateLimit(request);
  if (!rateLimitResult.allowed) {
    const { error, retryAfter } = buildMediaRateLimitResponse(rateLimitResult.remainingMs ?? 60000);
    logger.warn("Audio rate limit exceeded", {
      ip: request.headers.get("x-forwarded-for") || "unknown",
      retryAfter,
    });
    return NextResponse.json(
      { error },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult),
      }
    );
  }

  const filePath = sanitizeAudioPath(pathArray, request);
  if (!filePath) {
    return new NextResponse("Invalid file path", { status: 400 });
  }

  const bucket = await resolveAudioBucket();
  if (!bucket) {
    return new NextResponse("Audio storage bucket unavailable", { status: 503 });
  }

  try {
    return await streamBucketFile({
      request,
      bucket,
      filePath,
      config: {
        defaultContentType: "audio/mpeg",
        contentTypeGuard: (type) => (typeof type === "string" ? AUDIO_CONTENT_TYPE.test(type) : false),
        logScope: "audio",
        onBlockedContent: (blockedPath, contentType) => {
          logger.warn("Blocked non-audio content from audio route", {
            filePath: blockedPath,
            contentType,
          });
        },
      },
    });
  } catch (error) {
    logger.error("Error serving audio file", {
      error: error instanceof Error ? error.message : String(error),
      filePath,
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * Returns metadata for an audio file without streaming the content.
 *
 * Used by clients to check file availability, size, and caching headers before
 * initiating a full download or streaming request.
 *
 * @route HEAD /api/audio/[...path]
 * @param request - The incoming Next.js request
 * @param props - Route parameters containing the file path segments
 * @returns Response with headers only (Content-Type, Content-Length, ETag, Last-Modified)
 *
 * @throws {400} Invalid or unsafe file path
 * @throws {404} File not found or blocked non-audio content
 * @throws {500} Internal server error
 * @throws {503} Storage bucket unavailable
 */
export async function HEAD(
  request: NextRequest,
  props: { params: Promise<{ path: string[] }> },
) {
  const params = await props.params;
  const pathArray = params.path;

  // Handle warmup requests
  if (pathArray.length === 1 && pathArray[0] === "warmup") {
    return new NextResponse(null, { status: 200 });
  }

  const filePath = sanitizeAudioPath(pathArray, request);
  if (!filePath) {
    return new NextResponse(null, { status: 400 });
  }

  const bucket = await resolveAudioBucket();
  if (!bucket) {
    return new NextResponse(null, { status: 503 });
  }

  try {
    const file = bucket.file(filePath);
    const [metadata] = await file.getMetadata();
    const fileSize = Number(metadata?.size ?? 0);
    const contentType =
      metadata && typeof metadata === "object" && "contentType" in metadata
        ? String(metadata.contentType)
        : undefined;

    if (contentType && !AUDIO_CONTENT_TYPE.test(contentType)) {
      logger.warn("Blocked non-audio content from audio route (HEAD)", { filePath, contentType });
      return new NextResponse(null, { status: 404 });
    }

    const etag = typeof metadata?.etag === "string" ? metadata.etag : undefined;
    const updatedRaw = typeof metadata?.updated === "string" ? metadata.updated : undefined;
    const lastModifiedDate = updatedRaw ? new Date(updatedRaw) : undefined;
    const lastModifiedHeader =
      lastModifiedDate && !Number.isNaN(lastModifiedDate.valueOf()) ? lastModifiedDate.toUTCString() : undefined;

    const headers: Record<string, string> = {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
      "Content-Type": "audio/mpeg",
    };

    if (fileSize) headers["Content-Length"] = fileSize.toString();
    if (etag) headers["ETag"] = etag;
    if (lastModifiedHeader) headers["Last-Modified"] = lastModifiedHeader;

    return new NextResponse(null, { status: 200, headers });
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    const message = error instanceof Error ? error.message : String(error);

    if (code === 404 || /not\s*found/i.test(message)) {
      return new NextResponse(null, { status: 404 });
    }

    logger.error("Error handling HEAD for audio file", {
      error: message,
      filePath,
    });
    return new NextResponse(null, { status: 500 });
  }
}
