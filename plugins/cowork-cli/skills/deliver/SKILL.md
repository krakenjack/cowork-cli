---
name: deliver
description: >
  This skill should be used when the user asks for a finished piece of work as a file — a report, memo,
  spreadsheet, deck, PDF, brief, one-pager, summary they'll share, or "put that in a doc / xlsx / pptx" —
  or says "/deliver". It picks the format, produces the file under outputs/, verifies it, and reports the path.
  It also governs how any deliverable produced during other work is finished and handed over.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, Skill, Agent, TodoWrite
argument-hint: "[what to produce] [--format md|docx|xlsx|pptx|pdf|html]"
---

# Deliverables

Everything the person will keep, edit, or share is a file in `outputs/`. Chat is for things read once.

## 1. Pick the format

| Content | Default format | Install for full fidelity |
|---|---|---|
| Memo, brief, report, notes, spec | `.md` (fast, diffable); `.docx` when they'll send it to someone outside | `docx` skill from `anthropics/skills` |
| Tables to sort / calculate, trackers, models | `.xlsx` with real formulas | `xlsx` skill |
| Something to present | `.pptx` | `pptx` skill |
| Print-final, signed, or archival | `.pdf` | `pdf` skill |
| Dashboards, calculators, interactive explainers | single self-contained `.html` | — |
| Data analysis | `.csv` of the data + `.html`/`.png` chart + numbers computed in code | — |

An explicit format request (`--format`, "as a Word doc", "xlsx") always wins. A format the person only refers to ("add it to my deck") that isn't in the workspace → ask which file, once.

Skills: check which document skills are installed before building (the `Skill` tool lists them). If the needed one is missing, produce `.md`/`.html` and say in one line which marketplace supplies the skill (`/plugin marketplace add anthropics/skills`).

## 2. Build

- Gather the material first (research, read inbox files, query connectors). Open the document skill only once content is in hand — templates before content yield polished, empty files.
- Long outputs: outline first, then sections, each written to the file as it's done.
- Name: `outputs/YYYY-MM-DD-<slug>.<ext>`. Never overwrite a previous deliverable; version with `-v2`.
- Inputs from `inbox/` stay untouched; work on a copy.

## 3. Check before handing over

The last todo item is always the check:

| Deliverable | Check |
|---|---|
| Facts / figures | Re-verify against the source; arithmetic re-run in code |
| `.docx` / `.pptx` / `.xlsx` | Open with the skill's reader or `python -c` and confirm it loads, page/slide count, formulas evaluate |
| `.html` | Render check: file opens, no console errors, works at phone width |
| Anything high-stakes (goes to a board, a customer, a regulator) | Delegate to the `deliverable-checker` agent — it hasn't seen the work being made |

## 4. Hand over

Final message: what it is (one line), the path, one line of context, one real next step if any, `Sources:` if research fed it. No step-by-step recap. If the person is on Remote Control, they open the path from the phone app's session view.
