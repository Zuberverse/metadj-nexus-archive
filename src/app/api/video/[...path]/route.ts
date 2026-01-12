/**
 * Video Streaming API Route
 *
 * Serves video files from Cloudflare R2 (primary; Replit fallback) with:
 * - Path traversal protection
 * - Content-type validation (video/mp4, video/webm, video/quicktime)
 * - Range request support for seeking
 * - Proper caching headers (1 year, immutable)
 * - ETag and Last-Modified support
 * - IP-based rate limiting (100 req/min)
 *
 * @route GET /api/video/[...path]
 * @route HEAD /api/video/[...path]
 *
 * @example
 * GET /api/video/metadj-avatar/MetaDJ%20Performance%20Loop%20-%20MetaDJ%20Nexus.mp4
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
import { getVideoBucket } from "@/lib/media-storage";
import {
  checkMediaRateLimit,
  buildRateLimitHeaders,
  buildMediaRateLimitResponse,
} from "@/lib/rate-limiting/media-rate-limiter";

export const runtime = "nodejs";

const VIDEO_EXTENSIONS = new Set([".webm", ".mp4", ".mov"]);
const VIDEO_CONTENT_TYPES = /^video\/(mp4|webm|quicktime)$/i;

function resolveContentType(filePath: string): string | null {
  if (filePath.endsWith(".webm")) return "video/webm";
  if (filePath.endsWith(".mp4")) return "video/mp4";
  if (filePath.endsWith(".mov")) return "video/quicktime";
  return null;
}

async function resolveVideoBucket() {
  const bucket = await getVideoBucket();
  if (!bucket) {
    logger.error("Failed to access video storage bucket (check STORAGE_PROVIDER and credentials)");
  }
  return bucket;
}

function sanitizeVideoPath(pathSegments: string[], request: NextRequest): string | null {
  const sanitized = sanitizePathSegments(pathSegments, VIDEO_EXTENSIONS);
  if (!sanitized) {
    logger.warn("Invalid path attempt blocked", {
      requestedPath: pathSegments.join("/"),
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });
  }
  return sanitized;
}

/**
 * Streams a video file from Cloudflare R2 (primary; Replit fallback).
 *
 * Supports range requests for seeking, content validation, and proper caching headers.
 * Serves video/mp4, video/webm, and video/quicktime files with path traversal protection.
 *
 * @route GET /api/video/[...path]
 * @param request - The incoming Next.js request with optional Range header for partial content
 * @param props - Route parameters containing the file path segments
 * @returns Video stream with appropriate headers (Content-Type, Content-Length, Accept-Ranges)
 *
 * @example
 * // GET /api/video/scenes/synth-haven.webm
 *
 * @throws {400} Invalid or unsafe file path (path traversal attempt)
 * @throws {404} File not found, unsupported extension, or blocked non-video content
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
    logger.warn("Video rate limit exceeded", {
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

  const filePath = sanitizeVideoPath(pathArray, request);
  if (!filePath) {
    return new NextResponse("Invalid file path", { status: 400 });
  }

  const defaultContentType = resolveContentType(filePath);
  if (!defaultContentType) {
    logger.warn("Blocked video request with disallowed extension", { filePath });
    return new NextResponse("File not found", { status: 404 });
  }

  const bucket = await resolveVideoBucket();
  if (!bucket) {
    return new NextResponse("Video storage bucket unavailable", { status: 503 });
  }

  try {
    return await streamBucketFile({
      request,
      bucket,
      filePath,
      config: {
        defaultContentType,
        contentTypeGuard: (type) => (typeof type === "string" ? VIDEO_CONTENT_TYPES.test(type) : false),
        logScope: "video",
        onBlockedContent: (blockedPath, contentType) => {
          logger.warn("Blocked video request due to metadata content type mismatch", {
            filePath: blockedPath,
            contentType,
          });
        },
      },
    });
  } catch (error) {
    logger.error("Error serving video file", {
      error: error instanceof Error ? error.message : String(error),
      filePath,
    });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * Returns metadata for a video file without streaming the content.
 *
 * Used by clients to check file availability, size, and caching headers before
 * initiating a full download or streaming request.
 *
 * @route HEAD /api/video/[...path]
 * @param request - The incoming Next.js request
 * @param props - Route parameters containing the file path segments
 * @returns Response with headers only (Content-Type, Content-Length, ETag, Last-Modified)
 *
 * @throws {400} Invalid or unsafe file path
 * @throws {404} File not found, unsupported extension, or blocked non-video content
 * @throws {500} Internal server error
 * @throws {503} Storage bucket unavailable
 */
export async function HEAD(
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
    return new NextResponse(null, {
      status: 429,
      headers: buildRateLimitHeaders(rateLimitResult),
    });
  }

  const filePath = sanitizeVideoPath(pathArray, request);
  if (!filePath) {
    return new NextResponse(null, { status: 400 });
  }

  const defaultContentType = resolveContentType(filePath);
  if (!defaultContentType) {
    logger.warn("Blocked HEAD request with disallowed extension", { filePath });
    return new NextResponse(null, { status: 404 });
  }

  const bucket = await resolveVideoBucket();
  if (!bucket) {
    return new NextResponse(null, { status: 503 });
  }

  try {
    const file = bucket.file(filePath);
    const [metadata] = await file.getMetadata();
    const metadataContentType = typeof metadata?.contentType === "string" ? metadata.contentType : undefined;

    if (metadataContentType && !VIDEO_CONTENT_TYPES.test(metadataContentType)) {
      logger.warn("Blocked HEAD request due to metadata content type mismatch", {
        filePath,
        contentType: metadataContentType,
      });
      return new NextResponse(null, { status: 404 });
    }

    const fileSize = Number(metadata?.size ?? 0);
    const etag = typeof metadata?.etag === "string" ? metadata.etag : undefined;
    const updatedRaw = typeof metadata?.updated === "string" ? metadata.updated : undefined;
    const lastModifiedDate = updatedRaw ? new Date(updatedRaw) : undefined;
    const lastModifiedHeader =
      lastModifiedDate && !Number.isNaN(lastModifiedDate.valueOf()) ? lastModifiedDate.toUTCString() : undefined;

    const headers: Record<string, string> = {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
      "Content-Type": defaultContentType,
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

    logger.error("Error handling HEAD for video file", {
      error: message,
      filePath,
    });
    return new NextResponse(null, { status: 500 });
  }
}
