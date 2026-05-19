# Examples

Runnable examples for Darbot Browser MCP and the MCP SDK v1 client.

Run JavaScript examples from the repository root after installing dependencies:

```bash
npm install
node examples/navigate-darbotlabs.js
```

| Example | Description |
| --- | --- |
| `generate-test.md` | Prompt catalog for generating Playwright tests with MCP tools. |
| `navigate-darbotlabs.js` | Navigates to the DarbotLabs GitHub organization and prints a snapshot excerpt. |
| `navigate-npm.js` | Opens the Darbot Browser MCP npm package page and prints a snapshot excerpt. |
| `navigate-vscode-marketplace.js` | Opens the VS Code Marketplace extension listing and prints a snapshot excerpt. |
| `open-marketplace.js` | Opens the DarbotLabs publisher management page or a supplied URL. |

The examples use `npx -y @darbotlabs/darbot-browser-mcp@latest --browser msedge`. Replace the package spec or browser flag as needed for local development.
