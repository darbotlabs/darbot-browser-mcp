# Darbot Browser MCP - VS Code Extension

This VS Code extension provides integration with the Darbot Browser MCP server, allowing you to manage the browser automation server directly from VS Code.

## Features

- Start/Stop Browser MCP server from VS Code
- Status bar indicator showing server status
- Configurable server path and settings
- Auto-start option

## Installation

1. Install the extension from the VS Code marketplace
2. Configure the server path in settings (defaults to `npx @darbotlabs/darbot-browser-mcp@latest`)
3. Use the command palette or status bar to start/stop the server

## Configuration

- `darbot-browser-mcp.serverPath`: Path or command to start the Browser MCP server
- `darbot-browser-mcp.autoStart`: Automatically start the server when VS Code starts
- `darbot-browser-mcp.logLevel`: Log level for the server (error, warn, info, debug)

## Commands

- `Darbot Browser MCP: Start Server`: Start the Browser MCP server
- `Darbot Browser MCP: Stop Server`: Stop the Browser MCP server
- `Darbot Browser MCP: Show Status`: Show server status and controls