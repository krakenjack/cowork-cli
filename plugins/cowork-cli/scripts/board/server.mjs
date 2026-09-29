#!/usr/bin/env node
// cowork-cli board server — zero dependencies, Node 18+.
//
//   node server.mjs --workspace <dir> [--port 4820] [--host 127.0.0.1] [--token <secret>]
//
// Serves the dashboard page and a small JSON API over the workspace:
//   GET  /                      dashboard
//   GET  /api/state             tasks, inbox, outputs, memory, activity, session status
//   GET  /api/events            server-sent events: "changed" whenever a watched file changes
//   POST /api/tasks             {action: add|done|reopen|delete, id?, text?}
//   PUT  /api/inbox/<name>      raw file body → inbox/<name>   (drag-and-drop upload)
//   POST /api/message           {text} → queued for Claude's next turn (.cowork/requests.jsonl)
//   GET  /api/file?path=<rel>   download a file inside the workspace
//   GET  /api/health
// State lives in <workspace>/.cowork/ (board.json, activity.jsonl, requests.jsonl, status.json).

import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
const WS = path.resolve(args.workspace || process.cwd());
const HOST = args.host || "127.0.0.1";
const PORT = Number(args.port || 4820);
const TOKEN = args.token || "";
const DOT = path.join(WS, ".cowork");
const TASKS = path.join(WS, "TASKS.md");
const ACTIVITY = path.join(DOT, "activity.jsonl");
const REQUESTS = path.join(DOT, "requests.jsonl");
const STATUS = path.join(DOT, "status.json");
const MAX_UPLOAD = 200 * 1024 * 1024;

for (const d of ["inbox", "outputs", ".cowork"]) fs.mkdirSync(path.join(WS, d), { recursive: true });
if (!fs.existsSync(TASKS)) fs.writeFileSync(TASKS, "# Tasks\n\n## Active\n\n## Waiting\n\n## Done\n");

