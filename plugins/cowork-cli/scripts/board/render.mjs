#!/usr/bin/env node
// cowork-cli web board: renders the workspace into one self-contained HTML page. No server.
//
//   node render.mjs [--workspace <dir>] [--quiet]
//
// Writes, under <workspace>/.cowork/:
//   board.html           complete document; open it in any browser or send it to the Claude side panel
//   board.artifact.html  the same page as an Artifact body (no doctype/html/head/body; the Artifact tool adds them)
//   web.json             render bookkeeping: content hash of the last render, artifact url once published
// Prints a one-line summary (or nothing with --quiet). The page is complete as a static snapshot. Published as
// an Artifact with the db / assets / room capabilities it also takes task edits, file drops and messages; those
// wait in the artifact's `inbound` collection until `sync.mjs` applies them to the workspace.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseTasks, listDir, tailJsonl, readJson } from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(__dirname, "web", "board.template.html");

// Files the board can show without leaving the page: small text-like files and images are embedded in the
// page itself, so clicking one opens a viewer (published board and snapshot alike). Bigger or other files use
// the copy the board already holds (files dropped on it) or ask Claude to send them into the chat.
const TEXT_EXT = { ".md": "md", ".markdown": "md", ".txt": "text", ".log": "text", ".json": "text", ".csv": "csv", ".tsv": "csv", ".yaml": "text", ".yml": "text" };
const IMAGE_EXT = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml" };
const MAX_TEXT = 256 * 1024, MAX_IMAGE = 1536 * 1024, BUDGET = 6 * 1024 * 1024;

function attachViews(ws, files, assets, budget) {
  for (const f of files) {
    if (f.dir) continue;
    const a = assets[f.rel];
    if (a && a.size === f.size) f.asset = { id: a.id, encoding: a.encoding || "" };
    const ext = path.extname(f.name).toLowerCase();
    try {
      if (TEXT_EXT[ext] && f.size <= MAX_TEXT && f.size <= budget.left) {
        f.view = { kind: TEXT_EXT[ext], text: fs.readFileSync(path.join(ws, f.rel), "utf8") };
        budget.left -= f.size;
      } else if (IMAGE_EXT[ext] && f.size <= MAX_IMAGE && f.size * 1.37 <= budget.left) {
        f.view = { kind: "image", src: `data:${IMAGE_EXT[ext]};base64,${fs.readFileSync(path.join(ws, f.rel)).toString("base64")}` };
        budget.left -= Math.ceil(f.size * 1.37);
      }
    } catch {}
  }
  return files;
}

export function buildState(ws) {
  let tasksText = "";
  try { tasksText = fs.readFileSync(path.join(ws, "TASKS.md"), "utf8"); } catch {}
  const { items } = parseTasks(tasksText);
  let memory = null;
  try {
    const m = fs.readFileSync(path.join(ws, "memory", "MEMORY.md"), "utf8");
    memory = { lines: m.split("\n").length, facts: m.split("\n").filter((l) => /^\s*-\s*\[stated\]/.test(l)).length };
  } catch {}
  const dot = path.join(ws, ".cowork");
  const assets = readJson(path.join(dot, "web.json"), {}).assets || {};
  const budget = { left: BUDGET };
  const outputs = attachViews(ws, listDir(ws, "outputs"), assets, budget);
  const inbox = attachViews(ws, listDir(ws, "inbox"), assets, budget);
  return {
    name: path.basename(ws),
    workspace: ws,
    generated: new Date().toISOString(),
    tasks: items.map(({ line, ...t }) => t),
    inbox,
    outputs,
    memory,
    session: readJson(path.join(dot, "status.json"), {}),
    activity: tailJsonl(path.join(dot, "activity.jsonl"), 40).reverse(),
  };
}

// What the person would notice changing. Activity and timestamps are left out so a turn that only
// read files doesn't count as a change.
export function contentHash(state) {
  const pick = {
    tasks: state.tasks,
    inbox: state.inbox.map((f) => [f.name, f.size, f.mtime]),
    outputs: state.outputs.map((f) => [f.name, f.size, f.mtime]),
    memory: state.memory,
  };
  return crypto.createHash("sha1").update(JSON.stringify(pick)).digest("hex").slice(0, 16);
}

