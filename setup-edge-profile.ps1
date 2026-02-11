# setup-edge-profile.ps1
# Auto-detect Microsoft Edge profiles and generate MCP configuration

param(
    [switch]$Apply,
    [string]$ConfigType = "vscode",  # vscode, copilot-cli, claude, cursor, windsurf
    [switch]$Help
)

if ($Help) {
    Write-Host @"
setup-edge-profile.ps1 - Auto-detect Edge profiles and generate MCP configuration

USAGE:
    .\setup-edge-profile.ps1 [-Apply] [-ConfigType <type>]

OPTIONS:
    -Apply          Automatically apply configuration to the selected MCP client config file
    -ConfigType     Target MCP client: vscode, copilot-cli, claude, cursor, windsurf (default: vscode)
    -Help           Show this help message

EXAMPLES:
    .\setup-edge-profile.ps1
    .\setup-edge-profile.ps1 -Apply -ConfigType vscode
    .\setup-edge-profile.ps1 -ConfigType copilot-cli

DESCRIPTION:
    This script automates Edge profile detection and MCP configuration:
    1. Scans Edge User Data directory for profiles
    2. Reads profile preferences to extract name and email
    3. Presents interactive selection menu
    4. Generates MCP configuration for your client
    5. Optionally auto-applies the configuration

"@ -ForegroundColor Cyan
    exit 0
}

Write-Host "`n=== Edge Profile Auto-Detection ===" -ForegroundColor Cyan
Write-Host "Scanning for Microsoft Edge profiles...`n" -ForegroundColor White

# Locate Edge User Data directory
$edgeUserDataDir = "$env:LOCALAPPDATA\Microsoft\Edge\User Data"