// ---------- helpers ----------
function parseArgs(a) {
  const o = {};
  for (let i = 0; i < a.length; i++) if (a[i].startsWith("--")) o[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
  return o;
}
const today = () => new Date().toISOString().slice(0, 10);
const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(body)); };
function safeRel(rel) {
  const p = path.resolve(WS, rel || "");
  if (p !== WS && !p.startsWith(WS + path.sep)) throw new Error("path escapes workspace");
  return p;
}
function safeName(name) {
  const base = path.basename(String(name || "")).replace(/[\x00-\x1f<>:"|?*\\/]/g, "_").trim();
  if (!base || base === "." || base === "..") throw new Error("bad filename");
  return base;
}
async function listDir(rel, limit = 200) {
  const dir = path.join(WS, rel);
  let ents = [];
  try { ents = await fsp.readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of ents) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    try {
      const st = await fsp.stat(full);
      out.push({ name: e.name, rel: path.posix.join(rel, e.name), dir: st.isDirectory(), size: st.size, mtime: st.mtimeMs });
    } catch {}
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out.slice(0, limit);
}
async function tail(file, n) {
  try {
    const t = await fsp.readFile(file, "utf8");
    return t.trim().split("\n").filter(Boolean).slice(-n).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}
function appendJsonl(file, obj) { fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n"); }

// ---------- TASKS.md ----------
const SECTION_RE = /^##\s+(.+?)\s*$/;
const ITEM_RE = /^(\s*)- \[( |x|X)\]\s*(.*)$/;
function parseTasks(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let section = "";
  lines.forEach((line, i) => {
    const s = line.match(SECTION_RE);
    if (s) { section = s[1]; return; }
    const m = line.match(ITEM_RE);
    if (!m) return;
    const body = m[3];
    const due = (body.match(/due\s+(\d{4}-\d{2}-\d{2})/i) || [])[1] || null;
    const tags = [...body.matchAll(/(^|\s)#([\w-]+)/g)].map((x) => x[2]);
    const people = [...body.matchAll(/(^|\s)@([\w-]+)/g)].map((x) => x[2]);
    items.push({ id: i, section, done: m[2].toLowerCase() === "x", text: body, due, tags, people, overdue: !!due && due < today() && m[2] === " " });
  });
  return { items, lines };
}
function sectionRange(lines, name) {
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (SECTION_RE.test(lines[i])) {
      if (start >= 0) return [start, i];
      if (lines[i].match(SECTION_RE)[1].toLowerCase() === name.toLowerCase()) start = i;
    }
  }
  return start >= 0 ? [start, lines.length] : null;
}
function insertInSection(lines, name, line) {
  let r = sectionRange(lines, name);
  if (!r) { lines.push("", `## ${name}`); r = [lines.length - 1, lines.length]; }
  let end = r[1];
  while (end > r[0] + 1 && lines[end - 1].trim() === "") end--;
  lines.splice(end, 0, line);
}
async function mutateTasks({ action, id, text }) {
  const raw = await fsp.readFile(TASKS, "utf8");
  const { items, lines } = parseTasks(raw);
  if (action === "add") {
    const t = String(text || "").trim();
    if (!t) throw new Error("empty task");
    insertInSection(lines, "Active", `- [ ] ${t}`);
  } else {
    const it = items.find((x) => x.id === Number(id));
    if (!it) throw new Error("task not found");
    const line = lines[it.id];
    lines.splice(it.id, 1);
    if (action === "done") insertInSection(lines, "Done", line.replace(/- \[ \]/, "- [x]").replace(/\s*$/, "") + ` — ${today()}`);
    else if (action === "reopen") insertInSection(lines, "Active", line.replace(/- \[[xX]\]/, "- [ ]").replace(/\s+—\s+\d{4}-\d{2}-\d{2}\s*$/, ""));
    else if (action === "delete") { /* removed */ }
    else throw new Error("unknown action");
  }
  await fsp.writeFile(TASKS, lines.join("\n").replace(/\n{3,}/g, "\n\n"));
  appendJsonl(ACTIVITY, { kind: "board", text: `task ${action}: ${(text || (items.find((x) => x.id === Number(id)) || {}).text || "").slice(0, 120)}` });
}

// ---------- state ----------
async function state() {
  let tasksText = "";
  try { tasksText = await fsp.readFile(TASKS, "utf8"); } catch {}
  const { items } = parseTasks(tasksText);
  let memory = null;
  try {
    const m = await fsp.readFile(path.join(WS, "memory", "MEMORY.md"), "utf8");
    memory = { lines: m.split("\n").length, facts: m.split("\n").filter((l) => /^\s*-\s*\[stated\]/.test(l)).length };
  } catch {}
  let session = {};
  try { session = JSON.parse(await fsp.readFile(STATUS, "utf8")); } catch {}
  const [inbox, outputs, activity, requests] = await Promise.all([listDir("inbox"), listDir("outputs"), tail(ACTIVITY, 80), tail(REQUESTS, 20)]);
  return { workspace: WS, name: path.basename(WS), now: new Date().toISOString(), tasks: items, inbox, outputs, memory, session, activity: activity.reverse(), pending: requests.filter((r) => !r.delivered) };
}

// ---------- SSE + watchers ----------
const clients = new Set();
let pingTimer = null;
function broadcast(ev, data) { for (const res of clients) res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); }
let debounce = null;
function changed(what) { clearTimeout(debounce); debounce = setTimeout(() => broadcast("changed", { what }), 150); }
function watch(p, label) {
  try { fs.watch(p, { persistent: false }, () => changed(label)); } catch {}
}
watch(TASKS, "tasks"); watch(path.join(WS, "inbox"), "inbox"); watch(path.join(WS, "outputs"), "outputs"); watch(DOT, "activity");
// Some editors replace files (new inode) — re-arm the TASKS watcher periodically.
setInterval(() => watch(TASKS, "tasks"), 30000).unref();

// ---------- server ----------
const PAGE_FILE = path.join(__dirname, "index.html"); // read per request so plugin updates apply without a restart
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (TOKEN && url.pathname.startsWith("/api/")) {
      const t = url.searchParams.get("token") || (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || (req.headers.cookie || "").match(/cowork_token=([^;]+)/)?.[1];
      if (t !== TOKEN) return json(res, 401, { error: "unauthorized" });
    }
    if (req.method === "GET" && url.pathname === "/") {
      const hdr = { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" };
      if (TOKEN && url.searchParams.get("token") === TOKEN) hdr["set-cookie"] = `cowork_token=${TOKEN}; Path=/; SameSite=Strict`;
      res.writeHead(200, hdr); return res.end(fs.readFileSync(PAGE_FILE, "utf8"));
    }
    if (url.pathname === "/favicon.ico") { res.writeHead(204); return res.end(); }
    if (url.pathname === "/api/health") return json(res, 200, { ok: true, workspace: WS, pid: process.pid });
    if (url.pathname === "/api/state") return json(res, 200, await state());
    if (url.pathname === "/api/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write("event: hello\ndata: {}\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      if (!pingTimer) pingTimer = setInterval(() => broadcast("ping", {}), 25000);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/tasks") {
      const body = JSON.parse(await readBody(req, 64 * 1024) || "{}");
      await mutateTasks(body);
      return json(res, 200, { ok: true });
    }
    if (req.method === "PUT" && url.pathname.startsWith("/api/inbox/")) {
      const name = safeName(decodeURIComponent(url.pathname.slice("/api/inbox/".length)));
      let dest = path.join(WS, "inbox", name);
      if (fs.existsSync(dest)) { const ext = path.extname(name); dest = path.join(WS, "inbox", `${path.basename(name, ext)}-${Date.now()}${ext}`); }
      await streamToFile(req, dest, MAX_UPLOAD);
      const st = await fsp.stat(dest);
      appendJsonl(ACTIVITY, { kind: "inbox", text: `file dropped: inbox/${path.basename(dest)} (${fmtSize(st.size)})`, file: `inbox/${path.basename(dest)}` });
      return json(res, 200, { ok: true, name: path.basename(dest), size: st.size });
    }
    if (req.method === "POST" && url.pathname === "/api/message") {
      const { text } = JSON.parse(await readBody(req, 64 * 1024) || "{}");
      if (!String(text || "").trim()) return json(res, 400, { error: "empty" });
      appendJsonl(REQUESTS, { text: String(text).trim(), delivered: false });
      appendJsonl(ACTIVITY, { kind: "board", text: `message queued for Claude: ${String(text).trim().slice(0, 120)}` });
      return json(res, 200, { ok: true });
    }
    if (req.method === "GET" && url.pathname === "/api/file") {
      const p = safeRel(url.searchParams.get("path"));
      const st = await fsp.stat(p);
      if (!st.isFile()) return json(res, 404, { error: "not a file" });
      res.writeHead(200, { "content-type": mime(p), "content-length": st.size, "content-disposition": `inline; filename="${path.basename(p)}"` });
      return fs.createReadStream(p).pipe(res);
    }
    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, e.code === "ENOENT" ? 404 : 400, { error: String(e.message || e) });
  }
});
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on("data", (c) => { n += c.length; if (n > limit) { reject(new Error("body too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
function streamToFile(req, dest, limit) {
  return new Promise((resolve, reject) => {
    let n = 0; const out = fs.createWriteStream(dest);
    req.on("data", (c) => { n += c.length; if (n > limit) { req.destroy(new Error("file too large")); } });
    req.on("error", (e) => { out.destroy(); fs.rm(dest, { force: true }, () => reject(e)); });
    out.on("error", reject); out.on("finish", resolve);
    req.pipe(out);
  });
}
function fmtSize(n) { return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`; }
function mime(p) {
  const e = path.extname(p).toLowerCase();
  return { ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".html": "text/html; charset=utf-8", ".json": "application/json", ".csv": "text/csv", ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation" }[e] || "application/octet-stream";
}

server.listen(PORT, HOST, () => {
  const url = `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/${TOKEN ? `?token=${TOKEN}` : ""}`;
  fs.writeFileSync(path.join(DOT, "board.json"), JSON.stringify({ pid: process.pid, host: HOST, port: PORT, url, token: TOKEN || undefined, started: new Date().toISOString() }, null, 2));
  appendJsonl(ACTIVITY, { kind: "board", text: `board started at ${url}` });
  console.log(`cowork board: ${url}`);
});
server.on("error", (e) => { console.error(`cowork board: ${e.message}`); process.exit(1); });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { try { fs.rmSync(path.join(DOT, "board.json"), { force: true }); } catch {} process.exit(0); });
