import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";
import { generateNonce } from "@/lib/nonce";
import { BoundedMap } from "@/lib/rate-limiting/bounded-map";
import { buildPayloadTooLargeResponse, getMaxRequestSize } from "@/lib/validation/request-size";

// ============================================================================
// Configuration & State
// ============================================================================

const RATE_LIMITS = {
  media: { maxRequests: 100, windowMs: 60_000, windowUpstash: "1 m" as const },
  log: { maxRequests: 10, windowMs: 60_000, windowUpstash: "1 m" as const },
  api: { maxRequests: 200, windowMs: 60_000, windowUpstash: "1 m" as const },
};

const DEFAULT_TRUSTED_IP_HEADERS = [
  "x-vercel-ip",
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
  "forwarded",
] as const;

const TRUSTED_IP_HEADERS = (() => {
  const configured = process.env.TRUSTED_IP_HEADERS;
  if (!configured) {
    return [...DEFAULT_TRUSTED_IP_HEADERS];
  }
  const headers = configured
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
  return headers.length > 0 ? headers : [...DEFAULT_TRUSTED_IP_HEADERS];
})();

const NO_STORE_API_EXCLUDE_PREFIXES = ["/api/audio", "/api/video", "/api/wisdom"];

// CORS: Strict allowed-origins list
const CORS_ALLOWED_ORIGINS: string[] = (() => {
  const origins: string[] = [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      origins.push(new URL(appUrl).origin);
    } catch {
      // Invalid URL; skip
    }
  }
  if (process.env.NODE_ENV === "development") {
    origins.push(
      "http://localhost:8100",
      "https://localhost:8100",
      "http://localhost:3000",
      "https://localhost:3000",
      "http://127.0.0.1:8100",
      "https://127.0.0.1:8100"
    );
  }
  // Deduplicate
  return [...new Set(origins)];
})();

const CORS_ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const CORS_ALLOWED_HEADERS = "Content-Type, Authorization, X-Requested-With";
const CORS_MAX_AGE = "86400"; // 24 hours

function isAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  return CORS_ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

function buildCorsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
    "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
    "Access-Control-Max-Age": CORS_MAX_AGE,
    Vary: "Origin",
  };
}

// Types for local fallback
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// 1. Redis Rate Limiter (Preferred)
// Only initialized if env vars are present
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

const upstashLimiters = redis
  ? {
    media: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.media.maxRequests,
        RATE_LIMITS.media.windowUpstash
      ),
      analytics: true,
      prefix: "metadj:ratelimit:media",
    }),
    log: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.log.maxRequests,
        RATE_LIMITS.log.windowUpstash
      ),
      analytics: true,
      prefix: "metadj:ratelimit:log",
    }),
    api: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.api.maxRequests,
        RATE_LIMITS.api.windowUpstash
      ),
      analytics: true,
      prefix: "metadj:ratelimit:api",
    }),
  }
  : null;

// 2. In-Memory Fallback (BoundedMap from shared module)
// Used when Redis is not configured
// BoundedMap prevents memory exhaustion attacks by limiting entries
// @see lib/rate-limiting/bounded-map.ts
const localRateLimitMap = new BoundedMap<string, RateLimitRecord>(10000);

function checkLocalRateLimit(
  identifier: string,
  limit: { maxRequests: number; windowMs: number }
): boolean {
  const now = Date.now();
  const record = localRateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    localRateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + limit.windowMs,
    });
    return true;
  }

  if (record.count >= limit.maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Singleton cleanup for local map
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
function startCleanupInterval() {
  if (cleanupIntervalId !== null) return;
  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of localRateLimitMap.entries()) {
      if (now > record.resetAt) {
        localRateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (typeof cleanupIntervalId === "object" && "unref" in cleanupIntervalId) {
    cleanupIntervalId.unref();
  }
}
// Always start cleanup just in case fallback is used
startCleanupInterval();

// ============================================================================
// Helpers
// ============================================================================

function getPlausibleOrigin(): string | null {
  const plausibleHost =
    process.env.NEXT_PUBLIC_PLAUSIBLE_API_HOST || "https://plausible.io";
  try {
    return new URL(plausibleHost).origin;
  } catch {
    return null;
  }
}

async function hashSha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function buildHeaderFingerprint(request: NextRequest): Promise<string> {
  const ua = request.headers.get("user-agent") || "unknown";
  const lang = request.headers.get("accept-language") || "unknown";
  const encoding = request.headers.get("accept-encoding") || "unknown";
  const hash = await hashSha256Hex(`${ua}|${lang}|${encoding}`);
  return `anon-${hash.slice(0, 16)}`;
}

function stripIpPort(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    const closing = trimmed.indexOf("]");
    if (closing > -1) {
      return trimmed.slice(1, closing);
    }
  }

  const colonCount = (trimmed.match(/:/g) || []).length;
  if (colonCount === 1 && trimmed.includes(".")) {
    return trimmed.split(":")[0];
  }

  return trimmed;
}

function normalizeIpCandidate(value: string): string {
  const withoutZone = value.includes("%") ? value.split("%")[0] : value;
  return stripIpPort(withoutZone).replace(/^"+|"+$/g, "");
}

function isValidIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

function isValidIpv6(value: string): boolean {
  if (!value.includes(":")) return false;
  return /^[0-9a-fA-F:]+$/.test(value);
}

function isValidIp(value: string): boolean {
  return isValidIpv4(value) || isValidIpv6(value);
}

function parseForwardedHeader(value: string): string | null {
  const match = value.match(/for=(?:"?)([^;,"]+)/i);
  if (!match) return null;
  const candidate = normalizeIpCandidate(match[1]);
  return isValidIp(candidate) ? candidate : null;
}

