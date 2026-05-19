# Power Platform integration

This guide explains how Power Platform custom connectors can call Darbot Browser MCP through its hosted HTTP API and OpenAPI specification.

You'll learn:

- Where to source the connector schema.
- How connector actions map to browser tools.
- Which authentication options are supported.

## Connector source

Use the hosted OpenAPI document:

```text
https://<app>.azurewebsites.net/openapi.json
```

The generated connector can expose a curated subset of browser actions, such as navigation, click, type, screenshot, snapshot, health, and session-state operations.

## Deploy sequence

```bash
./azure/deploy.sh my-resource-group darbot-mcp-prod eastus
cd power-platform
./deploy-connector.sh https://myorg.crm.dynamics.com <client-id> https://darbot-mcp-prod.azurewebsites.net
```

If the connector scripts are not present in your branch, use the OpenAPI import flow in Power Platform and point it to `/openapi.json`.

## Authentication

Prefer Microsoft Entra ID for production. API keys are available for service-to-service scenarios that cannot complete interactive OAuth.

```bash
ENTRA_AUTH_ENABLED=true
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

or:

```bash
API_KEY_AUTH_ENABLED=true
API_KEYS=<key-1>,<key-2>
```

## Action design

Keep connector actions small and auditable. A good action maps to one MCP tool call and returns a structured result. Complex tasks should remain in Copilot Studio orchestration so approvals, retries, and business rules are visible.

## Safety guidance

- Require environment-specific connectors for dev, test, and production.
- Avoid actions that submit forms or mutate records without an explicit confirmation step.
- Log connector invocations and correlate them with Darbot server request logs.
---

_Last updated: 2026-05-18 (v2.0.0)_
