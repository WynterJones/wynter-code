# Claude Code Hook → Farmwork Visualization Cards

## Overview

Make the Farmwork Tycoon visualization react to **any** Claude Code session
running against this repo — not just sessions the app launches and stream-parses
itself. Today, `farmworkBridge.onToolStart/onToolComplete` only fires for the
app's own Claude/Codex panels (`claude.ts` parses `--stream-json` and calls the
bridge on each `tool_use` chunk). A Claude Code session in a terminal, a split
terminal pane, or this very CLI produces no cards.

We close the gap with **Claude Code hooks** that write tool events to a file the
app watches, feeding the existing bridge.

### Decisions (confirmed with user)
- **Transport:** file-watch. Hooks append JSONL to a watched file; the app reads
  new lines and feeds the bridge. No HTTP server dependency, offline-tolerant.
- **Scope:** this repo only. Hooks live in `./.claude/settings.json`.
- **Dedup:** hooks are the single source. Once hook events are seen, the
  stream-parse path is suppressed so in-app panels don't double-spawn cards.

## Architecture

```
Claude Code (any session in this repo)
   │  PreToolUse / PostToolUse hook (matcher "*")
   ▼
.claude/hooks/farmwork-event.sh   (reads hook JSON on stdin)
   │  appends one compact line
   ▼
.farmwork/events.jsonl            (gitignored, transient)
   │  polled (~400ms) while farm view open, via readTextFile + offset tracking
   ▼
useFarmworkHookEvents()  →  farmworkBridge.ingestHookEvent()
   │  session+tool FIFO correlation (no shared tool_use_id exists)
   ▼
spawnVehicle / signalVehicleExit / addActivity  →  cards animate
```

### Why no Rust changes
The frontend already reads project files via `readTextFile` (the store reads
`_AUDIT/*.md`). Polling a small JSONL while the farm is open is cheap and needs
zero Tauri rebuild. (A push-based `fs-change` Rust watcher already exists and can
be layered in later as an optimization, but is not required.)

### Correlation (critical constraint)
Claude Code hooks provide **no shared `tool_use_id`** between `PreToolUse` and
`PostToolUse` (confirmed via claude-code-guide). We correlate with
`session_id` + `tool_name` using a FIFO queue per (session, tool): PreToolUse
pushes the spawned vehicle id; PostToolUse pops the oldest and signals exit.
Unmatched completions fall back to a generic "completed" activity.

## Files to create
- `.claude/hooks/farmwork-event.sh` — dependency-free hook (bash + grep extract
  of top-level `hook_event_name`, `tool_name`, `session_id`; appends to
  `.farmwork/events.jsonl`; always `exit 0` so it never blocks tools).
- `.claude/hooks/farmwork-session-start.sh` — truncates `.farmwork/events.jsonl`
  on SessionStart so the file never grows unbounded.
- `src/hooks/useFarmworkHookEvents.ts` — polls the events file while the farm
  view is open, tracks consumed-line count, resets on truncation, forwards new
  events to the bridge.

## Files to modify
- `.claude/settings.json` (create/extend) — register `PreToolUse` (`*`),
  `PostToolUse` (`*`), and `SessionStart` hooks pointing at the scripts.
- `src/services/farmworkBridge.ts` — add `ingestHookEvent({event, tool, session})`,
  per-session FIFO vehicle queues, and a `hooksActive` flag that suppresses the
  stream-parse `onToolStart/onToolComplete` once a hook event arrives.
- `src/components/tools/farmwork-tycoon/FarmworkTycoonPopup.tsx` and
  `MiniGamePlayer.tsx` — mount `useFarmworkHookEvents()` while open.
- `.gitignore` — add `.farmwork/`.

## Event line format
```json
{"ts":1700000000000,"event":"PreToolUse","tool":"Bash","session":"abc123"}
```
(`is_error` omitted — the current bridge renders success/error identically.)

## Implementation steps
1. Add `.gitignore` entry for `.farmwork/`.
2. Write `farmwork-event.sh` + `farmwork-session-start.sh`, `chmod +x`.
3. Create `.claude/settings.json` with the three hooks.
4. Extend `farmworkBridge` with `ingestHookEvent` + FIFO correlation + single-source flag.
5. Add `useFarmworkHookEvents` poller and mount it in the two farm views.
6. Verify: open farm view, run a Claude Code tool in this repo, confirm a vehicle
   spawns and exits; confirm in-app panel sessions don't double-spawn.

## Risks / notes
- Polling only runs while the farm view is open (no idle cost).
- Hook latency: pure bash + grep, no jq/node startup — sub-10ms, safe for
  PreToolUse (which blocks tool execution until it returns).
- On open we seek to EOF (skip stale history) — cards are live, not replayed.
- Single-source suppression is scoped to runtime; if hooks stop arriving the
  stream-parse path is not auto-restored within the same session (acceptable;
  reload resets).
