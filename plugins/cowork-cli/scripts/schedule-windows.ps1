<#
.SYNOPSIS
  Register (or remove) a Windows Task Scheduler job that runs `claude -p` inside a cowork-cli workspace.

.EXAMPLE
  .\schedule-windows.ps1 -Name inbox-brief -Workspace D:\ops -PromptFile automation\inbox-brief.md -Weekdays -At 08:00
  .\schedule-windows.ps1 -Name pr-watch    -Workspace D:\ops -PromptFile automation\pr-watch.md -EveryMinutes 60
  .\schedule-windows.ps1 -Name inbox-brief -Remove
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)] [string]$Name,
  [string]$Workspace = (Get-Location).Path,
  [string]$PromptFile = "",
  [string]$At = "08:00",
  [switch]$Daily,
  [switch]$Weekdays,
  [int]$EveryMinutes = 0,
  [switch]$Installed,
  [string]$AllowedTools = "",
  [switch]$Remove
)
$ErrorActionPreference = "Stop"
$TaskPath = "\cowork-cli\"

if ($Remove) {
  Unregister-ScheduledTask -TaskName $Name -TaskPath $TaskPath -Confirm:$false
  Write-Host "Removed scheduled task cowork-cli\$Name"
  exit 0
}

if (-not $PromptFile) { throw "-PromptFile is required (path relative to the workspace, e.g. automation\brief.md)" }
$PluginRoot = Split-Path -Parent $PSScriptRoot
$Workspace  = (Resolve-Path -LiteralPath $Workspace).Path
$PromptPath = Join-Path $Workspace $PromptFile
if (-not (Test-Path $PromptPath)) { throw "Prompt file not found: $PromptPath" }
$LogDir = Join-Path $Workspace "outputs\automation\$Name"
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

# Each run: cd into the workspace, pipe the prompt file into claude -p, append output to a dated log.
$flags = "-p `"Carry out the instructions provided on stdin. Write results to outputs/automation/$Name/ and update TASKS.md if you find new commitments.`" --permission-mode acceptEdits --output-format text"
if (-not $Installed) { $flags += " --plugin-dir `"$PluginRoot`"" }
if ($AllowedTools)   { $flags += " --allowedTools `"$AllowedTools`"" }
$cmd = "cd /d `"$Workspace`" && type `"$PromptFile`" | claude $flags >> `"$LogDir\%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%.log`" 2>&1"
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c $cmd"

if ($EveryMinutes -gt 0) {
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes)
} elseif ($Weekdays) {
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At $At
} else {
  $trigger = New-ScheduledTaskTrigger -Daily -At $At
}
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $Name -TaskPath $TaskPath -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Registered cowork-cli\$Name" -ForegroundColor Green
Write-Host "  runs : $cmd" -ForegroundColor DarkGray
Write-Host "  logs : $LogDir"
Write-Host "  check: schtasks /Query /TN `"cowork-cli\$Name`""
Write-Host "  remove: .\schedule-windows.ps1 -Name $Name -Remove"
Write-Host "Note: the task runs under your user account and needs an active Claude Code login on this machine." -ForegroundColor Yellow
