# Darbot Browser MCP - Extension Backlog

## Priority Levels
- **P0**: Critical - Blocking core functionality
- **P1**: High - Important for production readiness
- **P2**: Medium - Enhances user experience
- **P3**: Low - Nice to have

---

## P0: Critical Issues

### 1. Multi-Tab Support for Bridge Mode

**Current Behavior**: Bridge mode only controls a single shared tab. `browser_tab_new` fails.

**Expected Behavior**: Support controlling multiple tabs through the bridge.

**Implementation Steps**:

1. Modify `extension/background.js` to track multiple attached tabs:
   ```javascript
   // Replace single tabId with map
   const attachedTabs = new Map(); // tabId -> { debuggerAttached, targetInfo }
   ```

2. Update `handleCDPCommand` to route commands to specific tabs:
   ```javascript
   async function handleCDPCommand(message) {
     const { id, method, params, tabId } = message;
     const targetTab = tabId || activeTabId;
     // ... execute on targetTab
   }
   ```

3. Add tab creation handler in background.js:
   ```javascript
   async function createNewTab(url) {
     const tab = await chrome.tabs.create({ url });
     await attachDebugger(tab.id);
     attachedTabs.set(tab.id, { debuggerAttached: true });
     return tab;
   }
   ```

4. Update CDP relay in `src/cdpRelay.ts` to support tab targeting:
   ```typescript
   interface CDPMessage {
     id: number;
     method: string;
     params?: object;
     tabId?: number; // Add tab targeting
   }
   ```

5. Modify MCP tools to pass tabId when needed

**Affected Files**:
- `extension/background.js`
- `src/cdpRelay.ts`
- `lib/tools/tabs.js`

---

### 2. Automatic Bridge Detection and Fallback

**Current Behavior**: User must manually configure bridge URL and ensure server is running.

**Expected Behavior**: Extension auto-detects bridge server and handles reconnection gracefully.

**Implementation Steps**:

