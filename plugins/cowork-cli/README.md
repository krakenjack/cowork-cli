# cowork-cli

The Cowork operating model — a folder you work in, memory that persists, a task list, file deliverables, connectors, scheduled runs, a browser, and a session you can pick up from your phone — inside a plain terminal Claude Code session.

## What maps to what

| Cowork | cowork-cli in Claude Code |
|---|---|
| Pick a folder to work in | `cd` into the folder and run the launcher; `--add-dir` for extra folders |
| Operating rules (how tasks run, deliverables, unattended behavior) | `context/operating-model.md`, injected by a `SessionStart` hook |
| Memory | `memory/` in the workspace (shareable, `/remember`) + Claude Code auto memory (`/memory`) |
| Task list widget | `TASKS.md` (`/tasks`) + Claude Code's in-session todo list |
| Visual view beside the chat | `/board`: local dashboard (live tasks, drag-and-drop inbox, outputs, activity feed, message box) opened in the Claude app's browser pane, Chrome, or the default browser |
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

Windows (native Claude Code, needs Git for Windows for the hook):

```powershell
D:\cowork-cli\plugins\cowork-cli\scripts\cowork.ps1 -Workspace D:\ops -Name "Ops" -Chrome
```

macOS / Linux / WSL:

```bash
~/cowork-cli/plugins/cowork-cli/scripts/cowork.sh ~/ops --name "Ops" --chrome
```

First run creates `CLAUDE.md`, `TASKS.md`, `CONNECTORS.md`, `memory/`, `outputs/`, `inbox/`, `automation/` in the folder. Edit `CLAUDE.md` once to say who you are and what the folder is for.

Flags: `-Board/--board` (start the visual board), `-Name/--name` (session title on the phone), `-Chrome/--chrome`, `-NoRemote/--no-remote`, `-Installed/--installed` (plugin already installed via marketplace), `-AddDir/--add-dir`, `-Model/--model`, `-Continue/--continue`, `-PermissionMode/--permission-mode`.

To have every `claude` session start with Remote Control regardless of the launcher, set `"remoteControlAtStartup": true` in `~/.claude/settings.json` (or `/config` → Enable Remote Control for all sessions). Team/Enterprise orgs need an Owner to enable Remote Control at claude.ai/admin-settings/claude-code.

## Skills

| Skill | Trigger | Does |
|---|---|---|
| `/cowork` | "catch me up", "what's on my plate" | One-screen brief from TASKS.md, memory, inbox, outputs |
| `/board` | "open the board", "show the tracker" | Starts the local dashboard and opens it in the side panel / browser; `stop`, `status`, `autostart on`, `lan` |
| `/tasks` | "add a task", "mark that done", "what's due" | Manages `TASKS.md` |
| `/remember` | "remember that…", "forget…", "what do you know about…" | Workspace memory in `memory/` |
| `/deliver` | "put that in a doc / xlsx / pptx", "write me a report" | Picks format, builds under `outputs/`, verifies, hands over |
| `/automate` | "every weekday at 8…", "check again in an hour" | Chooses `/schedule`, `/loop`, or an OS job and sets it up |
| `/connect` | "connect Slack", "can you read my Jira" | Adds MCP servers scoped to the workspace |

Built-in Claude Code commands you'll use alongside: `/rc`, `/chrome`, `/schedule`, `/loop`, `/memory`, `/mcp`, `/plugin`.

## Hooks

- `SessionStart` — prints the operating model and a workspace snapshot (open tasks, memory, inbox, outputs, board URL) into context; auto-starts the board when the folder opted in.
- `UserPromptSubmit` / `PostToolUse` / `Stop` / `SessionEnd` — feed the board's activity panel and status dot; on each prompt, inject messages queued from the board and files newly dropped into `inbox/`.
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
