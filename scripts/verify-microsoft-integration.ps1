#!/usr/bin/env pwsh
#Requires -Version 7.0
[CmdletBinding()]
param(
    [switch]$SkipNetwork,
    [switch]$SkipVsCode,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

if ($Help) {
    @'
Usage: pwsh scripts/verify-microsoft-integration.ps1 [-SkipNetwork] [-SkipVsCode]

Verifies Microsoft Edge, VS Code MCP readiness, Node.js, npm, and optional npm package access.
'@ | Write-Host
    exit 0
}

$failures = [System.Collections.Generic.List[string]]::new()
function Add-Failure([string]$Message) { $script:failures.Add($Message); Write-Host "[FAIL] $Message" -ForegroundColor Red }
function Pass([string]$Message) { Write-Host "[PASS] $Message" -ForegroundColor Green }
function Info([string]$Message) { Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Has-Command([string]$Name) { $null -ne (Get-Command $Name -ErrorAction SilentlyContinue) }

Info 'Verifying Microsoft integration prerequisites'
if ($IsWindows) {
    $os = Get-CimInstance Win32_OperatingSystem
    Info "OS: $($os.Caption)"
}

$edgePaths = @()
if ($env:ProgramFiles) { $edgePaths += Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe' }
if (${env:ProgramFiles(x86)}) { $edgePaths += Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe' }
if ($env:LOCALAPPDATA) { $edgePaths += Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe' }
$edge = $edgePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($edge) { Pass "Microsoft Edge found: $((Get-Item $edge).VersionInfo.FileVersion)" } else { Add-Failure 'Microsoft Edge executable not found.' }

if (-not $SkipVsCode) {
    if (Has-Command code) { Pass "VS Code CLI found: $((& code --version)[0])" } else { Add-Failure 'VS Code CLI `code` not found.' }
}

if (Has-Command node) {
    $nodeVersion = & node --version
    $major = [int]($nodeVersion -replace '^v(\d+).*','$1')
    if ($major -ge 20) { Pass "Node.js found: $nodeVersion" } else { Add-Failure "Node.js $nodeVersion is too old; Node.js 20 or newer is required." }
} else { Add-Failure 'Node.js not found.' }

if (Has-Command npm) { Pass "npm found: $(& npm --version)" } else { Add-Failure 'npm not found.' }

if (Test-Path (Join-Path $projectRoot 'package.json')) {
    $rootVersion = ([System.IO.File]::ReadAllText((Join-Path $projectRoot 'package.json')) | ConvertFrom-Json).version
    $extensionPackage = Join-Path $projectRoot 'vscode-extension\package.json'
    if (Test-Path $extensionPackage) {
        $extensionVersion = ([System.IO.File]::ReadAllText($extensionPackage) | ConvertFrom-Json).version
        if ($rootVersion -eq $extensionVersion) { Pass "VS Code extension version matches server: $rootVersion" } else { Add-Failure "Version mismatch: server $rootVersion, VS Code extension $extensionVersion." }
    }
} else {
    Add-Failure "Repository package.json not found under $projectRoot."
}

if (-not $SkipNetwork) {
    try {
        $packageVersion = & npm view '@darbotlabs/darbot-browser-mcp' version --silent
        if ($LASTEXITCODE -eq 0 -and $packageVersion) { Pass "npm package reachable: $packageVersion" } else { Add-Failure 'npm package lookup failed.' }
    } catch { Add-Failure "npm package lookup failed: $($_.Exception.Message)" }
}

if ($failures.Count -gt 0) {
    Write-Host "`nReadiness: $($failures.Count) issue(s) found." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nReadiness: Microsoft integration prerequisites passed." -ForegroundColor Green
exit 0
