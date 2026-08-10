# Azure deployment

This guide covers both new Azure stacks and image-only upgrades of existing
Darbot Browser MCP App Services.

## Choose the deployment path

| Goal | Path |
| --- | --- |
| Create a new convention-named stack | `azure\bicep\main.bicep` through `azure\scripts\deploy.ps1` |
| Upgrade an existing App Service without new resources | Build in its existing ACR and update only `linuxFxVersion` |
| Modify a running container over SSH | Unsupported as a durable deployment method |

The current Bicep template creates App Service, App Service Plan, ACR, Key
Vault, Application Insights, Log Analytics, and RBAC assignments. It does not
adopt resources with different existing names. Treat a `what-if` showing
`Create` as a new deployment, not an upgrade.

## In-place image upgrade

Use an immutable release tag and retain the previous tag for rollback:

```powershell
$resourceGroup = '<existing-resource-group>'
$appName = '<existing-app-service>'
$registryName = '<existing-acr>'
$registryHost = '<existing-acr>.azurecr.io'
$tag = '2.1.4-<release-commit>'

az acr build `
  --registry $registryName `
  --image "darbot-browser-mcp:$tag" `
  --file 'azure\docker\Dockerfile.appservice' `
  --platform linux/amd64 `
  .

$previousImage = az webapp config show `
  --resource-group $resourceGroup `
  --name $appName `
  --query linuxFxVersion `
  --output tsv

az webapp config set `
  --resource-group $resourceGroup `
  --name $appName `
  --linux-fx-version "DOCKER|$registryHost/darbot-browser-mcp:$tag"

az webapp restart --resource-group $resourceGroup --name $appName
```

Do not install npm packages inside a running App Service container. Such
changes affect only that instance, are lost on restart or scale-out, and do not
replace the immutable image used by App Service.

## Authentication

For enforced Entra authentication:

```text
SERVER_BASE_URL=https://<app>.azurewebsites.net
ENTRA_AUTH_ENABLED=true
ALLOW_ANONYMOUS_ACCESS=false
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<api-application-client-id>
AZURE_CLIENT_SECRET=<Key Vault reference>
```

The app registration must expose an API scope or app role. Clients must request
a token for that Darbot API audience, such as
`api://<client-id>/<delegated-scope>`. `openid`, `profile`, `email`, and
Microsoft Graph `User.Read` alone do not produce a Darbot-audience access
token.

When `ALLOW_ANONYMOUS_ACCESS=true`, the unified authenticator accepts the
request anonymously before evaluating Entra, API-key, tunnel, or managed
identity credentials.

## Browser and session state

The App Service image omits `--isolated`, so one persistent Chromium context is
used per container instance. With
`WEBSITES_ENABLE_APP_SERVICE_STORAGE=false`, browser history, cookies, cache,
and filesystem session snapshots are instance-local and are lost when the
container is replaced. Azure Blob persistence is not implemented by the
runtime.

## Validation

After a deployment or image swap:

1. Confirm `/health` reports the intended package version.
2. Perform an MCP `initialize` request and retain the returned session ID.
3. Call `tools/list` and confirm the expected 68 tools.
4. Run `browser_navigate`, `browser_snapshot`, and
   `browser_take_screenshot`.
5. When authentication is enforced, repeat the MCP handshake without a token,
   with an invalid token, and with a valid Darbot-audience token.

A successful health check or HTTP status below 500 from `/mcp` is not proof of
authenticated MCP operation.

---

_Last updated: 2026-08-09 (v2.1.4)_
