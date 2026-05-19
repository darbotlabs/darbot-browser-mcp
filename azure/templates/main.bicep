// Darbot Browser MCP Azure Deployment
// Bicep template for deploying to Azure App Service with enterprise features

@description('Name of the Darbot Browser MCP application')
param appName string

@description('Location for all resources')
param location string = resourceGroup().location

@description('SKU for the App Service Plan')
@allowed([
  'F1'
  'D1'
  'B1'
  'S1'
  'S2'
  'S3'
  'P1'
  'P2'
  'P3'
])
param sku string = 'S1'

@description('Docker image to deploy')
param dockerImage string = 'darbotlabs/darbot-browser-mcp:latest'

@description('Azure tenant ID for Entra ID authentication')
param azureTenantId string

@description('Azure client ID for Entra ID authentication')
param azureClientId string

@description('Azure client secret for Entra ID authentication')
@secure()
param azureClientSecret string

@description('Copilot Studio OAuth callback URL')
param copilotStudioCallbackUrl string

@description('Maximum number of concurrent browser sessions')
param maxConcurrentSessions int = 20

@description('Session timeout in milliseconds')
param sessionTimeoutMs int = 1800000

// Variables
var appServicePlanName = '${appName}-plan'
var appServiceName = appName
var appInsightsName = '${appName}-insights'
var workspaceName = '${appName}-workspace'
var keyVaultName = '${appName}-kv'
var storageAccountName = '${toLower(appName)}storage'

// Log Analytics Workspace
resource workspace 'Microsoft.OperationalInsights/workspaces@2021-06-01' = {
  name: workspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2021-02-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  properties: {
    reserved: true
  }
  sku: {
    name: sku
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2021-11-01-preview' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    accessPolicies: []
  }
}

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2021-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

// App Service
resource appService 'Microsoft.Web/sites@2021-02-01' = {
  name: appServiceName
  location: location
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${dockerImage}'
      alwaysOn: true
      appSettings: [
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'false'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://index.docker.io'
        }
        {
          name: 'AZURE_TENANT_ID'
          value: azureTenantId
        }
        {
          name: 'AZURE_CLIENT_ID'
          value: azureClientId
        }
        {
          name: 'AZURE_CLIENT_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/azure-client-secret/)'
        }
        {
          name: 'COPILOT_STUDIO_ENABLED'
          value: 'true'
        }
        {
          name: 'COPILOT_STUDIO_CALLBACK_URL'
          value: copilotStudioCallbackUrl
        }
        {
          name: 'ENTRA_AUTH_ENABLED'
          value: 'true'
        }
        {
          name: 'SERVER_BASE_URL'
          value: 'https://${appServiceName}.azurewebsites.net'
        }
        {
          name: 'AUDIT_LOGGING_ENABLED'
          value: 'true'
        }
        {
          name: 'MAX_CONCURRENT_SESSIONS'
          value: string(maxConcurrentSessions)
        }
        {
          name: 'SESSION_TIMEOUT_MS'
          value: string(sessionTimeoutMs)
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
      ]
    }
    httpsOnly: true
  }
}

// Key Vault Access Policy for App Service
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2021-11-01-preview' = {
  name: 'add'
  parent: keyVault
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: appService.identity.principalId
        permissions: {
          secrets: [
            'get'
          ]
        }
      }
    ]
  }
}

// Store the client secret in Key Vault
resource clientSecretSecret 'Microsoft.KeyVault/vaults/secrets@2021-11-01-preview' = {
  parent: keyVault
  name: 'azure-client-secret'
  properties: {
    value: azureClientSecret
  }
  dependsOn: [
    keyVaultAccessPolicy
  ]
}

// Outputs
output appServiceUrl string = 'https://${appService.properties.defaultHostName}'
output healthCheckUrl string = 'https://${appService.properties.defaultHostName}/health'
output openApiUrl string = 'https://${appService.properties.defaultHostName}/openapi.json'
output keyVaultName string = keyVault.name
output appInsightsName string = appInsights.name
output storageAccountName string = storageAccount.name
output principalId string = appService.identity.principalId