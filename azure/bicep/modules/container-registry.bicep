@description('Container registry name. Azure Container Registry does not allow hyphens, so this name is normalized from the convention in main.bicep.')
@maxLength(50)
param name string

@description('Azure region.')
param location string

@description('Container Registry SKU.')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param skuName string

@description('Resource tags.')
param tags object

@description('Public network access setting.')
@allowed([
  'Enabled'
  'Disabled'
])
param publicNetworkAccess string = 'Enabled'

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: name
  location: location
  sku: {
    name: skuName
  }
  tags: tags
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: publicNetworkAccess
    policies: {
      retentionPolicy: {
        status: 'enabled'
        days: 14
      }
    }
  }
}

output id string = registry.id
output name string = registry.name
output loginServer string = registry.properties.loginServer
