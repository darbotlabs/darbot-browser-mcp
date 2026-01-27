# Darbot Browser MCP - Release Tracker

## Release Overview
**Release Date:** January 25, 2026  
**Release Theme:** Browser Extension Bridge & Enterprise Integration  
**Major Version:** 1.3.0 across all platforms

---

## Package Releases

### 1. NPM Package - @darbotlabs/darbot-browser-mcp
- **Previous Version:** 1.2.2
- **New Version:** 1.3.0
- **Status:** PUBLISHED
- **Installation:** `npx @darbotlabs/darbot-browser-mcp@latest`
- **Key Changes:**
  - 52 autonomous browser tools (up from 39)
  - Browser Extension Bridge mode with CDP relay
  - Streamable HTTP transport fixes for MCP SDK compliance
  - Session isolation improvements
  - Auto-detection of bridge connections
  - New AI-native and autonomous crawling tools

### 2. VS Code Extension - darbot-browser-mcp
- **Previous Version:** 1.2.2
- **New Version:** 1.3.0
- **Status:** PUBLISHED
- **Marketplace:** Visual Studio Code Marketplace
- **Key Changes:**
  - Updated to 52 autonomous browser tools
  - Browser Extension Bridge integration
  - Cyber retro UI design updates
  - MCP server management improvements

