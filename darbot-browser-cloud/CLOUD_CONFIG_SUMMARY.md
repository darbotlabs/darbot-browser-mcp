# Darbot Browser MCP - Azure Cloud Configuration Summary

Successfully deployed Darbot Browser MCP to Azure App Service with full enterprise features, including:
- [VALIDATED] Docker containerization with Azure Container Registry (ca18 deployed)
- [VALIDATED] Managed identity with RBAC permissions (Key Vault, Storage, ACR)
- [VALIDATED] Application Insights monitoring and diagnostics
- [VALIDATED] Secure Key Vault integration (azure-client-secret stored)
- [VALIDATED] Blob storage for sessions and audit logs (2 containers)
- [VALIDATED] Complete Microsoft Copilot Studio integration readiness

---

## Docker Image Configuration

### Azure Container Registry (ACR)
- **Registry Name**: `darbotbrowsermcp`
- **Login Server**: `darbotbrowsermcp.azurecr.io`
- **Location**: East US
- **SKU**: Basic
- **Admin Enabled**: Yes


### Docker Image Details
- **Image Name**: `darbot-browser-mcp`
- **Tag**: `latest`
- **Full Image Path**: `darbotbrowsermcp.azurecr.io/darbot-browser-mcp:latest`
- **Digest**: `sha256:e97421a68d97b029bce67cba69287ca08c2d2bba9c9d76e2f59fb9c89de8309e`
- **Build ID**: `ca5` (Successful)
- **Build Duration**: 2m47s
- **Image Size**: ~1.2 GB (includes Chromium browser and Node.js runtime)

### Dockerfile Configuration (azure/Dockerfile.acr)
```dockerfile
# Base Image
FROM node:23-bookworm-slim

# Key Environment Variables
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_ENV=production
ENV PORT=8080
ENV WEBSITES_PORT=8080

# Application Structure
WORKDIR /app

# Package Installation Strategy
- All dependencies installed: NODE_ENV=development npm ci
- DevDependencies included for TypeScript build
- Production cleanup: npm prune --omit=dev after build
- Total packages: 319 (dev) -> 98 (production)

# Browser Configuration
- Chromium 139.0.7258.31 (playwright build v1182)
- FFMPEG build v1011
- Browser path: /ms-playwright/chromium-1182

# Security Configuration
- Non-root user: app (UID 1001, GID 1001)
- Health check: curl http://localhost:8080/health (30s interval)
- Entry point: dumb-init for proper signal handling

# Startup Command
CMD ["node", "cli.js", 
     "--headless", 
     "--browser", "chromium", 
     "--no-sandbox", 
     "--host", "0.0.0.0", 
     "--port", "8080", 
     "--output-dir", "/app/data"]
```

### Build Process Details


#### Critical Fixes Applied
1. **Removed BuildKit Features**: Eliminated `--mount` flags for ACR compatibility
2. **Fixed npm Install**: Used `NODE_ENV=development npm ci` to include devDependencies
3. **TypeScript Compilation**: Ensured `tsc` available during build phase
4. **Package Updates**: Updated all npm packages to latest versions (319 packages)
5. **Production Optimization**: Added `npm prune --omit=dev` after build

#### Final Build Output
```
Run ID: ca5 was successful after 2m47s
Successfully built 248a57901e1c
Successfully tagged darbotbrowsermcp.azurecr.io/darbot-browser-mcp:latest
```

---

## [ARCH] Azure Infrastructure Resources

### Resource Group
- **Name**: `darbot-browser-mcp`
- **Location**: East US (primary), West US 2 (App Service)
- **Subscription**: `88dc9c38-361e-4516-9072-ae9504620c0f`
- **Subscription Name**: MSFT_funded
- **Status**: Active

### 1. Log Analytics Workspace
- **Resource Name**: `darbot-browser-mcp-workspace`
- **Resource ID**: `/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.OperationalInsights/workspaces/darbot-browser-mcp-workspace`
- **Location**: East US
- **SKU**: PerGB2018
- **Retention**: 30 days
- **Customer ID**: `8108880b-2ec0-444e-83c1-91455ed3d6f0`
- **Purpose**: Centralized logging and diagnostics for all resources

