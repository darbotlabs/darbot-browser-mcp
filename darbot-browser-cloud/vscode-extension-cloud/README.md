# Darbot Browser MCP — Cloud (VS Code Extension)

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/darbotlabs.darbot-browser-mcp-cloud.svg)](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp-cloud)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)

Companion VS Code extension that connects your editor to a hosted
**Darbot Browser MCP** server running on Azure App Service — no local
Node.js install, no local Chromium, no port juggling.

> Looking for the **local** version that spawns a browser on your
> machine? Install
> [`darbotlabs.darbot-browser-mcp`](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)
> instead. Cloud and local can be installed side-by-side.

## Features

- **MCP server discovery** — registers the cloud endpoint as an MCP
  Streamable HTTP server. VS Code's agent mode picks up the 68 Darbot
  browser tools automatically.
- **Microsoft sign-in** — uses VS Code's built-in `microsoft`
  authentication provider; no custom OAuth dance, no embedded webview.
- **Lazy auth** — silent token fetch on first request; interactive sign-in
  occurs only when the user explicitly chooses *Sign in with Microsoft*.
- **Health monitoring** — periodic probes against `/health` while
  connected, with status-bar indicator and output channel logs.
- **`SERVER_BASE_URL` env override** — flip a window between staging and
  production without touching settings.

## Quick start

1. Install: *Extensions* → search **Darbot Browser MCP Cloud**.
2. Set `darbot-browser-mcp-cloud.serverUrl` to your deployment URL
   (e.g. `https://<your-app>.azurewebsites.net`).
3. Ensure `chat.mcp.gallery.enabled` is `true` — the extension will
   offer to enable it on first activation.
4. `Ctrl+Shift+P` → **Darbot Browser Cloud: Test Cloud Connection**.

Detailed setup (auth, scopes, troubleshooting): see
[`CLOUD_EXTENSION_SETUP.md`](../CLOUD_EXTENSION_SETUP.md).

## Settings

| Setting                                             | Type      | Default                                        | Description                                                                       |
| --------------------------------------------------- | --------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `darbot-browser-mcp-cloud.serverUrl`                | `string`  | `https://<your-app>.azurewebsites.net`         | Base URL of the cloud server. Overridden by `SERVER_BASE_URL` env var.            |
| `darbot-browser-mcp-cloud.mcpEndpoint`              | `string`  | *blank → derived from `serverUrl + /mcp`*      | Override for the MCP Streamable HTTP endpoint.                                    |
| `darbot-browser-mcp-cloud.autoConnect`              | `boolean` | `true`                                         | Connect to the server on VS Code start-up.                                        |
| `darbot-browser-mcp-cloud.enableHealthChecks`       | `boolean` | `true`                                         | Run periodic health probes while connected.                                       |
| `darbot-browser-mcp-cloud.healthCheckInterval`      | `number`  | `60000` (ms)                                   | Health-check period.                                                              |
| `darbot-browser-mcp-cloud.connectionTimeout`        | `number`  | `30000` (ms)                                   | Hard timeout on any single HTTP request.                                          |
| `darbot-browser-mcp-cloud.scopes`                   | `array`   | `["openid","profile","email","User.Read"]`     | Scopes requested from the Microsoft auth provider.                                |

## Commands

| Command id                                                  | Title                                                |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| `darbot-browser-mcp-cloud.signIn`                           | Darbot Browser Cloud: Sign in with Microsoft         |
| `darbot-browser-mcp-cloud.connectServer`                    | Darbot Browser Cloud: Connect to Cloud Server        |
| `darbot-browser-mcp-cloud.disconnectServer`                 | Darbot Browser Cloud: Disconnect from Cloud Server   |
| `darbot-browser-mcp-cloud.showStatus`                       | Darbot Browser Cloud: Show Cloud Server Status       |
| `darbot-browser-mcp-cloud.testConnection`                   | Darbot Browser Cloud: Test Cloud Connection          |

## Architecture

```
┌──────────────────────────┐        ┌──────────────────────────────┐
│ VS Code (this extension) │  HTTPS │ Azure App Service            │
│                          │ ─────► │   Darbot Browser MCP server  │
│  vscode.authentication   │        │   /health   /mcp             │
│   ('microsoft')          │        │                              │
│  vscode.lm.registerMcp…  │        │   Chromium (Playwright)      │
└──────────────────────────┘        └──────────────────────────────┘
```

Authentication: VS Code's Microsoft provider issues an Entra ID access
token. The extension attaches it as `Authorization: Bearer <token>` on
every MCP request — the server validates with MSAL JWT validation.

The default `User.Read` scope normally produces a Microsoft Graph token. For
enforced Darbot authentication, expose a delegated scope on the Darbot app
registration and set `darbot-browser-mcp-cloud.scopes` to include
`api://<client-id>/<scope>`. A successful `/health` probe does not validate the
MCP token audience.

## Build from source

```bash
cd darbot-browser-cloud/vscode-extension-cloud
npm install
npm run compile          # tsc -p ./
npm run package          # produce .vsix
```

The compiled output (`out/`) is **not** tracked in git; install the
published `.vsix` from the Marketplace for normal use.

## Engineering notes

- TypeScript strict mode is on. `any` is used only in one location — to
  reference the upcoming `vscode.McpHttpServerDefinition` symbol that is
  not yet typed in `@types/vscode@1.96.0`. The shim is narrow and the
  exact field set we rely on is documented inline.
- No telemetry is collected by the extension itself. The cloud server
  emits standard Azure App Insights traces; consult the deployment
  documentation for opt-out.
- No third-party HTTP clients — uses the Node `https` module directly
  to keep the supply chain minimal.

## License

Apache-2.0 © Darbot Labs / @dayour. See [LICENSE](../../LICENSE).
