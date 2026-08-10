# Installation

This guide consolidates local, VS Code, Docker, Azure, and package installation paths for v2.1.4.

You'll learn:

- Which installation method fits each user profile.
- How to configure common MCP clients.
- How to verify that the server, browser, and extension are working.

## Choose an installation path

| Path | Best for | Command |
| --- | --- | --- |
| `npx` | Temporary use and CI | `npx @darbotlabs/darbot-browser-mcp@2.1.4` |
| Global npm | Daily local use | `npm install -g @darbotlabs/darbot-browser-mcp` |
| VS Code Marketplace | Copilot agent mode with automatic configuration | `code --install-extension darbotlabs.darbot-browser-mcp` |
| NuGet | .NET consumers and service wrappers | `dotnet add package DarbotLabs.Browser.MCP` |
| Docker | Hosted or isolated deployments | Build `azure\docker\Dockerfile.appservice` |
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
      "args": ["@darbotlabs/darbot-browser-mcp@2.1.4", "--browser", "msedge"],
      "env": { "NODE_ENV": "production" }
    }
  }
}
```

## NPX or global npm

```bash
npx @darbotlabs/darbot-browser-mcp@2.1.4 --browser msedge
npm install -g @darbotlabs/darbot-browser-mcp
darbot-browser-mcp --browser msedge --port 8931
```

## Docker

```powershell
docker build `
  --file 'azure\docker\Dockerfile.appservice' `
  --tag 'darbot-browser-mcp:2.1.4' `
  .

docker run `
  --detach `
  --name 'darbot-browser-mcp-2.1.4' `
  --restart 'unless-stopped' `
  --publish '8080:8080' `
  'darbot-browser-mcp:2.1.4'
```

The App Service image already runs headless Chromium with `--no-sandbox` and
binds to port `8080`. Docker entrypoints standardize the viewport at
`1920x1080`. They omit `--isolated`, so browser state persists only inside the
current container filesystem. Removing or replacing the container removes that
state unless a volume is explicitly mounted.

```powershell
Invoke-RestMethod 'http://127.0.0.1:8080/health'
```

## Corporate networks

Configure npm and the browser proxy explicitly:

```bash
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080
npx @darbotlabs/darbot-browser-mcp@2.1.4 --proxy-server http://proxy.example.com:8080
```

## Verification checklist

1. `npx @darbotlabs/darbot-browser-mcp@2.1.4 --version` returns `2.1.4`.
2. Your MCP client lists `darbot-browser-mcp` as an available server.
3. `browser_navigate` can open `https://example.com`.
4. `browser_snapshot` returns an accessibility snapshot.
5. HTTP deployments return `200` from `/health` and `OK` from `/ready`.
---

_Last updated: 2026-08-09 (v2.1.4)_