1. Add port scanning in popup.js:
   ```javascript
   const BRIDGE_PORTS = [9223, 9224, 9225];
   
   async function detectBridge() {
     for (const port of BRIDGE_PORTS) {
       try {
         const response = await fetch(`http://localhost:${port}/bridge`);
         if (response.ok) {
           const status = await response.json();
           if (status.status === 'active') {
             return `ws://localhost:${port}/extension`;
           }
         }
       } catch (e) {
         continue;
       }
     }
     return null;
   }
   ```

2. Add auto-reconnect with exponential backoff in background.js:
   ```javascript
   let reconnectAttempts = 0;
   const MAX_RECONNECT_DELAY = 30000;
   
   function scheduleReconnect() {
     const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
     reconnectAttempts++;
     setTimeout(() => connectToServer(currentBridgeUrl), delay);
   }
   ```

3. Store last successful connection in chrome.storage:
   ```javascript
   chrome.storage.local.set({ 
     lastBridgeUrl: bridgeUrl,
     lastConnectedAt: Date.now()
   });
   ```

**Affected Files**:
- `extension/popup.js`
- `extension/background.js`

---

## P1: High Priority Enhancements

### 3. Connection Health Monitoring

**Description**: Add heartbeat/ping mechanism to detect stale connections.

**Implementation Steps**:

1. Add ping/pong handling in background.js:
   ```javascript
   const HEARTBEAT_INTERVAL = 30000;
   let heartbeatTimer = null;
   
   function startHeartbeat() {
     heartbeatTimer = setInterval(() => {
       if (ws && ws.readyState === WebSocket.OPEN) {
         ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
       }
     }, HEARTBEAT_INTERVAL);
   }
   
   ws.onmessage = (event) => {
     const message = JSON.parse(event.data);
     if (message.type === 'pong') {
       updateConnectionHealth(message.timestamp);
       return;
     }
     // ... handle other messages
   };
   ```

2. Add health endpoint to CDP relay:
   ```typescript
   // In cdpRelay.ts
   function handlePing(ws: WebSocket, timestamp: number) {
     ws.send(JSON.stringify({ type: 'pong', timestamp, serverTime: Date.now() }));
   }
   ```

3. Display connection health in popup UI:
   ```html
   <div class="health-indicator">
     <span>Latency: <span id="latency">--</span>ms</span>
     <span>Last ping: <span id="lastPing">--</span></span>
   </div>
   ```

**Affected Files**:
- `extension/background.js`
- `extension/popup.html`
- `extension/popup.js`
- `src/cdpRelay.ts`

---

### 4. Extension Version Compatibility Check

**Description**: Ensure extension version matches MCP server expectations.

**Implementation Steps**:

1. Add version check on connection in background.js:
   ```javascript
   function sendExtensionInfo() {
     ws.send(JSON.stringify({
       type: 'extension_info',
       version: chrome.runtime.getManifest().version,
       capabilities: ['debugger', 'tabs', 'storage'],
       browser: navigator.userAgent
     }));
   }
   ```

2. Add version validation in CDP relay:
   ```typescript
   const MIN_EXTENSION_VERSION = '1.3.0';
   
   function validateExtensionVersion(version: string): boolean {
     return semver.gte(version, MIN_EXTENSION_VERSION);
   }
   
   function handleExtensionInfo(ws: WebSocket, info: ExtensionInfo) {
     if (!validateExtensionVersion(info.version)) {
       ws.send(JSON.stringify({
         type: 'error',
         code: 'VERSION_MISMATCH',
         message: `Extension version ${info.version} is outdated. Please update to ${MIN_EXTENSION_VERSION}+`
       }));
       return;
     }
     // ... proceed with connection
   }
   ```

3. Display version warning in popup if mismatch detected

**Affected Files**:
- `extension/background.js`
- `extension/popup.js`
- `src/cdpRelay.ts`
- `package.json` (add semver dependency)

---

### 5. Session Persistence Across Browser Restarts

**Description**: Automatically reconnect and restore tab state when browser restarts.

**Implementation Steps**:

1. Save session state before disconnect:
   ```javascript
   // In background.js
   async function saveSessionState() {
     const state = {
       attachedTabs: Array.from(attachedTabs.entries()),
       bridgeUrl: currentBridgeUrl,
       timestamp: Date.now()
     };
     await chrome.storage.local.set({ sessionState: state });
   }
   
   // Save on disconnect
   ws.onclose = () => {
     saveSessionState();
     scheduleReconnect();
   };
   ```

2. Restore session on startup:
   ```javascript
   chrome.runtime.onStartup.addListener(async () => {
     const { sessionState } = await chrome.storage.local.get('sessionState');
     if (sessionState && Date.now() - sessionState.timestamp < 3600000) {
       await restoreSession(sessionState);
     }
   });
   ```

3. Add session recovery UI in popup:
   ```html
   <div id="sessionRecovery" class="hidden">
     <p>Previous session detected</p>
     <button id="restoreSession">Restore Session</button>
     <button id="newSession">Start Fresh</button>
   </div>
   ```

**Affected Files**:
- `extension/background.js`
- `extension/popup.html`
- `extension/popup.js`

---

### 6. Error Reporting and Diagnostics

**Description**: Comprehensive error capture and reporting for debugging.

**Implementation Steps**:

1. Create error collector in background.js:
   ```javascript
   const errorLog = [];
   const MAX_ERROR_LOG = 100;
   
   function logError(error, context = {}) {
     const entry = {
       timestamp: Date.now(),
       error: error.message || error,
       stack: error.stack,
       context
     };
     errorLog.push(entry);
     if (errorLog.length > MAX_ERROR_LOG) {
       errorLog.shift();
     }
     chrome.storage.local.set({ errorLog });
   }
   ```

2. Add diagnostic endpoint in CDP relay:
   ```typescript
   app.get('/diagnostics', (req, res) => {
     res.json({
       server: {
         version: packageJson.version,
         uptime: process.uptime(),
         memory: process.memoryUsage()
       },
       connections: {
         extension: relayServer.getStatus(),
         mcp: mcpServer.getStatus()
       },
       recentErrors: errorLog.slice(-10)
     });
   });
   ```

3. Add diagnostics view in popup:
   ```html
   <details>
     <summary>Diagnostics</summary>
     <div id="diagnostics">
       <pre id="diagnosticOutput"></pre>
       <button id="copyDiagnostics">Copy to Clipboard</button>
       <button id="clearErrors">Clear Error Log</button>
     </div>
   </details>
   ```

**Affected Files**:
- `extension/background.js`
- `extension/popup.html`
- `extension/popup.js`
- `src/cdpRelay.ts`
- `src/program.ts`

---

## P2: Medium Priority Enhancements

### 7. Keyboard Shortcuts for Quick Actions

**Description**: Add keyboard shortcuts for common extension actions.

**Implementation Steps**:

1. Define commands in manifest.json:
   ```json
   {
     "commands": {
       "share-tab": {
         "suggested_key": {
           "default": "Ctrl+Shift+D",
           "mac": "Command+Shift+D"
         },
         "description": "Share current tab with Darbot"
       },
       "toggle-connection": {
         "suggested_key": {
           "default": "Ctrl+Shift+C",
           "mac": "Command+Shift+C"
         },
         "description": "Toggle bridge connection"
       }
     }
   }
   ```

2. Handle commands in background.js:
   ```javascript
   chrome.commands.onCommand.addListener(async (command) => {
     switch (command) {
       case 'share-tab':
         const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
         await shareTab(tab.id);
         break;
       case 'toggle-connection':
         if (ws && ws.readyState === WebSocket.OPEN) {
           ws.close();
         } else {
           await connectToServer(currentBridgeUrl);
         }
         break;
     }
   });
   ```

**Affected Files**:
- `extension/manifest.json`
- `extension/background.js`

---

### 8. Context Menu Integration

**Description**: Add right-click context menu for quick actions.

**Implementation Steps**:

1. Create context menus on install:
   ```javascript
   chrome.runtime.onInstalled.addListener(() => {
     chrome.contextMenus.create({
       id: 'darbot-share-tab',
       title: 'Share with Darbot',
       contexts: ['page']
     });
     
     chrome.contextMenus.create({
       id: 'darbot-capture-element',
       title: 'Capture Element Ref',
       contexts: ['page', 'selection', 'image', 'link']
     });
   });
   ```

2. Handle context menu clicks:
   ```javascript
   chrome.contextMenus.onClicked.addListener(async (info, tab) => {
     switch (info.menuItemId) {
       case 'darbot-share-tab':
         await shareTab(tab.id);
         break;
       case 'darbot-capture-element':
         await captureElementAtClick(tab.id, info);
         break;
     }
   });
   ```

**Affected Files**:
- `extension/manifest.json` (add contextMenus permission)
- `extension/background.js`

---

### 9. Visual Indicator Overlay

**Description**: Show visual indicator on page when connected to Darbot.

**Implementation Steps**:

1. Create content script for overlay:
   ```javascript
   // content-script.js
   function showDarbotIndicator() {
     const indicator = document.createElement('div');
     indicator.id = 'darbot-indicator';
     indicator.innerHTML = `
       <div style="
         position: fixed;
         top: 10px;
         right: 10px;
         z-index: 999999;
         background: rgba(0, 255, 255, 0.9);
         color: #000;
         padding: 8px 12px;
         border-radius: 4px;
         font-size: 12px;
         font-family: system-ui;
         box-shadow: 0 2px 10px rgba(0,0,0,0.3);
       ">
         Darbot Connected
       </div>
     `;
     document.body.appendChild(indicator);
   }
   ```

2. Inject script when tab is shared:
   ```javascript
   async function showIndicatorOnTab(tabId) {
     await chrome.scripting.executeScript({
       target: { tabId },
       func: showDarbotIndicator
     });
   }
   ```

**Affected Files**:
- `extension/manifest.json`
- `extension/background.js`
- `extension/content-script.js` (new file)

---

### 10. Extension Options Page

**Description**: Full options page for advanced configuration.

**Implementation Steps**:

1. Add options page to manifest:
   ```json
   {
     "options_ui": {
       "page": "options.html",
       "open_in_tab": true
     }
   }
   ```

2. Create options.html:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Darbot Browser MCP Options</title>
   </head>
   <body>
     <h1>Darbot Browser MCP Settings</h1>
     
     <section>
       <h2>Connection</h2>
       <label>
         Bridge URL:
         <input type="text" id="bridgeUrl" placeholder="ws://localhost:9223/extension">
       </label>
       <label>
         <input type="checkbox" id="autoConnect">
         Auto-connect on browser start
       </label>
       <label>
         <input type="checkbox" id="autoReconnect">
         Auto-reconnect on disconnect
       </label>
     </section>
     
     <section>
       <h2>Display</h2>
       <label>
         <input type="checkbox" id="showIndicator">
         Show connection indicator on shared tabs
       </label>
       <label>
         <input type="checkbox" id="debugMode">
         Enable debug logging
       </label>
     </section>
     
     <button id="save">Save Settings</button>
     <button id="reset">Reset to Defaults</button>
     
     <script src="options.js"></script>
   </body>
   </html>
   ```

