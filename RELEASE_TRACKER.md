# Release tracker

This tracker records forward-looking release milestones after the v2.0.0 reconciliation line.

You'll learn:

- What remains for **v2.1.1** enhance-release readiness.
- Which later v2.x milestones are planned.
- Where historical notes live.

## v2.1.1 enhance release readiness

| Area | Status | Notes |
| --- | --- | --- |
| Version matrix | Done | npm, VSIX, bridge, hosted, cloud, NuGet at **2.1.1**. |
| Best-of lineage merge | Done | Reconcile runtime + fleet packaging + ADO enterprise auth retained. |
| Documentation | Done | README/CHANGELOG/RELEASE_TRACKER/API docs aligned to 2.1.1 and 59-tool truth. |
| Dependencies | Held | Caret ranges on PW ^1.60 / MCP SDK ^1.29 / Zod ^4 / Express 5 / Azure identity stack; registry TLS blocked live `npm outdated` this session. |
| Tool surface | Done | Registration-truth **59** tools verified. |
| Extensions | Done | Local/hosted/cloud VSIX versions → 2.1.1. |
| NuGet | Done | net8 package + default pin → 2.1.1; pack doc paths fixed. |
| Azure and Power Platform | Done | Connector swagger/changelog 2.1.1; Docker engine matrix documented. |

## v2.1.1 validation checklist

- [x] Local `npm run typecheck`, `npm run build`, and `npm run lint` pass on `v2.1.1-uprev`.
- [ ] CI build passes on `v2.1.1-uprev` (or release tag) in GitHub Actions.
- [ ] `npm test` / Playwright suite green in CI (full browser install).
- [ ] VS Code extension package installs and discovers the server.
- [x] Health aliases registered in code: `/health|/healthz`, `/ready|/readyz`, `/live|/livez` (+ `/openapi.json` generator present).
- [ ] Live HTTP probe of health/OpenAPI in a running container/App Service.
- [ ] Bridge auto-detection finds a connected extension on `9223`-`9225`.
- [x] Copilot Studio and Power Platform docs/swagger match connector **2.1.1**.
- [ ] npm, VS Code, NuGet, hosted extension, cloud client, and ADO mirror workflows publish from the release tag.
- [x] No product package remains on **1.3.0**; historical 2.0.0 notes only in changelog/migration.

## Runtime support matrix (2.1.1)

| Runtime | Support |
| --- | --- |
| Node.js | `>=20` (root/CLI); Azure/hosted images may use Node 23 bookworm-slim |
| Playwright | `^1.60` line |
| .NET | `net8.0` (`DarbotLabs.Browser.MCP`) |
| VS Code | `^1.96.0` engines on VSIX packages |
| MCP | Streamable HTTP `/mcp` + legacy SSE `/sse` via `@modelcontextprotocol/sdk` |

## v2.x roadmap

| Milestone | Theme | Candidate work |
| --- | --- | --- |
| `2.1.1` | Enhance / unify | Version parity, claims fix, dep/forge alignment, best-of matrix. |
| `2.1.x` | Stabilization | OAuth metadata, bridge diagnostics, package metadata errata. |
| `2.2.0` | Connector experience | OpenAPI action curation, PP ergonomics, Copilot Studio examples. |
| `2.3.0` | Autonomous crawling | Memory connectors, crawl reports, optional ML scoring (new design — do not revive dead orphans). |

## Historical archive

- v2.0.0 reconciliation notes: prior CHANGELOG section and fleet audit.
- v1.3.0 and earlier: `docs/legacy/release-tracker-archive.md`.

---

_Last updated: 2026-08-03 (v2.1.1)_
