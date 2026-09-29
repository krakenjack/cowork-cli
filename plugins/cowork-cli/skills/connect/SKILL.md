---
name: connect
description: >
  This skill should be used when the user wants Claude to reach one of their apps or data sources —
  "connect Slack", "can you read my email", "pull from Notion", "add the Jira connector", "/connect",
  "what connectors do I have", "hook up Google Drive" — or when a task needs the user's own data and
  no MCP tool for it is loaded. It maps the need to an MCP server, adds it with `claude mcp add`, and
  records the choice in CONNECTORS.md.
allowed-tools: Read, Write, Edit, Bash(claude mcp *), Bash(claude --version), Glob, Grep
argument-hint: "[app name or category]"
---

# Connectors (MCP servers)

Connectors are how this workspace reaches the person's own data. In Claude Code they are MCP servers; in Cowork they were the same thing with a different UI.

## Steps

1. Check what's already there: `claude mcp list`. Report only the relevant entries.
2. Map the request to a category and server (see `${CLAUDE_PLUGIN_ROOT}/CONNECTORS.md` for the table). Prefer the vendor's own remote MCP endpoint (HTTP/SSE with OAuth) over a community stdio package.
3. Add it, scoped so the whole team gets it when the folder is shared:
   - Remote (OAuth): `claude mcp add --transport http <name> <url> --scope project`
   - Local package: `claude mcp add --transport stdio <name> --scope project -- npx -y <package>`
   - Secrets go in environment variables, never in the command line or in `.mcp.json`: `--env TOKEN=${TOKEN}`.
   `--scope project` writes to `.mcp.json` in the workspace root, which is checked into git alongside CLAUDE.md. Use `--scope user` for anything personal.
4. Tell the person to run `/mcp` in the terminal to complete the OAuth sign-in if the server needs one; you can't click through it for them.
5. Append a row to `CONNECTORS.md` in the workspace: category, server name, scope, who added it, date.

## Rules

- Never guess a server URL. If it isn't in CONNECTORS.md and the person didn't give it, look it up on the vendor's docs and show the source.
- Don't add connectors speculatively; only for a stated need.
- If a connected tool is present but toggled off, say so rather than falling back to the web.
- Browser: for a site with no connector that needs a sign-in, the answer is the Chrome extension (`claude --chrome`, or `/chrome` in-session), not scraping.
