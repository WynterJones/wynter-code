/**
 * AdventurerCompanion
 *
 * Renders inside the always-on-top floating webview (`/adventurer-companion`).
 * Plays the pinned adventurer's animation based on live "mood", which the main
 * window broadcasts via the Tauri `adventurer-mood` event. When idle, it plays
 * a random emote every so often so the companion feels alive. Draggable, with a
 * small close affordance that appears on hover.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { X } from "lucide-react";
import {
  useAdventurerStore,
  getPinnedAdventurer,
  MOOD_TO_CLIP,
  type AdventurerMood,
} from "@/stores/adventurerStore";
import { SpriteAnimation } from "./SpriteAnimation";
import { clipSrcs, baseSpriteSrc } from "@/services/adventurerAssets";

const IDLE_EMOTE_MIN_MS = 8000;
const IDLE_EMOTE_MAX_MS = 18000;
const IDLE_EMOTE_DURATION_MS = 2500;

export function AdventurerCompanion() {
  const adventurers = useAdventurerStore((s) => s.adventurers);
  const pinnedId = useAdventurerStore((s) => s.pinnedId);
  const adventurer = useMemo(
    () => getPinnedAdventurer({ adventurers, pinnedId }),
    [adventurers, pinnedId]
  );

  const [mood, setMood] = useState<AdventurerMood>("idle");
  const [randomClip, setRandomClip] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const randomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Make the window chrome see-through (body defaults to an opaque bg).
  useEffect(() => {
    const root = document.documentElement;
    const { body } = document;
    const appRoot = document.getElementById("root");
    const prev = {
      html: root.style.background,
      body: body.style.background,
      app: appRoot?.style.background ?? "",
    };
    root.style.background = "transparent";
    body.style.background = "transparent";
    if (appRoot) appRoot.style.background = "transparent";
    return () => {
      root.style.background = prev.html;
      body.style.background = prev.body;
      if (appRoot) appRoot.style.background = prev.app;
    };
  }, []);

  // Listen for mood broadcasts from the main window.
  useEffect(() => {
    const unlistenP = listen<AdventurerMood>("adventurer-mood", (e) => {
      setMood(e.payload ?? "idle");
    });
    return () => {
      unlistenP.then((un) => un()).catch(() => {});
    };
  }, []);

  // While idle, occasionally trigger a random emote so the companion feels alive.
  useEffect(() => {
    if (!adventurer) return;
    if (mood !== "idle") {
      setRandomClip(null);
      return;
    }

    let cancelled = false;
    const schedule = () => {
      const wait =
        IDLE_EMOTE_MIN_MS + Math.random() * (IDLE_EMOTE_MAX_MS - IDLE_EMOTE_MIN_MS);
      randomTimerRef.current = setTimeout(() => {
        if (cancelled) return;
        const pool = adventurer.animations.filter((c) => c.name !== "idle");
        if (pool.length > 0) {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          setRandomClip(pick.name);
          setTimeout(() => {
            if (!cancelled) setRandomClip(null);
          }, IDLE_EMOTE_DURATION_MS);
        }
        schedule();
      }, wait);
    };
    schedule();

    return () => {
      cancelled = true;
      if (randomTimerRef.current) clearTimeout(randomTimerRef.current);
    };
  }, [adventurer, mood]);

  const activeClip = useMemo(() => {
    if (!adventurer) return null;
    const wanted = randomClip ?? MOOD_TO_CLIP[mood] ?? "idle";
    return (
      adventurer.animations.find((c) => c.name === wanted) ??
      adventurer.animations.find((c) => c.name === "idle") ??
      adventurer.animations[0] ??
      null
    );
  }, [adventurer, mood, randomClip]);

  const handleClose = () => {
    invoke("close_adventurer_window").catch(() => {});
  };

  if (!adventurer) {
    return (
      <div
        data-tauri-drag-region
        className="w-full h-full flex items-center justify-center bg-transparent text-text-secondary text-xs select-none"
      >
        No adventurer pinned
      </div>
    );
  }

  return (
    <div
      data-tauri-drag-region
      className="relative w-full h-full flex items-center justify-center bg-transparent cursor-grab active:cursor-grabbing select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {activeClip ? (
        <SpriteAnimation frames={clipSrcs(activeClip)} fps={activeClip.fps} size={128} />
      ) : (
        <SpriteAnimation frames={[baseSpriteSrc(adventurer) ?? ""].filter(Boolean)} size={128} />
      )}

      {hovered && (
        <button
          onClick={handleClose}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"
          aria-label="Close companion"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
