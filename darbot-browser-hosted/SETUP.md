# Darbot Browser MCP Hosted — Setup Guide

This guide walks you from a clean machine to a working
Darbot Browser MCP Hosted deployment, surfaced inside VS Code through
the companion extension.

> Looking for the public **cloud** offering? Use
> [`CLOUD_EXTENSION_SETUP.md`](../darbot-browser-cloud/CLOUD_EXTENSION_SETUP.md)
> in the sibling directory.

---

## 1. Prerequisites

| Requirement       | Version | Why                                                  |
| ----------------- | ------- | ---------------------------------------------------- |
| VS Code           | 1.96+   | MCP server-definition provider API.                  |
| Docker Engine     | 24+     | Runs the hosted container.                           |
| Node.js (host)    | 20+     | Building the extension or running helper scripts.    |
| `chat.mcp.gallery.enabled` | `true` | Enables MCP servers in agent mode.            |
| (Optional) `code` CLI on `PATH` | latest | If you want to expose the server through a Dev Tunnel. |

Install on Windows:

```powershell
winget install Microsoft.VisualStudioCode
winget install Docker.DockerDesktop
```

---

## 2. Anonymous-mode quick start (local only)

For solo development on a trusted machine:

```bash
docker run -d --name darbot-browser-hosted \
  -p 8080:8080 \
  -e ALLOW_ANONYMOUS_ACCESS=true \
  darbot-browser-hosted

curl http://localhost:8080/health
```

Install the VS Code extension:

```text
ext install darbotlabs.darbot-browser-mcp-hosted
```

The extension auto-connects on activation. Done.

---

## 3. Enterprise mode — MSAL auth

### 3.1 Register an Entra ID app

1. [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Name: `Darbot Browser MCP On-Prem`.
3. Redirect URI: `http://localhost:8080/auth/callback` (or your reverse-proxy URL).
4. Capture the **Application (client) ID** and **Directory (tenant) ID**.
5. **Certificates & secrets** → **New client secret** → capture the **value** (not the id).

### 3.2 Container configuration

Create a `.env` file alongside your `docker-compose.yml`:

```env
ALLOW_ANONYMOUS_ACCESS=false
ENTRA_AUTH_ENABLED=true
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
# Optional — App Insights for telemetry
APPLICATIONINSIGHTS_CONNECTION_STRING=<connection-string>
```

Run:

```bash
docker compose up -d
docker compose logs -f
```

> **Current Compose caveat:** `docker-compose.yml` still sets the legacy
> `REQUIRE_AUTH` and `ALLOW_LOCALHOST` variables, which the image entrypoint
> does not read. Pass the canonical variables above as explicit environment
> overrides; the manifest itself has not yet been migrated.

### 3.3 VS Code extension settings

```jsonc
{
  "darbot-browser-mcp-hosted.serverUrl": "http://localhost:8080",
  "darbot-browser-mcp-hosted.useMsalAuth": true,
  "darbot-browser-mcp-hosted.scopes": ["openid", "profile", "email", "User.Read"]
}
```

Then `Ctrl+Shift+P` → **Darbot Browser Hosted: Sign in with Microsoft**.

---

## 4. Dev Tunnel exposure

```bash
code tunnel --name darbot-browser-mcp --accept-server-license-terms
```

Capture the printed URL (`https://darbot-browser-mcp-abc123.devtunnels.ms`)
and update the extension setting:

```jsonc
{
  "darbot-browser-mcp-hosted.serverUrl": "https://darbot-browser-mcp-abc123.devtunnels.ms"
}
```

The `SERVER_BASE_URL` environment variable also works and takes
precedence over the setting — useful in CI or short-lived shells:

```powershell
$env:SERVER_BASE_URL = "https://darbot-browser-mcp-abc123.devtunnels.ms"
code .
```

---

## 5. Verification checklist

- [ ] `curl <serverUrl>/health` returns `{status:"healthy", version:"2.0.0", …}`.
- [ ] Status bar shows `$(server) MCP Hosted: Connected`.
- [ ] Copilot Chat → agent mode → *Darbot Browser MCP Hosted* lists 68 tools.
- [ ] (MSAL) `Authorization: Bearer …` is visible in the container logs.
- [ ] (Tunnel) Connecting from a second machine works after sharing the tunnel.

---

## 6. Troubleshooting

| Symptom                                                       | Resolution                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Status bar stuck on *Starting…*                                | Run `docker ps`; if the container is missing, follow the quick-start command in §2.              |
| `Container exists but failed to start`                         | `docker logs darbot-browser-hosted` — usually port 8080 is held by something else.                |
| HTTP 401 from `/mcp`                                          | MSAL enabled but the user has not consented to the configured scopes. Run *Sign in with Microsoft*. |
| `getSession` returns nothing                                   | VS Code Microsoft account not signed in. Click the account icon in the Activity Bar.              |
| Tunnel URL changes between sessions                            | Pin it with `code tunnel --name <fixed-name>` and use `--no-sleep` on the host.                   |

---

## 7. Next steps

- Server source / IaC: this repo's `azure/` directory (re-usable for
  on-prem clusters even though it targets Azure App Service).
- Extension marketplace page: [`vscode-extension-hosted/README.md`](./vscode-extension-hosted/README.md).
- Security baseline mirrors the cloud edition; see
  [`../darbot-browser-cloud/SECURITY_AUDIT.md`](../darbot-browser-cloud/SECURITY_AUDIT.md).