### 3. Chrome/Edge Extension - Darbot Browser MCP Bridge
- **Previous Version:** 1.2.0
- **New Version:** 1.3.0
- **Status:** UPDATED
- **Distribution:** Manual install (extension folder)
- **Key Changes:**
  - Cyber retro design with dark gradients (#1a1a2e → #16213e → #0f3460)
  - Cyan/magenta accent colors
  - Darbot logo integration
  - "Open VS Code" button with protocol handler
  - Reconnection logic (3 attempts, 10s timeout)
  - Configurable debug logging
  - Version tracking in bridge messages

### 4. NuGet Package - DarbotLabs.Browser.MCP
- **Previous Version:** 0.1.1
- **New Version:** 0.1.1 (unchanged)
- **Status:** AVAILABLE
- **Platform:** NuGet Gallery

---

## 1.3.0 Feature Highlights

### Browser Extension Bridge Mode
New architecture enabling MCP tools to control existing browser tabs:

```
┌──────────────────┐     MCP      ┌──────────────────┐
│   VS Code        │◄────────────►│  CDP Relay       │
│   Copilot Chat   │   HTTP/WS    │  Server :9223    │
└──────────────────┘              └────────┬─────────┘
                                           │ WebSocket
                                  ┌────────▼─────────┐
                                  │  Chrome/Edge     │
                                  │  Extension       │
                                  └────────┬─────────┘
                                           │ chrome.debugger
                                  ┌────────▼─────────┐
                                  │  Existing Tab    │
                                  │  (User's Browser)│
                                  └──────────────────┘
```

**Endpoints:**
- `/mcp` - MCP protocol (Streamable HTTP)
- `/bridge` - Bridge status endpoint
- `/cdp` - CDP WebSocket relay
- `/extension` - Extension WebSocket connection

### New Tools Added (52 Total)

**AI-Native Tools:**
- `browser_execute_intent` - Natural language actions
- `browser_execute_workflow` - Multi-step workflows
- `browser_analyze_context` - AI context analysis

**Autonomous Crawling:**
- `browser_start_autonomous_crawl` - BFS site crawling
- `browser_configure_memory` - Memory system setup
- `browser_get_crawl_report` - Crawl analysis reports

**Session & Environment:**
- `browser_emulate_geolocation` - Location emulation
- `browser_emulate_timezone` - Timezone emulation
- `browser_emulate_media` - Media feature emulation

**Time Control:**
- `browser_clock_fast_forward` - Fast forward time
- `browser_clock_pause` - Pause clock
- `browser_clock_resume` - Resume clock
- `browser_clock_set_fixed_time` - Set fixed time

**Storage & Cookies:**
- `browser_get_cookies` - Get cookies
- `browser_set_cookie` - Set cookie
- `browser_clear_cookies` - Clear cookies
- `browser_get_local_storage` - Get localStorage
- `browser_set_local_storage` - Set localStorage
- `browser_save_storage_state` - Save storage state

### Streamable HTTP Transport Fix
Fixed MCP SDK compliance for Streamable HTTP transport:
- Proper session ID handling
- Correct response formatting
- DELETE method support for session cleanup

---

## Technical Implementation Details

### CDP Relay Server (`src/cdpRelay.ts`)
- WebSocket server bridging MCP to browser extension
- `getStatus()` method for connection monitoring
- Support for multiple connection types (extension, CDP, MCP)

### Bridge Auto-Detection (`src/config.ts`)
- `detectBridge()` function scans ports 9223-9225
- `fetchBridgeStatus()` checks for active extension connection
- Automatic `cdpEndpoint` configuration when bridge detected

### Chrome Extension Updates (`extension/`)
- **manifest.json**: Updated name, CSP, minimum Chrome 88
- **background.js**: Reconnection logic, version tracking, debug logging
- **popup.html**: Cyber retro design, VS Code button
- **popup.js**: VS Code protocol handler (`vscode://`)

### MCP Configuration
```json
{
  "chat.mcp.servers": {
    "darbot-browser-bridge": {
      "type": "http",
      "url": "http://localhost:9223/mcp"
    }
  }
}
```

---

## Tool Validation Results (Bridge Mode)

### Confirmed Working (30 tools)
| Category | Tools |
|----------|-------|
| Navigation | navigate, navigate_back, navigate_forward, snapshot, take_screenshot |
| Interaction | click, type, hover, press_key, scroll, resize |
| Analysis | console_messages, console_filtered, network_requests, performance_metrics, analyze_context |
| Wait/Flow | wait_for, execute_intent |
| Cookies | get_cookies, set_cookie, clear_cookies |
| Storage | get_local_storage, set_local_storage |
| Sessions | list_profiles, save_profile |
| Tabs | tab_list |
| Emulation | emulate_media, emulate_geolocation, emulate_timezone |
| Generation | generate_playwright_test |

### Known Limitations
- `browser_tab_new` - Single tab limitation in bridge mode (CDP relay controls shared tab)

---

## Development Workflow

### 1. Analysis & Planning
- [x] Identified MCP transport issues with session isolation
- [x] Designed CDP relay architecture for extension bridge
- [x] Planned bridge auto-detection mechanism

### 2. Code Updates
- [x] Fixed `handleStreamable` in transport.ts for MCP SDK compliance
- [x] Created CDP relay server with multi-endpoint support
- [x] Added bridge status endpoint
- [x] Updated Chrome extension with cyber retro design
- [x] Added VS Code protocol handler

### 3. Build & Validation
- [x] TypeScript compilation successful
- [x] All 52 MCP tools compiled
- [x] VS Code extension packaged
- [x] Chrome extension tested

### 4. Testing & Verification
- [x] Bridge connection validated
- [x] Navigation tools tested over bridge
- [x] Interaction tools validated
- [x] 30 tools confirmed working in bridge mode

### 5. Publishing
- [x] NPM: Version 1.3.0 published
- [x] VS Code: Version 1.3.0 published to marketplace
- [x] Chrome Extension: Updated in repository

---

## Documentation Updates

### New Documentation
- **Browser-Extension-Integration.md** - Complete bridge integration guide
- **Browser-Extension-Backlog.md** - 18 prioritized improvement items

### Consolidated Documentation
- **DarbotGuide.md** - Merged content from:
  - GUIDE.md (deleted)
  - INSTALLATION_GUIDE.md (deleted)
  - INTEGRATION.md (deleted)

### DarbotGuide.md Now Includes
- Prerequisites and requirements
- All installation methods (VS Code, NPX, Global, Docker)
- Platform-specific guides (Windows, macOS, Linux, Corporate)
- Advanced configuration options
- Environment variables reference
- Enterprise architecture
- Power Platform integration
- Autonomous features implementation
- Comprehensive troubleshooting

---

## Key Achievements

### Browser Extension Bridge [DONE]
- MCP tools can control existing browser tabs
- No need to launch new browser instance
- Works with user's authenticated sessions
- Real-time bidirectional communication

### Enterprise Integration [DONE]
- Copilot Studio server-side integration
- Power Platform Custom Connector support
- Microsoft Entra ID authentication
- Azure App Service deployment

### Documentation Consolidation [DONE]
- Single comprehensive guide (DarbotGuide.md)
- Eliminated redundant documentation
- Clear installation paths for all user types

---

## Resources & Links

### Live Packages
- **NPM:** https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp
- **VS Code:** https://marketplace.visualstudio.com/items?itemName=darbotlabs.darbot-browser-mcp
- **NuGet:** https://www.nuget.org/packages/DarbotLabs.Browser.MCP

### Documentation
- **GitHub Repository:** https://github.com/darbotlabs/darbot-browser-mcp
- **DarbotGuide:** Complete autonomous browser documentation
- **Browser Extension Integration:** Bridge mode setup guide

### Support
- **Issues:** https://github.com/darbotlabs/darbot-browser-mcp/issues
- **Discussions:** GitHub repository discussions

---

## Release Summary

**Darbot Browser MCP 1.3.0** delivers Browser Extension Bridge mode, enabling MCP tools to control existing browser tabs through the Chrome/Edge extension. This release includes 52 autonomous browser tools, Streamable HTTP transport fixes, and comprehensive documentation consolidation.

**Release Status:** Complete and Deployed  
**Total Platforms:** 4 (NPM, VS Code, Chrome Extension, NuGet)  
**Total Tools:** 52 Autonomous Browser Tools  
**Bridge Mode:** Fully operational with 30 tools validated

---

*Updated January 25, 2026 - Darbot Browser MCP v1.3.0 Release*
