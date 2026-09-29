#!/usr/bin/env bash
# Register a cron job that runs `claude -p` inside a cowork-cli workspace (macOS/Linux/WSL).
#
#   schedule-cron.sh <name> <workspace> <prompt-file-relative> "<cron expr>" [--installed] [--allowed-tools "Bash(git *)"]
#   schedule-cron.sh <name> --remove
#
# Example: schedule-cron.sh inbox-brief ~/ops automation/inbox-brief.md "0 8 * * 1-5"
set -euo pipefail
NAME="${1:?name required}"; shift
if [ "${1:-}" = "--remove" ]; then
  crontab -l 2>/dev/null | grep -v "# cowork-cli:$NAME\$" | crontab -
  echo "Removed cron job cowork-cli:$NAME"; exit 0
fi
WS="$(cd "${1:?workspace required}" && pwd)"; PROMPT="${2:?prompt file required}"; CRON="${3:?cron expression required}"; shift 3
INSTALLED=0; ALLOWED=""
while [ $# -gt 0 ]; do case "$1" in --installed) INSTALLED=1; shift;; --allowed-tools) ALLOWED="$2"; shift 2;; *) echo "unknown arg $1" >&2; exit 1;; esac; done
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$WS/$PROMPT" ] || { echo "Prompt file not found: $WS/$PROMPT" >&2; exit 1; }
LOGDIR="$WS/outputs/automation/$NAME"; mkdir -p "$LOGDIR"
CLAUDE="$(command -v claude)"

FLAGS="-p 'Carry out the instructions provided on stdin. Write results to outputs/automation/$NAME/ and update TASKS.md if you find new commitments.' --permission-mode acceptEdits --output-format text"
[ $INSTALLED -eq 1 ] || FLAGS="$FLAGS --plugin-dir '$PLUGIN_ROOT'"
[ -n "$ALLOWED" ] && FLAGS="$FLAGS --allowedTools '$ALLOWED'"
LINE="$CRON cd '$WS' && cat '$PROMPT' | '$CLAUDE' $FLAGS >> '$LOGDIR/'\$(date +\\%F).log 2>&1 # cowork-cli:$NAME"

( crontab -l 2>/dev/null | grep -v "# cowork-cli:$NAME\$"; echo "$LINE" ) | crontab -
echo "Registered cron job cowork-cli:$NAME"
echo "  $LINE"
echo "  logs: $LOGDIR"
echo "  remove: $0 $NAME --remove"
echo "Note: cron runs with a minimal PATH and needs an active Claude Code login for this user."