3. Create options.js to handle settings persistence

**Affected Files**:
- `extension/manifest.json`
- `extension/options.html` (new file)
- `extension/options.js` (new file)

---

### 11. Badge Notification System

**Description**: Use extension badge to show connection status and activity.

**Implementation Steps**:

1. Update badge on connection state changes:
   ```javascript
   function updateBadge(status) {
     const badges = {
       connected: { text: 'OK', color: '#00ff88' },
       disconnected: { text: '!', color: '#ff4444' },
       active: { text: '●', color: '#00ffff' },
       error: { text: '✕', color: '#ff0000' }
     };
     
     const { text, color } = badges[status] || badges.disconnected;
     chrome.action.setBadgeText({ text });
     chrome.action.setBadgeBackgroundColor({ color });
   }
   ```

2. Flash badge on activity:
   ```javascript
   async function flashBadgeOnActivity() {
     chrome.action.setBadgeText({ text: '*' });
     chrome.action.setBadgeBackgroundColor({ color: '#ffff00' });
     await new Promise(r => setTimeout(r, 200));
     updateBadge(connectionStatus);
   }
   ```

**Affected Files**:
- `extension/background.js`

---

### 12. Network Request Filtering in Bridge Mode

**Description**: Allow filtering network requests passed through bridge.

