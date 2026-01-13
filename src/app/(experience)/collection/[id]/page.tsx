import { getAppBaseUrl } from "@/lib/app-url"
import { buildMusicDeepLinkPath, getCollectionById } from "@/lib/music"
import type { Metadata } from "next"

const musicRobots = {
  index: false,
  follow: true,
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
  const url = `${baseUrl}${buildMusicDeepLinkPath("collection", id)}`

  const collection = getCollectionById(id)
  if (!collection) {
    return {
      title: "Collections — MetaDJ Nexus",
      description: "Original collections by MetaDJ.",
      robots: musicRobots,
    }
  }

  const title = `${collection.title} — MetaDJ Collection`
  const description = collection.description || `MetaDJ original collection: ${collection.title}.`
  const image = resolveImageUrl(baseUrl, collection.artworkUrl)

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: musicRobots,
    openGraph: {
      title,
      description,
      url,
      type: "music.album",
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

export default function CollectionDeepLinkPage() {
  return null
}