function extractIpFromHeader(header: string, value: string | null): string | null {
  if (!value) return null;
  const headerName = header.toLowerCase();

  if (headerName === "forwarded") {
    return parseForwardedHeader(value);
  }

  const candidate = headerName === "x-forwarded-for"
    ? value.split(",")[0]?.trim()
    : value.trim();

  if (!candidate) return null;
  const normalized = normalizeIpCandidate(candidate);
  return isValidIp(normalized) ? normalized : null;
}

function getTrustedClientIp(request: NextRequest): string | null {
  for (const header of TRUSTED_IP_HEADERS) {
    const value = request.headers.get(header);
    const parsed = extractIpFromHeader(header, value);
    if (parsed) return parsed;
  }
  return null;
}

// ============================================================================
// Middleware Handler
// ============================================================================

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // CORS origin check (used for /api/* routes)
  const requestOrigin = request.headers.get("origin");
  const allowedOrigin = path.startsWith("/api/")
    ? isAllowedOrigin(requestOrigin)
    : null;

  // 1. API Handling & Security
  if (path.startsWith("/api/")) {
    // A. CORS — Preflight
    if (request.method === "OPTIONS") {
      // Preflight: respond immediately; no further processing needed
      return new NextResponse(null, {
        status: 204,
        headers: allowedOrigin
          ? buildCorsHeaders(allowedOrigin)
          : { Vary: "Origin" },
      });
    }

    // B. Request Size Limiting (body-carrying methods only)
    if (
      request.method === "POST" ||
      request.method === "PUT" ||
      request.method === "PATCH"
    ) {
      const contentLength = request.headers.get("content-length");
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        const maxSize = getMaxRequestSize(path);

        if (size > maxSize) {
          logger.warn("[Request Size] Rejected oversized payload", {
            path,
            size,
            maxSize,
          });
          return buildPayloadTooLargeResponse(maxSize);
        }
      }
      // If content-length is missing, per-route handlers enforce streamed size limits.
    }

    // C. Rate Limiting
    const trustedIp = getTrustedClientIp(request);
    const ip = trustedIp ?? (await buildHeaderFingerprint(request));

    let limitKey: keyof typeof RATE_LIMITS = "api";
    if (path.startsWith("/api/audio") || path.startsWith("/api/video")) {
      limitKey = "media";
    } else if (path.startsWith("/api/log")) {
      limitKey = "log";
    }

    let allowed = true;
    let limitHeaders: Record<string, string> = {};

    if (upstashLimiters) {
      // Use Redis
      try {
        const { success, limit, remaining, reset } = await upstashLimiters[limitKey].limit(
          `${limitKey}:${ip}`
        );
        allowed = success;
        limitHeaders = {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        };
      } catch (err) {
        // Fallback to local on redis error
        logger.error("Redis rate limit error, falling back to local", {
          error: err instanceof Error ? err.message : String(err),
        });
        allowed = checkLocalRateLimit(`${limitKey}:${ip}`, RATE_LIMITS[limitKey]);
      }
    } else {
      // Use Local Fallback
      allowed = checkLocalRateLimit(`${limitKey}:${ip}`, RATE_LIMITS[limitKey]);
    }

    if (!allowed) {
      logger.warn("Rate limit blocked request", { ip, path, limitKey });
      return new NextResponse(
        JSON.stringify({
          error: "Too Many Requests",
          message: "Please try again in a minute",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
            ...limitHeaders,
            ...(allowedOrigin ? buildCorsHeaders(allowedOrigin) : { Vary: "Origin" }),
          },
        }
      );
    }
  }

  // 2. Global Security Headers (CSP, HSTS, etc.)
  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), browsing-topics=()"
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");

  if (
    path.startsWith("/api/") &&
    !NO_STORE_API_EXCLUDE_PREFIXES.some((prefix) => path.startsWith(prefix))
  ) {
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  const plausibleOrigin = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
    ? getPlausibleOrigin()
    : null;
  const isDev = process.env.NODE_ENV === "development";

  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
  }
  if (plausibleOrigin) {
    scriptSrc.push(plausibleOrigin);
  }

  const connectSrc = [
    "'self'",
    "https://api.openai.com",
    "https://api.anthropic.com",
    "https://generativelanguage.googleapis.com",
    "https://api.x.ai",
    "https://api.daydream.live",
    "https://*.daydream.live",
    "wss://*.daydream.live",
    "https://*.livepeer.com",
    "https://*.livepeer.studio",
  ];
  if (plausibleOrigin) {
    connectSrc.push(plausibleOrigin);
  }
  if (isDev) {
    connectSrc.push(
      "ws://localhost:*",
      "wss://localhost:*",
      "ws://127.0.0.1:*",
      "wss://127.0.0.1:*",
      "ws://0.0.0.0:*",
      "wss://0.0.0.0:*"
    );
  }

  const cspDirectives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    `style-src-elem 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-src 'self' https://lvpr.tv",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) {
    cspDirectives.push("upgrade-insecure-requests");
  }

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // 3. CORS Headers for API Responses
  if (allowedOrigin) {
    const corsHeaders = buildCorsHeaders(allowedOrigin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  } else if (path.startsWith("/api/")) {
    // Always include Vary: Origin on API routes so caches key on origin
    response.headers.set("Vary", "Origin");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