if (-not (Test-Path $edgeUserDataDir)) {
    Write-Host "ERROR: Edge User Data directory not found at:" -ForegroundColor Red
    Write-Host "  $edgeUserDataDir" -ForegroundColor Yellow
    Write-Host "`nPlease ensure Microsoft Edge is installed." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found Edge User Data directory:" -ForegroundColor Green
Write-Host "  $edgeUserDataDir`n" -ForegroundColor White

# Detect profiles
$profiles = @()
$profileDirs = Get-ChildItem -Path $edgeUserDataDir -Directory | Where-Object { 
    $_.Name -eq "Default" -or $_.Name -match "^Profile \d+$" 
}

foreach ($profileDir in $profileDirs) {
    $preferencesPath = Join-Path $profileDir.FullName "Preferences"
    
    if (Test-Path $preferencesPath) {
        try {
            $preferences = Get-Content $preferencesPath -Raw | ConvertFrom-Json
            
            $profileName = if ($preferences.profile.name) { 
                $preferences.profile.name 
            } else { 
                $profileDir.Name 
            }
            
            $email = $null
            if ($preferences.account_info -and $preferences.account_info.Count -gt 0) {
                $email = $preferences.account_info[0].email
            }
            
            $profiles += [PSCustomObject]@{
                Directory = $profileDir.Name
                Name = $profileName
                Email = $email
                FullPath = $profileDir.FullName
            }
        } catch {
            Write-Host "Warning: Could not read preferences for $($profileDir.Name)" -ForegroundColor Yellow
        }
    }
}

if ($profiles.Count -eq 0) {
    Write-Host "ERROR: No Edge profiles found." -ForegroundColor Red
    Write-Host "Please create at least one profile in Microsoft Edge." -ForegroundColor Yellow
    exit 1
}

# Display detected profiles
Write-Host "Detected Edge Profiles:" -ForegroundColor Green
Write-Host ""

for ($i = 0; $i -lt $profiles.Count; $i++) {
    $profile = $profiles[$i]
    $displayText = "  [$($i + 1)] $($profile.Directory) — $($profile.Name)"
    if ($profile.Email) {
        $displayText += " ($($profile.Email))"
    }
    Write-Host $displayText -ForegroundColor White
}

Write-Host ""

# Prompt for selection
do {
    $selection = Read-Host "Select a profile [1-$($profiles.Count)]"
    $selectedIndex = [int]$selection - 1
} while ($selectedIndex -lt 0 -or $selectedIndex -ge $profiles.Count)

$selectedProfile = $profiles[$selectedIndex]

Write-Host "`nSelected Profile:" -ForegroundColor Green
Write-Host "  Directory: $($selectedProfile.Directory)" -ForegroundColor White
Write-Host "  Name: $($selectedProfile.Name)" -ForegroundColor White
if ($selectedProfile.Email) {
    Write-Host "  Email: $($selectedProfile.Email)" -ForegroundColor White
}
Write-Host ""

# Check if Edge is currently using this profile
$edgeProcesses = Get-Process -Name "msedge" -ErrorAction SilentlyContinue
$profileInUse = $false

if ($edgeProcesses) {
    foreach ($process in $edgeProcesses) {
        try {
            $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
            if ($commandLine -like "*$($selectedProfile.Directory)*") {
                $profileInUse = $true
                break
            }
        } catch {
            # Ignore errors accessing process command line
        }
    }
}

if ($profileInUse) {
    Write-Host "WARNING: Microsoft Edge appears to be using this profile." -ForegroundColor Yellow
    Write-Host "Playwright's launchPersistentContext may fail with a ProcessSingleton error." -ForegroundColor Yellow
    Write-Host "`nOptions:" -ForegroundColor Cyan
    Write-Host "  1. Close Microsoft Edge before running Darbot Browser MCP" -ForegroundColor White
    Write-Host "  2. Use --isolated flag to run in isolated mode (new temp profile)" -ForegroundColor White
    Write-Host ""
}

# Generate configuration based on client type
$userDataDirEscaped = $edgeUserDataDir -replace '\\', '\\'

function Get-MCPConfig {
    param($profile, $configType, $userDataDir)
    
    # Build args array
    $argsArray = @(
        "@darbotlabs/darbot-browser-mcp@latest",
        "--user-data-dir", $userDataDir,
        "--edge-profile", $profile.Directory
    )
    
    if ($profile.Email) {
        $argsArray += "--edge-profile-email", $profile.Email
    }
    
    $argsArray += "--caps", "tabs pdf history wait files"
    
    # Format args as JSON array items
    $jsonArgs = $argsArray | ForEach-Object { 
        $escaped = $_ -replace '\\', '\\' -replace '"', '\"'
        "`"$escaped`""
    }
    
    switch ($configType) {
        "vscode" {
            return @"
// Add to VS Code settings.json (Ctrl+Shift+P → "Preferences: Open User Settings (JSON)")
{
  "github.copilot.chat.mcp.servers": {
    "darbot-browser-mcp": {
      "command": "npx",
      "args": [
        $($jsonArgs -join ",`n        ")
      ]
    }
  }
}
"@
        }
        "copilot-cli" {
            return @"
// mcp-config.json for GitHub Copilot CLI
{
  "args": [
    "-y",
    $($jsonArgs -join ",`n    ")
  ]
}
"@
        }
        "claude" {
            return @"
// Add to Claude Desktop config (~/.claude/settings.json or %APPDATA%/Claude/settings.json)
{
  "mcpServers": {
    "darbot-browser-mcp": {
      "command": "npx",
      "args": [
        $($jsonArgs -join ",`n        ")
      ]
    }
  }
}
"@
        }
        "cursor" {
            return @"
// Add to Cursor settings.json
{
  "mcpServers": {
    "darbot-browser-mcp": {
      "command": "npx",
      "args": [
        $($jsonArgs -join ",`n        ")
      ]
    }
  }
}
"@
        }
        "windsurf" {
            return @"
// Add to Windsurf mcp_config.json (~/.codeium/windsurf/mcp_config.json)
{
  "mcpServers": {
    "darbot-browser-mcp": {
      "command": "npx",
      "args": [
        $($jsonArgs -join ",`n        ")
      ]
    }
  }
}
"@
        }
        default {
            return "Unknown config type: $configType"
        }
    }
}

# Display configuration
Write-Host "=== Generated MCP Configuration ===" -ForegroundColor Cyan
Write-Host ""
$config = Get-MCPConfig -profile $selectedProfile -configType $ConfigType -userDataDir $edgeUserDataDir
Write-Host $config -ForegroundColor White
Write-Host ""

