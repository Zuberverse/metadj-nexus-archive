import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import type { StorageBucket } from "@/lib/storage/storage.types";

export interface StreamRequestConfig {
  defaultContentType: string;
  contentTypeGuard?: (contentType?: string) => boolean;
  logScope: "audio" | "video";
  onBlockedContent?: (filePath: string, contentType: string) => void;
}

interface CachedMetadata {
  size: number;
  contentType?: string;
  etag?: string;
  lastModified?: string;
  cachedAt: number;
}

const METADATA_CACHE_TTL_MS = 5 * 60 * 1000;
const metadataCache = new Map<string, CachedMetadata>();

function getCachedMetadata(cacheKey: string): CachedMetadata | null {
  const cached = metadataCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > METADATA_CACHE_TTL_MS) {
    metadataCache.delete(cacheKey);
    return null;
  }
  return cached;
}

function setCachedMetadata(cacheKey: string, metadata: CachedMetadata): void {
  if (metadataCache.size > 500) {
    const now = Date.now();
    for (const [key, value] of metadataCache) {
      if (now - value.cachedAt > METADATA_CACHE_TTL_MS) {
        metadataCache.delete(key);
      }
    }
    if (metadataCache.size > 400) {
      const firstKey = metadataCache.keys().next().value;
      if (firstKey) metadataCache.delete(firstKey);
    }
  }
  metadataCache.set(cacheKey, metadata);
}

function toWebStream(stream: NodeJS.ReadableStream, signal?: AbortSignal) {
  const webStream = (Readable as unknown as { toWeb: (stream: NodeJS.ReadableStream) => ReadableStream<Uint8Array> }).toWeb(stream);

  if (signal) {
    signal.addEventListener("abort", () => {
      try {
        if ("destroy" in stream && typeof stream.destroy === "function") {
          stream.destroy();
        }
      } catch {
        // Ignore destroy failures (stream already closed)
      }
    });
  }

  stream.on("error", (err) => {
    const error = err as NodeJS.ErrnoException;
    if (error.code !== "EPIPE" && error.code !== "ECONNRESET") {
      logger.warn("Stream error", { scope: "media", code: error.code, message: error.message });
    }
  });

  return webStream;
}

export function sanitizePathSegments(segments: string[], allowedExtensions: Set<string>): string | null {
  if (segments.length === 0) return null;

  for (const segment of segments) {
    if (!segment || segment.includes("..") || segment.includes("\0") || segment.includes("/")) {
      return null;
    }
  }

  const joined = segments.join("/");
  const normalized = joined.toLowerCase();
  const hasAllowedExtension = Array.from(allowedExtensions).some((ext) => normalized.endsWith(ext));

  return hasAllowedExtension ? joined : null;
}

