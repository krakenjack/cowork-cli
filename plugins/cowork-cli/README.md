# cowork-cli

The Cowork operating model — a folder you work in, memory that persists, a task list, file deliverables, connectors, scheduled runs, a browser, and a session you can pick up from your phone — inside a plain terminal Claude Code session.

## What maps to what

| Cowork | cowork-cli in Claude Code |
|---|---|
| Pick a folder to work in | `cd` into the folder and run the launcher; `--add-dir` for extra folders |
| Operating rules (how tasks run, deliverables, unattended behavior) | `context/operating-model.md`, injected by a `SessionStart` hook |
| Memory | `memory/` in the workspace (shareable, `/remember`) + Claude Code auto memory (`/memory`) |
| Task list widget | `TASKS.md` (`/tasks`) + Claude Code's in-session todo list |
| Visual view beside the chat | `/board`: the workspace as a claude.ai Artifact beside the conversation (tasks, drag-and-drop inbox, outputs, activity, message box); `/board sync` applies what you did on it |
| Artifacts / deliverables | Files in `outputs/` (`/deliver`); docx/xlsx/pptx/pdf via the `anthropics/skills` document skills |
| Connectors | MCP servers (`/connect`, `claude mcp add`, `/mcp`) |
| Browser | Claude in Chrome (`--chrome` at launch, `/chrome` in-session) |
| Scheduled tasks | `/schedule` (cloud routines), `/loop` (in-session), or OS jobs running `claude -p` (`/automate`) |
| Continue from phone | Remote Control: launcher starts `claude --remote-control`; `/rc` toggles it in an open session |
| Session brief / dashboard | `/cowork` |
| "Check the work" | `deliverable-checker` agent |

## Install

**Option A — from a marketplace (shareable with the team)**

```
/plugin marketplace add <github-user>/cowork-cli
/plugin install cowork-cli@cowork-cli
```

**Option B — from a local folder (no publishing)**

```
claude --plugin-dir /path/to/cowork-cli/plugins/cowork-cli
```
The launcher scripts do this for you.

**Companion marketplaces** (optional): `anthropics/skills` for the document skills (docx, xlsx, pptx, pdf) and `anthropics/knowledge-work-plugins` for the role plugins (productivity, sales, marketing…) that also run in Claude Code.

## Launch

Install once per computer (see the [Windows](../../docs/getting-started-windows.md) and [Mac](../../docs/getting-started-macos.md) guides), then in any folder:

```
cowork
```

Windows also gets **Open Cowork here** on the folder right-click menu. The session is named after the folder. The first run creates `CLAUDE.md`, `TASKS.md`, `CONNECTORS.md`, `memory/`, `outputs/`, `inbox/`, `automation/` and starts with a short welcome that fills in `CLAUDE.md` from the person's answers; later runs start with the `/cowork` brief.

Optional flags: `-Name/--name` (session title; default the folder name), `-Quiet/--quiet` (no opening brief), `-Chrome/--chrome`, `-LocalBoard/--local-board` (optional localhost board), `-NoRemote/--no-remote`, `-Dev/--dev` (load this copy even when installed), `-AddDir/--add-dir`, `-Model/--model`, `-Continue/--continue`, `-PermissionMode/--permission-mode`. `cowork update` updates the plugin.

To have every `claude` session start with Remote Control regardless of the launcher, set `"remoteControlAtStartup": true` in `~/.claude/settings.json` (or `/config` → Enable Remote Control for all sessions). Team/Enterprise orgs need an Owner to enable Remote Control at claude.ai/admin-settings/claude-code.

## Skills

| Skill | Trigger | Does |
|---|---|---|
| `/cowork` | "catch me up", "what's on my plate" | One-screen brief from TASKS.md, memory, inbox, outputs |
| `/board` | "open the board", "show the tracker", "sync the board" | Renders the workspace, publishes it as an Artifact beside the chat, applies board changes with `sync`; optional local server via `scripts/board/board.mjs` |
| `/tasks` | "add a task", "mark that done", "what's due" | Manages `TASKS.md` |
| `/remember` | "remember that…", "forget…", "what do you know about…" | Workspace memory in `memory/` |
| `/deliver` | "put that in a doc / xlsx / pptx", "write me a report" | Picks format, builds under `outputs/`, verifies, hands over |
| `/automate` | "every weekday at 8…", "check again in an hour" | Chooses `/schedule`, `/loop`, or an OS job and sets it up |
| `/connect` | "connect Slack", "can you read my Jira" | Adds MCP servers scoped to the workspace |

Built-in Claude Code commands you'll use alongside: `/rc`, `/chrome`, `/schedule`, `/loop`, `/memory`, `/mcp`, `/plugin`.

## Hooks

- `SessionStart` — prints the operating model and a workspace snapshot (open tasks, memory, inbox, outputs, board URL) into context; auto-starts the board when the folder opted in.
- `UserPromptSubmit` / `PostToolUse` / `Stop` / `SessionEnd` — feed the board's activity panel; flag messages that come from the web board; re-render the board after each turn and ask for one republish when the workspace changed; inject messages queued on the local board and files newly dropped into `inbox/`.
- `Stop` (prompt hook) — checks that a deliverable landed in `outputs/` with its path stated, and that the "check the work" step ran.

## Agent

`deliverable-checker` — fresh-eyes verification of a finished file against the brief and sources. Used automatically for high-stakes deliverables, or on request.

## Scheduled runs

`scripts/schedule-windows.ps1` and `scripts/schedule-cron.sh` register an OS job that pipes `automation/<name>.md` into `claude -p --permission-mode acceptEdits` inside the workspace and logs to `outputs/automation/<name>/`. Requires an active Claude Code login on that machine. Cloud routines (`/schedule`) don't need the machine on but only see GitHub repos, not local folders.

## Sharing a workspace

Commit the workspace folder (CLAUDE.md, TASKS.md, CONNECTORS.md, `.mcp.json`, `memory/`) to a private repo; `outputs/automation/` is git-ignored by default. Anyone who clones it and runs the launcher gets the same instructions, connectors, memory and task list.

## Requirements

- Claude Code with a claude.ai login (Pro/Max/Team/Enterprise). Remote Control and Chrome don't work with API-key auth.
- Windows: Git for Windows (the `SessionStart` hook runs under bash).
- Chrome + the Claude in Chrome extension for `--chrome`.
