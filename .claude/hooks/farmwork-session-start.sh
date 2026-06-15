#!/usr/bin/env bash
# Farmwork hook: reset the event stream at the start of each Claude Code session.
#
# Invoked by the SessionStart hook. Truncates .farmwork/events.jsonl so the file
# never grows unbounded and each session starts from a clean slate. The frontend
# poller detects the shrink and resets its consumed-line offset. ALWAYS exits 0.

set +e

dir="${CLAUDE_PROJECT_DIR:-$PWD}/.farmwork"
mkdir -p "$dir" 2>/dev/null
: > "$dir/events.jsonl" 2>/dev/null

exit 0
