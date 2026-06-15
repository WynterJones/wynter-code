/**
 * Farmwork hook installer.
 *
 * Installs Claude Code hooks (globally, into ~/.claude) that stream tool events
 * into the Farmwork Tycoon visualization. Any Claude Code session — terminal,
 * split pane, or external — then drives the farm for whatever project it runs in.
 *
 * The hooks append events to `$CLAUDE_PROJECT_DIR/.farmwork/events.jsonl`, which
 * the visualization polls while open (see useFarmworkHookEvents).
 *
 * Everything here runs through existing Tauri commands (write_claude_file,
 * get_claude_settings, write_claude_settings, delete_claude_file) — no Rust
 * changes required. The hook command uses `bash "<path>"` so the scripts need no
 * execute bit.
 *
 * NOTE: EVENT_SCRIPT / SESSION_START_SCRIPT mirror the committed reference copies
 * at .claude/hooks/*.sh — keep them in sync if you edit one.
 */

import { invoke } from "@tauri-apps/api/core";

const HOOKS_SUBDIR = ".claude/hooks";
const EVENT_SCRIPT_NAME = "farmwork-event.sh";
const SESSION_START_SCRIPT_NAME = "farmwork-session-start.sh";

// Substring used to recognize (for idempotent install / clean uninstall) the
// hook entries we own inside the user's settings.json.
const EVENT_MARKER = EVENT_SCRIPT_NAME;
const SESSION_MARKER = SESSION_START_SCRIPT_NAME;

const EVENT_SCRIPT = `#!/usr/bin/env bash
# Farmwork hook: append a Claude Code tool event to the visualization event stream.
# Managed by Wynter Code — installed via the Claude dropdown "Install Farmwork Hooks".
# Reads the hook JSON on stdin, extracts top-level string fields with grep (no
# jq/node dependency, sub-10ms), and ALWAYS exits 0 so it can never block a tool.

set +e

input="$(cat)"

field() {
  printf '%s' "$input" \\
    | grep -oE "\\"$1\\"[[:space:]]*:[[:space:]]*\\"[^\\"]*\\"" \\
    | head -n1 \\
    | sed -E "s/.*:[[:space:]]*\\"([^\\"]*)\\".*/\\1/"
}

event="$(field hook_event_name)"
tool="$(field tool_name)"
session="$(field session_id)"

[ -z "$tool" ] && exit 0

dir="\${CLAUDE_PROJECT_DIR:-$PWD}/.farmwork"
mkdir -p "$dir" 2>/dev/null

ts="$(date +%s)000"

printf '{"ts":%s,"event":"%s","tool":"%s","session":"%s"}\\n' \\
  "$ts" "\${event:-Unknown}" "$tool" "\${session:-unknown}" \\
  >> "$dir/events.jsonl" 2>/dev/null

exit 0
`;

const SESSION_START_SCRIPT = `#!/usr/bin/env bash
# Farmwork hook: reset the event stream at the start of each Claude Code session.
# Managed by Wynter Code. Truncates .farmwork/events.jsonl so it never grows
# unbounded; the frontend poller detects the shrink and resets its offset.

set +e

dir="\${CLAUDE_PROJECT_DIR:-$PWD}/.farmwork"
mkdir -p "$dir" 2>/dev/null
: > "$dir/events.jsonl" 2>/dev/null

exit 0
`;

interface HookCommand {
  type: "command";
  command: string;
  [key: string]: unknown;
}

interface HookMatcherEntry {
  matcher?: string;
  hooks: HookCommand[];
  [key: string]: unknown;
}

type ClaudeSettings = Record<string, unknown> & {
  hooks?: Record<string, HookMatcherEntry[]>;
};

