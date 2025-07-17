# 🚀 VS Code Extension Installation Guide

This guide ensures the Darbot Browser MCP VS Code extension provides everything needed for GitHub Copilot agent mode integration.

## 📦 Installation Options

### Option 1: VS Code Marketplace (Recommended)
```bash
code --install-extension darbotlabs.darbot-browser-mcp
```

### Option 2: Local VSIX Installation
```bash
# Install from local VSIX file
code --install-extension vscode-extension/darbot-browser-mcp-1.3.0.vsix
```

### Option 3: Manual Installation
1. Download the latest VSIX from the repository
2. Open VS Code → Extensions → "..." menu → "Install from VSIX..."
3. Select the downloaded VSIX file

## ⚙️ Automatic Configuration

The extension automatically:

### 1. **MCP Enablement**
- Checks if `chat.mcp.enabled` is `true`
- Prompts to enable MCP if not already enabled
- Updates VS Code settings globally

### 2. **Server Registration**
- Configures `chat.mcp.servers` with optimal settings:
```json
{
  "chat.mcp.servers": {
    "darbot-browser-mcp": {
      "command": "npx",
      "args": ["@darbotlabs/darbot-browser-mcp@latest"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 3. **GitHub Copilot Integration**
- Attempts to configure `github.copilot.chat.mcp.servers` if available
- Ensures the server is discoverable in Copilot agent mode
- Registers MCP Server Definition Provider

## 🎯 GitHub Copilot Agent Mode Integration

### How It Works
1. **Extension Activation**: Registers as MCP server definition provider
2. **Server Discovery**: VS Code MCP system discovers the server
3. **Copilot Integration**: Available as `@darbot-browser-mcp` in Copilot Chat
4. **Tool Selection**: 29 browser tools become available through natural language

### Usage Examples
```
@darbot-browser-mcp navigate to https://example.com and take a screenshot

@darbot-browser-mcp open a new tab, go to github.com, and click the sign in button

@darbot-browser-mcp save the current browser session as "work-profile"

@darbot-browser-mcp fill out the contact form with test data and submit it

