---
name: cowork
description: >
  This skill should be used when the user starts a work session and wants a brief of where things stand,
  says "/cowork", "what's on my plate", "catch me up", "where were we", "start my session", "morning brief",
  or opens the session from their phone and asks what's going on. It reads the workspace (TASKS.md,
  memory/MEMORY.md, inbox/, outputs/) and returns a one-screen brief with the next action.
allowed-tools: Read, Glob, Grep, Bash(git *), Bash(ls *), TodoWrite
---

# Session brief

Produce a one-screen brief of the workspace and propose the next action. Do not start any task from the brief without being asked.

## Steps

1. Read `TASKS.md`. If missing, create it from `${CLAUDE_PLUGIN_ROOT}/templates/TASKS.md` and say so in one line.
2. Read `memory/MEMORY.md`. Open a topic file only when a task in TASKS.md references that subject.
3. List `inbox/` (files waiting) and the newest three files in `outputs/`.
4. If the folder is a git repo, run `git status --short` and `git log --oneline -5` for recent activity.
5. If Remote Control is not on and the person is on a phone, tell them to type `/rc` in the terminal — don't try to turn it on yourself; it is a built-in command.

## Output format

Keep to one phone screen. No preamble.

```
**Open** (n): the 3–5 most urgent items from TASKS.md, oldest due first
**Waiting on you**: anything blocked on a decision
**Inbox**: n files — names
**Last delivered**: newest output file + date
**Next**: one concrete action you recommend starting now
```

If `$ARGUMENTS` names a project or person, scope the brief to that subject: filter TASKS.md by it and read its memory topic file.

## Rules

- Facts only; don't pad with encouragement.
- Never list the whole task file. Point to `/tasks` for the full list.
- If TASKS.md has items past their due date, put them first and mark them `OVERDUE`.
