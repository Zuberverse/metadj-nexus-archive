import { getAppBaseUrl } from "@/lib/app-url"
import { buildMusicDeepLinkPath } from "@/lib/music"
import type { Metadata } from "next"

const musicRobots = {
  index: false,
  follow: true,
}

type SearchParam = string | string[] | undefined

function resolveImageUrl(baseUrl: string, imageUrl?: string) {
  if (!imageUrl) {
    return `${baseUrl}/images/og-image.png`
  }
  return new URL(imageUrl, baseUrl).toString()
}

function getSearchParam(params: Record<string, SearchParam>, key: string): string | undefined {
  const value = params[key]
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

function parsePlaylistName(value?: string) {
  if (!value) return ""
  try {
    return decodeURIComponent(value).trim()
  } catch {
    return value.trim()
  }
}

function parsePlaylistCount(value?: string) {
  if (!value) return null
  const count = Number.parseInt(value, 10)
  return Number.isFinite(count) && count >= 0 ? count : null
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: Record<string, SearchParam>
}): Promise<Metadata> {
  const { id } = params
  const baseUrl = getAppBaseUrl()
  const url = `${baseUrl}${buildMusicDeepLinkPath("playlist", id)}`

  const playlistName = parsePlaylistName(getSearchParam(searchParams, "name"))
  const playlistCount = parsePlaylistCount(getSearchParam(searchParams, "count"))

  const title = playlistName ? `${playlistName} — MetaDJ Playlist` : "MetaDJ Playlist"
  const countLabel = playlistCount !== null ? ` · ${playlistCount} tracks` : ""
  const description = playlistName
    ? `Playlist "${playlistName}" on MetaDJ Nexus${countLabel}.`
    : "Curated playlist on MetaDJ Nexus."

  const image = resolveImageUrl(baseUrl)

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: musicRobots,
    openGraph: {
      title,
      description,
      url,
      type: "music.playlist",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}

export default function PlaylistDeepLinkPage() {
  return null
}
