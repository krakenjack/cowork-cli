# cowork-cli

**The Cowork way of working, in a terminal Claude Code session you can pick up from your phone.**

## Deploy for non-technical users

To help you deploy this, use your strongest tool: your AI agent. It can build this workflow and skill with you and help you step by step. Paste the prompt below into Claude (or ChatGPT, or any code-based agent) and follow the steps it gives you to deploy this workflow.

```text
I want to set up "cowork-cli" (Cowork for Claude Code) on my computer, and I'm not technical.

Please read the deployment instructions written for AI assistants in this repository:
https://raw.githubusercontent.com/krakenjack/cowork-cli/main/DEPLOY-WITH-AN-AGENT.md
(repository: https://github.com/krakenjack/cowork-cli)

Follow those rules exactly and walk me through the setup one step at a time, waiting for me
to say "done" before the next step. Start by asking what kind of computer I have.
```

The assistant reads [`DEPLOY-WITH-AN-AGENT.md`](DEPLOY-WITH-AN-AGENT.md): the deployment rules written for it, including every command you'll paste, what you should see after each step, and fixes for common problems. You only ever paste lines it gives you.

Prefer to follow along yourself? Step-by-step guides: **[Windows](docs/getting-started-windows.md)** · **[Mac](docs/getting-started-macos.md)**

---

`cowork-cli` is a Claude Code plugin (shipped as a one-plugin marketplace) for knowledge work: research, drafting, analysis, planning and file deliverables. It makes a plain folder behave like a Cowork workspace. The folder gets standing instructions, persistent memory, a shared task list, an `outputs/` folder for deliverables, connectors, scheduled runs and browser access. The launcher starts the session with **Remote Control** on, so the same live session appears in the Claude mobile app and on claude.ai/code. Everything runs on your own machine.

```
You (terminal or phone)
        │  Remote Control
        ▼
claude --remote-control "Ops"  ──►  D:\ops\                (your folder, your files)
   + cowork-cli plugin               ├── CLAUDE.md          who you are, what this folder is for
     ├── operating model (hook)      ├── TASKS.md           task list          (/tasks, board)
     ├── /cowork /board /tasks       ├── memory/            persistent memory  (/remember)
     ├── /remember /deliver          ├── inbox/             files you hand over (drop zone on the board)
     ├── /automate /connect          ├── outputs/           everything Claude produces (/deliver)
     └── deliverable-checker agent   ├── automation/        prompts for scheduled runs (/automate)
                                     ├── .cowork/           board state (activity feed, queued messages)
        ┌──────────────────┐         └── .mcp.json          connectors (/connect)
        │  Cowork board    │◄── claude.ai Artifact beside the chat (web, desktop, phone),
        │  tasks · inbox   │    rendered from the folder; no server
        │  drop zone · log │
        └──────────────────┘
```

---

## Contents

