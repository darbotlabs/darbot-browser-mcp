# GitHub Copilot Instructions for Darbot Browser MCP

You are an expert developer working on **Darbot Browser MCP**, an autonomous browser automation server using the Model Context Protocol (MCP). This TypeScript project provides AI-driven web automation tools and integrates with VS Code, Microsoft Copilot Studio, and other AI platforms.

## Project Overview

**Darbot Browser MCP** is a sophisticated browser automation system that:
- Provides 31+ autonomous browser tools via MCP protocol
- Uses accessibility snapshots instead of pixel-based approaches for AI-friendly operation
- Supports work profile management for session persistence
- Integrates with Microsoft Edge, Chrome, Firefox, and WebKit
- Offers enterprise features including Azure deployment, authentication, and monitoring
- Available as NPM package, VS Code extension, NuGet package, and browser extension

## Code Architecture

### Core Structure
- **`src/`** - Main source code directory
  - **`browserServer.ts`** - Main MCP server implementation
  - **`browserContextFactory.ts`** - Browser context management and profiles
  - **`tab.ts`** - Browser tab abstraction and management
  - **`tools/`** - Individual MCP tools (navigation, interaction, capture, etc.)
  - **`auth/`** - Authentication modules (Entra ID, OAuth)
  - **`transport.ts`** - MCP transport implementations (stdio, HTTP, SSE)

### Key Technologies
- **TypeScript** - Primary language, strictly typed
- **Playwright** - Browser automation engine (version 1.55.0-alpha)
- **MCP SDK** - Model Context Protocol implementation
- **Zod** - Runtime type validation and schema definition
- **Commander.js** - CLI argument parsing

## Development Guidelines

### Code Style & Patterns
1. **TypeScript First**: Use strict typing, avoid `any`, prefer type guards
2. **MCP Tool Pattern**: Each tool in `src/tools/` follows standardized structure:
   ```typescript
   import { z } from 'zod';
   import { Tool } from '@modelcontextprotocol/sdk/types.js';
   
   const ToolNameSchema = z.object({
     // Zod schema for parameters
   });
   
   export const toolNameTool: Tool = {
     name: 'tool_name',
     description: 'Clear, actionable description',
     inputSchema: zodToJsonSchema(ToolNameSchema)
   };
   
   export async function handleToolName(tab: DarbotTab, args: z.infer<typeof ToolNameSchema>) {
     // Implementation
   }
   ```

3. **Error Handling**: Use proper error types, provide helpful error messages
4. **Async/Await**: Prefer async/await over Promises, handle timeouts appropriately
5. **Logging**: Use debug module for development logging (`import debug from 'debug'`)

### Browser Automation Best Practices
1. **Accessibility-First**: Use `page.locator()` with accessibility selectors, avoid CSS selectors
2. **Wait Strategies**: Always use proper waiting (`page.waitForSelector`, `page.waitForLoadState`)
3. **Error Recovery**: Implement retry logic for flaky browser operations
4. **Resource Management**: Properly close contexts and pages to avoid memory leaks
5. **Cross-Browser**: Test with multiple browser engines (Chromium, Firefox, WebKit)

### Testing Guidelines
1. **Playwright Tests**: Located in `tests/` directory
2. **Test Configuration**: Use `playwright.config.ts` for test settings
3. **Browser Testing**: Prefer Microsoft Edge (`msedge`) for primary testing
4. **Mock External Services**: Mock external APIs and services in tests
5. **Test Data**: Use realistic test data, avoid hardcoded values

## Common Tasks & Solutions

### Adding New MCP Tools
1. Create new file in `src/tools/` following the established pattern
2. Define Zod schema for input validation
3. Implement handler function with proper error handling
4. Export tool definition and handler
5. Register in `src/tools/index.ts`
6. Add comprehensive JSDoc documentation
7. Update README.md tool list

### Browser Context Management
- Use `BrowserContextFactory` for context creation
- Implement proper profile saving/loading in `src/tools/profiles.ts`
- Handle browser launch arguments based on platform
- Manage user data directories for session persistence

### Authentication Integration
- Entra ID auth in `src/auth/entraAuth.ts`
- OAuth flows for enterprise integration
- API key validation for programmatic access
- Rate limiting and audit logging

### Azure & Enterprise Features
- Azure deployment templates in `azure/` directory
- Environment variable configuration
- Health check endpoints
- Application Insights integration
- Key Vault secret management

## File Patterns & Conventions

### File Naming
- **kebab-case** for files: `browser-context-factory.ts`
- **PascalCase** for classes: `BrowserContextFactory`
- **camelCase** for functions and variables
- **SCREAMING_SNAKE_CASE** for constants

### Import Organization
```typescript
// 1. Node.js built-ins
import fs from 'node:fs';
import path from 'node:path';

// 2. External dependencies
import { z } from 'zod';
import playwright from 'playwright';

// 3. MCP SDK imports
import { Tool } from '@modelcontextprotocol/sdk/types.js';

// 4. Internal imports (relative)
import { DarbotTab } from '../tab.js';
import { zodToJsonSchema } from '../utils.js';
```

### TypeScript Configuration
- Use strict type checking enabled in `tsconfig.json`
- Target ES2022 for modern JavaScript features
- Use import maps for clean import paths
- Enable source maps for debugging

## Common Issues & Solutions

### Browser Launch Issues
- **Linux sandbox**: Use `--no-sandbox` flag in CI/container environments
- **Headless mode**: Default to headless, allow override via environment variables
- **Display issues**: Set `DISPLAY` environment variable in X11 environments

### Memory Management
- Always close browser contexts when done
- Implement timeouts for long-running operations
- Use connection pooling for multiple concurrent sessions
- Monitor memory usage in production deployments

### Cross-Platform Compatibility
- Handle file paths with `node:path` module
- Use platform-specific browser executable paths
- Account for Windows/Linux/macOS differences in profile directories
- Test on multiple operating systems

## Integration Points

### VS Code Extension
- Located in `vscode-extension/` directory
- Auto-configures MCP settings in VS Code
- Registers as MCP server definition provider
- Enables GitHub Copilot agent mode integration

### Microsoft Copilot Studio
- Enterprise deployment via Azure App Service
- OAuth 2.0 authentication flow
- Custom Power Platform connector
- Rate limiting and session management

### Package Distribution
- **NPM**: `@darbotlabs/darbot-browser-mcp`
- **NuGet**: `DarbotLabs.Browser.MCP`
- **VS Code**: `darbotlabs.darbot-browser-mcp`
- **Docker**: Container images for cloud deployment

## Security Considerations

1. **Input Validation**: All MCP tool inputs validated via Zod schemas
2. **Authentication**: Support for Entra ID, API keys, OAuth flows
3. **Rate Limiting**: Configurable rate limits per session/user
4. **Audit Logging**: Comprehensive logging for enterprise compliance
5. **Sandboxing**: Browser processes run in secure sandboxes
6. **HTTPS Only**: All production deployments use HTTPS
7. **Secret Management**: Azure Key Vault integration for sensitive data

## Performance Optimization

1. **Connection Pooling**: Reuse browser contexts where possible
2. **Lazy Loading**: Load browser engines on-demand
3. **Resource Cleanup**: Implement proper disposal patterns
4. **Caching**: Cache accessibility snapshots and page data
5. **Concurrent Sessions**: Support multiple parallel browser sessions
6. **Memory Monitoring**: Track and limit memory usage per session

When working on this project, prioritize code quality, browser compatibility, security, and maintainability. Always test changes across different browsers and platforms. Follow the established patterns and maintain consistency with the existing codebase.