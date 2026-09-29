<#
.SYNOPSIS
  Launch a Cowork-style Claude Code session in a folder, with Remote Control enabled.

.DESCRIPTION
  Initializes the folder as a cowork-cli workspace (CLAUDE.md, TASKS.md, memory/, outputs/, inbox/) if
  it isn't one yet, then starts `claude --remote-control` with the plugin loaded so the session shows up
  in the Claude mobile app and claude.ai/code.

.EXAMPLE
  .\cowork.ps1                              # current folder, RC on
  .\cowork.ps1 -Workspace D:\ops -Name "Ops" -Chrome
  .\cowork.ps1 -Board                       # also start the visual board and open it in the default browser
  .\cowork.ps1 -Installed                   # plugin already installed via /plugin install; skip --plugin-dir
  .\cowork.ps1 -NoRemote                    # plain local session
#>
[CmdletBinding()]
param(
  [string]$Workspace = (Get-Location).Path,
  [string]$Name = "",
  [switch]$Chrome,
  [switch]$Board,
  [switch]$NoRemote,
  [switch]$Installed,
  [string[]]$AddDir = @(),
  [string]$Model = "",
  [switch]$Continue,
  [ValidateSet("", "default", "acceptEdits", "plan", "auto", "dontAsk")]
  [string]$PermissionMode = ""
)

$ErrorActionPreference = "Stop"
$PluginRoot = Split-Path -Parent $PSScriptRoot
$Templates  = Join-Path $PluginRoot "templates"

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Error "claude is not on PATH. Install Claude Code first: https://code.claude.com/docs/en/setup"
}

# --- Initialize workspace -------------------------------------------------------------------
$Workspace = (Resolve-Path -LiteralPath $Workspace).Path
$created = @()
foreach ($d in @("outputs", "inbox", "automation", "memory\people", "memory\projects", "memory\topics")) {
  $p = Join-Path $Workspace $d
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null; $created += $d }
}
$copies = @{
  "CLAUDE.md"              = "CLAUDE.md"
  "TASKS.md"               = "TASKS.md"
  "CONNECTORS.md"          = "CONNECTORS.md"
  "memory\MEMORY.md"       = "memory\MEMORY.md"
  "memory\profile.md"      = "memory\profile.md"
  "memory\preferences.md"  = "memory\preferences.md"
  "gitignore"              = ".gitignore"
}
foreach ($src in $copies.Keys) {
  $dst = Join-Path $Workspace $copies[$src]
  if (-not (Test-Path $dst)) { Copy-Item (Join-Path $Templates $src) $dst; $created += $copies[$src] }
}
if ($created.Count -gt 0) {
  Write-Host "Initialized workspace files: $($created -join ', ')" -ForegroundColor Green
  Write-Host "Edit CLAUDE.md to fill in who you are and what this folder is for." -ForegroundColor Yellow
}

# --- Board (optional) ------------------------------------------------------------------------
if ($Board) {
  if (Get-Command node -ErrorAction SilentlyContinue) {
    New-Item -ItemType Directory -Path (Join-Path $Workspace ".cowork") -Force | Out-Null
    New-Item -ItemType File -Path (Join-Path $Workspace ".cowork\board-autostart") -Force | Out-Null
    $url = (& node (Join-Path $PluginRoot "scripts\board\board.mjs") start --workspace $Workspace | Select-Object -Last 1)
    if ($url) { Write-Host "Board: $url" -ForegroundColor Cyan; Start-Process $url }
  } else { Write-Host "Board needs Node.js 18+ on PATH; skipping." -ForegroundColor Yellow }
}

# --- Build the claude command ----------------------------------------------------------------
$claudeArgs = @()
if (-not $NoRemote) {
  $claudeArgs += "--remote-control"
  if ($Name) { $claudeArgs += $Name }
} elseif ($Name) {
  $claudeArgs += @("--name", $Name)
}
if (-not $Installed) { $claudeArgs += @("--plugin-dir", $PluginRoot) }
if ($Chrome)         { $claudeArgs += "--chrome" }
if ($Model)          { $claudeArgs += @("--model", $Model) }
if ($Continue)       { $claudeArgs += "--continue" }
if ($PermissionMode) { $claudeArgs += @("--permission-mode", $PermissionMode) }
if ($AddDir.Count -gt 0) { $claudeArgs += "--add-dir"; $claudeArgs += $AddDir }

Set-Location -LiteralPath $Workspace
Write-Host "claude $($claudeArgs -join ' ')" -ForegroundColor DarkGray
if (-not $NoRemote) {
  Write-Host "Remote Control on: open the Claude mobile app or claude.ai/code to pick this session up." -ForegroundColor Cyan
}
& claude @claudeArgs