- [Deploy for non-technical users](#deploy-for-non-technical-users)
- [Why](#why)
- [Quickstart](#quickstart)
- [Cowork → cowork-cli mapping](#cowork--cowork-cli-mapping)
- [Skills reference](#skills-reference)
- [The board](#the-board)
- [The operating model](#the-operating-model)
- [Remote Control](#remote-control)
- [Scheduled and recurring work](#scheduled-and-recurring-work)
- [Connectors and browser](#connectors-and-browser)
- [Sharing](#sharing)
- [Launcher reference](#launcher-reference)
- [Requirements](#requirements)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Repository layout](#repository-layout)

---

## Why

Cowork is great for handing off work and getting a finished file back. Running the same work in Claude Code gives you:

| | Cowork (desktop app) | cowork-cli (Claude Code) |
|---|---|---|
| Where work runs | Sandboxed VM with bridged folders | Directly in your folder on your machine |
| Tools on your PATH (git, python, pandoc, internal CLIs) | Via the bridge | Native |
| Continue from phone | Yes | Yes, via Remote Control |
| Instructions, memory and task list | Per-app settings | Plain files in the folder you can commit and share |
| Scheduled runs against local files | App must be open | OS scheduler runs `claude -p` in the folder |
| Customize behavior | Plugin settings | Edit markdown in the repo; everyone who installs gets it |

---

## Quickstart

Not technical? Let an AI assistant walk you through it: see [Deploy for non-technical users](#deploy-for-non-technical-users). Or follow the click-by-click guides for **[Windows](docs/getting-started-windows.md)** and **[Mac](docs/getting-started-macos.md)**.

### Once per computer: install

You need [Claude Code](https://code.claude.com/docs/en/setup) signed in with a Claude Pro, Max, Team or Enterprise account (open a terminal, type `claude`, follow the sign-in), and [Node.js](https://nodejs.org) for the board. Then paste one line into a terminal:

**Windows** (PowerShell):
```powershell
irm https://raw.githubusercontent.com/krakenjack/cowork-cli/main/install.ps1 | iex
```

**macOS / Linux**:
```bash
curl -fsSL https://raw.githubusercontent.com/krakenjack/cowork-cli/main/install.sh | bash
```

This installs the plugin and adds a `cowork` command. On Windows it also adds **Open Cowork here** to the right-click menu of folders (Windows 11: under *Show more options*).

### Every time: start working

1. **Make a folder** for the work in File Explorer or Finder.
2. **Start Cowork in it.** Windows: right-click the folder → *Open Cowork here*. macOS: right-click the folder → *Services* → *New Terminal at Folder*, then type `cowork`. Linux: open a terminal in the folder and type `cowork`.
3. **Pick it up** in the Claude app on your phone or at [claude.ai/code](https://claude.ai/code): *Code* → the session named after your folder.

The first time in a folder, Claude asks what to call you and what the folder is for, then opens the board beside the chat. After that, every start opens with a short brief of where things stand. Keep the terminal window open and the computer awake while you work.

To get the latest version: `cowork update`.

### For developers

Clone the repo and run the launcher from it; it loads the plugin from the clone when the plugin isn't installed (or always, with `--dev`):

```bash
git clone https://github.com/krakenjack/cowork-cli ~/src/cowork-cli
~/src/cowork-cli/plugins/cowork-cli/scripts/cowork.sh ~/ops --dev
```

---

## Cowork → cowork-cli mapping

| Cowork feature | In cowork-cli | How |
|---|---|---|
| Choose a folder | The workspace folder | Run `cowork` in it (Windows: right-click → Open Cowork here); extra folders with `-AddDir` |
| How Claude approaches tasks | Operating model | Injected by the `SessionStart` hook |
| Memory | `memory/` (shared) + Claude Code auto memory (per machine) | `/remember`, `/memory` |
| Task list widget | `TASKS.md` + in-session todo list | `/tasks` |
| Side-panel view of the work | The board: an Artifact beside the chat with tasks, inbox drop zone, outputs, activity | `/board`, `/board sync` |
| Artifacts and files | `outputs/YYYY-MM-DD-slug.ext` | `/deliver` |
| docx / xlsx / pptx / pdf | Anthropic document skills | `/plugin marketplace add anthropics/skills` |
| Connectors | MCP servers in the workspace `.mcp.json` | `/connect`, `/mcp` |
| Browser | Claude in Chrome | `-Chrome` or `/chrome` |
| Scheduled tasks | Cloud routines, `/loop`, or OS jobs | `/automate` |
| Continue on phone | Remote Control | Launcher default, or `/rc` |
| Work is double-checked | `deliverable-checker` agent | Runs automatically for high-stakes deliverables |
| Role plugins (sales, marketing, …) | Same plugins | `/plugin marketplace add anthropics/knowledge-work-plugins` |

---

## Skills reference

Each skill runs when you type its slash command, or when Claude recognizes a matching request.

### `/cowork`: session brief

A one-screen status of the workspace, sized for a phone.

```text
> /cowork
**Open** (6): OVERDUE Budget summary for finance (due 09-26) · API rate-limit review · …
**Waiting on you**: approve vendor shortlist
**Inbox**: 2 files — vendor-a-quote.pdf, vendor-b-quote.pdf
**Last delivered**: outputs/2026-09-28-project-spec.md
**Next**: build the quote comparison from the two inbox PDFs
```

`/cowork <project>` narrows the brief to one project or person.

### `/board`: visual tracker

Starts a local dashboard for the workspace and opens it beside the conversation. See [The board](#the-board).

```text
> /board
> /board autostart on      # start it with every session in this folder
> /board lan               # tokened URL for a tablet on the same network
> /board stop
```

### `/tasks`: task list

Manages `TASKS.md`, which has Active, Waiting and Done sections, due dates, `#project` tags and `@person` tags. You can also edit the file by hand.

| Say | Result |
|---|---|
| `/tasks add call vendor re: lead times Tuesday #hardware @alex` | Appends with `due 2026-10-06` |
| `/tasks done vendor` | Moves the matching task to Done with today's date |
| `/tasks due` | Tasks due within 7 days, overdue first |
| `/tasks` | Full Active + Waiting list, sorted |
| "I finished the budget thing" | Same as `done` |

When Claude finishes a tracked task during other work, it ticks the task off itself.

### `/remember`: workspace memory

Writes to `memory/` in the folder, which is plain markdown you can commit and share. Claude Code's built-in auto memory stays separate and per-machine (manage it with `/memory`).

```
memory/
├── MEMORY.md          index, read at every session start (kept < 150 lines)
├── profile.md         who you are
├── preferences.md     how you want Claude to behave
├── people/<name>.md
├── projects/<slug>.md
└── topics/<domain>.md
```

| Say | Result |
|---|---|
| `/remember our fiscal year starts July 1` | Added to `topics/finance.md` and indexed |
| `/remember forget the old vendor contact` | Line deleted outright |
| "what do you know about Alex?" | Answers from `people/alex-rivera.md` |

Rules: Claude files only what you said, never its own inferences. It never stores IDs, card or account numbers, or sensitive categories, and it doesn't announce saves.

### `/deliver`: deliverables

Chooses the format, builds the file under `outputs/`, checks it, and gives you the path.

| Content | Default |
|---|---|
| Memo, brief, spec, notes | `.md`, or `.docx` if it's going outside the team |
| Numbers, trackers, models | `.xlsx` with live formulas |
| Presentation | `.pptx` |
| Final or archival | `.pdf` |
| Dashboard, calculator, explainer | Self-contained `.html` |
| Data analysis | `.csv` + chart + numbers computed in code |

```text
> /deliver board-ready one-pager on Q3 customer growth --format docx
```

Material is gathered before any template is opened. Inputs in `inbox/` are never modified. Earlier deliverables are never overwritten (a new version gets `-v2`). Every build ends with a check step, and anything going to a board, customer or regulator also goes to the `deliverable-checker` agent.

For .docx, .xlsx, .pptx and .pdf, install the document skills: `/plugin marketplace add anthropics/skills`. Without them, `/deliver` falls back to `.md` or `.html` and tells you so.

### `/automate`: scheduled and recurring work

Picks the right mechanism and sets it up after you confirm the time and prompt. See [Scheduled and recurring work](#scheduled-and-recurring-work).

```text
> /automate every weekday at 7:45, read inbox/ and TASKS.md and write a morning brief to outputs/
```

### `/connect`: connectors

Adds MCP servers scoped to the workspace (`claude mcp add … --scope project`), so anyone who clones the folder gets the same connectors. It logs each one in `CONNECTORS.md`.

```text
> /connect linear
> /connect our postgres reporting replica
```

After adding a server that uses OAuth, run `/mcp` to sign in.

### `deliverable-checker` agent

A subagent that hasn't seen the work being produced. It opens the finished file, re-checks figures and citations against the sources, and returns `PASS`, `PASS WITH FIXES` or `FAIL` with cell, page or slide references. To run it by hand: "have the deliverable-checker review outputs/2026-09-29-budget.xlsx".

---

## The board

`/board` renders the workspace as one HTML page and publishes it as a **claude.ai Artifact**. The Artifact opens beside the conversation in the Claude web, desktop and mobile apps, which is where a Remote Control session already is, so the board sits next to the chat wherever you pick the session up. No server runs.

```
TASKS.md · inbox/ · outputs/ · memory/ · .cowork/activity.jsonl
        │  scripts/board/render.mjs  (every turn, from the Stop hook)
        ▼
.cowork/board.artifact.html ──Artifact publish──►  claude.ai artifact beside the chat
                                                     │ tick / add / delete tasks, drop files, message
                                                     ▼
                                   artifact database: inbound/<id>   (+ uploaded files)
                                                     │ "Send to Claude" → a message into the session
                                                     ▼
                               /board sync → scripts/board/sync.mjs → TASKS.md, inbox/  → republish
```

| Panel | What it shows | What you can do on the published board |
|---|---|---|
| Tasks | `TASKS.md` by Active / Waiting / Done, due dates, overdue in red | Tick, reopen, delete, add |
| Inbox | `inbox/` | Drop or choose files (20 MB; Office files 14 MB) |
| Outputs | `outputs/`, newest first | **Open** asks Claude to send the file into the chat |
| Message Claude | | Send an instruction straight into the conversation |
| Activity | Claude's tool calls, your prompts, file drops, as of the last update | |

How it stays in step:

- **Workspace → board.** The `Stop` hook re-renders the page after every turn. If tasks, `inbox/`, `outputs/` or memory changed, it asks Claude once to republish, and every open view reloads to the new version.
- **Board → workspace.** Each thing you do on the page is saved in the Artifact's own database and shown as *waiting for Claude*. **Send to Claude** hands the waiting changes to the session (you confirm in the chat). Claude runs `/board sync`: task edits land in `TASKS.md`, dropped files are copied into `inbox/`, messages are acted on, and the board is republished.
- **Elsewhere.** `.cowork/board.html` is the same page as a complete file. Opened outside claude.ai, or sent into the chat's side panel, it is a read-only snapshot.

Details:

- State lives in `.cowork/` (git-ignored): `web.json` holds the Artifact link. Delete the folder to reset; the next `/board` publishes a new Artifact.
- The Artifact is private to you unless you share it. It declares `db` (the change queue), `assets` (dropped files), `room` (Send to Claude) and `user`.
- Office files and other types the Artifact file store doesn't accept are carried as base64 text and decoded by `sync.mjs`.
- Needs Node 18+ on `PATH`.

**Local server (optional).** The earlier localhost board is still there for the Claude desktop app's browser pane: `node scripts/board/board.mjs start` (default `127.0.0.1:4820`, `lan` for a tokened LAN URL, `.cowork/board-autostart` to start it each session). It can't be reached from claude.ai in a browser on another machine.

---

## The operating model

`context/operating-model.md` is injected at the start of every session by a hook, together with a snapshot of the workspace (open task count, memory index size, inbox count, deliverable count). Its main rules:

- **Start immediately** when the request is clear or cheap to redo. Ask one question first only when a wrong guess is expensive.
- **Keep a todo list** for any job with more than a couple of steps. The last item is always *check the work*.
- **When you're away**, Claude takes the most reasonable reading of the request, states it, and carries on. It stops only before an irreversible decision that could go either way.
- **Output matches where it will live.** Things you read once stay in chat. Things you keep become files. Things you run are code. Data is computed, never estimated in prose.
- **Research** anything time-sensitive before stating it, and list sources.
- **Finish** with the file path, one line of context and one real next step. No recap.
- **Phone-friendly**: when you're reading through Remote Control, the answer comes first and fits one screen.

A `Stop` hook checks that each deliverable landed in `outputs/` with its path stated and that the check step ran.

You can change any of these rules by editing the markdown. Commit the change and everyone who updates the plugin gets it.

---

## Remote Control

Remote Control links your local session to claude.ai/code and the Claude iOS and Android apps. Code runs and files are read and written on your machine the whole time. The phone is a window into the session.

| Want | Do |
|---|---|
| Start a workspace with RC on | Launcher (default), or `claude --remote-control "Name"` |
| Turn RC on in a session already running | Type `/rc` (or `/remote-control`) |
| Turn it off | Type `/rc` again, or pass `-NoRemote` at launch |
| RC on for every Claude Code session | Set `"remoteControlAtStartup": true` in `~/.claude/settings.json`, or `/config` → Enable Remote Control for all sessions |
| Continue on phone | Claude app → Code → your session name |

**Requirements:** a claude.ai login on a Pro, Max, Team or Enterprise plan (API keys don't work). On **Team and Enterprise**, an org Owner must first enable Remote Control at claude.ai/admin-settings/claude-code.

**Why it isn't a skill:** Remote Control is a Claude Code launch flag and built-in command. Plugin skills can't turn it on, so the launcher does.

**Keep the machine awake.** If your laptop sleeps, the session pauses. It reconnects when the machine wakes.

---

## Scheduled and recurring work

| Need | Mechanism | Runs on | Machine on? | Sees local files? |
|---|---|---|---|---|
| Poll something while you work | `/loop 10m <prompt>` | This session | Yes, session open | Yes |
| Run with the laptop closed | `/schedule <when>, <what>` (cloud routines) | Anthropic cloud | No | Only a GitHub repo it can clone |
| Unattended run against this folder | OS job → `claude -p` | This machine | Yes | Yes |

`/automate` chooses among these. For OS jobs it writes the prompt to `automation/<name>.md` and registers the job:

```powershell
# Windows Task Scheduler (task folder: \cowork-cli\)
.\schedule-windows.ps1 -Name morning-brief -Workspace D:\ops -PromptFile automation\morning-brief.md -Weekdays -At 07:45
.\schedule-windows.ps1 -Name morning-brief -Remove
```

```bash
# cron
./schedule-cron.sh morning-brief ~/ops automation/morning-brief.md "45 7 * * 1-5"
./schedule-cron.sh morning-brief --remove
```

Each run pipes the prompt into `claude -p --permission-mode acceptEdits` inside the workspace, with the plugin loaded. It writes results and a dated log to `outputs/automation/<name>/`. Grant extra tools per job with `-AllowedTools "Bash(git *)"`. The scripts never use `--dangerously-skip-permissions`.

Scheduled runs use your Claude Code login on that machine. If the login expires, runs fail until you run `claude` and sign in again.

---

## Connectors and browser

- **Connectors** are MCP servers. `/connect` prefers each vendor's hosted OAuth endpoint, adds it with `--scope project` (written to `.mcp.json` in the workspace) and keeps secrets in environment variables. Sign in with `/mcp`. The category table is in [`plugins/cowork-cli/CONNECTORS.md`](plugins/cowork-cli/CONNECTORS.md).
- **Browser**: launch with `-Chrome` / `--chrome`, or run `/chrome` in the session. You need Chrome (or another Chromium browser) with the Claude in Chrome extension. It uses your real sign-ins and asks for per-site permission. It doesn't work under WSL.

---

## Sharing

**Sharing the plugin with your team**

1. Give teammates read access to `<owner>/cowork-cli` (Settings → Collaborators).
2. They run `/plugin marketplace add <owner>/cowork-cli` and then `/plugin install cowork-cli@cowork-cli`.
3. Updates: push to `main`. They pick up changes with `/plugin marketplace update cowork-cli`.

**Sharing a workspace** (instructions, task list, memory, connectors)

Put the workspace folder itself in a private repo. What gets committed:

| Commit | Don't commit |
|---|---|
| `CLAUDE.md`, `TASKS.md`, `CONNECTORS.md`, `.mcp.json`, `memory/`, `automation/*.md` | `outputs/automation/` (git-ignored by default), secrets, `CLAUDE.local.md` |

Whether `outputs/` should be committed depends on the team. Deliverables are often worth versioning.

Anyone who clones it and runs the launcher gets the same instructions, memory, tasks and connectors (each person signs in to OAuth connectors separately).

---

## Launcher reference

`cowork` needs no options. These are for people who want them:

| PowerShell | bash | Effect |
|---|---|---|
| first argument | first argument | Folder to work in (default: the current folder) |
| `-Name "<title>"` | `--name "<title>"` | Session name on the phone (default: the folder's name) |
| `-Quiet` | `--quiet` | Don't start with the brief / first-run welcome |
| `-Chrome` | `--chrome` | Enable Claude in Chrome |
| `-LocalBoard` | `--local-board` | Also start the optional localhost board server |
| `-NoRemote` | `--no-remote` | Plain local session |
| `-Dev` | `--dev` | Load the plugin from this copy even when it's installed |
| `-AddDir a,b` | `--add-dir a b` | Extra folders Claude may access |
| `-Model <id>` | `--model <id>` | Model override |
| `-Continue` | `--continue` | Resume the most recent session in this folder |
| `-PermissionMode acceptEdits` | `--permission-mode acceptEdits` | Starting permission mode |
| `cowork update` | `cowork update` | Update the plugin |

The launcher uses the installed plugin when there is one (so skills aren't loaded twice), lays out the workspace files on first use without overwriting anything, and starts Claude with `/cowork welcome` the first time and `/cowork` after that.

---

## Requirements

| | |
|---|---|
| Claude Code | Current release, signed in with claude.ai (Pro / Max / Team / Enterprise) |
| Windows | Native Claude Code plus Git for Windows (the session hook runs under Git Bash); PowerShell 5.1+ for the launcher and scheduler |
| macOS / Linux / WSL | bash; cron for scheduled runs |
| Board (optional) | Node.js 18+ on PATH |
| Remote Control | Team/Enterprise: enabled by an org Owner |
| Browser (optional) | Chrome or Chromium + Claude in Chrome extension |
| Office files (optional) | `anthropics/skills` document skills (and Python for them) |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Session doesn't show on the phone | Check that you're signed in with claude.ai, not an API key (`/login`). On Team/Enterprise, ask an Owner to enable Remote Control. Make sure the terminal session is still running and the machine is awake. |
| `/cowork`, `/tasks` etc. not found | Check that the plugin is loaded (`/plugin` → Installed). Run the installer again, or start with `cowork --dev` from a clone. |
| No workspace snapshot at session start (Windows) | Install Git for Windows so `bash` is on PATH, then restart the terminal. |
| Skills listed twice | You started `claude --plugin-dir …` yourself while the plugin is also installed. Start with `cowork` instead; it detects the installed plugin. |
| `.ps1 cannot be loaded because running scripts is disabled` | Use `cowork.cmd`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Scheduled job ran but nothing happened | Check `outputs/automation/<name>/*.log`. The usual causes are an expired login or a missing tool permission (`-AllowedTools`). |
| `/deliver` produced `.md` instead of `.docx` | The document skills aren't installed: `/plugin marketplace add anthropics/skills` |
| Board changes stay "waiting for Claude" | Press **Send to Claude** on the board, or say "sync the board" in the chat. |
| Board shows old content | Say "/board" to republish. Check `.cowork/web.json` has the Artifact link. |
| Send to Claude is greyed out | The board isn't open beside a conversation that can take it (for example, opened from the gallery on its own). Say "sync the board" in the chat instead. |
| Connector added but its tools are missing | Run `/mcp` and finish the OAuth sign-in, then restart the session |

---

## FAQ

**Does this replace Cowork?** No. It gives you the same way of working in a terminal. Use whichever surface fits the task. Workspace memory here is plain files, and it doesn't sync with the memory in the Claude app.

**Can Claude turn on Remote Control by itself?** No. It's a built-in command (`/rc`) or launch flag. That's why the launcher sets it.

**Is my data leaving my machine?** Files stay local. Prompts and the tool results Claude reads go to Anthropic as in any Claude Code session. Remote Control relays the conversation to your phone.

**Can I use it for code too?** Yes. It's a normal Claude Code session with extra knowledge-work behavior. Point it at a repo, or keep a separate workspace folder.

**How do I change the rules?** Edit `plugins/cowork-cli/context/operating-model.md` or a skill's `SKILL.md`, run `claude plugin validate .`, commit and push.

---

## Repository layout

```
cowork-cli/
├── DEPLOY-WITH-AN-AGENT.md                 setup rules for an AI assistant guiding a non-technical person
├── docs/getting-started-windows.md · getting-started-macos.md   plain-language setup guides
├── install.sh · install.ps1               one-line installers: plugin + `cowork` command (+ Explorer menu)
├── .claude-plugin/marketplace.json        marketplace manifest (plugin root: ./plugins)
└── plugins/cowork-cli/
    ├── .claude-plugin/plugin.json         plugin manifest
    ├── context/operating-model.md         how Claude works in a workspace
    ├── hooks/hooks.json                   SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd
    ├── hooks/scripts/session-start.sh     operating model + workspace snapshot
    ├── hooks/scripts/activity.mjs         board feed/status; injects dropped files + board messages
    ├── skills/
    │   ├── cowork/SKILL.md                /cowork     session brief
    │   ├── board/SKILL.md                 /board      visual tracker + drop zone
    │   ├── tasks/SKILL.md                 /tasks      TASKS.md
    │   ├── remember/SKILL.md              /remember   workspace memory
    │   ├── deliver/SKILL.md               /deliver    deliverables
    │   ├── automate/SKILL.md              /automate   scheduling
    │   └── connect/SKILL.md               /connect    MCP connectors
    ├── agents/deliverable-checker.md      fresh-eyes verification
    ├── scripts/
    │   ├── cowork.ps1 · cowork.cmd · cowork.sh          launchers (Remote Control on)
    │   ├── board/render.mjs · sync.mjs · lib.mjs        the web board: render the page, apply board changes
    │   ├── board/web/board.template.html                the board page (published as an Artifact)
    │   ├── board/server.mjs · board.mjs · index.html    optional local board server
    │   └── schedule-windows.ps1 · schedule-cron.sh      OS-level scheduled runs
    ├── templates/                         seeded into new workspaces
    ├── CONNECTORS.md
    └── README.md                          short plugin reference
```

Validate after any change:

```bash
claude plugin validate .
```

MIT licensed.