export async function streamBucketFile({
  request,
  bucket,
  filePath,
  config,
}: {
  request: NextRequest;
  bucket: StorageBucket;
  filePath: string;
  config: StreamRequestConfig;
}): Promise<NextResponse> {
  const file = bucket.file(filePath);
  const cacheKey = `${config.logScope}:${filePath}`;

  let cachedMeta = getCachedMetadata(cacheKey);
  let fileSize: number;
  let metadataContentType: string | undefined;
  let etag: string | undefined;
  let lastModifiedHeader: string | undefined;

  if (cachedMeta) {
    fileSize = cachedMeta.size;
    metadataContentType = cachedMeta.contentType;
    etag = cachedMeta.etag;
    lastModifiedHeader = cachedMeta.lastModified;
  } else {
    let metadata: Record<string, unknown> | undefined;
    try {
      [metadata] = await file.getMetadata();
    } catch (error) {
      logger.error("Failed to fetch object metadata", {
        scope: config.logScope,
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      return new NextResponse("File not found", { status: 404 });
    }

    fileSize = Number(metadata?.size ?? 0);
    metadataContentType =
      metadata && typeof metadata === "object" && "contentType" in metadata
        ? String(metadata.contentType)
        : undefined;
    etag = typeof metadata?.etag === "string" ? metadata.etag : undefined;
    const updatedRaw = typeof metadata?.updated === "string" ? metadata.updated : undefined;
    const lastModifiedDate = updatedRaw ? new Date(updatedRaw) : undefined;
    lastModifiedHeader =
      lastModifiedDate && !Number.isNaN(lastModifiedDate.valueOf()) ? lastModifiedDate.toUTCString() : undefined;

    setCachedMetadata(cacheKey, {
      size: fileSize,
      contentType: metadataContentType,
      etag,
      lastModified: lastModifiedHeader,
      cachedAt: Date.now(),
    });
  }

  if (config.contentTypeGuard && metadataContentType && !config.contentTypeGuard(metadataContentType)) {
    if (config.onBlockedContent) {
      config.onBlockedContent(filePath, metadataContentType);
    } else {
      logger.warn("Blocked file due to content-type mismatch", {
        scope: config.logScope,
        filePath,
        contentType: metadataContentType,
      });
    }
    return new NextResponse("File not found", { status: 404 });
  }

  const contentType = metadataContentType || config.defaultContentType;
  const baseHeaders = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": contentType,
  });

  if (etag) baseHeaders.set("ETag", etag);
  if (lastModifiedHeader) baseHeaders.set("Last-Modified", lastModifiedHeader);

  const ifNoneMatch = request.headers.get("if-none-match");
  if (etag && ifNoneMatch) {
    const clientEtags = ifNoneMatch.split(",").map((tag) => tag.trim());
    const normalizedEtag = etag.replace(/^W\//, "");
    const hasMatch = clientEtags.some((tag) => {
      if (tag === "*") return true;
      return tag.replace(/^W\//, "") === normalizedEtag;
    });

    if (hasMatch) {
      return new NextResponse(null, { status: 304, headers: baseHeaders });
    }
  }

  const ifModifiedSince = request.headers.get("if-modified-since");
  if (!ifNoneMatch && lastModifiedHeader && ifModifiedSince) {
    const sinceDate = new Date(ifModifiedSince);
    const lastModDate = new Date(lastModifiedHeader);
    if (!Number.isNaN(sinceDate.valueOf()) && !Number.isNaN(lastModDate.valueOf()) && lastModDate <= sinceDate) {
      return new NextResponse(null, { status: 304, headers: baseHeaders });
    }
  }

  const range = request.headers.get("range");
  if (range) {
    const matches = range.match(/bytes=(\d*)-(\d*)/);
    if (!matches) {
      return new NextResponse("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize || "*"}` },
      });
    }

    const start = matches[1] ? Number(matches[1]) : 0;
    const end = matches[2] ? Number(matches[2]) : fileSize ? fileSize - 1 : undefined;

    if (Number.isNaN(start) || start < 0 || (fileSize && start >= fileSize)) {
      return new NextResponse("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize || "*"}` },
      });
    }

    const effectiveEnd =
      end !== undefined ? Math.min(end, fileSize ? fileSize - 1 : end) : fileSize ? fileSize - 1 : undefined;

    const streamOptions =
      effectiveEnd !== undefined
        ? { start, end: effectiveEnd }
        : { start };

    const nodeStream = file.createReadStream(streamOptions);
    const chunkSize = effectiveEnd !== undefined && fileSize ? effectiveEnd - start + 1 : undefined;

    if (chunkSize) baseHeaders.set("Content-Length", chunkSize.toString());
    if (fileSize) baseHeaders.set("Content-Range", `bytes ${start}-${effectiveEnd ?? fileSize - 1}/${fileSize}`);

    return new NextResponse(toWebStream(nodeStream, request.signal), {
      status: 206,
      headers: baseHeaders,
    });
  }

  const nodeStream = file.createReadStream();
  if (fileSize) baseHeaders.set("Content-Length", fileSize.toString());

  return new NextResponse(toWebStream(nodeStream, request.signal), {
    status: 200,
    headers: baseHeaders,
  });
}