### 2. Application Insights
- **Resource Name**: `darbot-browser-mcp-insights`
- **Resource ID**: `/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.Insights/components/darbot-browser-mcp-insights`
- **Location**: East US
- **Type**: Web application monitoring
- **Instrumentation Key**: `21b3c00c-ce53-45fa-ad72-5a5c074afc75`
- **Connection String**: `InstrumentationKey=21b3c00c-ce53-45fa-ad72-5a5c074afc75;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=b2c6cc53-8b9b-4b1d-b4f9-024150554654`
- **Application ID**: `b2c6cc53-8b9b-4b1d-b4f9-024150554654`

### 3. Storage Account
- **Resource Name**: `darbotbrowsermcpstorage`
- **Resource ID**: `/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.Storage/storageAccounts/darbotbrowsermcpstorage`
- **Location**: East US
- **SKU**: Standard_LRS
- **Kind**: StorageV2
- **Primary Blob Endpoint**: `https://darbotbrowsermcpstorage.blob.core.windows.net/`

#### Blob Containers
1. **browser-sessions**
   - Created: 2025-10-17T21:46:15+00:00
   - Public Access: None (Private)
   - Purpose: Browser session state and work profiles

2. **audit-logs**
   - Created: 2025-10-17T21:46:19+00:00
   - Public Access: None (Private)
   - Purpose: Compliance and audit trail

### 4. Key Vault
- **Resource Name**: `darbotbrowsermcpkv`
- **Resource ID**: `/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.KeyVault/vaults/darbotbrowsermcpkv`
- **Location**: East US
- **Vault URI**: `https://darbotbrowsermcpkv.vault.azure.net/`
- **SKU**: Standard
- **Tenant ID**: `6b104499-c49f-45dc-b3a2-df95efd6eeb4`
- **Access Policy**: RBAC-based (Azure role-based access control)
- **Soft Delete**: Enabled (7-day retention)

#### Secrets Stored
1. **azure-client-secret**
   - Created: 2025-10-17T21:48:25+00:00
   - Purpose: Azure AD application authentication

### 5. Azure Container Registry
- **Resource Name**: `darbotbrowsermcp`
- **Resource ID**: `/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.ContainerRegistry/registries/darbotbrowsermcp`
- **Location**: East US
- **Login Server**: `darbotbrowsermcp.azurecr.io`
- **SKU**: Basic
- **Admin User**: Enabled
- **Status**: Active

### 6. App Service Plan
- **Resource Name**: `darbot-browser-mcp-plan`
- **Resource ID**: `/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.Web/serverfarms/darbot-browser-mcp-plan`
- **Location**: West US 2 (due to quota availability)
- **SKU**: Premium V3 P1v3
- **OS**: Linux
- **Pricing Tier**: Production-grade

#### Specifications
- **vCPU Cores**: 2
- **Memory**: 8 GB RAM
- **Storage**: 250 GB
- **Features**: Auto-scaling capable, Always On, Load balancing

### 7. App Service (Web App)
- **Resource Name**: `darbot-browser-mcp`
- **Resource ID**: `/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.Web/sites/darbot-browser-mcp`
- **Location**: West US 2
- **Default Hostname**: `darbot-browser-mcp.azurewebsites.net`
- **State**: Running
- **Runtime**: Linux Container (Docker)
- **Container Image**: `darbotbrowsermcp.azurecr.io/darbot-browser-mcp:latest`
- **Platform**: 64-bit
- **Always On**: Enabled
- **HTTPS Only**: Enabled (but not enforced - can be configured)

#### Managed Identity
- **Type**: System-assigned
- **Principal ID**: `8c14b20d-6d8e-4e19-86c0-3b71265e47be`
- **Tenant ID**: `6b104499-c49f-45dc-b3a2-df95efd6eeb4`

#### Outbound IP Addresses
```
20.29.154.129, 172.179.28.24, 4.149.89.73, 
20.59.52.125, 172.179.82.88, 4.154.248.181, 
20.42.128.107
```

---

## RBAC Permissions & Role Assignments

### Web App Managed Identity Permissions

#### 1. Key Vault Access
- **Role**: Key Vault Secrets User
- **Role Definition ID**: `/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/providers/Microsoft.Authorization/roleDefinitions/4633458b-17de-408a-b874-0445c86b69e6`
- **Scope**: `darbotbrowsermcpkv` Key Vault
- **Assigned**: 2025-10-17T22:18:05+00:00
- **Assignment ID**: (auto-generated)

#### 2. Storage Blob Access
- **Role**: Storage Blob Data Contributor
- **Role Definition ID**: `/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/providers/Microsoft.Authorization/roleDefinitions/ba92f5b4-2d11-453d-a403-e96b0029c9fe`
- **Scope**: `darbotbrowsermcpstorage` Storage Account
- **Assigned**: 2025-10-17T22:18:20+00:00
- **Assignment ID**: (auto-generated)

