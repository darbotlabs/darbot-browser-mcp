# Cloud VS Code Extension Setup

## Overview
Darbot Browser VS Code extension to connect to Azure cloud deployment instead of local server.

### 1. **package.json** - Cloud Configuration
- **Name**: `darbot-browser-mcp-cloud` (cloud-specific)
- **Display Name**: "Darbot Browser MCP Cloud"
- **Version**: 0.1.0 (initial cloud release)
- **Commands Updated**:
  - `connectServer` - Connect to cloud server
  - `disconnectServer` - Disconnect from cloud
  - `showStatus` - Show cloud connection status
  - `testConnection` - Test Azure health endpoint

- **Configuration Properties**:
  - `serverUrl`: Default to `https://darbot-browser-mcp.azurewebsites.net`
  - `sseEndpoint`: Default to `https://darbot-browser-mcp.azurewebsites.net/sse`
  - `autoConnect`: Auto-connect on startup (default: true)
  - `authToken`: Optional authentication token
  - `connectionTimeout`: Connection timeout (default: 30000ms)
  - `enableHealthChecks`: Periodic health monitoring (default: true)
  - `healthCheckInterval`: Health check frequency (default: 60000ms)

### 2. **README.md** - Cloud Documentation
- Updated features to highlight cloud infrastructure
- Changed installation instructions to reference Azure deployment
- Added enterprise configuration section for authentication
- Updated badges to show Azure deployment status

### 3. **extension.ts** - Cloud Connection Logic

#### Key Changes:
1. **Configuration Namespace**: Changed from `darbot-browser-mcp` to `darbot-browser-mcp-cloud`
2. **MCP Provider**: Returns cloud connection config using HTTP transport
3. **Server Connection**: Uses `npx @darbotlabs/darbot-browser-mcp@latest --transport http --url <azure-url>`
4. **Status Bar**: Shows "MCP Cloud: Connected/Disconnected" instead of "Running/Stopped"
5. **Commands**: Updated to cloud terminology (connect/disconnect vs start/stop)

#### New Functions:
- **`testConnection()`**: Tests Azure health endpoint at `/health`
  - Performs HTTPS GET request
  - Shows success/failure message
  - Logs results to output channel

#### Updated Functions:
- **`provideMcpServerDefinitions()`**: Returns cloud server configuration
- **`configureMCPServer()`**: Auto-configures cloud MCP settings
- **`startServer()`**: Connects to cloud via HTTP transport
- **`stopServer()`**: Disconnects from cloud
- **`showStatus()`**: Displays cloud connection info
- **`updateStatusBarItem()`**: Shows cloud connection state

## Architecture

### Connection Flow
```
VS Code Extension
    v
npx @darbotlabs/darbot-browser-mcp@latest
    --transport http
    --url https://darbot-browser-mcp.azurewebsites.net
    --auth-token <optional>
    v
Azure App Service (darbot-browser-mcp.azurewebsites.net)
    v
MCP Server (HTTP/SSE Transport)
    v
Browser Automation Tools (39 tools: 34 accessibility-first + 5 vision mode) — see [`docs/readme_index.md`](../docs/readme_index.md)
```

### Environment Variables Set
- `NODE_ENV`: production
- `DARBOT_CLOUD_URL`: Azure server URL
- `DARBOT_SSE_ENDPOINT`: SSE endpoint for real-time communication

## Testing Steps

1. **Install Dependencies**:
   ```powershell
   cd darbot-browser-cloud\vscode-extension-cloud
   npm install
   ```

2. **Build Extension**:
   ```powershell
   npm run compile
   ```

3. **Package Extension** (optional):
   ```powershell
   npm install -g @vscode/vsce
   vsce package
   ```

4. **Install in VS Code**:
   - Open VS Code
   - Extensions -> ... -> Install from VSIX
   - Select generated `.vsix` file

5. **Test Connection**:
   - Command Palette -> "Darbot Browser Cloud: Test Connection"
   - Should show [PENDING VALIDATION] success message
   - Check output channel for details

6. **Connect to Cloud**:
   - Command Palette -> "Darbot Browser Cloud: Connect to Cloud Server"
   - Status bar should show "MCP Cloud: Connected"

7. **Test with GitHub Copilot**:
   - Open GitHub Copilot Chat
   - Try: "Take a screenshot of example.com"
   - Should execute on cloud server

## Configuration Examples

### Basic (Public Deployment)
```json
{
  "darbot-browser-mcp-cloud.serverUrl": "https://darbot-browser-mcp.azurewebsites.net",
  "darbot-browser-mcp-cloud.autoConnect": true
}
```

### Enterprise (With Authentication)
```json
{
  "darbot-browser-mcp-cloud.serverUrl": "https://your-private-deployment.azurewebsites.net",
  "darbot-browser-mcp-cloud.authToken": "your-token-here",
  "darbot-browser-mcp-cloud.connectionTimeout": 60000,
  "darbot-browser-mcp-cloud.enableHealthChecks": true
}
```


## Azure Resources Connected

- **App Service**: darbot-browser-mcp.azurewebsites.net
- **Health Endpoint**: https://darbot-browser-mcp.azurewebsites.net/health
- **MCP Endpoint**: https://darbot-browser-mcp.azurewebsites.net/mcp
- **SSE Endpoint**: https://darbot-browser-mcp.azurewebsites.net/sse
- **Container Registry**: darbotbrowsermcp.azurecr.io
- **Resource Group**: darbot-browser-mcp-rg
- **Location**: West US 2 (primary), East US (failover)
