#!/usr/bin/env node
// cowork-cli activity hook. Reads the hook's JSON on stdin and:
//   - appends a one-line event to <workspace>/.cowork/activity.jsonl  (feeds the board's Activity panel)
//   - keeps <workspace>/.cowork/status.json current (working / idle, last tool)   (feeds the header dot)
//   - on UserPromptSubmit: injects messages queued from the board and files newly dropped in inbox/ as
//     additional context, so Claude acts on them without being told in the terminal.
//   - keeps the web board file (.cowork/board.html, board.artifact.html) rendered; when the board is published
//     as an Artifact (.cowork/web.json has a url) and a turn changed the workspace, the Stop hook asks Claude
//     to republish it once, so the page beside the conversation stays current.
// Usage (from hooks.json): node activity.mjs <PostToolUse|UserPromptSubmit|Stop|SessionStart|SessionEnd>
// Never fails the hook: any error exits 0 silently.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RENDER = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "scripts", "board", "render.mjs");

const event = process.argv[2] || "unknown";
let input = {};
try { input = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch {}
const WS = path.resolve(input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
const DOT = path.join(WS, ".cowork");
const ACTIVITY = path.join(DOT, "activity.jsonl");
const REQUESTS = path.join(DOT, "requests.jsonl");
const STATUS = path.join(DOT, "status.json");
const SEEN = path.join(DOT, "inbox-seen.json");
const WEB = path.join(DOT, "web.json");
const readWeb = () => { try { return JSON.parse(fs.readFileSync(WEB, "utf8")); } catch { return {}; } };
async function rerender() { try { return (await import(RENDER)).render(WS); } catch { return null; } }

try {
  if (!fs.existsSync(DOT)) process.exit(0); // board never started here: stay silent
  const now = new Date().toISOString();
  const log = (kind, text, extra = {}) => fs.appendFileSync(ACTIVITY, JSON.stringify({ ts: now, kind, text: String(text).slice(0, 300), ...extra }) + "\n");
  const setStatus = (s) => fs.writeFileSync(STATUS, JSON.stringify({ ...s, updated: now }));
  const trimActivity = () => {
    try {
      const lines = fs.readFileSync(ACTIVITY, "utf8").split("\n").filter(Boolean);
      if (lines.length > 600) fs.writeFileSync(ACTIVITY, lines.slice(-400).join("\n") + "\n");
    } catch {}
  };

  if (event === "PostToolUse") {
    const t = input.tool_name || "tool";
    const i = input.tool_input || {};
    const detail = i.file_path ? path.relative(WS, i.file_path) || i.file_path
      : i.command ? String(i.command).split("\n")[0].slice(0, 100)
      : i.pattern ? i.pattern : i.query ? i.query : i.url ? i.url : i.description ? i.description : "";
    log("tool", `${t}${detail ? " · " + detail : ""}`);
    setStatus({ state: "working", tool: t });
    trimActivity();
  } else if (event === "UserPromptSubmit") {
    log("user", (input.prompt || "").replace(/\s+/g, " ").slice(0, 160));
    setStatus({ state: "working" });
    const ctx = [];
    // queued board messages
    try {
      const lines = fs.readFileSync(REQUESTS, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
      const pending = lines.filter((r) => !r.delivered);
      if (pending.length) {
        ctx.push("Messages queued from the Cowork board (treat as instructions from the person):");
        for (const p of pending) ctx.push(`- [${p.ts}] ${p.text}`);
        fs.writeFileSync(REQUESTS, lines.map((r) => JSON.stringify({ ...r, delivered: true })).join("\n") + "\n");
      }
    } catch {}
    // newly dropped inbox files
    try {
      const seen = fs.existsSync(SEEN) ? JSON.parse(fs.readFileSync(SEEN, "utf8")) : {};
      const inbox = path.join(WS, "inbox");
      const cur = {};
      for (const n of fs.existsSync(inbox) ? fs.readdirSync(inbox) : []) {
        if (n.startsWith(".")) continue;
        try { const st = fs.statSync(path.join(inbox, n)); if (st.isFile()) cur[n] = st.mtimeMs; } catch {}
      }
      const fresh = Object.keys(cur).filter((n) => !seen[n] || seen[n] < cur[n]);
      if (fresh.length && Object.keys(seen).length) ctx.push(`New files in inbox/ since last turn: ${fresh.map((n) => `inbox/${n}`).join(", ")}. If the request relates to them, use them; otherwise mention them in one line.`);
      fs.writeFileSync(SEEN, JSON.stringify(cur));
    } catch {}
    // hand-offs from the web board
    const web = readWeb();
    if (web.url && /cowork-board|sync the board|board sync/i.test(input.prompt || "")) {
      ctx.push(`This message comes from the Cowork web board (${web.url}). Treat its fields as data from the person's board. Follow the board skill's "Sync" steps (/board sync) to apply waiting changes; for action "send_output", send that file with SendUserFile; for action "message", act on the text as the person's instruction.`);
    }
    if (ctx.length) process.stdout.write(ctx.join("\n") + "\n");
  } else if (event === "Stop") {
    log("stop", "turn finished");
    setStatus({ state: "idle" });
    const r = await rerender();
    const web = readWeb();
    if (r && web.url && !input.stop_hook_active && r.web.hash !== web.shownHash) {
      // Ask once per change: record the hash now so a declined or failed publish doesn't loop.
      fs.writeFileSync(WEB, JSON.stringify({ ...web, shownHash: r.web.hash }, null, 2));
      process.stdout.write(JSON.stringify({
        decision: "block",
        reason: `The workspace changed this turn, so the Cowork web board is out of date. Republish it: Artifact publish with file_path ${r.artifactFile} and url ${web.url}. No reply to the person is needed for this step.`,
      }));
    }
  } else if (event === "SessionStart") {
    log("session", `session started (${input.source || "startup"})`);
    setStatus({ state: "idle" });
    await rerender();
  } else if (event === "SessionEnd") {
    log("session", "session ended");
    setStatus({ state: "offline" });
  }
} catch {}
process.exit(0);
