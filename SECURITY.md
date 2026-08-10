# Security Policy

The Darbot Labs team takes the security of the Darbot Browser MCP server, its
companion extensions, and all related distribution channels (npm, Visual
Studio Marketplace, NuGet, Docker, Power Platform) seriously. We appreciate
responsible disclosure from the community.

## Supported Versions

Security fixes are produced against the latest minor release line. Older
release lines are best-effort.

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | ✅ Active           |
| 1.3.x   | ⚠️ Critical fixes only (until 2026-12-31) |
| < 1.3   | ❌ End-of-life      |

## Reporting a Vulnerability

**Do not** open a public GitHub issue for security reports.

Use one of the following private channels:

1. **Preferred — GitHub Security Advisories.** Visit
   <https://github.com/darbotlabs/darbot-browser-mcp/security/advisories/new>
   and submit a draft advisory. This creates a private workspace where the
   maintainers can collaborate with you on triage and patching.
2. **Email.** Send a report to `security@darbotlabs.com` with the subject
   `[security] darbot-browser-mcp`.

Whichever channel you use, please include:

- A clear description of the issue and its impact (confidentiality, integrity,
  availability).
- Reproduction steps, a minimal proof-of-concept, or affected code paths.
- Affected version(s) — `npm view @darbotlabs/darbot-browser-mcp version`,
  extension marketplace versions, NuGet package version, or Docker image
  digest, as applicable.
- Your contact details and whether you wish to be credited in the advisory.

## What to expect

| Phase                | Target SLA           |
| -------------------- | -------------------- |
| Initial acknowledgement | within 3 business days |
| Triage decision      | within 7 business days |
| Fix or mitigation    | within 30 days for high/critical |
| Public advisory      | coordinated with reporter |

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_disclosure):
we will work with you on a public-disclosure date, attribute you in the
advisory (unless you ask otherwise), and credit you in the release notes.

## Scope

Vulnerabilities in any of the following are in scope:

- The `@darbotlabs/darbot-browser-mcp` npm package and its published MCP
  HTTP/streamable transports.
- The browser extension at `extension/` and the three VS Code extensions at
  `vscode-extension/`, `darbot-browser-cloud/vscode-extension-cloud/`, and
  `darbot-browser-hosted/vscode-extension-hosted/`.
- The `DarbotLabs.Browser.MCP` NuGet package and its hosted services.
- Container images published under the project organisation.
- Power Platform custom connectors authored by this project.
- The OAuth / Entra ID integration in `src/auth/`.
- Anything in CI/CD that affects the integrity of released artefacts.

Out of scope (please report to the appropriate vendor instead):

- Vulnerabilities in upstream dependencies — file with the upstream first.
  If a fix requires action from us, link to the upstream advisory.
- Vulnerabilities in Microsoft Entra ID, Azure, or VS Code themselves.
- Issues that require a compromised local machine or already-compromised
  browser profile.

## Hardening guidance for operators

If you are running the server yourself, please:

- Always set `SERVER_BASE_URL` for OAuth-enabled deployments. The server
  fails closed and emits `OAUTH_CONFIG_INCOMPLETE` when this is unset.
- Pin extension versions in deployment manifests so a compromised marketplace
  release cannot be silently auto-upgraded.
- Run the Docker image as a non-root user (the published image already does).
- Treat the `/health`, `/ready`, and `/live` endpoints as internal — do not
  expose them publicly without filtering.
- Use a network policy to restrict which sites the browser is allowed to
  reach if you are running the autonomous-crawl tools.

## Acknowledgements

Reporters who follow this policy will be acknowledged in
[`CHANGELOG.md`](./CHANGELOG.md) and the GitHub Security Advisory unless they
ask to remain anonymous.
