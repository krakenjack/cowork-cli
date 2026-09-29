@echo off
rem Double-click or run from any terminal: launches cowork.ps1 with the same arguments.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0cowork.ps1" %*
