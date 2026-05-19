# Darbot Browser MCP — On-Premises Hosted Edition

**Version**: 2.0.0
**Deployment target**: On-premises Docker, optionally exposed via VS Code Dev Tunnels
**Companion VS Code extension**: [`darbotlabs.darbot-browser-mcp-hosted`](./vscode-extension-hosted/README.md)

The **Hosted Edition** packages the Darbot Browser MCP server as a
Docker container you can run on your own infrastructure. It is the right
choice when you need full control over data residency, you sit behind
a corporate firewall, or you want to keep browser traffic on internal
networks while still pairing the server with a GitHub Copilot client.

For end-user setup, see [`SETUP.md`](./SETUP.md).
For client-side configuration, see
[`vscode-extension-hosted/README.md`](./vscode-extension-hosted/README.md).

---

## Contents

| Path                              | Purpose                                                                  |
| --------------------------------- | ------------------------------------------------------------------------ |
| `Dockerfile`                      | Production container image (Node 23 + Playwright Chromium).              |
| `docker-compose.yml`              | Single-host deployment manifest.                                         |
| `.dockerignore`                   | Build context exclusions.                                                |
| `package.json`                    | Server-side npm workspace (`@darbotlabs/darbot-browser-mcp-hosted`).     |
| `tsconfig.json`                   | TypeScript config for the server-side helpers.                           |
| `scripts/`                        | Helper shell/PowerShell scripts (`start.sh`, `stop.sh`, `setup-tunnel.*`, `health-check.sh`). |
| `src/auth/`                       | MSAL middleware, routes, and config (gated by `REQUIRE_MSAL=true`).      |
| `src/tunnel/`                     | Dev Tunnel manager.                                                      |
| `vscode-extension-hosted/`        | VS Code Marketplace extension that drives the container.                  |

---

## Capabilities

### Browser automation

- 52 autonomous Darbot tools, mirroring the cloud edition (snapshot +
  optional vision tool set).
- Scroll, clock, emulation, and storage helpers.
- Profile / session management via persistent storage volume.
- Autonomous crawling (BFS planner) with configurable memory.

### Authentication

- Anonymous-access mode (default) for local development.
- MSAL middleware that validates Microsoft Entra ID tokens on `/mcp`
  and `/sse` endpoints (`REQUIRE_MSAL=true`, `AZURE_TENANT_ID`,
  `AZURE_CLIENT_ID` envs required).
- API-key fallback for non-interactive callers.

### Remote access

- VS Code **Dev Tunnels** for HTTPS exposure without port-forwarding.
  Tunnel ACL is governed by the GitHub identity of whoever ran
  `code tunnel --name …`.
- Optional reverse-proxy deployment (nginx, Caddy, Azure App Gateway
  examples in `scripts/`).

### Observability

- `/health` endpoint with structured JSON (`{status, version, …}`).
- `winston` logging to stdout (Docker-friendly).
- Optional Application Insights export when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set.

---

## Engineering excellence

- TypeScript strict mode across both server and extension code.
- The VS Code extension keeps its `out/` directory **out of git**.
- All HTTP clients use the Node `http`/`https` modules — no extra
  dependencies for the extension surface.
- Container runs as non-root (`uid 1001`) via `dumb-init` with an
  HTTP-based health check.
- `package.json` `engines.node` set to `>=20` to align with the rest of
  the v2.0.0 fleet.

---

## Quick start

```bash
# build the image
docker build -f Dockerfile -t darbot-browser-hosted ..

# run it
docker run -d --name darbot-browser-hosted \
  -p 8080:8080 \
  -e ALLOW_ANONYMOUS_ACCESS=true \
  darbot-browser-hosted

# verify
curl http://localhost:8080/health
```

Then install the VS Code extension and follow
[`vscode-extension-hosted/README.md`](./vscode-extension-hosted/README.md).

---

## License

Apache-2.0 © Darbot Labs / @dayour. See [LICENSE](../LICENSE).
