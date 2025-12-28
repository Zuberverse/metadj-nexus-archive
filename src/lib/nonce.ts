/**
 * CSP Nonce Utilities
 *
 * Generates cryptographically secure nonces for Content Security Policy.
 * Compatible with Edge runtime (no Node-only APIs).
 */

/**
 * Generate a cryptographically secure nonce for CSP headers
 *
 * Uses crypto.getRandomValues for randomness, with multiple encoding
 * strategies for runtime support (Buffer, btoa, hex fallback).
 *
 * @returns Base64-encoded nonce string (or hex if no encoder available)
 * @example
 * const nonce = generateNonce()
 * // Returns e.g., "a1b2c3d4e5f6g7h8i9j0..."
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64")
  }

  if (typeof btoa === "function") {
    let binary = ""
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    return btoa(binary)
  }

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
