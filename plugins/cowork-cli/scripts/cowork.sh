#!/usr/bin/env bash
# Launch a Cowork-style Claude Code session in a folder, with Remote Control enabled (macOS/Linux/WSL).
#
#   cowork.sh [workspace] [--name "Ops"] [--chrome] [--board] [--no-remote] [--installed] [--model m]
#             [--continue] [--permission-mode acceptEdits] [--add-dir path ...]
set -euo pipefail
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATES="$PLUGIN_ROOT/templates"

WS="$PWD"; NAME=""; CHROME=0; BOARD=0; REMOTE=1; INSTALLED=0; MODEL=""; CONT=0; PMODE=""; ADDDIRS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --name) NAME="$2"; shift 2;;
    --chrome) CHROME=1; shift;;
    --board) BOARD=1; shift;;
    --no-remote) REMOTE=0; shift;;
    --installed) INSTALLED=1; shift;;
    --model) MODEL="$2"; shift 2;;
    --continue) CONT=1; shift;;
    --permission-mode) PMODE="$2"; shift 2;;
    --add-dir) shift; while [ $# -gt 0 ] && [[ "$1" != --* ]]; do ADDDIRS+=("$1"); shift; done;;
    -h|--help) sed -n '2,6p' "$0"; exit 0;;
    *) WS="$1"; shift;;
  esac
done

command -v claude >/dev/null 2>&1 || { echo "claude is not on PATH. Install Claude Code: https://code.claude.com/docs/en/setup" >&2; exit 1; }
WS="$(cd "$WS" && pwd)"

created=()
for d in outputs inbox automation memory/people memory/projects memory/topics; do
  [ -d "$WS/$d" ] || { mkdir -p "$WS/$d"; created+=("$d"); }
done
copy() { [ -f "$WS/$2" ] || { cp "$TEMPLATES/$1" "$WS/$2"; created+=("$2"); }; }
copy CLAUDE.md CLAUDE.md
copy TASKS.md TASKS.md
copy CONNECTORS.md CONNECTORS.md
copy memory/MEMORY.md memory/MEMORY.md
copy memory/profile.md memory/profile.md
copy memory/preferences.md memory/preferences.md
copy gitignore .gitignore
if [ ${#created[@]} -gt 0 ]; then
  echo "Initialized workspace files: ${created[*]}"
  echo "Edit CLAUDE.md to fill in who you are and what this folder is for."
fi

if [ $BOARD -eq 1 ]; then
  if command -v node >/dev/null 2>&1; then
    mkdir -p "$WS/.cowork" && touch "$WS/.cowork/board-autostart"
    url=$(node "$PLUGIN_ROOT/scripts/board/board.mjs" start --workspace "$WS" | tail -1)
    if [ -n "$url" ]; then
      echo "Board: $url"
      case "$(uname -s)" in Darwin) open "$url";; Linux) command -v xdg-open >/dev/null && xdg-open "$url" >/dev/null 2>&1 || true;; esac
    fi
  else echo "Board needs Node.js 18+ on PATH; skipping."; fi
fi

args=()
if [ $REMOTE -eq 1 ]; then args+=(--remote-control); [ -n "$NAME" ] && args+=("$NAME"); elif [ -n "$NAME" ]; then args+=(--name "$NAME"); fi
[ $INSTALLED -eq 1 ] || args+=(--plugin-dir "$PLUGIN_ROOT")
[ $CHROME -eq 1 ] && args+=(--chrome)
[ -n "$MODEL" ] && args+=(--model "$MODEL")
[ $CONT -eq 1 ] && args+=(--continue)
[ -n "$PMODE" ] && args+=(--permission-mode "$PMODE")
[ ${#ADDDIRS[@]} -gt 0 ] && args+=(--add-dir "${ADDDIRS[@]}")

cd "$WS"
echo "claude ${args[*]}"
[ $REMOTE -eq 1 ] && echo "Remote Control on: open the Claude mobile app or claude.ai/code to pick this session up."
exec claude "${args[@]}"
