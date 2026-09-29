#!/usr/bin/env node
// cowork-cli board control: start (detached) / stop / status / url
//
//   node board.mjs start  [--workspace <dir>] [--port 4820] [--host 127.0.0.1] [--token auto|<secret>]
//   node board.mjs stop   [--workspace <dir>]
//   node board.mjs status [--workspace <dir>]
//   node board.mjs url    [--workspace <dir>]     (prints only the URL, empty if not running)
//
// Works from bash, PowerShell, cmd and from Claude Code hooks. The server keeps running after the
// caller exits; its pid/port/url are in <workspace>/.cowork/board.json.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const [cmd = "status", ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i++) if (rest[i].startsWith("--")) args[rest[i].slice(2)] = rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[++i] : true;
const WS = path.resolve(args.workspace || process.env.CLAUDE_PROJECT_DIR || process.cwd());
const DOT = path.join(WS, ".cowork");
const CFG = path.join(DOT, "board.json");
const LOG = path.join(DOT, "board.log");

const readCfg = () => { try { return JSON.parse(fs.readFileSync(CFG, "utf8")); } catch { return null; } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const health = (cfg) => new Promise((resolve) => {
  if (!cfg) return resolve(false);
  const req = http.get({ host: cfg.host === "0.0.0.0" ? "127.0.0.1" : cfg.host, port: cfg.port, path: "/api/health", timeout: 1500 }, (res) => { res.resume(); resolve(res.statusCode === 200); });
  req.on("error", () => resolve(false)); req.on("timeout", () => { req.destroy(); resolve(false); });
});

async function status(quiet = false) {
  const cfg = readCfg();
  const ok = cfg && (await health(cfg));
  if (!quiet) console.log(ok ? `running  ${cfg.url}  (pid ${cfg.pid}, workspace ${WS})` : `not running  (workspace ${WS})`);
  return ok ? cfg : null;
}

async function start() {
  const existing = await status(true);
  if (existing) { console.log(existing.url); return; }
  fs.mkdirSync(DOT, { recursive: true });
  const host = args.host || "127.0.0.1";
  const port = String(args.port || 4820);
  let token = args.token === "auto" || (host !== "127.0.0.1" && host !== "localhost" && !args.token) ? crypto.randomBytes(12).toString("hex") : (args.token && args.token !== true ? args.token : "");
  const sargs = [path.join(__dirname, "server.mjs"), "--workspace", WS, "--host", host, "--port", port];
  if (token) sargs.push("--token", token);
  const out = fs.openSync(LOG, "a");
  const child = spawn(process.execPath, sargs, { detached: true, stdio: ["ignore", out, out], windowsHide: true });
  child.unref();
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 150));
    const cfg = readCfg();
    if (cfg && cfg.pid === child.pid && (await health(cfg))) { console.log(cfg.url); return; }
  }
  console.error(`board failed to start; see ${LOG}`);
  try { console.error(fs.readFileSync(LOG, "utf8").split("\n").slice(-5).join("\n")); } catch {}
  process.exit(1);
}

function stop() {
  const cfg = readCfg();
  if (!cfg) { console.log("not running"); return; }
  try { process.kill(cfg.pid, "SIGTERM"); } catch {}
  try { fs.rmSync(CFG, { force: true }); } catch {}
  console.log(`stopped board (pid ${cfg.pid})`);
}

if (cmd === "start") await start();
else if (cmd === "stop") stop();
else if (cmd === "url") { const c = await status(true); console.log(c ? c.url : ""); }
else await status();
