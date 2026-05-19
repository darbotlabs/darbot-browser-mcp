# Session states

This guide explains Darbot session-state snapshots and how they differ from real browser profiles.

You'll learn:

- What `browser_save_profile` and `browser_switch_profile` store.
- Where session states live on each platform.
- How to combine session states with Edge profile metadata.

## Concept

A Darbot session state is a snapshot of the current URL, title, cookies, localStorage, and metadata. It is not a full Microsoft Edge profile. Use it to checkpoint a workflow, resume authenticated state, or document which workspace and account created a checkpoint.

## Tools

- `browser_save_profile` saves a named session-state snapshot.
- `browser_switch_profile` restores a saved snapshot and navigates to the stored URL.
- `browser_list_profiles` lists saved snapshots with Edge profile and workspace metadata.
- `browser_delete_profile` removes a saved snapshot.
- `browser_discover_profiles` lists real Microsoft Edge profiles on disk.

## Storage locations

Session states are stored under `darbot-browser-mcp/session-states` in the platform data directory:

| Platform | Base directory |
| --- | --- |
| Windows | `%APPDATA%` |
| macOS | `~/Library/Application Support` |
| Linux | `$XDG_DATA_HOME` or `~/.local/share` |

Each state contains `profile.json` metadata and, when available, `storage-state.json` compatible with Playwright.

## Recommended naming

Use descriptive, non-secret names:

```text
crm-admin-pre-submit-2026-05-18
power-platform-maker-signed-in
release-validation-clean-cart
```

Do not put passwords, tokens, customer names, or private ticket identifiers in the state name or description.

## Example

```javascript
await browser_save_profile({
  name: "power-platform-maker-signed-in",
  description: "Maker portal authenticated at environment picker"
});

await browser_switch_profile({
  name: "power-platform-maker-signed-in"
});
```

For real Edge account selection, see [profiles and multi-account](profiles-and-multi-account.md).
---

_Last updated: 2026-05-18 (v2.0.0)_