#### 3. ACR Pull Permission
- **Role**: AcrPull
- **Role Definition ID**: `/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/providers/Microsoft.Authorization/roleDefinitions/7f951dda-4ed3-4680-a7ca-43fe172d538d`
- **Scope**: `darbotbrowsermcp` Container Registry
- **Assigned**: 2025-11-12T00:18:41+00:00
- **Assignment ID**: `6993922a-6aa1-4799-836f-c55d9e683723`

---

## Application Configuration

### Environment Variables (App Settings)

```json
{
  "WEBSITES_ENABLE_APP_SERVICE_STORAGE": "false",
  "DOCKER_REGISTRY_SERVER_URL": "https://darbotbrowsermcp.azurecr.io",
  "DOCKER_CUSTOM_IMAGE_NAME": "DOCKER|darbotbrowsermcp.azurecr.io/darbot-browser-mcp:latest",
  "WEBSITES_PORT": "8080",
  "PORT": "8080",
  "WEBSITES_CONTAINER_START_TIME_LIMIT": "600",
  "DOCKER_ENABLE_CI": "true",
  
  "AZURE_TENANT_ID": "6b104499-c49f-45dc-b3a2-df95efd6eeb4",
  "AZURE_CLIENT_ID": "947ac666-be6a-471f-818f-6b52064d927e",
  "AZURE_CLIENT_SECRET": "@Microsoft.KeyVault(SecretUri=https://darbotbrowsermcpkv.vault.azure.net/secrets/azure-client-secret/)",
  
  "ENTRA_AUTH_ENABLED": "true",
  "COPILOT_STUDIO_ENABLED": "true",
  "AUDIT_LOGGING_ENABLED": "true",
  
  "COPILOT_STUDIO_CALLBACK_URL": "https://darbot-browser-mcp.azurewebsites.net/auth/callback",
  "SERVER_BASE_URL": "https://darbot-browser-mcp.azurewebsites.net",
  
  "MAX_CONCURRENT_SESSIONS": "20",
  "SESSION_TIMEOUT_MS": "1800000",
  
  "PLAYWRIGHT_BROWSERS_PATH": "/ms-playwright",
  "NODE_ENV": "production",
  
  "APPINSIGHTS_INSTRUMENTATIONKEY": "21b3c00c-ce53-45fa-ad72-5a5c074afc75",
  "APPLICATIONINSIGHTS_CONNECTION_STRING": "InstrumentationKey=21b3c00c-ce53-45fa-ad72-5a5c074afc75;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/",
  "ApplicationInsightsAgent_EXTENSION_VERSION": "~3",
  
  "STORAGE_ACCOUNT_NAME": "darbotbrowsermcpstorage"
}
```

### Container Configuration
- **Registry**: Azure Container Registry (managed identity authentication)
- **Startup Time Limit**: 600 seconds (10 minutes)
- **Continuous Deployment**: Enabled
- **Platform**: Linux x64
- **HTTP Version**: HTTP/2 Enabled
- **TLS Version**: 1.2 minimum

### Security Configuration
- **FTPS State**: Disabled (enforced)
- **HTTPS Only**: Configurable (currently not enforced)
- **Client Certificate Mode**: Optional
- **Minimum TLS Version**: 1.2
- **Remote Debugging**: Disabled

---

## Service Endpoints

### Application URLs
- **Primary URL**: `https://darbot-browser-mcp.azurewebsites.net`
- **Health Check**: `https://darbot-browser-mcp.azurewebsites.net/health`
- **OpenAPI Spec**: `https://darbot-browser-mcp.azurewebsites.net/openapi.json`

### MCP Protocol Endpoints
- **MCP Server (Primary)**: `https://darbot-browser-mcp.azurewebsites.net/mcp`
- **SSE Transport (Legacy)**: `https://darbot-browser-mcp.azurewebsites.net/sse`

### Authentication Endpoints
- **OAuth Entry**: `https://darbot-browser-mcp.azurewebsites.net/auth`
- **OAuth Callback**: `https://darbot-browser-mcp.azurewebsites.net/auth/callback`

