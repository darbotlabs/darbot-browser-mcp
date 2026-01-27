# Darbot Browser MCP - Chrome/Edge Extension Integration Guide

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VS Code Environment                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐    │
│  │  GitHub Copilot │───▶│  MCP Client      │───▶│  HTTP Transport     │    │
│  │  Chat Interface │    │  (VS Code)       │    │  localhost:9223/mcp │    │
│  └─────────────────┘    └──────────────────┘    └──────────┬──────────┘    │
└──────────────────────────────────────────────────────────────┼──────────────┘
                                                               │
                                                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Darbot Browser MCP Server                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐    │
│  │  MCP Server     │───▶│  CDP Relay       │───▶│  WebSocket Server   │    │
│  │  (Streamable    │    │  Server          │    │  ws://localhost:    │    │
│  │   HTTP)         │    │  Port 9223       │    │  9223/extension     │    │
│  └─────────────────┘    └──────────────────┘    └──────────┬──────────┘    │
└──────────────────────────────────────────────────────────────┼──────────────┘
                                                               │
                                                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Chrome/Edge Browser Extension                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐    │
│  │  background.js  │───▶│  chrome.debugger │───▶│  Shared Browser Tab │    │
│  │  Service Worker │    │  API             │    │  (User's Session)   │    │
│  └─────────────────┘    └──────────────────┘    └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Request**: User types in VS Code Copilot Chat
2. **MCP Protocol**: Request sent via HTTP to `localhost:9223/mcp`
3. **Tool Execution**: MCP server processes tool call, generates Playwright code
4. **CDP Relay**: Commands relayed via WebSocket to extension
5. **Browser Control**: Extension uses `chrome.debugger` API to control shared tab
6. **Response**: Results flow back through the chain

---

## Prerequisites

### Required Software
- Node.js 23+ (LTS recommended)
- VS Code with GitHub Copilot extension
- Chrome or Microsoft Edge browser
- npm or pnpm package manager

### Required VS Code Extensions
- GitHub Copilot (ms-copilot.copilot)
- GitHub Copilot Chat (ms-copilot.copilot-chat)

---

## Installation

### Step 1: Install Darbot Browser MCP Package

```powershell
npm install -g @darbotlabs/darbot-browser-mcp@latest
```

Or run directly with npx:
```powershell
npx @darbotlabs/darbot-browser-mcp@latest --browser=msedge --extension
```

### Step 2: Load Chrome/Edge Extension

1. Open browser and navigate to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. Enable "Developer mode" (toggle in top-right)

3. Click "Load unpacked"

4. Select the extension folder:
   ```
   g:\darbotlabs_github\darbot-browser-mcp\extension
   ```

5. Note the Extension ID (e.g., `abcdefghijklmnop...`)

### Step 3: Configure VS Code MCP Settings

Add to `.vscode/settings.json`:

```json
{
  "mcp": {
    "servers": {
      "darbot-browser-bridge": {
        "type": "http",
        "url": "http://localhost:9223/mcp"
      }
    }
  }
}
```

### Step 4: Start the MCP Server with Extension Mode

```powershell
npx @darbotlabs/darbot-browser-mcp@latest --browser=msedge --extension
```

Server startup output:
```
Darbot Browser MCP Server
Version: 1.3.0
Mode: Extension Bridge (CDP Relay)
CDP Relay: ws://localhost:9223/cdp
Extension WS: ws://localhost:9223/extension
MCP Endpoint: http://localhost:9223/mcp
Bridge Status: http://localhost:9223/bridge
```

---

## Extension Configuration

### Extension Files Structure

```
extension/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker for CDP relay
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic and WebSocket connection
├── README.md              # Extension documentation
└── icons/
    ├── darbot_32.png
    ├── darbot_48.png
    └── darbot_128.png
```

### manifest.json Configuration

```json
{
  "manifest_version": 3,
  "name": "Darbot Browser MCP",
  "version": "1.3.0",
  "description": "MCP browser automation bridge for VS Code Copilot",
  "permissions": [
    "debugger",
    "activeTab",
    "tabs",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "32": "icons/darbot_32.png",
      "48": "icons/darbot_48.png",
      "128": "icons/darbot_128.png"
    }
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "minimum_chrome_version": "88"
}
```

### background.js Key Functions

```javascript
// WebSocket connection to MCP server
let ws = null;
let attachedTabId = null;
let debuggerAttached = false;

// Connect to CDP relay server
function connectToServer(bridgeUrl) {
  ws = new WebSocket(bridgeUrl);
  
  ws.onopen = () => {
    console.log('[Darbot] Connected to CDP relay');
    sendExtensionInfo();
  };
  
  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    await handleCDPCommand(message);
  };
  
  ws.onclose = () => {
    console.log('[Darbot] Disconnected from CDP relay');
    scheduleReconnect();
  };
}

// Attach debugger to shared tab
async function attachDebugger(tabId) {
  await chrome.debugger.attach({ tabId }, '1.3');
  attachedTabId = tabId;
  debuggerAttached = true;
}

// Execute CDP command
async function handleCDPCommand(message) {
  if (!debuggerAttached) return;
  
  const { id, method, params } = message;
  try {
    const result = await chrome.debugger.sendCommand(
      { tabId: attachedTabId },
      method,
      params
    );
    ws.send(JSON.stringify({ id, result }));
  } catch (error) {
    ws.send(JSON.stringify({ id, error: error.message }));
  }
}
```

### popup.html UI Elements

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      width: 320px;
      min-height: 400px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #e0e0e0;
      font-family: 'Segoe UI', system-ui, sans-serif;
      margin: 0;
      padding: 16px;
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(0, 255, 255, 0.2);
    }
    
    .logo {
      width: 48px;
      height: 48px;
    }
    
    .title {
      font-size: 18px;
      font-weight: 600;
      background: linear-gradient(90deg, #00ffff, #ff00ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      margin-bottom: 16px;
    }
    
    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    .status-dot.connected { background: #00ff88; }
    .status-dot.disconnected { background: #ff4444; }
    
    .btn {
      width: 100%;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #00ffff, #0080ff);
      color: #000;
    }
    
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(0, 255, 255, 0.3);
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="icons/darbot_48.png" class="logo" alt="Darbot">
    <div>
      <div class="title">Darbot Browser MCP</div>
      <div class="version">v1.3.0</div>
    </div>
  </div>
  
  <div class="status-indicator">
    <div id="statusDot" class="status-dot disconnected"></div>
    <span id="statusText">Disconnected</span>
  </div>
  
  <div class="form-group">
    <label>Bridge URL</label>
    <input type="text" id="bridgeUrl" value="ws://localhost:9223/extension">
  </div>
  
  <button id="shareTab" class="btn btn-primary">Share This Tab</button>
  <button id="openVSCode" class="btn btn-secondary">Open VS Code</button>
  
  <script src="popup.js"></script>
</body>
</html>
```

---

## Bridge Status Endpoint

### HTTP Endpoint: GET /bridge

Returns JSON status of the CDP relay bridge:

```json
{
  "status": "active",
  "extensionConnected": true,
  "mcpConnected": true,
  "targetInfo": {
    "tabId": 123456,
    "url": "https://github.com/",
    "title": "GitHub"
  },
  "sessionId": "abc123...",
  "extensionVersion": "1.3.0"
}
```

### Check Bridge Status via PowerShell

```powershell
Invoke-WebRequest -Uri "http://localhost:9223/bridge" -UseBasicParsing | 
  Select-Object -ExpandProperty Content | 
  ConvertFrom-Json
```

### Check Bridge Status via curl

```bash
curl http://localhost:9223/bridge
```

---

## VS Code Tasks Configuration

### .vscode/tasks.json

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "shell",
      "label": "Start Darbot Browser MCP (Edge, Headed)",
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest",
        "--browser=msedge"
      ],
      "isBackground": true,
      "group": "build",
      "problemMatcher": []
    },
    {
      "type": "shell",
      "label": "Start Darbot Browser MCP (Extension Mode)",
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest",
        "--browser=msedge",
        "--extension"
      ],
      "isBackground": true,
      "group": "build",
      "problemMatcher": []
    }
  ]
}
```

---

## MCP Tool Categories

### Navigation Tools
| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to URL |
| `browser_navigate_back` | Go back in history |
| `browser_navigate_forward` | Go forward in history |
| `browser_snapshot` | Capture accessibility tree |
| `browser_take_screenshot` | Capture visual screenshot |

### Interaction Tools
| Tool | Description |
|------|-------------|
| `browser_click` | Click element by ref |
| `browser_type` | Type text into element |
| `browser_hover` | Hover over element |
| `browser_press_key` | Press keyboard key |
| `browser_scroll` | Scroll page by pixels |
| `browser_scroll_to_element` | Scroll element into view |
| `browser_select_option` | Select dropdown option |
| `browser_drag` | Drag and drop |

### Analysis Tools
| Tool | Description |
|------|-------------|
| `browser_console_messages` | Get all console messages |
| `browser_console_filtered` | Get filtered console messages |
| `browser_network_requests` | Capture network requests |
| `browser_performance_metrics` | Get performance timing |
| `browser_analyze_context` | Analyze page context |

### Cookie & Storage Tools
| Tool | Description |
|------|-------------|
| `browser_get_cookies` | Retrieve cookies |
| `browser_set_cookie` | Set a cookie |
| `browser_clear_cookies` | Clear cookies |
| `browser_get_local_storage` | Get localStorage |
| `browser_set_local_storage` | Set localStorage item |

### Session Management Tools
| Tool | Description |
|------|-------------|
| `browser_list_profiles` | List saved sessions |
| `browser_save_profile` | Save session state |
| `browser_switch_profile` | Restore session |
| `browser_delete_profile` | Delete saved session |

### Tab Management Tools
| Tool | Description |
|------|-------------|
| `browser_tab_list` | List open tabs |
| `browser_tab_new` | Open new tab (Bridge limitation) |
| `browser_tab_select` | Switch to tab |
| `browser_tab_close` | Close tab |

### Emulation Tools
| Tool | Description |
|------|-------------|
| `browser_emulate_media` | Emulate color scheme, print |
| `browser_emulate_geolocation` | Set GPS coordinates |
| `browser_emulate_timezone` | Set timezone |
| `browser_resize` | Resize viewport |

### Utility Tools
| Tool | Description |
|------|-------------|
| `browser_wait_for` | Wait for condition/time |
| `browser_execute_intent` | Natural language actions |
| `browser_generate_playwright_test` | Generate test code |
| `browser_pdf_save` | Save page as PDF |
| `browser_file_upload` | Upload files |
| `browser_handle_dialog` | Handle alerts/dialogs |

---

## Tool Validation Results

### Validated Working Over Bridge (30 tools)

| Category | Tools |
|----------|-------|
| **Navigation** | navigate, navigate_back, navigate_forward, snapshot, take_screenshot |
| **Interaction** | click, type, hover, press_key, scroll, resize |
| **Analysis** | console_messages, console_filtered, network_requests, performance_metrics, analyze_context |
| **Wait/Flow** | wait_for, execute_intent |
| **Cookies** | get_cookies, set_cookie, clear_cookies |
| **Storage** | get_local_storage, set_local_storage |
| **Sessions** | list_profiles, save_profile |
| **Tabs** | tab_list |
| **Emulation** | emulate_media, emulate_geolocation, emulate_timezone |
| **Generation** | generate_playwright_test |

### Known Limitations

| Tool | Status | Reason |
|------|--------|--------|
| `browser_tab_new` | FAILS | Bridge controls single shared tab only |
| `browser_tab_select` | LIMITED | Same limitation as tab_new |

---

## Troubleshooting

### Extension Not Connecting

1. **Check server is running**:
   ```powershell
   curl http://localhost:9223/bridge
   ```

2. **Verify WebSocket URL** in extension popup matches server output

3. **Check browser console** for extension errors:
   - Right-click extension icon → "Inspect popup"
   - Check background service worker logs

4. **Reload extension** after code changes:
   - Go to `chrome://extensions/`
   - Click refresh icon on Darbot extension

### MCP Tools Not Available in Copilot

1. **Reload VS Code window**: `Ctrl+Shift+P` → "Developer: Reload Window"

2. **Check MCP configuration**:
   ```powershell
   cat .vscode/settings.json
   ```

3. **Verify server is accessible**:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:9223/mcp" -Method POST
   ```

### Debugger Already Attached Error

1. **Detach existing debugger**:
   - Close DevTools on the shared tab
   - Or reload the tab

2. **Check for other extensions** using debugger API

3. **Restart browser** if issue persists

### Context Destroyed Errors

This is **expected behavior** when:
- Navigation occurs during a tool call
- Page reloads during operation

The next tool call will get a fresh context.

---

## Security Considerations

### Extension Permissions

The extension requires these permissions:
- `debugger`: Required to control browser via CDP
- `activeTab`: Access to current tab
- `tabs`: Query and manage tabs
- `scripting`: Execute scripts in pages
- `storage`: Save extension settings

### Content Security Policy

The extension uses strict CSP:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

### Network Exposure

- MCP server binds to `localhost` only by default
- WebSocket connections are local-only
- No external network exposure in default configuration

---

## Development Workflow

### Testing Extension Changes

1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click refresh icon on Darbot extension
4. Open extension popup to reconnect

### Testing MCP Server Changes

1. Stop running server (`Ctrl+C`)
2. Make code changes
3. Restart server:
   ```powershell
   npx @darbotlabs/darbot-browser-mcp@latest --browser=msedge --extension
   ```

### Debugging CDP Messages

Enable debug logging in background.js:
```javascript
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[Darbot]', ...args);
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.3.0 | 2026-01-25 | Bridge mode, extension integration, 52+ MCP tools |
| 1.2.0 | 2026-01-20 | Session management, profile save/restore |
| 1.1.0 | 2026-01-15 | Streamable HTTP transport fix |
| 1.0.0 | 2026-01-10 | Initial release |
