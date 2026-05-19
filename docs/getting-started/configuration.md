# Configuration

This reference explains every supported configuration surface: CLI flags, JSON config files, and environment variables.

You'll learn:

- How CLI flags map to browser, network, profile, and server behavior.
- Which environment variables control authentication and cloud integrations.
- How to write a reusable JSON configuration file.

## Configuration precedence

Runtime configuration is resolved in this order:

1. Built-in defaults.
2. JSON file passed with `--config`.
3. CLI flags.
4. Selected environment variables used by auth, Copilot Studio, and cloud hosting.

## Common CLI flags

| Flag | Purpose |
| --- | --- |
| `--browser <browser>` | Browser or channel: `msedge`, `chrome`, `firefox`, `webkit`, and Chromium channel variants. |
| `--headless` | Run without a visible browser window. |
| `--port <port>` | Enable HTTP transport on the specified port. Uses `PORT` when set. |
| `--host <host>` | Bind address. Use `0.0.0.0` only behind a trusted reverse proxy. |
| `--config <path>` | Load a JSON configuration file. |
| `--cdp-endpoint <endpoint>` | Connect to an existing Chromium CDP endpoint. |
| `--extension` | Start bridge relay mode for the browser extension. Requires `--port`. |
| `--vision` | Use screenshot-based tools instead of accessibility snapshots. |
| `--isolated` | Use an in-memory profile and discard state on close. |
| `--user-data-dir <path>` | Persist browser data in a specific profile directory. |
| `--storage-state <path>` | Seed an isolated context with Playwright storage state. |
| `--save-trace` | Save a Playwright trace under the output directory. |
| `--output-dir <path>` | Directory for traces, screenshots, PDFs, and generated artifacts. |
| `--allowed-origins <origins>` | Semicolon-separated allowlist. |
| `--blocked-origins <origins>` | Semicolon-separated blocklist evaluated before the allowlist. |
| `--proxy-server <proxy>` | HTTP or SOCKS proxy endpoint. |
| `--proxy-bypass <domains>` | Comma-separated proxy bypass list. |
| `--device <device>` | Playwright device emulation, such as `iPhone 15`. |
| `--viewport-size <size>` | Browser viewport in `width,height` form. |
| `--edge-profile <name>` | Record an Edge profile name in session-state metadata. |
| `--edge-profile-email <email>` | Record the account email for profile-aware workflows. |
| `--workspace <name>` | Record workspace context in session-state metadata. |

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Cloud-friendly fallback for `--port`. |
| `SERVER_BASE_URL` | Required for v2.0.0 OAuth metadata and redirect generation. |
| `ENTRA_AUTH_ENABLED` | Enables Microsoft Entra JWT authentication for HTTP transports. |
| `AZURE_TENANT_ID` | Entra tenant ID. |
| `AZURE_CLIENT_ID` | Entra application client ID. |
| `AZURE_CLIENT_SECRET` | Entra application secret. |
| `API_KEY_AUTH_ENABLED` | Enables `X-API-Key` authentication. |
| `API_KEYS` | Comma-separated accepted API keys. |
| `ALLOW_ANONYMOUS_ACCESS` | Allows HTTP access without auth when set to `true`. |
| `TUNNEL_AUTH_ENABLED` | Enables VS Code Dev Tunnel request authentication. |
| `MANAGED_IDENTITY_ENABLED` / `AZURE_USE_MANAGED_IDENTITY` | Enables Azure managed identity flows. |
| `REQUIRED_ROLES` | Comma-separated Entra roles required for HTTP access. |
| `COPILOT_STUDIO_ENABLED` | Enables Copilot Studio integration settings. |
| `COPILOT_STUDIO_CALLBACK_URL` | Callback URL for Copilot Studio auth flows. |
| `MAX_CONCURRENT_SESSIONS` | Session concurrency budget for hosted deployments. |
| `SESSION_TIMEOUT_MS` | Hosted session timeout in milliseconds. |
| `AUDIT_LOGGING_ENABLED` | Enables audit logging where configured. |
| `DARBOT_EDGE_PROFILE` | Profile name recorded by session-state tools. |
| `DARBOT_EDGE_PROFILE_EMAIL` | Account email recorded by session-state tools. |
| `DARBOT_WORKSPACE` | Workspace metadata recorded by session-state tools. |

## JSON config file

```json
{
  "browser": {
    "browserName": "chromium",
    "userDataDir": "C:\Users\you\AppData\Local\Microsoft\Edge\User Data",
    "launchOptions": {
      "channel": "msedge",
      "headless": false
    },
    "contextOptions": {
      "viewport": null
    }
  },
  "server": {
    "port": 8931,
    "host": "localhost"
  },
  "network": {
    "allowedOrigins": ["https://example.com"],
    "blockedOrigins": ["https://tracking.example.com"]
  },
  "vision": false,
  "outputDir": ".darbot/output"
}
```

Run it with:

```bash
npx @darbotlabs/darbot-browser-mcp@latest --config .darbot/browser-mcp.json
```

## Security defaults

Local stdio mode does not require authentication. Any HTTP deployment should enable [authentication](../architecture/auth.md), bind behind TLS, and restrict origins when automation targets are known.
---

_Last updated: 2026-05-18 (v2.0.0)_