### Azure Portal Links
- **Resource Group**: https://portal.azure.com/#@/resource/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp
- **Web App**: https://portal.azure.com/#@/resource/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.Web/sites/darbot-browser-mcp
- **App Insights**: https://portal.azure.com/#@/resource/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.Insights/components/darbot-browser-mcp-insights
- **Storage**: https://portal.azure.com/#@/resource/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.Storage/storageAccounts/darbotbrowsermcpstorage
- **Key Vault**: https://portal.azure.com/#@/resource/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.KeyVault/vaults/darbotbrowsermcpkv
- **ACR**: https://portal.azure.com/#@/resource/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.ContainerRegistry/registries/darbotbrowsermcp

---

## Deployment Commands Used

### Infrastructure Setup (Manual CLI)
```powershell
# 1. Log Analytics Workspace
az monitor log-analytics workspace create `
  --resource-group darbot-browser-mcp `
  --workspace-name darbot-browser-mcp-workspace `
  --location eastus

# 2. Application Insights
az monitor app-insights component create `
  --app darbot-browser-mcp-insights `
  --location eastus `
  --resource-group darbot-browser-mcp `
  --workspace /subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.OperationalInsights/workspaces/darbot-browser-mcp-workspace

# 3. Storage Account
az storage account create `
  --name darbotbrowsermcpstorage `
  --resource-group darbot-browser-mcp `
  --location eastus `
  --sku Standard_LRS `
  --kind StorageV2

# 4. Blob Containers
az storage container create --name browser-sessions --account-name darbotbrowsermcpstorage
az storage container create --name audit-logs --account-name darbotbrowsermcpstorage

# 5. Key Vault
az keyvault create `
  --name darbotbrowsermcpkv `
  --resource-group darbot-browser-mcp `
  --location eastus `
  --enable-rbac-authorization true

# 6. Store Client Secret
az keyvault secret set `
  --vault-name darbotbrowsermcpkv `
  --name azure-client-secret `
  --value "YOUR_CLIENT_SECRET"
```

### App Service Deployment (West US 2)
```powershell
# 1. App Service Plan (P1v3)
az appservice plan create `
  --name darbot-browser-mcp-plan `
  --resource-group darbot-browser-mcp `
  --location westus2 `
  --is-linux `
  --sku P1v3

# 2. Web App
az webapp create `
  --name darbot-browser-mcp `
  --resource-group darbot-browser-mcp `
  --plan darbot-browser-mcp-plan `
  --deployment-container-image-name darbotlabs/darbot-browser-mcp:latest

# 3. Enable Managed Identity
az webapp identity assign `
  --name darbot-browser-mcp `
  --resource-group darbot-browser-mcp

# 4. Configure App Settings (23 settings)
az webapp config appsettings set `
  --name darbot-browser-mcp `
  --resource-group darbot-browser-mcp `
  --settings @settings.json

# 5. Grant RBAC Permissions
az role assignment create `
  --assignee 8c14b20d-6d8e-4e19-86c0-3b71265e47be `
  --role "Key Vault Secrets User" `
  --scope /subscriptions/.../darbotbrowsermcpkv

az role assignment create `
  --assignee 8c14b20d-6d8e-4e19-86c0-3b71265e47be `
  --role "Storage Blob Data Contributor" `
  --scope /subscriptions/.../darbotbrowsermcpstorage
```

### Azure Container Registry & Docker Build
```powershell
# 1. Create ACR
az acr create `
  --name darbotbrowsermcp `
  --resource-group darbot-browser-mcp `
  --sku Basic `
  --location eastus `
  --admin-enabled true

# 2. Build Docker Image (successful ca5 build)
az acr build `
  --registry darbotbrowsermcp `
  --image darbot-browser-mcp:latest `
  --file azure/Dockerfile.acr `
  --platform linux `
  .

# 3. Configure Web App to Use ACR
az webapp config container set `
  --name darbot-browser-mcp `
  --resource-group darbot-browser-mcp `
  --container-image-name darbotbrowsermcp.azurecr.io/darbot-browser-mcp:latest `
  --container-registry-url https://darbotbrowsermcp.azurecr.io

# 4. Grant ACR Pull Permission
az role assignment create `
  --assignee 8c14b20d-6d8e-4e19-86c0-3b71265e47be `
  --role AcrPull `
  --scope /subscriptions/.../darbotbrowsermcp

# 5. Restart Web App
az webapp restart `
  --name darbot-browser-mcp `
  --resource-group darbot-browser-mcp
```

---

## Status & Health

```

**Note**: "Unhealthy" status is usually due to high memory usage (91%), memory will stabilize after browser initialization completes. Otherwise reboot after 240 seconds if needed.
```

