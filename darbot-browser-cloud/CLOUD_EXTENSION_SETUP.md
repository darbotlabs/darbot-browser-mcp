# Darbot Browser MCP Cloud extension setup

Use this extension to register an existing Streamable HTTP Darbot endpoint with
VS Code.

## Configure the endpoint

```jsonc
{
  "darbot-browser-mcp-cloud.serverUrl": "https://<app>.azurewebsites.net",
  "darbot-browser-mcp-cloud.mcpEndpoint": "",
  "darbot-browser-mcp-cloud.autoConnect": true,
  "darbot-browser-mcp-cloud.enableHealthChecks": true,
  "darbot-browser-mcp-cloud.healthCheckInterval": 60000,
  "darbot-browser-mcp-cloud.connectionTimeout": 30000
}
```

`SERVER_BASE_URL` overrides `serverUrl` for the current VS Code process.

## Authentication

The extension obtains a token from VS Code's built-in `microsoft`
authentication provider and adds it to the MCP server definition.

The default scopes are:

```json
["openid", "profile", "email", "User.Read"]
```

Those scopes normally produce a Microsoft Graph access token. A Darbot server
with enforced Entra authentication expects a token for its own API audience.
First expose a delegated scope on the Darbot app registration, then configure
the extension explicitly:

```jsonc
{
  "darbot-browser-mcp-cloud.scopes": [
    "openid",
    "profile",
    "email",
    "api://<client-id>/Darbot.Access"
  ]
}
```

Run **Darbot Browser Cloud: Sign in with Microsoft** explicitly before testing
an authenticated endpoint. The one-shot **Test Cloud Connection** command
probes `/health`; success proves reachability, not MCP authorization.

## Verify the connection

1. Sign in with Microsoft.
2. Run **Test Cloud Connection**.
3. Open agent mode and confirm that 68 Darbot tools are listed.
4. Run a navigation and snapshot operation.
5. If authentication is enforced, confirm the server rejects missing and
   invalid bearer tokens.

## Troubleshooting

| Symptom | Meaning |
| --- | --- |
| Health succeeds but tools do not load | Reachability is working; inspect MCP authentication and token audience. |
| MCP returns `401` | The token is absent, expired, from the wrong tenant, or has the wrong audience. |
| Default scopes sign in successfully but MCP returns `401` | A Graph token was acquired; configure the custom Darbot API scope. |
| Tools load without signing in | The server likely has anonymous access enabled. |

---

_Last updated: 2026-08-09 (v2.1.4)_
