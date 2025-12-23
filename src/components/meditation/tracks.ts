/**
 * Convert filename to Title Case display name
 * e.g., "zen-music.mp3" -> "Zen Music"
 * e.g., "my_song_name.mp3" -> "My Song Name"
 */
export function fileToDisplayName(filename: string): string {
  return filename
    .replace(/\.mp3$/i, "")
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

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
