# Darbot Browser MCP Cloud - VS Code Extension

![Darbot Banner](../assets/darbot_logo_icon_pack/darbot-horizontal-banner-1500x500.png)

**Enterprise Cloud-Connected Browser Automation for VS Code**

Transform your coding workflow with intelligent autonomous browser capabilities powered by Azure cloud infrastructure. This extension connects VS Code to an enterprise-grade deployment of Darbot Browser MCP, providing seamless access to 39 autonomous browser tools (34 accessibility-first + 5 vision mode) through GitHub Copilot Chat and Microsoft Copilot Studio without any local server requirements. Refer to [`docs/readme_index.md`](../../docs/readme_index.md) for the canonical list.

[![Azure Deployment](https://img.shields.io/badge/Azure-Active-0089D6?style=flat-square&logo=microsoft-azure)](https://darbot-browser-mcp.azurewebsites.net)
[![Cloud Ready](https://img.shields.io/badge/Cloud-Enterprise-0098FF?style=flat-square)](https://darbot-browser-mcp.azurewebsites.net/health)
[![MCP Protocol](https://img.shields.io/badge/MCP-SSE%2FHTTP-green?style=flat-square)](https://darbot-browser-mcp.azurewebsites.net/sse)

---

## Configuration Options:

- **Zero Infrastructure** - No local server, connects to Azure cloud deployment
- **Enterprise Security** - Azure Managed Identity, Key Vault, RBAC integration
- **Full Observability** - Application Insights, health monitoring, audit logging
- **Autonomous Actions** - Intent-based automation, workflow execution, smart recovery
- **Cloud Work Profiles** - Session persistence in Azure storage
- **VS Code Native** - Seamless MCP integration with GitHub Copilot Chat
- **[OFFICE] Copilot Studio Ready** - Direct integration with Microsoft Copilot Studio
- Real-time Cloud Control - SSE/HTTP transport to Azure App Service
- **[SHIELD] Production Grade** - Scalable cloud infrastructure with high availability

## Installation

### **Cloud Setup (Recommended)**

1. **Install the extension** from the VS Code marketplace
2. **Auto-configuration**: The extension automatically:
   - Prompts to enable MCP in VS Code settings (`"chat.mcp.enabled": true`)
   - Configures cloud connection to Azure deployment
   - Sets up SSE endpoint: `https://darbot-browser-mcp.azurewebsites.net/sse`
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
- [GEAR] **Auto-configures cloud MCP server** in your VS Code settings
- **Adds status bar indicator** showing cloud connection state
- **Ready to use** with GitHub Copilot Chat immediately
- **Periodic health checks** verify cloud server availability

## Usage Examples

**With GitHub Copilot Chat:**

```
👤 "Take a screenshot of example.com"
I'll autonomously navigate to example.com and capture a screenshot for you.

👤 "Navigate to example.com and click the More information link"  
I'll autonomously navigate to example.com and locate the "More information..." link to click.

👤 "Save this browser session as 'research-profile'"
I'll autonomously save the current browser state as a work profile named 'research-profile'.

👤 "Fill out the contact form with test data"
I'll autonomously fill the contact form with appropriate test data.

👤 "Generate an automated test for the login flow"
I'll autonomously create an automated test based on the current page interactions.
```

**Direct Commands:**

- `Ctrl+Shift+P` -> "Darbot Browser MCP: Start Server"
- Use status bar indicator to monitor server health
- Configure browser preferences in VS Code settings

## Configuration

- `darbot-browser-mcp.serverPath`: Path or command to start the Browser MCP server (default: `npx @darbotlabs/darbot-browser-mcp@latest`)
- `darbot-browser-mcp.autoStart`: Automatically start the server when VS Code starts (default: `false`)
- `darbot-browser-mcp.autoConfigureMCP`: Automatically configure MCP settings when first activated (default: `true`)
- `darbot-browser-mcp.logLevel`: Log level for the server (error, warn, info, debug) (default: `info`)

### Advanced Configuration

You can also configure the server with additional arguments by modifying the `serverPath` setting:

```json
{
  "darbot-browser-mcp.serverPath": "npx @darbotlabs/darbot-browser-mcp@latest --headless --device 'iPhone 15'"
}
```

Common configuration options:

- `--headless`: Run browser in headless mode
- `--device "iPhone 15"`: Emulate mobile devices
- `--isolated`: Use isolated browser sessions
- `--vision`: Enable vision mode for screenshot-based interactions

## Commands

- `Darbot Browser MCP: Start Server`: Start the Browser MCP server
- `Darbot Browser MCP: Stop Server`: Stop the Browser MCP server  
- `Darbot Browser MCP: Show Status`: Show server status and controls

## Requirements

- **Node.js**: Version 23.0.0 or higher
- **VS Code**: Version 1.95.0 or higher
- **Browser**: Microsoft Edge (recommended) or Chrome/Firefox/WebKit
- **MCP Support**: Enable `"chat.mcp.enabled": true` in VS Code settings

## [BUG] Troubleshooting

**Extension not loading?**

- Check VS Code Developer Console (`Ctrl+Shift+I`)
- Verify Node.js 23+ is installed
- Ensure MCP is enabled in settings

**Browser automation failing?**

- Confirm Microsoft Edge is installed
- Check firewall/antivirus blocking browser automation
- Try disabling sandbox mode in extension settings

**MCP server not discovered?**

- Restart VS Code after installation
- Use Command Palette: "MCP: Show Installed Servers"
- Check extension status in "Extensions" panel
- If you prefer manual setup, disable auto-configuration: `"darbot-browser-mcp.autoConfigureMCP": false`

## License

Apache License 2.0 - see [LICENSE](https://github.com/darbotlabs/darbot-browser-mcp/blob/main/LICENSE) for details.

## Links

- **[GitHub Repository](https://github.com/darbotlabs/darbot-browser-mcp)** - Source code and documentation
- **[Issues & Support](https://github.com/darbotlabs/darbot-browser-mcp/issues)** - Bug reports and feature requests
- **[Darbot Labs](https://github.com/darbotlabs)** - More AI automation tools

**Made with <3 by Darbot Labs**
