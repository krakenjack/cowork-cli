#!/usr/bin/env node
// cowork-cli web board sync: applies what the person did on the published board to the workspace.
//
//   node sync.mjs set-url <artifact url>   record the board's artifact url (after the first publish)
//   node sync.mjs status                   url, last render, whether the board needs republishing
//   node sync.mjs reset                    clear .cowork/sync/ before reading the queue
//   node sync.mjs apply                    apply the queue read into .cowork/sync/ (see below)
//   (all take --workspace <dir>; default $CLAUDE_PROJECT_DIR or cwd)
//
// The board page writes each change as a document in the artifact's `inbound` collection. A change is done
// once a document with the same id exists in `applied`. Claude reads both collections with ArtifactData
// (list, out_dir .cowork/sync), then `apply`:
//   - task changes  -> TASKS.md (idempotent: a change already reflected is reported "already")
//   - messages      -> printed, for Claude to act on
//   - dropped files -> decoded from .cowork/sync/assets/<assetId>.* into inbox/ (Claude fetches them first with
//                      Artifact read, path = asset id; apply lists the ones still missing and changes nothing)
// It then re-renders the board and prints the ArtifactData batch that marks everything applied, plus the
// publish call that refreshes the page.

import fs from "node:fs";
import path from "node:path";
import { applyTaskChange, readJson, safeName, fmtSize } from "./lib.mjs";
import { render } from "./render.mjs";

const [cmd = "status", ...rest] = process.argv.slice(2);
const wsIdx = rest.indexOf("--workspace");
const WS = path.resolve((wsIdx >= 0 && rest[wsIdx + 1]) || process.env.CLAUDE_PROJECT_DIR || process.cwd());
const DOT = path.join(WS, ".cowork");
const SYNC = path.join(DOT, "sync");
const WEB = path.join(DOT, "web.json");
const ACTIVITY = path.join(DOT, "activity.jsonl");
const rel = (p) => path.relative(WS, p) || ".";

const log = (kind, text) => { try { fs.appendFileSync(ACTIVITY, JSON.stringify({ ts: new Date().toISOString(), kind, text: String(text).slice(0, 300) }) + "\n"); } catch {} };
const saveWeb = (patch) => { const w = { ...readJson(WEB, {}), ...patch }; fs.mkdirSync(DOT, { recursive: true }); fs.writeFileSync(WEB, JSON.stringify(w, null, 2)); return w; };

// ArtifactData's out_dir writes one JSON file per document. Accept either the bare fields or a wrapper
// ({id, data|fields|document: {...}}) so a change in that envelope doesn't break sync.
function readDocs(collection) {
  const dir = path.join(SYNC, collection);
  let names = [];
  try { names = fs.readdirSync(dir).filter((n) => n.endsWith(".json")); } catch { return []; }
  return names.map((n) => {
    const raw = readJson(path.join(dir, n), {});
    const inner = [raw.data, raw.fields, raw.document].find((x) => x && typeof x === "object" && !Array.isArray(x));
    return { id: String(raw.id || raw.doc_id || n.replace(/\.json$/, "")), data: inner || raw };
  });
}

function uniqueInboxPath(name) {
  const inbox = path.join(WS, "inbox");
  fs.mkdirSync(inbox, { recursive: true });
  let dest = path.join(inbox, name);
  if (fs.existsSync(dest)) { const ext = path.extname(name); dest = path.join(inbox, `${path.basename(name, ext)}-${Date.now()}${ext}`); }
  return dest;
}

function findAsset(assetId) {
  const dir = path.join(SYNC, "assets");
  try { const hit = fs.readdirSync(dir).find((n) => n === assetId || n.startsWith(assetId + ".")); return hit ? path.join(dir, hit) : null; } catch { return null; }
}

