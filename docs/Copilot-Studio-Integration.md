# Microsoft Copilot Studio Integration 

This guide provides step-by-step instructions for integrating Darbot Browser with Microsoft Copilot Studio, enabling enterprise-grade autonomous browser automation within your Copilot Studio workflows.

## Overview

Darbot Browser now includes enterprise features specifically designed for Microsoft Copilot Studio integration:

- **Microsoft Entra ID Authentication**: Secure authentication using your organization's identity provider
- **Enterprise Security**: HTTPS, request validation, rate limiting, and audit logging
- **Azure Deployment**: Ready-to-deploy Azure App Service templates
- **OpenAPI Specification**: Auto-generated API documentation for seamless integration
- **Health Monitoring**: Comprehensive health checks for production environments

## Prerequisites

### For Azure Deployment
- Azure subscription with appropriate permissions
- Azure CLI installed and configured
- Docker (if building custom images)
- Microsoft Copilot Studio license


(this will also work with dev tunnesl and github api through power platform, no need for app registration)

### For Development
- Node.js 23 or newer
- NPM or Yarn package manager

## Quick Start

### 1. Deploy to Azure

The fastest way to get started is using our Azure deployment templates:

```bash
# Clone the repository
git clone https://github.com/darbotlabs/darbot-browser-mcp.git
cd darbot-browser-mcp

# Run the deployment script
./azure/deploy.sh my-resource-group darbot-mcp-prod eastus
```

This will:
- Create Azure resources (App Service, Key Vault, Application Insights, Storage)
- Configure Microsoft Entra ID authentication
- Deploy the MCP server with enterprise features
- Provide endpoints for Copilot Studio integration

### 2. Configure Copilot Studio

Once deployed, configure Copilot Studio to use the MCP endpoints:

**MCP Endpoint**: `https://your-app-name.azurewebsites.net/mcp`
**Health Check**: `https://your-app-name.azurewebsites.net/health`
**OpenAPI Spec**: `https://your-app-name.azurewebsites.net/openapi.json`

## Configuration

### Environment Variables

The following environment variables control the integration:

#### Authentication
```bash
ENTRA_AUTH_ENABLED=true
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

#### Copilot Studio
```bash
COPILOT_STUDIO_ENABLED=true
COPILOT_STUDIO_CALLBACK_URL=https://your-copilot-studio.com/auth/callback
MAX_CONCURRENT_SESSIONS=20
SESSION_TIMEOUT_MS=1800000
```

#### Security
```bash
AUDIT_LOGGING_ENABLED=true
API_KEY_AUTH_ENABLED=false
RATE_LIMIT_ENABLED=true
```

## Available Tools

Darbot Browser MCP provides 52 autonomous browser tools organized into categories:

### Navigation Tools
- `browser_navigate` - Navigate to URLs
- `browser_go_back` - Navigate backwards
- `browser_go_forward` - Navigate forwards
- `browser_reload` - Reload current page

### Interaction Tools
- `browser_click` - Click elements
- `browser_type` - Type text into inputs
- `browser_drag` - Drag and drop
- `browser_hover` - Hover over elements
- `browser_select_option` - Select dropdown options

### Capture Tools
- `browser_take_screenshot` - Capture screenshots
- `browser_snapshot` - Get accessibility snapshots
- `browser_pdf_save` - Generate PDFs

### Profile Management
- `browser_save_profile` - Save browser sessions
- `browser_switch_profile` - Switch between profiles
- `browser_list_profiles` - List available profiles
- `browser_delete_profile` - Delete profiles

### Testing Tools
- `browser_generate_playwright_test` - Generate test scripts
- `browser_wait_for` - Wait for conditions

*For a complete list of tools, see the OpenAPI specification at `/openapi.json`*

## Authentication Setup

### 1. Create Azure AD Application

```bash
# Create the application
az ad app create \\
  --display-name "Darbot Browser MCP" \\
  --web-redirect-uris "https://your-app.azurewebsites.net/auth/callback"

# Note the appId (client ID) from the output
```

### 2. Create Client Secret

```bash
az ad app credential reset --id YOUR_CLIENT_ID
# Note the password (client secret) from the output
```

### 3. Configure Permissions

In the Azure portal, configure the following API permissions for your application:
- Microsoft Graph: `User.Read` (for basic user information)
- Custom scopes as needed for your organization

## Copilot Studio Integration

### Method 1: MCP Server Integration

Use the direct MCP server integration for the most comprehensive access to browser automation tools:

1. **Configure Connection**:
   ```json
   {
     "mcpServers": {
       "darbot-browser": {
         "url": "https://your-app.azurewebsites.net/mcp",
         "auth": {
           "type": "bearer",
           "token": "YOUR_ACCESS_TOKEN"
         }
       }
     }
   }
   ```

2. **Available in Copilot Studio**: All 52 tools will be available as MCP actions

### Method 2: Custom Connector (Coming Soon)

A dedicated Power Platform connector is in development for native Copilot Studio integration.

## Security Best Practices

### 1. Authentication
- Always enable Entra ID authentication in production
- Use strong client secrets and rotate them regularly
- Implement proper RBAC in your Azure AD tenant

### 2. Network Security
- Use HTTPS only (enforced by default)
- Configure appropriate CORS policies
- Implement IP whitelisting if needed

### 3. Rate Limiting
- Configure appropriate rate limits for your workload
- Monitor usage patterns and adjust as needed

### 4. Audit Logging
- Enable audit logging for compliance
- Monitor logs for suspicious activity
- Integrate with Azure Monitor for alerting

## Monitoring and Troubleshooting

### Health Checks

The server provides multiple health check endpoints:

- `/health` - Comprehensive health status
- `/ready` - Readiness probe for load balancers
- `/live` - Liveness probe for container orchestration

### Application Insights

Monitor your deployment with Azure Application Insights:

- Performance metrics
- Error tracking
- Custom telemetry
- Availability monitoring

### Common Issues

#### 1. Authentication Failures
- Verify tenant ID, client ID, and client secret
- Check token expiration
- Ensure proper permissions are configured

#### 2. Browser Session Issues
- Monitor concurrent session limits
- Check session timeout configuration
- Verify browser installation in container

#### 3. Performance Issues
- Scale up App Service plan if needed
- Monitor memory and CPU usage
- Adjust concurrent session limits

## Examples

### Basic Navigation Example

```javascript
// In Copilot Studio workflow
const result = await mcpServer.callTool('browser_navigate', {
  url: 'https://example.com'
});

const screenshot = await mcpServer.callTool('browser_take_screenshot', {
  element: 'Main content area'
});
```

### Work Profile Example

```javascript
// Save current session as a work profile
await mcpServer.callTool('browser_save_profile', {
  name: 'crm-session',
  description: 'Logged into CRM system'
});

// Later, restore the session
await mcpServer.callTool('browser_switch_profile', {
  name: 'crm-session'
});
```

## Support and Resources

### Documentation
- [OpenAPI Specification](https://your-app.azurewebsites.net/openapi.json)
- [GitHub Repository](https://github.com/darbotlabs/darbot-browser-mcp)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)


## License

This project is licensed under the Apache License 2.0. See the [LICENSE](https://github.com/darbotlabs/darbot-browser-mcp/blob/main/LICENSE) file for details.