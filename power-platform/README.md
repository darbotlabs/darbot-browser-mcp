# Power Platform Custom Connector for Darbot Browser MCP

This directory contains the Microsoft Power Platform custom connector definition for Darbot Browser MCP, enabling native integration with Copilot Studio and other Power Platform services.

## Overview

The custom connector provides access to Darbot Browser MCP's autonomous browser automation capabilities directly within Power Platform, including:

- **Navigation Tools**: Navigate to URLs, go back/forward, reload pages
- **Interaction Tools**: Click elements, type text, drag & drop, hover
- **Capture Tools**: Screenshots, accessibility snapshots, PDF generation
- **Profile Management**: Save, switch, and manage work profiles
- **Wait Tools**: Wait for text, elements, or time conditions

## Files

- `apiDefinition.swagger.json` - OpenAPI 2.0 specification for the connector
- `apiProperties.json` - Connector authentication and metadata properties
- `settings.json` - Connector deployment settings
- `icon.png` - Connector icon (256x256 PNG)

## Prerequisites

### For Deployment
- Power Platform CLI (`pac cli` installed)
- Power Platform environment with appropriate permissions
- Azure subscription for hosting the MCP server

### For Development
- Deployed Darbot Browser MCP instance in Azure
- Azure AD application registration with proper scopes
- Power Platform maker portal access

## Quick Start

### 1. Deploy the MCP Server

First, deploy the Darbot Browser MCP server to Azure:

```bash
# Deploy using the Azure templates
cd ../azure
./deploy.sh my-resource-group darbot-mcp-prod eastus
```

### 2. Configure the Connector

Update the configuration files with your deployment details:

**Update `apiDefinition.swagger.json`:**
```json
{
  "host": "your-darbot-instance.azurewebsites.net",
  "securityDefinitions": {
    "EntraID": {
      "scopes": {
        "https://your-darbot-instance.azurewebsites.net/browser.read": "Read browser state",
        "https://your-darbot-instance.azurewebsites.net/browser.write": "Control browser actions"
      }
    }
  }
}
```

**Update `apiProperties.json`:**
```json
{
  "properties": {
    "connectionParameters": {
      "token": {
        "oAuthSettings": {
          "clientId": "YOUR_AZURE_CLIENT_ID",
          "scopes": [
            "https://your-darbot-instance.azurewebsites.net/browser.read",
            "https://your-darbot-instance.azurewebsites.net/browser.write"
          ],
          "properties": {
            "AzureActiveDirectoryResourceId": "https://your-darbot-instance.azurewebsites.net"
          }
        }
      }
    }
  }
}
```

### 3. Deploy the Connector

```bash
# Install Power Platform CLI if not already installed
# https://docs.microsoft.com/en-us/powerapps/developer/data-platform/powerapps-cli

# Login to Power Platform
pac auth create --url https://your-environment.crm.dynamics.com

# Create the connector
pac connector create --api-definition-file apiDefinition.swagger.json \
                     --api-properties-file apiProperties.json \
                     --icon icon.png
```

### 4. Test the Connector

1. **In Power Platform Admin Center:**
   - Navigate to your environment
   - Go to Custom Connectors
   - Find "Darbot Browser MCP" connector
   - Test the connection

2. **In Copilot Studio:**
   - Create a new topic
   - Add an action
   - Select "Darbot Browser MCP" connector
   - Choose an action (e.g., "Navigate to URL")
   - Configure parameters and test

## Available Actions

### Navigation Actions

#### Navigate to URL
Navigate the browser to a specific URL.
- **Input**: URL (string)
- **Output**: Success status and navigation details

#### Take Screenshot
Capture a screenshot of the current page or specific element.
- **Input**: Optional element description and reference
- **Output**: Base64 encoded image data

### Interaction Actions

#### Click Element
Click on a specific element on the page.
- **Input**: Element description, element reference
- **Output**: Success status and click details

#### Type Text
Type text into an editable element.
- **Input**: Element description, element reference, text to type
- **Output**: Success status and typing details

### Profile Management Actions

#### Save Work Profile
Save the current browser session as a reusable work profile.
- **Input**: Profile name, optional description
- **Output**: Success status and profile details

