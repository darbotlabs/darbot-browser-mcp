# Architecture overview

This overview describes the core v2.1.4 components and how MCP clients, transports, tools, browsers, and integrations connect.

You'll learn:

- Which processes exist in local, HTTP, and bridge mode.
- How tool calls become browser actions.
- Where cloud integrations and authentication fit.

## Component model

```mermaid
flowchart TB
  Client[MCP client: VS Code, Copilot Studio, Claude, Cursor] --> Transport{Transport}
  Transport -->|stdio| Server[Darbot Browser MCP server]
  Transport -->|/mcp Streamable HTTP| Server
  Server --> Tools[Tool registry]
  Tools --> Context[Browser context manager]
  Context --> Browser[Playwright browser]
  Server --> Health[Health and OpenAPI endpoints]
  Server --> Auth[Unified authentication]
  Server --> Bridge[CDP relay bridge]
  Bridge --> Extension[Chrome/Edge extension]
  Extension --> ExistingTab[Existing browser tab]
```

## Request flow

1. The client sends an MCP tool request over stdio or Streamable HTTP (`/mcp`).
2. The server validates transport session state and authentication when enabled.
3. The registered tool validates parameters with Zod.
4. The tool produces Playwright operations and optional response content.
5. The browser context executes the action in a launched browser or through the bridge CDP endpoint.
6. The server returns text, image, file, or structured MCP content.

## Tool modes

Default mode uses accessibility snapshots and deterministic selectors. The five
`browser_screen_*` coordinate-based tools are core tools and are always
registered alongside the 63 accessibility-first and management tools, for 68
registered tools total.

## Cloud services

HTTP deployments add `/health`, `/ready`, `/live`, `/openapi.json`, `/mcp`, Entra/OAuth/API key authentication, and cloud-friendly `PORT` support. See [Azure deployment](../integrations/azure-deployment.md).

## Extension bridge

The bridge allows Darbot to automate an existing authenticated Chrome or Edge tab through `chrome.debugger`. See [Bridge protocol](bridge-protocol.md) and [Bridge auto-detection](../guides/bridge-auto-detection.md).
---

_Last updated: 2026-08-10 (v2.1.4)_
