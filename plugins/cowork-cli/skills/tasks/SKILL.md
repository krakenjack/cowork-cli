---
name: tasks
description: >
  This skill should be used when the user asks about their tasks or commitments, wants to add, complete,
  reprioritize, or delete a task, says "/tasks", "add a task", "what's due", "mark that done",
  "what am I supposed to do for X", or mentions a deadline they need tracked. It manages the shared
  TASKS.md file in the workspace.
allowed-tools: Read, Edit, Write, Glob, Grep
argument-hint: "[add|done|list|due|clear] [text]"
---

# Task list (TASKS.md)

Manage the workspace's `TASKS.md`. It is the single source of truth for open commitments in this folder; the person may also edit it by hand, so always read it fresh before writing.

## File format

```markdown
# Tasks

## Active
- [ ] Send Q3 budget summary to finance — due 2026-10-03 — #finance @alex
- [ ] Review API rate limits — #platform

## Waiting
- [ ] Hardware quote — waiting on vendor, asked 2026-09-25

## Done
- [x] Draft onboarding spec — 2026-09-22
```

Conventions:
- One task per line, checkbox first.
- `— due YYYY-MM-DD` when a date exists. `#tag` for project, `@name` for the other person involved.
- `Waiting` holds items blocked on someone else; note who and when asked.
- `Done` keeps the completion date. Prune Done entries older than 30 days when the section passes 25 lines.

## Operations

| Argument | Action |
|---|---|
| `add <text>` | Append to Active. Parse dates ("Friday", "Oct 3") into `due YYYY-MM-DD`. Pull `#tag`/`@name` from context. |
| `done <text>` | Move the best-matching open item to Done with today's date. Confirm which one in one line. If ambiguous, list the candidates. |
| `list` / no args | Show Active sorted by due date, then Waiting. |
| `due` | Show only items with a due date within 7 days, overdue first. |
| `clear` | Prune Done per the rule above. |
| free text | Interpret intent ("I finished the budget thing", "remind me to call the vendor Tuesday"). |

## Rules

- Create `TASKS.md` from `${CLAUDE_PLUGIN_ROOT}/templates/TASKS.md` if it doesn't exist.
- Never rewrite the whole file when an `Edit` on one line will do.
- When a task is completed as part of other work in the session, move it to Done without being asked and mention it in one line.
- When the person adds a task with a person's name you don't have in memory, don't ask — file the task; `/remember` handles people.
- Do not add tasks the person didn't state (no "suggested" items).
