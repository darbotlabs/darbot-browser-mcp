@echo off
REM Simple launcher for deploy.ps1
setlocal

if "%~1"=="--help" goto usage

REM Determine script directory
set SCRIPT_DIR=%~dp0

REM Call PowerShell with execution policy bypass
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%deploy.ps1" %*
exit /b %errorlevel%

:usage
echo Usage: deploy.bat [resourceGroup] [appName] [location] [tenantId] [clientId] [callbackUrl]
echo Example: deploy.bat my-rg darbot-mcp-prod eastus
exit /b 0
