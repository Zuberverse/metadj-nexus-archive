import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";
import { generateNonce } from "@/lib/nonce";
import { buildPayloadTooLargeResponse, getMaxRequestSize } from "@/lib/validation/request-size";

// ============================================================================
// Configuration & State
// ============================================================================

const RATE_LIMITS = {
  media: { maxRequests: 100, windowMs: 60_000, windowUpstash: "1 m" as const },
  log: { maxRequests: 10, windowMs: 60_000, windowUpstash: "1 m" as const },
  api: { maxRequests: 200, windowMs: 60_000, windowUpstash: "1 m" as const },
};

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

// 2. In-Memory Fallback (Map)
// Used when Redis is not configured
const localRateLimitMap = new Map<string, RateLimitRecord>();

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

// ============================================================================
// Middleware Handler
// ============================================================================

export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. API Handling & Security
  if (path.startsWith("/api/")) {
    // A. Request Size Limiting
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

    // B. Rate Limiting
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip =
      request.headers.get("x-vercel-ip") ||
      request.headers.get("cf-connecting-ip") ||
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      (await buildHeaderFingerprint(request));

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
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'none'",
    `style-src-elem 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' blob: https:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-src 'self' https://lvpr.tv",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
