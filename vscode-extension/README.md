# Darbot Browser MCP — Local VS Code Extension

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/darbotlabs.darbot-browser-mcp?style=flat-square&color=0098FF&label=Marketplace)](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/darbotlabs.darbot-browser-mcp?style=flat-square&color=0098FF)](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-green?style=flat-square)](https://www.apache.org/licenses/LICENSE-2.0)

Registers the **Darbot Browser MCP** server as a Model Context Protocol
provider for VS Code's chat / agent mode, and exposes Command Palette
actions for managing a stand-alone server process.

- **Version:** 2.1.4
- **VS Code engine:** ^1.132.0
- **Server tool count:** 68 (snapshot, session portability, and coordinate-screen tools)
- **Default browser:** Microsoft Edge (`msedge`)

## What it does

This extension is a thin, fully-typed wrapper around the published
[`@darbotlabs/darbot-browser-mcp`](https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp)
CLI. It does **not** bundle a browser or implement any tool logic itself.

It exposes two integration paths:

1. **Managed HTTP mode (default)** — the extension supervises one local
   server on port 3000 and registers `http://127.0.0.1:3000/mcp` with
   VS Code. The same process exposes `/api/v1`, health, and OpenAPI routes
   for Copilot Studio, Power Platform, and Dev Tunnels.
2. **Stdio mode** — set `darbot-browser-mcp.transport` to `stdio` to retain
   process-only MCP behavior without an HTTP listener.

## Install

From the VS Code Marketplace:

```text
ext install darbotlabs.darbot-browser-mcp
```

Or `Ctrl+Shift+P` → *Extensions: Install Extensions* → search
*Darbot Browser MCP*.

## First-run experience

On first activation the extension:

1. Creates the *Darbot Browser MCP* output channel.
2. Adds a status bar item (`$(browser) MCP: Stopped`) wired to
   `Darbot Browser MCP: Show Server Status`.
3. Registers the MCP server definition provider (if `vscode.lm` is
   available — VS Code 1.132+).
4. If `darbot-browser-mcp.autoConfigureMCP` is `true` (default), checks
   whether the user has enabled VS Code's MCP Gallery (`chat.mcp.gallery.enabled`)
   and offers to flip it on.
5. Auto-starts the stand-alone server only if
   `darbot-browser-mcp.autoStart` is `true` (default: `false`).
6. Adds a **Darbot Browser MCP** Explorer view with server, MCP, REST,
   OpenAPI, and Dev Tunnel controls.

## Commands

| Command palette entry                              | ID                                                   |
| -------------------------------------------------- | ---------------------------------------------------- |
| Darbot Browser MCP: **Start MCP Server**           | `darbot-browser-mcp.startServer`                     |
| Darbot Browser MCP: **Stop MCP Server**            | `darbot-browser-mcp.stopServer`                      |
| Darbot Browser MCP: **Restart MCP Server**         | `darbot-browser-mcp.restartServer`                   |
| Darbot Browser MCP: **Show Server Status**         | `darbot-browser-mcp.showStatus`                      |
| Darbot Browser MCP: **Open Bridge Status**         | `darbot-browser-mcp.openBridgeStatus`                |
| Darbot Browser MCP: **Open Health Endpoint**       | `darbot-browser-mcp.openHealth`                      |
| Darbot Browser MCP: **Open REST Tool List**        | `darbot-browser-mcp.openRestTools`                   |
| Darbot Browser MCP: **Open OpenAPI Document**      | `darbot-browser-mcp.openOpenApi`                     |
| Darbot Browser MCP: **Copy MCP Endpoint**          | `darbot-browser-mcp.copyMcpEndpoint`                 |
| Darbot Browser MCP: **Copy Power Platform REST URL** | `darbot-browser-mcp.copyPowerPlatformEndpoint`     |
| Darbot Browser MCP: **Forward HTTP Port with VS Code** | `darbot-browser-mcp.forwardDevTunnel`             |
| Darbot Browser MCP: **Set Dev Tunnel URL**         | `darbot-browser-mcp.setDevTunnelUrl`                 |
| Darbot Browser MCP: **Test Local and Dev Tunnel Endpoints** | `darbot-browser-mcp.testEndpoints`           |

## Settings

| Setting                                       | Default                                                | Purpose                                                                                              |
| --------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `darbot-browser-mcp.serverPath`               | `npx @darbotlabs/darbot-browser-mcp@2.1.4`             | Command line used to start the server. First whitespace-separated token is the executable.            |
| `darbot-browser-mcp.autoStart`                | `false`                                                | Spawn the server automatically when VS Code starts.                                                  |
| `darbot-browser-mcp.autoConfigureMCP`         | `true`                                                 | Offer to enable `chat.mcp.gallery.enabled` on first activation.                                       |
| `darbot-browser-mcp.transport`                | `http`                                                 | Use a shared HTTP server or legacy process-only `stdio`.                                               |
| `darbot-browser-mcp.logLevel`                 | `info`                                                 | One of `error` / `warn` / `info` / `debug`. Exposed to the server as `DARBOT_LOG_LEVEL`; debug also enables Darbot debug namespaces. |
| `darbot-browser-mcp.browser`                  | `msedge`                                               | `msedge` / `chrome` / `firefox` / `webkit`.                                                          |
| `darbot-browser-mcp.headless`                 | `false`                                                | Forward `--headless` to the server.                                                                  |
| `darbot-browser-mcp.noSandbox`                | `true`                                                 | Forward `--no-sandbox` (required inside many containers; harmless on the desktop).                   |
| `darbot-browser-mcp.http.host`                | `127.0.0.1`                                            | Bind address for the managed HTTP server.                                                              |
| `darbot-browser-mcp.http.port`                | `3000`                                                 | Local port exposing `/mcp`, `/api/v1`, health, and OpenAPI.                                            |
| `darbot-browser-mcp.http.startupTimeout`      | `15000`                                                | Startup wait for the `/live` endpoint, in milliseconds.                                                |
| `darbot-browser-mcp.devTunnel.url`            | empty                                                   | Public Dev Tunnel base URL used by integration commands and probes.                                    |
| `darbot-browser-mcp.devTunnel.promptOnStart`  | `false`                                                 | Open VS Code's native **Forward a Port** flow after HTTP startup.                                      |
| `darbot-browser-mcp.bridgeStatusUrl`          | `http://localhost:9223/health`                         | URL opened by the *Open Bridge Status* command.                                                      |

## Copilot Studio and Power Platform through a Dev Tunnel

1. Run **Darbot Browser MCP: Start MCP Server**.
2. Run **Darbot Browser MCP: Forward HTTP Port with VS Code** and forward
   port `3000`.
3. In the VS Code **Ports** view, set **Port Visibility** to **Public** for
   development testing.
4. Run **Darbot Browser MCP: Set Dev Tunnel URL** and paste the generated
   `https://...devtunnels.ms` URL. URLs ending in `/mcp/` are normalized.
5. Run **Darbot Browser MCP: Test Local and Dev Tunnel Endpoints**.
6. Use **Copy MCP Endpoint** for Streamable HTTP clients or **Copy Power
   Platform REST URL** for the connector's `/api/v1` base.

Dev Tunnels are intended for development. Production connectors should use
a stable HTTPS service with Microsoft Entra ID authentication.

## Workspace-local development

If the open workspace contains a `cli.js` at its root (i.e. the
darbot-browser-mcp repo itself), the extension prefers `node cli.js`
over the configured `serverPath`. This lets contributors test changes to
the server without reinstalling the npm package.

## Usage with GitHub Copilot Chat

Once the MCP Gallery is enabled and the server is registered, the 68
browser tools appear as `darbot/*` tools in agent mode. Sample prompts:

```text
Take a screenshot of example.com.
Navigate to https://example.com and click the "More information…" link.
Save the current browser session as a work profile named "research".
Generate a Playwright test for the login flow on https://app.contoso.com.
```

## Troubleshooting

- **Status bar shows `MCP: Stopped` but agent mode works.** That's normal —
  this applies only when `darbot-browser-mcp.transport` is `stdio`. In the
  default HTTP mode, agent discovery starts or reuses the managed port.
- **Dev Tunnel returns `502 Bad Gateway`.** The forwarding relay exists, but
  no Darbot HTTP process is listening on the forwarded port. Start the
  managed server and confirm `http://127.0.0.1:3000/live` returns HTTP 200.
- **`npx` fetches the server every cold-start.** Set `serverPath` to a
  globally-installed CLI (`darbot-browser-mcp`) after running
  `npm i -g @darbotlabs/darbot-browser-mcp`.
- **`npm ERR! ETARGET` for version `2.1.4`.** The exact version must exist in
  the npm registry for the default command to work without a workspace. For
  local repository testing, open the darbot-browser-mcp repository as the VS
  Code workspace; the extension will use its root `cli.js` directly instead.
- **MSEdge profile lock errors.** Close any open Edge windows or set
  `darbot-browser-mcp.browser` to `chrome` for a separate profile.

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).
