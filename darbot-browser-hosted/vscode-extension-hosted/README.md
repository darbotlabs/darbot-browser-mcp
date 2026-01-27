# Darbot Browser MCP Hosted - VS Code Extension

Connect VS Code to your on-premises Docker-hosted Darbot Browser MCP server. This extension enables GitHub Copilot to use 52 browser automation tools through a locally running Docker container.

## Features

- **Local Docker Connection** - Connects to `http://localhost:8080/mcp` by default
- **Dev Tunnel Support** - Connect via VS Code Dev Tunnels for remote access
- **Optional MSAL Auth** - Microsoft Entra ID authentication when needed
- **Health Monitoring** - Automatic health checks with status bar indicator
- **GitHub Copilot Integration** - MCP tools available in Copilot agent mode

## Quick Start

1. Start your Docker container:
   ```bash
   docker run -d --name darbot-browser-hosted -p 8080:8080 -e ALLOW_ANONYMOUS_ACCESS=true darbot-browser-hosted
   ```

2. Install this extension

3. The extension auto-connects on startup. Check the status bar for connection status.

4. Use in GitHub Copilot agent mode - browser tools will be available.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `darbot-browser-mcp-hosted.serverUrl` | `http://localhost:8080` | Server URL |
| `darbot-browser-mcp-hosted.mcpEndpoint` | `http://localhost:8080/mcp` | MCP endpoint |
| `darbot-browser-mcp-hosted.autoConnect` | `true` | Auto-connect on startup |
| `darbot-browser-mcp-hosted.enableHealthChecks` | `true` | Enable health monitoring |
| `darbot-browser-mcp-hosted.healthCheckInterval` | `30000` | Health check interval (ms) |
| `darbot-browser-mcp-hosted.useMsalAuth` | `false` | Use Microsoft Entra ID auth |

## Commands

- **Darbot Browser Hosted: Connect to Hosted Server** - Connect manually
- **Darbot Browser Hosted: Disconnect from Hosted Server** - Disconnect
- **Darbot Browser Hosted: Show Hosted Server Status** - View connection status
- **Darbot Browser Hosted: Test Hosted Connection** - Test server health

## Dev Tunnel Setup

For remote access, configure a Dev Tunnel URL:

1. Create tunnel: `code tunnel --name darbot-browser-mcp`
2. Update settings:
   ```json
   {
     "darbot-browser-mcp-hosted.serverUrl": "https://your-tunnel.devtunnels.ms",
     "darbot-browser-mcp-hosted.mcpEndpoint": "https://your-tunnel.devtunnels.ms/mcp"
   }
   ```

## Difference from Cloud Extension

| Feature | Hosted | Cloud |
|---------|--------|-------|
| Deployment | Local Docker | Azure App Service |
| Default URL | `localhost:8080` | `<your-app>.azurewebsites.net` |
| Auth | Optional MSAL | Automatic Microsoft |
| Data | On-premises | Azure cloud |
| Cost | Free* | Azure pricing |

*Requires your own Docker infrastructure

## License

Apache 2.0 - Copyright (c) 2024-2026 DarbotLabs
