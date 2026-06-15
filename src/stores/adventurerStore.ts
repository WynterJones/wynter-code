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
  /** App state that auto-plays this clip on the companion ("none" = manual). */
  trigger?: AdventurerTrigger;
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

/** Human-readable label for a mood, shown in the status badge. */
export const MOOD_LABELS: Record<AdventurerMood, string> = {
  idle: "Idle",
  active: "Working",
  thinking: "Thinking",
  celebrate: "Celebrating",
};

/** An app state an emote can be tied to ("none" = play manually only). */
export type AdventurerTrigger = "none" | AdventurerMood;

/** Selectable triggers for tying an emote to an app/hook state. */
export const TRIGGER_OPTIONS: { value: AdventurerTrigger; label: string }[] = [
  { value: "none", label: "Manual only" },
  { value: "idle", label: "When idle" },
  { value: "active", label: "When working" },
  { value: "thinking", label: "When thinking" },
  { value: "celebrate", label: "On success" },
];

/** The four default emotes generated when a character is created. */
export const DEFAULT_EMOTES = ["idle", "walk", "wave", "cheer"] as const;

/** Map a mood to the animation clip name it should play (name-based fallback). */
export const MOOD_TO_CLIP: Record<AdventurerMood, string> = {
  idle: "idle",
  active: "wave",
  thinking: "walk",
  celebrate: "cheer",
};

/** Default trigger for a clip given its name (keeps default emotes wired up). */
export function triggerForClipName(name: string): AdventurerTrigger {
  const mood = (Object.keys(MOOD_TO_CLIP) as AdventurerMood[]).find(
    (m) => MOOD_TO_CLIP[m] === name
  );
  return mood ?? "none";
}

/**
 * Resolve which clip the companion should play for a mood. Prefers a clip
 * explicitly tied to the mood via its `trigger`, then falls back to the
 * name-based MOOD_TO_CLIP map, then idle, then the first available clip.
 */
export function getClipForMood(
  adventurer: Adventurer,
  mood: AdventurerMood
): AnimationClip | null {
  const byTrigger = adventurer.animations.find((c) => c.trigger === mood);
  if (byTrigger) return byTrigger;
  const wanted = MOOD_TO_CLIP[mood] ?? "idle";
  return (
    adventurer.animations.find((c) => c.name === wanted) ??
    adventurer.animations.find((c) => c.name === "idle") ??
    adventurer.animations[0] ??
    null
  );
}

interface AdventurerState {
  apiKey: string;
  adventurers: Adventurer[];
  pinnedId: string | null;
  mood: AdventurerMood;
  /** Companion preferences (persisted). */
  companionFlipped: boolean;
  companionShowStatus: boolean;
  /** Last on-screen position of the in-app companion overlay (null = default). */
  companionPos: { x: number; y: number } | null;

  setApiKey: (key: string) => void;
  addAdventurer: (adventurer: Adventurer) => void;
  addAnimation: (adventurerId: string, clip: AnimationClip) => void;
  setAnimationTrigger: (
    adventurerId: string,
    clipId: string,
    trigger: AdventurerTrigger
  ) => void;
  removeAdventurer: (adventurerId: string) => void;
  setPinned: (id: string | null) => void;
  setMood: (mood: AdventurerMood) => void;
  setCompanionFlipped: (flipped: boolean) => void;
  setCompanionShowStatus: (show: boolean) => void;
  setCompanionPos: (pos: { x: number; y: number }) => void;
}

export const useAdventurerStore = create<AdventurerState>()(
  persist(
    (set) => ({
      apiKey: "",
      adventurers: [],
      pinnedId: null,
      mood: "idle",
      companionFlipped: false,
      companionShowStatus: false,
      companionPos: null,

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

      setAnimationTrigger: (adventurerId, clipId, trigger) =>
        set((state) => ({
          adventurers: state.adventurers.map((a) =>
            a.id === adventurerId
              ? {
                  ...a,
                  animations: a.animations.map((c) =>
                    c.id === clipId ? { ...c, trigger } : c
                  ),
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

      setCompanionFlipped: (companionFlipped) => set({ companionFlipped }),

      setCompanionShowStatus: (companionShowStatus) => set({ companionShowStatus }),

      setCompanionPos: (companionPos) => set({ companionPos }),
    }),
    {
      name: "wynter-code-adventurer",
      version: 1,
      // `mood` is live-only; never persist it.
      partialize: (state) => ({
        apiKey: state.apiKey,
        adventurers: state.adventurers,
        pinnedId: state.pinnedId,
        companionFlipped: state.companionFlipped,
        companionShowStatus: state.companionShowStatus,
        companionPos: state.companionPos,
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
