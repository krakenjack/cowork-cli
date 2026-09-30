#!/usr/bin/env bash
# Start a Cowork session in a folder, with Remote Control on (macOS/Linux/WSL). Usually run as `cowork`
# (the command install.sh adds) from inside the folder; no options are needed.
#
#   cowork [folder] [--name "Ops"] [--chrome] [--quiet] [--no-remote] [--continue] [--model m]
#          [--permission-mode acceptEdits] [--add-dir path ...] [--dev] [--local-board]
#
#   --name         session name on the phone (default: the folder's name)
#   --quiet        don't start with the session brief / first-run welcome
#   --dev          load the plugin from this copy even if it's also installed
#   --local-board  also start the optional localhost board server (desktop app)
set -euo pipefail
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATES="$PLUGIN_ROOT/templates"

WS="$PWD"; NAME=""; CHROME=0; LOCAL_BOARD=0; REMOTE=1; DEV=0; QUIET=0; MODEL=""; CONT=0; PMODE=""; ADDDIRS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --name) NAME="$2"; shift 2;;
    --chrome) CHROME=1; shift;;
    --local-board|--board) LOCAL_BOARD=1; shift;;
    --no-remote) REMOTE=0; shift;;
    --dev) DEV=1; shift;;
    --installed) shift;;   # older flag; installation is detected now
    --quiet) QUIET=1; shift;;
    --model) MODEL="$2"; shift 2;;
    --continue) CONT=1; shift;;
    --permission-mode) PMODE="$2"; shift 2;;
    --add-dir) shift; while [ $# -gt 0 ] && [[ "$1" != --* ]]; do ADDDIRS+=("$1"); shift; done;;
    -h|--help|help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0;;
    *) WS="$1"; shift;;
  esac
done

command -v claude >/dev/null 2>&1 || { echo "Claude Code isn't installed. Install it from https://code.claude.com/docs/en/setup, then run cowork again." >&2; exit 1; }
[ -d "$WS" ] || { echo "There's no folder at $WS." >&2; exit 1; }
WS="$(cd "$WS" && pwd)"
[ "$WS" = "$HOME" ] && { echo "Run cowork inside a folder made for the work, not your home folder. Make a folder, open a terminal in it, and type cowork." >&2; exit 1; }
[ -n "$NAME" ] || NAME="$(basename "$WS")"

# First run in this folder: lay out the workspace. Existing files are never overwritten.
first_run=0
[ -f "$WS/CLAUDE.md" ] || first_run=1
for d in outputs inbox automation memory/people memory/projects memory/topics; do mkdir -p "$WS/$d"; done
copy() { [ -f "$WS/$2" ] || cp "$TEMPLATES/$1" "$WS/$2"; }
copy CLAUDE.md CLAUDE.md
copy TASKS.md TASKS.md
copy CONNECTORS.md CONNECTORS.md
copy memory/MEMORY.md memory/MEMORY.md
copy memory/profile.md memory/profile.md
copy memory/preferences.md memory/preferences.md
copy gitignore .gitignore
grep -q '~~your name' "$WS/CLAUDE.md" 2>/dev/null && first_run=1

if [ $LOCAL_BOARD -eq 1 ]; then
  if command -v node >/dev/null 2>&1; then
    mkdir -p "$WS/.cowork" && touch "$WS/.cowork/board-autostart"
    url=$(node "$PLUGIN_ROOT/scripts/board/board.mjs" start --workspace "$WS" | tail -1) || true
    [ -n "${url:-}" ] && echo "Local board: $url"
  else echo "The local board needs Node.js 18+; skipping it."; fi
fi

# Use the installed plugin when there is one, so its skills aren't loaded twice.
installed=0
case "$PLUGIN_ROOT" in "$HOME/.claude/plugins/"*) installed=1;; esac
grep -qs '"cowork-cli@cowork-cli"' "$HOME/.claude/plugins/installed_plugins.json" && installed=1

args=()
if [ $REMOTE -eq 1 ]; then args+=(--remote-control "$NAME"); else args+=(--name "$NAME"); fi
{ [ $installed -eq 0 ] || [ $DEV -eq 1 ]; } && args+=(--plugin-dir "$PLUGIN_ROOT")
[ $CHROME -eq 1 ] && args+=(--chrome)
[ -n "$MODEL" ] && args+=(--model "$MODEL")
[ $CONT -eq 1 ] && args+=(--continue)
[ -n "$PMODE" ] && args+=(--permission-mode "$PMODE")
[ ${#ADDDIRS[@]} -gt 0 ] && args+=(--add-dir "${ADDDIRS[@]}")
# Start with something useful waiting on the phone: a welcome the first time, a brief after that.
if [ $QUIET -eq 0 ] && [ $CONT -eq 0 ]; then
  if [ $first_run -eq 1 ]; then args+=("/cowork welcome"); else args+=("/cowork"); fi
fi

b=$'\033[1m'; d=$'\033[2m'; r=$'\033[0m'
echo
echo "${b}Cowork is starting in \"$NAME\"${r}  ${d}$WS${r}"
if [ $REMOTE -eq 1 ]; then
  echo "  Pick it up on your phone or computer: Claude app → Code → \"$NAME\"  (or claude.ai/code)"
  echo "  Keep this window open and the computer awake while you work."
fi
[ $first_run -eq 1 ] && echo "  First time here: Claude will ask a couple of questions to set the folder up."
echo
cd "$WS"
exec claude "${args[@]}"
