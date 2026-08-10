# Profiles and multi-account workflows

This guide explains how Darbot records Edge profile context and discovers installed Microsoft Edge profiles.

You'll learn:

- How real Edge profiles differ from Darbot session states.
- How to discover Edge profile names and emails.
- How to start the MCP server with account-aware metadata.

## Real Edge profiles vs session snapshots

Microsoft Edge profiles are browser-level directories such as `Default` and `Profile 1`. Darbot session snapshots are saved automation checkpoints. Use Edge profiles to choose an account context; use session snapshots to checkpoint a workflow inside that context.

## Discover installed profiles

From an MCP client, call:

```javascript
await browser_discover_profiles({});
```

For a custom Edge user data directory:

```javascript
await browser_discover_profiles({
  userDataDir: "C:\Users\you\AppData\Local\Microsoft\Edge\User Data"
});
```

## Start with an Edge profile

```json
{
  "mcpServers": {
    "darbot-browser-mcp": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@2.1.4",
        "--browser", "msedge",
        "--user-data-dir", "C:\Users\you\AppData\Local\Microsoft\Edge\User Data",
        "--edge-profile", "Default",
        "--edge-profile-email", "you@example.com",
        "--workspace", "contoso-automation"
      ]
    }
  }
}
```

## Profile lock warning

A full Edge user-data directory can be locked by an already running Edge process. If Playwright reports a profile singleton or lock error, close Edge, choose `--isolated`, or use the [bridge extension](bridge-auto-detection.md) to control an already-open tab.

## Enterprise patterns

- Use separate Edge profiles for production, test, and admin accounts.
- Save session states only after successful sign-in and environment selection.
- Record `--workspace` so saved states are traceable to a project.
- Prefer the bridge for human-owned sessions and launched browsers for CI.
---

_Last updated: 2026-08-10 (v2.1.4)_
