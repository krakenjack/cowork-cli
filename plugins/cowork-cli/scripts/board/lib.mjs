// Shared workspace readers for the board: TASKS.md parsing and editing, folder listings, activity tail.
// Used by render.mjs (the web board file) and sync.mjs (applying changes made on the web board).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const today = () => new Date().toISOString().slice(0, 10);

// ---------- TASKS.md ----------
const SECTION_RE = /^##\s+(.+?)\s*$/;
const ITEM_RE = /^(\s*)- \[( |x|X)\]\s*(.*)$/;
const DONE_SUFFIX_RE = /\s+—\s+\d{4}-\d{2}-\d{2}\s*$/;

// A task's key survives being checked off and reopened: it is the text without the "— YYYY-MM-DD" done stamp.
export const taskKey = (text) => crypto.createHash("sha1").update(String(text).replace(DONE_SUFFIX_RE, "").trim().toLowerCase()).digest("hex").slice(0, 12);

export function parseTasks(text) {
  const lines = String(text || "").split(/\r?\n/);
  const items = [];
  let section = "";
  lines.forEach((line, i) => {
    const s = line.match(SECTION_RE);
    if (s) { section = s[1]; return; }
    const m = line.match(ITEM_RE);
    if (!m) return;
    const body = m[3];
    const done = m[2].toLowerCase() === "x";
    const due = (body.match(/due\s+(\d{4}-\d{2}-\d{2})/i) || [])[1] || null;
    items.push({
      line: i, key: taskKey(body), section, done, text: body, due,
      tags: [...body.matchAll(/(^|\s)#([\w-]+)/g)].map((x) => x[2]),
      people: [...body.matchAll(/(^|\s)@([\w-]+)/g)].map((x) => x[2]),
      overdue: !!due && !done && due < today(),
    });
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

// Apply one task change to TASKS.md text. Changes name tasks by key (stable) with the text as a fallback.
// Returns {text, result} where result is "applied", "already" (nothing to do) or "missing".
export function applyTaskChange(raw, { action, key, text }) {
  const { items, lines } = parseTasks(raw);
  if (action === "add") {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    if (!t) return { text: raw, result: "missing" };
    if (items.some((x) => x.key === taskKey(t))) return { text: raw, result: "already" };
    insertInSection(lines, "Active", `- [ ] ${t}`);
  } else {
    const it = items.find((x) => x.key === key) || items.find((x) => text && x.text.replace(DONE_SUFFIX_RE, "") === String(text).replace(DONE_SUFFIX_RE, ""));
    if (!it) return { text: raw, result: action === "delete" ? "already" : "missing" };
    if ((action === "done" && it.done) || (action === "reopen" && !it.done)) return { text: raw, result: "already" };
    const line = lines[it.line];
    lines.splice(it.line, 1);
    if (action === "done") insertInSection(lines, "Done", line.replace(/- \[ \]/, "- [x]").replace(/\s*$/, "") + ` — ${today()}`);
    else if (action === "reopen") insertInSection(lines, "Active", line.replace(/- \[[xX]\]/, "- [ ]").replace(DONE_SUFFIX_RE, ""));
    else if (action !== "delete") return { text: raw, result: "missing" };
  }
  return { text: lines.join("\n").replace(/\n{3,}/g, "\n\n"), result: "applied" };
}

// ---------- folders ----------
export function listDir(ws, rel, limit = 200) {
  const dir = path.join(ws, rel);
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of ents) {
    if (e.name.startsWith(".")) continue;
    try {
      const st = fs.statSync(path.join(dir, e.name));
      out.push({ name: e.name, rel: path.posix.join(rel, e.name), dir: st.isDirectory(), size: st.size, mtime: Math.round(st.mtimeMs) });
    } catch {}
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out.slice(0, limit);
}

export function tailJsonl(file, n) {
  try {
    return fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).slice(-n)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

export function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

export function safeName(name) {
  const base = path.basename(String(name || "")).replace(/[\x00-\x1f<>:"|?*\\/]/g, "_").trim();
  if (!base || base === "." || base === "..") throw new Error("bad filename");
  return base;
}

export const fmtSize = (n) => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;
