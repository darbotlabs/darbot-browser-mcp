targetScope = 'resourceGroup'

@description('Short project prefix used in resource names. Final names follow prefix-environment-region-role where Azure permits hyphens.')
@minLength(2)
@maxLength(12)
param prefix string = 'darbot'

@description('Deployment environment name.')
@allowed([
  'dev'
  'test'
  'stage'
  'prod'
])
param environment string = 'dev'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Short region code used in names, for example eus, wus2, uks, weu.')
@minLength(2)
@maxLength(8)
param regionCode string = 'eus'

@description('App Service Plan SKU.')
@allowed([
  'B1'
  'B2'
  'B3'
  'S1'
  'S2'
  'S3'
  'P1v3'
  'P2v3'
  'P3v3'
])
param appServiceSku string = 'B1'

@description('Azure Container Registry SKU.')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param containerRegistrySku string = 'Basic'

@description('Container image repository and tag deployed from the Azure Container Registry.')
param containerImage {
  repository: string
  tag: string
} = {
  repository: 'darbot-browser-mcp'
  tag: '2.1.4'
}

@description('Runtime settings surfaced as App Service application settings.')
param runtime {
  port: int
  maxConcurrentSessions: int
  sessionTimeoutMs: int
  auditLoggingEnabled: bool
  copilotStudioEnabled: bool
} = {
  port: 8080
  maxConcurrentSessions: 20
  sessionTimeoutMs: 1800000
  auditLoggingEnabled: true
  copilotStudioEnabled: true
}

@description('Microsoft Entra tenant ID used by the application. Defaults to the deployment tenant.')
param entraTenantId string = tenant().tenantId

@description('Optional Microsoft Entra application/client ID. Leave empty to use the App Service system-assigned managed identity for Azure resource access.')
param entraClientId string = ''

@description('Optional Key Vault secret name containing an OAuth client secret. The value is not deployed by this template; set it separately with az keyvault secret set.')
param authClientSecretName string = ''

@description('Optional externally configured public base URL. Defaults to the App Service URL.')
param serverBaseUrl string = ''

@description('Health endpoint path used by App Service and the container health check.')
param healthCheckPath string = '/health'

@description('Optional CORS origins for browser-based management clients.')
param allowedOrigins array = []

@description('Network exposure settings. Set publicNetworkAccess to Disabled after private endpoints are configured.')
param network {
  publicNetworkAccess: 'Enabled' | 'Disabled'
} = {
  publicNetworkAccess: 'Enabled'
}

@description('Additional tags applied to every resource.')
param extraTags object = {}

var baseName = toLower('${prefix}-${environment}-${regionCode}')
var defaultTags = {
  project: 'darbot-browser-mcp'
  environment: environment
  'managed-by': 'bicep'
}
var tags = union(defaultTags, extraTags)
var resourceNames = {
  appServicePlan: '${baseName}-plan'
  appService: '${baseName}-app'
  containerRegistry: take(replace('${baseName}acr', '-', ''), 50)
  keyVault: take('${baseName}-kv', 24)
  appInsights: '${baseName}-appi'
  logAnalytics: '${baseName}-log'
}

module registry 'modules/container-registry.bicep' = {
  name: 'container-registry-${uniqueString(resourceGroup().id, baseName)}'
  params: {
    name: resourceNames.containerRegistry
    location: location
    skuName: containerRegistrySku
    tags: tags
    publicNetworkAccess: network.publicNetworkAccess
  }
}

module keyVault 'modules/key-vault.bicep' = {
  name: 'key-vault-${uniqueString(resourceGroup().id, baseName)}'
  params: {
    name: resourceNames.keyVault
    location: location
    tags: tags
    publicNetworkAccess: network.publicNetworkAccess
  }
}

module insights 'modules/app-insights.bicep' = {
  name: 'app-insights-${uniqueString(resourceGroup().id, baseName)}'
  params: {
    appInsightsName: resourceNames.appInsights
    workspaceName: resourceNames.logAnalytics
    location: location
    tags: tags
  }
}

module app 'modules/app-service.bicep' = {
  name: 'app-service-${uniqueString(resourceGroup().id, baseName)}'
  params: {
    appName: resourceNames.appService
    planName: resourceNames.appServicePlan
    location: location
    skuName: appServiceSku
    tags: tags
    containerImage: '${registry.outputs.loginServer}/${containerImage.repository}:${containerImage.tag}'
    acrLoginServer: registry.outputs.loginServer
    keyVaultUri: keyVault.outputs.vaultUri
    appInsightsConnectionString: insights.outputs.connectionString
    entraTenantId: entraTenantId
    entraClientId: entraClientId
    authClientSecretName: authClientSecretName
    serverBaseUrl: empty(serverBaseUrl) ? 'https://${resourceNames.appService}.azurewebsites.net' : serverBaseUrl
    healthCheckPath: healthCheckPath
    allowedOrigins: allowedOrigins
    runtime: runtime
    publicNetworkAccess: network.publicNetworkAccess
  }
}

module identity 'modules/managed-identity.bicep' = {
  name: 'managed-identity-rbac-${uniqueString(resourceGroup().id, baseName)}'
  params: {
    principalId: app.outputs.principalId
    acrName: registry.outputs.name
    keyVaultName: keyVault.outputs.name
  }
}

output appUrl string = app.outputs.appUrl
output identityPrincipalId string = app.outputs.principalId
output acrLoginServer string = registry.outputs.loginServer
output keyVaultName string = keyVault.outputs.name
output appInsightsName string = insights.outputs.name
