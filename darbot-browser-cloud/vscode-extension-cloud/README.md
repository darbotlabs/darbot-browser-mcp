# Darbot Browser MCP Cloud - VS Code Extension

![Darbot Banner](https://raw.githubusercontent.com/darbotlabs/darbot-browser-mcp/main/assets/darbot_logo_icon_pack/darbot-horizontal-banner-1500x500.png)

**Enterprise Cloud-Connected Browser Automation for VS Code**

Transform your coding workflow with intelligent autonomous browser capabilities powered by Azure cloud infrastructure. This extension connects VS Code to an enterprise-grade deployment of Darbot Browser MCP, providing seamless access to 52 autonomous browser tools through GitHub Copilot Chat and Microsoft Copilot Studio without any local server requirements.

[![Azure Deployment](https://img.shields.io/badge/Azure-Ready-0089D6?style=flat-square&logo=microsoft-azure)](https://azure.microsoft.com)
[![Cloud Ready](https://img.shields.io/badge/Cloud-Enterprise-0098FF?style=flat-square)](https://azure.microsoft.com/services/app-service/)
[![MCP Protocol](https://img.shields.io/badge/MCP-Streamable%20HTTP-green?style=flat-square)](https://modelcontextprotocol.io)

---

## Features

- **Zero Infrastructure** - No local server, connects to Azure cloud deployment
- **Enterprise Security** - Azure Managed Identity, Key Vault, RBAC, full MSAL JWT validation
- **Full Observability** - Application Insights, health monitoring, audit logging
- **Autonomous Actions** - Intent-based automation, workflow execution, smart recovery
- **Cloud Work Profiles** - Session persistence in Azure Blob storage
- **VS Code Native** - Seamless MCP integration with GitHub Copilot Chat
- **Copilot Studio Ready** - Direct integration with Microsoft Copilot Studio
- **Real-time Cloud Control** - SSE/HTTP transport to Azure App Service
- **Production Grade** - Scalable cloud infrastructure with high availability

## Installation

### **Cloud Setup (Recommended)**

1. **Install the extension** from the VS Code marketplace
2. **Auto-configuration**: The extension automatically:
   - Prompts to enable MCP in VS Code settings (`"chat.mcp.enabled": true`)
   - Configures cloud connection to Azure deployment
   - Sets up MCP endpoint: `https://<your-app>.azurewebsites.net/mcp`
3. **Connect**: Use Command Palette -> "Darbot Browser Cloud: Connect to Cloud Server"
4. **Test**: Ask GitHub Copilot to "take a screenshot of example.com" or check cloud status

### **Enterprise Configuration**

For secured deployments with authentication:

1. Obtain an authentication token from your Azure administrator
2. Open VS Code settings -> Extensions -> Darbot Browser MCP Cloud
3. Enter your token in `darbot-browser-mcp-cloud.authToken`
4. Configure custom server URL if using private deployment

### **What Happens After Installation**

When you first activate the extension:

- **Auto-detects MCP availability** and prompts to enable if needed
- **Auto-configures cloud MCP server** in your VS Code settings
- **Adds status bar indicator** showing cloud connection state
- **Ready to use** with GitHub Copilot Chat immediately
- **Periodic health checks** verify cloud server availability

## Usage Examples

**With GitHub Copilot Chat:**

```
User: "Take a screenshot of example.com"
I'll autonomously navigate to example.com and capture a screenshot for you.

User: "Navigate to example.com and click the More information link"  
I'll autonomously navigate to example.com and locate the "More information..." link to click.

User: "Save this browser session as 'research-profile'"
I'll autonomously save the current browser state as a work profile named 'research-profile'.

User: "Fill out the contact form with test data"
I'll autonomously fill the contact form with appropriate test data.

User: "Generate an automated test for the login flow"
I'll autonomously create an automated test based on the current page interactions.
```

**Direct Commands:**

- `Ctrl+Shift+P` -> "Darbot Browser Cloud: Connect to Cloud Server"
- Use status bar indicator to monitor cloud connection
- Configure cloud settings in VS Code settings

## Configuration

- `darbot-browser-mcp-cloud.serverUrl`: Cloud server URL (default: `https://<your-app>.azurewebsites.net`)
- `darbot-browser-mcp-cloud.sseEndpoint`: MCP endpoint for Streamable HTTP transport (default: `https://<your-app>.azurewebsites.net/mcp`)
- `darbot-browser-mcp-cloud.autoConnect`: Automatically connect to cloud server when VS Code starts (default: `true`)
- `darbot-browser-mcp-cloud.connectionTimeout`: Connection timeout in milliseconds (default: `30000`)
- `darbot-browser-mcp-cloud.enableHealthChecks`: Enable periodic health monitoring (default: `true`)
- `darbot-browser-mcp-cloud.healthCheckInterval`: Health check frequency in milliseconds (default: `60000`)

## Commands

- `Darbot Browser Cloud: Connect to Cloud Server` - Connect to Azure cloud server
- `Darbot Browser Cloud: Disconnect from Cloud Server` - Disconnect from cloud
- `Darbot Browser Cloud: Show Cloud Server Status` - Show connection status and info
- `Darbot Browser Cloud: Test Cloud Connection` - Test Azure health endpoint

## Requirements

- **VS Code**: Version 1.96.0 or higher
- **Network**: Internet access to Azure cloud endpoint
- **MCP Support**: Enable `"chat.mcp.enabled": true` in VS Code settings

## Troubleshooting

**Extension not loading?**

- Check VS Code Developer Console (`Ctrl+Shift+I`)
- Ensure MCP is enabled in settings
- Restart VS Code after installation

**Cloud connection failing?**

- Test health endpoint: `https://<your-app>.azurewebsites.net/health`
- Check network/firewall allows outbound HTTPS
- Verify server URL in extension settings

**MCP server not discovered?**

- Restart VS Code after installation
- Use Command Palette: "MCP: Show Installed Servers"
- Check extension status in "Extensions" panel
- Verify `chat.mcp.enabled` is set to `true`

## License

Apache License 2.0 - see [LICENSE](https://github.com/darbotlabs/darbot-browser-mcp/blob/main/LICENSE) for details.

## Links

- **[GitHub Repository](https://github.com/darbotlabs/darbot-browser-mcp)** - Source code and documentation
- **[Issues & Support](https://github.com/darbotlabs/darbot-browser-mcp/issues)** - Bug reports and feature requests
- **[Darbot Labs](https://github.com/darbotlabs)** - More AI automation tools

**Made with <3 by Darbot Labs**
