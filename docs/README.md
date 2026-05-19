# Darbot Browser MCP documentation

This documentation index maps every supported v2.0.0 deployment path, integration, and reference surface.

You'll learn:

- Where to start for local, cloud, and hosted deployments.
- Which reference pages document tools, CLI flags, HTTP endpoints, and authentication.
- How the browser extension bridge, session states, and integrations fit together.

## Start here

| Goal | Read |
| --- | --- |
| Install the server or VS Code extension | [Installation](getting-started/installation.md) |
| Make the first tool call in five minutes | [Quickstart](getting-started/quickstart.md) |
| Configure CLI flags, environment variables, and config files | [Configuration](getting-started/configuration.md) |
| Understand local, Azure, and hosted modes | [Cloud vs local vs hosted](guides/cloud-vs-local-vs-hosted.md) |

## Guides

- [Autonomous features](guides/autonomous-features.md) explains crawl planning, memory, guardrails, and reporting.
- [Bridge auto-detection](guides/bridge-auto-detection.md) explains ports `9223`-`9225`, `/bridge`, and the Chrome/Edge extension.
- [Session states](guides/session-states.md) explains save, restore, and storage-state conventions.
- [Profiles and multi-account](guides/profiles-and-multi-account.md) explains Microsoft Edge profile discovery and account-aware workflows.
- [Cloud vs local vs hosted](guides/cloud-vs-local-vs-hosted.md) compares deployment modes.

## Integrations

- [VS Code extension](integrations/vscode-extension.md)
- [Copilot Studio](integrations/copilot-studio.md)
- [Power Platform](integrations/power-platform.md)
- [Azure deployment](integrations/azure-deployment.md)
- [NuGet](integrations/nuget.md)

## Reference

- [Tool catalog](reference/tools.md)
- [HTTP API](reference/api.md)
- [CLI reference](reference/cli.md)

## Architecture

- [Architecture overview](architecture/overview.md)
- [Bridge protocol](architecture/bridge-protocol.md)
- [Authentication](architecture/auth.md)

## Historical and planning material

- [Backlog](backlog/darbot-browser_backlog.md)
- [Release tracker archive](legacy/release-tracker-archive.md)
---

_Last updated: 2026-05-18 (v2.0.0)_
