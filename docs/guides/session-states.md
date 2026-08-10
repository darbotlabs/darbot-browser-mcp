# Session states

This guide explains Darbot session-state snapshots and how they differ from real browser profiles.

You'll learn:

- What `browser_save_profile` and `browser_switch_profile` store.
- How to export and import portable session-state bundles.
- How to import safe VS Code workspace metadata.
- Where session states live on each platform.
- How to combine session states with Edge profile metadata.

## Concept

A Darbot session state is a snapshot of the current URL, title, cookies, localStorage, and metadata. It is not a full Microsoft Edge profile. Use it to checkpoint a workflow, resume authenticated state, or document which workspace and account created a checkpoint.

## Tools

- `browser_save_profile` saves a named session-state snapshot.
- `browser_export_session_state` writes a portable bundle under `--output-dir`.
- `browser_import_session_state` imports a portable bundle from `--output-dir`.
- `browser_import_workspace_metadata` records safe metadata from JSON or a
  `.code-workspace` file for the current MCP session.
- `browser_switch_profile` restores a saved snapshot and navigates to the stored URL.
- `browser_list_profiles` lists saved snapshots with Edge profile and workspace metadata.
- `browser_delete_profile` removes a saved snapshot.
- `browser_discover_profiles` lists real Microsoft Edge profiles on disk.

## Storage locations

Session states are stored under `darbot-browser-mcp/session-states` in the
platform data directory unless `DARBOT_SESSION_STATE_DIR` is set:

| Platform | Base directory |
| --- | --- |
| Windows | `%APPDATA%` |
| macOS | `~/Library/Application Support` |
| Linux | `$XDG_DATA_HOME` or `~/.local/share` |

Each state contains `profile.json` metadata and, when available, `storage-state.json` compatible with Playwright.

Docker images set `DARBOT_SESSION_STATE_DIR=/app/data/sessions`. Mount that
directory to persistent storage if states must survive container replacement.
The Azure runtime does not currently upload session states to Blob Storage.

Authenticated HTTP callers are isolated by principal beneath the configured
directory. Entra and tunnel identities receive separate storage namespaces,
and each API key receives a namespace derived from a one-way key fingerprint.
Local stdio and intentionally anonymous HTTP deployments continue to use the
base directory for backward compatibility.

## Portable bundles

Exports and imports are intentionally limited to filenames inside the
configured output directory. Arbitrary filesystem paths and traversal are
rejected. Authenticated HTTP callers also receive principal-isolated artifact
directories so portable bundles are not shared across users.

```javascript
await browser_export_session_state({
  name: "power-platform-maker-signed-in",
  filename: "maker-session.darbot-session-state.json"
});

await browser_import_session_state({
  filename: "maker-session.darbot-session-state.json",
  name: "maker-session-imported"
});
```

Portable bundles can contain reusable cookies and local storage. Treat them as
secrets: do not commit them, print their contents, or place them in shared
artifact stores without appropriate access controls.

## Workspace metadata

Place a JSON or `.code-workspace` file in `--output-dir`, then import it:

```javascript
await browser_import_workspace_metadata({
  filename: "darbot.code-workspace"
});
```

The tool records folder entries, setting names, extension recommendations, and
remote-authority metadata for subsequent session-state snapshots. It does not
execute tasks, apply settings, install extensions, or read workspace files.

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

_Last updated: 2026-08-10 (v2.1.4)_
