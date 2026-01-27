# The Complete Darbot Browser MCP Guide

## Introduction to Darbot Browser

Darbot Browser is a new framework focused on making browser usage more autonomous and conversational. Darbot Browser enables intelligent agents—capable of understanding intent, making decisions, to carrying out complex tasks completely in Browser UI. We combine natural language understanding with standard browser automation tools.

## Editions & Architecture

Darbot Browser MCP is available in three editions to suit different deployment needs:

### Edition Comparison

| Feature | Local Edition | Cloud Edition | Hosted Edition |
|---------|---------------|---------------|----------------|
| **Deployment** | Your machine | Azure App Service | Docker on-premises |
| **Transport** | stdio | Streamable HTTP | Streamable HTTP |
| **Tools** | 52 | 52 | 52+ (vision optional) |
| **Authentication** | None | Entra ID | MSAL/Entra ID |
| **Setup Complexity** | Easy | Medium | Medium |
| **Data Location** | Local | Azure | On-premises |
| **Best For** | Development | Enterprise cloud | Enterprise on-prem |

### Local Edition (Default)

The standard installation runs entirely on your local machine:

```
┌──────────────────┐     stdio      ┌──────────────────┐
│   VS Code/MCP    │◄──────────────►│  darbot-browser  │
│     Client       │                │   -mcp (local)   │
└──────────────────┘                └────────┬─────────┘
                                             │
                                    ┌────────▼─────────┐
                                    │  Local Browser   │
                                    │  (Edge/Chrome)   │
                                    └──────────────────┘
```

**Use when:**
- Personal development
- Quick prototyping
- No network dependencies needed
- Full control over browser instance

### Cloud Edition (Azure)

Hosted on Azure App Service with enterprise authentication:

```
┌──────────────────┐   Streamable   ┌──────────────────┐
│   VS Code +      │     HTTP       │   Azure App      │
│  Cloud Extension │◄──────────────►│    Service       │
└──────────────────┘                └────────┬─────────┘
                                             │
                                    ┌────────▼─────────┐
                                    │  Azure-managed   │
                                    │     Browser      │
                                    └──────────────────┘
```

**Use when:**
- Enterprise deployments
- Multiple users need access
- Microsoft Entra ID authentication required
- Copilot Studio integration

### Hosted Edition (Docker On-Premises)

Self-hosted Docker container with VS Code Dev Tunnels:

```
┌──────────────────┐                ┌──────────────────┐
│  Remote Client   │     HTTPS      │   Docker Host    │
│   (anywhere)     │◄──────────────►│  + Dev Tunnel    │
└──────────────────┘                └────────┬─────────┘
                                             │
                                    ┌────────▼─────────┐
                                    │  Containerized   │
                                    │     Browser      │
                                    └──────────────────┘
```

**Use when:**
- Data sovereignty requirements
- Air-gapped or restricted networks
- Custom security policies
- Cost-conscious enterprise

### Choosing the Right Edition

```
┌─────────────────────────────────────────────────────────────┐
│                    Decision Tree                             │
├─────────────────────────────────────────────────────────────┤
│  Need enterprise auth?                                       │
│    ├── Yes: Data must stay on-prem?                         │
│    │         ├── Yes: Hosted Edition (Docker)               │
│    │         └── No:  Cloud Edition (Azure)                 │
│    └── No: Just me developing?                              │
│              ├── Yes: Local Edition                         │
│              └── No:  Consider Cloud for team access        │
└─────────────────────────────────────────────────────────────┘
```

## Core Philosophy

### Darbot Agent Principles
- **Think in Browser UI**: Always consider the browser as the primary interface
- **Use darbot-browser-mcp tools for ALL browser interactions**
- **Never use terminal commands for browser automation**
- **Always start with `browser_snapshot` to understand page structure**
- **Save work profiles for session persistence and recovery**
- **Handle errors proactively with built-in debugging tools**

### What NOT to Do
- Never suggest using `selenium`, `puppeteer`, or `playwright` directly via terminal
- Never run browser automation commands like `npx playwright test`
- Never suggest manual browser navigation when tools are available
- Never use `curl` or `wget` for web interactions when browser tools exist
- Never ignore error handling or timing considerations

## Complete Tacklebox (52 tools)

### Core Browser Operations (8 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_navigate` | Navigate to any URL | Always the first step |
| `browser_snapshot` | Get page structure | Use before any actions |
| `browser_click` | Click elements | Precise element targeting |
| `browser_type` | Type text | Form filling, search |
| `browser_select_option` | Select dropdowns | Handle form selections |
| `browser_press_key` | Keyboard input | Navigation, shortcuts |
| `browser_wait_for` | Wait for conditions | Handle dynamic content |
| `browser_close` | Close browser | Clean session termination |

