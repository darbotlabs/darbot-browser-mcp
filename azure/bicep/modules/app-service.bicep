@description('App Service name.')
param appName string

@description('App Service Plan name.')
param planName string

@description('Azure region.')
param location string

@description('App Service Plan SKU.')
param skuName string

@description('Resource tags.')
param tags object

@description('Full container image reference.')
param containerImage string

@description('ACR login server used for managed-identity image pulls.')
param acrLoginServer string

@description('Key Vault URI for optional secret references.')
param keyVaultUri string

@description('Application Insights connection string.')
param appInsightsConnectionString string

@description('Microsoft Entra tenant ID.')
param entraTenantId string

@description('Optional Microsoft Entra application/client ID.')
param entraClientId string = ''

@description('Optional Key Vault secret name for an OAuth client secret.')
param authClientSecretName string = ''

@description('Public server base URL.')
param serverBaseUrl string

@description('Health check path.')
param healthCheckPath string

@description('Optional allowed CORS origins.')
param allowedOrigins array = []

@description('Runtime settings.')
param runtime {
  port: int
  maxConcurrentSessions: int
  sessionTimeoutMs: int
  auditLoggingEnabled: bool
  copilotStudioEnabled: bool
}

@description('Public network access setting.')
@allowed([
  'Enabled'
  'Disabled'
])
param publicNetworkAccess string = 'Enabled'

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  kind: 'linux'
  tags: tags
  sku: {
    name: skuName
  }
  properties: {
    reserved: true
  }
}

var baseAppSettings = [
  {
    name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
    value: 'false'
  }
  {
    name: 'WEBSITES_PORT'
    value: string(runtime.port)
  }
  {
    name: 'PORT'
    value: string(runtime.port)
  }
  {
    name: 'DOCKER_REGISTRY_SERVER_URL'
    value: 'https://${acrLoginServer}'
  }
  {
    name: 'AZURE_TENANT_ID'
    value: entraTenantId
  }
  {
    name: 'SERVER_BASE_URL'
    value: serverBaseUrl
  }
  {
    name: 'ENTRA_AUTH_ENABLED'
    value: 'true'
  }
  {
    name: 'COPILOT_STUDIO_ENABLED'
    value: string(runtime.copilotStudioEnabled)
  }
  {
    name: 'AUDIT_LOGGING_ENABLED'
    value: string(runtime.auditLoggingEnabled)
  }
  {
    name: 'MAX_CONCURRENT_SESSIONS'
    value: string(runtime.maxConcurrentSessions)
  }
  {
    name: 'SESSION_TIMEOUT_MS'
    value: string(runtime.sessionTimeoutMs)
  }
  {
    name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    value: appInsightsConnectionString
  }
  {
    name: 'OTEL_SERVICE_NAME'
    value: appName
  }
  {
    name: 'OTEL_RESOURCE_ATTRIBUTES'
    value: 'service.namespace=darbot,service.name=darbot-browser-mcp'
  }
]

var clientIdSettings = empty(entraClientId) ? [] : [
  {
    name: 'AZURE_CLIENT_ID'
    value: entraClientId
  }
]

var secretSettings = empty(authClientSecretName) ? [] : [
  {
    name: 'AZURE_CLIENT_SECRET'
    value: '@Microsoft.KeyVault(SecretUri=${keyVaultUri}secrets/${authClientSecretName})'
  }
]

var corsSettings = empty(allowedOrigins) ? [] : [
  {
    name: 'ALLOWED_ORIGINS'
    value: join(allowedOrigins, ',')
  }
]

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux,container'
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    clientAffinityEnabled: false
    publicNetworkAccess: publicNetworkAccess
    siteConfig: {
      linuxFxVersion: 'DOCKER|${containerImage}'
      alwaysOn: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      healthCheckPath: healthCheckPath
      acrUseManagedIdentityCreds: true
      appSettings: concat(baseAppSettings, clientIdSettings, secretSettings, corsSettings)
    }
  }
}

output id string = app.id
output name string = app.name
output appUrl string = 'https://${app.properties.defaultHostName}'
output principalId string = app.identity.principalId