// ---------- static markup (the page is complete without script) ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtSize = (n) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
const cleanTaskText = (t) => t.replace(/\s*—\s*due\s+\d{4}-\d{2}-\d{2}/i, "").replace(/\s*—\s*\d{4}-\d{2}-\d{2}\s*$/, "")
  .replace(/(^|\s)[#@][\w-]+/g, "").replace(/\s*—\s*$/, "").replace(/\s{2,}/g, " ").trim();
const isoMinute = (ms) => new Date(ms).toISOString().slice(0, 16).replace("T", " ") + " UTC";

function taskHtml(t) {
  const meta = [
    t.due ? `<span class="due${t.overdue ? " over" : ""}">${t.overdue ? "Overdue" : "Due"} ${esc(t.due)}</span>` : "",
    ...t.tags.map((x) => `<span class="tag">${esc(x)}</span>`),
    ...t.people.map((x) => `<span class="who">${esc(x)}</span>`),
  ].join("");
  return `<li class="task${t.done ? " done" : ""}" data-key="${esc(t.key)}" data-text="${esc(t.text)}">
<input type="checkbox" id="t-${esc(t.key)}"${t.done ? " checked" : ""} disabled aria-label="${t.done ? "Reopen" : "Mark done"}">
<div class="t"><label for="t-${esc(t.key)}">${esc(cleanTaskText(t.text) || t.text)}</label>${meta ? `<div class="meta">${meta}</div>` : ""}</div>
<button class="x live-only" type="button" aria-label="Delete task">×</button></li>`;
}

function tasksHtml(tasks) {
  const groups = {};
  for (const t of tasks) (groups[t.section || "Active"] ||= []).push(t);
  const order = ["Active", "Waiting", ...Object.keys(groups).filter((k) => !["Active", "Waiting", "Done"].includes(k)), "Done"];
  let html = "";
  for (const g of order) {
    const items = groups[g];
    if (!items || !items.length) continue;
    const sorted = g === "Done" ? items.slice(-8).reverse() : items.slice().sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
    html += `<h3 class="sub">${esc(g)}${g === "Done" && items.length > 8 ? ` · last 8 of ${items.length}` : ""}</h3><ul class="tasklist" data-section="${esc(g)}">${sorted.map(taskHtml).join("")}</ul>`;
  }
  return html || `<p class="empty">No tasks yet.</p>`;
}

// Each file row: the name is a button when the page can show the file (embedded view), and the script turns it
// into a link when the board holds a copy (asset) or adds an Open button that asks Claude for it.
function filesHtml(arr, emptyText) {
  if (!arr.length) return `<li class="empty">${emptyText}</li>`;
  return arr.map((f) => {
    const attrs = `data-rel="${esc(f.rel)}"${f.view ? ` data-view="1"` : ""}${f.asset && !f.asset.encoding ? ` data-asset="${esc(f.asset.id)}"` : ""}`;
    const name = f.view ? `<button type="button" class="open-file">${esc(f.name)}</button>` : esc(f.name);
    return `<li ${attrs}><span class="n">${f.dir ? "▸ " : ""}${name}</span><span class="s">${f.dir ? "" : fmtSize(f.size)}</span><time class="d" data-ms="${f.mtime}">${isoMinute(f.mtime)}</time></li>`;
  }).join("");
}

function activityHtml(acts) {
  if (!acts.length) return `<li class="empty">Nothing yet.</li>`;
  return acts.map((a) => `<li><time class="ts" data-iso="${esc(a.ts)}">${esc(String(a.ts).slice(11, 16))}</time><span class="txt"><span class="k k-${esc(a.kind)}">${esc(a.kind)}</span>${esc(a.text)}</span></li>`).join("");
}

export function renderBody(state, template) {
  const open = state.tasks.filter((t) => !t.done).length;
  const busy = state.session && state.session.state === "working";
  const fill = {
    NAME: esc(state.name),
    WORKSPACE: esc(state.workspace),
    GENERATED: esc(state.generated),
    GENERATED_TEXT: esc(isoMinute(Date.parse(state.generated))),
    STATUS_CLASS: busy ? "busy" : "live",
    STATUS_TEXT: busy ? "Claude is working" : "Claude is idle",
    TASK_COUNT: String(open),
    TASKS: tasksHtml(state.tasks),
    INBOX_COUNT: String(state.inbox.length),
    INBOX: filesHtml(state.inbox, "Nothing waiting."),
    OUTPUT_COUNT: String(state.outputs.length),
    OUTPUTS: filesHtml(state.outputs, "Nothing delivered yet."),
    MEMORY: esc(state.memory ? `${state.memory.facts} stated facts · MEMORY.md, ${state.memory.lines} lines` : "No memory yet. /remember creates it."),
    ACTIVITY: activityHtml(state.activity),
    STATE_JSON: JSON.stringify(state).replace(/</g, "\\u003c"),
  };
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in fill ? fill[k] : m));
}

export function render(ws) {
  const dot = path.join(ws, ".cowork");
  fs.mkdirSync(dot, { recursive: true });
  const state = buildState(ws);
  const body = renderBody(state, fs.readFileSync(TEMPLATE, "utf8"));
  const doc = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
  fs.writeFileSync(path.join(dot, "board.artifact.html"), body);
  fs.writeFileSync(path.join(dot, "board.html"), doc);
  const webFile = path.join(dot, "web.json");
  const web = readJson(webFile, {});
  web.hash = contentHash(state);
  web.rendered = state.generated;
  fs.writeFileSync(webFile, JSON.stringify(web, null, 2));
  return { state, web, file: path.join(dot, "board.html"), artifactFile: path.join(dot, "board.artifact.html") };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const wsArg = a.includes("--workspace") ? a[a.indexOf("--workspace") + 1] : null;
  const ws = path.resolve(wsArg || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const { state, web, file, artifactFile } = render(ws);
  if (!a.includes("--quiet")) {
    console.log(`rendered ${path.relative(ws, file)} and ${path.relative(ws, artifactFile)}: ${state.tasks.filter((t) => !t.done).length} open tasks, ${state.inbox.length} inbox, ${state.outputs.length} outputs${web.url ? ` · artifact ${web.url}` : " · not published yet"}`);
  }
}
