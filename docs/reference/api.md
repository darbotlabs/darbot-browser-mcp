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
| `/sse` | `GET`, `POST` | Legacy SSE MCP transport | Enforced when auth is enabled |
| `/health` | `GET` | JSON health with memory, uptime, and runtime checks | Public by default |
| `/healthz` | `GET` | K8s-style alias for `/health` | Public by default |
| `/ready` | `GET` | Readiness probe returning `OK` | Public by default |
| `/readyz` | `GET` | K8s-style alias for `/ready` | Public by default |
| `/live` | `GET` | Liveness probe returning `Alive` | Public by default |
| `/livez` | `GET` | K8s-style alias for `/live` | Public by default |
| `/openapi.json` | `GET` | OpenAPI 3.0 document | Public by default |
| `/swagger.json` | `GET` | Alias for OpenAPI document | Public by default |
| `/bridge` | `GET` | Browser extension bridge status when bridge mode is active | Local bridge diagnostic |
| `/cdp` | WebSocket | CDP relay endpoint in bridge mode | Local bridge channel |
| `/extension` | WebSocket | Browser extension relay channel in bridge mode | Local bridge channel |

## Streamable HTTP MCP

Initialize and send MCP messages with `POST /mcp`. The server returns and tracks `Mcp-Session-Id` headers according to the MCP SDK Streamable HTTP transport.

## SSE transport

`GET /sse` creates an SSE session. `POST /sse?sessionId=<id>` sends messages to that session. Prefer `/mcp` for new clients.

## Health response

`GET /health` returns:

```json
{
  "status": "healthy",
  "timestamp": "2026-05-18T00:00:00.000Z",
  "version": "2.1.1",
  "checks": [
    { "name": "memory", "status": "pass", "duration": 1 },
    { "name": "uptime", "status": "pass", "duration": 0 },
    { "name": "runtime", "status": "pass", "duration": 0 }
  ]
}
```

Prefer `/healthz`, `/readyz`, and `/livez` for Kubernetes-style probes; the non-`z` routes remain for compatibility.

## OpenAPI

`/openapi.json` is generated from the registered tool schemas and includes security schemes for Entra ID bearer tokens and `X-API-Key`. Use it for Copilot Studio and Power Platform connector discovery. The Power Platform custom connector swagger tracks the same registry (v2.1.1, 66 paths including meta list/execute ops).

## Authentication

When any auth method is enabled, `/mcp` and `/sse` require a successful authenticator result. Supported methods are documented in [Authentication](../architecture/auth.md).
---

_Last updated: 2026-08-03 (v2.1.1)_
