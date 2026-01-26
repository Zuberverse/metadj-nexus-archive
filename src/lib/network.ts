/**
 * Network Utilities
 *
 * Client identification helpers for rate limiting, logging, and analytics.
 * Designed for Next.js API routes and middleware.
 */

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

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

export function getTrustedClientIp(request: NextRequest): string | null {
  for (const header of TRUSTED_IP_HEADERS) {
    const value = request.headers.get(header);
    const parsed = extractIpFromHeader(header, value);
    if (parsed) return parsed;
  }
  return null;
}

function buildFingerprint(request: NextRequest, ip: string): string {
  const ua = request.headers.get("user-agent") || "unknown";
  const lang = request.headers.get("accept-language") || "unknown";
  const encoding = request.headers.get("accept-encoding") || "unknown";
  return createHash("sha256")
    .update(`${ip}|${ua}|${lang}|${encoding}`)
    .digest("hex");
}

/**
 * Resolve client IP address and fingerprint for rate limiting
 *
 * Extracts client IP from a trusted header allowlist (configurable via
 * TRUSTED_IP_HEADERS) since Next.js 15+ removed the legacy request.ip property.
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
  const trustedIp = getTrustedClientIp(request);
  const resolved = trustedIp ?? "unknown";
  const fingerprint = buildFingerprint(request, resolved);

  return {
    ip: resolved,
    fingerprint,
  };
}
