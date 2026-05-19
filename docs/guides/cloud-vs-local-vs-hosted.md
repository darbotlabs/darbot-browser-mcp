# Cloud vs local vs hosted

This guide compares the three supported deployment modes so teams can pick the right runtime boundary.

You'll learn:

- How local, Azure cloud, and hosted Docker deployments differ.
- Which authentication and transport choices fit each mode.
- When to use the browser extension bridge.

## Deployment matrix

| Dimension | Local | Azure cloud | Hosted Docker |
| --- | --- | --- | --- |
| Typical transport | stdio | Streamable HTTP | Streamable HTTP |
| Browser location | Developer machine | Azure App Service/container | Customer-controlled host |
| Authentication | MCP client trust | Entra ID, OAuth, API key, managed identity | Entra ID, tunnel auth, API key |
| Best for | Development and debugging | Shared enterprise automation | Data-sovereign or restricted networks |
| Browser state | Local profile or isolated context | Managed per service instance | Container volume or ephemeral state |

## Local

Local mode is the fastest path for development. The MCP client launches the server over stdio, and the server launches a local browser.

```bash
npx @darbotlabs/darbot-browser-mcp@latest --browser msedge
```

## Azure cloud

Azure mode exposes `/mcp`, `/health`, `/ready`, `/live`, and `/openapi.json` behind an App Service or container endpoint. Use it for Copilot Studio, team-shared tools, and Microsoft Entra enforcement.

```bash
./azure/deploy.sh my-resource-group darbot-mcp-prod eastus
```

Set `SERVER_BASE_URL`, `ENTRA_AUTH_ENABLED`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` for OAuth-backed deployments.

## Hosted Docker

Hosted mode runs the service in a customer-controlled container and can be exposed through a private network, reverse proxy, or VS Code Dev Tunnel.

```bash
docker build -t darbot-browser-hosted .
docker run -d --name darbot-browser-hosted -p 8080:8080 darbot-browser-hosted
```

## Bridge mode

Bridge mode is orthogonal to deployment mode. It connects MCP traffic to an existing Chrome or Edge tab through the extension and CDP relay. Use it for workflows that require a user's already-authenticated browser context.
---

_Last updated: 2026-05-18 (v2.0.0)_