@darbot-browser-mcp generate a Playwright test for the current page interactions
```

## 🔧 Configuration Options

### Extension Settings
Access via `File > Preferences > Settings` → Search "Darbot Browser MCP":

- **`darbot-browser-mcp.serverPath`**: Command to start MCP server
  - Default: `npx @darbotlabs/darbot-browser-mcp@latest`
  - Custom: `node /path/to/local/server.js`

- **`darbot-browser-mcp.autoStart`**: Auto-start server on VS Code launch
  - Default: `false`

- **`darbot-browser-mcp.autoConfigureMCP`**: Auto-configure MCP settings
  - Default: `true`

- **`darbot-browser-mcp.browser`**: Browser engine selection
  - Options: `msedge`, `chrome`, `firefox`, `webkit`
  - Default: `msedge`

- **`darbot-browser-mcp.headless`**: Run browser in headless mode
  - Default: `false`

- **`darbot-browser-mcp.noSandbox`**: Disable browser sandbox
  - Default: `true`

- **`darbot-browser-mcp.logLevel`**: Server logging verbosity
  - Options: `error`, `warn`, `info`, `debug`
  - Default: `info`

### Advanced Configuration
For custom server arguments, modify the `serverPath`:
```json
{
  "darbot-browser-mcp.serverPath": "npx @darbotlabs/darbot-browser-mcp@latest --headless --device 'iPhone 15' --vision"
}
```

## 🛠️ Manual Configuration

If automatic configuration fails, manually add to VS Code settings:

```json
{
  "chat.mcp.enabled": true,
  "chat.mcp.servers": {
    "darbot-browser-mcp": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest",
        "--browser", "msedge",
        "--no-sandbox"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 📊 Status Monitoring

### Status Bar Indicator
- 🟢 **MCP: Running** - Server active and ready
- 🔴 **MCP: Stopped** - Server not running
- Click indicator for quick start/stop/restart

### Commands (Ctrl+Shift+P)
- `Darbot Browser MCP: Start Server`
- `Darbot Browser MCP: Stop Server` 
- `Darbot Browser MCP: Restart Server`
- `Darbot Browser MCP: Show Status`

### Output Channel
Monitor activity: `View > Output > Darbot Browser MCP`

## ✅ Verification Steps

### 1. Check MCP is Enabled
```json
// In VS Code Settings
"chat.mcp.enabled": true
```

### 2. Verify Server Configuration
```json
// Should appear in chat.mcp.servers
"darbot-browser-mcp": {
  "command": "npx",
  "args": ["@darbotlabs/darbot-browser-mcp@latest"]
}
```

### 3. Test Server Start
- Use Command Palette: "Darbot Browser MCP: Start Server"
- Check status bar shows "MCP: Running"
- View output channel for startup logs

### 4. Test Copilot Integration
- Open GitHub Copilot Chat
- Type: `@darbot-browser-mcp help`
- Should show available tools

### 5. Test Basic Functionality
```
@darbot-browser-mcp navigate to https://example.com
```

## 🐛 Troubleshooting

### Extension Not Loading
- **Check**: VS Code version ≥ 1.96.0
- **Fix**: Update VS Code
- **Verify**: Extension appears in Extensions panel

### MCP Not Available
- **Check**: `chat.mcp.enabled` is `true`
- **Fix**: Enable in settings or use auto-configuration
- **Restart**: VS Code after enabling MCP

### Server Won't Start
- **Check**: Node.js ≥ 18.0.0 installed
- **Fix**: `node --version` to verify
- **Install**: From nodejs.org if needed

### Browser Issues
- **Check**: Microsoft Edge installed
- **Alternative**: Change browser setting to `chrome`
- **Containers**: Enable `noSandbox` option

### Copilot Can't Find Server
- **Check**: Server running (status bar shows "Running")
- **Fix**: Restart VS Code after configuration
- **Verify**: `@darbot-browser-mcp` shows in Copilot autocomplete

### Network/Firewall Issues
- **Check**: Outbound HTTPS access for npm
- **Fix**: Configure corporate proxy if needed
- **Alternative**: Use local installation path

## 🔄 Update Process

### Automatic Updates
- VS Code auto-updates extensions
- Server updates via `npx @darbotlabs/darbot-browser-mcp@latest`

### Manual Updates
```bash
# Update extension
code --install-extension darbotlabs.darbot-browser-mcp --force

# Update server
npm install -g @darbotlabs/darbot-browser-mcp@latest
```

## 📋 Complete Tool List

The extension provides 29 browser automation tools:

### Navigation & Core
- `browser_navigate`, `browser_snapshot`, `browser_close`

### Interaction
- `browser_click`, `browser_type`, `browser_select_option`
- `browser_hover`, `browser_drag`, `browser_press_key`

### Tab Management  
- `browser_tab_new`, `browser_tab_select`, `browser_tab_close`, `browser_tab_list`

### Content & Media
- `browser_take_screenshot`, `browser_pdf_save`, `browser_file_upload`

### Advanced Features
- `browser_wait_for`, `browser_handle_dialog`, `browser_resize`

### Work Profiles
- `browser_save_profile`, `browser_switch_profile`
- `browser_list_profiles`, `browser_delete_profile`

### Development & Testing
- `browser_console_messages`, `browser_network_requests`
- `browser_generate_playwright_test`

## 🎯 Best Practices

### 1. **Development Workflow**
- Start server when beginning browser automation tasks
- Use work profiles to save different testing scenarios
- Monitor output channel for debugging

### 2. **Performance Optimization**
- Use headless mode for CI/CD pipelines
- Enable sandbox only when necessary
- Adjust log level based on needs

### 3. **Security Considerations**
- Review auto-configuration before accepting
- Use isolated profiles for sensitive testing
- Monitor network requests in development

## 🤝 Support

- **Repository**: [github.com/darbotlabs/darbot-browser-mcp](https://github.com/darbotlabs/darbot-browser-mcp)
- **Issues**: [Report bugs and feature requests](https://github.com/darbotlabs/darbot-browser-mcp/issues)
- **Documentation**: [Complete guide](https://github.com/darbotlabs/darbot-browser-mcp#readme)

---

*Transform your VS Code into an autonomous browser automation powerhouse! 🚀*
