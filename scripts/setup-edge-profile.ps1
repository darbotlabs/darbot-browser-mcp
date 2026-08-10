#!/usr/bin/env pwsh
#Requires -Version 7.0
[CmdletBinding()]
param(
    [switch]$Apply,
    [ValidateSet('vscode','copilot-cli','claude','cursor','windsurf')]
    [string]$ConfigType = 'vscode',
    [int]$ProfileIndex = 0,
    [switch]$List,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $projectRoot 'package.json'
$packageVersion = if (Test-Path $packageJsonPath) {
    ([System.IO.File]::ReadAllText($packageJsonPath) | ConvertFrom-Json).version
} else {
    throw "Repository package.json not found: $packageJsonPath"
}
$packageSpec = "@darbotlabs/darbot-browser-mcp@$packageVersion"

if ($Help) {
    @'
Usage: pwsh scripts/setup-edge-profile.ps1 [-List] [-ProfileIndex <n>] [-ConfigType <type>] [-Apply]

Detects Microsoft Edge profiles and prints or applies an MCP client config.
'@ | Write-Host
    exit 0
}

function Get-EdgeUserDataDir {
    if (-not $IsWindows) { throw 'Edge profile auto-detection is supported on Windows only.' }
    $path = Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\User Data'
    if (-not (Test-Path $path)) { throw "Edge User Data directory not found: $path" }
    $path
}

function Get-EdgeProfiles([string]$UserDataDir) {
    Get-ChildItem -Path $UserDataDir -Directory |
        Where-Object { $_.Name -eq 'Default' -or $_.Name -match '^Profile \d+$' } |
        ForEach-Object {
            $displayName = $_.Name
            $email = $null
            $preferencesPath = Join-Path $_.FullName 'Preferences'
            if (Test-Path $preferencesPath) {
                try {
                    $preferences = Get-Content $preferencesPath -Raw | ConvertFrom-Json
                    if ($preferences.profile.name) { $displayName = [string]$preferences.profile.name }
                    if ($preferences.account_info -and $preferences.account_info.Count -gt 0) { $email = [string]$preferences.account_info[0].email }
                } catch {
                    Write-Warning "Could not parse $preferencesPath"
                }
            }
            [pscustomobject]@{ Directory = $_.Name; Name = $displayName; Email = $email; Path = $_.FullName }
        }
}

function Get-ServerArgs($Profile, [string]$UserDataDir) {
    $args = @($packageSpec,'--user-data-dir',$UserDataDir,'--edge-profile',$Profile.Directory)
    if ($Profile.Email) { $args += @('--edge-profile-email',$Profile.Email) }
    $args + @('--caps','tabs,pdf,history,wait,files')
}

function Get-ConfigObject([string]$Type, $Profile, [string]$UserDataDir) {
    $server = @{ command = 'npx'; args = (Get-ServerArgs $Profile $UserDataDir) }
    switch ($Type) {
        'vscode' { @{ 'github.copilot.chat.mcp.servers' = @{ 'darbot-browser-mcp' = $server } } }
        'copilot-cli' { @{ args = @('-y') + $server.args } }
        default { @{ mcpServers = @{ 'darbot-browser-mcp' = $server } } }
    }
}

function Get-ConfigPath([string]$Type) {
    switch ($Type) {
        'vscode' { Join-Path $env:APPDATA 'Code\User\settings.json' }
        'copilot-cli' { Join-Path $env:USERPROFILE '.github-copilot-cli\mcp-config.json' }
        'claude' { Join-Path $env:APPDATA 'Claude\settings.json' }
        'cursor' { Join-Path $env:APPDATA 'Cursor\User\settings.json' }
        'windsurf' { Join-Path $env:USERPROFILE '.codeium\windsurf\mcp_config.json' }
    }
}

$userDataDir = Get-EdgeUserDataDir
$profiles = @(Get-EdgeProfiles $userDataDir)
if ($profiles.Count -eq 0) { throw 'No Microsoft Edge profiles found.' }

for ($i = 0; $i -lt $profiles.Count; $i++) {
    $profile = $profiles[$i]
    $emailSuffix = if ($profile.Email) { " <$($profile.Email)>" } else { '' }
    Write-Host ("[{0}] {1} - {2}{3}" -f $i, $profile.Directory, $profile.Name, $emailSuffix)
}

if ($List) { exit 0 }
if ($ProfileIndex -lt 0 -or $ProfileIndex -ge $profiles.Count) { throw "ProfileIndex $ProfileIndex is outside 0..$($profiles.Count - 1)." }

$config = Get-ConfigObject $ConfigType $profiles[$ProfileIndex] $userDataDir
$json = $config | ConvertTo-Json -Depth 20
Write-Host "`nGenerated $ConfigType configuration:`n$json"

if ($Apply) {
    $path = Get-ConfigPath $ConfigType
    New-Item -ItemType Directory -Force -Path (Split-Path $path -Parent) | Out-Null
    $json | Set-Content -Path $path -Encoding utf8NoBOM
    Write-Host "Updated $path" -ForegroundColor Green
}
