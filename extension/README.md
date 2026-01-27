# Darbot Browser MCP Bridge Extension

**Version 1.3.0**

A Chrome/Edge browser extension that enables you to share browser tabs with Darbot Browser MCP server through Chrome DevTools Protocol (CDP) bridge for AI-driven browser automation.

## What This Extension Does

This extension creates a bidirectional bridge between your browser tabs and the Darbot Browser MCP server, allowing AI assistants (like GitHub Copilot, Copilot Studio, or other MCP clients) to interact with live browser sessions through the CDP relay server.

### Key Features

- **Tab Sharing**: Share any browser tab with the MCP server
- **CDP Bridge**: Forwards Chrome DevTools Protocol messages between extension and MCP server
- **WebSocket Connection**: Connects to local or remote CDP relay servers
- **Session Management**: Save bridge URL preferences, manage connections
- **Visual Status**: See connection status in browser toolbar

## How It Works

```
Browser Tab (chrome.debugger)
         ↕
Browser Extension (extension/)
         ↕
CDP Relay Server (lib/cdpRelay.js)
         ↕
Darbot Browser MCP (cli.js --extension)
```

### Architecture

1. **Extension Side** (`background.js`, `popup.js`):
   - Uses `chrome.debugger` API to attach to browser tabs
   - Captures CDP events from the tab
   - Forwards CDP messages via WebSocket

2. **Relay Server** (`lib/cdpRelay.js`):
   - Runs as WebSocket server with two endpoints:
     - `/extension` - Receives CDP messages from browser extension
     - `/cdp` - Provides CDP interface to MCP server
   - Handles protocol translation and message routing

3. **MCP Server** (`cli.js --extension`):
   - Connects to relay server's `/cdp` endpoint
   - Sends CDP commands through relay
   - Receives CDP events and responses

## Installation

### From Source (Development)

1. **Clone the repository**:

   ```bash
   git clone https://github.com/darbotlabs/darbot-browser-mcp.git
   cd darbot-browser-mcp
   ```

2. **Load extension in Chrome/Edge**:
   - Open `chrome://extensions/` or `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder

### From Chrome Web Store

**Coming Soon** - Extension will be available on Chrome Web Store

## Usage

### 1. Start the CDP Relay Server

The relay server is automatically started when you run the MCP server with `--extension` flag:

```bash
# Start MCP server with extension support
node cli.js --extension --port 9223
```

This starts:

- HTTP server on port 9223
- CDP relay WebSocket endpoints: `ws://localhost:9223/extension` (browser extension), `ws://localhost:9223/cdp` (MCP server internal)

### 2. Configure the Extension

1. Click the extension icon in your browser toolbar
2. Enter the bridge server URL (default: `ws://localhost:9223/extension`)
3. The URL is saved automatically for future use

### 3. Share a Tab

1. Navigate to the tab you want to share
2. Click the extension icon
3. Click "Share This Tab" button
4. Extension badge turns green (●) when connected
5. AI assistant can now interact with this tab through MCP server

### 4. Stop Sharing

1. Click the extension icon
2. Click "Stop Sharing" button
3. Extension badge clears when disconnected

## Extension UI

The popup interface shows:

- **Connection Status**: Whether a tab is currently shared
- **Bridge URL Input**: WebSocket server address
- **Share/Stop Button**: Toggle tab sharing
- **Tab Information**: Details of currently shared tab
- **Focus Button**: Switch to shared tab (when another tab is active)

## Configuration Options

### Bridge URL Format

```
ws://localhost:9223/extension
```

- **Protocol**: `ws://` (WebSocket) or `wss://` (secure)
- **Host**: `localhost` or remote server hostname/IP
- **Port**: CDP relay server port (default: 9223)
- **Path**: `/extension` (required)

### Storage

Extension uses Chrome's `chrome.storage.sync` to persist:

- Bridge server URL preference

## Development

### File Structure

```
extension/
├── manifest.json        # Extension manifest (Manifest V3)
├── background.js        # Service worker, CDP message handling
├── popup.html          # Extension popup UI
├── popup.js            # Popup controller and interaction
├── icons/              # Extension icons (16, 32, 48, 128)
└── README.md           # This file
```

### Key Components

**`background.js`** - Service Worker:

- Manages `chrome.debugger` attachment/detachment
- Handles WebSocket connection to relay server
- Forwards CDP events between debugger and relay
- Maintains connection state

**`popup.js`** - UI Controller:

- Manages extension popup interface
- Handles user interactions (connect/disconnect)
- Displays connection status and tab information
- Saves/loads bridge URL preference

**`manifest.json`** - Extension Configuration:

- Permissions: `debugger`, `activeTab`, `tabs`, `storage`
- Manifest V3 compliant
- Service worker background script

### Building

No build step required - the extension uses vanilla JavaScript.

### Testing

