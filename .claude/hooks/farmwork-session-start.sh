#!/usr/bin/env bash
# Farmwork hook: bound the event stream's size at the start of a session.
#
# Invoked by the SessionStart hook. The frontend poller seeks to EOF when the
# visualization opens, so stale history is never replayed — truncation exists
# only to stop .farmwork/events.jsonl growing without bound.
#
# We therefore truncate ONLY when the file is already large. A small/active
# stream is left untouched, so a second concurrent Claude Code session starting
# up (or compacting/clearing) never wipes another session's in-flight events —
# which previously froze that session's cars. ALWAYS exits 0.

set +e

dir="${CLAUDE_PROJECT_DIR:-$PWD}/.farmwork"
file="$dir/events.jsonl"
mkdir -p "$dir" 2>/dev/null

# Reset only once the stream gets large (~512KB, several thousand events).
max_bytes=524288
size="$(wc -c < "$file" 2>/dev/null | tr -d '[:space:]')"
if [ -n "$size" ] && [ "$size" -gt "$max_bytes" ]; then
  : > "$file" 2>/dev/null
fi

exit 0
