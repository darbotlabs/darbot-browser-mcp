# Darbot Browser MCP — Local VS Code Extension

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/darbotlabs.darbot-browser-mcp?style=flat-square&color=0098FF&label=Marketplace)](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/darbotlabs.darbot-browser-mcp?style=flat-square&color=0098FF)](https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-green?style=flat-square)](https://www.apache.org/licenses/LICENSE-2.0)

Registers the **Darbot Browser MCP** server as a Model Context Protocol
provider for VS Code's chat / agent mode, and exposes Command Palette
actions for managing a stand-alone server process.

- **Version:** 2.0.0
- **VS Code engine:** ^1.96.0
- **Server tool count:** 52 (snapshot mode)
- **Default browser:** Microsoft Edge (`msedge`)

## What it does

This extension is a thin, fully-typed wrapper around the published
[`@darbotlabs/darbot-browser-mcp`](https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp)
CLI. It does **not** bundle a browser or implement any tool logic itself.

It exposes two integration paths:

1. **Agent mode (recommended)** — registers a `McpServerDefinitionProvider`
   with `vscode.lm`. VS Code spawns and supervises the MCP server only when
   the user enables it in agent mode.
2. **Self-managed server** — start/stop/restart commands spawn the server
   in a child process and stream its output to the *Darbot Browser MCP*
   output channel. Useful when running an MCP client that lives outside
   VS Code or for ad-hoc debugging.

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
   available — VS Code 1.96+).
4. If `darbot-browser-mcp.autoConfigureMCP` is `true` (default), checks
   whether the user has enabled VS Code's MCP Gallery (`chat.mcp.gallery.enabled`)
   and offers to flip it on.
5. Auto-starts the stand-alone server only if
   `darbot-browser-mcp.autoStart` is `true` (default: `false`).

## Commands

| Command palette entry                              | ID                                                   |
| -------------------------------------------------- | ---------------------------------------------------- |
| Darbot Browser MCP: **Start MCP Server**           | `darbot-browser-mcp.startServer`                     |
| Darbot Browser MCP: **Stop MCP Server**            | `darbot-browser-mcp.stopServer`                      |
| Darbot Browser MCP: **Restart MCP Server**         | `darbot-browser-mcp.restartServer`                   |
| Darbot Browser MCP: **Show Server Status**         | `darbot-browser-mcp.showStatus`                      |
| Darbot Browser MCP: **Open Bridge Status**         | `darbot-browser-mcp.openBridgeStatus`                |

## Settings

| Setting                                       | Default                                                | Purpose                                                                                              |
| --------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `darbot-browser-mcp.serverPath`               | `npx @darbotlabs/darbot-browser-mcp@latest`            | Command line used to start the server. First whitespace-separated token is the executable.            |
| `darbot-browser-mcp.autoStart`                | `false`                                                | Spawn the server automatically when VS Code starts.                                                  |
| `darbot-browser-mcp.autoConfigureMCP`         | `true`                                                 | Offer to enable `chat.mcp.gallery.enabled` on first activation.                                       |
| `darbot-browser-mcp.logLevel`                 | `info`                                                 | One of `error` / `warn` / `info` / `debug`. Forwarded as `--log-level`.                              |
| `darbot-browser-mcp.browser`                  | `msedge`                                               | `msedge` / `chrome` / `firefox` / `webkit`.                                                          |
| `darbot-browser-mcp.headless`                 | `false`                                                | Forward `--headless` to the server.                                                                  |
| `darbot-browser-mcp.noSandbox`                | `true`                                                 | Forward `--no-sandbox` (required inside many containers; harmless on the desktop).                   |
| `darbot-browser-mcp.bridgeStatusUrl`          | `http://localhost:9223/health`                         | URL opened by the *Open Bridge Status* command.                                                      |

## Workspace-local development

If the open workspace contains a `cli.js` at its root (i.e. the
darbot-browser-mcp repo itself), the extension prefers `node cli.js`
over the configured `serverPath`. This lets contributors test changes to
the server without reinstalling the npm package.

## Usage with GitHub Copilot Chat

Once the MCP Gallery is enabled and the server is registered, the 52
browser tools appear as `darbot/*` tools in agent mode. Sample prompts:

```text
Take a screenshot of example.com.
Navigate to https://example.com and click the "More information…" link.
Save the current browser session as a work profile named "research".
Generate a Playwright test for the login flow on https://app.contoso.com.
```

## Troubleshooting

- **Status bar shows `MCP: Stopped` but agent mode works.** That's normal —
  the status bar tracks the stand-alone process started by *Start MCP
  Server*. In agent mode VS Code supervises the server lifecycle.
- **`npx` fetches the server every cold-start.** Set `serverPath` to a
  globally-installed CLI (`darbot-browser-mcp`) after running
  `npm i -g @darbotlabs/darbot-browser-mcp`.
- **MSEdge profile lock errors.** Close any open Edge windows or set
  `darbot-browser-mcp.browser` to `chrome` for a separate profile.

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).