### Advanced Interactions (5 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_hover` | Hover over elements | Reveal hidden menus |
| `browser_drag` | Drag and drop | Sortable lists, file uploads |
| `browser_handle_dialog` | Handle alerts/dialogs | Proactive dialog management |
| `browser_file_upload` | Upload files | Form file attachments |
| `browser_resize` | Resize window | Responsive testing |

### Tab Management (4 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_tab_new` | Open new tabs | Multi-site workflows |
| `browser_tab_list` | List open tabs | Tab inventory |
| `browser_tab_select` | Switch tabs | Tab coordination |
| `browser_tab_close` | Close tabs | Resource cleanup |

### Work Profile Management (4 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_save_profile` | Save browser state | Session checkpoints |
| `browser_switch_profile` | Load saved state | Resume workflows |
| `browser_list_profiles` | Show all profiles | Profile inventory |
| `browser_delete_profile` | Remove profiles | Cleanup old sessions |

### Navigation Controls (2 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_navigate_back` | Go back | History navigation |
| `browser_navigate_forward` | Go forward | History navigation |

### Media & Resources (2 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_take_screenshot` | Capture images | Documentation, debugging |
| `browser_pdf_save` | Save as PDF | Archival, reporting |

### Debugging & Analysis (2 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_console_messages` | Get console logs | Error detection |
| `browser_network_requests` | Monitor network | API debugging |

### Testing & Development (2 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_generate_playwright_test` | Generate tests | Test automation |
| `browser_install` | Install browser | Setup assistance |

### Additional Tool Categories

#### AI-Native Tools (4 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_execute_intent` | Natural language actions | Intent-based automation |
| `browser_execute_workflow` | Multi-step workflows | Complex task chains |
| `browser_analyze_context` | AI context analysis | Page understanding |
| `browser_emulate_media` | Media feature emulation | Accessibility testing |

#### Autonomous Crawling (3 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_start_autonomous_crawl` | Start BFS crawling | Site exploration |
| `browser_configure_memory` | Memory system setup | State persistence |
| `browser_get_crawl_report` | Get crawl reports | Analysis output |

#### Session & Environment (5 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_save_session` | Save session state | State persistence |
| `browser_restore_session` | Restore session | Resume workflows |
| `browser_emulate_geolocation` | Location emulation | Geo testing |
| `browser_emulate_timezone` | Timezone emulation | Time zone testing |
| `browser_scroll` | Page scrolling | Content access |

#### Time Control (4 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_clock_fast_forward` | Fast forward time | Animation testing |
| `browser_clock_pause` | Pause clock | Debugging |
| `browser_clock_resume` | Resume clock | Continue execution |
| `browser_clock_set_fixed_time` | Set fixed time | Deterministic tests |

#### Cookie & Storage (4 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_get_cookies` | Get cookies | Session inspection |
| `browser_clear_cookies` | Clear cookies | Fresh state |
| `browser_get_local_storage` | Local storage access | Data inspection |
| `browser_set_local_storage` | Set local storage | State manipulation |

## Master Workflow Patterns

### Pattern 1: Basic Web Interaction
```
1. mcp_darbot-browse_browser_navigate (to target URL)
2. mcp_darbot-browse_browser_snapshot (understand page structure)
3. mcp_darbot-browse_browser_click/type/select_option (perform actions)
4. mcp_darbot-browse_browser_snapshot (verify results)
5. mcp_darbot-browse_browser_save_profile (checkpoint progress)
```

### Pattern 2: Complex Form Automation
```
1. mcp_darbot-browse_browser_navigate (to form page)
2. mcp_darbot-browse_browser_snapshot (map all form fields)
3. mcp_darbot-browse_browser_type (fill text inputs)
4. mcp_darbot-browse_browser_select_option (handle dropdowns)
5. mcp_darbot-browse_browser_file_upload (attach files if needed)
6. mcp_darbot-browse_browser_save_profile (before submission)
7. mcp_darbot-browse_browser_click (submit form)
8. mcp_darbot-browse_browser_wait_for (confirmation)
```

### Pattern 3: Multi-Site Research
```
1. mcp_darbot-browse_browser_navigate (first research site)
2. mcp_darbot-browse_browser_snapshot (extract data)
3. mcp_darbot-browse_browser_tab_new (open second site)
4. mcp_darbot-browse_browser_snapshot (extract comparative data)
5. mcp_darbot-browse_browser_tab_new (open third site)
6. mcp_darbot-browse_browser_snapshot (extract more data)
7. mcp_darbot-browse_browser_save_profile (save research session)
```

### Pattern 4: Error-Resilient Workflow
```
1. mcp_darbot-browse_browser_navigate (to target)
2. mcp_darbot-browse_browser_snapshot (baseline state)
3. [PERFORM_ACTIONS] (main workflow)
4. mcp_darbot-browse_browser_console_messages (check errors)
5. mcp_darbot-browse_browser_handle_dialog (handle popups)
6. mcp_darbot-browse_browser_wait_for (ensure completion)
7. mcp_darbot-browse_browser_save_profile (save success state)
```

