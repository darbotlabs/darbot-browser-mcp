# HTTP API reference

This reference documents the HTTP endpoints exposed when Darbot Browser MCP runs with `--port` or `PORT`.

You'll learn:

- Which endpoints are MCP protocol endpoints.
- Which endpoints are used for health, readiness, OpenAPI, and bridge status.
- How authentication applies to HTTP transports.

## Endpoint summary

| Endpoint | Methods | Purpose | Auth |
| --- | --- | --- | --- |
| `/mcp` | `POST`, session-aware MCP methods | Streamable HTTP MCP transport | Enforced when auth is enabled |
| `/mcp/tools` | `GET` | List registered tools and JSON schemas | Enforced when auth is enabled |
| `/api/v1/tools` | `GET` | Power Platform-compatible tool listing | Enforced when auth is enabled |
| `/api/v1/tools/{toolName}` | `POST` | Execute one registered tool through the REST adapter | Enforced when auth is enabled |
| `/health` | `GET` | JSON health with memory, uptime, and runtime checks | Public by default |
| `/ready` | `GET` | Readiness probe returning `OK` | Public by default |
| `/live` | `GET` | Liveness probe returning `Alive` | Public by default |
| `/openapi.json` | `GET` | OpenAPI 3.0 document | Public by default |
| `/swagger.json` | `GET` | Alias for OpenAPI document | Public by default |
| `/bridge` | `GET` | Browser extension bridge status when bridge mode is active | Local bridge diagnostic |
| `/cdp` | WebSocket | CDP relay endpoint in bridge mode | Local bridge channel |
| `/extension` | WebSocket | Browser extension relay channel in bridge mode | Local bridge channel |

## Streamable HTTP MCP (`/mcp`)

Initialize and send MCP messages with `POST /mcp`. The server returns and tracks `Mcp-Session-Id` headers according to the MCP SDK Streamable HTTP transport.

MCP session identifiers are bound to the authenticated principal that created
them. Reusing another principal's session identifier returns HTTP 403.

## REST tool adapter

Power Platform and Copilot Studio can call
`POST /api/v1/tools/{toolName}` with the tool arguments as the JSON body. The
response uses MCP tool-result fields (`content`, optional `isError`) and
returns `X-Darbot-Session-Id`.

Calls without that header reuse a default browser session for the authenticated
principal. Supplying a returned identifier selects that session explicitly.
REST sessions expire after `SESSION_TIMEOUT_MS` and count toward
`MAX_CONCURRENT_SESSIONS`.

## Health response

`GET /health` returns:

```json
{
  "status": "healthy",
  "timestamp": "2026-05-18T00:00:00.000Z",
  "version": "2.1.4",
  "checks": [
    { "name": "memory", "status": "pass", "duration": 1 },
    { "name": "uptime", "status": "pass", "duration": 0 },
    { "name": "runtime", "status": "pass", "duration": 0 }
  ]
}
```

## OpenAPI

`/openapi.json` is generated from the 68 registered tool schemas and includes
security schemes for Entra ID bearer tokens and `X-API-Key`. The runtime
document has 74 paths, including 68 `/api/v1/tools/browser_*` operations. The
checked-in Power Platform v2.1.4 Swagger has 75 paths because it also exposes a
generic execute-by-name operation. `/api/v1/health`, `/api/v1/ready`,
`/api/v1/live`, `/api/v1/openapi.json`, and `/api/v1/openapi.yaml` are aliases
for connector clients using the Swagger base path.

## Authentication

When any auth method is enabled, `/mcp`, `/mcp/tools`, and `/api/v1/tools/*`
require a successful authenticator result. Persistent session states, REST
sessions, and MCP session identifiers are isolated by authenticated principal.
Supported methods are documented in [Authentication](../architecture/auth.md).
---

_Last updated: 2026-08-10 (v2.1.4)_
