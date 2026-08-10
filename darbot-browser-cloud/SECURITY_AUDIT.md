# Darbot Browser MCP cloud security review

**Updated:** August 9, 2026
**Scope:** live Azure App Service v1.3.0, deployed `ca18` image, current v2.1.4 source, historical `v2.0.0/extensions` cloud configuration
**Status:** deployment-specific remediation and end-to-end authentication validation required

## Evidence model

- **Live Azure:** resource configuration queried through Azure CLI.
- **Deployed image:** files and command line inspected from the exact ACR image.
- **Source:** current v2.1.4 implementation and tests.
- **Historical:** prior branch, templates, scripts, and verification harness.
- **Inferred:** explicitly identified where direct execution was unavailable.

## Confirmed findings

### Authentication

- The live server has Entra and API-key authentication configured.
- `ALLOW_ANONYMOUS_ACCESS=true` causes the unified authenticator to accept every
  request anonymously before evaluating those methods.
- An invalid bearer token and no bearer token both completed MCP
  initialization against the audited live deployment.
- The live Entra app registration has no identifier URI, delegated API scope,
  or app role. Token acquisition for `api://<client-id>/.default` fails because
  that API resource is not exposed.
- The cloud extension requests Microsoft Graph scopes by default. A Graph token
  does not satisfy the server's Darbot audience check.
- v2.1.4 adds RS256/JWKS signature verification before issuer, audience, and
  lifetime checks. Focused authentication unit tests pass, but no repository
  test performs a complete Entra authorization-code exchange followed by MCP
  `initialize` and `tools/list`.

**Conclusion:** authentication code exists, but the audited live deployment is
public because of the anonymous short circuit. Do not claim Entra enforcement
until anonymous requests fail and a Darbot-audience token succeeds.

### Browser state

- Both the deployed image and v2.1.4 omit `--isolated`; the default is a
  persistent Chromium context.
- The browser profile, history, cookies, and cache are stored on the container
  filesystem.
- `WEBSITES_ENABLE_APP_SERVICE_STORAGE=false` and no App Service storage mount
  is configured.
- Replacing or restarting the container can therefore discard current browser
  state.

### Session snapshots and Blob Storage

- Named Darbot session snapshots are filesystem-backed.
- The live storage account contains private `browser-sessions` and `audit-logs`
  containers, but both were empty during the audit.
- The App Service identity has `Storage Blob Data Contributor`.
- Neither the deployed v1.3.0 image nor current v2.1.4 source contains Azure
  Blob SDK usage or runtime calls that persist browser state or audit records.

**Conclusion:** storage was provisioned and authorized but is not wired into
the browser runtime. Blob RBAC does not imply Blob-backed persistence.

### Container

- The live `ca18` image runs Node 23 and Playwright Chromium as a non-root user.
- The v2.1.4 App Service image uses
  `node:26.2.0-bookworm-slim`, Playwright Chromium, and non-root uid `10001`.
- The v2.1.4 image does not install an App Service SSH server and its runtime
  user has a non-login shell.
- Installing or replacing npm packages in a running container is not a durable
  deployment method; filesystem changes are instance-local and disappear when
  App Service replaces the container.

### Azure resources and image pull

- The live App Service identity has `AcrPull`, Key Vault secret-read, and Blob
  data roles.
- The audited App Service still uses registry credentials with
  `acrUseManagedIdentityCreds=false`.
- The current v2.1.4 Bicep template enables managed-identity ACR pull for new
  stacks.
- A read-only Azure what-if showed the current Bicep naming convention would
  create a parallel ACR, App Service, plan, Key Vault, Application Insights,
  and Log Analytics workspace instead of upgrading the live names.

**Conclusion:** use an image-only update for existing deployments. Treat ACR
authentication migration as a separate change.

### Historical deployment artifacts

- Historical deployment scripts use `azure\templates\main.bicep`.
- `azure\templates\app-service.json` was introduced as a parallel ARM artifact,
  is not referenced by those scripts, and is invalid JSON because its
  `outputs` object closes with `]`.
- The historical cloud test validates health, OpenAPI, selected tool paths, and
  that GET `/mcp` returns below 500. It does not authenticate, initialize MCP,
  or call `tools/list`.

## Required production gates

1. Build from a reviewed, reproducible v2.1.4 release commit.
2. Use an immutable image tag and retain the previous tag for rollback.
3. For existing Azure resources, update only the current App Service image
   reference unless a separately reviewed infrastructure change is intended.
4. Expose and consent a Darbot API scope before disabling anonymous access.
5. Verify missing and invalid credentials return `401`.
6. Verify a valid Darbot-audience token completes `initialize` and `tools/list`.
7. Decide explicitly whether container-local browser state may be discarded on
   restart; do not describe Blob persistence unless it is implemented and
   tested.

## Out of scope

This review does not certify compliance, replace automated dependency or secret
scanning, or assert that optional Azure diagnostics and storage integrations
are required. It documents the behavior observed in the audited deployment and
source.
