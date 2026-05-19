# GitHub issue creator workflows

Use these `gh` CLI workflows to create consistent issues for `darbotlabs/darbot-browser-mcp`.

## Prerequisites

```bash
gh auth status
gh repo set-default darbotlabs/darbot-browser-mcp
gh label list --limit 100
```

## Bug report

```bash
gh issue create \
  --repo darbotlabs/darbot-browser-mcp \
  --title "[BUG] <short description>" \
  --label bug \
  --body "$(cat <<'EOF'
## Bug description

## Steps to reproduce
1.
2.
3.

## Expected behavior

## Actual behavior

## Environment
- OS:
- Browser:
- Package version: @darbotlabs/darbot-browser-mcp@2.0.0
- Node.js version:

## Additional context
EOF
)"
```

## Feature request

```bash
gh issue create \
  --repo darbotlabs/darbot-browser-mcp \
  --title "[FEATURE] <short description>" \
  --label enhancement \
  --body "$(cat <<'EOF'
## Problem

## Proposed solution

## Alternatives considered

## User impact

## Acceptance criteria
- [ ]
EOF
)"
```

## Documentation issue

```bash
gh issue create \
  --repo darbotlabs/darbot-browser-mcp \
  --title "[DOCS] <short description>" \
  --label documentation \
  --body "$(cat <<'EOF'
## Location

## Current state

## Proposed improvement

## Audience
EOF
)"
```

## Duplicate check before creating

```bash
gh issue list --repo darbotlabs/darbot-browser-mcp --state all --search "<keywords> in:title,body" --limit 20
```

## Verify in browser with MCP

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues
```

```mcp
browser_snapshot
```
