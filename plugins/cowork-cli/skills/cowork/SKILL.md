---
name: cowork
description: >
  This skill should be used when the user starts a work session and wants a brief of where things stand,
  says "/cowork", "what's on my plate", "catch me up", "where were we", "start my session", "morning brief",
  or opens the session from their phone and asks what's going on. It reads the workspace (TASKS.md,
  memory/MEMORY.md, inbox/, outputs/) and returns a one-screen brief with the next action. The `cowork`
  launcher starts every session with it; "/cowork welcome" is the first-run setup of a new folder.
allowed-tools: Read, Glob, Grep, Bash(git *), Bash(ls *), TodoWrite
---

# Session brief

Produce a one-screen brief of the workspace and propose the next action. Do not start any task from the brief without being asked.

The person may be non-technical and is probably reading on a phone. Never mention file names like CLAUDE.md, plugins, hooks or commands unless they ask; talk about "this folder", "your task list", "the board".

## Welcome (first run)

When `$ARGUMENTS` is `welcome`, or `CLAUDE.md` still contains `~~your name`, set the folder up instead of giving a brief:

1. Greet them in one line: this folder is now their Cowork space; you'll keep their tasks, files and notes here.
2. Ask, in one short message: what should you call them, and what is this folder for (a line is enough)? Mention they can also say anything you should always check with them first.
3. When they answer, fill in `CLAUDE.md` (Who, What this folder is for, Standing instructions: add their "ask me first" items; leave unknown fields out rather than keeping `~~` placeholders) and add a `[stated]` line to `memory/profile.md`. Don't show them the file.
4. Open the board (`/board`): their task list and a place to drop files, beside this chat.
5. End with two or three example requests that fit what they said the folder is for, in their words, and say they can drop files on the board or attach them here.

## Brief (every other session)

### Steps

1. Read `TASKS.md`. If missing, create it from `${CLAUDE_PLUGIN_ROOT}/templates/TASKS.md` and say so in one line.
2. Read `memory/MEMORY.md`. Open a topic file only when a task in TASKS.md references that subject.
3. List `inbox/` (files waiting) and the newest three files in `outputs/`.
4. If the folder is a git repo, run `git status --short` and `git log --oneline -5` for recent activity.
5. If Remote Control is not on and the person is on a phone, tell them to type `/rc` in the terminal — don't try to turn it on yourself; it is a built-in command.
6. Board: if the session-start snapshot says the board is published but the workspace changed since, republish it (the board skill, Open step 3). If it was never published, offer it in the **Next** line; don't publish unasked.

### Output format

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