**Implementation Steps**:

1. Add filter configuration to extension settings:
   ```javascript
   const networkFilters = {
     excludePatterns: [
       '*.analytics.*',
       '*.tracking.*',
       '*google-analytics*'
     ],
     includeOnlyPatterns: null, // null = include all
     captureHeaders: true,
     captureBody: false,
     maxBodySize: 1024 * 100 // 100KB
   };
   ```

2. Apply filters in CDP message handler:
   ```javascript
   function shouldCaptureRequest(url) {
     if (networkFilters.includeOnlyPatterns) {
       return networkFilters.includeOnlyPatterns.some(p => matchPattern(url, p));
     }
     return !networkFilters.excludePatterns.some(p => matchPattern(url, p));
   }
   ```

**Affected Files**:
- `extension/background.js`
- `extension/options.html`
- `extension/options.js`

---

## P3: Low Priority Enhancements

### 13. Multiple Profile Support

**Description**: Support multiple bridge configurations for different environments.

**Implementation Steps**:

1. Add profile management to options:
   ```javascript
   const profiles = {
     'default': { bridgeUrl: 'ws://localhost:9223/extension' },
     'development': { bridgeUrl: 'ws://localhost:9224/extension' },
     'production': { bridgeUrl: 'ws://production-server:9223/extension' }
   };
   ```

2. Add profile selector in popup UI

3. Save/load profiles from chrome.storage.sync for cross-device sync

**Affected Files**:
- `extension/popup.html`
- `extension/popup.js`
- `extension/options.html`
- `extension/options.js`

---

### 14. Export/Import Extension Configuration

**Description**: Allow users to export and import extension settings.

**Implementation Steps**:

1. Add export function:
   ```javascript
   async function exportConfig() {
     const config = await chrome.storage.local.get(null);
     const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     
     chrome.downloads.download({
       url,
       filename: 'darbot-config.json',
       saveAs: true
     });
   }
   ```

2. Add import function with validation:
   ```javascript
   async function importConfig(file) {
     const text = await file.text();
     const config = JSON.parse(text);
     
     // Validate config structure
     if (!validateConfig(config)) {
       throw new Error('Invalid configuration file');
     }
     
     await chrome.storage.local.set(config);
     await reloadExtension();
   }
   ```

**Affected Files**:
- `extension/options.html`
- `extension/options.js`

---

### 15. Localization Support

**Description**: Add multi-language support for extension UI.

**Implementation Steps**:

