# Darbot Browser MCP Cloud — End-User Setup

A two-page setup guide for engineers who want VS Code to talk to an
already-deployed Darbot Browser MCP Cloud instance on Azure App Service.

For the deployment side — provisioning the App Service, ACR, Key Vault,
Storage, etc. — see [`CLOUD_CONFIG_SUMMARY.md`](./CLOUD_CONFIG_SUMMARY.md)
and the templates under [`azure/`](../azure/).

## 1. Prerequisites

| Requirement                                 | Why                                             |
| ------------------------------------------- | ----------------------------------------------- |
| VS Code 1.96 or newer                        | MCP server definition provider API.             |
| `chat.mcp.gallery.enabled = true`            | Enables MCP servers in the chat / agent UI.     |
| Microsoft account signed into VS Code        | The extension uses VS Code's built-in Microsoft authentication provider. |
| A deployed cloud server URL                  | `https://<your-app>.azurewebsites.net`.         |
| (Enterprise) Entra ID app + consent         | Grants the user `User.Read` and any custom API scopes. |

## 2. Install the extension

```text
ext install darbotlabs.darbot-browser-mcp-cloud
```

(or Command Palette → *Extensions: Install Extensions* → search
*Darbot Browser MCP Cloud*).

## 3. Configure the endpoint

Open settings (`Ctrl+,`) and set:

```jsonc
{
  // Required. Base URL of your App Service deployment.
  "darbot-browser-mcp-cloud.serverUrl": "https://<your-app>.azurewebsites.net",

  // Optional. Defaults to `<serverUrl>/mcp` when blank.
  "darbot-browser-mcp-cloud.sseEndpoint": "",

  // Optional. Periodic health checks while connected.
  "darbot-browser-mcp-cloud.enableHealthChecks": true,
  "darbot-browser-mcp-cloud.healthCheckInterval": 60000,
  "darbot-browser-mcp-cloud.connectionTimeout": 30000,

  // Optional. Scopes requested when fetching the Entra ID token.
  "darbot-browser-mcp-cloud.scopes": [
    "openid",
    "profile",
    "email",
    "User.Read"
  ]
}
```

The **`SERVER_BASE_URL` environment variable** takes precedence over the
`serverUrl` setting at runtime. Use it to flip an entire VS Code window
between staging and production without editing settings.

## 4. First connection

1. `Ctrl+Shift+P` → **Darbot Browser Cloud: Sign in with Microsoft**
   (optional — done automatically on first request if you skip it).
2. `Ctrl+Shift+P` → **Darbot Browser Cloud: Test Cloud Connection**.
   You should see *"Cloud server is reachable (v<n>)"*.
3. `Ctrl+Shift+P` → **Darbot Browser Cloud: Connect to Cloud Server**.
   The status bar flips to `$(cloud) MCP Cloud: Connected`.
4. Open Copilot Chat → **agent mode**. The 52 Darbot tools appear under
   *Darbot Browser MCP Cloud*.

## 5. Commands

| Command palette entry                              | Purpose                                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Darbot Browser Cloud: **Sign in with Microsoft**   | Force-create an authenticated session even if one was not cached.             |
| Darbot Browser Cloud: **Connect to Cloud Server**  | Run a health check + start periodic monitoring.                               |
| Darbot Browser Cloud: **Disconnect from Cloud Server** | Stop periodic monitoring.                                                  |
| Darbot Browser Cloud: **Test Cloud Connection**    | One-shot health probe with friendly toast.                                     |
| Darbot Browser Cloud: **Show Cloud Server Status** | Inline status + quick actions.                                                 |

## 6. Authentication model

```
VS Code → vscode.authentication.getSession('microsoft', scopes)
        → built-in Microsoft account provider
        → Entra ID access token
        → attached as `Authorization: Bearer <token>` on every MCP request
```

The extension never opens its own browser window for OAuth; the user is
already signed in via VS Code's settings. Tokens are cached in memory
for the lifetime of the window and refreshed silently when expired.

## 7. Troubleshooting

| Symptom                                                                | Action                                                                                                          |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| *"Set darbot-browser-mcp-cloud.serverUrl before connecting"* warning   | Configure the setting, or `set SERVER_BASE_URL=https://…` and restart VS Code.                                  |
| Health probe returns `HTTP 401`                                        | Tenant or scope mismatch. Run *Sign in with Microsoft* and ensure the user has consented to the configured app. |
| Status bar stays *Disconnected* but agent-mode tools work              | Expected. The status bar reflects the explicit *Connect* command, while agent mode runs through the MCP provider. |
| `HTTP 503` health response                                             | Server reachable but unhealthy. Check App Insights logs and `/health` payload for the failed subsystem.          |
| `Timeout after 30000ms`                                                | App Service cold-start or networking issue. Raise `darbot-browser-mcp-cloud.connectionTimeout` if needed.        |

## 8. Related documents

- [`CLOUD_CONFIG_SUMMARY.md`](./CLOUD_CONFIG_SUMMARY.md) — deployment topology template.
- [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) — security baseline for the cloud deployment.
- [`vscode-extension-cloud/README.md`](./vscode-extension-cloud/README.md) — marketplace landing page.
