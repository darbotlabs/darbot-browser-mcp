# VS Code MCP Server Extension Development Guide

A comprehensive guide for building MCP (Model Context Protocol) compliant servers with VS Code extensions, including toast notifications, status bar integration, and GitHub Copilot agent mode support.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Extension Structure](#extension-structure)
- [MCP Server Configuration](#mcp-server-configuration)
- [Toast Notifications Best Practices](#toast-notifications-best-practices)
- [Status Bar Integration](#status-bar-integration)
- [Testing Your Extension](#testing-your-extension)
- [Darbot Browser MCP Examples](#darbot-browser-mcp-examples)

---

## Overview

MCP (Model Context Protocol) enables AI assistants like GitHub Copilot to interact with external tools and services. A VS Code extension can provide:

1. **MCP Server Definition Provider** - Registers your MCP server with VS Code's MCP Gallery
2. **Server Lifecycle Management** - Start, stop, restart commands
3. **Status Notifications** - Toast messages and status bar indicators
4. **Configuration** - User-customizable settings

### Prerequisites

- VS Code 1.96.0+ (MCP Gallery support)
- Node.js 23+
- TypeScript 5.x
- `@vscode/test-electron` for testing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      VS Code Extension                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Commands   │  │  Status Bar │  │  Toast Notifications│  │
│  │  - start    │  │  - icon     │  │  - info/warn/error  │  │
│  │  - stop     │  │  - tooltip  │  │  - action buttons   │  │
│  │  - restart  │  │  - click    │  │  - progress         │  │
│  │  - status   │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    MCP Server Process                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  stdio/SSE transport ←→ GitHub Copilot Agent Mode       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Extension Structure

### Recommended Directory Layout

```
your-mcp-extension/
├── src/
│   ├── extension.ts          # Main extension entry point
│   └── test/
│       ├── runTest.ts        # Test runner
│       └── suite/
│           ├── index.ts      # Mocha test setup
│           └── extension.test.ts
├── out/                      # Compiled JavaScript
├── package.json              # Extension manifest
├── tsconfig.json
└── README.md
```

### package.json Configuration

```json
{
  "name": "your-mcp-server",
  "displayName": "Your MCP Server",
  "version": "1.0.0",
  "publisher": "your-publisher",
  "engines": {
    "vscode": "^1.96.0"
  },
  "categories": ["AI", "Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./out/extension.js",
  "contributes": {
    "mcpServerDefinitionProviders": [
      {
        "id": "your-mcp-server",
        "label": "Your MCP Server"
      }
    ],
    "commands": [
      {
        "command": "your-mcp-server.startServer",
        "title": "Start Server",
        "category": "Your MCP"
      },
      {
        "command": "your-mcp-server.stopServer",
        "title": "Stop Server",
        "category": "Your MCP"
      },
      {
        "command": "your-mcp-server.showStatus",
        "title": "Show Status",
        "category": "Your MCP"
      }
    ],
    "configuration": {
      "title": "Your MCP Server",
      "properties": {
        "your-mcp-server.serverPath": {
          "type": "string",
          "default": "npx @your-org/your-mcp-server@latest",
          "description": "Command to start the MCP server"
        },
        "your-mcp-server.autoStart": {
          "type": "boolean",
          "default": false,
          "description": "Auto-start server on VS Code launch"
        }
      }
    }
  }
}
```

---

## MCP Server Configuration

### Registering with MCP Gallery

The `mcpServerDefinitionProviders` contribution point registers your server with VS Code's MCP Gallery:

```json
"mcpServerDefinitionProviders": [
  {
    "id": "your-mcp-server",
    "label": "Your MCP Server Display Name"
  }
]
```

### Server Process Management

```typescript
import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';

let serverProcess: ChildProcess | null = null;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Your MCP Server');
  
  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('your-mcp-server.startServer', startServer),
    vscode.commands.registerCommand('your-mcp-server.stopServer', stopServer),
    vscode.commands.registerCommand('your-mcp-server.showStatus', showStatus),
  );
}

async function startServer() {
  if (serverProcess) {
    vscode.window.showInformationMessage('Server is already running');
    return;
  }

  const config = vscode.workspace.getConfiguration('your-mcp-server');
  const serverPath = config.get<string>('serverPath', 'npx @your-org/your-mcp-server');
  
  // Parse command and args
  const parts = serverPath.split(' ');
  const command = parts[0];
  const args = parts.slice(1);

  serverProcess = spawn(command, args, {
    shell: true,
    env: { ...process.env }
  });

  serverProcess.stdout?.on('data', (data) => {
    outputChannel.appendLine(data.toString());
  });

  serverProcess.stderr?.on('data', (data) => {
    outputChannel.appendLine(`[stderr] ${data.toString()}`);
  });

  serverProcess.on('close', (code) => {
    serverProcess = null;
    outputChannel.appendLine(`Server exited with code ${code}`);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}
```

---

## Toast Notifications Best Practices

### Notification Types

| Type | Use Case | Method |
|------|----------|--------|
| Information | Status updates, success messages | `showInformationMessage` |
| Warning | Non-critical issues, deprecations | `showWarningMessage` |
| Error | Failures, critical issues | `showErrorMessage` |

### Clean Multi-Line Format

**Best Practice:** Use newline-separated key-value pairs for readability.

```typescript
function showStatus() {
  const isRunning = serverProcess !== null;
  const status = isRunning ? 'Running' : 'Stopped';
  const config = vscode.workspace.getConfiguration('your-mcp-server');
  
  // Build clean, multi-line status message
  const statusMessage = [
    `Server Status: ${status}`,
    config.get('serverPath'),
    `Setting 1: ${config.get('setting1')}`,
    `Setting 2: ${config.get('setting2')}`,
  ].join('\n');

  vscode.window.showInformationMessage(
    statusMessage,
    ...(isRunning ? ['Stop Server', 'Restart'] : ['Start Server'])
  ).then(handleSelection);
}
```

### Action Buttons

Provide contextual actions based on state:

```typescript
function showStatus() {
  const isRunning = serverProcess !== null;
  
  // Different actions based on server state
  const actions = isRunning 
    ? ['Stop Server', 'Restart Server'] 
    : ['Start Server'];

  vscode.window.showInformationMessage(
    `Server Status: ${isRunning ? 'Running' : 'Stopped'}`,
    ...actions
  ).then(selection => {
    switch (selection) {
      case 'Start Server':
        startServer();
        break;
      case 'Stop Server':
        stopServer();
        break;
      case 'Restart Server':
        restartServer();
        break;
    }
  });
}
```

### Progress Notifications

For long-running operations:

```typescript
async function startServerWithProgress() {
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Starting MCP Server...',
    cancellable: true
  }, async (progress, token) => {
    token.onCancellationRequested(() => {
      stopServer();
    });

    progress.report({ increment: 0, message: 'Initializing...' });
    await startServer();
    progress.report({ increment: 50, message: 'Connecting...' });
    await waitForServerReady();
    progress.report({ increment: 100, message: 'Ready!' });
  });
}
```

---

## Status Bar Integration

### Creating a Status Bar Item

```typescript
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = 'your-mcp-server.showStatus';
  statusBarItem.tooltip = 'Click to show MCP server status';
  statusBarItem.show();
  
  context.subscriptions.push(statusBarItem);
  
  updateStatusBarItem(false);
}

function updateStatusBarItem(isRunning: boolean) {
  if (statusBarItem) {
    // Use VS Code icons: $(icon-name)
    statusBarItem.text = isRunning 
      ? '$(check) MCP: Running' 
      : '$(circle-slash) MCP: Stopped';
    
    // Highlight when running
    statusBarItem.backgroundColor = isRunning
      ? new vscode.ThemeColor('statusBarItem.prominentBackground')
      : undefined;
  }
}
```

### Available Icons

Common icons for MCP servers:
- `$(browser)` - Browser/web
- `$(server)` - Server
- `$(check)` - Success/running
- `$(circle-slash)` - Stopped
- `$(sync~spin)` - Loading/syncing
- `$(warning)` - Warning
- `$(error)` - Error

---

## Testing Your Extension

### Test File Structure

```typescript
// src/test/suite/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  test('Extension should be present', () => {
    const extension = vscode.extensions.getExtension('publisher.extension-name');
    assert.ok(extension, 'Extension should be installed');
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('your-mcp-server.startServer'));
    assert.ok(commands.includes('your-mcp-server.stopServer'));
    assert.ok(commands.includes('your-mcp-server.showStatus'));
  });

  test('Configuration defaults should be set', () => {
    const config = vscode.workspace.getConfiguration('your-mcp-server');
    assert.strictEqual(config.get('autoStart'), false);
  });
});

suite('Status Notification Tests', () => {
  test('Status message format should be correct', () => {
    const status = 'Stopped';
    const serverPath = 'npx @your-org/your-mcp-server';
    const setting1 = 'value1';
    
    const message = [
      `Server Status: ${status}`,
      serverPath,
      `Setting 1: ${setting1}`,
    ].join('\n');

    const lines = message.split('\n');
    assert.strictEqual(lines.length, 3);
    assert.ok(lines[0].includes('Stopped'));
  });

  test('Actions should match server state', () => {
    // When stopped
    let isRunning = false;
    let actions = isRunning ? ['Stop', 'Restart'] : ['Start'];
    assert.deepStrictEqual(actions, ['Start']);

    // When running
    isRunning = true;
    actions = isRunning ? ['Stop', 'Restart'] : ['Start'];
    assert.deepStrictEqual(actions, ['Stop', 'Restart']);
  });
});
```

### Running Tests

```bash
# Compile
npm run compile

# Run tests (downloads VS Code and runs in extension host)
npm test
```

---

## Darbot Browser MCP Examples

### Status Notification Implementation

From `vscode-extension/src/extension.ts`:

```typescript
function showStatus() {
  const isRunning = mcpServerProcess !== null;
  const status = isRunning ? 'Running' : 'Stopped';
  const config = vscode.workspace.getConfiguration('darbot-browser-mcp');
  const serverPath = config.get('serverPath', 'npx @darbotlabs/darbot-browser-mcp@latest');
  const browser = config.get('browser', 'msedge');
  const headless = config.get('headless', false);
  const noSandbox = config.get('noSandbox', true);

  // Clean, multi-line status message
  const statusMessage = [
    `Darbot Browser Status: ${status}`,
    serverPath,
    `Browser: ${browser}`,
    `Headless: ${headless}`,
    `No Sandbox: ${noSandbox}`,
  ].join('\n');

  vscode.window.showInformationMessage(
    statusMessage,
    ...(isRunning ? ['Stop Server', 'Restart Server'] : ['Start Server']),
  ).then(selection => {
    if (selection === 'Start Server')
      void startServer();
    else if (selection === 'Stop Server')
      stopServer();
    else if (selection === 'Restart Server')
      void restartServer();
  });
}
```

**Output:**
```
Darbot Browser Status: Stopped
@darbotlabs/darbot-browser-mcp@latest
Browser: msedge
Headless: false
No Sandbox: true

[Start Server]
```

### Configuration Options

```json
{
  "darbot-browser-mcp.serverPath": {
    "type": "string",
    "default": "npx @darbotlabs/darbot-browser-mcp@latest",
    "description": "Command to start the Browser MCP server"
  },
  "darbot-browser-mcp.browser": {
    "type": "string",
    "default": "msedge",
    "enum": ["msedge", "chrome", "firefox", "webkit"],
    "description": "Browser to use for automation"
  },
  "darbot-browser-mcp.headless": {
    "type": "boolean",
    "default": false,
    "description": "Run browser in headless mode"
  },
  "darbot-browser-mcp.noSandbox": {
    "type": "boolean",
    "default": true,
    "description": "Disable sandbox for browser processes"
  }
}
```

### Test Examples

From `vscode-extension/src/test/suite/extension.test.ts`:

```typescript
suite('Status Notification Test Suite', () => {
  test('Status message format should be correct', () => {
    const status = 'Stopped';
    const serverPath = 'npx @darbotlabs/darbot-browser-mcp@latest';
    const browser = 'msedge';
    const headless = false;
    const noSandbox = true;

    const statusMessage = [
      `Darbot Browser Status: ${status}`,
      serverPath,
      `Browser: ${browser}`,
      `Headless: ${headless}`,
      `No Sandbox: ${noSandbox}`,
    ].join('\n');

    const expectedLines = [
      'Darbot Browser Status: Stopped',
      'npx @darbotlabs/darbot-browser-mcp@latest',
      'Browser: msedge',
      'Headless: false',
      'No Sandbox: true',
    ];

    const actualLines = statusMessage.split('\n');
    assert.strictEqual(actualLines.length, 5, 'Should have 5 lines');
    
    for (let i = 0; i < expectedLines.length; i++) {
      assert.strictEqual(actualLines[i], expectedLines[i]);
    }
  });
});
```

---

## Additional Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [MCP Specification](https://modelcontextprotocol.io/)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Darbot Browser MCP Repository](https://github.com/darbotlabs/darbot-browser-mcp)

---

## Checklist for MCP Extension Development

- [ ] `mcpServerDefinitionProviders` registered in package.json
- [ ] Start/Stop/Status commands implemented
- [ ] Status bar item with click-to-show-status
- [ ] Clean multi-line toast notifications
- [ ] Contextual action buttons based on state
- [ ] Output channel for server logs
- [ ] Configuration settings with defaults
- [ ] Unit tests for notification format
- [ ] Integration tests for commands
- [ ] README with installation instructions

---

*Last updated: January 2026*
*Based on Darbot Browser MCP v1.3.0*
