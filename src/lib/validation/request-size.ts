import { NextRequest, NextResponse } from 'next/server';

const KB = 1024;
const MB = 1024 * KB;

/**
 * Default timeout for reading request body (30 seconds)
 * Prevents slowloris-style attacks where clients send data very slowly
 */
const BODY_READ_TIMEOUT_MS = 30_000;

export const MAX_REQUEST_SIZE = {
  '/api/log': 10 * KB,
  '/api/health': 1 * KB,
  '/api/metadjai/transcribe': 12 * MB,
  '/api/metadjai/stream': 600 * KB,
  '/api/metadjai': 600 * KB,
  default: 100 * KB,
} as const;

export function getMaxRequestSize(path: string): number {
  for (const [route, size] of Object.entries(MAX_REQUEST_SIZE)) {
    if (route !== 'default' && path.startsWith(route)) {
      return size;
    }
  }
  return MAX_REQUEST_SIZE.default;
}

export function buildPayloadTooLargeResponse(maxBytes: number): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: 'Payload Too Large',
      message: `Request body exceeds maximum size of ${Math.round(maxBytes / KB)} KB`,
    }),
    {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Build a timeout response for slow body reads
 */
function buildBodyTimeoutResponse(): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: 'Request Timeout',
      message: 'Request body read timed out. Please try again.',
    }),
    {
      status: 408,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

type BodyReadResult =
  | { ok: true; body: string; size: number }
  | { ok: false; response: NextResponse };

function concatChunks(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

/**
 * Read request body with size limit and timeout protection
 *
 * @param request - Next.js request object
 * @param maxBytes - Maximum allowed body size in bytes
 * @param timeoutMs - Timeout in milliseconds (default: 30 seconds)
 * @returns Body read result or error response
 *
 * Security: Protects against slowloris-style attacks by enforcing a timeout
 * on body reading. If a client sends data too slowly, the request is aborted.
 */
export async function readRequestBodyWithLimit(
  request: NextRequest,
  maxBytes: number,
  timeoutMs: number = BODY_READ_TIMEOUT_MS
): Promise<BodyReadResult> {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const size = Number.parseInt(contentLength, 10);
    if (!Number.isNaN(size) && size > maxBytes) {
      return { ok: false, response: buildPayloadTooLargeResponse(maxBytes) };
    }
  }

  if (!request.body) {
    return { ok: true, body: '', size: 0 };
  }

  // Wrap body reading with timeout to prevent slowloris attacks
  const readBodyWithTimeout = async (): Promise<BodyReadResult> => {
    const reader = request.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          return { ok: false, response: buildPayloadTooLargeResponse(maxBytes) };
        }
        chunks.push(value);
      }

      if (!chunks.length) {
        return { ok: true, body: '', size };
      }

      const combined = concatChunks(chunks, size);
      const body = new TextDecoder().decode(combined);
      return { ok: true, body, size };
    } catch (error) {
      // Handle reader cancellation or other errors
      try {
        await reader.cancel();
      } catch {
        // Ignore cancel errors
      }
      throw error;
    }
  };

  // Create timeout promise
  const timeoutPromise = new Promise<BodyReadResult>((_, reject) => {
    setTimeout(() => reject(new Error('Body read timeout')), timeoutMs);
  });

  try {
    return await Promise.race([readBodyWithTimeout(), timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Body read timeout') {
      return { ok: false, response: buildBodyTimeoutResponse() };
    }
    throw error;
  }
}

type JsonBodyResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function readJsonBodyWithLimit<T>(
  request: NextRequest,
  maxBytes: number,
  options?: { allowEmpty?: boolean }
): Promise<JsonBodyResult<T>> {
  const bodyResult = await readRequestBodyWithLimit(request, maxBytes);
  if (!bodyResult.ok) {
    return bodyResult;
  }

  const trimmed = bodyResult.body.trim();
  if (!trimmed) {
    if (options?.allowEmpty) {
      return { ok: true, data: null as T };
    }
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid request body' }, { status: 400 }),
    };
  }

  try {
    const data = JSON.parse(trimmed) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid request body' }, { status: 400 }),
    };
  }
}
