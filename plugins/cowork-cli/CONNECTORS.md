# Connectors

Connectors are MCP servers. This plugin ships none pre-configured (a plugin-level `.mcp.json` would force every install to load the same servers). Add them per workspace with `/connect`, which writes to the workspace's `.mcp.json` via `claude mcp add --scope project`.

## Category → server

| Category | Typical servers | Notes |
|---|---|---|
| Chat | Slack, Microsoft Teams | Remote OAuth endpoints |
| Email / calendar | Gmail, Google Calendar, Microsoft 365 | Remote OAuth |
| Documents | Google Drive, Notion, SharePoint | Remote OAuth |
| Project tracker | Linear, Jira, Asana | Remote OAuth |
| Diagrams | Lucid | Remote OAuth |
| Source control | GitHub (`gh` CLI is usually enough) | — |
| Databases | Postgres / MySQL community stdio servers | Credentials via env vars only |
| Browser | Claude in Chrome extension (`claude --chrome`) | Not an MCP server; needs Chrome + extension |

Exact URLs change; `/connect` looks them up on the vendor's docs rather than trusting this table.

## Example workspace `.mcp.json` (written by `claude mcp add --scope project`)

```json
{
  "mcpServers": {
    "linear": { "type": "http", "url": "https://mcp.linear.app/mcp" },
    "postgres": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": { "DATABASE_URL": "${DATABASE_URL}" }
    }
  }
}
```

## Workspace connector log

Copy this table into the workspace's own `CONNECTORS.md`; `/connect` appends to it.

| Category | Server | Scope | Added by | Date |
|---|---|---|---|---|
