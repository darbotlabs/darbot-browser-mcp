# Autonomous Browser Features

This document outlines the new autonomous browser capabilities added to Darbot Browser MCP, implementing the vision for intelligent, memory-driven web crawling.

## 🧠 Memory System

The memory system tracks visited pages, stores screenshots, and maintains state for intelligent crawling decisions.

### Features
- **State Deduplication**: Uses SHA-256 hashes of DOM snapshots to avoid revisiting identical pages
- **Screenshot Storage**: Automatically captures and organizes screenshots by state hash
- **Link Extraction**: Maintains discovered links for BFS traversal
- **Configurable Storage**: Local files (default) or darbot-memory-mcp connector (future)

### Usage
```typescript
// Configure memory for new crawling sessions
browser_configure_memory({
  enabled: true,
  connector: "local",
  maxStates: 1000
})
```

## 🗺️ BFS Planner

Intelligent breadth-first search planner for autonomous site exploration.

### Features
- **BFS Strategy**: Systematic exploration by depth level
- **Priority Scoring**: Intelligent ranking of URLs and clickable elements
- **Domain Filtering**: Configurable allowed/blocked domains
- **Loop Detection**: Prevents infinite navigation cycles

### Key Algorithms
- URL prioritization based on content indicators
- Clickable element scoring for meaningful interactions
- Depth-limited exploration with configurable bounds

## 🛡️ Guardrail System

Safety mechanisms to prevent harmful or destructive autonomous actions.

### Safety Features
- **Rate Limiting**: Configurable requests per second with burst capacity
- **Domain Filtering**: Whitelist/blacklist for allowed domains  
- **Pattern Blocking**: Regex patterns to avoid dangerous URLs
- **Action Validation**: Prevents destructive clicks and sensitive data input
- **Loop Prevention**: Detects and stops infinite navigation patterns

### Default Protections
- Blocks login/register/admin pages
- Prevents social media and email domains
- Avoids downloadable files and malware patterns
- Rate limits to 2 requests/second with burst of 5

## 📊 Report Generation

Comprehensive HTML reports with crawl statistics and screenshots.

### Report Contents
- **Session Summary**: Duration, pages visited, errors
- **Site Graph**: Visual representation of discovered links
- **Screenshot Gallery**: Organized screenshots with metadata
- **Statistics Dashboard**: Crawl depth, domains, success metrics

### Generated Files
```
.darbot/reports/{sessionId}/
├── report.html          # Main report
├── report.json          # Raw data
└── screenshots/         # Screenshot gallery
    ├── {stateHash1}.png
    └── {stateHash2}.png
```

## 🎮 Orchestrator

Main coordination system that manages the autonomous crawling session.

### Components Integration
- **Memory**: State tracking and deduplication
- **Planner**: Intelligent action selection (BFS)
- **Guardrails**: Safety validation for all actions
- **Reporter**: Progress tracking and final report

### Workflow
1. Initialize with start URL and configuration
2. Navigate to start URL, capture state
3. Extract links and clickable elements
4. Plan next action using BFS strategy
5. Validate action with guardrail system
6. Execute action and update state
7. Repeat until completion criteria met
8. Generate final report

## 🔧 MCP Tools

New tools available through the MCP interface:

### `browser_start_autonomous_crawl`
Start an autonomous crawling session with full configuration options.

**Parameters:**
- `startUrl`: Starting URL for crawling
- `goal`: Optional goal description
- `maxDepth`: Maximum crawl depth (1-10)
- `maxPages`: Maximum pages to visit (1-100)  
- `timeoutMs`: Session timeout in milliseconds
- `allowedDomains`: Optional domain restrictions
- `generateReport`: Enable HTML report generation
- `takeScreenshots`: Enable screenshot capture
- `memoryEnabled`: Enable memory system
- `verbose`: Enable verbose logging

### `browser_configure_memory`
Configure the memory system for crawling sessions.

**Parameters:**
- `enabled`: Enable/disable memory system
- `connector`: Storage backend ('local' or 'darbot-memory-mcp')
- `storagePath`: Custom storage path for local connector
- `maxStates`: Maximum states to store (10-10000)
- `endpoint`: Darbot Memory MCP endpoint URL

## 🚀 Integration Points

### Darbot Memory MCP Connector

The system is designed to integrate with `darbot-memory-mcp` for enhanced memory capabilities. Currently using local storage as fallback.

**Required darbot-memory-mcp features:**
- State persistence API for storing crawl states
- Query interface for BFS traversal planning
- Bulk state operations for efficient crawling
- State deduplication across sessions
- Cross-session memory sharing

### VS Code Integration

The autonomous features integrate with the existing VS Code extension:

1. Install the Darbot Browser MCP extension
2. Use Command Palette: "Darbot Browser MCP: Start Server"
3. Access autonomous tools through GitHub Copilot chat
4. Monitor progress and view reports

## 📝 Example Usage

```javascript
// Start autonomous crawling of a news site
await browser_start_autonomous_crawl({
  startUrl: "https://example-news.com",
  goal: "Discover and catalog news articles",
  maxDepth: 3,
  maxPages: 25,
  allowedDomains: ["example-news.com"],
  generateReport: true,
  takeScreenshots: true,
  memoryEnabled: true
});

// Configure memory for cross-session persistence
await browser_configure_memory({
  enabled: true,
  connector: "local",
  maxStates: 500,
  storagePath: "./crawl-memory"
});
```

## ⚠️ Current Limitations

- **Demo Mode**: Full autonomous crawling is currently configured for demo/testing to prevent uncontrolled browsing
- **darbot-memory-mcp**: Integration planned but not yet implemented
- **Concurrent Sessions**: Currently single-session support
- **JavaScript Rendering**: Limited to static content analysis

## 🔮 Future Enhancements

- Integration with darbot-memory-mcp for distributed memory
- Advanced ML-based content classification
- Multi-session coordination and sharing
- JavaScript-heavy site support
- Custom extraction rules and templates
- Integration with external APIs for content analysis