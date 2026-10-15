# VS Code extension integration

This guide explains how the Darbot Browser MCP VS Code extension registers, starts, and monitors the MCP server for GitHub Copilot agent mode.

You'll learn:

- How automatic MCP configuration works.
- Which commands and settings the extension provides.
- How to troubleshoot Copilot server discovery.

## Install

```bash
code --install-extension darbotlabs.darbot-browser-mcp
```

## What the extension does

- Registers a VS Code MCP server definition provider.
- Prompts to enable `chat.mcp.gallery.enabled` when needed.
- Adds a `chat.mcp.servers` entry using the npm package.
- Provides commands to start, stop, restart, and inspect status.
- Runs a shared Streamable HTTP server on `127.0.0.1:3000` by default.
- Exposes `/mcp`, `/api/v1`, health, and OpenAPI routes from that process.
- Integrates with VS Code's native **Forward a Port** flow for Dev Tunnels.
- Adds an Explorer connection view with endpoint and tunnel controls.
- Writes server output to the `Darbot Browser MCP` output channel.

## Manual settings

```json
{
  "chat.mcp.gallery.enabled": true,
  "chat.mcp.servers": {
    "darbot-browser-mcp": {
      "command": "npx",
      "args": ["@darbotlabs/darbot-browser-mcp@2.1.4", "--browser", "msedge"],
      "env": { "NODE_ENV": "production" }
    }
  }
}
```

## Commands

Use the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- `Darbot Browser MCP: Start Server`
- `Darbot Browser MCP: Stop Server`
- `Darbot Browser MCP: Restart Server`
- `Darbot Browser MCP: Show Status`
- `Darbot Browser MCP: Forward HTTP Port with VS Code`
- `Darbot Browser MCP: Set Dev Tunnel URL`
- `Darbot Browser MCP: Test Local and Dev Tunnel Endpoints`
- `Darbot Browser MCP: Copy MCP Endpoint`
- `Darbot Browser MCP: Copy Power Platform REST URL`

## Dev Tunnel workflow

The default HTTP transport listens on `127.0.0.1:3000`. Start the server,
run **Forward HTTP Port with VS Code**, and set port 3000 to **Public** in
the Ports view when Power Platform must call it. Save the generated tunnel
URL with **Set Dev Tunnel URL**, then run **Test Local and Dev Tunnel
Endpoints** before importing or testing a connector.

The MCP endpoint is `<base>/mcp`. Power Platform and Copilot Studio use
`<base>/api/v1`, including `GET /api/v1/tools` and
`POST /api/v1/tools/{toolName}`.

## Copilot usage examples

```text
Use darbot-browser-mcp to navigate to https://example.com and take a screenshot.
```

```text
Use darbot-browser-mcp to save this authenticated portal session as power-platform-maker.
```

## Troubleshooting

- Confirm VS Code version supports MCP server definition providers.
- Confirm `chat.mcp.gallery.enabled` is `true`.
- Restart VS Code after changing MCP settings.
- Check the output channel for npm, Node.js, or browser launch errors.
- A Dev Tunnel `502 Bad Gateway` means the tunnel relay is reachable but no
  process is listening on the forwarded local port.
- If Copilot needs an already-open browser tab, configure the [bridge extension](../guides/bridge-auto-detection.md).
---

_Last updated: 2026-08-18 (v2.1.4)_
