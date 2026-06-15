/**
 * adventurerStore
 *
 * Persisted state for the PixelLab Adventurer feature: the API key, created
 * characters (with their animation clips as base64 frames), and which characters
 * are currently pinned as floating desktop companions. Multiple characters can
 * be pinned at once; each keeps its own on-screen position, flip, and status
 * preferences in `companions`.
 *
 * `mood` and `emoteTargetId` are live runtime state driven by wynter-code
 * activity and are excluded from persistence (see `partialize`).
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

/** Per-companion overlay preferences, keyed by adventurer id. */
export interface CompanionPrefs {
  /** Last on-screen position of this companion's overlay (null = default). */
  pos?: { x: number; y: number } | null;
  flipped?: boolean;
  showStatus?: boolean;
}

interface AdventurerState {
  apiKey: string;
  adventurers: Adventurer[];
  /** Ids of every character currently pinned to the desktop. */
  pinnedIds: string[];
  /** Per-companion overlay preferences (position, flip, status badge). */
  companions: Record<string, CompanionPrefs>;
  mood: AdventurerMood;
  /**
   * Which pinned companion currently plays the active mood. When several
   * characters are pinned, one is chosen at random per "burst" so a single
   * companion emotes while the rest keep idling. `null` = everyone idles.
   */
  emoteTargetId: string | null;

  setApiKey: (key: string) => void;
  addAdventurer: (adventurer: Adventurer) => void;
  addAnimation: (adventurerId: string, clip: AnimationClip) => void;
  setAnimationTrigger: (
    adventurerId: string,
    clipId: string,
    trigger: AdventurerTrigger
  ) => void;
  removeAdventurer: (adventurerId: string) => void;
  /** Add or remove a character from the pinned set. */
  togglePin: (id: string) => void;
  /** Pin a single character, or unpin everything when passed null. */
  setPinned: (id: string | null) => void;
  setMood: (mood: AdventurerMood) => void;
  setEmoteTarget: (id: string | null) => void;
  setCompanionFlipped: (id: string, flipped: boolean) => void;
  setCompanionShowStatus: (id: string, show: boolean) => void;
  setCompanionPos: (id: string, pos: { x: number; y: number }) => void;
}

/** Merge a partial preference patch into a companion's prefs map. */
function patchCompanion(
  companions: Record<string, CompanionPrefs>,
  id: string,
  patch: CompanionPrefs
): Record<string, CompanionPrefs> {
  return { ...companions, [id]: { ...companions[id], ...patch } };
}

export const useAdventurerStore = create<AdventurerState>()(
  persist(
    (set) => ({
      apiKey: "",
      adventurers: [],
      pinnedIds: [],
      companions: {},
      mood: "idle",
      emoteTargetId: null,

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
        set((state) => {
          const companions = { ...state.companions };
          delete companions[adventurerId];
          return {
            adventurers: state.adventurers.filter((a) => a.id !== adventurerId),
            pinnedIds: state.pinnedIds.filter((id) => id !== adventurerId),
            companions,
            emoteTargetId:
              state.emoteTargetId === adventurerId ? null : state.emoteTargetId,
          };
        });
      },

      togglePin: (id) =>
        set((state) => {
          const pinned = state.pinnedIds.includes(id);
          return {
            pinnedIds: pinned
              ? state.pinnedIds.filter((p) => p !== id)
              : [...state.pinnedIds, id],
            companions: pinned
              ? state.companions
              : { ...state.companions, [id]: state.companions[id] ?? {} },
            emoteTargetId:
              pinned && state.emoteTargetId === id ? null : state.emoteTargetId,
          };
        }),

      setPinned: (id) =>
        set((state) => ({
          pinnedIds: id ? [id] : [],
          companions: id
            ? { ...state.companions, [id]: state.companions[id] ?? {} }
            : state.companions,
          emoteTargetId: id === state.emoteTargetId ? state.emoteTargetId : null,
        })),

      setMood: (mood) => set({ mood }),

      setEmoteTarget: (emoteTargetId) => set({ emoteTargetId }),

      setCompanionFlipped: (id, flipped) =>
        set((state) => ({
          companions: patchCompanion(state.companions, id, { flipped }),
        })),

      setCompanionShowStatus: (id, showStatus) =>
        set((state) => ({
          companions: patchCompanion(state.companions, id, { showStatus }),
        })),

      setCompanionPos: (id, pos) =>
        set((state) => ({
          companions: patchCompanion(state.companions, id, { pos }),
        })),
    }),
    {
      name: "wynter-code-adventurer",
      version: 2,
      // `mood` and `emoteTargetId` are live-only; never persist them.
      partialize: (state) => ({
        apiKey: state.apiKey,
        adventurers: state.adventurers,
        pinnedIds: state.pinnedIds,
        companions: state.companions,
      }),
      // v1 stored a single pinnedId + flat companion prefs. Fan them out into
      // the multi-companion shape.
      migrate: (persisted, version) => {
        type Persisted = Pick<
          AdventurerState,
          "apiKey" | "adventurers" | "pinnedIds" | "companions"
        >;
        if (version >= 2) return persisted as Persisted;
        const old = (persisted ?? {}) as {
          apiKey?: string;
          adventurers?: Adventurer[];
          pinnedId?: string | null;
          companionPos?: { x: number; y: number } | null;
          companionFlipped?: boolean;
          companionShowStatus?: boolean;
        };
        const pinnedIds = old.pinnedId ? [old.pinnedId] : [];
        const companions: Record<string, CompanionPrefs> = {};
        if (old.pinnedId) {
          companions[old.pinnedId] = {
            pos: old.companionPos ?? null,
            flipped: old.companionFlipped ?? false,
            showStatus: old.companionShowStatus ?? false,
          };
        }
        return {
          apiKey: old.apiKey ?? "",
          adventurers: old.adventurers ?? [],
          pinnedIds,
          companions,
        };
      },
    }
  )
);

/** Resolve a single adventurer object by id (or null). */
export function getAdventurerById(
  adventurers: Adventurer[],
  id: string | null
): Adventurer | null {
  if (!id) return null;
  return adventurers.find((a) => a.id === id) ?? null;
}
