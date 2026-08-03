# Darbot Browser MCP Power Platform connector changelog

## 2.1.1

- Advanced connector release line to **2.1.1** to match the unified product matrix.
- Confirmed OpenAPI operations track the registration-truth **59**-tool MCP registry (plus generic list/execute helpers).
- Retired stale "52-tool" wording in companion README.

## 2.0.0
- Updated connector metadata to version 2.0.0.
- Added generic tool listing and execution operations for forward compatibility.
- Expanded individual OpenAPI operations to match the current Darbot Browser MCP tool registry found in the `src-tools-auth` worktree during reconciliation.
- Modernized deployment script with strict Bash mode, argument validation, JSON validation, and `--dry-run` support.
- Added connector deployment and security guidance for Power Automate and Copilot Studio.

