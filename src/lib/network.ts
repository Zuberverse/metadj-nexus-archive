/**
 * Network Utilities
 *
 * Client identification helpers for rate limiting, logging, and analytics.
 * Designed for Next.js API routes and middleware.
 */

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Resolve client IP address and fingerprint for rate limiting
 *
 * Extracts client IP from proxy headers (x-real-ip, x-forwarded-for)
 * since Next.js 15+ removed the legacy request.ip property.
 * Creates a SHA-256 fingerprint for privacy-preserving rate limiting.
 *
 * @param request - Next.js request object
 * @returns Object with ip (raw address or "unknown") and fingerprint (SHA-256 hash)
 * @example
 * const { ip, fingerprint } = resolveClientAddress(request)
 * // ip: "192.168.1.1" or "unknown"
 * // fingerprint: "a1b2c3..." (SHA-256 hash)
 */
export function resolveClientAddress(request: NextRequest): {
  ip: string;
  fingerprint: string;
} {
  // Next.js 15+ removed request.ip, use headers instead
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  const forwardedIp = forwarded ? forwarded.split(",")[0]?.trim() : undefined;

  const resolved =
    realIp && realIp !== ""
      ? realIp
      : forwardedIp && forwardedIp !== ""
      ? forwardedIp
      : "unknown";

  const fingerprint = createHash("sha256").update(resolved).digest("hex");

  return {
    ip: resolved,
    fingerprint,
  };
}
