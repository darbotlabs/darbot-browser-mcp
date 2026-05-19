# Release tracker

This tracker records forward-looking v2.x release milestones; historical v1.x notes moved to `docs/legacy/release-tracker-archive.md`.

You'll learn:

- What remains for v2.0.0 release readiness.
- Which v2.x milestones are planned after reconciliation.
- Where historical release notes now live.

## v2.0.0 release readiness

| Area | Status | Notes |
| --- | --- | --- |
| Source reconciliation | In progress | Fleet branches reconcile ADO donor content into GitHub canonical. |
| Documentation | In progress | v2 docs are reorganized under `docs/` with root README, changelog, and contributor docs. |
| Build and dependencies | In progress | Dependency and workflow updates are owned by the build/CI reconciliation scope. |
| Tool surface | In progress | Current docs describe the final registered tool surface from `src/tools.ts`. |
| Extensions | In progress | VS Code, hosted, cloud, and browser extension version alignment is owned by the extensions scope. |
| NuGet | In progress | .NET package versioning is owned by the dotnet/nuget scope. |
| Azure and Power Platform | In progress | Infra and scripts are reconciled by their owning scopes. |

## v2.0.0 validation checklist

- [ ] CI build passes on the integration branch.
- [ ] `npm test` passes on the integration branch.
- [ ] VS Code extension package installs and discovers the server.
- [ ] `/health`, `/ready`, `/live`, and `/openapi.json` respond in HTTP mode.
- [ ] Bridge auto-detection finds a connected extension on `9223`-`9225`.
- [ ] Copilot Studio and Power Platform docs match final deployment scripts.
- [ ] npm, VS Code, NuGet, hosted extension, and ADO mirror workflows publish from the release tag.

## v2.x roadmap

| Milestone | Theme | Candidate work |
| --- | --- | --- |
| `2.0.x` | Stabilization | Patch OAuth metadata, bridge diagnostics, package metadata, and docs errata. |
| `2.1.0` | Enterprise operations | Harden audit logging, session quotas, Key Vault integration, and deployment templates. |
| `2.2.0` | Connector experience | Improve OpenAPI action curation, Power Platform connector ergonomics, and Copilot Studio examples. |
| `2.3.0` | Autonomous crawling | Expand memory connector support, crawl reports, and safety policy controls. |

## Historical archive

See `docs/legacy/release-tracker-archive.md` for the v1.3.0 tracker and earlier packaging notes.

---

_Last updated: 2026-05-18 (v2.0.0)_
