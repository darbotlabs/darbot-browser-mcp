# Darbot Browser MCP - Test Generation Examples

Use these prompts with GitHub Copilot Chat (`@darbot-browser-mcp`) to generate Playwright tests.

---

## Example 1: Navigate to DarbotLabs GitHub

```
Navigate to https://github.com/darbotlabs and take a screenshot
```

---

## Example 2: Navigate to Darbot Browser MCP Repository

```
Navigate to https://github.com/darbotlabs/darbot-browser-mcp and take a screenshot
```

---

## Example 3: Navigate to VS Code Marketplace Extension

```
Navigate to https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp and take a screenshot
```

---

## Example 4: Navigate to NPM Package

```
Navigate to https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp and take a screenshot
```

---

## Example 5: GitHub PR Checks Navigation

Generate a test for this scenario:

1. Open the [Microsoft Playwright GitHub repository](https://github.com/microsoft/playwright).
2. Click on the **Pull requests** tab.
3. Find and open a recent pull request.
4. Switch to the **Checks** tab for that pull request.
5. Expand a check suite to view its jobs.
6. Click on a job to view its details.

---

## Example 6: Form Interaction Test

Generate a test for this scenario:

1. Navigate to a login page.
2. Type username into the email field.
3. Type password into the password field.
4. Click the submit button.
5. Wait for navigation to complete.
6. Take a screenshot of the result.

---

## Example 7: Multi-Tab Workflow

Generate a test for this scenario:

1. Open https://github.com/darbotlabs/darbot-browser-mcp
2. Create a new tab and navigate to https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp
3. Switch between tabs and take screenshots of each.
4. Close the npm tab.

---

## Usage

In VS Code with the Darbot Browser extension installed:

1. Open Copilot Chat (Ctrl+Shift+I)
2. Type `@darbot-browser-mcp` followed by one of the prompts above
3. The browser will execute the steps and generate test code
