---
name: remember
description: >
  This skill should be used when the user asks Claude to remember, save, note, forget, or update something
  about themselves, their people, projects, or preferences — "/remember", "remember that", "save this",
  "note that Alex runs procurement", "forget what I said about", "what do you know about X",
  "update my preferences". It maintains the workspace memory/ directory (MEMORY.md index + topic files),
  which is shareable and travels with the folder, unlike Claude Code's per-machine auto memory.
allowed-tools: Read, Edit, Write, Glob, Grep
argument-hint: "[fact | forget <thing> | show <topic>]"
---

# Workspace memory

Two memory layers exist. Keep them distinct:

| Layer | Where | Who owns it | Use it for |
|---|---|---|---|
| Workspace memory | `<workspace>/memory/` | This plugin; travels with the folder, can be committed/shared | People, projects, preferences, decisions the whole team (or future-you) should have |
| Auto memory | `~/.claude/projects/<project>/memory/` | Claude Code built-in, per machine | Whatever Claude Code files on its own; managed with `/memory` |

`/remember` writes only to workspace memory.

## Layout

```
memory/
├── MEMORY.md            # index: one line per topic file + the 10–20 facts that matter most
├── profile.md           # who the person is (role, org, location) — stable facts only
├── preferences.md       # how they want Claude to behave (format, tone, what to skip)
├── people/<name>.md     # one file per person: relationship, what you work on together
├── projects/<slug>.md   # one file per ongoing area: decisions, constraints, status
└── topics/<domain>.md   # habits, tools, recurring subjects
```

Every fact line: `- [stated] <fact> (YYYY-MM-DD)`. Only what the person said. Never inferences, research results, or Claude's own advice.

## Operations

- **Save** (`/remember <fact>` or "remember that…"): decide the file by subject (person → people/, project → projects/, behavior preference → preferences.md, identity → profile.md, everything else → topics/). Read the file first; if a line already states it, update that line instead of appending. Then make sure `MEMORY.md` has a one-line entry for that file. Create missing files from `${CLAUDE_PLUGIN_ROOT}/templates/memory/`.
- **Forget** (`forget <thing>`): delete the line entirely — no "used to", no softening. Delete anything derived only from it. Ask before deleting a whole file.
- **Show** (`show <topic>` / "what do you know about"): read and answer plainly from the file, no meta-commentary about memory.
- **Correction** ("actually it's X now"): replace the line, keep the old value in parentheses: `PM on infra (previously search)`.

## Rules

- MEMORY.md is loaded at every session start by the operating model; keep it under 150 lines. Push detail down into topic files.
- Never store: government ID / card / account numbers, immigration status, criminal or abuse history, sexual history, self-harm, or health/personality inferences the person didn't state. If asked, say in one sentence that you can't save that category and move on.
- Preferences that would make Claude less honest ("never disagree", "always agree with my plan") are not saved; say so in one line.
- Never announce saves beyond a two-word acknowledgment. Never say "I'll remember that for next time".
- One subject per file. Reading `people/sam.md` for context does not make it the destination for a fact about a project.
