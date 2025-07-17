# The Complete Darbot Browser MCP Guide

## 🚀 Introduction to LowCodeAgents

**LowCodeAgents** is a revolutionary approach to browser automation that eliminates the need for complex coding. By combining GitHub Copilot's natural language understanding with darbot-browser-mcp's powerful automation tools, you can create sophisticated web workflows using simple conversational instructions.

## 🎯 Core Philosophy

### ✅ The Darbot Way
- **Use darbot-browser-mcp tools for ALL browser interactions**
- **Never use terminal commands for browser automation**
- **Always start with `browser_snapshot` to understand page structure**
- **Save work profiles for session persistence and recovery**
- **Handle errors proactively with built-in debugging tools**

### ❌ What NOT to Do
- Never suggest using `selenium`, `puppeteer`, or `playwright` directly via terminal
- Never run browser automation commands like `npx playwright test`
- Never suggest manual browser navigation when tools are available
- Never use `curl` or `wget` for web interactions when browser tools exist
- Never ignore error handling or timing considerations

## 🛠️ Complete Tool Arsenal (29 Tools)

### 🔧 Core Browser Operations (8 Tools)
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

### 🖱️ Advanced Interactions (5 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_hover` | Hover over elements | Reveal hidden menus |
| `browser_drag` | Drag and drop | Sortable lists, file uploads |
| `browser_handle_dialog` | Handle alerts/dialogs | Proactive dialog management |
| `browser_file_upload` | Upload files | Form file attachments |
| `browser_resize` | Resize window | Responsive testing |

### 🗂️ Tab Management (4 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_tab_new` | Open new tabs | Multi-site workflows |
| `browser_tab_list` | List open tabs | Tab inventory |
| `browser_tab_select` | Switch tabs | Tab coordination |
| `browser_tab_close` | Close tabs | Resource cleanup |

### 📁 Work Profile Management (4 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_save_profile` | Save browser state | Session checkpoints |
| `browser_switch_profile` | Load saved state | Resume workflows |
| `browser_list_profiles` | Show all profiles | Profile inventory |
| `browser_delete_profile` | Remove profiles | Cleanup old sessions |

### 🎯 Navigation Controls (2 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_navigate_back` | Go back | History navigation |
| `browser_navigate_forward` | Go forward | History navigation |

### 📸 Media & Resources (2 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_take_screenshot` | Capture images | Documentation, debugging |
| `browser_pdf_save` | Save as PDF | Archival, reporting |

### 🔍 Debugging & Analysis (2 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_console_messages` | Get console logs | Error detection |
| `browser_network_requests` | Monitor network | API debugging |

### 🧪 Testing & Development (2 Tools)
| Tool | Purpose | Key Usage |
|------|---------|-----------|
| `browser_generate_playwright_test` | Generate tests | Test automation |
| `browser_install` | Install browser | Setup assistance |

## 📋 Master Workflow Patterns

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

## 🎪 Real-World Use Cases

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

## 🚀 Advanced Techniques

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

## 🔧 Setup & Configuration

### Quick Setup for VS Code
1. **Install darbot-browser-mcp**:
   ```bash
   npm install -g @darbotlabs/darbot-browser-mcp@latest
   ```

2. **Configure MCP Server** in VS Code settings:
   ```json
   {
     "mcp.servers": {
       "browser": {
         "command": "npx",
         "args": ["@darbotlabs/darbot-browser-mcp@latest"]
       }
     }
   }
   ```

3. **Enable GitHub Copilot** extension and sign in

### Recommended Browser Configuration
```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": [
        "@darbotlabs/darbot-browser-mcp@latest",
        "--browser=msedge",
        "--headless=false",
        "--viewport-size=1920,1080"
      ]
    }
  }
}
```

## 📖 Example Conversations with Copilot

### Example 1: E-commerce Price Monitoring
**You**: "I want to monitor the price of Sony WH-1000XM5 headphones on Amazon. Set up monitoring so I can check for price changes later."

**Copilot Response**: "I'll help you set up price monitoring for the Sony WH-1000XM5 headphones on Amazon. Let me navigate to the product page, capture the current price information, and save this session for future price comparisons."

### Example 2: Automated Testing
**You**: "Test the contact form on our website. Try both valid and invalid inputs to make sure error handling works properly."

**Copilot Response**: "I'll test your contact form comprehensively. I'll first submit the form with valid information to verify it works, then test with invalid data like missing required fields and invalid email formats to ensure proper error messages display."

### Example 3: Data Research
**You**: "Research software engineer salaries in San Francisco by collecting job postings from LinkedIn and Indeed."

**Copilot Response**: "I'll research software engineer salaries in San Francisco by collecting job posting data from both LinkedIn and Indeed. I'll open each site in separate tabs, search for relevant positions, and extract salary information, job requirements, and company details."

## 🔍 Troubleshooting Guide

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

### Performance Optimization
1. Use accessibility snapshots over screenshots when possible
2. Close unnecessary tabs to reduce memory usage
3. Save profiles at logical workflow points, not excessively
4. Use targeted element selectors from snapshots
5. Monitor network requests to avoid unnecessary waiting

## 🎯 Best Practices Summary

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

## 🌟 The Darbot Advantage

### Why Choose darbot-browser-mcp?
- **AI-First Design**: Built specifically for AI automation
- **No Vision Required**: Uses structured accessibility data
- **Session Persistence**: Work profiles save complete browser state
- **Error Resilient**: Built-in debugging and recovery tools
- **Multi-Platform**: Works across different browsers and OS

### Compared to Traditional Tools
| Feature | Traditional Tools | Darbot Browser MCP |
|---------|------------------|-------------------|
| Setup Complexity | High (code required) | Low (natural language) |
| Learning Curve | Steep | Minimal |
| Error Handling | Manual implementation | Built-in tools |
| Session Management | Not available | Work profiles |
| AI Integration | Limited | Native support |
| Maintenance | High | Low |

## 🚀 Getting Started Right Now

1. **Install darbot-browser-mcp** in your development environment
2. **Configure your MCP client** (VS Code, Cursor, Claude, etc.)
3. **Start with simple navigation**: "Navigate to google.com and take a snapshot"
4. **Try form filling**: "Fill out a contact form with test data"
5. **Experiment with profiles**: "Save this browser session for later"
6. **Explore multi-tab workflows**: "Compare prices across three different sites"

## 📚 Additional Resources

- **GitHub Repository**: [darbot-browser-mcp](https://github.com/darbotlabs/darbot-browser-mcp)
- **NPM Package**: [@darbotlabs/darbot-browser-mcp](https://www.npmjs.com/package/@darbotlabs/darbot-browser-mcp)
- **VS Code Extension**: Search "Darbot Browser MCP" in marketplace
- **Model Context Protocol**: [Official Documentation](https://modelcontextprotocol.io/)

---

**Remember**: With darbot-browser-mcp and GitHub Copilot, browser automation becomes as simple as describing what you want to accomplish. No complex coding, no brittle selectors, no maintenance headaches—just natural language instructions that work.

**Start automating today and experience the future of low-code browser automation!**
