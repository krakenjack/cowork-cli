# cowork-cli installer for Windows. Run once per computer, in PowerShell:
#
#   irm https://raw.githubusercontent.com/krakenjack/cowork-cli/main/install.ps1 | iex
#
# It installs the cowork-cli plugin into Claude Code, adds a `cowork` command, and adds "Open Cowork here" to the
# right-click menu of folders in File Explorer. After that: right-click a folder → Open Cowork here.

$ErrorActionPreference = "Stop"
$Repo = "krakenjack/cowork-cli"
$Bin  = Join-Path $env:LOCALAPPDATA "cowork-cli"

function Step($t) { Write-Host ""; Write-Host $t -ForegroundColor White }
function Ok($t)   { Write-Host "  $([char]0x2713) $t" -ForegroundColor Green }
function Warn($t) { Write-Host "  ! $t" -ForegroundColor Yellow }
function Fail($t) { Write-Host ""; Write-Host $t -ForegroundColor Red; return }

Step "Installing Cowork for Claude Code"
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Fail "Claude Code isn't installed yet. Install it first (one line, from https://code.claude.com/docs/en/setup):`n`n    irm https://claude.ai/install.ps1 | iex`n`nThen open a new PowerShell window, type  claude  once to sign in with your Claude account, and run this installer again."
  return
}
Ok "Claude Code found"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Warn "Git for Windows isn't installed. Claude Code needs it on Windows: https://git-scm.com/download/win" }
if (Get-Command node -ErrorAction SilentlyContinue) { Ok "Node.js found (needed for the board)" }
else { Warn "Node.js isn't installed. Everything works except the board (task list and file drop page). Get it from https://nodejs.org when you want it." }

Step "Adding the plugin"
& claude plugin marketplace add $Repo *> $null
if ($LASTEXITCODE -ne 0) { & claude plugin marketplace update cowork-cli *> $null }
& claude plugin install cowork-cli@cowork-cli *> $null
if ($LASTEXITCODE -ne 0) { & claude plugin update cowork-cli@cowork-cli *> $null }
if ($LASTEXITCODE -ne 0) { Fail "Couldn't install the plugin. Run  claude  once to make sure you're signed in, then try again."; return }
Ok "cowork-cli plugin installed"

Step "Adding the cowork command"
New-Item -ItemType Directory -Path $Bin -Force | Out-Null
# cowork.ps1 here finds the installed plugin each time, so plugin updates need no reinstall.
@'
param([Parameter(ValueFromRemainingArguments = $true)]$Rest)
if ($Rest -and $Rest[0] -eq "update") {
  & claude plugin marketplace update cowork-cli; & claude plugin update cowork-cli@cowork-cli
  if ($LASTEXITCODE -eq 0) { Write-Host "Cowork is up to date." }
  return
}
$reg = Join-Path $HOME ".claude\plugins\installed_plugins.json"
$root = $null
try { $root = ((Get-Content $reg -Raw | ConvertFrom-Json).plugins.'cowork-cli@cowork-cli' | Select-Object -Last 1).installPath } catch {}
if (-not $root -or -not (Test-Path (Join-Path $root "scripts\cowork.ps1"))) {
  Write-Host "The cowork-cli plugin isn't installed. Run the installer again:  irm https://raw.githubusercontent.com/krakenjack/cowork-cli/main/install.ps1 | iex" -ForegroundColor Red
  return
}
& (Join-Path $root "scripts\cowork.ps1") @Rest
'@ | Set-Content -Path (Join-Path $Bin "cowork-start.ps1") -Encoding UTF8
@'
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0cowork-start.ps1" %*
'@ | Set-Content -Path (Join-Path $Bin "cowork.cmd") -Encoding ASCII
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (-not (($userPath -split ";") -contains $Bin)) {
  [Environment]::SetEnvironmentVariable("Path", ($(if ($userPath) { "$userPath;" } else { "" }) + $Bin), "User")
}
Ok "cowork command added"

Step "Adding 'Open Cowork here' to the folder right-click menu"
$cmd = Join-Path $Bin "cowork.cmd"
foreach ($entry in @(@{ Key = "Directory\shell\cowork"; Arg = "%1" }, @{ Key = "Directory\Background\shell\cowork"; Arg = "%V" })) {
  $k = "HKCU:\Software\Classes\$($entry.Key)"
  New-Item -Path "$k\command" -Force | Out-Null
  Set-ItemProperty -Path $k -Name "(default)" -Value "Open Cowork here"
  Set-ItemProperty -Path $k -Name "Icon" -Value "cmd.exe"
  Set-ItemProperty -Path "$k\command" -Name "(default)" -Value "cmd.exe /k `"`"$cmd`" `"$($entry.Arg)`"`""
}
Ok "right-click menu added (Windows 11: under 'Show more options')"

Step "Done"
Write-Host "To start working:"
Write-Host "  1. Make a folder for the work in File Explorer."
Write-Host "  2. Right-click it and choose 'Open Cowork here'."
Write-Host "     (Or open a terminal in the folder and type:  cowork)"
Write-Host "  3. Pick the session up in the Claude app on your phone or at claude.ai/code -> Code."
Write-Host ""
Write-Host "Open a new terminal window first, so it knows the cowork command."