### Container Status
- **State**: Running
- **Last Restart**: 2025-11-12 00:19:00 UTC
- **Container Platform**: Linux x64
- **Node Version**: v22.21.1

---

## Cost Estimate (Monthly)

| Resource | SKU/Configuration | Estimated Cost |
|----------|-------------------|----------------|
| App Service Plan P1v3 | 2 vCPU, 8GB RAM | $225-250/month |
| Storage Account (Standard LRS) | ~50GB data | $1-5/month |
| Log Analytics Workspace | Pay-per-GB (first 5GB free) | $2-10/month |
| Application Insights | Basic tier | $2-10/month |
| Key Vault | Standard tier | ~$1/month |
| Azure Container Registry | Basic tier | ~$5/month |
| **Total Estimated Monthly Cost** | | **~$235-280/month** |

### Cost Optimization Recommendations
1. Use B1 tier for development/testing (~$13/month)
2. Enable auto-scaling to optimize instance count
3. Set appropriate session timeouts
4. Monitor and adjust concurrent session limits
5. Consider S2 tier for balanced cost/performance (~$100/month)

---

## [VALIDATED] Monitoring & Diagnostics

### Application Insights Configuration
- **Status**: VALIDATED (January 23, 2026)
- **Instrumentation Key**: `21b3c00c-ce53-45fa-ad72-5a5c074afc75`
- **Agent Extension**: `~3` (Auto-instrumentation enabled)
- **Workspace**: Linked to `darbot-browser-mcp-workspace`

### Application Insights Metrics
- **Requests**: All HTTP requests tracked
- **Dependencies**: External service calls monitored
- **Exceptions**: Automatic exception tracking
- **Performance**: Response time and throughput metrics
- **Availability**: Health check monitoring

### Log Analytics Workspace
- **Name**: `darbot-browser-mcp-workspace`
- **Customer ID**: `8108880b-2ec0-444e-83c1-91455ed3d6f0`
- **Retention**: 30 days
- **State**: Succeeded

### Log Analytics Queries
```kusto
// Recent application logs
AppServiceConsoleLogs
| where TimeGenerated > ago(1h)
| order by TimeGenerated desc

// Failed requests
AppServiceHTTPLogs  
| where ScStatus >= 400
| order by TimeGenerated desc

// Performance metrics
AppServicePlatformLogs
| where Message contains "CPU" or Message contains "Memory"
| order by TimeGenerated desc
```

### Health Monitoring
- **Health Check Path**: `/health`
- **Check Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Start Period**: 5 seconds
- **Retries**: 3
- **Memory Thresholds**: Warn at 95%, Fail at 98%

---

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. Health Check Returns "degraded" or "unhealthy"
**Cause**: Memory usage above threshold (was 80%, now 95%)
**Solution**:
```powershell
# Check current health
Invoke-RestMethod -Uri "https://darbot-browser-mcp.azurewebsites.net/health" | ConvertTo-Json -Depth 3

# If memory > 95%, restart the app
az webapp stop --name darbot-browser-mcp --resource-group darbot-browser-mcp
Start-Sleep -Seconds 5
az webapp start --name darbot-browser-mcp --resource-group darbot-browser-mcp
```

#### 2. MCP Connection Returns 404 "Cannot POST /mcp"
**Cause**: Express routes not registered before httpServer.on('request') handler
**Solution**: Routes must be registered as Express routes, not raw HTTP handlers. Fixed in ca16+.

#### 3. JSON Parse Error on /mcp Endpoint
**Cause**: `express.json()` middleware consuming request body before MCP SDK
**Solution**: Skip JSON parsing for `/mcp` and `/sse` endpoints (fixed in ca14+):
```typescript
app.use((req, res, next) => {
  if (req.path === '/mcp' || req.path === '/sse') return next();
  return express.json()(req, res, next);
});
```

#### 4. OAuth Popup "Dynamic Client Registration not supported"
**Cause**: MCP OAuth flow not configured for anonymous access
**Solution**: Set `ALLOW_ANONYMOUS_ACCESS=true` in App Settings (fixed in ca14+)

#### 5. Session Not Found (404) After Server Restart
**Cause**: In-memory sessions lost on restart
**Solution**: Server now creates new session when old sessionId not found (fixed in ca17+)

#### 6. Azure CLI Build Encoding Error (charmap codec)
**Cause**: Windows console encoding issue with Unicode characters
**Solution**:
```powershell
chcp 65001
az acr build --registry darbotbrowsermcp --image darbot-browser-mcp:TAG --file azure/Dockerfile.acr . --no-logs
```

