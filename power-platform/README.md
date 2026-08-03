# Power Platform custom connector

The Darbot Browser MCP custom connector exposes a hosted Darbot Browser MCP instance to Microsoft Power Platform. Makers can call browser automation actions from Power Automate cloud flows and Copilot Studio topics without writing MCP client code.

## Architecture

```text
Power Automate / Copilot Studio
        │ HTTPS + Microsoft Entra ID
        ▼
Power Platform custom connector
        │ /api/v1/tools and /api/v1/tools/{toolName}
        ▼
Hosted Darbot Browser MCP service
        │
        ▼
Microsoft Edge / Playwright browser session
```

Supported hosting options include Azure App Service, containerized hosting behind an HTTPS endpoint, and development tunnels for non-production testing. Production connectors should use HTTPS, Entra ID, and monitoring.

## Connector files

| File | Purpose |
| --- | --- |
| `connector/apiDefinition.swagger.json` | OpenAPI 2.0 definition imported by Power Platform. |
| `connector/apiProperties.json` | OAuth and connector metadata. |
| `connector/settings.json` | Power Platform connector packaging settings. |
| `connector/icon.png` | Connector icon used by the maker portal. |
| `deploy-connector.sh` | Idempotent deployment helper for `pac connector create/update`. |

## Prerequisites

- Power Platform CLI: `pac --version`
- `jq` and `curl` for the deployment helper
- A Power Platform environment where you can create custom connectors
- A hosted Darbot Browser MCP endpoint, for example `https://your-app.azurewebsites.net`
- A Microsoft Entra app registration for connector OAuth

## Deploy

```bash
power-platform/deploy-connector.sh \
  --environment-url https://yourorg.crm.dynamics.com \
  --azure-client-id 00000000-0000-0000-0000-000000000000 \
  --darbot-url https://your-darbot-instance.azurewebsites.net
```

Use `--dry-run` to render and validate connector files without calling Power Platform.

## Use in Power Automate

1. Open **make.powerautomate.com** and choose your environment.
2. Create or edit a cloud flow.
3. Add an action and select **Custom** > **Darbot Browser MCP**.
4. Start with **List Tools** to confirm the hosted service is reachable.
5. Use a specific browser action such as `BrowserNavigate` or the generic `Execute Tool` action for newly added tools.

## Use in Copilot Studio

1. Open your agent in **Copilot Studio**.
2. Add an action from the Darbot Browser MCP connector.
3. Authenticate with the Entra app configured for the connector.
4. Use browser actions in topics or generative orchestration. Prefer read-only actions such as snapshots before write actions such as click/type.

## Security considerations

- Require Microsoft Entra ID for production deployments; do not expose browser-control endpoints anonymously.
- Scope the Entra application to the Darbot Browser MCP resource and grant only required permissions.
- Treat browser snapshots, screenshots, cookies, and storage data as sensitive.
- Restrict connector access with Power Platform environment roles and DLP policies.
- Monitor hosted service logs and Power Platform connector analytics for unexpected usage.
- Use separate environments and app registrations for development, test, and production.

## Tool coverage

The **v2.1.1** connector includes individual operations for the registration-truth **59**-tool Darbot Browser MCP registry plus generic list/execute operations.

## Troubleshooting

- `pac` authentication failures: run `pac auth clear` and recreate the profile.
- OAuth consent failures: verify redirect URL `https://global.consent.azure-apim.net/redirect` and resource scopes.
- Connector action failures: call `/health`, then `GET /api/v1/tools` on the hosted service.
- Browser timeouts: verify the host has enough CPU/memory and that Edge/Playwright dependencies are installed.

