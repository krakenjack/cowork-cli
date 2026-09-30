<#
.SYNOPSIS
  Start a Cowork session in a folder, with Remote Control on.

.DESCRIPTION
  Usually run as `cowork` (the command install.ps1 adds) from inside the folder, or from the folder's
  right-click menu ("Open Cowork here"). No options are needed: the session is named after the folder, the
  workspace files are laid out on first use, and Claude starts with a welcome (first time) or a brief.

.EXAMPLE
  cowork                         # this folder
  cowork -Name "Ops" -Chrome     # custom session name, Claude in Chrome
  cowork -Quiet                  # don't start with the brief / welcome
  cowork -Dev                    # load the plugin from this copy even if it's also installed
  cowork -LocalBoard             # also start the optional localhost board server (desktop app)
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)][string]$Workspace = (Get-Location).Path,
  [string]$Name = "",
  [switch]$Chrome,
  [Alias("Board")][switch]$LocalBoard,
  [switch]$NoRemote,
  [switch]$Dev,
  [switch]$Installed,   # older flag; installation is detected now
  [switch]$Quiet,
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
  Write-Host "Claude Code isn't installed. Install it from https://code.claude.com/docs/en/setup, then run cowork again." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path -LiteralPath $Workspace -PathType Container)) { Write-Host "There's no folder at $Workspace." -ForegroundColor Red; exit 1 }
$Workspace = (Resolve-Path -LiteralPath $Workspace).Path
if ($Workspace.TrimEnd('\') -eq $HOME.TrimEnd('\')) {
  Write-Host "Run cowork inside a folder made for the work, not your home folder. Make a folder, open it, and start cowork there." -ForegroundColor Yellow
  exit 1
}
if (-not $Name) { $Name = Split-Path -Leaf $Workspace }

# --- First run in this folder: lay out the workspace. Existing files are never overwritten. -----------------
$firstRun = -not (Test-Path (Join-Path $Workspace "CLAUDE.md"))
foreach ($d in @("outputs", "inbox", "automation", "memory\people", "memory\projects", "memory\topics")) {
  New-Item -ItemType Directory -Path (Join-Path $Workspace $d) -Force | Out-Null
}
$copies = [ordered]@{
  "CLAUDE.md" = "CLAUDE.md"; "TASKS.md" = "TASKS.md"; "CONNECTORS.md" = "CONNECTORS.md"
  "memory\MEMORY.md" = "memory\MEMORY.md"; "memory\profile.md" = "memory\profile.md"
  "memory\preferences.md" = "memory\preferences.md"; "gitignore" = ".gitignore"
}
foreach ($src in $copies.Keys) {
  $dst = Join-Path $Workspace $copies[$src]
  if (-not (Test-Path $dst)) { Copy-Item (Join-Path $Templates $src) $dst }
}
if (Select-String -Path (Join-Path $Workspace "CLAUDE.md") -SimpleMatch "~~your name" -Quiet) { $firstRun = $true }

if ($LocalBoard) {
  if (Get-Command node -ErrorAction SilentlyContinue) {
    New-Item -ItemType Directory -Path (Join-Path $Workspace ".cowork") -Force | Out-Null
    New-Item -ItemType File -Path (Join-Path $Workspace ".cowork\board-autostart") -Force | Out-Null
    $url = (& node (Join-Path $PluginRoot "scripts\board\board.mjs") start --workspace $Workspace | Select-Object -Last 1)
    if ($url) { Write-Host "Local board: $url" -ForegroundColor Cyan }
  } else { Write-Host "The local board needs Node.js 18+; skipping it." -ForegroundColor Yellow }
}

# --- Use the installed plugin when there is one, so its skills aren't loaded twice. --------------------------
$pluginsDir = Join-Path $HOME ".claude\plugins"
$isInstalled = $PluginRoot.StartsWith($pluginsDir, [System.StringComparison]::OrdinalIgnoreCase)
$registry = Join-Path $pluginsDir "installed_plugins.json"
if ((Test-Path $registry) -and (Select-String -Path $registry -SimpleMatch '"cowork-cli@cowork-cli"' -Quiet)) { $isInstalled = $true }

$claudeArgs = @()
if ($NoRemote) { $claudeArgs += @("--name", $Name) } else { $claudeArgs += @("--remote-control", $Name) }
if (-not $isInstalled -or $Dev) { $claudeArgs += @("--plugin-dir", $PluginRoot) }
if ($Chrome)         { $claudeArgs += "--chrome" }
if ($Model)          { $claudeArgs += @("--model", $Model) }
if ($Continue)       { $claudeArgs += "--continue" }
if ($PermissionMode) { $claudeArgs += @("--permission-mode", $PermissionMode) }
if ($AddDir.Count -gt 0) { $claudeArgs += "--add-dir"; $claudeArgs += $AddDir }
# Start with something useful waiting on the phone: a welcome the first time, a brief after that.
if (-not $Quiet -and -not $Continue) { $claudeArgs += $(if ($firstRun) { "/cowork welcome" } else { "/cowork" }) }

Write-Host ""
Write-Host "Cowork is starting in `"$Name`"  " -NoNewline; Write-Host $Workspace -ForegroundColor DarkGray
if (-not $NoRemote) {
  Write-Host "  Pick it up on your phone or computer: Claude app -> Code -> `"$Name`"  (or claude.ai/code)"
  Write-Host "  Keep this window open and the computer awake while you work."
}
if ($firstRun) { Write-Host "  First time here: Claude will ask a couple of questions to set the folder up." }
Write-Host ""
Set-Location -LiteralPath $Workspace
& claude @claudeArgs
