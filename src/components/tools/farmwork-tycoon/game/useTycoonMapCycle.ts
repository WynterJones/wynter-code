import type { Sprite } from "pixi.js";
import { useFarmworkTycoonStore } from "@/stores/farmworkTycoonStore";

// Easing function for smooth transitions
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export function updateMapCycle(dt: number, mapSprites: Map<string, Sprite>) {
  if (mapSprites.size === 0) return;

  // Tick the map cycle in the store
  useFarmworkTycoonStore.getState().tickMapCycle(dt);

  // Get current cycle state from store
  const cycle = useFarmworkTycoonStore.getState().mapCycle;

  // Update map sprite alphas based on store state
  if (cycle.isTransitioning) {
    const progress = easeInOutCubic(cycle.transitionProgress);
    const fromSprite = mapSprites.get(cycle.transitionFrom);
    const toSprite = mapSprites.get(cycle.transitionTo);

    if (fromSprite) fromSprite.alpha = 1 - progress;
    if (toSprite) toSprite.alpha = progress;

    // Hide other sprites
    for (const [key, sprite] of mapSprites) {
      if (key !== cycle.transitionFrom && key !== cycle.transitionTo) {
        sprite.alpha = 0;
      }
    }
  } else {
    // Set final alpha values for current state
    const currentKey = `${cycle.timeOfDay}-${cycle.season}`;
    for (const [key, sprite] of mapSprites) {
      sprite.alpha = key === currentKey ? 1 : 0;
    }
  }
}
