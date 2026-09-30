#!/usr/bin/env bash
# SessionStart hook for cowork-cli.
# Prints the operating model plus a snapshot of the workspace so Claude starts every
# session already knowing the task list, memory index, and inbox state.
# Runs under Git Bash on Windows and any POSIX shell elsewhere.

set -u
ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
WS="${CLAUDE_PROJECT_DIR:-$PWD}"

echo "<cowork-operating-model>"
cat "$ROOT/context/operating-model.md"
echo "</cowork-operating-model>"
echo
echo "<cowork-workspace path=\"$WS\">"

if [ -f "$WS/TASKS.md" ]; then
  open_count=$(grep -c '^\s*- \[ \]' "$WS/TASKS.md" 2>/dev/null); : "${open_count:=0}"
  done_count=$(grep -c "^\s*- \[x\]" "$WS/TASKS.md" 2>/dev/null); : "${done_count:=0}"
  echo "TASKS.md: present ($open_count open, $done_count done). Read it before touching ongoing work."
else
  echo "TASKS.md: missing. Create it from the template on first use of /tasks."
fi

if [ -f "$WS/memory/MEMORY.md" ]; then
  lines=$(wc -l < "$WS/memory/MEMORY.md" | tr -d ' ')
  echo "memory/MEMORY.md: present ($lines lines). Read it before asking for context the person may already have given."
else
  echo "memory/MEMORY.md: missing. /remember will create it."
fi

if [ -d "$WS/inbox" ]; then
  n=$(find "$WS/inbox" -type f 2>/dev/null | wc -l | tr -d ' ')
  echo "inbox/: $n file(s) waiting."
fi

if [ -d "$WS/outputs" ]; then
  n=$(find "$WS/outputs" -type f 2>/dev/null | wc -l | tr -d ' ')
  echo "outputs/: $n deliverable(s) so far."
else
  echo "outputs/: missing. Create it before writing the first deliverable."
fi

# Board. The web board (a rendered HTML page, published as an Artifact) needs no server; report its link when it
# has one. The optional localhost server only starts when the workspace opted in (.cowork/board-autostart).
if command -v node >/dev/null 2>&1; then
  web=$(node "$ROOT/scripts/board/sync.mjs" status --workspace "$WS" 2>/dev/null | tail -1)
  case "$web" in
    *claude.ai*) echo "Board: $web. It opens beside this conversation in claude.ai; waiting changes arrive as messages from the board (apply them with /board sync). The Stop hook asks for a republish when the workspace changes." ;;
    *) echo "Board: not published yet. /board renders the workspace as a page and opens it beside the conversation (tasks, drop zone for inbox/, outputs)." ;;
  esac
  if [ -f "$WS/.cowork/board-autostart" ]; then
    url=$(node "$ROOT/scripts/board/board.mjs" start --workspace "$WS" 2>/dev/null | tail -1)
    [ -n "$url" ] && echo "Local board server (optional, desktop app): $url"
  fi
fi

echo "Skills: /cowork (session brief), /board (visual tracker), /tasks, /remember, /deliver, /automate, /connect. Built-in: /rc (Remote Control), /chrome, /schedule, /loop, /memory, /mcp."
echo "</cowork-workspace>"
exit 0
