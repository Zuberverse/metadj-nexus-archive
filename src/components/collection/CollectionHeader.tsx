'use client'

import { useMemo } from "react"
import { COLLECTION_NARRATIVES } from "@/data/collection-narratives"
import { getCollectionGradient } from "@/lib/collection-theme"

interface CollectionHeaderProps {
  selectedCollection: string
  onCollectionChange: (collectionId: string) => void
  collections: Array<{ id: string; title: string }>
}

export function CollectionHeader({
  selectedCollection,
  onCollectionChange,
  collections,
}: CollectionHeaderProps) {
  const collectionsWithSubtitles = useMemo(() => {
    return collections.map((collection) => ({
      id: collection.id,
      title: collection.title,
      subtitle: undefined,
    }))
  }, [collections])

  const gridClasses =
    collectionsWithSubtitles.length <= 3
      ? "grid gap-2 sm:grid-cols-1 md:grid-cols-3"
      : "grid gap-2 sm:grid-cols-2 md:grid-cols-3"

  return (
    <div className="mt-3 space-y-4">
      <div className={gridClasses}>
        {collectionsWithSubtitles.map((collection) => {
          const isActive = collection.id === selectedCollection

          const activeClasses = `border-white/30 shadow-[0_0_25px_rgba(124,58,237,0.25)] bg-white/10 ${getCollectionGradient(
            collection.id,
          )} ring-1 ring-white/20`
          const inactiveClasses = "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-md"

          return (
            <button
              key={collection.id}
              type="button"
              onClick={() => onCollectionChange(collection.id)}
              className={`group relative flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-300 focus-ring ${isActive ? activeClasses : inactiveClasses
                }`}
            >
              <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl">
                {!isActive && (
                  <div
                    aria-hidden
                    className={`absolute inset-0 pointer-events-none ${getCollectionGradient(
                      collection.id,
                    )} opacity-20 group-hover:opacity-30 transition-opacity duration-500`}
                  />
                )}
                <div className="relative z-10 px-3 py-2">
                  <p className={`font-heading text-base font-bold truncate transition-colors ${isActive ? "text-white tracking-wide" : "text-white/80 group-hover:text-white"}`}>
                    {collection.title}
                  </p>
                </div>
              </div>
              {isActive && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)] animate-pulse" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
