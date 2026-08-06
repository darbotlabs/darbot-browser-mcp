#Requires -Version 7.0
[CmdletBinding()]
param(
    [switch]$Confirm,
    [switch]$BuildImage,
    [string]$ResourceGroup = $env:AZURE_RESOURCE_GROUP,
    [string]$Location = $env:AZURE_LOCATION,
    [string]$Prefix = $env:AZURE_PREFIX,
    [ValidateSet('dev', 'test', 'stage', 'prod')]
    [string]$Environment = $env:AZURE_ENVIRONMENT,
    [string]$RegionCode = $env:AZURE_REGION_CODE,
    [string]$ParametersFile = $env:PARAMETERS_FILE,
    [string]$ContainerRepository = $(if ($env:CONTAINER_REPOSITORY) { $env:CONTAINER_REPOSITORY } else { 'darbot-browser-mcp' }),
    [string]$ContainerTag = $(if ($env:CONTAINER_TAG) { $env:CONTAINER_TAG } else { '2.1.1' }),
    [string]$AppServiceSku = $(if ($env:APP_SERVICE_SKU) { $env:APP_SERVICE_SKU } else { 'B1' }),
    [string]$ContainerRegistrySku = $(if ($env:CONTAINER_REGISTRY_SKU) { $env:CONTAINER_REGISTRY_SKU } else { 'Basic' }),
    [string]$EntraClientId = $env:ENTRA_CLIENT_ID,
    [string]$AuthClientSecretName = $env:AUTH_CLIENT_SECRET_NAME,
    [string]$ServerBaseUrl = $env:SERVER_BASE_URL,
    [string]$AllowedOriginsCsv = $env:ALLOWED_ORIGINS_CSV
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Log {
    param([string]$Message)
    Write-Host "[$((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))] $Message"
}

function Assert-Value {
    param([string]$Name, [string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "Set $Name before running this script."
    }
}

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw 'Azure CLI is required. Install it and run az login.'
}
az account show --output none 2>$null

Assert-Value -Name 'AZURE_RESOURCE_GROUP or -ResourceGroup' -Value $ResourceGroup
Assert-Value -Name 'AZURE_LOCATION or -Location' -Value $Location
Assert-Value -Name 'AZURE_PREFIX or -Prefix' -Value $Prefix
Assert-Value -Name 'AZURE_ENVIRONMENT or -Environment' -Value $Environment
Assert-Value -Name 'AZURE_REGION_CODE or -RegionCode' -Value $RegionCode

$ScriptDir = Split-Path -Parent $PSCommandPath
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..\..')
$TemplateFile = Join-Path $RepoRoot 'azure\bicep\main.bicep'
$DeploymentName = "darbot-browser-mcp-$Environment-$((Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss'))"

Write-Log "Ensuring resource group $ResourceGroup exists in $Location."
az group create --name $ResourceGroup --location $Location --only-show-errors --output none

$ContainerImage = @{ repository = $ContainerRepository; tag = $ContainerTag } | ConvertTo-Json -Compress
$Parameters = @(
    "prefix=$Prefix",
    "environment=$Environment",
    "location=$Location",
    "regionCode=$RegionCode",
    "appServiceSku=$AppServiceSku",
    "containerRegistrySku=$ContainerRegistrySku",
    "containerImage=$ContainerImage",
    "entraClientId=$EntraClientId",
    "authClientSecretName=$AuthClientSecretName",
    "serverBaseUrl=$ServerBaseUrl"
)

if (-not [string]::IsNullOrWhiteSpace($AllowedOriginsCsv)) {
    $AllowedOrigins = $AllowedOriginsCsv.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    $Parameters += "allowedOrigins=$($AllowedOrigins | ConvertTo-Json -Compress)"
}
if (-not [string]::IsNullOrWhiteSpace($ParametersFile)) {
    $Parameters += "@$ParametersFile"
}

Write-Log "Running what-if for $DeploymentName."
az deployment group what-if `
    --resource-group $ResourceGroup `
    --name $DeploymentName `
    --template-file $TemplateFile `
    --parameters $Parameters

if (-not $Confirm) {
    Write-Log 'What-if complete. Re-run with -Confirm to apply changes.'
    return
}

Write-Log "Applying deployment $DeploymentName."
az deployment group create `
    --resource-group $ResourceGroup `
    --name $DeploymentName `
    --template-file $TemplateFile `
    --parameters $Parameters `
    --output table

$Outputs = az deployment group show --resource-group $ResourceGroup --name $DeploymentName --query properties.outputs -o json | ConvertFrom-Json
$AppUrl = $Outputs.appUrl.value
$AcrLoginServer = $Outputs.acrLoginServer.value

if ($BuildImage) {
    $AcrName = $AcrLoginServer.Split('.')[0]
    Write-Log "Building $AcrLoginServer/${ContainerRepository}:$ContainerTag with Azure Container Registry."
    az acr build `
        --registry $AcrName `
        --image "${ContainerRepository}:$ContainerTag" `
        --file (Join-Path $RepoRoot 'azure\docker\Dockerfile.acr') `
        $RepoRoot
}

Write-Log 'Deployment complete.'
Write-Log "App URL: $AppUrl"
Write-Log "ACR login server: $AcrLoginServer"
Write-Log "Health check: $AppUrl/healthz"
