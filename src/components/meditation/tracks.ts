export interface Track {
  name: string;
  file: string;
  path?: string;
  isCustom: boolean;
}

// Built-in tracks removed - now using radio streams by default
// This empty array is kept for backwards compatibility with custom folder loading
export const BUILT_IN_TRACKS: Track[] = [];

/**
 * Get a random track index, optionally excluding current track
 */
export function getRandomTrackIndex(
  trackCount: number,
  excludeIndex?: number
): number {
  if (trackCount <= 0) return 0;
  if (trackCount === 1) return 0;

  let next: number;
  do {
    next = Math.floor(Math.random() * trackCount);
  } while (next === excludeIndex);
  return next;
}
