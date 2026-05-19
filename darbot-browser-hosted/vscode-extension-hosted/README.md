# Darbot Browser MCP Hosted — VS Code Extension

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/darbotlabs.darbot-browser-mcp-hosted.svg)](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp-hosted)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)

Connect VS Code to a **self-hosted** Darbot Browser MCP server — either a
local Docker container on your own machine or a remote one exposed
through a VS Code Dev Tunnel. 52 Darbot browser tools light up inside
GitHub Copilot agent mode.

> Need a managed cloud option instead? See
> [`darbotlabs.darbot-browser-mcp-cloud`](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp-cloud).

## Features

- **Auto-start container** — if `localhost:8080` is unreachable, the
  extension issues `docker start <containerName>` and retries the health
  probe until the server comes up.
- **Optional MSAL auth** — enable `useMsalAuth` to attach
  `Authorization: Bearer <entra-token>` on every MCP request. Tokens are
  fetched silently through VS Code's built-in Microsoft provider.
- **Dev Tunnel friendly** — point `serverUrl` at any
  `https://*.devtunnels.ms` URL; everything else stays the same.
- **`SERVER_BASE_URL` env override** — wins over the `serverUrl`
  setting so a single VS Code window can flip between targets without
  editing settings.
- **Health monitoring** — periodic `/health` polling with status-bar
  indicator and structured output channel logs.

## Quick start

```bash
docker run -d --name darbot-browser-hosted \
  -p 8080:8080 \
  -e ALLOW_ANONYMOUS_ACCESS=true \
  darbot-browser-hosted
```

```text
ext install darbotlabs.darbot-browser-mcp-hosted
```

The extension auto-connects on activation. Watch the status bar:
`$(server) MCP Hosted: Connected`.

In Copilot Chat → agent mode you should see the 52 Darbot tools under
*Darbot Browser MCP Hosted*.

## Settings

| Setting                                              | Type      | Default                            | Notes                                                                                          |
| ---------------------------------------------------- | --------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `darbot-browser-mcp-hosted.serverUrl`                | `string`  | `http://localhost:8080`            | Overridden by `SERVER_BASE_URL` env var.                                                       |
| `darbot-browser-mcp-hosted.mcpEndpoint`              | `string`  | *blank → `<serverUrl>/mcp`*        | Override only if your reverse proxy mounts MCP somewhere else.                                  |
| `darbot-browser-mcp-hosted.autoConnect`              | `boolean` | `true`                             | Connect when VS Code starts.                                                                   |
| `darbot-browser-mcp-hosted.connectionTimeout`        | `number`  | `10000` (ms)                       | Hard timeout on any single HTTP request.                                                       |
| `darbot-browser-mcp-hosted.enableHealthChecks`       | `boolean` | `true`                             | Run periodic health probes while connected.                                                    |
| `darbot-browser-mcp-hosted.healthCheckInterval`      | `number`  | `30000` (ms)                       | Health-check period.                                                                           |
| `darbot-browser-mcp-hosted.useMsalAuth`              | `boolean` | `false`                            | Attach Entra ID bearer token to MCP requests.                                                  |
| `darbot-browser-mcp-hosted.scopes`                   | `array`   | `[openid, profile, email, User.Read]` | Scopes requested from VS Code's Microsoft auth provider.                                       |
| `darbot-browser-mcp-hosted.autoStartContainer`       | `boolean` | `true`                             | If the server is unreachable, attempt `docker start <containerName>`.                          |
| `darbot-browser-mcp-hosted.containerName`            | `string`  | `darbot-browser-hosted`            | Container to auto-start.                                                                       |

## Commands

| Command id                                          | Title                                                |
| --------------------------------------------------- | ---------------------------------------------------- |
| `darbot-browser-mcp-hosted.signIn`                  | Darbot Browser Hosted: Sign in with Microsoft        |
| `darbot-browser-mcp-hosted.connectServer`           | Darbot Browser Hosted: Connect to Hosted Server      |
| `darbot-browser-mcp-hosted.disconnectServer`        | Darbot Browser Hosted: Disconnect from Hosted Server |
| `darbot-browser-mcp-hosted.showStatus`              | Darbot Browser Hosted: Show Hosted Server Status     |
| `darbot-browser-mcp-hosted.testConnection`          | Darbot Browser Hosted: Test Hosted Connection        |

## Architecture

```
┌────────────────────────────┐                ┌─────────────────────────────┐
│ VS Code (this extension)   │  HTTP(S)       │ Docker container            │
│                            │ ─────────────► │  darbot-browser-mcp server  │
│  vscode.lm.registerMcp…    │                │  /health   /mcp             │
│  vscode.authentication     │                │                             │
│   ('microsoft', scopes)    │                │  Chromium (Playwright)      │
└────────────────────────────┘                └─────────────────────────────┘
                ▲
                │ optional bearer token (when useMsalAuth = true)
```

## Dev Tunnels

```bash
code tunnel --name darbot-browser-mcp --accept-server-license-terms
```

Then in settings:

```jsonc
{
  "darbot-browser-mcp-hosted.serverUrl": "https://darbot-browser-mcp-abc123.devtunnels.ms"
}
```

The `mcpEndpoint` setting is derived automatically.

## Hosted vs. Cloud

| Feature             | Hosted                                | Cloud                                    |
| ------------------- | ------------------------------------- | ---------------------------------------- |
| Where it runs       | Your machine / your data centre       | Azure App Service                         |
| Default URL         | `http://localhost:8080`               | `https://<your-app>.azurewebsites.net`    |
| Auth                | Optional MSAL (off by default)        | Microsoft sign-in via VS Code provider    |
| Data residency      | Stays in your infrastructure          | Lives in your Azure subscription          |
| Cost                | Compute + Docker on your side         | Azure pricing                              |

## Build from source

```bash
cd darbot-browser-hosted/vscode-extension-hosted
npm install
npm run compile     # tsc -p ./
npx vsce package    # produce .vsix
```

`out/` is **not** tracked in git.

## Engineering notes

- TypeScript strict mode is on. Typed `HostedConfig` interface; no `any`
  except a single narrow shim for `vscode.McpHttpServerDefinition`
  (not yet in `@types/vscode@1.96.0`).
- All HTTP calls use the Node `http`/`https` modules — no third-party
  client.
- Auth is lazy: silent fetch via `getSession(…, { createIfNone: false,
  silent: true })`; interactive flow is triggered only when the user
  explicitly runs *Sign in with Microsoft*.
- Docker auto-start is implemented as a Promise-based wrapper around
  `child_process.exec` so it can be retried with back-off without
  blocking VS Code.

## License

Apache-2.0 © Darbot Labs / @dayour. See [LICENSE](LICENSE).