#### Switch Work Profile
Switch to a previously saved work profile.
- **Input**: Profile name
- **Output**: Success status and profile details

#### List Work Profiles
Get a list of all available work profiles.
- **Input**: None
- **Output**: Array of profile objects

### Utility Actions

#### Get Page Snapshot
Capture an accessibility snapshot of the current page.
- **Input**: None
- **Output**: Structured page content and metadata

#### Wait for Condition
Wait for text to appear, disappear, or a specified time to pass.
- **Input**: Text to wait for, time to wait, or text to disappear
- **Output**: Success status when condition is met

## Authentication

The connector uses Microsoft Entra ID (Azure AD) OAuth 2.0 for authentication:

1. **OAuth Flow**: Authorization Code flow with PKCE
2. **Scopes**: 
   - `browser.read` - Read browser state and capture data
   - `browser.write` - Control browser actions and interactions
3. **Token Storage**: Secure token storage in Power Platform

### Setting Up Authentication

1. **Create Azure AD Application:**
   ```bash
   az ad app create \
     --display-name "Darbot Browser Connector" \
     --web-redirect-uris "https://global.consent.azure-apim.net/redirect"
   ```

2. **Configure API Permissions:**
   - In Azure Portal, go to App registrations
   - Select your application
   - Add API permissions for your Darbot instance
   - Grant admin consent

3. **Update Connector Configuration:**
   - Replace `YOUR_AZURE_CLIENT_ID` with your application's client ID
   - Update the resource ID and scopes to match your deployment

## Error Handling

The connector includes comprehensive error handling:

- **400 Bad Request**: Invalid parameters or malformed requests
- **401 Unauthorized**: Authentication failure or expired tokens
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource or endpoint not found
- **429 Too Many Requests**: Rate limiting exceeded
- **500 Internal Server Error**: Server-side errors

## Testing

### Unit Testing
```bash
# Test individual actions using the Power Platform CLI
pac connector test --connector-id shared_darbotbrowsermcp
```

### Integration Testing
1. Create a test flow in Power Automate
2. Use the connector actions with test data
3. Verify outputs and error handling
4. Test authentication token refresh

### Performance Testing
- Test concurrent action execution
- Verify rate limiting behavior
- Monitor response times and timeouts

## Deployment

### Development Environment
```bash
pac connector create --api-definition-file apiDefinition.swagger.json \
                     --api-properties-file apiProperties.json \
                     --environment https://dev-environment.crm.dynamics.com
```

### Production Environment
```bash
pac connector create --api-definition-file apiDefinition.swagger.json \
                     --api-properties-file apiProperties.json \
                     --environment https://prod-environment.crm.dynamics.com
```

### Solution Package
To include the connector in a solution:
```bash
pac solution add-reference --path . --id shared_darbotbrowsermcp
pac solution pack --zipfile DarbotBrowserMCP.zip
```

## Monitoring

### Usage Analytics
- Monitor connector usage in Power Platform Admin Center
- Track action execution frequency and success rates
- Review error logs and performance metrics

### Health Monitoring
- Use the health check action to monitor service availability
- Set up automated health checks in Power Automate
- Configure alerts for service degradation

## Support

### Troubleshooting
1. **Authentication Issues:**
   - Verify Azure AD application configuration
   - Check token scopes and permissions
   - Ensure redirect URLs are correct

2. **Action Failures:**
   - Check the MCP server health endpoint
   - Verify parameter formats and values
   - Review error messages and status codes

3. **Performance Issues:**
   - Monitor rate limiting status
   - Check server resource utilization
   - Optimize action parameter usage

### Getting Help
- Review connector documentation in Power Platform
- Check MCP server logs in Azure Application Insights
- Create issues on [GitHub](https://github.com/darbotlabs/darbot-browser-mcp/issues)

## Contributing

We welcome contributions to improve the connector:

1. Fork the repository
2. Make changes to connector definition files
3. Test thoroughly in development environment
4. Submit a pull request with detailed description

## License

This connector is licensed under the Apache License 2.0. See the [LICENSE](../../LICENSE) file for details.