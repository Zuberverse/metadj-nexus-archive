import tracks from "@/data/music.json"
import { getAppBaseUrl } from "@/lib/app-url"
import { buildMusicDeepLinkPath } from "@/lib/music"
import type { Metadata } from "next"

const musicRobots = {
  index: false,
  follow: true,
}

function getTrack(id: string) {
  return tracks.find((track) => track.id === id)
}

function resolveImageUrl(baseUrl: string, imageUrl?: string) {
  if (!imageUrl) {
    return `${baseUrl}/images/og-image.png`
  }
  return new URL(imageUrl, baseUrl).toString()
}

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const { id } = params
  const baseUrl = getAppBaseUrl()
  const url = `${baseUrl}${buildMusicDeepLinkPath("track", id)}`

  const track = getTrack(id)
  if (!track) {
    return {
      title: "Music — MetaDJ Nexus",
      description: "AI-driven originals and collections by MetaDJ.",
      robots: musicRobots,
    }
  }

  const title = `${track.title} — MetaDJ Original`
  const description = track.description || `MetaDJ original from the ${track.collection} collection.`
  const image = resolveImageUrl(baseUrl, track.artworkUrl)

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: musicRobots,
    openGraph: {
      title,
      description,
      url,
      type: "music.song",
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

export default function TrackDeepLinkPage() {
  return null
}
