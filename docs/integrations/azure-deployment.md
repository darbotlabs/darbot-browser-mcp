# Azure deployment

This guide describes the Azure-first deployment model for hosting Darbot Browser MCP as a managed HTTP service.

You'll learn:

- Which Azure resources are expected.
- How to configure authentication, health, and observability.
- How to validate a deployment before connecting clients.

## Target resources

A production deployment typically includes:

- Azure App Service or container hosting for the MCP server.
- App Service Plan sized for browser workloads.
- Key Vault for client secrets and API keys.
- Application Insights and Log Analytics for telemetry.
- Storage for session artifacts when persistence is required.
- Managed Identity for Azure-to-Azure secret access.

## Deploy

```bash
./azure/deploy.sh my-resource-group darbot-mcp-prod eastus
```

For environments using Bicep directly, keep parameters for `SERVER_BASE_URL`, auth mode, allowed origins, and session budgets explicit in source control.

## Required app settings

```bash
SERVER_BASE_URL=https://darbot-mcp-prod.azurewebsites.net
PORT=8080
ENTRA_AUTH_ENABLED=true
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
AUDIT_LOGGING_ENABLED=true
MAX_CONCURRENT_SESSIONS=20
SESSION_TIMEOUT_MS=1800000
```

## Health probes

Configure platform probes against:

- `/health` for comprehensive JSON health.
- `/ready` for load balancer readiness.
- `/live` for container liveness.

## Validation

```bash
curl https://darbot-mcp-prod.azurewebsites.net/health
curl https://darbot-mcp-prod.azurewebsites.net/ready
curl https://darbot-mcp-prod.azurewebsites.net/openapi.json
```

## Hardening

- Enforce HTTPS at the edge.
- Enable Entra ID, OAuth, API key, or managed identity authentication before exposing `/mcp`.
- Limit outbound automation targets with `--allowed-origins` where practical.
- Use separate app instances for dev, test, and production.
- Monitor memory pressure; browser sessions are heavier than typical API requests.
---

_Last updated: 2026-05-18 (v2.0.0)_
