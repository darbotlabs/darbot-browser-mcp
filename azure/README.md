# Azure Deployment for Darbot Browser MCP

This directory contains Azure deployment templates and scripts for deploying Darbot Browser MCP with Microsoft Copilot Studio integration capabilities.

## Quick Start

### Prerequisites
- Azure CLI installed and configured (`az login`)
- Azure subscription with contributor permissions
- Resource group (will be created if doesn't exist)

### Deploy with Script
```bash
# Make sure you're in the project root
cd darbot-browser-mcp

# Run the deployment script
./azure/deploy.sh my-resource-group darbot-browser-mcp eastus
```

### Deploy with Bicep
```bash
# Deploy using Bicep template
az deployment group create \
  --resource-group my-resource-group \
  --template-file azure/templates/main.bicep \
  --parameters @azure/parameters.example.json
```

## Architecture

The deployment creates the following Azure resources:

- **App Service** - Hosts the MCP server with Linux containers
- **App Service Plan** - Provides compute resources (S1 SKU by default)
- **Key Vault** - Stores secrets securely (client secret, API keys)
- **Application Insights** - Monitoring and diagnostics
- **Log Analytics Workspace** - Centralized logging
- **Storage Account** - Session storage and artifacts

## Configuration

### Environment Variables

The following environment variables are automatically configured:

#### Authentication
- `AZURE_TENANT_ID` - Your Azure tenant ID
- `AZURE_CLIENT_ID` - Application client ID
- `AZURE_CLIENT_SECRET` - Application secret (stored in Key Vault)
- `ENTRA_AUTH_ENABLED=true` - Enable Entra ID authentication

#### Copilot Studio Integration  
- `COPILOT_STUDIO_ENABLED=true` - Enable Copilot Studio features
- `COPILOT_STUDIO_CALLBACK_URL` - OAuth callback URL
- `MAX_CONCURRENT_SESSIONS=20` - Maximum browser sessions
- `SESSION_TIMEOUT_MS=1800000` - Session timeout (30 minutes)

#### Monitoring
- `AUDIT_LOGGING_ENABLED=true` - Enable audit logging
- `APPINSIGHTS_INSTRUMENTATIONKEY` - Application Insights key
- `APPLICATIONINSIGHTS_CONNECTION_STRING` - Connection string

### Custom Configuration

1. Copy `azure/parameters.example.json` to `azure/parameters.json`
2. Update the parameters with your values:
   ```json
   {
     "parameters": {
       "appName": { "value": "your-app-name" },
       "azureTenantId": { "value": "your-tenant-id" },
       "azureClientId": { "value": "your-client-id" },
       "copilotStudioCallbackUrl": { "value": "your-callback-url" }
     }
   }
   ```
3. Deploy using the custom parameters:
   ```bash
   az deployment group create \
     --resource-group my-resource-group \
     --template-file azure/templates/main.bicep \
     --parameters @azure/parameters.json
   ```

## Security

### Authentication Setup

The deployment automatically creates an Azure AD application registration. You can also use an existing one:

```bash
# Create application registration
az ad app create \
  --display-name "Darbot Browser MCP" \
  --web-redirect-uris "https://your-app.azurewebsites.net/auth/callback"

# Create client secret
az ad app credential reset --id YOUR_CLIENT_ID
```

### Secure by Default

- HTTPS enforced
- Client secrets stored in Key Vault
- Managed identity for Key Vault access
- Network security configured
- Application Insights monitoring enabled

## Monitoring

### Health Checks

The deployment includes comprehensive health monitoring:

- **Health Endpoint**: `https://your-app.azurewebsites.net/health`
- **Readiness**: `https://your-app.azurewebsites.net/ready`
- **Liveness**: `https://your-app.azurewebsites.net/live`

### Application Insights

Monitor your deployment with:
- Performance metrics
- Error tracking
- Custom telemetry
- Availability monitoring

Access via Azure Portal > Your Resource Group > Application Insights

### Logs

View application logs:
```bash
# Stream logs
az webapp log tail --resource-group my-resource-group --name your-app-name

# View recent logs
az webapp log show --resource-group my-resource-group --name your-app-name
```

## Scaling

### Vertical Scaling (Scale Up)
```bash
# Scale to a larger SKU
az appservice plan update \
  --resource-group my-resource-group \
  --name your-app-plan \
  --sku P1
```

### Horizontal Scaling (Scale Out)
```bash
# Scale to multiple instances
az appservice plan update \
  --resource-group my-resource-group \
  --name your-app-plan \
  --number-of-workers 3
```

### Auto-scaling
Configure auto-scaling rules in the Azure Portal:
1. Go to App Service Plan
2. Select "Scale out (App Service plan)"
3. Configure rules based on CPU, memory, or custom metrics

## Troubleshooting

### Common Issues

#### 1. Deployment Fails
```bash
# Check deployment status
az deployment group show \
  --resource-group my-resource-group \
  --name deployment-name

# View deployment operations
az deployment operation group list \
  --resource-group my-resource-group \
  --name deployment-name
```

#### 2. Application Won't Start
```bash
# Check application logs
az webapp log tail --resource-group my-resource-group --name your-app-name

# Check configuration
az webapp config appsettings list \
  --resource-group my-resource-group \
  --name your-app-name
```

#### 3. Authentication Issues
- Verify tenant ID, client ID in configuration
- Check client secret in Key Vault
- Ensure proper permissions on Azure AD application

#### 4. Performance Issues
- Check Application Insights for performance metrics
- Consider scaling up/out
- Review browser session limits

### Debug Mode

Enable debug logging:
```bash
az webapp config appsettings set \
  --resource-group my-resource-group \
  --name your-app-name \
  --settings DEBUG=darbot:*
```

## Cleanup

Remove all resources:
```bash
# Delete resource group (removes all resources)
az group delete --name my-resource-group --yes

# Or delete individual resources
az webapp delete --resource-group my-resource-group --name your-app-name
az appservice plan delete --resource-group my-resource-group --name your-app-plan
```

## Support

- Review logs in Application Insights
- Check health endpoints for service status
- Create issues on [GitHub](https://github.com/darbotlabs/darbot-browser-mcp/issues)
- View OpenAPI spec at `https://your-app.azurewebsites.net/openapi.json`

## Next Steps

1. **Configure Copilot Studio**: Use the deployed endpoints in your Copilot Studio connector
2. **Test Integration**: Verify health endpoints and tool functionality
3. **Monitor Performance**: Set up alerts and dashboards in Azure Monitor
4. **Scale as Needed**: Adjust resources based on usage patterns