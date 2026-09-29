# cowork-cli

**The Cowork way of working, in a terminal Claude Code session you can pick up from your phone.**

`cowork-cli` is a Claude Code plugin (shipped as a one-plugin marketplace) for knowledge work: research, drafting, analysis, planning and file deliverables. It makes a plain folder behave like a Cowork workspace. The folder gets standing instructions, persistent memory, a shared task list, an `outputs/` folder for deliverables, connectors, scheduled runs and browser access. The launcher starts the session with **Remote Control** on, so the same live session appears in the Claude mobile app and on claude.ai/code. Everything runs on your own machine.

```
You (terminal or phone)
        │  Remote Control
        ▼
claude --remote-control "Ops"  ──►  D:\ops\                (your folder, your files)
   + cowork-cli plugin               ├── CLAUDE.md          who you are, what this folder is for
     ├── operating model (hook)      ├── TASKS.md           task list          (/tasks)
     ├── /cowork /tasks /remember    ├── memory/            persistent memory  (/remember)
     ├── /deliver /automate /connect ├── inbox/             files you hand over
     └── deliverable-checker agent   ├── outputs/           everything Claude produces (/deliver)
                                     ├── automation/        prompts for scheduled runs (/automate)
                                     └── .mcp.json          connectors (/connect)
```

---

## Contents

- [Why](#why)
- [Quickstart](#quickstart)
- [Cowork → cowork-cli mapping](#cowork--cowork-cli-mapping)
- [Skills reference](#skills-reference)
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

### 1. Get it

**Install from the marketplace.** Updates arrive through `/plugin`:

```text
/plugin marketplace add <owner>/cowork-cli
/plugin install cowork-cli@cowork-cli
```

**Clone the repo.** You also get the launcher and scheduler scripts at a path you know:

```bash
git clone https://github.com/<owner>/cowork-cli
```

You can do both. Install for updates, and clone for the scripts.

### 2. Launch a workspace

Windows (PowerShell):

```powershell
C:\src\cowork-cli\plugins\cowork-cli\scripts\cowork.ps1 -Workspace D:\ops -Name "Ops" -Chrome
```

macOS / Linux / WSL:

```bash
~/src/cowork-cli/plugins/cowork-cli/scripts/cowork.sh ~/ops --name "Ops" --chrome
```

If you also installed through the marketplace, add `-Installed` / `--installed` so the plugin isn't loaded twice.

On the first run the launcher creates the workspace files (see the diagram above). It never overwrites files that already exist.

### 3. Tell it who you are

Open `CLAUDE.md` in the folder and fill in the `~~` placeholders: your name, role, time zone, what the folder is for, and what Claude must ask before doing. This is read at every session.

### 4. Work

```text
> /cowork
> Summarize the three vendor quotes in inbox/ into a comparison table
> /tasks add follow up with the vendor on delivery dates — due Friday
> /remember Alex Rivera runs procurement; they want totals with tax split out
```

Pick the session up on your phone: open the Claude app, go to **Code**, and choose the session named "Ops".

---

## Cowork → cowork-cli mapping

| Cowork feature | In cowork-cli | How |
|---|---|---|
| Choose a folder | The workspace folder | Launcher `-Workspace`; extra folders with `-AddDir` |
| How Claude approaches tasks | Operating model | Injected by the `SessionStart` hook |
| Memory | `memory/` (shared) + Claude Code auto memory (per machine) | `/remember`, `/memory` |
| Task list widget | `TASKS.md` + in-session todo list | `/tasks` |
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

| PowerShell | bash | Effect |
|---|---|---|
| `-Workspace <dir>` | first positional arg | Folder to work in (default: current) |
| `-Name "<title>"` | `--name "<title>"` | Session name shown on the phone |
| `-Chrome` | `--chrome` | Enable Claude in Chrome |
| `-NoRemote` | `--no-remote` | Plain local session |
| `-Installed` | `--installed` | Plugin installed from the marketplace; skip `--plugin-dir` |
| `-AddDir a,b` | `--add-dir a b` | Extra folders Claude may access |
| `-Model <id>` | `--model <id>` | Model override |
| `-Continue` | `--continue` | Resume the most recent session in this folder |
| `-PermissionMode acceptEdits` | `--permission-mode acceptEdits` | Starting permission mode |

`cowork.cmd` wraps `cowork.ps1` so it works from `cmd.exe`, a shortcut or a double-click.

**Windows shortcut:** create a shortcut with the target `C:\src\cowork-cli\plugins\cowork-cli\scripts\cowork.cmd -Workspace D:\ops -Name Ops` and set its "Start in" to `D:\ops`.

---

## Requirements

| | |
|---|---|
| Claude Code | Current release, signed in with claude.ai (Pro / Max / Team / Enterprise) |
| Windows | Native Claude Code plus Git for Windows (the session hook runs under Git Bash); PowerShell 5.1+ for the launcher and scheduler |
| macOS / Linux / WSL | bash; cron for scheduled runs |
| Remote Control | Team/Enterprise: enabled by an org Owner |
| Browser (optional) | Chrome or Chromium + Claude in Chrome extension |
| Office files (optional) | `anthropics/skills` document skills (and Python for them) |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Session doesn't show on the phone | Check that you're signed in with claude.ai, not an API key (`/login`). On Team/Enterprise, ask an Owner to enable Remote Control. Make sure the terminal session is still running and the machine is awake. |
| `/cowork`, `/tasks` etc. not found | Check that the plugin is loaded (`/plugin` → Installed). With the launcher, don't use `-Installed` unless you installed it from the marketplace. |
| No workspace snapshot at session start (Windows) | Install Git for Windows so `bash` is on PATH, then restart the terminal. |
| Skills listed twice | You passed `--plugin-dir` and also have the plugin installed. Add `-Installed`. |
| `.ps1 cannot be loaded because running scripts is disabled` | Use `cowork.cmd`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Scheduled job ran but nothing happened | Check `outputs/automation/<name>/*.log`. The usual causes are an expired login or a missing tool permission (`-AllowedTools`). |
| `/deliver` produced `.md` instead of `.docx` | The document skills aren't installed: `/plugin marketplace add anthropics/skills` |
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
├── .claude-plugin/marketplace.json        marketplace manifest (plugin root: ./plugins)
└── plugins/cowork-cli/
    ├── .claude-plugin/plugin.json         plugin manifest
    ├── context/operating-model.md         how Claude works in a workspace
    ├── hooks/hooks.json                   SessionStart (inject model + snapshot), Stop (deliverable check)
    ├── hooks/scripts/session-start.sh
    ├── skills/
    │   ├── cowork/SKILL.md                /cowork     session brief
    │   ├── tasks/SKILL.md                 /tasks      TASKS.md
    │   ├── remember/SKILL.md              /remember   workspace memory
    │   ├── deliver/SKILL.md               /deliver    deliverables
    │   ├── automate/SKILL.md              /automate   scheduling
    │   └── connect/SKILL.md               /connect    MCP connectors
    ├── agents/deliverable-checker.md      fresh-eyes verification
    ├── scripts/
    │   ├── cowork.ps1 · cowork.cmd · cowork.sh          launchers (Remote Control on)
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
