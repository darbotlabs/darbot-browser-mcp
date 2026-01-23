<#
.SYNOPSIS
  Deploy Darbot Browser MCP to Azure (PowerShell port of deploy.sh)

.DESCRIPTION
  This script guides the user through deploying the Darbot Browser MCP to Azure.
  It will attempt to run elevated (relaunch as admin if necessary), allow the
  user to select an Azure subscription, enter or pick resource group/app name,
  and then run the Bicep deployment. It does NOT run the deployment automatically
  without user consent.

.NOTES
  - Requires Azure CLI (`az`) installed and authenticated (the script will prompt
    to run `az login` if not already logged in).
  - This script does NOT send telemetry. It stores the client secret in Key Vault
    as the Bicep template expects.

#>

param(
    [string]$ResourceGroup,
    [string]$AppName,
    [string]$Location = 'eastus',
    [string]$TenantId,
    [string]$ClientId,
    [string]$CallbackUrl
)

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERROR] $msg" -ForegroundColor Red }

function Ensure-Administrator {
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Warn "Script is not running as Administrator. Attempting to relaunch with elevation..."
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = 'powershell.exe'
        $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location '$PSScriptRoot\..' ; & '$PSCommandPath' $($args -join ' ')`""
        $psi.Verb = 'runas'
        try {
            [System.Diagnostics.Process]::Start($psi) | Out-Null
            Exit 0
        } catch {
            Write-Err "Failed to relaunch as Administrator. Please run an elevated PowerShell and retry."
            Exit 1
        }
    }
}

function Ensure-AzCLI {
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        Write-Err "Azure CLI (az) is not installed or not on PATH. Please install it: https://docs.microsoft.com/cli/azure/install-azure-cli"
        Exit 1
    }
}

function Ensure-AzLogin {
    try {
        $acct = az account show --output json 2>$null | ConvertFrom-Json
        if (-not $acct) { throw 'not-logged-in' }
    } catch {
        Write-Info "You are not logged in to Azure CLI. Opening browser for 'az login'..."
        az login | Out-Null
    }
}

function Select-AzSubscriptionInteractive {
    $subs = az account list --output json | ConvertFrom-Json
    if (-not $subs) { Write-Err "No subscriptions found for account."; Exit 1 }
    $choices = $subs | ForEach-Object { "$($_.name) ($($_.id))" }
    Write-Host "Select an Azure subscription:`n"
    for ($i=0; $i -lt $choices.Count; $i++) { Write-Host "[$($i+1)] $($choices[$i])" }
    $sel = Read-Host "Enter number (default 1)"; if ($sel -eq '') { $sel = 1 }
    $idx = [int]$sel - 1
    if ($idx -lt 0 -or $idx -ge $choices.Count) { Write-Err "Invalid selection"; Exit 1 }
    $sub = $subs[$idx]
    az account set --subscription $sub.id
    Write-Info "Selected subscription: $($sub.name) ($($sub.id))"
}

function Prompt-Default([string]$prompt, [string]$default) {
    $resp = Read-Host "$prompt [$default]"
    if ($resp -eq '') { return $default } else { return $resp }
}

function ConvertFrom-SecureStringPlainText([SecureString]$secure) {
    if (-not $secure) { return $null }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

### Main
# Note: Admin elevation is not required for Azure CLI operations
# Commenting out elevation check to allow running without UAC prompt
# Ensure-Administrator

# Ensure we're in the repo root directory
$scriptDir = Split-Path -Parent $PSCommandPath
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot
Write-Info "Working directory: $repoRoot"

Ensure-AzCLI
Ensure-AzLogin

if (-not $TenantId) { $TenantId = az account show --query tenantId -o tsv }

if (-not $ResourceGroup) {
    $ResourceGroup = Read-Host 'Enter Resource Group name (will be created if missing)'
}
if (-not $AppName) {
    $AppName = Read-Host 'Enter App Service name (DNS-friendly)'
}
if (-not $Location) {
    $Location = Read-Host 'Enter Azure location (e.g. eastus)'
}

if (-not $CallbackUrl) { $CallbackUrl = "https://$AppName.azurewebsites.net/auth/callback" }

Write-Info "Resource Group: $ResourceGroup"
Write-Info "App Name: $AppName"
Write-Info "Location: $Location"
Write-Info "Tenant ID: $TenantId"

# Confirm or let user pick subscription
Select-AzSubscriptionInteractive

# Check/Create resource group
$rgExists = az group exists --name $ResourceGroup
if ($rgExists -eq 'true') {
    Write-Info "Resource group '$ResourceGroup' already exists."
} else {
    Write-Info "Creating resource group '$ResourceGroup' in $Location..."
    az group create --name $ResourceGroup --location $Location
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Failed to create resource group"
        Exit 1
    }
}

