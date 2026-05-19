# Quickstart

This quickstart gets a local MCP client from zero to a successful browser tool call in about five minutes.

You'll learn:

- How to run Darbot Browser MCP with `npx`.
- How to add it to VS Code MCP settings.
- How to verify the first navigation and snapshot.

## Prerequisites

- Node.js `23` or newer.
- Microsoft Edge, Chrome, Firefox, or WebKit. Microsoft Edge is the default recommendation.
- VS Code with GitHub Copilot Chat, or another MCP client.

## 1. Verify the package

```bash
npx @darbotlabs/darbot-browser-mcp@latest --version
```

## 2. Add the MCP server

For VS Code, add this to user or workspace settings:

```json
{
  "chat.mcp.enabled": true,
  "chat.mcp.servers": {
    "darbot-browser": {
      "command": "npx",
      "args": ["@darbotlabs/darbot-browser-mcp@latest", "--browser", "msedge"]
    }
  }
}
```

## 3. Ask for a browser action

In Copilot Chat agent mode, run:

```text
Use darbot-browser to navigate to https://example.com, capture a snapshot, and summarize the page title.
```

The expected tool sequence is `browser_navigate` followed by `browser_snapshot`. For custom JavaScript inspection, use `browser_evaluate` after the page loads.

## 4. Optional: start HTTP mode

Use HTTP mode when a remote client, Copilot Studio, or the bridge extension needs a network endpoint:

```bash
npx @darbotlabs/darbot-browser-mcp@latest --port 8931 --browser msedge
```

Verify health and OpenAPI endpoints:

```bash
curl http://localhost:8931/health
curl http://localhost:8931/openapi.json
```

Next: review [installation](installation.md), [configuration](configuration.md), and the [tool catalog](../reference/tools.md).
---

_Last updated: 2026-05-18 (v2.0.0)_
