/**
 * useFarmworkHookEvents
 *
 * While the Farmwork visualization is open, polls the hook-written event stream
 * (`<projectPath>/.farmwork/events.jsonl`) and forwards new tool events to the
 * farmworkBridge, so any Claude Code session driving this project animates cards.
 *
 * The stream is produced by the globally-installed Claude Code hooks (see
 * src/lib/farmworkHooks.ts). We seek to EOF on open (live cards, no stale
 * replay), track how many lines we've consumed, and reset when the file shrinks
 * (the SessionStart hook truncates it at the start of each session).
 */

import { useEffect, useRef } from "react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { farmworkBridge } from "@/services/farmworkBridge";

const POLL_INTERVAL_MS = 400;

interface HookEventLine {
  ts: number;
  event: string;
  tool: string;
  session: string;
}

export function useFarmworkHookEvents(
  projectPath: string | undefined,
  enabled: boolean
): void {
  // Number of lines already consumed from the current file generation.
  const consumedRef = useRef(0);
  // Whether we've performed the initial EOF seek for this open session.
  const seekedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !projectPath) return;

    const eventsPath = `${projectPath}/.farmwork/events.jsonl`;
    consumedRef.current = 0;
    seekedRef.current = false;
    let cancelled = false;

    const poll = async () => {
      let text: string;
      try {
        text = await readTextFile(eventsPath);
      } catch {
        // File not created yet (no hook has fired) — nothing to do.
        return;
      }
      if (cancelled) return;

      const lines = text.split("\n").filter((l) => l.trim().length > 0);

      // File was truncated/rotated (e.g. SessionStart) — restart from the top.
      if (lines.length < consumedRef.current) {
        consumedRef.current = 0;
        seekedRef.current = false;
      }

      // On first read after opening, skip existing history — only react to
      // events produced from now on.
      if (!seekedRef.current) {
        consumedRef.current = lines.length;
        seekedRef.current = true;
        return;
      }

      if (lines.length === consumedRef.current) return;

      const fresh = lines.slice(consumedRef.current);
      consumedRef.current = lines.length;

      for (const line of fresh) {
        let parsed: HookEventLine;
        try {
          parsed = JSON.parse(line) as HookEventLine;
        } catch {
          continue;
        }
        if (parsed.tool && parsed.event) {
          farmworkBridge.ingestHookEvent({
            event: parsed.event,
            tool: parsed.tool,
            session: parsed.session ?? "unknown",
          });
        }
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    void poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectPath, enabled]);
}