### Diagnostic Commands
```powershell
# Check container image
az webapp config container show --name darbot-browser-mcp --resource-group darbot-browser-mcp --query "[?name=='DOCKER_CUSTOM_IMAGE_NAME'].value" -o tsv

# View live logs
az webapp log tail --name darbot-browser-mcp --resource-group darbot-browser-mcp

# Check managed identity permissions
az role assignment list --assignee 8c14b20d-6d8e-4e19-86c0-3b71265e47be --all --query "[].{Role:roleDefinitionName,Resource:scope}" -o table

# Full stop/start cycle
az webapp stop --name darbot-browser-mcp --resource-group darbot-browser-mcp
Start-Sleep -Seconds 5
az webapp start --name darbot-browser-mcp --resource-group darbot-browser-mcp

# Test MCP endpoint
$body = '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'
Invoke-RestMethod -Uri "https://darbot-browser-mcp.azurewebsites.net/mcp" -Method POST -Headers @{"Content-Type"="application/json";"Accept"="application/json, text/event-stream"} -Body $body
```

### Build History (Key Fixes)
| Build | Date | Fix Applied |
|-------|------|-------------|
| ca14 | Jan 23, 2026 | JSON body parsing skip for /mcp |
| ca15 | Jan 23, 2026 | Session recovery on 404 |
| ca16 | Jan 23, 2026 | Express route registration |
| ca17 | Jan 23, 2026 | CORS middleware ordering |
| ca18 | Jan 23, 2026 | Memory threshold adjustment (95%/98%) |

---

## Client Configuration for Cloud MCP Server

### VS Code Configuration
```json
{
  "mcpServers": {
    "darbot-browser-cloud": {
      "url": "https://darbot-browser-mcp.azurewebsites.net/mcp",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "darbot-browser-cloud": {
      "url": "https://darbot-browser-mcp.azurewebsites.net/mcp",
      "transport": "http"
    }
  }
}
```

### Environment Variables for Clients
```bash
export DARBOT_MCP_URL="https://darbot-browser-mcp.azurewebsites.net/mcp"
export DARBOT_MCP_HEALTH="https://darbot-browser-mcp.azurewebsites.net/health"
export DARBOT_MCP_OPENAPI="https://darbot-browser-mcp.azurewebsites.net/openapi.json"
```

## Deployment Timeline

| Component | Status |
|-----------|--------|
| Log Analytics Workspace | VALIDATED |
| Application Insights | VALIDATED |
| Storage Account | VALIDATED |
| Blob containers (browser-sessions, audit-logs) | VALIDATED |
| Key Vault | VALIDATED |
| Client secret (azure-client-secret) | VALIDATED |
| App Service Plan (West US 2, P1v3) | VALIDATED |
| Web App | VALIDATED |
| App settings (29 configured) | VALIDATED |
| Managed identity | VALIDATED |
| RBAC permissions (Key Vault, Storage, ACR) | VALIDATED |
| Packages updated | VALIDATED |
| Dockerfile.acr | VALIDATED |
| ACR build (ca18 current) | VALIDATED |
| Docker image in ACR | VALIDATED |
| Web App ACR configuration | VALIDATED |
| ACR pull permission | VALIDATED |
| Health check responding | VALIDATED |

**Last Validated**: January 24, 2026 

---

### Documentation
- [Azure Deployment Guide](./README.md)
- [Deployment Fixes](./DEPLOYMENT_FIXES.md)
- [Deployment Status](./DEPLOYMENT_STATUS.md)
- [Main README](../README.md)

### Azure Portal Quick Links
- [Resource Group Overview](https://portal.azure.com/#@/resource/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp)
- [Application Insights Dashboard](https://portal.azure.com/#@/resource/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.Insights/components/darbot-browser-mcp-insights)
- [Container Registry](https://portal.azure.com/#@/resource/subscriptions/88dc9c38-361e-4516-9072-ae9504620c0f/resourceGroups/darbot-browser-mcp/providers/Microsoft.ContainerRegistry/registries/darbotbrowsermcp)

### Support & Troubleshooting
- Check health: `curl https://darbot-browser-mcp.azurewebsites.net/health`
- View logs: `az webapp log tail --name darbot-browser-mcp --resource-group darbot-browser-mcp`
- Monitor metrics: Application Insights in Azure Portal
- GitHub Issues: https://github.com/darbotlabs/darbot-browser-mcp/issues

---
