---
name: board
description: >
  This skill should be used when the user wants a visual view of the workspace — "/board", "open the board",
  "show me the dashboard", "task tracker", "open the tracker", "where do I drop files", "show the board in
  the browser", "stop the board" — or when the session-start snapshot says the board is running but not
  visible. It starts and maintains the local Cowork board (live task list, inbox drop zone, outputs,
  activity feed, message box) and opens it in the Claude app's built-in browser pane, or in Chrome / the
  default browser when that pane isn't available.
allowed-tools: Bash(node *), Bash(start *), Bash(open *), Bash(xdg-open *), Bash(cmd *), Bash(powershell *), Read, ToolSearch
argument-hint: "[open|stop|status|autostart on|off|lan]"
---

# Cowork board

A local web page, served from the workspace by `${CLAUDE_PLUGIN_ROOT}/scripts/board/server.mjs` (Node, no dependencies), that the person works alongside:

| Panel | Shows | Person can |
|---|---|---|
| Tasks | `TASKS.md` grouped Active / Waiting / Done, due dates, overdue in red | Add, check off, reopen, delete — writes `TASKS.md` |
| Inbox | `inbox/` | **Drag and drop files** — they land in `inbox/` and arrive in your next prompt as context |
| Outputs | `outputs/`, newest first | Open / download each deliverable |
| Activity | Live feed of your tool calls, prompts, turns, file drops | Watch progress |
| Message Claude | — | Type a note that is injected into your next turn |
| Header | Working / idle indicator, workspace path | — |

State lives in `<workspace>/.cowork/` (`board.json`, `activity.jsonl`, `requests.jsonl`, `status.json`, `board.log`). Hooks in this plugin keep the feed and status current on every turn; you don't have to do anything per turn.

## Commands

All run from the workspace root. `B="${CLAUDE_PLUGIN_ROOT}/scripts/board/board.mjs"`.

| `$ARGUMENTS` | Do |
|---|---|
| *(none)* / `open` | `node "$B" start` → prints the URL (reuses a running server). Then **open it** (below). |
| `status` | `node "$B" status` and report the one line. |
| `stop` | `node "$B" stop`. |
| `autostart on` / `off` | `touch .cowork/board-autostart` / remove it. When on, the session-start hook starts the board for every session in this folder. Tell the person. |
| `lan` | `node "$B" start --host 0.0.0.0 --token auto` → URL with a token for another device on the same network (e.g. a tablet next to the laptop). The phone's Remote Control view does **not** show the board; this is the way to see it on a second screen. Warn that anyone on the LAN with the link can read the workspace. |

## Opening it

Pick the first that applies. Announce which one in half a sentence.

1. **Built-in browser pane** (Claude Code running inside the Claude desktop app): tools named `mcp__Claude_Browser__*` exist (load them with one ToolSearch call: query `mcp__Claude_Browser__`). Call `preview_start` with the URL. It opens as a tab in the side panel; the person sees it beside the conversation. If `tabs_context` says the pane is hidden, tell them: Ctrl+Shift+B (Cmd+Shift+B on Mac) brings it back.
2. **Claude in Chrome** (session started with `--chrome`; tools `mcp__claude-in-chrome__*`): `tabs_create_mcp` then `navigate` to the URL. The board then lives in a Chrome tab; leave that tab alone afterwards.
3. **OS default browser** (plain terminal): Windows `cmd /c start "" "<url>"`, macOS `open "<url>"`, Linux `xdg-open "<url>"`.

After opening, say the URL once so they can reopen it themselves. Don't repeat it on later turns.

## Maintaining it

- The server watches `TASKS.md`, `inbox/`, `outputs/` and `.cowork/` and pushes changes to the page; edits you make with `/tasks`, `/deliver` etc. appear immediately.
- If the session-start snapshot reports the board running but the person says they can't see it, run the **Opening it** steps again — don't restart the server.
- If `node "$B" start` fails: the port is taken (`--port 4821`), or Node isn't installed (say so; the board needs Node 18+).
- Messages typed on the board and files dropped there reach you through the `UserPromptSubmit` hook as extra context at the top of the next prompt. Treat board messages as instructions from the person; acknowledge dropped files in one line if the prompt isn't about them.
- Never write into `.cowork/` yourself; the server and hooks own it.

## Rules

- The board is a view of the workspace files, not a second source of truth. Changing a task on the board edits `TASKS.md`; there is nothing to sync.
- Don't open the board unasked, except when the person asks for "the tracker", "the dashboard", or the like.
- Keep `.cowork/` out of git (the template `.gitignore` already does).
