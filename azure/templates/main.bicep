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
    perSiteScaling: false
  }
  sku: {
    name: sku
  }
}

// Auto-scale settings for App Service Plan (only for S1 and above)
resource autoScaleSettings 'Microsoft.Insights/autoscalesettings@2022-10-01' = if (sku != 'F1' && sku != 'D1' && sku != 'B1') {
  name: '${appServicePlanName}-autoscale'
  location: location
  properties: {
    enabled: true
    targetResourceUri: appServicePlan.id
    profiles: [
      {
        name: 'Auto scale based on CPU and memory'
        capacity: {
          minimum: '1'
          maximum: '3'
          default: '1'
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 30
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'MemoryPercentage'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 75
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
        ]
      }
    ]
  }
  dependsOn: [
    appServicePlan
  ]
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

// Blob Service for Storage Account
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2021-09-01' = {
  parent: storageAccount
  name: 'default'
}

// Container for browser session data
resource sessionContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2021-09-01' = {
  parent: blobService
  name: 'browser-sessions'
  properties: {
    publicAccess: 'None'
  }
}

// Container for audit logs
resource auditContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2021-09-01' = {
  parent: blobService
  name: 'audit-logs'
  properties: {
    publicAccess: 'None'
  }
}

// Key Vault (no access policies at creation)
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

// App Service Plan and App Service Identity must be available before Key Vault access policy
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
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'false'
        }
        {
          name: 'WEBSITES_CONTAINER_START_TIME_LIMIT'
          value: '600'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://index.docker.io'
        }
        {
          name: 'DOCKER_ENABLE_CI'
          value: 'true'
        }
        {
          name: 'PORT'
          value: '8080'
        }
        {
          name: 'WEBSITES_PORT'
          value: '8080'
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
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
        {
          name: 'STORAGE_CONNECTION_STRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'STORAGE_ACCOUNT_NAME'
          value: storageAccount.name
        }
        {
          name: 'PLAYWRIGHT_BROWSERS_PATH'
          value: '/ms-playwright'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
      ]
      healthCheckPath: '/health'
    }
    httpsOnly: true
  }
  dependsOn: [
    appServicePlan
    keyVault
    storageAccount
    appInsights
  ]
}

// Key Vault Access Policy for App Service (after identity is available)
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
  dependsOn: [
    appService
  ]
}

// Store the client secret in Key Vault (after access policy is set)
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

// Storage Blob Data Contributor role assignment for App Service
resource storageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, appService.id, 'StorageBlobDataContributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: appService.identity.principalId
    principalType: 'ServicePrincipal'
  }
  dependsOn: [
    appService
    storageAccount
  ]
}

// Diagnostic Settings for App Service
resource appServiceDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'appservice-diagnostics'
  scope: appService
  properties: {
    workspaceId: workspace.id
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
      {
        category: 'AppServicePlatformLogs'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
        retentionPolicy: {
          enabled: true
          days: 30
        }
      }
    ]
  }
  dependsOn: [
    appService
    workspace
  ]
}

// Outputs
output appServiceName string = appService.name
output appServiceUrl string = 'https://${appService.properties.defaultHostName}'
output healthCheckUrl string = 'https://${appService.properties.defaultHostName}/health'
output openApiUrl string = 'https://${appService.properties.defaultHostName}/openapi.json'
output mcpEndpoint string = 'https://${appService.properties.defaultHostName}'
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output appInsightsName string = appInsights.name
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output logAnalyticsWorkspaceId string = workspace.id
output principalId string = appService.identity.principalId
output resourceGroupName string = resourceGroup().name
output location string = location