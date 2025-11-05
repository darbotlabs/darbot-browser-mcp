# GitHub Issue Analyzer - MCP Automation Script

This script provides advanced issue analysis capabilities for GitHub repositories using the Darbot Browser MCP server.

## Overview

Automatically analyze GitHub repository issues to provide insights on:
- Issue distribution and patterns
- Common problem areas
- Issue lifecycle and resolution times
- Label usage and categorization

## Quick Start Commands

### 1. Initialize Browser Session

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues
```

### 2. Capture Issues Overview

```mcp
browser_snapshot
```

### 3. Filter by Open Issues

```mcp
browser_click
element: Issues filter - Open issues
ref: [Look for "Open" filter tab or button]
```

### 4. Analyze Issue List

```mcp
browser_snapshot
```

Use this snapshot to extract:
- Total count of open issues
- Issue titles and labels
- Creation dates and authors
- Comment counts and activity levels

### 5. Filter by Closed Issues

```mcp
browser_click
element: Issues filter - Closed issues
ref: [Look for "Closed" filter tab or button]
```

### 6. Capture Closed Issues Data

```mcp
browser_snapshot
```

### 7. Advanced Filtering - By Labels

#### Filter by Bug Reports

```mcp
browser_click
element: Labels filter
ref: [Look for "Labels" dropdown or filter]
```

```mcp
browser_click
element: Bug label filter
ref: [Look for "bug" label in filter options]
```

```mcp
browser_snapshot
```

#### Filter by Feature Requests

```mcp
browser_click
element: Labels filter
ref: [Look for "Labels" dropdown or filter]
```

```mcp
browser_click
element: Enhancement label filter
ref: [Look for "enhancement" or "feature" label]
```

```mcp
browser_snapshot
```

### 8. Detailed Issue Analysis

#### Open Specific Issue for Deep Analysis

```mcp
browser_click
element: First issue in list
ref: [Click on the first issue title link]
```

```mcp
browser_snapshot
```

Analyze the issue details:
- Description quality and completeness
- Reproduction steps
- User engagement (comments, reactions)
- Resolution status and timeline

## Analysis Workflows

### Workflow 1: Issue Health Check

1. **Count Distribution**:
   - Total open vs closed issues
   - Issue creation rate over time
   - Average time to resolution

2. **Quality Assessment**:
   - Issues with clear descriptions
   - Issues with reproduction steps
   - Issues with appropriate labels

3. **Engagement Analysis**:
   - Most commented issues
   - Issues with community discussion
   - Stale or abandoned issues

### Workflow 2: Problem Pattern Detection

1. **Label Analysis**:
   - Most common issue types
   - Correlation between labels and resolution time
   - Missing or incorrect labeling

2. **Content Analysis**:
   - Common keywords in issue titles
   - Recurring problem areas
   - Documentation gaps

3. **Timeline Analysis**:
   - Issue creation patterns
   - Response time patterns
   - Resolution velocity

### Workflow 3: Community Health Assessment

1. **Contributor Analysis**:
   - Most active issue reporters
   - Community engagement levels
   - New vs returning contributors

2. **Maintenance Analysis**:
   - Maintainer response times
   - Issue triage effectiveness
   - Backlog management

## Data Extraction Patterns

### From Issue List Snapshots

Extract structured data:
```
Issue: {title}
Labels: {label1, label2, ...}
Author: {username}
Created: {date}
Comments: {count}
Status: {open/closed}
```

### From Individual Issue Snapshots

Extract detailed data:
```
Title: {issue_title}
Description: {full_description}
Labels: {all_labels}
Assignees: {assigned_users}
Milestone: {milestone_name}
Comments: {comment_thread_analysis}
Reactions: {reaction_counts}
Timeline: {creation_date, last_activity, closure_date}
```

## Automation Commands for Common Tasks

### Generate Issue Summary Report

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues?q=is%3Aissue
```

```mcp
browser_snapshot
```

### Find Stale Issues (No Activity in 30+ Days)

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues?q=is%3Aissue+is%3Aopen+updated%3A%3C2024-06-16
```

```mcp
browser_snapshot
```

### Find High-Priority Issues

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues?q=is%3Aissue+is%3Aopen+label%3Apriority%3Ahigh
```

```mcp
browser_snapshot
```

### Find Documentation Issues

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues?q=is%3Aissue+label%3Adocumentation
```

```mcp
browser_snapshot
```

## Output and Reporting

After running the analysis scripts, generate reports on:

1. **Issue Statistics**:
   - Total issues: X open, Y closed
   - Average resolution time: Z days
   - Most active labels: [list]

2. **Problem Areas**:
   - Recurring issues: [patterns]
   - High-impact problems: [critical issues]
   - Documentation gaps: [missing docs]

3. **Community Health**:
   - Contributor activity: [metrics]
   - Response times: [averages]
   - Engagement levels: [participation]

4. **Recommendations**:
   - Issues needing attention
   - Process improvements
   - Documentation updates needed

## Integration with Project Management

Use the analysis results to:
- Prioritize development efforts
- Identify documentation needs
- Plan community engagement activities
- Track project health over time
- Make data-driven decisions about issue management
