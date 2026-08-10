# Authentication architecture

This reference explains how v2.1.4 authenticates Streamable HTTP MCP traffic.

## Supported methods

| Method | Enable with | Credential |
| --- | --- | --- |
| Anonymous | No auth methods enabled, or `ALLOW_ANONYMOUS_ACCESS=true` | None |
| API key | `API_KEY_AUTH_ENABLED=true` and `API_KEYS` | `X-API-Key` |
| Entra bearer token | `ENTRA_AUTH_ENABLED=true` | `Authorization: Bearer <token>` |
| MCP OAuth proxy | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `SERVER_BASE_URL` | OAuth authorization flow |
| VS Code Dev Tunnel | `TUNNEL_AUTH_ENABLED=true` or tunnel environment | Trusted tunnel headers |
| Managed Identity setup | `MANAGED_IDENTITY_ENABLED=true` or Azure identity environment | Azure identity and inbound Entra token |

## Anonymous short circuit

The unified authenticator returns an anonymous success result when no
authentication method is enabled **or** when
`ALLOW_ANONYMOUS_ACCESS=true`. This check occurs before Entra, API-key, tunnel,
and managed-identity validation. Enabling Entra and API-key settings does not
enforce them while anonymous access remains enabled.

## Principal isolation

Authenticated MCP and REST sessions are bound to the identity that created
them. Entra and tunnel callers are keyed by tenant and user identity; API-key
callers are keyed by a one-way fingerprint of the supplied key. Workflow
registrations and executions are connection-scoped, while saved session states
and portable artifacts are stored beneath the caller's principal namespace.

Anonymous HTTP mode intentionally uses one shared local namespace for backward
compatibility and should not be treated as multi-user isolation.

## Hosted legacy variables

The hosted Docker image starts the root `cli.js` process, which constructs
`UnifiedAuthenticator` in `src/transport.ts`. That runtime does not read
`REQUIRE_AUTH`, `ALLOW_LOCALHOST`, or `REQUIRE_MSAL`.

Those names exist only in the legacy hosted helper source under
`darbot-browser-hosted/src/auth/`. The Dockerfile copies that source to
`/app/hosted`, but it is not compiled, imported, or registered by the image
entrypoint. Do not rely on those variables to protect `/mcp`; use the canonical
variables in the table above.

## Entra token contract

The server verifies the JWT signature, issuer, audience, lifetime, roles, and
scopes. Accepted audiences are:

```text
<AZURE_CLIENT_ID>
api://<AZURE_CLIENT_ID>
```

The Entra app registration must expose an API scope or app role before a client
can acquire a token for that audience. A client requesting only Microsoft Graph
`User.Read` receives a Graph-audience token, which the Darbot verifier must
reject.

Example delegated scope:

```text
api://<AZURE_CLIENT_ID>/Darbot.Access
```

Configure the cloud extension or other MCP client to request the exposed Darbot
scope rather than relying on its default Graph scopes.

## MCP OAuth proxy

`SERVER_BASE_URL` is required for OAuth metadata and redirect generation:

```text
SERVER_BASE_URL=https://<app>.azurewebsites.net
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

Having these variables present proves only that the OAuth router can be
configured. End-to-end readiness also requires compatible redirect URIs, an
exposed API scope, consent, and a successful authorization-code/token exchange.

## Verification

An authenticated deployment is ready only when all of these succeed:

1. An unauthenticated MCP request returns `401`.
2. An invalid bearer token returns `401`.
3. A valid Darbot-audience token completes `initialize`.
4. The authenticated session completes `tools/list`.
5. Required roles are enforced when `REQUIRED_ROLES` is configured.

Health probes are intentionally separate from this verification and may remain
public.

---

_Last updated: 2026-08-10 (v2.1.4)_
