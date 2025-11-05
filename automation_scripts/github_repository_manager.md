# GitHub Repository Manager - MCP Automation Script

This script provides comprehensive GitHub repository management capabilities using the Darbot Browser MCP server. It includes functions for navigating to repositories, analyzing issues, and creating new issues.

## Prerequisites

- Darbot Browser MCP server running
- GitHub account (for creating issues)
- Internet connection

## Commands

### 1. Launch Browser and Navigate to Repository

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp
```

### 2. Take Initial Repository Snapshot

```mcp
browser_snapshot
```

### 3. Navigate to Issues Section

```mcp
browser_click
element: Issues tab in repository navigation
ref: [Will be provided by snapshot - look for "Issues" tab]
```

### 4. Analyze Existing Issues

```mcp
browser_snapshot
```

After taking the snapshot, analyze the issues list to:
- Count total number of open issues
- Identify issue categories (bugs, features, documentation, etc.)
- Check for duplicate issues
- Assess issue priority and status

### 5. Create New Issue (if needed)

#### 5.1 Click New Issue Button

```mcp
browser_click
element: New issue button
ref: [Will be provided by snapshot - typically green "New issue" button]
```

#### 5.2 Fill Issue Template

```mcp
browser_type
element: Issue title field
ref: [Will be provided by snapshot]
text: [Issue Title Here]
```

```mcp
browser_type
element: Issue description textarea
ref: [Will be provided by snapshot]
text: [Detailed issue description with steps to reproduce, expected behavior, etc.]
```

#### 5.3 Add Labels (Optional)

```mcp
browser_click
element: Labels dropdown
ref: [Will be provided by snapshot]
```

```mcp
browser_click
element: Specific label (e.g., bug, enhancement, documentation)
ref: [Will be provided by snapshot]
```

#### 5.4 Submit Issue

```mcp
browser_click
element: Submit new issue button
ref: [Will be provided by snapshot - typically green "Submit new issue" button]
```

## Usage Example

This script can be used to:

1. **Repository Analysis**: Quickly assess the current state of issues
2. **Issue Management**: Create well-structured issues with proper labels
3. **Quality Assurance**: Check for duplicate issues before creating new ones
4. **Project Planning**: Understand issue distribution and priorities

## Script Execution Flow

1. Launch browser and navigate to repository
2. Take snapshot to understand page structure
3. Navigate to issues section
4. Analyze existing issues (count, categories, duplicates)
5. If new issue needed:
   - Click "New issue"
   - Fill in title and description
   - Add appropriate labels
   - Submit issue
6. Take final snapshot to confirm creation

## Best Practices

- Always take snapshots before attempting to interact with elements
- Use descriptive element descriptions for better MCP understanding
- Check for existing similar issues before creating new ones
- Use proper issue templates and labels for better organization
- Include clear reproduction steps for bug reports

## Error Handling

If any step fails:
1. Take a new snapshot to reassess page state
2. Look for error messages or changes in page structure
3. Retry with updated element references
4. Consider alternative navigation paths (e.g., using keyboard shortcuts)

## Extensions

This script can be extended to:
- **Pull Request Management**: Create and review PRs
- **Release Management**: Create releases and tags
- **Wiki Management**: Update repository documentation
- **Settings Management**: Configure repository settings
- **Collaboration**: Manage collaborators and permissions