### Pattern 5: Data Collection with Pagination
```
1. mcp_darbot-browse_browser_navigate (to data source)
2. mcp_darbot-browse_browser_snapshot (extract page 1)
3. mcp_darbot-browse_browser_save_profile (checkpoint)
4. mcp_darbot-browse_browser_click (next page)
5. mcp_darbot-browse_browser_wait_for (page load)
6. mcp_darbot-browse_browser_snapshot (extract page 2)
7. [REPEAT UNTIL COMPLETE]
```

## Real-World Use Cases

### E-commerce Automation
**Scenario**: "Research laptop prices across Amazon, Best Buy, and Newegg for gaming laptops under $1500"

**GitHub Copilot Instruction**:
```
"Please help me research gaming laptop prices under $1500 across Amazon, Best Buy, and Newegg. Open each site in a separate tab, search for gaming laptops, apply price filters, and save the research session for later comparison."
```

**Expected Tool Flow**:
1. Navigate to Amazon → Search → Filter → Extract data
2. Open new tab for Best Buy → Search → Filter → Extract data  
3. Open new tab for Newegg → Search → Filter → Extract data
4. Save complete research session as "laptop_research_[date]"

### Form Automation
**Scenario**: "Fill out job application with my standard information"

**GitHub Copilot Instruction**:
```
"Fill out this job application form with my information: Name: John Doe, Email: john.doe@email.com, Phone: (555) 123-4567, Experience: 5 years software development. Upload my resume and save the session before submitting."
```

**Expected Tool Flow**:
1. Navigate to application page → Take snapshot
2. Fill name field → Fill email field → Fill phone field
3. Select experience level → Upload resume file
4. Save profile as "job_app_filled_[company]"
5. Submit application → Wait for confirmation

### Testing Workflows
**Scenario**: "Test login functionality with valid and invalid credentials"

**GitHub Copilot Instruction**:
```
"Test the login page with valid credentials (test@example.com / TestPass123) to verify success, then test with invalid credentials to verify error handling. Generate a test report."
```

**Expected Tool Flow**:
1. Navigate to login → Test valid credentials → Screenshot success
2. Return to login → Test invalid credentials → Check errors
3. Monitor console messages → Generate Playwright test
4. Save testing session for future regression testing

### Data Collection
**Scenario**: "Monitor TechCrunch for AI articles published today"

**GitHub Copilot Instruction**:
```
"Monitor TechCrunch for articles about artificial intelligence published today. Collect article titles, authors, and publication times. Save important articles as PDFs."
```

**Expected Tool Flow**:
1. Navigate to TechCrunch → Search "artificial intelligence"
2. Apply today's date filter → Extract article data
3. Click individual articles → Save as PDF
4. Save monitoring session for periodic checks

## Advanced Techniques

### Dynamic Content Mastery
- Use `browser_wait_for` with specific text conditions
- Monitor `browser_network_requests` for AJAX completion
- Check `browser_console_messages` for loading indicators
- Take multiple snapshots to track content changes

### Multi-Tab Orchestration
- Coordinate data collection across multiple sites
- Save authentication states with profiles
- Use tab management for comparative analysis
- Handle cross-site workflows efficiently

### Session Management Excellence
- Save profiles at logical workflow checkpoints
- Use descriptive names with timestamps
- Switch profiles to isolate different tasks
- Clean up old profiles regularly

### Error Handling Strategies
- Always check console messages after actions
- Handle dialogs proactively before they block workflow
- Use targeted waits instead of arbitrary delays
- Monitor network requests for failed API calls

## Prerequisites