1. Load extension in developer mode
2. Start MCP server: `node cli.js --extension --port 9223`
3. Open a test page in a new tab
4. Click extension icon and "Share This Tab"
5. Verify connection in extension and server logs

### Debugging

Enable debug logging:

```bash
# In Node.js (relay server)
DEBUG=pw:mcp:relay node cli.js --extension --port 9223
```

Check extension logs:

- Open `chrome://extensions/`
- Find "Browser MCP Bridge"
- Click "service worker" to view console logs

## Security Considerations

### Permissions

- **`debugger`**: Required to attach Chrome DevTools Protocol to tabs
- **`activeTab`**: Access current tab information
- **`tabs`**: Manage tab state and metadata
- **`storage`**: Save user preferences
- **`<all_urls>`**: Connect to any WebSocket bridge server

### Privacy

- Extension only communicates with user-specified bridge URL
- No data is sent to external servers by default
- CDP access limited to explicitly shared tabs
- Connection info stored locally via `chrome.storage.sync`

### Best Practices

1. **Use localhost**: For development, connect to `ws://localhost:9223/extension`
2. **Secure connections**: Use `wss://` for remote/production servers
3. **Verify URLs**: Ensure bridge URL points to trusted server
4. **One tab at a time**: Extension supports sharing one tab per session

## Troubleshooting

### Extension Not Connecting

**Problem**: Can't connect to bridge server

**Solutions**:

1. Verify MCP server is running with `--extension --port 9223`
2. Check bridge URL format: `ws://localhost:9223/extension`
3. Ensure no firewall blocking WebSocket connections
4. Check browser console for error messages

### Debugger Detached

**Problem**: "Debugger detached" notification appears

**Solutions**:

1. Extension automatically handles debugger detachment
2. Click "Share This Tab" again to reconnect
3. Check if another extension is using debugger
4. Restart browser if issue persists

### Badge Not Updating

**Problem**: Extension badge doesn't show connection status

**Solutions**:

1. Refresh the tab you're trying to share
2. Reload the extension from `chrome://extensions/`
3. Check extension console logs for errors

### WebSocket Connection Failed

**Problem**: "Connection timeout" or "WebSocket error"

**Solutions**:

1. Verify relay server is running: `netstat -an | findstr 9223`
2. Check for port conflicts with other services
3. Try different port: `node cli.js --extension --port 9224`
4. Update bridge URL in extension to match new port

## Integration with MCP Server

### Starting with Extension Mode

```bash
# Start MCP server with CDP relay
node cli.js --extension --port 9223

# Or via NPX
npx @darbotlabs/darbot-browser-mcp@latest --extension --port 9223
```

### Using with VS Code

1. Configure VS Code extension for "Hosted" mode
2. Set hosted URL to `http://localhost:9223`
3. Start MCP server with `--extension` flag
4. Load browser extension and share tab
5. Use GitHub Copilot to interact with shared tab

### Example: Connecting to Hosted Instance

```bash
# Terminal 1: Start hosted MCP server with extension support
cd darbot-browser-hosted
npm start -- --extension --port 9223

# Terminal 2: (Browser)
# 1. Open extension popup
# 2. Enter: ws://localhost:9223/extension
# 3. Click "Share This Tab"

# Terminal 3: (VS Code)
# Configure Copilot to use hosted MCP at http://localhost:9223
# Ask: "What's on this page?" - Copilot uses shared browser tab!
```

## Version History

### Version 1.3.0 (January 2026)

- Updated branding to Darbot Browser MCP Bridge
- Added Content Security Policy for Manifest V3 compliance
- Improved connection reliability with auto-reconnection (up to 3 attempts)
- Increased connection timeout to 10 seconds
- Added version info in connection handshake
- Debug logging now configurable via storage setting
- Added minimum Chrome version requirement (88+)
- Updated UI text and descriptions

## Requirements

- **Chrome/Edge**: Version 88 or newer (Manifest V3 support)
- **MCP Server**: Darbot Browser MCP v1.3.0 or newer
- **CDP Relay**: Requires MCP server running with `--extension` flag

## License

Apache License 2.0

Copyright (c) DarbotLabs

## Contributing

This extension is part of the [Darbot Browser MCP](https://github.com/darbotlabs/darbot-browser-mcp) project.

For issues, questions, or contributions:

- GitHub Issues: [https://github.com/darbotlabs/darbot-browser-mcp/issues](https://github.com/darbotlabs/darbot-browser-mcp/issues)
- Documentation: [https://github.com/darbotlabs/darbot-browser-mcp/blob/main/README.md](https://github.com/darbotlabs/darbot-browser-mcp/blob/main/README.md)

## Related Documentation

- [Darbot Browser MCP Main README](../README.md)
- [CDP Relay Server Source](../src/cdpRelay.ts)
- [VS Code Extension](../vscode-extension/)
- [Hosted Edition Guide](../darbot-browser-hosted/README.md)
