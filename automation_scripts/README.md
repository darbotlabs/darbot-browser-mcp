# GitHub automation cheat sheets

This directory contains operator-oriented cheat sheets for managing the `darbotlabs/darbot-browser-mcp` repository with the GitHub CLI and, where useful, Darbot Browser MCP browser tools.

## Prerequisites

```bash
gh auth login
gh repo set-default darbotlabs/darbot-browser-mcp
gh status
```

Use `gh` for state-changing GitHub operations because it is auditable, scriptable, and supports reviewable issue and pull-request bodies. Use MCP browser tools for visual verification of GitHub pages.

## Files

| File | Purpose |
| --- | --- |
| `github_issue_creator.md` | Current `gh issue create` workflows and issue body templates. |
| `github_quick_actions.md` | Fast repository, issue, PR, release, and workflow status commands. |

## Safety practices

- Prefer `--repo darbotlabs/darbot-browser-mcp` in automation scripts when the working directory may vary.
- Preview generated issue and PR bodies before submitting.
- Do not paste secrets into issue bodies, PR descriptions, comments, or screenshots.
- Use labels and milestones that already exist in the repository; list them first with `gh label list` and `gh milestone list`.