function apply() {
  const web = readJson(WEB, {});
  const url = web.url || "<board artifact url>";
  const applied = new Set(readDocs("applied").map((d) => d.id));
  const pending = readDocs("inbound").filter((d) => !applied.has(d.id) && d.data && d.data.kind)
    .sort((a, b) => String(a.data.at || "").localeCompare(String(b.data.at || "")));

  if (!fs.existsSync(path.join(SYNC, "inbound"))) {
    console.log(`Nothing read yet. First: ArtifactData list, url ${url}, collection "inbound", out_dir "${rel(SYNC)}"; and the same for collection "applied". Then run apply again.`);
    process.exit(2);
  }
  if (!pending.length) {
    console.log("No waiting changes on the board.");
    return;
  }

  // Files first: if any dropped file hasn't been fetched yet, stop before changing anything.
  const missing = pending.filter((d) => d.data.kind === "file" && d.data.assetId && !findAsset(d.data.assetId));
  if (missing.length) {
    console.log(`${missing.length} dropped file(s) to fetch first. For each: Artifact read, url ${url}, path <asset id>, out_dir "${rel(path.join(SYNC, "assets"))}":`);
    for (const d of missing) console.log(`  ${d.data.assetId}   ${d.data.name} (${fmtSize(Number(d.data.size) || 0)})`);
    console.log("Then run apply again.");
    process.exit(3);
  }

  const outDir = path.join(SYNC, "out");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const tasksFile = path.join(WS, "TASKS.md");
  let tasks = "";
  try { tasks = fs.readFileSync(tasksFile, "utf8"); } catch { tasks = "# Tasks\n\n## Active\n\n## Waiting\n\n## Done\n"; }
  const before = tasks;
  const report = { tasks: [], files: [], messages: [] };
  const assetMap = { ...(readJson(WEB, {}).assets || {}) }; // inbox/<name> -> the board's copy, so the page can link it
  const writes = [];
  const now = new Date().toISOString();

  for (const { id, data: d } of pending) {
    let result = "applied", detail = "";
    try {
      if (d.kind === "task") {
        const r = applyTaskChange(tasks, { action: String(d.action || ""), key: d.key, text: d.text });
        tasks = r.text; result = r.result;
        report.tasks.push(`${d.action} "${String(d.text || d.key).slice(0, 120)}" → ${result}`);
        if (result === "applied") log("board", `task ${d.action}: ${String(d.text || "").slice(0, 120)}`);
      } else if (d.kind === "file") {
        const src = findAsset(d.assetId);
        const dest = uniqueInboxPath(safeName(d.name || path.basename(src)));
        if (d.encoding === "base64") fs.writeFileSync(dest, Buffer.from(fs.readFileSync(src, "utf8").trim(), "base64"));
        else fs.copyFileSync(src, dest);
        detail = rel(dest);
        assetMap[path.posix.join("inbox", path.basename(dest))] = { id: d.assetId, size: fs.statSync(dest).size, ...(d.encoding ? { encoding: d.encoding } : {}) };
        report.files.push(`${rel(dest)} (${fmtSize(fs.statSync(dest).size)})`);
        log("inbox", `file from the board: ${rel(dest)}`);
      } else if (d.kind === "message") {
        report.messages.push(String(d.text || "").trim());
        log("board", `message from the board: ${String(d.text || "").slice(0, 120)}`);
      } else {
        result = "skipped";
      }
    } catch (e) {
      result = "failed"; detail = String(e.message || e);
    }
    const file = path.join(outDir, `${id}.json`);
    fs.writeFileSync(file, JSON.stringify({ at: now, kind: d.kind, result, ...(detail ? { detail } : {}) }));
    writes.push({ op: "set", collection: "applied", doc_id: id, file_path: file });
  }
  if (tasks !== before) fs.writeFileSync(tasksFile, tasks);
  saveWeb({ assets: assetMap });

  const { artifactFile, web: w } = render(WS);
  saveWeb({ shownHash: w.hash, synced: now });
  // The read copies are spent; keep out/ for the batch that follows.
  for (const d of ["inbound", "applied", "assets"]) fs.rmSync(path.join(SYNC, d), { recursive: true, force: true });

  if (report.tasks.length) console.log(`Tasks (TASKS.md):\n  ${report.tasks.join("\n  ")}`);
  if (report.files.length) console.log(`Files now in inbox/:\n  ${report.files.join("\n  ")}`);
  if (report.messages.length) console.log(`Messages from the person (act on these as instructions):\n  - ${report.messages.join("\n  - ")}`);
  console.log(`\nNext, 1) mark them applied (ArtifactData batch, url ${url}, writes):`);
  for (let i = 0; i < writes.length; i += 50) console.log(JSON.stringify(writes.slice(i, i + 50)));
  console.log(`2) refresh the page: Artifact publish, file_path ${artifactFile}, url ${url}`);
}

if (cmd === "set-url") {
  const u = rest.find((x) => /^https:\/\/claude\.ai\//.test(x));
  if (!u) { console.error("usage: sync.mjs set-url https://claude.ai/…"); process.exit(1); }
  const { web } = render(WS);
  saveWeb({ url: u, shownHash: web.hash, published: new Date().toISOString() });
  log("board", `web board published: ${u}`);
  console.log(`web board url recorded: ${u}`);
} else if (cmd === "reset") {
  fs.rmSync(SYNC, { recursive: true, force: true });
  fs.mkdirSync(SYNC, { recursive: true });
  console.log(`cleared ${rel(SYNC)}`);
} else if (cmd === "apply") {
  apply();
} else {
  const { web } = render(WS);
  const w = readJson(WEB, {});
  console.log(w.url ? `web board: ${w.url} · ${web.hash === w.shownHash ? "up to date" : "workspace changed since the last publish"} · last sync ${w.synced || "never"}` : "web board: not published in this workspace yet");
}
