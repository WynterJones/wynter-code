/**
 * useAdventurerActivity
 *
 * Drives the pinned adventurer companion's "mood" from live wynter-code
 * activity. Only runs while a companion is pinned. It:
 *   - polls the hook event stream (`.farmwork/events.jsonl`, the same source as
 *     useFarmworkHookEvents) and flips to "active" briefly on each tool event,
 *   - reads the active session's streaming state and shows "thinking" while a
 *     response is generating,
 *   - reacts to UI navigation (switching projects, switching/opening tabs) with
 *     a brief "celebrate",
 *   - otherwise settles to "idle".
 *
 * Each mood change is written to the store and broadcast over the Tauri
 * `adventurer-mood` event so the separate companion webview reacts.
 */

import { useEffect, useRef } from "react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useAdventurerStore, type AdventurerMood } from "@/stores/adventurerStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSessionStore } from "@/stores/sessionStore";

const POLL_INTERVAL_MS = 400;
const ACTIVE_DECAY_MS = 1500;
const UI_EVENT_DECAY_MS = 2500;

export function useAdventurerActivity(): void {
  const pinnedId = useAdventurerStore((s) => s.pinnedId);
  const lastToolAtRef = useRef(0);
  const lastUiAtRef = useRef(0);
  const consumedRef = useRef(0);
  const seekedRef = useRef(false);
  const lastMoodRef = useRef<AdventurerMood>("idle");
  const prevProjectRef = useRef<string | null | undefined>(undefined);
  const prevSessionRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!pinnedId) return;

    consumedRef.current = 0;
    seekedRef.current = false;
    prevProjectRef.current = undefined;
    prevSessionRef.current = undefined;
    let cancelled = false;

    // Ensure the floating companion window exists for the pinned adventurer
    // (e.g. after an app restart). The Rust command is idempotent — it just
    // reveals an existing window.
    invoke("is_adventurer_open")
      .then((open) => {
        if (!open && !cancelled) {
          invoke("create_adventurer_window", { x: 200, y: 200 }).catch(() => {});
        }
      })
      .catch(() => {});

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
        lastMoodRef.current = mood;
        useAdventurerStore.getState().setMood(mood);
        emit("adventurer-mood", mood).catch(() => {});
      }
    };

    const interval = setInterval(tick, POLL_INTERVAL_MS);
    void tick();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pinnedId]);
}
