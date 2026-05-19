# Darbot Browser MCP test-generation prompts

This file demonstrates prompt patterns for generating browser tests with Darbot Browser MCP in an MCP-enabled client such as VS Code Copilot Chat.

Run: open Copilot Chat, select the Darbot Browser MCP tools, and paste one prompt.

## Navigation smoke test

```text
Navigate to https://github.com/darbotlabs/darbot-browser-mcp, capture a snapshot, and generate a Playwright test that verifies the repository title is visible.
```

## Package listing check

```text
Navigate to https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp, wait for the package title, and generate a Playwright test for the package page.
```

## Marketplace listing check

```text
Navigate to https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp, capture a screenshot, and generate a Playwright test that verifies the extension listing loads.
```

## Form workflow template

```text
Generate a Playwright test for this workflow: navigate to a login page, type a username and password into accessible fields, submit, wait for navigation, and assert the signed-in landing page is visible.
```

## Multi-tab workflow template

```text
Open https://github.com/darbotlabs/darbot-browser-mcp, create a new tab for https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp, switch between tabs, capture snapshots, and generate a Playwright test for the workflow.
```