### Required
- **Node.js 23 or newer** ([Download here](https://nodejs.org/))
- **One of these browsers**:
  - Microsoft Edge (recommended)
  - Chrome/Chromium
  - Firefox
- **MCP Client**: VS Code, Claude Desktop, Cursor, or Windsurf

### Optional
- **Docker** (for containerized/hosted deployments)
- **Azure subscription** (for cloud deployment)
- **Proxy configuration** (for corporate environments)

---

## Setup & Configuration

### Local Edition Setup (Recommended for Development)

#### Option A: VS Code Extension (Easiest)
1. Install the extension from VS Code Marketplace:
   ```bash
   code --install-extension darbotlabs.darbot-browser-mcp
   ```
2. Extension auto-configures MCP settings
3. Use Command Palette: "Darbot Browser MCP: Start Server"

#### Option B: NPX Direct (Zero Install)
```bash
# Test the installation
npx @darbotlabs/darbot-browser-mcp@latest --version

# Run with Edge browser
npx @darbotlabs/darbot-browser-mcp@latest --browser msedge

# Run headless with SSE server
npx @darbotlabs/darbot-browser-mcp@latest --headless --port 8931
```

#### Option C: Global Install
```bash
npm install -g @darbotlabs/darbot-browser-mcp
darbot-browser-mcp --browser msedge
```

#### Option D: Docker Container
```bash
# Run with Docker
docker run -i --rm --init --pull=always mcr.microsoft.com/playwright/mcp

# Or build locally
docker build -t darbot-browser-mcp .
docker run -i --rm darbot-browser-mcp
```

**MCP Client Configuration (settings.json):**
```json
{
  "chat.mcp.servers": {
    "darbot-browser": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest",
        "--browser", "msedge"
      ]
    }
  }
}
```

**Docker MCP Configuration:**
```json
{
  "mcpServers": {
    "darbot-browser": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--init", "--pull=always", "mcr.microsoft.com/playwright/mcp"]
    }
  }
}
```

### Cloud Edition Setup (Azure)

1. **Deploy to Azure:**
   ```bash
   ./azure/deploy.sh my-resource-group darbot-mcp-prod eastus
   ```

2. **Install Cloud Extension:**
   ```bash
   code --install-extension darbot-browser-mcp-cloud-0.1.0.vsix
   ```

3. **Configure Extension Settings:**
   ```json
   {
     "darbot-browser-mcp-cloud.serverUrl": "https://darbot-mcp-prod.azurewebsites.net",
     "darbot-browser-mcp-cloud.sseEndpoint": "https://darbot-mcp-prod.azurewebsites.net/mcp",
     "darbot-browser-mcp-cloud.autoConnect": true
   }
   ```

4. **MCP Configuration (uses HTTP transport):**
   ```json
   {
     "chat.mcp.servers": {
       "darbot-browser-cloud": {
         "type": "http",
         "url": "https://darbot-mcp-prod.azurewebsites.net/mcp"
       }
     }
   }
   ```

### Hosted Edition Setup (Docker On-Premises)

1. **Build Docker Image:**
   ```bash
   cd darbot-browser-mcp
   docker build -t darbot-browser-hosted -f darbot-browser-hosted/Dockerfile .
   ```

2. **Run Container:**
   ```bash
   docker run -d --name darbot-browser-hosted \
     -p 8080:8080 \
     -e ALLOW_ANONYMOUS_ACCESS=true \
     darbot-browser-hosted
   ```

3. **Set Up Dev Tunnel (for remote access):**
   ```bash
   code tunnel user login
   code tunnel --name darbot-browser-mcp
   ```

4. **Install Hosted Extension:**
   ```bash
   code --install-extension darbot-browser-mcp-hosted-1.3.0.vsix
   ```

5. **MCP Configuration:**
   ```json
   {
     "chat.mcp.servers": {
       "darbot-browser-hosted": {
         "type": "http",
         "url": "http://localhost:8080/mcp"
       }
     }
   }
   ```

**Hosted Endpoints:**
- **Local**: `http://localhost:8080/mcp`
- **Tunnel**: `https://darbot-browser-mcp-xxx.devtunnels.ms/mcp`

---

## Platform-Specific Installation

### Corporate Developer (Firewall/Proxy)

```bash
# Configure npm proxy
npm config set proxy http://your-proxy:port
npm config set https-proxy http://your-proxy:port

# Alternative: Use company npm registry
npm config set registry http://your-company-registry.com

# Test network access
curl -I https://registry.npmjs.org/@darbotlabs/darbot-browser-mcp
```

**MCP Configuration with Proxy:**
```json
{
  "mcpServers": {
    "darbot-browser": {
      "command": "npx",
      "args": ["@darbotlabs/darbot-browser-mcp@latest", "--proxy-server", "http://proxy:port"],
      "env": {
        "HTTP_PROXY": "http://proxy:port",
        "HTTPS_PROXY": "http://proxy:port"
      }
    }
  }
}
```

### macOS M1/M2 Developer

```bash
# Verify native ARM64 Node.js
node -p "process.arch"  # Should show "arm64"

# If using Rosetta, install ARM64 Node.js via brew
brew install node

# Use Chrome if Edge unavailable
npx @darbotlabs/darbot-browser-mcp@latest --browser chrome
```

### Windows PowerShell User

```powershell
# Set execution policy (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Use PowerShell-friendly paths
npx @darbotlabs/darbot-browser-mcp@latest --user-data-dir "$env:TEMP\mcp-profile"

# Global install with proper permissions
npm install -g @darbotlabs/darbot-browser-mcp
```

### Docker/Container Environment

```bash
# Essential flags for containers
npx @darbotlabs/darbot-browser-mcp@latest \
  --headless \
  --no-sandbox \
  --disable-dev-shm-usage

# With resource limits
docker run --memory=1g --cpus=1 mcr.microsoft.com/playwright/mcp
```

### VS Code/MCP Newcomer Step-by-Step

1. **Install VS Code** (if not already installed)
2. **Enable MCP**:
   - Open VS Code Settings (`Ctrl+,`)
   - Search "mcp"
   - Enable "Chat: MCP Enabled"
3. **Install Extension**:
   - Go to Extensions panel
   - Search "Darbot Browser MCP"
   - Click Install
4. **Let Extension Configure**:
   - Extension will prompt for configuration
   - Accept the default settings
5. **Test**:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run "Darbot Browser MCP: Start Server"
   - Open GitHub Copilot Chat
   - Type: `@darbot-browser-mcp navigate to https://example.com`

---

## Advanced Configuration

### Custom Configuration File

Create a `config.json` for advanced settings:

```json
{
  "browser": {
    "browserName": "firefox",
    "isolated": false,
    "launchOptions": {
      "headless": false,
      "slowMo": 100
    },
    "contextOptions": {
      "viewport": { "width": 1920, "height": 1080 },
      "locale": "en-US"
    }
  },
  "capabilities": ["core", "tabs", "pdf", "files"],
  "network": {
    "blockedOrigins": ["*.ads.com", "*.analytics.com"]
  }
}
```

**Use with:**
```bash
npx @darbotlabs/darbot-browser-mcp@latest --config /path/to/config.json
```

### Full MCP Configuration with All Options

```json
{
  "mcpServers": {
    "darbot-browser-custom": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest",
        "--config", "/path/to/config.json",
        "--browser", "firefox",
        "--viewport-size", "1920,1080",
        "--user-agent", "CustomBot/1.0",
        "--proxy-server", "socks5://localhost:1080",
        "--save-trace",
        "--vision"
      ],
      "env": {
        "DEBUG": "darbot:*",
        "NODE_ENV": "development"
      }
    }
  }
}
```

### Environment Variables Reference

#### Authentication
```bash
ENTRA_AUTH_ENABLED=true
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

#### Copilot Studio
```bash
COPILOT_STUDIO_ENABLED=true
COPILOT_STUDIO_CALLBACK_URL=https://your-callback-url
MAX_CONCURRENT_SESSIONS=20
SESSION_TIMEOUT_MS=1800000
AUDIT_LOGGING_ENABLED=true
```

#### Performance
```bash
BROWSER_POOL_SIZE=10
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Verification & Testing

### Automated Verification

```bash
# Test command access
npx @darbotlabs/darbot-browser-mcp@latest --help

# Test server mode
npx @darbotlabs/darbot-browser-mcp@latest --port 8931 &
curl http://localhost:8931/health

# Test MCP client integration
# Start your MCP client and verify server appears in tools list
```

### Health Check Endpoints

- **Health**: `https://your-app.azurewebsites.net/health`
- **Ready**: `https://your-app.azurewebsites.net/ready`
- **Live**: `https://your-app.azurewebsites.net/live`
- **OpenAPI**: `https://your-app.azurewebsites.net/openapi.json`

## Example Conversations with Copilot

### Example 1: E-commerce Price Monitoring
**You**: "I want to monitor the price of Sony WH-1000XM5 headphones on Amazon. Set up monitoring so I can check for price changes later."

**Copilot Response**: "I'll help you set up price monitoring for the Sony WH-1000XM5 headphones on Amazon. Let me navigate to the product page, capture the current price information, and save this session for future price comparisons."

### Example 2: Automated Testing
**You**: "Test the contact form on our website. Try both valid and invalid inputs to make sure error handling works properly."

**Copilot Response**: "I'll test your contact form comprehensively. I'll first submit the form with valid information to verify it works, then test with invalid data like missing required fields and invalid email formats to ensure proper error messages display."

### Example 3: Data Research
**You**: "Research software salaries in San Francisco by collecting job postings from LinkedIn and Indeed."

**Copilot Response**: "I'll research software salaries in San Francisco by collecting job posting data from both LinkedIn and Indeed. I'll open each site in separate tabs, search for relevant positions, and extract salary information, job requirements, and company details."

## Troubleshooting Guide

### Common Issues & Solutions

#### "Element not found" Errors
- **Cause**: Page content changed or dynamic loading
- **Solution**: Take fresh snapshot, wait for content to load
- **Prevention**: Use `browser_wait_for` before interactions

#### Timing-Related Failures
- **Cause**: Actions performed before page fully loads
- **Solution**: Use specific wait conditions instead of fixed delays
- **Prevention**: Monitor network requests and console messages

#### Dialog Blocking Workflow
- **Cause**: Unexpected popups or confirmation dialogs
- **Solution**: Use `browser_handle_dialog` proactively
- **Prevention**: Always check for dialogs after navigation

#### Session State Loss
- **Cause**: Browser crashes or unexpected closure
- **Solution**: Use saved profiles to restore state
- **Prevention**: Save profiles at regular checkpoints

#### "Package not found"
```bash
# Clear npm cache
npm cache clean --force

# Try with specific version
npx @darbotlabs/darbot-browser-mcp@1.3.0
```

#### "Browser launch failed"
```bash
# Install Playwright browsers
npx playwright install

# Try different browser
npx @darbotlabs/darbot-browser-mcp@latest --browser chrome

# Container environments
npx @darbotlabs/darbot-browser-mcp@latest --headless --no-sandbox
```

#### "Permission denied"
```bash
# Fix npm permissions (Unix)
sudo chown -R $USER ~/.npm

# Use different npm prefix
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

#### "MCP server not responding"
```bash
# Check server status
curl http://localhost:8931/health

# View server logs
DEBUG=darbot:* npx @darbotlabs/darbot-browser-mcp@latest

# Restart server
pkill -f "darbot-browser-mcp"
```

#### Authentication Failures (401 Unauthorized)
- Verify Azure AD app registration
- Check client secret expiration
- Confirm redirect URLs
- Validate token scopes

#### Performance Issues (Slow response, timeouts)
- Scale up App Service plan
- Increase concurrent session limits
- Monitor memory usage
- Optimize browser configurations

#### Browser Session Errors (Crashes, session loss)
- Check browser installation
- Monitor resource usage
- Adjust session timeouts
- Review error logs

### Environment-Specific Issues

**Corporate Networks:**
- Configure npm proxy settings
- Add npmjs.org to firewall allowlist
- Use internal package registry if available

**Containerized Environments:**
- Ensure sufficient memory (≥1GB)
- Use `--no-sandbox --disable-dev-shm-usage`
- Mount /tmp with sufficient space

**ARM64 (Apple Silicon):**
- Use native ARM64 Node.js installation
- Avoid Rosetta 2 emulation for better performance
- Some browsers may require additional setup

### Performance Optimization
1. Use accessibility snapshots over screenshots when possible
2. Close unnecessary tabs to reduce memory usage
3. Save profiles at logical workflow points, not excessively
4. Use targeted element selectors from snapshots
5. Monitor network requests to avoid unnecessary waiting

## Best Practices Summary

### Before Every Automation
- [ ] Clear understanding of the goal
- [ ] Identified target websites and workflows
- [ ] Plan for error handling and recovery
- [ ] Decide on profile save points

### During Automation
- [ ] Always start with `browser_snapshot`
- [ ] Use descriptive element references
- [ ] Handle dialogs immediately when they appear
- [ ] Save progress at logical checkpoints
- [ ] Monitor console for errors

### After Automation
- [ ] Verify results with final snapshot
- [ ] Save successful workflow as profile
- [ ] Generate tests for repeated workflows
- [ ] Document any issues encountered
- [ ] Clean up unnecessary tabs and profiles

## Darbot Browser Advantages

- **AI-First Design**: Built specifically for AI automation
- **No GPU Required**: Uses structured accessibility data
- **Session Persistence**: Work profiles save complete browser state
- **Error Resilient**: Built-in debugging and recovery tools
- **Multi-Platform**: Works across different platforms


## Getting Started with Darbot Browser MCP

1. **Install darbot-browser-mcp** in your development environment
2. **Configure your MCP client** (VS Code, Cursor, Claude, etc.)
3. **Start with simple navigation**: "Navigate to google.com and take a snapshot"
4. **Try form filling**: "Fill out a contact form with test data"
5. **Experiment with profiles**: "Save this browser session for later"
6. **Explore multi-tab workflows**: "Compare prices across three different sites"

## Additional Resources

### Documentation
- **GitHub Repository**: [darbot-browser-mcp](https://github.com/darbotlabs/darbot-browser-mcp)
- **NPM Package**: [@darbotlabs/darbot-browser-mcp](https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp)
- **Model Context Protocol**: [Official Documentation](https://modelcontextprotocol.io/)

### VS Code Extensions
- **Local Edition**: Search "Darbot Browser MCP" in VS Code Marketplace
- **Cloud Edition**: `darbot-browser-mcp-cloud` (connect to Azure deployment)
- **Hosted Edition**: `darbot-browser-mcp-hosted` (connect to Docker on-premises)

### Edition-Specific Guides
- **Cloud Deployment**: See [CLOUD.md](CLOUD.md) and [azure/README.md](../azure/README.md)
- **Hosted Deployment**: See [darbot-browser-hosted/README.md](../darbot-browser-hosted/README.md)

---

## Microsoft Copilot Studio & M365 Integration

### Recommended Setup for Microsoft Engineers

- **OS**: Windows 11 (optimized for Microsoft ecosystem)
- **Browser**: Microsoft Edge (primary, optimized performance)
- **IDE**: Visual Studio Code with GitHub Copilot
- **Integration**: VS Code Extension + MCP Servers method

### Copilot Studio Server-Side Integration

**Deploy to Azure for Copilot Studio:**

```bash
git clone https://github.com/darbotlabs/darbot-browser-mcp.git
cd darbot-browser-mcp
./azure/deploy.sh my-copilot-rg darbot-browser-prod eastus
```

**Copilot Studio Configuration:**
- **MCP Endpoint**: `https://your-app.azurewebsites.net/mcp`
- **Auth**: Microsoft Entra ID
- **Tools Available**: 52 browser automation tools

### M365 Agent Integration

**Power Platform Custom Connector:**

```json
{
  "swagger": "2.0",
  "info": {
    "title": "Darbot Browser MCP",
    "description": "52 autonomous browser tools for M365 agents",
    "version": "1.0"
  },
  "host": "your-app.azurewebsites.net",
  "basePath": "/",
  "schemes": ["https"],
  "consumes": ["application/json"],
  "produces": ["application/json"]
}
```

### Windows 11 + Edge Optimization

**Optimal Edge Settings for Automation:**

```typescript
const browserConfig = {
  browser: 'msedge',
  channel: 'stable',
  args: [
    '--no-sandbox',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--enable-automation',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'
  ]
};
```

**Windows-Specific VS Code Settings:**

```json
{
  "darbot-browser-mcp.browser": "msedge",
  "darbot-browser-mcp.windowsOptimization": true,
  "darbot-browser-mcp.edgeDataDir": "%USERPROFILE%\\AppData\\Local\\DarbotBrowserMCP",
  "darbot-browser-mcp.performanceMode": "high"
}
```

### M365 Usage Examples

**M365 Portal Navigation:**
```
Navigate to https://admin.microsoft.com
Take screenshot of the admin dashboard
Click on "Users" menu item
Save current session as "m365-admin-session"
```

**Power Platform Testing:**
```
Navigate to https://make.powerapps.com
Switch to "Test Environment"
Click create new canvas app
Generate playwright test for this workflow
```

**SharePoint Automation:**
```
Navigate to https://tenant.sharepoint.com
Click site collection "Team Site"
Upload file from "C:\TestData\document.pdf"
Verify upload completed successfully
```

### Power Automate Integration

**Power Automate Flow with Darbot Browser MCP:**

1. **HTTP Request Action** → Darbot Browser MCP endpoint
2. **Parse JSON** → Extract tool results
3. **Apply to Each** → Process multiple browser actions
4. **Compose** → Format results for Copilot Studio

```json
{
  "tool": "browser_navigate",
  "parameters": {
    "url": "https://admin.microsoft.com"
  }
}
```

### Performance Metrics (Windows 11)

| Metric | Target | Actual |
|--------|--------|--------|
| Browser Launch | <3s | 2.1s |
| Page Navigation | <2s | 1.4s |
| Screenshot Capture | <1s | 0.8s |
| Memory Usage | <500MB | 340MB |
| CPU Usage | <25% | 18% |

### Enterprise Security

**Microsoft Entra ID Authentication Flow:**

1. Copilot Studio → Azure AD token request
2. Token validation against tenant policies
3. MCP server authorization check
4. Browser session with inherited permissions

**Security Features:**
- Single Sign-On (SSO) support
- Multi-factor authentication (MFA) required
- Conditional access policy compliance
- Audit logging for all browser actions

**Compliance:**
- **GDPR**: No personal data stored
- **SOC 2**: Security controls implemented
- **ISO 27001**: Information security standards
- **Microsoft 365 Compliance**: Native integration
- **FedRAMP**: Government cloud ready

### Microsoft-Specific Troubleshooting

**Edge Not Launching:**

```powershell
# Reset Edge settings
Remove-Item -Path "$env:USERPROFILE\AppData\Local\Microsoft\Edge\User Data" -Recurse -Force
# Restart Darbot Browser MCP
npx @darbotlabs/darbot-browser-mcp@latest --reset-browser-data
```

**Corporate Network/Proxy Issues:**

```powershell
# Configure corporate proxy
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
# Test package access
npm view @darbotlabs/darbot-browser-mcp
```

**PowerShell Verification Script:**

```powershell
# verify-microsoft-integration.ps1
Write-Host "Verifying Setup..." -ForegroundColor Cyan

# Check Windows 11
$osVersion = (Get-CimInstance Win32_OperatingSystem).Caption
Write-Host "OS: $osVersion" -ForegroundColor Green

# Check Edge
$edgeVersion = (Get-AppxPackage -Name "Microsoft.MicrosoftEdge*").Version
Write-Host "Edge: $edgeVersion" -ForegroundColor Green

# Check VS Code
if (Get-Command code -ErrorAction SilentlyContinue) {
    $vscodeVersion = code --version | Select-Object -First 1
    Write-Host "VS Code: $vscodeVersion" -ForegroundColor Green
} else {
    Write-Host "[FAILED] VS Code not found" -ForegroundColor Red
}

# Check Darbot Browser MCP
try {
    $darbotVersion = npx @darbotlabs/darbot-browser-mcp@latest --version
    Write-Host "Darbot Browser MCP: $darbotVersion" -ForegroundColor Green
} catch {
    Write-Host "[FAILED] Darbot Browser MCP not accessible" -ForegroundColor Red
}
```

---

## Enterprise Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Copilot Studio  │    │   Power Platform │    │  Azure App      │
│                 │◄──►│   Connector     │◄──►│  Service        │
│ - Topics        │    │                 │    │                 │
│ - Actions       │    │ - Authentication│    │ - MCP Server    │
│ - Workflows     │    │ - Action Mapping│    │ - Browser Pool  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                               │
                       ┌─────────────────┐    │
                       │   Azure         │    │
                       │   Resources     │◄───┘
                       │                 │
                       │ - Key Vault     │
                       │ - App Insights  │
                       │ - Storage       │
                       └─────────────────┘
```

### Azure Resources Created

**Core Services:**
- **App Service**: Hosts the MCP server
- **App Service Plan**: Provides compute resources
- **Application Insights**: Monitoring and analytics
- **Log Analytics Workspace**: Centralized logging

**Security & Storage:**
- **Key Vault**: Secure secret storage
- **Storage Account**: Session data and artifacts
- **Managed Identity**: Secure Azure resource access

### Power Platform Custom Connector

**Deploy Custom Connector:**

```bash
cd power-platform
./deploy-connector.sh https://myorg.crm.dynamics.com your-client-id https://your-app.azurewebsites.net
```

**Use in Copilot Studio:**
1. Create new topic
2. Add action → Select "Darbot Browser MCP" connector
3. Choose from 9 core actions (Navigate, Click, Type, Screenshot, etc.)

### Enterprise Features

**Security & Authentication:**
- Microsoft Entra ID Integration with OAuth 2.0 and JWT validation
- HTTPS enforcement for all communications
- Request validation with input sanitization
- Configurable rate limiting
- Comprehensive audit logging

**Monitoring & Observability:**
- Health endpoints: `/health`, `/ready`, `/live`
- Application Insights integration
- Azure Monitor centralized logging
- Auto-generated OpenAPI specification

**Performance & Scalability:**
- Horizontal scaling with Azure App Service
- Connection pooling for browser instances
- Configurable session timeouts
- Memory-optimized resource utilization

### Data Protection

- All browser data encrypted in transit and at rest
- Session isolation between users
- No persistent storage of sensitive data
- Configurable data retention policies

### Access Control

- Azure AD integration for authentication
- Role-based access control (RBAC)
- API key authentication for service accounts
- Request signing and validation

---

## Autonomous Features Implementation

### Memory System

- **Local Storage**: File-based state persistence with screenshot organization
- **State Hashing**: SHA-256 DOM snapshot hashing for deduplication
- **Configurable Storage**: Support for different backend storage systems

### Planner

- **Breadth-First Search**: Systematic exploration by depth level
- **Intelligent Scoring**: URL and element prioritization algorithms
- **Domain Filtering**: Configurable allowed/blocked domain support
- **Loop Detection**: Infinite navigation pattern prevention

### Guardrail System

- **Rate Limiting**: Token bucket algorithm with configurable limits
- **Safety Validation**: Pattern-based URL and action blocking
- **Loop Prevention**: Detects repetitive navigation cycles
- **Destructive Action Prevention**: Blocks harmful clicks and inputs

### Report Generator

- **HTML Reports**: Comprehensive crawl reports with statistics
- **Screenshot Galleries**: Organized visual documentation
- **Site Graphs**: Link structure visualization
- **Multiple Formats**: JSON and HTML output support

---

## Performance Tuning

### Memory Optimization

```bash
# Limit memory usage
node --max-old-space-size=1024 /path/to/server

# Use isolated profiles
npx @darbotlabs/darbot-browser-mcp@latest --isolated
```

### Network Optimization

```bash
# Block unnecessary requests
npx @darbotlabs/darbot-browser-mcp@latest \
  --blocked-origins "*.ads.com;*.analytics.com"

# Use proxy for caching
npx @darbotlabs/darbot-browser-mcp@latest \
  --proxy-server "http://cache-proxy:3128"
```

### Browser Pool Management

- Pre-warmed browser instances
- Intelligent session reuse
- Memory monitoring and cleanup
- Resource limits enforcement

---
