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
- Prompts to enable `chat.mcp.enabled` when needed.
- Adds a `chat.mcp.servers` entry using the npm package.
- Provides commands to start, stop, restart, and inspect status.
- Writes server output to the `Darbot Browser MCP` output channel.

## Manual settings

```json
{
  "chat.mcp.enabled": true,
  "chat.mcp.servers": {
    "darbot-browser-mcp": {
      "command": "npx",
      "args": ["@darbotlabs/darbot-browser-mcp@latest", "--browser", "msedge"],
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

## Copilot usage examples

```text
Use darbot-browser-mcp to navigate to https://example.com and take a screenshot.
```

```text
Use darbot-browser-mcp to save this authenticated portal session as power-platform-maker.
```

## Troubleshooting

- Confirm VS Code version supports MCP server definition providers.
- Confirm `chat.mcp.enabled` is `true`.
- Restart VS Code after changing MCP settings.
- Check the output channel for npm, Node.js, or browser launch errors.
- If Copilot needs an already-open browser tab, configure the [bridge extension](../guides/bridge-auto-detection.md).
---

_Last updated: 2026-05-18 (v2.0.0)_