async function getHookPaths(): Promise<{
  homeDir: string;
  eventPath: string;
  sessionPath: string;
  eventCommand: string;
  sessionCommand: string;
}> {
  const homeDir = await invoke<string>("get_home_dir");
  const eventPath = `${homeDir}/${HOOKS_SUBDIR}/${EVENT_SCRIPT_NAME}`;
  const sessionPath = `${homeDir}/${HOOKS_SUBDIR}/${SESSION_START_SCRIPT_NAME}`;
  return {
    homeDir,
    eventPath,
    sessionPath,
    eventCommand: `bash "${eventPath}"`,
    sessionCommand: `bash "${sessionPath}"`,
  };
}

function entryReferences(entry: HookMatcherEntry, marker: string): boolean {
  return (entry.hooks ?? []).some(
    (h) => typeof h.command === "string" && h.command.includes(marker)
  );
}

/** True if our hook entries are present in the user's settings.json. */
export async function areFarmworkHooksInstalled(): Promise<boolean> {
  try {
    const settings = await invoke<ClaudeSettings>("get_claude_settings", {
      scope: "user",
      projectPath: null,
    });
    const post = settings.hooks?.PostToolUse ?? [];
    return post.some((e) => entryReferences(e, EVENT_MARKER));
  } catch {
    return false;
  }
}

/**
 * Install the farmwork hooks globally (~/.claude). Idempotent — re-running
 * refreshes the scripts and leaves a single copy of each hook entry.
 */
export async function installFarmworkHooks(): Promise<void> {
  const { eventPath, sessionPath, eventCommand, sessionCommand } =
    await getHookPaths();

  // 1. Write the hook scripts (write_claude_file creates parent dirs).
  await invoke("write_claude_file", { path: eventPath, content: EVENT_SCRIPT });
  await invoke("write_claude_file", {
    path: sessionPath,
    content: SESSION_START_SCRIPT,
  });

  // 2. Merge hook entries into user settings without clobbering existing hooks.
  const settings = await invoke<ClaudeSettings>("get_claude_settings", {
    scope: "user",
    projectPath: null,
  });
  const hooks = { ...(settings.hooks ?? {}) };

  const ensure = (
    event: string,
    marker: string,
    entry: HookMatcherEntry
  ): void => {
    const existing = (hooks[event] ?? []).filter(
      (e) => !entryReferences(e, marker)
    );
    hooks[event] = [...existing, entry];
  };

  ensure("PreToolUse", EVENT_MARKER, {
    matcher: "*",
    hooks: [{ type: "command", command: eventCommand }],
  });
  ensure("PostToolUse", EVENT_MARKER, {
    matcher: "*",
    hooks: [{ type: "command", command: eventCommand }],
  });
  ensure("SessionStart", SESSION_MARKER, {
    hooks: [{ type: "command", command: sessionCommand }],
  });

  await invoke("write_claude_settings", {
    scope: "user",
    projectPath: null,
    settings: { ...settings, hooks },
  });
}

/**
 * Remove the farmwork hooks from ~/.claude (settings entries + script files).
 * Leaves any other user hooks untouched.
 */
export async function uninstallFarmworkHooks(): Promise<void> {
  const { eventPath, sessionPath } = await getHookPaths();

  const settings = await invoke<ClaudeSettings>("get_claude_settings", {
    scope: "user",
    projectPath: null,
  });

  if (settings.hooks) {
    const hooks: Record<string, HookMatcherEntry[]> = {};
    for (const [event, entries] of Object.entries(settings.hooks)) {
      const kept = entries.filter(
        (e) => !entryReferences(e, EVENT_MARKER) && !entryReferences(e, SESSION_MARKER)
      );
      if (kept.length > 0) hooks[event] = kept;
    }
    await invoke("write_claude_settings", {
      scope: "user",
      projectPath: null,
      settings: { ...settings, hooks },
    });
  }

  // Best-effort script cleanup.
  await invoke("delete_claude_file", { path: eventPath }).catch(() => {});
  await invoke("delete_claude_file", { path: sessionPath }).catch(() => {});
}
