# GitHub quick actions

Fast `gh` commands for repository operations. Add `--repo darbotlabs/darbot-browser-mcp` when running outside the repository.

## Repository status

```bash
gh repo view darbotlabs/darbot-browser-mcp --json nameWithOwner,description,defaultBranchRef,visibility,stargazerCount,forkCount
gh issue status --repo darbotlabs/darbot-browser-mcp
gh pr status --repo darbotlabs/darbot-browser-mcp
```

## Issues

```bash
gh issue list --repo darbotlabs/darbot-browser-mcp --state open --limit 30
gh issue list --repo darbotlabs/darbot-browser-mcp --state open --label bug --limit 30
gh issue list --repo darbotlabs/darbot-browser-mcp --search "is:issue is:open no:label" --limit 30
gh issue view <number> --repo darbotlabs/darbot-browser-mcp --comments
```

## Pull requests

```bash
gh pr list --repo darbotlabs/darbot-browser-mcp --state open --limit 30
gh pr checks <number> --repo darbotlabs/darbot-browser-mcp
gh pr view <number> --repo darbotlabs/darbot-browser-mcp --web
```

## Releases and workflows

```bash
gh release list --repo darbotlabs/darbot-browser-mcp --limit 10
gh run list --repo darbotlabs/darbot-browser-mcp --limit 20
gh run view <run-id> --repo darbotlabs/darbot-browser-mcp --log-failed
```

## Browser verification with MCP

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/actions
```

```mcp
browser_snapshot
```

## Security reminders

```bash
gh api repos/darbotlabs/darbot-browser-mcp/security-advisories --jq '.[].ghsa_id'
gh secret list --repo darbotlabs/darbot-browser-mcp
```

Never print secret values in terminal output, issues, PRs, or MCP snapshots.