# Client registration
if (-not $ClientId) {
    Write-Info "Creating Azure AD application registration for $AppName..."
    $appId = az ad app create --display-name "$AppName-auth" --web-redirect-uris $CallbackUrl --query appId -o tsv
    if (-not $appId) { Write-Err "Failed to create app registration"; Exit 1 }
    $ClientId = $appId
    Write-Info "Created Azure AD app with Client ID: $ClientId"
    Write-Info "Creating client secret..."
    $ClientSecret = az ad app credential reset --id $ClientId --query password -o tsv
    if (-not $ClientSecret) { Write-Err "Failed to create client secret"; Exit 1 }
} else {
    Write-Warn "Using provided Client ID: $ClientId"
    Write-Warn "When providing an existing Client ID you should supply the client secret via environment variable or interactively."
    $secureSecret = Read-Host -AsSecureString "Enter Client Secret (input will be hidden)"
    $ClientSecret = ConvertFrom-SecureStringPlainText $secureSecret
    if (-not $ClientSecret) { Write-Err "Client secret cannot be empty when using existing Client ID"; Exit 1 }
}

# Confirm before deployment
Write-Host "`nAbout to deploy with the following parameters:`n"
Write-Host "Resource Group: $ResourceGroup"
Write-Host "App Name: $AppName"
Write-Host "Location: $Location"
Write-Host "Tenant ID: $TenantId"
Write-Host "Client ID: $ClientId"
Write-Host "Callback URL: $CallbackUrl"

$ok = Read-Host 'Proceed with deployment? (y/N)'
if ($ok -notin @('y','Y','yes','Yes')) { Write-Err "Deployment cancelled by user"; Exit 1 }

### Run Bicep deployment
$timestamp = Get-Date -Format yyyyMMdd-HHmmss
$deploymentName = "darbot-mcp-$timestamp"

Write-Info "Starting Bicep deployment: $deploymentName"
$bicepPath = Join-Path $repoRoot "azure\templates\main.bicep"
Write-Info "Using Bicep template: $bicepPath"

az deployment group create `
    --resource-group $ResourceGroup `
    --template-file $bicepPath `
    --name $deploymentName `
    --parameters `
        appName=$AppName `
        location=$Location `
        azureTenantId=$TenantId `
        azureClientId=$ClientId `
        azureClientSecret=$ClientSecret `
        copilotStudioCallbackUrl=$CallbackUrl

if ($LASTEXITCODE -ne 0) {
    Write-Err "Bicep deployment failed"
    Exit 1
}

Write-Info "Retrieving deployment outputs..."
$outputs = az deployment group show --resource-group $ResourceGroup --name $deploymentName --query properties.outputs --output json | ConvertFrom-Json

$appUrl = $outputs.appServiceUrl.value
$healthUrl = $outputs.healthCheckUrl.value
$openApiUrl = $outputs.openApiUrl.value

Write-Info "Waiting for health endpoint to become available (up to ~5 minutes)..."
$maxAttempts = 30
for ($i=0; $i -lt $maxAttempts; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) { Write-Info "Application is ready!"; break }
    } catch {
        Start-Sleep -Seconds 10
    }
    if ($i -eq $maxAttempts-1) { Write-Warn "Health endpoint did not respond in time. Check manually: $healthUrl" }
}

Write-Host "`n=== Deployment Information ===`n"
Write-Host "Application URL: $appUrl"
Write-Host "Health Check: $healthUrl"
Write-Host "OpenAPI Spec: $openApiUrl"
Write-Host "Azure AD App ID: $ClientId"

Write-Host "`n=== Configuration for Copilot Studio ===`n"
Write-Host "MCP Endpoint: ${appUrl}/mcp"
Write-Host "SSE Endpoint: ${appUrl}/sse"
Write-Host "Auth Endpoint: ${appUrl}/auth"

Write-Info "Deployment finished. Review output above for next steps."
