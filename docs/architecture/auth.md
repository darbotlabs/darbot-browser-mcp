# Authentication architecture

This reference explains how v2.0.0 authenticates HTTP MCP traffic across local, cloud, hosted, and tunnel deployments.

You'll learn:

- Which authentication methods are supported.
- How precedence works when multiple methods are enabled.
- Why `SERVER_BASE_URL` is required for OAuth.

## Supported methods

| Method | Enable with | Credential location |
| --- | --- | --- |
| Anonymous local access | No auth variables, or `ALLOW_ANONYMOUS_ACCESS=true` | None |
| API key | `API_KEY_AUTH_ENABLED=true` and `API_KEYS` | `X-API-Key` header |
| Entra bearer token | `ENTRA_AUTH_ENABLED=true` | `Authorization: Bearer <token>` |
| MCP OAuth proxy to Entra | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `SERVER_BASE_URL` | OAuth authorization flow |
| VS Code Dev Tunnel | `TUNNEL_AUTH_ENABLED=true` or tunnel environment | Trusted tunnel headers |
| Managed Identity | `MANAGED_IDENTITY_ENABLED=true` or Azure identity environment | Azure identity token flow |

## Precedence

The unified authenticator accepts the first successful method in this order:

1. VS Code Dev Tunnel.
2. Managed Identity setup and Entra token validation.
3. Entra bearer token.
4. API key.
5. Anonymous only when no auth is enabled or anonymous access is explicitly allowed.

## OAuth requirement

v2.0.0 requires `SERVER_BASE_URL` when `getOAuthConfig()` builds OAuth metadata. Earlier builds used a hardcoded URL, which caused incorrect issuer and redirect metadata in non-default deployments.

```bash
SERVER_BASE_URL=https://darbot-mcp-prod.azurewebsites.net
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

## Production baseline

- Expose `/mcp` only through HTTPS.
- Prefer Entra ID/OAuth for user-delegated access.
- Use API keys only for tightly scoped service-to-service calls.
- Rotate client secrets and API keys through Key Vault or the deployment secret store.
- Use `REQUIRED_ROLES` when an Entra application emits roles.
- Keep health endpoints public only if infrastructure requires unauthenticated probes.
---

_Last updated: 2026-05-18 (v2.0.0)_
