import type { Track } from "@/types";

export { normalizeCollectionSlug, toCollectionSlug } from "@/lib/collection-utils";

/** 
 * Shuffle tracks array with optional anchor track that should appear first
 */
export function shuffleTracks(tracksToShuffle: Track[], anchorId?: string | null): Track[] {
  if (tracksToShuffle.length <= 1) return [...tracksToShuffle];

  const shuffled = [...tracksToShuffle];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  if (!anchorId) return shuffled;

  const anchorPosition = shuffled.findIndex((track) => track.id === anchorId);
  if (anchorPosition > 0) {
    const [anchorTrack] = shuffled.splice(anchorPosition, 1);
    shuffled.unshift(anchorTrack);
  }

  return shuffled;
}

/**
 * Reorder tracks so anchor track is first, followed by remaining tracks in circular order
 * Example: [1,2,3,4,5] with anchor 3 becomes [3,4,5,1,2]
 */
export function reorderTracksFromAnchor(tracks: Track[], anchorId: string): Track[] {
  if (tracks.length <= 1) return [...tracks];

  const anchorIndex = tracks.findIndex((track) => track.id === anchorId);
  if (anchorIndex === -1) return [...tracks];

  // Split at anchor: take from anchor to end, then beginning to anchor
  const afterAnchor = tracks.slice(anchorIndex);
  const beforeAnchor = tracks.slice(0, anchorIndex);
  
  return [...afterAnchor, ...beforeAnchor];
}
