# GitHub Issue Creator - MCP Automation Script

This script provides structured templates and automation for creating high-quality GitHub issues using the Darbot Browser MCP server.

## Overview

Automate the creation of well-structured, properly labeled GitHub issues with consistent formatting and complete information.

## Issue Creation Templates

### Template 1: Bug Report

#### 1. Navigate to New Issue

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues/new
```

#### 2. Select Bug Report Template (if available)

```mcp
browser_snapshot
```

```mcp
browser_click
element: Bug report template button
ref: [Look for "Bug report" or "Get started" button next to bug template]
```

#### 3. Fill Bug Report Details

```mcp
browser_type
element: Issue title field
ref: [Usually the first input field on the page]
text: [BUG] Brief description of the issue
```

```mcp
browser_type
element: Issue description textarea
ref: [Large textarea for issue body]
text: ## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
A clear and concise description of what actually happened.

## Environment
- OS: [e.g. Windows 11, macOS 13.0, Ubuntu 22.04]
- Browser: [e.g. Chrome 115, Firefox 116, Edge 115]
- Package Version: [e.g. @darbotlabs/darbot-browser-mcp@1.3.0]
- Node.js Version: [e.g. 23.0.0]

## Additional Context
Add any other context about the problem here, including screenshots if applicable.

## Possible Solution
If you have suggestions for how to fix the bug, include them here.
```

#### 4. Add Bug Labels

```mcp
browser_click
element: Labels gear icon
ref: [Look for gear icon next to "Labels" on the right sidebar]
```

```mcp
browser_click
element: Bug label
ref: [Look for "bug" label in the dropdown]
```

#### 5. Submit Bug Report

```mcp
browser_click
element: Submit new issue button
ref: [Green button usually labeled "Submit new issue"]
```

### Template 2: Feature Request

#### 1. Navigate and Setup

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues/new
```

```mcp
browser_snapshot
```

#### 2. Fill Feature Request

```mcp
browser_type
element: Issue title field
ref: [First input field]
text: [FEATURE] Brief description of the requested feature
```

```mcp
browser_type
element: Issue description textarea
ref: [Large textarea for issue body]
text: ## Feature Description
A clear and concise description of the feature you'd like to see added.

## Problem Statement
Describe the problem this feature would solve. What use case or workflow would benefit?

## Proposed Solution
Describe the solution you'd like to see implemented.

## Alternative Solutions
Describe any alternative solutions or features you've considered.

## Use Cases
Provide specific examples of how this feature would be used:
1. **Use Case 1**: [Description]
2. **Use Case 2**: [Description]

## Implementation Considerations
- API changes needed: [Yes/No - describe]
- Breaking changes: [Yes/No - describe]
- Documentation updates: [What needs to be updated]

## Priority
- [ ] Low - Nice to have
- [ ] Medium - Would improve workflow
- [ ] High - Critical for project success

```

#### 3. Add Enhancement Labels

```mcp
browser_click
element: Labels gear icon
ref: [Gear icon next to "Labels"]
```

```mcp
browser_click
element: Enhancement label
ref: [Look for "enhancement" or "feature" label]
```

### Template 3: Documentation Issue

#### 1. Create Documentation Issue

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues/new
```

```mcp
browser_type
element: Issue title field
ref: [First input field]
text: [DOCS] Documentation improvement needed
```

```mcp
browser_type
element: Issue description textarea
ref: [Large textarea]
text: ## Documentation Issue
Describe what documentation is missing, unclear, or incorrect.

## Location
- **File/Section**: [e.g., README.md, API docs, specific function documentation]
- **URL**: [If applicable, link to the documentation]

## Current State
Describe what the current documentation says (or doesn't say).

## Proposed Improvement
Describe what the documentation should say or include.

## Audience
Who would benefit from this documentation improvement?
- [ ] New users/beginners
- [ ] Advanced users
- [ ] Contributors/developers
- [ ] API consumers

## Type of Documentation
- [ ] Missing documentation
- [ ] Incorrect information
- [ ] Unclear explanation
- [ ] Missing examples
- [ ] Outdated information

## Specific Suggestions
Provide specific text, examples, or structure suggestions if you have them.

## Related Issues
Link to any related issues or discussions.
```

#### 2. Add Documentation Labels

```mcp
browser_click
element: Labels gear icon
ref: [Gear icon next to "Labels"]
```

```mcp
browser_click
element: Documentation label
ref: [Look for "documentation" label]
```

## Advanced Issue Creation Workflows

### Workflow 1: Batch Issue Creation

For creating multiple related issues:

```mcp
browser_save_profile
name: github_issue_session
description: Saved session for creating multiple issues
```

Create first issue, then:

```mcp
browser_tab_new
url: https://github.com/darbotlabs/darbot-browser-mcp/issues/new
```

Repeat the process for additional issues.

### Workflow 2: Issue with Assignees

```mcp
browser_click
element: Assignees gear icon
ref: [Gear icon next to "Assignees"]
```

```mcp
browser_type
element: Assignee search field
ref: [Search field in assignees dropdown]
text: username
```

```mcp
browser_click
element: User from search results
ref: [User entry in search results]
```

### Workflow 3: Issue with Milestone

```mcp
browser_click
element: Milestone gear icon
ref: [Gear icon next to "Milestone"]
```

```mcp
browser_click
element: Specific milestone
ref: [Milestone name in dropdown]
```

## Quality Assurance Checklist

Before submitting any issue, verify:

### Title Requirements
- [ ] Descriptive and concise
- [ ] Includes issue type prefix ([BUG], [FEATURE], [DOCS])
- [ ] No vague terms like "doesn't work" or "broken"

### Description Requirements
- [ ] Clear problem statement
- [ ] Steps to reproduce (for bugs)
- [ ] Expected vs actual behavior (for bugs)
- [ ] Use case description (for features)
- [ ] Environment information (when relevant)

### Labels and Metadata
- [ ] Appropriate labels selected
- [ ] Assignee set (if known)
- [ ] Milestone assigned (if applicable)
- [ ] Priority indicated

### Content Quality
- [ ] No duplicate issues exist
- [ ] Sufficient detail for others to understand
- [ ] Professional and respectful tone
- [ ] Proper markdown formatting used

## Automation Commands for Issue Management

### Check for Duplicates Before Creating

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/issues?q=is%3Aissue+[SEARCH_TERMS]
```

```mcp
browser_snapshot
```

### Create Issue from Template File

If you have a prepared template in a file:

```mcp
browser_file_upload
paths: ["path/to/issue_template.md"]
```

Then copy content to issue description.

### Link Related Issues

When creating related issues, reference them:

```mcp
browser_type
element: Issue description textarea
ref: [Description field]
text: Related to #123, depends on #456, blocks #789
```

## Post-Creation Actions

### 1. Verify Issue Creation

```mcp
browser_snapshot
```

Confirm the issue was created successfully and has correct:
- Title
- Labels
- Assignees
- Milestone
- Description formatting

### 2. Share Issue (Optional)

Copy the issue URL for sharing:

```mcp
browser_take_screenshot
filename: new_issue_created.png
```

### 3. Update Project Boards (If Used)

If the repository uses project boards:

```mcp
browser_navigate
url: https://github.com/darbotlabs/darbot-browser-mcp/projects
```

Add the issue to appropriate project board columns.

## Integration with Development Workflow

Created issues can be referenced in:
- Commit messages: `git commit -m "Fix issue #123: Description"`
- Pull requests: `Closes #123` in PR description
- Code comments: `// TODO: Address issue #123`
- Documentation: `See issue #123 for details`

This creates a complete traceability chain from issue creation to resolution.
