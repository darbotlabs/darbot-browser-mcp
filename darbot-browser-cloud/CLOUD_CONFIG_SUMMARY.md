# Darbot Browser MCP — Azure Cloud Configuration Summary

> **Template.** Replace every `<…>` placeholder with values from your
> deployment. Do **not** commit subscription IDs, tenant IDs, resource
> IDs, secrets, or container digests back into the public repository —
> use a private store (Key Vault, internal wiki) for those.

This document captures the *shape* of a production-grade Darbot Browser
MCP deployment on Azure App Service plus Azure Container Registry, so a
new operator can stand up an equivalent environment by filling in the
placeholders.

## 1. Topology at a glance

```
┌──────────────────────────────────────────────────────────────────┐
│ Azure Resource Group: <your-resource-group>                     │
│                                                                  │
│  ┌─────────────────────┐    ┌──────────────────────────────┐    │
│  │ Container Registry  │ ─► │ App Service                  │    │
│  │ <your-acr>.azurecr.io│    │ <your-app>.azurewebsites.net │    │
│  │                     │    │   image: darbot-browser-mcp:<tag>│ │
│  └─────────────────────┘    └─────────┬────────────────────┘    │
│                                       │                          │
│   ┌──────────────┐    ┌────────────┐  │  ┌────────────────────┐ │
│   │ Key Vault    │ ◄──┤ Managed    │◄─┴──┤ App Insights       │ │
│   │ <your-kv>    │    │ Identity   │     │ + Log Analytics    │ │
│   └──────────────┘    └────────────┘     └────────────────────┘ │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ Storage Account <your-storage>                           │  │
│   │   container: sessions/  (work profiles)                  │  │
│   │   container: audit/     (request audit log)              │  │
│   └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## 2. Container image

| Field                | Value                                                            |
| -------------------- | ---------------------------------------------------------------- |
| Registry             | `<your-acr>.azurecr.io`                                          |
| Image                | `<your-acr>.azurecr.io/darbot-browser-mcp:<tag>`                  |
| Base image           | `node:23-bookworm-slim`                                          |
| Browser bundled      | Chromium (Playwright build, pinned)                              |
| Image size           | ≈ 1.2 GB                                                         |
| Entry point          | `dumb-init -- node cli.js --headless --browser chromium --no-sandbox --host 0.0.0.0 --port 8080` |
| Health endpoint      | `/health` (200 healthy / 503 unhealthy-but-reachable)            |
| Non-root user        | `app` (uid `1001`)                                               |

Build with the Dockerfile under [`azure/Dockerfile.acr`](../azure/Dockerfile.acr).

## 3. Azure resources

> Replace placeholders such as `<sub>`, `<rg>`, `<region>`.

| Resource              | Name                                | Notes                                   |
| --------------------- | ----------------------------------- | --------------------------------------- |
| Resource Group        | `<your-resource-group>`             | Region: `<region>`                       |
| App Service Plan      | `<your-plan>`                       | SKU sized for headed-browser workloads.  |
| App Service           | `<your-app>`                        | Hostname: `<your-app>.azurewebsites.net` |
| Container Registry    | `<your-acr>`                        | SKU: Basic or Standard.                  |
| Managed Identity      | system-assigned on App Service       | Grants AcrPull, KV secret read.          |
| Key Vault             | `<your-keyvault>`                   | Stores Entra app secret if used.         |
| Application Insights  | `<your-appinsights>`                | Workspace-based.                         |
| Log Analytics         | `<your-loganalytics>`               | Retention: 30 days minimum.              |
| Storage Account       | `<your-storage>`                    | Containers: `sessions`, `audit`.         |

## 4. App Service settings

Set via Azure CLI:

```bash
az webapp config appsettings set --name <your-app> --resource-group <your-rg> --settings \
  WEBSITES_PORT=8080 \
  WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
  NODE_ENV=production \
  PORT=8080 \
  ALLOW_ANONYMOUS_ACCESS=false \
  REQUIRE_MSAL=true \
  AZURE_TENANT_ID=<tenant-id> \
  AZURE_CLIENT_ID=<entra-app-client-id> \
  AZURE_CLIENT_SECRET=@Microsoft.KeyVault\(SecretUri=https://<your-keyvault>.vault.azure.net/secrets/<secret-name>/\) \
  APPLICATIONINSIGHTS_CONNECTION_STRING=<from-app-insights> \
  STORAGE_ACCOUNT_NAME=<your-storage> \
  SESSIONS_CONTAINER=sessions \
  AUDIT_CONTAINER=audit \
  SERVER_BASE_URL=https://<your-app>.azurewebsites.net
```

`SERVER_BASE_URL` is also respected by the **Darbot Browser MCP Cloud**
VS Code extension when set in the user environment — it overrides the
`darbot-browser-mcp-cloud.serverUrl` setting.

## 5. RBAC and managed identity

Grant the system-assigned identity of the App Service:

| Role                                  | Scope                                |
| ------------------------------------- | ------------------------------------ |
| `AcrPull`                             | `<your-acr>`                         |
| `Key Vault Secrets User`              | `<your-keyvault>`                    |
| `Storage Blob Data Contributor`       | `<your-storage>`                     |
| `Monitoring Metrics Publisher`        | `<your-appinsights>`                 |

## 6. Entra (Microsoft Identity) configuration

| Setting                          | Value                                                   |
| -------------------------------- | ------------------------------------------------------- |
| App registration                 | `<your-entra-app>` (single-tenant or multi-tenant)      |
| Required API permissions         | `User.Read` (delegated), `openid`, `profile`, `email`   |
| Redirect URIs                    | `https://<your-app>.azurewebsites.net/auth/callback`    |
| Client secret                    | Stored in Key Vault, **never** in source control.        |
| Token audience expected by MCP   | `api://<your-entra-app>` (or `<client-id>`)             |

The VS Code Cloud extension exchanges tokens through the built-in
Microsoft auth provider — there is no custom OAuth dance in client code.

## 7. Validation checklist

- [ ] `curl https://<your-app>.azurewebsites.net/health` returns `200 {status:"healthy", version:"<v>"}`.
- [ ] `curl -H "Authorization: Bearer <token>" https://<your-app>.azurewebsites.net/mcp` upgrades to Streamable HTTP.
- [ ] VS Code Cloud extension → *Test Cloud Connection* succeeds.
- [ ] VS Code → agent mode → *darbot* tools appear (59 tools when both
  snapshot and vision sets are exposed).
- [ ] App Insights receives traces and `auditLog` events on every tool call.
- [ ] Sessions/profile work after a restart (persisted in Blob storage).

## 8. Companion documents

- [`CLOUD_EXTENSION_SETUP.md`](./CLOUD_EXTENSION_SETUP.md) — end-user
  setup of the VS Code Cloud extension.
- [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) — deployment hardening
  baseline.
- [`../azure/`](../azure/) — Bicep / ARM templates and Dockerfiles.

---

*Internal teams: store the *populated* version of this file in your
private wiki, not in this public repository.*
