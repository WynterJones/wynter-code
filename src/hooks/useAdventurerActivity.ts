/**
 * useAdventurerActivity
 *
 * Drives the pinned adventurer companions' "mood" from live wynter-code
 * activity. Only runs while at least one companion is pinned. It:
 *   - polls the hook event stream (`.farmwork/events.jsonl`, the same source as
 *     useFarmworkHookEvents) and flips to "active" briefly on each tool event,
 *   - reads the active session's streaming state and shows "thinking" while a
 *     response is generating,
 *   - reacts to UI navigation (switching projects, switching/opening tabs) with
 *     a brief "celebrate",
 *   - otherwise settles to "idle".
 *
 * Each mood change is written to the store; the in-app companion overlay reads
 * it directly from there. When several companions are pinned, each fresh
 * non-idle "burst" picks one pinned character at random as the emote target so
 * a single companion reacts while the rest keep idling.
 */

import { useEffect, useRef } from "react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useAdventurerStore, type AdventurerMood } from "@/stores/adventurerStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";

const POLL_INTERVAL_MS = 400;
const ACTIVE_DECAY_MS = 1500;
const UI_EVENT_DECAY_MS = 2500;

export function useAdventurerActivity(): void {
  // Re-run the effect whenever the set of pinned characters changes.
  const pinnedKey = useAdventurerStore((s) => s.pinnedIds.join(","));
  const hasPinned = pinnedKey.length > 0;
  const lastToolAtRef = useRef(0);
  const lastUiAtRef = useRef(0);
  const consumedRef = useRef(0);
  const seekedRef = useRef(false);
  const lastMoodRef = useRef<AdventurerMood>("idle");
  const prevProjectRef = useRef<string | null | undefined>(undefined);
  const prevSessionRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!hasPinned) return;

    consumedRef.current = 0;
    seekedRef.current = false;
    prevProjectRef.current = undefined;
    prevSessionRef.current = undefined;
    let cancelled = false;

    const isSessionBusy = (): boolean => {
      const projectId = useProjectStore.getState().activeProjectId;
      if (!projectId) return false;
      const sessionId = useSessionStore.getState().activeSessionId.get(projectId);
      if (!sessionId) return false;
      const state = useSessionStore.getState().getStreamingState(sessionId);
      return !!(state?.isStreaming || (state?.thinkingText && state.thinkingText.length > 0));
    };

    const readToolEvents = async () => {
      const projectId = useProjectStore.getState().activeProjectId;
      const path = projectId
        ? useProjectStore.getState().getProject(projectId)?.path
        : undefined;
      if (!path) return;

      let text: string;
      try {
        text = await readTextFile(`${path}/.farmwork/events.jsonl`);
      } catch {
        return; // stream not created yet
      }
      const lines = text.split("\n").filter((l) => l.trim().length > 0);

      // Truncated/rotated (SessionStart) — restart.
      if (lines.length < consumedRef.current) {
        consumedRef.current = 0;
        seekedRef.current = false;
      }
      // Skip pre-existing history on first read.
      if (!seekedRef.current) {
        consumedRef.current = lines.length;
        seekedRef.current = true;
        return;
      }
      if (lines.length === consumedRef.current) return;

      consumedRef.current = lines.length;
      lastToolAtRef.current = Date.now();
    };

    // Detect UI navigation (project switch, tab switch/open) between ticks.
    const detectNavigation = () => {
      const projectId = useProjectStore.getState().activeProjectId;
      const sessionId = projectId
        ? useSessionStore.getState().activeSessionId.get(projectId) ?? null
        : null;

      const firstSeen =
        prevProjectRef.current === undefined && prevSessionRef.current === undefined;
      const changed =
        !firstSeen &&
        (projectId !== prevProjectRef.current || sessionId !== prevSessionRef.current);

      prevProjectRef.current = projectId;
      prevSessionRef.current = sessionId;
      if (changed) lastUiAtRef.current = Date.now();
    };

    const computeMood = (): AdventurerMood => {
      if (isSessionBusy()) return "thinking";
      if (Date.now() - lastUiAtRef.current < UI_EVENT_DECAY_MS) return "celebrate";
      if (Date.now() - lastToolAtRef.current < ACTIVE_DECAY_MS) return "active";
      return "idle";
    };

    const tick = async () => {
      await readToolEvents();
      if (cancelled) return;
      detectNavigation();
      const mood = computeMood();
      if (mood !== lastMoodRef.current) {
        const store = useAdventurerStore.getState();
        // A fresh non-idle burst: pick a random pinned character to react. Keep
        // the same target while the burst lasts; clear it once back to idle.
        if (mood !== "idle" && lastMoodRef.current === "idle") {
          const pinned = store.pinnedIds;
          const target =
            pinned.length > 0
              ? pinned[Math.floor(Math.random() * pinned.length)]
              : null;
          store.setEmoteTarget(target);
        } else if (mood === "idle") {
          store.setEmoteTarget(null);
        }
        lastMoodRef.current = mood;
        store.setMood(mood);
      }
    };

    const interval = setInterval(tick, POLL_INTERVAL_MS);
    void tick();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pinnedKey, hasPinned]);
}