# Apply configuration if requested
if ($Apply) {
    Write-Host "=== Applying Configuration ===" -ForegroundColor Cyan
    
    $configPath = switch ($ConfigType) {
        "vscode" {
            $vscodeDir = "$env:APPDATA\Code\User"
            if (-not (Test-Path $vscodeDir)) {
                New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null
            }
            Join-Path $vscodeDir "settings.json"
        }
        "copilot-cli" {
            $cliDir = "$env:USERPROFILE\.github-copilot-cli"
            if (-not (Test-Path $cliDir)) {
                New-Item -ItemType Directory -Path $cliDir -Force | Out-Null
            }
            Join-Path $cliDir "mcp-config.json"
        }
        "claude" {
            $claudeDir = "$env:APPDATA\Claude"
            if (-not (Test-Path $claudeDir)) {
                New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
            }
            Join-Path $claudeDir "settings.json"
        }
        "cursor" {
            $cursorDir = "$env:APPDATA\Cursor\User"
            if (-not (Test-Path $cursorDir)) {
                Write-Host "ERROR: Cursor configuration directory not found." -ForegroundColor Red
                Write-Host "Please install Cursor first." -ForegroundColor Yellow
                exit 1
            }
            Join-Path $cursorDir "settings.json"
        }
        "windsurf" {
            $windsurfDir = "$env:USERPROFILE\.codeium\windsurf"
            if (-not (Test-Path $windsurfDir)) {
                New-Item -ItemType Directory -Path $windsurfDir -Force | Out-Null
            }
            Join-Path $windsurfDir "mcp_config.json"
        }
        default {
            Write-Host "ERROR: Unknown config type: $ConfigType" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host "Updating configuration file:" -ForegroundColor Yellow
    Write-Host "  $configPath" -ForegroundColor White
    
    # Build the config object to merge
    $argsArray = @(
        "@darbotlabs/darbot-browser-mcp@latest",
        "--user-data-dir", $edgeUserDataDir,
        "--edge-profile", $selectedProfile.Directory
    )
    
    if ($selectedProfile.Email) {
        $argsArray += "--edge-profile-email", $selectedProfile.Email
    }
    
    $argsArray += "--caps", "tabs pdf history wait files"
    
    $mcpServerConfig = @{
        command = "npx"
        args = $argsArray
    }
    
    # Read existing config or create new
    $existingConfig = @{}
    if (Test-Path $configPath) {
        try {
            $existingConfig = Get-Content $configPath -Raw | ConvertFrom-Json -AsHashtable
        } catch {
            Write-Host "Warning: Could not parse existing config, creating new one" -ForegroundColor Yellow
            $existingConfig = @{}
        }
    }
    
    # Merge configuration based on type
    switch ($ConfigType) {
        "vscode" {
            if (-not $existingConfig.ContainsKey("github.copilot.chat.mcp.servers")) {
                $existingConfig["github.copilot.chat.mcp.servers"] = @{}
            }
            $existingConfig["github.copilot.chat.mcp.servers"]["darbot-browser-mcp"] = $mcpServerConfig
        }
        "copilot-cli" {
            $existingConfig = @{
                args = @("-y") + $argsArray
            }
        }
        { $_ -in @("claude", "cursor", "windsurf") } {
            if (-not $existingConfig.ContainsKey("mcpServers")) {
                $existingConfig["mcpServers"] = @{}
            }
            $existingConfig["mcpServers"]["darbot-browser-mcp"] = $mcpServerConfig
        }
    }
    
    # Write updated config
    try {
        $existingConfig | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8
        Write-Host "`nConfiguration applied successfully!" -ForegroundColor Green
        Write-Host "You may need to restart your MCP client for changes to take effect." -ForegroundColor Yellow
    } catch {
        Write-Host "`nERROR: Failed to write configuration file:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "To apply this configuration manually:" -ForegroundColor Cyan
    Write-Host "  Copy the configuration above to your MCP client's config file" -ForegroundColor White
    Write-Host "`nOr run with -Apply flag to automatically update the config:" -ForegroundColor Cyan
    Write-Host "  .\setup-edge-profile.ps1 -Apply -ConfigType $ConfigType" -ForegroundColor White
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
