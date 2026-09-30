#!/usr/bin/env bash
# cowork-cli installer for macOS and Linux. Run once per computer:
#
#   curl -fsSL https://raw.githubusercontent.com/krakenjack/cowork-cli/main/install.sh | bash
#
# It installs the cowork-cli plugin into Claude Code and adds a `cowork` command. After that, open a terminal
# in any folder and type `cowork`.
set -euo pipefail

REPO="krakenjack/cowork-cli"
BIN="${COWORK_BIN:-$HOME/.local/bin}"
say()  { printf '%s\n' "$*"; }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

step "Installing Cowork for Claude Code"

if ! command -v claude >/dev/null 2>&1; then
  fail "Claude Code isn't installed yet. Install it first (one line, from https://code.claude.com/docs/en/setup):

    curl -fsSL https://claude.ai/install.sh | bash

Then open a new terminal, type  claude  once to sign in with your Claude account, and run this installer again."
fi
say "✓ Claude Code found"

if command -v node >/dev/null 2>&1; then say "✓ Node.js found (needed for the board)"
else say "! Node.js isn't installed. Everything works except the board (task list and file drop page). Get it from https://nodejs.org when you want it."; fi

step "Adding the plugin"
claude plugin marketplace add "$REPO" >/dev/null 2>&1 || claude plugin marketplace update cowork-cli >/dev/null 2>&1 || true
if claude plugin install cowork-cli@cowork-cli >/dev/null 2>&1 || claude plugin update cowork-cli@cowork-cli >/dev/null 2>&1; then
  say "✓ cowork-cli plugin installed"
else
  fail "Couldn't install the plugin. Run  claude  once to make sure you're signed in, then try again."
fi

step "Adding the cowork command"
mkdir -p "$BIN"
cat > "$BIN/cowork" <<'SHIM'
#!/usr/bin/env bash
# cowork: start a Cowork session in the current folder (installed by cowork-cli's install.sh).
#   cowork           start here
#   cowork update    get the latest version
#   cowork help      more options
set -euo pipefail
if [ "${1:-}" = "update" ]; then
  claude plugin marketplace update cowork-cli && claude plugin update cowork-cli@cowork-cli && echo "Cowork is up to date."
  exit
fi
REG="$HOME/.claude/plugins/installed_plugins.json"
ROOT=$(sed -n '/"cowork-cli@cowork-cli"/,/"installPath"/p' "$REG" 2>/dev/null | sed -n 's/.*"installPath": *"\([^"]*\)".*/\1/p' | tail -1)
[ -n "$ROOT" ] && [ -f "$ROOT/scripts/cowork.sh" ] || { echo "The cowork-cli plugin isn't installed. Run the installer again:  curl -fsSL https://raw.githubusercontent.com/krakenjack/cowork-cli/main/install.sh | bash" >&2; exit 1; }
exec bash "$ROOT/scripts/cowork.sh" "$@"
SHIM
chmod +x "$BIN/cowork"
say "✓ cowork command added ($BIN/cowork)"

case ":$PATH:" in
  *":$BIN:"*) on_path=1 ;;
  *) on_path=0
     # zsh is the macOS default; bash elsewhere. Add to whichever exists, and create the default one.
     if [ "$(uname -s)" = "Darwin" ]; then rcs=("$HOME/.zshrc"); else rcs=("$HOME/.bashrc"); fi
     for extra in "$HOME/.zshrc" "$HOME/.bashrc"; do [ -f "$extra" ] && rcs+=("$extra"); done
     for rc in "${rcs[@]}"; do
       grep -qs 'cowork-cli: add ~/.local/bin' "$rc" || printf '\n# cowork-cli: add ~/.local/bin to PATH\nexport PATH="%s:$PATH"\n' "$BIN" >> "$rc"
     done ;;
esac

step "Done"
say "To start working:"
say "  1. Make a folder for the work (Finder / Files)."
say "  2. Open a terminal in that folder and type:  cowork"
if [ "$(uname -s)" = "Darwin" ]; then
  say "     (Finder tip: right-click the folder → Services → New Terminal at Folder. If it's missing, turn it on in"
  say "      System Settings → Keyboard → Keyboard Shortcuts → Services → Files and Folders.)"
fi
say "  3. Pick the session up in the Claude app on your phone or at claude.ai/code → Code."
[ "$on_path" = 1 ] || say "
Open a new terminal window first, so it knows the cowork command."
