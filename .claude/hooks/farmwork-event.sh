#!/usr/bin/env bash
# Farmwork hook: append a Claude Code tool event to the visualization event stream.
#
# Invoked by PreToolUse / PostToolUse hooks. Reads the hook JSON on stdin and
# extracts the top-level string fields (hook_event_name, tool_name, session_id)
# with grep — no jq/node dependency, so it stays sub-10ms and never measurably
# slows tool execution. ALWAYS exits 0 so a failure here can never block a tool.
#
# Output line (one per event):
#   {"ts":1700000000000,"event":"PreToolUse","tool":"Bash","session":"abc123"}

set +e

input="$(cat)"

# Extract a top-level JSON string field: "<key>": "<value>"
field() {
  printf '%s' "$input" \
    | grep -oE "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
    | head -n1 \
    | sed -E "s/.*:[[:space:]]*\"([^\"]*)\".*/\1/"
}

event="$(field hook_event_name)"
tool="$(field tool_name)"
session="$(field session_id)"

# Nothing useful to record (e.g. non-tool event) — bail quietly.
[ -z "$tool" ] && exit 0

dir="${CLAUDE_PROJECT_DIR:-$PWD}/.farmwork"
mkdir -p "$dir" 2>/dev/null

# Milliseconds since epoch (date on macOS has no %N; seconds*1000 is plenty).
ts="$(date +%s)000"

printf '{"ts":%s,"event":"%s","tool":"%s","session":"%s"}\n' \
  "$ts" "${event:-Unknown}" "$tool" "${session:-unknown}" \
  >> "$dir/events.jsonl" 2>/dev/null

exit 0
