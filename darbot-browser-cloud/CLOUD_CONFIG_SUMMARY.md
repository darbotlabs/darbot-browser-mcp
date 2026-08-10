# Darbot Browser MCP Azure configuration baseline

This document records the supported configuration shape for v2.1.4. It is a
template, not proof that any particular live deployment uses every component.

## Container

| Field | Value |
| --- | --- |
| Image | `<acr>.azurecr.io/darbot-browser-mcp:<immutable-tag>` |
| Base image | `node:26.2.0-bookworm-slim` |
| Browser | Playwright-bundled Chromium |
| User | `app` (`uid 10001`) |
| Port | `8080` |
| Viewport | `1920x1080` |
| Health | `/health`, `/ready`, `/live` |
| MCP | `/mcp` Streamable HTTP |
| Isolation | Disabled unless `--isolated` is passed |

Build from the repository root:

```powershell
docker build `
  --file 'azure\docker\Dockerfile.appservice' `
  --tag 'darbot-browser-mcp:2.1.4' `
  .
```

## New deployment versus existing upgrade

`azure\bicep\main.bicep` creates a convention-named App Service, plan, ACR,
Key Vault, Application Insights, Log Analytics workspace, and two RBAC
assignments. It does not adopt differently named existing resources.

For an existing deployment, use its existing ACR and update only the existing
App Service image reference. Run Azure `what-if` before any Bicep deployment;
`Create` results mean the operation is provisioning additional resources.

## Runtime settings

```text
WEBSITES_PORT=8080
WEBSITES_ENABLE_APP_SERVICE_STORAGE=false
PORT=8080
SERVER_BASE_URL=https://<app>.azurewebsites.net
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<api-client-id>
AZURE_CLIENT_SECRET=<Key Vault reference>
ENTRA_AUTH_ENABLED=true
ALLOW_ANONYMOUS_ACCESS=false
APPLICATIONINSIGHTS_CONNECTION_STRING=<connection-string>
MAX_CONCURRENT_SESSIONS=20
SESSION_TIMEOUT_MS=1800000
```

Do not set `ALLOW_ANONYMOUS_ACCESS=false` until an MCP client can obtain a
Darbot-audience token. When it is `true`, anonymous access bypasses every other
configured authentication method.

`REQUIRE_MSAL`, `STORAGE_ACCOUNT_NAME`, `SESSIONS_CONTAINER`, and
`AUDIT_CONTAINER` are not runtime contracts in v2.1.4.

## Entra application

The app registration must expose a delegated API scope or app role. The server
accepts tokens whose audience is either the client ID or
`api://<client-id>`.

```text
Example scope: api://<client-id>/Darbot.Access
Redirect URI: https://<app>.azurewebsites.net/auth/callback
```

The cloud VS Code extension defaults to `openid`, `profile`, `email`, and
Microsoft Graph `User.Read`. Override its scopes with the exposed Darbot scope
for enforced bearer authentication.

## Browser and session state

Non-isolated mode uses a persistent Chromium context on the container
filesystem. With App Service storage disabled, that profile survives only for
the lifetime of the current container instance.

Named session snapshots are also filesystem-backed. The runtime does not
currently use the Azure Blob SDK or upload browser profiles, snapshots, or
audit records to Blob Storage. Existing storage accounts, containers, or Blob
RBAC assignments remain unused unless separate integration code is added.

## Validation

- `/health` reports the intended version.
- MCP `initialize` succeeds and returns a session ID.
- `tools/list` returns 68 tools.
- Navigation, snapshot, and screenshot calls succeed.
- When auth is enforced, missing and invalid tokens return `401`.
- A valid token for the Darbot API audience completes the MCP handshake.

An unauthenticated health check, OpenAPI response, or HTTP 400 from GET `/mcp`
does not validate authenticated MCP operation.

---

_Last updated: 2026-08-09 (v2.1.4)_
