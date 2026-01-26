import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { resolveClientAddress } from '@/lib/network';
import { validateOrigin } from '@/lib/validation/origin-validation';
import { getMaxRequestSize, readRequestBodyWithLimit } from '@/lib/validation/request-size';

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // To prevent length-based timing attacks, compare against fixed buffer
    // but still return false for length mismatch
    const dummy = Buffer.alloc(a.length);
    timingSafeEqual(Buffer.from(a), dummy);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const ALLOWED_LEVELS = new Set(['debug', 'info', 'warn', 'error'] as const);
const LOG_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const LOG_MAX_REQUESTS_PER_WINDOW = 10;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface IncomingLogPayload {
  level?: LogLevel;
  message?: unknown;
  context?: unknown;
  timestamp?: unknown;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

const SENSITIVE_CONTEXT_KEY_REGEX =
  /(prompt|messages?|content|transcript|audio|email|phone|token|secret|api[_-]?key|authorization|cookie|session|password)/i;
const MAX_REDACTION_DEPTH = 4;

function redactSensitiveContext(value: unknown, depth = 0): unknown {
  if (depth > MAX_REDACTION_DEPTH) return undefined;

  if (Array.isArray(value)) {
    return value
      .map((item) => redactSensitiveContext(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_CONTEXT_KEY_REGEX.test(key)) {
        out[key] = '[redacted]';
        continue;
      }
      const redactedChild = redactSensitiveContext(child, depth + 1);
      if (redactedChild !== undefined) {
        out[key] = redactedChild;
      }
    }
    return out;
  }

  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }

  return value;
}

function sanitizeContext(context: unknown) {
  if (!context || typeof context !== 'object') {
    return undefined;
  }

  try {
    const cloned = JSON.parse(JSON.stringify(context));
    return redactSensitiveContext(cloned);
  } catch {
    return undefined;
  }
}

function getClientId(request: NextRequest): string {
  const { ip, fingerprint } = resolveClientAddress(request);
  if (ip !== 'unknown') {
    return `log-${ip}`;
  }
  return `log-${fingerprint.slice(0, 16)}`;
}

function checkRateLimit(clientId: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  let record = rateLimitMap.get(clientId);

  if (rateLimitMap.size > 1000) {
    for (const [key, rec] of rateLimitMap.entries()) {
      if (rec.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || now >= record.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + LOG_RATE_LIMIT_WINDOW_MS });
    return { limited: false };
  }

  if (record.count >= LOG_MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }

  record.count += 1;
  return { limited: false };
}

export const runtime = 'nodejs';

/**
 * Forwards client-side logs to an external logging webhook service.
 *
 * Acts as a secure proxy between the browser and the logging backend, validating
 * origin, client key, and log payload before forwarding. Supports debug, info,
 * warn, and error log levels with optional context and timestamps.
 *
 * @route POST /api/log
 * @param request - The incoming Next.js request containing log level, message, context, and timestamp
 * @returns JSON response indicating delivery status
 *
 * @example
 * // Request body
 * { level: 'error', message: 'Playback failed', context: { trackId: '123' }, timestamp: '2024-01-15T10:30:00.000Z' }
 *
 * // Request headers
 * x-logging-client-key: [client_key_value]
 *
 * @throws {202} Webhook not configured (logs accepted but not forwarded)
 * @throws {400} Invalid JSON body or missing/empty message
 * @throws {403} Forbidden origin or invalid/missing client key
 * @throws {502} Upstream webhook returned error or forwarding failed
 * @throws {503} Client key not configured on server
 */
export async function POST(request: NextRequest) {
  const webhookUrl = process.env.LOGGING_WEBHOOK_URL;
  const sharedSecret = process.env.LOGGING_SHARED_SECRET;
  const clientKey = process.env.LOGGING_CLIENT_KEY;

  if (!clientKey) {
    return NextResponse.json({ delivered: false, reason: 'client_key_unconfigured' }, { status: 503 });
  }

  // If webhook URL is not configured, accept logs but don't forward them
  if (!webhookUrl) {
    return NextResponse.json({ delivered: false, reason: 'webhook_unconfigured' }, { status: 202 });
  }

  const { allowed: originAllowed } = validateOrigin(request);
  if (!originAllowed) {
    return NextResponse.json({ delivered: false, reason: 'forbidden_origin' }, { status: 403 });
  }

  const providedClientKey = request.headers.get('x-logging-client-key');
  if (!providedClientKey || !safeCompare(providedClientKey, clientKey)) {
    return NextResponse.json({ delivered: false, reason: 'unauthorized' }, { status: 403 });
  }

  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(clientId);
  if (rateLimit.limited) {
    return NextResponse.json(
      { delivered: false, reason: 'rate_limited' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfter ?? 60),
          'X-RateLimit-Limit': String(LOG_MAX_REQUESTS_PER_WINDOW),
          'X-RateLimit-Reset': String(rateLimit.retryAfter ?? 60),
        },
      }
    );
  }

  const bodyResult = await readRequestBodyWithLimit(
    request,
    getMaxRequestSize(request.nextUrl.pathname)
  );
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  let payload: IncomingLogPayload;
  try {
    payload = JSON.parse(bodyResult.body);
  } catch {
    return NextResponse.json({ delivered: false, reason: 'invalid_json' }, { status: 400 });
  }

  if (typeof payload.message !== 'string' || payload.message.trim() === '') {
    return NextResponse.json({ delivered: false, reason: 'invalid_message' }, { status: 400 });
  }

  const level: LogLevel = (payload.level && ALLOWED_LEVELS.has(payload.level)) ? payload.level : 'warn';
  const sanitizedContext = sanitizeContext(payload.context);
  const timestamp =
    typeof payload.timestamp === 'string' && payload.timestamp.trim().length > 0
      ? payload.timestamp
      : new Date().toISOString();

  try {
    // Forward to webhook with server-side authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication header if secret is configured
    if (sharedSecret) {
      headers['x-logging-secret'] = sharedSecret;
    }

    const upstreamResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        level,
        message: payload.message,
        context: sanitizedContext,
        timestamp,
        source: 'metadj-nexus',
      }),
    });

    if (!upstreamResponse.ok) {
      // Log webhook returned error - don't expose details to client
      return NextResponse.json({ delivered: false }, { status: 502 });
    }

    return NextResponse.json({ delivered: true });
  } catch (error) {
    // Log forwarding failed - critical error but don't expose details
    return NextResponse.json({ delivered: false }, { status: 502 });
  }
}
