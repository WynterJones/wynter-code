// All meditation track files (kebab-case)
const TRACK_FILES = [
  "bell-shadow.mp3",
  "bell-temple.mp3",
  "bell-tide.mp3",
  "bloom-bamboo.mp3",
  "bloom-koi.mp3",
  "blossom-bamboo.mp3",
  "blossom-breeze.mp3",
  "blossom-rain.mp3",
  "blossom-spirit.mp3",
  "blossom-wind.mp3",
  "bridge-dream.mp3",
  "calm-breeze.mp3",
  "calm-mist.mp3",
  "calm-wave.mp3",
  "cloud-shadow.mp3",
  "crane-lotus.mp3",
  "crane-moon.mp3",
  "dawn-river.mp3",
  "dawn-root.mp3",
  "dream-dawn.mp3",
  "dream-forest.mp3",
  "dream-petal.mp3",
  "dusk-river.mp3",
  "ember-pearl.mp3",
  "ember-spirit.mp3",
  "flame-bell.mp3",
  "flame-blossom.mp3",
  "flame-light.mp3",
  "flame-wind.mp3",
  "garden-bridge.mp3",
  "harmony-koi.mp3",
  "koi-bloom.mp3",
  "koi-tide.mp3",
  "leaf-bridge.mp3",
  "leaf-sage.mp3",
  "leaf-snow.mp3",
  "light-bamboo.mp3",
  "lotus-mountain.mp3",
  "mist-flame.mp3",
  "moon-blossom.mp3",
  "moon-ember.mp3",
  "moon-meadow.mp3",
  "moon-sage.mp3",
  "moon-valley.mp3",
  "mountain-lotus.mp3",
  "mountain-peace.mp3",
  "mountain-valley.mp3",
  "night.mp3",
  "ocean.mp3",
  "path-meadow.mp3",
  "path-wave.mp3",
  "peace-moon.mp3",
  "peace-mountain.mp3",
  "pearl-river.mp3",
  "pearl-spirit.mp3",
  "petal-forest.mp3",
  "petal-pine.mp3",
  "rain-moon.mp3",
  "rain-sage.mp3",
  "rain.mp3",
  "root-harmony.mp3",
  "root-tranquil.mp3",
  "sage-bell.mp3",
  "sage-bloom.mp3",
  "sage-peace.mp3",
  "seed-blossom.mp3",
  "seed-garden.mp3",
  "seed-meadow.mp3",
  "seed-shadow.mp3",
  "serene-bell.mp3",
  "spirit-bridge.mp3",
  "spirit-zen.mp3",
  "stone-dream.mp3",
  "stone-mist.mp3",
  "stone-river.mp3",
  "temple-light.mp3",
  "temple-petal.mp3",
  "temple-seed.mp3",
  "temple-silk.mp3",
  "tranquil-bamboo.mp3",
  "tranquil-path.mp3",
  "wave-silk.mp3",
  "willow-temple.mp3",
  "wind.mp3",
  "zen-shadow.mp3",
  "zen-snow.mp3",
  "zen-wave.mp3",
];

/**
 * Convert kebab-case filename to Title Case display name
 * e.g., "zen-music.mp3" -> "Zen Music"
 */
function fileToDisplayName(filename: string): string {
  return filename
    .replace(".mp3", "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface Track {
  name: string;
  file: string;
}

export const TRACKS: Track[] = TRACK_FILES.map((file) => ({
  name: fileToDisplayName(file),
  file,
}));

export const TRACK_COUNT = TRACKS.length;

/**
 * Get a random track index, optionally excluding current track
 */
export function getRandomTrackIndex(excludeIndex?: number): number {
  let next: number;
  do {
    next = Math.floor(Math.random() * TRACK_COUNT);
  } while (next === excludeIndex && TRACK_COUNT > 1);
  return next;
}
