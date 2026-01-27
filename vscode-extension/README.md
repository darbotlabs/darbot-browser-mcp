# Darbot Browser MCP - VS Code Extension

![Darbot Banner](https://raw.githubusercontent.com/darbotlabs/darbot-browser-mcp/main/assets/darbot_logo_icon_pack/darbot-horizontal-banner-1500x500.png)

**Your Autonomous Browser Companion for VS Code**

Transform your coding workflow with intelligent autonomous browser capabilities directly integrated into VS Code. This extension provides seamless access to 52 autonomous browser tools through GitHub Copilot Chat, enabling you to automate web interactions, test applications, and manage browser sessions without leaving your IDE.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/darbotlabs.darbot-browser-mcp?style=flat-square&color=0098FF&label=Marketplace)](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/darbotlabs.darbot-browser-mcp?style=flat-square&color=0098FF)](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/darbotlabs.darbot-browser-mcp?style=flat-square&color=0098FF)](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)

---

## Features

- **Multi-Browser Support** - Edge, Chrome, Firefox, WebKit autonomous control
- **Smart Snapshots** - AI-optimized autonomous accessibility snapshots
- **Autonomous Interactions** - Autonomous click, type, navigate, form filling, drag & drop
- **Autonomous Work Profiles** - Autonomously save and restore complete browser sessions
- **Native VS Code Integration** - Seamless autonomous MCP server with GitHub Copilot Chat
- **Real-time Autonomous Control** - Live autonomous browser operations from your IDE
- **Status Management** - Start/Stop server with visual status indicators
- **Autonomous Test Generation** - Autonomously generate automated tests from browser interactions
- **Mobile Emulation** - Autonomous testing of responsive designs with device emulation
- **Professional Grade** - Enterprise-ready autonomous browser with comprehensive error handling

## Installation

### **Automatic Setup (Recommended)**
1. **Install the extension** from the VS Code marketplace
2. **Auto-configuration**: The extension automatically:
   - Registers the MCP server with VS Code's language model API
   - Auto-starts the browser server when VS Code launches (configurable)
   - Provides status bar indicator for server state
3. **Use with GitHub Copilot**: Ask Copilot to "take a screenshot of example.com"

### **Manual Control**
Use the Command Palette (`Ctrl+Shift+P`) for manual server control:
- `Darbot Browser MCP: Start Server` - Start the browser server
- `Darbot Browser MCP: Stop Server` - Stop the browser server  
- `Darbot Browser MCP: Show Status` - View current configuration

### **What Happens After Installation**
When you first activate the extension:
- **Registers MCP server** via VS Code's `McpServerDefinitionProvider` API
- **Auto-starts server** by default (configurable via `darbot-browser-mcp.autoStart`)
- **Adds status bar indicator** showing server state (Running/Stopped)
- **Ready to use** with GitHub Copilot Chat immediately

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
- `Ctrl+Shift+P` → "Darbot Browser MCP: Start Server"
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
- **VS Code**: Version 1.96.0 or higher (MCP support required)
- **Browser**: Microsoft Edge (recommended) or Chrome/Firefox/WebKit

## Troubleshooting

**Extension not loading?**
- Check VS Code Developer Console (`Ctrl+Shift+I`)
- Verify Node.js 23+ is installed
- Ensure VS Code 1.96+ with MCP support

**Browser automation failing?**
- Confirm Microsoft Edge is installed
- Check firewall/antivirus blocking browser automation
- Try disabling sandbox mode in extension settings

**MCP server not discovered?**
- Restart VS Code after installation
- Use Command Palette: "MCP: Show Installed Servers"
- Check extension status in "Extensions" panel

**Server not auto-starting?**
- Check setting: `"darbot-browser-mcp.autoStart": true`
- Verify in Output panel: "Darbot Browser MCP"

## License

Apache License 2.0 - see [LICENSE](https://github.com/darbotlabs/darbot-browser-mcp/blob/main/LICENSE) for details.

## Links

- **[GitHub Repository](https://github.com/darbotlabs/darbot-browser-mcp)** - Source code and documentation
- **[Issues & Support](https://github.com/darbotlabs/darbot-browser-mcp/issues)** - Bug reports and feature requests
- **[Darbot Labs](https://github.com/darbotlabs)** - More AI automation tools

---


**Made with <3 by Darbot Labs**