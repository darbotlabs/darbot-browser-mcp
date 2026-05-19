# Installation

This guide consolidates local, VS Code, Docker, Azure, and package installation paths for v2.0.0.

You'll learn:

- Which installation method fits each user profile.
- How to configure common MCP clients.
- How to verify that the server, browser, and extension are working.

## Choose an installation path

| Path | Best for | Command |
| --- | --- | --- |
| `npx` | Temporary use and CI | `npx @darbotlabs/darbot-browser-mcp@latest` |
| Global npm | Daily local use | `npm install -g @darbotlabs/darbot-browser-mcp` |
| VS Code Marketplace | Copilot agent mode with automatic configuration | `code --install-extension darbotlabs.darbot-browser-mcp` |
| NuGet | .NET consumers and service wrappers | `dotnet add package DarbotLabs.Browser.MCP` |
| Docker | Hosted or isolated deployments | `docker build -t darbot-browser-mcp .` |
| Azure | Enterprise shared service | See [Azure deployment](../integrations/azure-deployment.md) |

## Requirements

- Node.js `23` or newer.
- A supported browser: `msedge`, `chrome`, `firefox`, or `webkit`.
- An MCP client such as VS Code, Claude Desktop, Cursor, or Windsurf.

## VS Code extension

```bash
code --install-extension darbotlabs.darbot-browser-mcp
```

The extension registers the MCP server definition, provides start/stop/status commands, and can write the standard MCP settings block.

Manual settings fallback:

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

## NPX or global npm

```bash
npx @darbotlabs/darbot-browser-mcp@latest --browser msedge
npm install -g @darbotlabs/darbot-browser-mcp
darbot-browser-mcp --browser msedge --port 8931
```

## Docker

```bash
docker build -t darbot-browser-mcp .
docker run -i --rm darbot-browser-mcp
```

For containers, prefer headless mode and disable the Chromium sandbox only when the host requires it:

```bash
npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox
```

## Corporate networks

Configure npm and the browser proxy explicitly:

```bash
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080
npx @darbotlabs/darbot-browser-mcp@latest --proxy-server http://proxy.example.com:8080
```

## Verification checklist

1. `npx @darbotlabs/darbot-browser-mcp@latest --version` returns a version.
2. Your MCP client lists `darbot-browser-mcp` as an available server.
3. `browser_navigate` can open `https://example.com`.
4. `browser_snapshot` returns an accessibility snapshot.
5. HTTP deployments return `200` from `/health` and `OK` from `/ready`.
---

_Last updated: 2026-05-18 (v2.0.0)_
