---
name: automate
description: >
  This skill should be used when the user wants something to run later or on a schedule — "every weekday
  at 8 summarize my inbox", "check this again in an hour", "run this nightly", "/automate", "set up a
  recurring task", "remind me to", or asks which scheduling option to use. It picks between Claude Code's
  built-in /schedule (cloud routines), /loop (in-session), and an OS-level job (Windows Task Scheduler or
  cron) that runs `claude -p` inside this workspace, and sets the chosen one up.
allowed-tools: Read, Write, Edit, Bash, Glob
argument-hint: "[when] [what]"
---

# Scheduled and recurring runs

Four mechanisms, one decision:

| Need | Use | Runs where | Machine must be on? | Has this folder? |
|---|---|---|---|---|
| Re-check something while this session is open ("poll CI every 5 min") | built-in `/loop <interval> <prompt>` | this session | yes, session open | yes |
| Runs when the laptop is off; works on a GitHub repo, not local files | built-in `/schedule <when>, <what>` (cloud routines, claude.ai/code/routines) | Anthropic cloud | no | only if the folder is a GitHub repo it can clone |
| Runs on this machine, against this folder, unattended | OS job running `claude -p` (scripts below) | this machine | yes | yes, full |
| A nudge to the person, no Claude work | Their calendar/reminders app or a `/schedule` that just posts a note | — | — | — |

Default: local files or connectors that only exist on this machine → **OS job**. Repo-based or "even when I'm asleep with the laptop closed" → **`/schedule`**. Short-lived polling → **`/loop`**.

## Setting up an OS job

1. Write the prompt to `automation/<slug>.md` in the workspace. Make it a complete standalone instruction: each run is a fresh session with no memory of this conversation. Tell it where to put results (`outputs/automation/<slug>/YYYY-MM-DD.md`) and to update `TASKS.md` if it finds new commitments.
2. Register the job:
   - **Windows**: `powershell -ExecutionPolicy Bypass -File "${CLAUDE_PLUGIN_ROOT}/scripts/schedule-windows.ps1" -Name <slug> -Workspace "<folder>" -PromptFile "automation/<slug>.md" -Daily 08:00` (or `-Weekdays`, `-EveryMinutes 60`). Run it and confirm with `schtasks /Query /TN "cowork-cli\<slug>"`.
   - **macOS/Linux**: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/schedule-cron.sh" <slug> "<folder>" "automation/<slug>.md" "0 8 * * 1-5"`.
   Both scripts run `claude -p` with `--permission-mode acceptEdits`, `--add-dir` for the workspace, and `--plugin-dir` for this plugin, and log stdout to `outputs/automation/<slug>/`.
3. Show the person the exact command that was registered and how to remove it (`schtasks /Delete /TN "cowork-cli\<slug>" /F` or `crontab -e`).

Permission modes for unattended runs: `acceptEdits` for file work inside the workspace; add `--allowedTools "Bash(git *)"` etc. only for what the job needs. Never `--dangerously-skip-permissions` in a scheduled job.

## Setting up `/schedule` or `/loop`

These are built-in commands the person types in the terminal; you can't invoke them. Give them the exact line to type, e.g. `/schedule weekdays at 8am, summarize open PRs in this repo and post the list to outputs/`. Cloud routines run with at least an hourly minimum interval and need the folder to be a GitHub repository they can access.

## Rules

- Don't create a schedule until the person has confirmed the time and the prompt text — schedules are cheap to set up and annoying to discover later.
- One job per purpose; check existing jobs first (`schtasks /Query /FO LIST | findstr cowork-cli` or `crontab -l`).
- State the time zone you used (from `CLAUDE.md`; ask if it isn't set).
