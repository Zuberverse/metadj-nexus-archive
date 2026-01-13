/**
 * Music Deep Link Utilities
 *
 * Supports shareable paths like /track/{id}, /collection/{id}, /playlist/{id}.
 */

export type MusicDeepLinkKind = "track" | "collection" | "playlist"

export interface MusicDeepLink {
  kind: MusicDeepLinkKind
  id: string
}

export function isMusicDeepLinkKind(value: string): value is MusicDeepLinkKind {
  return value === "track" || value === "collection" || value === "playlist"
}

export function buildMusicDeepLinkPath(kind: MusicDeepLinkKind, id: string): string {
  return `/${kind}/${encodeURIComponent(id)}`
}

export function buildMusicDeepLinkUrl(kind: MusicDeepLinkKind, id: string, origin: string): string {
  return new URL(buildMusicDeepLinkPath(kind, id), origin).toString()
}

/**
 * Parse a URL path to extract music deep link information.
 *
 * @example
 * parseMusicDeepLinkPath("/track/metadj-001") // { kind: "track", id: "metadj-001" }
 * parseMusicDeepLinkPath("/collection/majestic-ascent") // { kind: "collection", id: "majestic-ascent" }
 */
export function parseMusicDeepLinkPath(pathname: string): MusicDeepLink | null {
  if (!pathname.startsWith("/")) return null

  const parts = pathname.slice(1).split("/").filter(Boolean)
  if (parts.length < 2) return null

  const [kind, ...idParts] = parts
  if (!isMusicDeepLinkKind(kind)) return null

  const id = decodeURIComponent(idParts.join("/"))
  if (!id) return null

  return { kind, id }
}
