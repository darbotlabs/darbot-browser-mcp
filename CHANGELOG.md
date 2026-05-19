# Changelog

All notable changes to Darbot Browser MCP are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses semantic versioning.

## [2.0.0] - 2026-05-18

### Breaking

- `getOAuthConfig()` now requires an explicit `SERVER_BASE_URL` environment variable instead of relying on a hardcoded server base URL.
- The package is ESM-only; CommonJS consumers must use dynamic `import()` or run the CLI/package through an ESM-capable runtime.

### Added

- Bridge auto-detection on ports `9223`, `9224`, and `9225`.
- `/bridge` endpoint for CDP relay and extension status.
- `browser_evaluate` for JavaScript execution in the page context.
- `browser_discover_profiles` for Microsoft Edge profile discovery.
- Hosted browser extension path for shared browser tab automation.
- `/health`, `/ready`, and `/live` health endpoints.
- NuGet package release track for .NET consumers.
- Copilot Studio OpenAPI specification through `/openapi.json`.
- Mirror-to-ADO workflow for read-only Azure DevOps synchronization.

### Changed

- Upgraded dependencies and modernized the build pipeline.
- Reorganized documentation into task-oriented guides, integrations, references, and architecture pages.
- Clarified local, cloud, hosted, and bridge deployment modes.
- Expanded authentication docs for Entra ID, OAuth, API keys, tunnels, and managed identity.

### Removed

- Build artifacts from source control.
- Deprecated duplicate marketplace navigation docs and superseded installation guides.

### Migration guide: 1.3.x to 2.0.0

1. Set `SERVER_BASE_URL` for every HTTP/OAuth deployment.
2. Confirm Node.js `23` or newer and ESM-compatible imports.
3. Replace legacy docs links with `docs/README.md` and the new `docs/reference/*` pages.
4. Use `/mcp` for new remote clients; keep `/sse` only for legacy clients.
5. Re-test bridge workflows with `/bridge` and ports `9223`-`9225`.
6. Update tool allowlists to include `browser_evaluate` and `browser_discover_profiles` where appropriate.

## [1.3.0] - 2026-01-25

### Added

- Browser Extension Bridge mode with CDP relay support.
- 52-tool autonomous browser surface including AI-native, autonomous crawling, session, emulation, clock, cookie, and storage tools.
- Streamable HTTP transport fixes for MCP SDK compliance.
- VS Code extension updates for MCP server management.
- Initial enterprise integration docs for Copilot Studio, Power Platform, Azure, and Entra ID.

### Changed

- Improved session isolation and bridge status diagnostics.
- Published npm and VS Code Marketplace releases under the `1.3.0` line.

---

_Last updated: 2026-05-18 (v2.0.0)_
