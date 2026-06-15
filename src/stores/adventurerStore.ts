/**
 * adventurerStore
 *
 * Persisted state for the PixelLab Adventurer feature: the API key, created
 * characters (with their animation clips as base64 frames), and which character
 * is currently pinned as the floating desktop companion.
 *
 * `mood` is live runtime state driven by wynter-code activity and is excluded
 * from persistence (see `partialize`).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deleteAdventurerAssets } from "@/services/adventurerAssets";

/**
 * A named, looping animation. Frames are stored on disk (`framePaths`) and
 * rendered via the asset protocol; `frames` (base64) is a legacy fallback for
 * characters created before disk storage. Use the `adventurerAssets` helpers to
 * resolve renderable srcs.
 */
export interface AnimationClip {
  id: string;
  name: string;
  /** Absolute on-disk PNG paths (preferred). */
  framePaths?: string[];
  /** Legacy base64 data URIs (back-compat). */
  frames?: string[];
  fps: number;
}

export interface Adventurer {
  id: string;
  name: string;
  /** Reusable PixelLab character id, used to generate further animations. */
  pixellabCharacterId: string;
  /** The chosen sprite, on disk (preferred). */
  baseSpritePath?: string;
  /** Legacy base64 base sprite (back-compat / fallback). */
  baseSprite?: string;
  animations: AnimationClip[];
  createdAt: number;
}

/** Live companion mood, reflecting current wynter-code activity. */
export type AdventurerMood = "idle" | "active" | "thinking" | "celebrate";

/** The four default emotes generated when a character is created. */
export const DEFAULT_EMOTES = ["idle", "walk", "wave", "cheer"] as const;

/** Map a mood to the animation clip name it should play. */
export const MOOD_TO_CLIP: Record<AdventurerMood, string> = {
  idle: "idle",
  active: "walk",
  thinking: "wave",
  celebrate: "cheer",
};

interface AdventurerState {
  apiKey: string;
  adventurers: Adventurer[];
  pinnedId: string | null;
  mood: AdventurerMood;

  setApiKey: (key: string) => void;
  addAdventurer: (adventurer: Adventurer) => void;
  addAnimation: (adventurerId: string, clip: AnimationClip) => void;
  removeAdventurer: (adventurerId: string) => void;
  setPinned: (id: string | null) => void;
  setMood: (mood: AdventurerMood) => void;
}

export const useAdventurerStore = create<AdventurerState>()(
  persist(
    (set) => ({
      apiKey: "",
      adventurers: [],
      pinnedId: null,
      mood: "idle",

      setApiKey: (apiKey) => set({ apiKey }),

      addAdventurer: (adventurer) =>
        set((state) => ({ adventurers: [...state.adventurers, adventurer] })),

      addAnimation: (adventurerId, clip) =>
        set((state) => ({
          adventurers: state.adventurers.map((a) =>
            a.id === adventurerId
              ? {
                  ...a,
                  animations: [
                    ...a.animations.filter((c) => c.name !== clip.name),
                    clip,
                  ],
                }
              : a
          ),
        })),

      removeAdventurer: (adventurerId) => {
        void deleteAdventurerAssets(adventurerId);
        set((state) => ({
          adventurers: state.adventurers.filter((a) => a.id !== adventurerId),
          pinnedId: state.pinnedId === adventurerId ? null : state.pinnedId,
        }));
      },

      setPinned: (pinnedId) => set({ pinnedId }),

      setMood: (mood) => set({ mood }),
    }),
    {
      name: "wynter-code-adventurer",
      version: 1,
      // `mood` is live-only; never persist it.
      partialize: (state) => ({
        apiKey: state.apiKey,
        adventurers: state.adventurers,
        pinnedId: state.pinnedId,
      }),
    }
  )
);

/** Resolve the pinned adventurer object (or null). */
export function getPinnedAdventurer(state: {
  adventurers: Adventurer[];
  pinnedId: string | null;
}): Adventurer | null {
  if (!state.pinnedId) return null;
  return state.adventurers.find((a) => a.id === state.pinnedId) ?? null;
}
