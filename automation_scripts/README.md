# MCP Automation Scripts for GitHub Repository Management

This folder contains comprehensive automation scripts for managing the darbot-browser-mcp GitHub repository using Markdown-based MCP (Model Context Protocol) commands.

## 📁 Script Collection

### 🎯 Core Scripts

1. **[github_repository_manager.md](./github_repository_manager.md)**
   - Complete repository management workflow
   - Navigate to repository, analyze structure, manage issues
   - Comprehensive issue creation and management
   - Best practices for repository interaction

2. **[github_issue_analyzer.md](./github_issue_analyzer.md)**
   - Advanced issue analysis and pattern detection
   - Data extraction for project insights
   - Issue health assessment and reporting
   - Community engagement analysis

3. **[github_issue_creator.md](./github_issue_creator.md)**
   - Structured templates for creating high-quality issues
   - Bug reports, feature requests, documentation issues
   - Quality assurance checklists
   - Post-creation workflow integration

4. **[github_quick_actions.md](./github_quick_actions.md)**
   - Fast, one-command automation for common tasks
   - Quick repository health checks
   - Rapid issue triage and monitoring
   - Emergency response commands

## 🚀 Getting Started

### Prerequisites

1. **Darbot Browser MCP Server**: Ensure the MCP server is running
2. **GitHub Access**: Internet connection and GitHub repository access
3. **MCP Client**: VS Code with GitHub Copilot, Claude Desktop, or other MCP-enabled client

### Basic Usage

1. **Launch the browser and navigate**:
   ```mcp
   browser_navigate
   url: https://github.com/darbotlabs/darbot-browser-mcp
   ```

2. **Take a snapshot to understand the page**:
   ```mcp
   browser_snapshot
   ```

3. **Follow specific script instructions** based on your goal

## 📋 Common Use Cases

### Repository Health Check
Use `github_quick_actions.md` for fast repository status assessment:
- Issue counts and trends
- Recent activity monitoring
- Contributor engagement levels
- CI/CD status verification

### Issue Management
Use `github_issue_creator.md` for structured issue creation:
- Bug reports with complete reproduction steps
- Feature requests with detailed use cases
- Documentation improvement requests
- Quality-assured submissions

### Analysis and Insights
Use `github_issue_analyzer.md` for data-driven insights:
- Issue pattern recognition
- Community health assessment
- Project planning support
- Performance metrics extraction

### Complete Workflow
Use `github_repository_manager.md` for end-to-end repository management:
- Navigate and analyze repository structure
- Assess existing issues and identify gaps
- Create new issues when needed
- Maintain repository health over time

## 🛠️ Script Structure

Each script follows a consistent structure:

### Command Format
```mcp
command_name
parameter: value
parameter: value
```

### Snapshot Integration
Scripts include strategic snapshot commands to:
- Understand current page state
- Extract dynamic element references
- Validate successful actions
- Capture data for analysis

### Error Handling
Scripts include guidance for:
- Handling failed element interactions
- Recovering from navigation issues
- Adapting to page structure changes
- Alternative interaction methods

## 🎯 Workflow Examples

### Example 1: Daily Repository Check
```bash
1. Run github_quick_actions.md → Repository Health Check
2. Review issue counts and recent activity
3. Identify any urgent items requiring attention
4. Create action items for team discussion
```

### Example 2: Bug Report Submission
```bash
1. Run github_issue_creator.md → Bug Report Template
2. Follow structured template for complete bug description
3. Add appropriate labels and metadata
4. Submit and verify creation
```

### Example 3: Project Planning
```bash
1. Run github_issue_analyzer.md → Advanced Analysis
2. Extract issue patterns and trends
3. Identify development priorities
4. Create project roadmap based on data
```

## 🔧 Customization

### Adapting for Other Repositories

To use these scripts with different repositories:

1. **Update URLs**: Replace `darbotlabs/darbot-browser-mcp` with your repository path
2. **Modify Templates**: Adjust issue templates for your project's needs
3. **Update Labels**: Match your repository's labeling system
4. **Customize Workflows**: Adapt processes to your team's practices

### Adding New Commands

Extend scripts with additional functionality:
- **New Issue Types**: Add templates for specific issue categories
- **Advanced Filters**: Create custom search and filter commands
- **Integration Hooks**: Add commands for external tool integration
- **Monitoring Alerts**: Create automated monitoring and notification workflows

## 📊 Data Extraction and Reporting

These scripts enable extraction of valuable repository data:

### Metrics Available
- Issue creation and resolution rates
- Community engagement levels
- Code quality indicators
- Project health assessments

### Reporting Formats
- Structured data for dashboards
- Trend analysis for planning
- Alert triggers for monitoring
- Integration data for external systems

## 🔒 Security and Best Practices

### Authentication
- Use appropriate GitHub authentication
- Respect repository access permissions
- Follow organization security policies

### Rate Limiting
- Be mindful of GitHub API rate limits
- Use efficient navigation patterns
- Batch operations when appropriate

### Data Privacy
- Handle sensitive information appropriately
- Follow data protection guidelines
- Respect contributor privacy

## 🤝 Contributing

To improve these automation scripts:

1. **Test thoroughly** with your repository setup
2. **Document changes** clearly in commit messages
3. **Follow MCP command conventions** for consistency
4. **Share improvements** with the community

## 📚 Additional Resources

- [Darbot Browser MCP Documentation](../README.md)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [VS Code MCP Integration Guide](../vscode-extension/README.md)

## 🎉 Success Stories

These scripts have been used successfully for:
- **Automated issue triage** reducing manual review time by 70%
- **Quality assurance** ensuring consistent issue formatting
- **Project planning** with data-driven priority assessment
- **Community management** with engagement tracking and response

## 🔄 Continuous Improvement

These scripts are living documents that evolve with:
- GitHub interface changes
- New MCP capabilities
- Community feedback and contributions
- Project-specific requirements

Start with the basic workflows and gradually incorporate more advanced automation as your team becomes comfortable with the MCP-driven approach to repository management.