1. Create _locales directory structure:
   ```
   extension/
   └── _locales/
       ├── en/
       │   └── messages.json
       ├── es/
       │   └── messages.json
       └── ja/
           └── messages.json
   ```

2. Create messages.json for each locale:
   ```json
   {
     "extensionName": {
       "message": "Darbot Browser MCP",
       "description": "Extension name"
     },
     "shareTab": {
       "message": "Share This Tab",
       "description": "Button to share current tab"
     },
     "connected": {
       "message": "Connected",
       "description": "Connection status when connected"
     }
   }
   ```

3. Update HTML to use i18n:
   ```html
   <button id="shareTab" data-i18n="shareTab"></button>
   ```

4. Apply translations:
   ```javascript
   document.querySelectorAll('[data-i18n]').forEach(el => {
     el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
   });
   ```

**Affected Files**:
- `extension/manifest.json`
- `extension/_locales/*/messages.json` (new files)
- `extension/popup.html`
- `extension/popup.js`

---

### 16. Performance Metrics Dashboard

**Description**: Visual dashboard showing tool execution times and success rates.

**Implementation Steps**:

1. Track tool execution metrics:
   ```javascript
   const toolMetrics = new Map();
   
   function recordToolExecution(toolName, duration, success) {
     if (!toolMetrics.has(toolName)) {
       toolMetrics.set(toolName, { executions: 0, totalTime: 0, failures: 0 });
     }
     const metrics = toolMetrics.get(toolName);
     metrics.executions++;
     metrics.totalTime += duration;
     if (!success) metrics.failures++;
   }
   ```

2. Add metrics display in popup or options:
   ```html
   <div id="metrics">
     <h3>Tool Performance</h3>
     <table>
       <thead>
         <tr>
           <th>Tool</th>
           <th>Calls</th>
           <th>Avg Time</th>
           <th>Success %</th>
         </tr>
       </thead>
       <tbody id="metricsBody"></tbody>
     </table>
   </div>
   ```

**Affected Files**:
- `extension/background.js`
- `extension/popup.html`
- `extension/popup.js`

---

### 17. Chrome Web Store Publishing Preparation

**Description**: Prepare extension for Chrome Web Store submission.

**Implementation Steps**:

1. Create promotional images:
   - Small tile: 440x280
   - Large tile: 920x680
   - Marquee: 1400x560
   - Screenshots: 1280x800 or 640x400

2. Write store listing description:
   ```
   Darbot Browser MCP enables VS Code Copilot to control your browser.
   
   Features:
   • Share any tab with VS Code Copilot
   • 50+ browser automation tools
   • Works with GitHub Copilot Chat
   • Cyber-retro UI design
   
   Requirements:
   • Darbot Browser MCP server running
   • VS Code with GitHub Copilot extension
   ```

3. Create privacy policy page

4. Set up developer account and pay one-time fee

5. Submit for review

**Affected Files**:
- `extension/manifest.json` (final review)
- Marketing assets (new files)
- Privacy policy document

---

### 18. Edge Add-ons Store Publishing

**Description**: Publish to Microsoft Edge Add-ons store.

**Implementation Steps**:

1. Create Microsoft Partner Center account

2. Adapt manifest for Edge-specific features (if any)

3. Create Edge-specific screenshots

4. Submit to Edge Add-ons store

**Affected Files**:
- Same as Chrome Web Store preparation

---

## Testing Checklist

### Unit Tests Needed

- [ ] CDP message parsing and routing
- [ ] WebSocket connection handling
- [ ] Tab attachment/detachment
- [ ] Error handling and recovery
- [ ] Session state persistence
- [ ] Version compatibility checking

### Integration Tests Needed

- [ ] Full flow: Copilot → MCP → Extension → Browser
- [ ] Multi-tab scenarios
- [ ] Connection loss and recovery
- [ ] Browser restart recovery
- [ ] Cross-browser compatibility (Chrome vs Edge)

### Manual Test Scenarios

- [ ] Fresh install and setup
- [ ] Extension update process
- [ ] Network interruption handling
- [ ] DevTools conflict resolution
- [ ] Memory leak testing (long sessions)

---

## Documentation Updates Needed

- [ ] Quick start guide with screenshots
- [ ] Video walkthrough for setup
- [ ] Troubleshooting FAQ expansion
- [ ] API reference for extension developers
- [ ] Security best practices guide
