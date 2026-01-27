# GitHub Quick Actions - MCP Automation Scripts

This script provides quick, one-command automation for common GitHub repository tasks using the Darbot Browser MCP server.

## Quick Commands

### Launch and Navigate

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp
```

###  Repository Health Check

Quick assessment of repository status:

```mcp
browser_snapshot
```

Extract from snapshot:
- Star count
- Fork count
- Open issues count
- Open pull requests count
- Last commit date
- Branch information

### Quick Bug Report

Fast bug report creation:

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues/new/choose
```

```mcp
browser_click
element: Bug report template
ref: [Look for "Bug report" template button]
```

### Quick Feature Request

Fast feature request creation:

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues/new/choose
```

```mcp
browser_click
element: Feature request template
ref: [Look for "Feature request" template button]
```

###  Issues Dashboard

Quick overview of all issues:

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues
```

```mcp
browser_snapshot
```

### Search Issues

Find specific issues quickly:

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues
```

```mcp
browser_click
element: Search issues input field
ref: [Search field at top of issues list]
```

```mcp
browser_type
element: Search issues input field
ref: [Search field]
text: [SEARCH_TERMS]
submit: true
```

## One-Line Workflows

### Check Open Issues Count

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp
```

Look for the "Issues" tab number indicator.

### Check Latest Release

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/releases
```

### Check Contributors

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/graphs/contributors
```

### View Recent Activity

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/activity
```

### Check CI/CD Status

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/actions
```

## Fast Analysis Commands

### Get Repository Stats

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/pulse
```

### View Code Frequency

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/graphs/code-frequency
```

### Check Dependencies

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/network/dependencies
```

### Security Advisories

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/security/advisories
```

## Rapid Issue Triage

### All Open Issues

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues?q=is%3Aopen+is%3Aissue
```

### Unlabeled Issues

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues?q=is%3Aopen+is%3Aissue+no%3Alabel
```

### High Priority Issues

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues?q=is%3Aopen+is%3Aissue+label%3Apriority%3Ahigh
```

### Bug Reports

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues?q=is%3Aopen+is%3Aissue+label%3Abug
```

### Feature Requests

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement
```

### Documentation Issues

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues?q=is%3Aopen+is%3Aissue+label%3Adocumentation
```

## Quick Content Access

### View README

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp#readme
```

### View Package.json

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/blob/main/package.json
```

### View License

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/blob/main/LICENSE
```

### View Contributing Guidelines

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/blob/main/CONTRIBUTING.md
```

## Monitoring Commands

### Watch for New Issues

Save this as a monitoring profile:

```mcp
browser_save_profile
name: github_monitoring
description: Monitoring setup for new issues and activity
```

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues
```

### Check for New Releases

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/releases
```

### Monitor Pull Requests

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/pulls
```

## Emergency Commands

### Critical Bug Report

For urgent issues:

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues/new
```

```mcp
browser_type
element: Issue title field
ref: [Title field]
text: [CRITICAL] Urgent issue requiring immediate attention
```

### Security Issue Report

For security vulnerabilities:

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/security/advisories/new
```

## Batch Operations

### Multiple Issue Check

```mcp
browser_tab_new
url: https://github.com/darbotlabs/darbot-browser-mcp/issues
```

```mcp
browser_tab_new
url: https://github.com/darbotlabs/darbot-browser-mcp/pulls
```

```mcp
browser_tab_new
url: https://github.com/darbotlabs/darbot-browser-mcp/actions
```

Now you have three tabs open for comprehensive monitoring.

### Repository Comparison

Compare with similar repositories:

```mcp
browser_tab_new
url: https://github.com/topics/mcp-server
```

```mcp
browser_tab_new
url: https://github.com/topics/browser-automation
```

## Keyboard Shortcuts Integration

After navigation, use keyboard shortcuts for faster interaction:

### Press 'i' for Issues

```mcp
browser_press_key
key: i
```

### Press 'p' for Pull Requests

```mcp
browser_press_key
key: p
```

### Press 'w' for Wiki

```mcp
browser_press_key
key: w
```

### Press 't' for File Finder

```mcp
browser_press_key
key: t
```

### Press '/' for Search

```mcp
browser_press_key
key: /
```

## Status Extraction Scripts

### Extract Key Metrics

After navigation, take snapshots and extract:

```javascript
// From repository main page snapshot:
- Stars: [number]
- Forks: [number]
- Open Issues: [number]
- Open PRs: [number]
- Last Commit: [date]
- Main Language: [language]
```

### Health Indicators

```javascript
// Repository health signals:
- Recent activity: [active/stale]
- Issue response time: [fast/slow]
- PR merge rate: [high/low]
- Community engagement: [active/quiet]
- Documentation quality: [good/needs improvement]
```

## Integration Hooks

These quick actions can be integrated with:

- **Slack/Discord**: Send repository status updates
- **Email alerts**: Critical issue notifications
- **Dashboard systems**: Aggregate metrics
- **CI/CD pipelines**: Trigger actions based on repository state
- **Project management**: Sync issues with external tools

## Usage Patterns

### Daily Standup Check
1. Repository health check
2. New issues overview
3. PR status review
4. Action items identification

### Weekly Review
1. Contributor activity analysis
2. Issue trend analysis
3. Code quality metrics
4. Community engagement assessment

### Monthly Planning
1. Milestone progress review
2. Feature request prioritization
3. Technical debt assessment
4. Resource allocation planning
